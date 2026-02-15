"use client";

import { useState, useRef } from "react";
import { parseExcelBuffer, type ParsedWord } from "@/lib/excel-parser";
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
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface ExcelUploadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function ExcelUploadModal({
    open,
    onOpenChange,
    onSuccess,
}: ExcelUploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [parsedWords, setParsedWords] = useState<ParsedWord[]>([]);
    const [status, setStatus] = useState<"idle" | "parsing" | "preview" | "uploading" | "done" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setTitle(selectedFile.name.replace(/\.(xlsx|csv|xls)$/i, ""));
        setStatus("parsing");
        setErrorMsg("");

        try {
            const buffer = await selectedFile.arrayBuffer();
            const words = parseExcelBuffer(buffer);

            if (words.length === 0) {
                setStatus("error");
                setErrorMsg("파싱된 단어가 없습니다. 파일 형식을 확인해주세요.");
                return;
            }

            setParsedWords(words);
            setStatus("preview");
        } catch (err) {
            setStatus("error");
            setErrorMsg(`파일 파싱 오류: ${String(err)}`);
        }
    }

    async function handleUpload() {
        if (!title.trim() || parsedWords.length === 0) return;

        setStatus("uploading");
        setProgress(0);

        try {
            // 1. 단어장 생성
            const result = await createWordbook(title.trim());
            if (result.error || !result.data) {
                setStatus("error");
                setErrorMsg(result.error || "단어장 생성 실패");
                return;
            }

            setProgress(30);

            // 2. 단어 일괄 삽입
            const insertResult = await bulkInsertWords(result.data.id, parsedWords);
            if (insertResult.error) {
                setStatus("error");
                setErrorMsg(insertResult.error);
                return;
            }

            setProgress(100);
            setStatus("done");

            setTimeout(() => {
                resetState();
                onOpenChange(false);
                onSuccess();
            }, 1500);
        } catch (err) {
            setStatus("error");
            setErrorMsg(`업로드 오류: ${String(err)}`);
        }
    }

    function resetState() {
        setFile(null);
        setTitle("");
        setParsedWords([]);
        setStatus("idle");
        setErrorMsg("");
        setProgress(0);
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
            <DialogContent className="max-w-[95vw] sm:max-w-md mx-auto rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                        엑셀 파일 업로드
                    </DialogTitle>
                    <DialogDescription>
                        .xlsx 또는 .csv 파일에서 단어를 가져옵니다
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* 파일 선택 */}
                    {status === "idle" && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
                        >
                            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-sm font-medium">파일을 선택하세요</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                .xlsx, .csv 지원
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.csv,.xls"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    )}

                    {/* 파싱 중 */}
                    {status === "parsing" && (
                        <div className="flex flex-col items-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
                            <p className="text-sm text-muted-foreground">파일 분석 중...</p>
                        </div>
                    )}

                    {/* 미리보기 */}
                    {status === "preview" && (
                        <>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="title" className="text-sm">단어장 이름</Label>
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="단어장 이름을 입력하세요"
                                        className="h-11"
                                    />
                                </div>

                                <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                                    <p className="font-medium">📊 분석 결과</p>
                                    <p className="text-muted-foreground mt-1">
                                        총 <span className="text-indigo-400 font-bold">{parsedWords.length}</span>개 단어가 발견되었습니다
                                    </p>
                                </div>

                                {/* 처음 3개 미리보기 */}
                                <div className="max-h-40 overflow-y-auto space-y-2 no-scrollbar">
                                    {parsedWords.slice(0, 3).map((w, i) => (
                                        <div key={i} className="p-2.5 rounded-lg bg-card border border-border/30 text-sm">
                                            <span className="font-medium text-indigo-400">{w.word}</span>
                                            {w.part_of_speech && (
                                                <span className="text-xs text-muted-foreground ml-2">({w.part_of_speech})</span>
                                            )}
                                            <p className="text-muted-foreground text-xs mt-0.5">{w.meaning}</p>
                                        </div>
                                    ))}
                                    {parsedWords.length > 3 && (
                                        <p className="text-xs text-center text-muted-foreground">
                                            ... 외 {parsedWords.length - 3}개
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={resetState}>
                                    취소
                                </Button>
                                <Button
                                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                                    onClick={handleUpload}
                                >
                                    업로드
                                </Button>
                            </div>
                        </>
                    )}

                    {/* 업로드 중 */}
                    {status === "uploading" && (
                        <div className="flex flex-col items-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
                            <p className="text-sm text-muted-foreground">단어를 저장하고 있습니다...</p>
                            <div className="w-full mt-4 bg-secondary rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* 완료 */}
                    {status === "done" && (
                        <div className="flex flex-col items-center py-8">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
                            <p className="text-sm font-medium">업로드 완료!</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {parsedWords.length}개 단어가 저장되었습니다
                            </p>
                        </div>
                    )}

                    {/* 에러 */}
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
