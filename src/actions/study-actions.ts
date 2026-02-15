"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthUserId } from "@/lib/auth-helper";
import { calculateNextDueDate, MAX_STEPS } from "@/lib/spaced-repetition";

// 학습 완료 처리 및 다음 복습일 계산
export async function completeStudySession(wordbookId: string) {
    const supabase = await createClient();

    // 현재 단어장 정보 조회
    const { data: wordbook, error: wbError } = await supabase
        .from("wordbooks")
        .select("current_step")
        .eq("id", wordbookId)
        .single();

    if (wbError || !wordbook) {
        return { error: "단어장을 찾을 수 없습니다." };
    }

    const currentStep = wordbook.current_step; // 0-based: 아직 1차도 안 한 상태
    const newStep = currentStep + 1; // 이번에 완료할 차수
    const now = new Date();

    // 다음 복습 예정일 계산
    const nextDueDate = calculateNextDueDate(now, newStep);
    const nextDueDateStr = nextDueDate.toISOString().split("T")[0];

    // study_logs에 기록 추가
    const { error: logError } = await supabase.from("study_logs").insert({
        wordbook_id: wordbookId,
        completed_step: newStep,
        next_due_date: nextDueDateStr,
    });

    if (logError) return { error: logError.message };

    // 단어장의 current_step 증가
    const { error: updateError } = await supabase
        .from("wordbooks")
        .update({ current_step: newStep })
        .eq("id", wordbookId);

    if (updateError) return { error: updateError.message };

    const isComplete = newStep >= MAX_STEPS;

    return {
        success: true,
        completedStep: newStep,
        nextDueDate: isComplete ? "학습 완료!" : nextDueDateStr,
    };
}

// 특정 날짜의 복습 예정 단어장 조회
export async function getDueWordbooks(date?: string) {
    const userId = await getAuthUserId();
    if (!userId) return [];

    const supabase = await createClient();
    const targetDate = date || new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
        .from("study_logs")
        .select("wordbook_id, completed_step, next_due_date, wordbooks(id, title, current_step)")
        .lte("next_due_date", targetDate)
        .order("next_due_date", { ascending: true });

    if (error) {
        console.error("복습 예정 조회 오류:", error);
        return [];
    }

    return data || [];
}

// 특정 단어장의 학습 기록 조회 (차수별 완료일)
export async function getStudyLogsForWordbook(wordbookId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("study_logs")
        .select("completed_step, next_due_date, created_at")
        .eq("wordbook_id", wordbookId)
        .order("completed_step", { ascending: true });

    if (error) return [];
    return data || [];
}

// 모든 단어장의 최신 학습 기록 조회
export async function getAllStudyLogs() {
    const userId = await getAuthUserId();
    if (!userId) return [];

    const supabase = await createClient();

    const { data, error } = await supabase
        .from("study_logs")
        .select("wordbook_id, completed_step, next_due_date, created_at")
        .order("completed_step", { ascending: true });

    if (error) return [];
    return data || [];
}
