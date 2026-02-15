// 엑셀 파싱 유틸리티
import * as XLSX from "xlsx";

export interface ParsedWord {
    word: string;
    part_of_speech: string;
    meaning: string;
    pronunciation: string;
    root_affix: string;
    etymology: string;
    memo: string;
}

// 엑셀 컬럼 매핑 (정규화된 키 → 필드명)
// 키는 모두 소문자+공백제거 형태로 저장
const COLUMN_MAP: Record<string, keyof ParsedWord> = {
    // 단어
    "단어": "word",
    "영단어": "word",
    "word": "word",
    // 품사
    "품사": "part_of_speech",
    "partofspeech": "part_of_speech",
    "part_of_speech": "part_of_speech",
    // 의미
    "의미": "meaning",
    "뜻": "meaning",
    "meaning": "meaning",
    "품)의미": "meaning",
    // 발음
    "발음": "pronunciation",
    "발음기호": "pronunciation",
    "pronunciation": "pronunciation",
    // 어근
    "어근": "root_affix",
    "어근구성": "root_affix",
    "구성": "root_affix",
    "rootaffix": "root_affix",
    "root_affix": "root_affix",
    // 어원
    "어원": "etymology",
    "어원의미": "etymology",
    "어원설명": "etymology",
    "etymology": "etymology",
    // 메모
    "메모": "memo",
    "기타": "memo",
    "기타메모": "memo",
    "memo": "memo",
};

/**
 * 헤더를 정규화: trim + 소문자 + 공백 제거
 */
function normalizeHeader(header: string): string {
    return header.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * ArrayBuffer로부터 엑셀 데이터를 파싱하여 단어 배열로 변환
 */
export function parseExcelBuffer(buffer: ArrayBuffer): ParsedWord[] {
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // JSON 변환 시 빈 셀을 빈 문자열로 채움 (데이터 누락 방지)
    const rawData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
        defval: "",
    });

    if (rawData.length === 0) return [];

    // 첫 번째 행의 헤더를 기반으로 매핑 생성
    const headers = Object.keys(rawData[0]);
    const mapping: Record<string, keyof ParsedWord> = {};

    // 디버그: 콘솔에 헤더 출력
    console.log("[Excel Parser] 원본 헤더:", headers);

    headers.forEach((header) => {
        const normalized = normalizeHeader(header);
        for (const [key, field] of Object.entries(COLUMN_MAP)) {
            if (normalized === key) {
                mapping[header] = field;
                console.log(`[Excel Parser] 매핑: "${header}" → ${field}`);
                break;
            }
        }

        // 부분 일치 폴백: 매핑 안 됐으면 contains 체크
        if (!mapping[header]) {
            if (normalized.includes("어근") || normalized.includes("root")) {
                mapping[header] = "root_affix";
                console.log(`[Excel Parser] 부분매칭: "${header}" → root_affix`);
            } else if (normalized.includes("어원") || normalized.includes("etymo")) {
                mapping[header] = "etymology";
                console.log(`[Excel Parser] 부분매칭: "${header}" → etymology`);
            } else if (normalized.includes("메모") || normalized.includes("memo") || normalized.includes("기타")) {
                mapping[header] = "memo";
                console.log(`[Excel Parser] 부분매칭: "${header}" → memo`);
            }
        }
    });

    // 매핑되지 않은 컬럼이 있으면 순서대로 기본 매핑
    if (!Object.values(mapping).includes("word") && headers.length >= 1) {
        mapping[headers[0]] = "word";
    }
    if (!Object.values(mapping).includes("meaning") && headers.length >= 2) {
        const meaningCol = headers.find((h) => !mapping[h]) || headers[1];
        mapping[meaningCol] = "meaning";
    }

    console.log("[Excel Parser] 최종 매핑:", mapping);

    const results = rawData.map((row) => {
        const word: ParsedWord = {
            word: "",
            part_of_speech: "",
            meaning: "",
            pronunciation: "",
            root_affix: "",
            etymology: "",
            memo: "",
        };

        for (const [header, field] of Object.entries(mapping)) {
            word[field] = String(row[header] || "").trim();
        }

        return word;
    }).filter((w) => w.word && w.meaning);

    // 첫 번째 단어의 모든 필드를 로깅
    if (results.length > 0) {
        console.log("[Excel Parser] 첫 번째 파싱 결과:", JSON.stringify(results[0]));
    }

    return results;
}
