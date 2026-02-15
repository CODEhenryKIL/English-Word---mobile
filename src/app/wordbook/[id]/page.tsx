"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { getWordbook, getWords, toggleStarred } from "@/actions/wordbook-actions";
import { completeStudySession } from "@/actions/study-actions";
import { getWrongAnswerWords } from "@/actions/test-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft,
    Star,
    Type,
    BookA,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Loader2,
    BookOpen,
    ClipboardCheck,
    Volume2,
    EyeOff,
} from "lucide-react";
import { getStepLabel } from "@/lib/spaced-repetition";
import type { Word, Wordbook } from "@/types/database";
import Link from "next/link";
import { toast } from "sonner";

// 가리기 모드: none(다 보임), word(단어+발음 가림), meaning(의미 가림)
type HideMode = "none" | "word" | "meaning";

// TTS 발음 재생
function speakWord(word: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    // 기존 재생 중지
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

export default function WordbookPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [wordbook, setWordbook] = useState<Wordbook | null>(null);
    const [words, setWords] = useState<Word[]>([]);
    const [wrongWords, setWrongWords] = useState<Word[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [hideMode, setHideMode] = useState<HideMode>("none");
    const [hideExtra, setHideExtra] = useState(false);
    const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
    const [subTab, setSubTab] = useState<"all" | "starred" | "wrong">("all");
    const [touchStartX, setTouchStartX] = useState(0);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [wb, ws] = await Promise.all([
            getWordbook(id),
            getWords(id),
        ]);
        setWordbook(wb);
        setWords(ws);

        // 오답 단어 로드
        const wrongData = await getWrongAnswerWords(id);
        const wrongWordsList = wrongData
            .map((item: any) => item.words)
            .filter((w: any): w is Word => !!w);
        setWrongWords(wrongWordsList);

        setLoading(false);
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 현재 서브탭에 따른 단어 목록
    const filteredWords = (() => {
        switch (subTab) {
            case "starred":
                return words.filter((w) => w.is_starred);
            case "wrong":
                return wrongWords;
            default:
                return words;
        }
    })();

    const currentWord = filteredWords[currentIndex];

    // 특정 영역이 가려져 있는지 확인
    function isHidden(area: "word" | "meaning"): boolean {
        if (hideMode === "none") return false;
        if (hideMode !== area) return false;
        // 이미 공개된 경우
        if (currentWord && revealedIds.has(currentWord.id + "-" + area)) return false;
        return true;
    }

    // 클릭으로 공개
    function handleReveal(area: string) {
        setRevealedIds((prev) => {
            const next = new Set(prev);
            if (next.has(area)) {
                next.delete(area);
            } else {
                next.add(area);
            }
            return next;
        });
    }

    // 별표 토글
    async function handleToggleStar() {
        if (!currentWord) return;
        const newStarred = !currentWord.is_starred;
        await toggleStarred(currentWord.id, newStarred);
        setWords((prev) =>
            prev.map((w) => (w.id === currentWord.id ? { ...w, is_starred: newStarred } : w))
        );
        toast(newStarred ? "⭐ 어려운 단어에 추가됨" : "별표 해제됨");
    }

    // 가리기 모드 토글
    function toggleHideMode(mode: HideMode) {
        if (hideMode === mode) {
            setHideMode("none");
        } else {
            setHideMode(mode);
        }
        setRevealedIds(new Set());
    }

    // 카드 네비게이션
    function goNext() {
        if (currentIndex < filteredWords.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setRevealedIds(new Set());
        }
    }

    function goPrev() {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setRevealedIds(new Set());
        }
    }

    // 터치 스와이프
    function handleTouchStart(e: React.TouchEvent) {
        setTouchStartX(e.touches[0].clientX);
        setIsSwiping(true);
    }

    function handleTouchMove(e: React.TouchEvent) {
        if (!isSwiping) return;
        const diff = e.touches[0].clientX - touchStartX;
        setSwipeOffset(diff);
    }

    function handleTouchEnd() {
        if (Math.abs(swipeOffset) > 60) {
            if (swipeOffset > 0) goPrev();
            else goNext();
        }
        setSwipeOffset(0);
        setIsSwiping(false);
    }

    // 학습 완료
    async function handleCompleteStudy() {
        if (!wordbook) return;
        if (!confirm(`${wordbook.current_step + 1}차 학습 완료로 기록할까요?`)) return;

        const result = await completeStudySession(id);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(
                `${result.completedStep}차 학습 완료! 다음 복습: ${result.nextDueDate}`
            );
            loadData();
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-dvh">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    // 가림 스타일 (블러 + 배경 커버)
    const hiddenStyle = "select-none blur-md opacity-30 transition-all cursor-pointer";
    const visibleStyle = "transition-all cursor-pointer";

    return (
        <div className="flex flex-col min-h-dvh bg-gradient-to-b from-background to-secondary/20">
            {/* 상단 바 */}
            <header className="sticky top-0 z-50 px-4 pt-3 pb-2 bg-background/80 backdrop-blur-xl border-b border-border/30">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => router.push("/dashboard")}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-sm font-semibold truncate">{wordbook?.title}</h1>
                        <p className="text-[10px] text-muted-foreground">
                            {getStepLabel(wordbook?.current_step ?? 0)} • {words.length}개 단어
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1"
                        onClick={handleCompleteStudy}
                    >
                        <CheckCircle2 className="w-3 h-3" />
                        학습완료
                    </Button>
                </div>
            </header>

            {/* 외우기 / 테스트 탭 */}
            <Tabs defaultValue="study" className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-3 bg-secondary/50 h-10">
                    <TabsTrigger value="study" className="flex-1 text-xs gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        외우기
                    </TabsTrigger>
                    <TabsTrigger value="test" className="flex-1 text-xs gap-1.5" asChild>
                        <Link href={`/wordbook/${id}/test`}>
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            테스트
                        </Link>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="study" className="flex-1 flex flex-col mt-0">
                    {/* 서브탭 */}
                    <div className="flex gap-2 px-4 mt-3">
                        {(["all", "starred", "wrong"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => { setSubTab(tab); setCurrentIndex(0); setRevealedIds(new Set()); }}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${subTab === tab
                                    ? "bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30"
                                    : "bg-secondary/50 text-muted-foreground"
                                    }`}
                            >
                                {tab === "all" && `전체 (${words.length})`}
                                {tab === "starred" && `⭐ 어려운 단어 (${words.filter((w) => w.is_starred).length})`}
                                {tab === "wrong" && `❌ 오답 (${wrongWords.length})`}
                            </button>
                        ))}
                    </div>

                    {/* 카드 영역 */}
                    <div className="flex-1 px-4 py-4">
                        {filteredWords.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <BookOpen className="w-10 h-10 mb-3 opacity-30" />
                                <p className="text-sm">
                                    {subTab === "starred" ? "어려운 단어가 없습니다" : subTab === "wrong" ? "오답 단어가 없습니다" : "단어가 없습니다"}
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* 진행 카운터 */}
                                <div className="text-center mb-3">
                                    <span className="text-xs text-muted-foreground">
                                        <span className="text-indigo-400 font-bold">{currentIndex + 1}</span>
                                        {" / "}
                                        {filteredWords.length}
                                    </span>
                                </div>

                                {/* 단어 카드 */}
                                <div
                                    className={`swipe-card ${isSwiping ? "swiping" : ""} relative rounded-2xl bg-card/90 backdrop-blur border border-border/30 p-6 min-h-[280px] flex flex-col`}
                                    style={{ transform: `translateX(${swipeOffset}px)` }}
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                >
                                    {currentWord && (
                                        <>
                                            {/* 별표 */}
                                            <button
                                                className="absolute top-4 right-4 p-1"
                                                onClick={handleToggleStar}
                                            >
                                                <Star
                                                    className={`w-5 h-5 transition-all ${currentWord.is_starred
                                                        ? "fill-yellow-400 text-yellow-400"
                                                        : "text-muted-foreground"
                                                        }`}
                                                />
                                            </button>

                                            {/* 단어 + 발음 */}
                                            <div className="text-center flex-1 flex flex-col justify-center">
                                                <div
                                                    className={isHidden("word") ? hiddenStyle : visibleStyle}
                                                    onClick={() => isHidden("word") && handleReveal(currentWord.id + "-word")}
                                                >
                                                    <h2 className="text-3xl font-bold text-indigo-400 mb-1">
                                                        {currentWord.word}
                                                    </h2>

                                                    {currentWord.pronunciation && (
                                                        <div className="flex items-center justify-center gap-1.5 mb-1">
                                                            <p className="text-sm text-muted-foreground">
                                                                [{currentWord.pronunciation}]
                                                            </p>
                                                            <button
                                                                className="p-1 rounded-full hover:bg-indigo-500/10 transition-colors"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    speakWord(currentWord.word);
                                                                }}
                                                            >
                                                                <Volume2 className="w-4 h-4 text-indigo-400" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* 발음기호 없어도 소리 버튼 표시 */}
                                                    {!currentWord.pronunciation && (
                                                        <button
                                                            className="mx-auto p-1.5 rounded-full hover:bg-indigo-500/10 transition-colors mb-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                speakWord(currentWord.word);
                                                            }}
                                                        >
                                                            <Volume2 className="w-4 h-4 text-indigo-400" />
                                                        </button>
                                                    )}
                                                </div>

                                                {currentWord.part_of_speech && (
                                                    <Badge variant="secondary" className="mx-auto text-[10px] mb-4 mt-2">
                                                        {currentWord.part_of_speech}
                                                    </Badge>
                                                )}

                                                {/* 의미 */}
                                                <div
                                                    className={`mt-2 p-4 rounded-xl bg-secondary/30 ${isHidden("meaning") ? hiddenStyle : visibleStyle}`}
                                                    onClick={() => isHidden("meaning") && handleReveal(currentWord.id + "-meaning")}
                                                >
                                                    <p className="text-lg font-medium">{currentWord.meaning}</p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* 하단 세부 정보 영역 — 항상 표시 */}
                                {currentWord && (currentWord.root_affix || currentWord.etymology || currentWord.memo) && (
                                    <div
                                        className={`mt-3 rounded-xl bg-card/70 border border-border/20 divide-y divide-border/20 overflow-hidden transition-all ${hideExtra && !revealedIds.has(currentWord.id + "-extra") ? "blur-md cursor-pointer" : ""}`}
                                        onClick={() => {
                                            if (hideExtra && !revealedIds.has(currentWord.id + "-extra")) {
                                                handleReveal(currentWord.id + "-extra");
                                            }
                                        }}
                                    >
                                        {/* 어근 구성 */}
                                        {currentWord.root_affix && (
                                            <div className="px-4 py-3">
                                                <p className="text-[10px] font-semibold text-indigo-400/70 uppercase tracking-wider mb-1">어근 구성</p>
                                                <p className="text-sm text-foreground/80">{currentWord.root_affix}</p>
                                            </div>
                                        )}

                                        {/* 어원 설명 */}
                                        {currentWord.etymology && (
                                            <div className="px-4 py-3">
                                                <p className="text-[10px] font-semibold text-purple-400/70 uppercase tracking-wider mb-1">어원 설명</p>
                                                <p className="text-sm text-foreground/80">{currentWord.etymology}</p>
                                            </div>
                                        )}

                                        {/* 기타 메모 */}
                                        {currentWord.memo && (
                                            <div className="px-4 py-3">
                                                <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider mb-1">기타 메모</p>
                                                <p className="text-sm text-foreground/70 italic">{currentWord.memo}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 좌우 네비게이션 — 버튼 크게 */}
                                <div className="flex items-center justify-between mt-5">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-16 w-16 rounded-2xl border-border/40"
                                        disabled={currentIndex === 0}
                                        onClick={goPrev}
                                    >
                                        <ChevronLeft className="w-8 h-8" />
                                    </Button>

                                    <div className="flex gap-1">
                                        {filteredWords.slice(
                                            Math.max(0, currentIndex - 3),
                                            Math.min(filteredWords.length, currentIndex + 4)
                                        ).map((_, i) => {
                                            const idx = Math.max(0, currentIndex - 3) + i;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex
                                                        ? "bg-indigo-400 w-4"
                                                        : "bg-muted-foreground/30"
                                                        }`}
                                                />
                                            );
                                        })}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-16 w-16 rounded-2xl border-border/40"
                                        disabled={currentIndex >= filteredWords.length - 1}
                                        onClick={goNext}
                                    >
                                        <ChevronRight className="w-8 h-8" />
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* 하단 툴바 — 단어 가리기 / 의미 가리기 / 기타 가리기 버튼 */}
                    <div className="sticky bottom-0 px-4 py-3 bg-background/90 backdrop-blur-xl border-t border-border/30 safe-bottom">
                        <div className="flex items-center justify-center gap-2">
                            <Button
                                variant={hideMode === "word" ? "default" : "outline"}
                                size="sm"
                                className={`gap-1.5 rounded-full px-3 text-xs ${hideMode === "word"
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                                    : ""
                                    }`}
                                onClick={() => toggleHideMode("word")}
                            >
                                <Type className="w-3.5 h-3.5" />
                                단어
                            </Button>
                            <Button
                                variant={hideMode === "meaning" ? "default" : "outline"}
                                size="sm"
                                className={`gap-1.5 rounded-full px-3 text-xs ${hideMode === "meaning"
                                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                                    : ""
                                    }`}
                                onClick={() => toggleHideMode("meaning")}
                            >
                                <BookA className="w-3.5 h-3.5" />
                                의미
                            </Button>
                            <Button
                                variant={hideExtra ? "default" : "outline"}
                                size="sm"
                                className={`gap-1.5 rounded-full px-3 text-xs ${hideExtra
                                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                                    : ""
                                    }`}
                                onClick={() => {
                                    setHideExtra(!hideExtra);
                                    setRevealedIds(new Set());
                                }}
                            >
                                <EyeOff className="w-3.5 h-3.5" />
                                기타
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
