/**
 * Date 객체를 로컬 타임존 기준 YYYY-MM-DD 문자열로 변환
 * toISOString()은 UTC 기준이라 한국 시간(KST) 00:00이 전날로 표시되는 문제 해결
 */
export function formatToLocalDate(date: Date | string | null): string {
    if (!date) return "";

    const d = typeof date === "string" ? new Date(date) : date;

    // 로컬 연, 월, 일 가져오기
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

/**
 * 날짜 문자열(YYYY-MM-DD)을 M/D 형식으로 변환
 */
export function formatToMMDD(dateStr: string | null): string {
    if (!dateStr) return "—";

    // YYYY-MM-DD 파싱
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;

    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    return `${month}/${day}`;
}

/**
 * 오늘 날짜를 YYYY-MM-DD 문자열로 반환 (로컬 기준)
 */
export function getTodayStr(): string {
    return formatToLocalDate(new Date());
}
