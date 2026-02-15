"use client";

import { useEffect } from "react";

export default function GlobalError({
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
        <html>
            <body className="bg-background text-foreground">
                <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center space-y-4">
                    <h2 className="text-xl font-bold text-red-500">치명적인 오류 발생! 😱</h2>
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
                    <button
                        onClick={() => reset()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
                    >
                        다시 시도하기
                    </button>
                </div>
            </body>
        </html>
    );
}
