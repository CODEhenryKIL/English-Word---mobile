"use server";

import { createClient } from "@/lib/supabase/server";

// Notion API를 통해 데이터베이스에서 단어 데이터를 가져오기
export async function importFromNotion(databaseUrl: string) {
    const notionApiKey = process.env.NOTION_API_KEY;
    if (!notionApiKey) {
        return { error: "Notion API 키가 설정되지 않았습니다." };
    }

    // URL에서 Database ID 추출
    const databaseId = extractDatabaseId(databaseUrl);
    if (!databaseId) {
        return { error: "유효하지 않은 Notion 데이터베이스 URL입니다." };
    }

    try {
        // Step 1: 데이터베이스 조회하여 data_source_id 획득
        const dbResponse = await fetch(
            `https://api.notion.com/v1/databases/${databaseId}`,
            {
                headers: {
                    Authorization: `Bearer ${notionApiKey}`,
                    "Notion-Version": "2022-06-28",
                },
            }
        );

        if (!dbResponse.ok) {
            const errBody = await dbResponse.text();
            return { error: `Notion 데이터베이스 조회 실패: ${errBody}` };
        }

        const dbData = await dbResponse.json();

        // 프로퍼티 이름 매핑 확인
        const properties = dbData.properties || {};

        // Step 2: 데이터베이스의 페이지(행) 목록 조회
        let allResults: Record<string, unknown>[] = [];
        let hasMore = true;
        let startCursor: string | undefined = undefined;

        while (hasMore) {
            const queryBody: Record<string, unknown> = {};
            if (startCursor) queryBody.start_cursor = startCursor;

            const queryResponse = await fetch(
                `https://api.notion.com/v1/databases/${databaseId}/query`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${notionApiKey}`,
                        "Notion-Version": "2022-06-28",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(queryBody),
                }
            );

            if (!queryResponse.ok) {
                const errBody = await queryResponse.text();
                return { error: `Notion 데이터 쿼리 실패: ${errBody}` };
            }

            const queryData = await queryResponse.json();
            allResults = [...allResults, ...queryData.results];
            hasMore = queryData.has_more;
            startCursor = queryData.next_cursor;
        }

        // Step 3: 결과를 단어 형식으로 변환
        const words = allResults.map((page: Record<string, unknown>) => {
            const props = (page as { properties: Record<string, unknown> }).properties || {};
            return {
                word: extractNotionText(props, ["단어", "영단어", "word", "Word"]),
                meaning: extractNotionText(props, ["의미", "뜻", "meaning", "Meaning"]),
                part_of_speech: extractNotionText(props, ["품사", "part_of_speech"]),
                pronunciation: extractNotionText(props, ["발음", "발음기호", "pronunciation"]),
                root_affix: extractNotionText(props, ["어근", "어근구성", "root_affix"]),
                etymology: extractNotionText(props, ["어원", "어원의미", "etymology"]),
                memo: extractNotionText(props, ["메모", "기타", "memo"]),
            };
        }).filter((w) => w.word && w.meaning);

        return { data: words, title: dbData.title?.[0]?.plain_text || "Notion 단어장" };
    } catch (err) {
        return { error: `Notion 연동 오류: ${String(err)}` };
    }
}

// URL에서 Notion Database ID 추출
function extractDatabaseId(url: string): string | null {
    // URL 형태: https://www.notion.so/xxx/databaseId?v=xxx
    // 또는 직접 ID 입력
    const uuidRegex = /[a-f0-9]{32}/i;
    const dashRegex = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;

    const dashMatch = url.match(dashRegex);
    if (dashMatch) return dashMatch[0];

    const match = url.match(uuidRegex);
    if (match) {
        // UUID 형태로 변환
        const id = match[0];
        return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
    }

    return null;
}

// Notion 프로퍼티에서 텍스트 추출 (다양한 프로퍼티 타입 대응)
function extractNotionText(
    properties: Record<string, unknown>,
    possibleNames: string[]
): string {
    for (const name of possibleNames) {
        const prop = properties[name] as Record<string, unknown> | undefined;
        if (!prop) continue;

        const type = prop.type as string;
        switch (type) {
            case "title": {
                const titleArr = prop.title as { plain_text: string }[];
                return titleArr?.map((t) => t.plain_text).join("") || "";
            }
            case "rich_text": {
                const rtArr = prop.rich_text as { plain_text: string }[];
                return rtArr?.map((t) => t.plain_text).join("") || "";
            }
            case "select": {
                const sel = prop.select as { name: string } | null;
                return sel?.name || "";
            }
            case "multi_select": {
                const ms = prop.multi_select as { name: string }[];
                return ms?.map((s) => s.name).join(", ") || "";
            }
            default:
                return "";
        }
    }
    return "";
}
