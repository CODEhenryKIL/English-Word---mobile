"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { getWords } from "@/actions/wordbook-actions";
import { saveWrongAnswers, getMaxTestSession } from "@/actions/test-actions";
import { fisherYatesShuffle } from "@/lib/fisher-yates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ArrowLeft,
    Check,
    X,
    RotateCcw,
    Loader2,
    Trophy,
    AlertTriangle,
    Keyboard,
    BookOpen,
    Circle, // O
    XCircle, // X
} from "lucide-react";
import type { Word } from "@/types/database";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

type TestMode = "word" | "meaning"; // word: 의미 보고 단어 맞추기, meaning: 단어 보고 의미 맞추기

export default function TestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [words, setWords] = useState<Word[]>([]);
    const [loading, setLoading] = useState(true);

    // 테스트 상태
    const [testMode, setTestMode] = useState<TestMode | null>(null);
    const [shuffledWords, setShuffledWords] = useState<Word[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [wrongIds, setWrongIds] = useState<string[]>([]);
    const [showAnswer, setShowAnswer] = useState(false);
    const [userAnswer, setUserAnswer] = useState(""); // 사용자 입력 답안
    const [testFinished, setTestFinished] = useState(false);
    const [showModeSelector, setShowModeSelector] = useState(true);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        const ws = await getWords(id);
        setWords(ws);
        setLoading(false);
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // 테스트 시작
    function startTest(mode: TestMode) {
        setTestMode(mode);
        setShuffledWords(fisherYatesShuffle(words));
        setCurrentIndex(0);
        setWrongIds([]);
        setShowAnswer(false);
        setUserAnswer("");
        setTestFinished(false);
        setShowModeSelector(false);
    }

    const currentWord = shuffledWords[currentIndex];

    // 정답 처리
    function handleCorrect() {
        moveToNext();
    }

    // 오답 처리
    function handleWrong() {
        if (currentWord) {
            setWrongIds((prev) => [...prev, currentWord.id]);
        }
        moveToNext();
    }

    function moveToNext() {
        if (currentIndex >= shuffledWords.length - 1) {
            setTestFinished(true);
            if (wrongIds.length > 0 || (currentWord && false)) {
                // 마지막 문제가 오답일 수도 있으니 테스트 끝난 후 체크
            }
            setShowSaveDialog(true);
        } else {
            setCurrentIndex(currentIndex + 1);
            setShowAnswer(false);
            setUserAnswer("");
        }
    }

    // 오답 저장
    async function handleSaveWrongAnswers() {
        setSaving(true);
        const maxSession = await getMaxTestSession(id);
        const result = await saveWrongAnswers(wrongIds, maxSession + 1);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(`${wrongIds.length}개 오답이 저장되었습니다`);
        }

        setSaving(false);
        setShowSaveDialog(false);
    }

    // 결과 통계
    const correctCount = shuffledWords.length - wrongIds.length;
    const score = shuffledWords.length > 0 ? Math.round((correctCount / shuffledWords.length) * 100) : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-dvh">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-dvh bg-gradient-to-b from-background to-secondary/20">
            {/* 상단 바 */}
            <header className="sticky top-0 z-50 px-4 pt-3 pb-2 bg-background/80 backdrop-blur-xl border-b border-border/30">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => router.push(`/wordbook/${id}`)}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-sm font-semibold">테스트 모드</h1>
                        {!showModeSelector && !testFinished && (
                            <p className="text-[10px] text-muted-foreground">
                                {currentIndex + 1} / {shuffledWords.length}
                            </p>
                        )}
                    </div>
                    {!showModeSelector && !testFinished && wrongIds.length > 0 && (
                        <Badge variant="destructive" className="text-[10px]">
                            오답 {wrongIds.length}
                        </Badge>
                    )}
                </div>

                {/* 프로그레스 바 */}
                {!showModeSelector && !testFinished && (
                    <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                            style={{ width: `${((currentIndex + 1) / shuffledWords.length) * 100}%` }}
                        />
                    </div>
                )}
            </header>

            {/* 모드 선택 모달 */}
            {showModeSelector && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
                    <div className="text-center">
                        <h2 className="text-xl font-bold mb-2">테스트 모드 선택</h2>
                        <p className="text-sm text-muted-foreground">
                            총 {words.length}개 단어를 무작위로 출제합니다
                        </p>
                    </div>

                    <div className="w-full space-y-3 max-w-sm">
                        <button
                            className="w-full p-5 rounded-2xl bg-card/80 border border-border/30 text-left hover:border-indigo-500/40 transition-all active:scale-[0.98]"
                            onClick={() => startTest("meaning")}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
                                    <BookOpen className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">의미 모드</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        영단어를 보고 의미를 맞추기
                                    </p>
                                </div>
                            </div>
                        </button>

                        <button
                            className="w-full p-5 rounded-2xl bg-card/80 border border-border/30 text-left hover:border-indigo-500/40 transition-all active:scale-[0.98]"
                            onClick={() => startTest("word")}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                                    <Keyboard className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">영단어 모드</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        의미를 보고 영단어를 맞추기
                                    </p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* 테스트 진행 화면 */}
            {!showModeSelector && !testFinished && currentWord && (
                <div className="flex-1 flex flex-col p-4">
                    {/* 문제 카드 */}
                    <div className="flex-1 flex flex-col items-center justify-start pt-4 pb-20 overflow-y-auto">
                        <div className="w-full rounded-2xl bg-card/90 backdrop-blur border border-border/30 p-8 text-center min-h-[280px] flex flex-col items-center justify-center">
                            {/* 문제 */}
                            <p className="text-xs text-muted-foreground mb-4">
                                {testMode === "meaning" ? "이 단어의 의미는?" : "이 의미의 영단어는?"}
                            </p>

                            <h2 className="text-3xl font-bold mb-2">
                                {testMode === "meaning" ? currentWord.word : currentWord.meaning}
                            </h2>

                            {testMode === "meaning" && currentWord.pronunciation && (
                                <p className="text-sm text-muted-foreground">[{currentWord.pronunciation}]</p>
                            )}

                            {/* 사용자 입력 필드 (정답 확인 전) */}
                            {!showAnswer && (
                                <div className="w-full max-w-xs mt-6 animate-fade-in">
                                    <Input
                                        type="text"
                                        placeholder={testMode === "meaning" ? "뜻을 입력해보세요" : "단어를 입력해보세요"}
                                        className="text-center h-12 text-lg"
                                        value={userAnswer}
                                        onChange={(e) => setUserAnswer(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                                setShowAnswer(true);
                                            }
                                        }}
                                        autoFocus
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                                        엔터 키를 누르면 정답을 확인합니다
                                    </p>
                                </div>
                            )}

                            {/* 정답 표시 및 비교 */}
                            {showAnswer && (
                                <div className="mt-6 w-full max-w-sm space-y-3 animate-fade-in">
                                    {/* 내 답안 */}
                                    <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                                        <p className="text-xs text-muted-foreground mb-1">내가 쓴 답</p>
                                        <p className={`text-lg font-medium ${userAnswer ? "text-foreground" : "text-muted-foreground italic"}`}>
                                            {userAnswer || "(비어있음)"}
                                        </p>
                                    </div>

                                    {/* 정답 */}
                                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                        <p className="text-xs text-indigo-400 mb-1">정답</p>
                                        <p className="text-xl font-bold text-indigo-400">
                                            {testMode === "meaning" ? currentWord.meaning : currentWord.word}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 하단 버튼 */}
                    <div className="pb-6 safe-bottom">
                        {!showAnswer ? (
                            <Button
                                className="w-full h-14 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-base font-medium transition-all active:scale-[0.98]"
                                onClick={() => setShowAnswer(true)}
                            >
                                정답 확인
                            </Button>
                        ) : (
                            <div className="flex gap-3">
                                <Button
                                    className="flex-1 h-14 rounded-2xl bg-red-500/10 border-2 border-red-500/50 hover:bg-red-500/20 text-red-500 text-base font-medium gap-2 transition-all active:scale-[0.98]"
                                    onClick={handleWrong}
                                >
                                    <XCircle className="w-5 h-5" />
                                    틀렸어요
                                </Button>
                                <Button
                                    className="flex-1 h-14 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-500 text-base font-medium gap-2 transition-all active:scale-[0.98]"
                                    onClick={handleCorrect}
                                >
                                    <Circle className="w-5 h-5" />
                                    맞았어요
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 테스트 결과 */}
            {testFinished && (
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="text-center animate-slide-up">
                        <Trophy className={`w-16 h-16 mx-auto mb-4 ${score >= 80 ? "text-yellow-400" : score >= 50 ? "text-indigo-400" : "text-muted-foreground"}`} />

                        <h2 className="text-2xl font-bold mb-2">테스트 완료!</h2>

                        <div className="text-5xl font-black mb-2">
                            <span className={score >= 80 ? "text-yellow-400" : score >= 50 ? "text-indigo-400" : "text-red-400"}>
                                {score}
                            </span>
                            <span className="text-lg text-muted-foreground">점</span>
                        </div>

                        <p className="text-sm text-muted-foreground mb-6">
                            {shuffledWords.length}문제 중 {correctCount}문제 정답, {wrongIds.length}문제 오답
                        </p>

                        <div className="flex gap-3 max-w-sm mx-auto">
                            <Button
                                variant="outline"
                                className="flex-1 h-12 rounded-xl gap-2"
                                onClick={() => router.push(`/wordbook/${id}`)}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                돌아가기
                            </Button>
                            <Button
                                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white gap-2"
                                onClick={() => {
                                    setShowModeSelector(true);
                                    setTestFinished(false);
                                }}
                            >
                                <RotateCcw className="w-4 h-4" />
                                다시 테스트
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 오답 저장 확인 다이얼로그 */}
            <Dialog open={showSaveDialog && wrongIds.length > 0} onOpenChange={setShowSaveDialog}>
                <DialogContent className="max-w-[90vw] sm:max-w-sm rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                            오답 저장
                        </DialogTitle>
                        <DialogDescription>
                            틀린 {wrongIds.length}개 단어를 오답 모음에 저장할까요?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-32 overflow-y-auto space-y-1 no-scrollbar">
                        {wrongIds.map((wid) => {
                            const w = words.find((word) => word.id === wid);
                            return w ? (
                                <div key={wid} className="text-sm p-2 rounded-lg bg-secondary/50">
                                    <span className="text-red-400 font-medium">{w.word}</span>
                                    <span className="text-muted-foreground ml-2">- {w.meaning}</span>
                                </div>
                            ) : null;
                        })}
                    </div>
                    <div className="flex gap-2 mt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setShowSaveDialog(false)}>
                            건너뛰기
                        </Button>
                        <Button
                            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                            onClick={handleSaveWrongAnswers}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장하기"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
