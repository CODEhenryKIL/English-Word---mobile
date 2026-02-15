"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateNextDueDate } from "@/lib/spaced-repetition";

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

    const currentStep = wordbook.current_step;
    const now = new Date();

    // 다음 복습 예정일 계산
    const nextDueDate = calculateNextDueDate(now, currentStep);
    const nextDueDateStr = nextDueDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // study_logs에 기록 추가
    const { error: logError } = await supabase.from("study_logs").insert({
        wordbook_id: wordbookId,
        completed_step: currentStep + 1,
        next_due_date: nextDueDateStr,
    });

    if (logError) return { error: logError.message };

    // 단어장의 current_step 증가
    const { error: updateError } = await supabase
        .from("wordbooks")
        .update({ current_step: currentStep + 1 })
        .eq("id", wordbookId);

    if (updateError) return { error: updateError.message };

    return {
        success: true,
        completedStep: currentStep + 1,
        nextDueDate: nextDueDateStr,
    };
}

// 특정 날짜의 복습 예정 단어장 조회
export async function getDueWordbooks(date?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

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

// 특정 월의 학습 기록 조회 (캘린더용)
export async function getStudyLogsForMonth(year: number, month: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate =
        month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const { data, error } = await supabase
        .from("study_logs")
        .select("*, wordbooks(title)")
        .gte("next_due_date", startDate)
        .lt("next_due_date", endDate);

    if (error) return [];
    return data || [];
}
