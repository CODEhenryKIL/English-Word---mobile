"use client";

import { useState } from "react";
import { importFromNotion } from "@/actions/notion-actions";
import { createWordbook, bulkInsertWords } from "@/actions/wordbook-actions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, BookMarked } from "lucide-react";

interface NotionImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function NotionImportModal({
    open,
    onOpenChange,
    onSuccess,
}: NotionImportModalProps) {
    const [url, setUrl] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [wordCount, setWordCount] = useState(0);

    async function handleImport() {
        if (!url.trim()) return;
        setStatus("loading");
        setErrorMsg("");

        try {
            const result = await importFromNotion(url.trim());

            if (result.error || !result.data) {
                setStatus("error");
                setErrorMsg(result.error || "데이터를 가져오지 못했습니다.");
                return;
            }

            // 단어장 생성
            const wbResult = await createWordbook(result.title || "Notion 단어장");
            if (wbResult.error || !wbResult.data) {
                setStatus("error");
                setErrorMsg(wbResult.error || "단어장 생성 실패");
                return;
            }

            // 단어 삽입
            const insertResult = await bulkInsertWords(wbResult.data.id, result.data);
            if (insertResult.error) {
                setStatus("error");
                setErrorMsg(insertResult.error);
                return;
            }

            setWordCount(result.data.length);
            setStatus("done");

            setTimeout(() => {
                resetState();
                onOpenChange(false);
                onSuccess();
            }, 1500);
        } catch (err) {
            setStatus("error");
            setErrorMsg(`오류: ${String(err)}`);
        }
    }

    function resetState() {
        setUrl("");
        setStatus("idle");
        setErrorMsg("");
        setWordCount(0);
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
            <DialogContent className="max-w-[95vw] sm:max-w-md mx-auto rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookMarked className="w-5 h-5 text-indigo-400" />
                        Notion에서 가져오기
                    </DialogTitle>
                    <DialogDescription>
                        노션 데이터베이스 URL을 입력하세요
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {status === "idle" && (
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor="notionUrl" className="text-sm">Notion 데이터베이스 URL</Label>
                                <Input
                                    id="notionUrl"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://www.notion.so/..."
                                    className="h-11 text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    노션에서 해당 표 페이지의 URL을 복사해 붙여넣으세요
                                </p>
                            </div>
                            <Button
                                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                                onClick={handleImport}
                                disabled={!url.trim()}
                            >
                                가져오기
                            </Button>
                        </>
                    )}

                    {status === "loading" && (
                        <div className="flex flex-col items-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
                            <p className="text-sm text-muted-foreground">Notion에서 데이터를 가져오는 중...</p>
                        </div>
                    )}

                    {status === "done" && (
                        <div className="flex flex-col items-center py-8">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                            <p className="text-sm font-medium">가져오기 완료!</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {wordCount}개 단어가 저장되었습니다
                            </p>
                        </div>
                    )}

                    {status === "error" && (
                        <div className="flex flex-col items-center py-6">
                            <AlertCircle className="w-10 h-10 text-destructive mb-3" />
                            <p className="text-sm text-destructive text-center">{errorMsg}</p>
                            <Button variant="outline" className="mt-4" onClick={resetState}>
                                다시 시도
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
