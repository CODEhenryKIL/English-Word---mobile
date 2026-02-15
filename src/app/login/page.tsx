"use client";

import { useState } from "react";
import { signIn } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Mail, Lock, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);
        const result = await signIn(formData);
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-dvh p-6 bg-gradient-to-b from-background to-secondary/30">
            {/* 로고 영역 */}
            <div className="flex flex-col items-center mb-8 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
                    <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    VocabMaster
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    스마트 영단어 암기 서비스
                </p>
            </div>

            {/* 로그인 카드 */}
            <Card className="w-full animate-slide-up border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader className="space-y-1 pb-4">
                    <CardTitle className="text-xl text-center">로그인</CardTitle>
                    <CardDescription className="text-center">
                        이메일과 비밀번호를 입력하세요
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm">이메일</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="example@email.com"
                                    className="pl-10 h-12"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm">비밀번호</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10 h-12"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-base shadow-lg shadow-indigo-500/25"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "로그인"
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <span className="text-sm text-muted-foreground">
                            계정이 없으신가요?{" "}
                            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 font-medium">
                                회원가입
                            </Link>
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
