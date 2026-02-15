"use server";

// Notion 페이지 내 표(table block)에서 단어 데이터를 가져오기
export async function importFromNotion(pageUrl: string) {
    const notionApiKey = process.env.NOTION_API_KEY;
    if (!notionApiKey) {
        return { error: "Notion API 키가 설정되지 않았습니다." };
    }

    // URL에서 Page ID 추출
    const pageId = extractPageId(pageUrl);
    if (!pageId) {
        return { error: "유효하지 않은 Notion 페이지 URL입니다." };
    }

    const headers = {
        Authorization: `Bearer ${notionApiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    };

    try {
        // Step 1: 페이지 정보 가져오기 (제목)
        let pageTitle = "Notion 단어장";
        try {
            const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, { headers });
            if (pageRes.ok) {
                const pageData = await pageRes.json();
                const titleProp = pageData.properties?.title?.title
                    ?? pageData.properties?.["이름"]?.title
                    ?? pageData.properties?.["Name"]?.title;
                if (titleProp?.[0]?.plain_text) {
                    pageTitle = titleProp[0].plain_text;
                }
            }
        } catch {
            // 제목 가져오기 실패해도 계속 진행
        }

        // Step 2: 먼저 데이터베이스로 시도
        const dbWords = await tryAsDatabase(pageId, headers);
        if (dbWords) {
            return { data: dbWords, title: pageTitle };
        }

        // Step 3: 페이지의 블록 자식들에서 table 블록 찾기
        const allBlocks = await getAllBlocks(pageId, headers);

        // table 타입 블록 찾기
        const tableBlocks = allBlocks.filter(
            (b: any) => b.type === "table"
        );

        if (tableBlocks.length === 0) {
            return { error: "페이지에서 표를 찾을 수 없습니다. 노션 Integration이 이 페이지에 연결되어 있는지 확인해주세요." };
        }

        // 모든 표에서 단어 추출
        const allWords: any[] = [];

        for (const tableBlock of tableBlocks) {
            const tableRows = await getAllBlocks(tableBlock.id, headers);
            if (tableRows.length === 0) continue;

            // 첫 번째 행 = 헤더
            const headerRow = tableRows[0];
            const headerCells = extractTableRowCells(headerRow);

            // 컬럼 인덱스 매핑
            const colMap = mapColumns(headerCells);

            // 나머지 행 = 데이터
            for (let i = 1; i < tableRows.length; i++) {
                const cells = extractTableRowCells(tableRows[i]);
                if (!cells || cells.length === 0) continue;

                const rawWord = cells[colMap.word] || "";
                const rawMeaning = cells[colMap.meaning] || "";
                const rawEtymology = cells[colMap.etymology] || "";
                const rawRoot = cells[colMap.root] || "";
                const rawPronunciation = cells[colMap.pronunciation] || "";

                // "품) 의미" 형태 파싱: "형) 기업의, 회사의" → 품사: "형", 의미: "기업의, 회사의"
                const { partOfSpeech, meaning } = parseMeaningCell(rawMeaning);

                // 빈 행이나 어원 행(단어만 있고 의미 없는 행) 필터링
                if (!rawWord.trim() || !meaning.trim()) continue;

                // 어원 행인지 확인 (예: "corpor / corp" 같은 어원 설명 행)
                // - 의미가 "어원)" 으로 시작하면 스킵
                if (rawMeaning.trim().startsWith("어원)")) continue;

                allWords.push({
                    word: rawWord.trim(),
                    meaning: meaning.trim(),
                    part_of_speech: partOfSpeech || undefined,
                    pronunciation: rawPronunciation.trim() || undefined,
                    root_affix: rawRoot.trim() || undefined,
                    etymology: rawEtymology.trim() || undefined,
                });
            }
        }

        if (allWords.length === 0) {
            return { error: "표에서 단어를 추출할 수 없습니다. 표 형식을 확인해주세요." };
        }

        return { data: allWords, title: pageTitle };
    } catch (err) {
        return { error: `Notion 연동 오류: ${String(err)}` };
    }
}

// --- 데이터베이스 모드 시도 ---
async function tryAsDatabase(
    id: string,
    headers: Record<string, string>
): Promise<any[] | null> {
    try {
        const dbRes = await fetch(`https://api.notion.com/v1/databases/${id}`, { headers });
        if (!dbRes.ok) return null;

        const dbData = await dbRes.json();

        // 데이터베이스 쿼리
        let allResults: any[] = [];
        let hasMore = true;
        let startCursor: string | undefined;

        while (hasMore) {
            const body: any = {};
            if (startCursor) body.start_cursor = startCursor;

            const queryRes = await fetch(
                `https://api.notion.com/v1/databases/${id}/query`,
                { method: "POST", headers, body: JSON.stringify(body) }
            );

            if (!queryRes.ok) return null;

            const queryData = await queryRes.json();
            allResults = [...allResults, ...queryData.results];
            hasMore = queryData.has_more;
            startCursor = queryData.next_cursor;
        }

        const words = allResults.map((page: any) => {
            const props = page.properties || {};
            return {
                word: extractDbPropText(props, ["단어", "영단어", "word", "Word"]),
                meaning: extractDbPropText(props, ["의미", "뜻", "meaning", "Meaning", "품) 의미"]),
                part_of_speech: extractDbPropText(props, ["품사", "part_of_speech"]),
                pronunciation: extractDbPropText(props, ["발음", "발음기호", "pronunciation"]),
                root_affix: extractDbPropText(props, ["어근", "어근구성", "어근 구성", "root_affix"]),
                etymology: extractDbPropText(props, ["어원", "어원의미", "어원 의미", "etymology"]),
                memo: extractDbPropText(props, ["메모", "기타", "memo"]),
            };
        }).filter((w) => w.word && w.meaning);

        return words.length > 0 ? words : null;
    } catch {
        return null;
    }
}

// --- 블록 가져오기 (페이지네이션 포함) ---
async function getAllBlocks(
    blockId: string,
    headers: Record<string, string>
): Promise<any[]> {
    let allBlocks: any[] = [];
    let hasMore = true;
    let startCursor: string | undefined;

    while (hasMore) {
        const url = new URL(`https://api.notion.com/v1/blocks/${blockId}/children`);
        if (startCursor) url.searchParams.set("start_cursor", startCursor);
        url.searchParams.set("page_size", "100");

        const res = await fetch(url.toString(), { headers });
        if (!res.ok) break;

        const data = await res.json();
        allBlocks = [...allBlocks, ...data.results];
        hasMore = data.has_more;
        startCursor = data.next_cursor;
    }

    return allBlocks;
}

// --- table_row의 셀 텍스트 추출 ---
function extractTableRowCells(row: any): string[] {
    if (row?.type !== "table_row") return [];
    const cells = row.table_row?.cells || [];
    return cells.map((cell: any[]) =>
        cell?.map((rt: any) => rt.plain_text || "").join("") || ""
    );
}

// --- 헤더 행에서 컬럼 인덱스 매핑 ---
function mapColumns(headers: string[]) {
    const map = { word: 0, meaning: 1, etymology: 2, root: 3, pronunciation: 4 };

    headers.forEach((h, i) => {
        const lower = h.toLowerCase().trim();
        if (lower.includes("단어") || lower.includes("word") || lower === "영단어") {
            map.word = i;
        } else if (lower.includes("의미") || lower.includes("뜻") || lower.includes("meaning")) {
            map.meaning = i;
        } else if (lower.includes("어원")) {
            map.etymology = i;
        } else if (lower.includes("어근")) {
            map.root = i;
        } else if (lower.includes("발음") || lower.includes("pronunciation")) {
            map.pronunciation = i;
        }
    });

    return map;
}

// --- "품) 의미" 형태 파싱 ---
// 입력: "형) 기업의, 회사의, 공동의"
// 출력: { partOfSpeech: "형용사", meaning: "기업의, 회사의, 공동의" }
function parseMeaningCell(raw: string): { partOfSpeech: string; meaning: string } {
    if (!raw) return { partOfSpeech: "", meaning: "" };

    // "품사) 의미" 패턴
    const match = raw.match(/^([가-힣]+)\)\s*(.+)/s);
    if (match) {
        const abbr = match[1].trim();
        const meaning = match[2].trim();

        // 품사 약어 → 정식 명칭
        const posMap: Record<string, string> = {
            "명": "명사", "동": "동사", "형": "형용사",
            "부": "부사", "전": "전치사", "접": "접속사",
            "대": "대명사", "감": "감탄사",
        };

        return {
            partOfSpeech: posMap[abbr] || abbr,
            meaning,
        };
    }

    // 여러 품사가 개행으로 구분: "명) 시체\n동) 시체가 되다"
    // → 첫 번째 것만 사용
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
        const firstLine = lines[0];
        const lineMatch = firstLine.match(/^([가-힣]+)\)\s*(.+)/);
        if (lineMatch) {
            const allMeanings = lines.map(line => {
                const lm = line.match(/^([가-힣]+)\)\s*(.+)/);
                return lm ? `${lm[1]}) ${lm[2]}` : line;
            }).join(" / ");

            return {
                partOfSpeech: "",
                meaning: allMeanings,
            };
        }
    }

    return { partOfSpeech: "", meaning: raw };
}

// --- URL에서 Notion Page/Database ID 추출 ---
function extractPageId(url: string): string | null {
    const dashRegex = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;
    const dashMatch = url.match(dashRegex);
    if (dashMatch) return dashMatch[0];

    // 32자리 hex ID → UUID 포맷으로 변환
    const hexRegex = /([a-f0-9]{32})/i;
    const hexMatch = url.match(hexRegex);
    if (hexMatch) {
        const id = hexMatch[1];
        return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
    }

    return null;
}

// --- 데이터베이스 프로퍼티에서 텍스트 추출 ---
function extractDbPropText(
    properties: Record<string, any>,
    possibleNames: string[]
): string {
    for (const name of possibleNames) {
        const prop = properties[name];
        if (!prop) continue;

        switch (prop.type) {
            case "title":
                return prop.title?.map((t: any) => t.plain_text).join("") || "";
            case "rich_text":
                return prop.rich_text?.map((t: any) => t.plain_text).join("") || "";
            case "select":
                return prop.select?.name || "";
            case "multi_select":
                return prop.multi_select?.map((s: any) => s.name).join(", ") || "";
            default:
                return "";
        }
    }
    return "";
}
