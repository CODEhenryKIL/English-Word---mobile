"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StudyLogEntry {
    next_due_date: string;
    completed_step: number;
    wordbooks?: { title: string } | null;
}

interface CalendarWidgetProps {
    studyLogs: StudyLogEntry[];
    dueCount: number;
}

export default function CalendarWidget({ studyLogs, dueCount }: CalendarWidgetProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const days = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const startDayOfWeek = getDay(startOfMonth(currentMonth));

    // 날짜별 학습 기록 맵
    const logsByDate = useMemo(() => {
        const map: Record<string, StudyLogEntry[]> = {};
        studyLogs.forEach((log) => {
            const key = log.next_due_date;
            if (!map[key]) map[key] = [];
            map[key].push(log);
        });
        return map;
    }, [studyLogs]);

    function hasLogs(date: Date): boolean {
        const key = format(date, "yyyy-MM-dd");
        return !!logsByDate[key]?.length;
    }

    function isPast(date: Date): boolean {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    }

    const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

    return (
        <div className="rounded-2xl bg-card/80 backdrop-blur border border-border/30 p-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="text-sm font-semibold">
                    {format(currentMonth, "yyyy년 M월", { locale: ko })}
                </h3>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            {/* 오늘 복습 요약 */}
            {dueCount > 0 && (
                <div className="mb-3 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <p className="text-xs font-medium text-amber-400">
                        📚 오늘 복습할 단어장이 <span className="font-bold">{dueCount}개</span> 있습니다
                    </p>
                </div>
            )}

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map((d) => (
                    <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                        {d}
                    </div>
                ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-1">
                {/* 빈 셀 (시작 요일 오프셋) */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-9" />
                ))}

                {days.map((day) => {
                    const hasStudyLog = hasLogs(day);
                    const today = isToday(day);

                    return (
                        <div
                            key={day.toISOString()}
                            className={`h-9 flex flex-col items-center justify-center rounded-lg text-xs relative ${today
                                    ? "bg-indigo-500/20 text-indigo-400 font-bold ring-1 ring-indigo-500/40"
                                    : hasStudyLog && isPast(day)
                                        ? "text-amber-400"
                                        : hasStudyLog
                                            ? "text-green-400"
                                            : "text-muted-foreground"
                                }`}
                        >
                            {day.getDate()}
                            {hasStudyLog && (
                                <div className={`w-1 h-1 rounded-full absolute bottom-1 ${isPast(day) ? "bg-amber-400" : "bg-green-400"
                                    }`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 범례 */}
            <div className="flex items-center gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[10px] text-muted-foreground">복습 필요</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-[10px] text-muted-foreground">복습 예정</span>
                </div>
            </div>
        </div>
    );
}
