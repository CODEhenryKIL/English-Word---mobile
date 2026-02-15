// Fisher-Yates (Knuth) 셔플 알고리즘
// O(N) 시간 복잡도로 배열을 균일하게 무작위 배치

export function fisherYatesShuffle<T>(array: T[]): T[] {
    const shuffled = [...array]; // 원본 배열 보존
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
