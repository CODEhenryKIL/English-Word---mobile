// 에빙하우스 간격 반복 스케줄링 로직

// 고정 간격 상수 (일 단위)
const INTERVALS = [1, 2, 3, 7, 30, 180];
// 7차 이후 반복 간격
const REPEAT_INTERVALS = [1, 2, 3];

/**
 * 현재 스텝에 따라 다음 복습까지의 간격(일수)을 반환
 * @param currentStep - 현재 완료된 학습 차수 (0부터 시작)
 * @returns 다음 복습까지의 일수
 */
export function getIntervalDays(currentStep: number): number {
    if (currentStep < INTERVALS.length) {
        return INTERVALS[currentStep];
    }
    // 7차 이후: [1, 2, 3] 반복
    const repeatIndex = (currentStep - INTERVALS.length) % REPEAT_INTERVALS.length;
    return REPEAT_INTERVALS[repeatIndex];
}

/**
 * 현재 날짜와 스텝을 기반으로 다음 복습 예정일을 계산
 * @param completionDate - 학습 완료 날짜
 * @param currentStep - 현재 완료된 학습 차수
 * @returns 다음 복습 예정일 (Date 객체)
 */
export function calculateNextDueDate(
    completionDate: Date,
    currentStep: number
): Date {
    const intervalDays = getIntervalDays(currentStep);
    const nextDate = new Date(completionDate);
    nextDate.setDate(nextDate.getDate() + intervalDays);
    return nextDate;
}

/**
 * 스텝 번호를 한국어 라벨로 변환
 * @param step - 학습 차수
 * @returns 표시용 문자열
 */
export function getStepLabel(step: number): string {
    if (step === 0) return "미학습";
    if (step <= 6) return `${step}차 학습 완료`;
    return `심화 ${step - 6}차 완료`;
}

/**
 * 스텝 번호에 따른 간격 설명
 */
export function getIntervalDescription(step: number): string {
    const days = getIntervalDays(step);
    if (days >= 30) {
        const months = Math.floor(days / 30);
        return `${months}개월 후 복습`;
    }
    return `${days}일 후 복습`;
}
