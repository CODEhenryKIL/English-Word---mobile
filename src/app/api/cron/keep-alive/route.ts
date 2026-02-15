import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase 무료 티어 7일 비활성 일시 정지 방지용 킵 얼라이브
export async function GET() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // 가벼운 쿼리로 DB를 활성 상태로 유지
        const { data, error } = await supabase.rpc("", {}).maybeSingle();

        // RPC 없이 단순 SELECT
        const { error: pingError } = await supabase
            .from("wordbooks")
            .select("id")
            .limit(1);

        return NextResponse.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            dbPing: pingError ? "error" : "success",
        });
    } catch (err) {
        return NextResponse.json(
            { status: "error", message: String(err) },
            { status: 500 }
        );
    }
}
