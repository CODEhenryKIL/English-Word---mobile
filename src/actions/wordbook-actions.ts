"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/auth-helper";

// 단어장 목록 조회
export async function getWordbooks() {
    const userId = await getAuthUserId();
    if (!userId) return [];

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("wordbooks")
        .select("*, words(count), study_logs(completed_step, next_due_date)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("단어장 조회 오류:", error);
        return [];
    }

    return data || [];
}

// 단어장 생성
export async function createWordbook(title: string) {
    const userId = await getAuthUserId();
    if (!userId) return { error: "인증되지 않은 사용자입니다." };

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("wordbooks")
        .insert({ user_id: userId, title })
        .select()
        .single();

    if (error) return { error: error.message };
    return { data };
}

// 단어장에 단어 일괄 추가 (Bulk Insert)
export async function bulkInsertWords(
    wordbookId: string,
    words: {
        word: string;
        part_of_speech?: string;
        meaning: string;
        pronunciation?: string;
        root_affix?: string;
        etymology?: string;
        memo?: string;
    }[]
) {
    const supabase = await createClient();

    const mappedWords = words.map((w) => ({
        wordbook_id: wordbookId,
        word: w.word,
        part_of_speech: w.part_of_speech || null,
        meaning: w.meaning,
        pronunciation: w.pronunciation || null,
        root_affix: w.root_affix || null,
        etymology: w.etymology || null,
        memo: w.memo || null,
    }));

    // 500개씩 나누어 삽입 (Supabase 제한 대응)
    const chunkSize = 500;
    for (let i = 0; i < mappedWords.length; i += chunkSize) {
        const chunk = mappedWords.slice(i, i + chunkSize);
        const { error } = await supabase.from("words").insert(chunk);
        if (error) return { error: error.message };
    }

    return { success: true, count: mappedWords.length };
}

// 단어장의 단어 목록 조회
export async function getWords(wordbookId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("words")
        .select("*")
        .eq("wordbook_id", wordbookId)
        .order("created_at", { ascending: true }); // 입력 순서 보장

    if (error) return [];
    return data || [];
}

// 단어 정보 수정 (어원, 메모 등)
export async function updateWord(
    wordId: string,
    updates: {
        root_affix?: string;
        etymology?: string;
        memo?: string;
    }
) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("words")
        .update(updates)
        .eq("id", wordId);

    if (error) return { error: error.message };
    return { success: true };
}

// 단어장 상세 정보 조회
export async function getWordbook(wordbookId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("wordbooks")
        .select("*")
        .eq("id", wordbookId)
        .single();

    if (error) return null;
    return data;
}

// 단어 별표(is_starred) 토글
export async function toggleStarred(wordId: string, isStarred: boolean) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("words")
        .update({ is_starred: isStarred })
        .eq("id", wordId);

    if (error) return { error: error.message };
    return { success: true };
}

// 단어장 삭제
export async function deleteWordbook(wordbookId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("wordbooks")
        .delete()
        .eq("id", wordbookId);

    if (error) return { error: error.message };
    return { success: true };
}

// 단어장 이름 변경
export async function updateWordbookTitle(id: string, newTitle: string) {
    const userId = await getAuthUserId();
    if (!userId) return { error: "인증되지 않은 사용자입니다." };

    if (!newTitle.trim()) return { error: "제목을 입력해주세요." };

    const supabase = await createClient();
    const { error } = await supabase
        .from("wordbooks")
        .update({ title: newTitle.trim() })
        .eq("id", id)
        .eq("user_id", userId);

    if (error) return { error: error.message };
    return { success: true };
}
