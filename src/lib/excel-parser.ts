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

// 엑셀 컬럼 매핑 (한국어 헤더 → 필드명)
const COLUMN_MAP: Record<string, keyof ParsedWord> = {
    "단어": "word",
    "영단어": "word",
    "word": "word",
    "품사": "part_of_speech",
    "part_of_speech": "part_of_speech",
    "의미": "meaning",
    "뜻": "meaning",
    "meaning": "meaning",
    "품) 의미": "meaning",
    "발음": "pronunciation",
    "발음기호": "pronunciation",
    "pronunciation": "pronunciation",
    "어근": "root_affix",
    "어근구성": "root_affix",
    "어근 구성": "root_affix",
    "root_affix": "root_affix",
    "어원": "etymology",
    "어원의미": "etymology",
    "어원 의미": "etymology",
    "etymology": "etymology",
    "메모": "memo",
    "기타": "memo",
    "memo": "memo",
};

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

    headers.forEach((header) => {
        const normalizedHeader = header.trim().toLowerCase();
        for (const [key, field] of Object.entries(COLUMN_MAP)) {
            if (normalizedHeader === key.toLowerCase()) {
                mapping[header] = field;
                break;
            }
        }
    });

    // 매핑되지 않은 컬럼이 있으면 순서대로 기본 매핑
    if (!Object.values(mapping).includes("word") && headers.length >= 1) {
        mapping[headers[0]] = "word";
    }
    if (!Object.values(mapping).includes("meaning") && headers.length >= 2) {
        // 두 번째 또는 세 번째 컬럼을 의미로
        const meaningCol = headers.find((h) => !mapping[h]) || headers[1];
        mapping[meaningCol] = "meaning";
    }

    return rawData.map((row) => {
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
    }).filter((w) => w.word && w.meaning); // 단어와 의미가 없는 행은 제거
}
