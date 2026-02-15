import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  // 환경 변수 진단 로직
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-black text-white font-sans">
        <h1 className="text-3xl font-bold text-red-500 mb-4">🚨 배포 설정 오류 발견</h1>
        <p className="mb-8 text-lg text-gray-300">
          Vercel 환경 변수가 제대로 설정되지 않아 앱을 실행할 수 없습니다.
        </p>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md text-left space-y-3 mb-8">
          <h3 className="font-bold text-gray-400 border-b border-gray-700 pb-2 mb-2">현재 상태 진단</h3>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">NEXT_PUBLIC_SUPABASE_URL</span>
            <span className={supabaseUrl ? "text-green-400 font-bold" : "text-red-500 font-bold"}>
              {supabaseUrl ? "✅ 설정됨" : "❌ 없음"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
            <span className={supabaseKey ? "text-green-400 font-bold" : "text-red-500 font-bold"}>
              {supabaseKey ? "✅ 설정됨" : "❌ 없음"}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-400">
          <p>1. Vercel 대시보드 &gt; Settings &gt; Environment Variables 확인</p>
          <p>2. 변수가 있다면 <strong>Redeploy</strong> 필수</p>
        </div>
      </div>
    );
  }

  const supabase = await createClient(); // server.ts 수정으로 에러 안 남
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
