"use server";

import { createClient } from "@/lib/supabase/server";

// 오답 일괄 저장
export async function saveWrongAnswers(
    wordIds: string[],
    testSession: number
) {
    const supabase = await createClient();

    const records = wordIds.map((wordId) => ({
        word_id: wordId,
        test_session: testSession,
    }));

    const { error } = await supabase.from("wrong_answers").insert(records);

    if (error) return { error: error.message };
    return { success: true, count: records.length };
}

// 특정 단어장의 오답 단어 조회
export async function getWrongAnswerWords(wordbookId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("wrong_answers")
        .select("*, words!inner(*)")
        .eq("words.wordbook_id", wordbookId)
        .order("created_at", { ascending: false });

    if (error) return [];

    // 중복 제거 (같은 단어가 여러 번 틀린 경우)
    const uniqueWordIds = new Set<string>();
    const uniqueWords = (data || []).filter((item) => {
        if (uniqueWordIds.has(item.word_id)) return false;
        uniqueWordIds.add(item.word_id);
        return true;
    });

    return uniqueWords;
}

// 특정 단어장의 최대 테스트 세션 번호 조회
export async function getMaxTestSession(wordbookId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("wrong_answers")
        .select("test_session, words!inner(wordbook_id)")
        .eq("words.wordbook_id", wordbookId)
        .order("test_session", { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) return 0;
    return data[0].test_session;
}
