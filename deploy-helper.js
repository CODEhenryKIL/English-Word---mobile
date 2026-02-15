const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("\x1b[36m%s\x1b[0m", "🚀 Vercel 배포 도우미를 시작합니다...");

try {
    // 1. Vercel CLI 확인
    try {
        execSync('npx vercel --version', { stdio: 'ignore' });
    } catch (e) {
        console.log("📦 Vercel CLI를 설치합니다...");
        execSync('npm install -g vercel', { stdio: 'inherit' });
    }

    // 2. 로그인 확인
    try {
        execSync('npx vercel whoami', { stdio: 'ignore' });
    } catch (e) {
        console.log("\x1b[33m%s\x1b[0m", "🔑 Vercel 로그인이 필요합니다. 브라우저가 열리면 로그인/회원가입을 진행해주세요.");
        execSync('npx vercel login', { stdio: 'inherit' });
    }

    // 3. 프로젝트 연결
    console.log("\x1b[32m%s\x1b[0m", "🔗 프로젝트를 Vercel에 연결합니다...");
    // --yes 옵션으로 기본 설정 자동 수락
    execSync('npx vercel link --yes', { stdio: 'inherit' });

    // 4. 배포 실행
    console.log("\x1b[35m%s\x1b[0m", "🚀 프로덕션 배포를 시작합니다! (시간이 조금 걸릴 수 있습니다)");
    execSync('npx vercel deploy --prod', { stdio: 'inherit' });

    console.log("\n\x1b[32m%s\x1b[0m", "✅ 배포가 완료되었습니다!");

    // 5. 환경 변수 안내
    console.log("\n\x1b[33m%s\x1b[0m", "⚠️  중요: 환경 변수 설정이 필요합니다!");
    console.log("웹사이트가 정상 작동하려면 .env.local의 내용을 Vercel에 등록해야 합니다.");
    console.log("대시보드 -> Settings -> Environment Variables 메뉴에서 다음 값들을 추가해주세요:\n");

    if (fs.existsSync('.env.local')) {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        console.log(envContent);
    } else {
        console.log("(.env.local 파일을 찾을 수 없습니다)");
    }

} catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "❌ 오류가 발생했습니다:", error.message);
}
