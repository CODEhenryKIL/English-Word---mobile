// 간격 반복 스케줄링 로직

// 복습 간격 (일 단위): 1차→2차: 2일, 2차→3차: 1일, 3차→4차: 5일, 4차→5차: 23일, 5차→6차: 180일
// 인덱스 0 = 1차 완료 후 2차까지의 간격
const INTERVALS = [2, 1, 5, 23, 180];

// 총 학습 차수 (6차까지)
export const MAX_STEPS = 6;

/**
 * 현재 완료된 스텝에 따라 다음 복습까지의 간격(일수)을 반환
 * @param completedStep - 현재 완료된 학습 차수 (1부터 시작, 0은 미학습)
 * @returns 다음 복습까지의 일수 (6차 이후는 -1)
 */
export function getIntervalDays(completedStep: number): number {
    if (completedStep <= 0) return 0;
    if (completedStep > INTERVALS.length) return -1; // 6차 이후 없음
    return INTERVALS[completedStep - 1]; // 1차 완료 → index 0 = 2일
}

/**
 * 학습 완료 날짜와 스텝을 기반으로 다음 복습 예정일을 계산
 */
export function calculateNextDueDate(
    completionDate: Date,
    completedStep: number
): Date {
    const intervalDays = getIntervalDays(completedStep);
    if (intervalDays <= 0) {
        // 6차 학습 완료 이후는 지정하지 않음
        const farFuture = new Date(completionDate);
        farFuture.setFullYear(farFuture.getFullYear() + 10);
        return farFuture;
    }
    const nextDate = new Date(completionDate);
    nextDate.setDate(nextDate.getDate() + intervalDays);
    return nextDate;
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

/**
 * 특정 차수의 예정일을 1차 학습 완료일 기준으로 누적 계산
 * @param firstCompletionDate - 1차 학습 완료일
 * @param targetStep - 예정일을 계산할 차수 (2~5, 6차는 없음)
 * @returns Date 객체 또는 null
 */
export function getScheduledDate(
    firstCompletionDate: Date,
    targetStep: number
): Date | null {
    if (targetStep <= 1 || targetStep > INTERVALS.length) return null;

    let cumDays = 0;
    for (let i = 0; i < targetStep - 1; i++) {
        cumDays += INTERVALS[i];
    }

    const date = new Date(firstCompletionDate);
    date.setDate(date.getDate() + cumDays);
    return date;
}
