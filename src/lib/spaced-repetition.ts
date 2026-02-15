// 간격 반복 스케줄링 로직
import { formatToLocalDate } from "@/lib/date-utils";

// 복습 간격 (일 단위): 1차→2차: 1일, 2차→3차: 1일, 3차→4차: 5일, 4차→5차: 180일
// 인덱스 0 = 1차 완료 후 2차까지의 간격
const INTERVALS = [1, 1, 5, 180];

// 총 학습 차수 (6차까지)
export const MAX_STEPS = 6;

/**
 * 현재 완료된 스텝에 따라 다음 복습까지의 간격(일수)을 반환
 * @param completedStep - 현재 완료된 학습 차수 (1부터 시작, 0은 미학습)
 * @returns 다음 복습까지의 일수 (5차 이후는 -1)
 */
export function getIntervalDays(completedStep: number): number {
    if (completedStep <= 0) return 0;
    if (completedStep > INTERVALS.length) return -1; // 5차 이후 없음
    return INTERVALS[completedStep - 1]; // 1차 완료 → index 0 = 1일
}

/**
 * 학습 완료 날짜와 스텝을 기반으로 다음 복습 예정일을 계산 (YYYY-MM-DD 반환)
 */
export function calculateNextDueDate(
    completionDate: Date | string,
    completedStep: number
): string {
    const intervalDays = getIntervalDays(completedStep);

    // 5차 이후인 경우 멀리 설정
    if (intervalDays <= 0) {
        // 10년 뒤
        const d = new Date();
        d.setFullYear(d.getFullYear() + 10);
        return formatToLocalDate(d);
    }

    // 날짜 처리: 문자열이든 Date든 로컬 기준 YYYY-MM-DD로 변환
    const baseDateStr = formatToLocalDate(completionDate);
    const d = new Date(baseDateStr); // YYYY-MM-DD -> 로컬 00:00

    d.setDate(d.getDate() + intervalDays);

    return formatToLocalDate(d); // 다시 YYYY-MM-DD로 변환
}

/**
 * 스텝 번호를 한국어 라벨로 변환
 */
export function getStepLabel(step: number): string {
    if (step === 0) return "미학습";
    if (step >= MAX_STEPS) return "학습 완료";
    return `${step}차 완료`;
}

/**
 * 스텝 번호에 따른 간격 설명
 */
export function getIntervalDescription(step: number): string {
    const days = getIntervalDays(step);
    if (days <= 0) return "완료";
    if (days >= 30) {
        const months = Math.floor(days / 30);
        return `${months}개월 후`;
    }
    return `${days}일 후`;
}
