import { createClient } from "@/lib/supabase/server";

/**
 * Server Action에서 인증된 사용자 ID를 안전하게 가져오는 헬퍼.
 * getUser()를 시도 → 실패 시 getSession()으로 폴백.
 * Supabase에서 이메일 확인이 활성화된 경우에도 동작.
 */
export async function getAuthUserId(): Promise<string | null> {
    const supabase = await createClient();

    // 1차: getUser() 시도 (가장 안전한 방법)
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) return user.id;

    // 2차: getSession() 폴백 (이메일 미확인 사용자도 세션은 존재)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;

    return null;
}
