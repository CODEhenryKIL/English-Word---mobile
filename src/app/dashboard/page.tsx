"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getWordbooks } from "@/actions/wordbook-actions";
import { getStudyLogsForMonth, getDueWordbooks } from "@/actions/study-actions";
import { signOut } from "@/actions/auth-actions";
import ExcelUploadModal from "@/components/ExcelUploadModal";
import NotionImportModal from "@/components/NotionImportModal";
import CalendarWidget from "@/components/CalendarWidget";
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
} from "lucide-react";
import { deleteWordbook } from "@/actions/wordbook-actions";
import { getStepLabel } from "@/lib/spaced-repetition";

export default function DashboardPage() {
    const router = useRouter();
    const [wordbooks, setWordbooks] = useState<any[]>([]);
    const [studyLogs, setStudyLogs] = useState<any[]>([]);
    const [dueCount, setDueCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [showNotionModal, setShowNotionModal] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [wbs, dues] = await Promise.all([
                getWordbooks(),
                getDueWordbooks(),
            ]);
            setWordbooks(wbs);
            setDueCount(dues.length);

            // 현재 월의 학습 기록
            const now = new Date();
            const logs = await getStudyLogsForMonth(now.getFullYear(), now.getMonth() + 1);
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

    // 단어장마다 복습 필요 여부 체크
    function isDue(wordbookId: string): boolean {
        const today = new Date().toISOString().split("T")[0];
        return studyLogs.some(
            (log: any) => log.wordbook_id === wordbookId && log.next_due_date <= today
        );
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
                {/* 캘린더 위젯 */}
                <CalendarWidget studyLogs={studyLogs} dueCount={dueCount} />

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

                {/* 단어장 카드 그리드 */}
                <div className="grid grid-cols-1 gap-3">
                    {wordbooks.map((wb: any, idx: number) => {
                        const wordCount = wb.words?.[0]?.count ?? 0;
                        const due = isDue(wb.id);

                        return (
                            <Card
                                key={wb.id}
                                className="relative overflow-hidden border-border/30 bg-card/80 backdrop-blur-sm cursor-pointer active:scale-[0.98] transition-all"
                                style={{ animationDelay: `${idx * 50}ms` }}
                                onClick={() => router.push(`/wordbook/${wb.id}`)}
                            >
                                <div className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-sm truncate">{wb.title}</h3>
                                                {due && (
                                                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 shrink-0">
                                                        복습 필요
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                <span>{wordCount}개 단어</span>
                                                <span>•</span>
                                                <span>{getStepLabel(wb.current_step)}</span>
                                            </div>
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

                                    {/* 진행 바 */}
                                    <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all"
                                            style={{ width: `${Math.min((wb.current_step / 6) * 100, 100)}%` }}
                                        />
                                    </div>
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
