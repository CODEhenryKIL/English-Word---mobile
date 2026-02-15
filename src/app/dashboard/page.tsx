"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getWordbooks, deleteWordbook } from "@/actions/wordbook-actions";
import { getAllStudyLogs, getDueWordbooks } from "@/actions/study-actions";
import { signOut } from "@/actions/auth-actions";
import ExcelUploadModal from "@/components/ExcelUploadModal";
import NotionImportModal from "@/components/NotionImportModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    Plus,
    FileSpreadsheet,
    BookMarked,
    BookOpen,
    LogOut,
    Loader2,
    GraduationCap,
    Trash2,
    Check,
} from "lucide-react";
import { MAX_STEPS, getIntervalDays } from "@/lib/spaced-repetition";

export default function DashboardPage() {
    const router = useRouter();
    const [wordbooks, setWordbooks] = useState<any[]>([]);
    const [studyLogs, setStudyLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [showNotionModal, setShowNotionModal] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [wbs, logs] = await Promise.all([
                getWordbooks(),
                getAllStudyLogs(),
            ]);
            setWordbooks(wbs);
            setStudyLogs(logs);
        } catch (err) {
            console.error("데이터 로드 오류:", err);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    async function handleDelete(id: string, title: string) {
        if (!confirm(`"${title}" 단어장을 삭제하시겠습니까?\n모든 단어와 학습 기록이 삭제됩니다.`)) return;
        await deleteWordbook(id);
        loadData();
    }

    // 단어장의 학습 로그에서 각 차수의 완료 날짜 가져오기
    function getStepCompletionDate(wordbookId: string, step: number): string | null {
        const log = studyLogs.find(
            (l: any) => l.wordbook_id === wordbookId && l.completed_step === step
        );
        if (!log) return null;
        // created_at 에서 날짜만 추출
        return log.created_at ? log.created_at.split("T")[0] : null;
    }

    // 다음 복습 예정일 계산 (DB의 next_due_date 대신 실시간 계산)
    function getNextDueDate(wordbookId: string): string | null {
        const wbLogs = studyLogs
            .filter((l: any) => l.wordbook_id === wordbookId)
            .sort((a: any, b: any) => b.completed_step - a.completed_step);

        if (wbLogs.length === 0) return null;

        const latestLog = wbLogs[0];
        const completedStep = latestLog.completed_step;
        const interval = getIntervalDays(completedStep);

        if (interval <= 0) return null; // 모든 학습 완료

        // 완료일(created_at) + 간격 = 다음 복습일
        const completionDate = latestLog.created_at ? latestLog.created_at.split("T")[0] : null;
        if (!completionDate) return null;

        const d = new Date(completionDate + "T00:00:00");
        d.setDate(d.getDate() + interval);
        return d.toISOString().split("T")[0];
    }

    // 날짜 포맷 (M/D)
    function formatDate(dateStr: string | null): string {
        if (!dateStr) return "";
        const d = new Date(dateStr + "T00:00:00");
        return `${d.getMonth() + 1}/${d.getDate()}`;
    }

    return (
        <div className="flex flex-col min-h-dvh bg-gradient-to-b from-background to-secondary/20">
            {/* 상단 헤더 */}
            <header className="sticky top-0 z-50 px-4 pt-3 pb-2 bg-background/80 backdrop-blur-xl border-b border-border/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                        <h1 className="text-lg font-bold">VocabMaster</h1>
                    </div>
                    <form action={signOut}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" type="submit">
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
            </header>

            {/* 본문 */}
            <div className="flex-1 p-4 space-y-4 pb-24">
                {/* 단어장 목록 헤더 */}
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-400" />
                        내 단어장
                    </h2>
                    <span className="text-xs text-muted-foreground">{wordbooks.length}개</span>
                </div>

                {/* 로딩 */}
                {loading && (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    </div>
                )}

                {/* 빈 상태 */}
                {!loading && wordbooks.length === 0 && (
                    <div className="text-center py-16">
                        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">아직 단어장이 없습니다</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            아래 + 버튼을 눌러 첫 단어장을 만들어보세요
                        </p>
                    </div>
                )}

                {/* 단어장 카드 리스트 */}
                <div className="grid grid-cols-1 gap-4">
                    {wordbooks.map((wb: any, idx: number) => {
                        const wordCount = wb.words?.[0]?.count ?? 0;
                        const currentStep = wb.current_step || 0;
                        const isAllDone = currentStep >= MAX_STEPS;
                        const nextDue = getNextDueDate(wb.id);
                        const today = new Date().toISOString().split("T")[0];
                        const isDueNow = nextDue && nextDue <= today && !isAllDone;

                        return (
                            <Card
                                key={wb.id}
                                className={`relative overflow-hidden backdrop-blur-sm cursor-pointer active:scale-[0.98] transition-all ${isDueNow
                                    ? "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20 shadow-lg shadow-amber-500/10"
                                    : "border-border/30 bg-card/80"
                                    }`}
                                style={{ animationDelay: `${idx * 50}ms` }}
                                onClick={() => router.push(`/wordbook/${wb.id}`)}
                            >
                                <div className="p-4">
                                    {/* 타이틀 행 */}
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-sm truncate">{wb.title}</h3>
                                                {isDueNow && (
                                                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 shrink-0 animate-pulse">
                                                        복습 필요
                                                    </Badge>
                                                )}
                                                {isAllDone && (
                                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0 shrink-0">
                                                        완료 ✓
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {wordCount}개 단어
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground/50 hover:text-destructive shrink-0"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(wb.id, wb.title);
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>

                                    {/* 학습 단계 표시 (1차 ~ 6차) */}
                                    <div className="mt-3 grid grid-cols-6 gap-1">
                                        {Array.from({ length: MAX_STEPS }, (_, i) => {
                                            const step = i + 1; // 1~6
                                            const isCompleted = currentStep >= step;
                                            const isNext = currentStep === step - 1 && !isAllDone;

                                            // 완료된 날짜
                                            const completionDate = getStepCompletionDate(wb.id, step);

                                            // 다음 차수의 예정일: 직전 차수 완료 후 계산
                                            let scheduledDate: string | null = null;
                                            if (isNext && step >= 2) {
                                                // 직전 차수(step-1)의 완료일 + 간격
                                                const prevDate = getStepCompletionDate(wb.id, step - 1);
                                                if (prevDate) {
                                                    const interval = getIntervalDays(step - 1);
                                                    if (interval > 0) {
                                                        const d = new Date(prevDate + "T00:00:00");
                                                        d.setDate(d.getDate() + interval);
                                                        scheduledDate = `${d.getMonth() + 1}/${d.getDate()}`;
                                                    }
                                                }
                                            }

                                            // 간격 라벨 (1~5차만, 6차는 빈칸)
                                            const intervalLabels = ["D-Day", "+1일", "+1일", "+5일", "+180일", ""];

                                            return (
                                                <div
                                                    key={step}
                                                    className={`flex flex-col items-center rounded-lg py-2 px-0.5 transition-all ${isCompleted
                                                        ? "bg-indigo-500/15"
                                                        : isNext
                                                            ? "bg-amber-500/10 ring-1 ring-amber-500/30"
                                                            : "bg-secondary/30"
                                                        }`}
                                                >
                                                    {/* 차수 라벨 */}
                                                    <span className={`text-[10px] font-semibold ${isCompleted
                                                        ? "text-indigo-400"
                                                        : isNext
                                                            ? "text-amber-400"
                                                            : "text-muted-foreground/50"
                                                        }`}>
                                                        {step}차
                                                    </span>

                                                    {/* 체크 또는 간격 */}
                                                    <div className="mt-1 h-6 flex items-center justify-center">
                                                        {isCompleted ? (
                                                            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                                                                <Check className="w-3 h-3 text-white" />
                                                            </div>
                                                        ) : intervalLabels[step - 1] ? (
                                                            <span className="text-[9px] text-muted-foreground/60">
                                                                {intervalLabels[step - 1]}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] text-muted-foreground/30">—</span>
                                                        )}
                                                    </div>

                                                    {/* 날짜: 완료일 또는 예정일 */}
                                                    <span className={`text-[8px] mt-0.5 ${isCompleted
                                                        ? "text-indigo-400/60"
                                                        : isNext && scheduledDate
                                                            ? "text-amber-400"
                                                            : "text-transparent"
                                                        }`}>
                                                        {isCompleted && completionDate
                                                            ? formatDate(completionDate)
                                                            : isNext && scheduledDate
                                                                ? scheduledDate
                                                                : "—"}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* 다음 복습 안내 */}
                                    {!isAllDone && nextDue && (
                                        <p className="text-[10px] text-muted-foreground mt-2 text-center">
                                            다음 복습: <span className={isDueNow ? "text-amber-400 font-semibold" : "text-indigo-400"}>{formatDate(nextDue)}</span>
                                        </p>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* 하단 추가 버튼 (FAB) */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-2 safe-bottom">
                {showAddMenu && (
                    <div className="flex flex-col gap-2 animate-slide-up">
                        <Button
                            className="rounded-xl shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            onClick={() => { setShowAddMenu(false); setShowExcelModal(true); }}
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            엑셀 업로드
                        </Button>
                        <Button
                            className="rounded-xl shadow-lg bg-slate-700 hover:bg-slate-600 text-white gap-2"
                            onClick={() => { setShowAddMenu(false); setShowNotionModal(true); }}
                        >
                            <BookMarked className="w-4 h-4" />
                            Notion 가져오기
                        </Button>
                    </div>
                )}

                <Button
                    size="icon"
                    className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-xl shadow-indigo-500/30 animate-pulse-glow"
                    onClick={() => setShowAddMenu(!showAddMenu)}
                >
                    <Plus className={`w-6 h-6 text-white transition-transform ${showAddMenu ? "rotate-45" : ""}`} />
                </Button>
            </div>

            {/* 모달들 */}
            <ExcelUploadModal
                open={showExcelModal}
                onOpenChange={setShowExcelModal}
                onSuccess={loadData}
            />
            <NotionImportModal
                open={showNotionModal}
                onOpenChange={setShowNotionModal}
                onSuccess={loadData}
            />
        </div>
    );
}
