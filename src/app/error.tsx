"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center space-y-4">
            <h2 className="text-xl font-bold text-red-500">오류가 발생했습니다! 😢</h2>
            <div className="bg-red-50 p-4 rounded-lg text-left max-w-md w-full overflow-auto text-xs font-mono border border-red-200">
                <p className="font-bold mb-2">Error Message:</p>
                <p className="text-red-700 break-all">{error.message}</p>
                {error.digest && (
                    <>
                        <p className="font-bold mt-2 mb-1">Digest:</p>
                        <p className="text-gray-500">{error.digest}</p>
                    </>
                )}
            </div>
            <Button onClick={() => reset()} variant="outline">
                다시 시도하기
            </Button>
        </div>
    );
}
