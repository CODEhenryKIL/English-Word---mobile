# 📘 VocabMaster 프로젝트 문서

## 1. 프로젝트 개요
**VocabMaster**는 나만의 영단어를 관리하고 효율적으로 암기할 수 있는 모바일 웹 애플리케이션입니다.
에빙하우스의 망각 곡선 이론을 기반으로 한 복습 주기(Spaced Repetition) 시스템을 적용하여 장기 기억 전환을 돕습니다.

### 🌟 주요 기능
1. **단어장 관리**: 새로운 단어장을 생성하고 삭제할 수 있습니다.
2. **다양한 학습 모드**:
    - **단어 암기**: 카드 스와이프 방식, 단어/의미 토글, TTS 발음 듣기.
    - **테스트 모드**: 영단어/의미 맞추기, 랜덤 출제, 주관식 입력 및 수동 채점(O/X).
3. **데이터 연동**:
    - **엑셀 업로드**: `word`, `meaning`, `pronunciation` 등의 헤더를 가진 엑셀 파일 대량 업로드.
    - **Notion 연동**: Notion 데이터베이스를 연결하여 단어를 실시간으로 가져오기 (매핑 로직 유연화 적용).
4. **복습 시스템**: 학습 단계(1~6차)에 따라 다음 복습 일정을 자동 계산하고 대시보드에 알림 표시.
5. **오답 노트**: 테스트에서 틀린 단어만 따로 모아 집중 학습 가능.

---

## 2. 기술 스택 (Tech Stack)

### **Frontend & Framework**
- **Next.js 14** (App Router): 서버 사이드 렌더링(SSR) 및 서버 컴포넌트 활용.
- **TypeScript**: 정적 타입 지정을 통한 안정적인 개발.
- **Tailwind CSS**: 유틸리티 퍼스트 CSS 프레임워크로 빠른 UI 구성.
- **shadcn/ui**: Radix UI 기반의 고품질 재사용 컴포넌트 라이브러리.

### **Backend & Database**
- **Supabase**: PostgreSQL 기반의 오픈소스 BaaS (Backend as a Service).
    - **Auth**: 사용자 인증 및 세션 관리.
    - **Database**: 단어, 단어장, 학습 기록 저장.
    - **Storage**: (필요 시) 이미지 등 저장소.

### **Server Actions**
- Next.js의 Server Actions를 적극 활용하여 API 라우트 없이 직접 DB와 통신.
- `src/actions/*.ts` 파일들에 로직 집중.

### **Deploy**
- **Vercel**: Next.js 최적화 배포 플랫폼.
- **Cron Job**: 복습 알림 및 유지 보수를 위한 주기적 실행 (`/api/cron/keep-alive`).

---

## 3. 폴더 구조 (Directory Structure)

```
src/
├── app/                  # 페이지 및 라우팅 (Next.js App Router)
│   ├── dashboard/        # 메인 대시보드
│   ├── login/            # 로그인 페이지
│   ├── wordbook/[id]/    # 단어장 상세 및 학습/테스트 페이지
│   └── api/              # Cron Job 등 API 라우트
├── actions/              # Server Actions (DB, API 연동 로직)
│   ├── auth-actions.ts   # 인증 관련
│   ├── study-actions.ts  # 학습, 복습 주기 계산
│   ├── wordbook-actions.ts # 단어장 CRUD
│   ├── test-actions.ts   # 테스트 결과 저장
│   └── notion-actions.ts # Notion API 연동
├── components/           # UI 컴포넌트
│   ├── ui/               # shadcn/ui 컴포넌트 (Button, Input, Card 등)
│   └── (Modal, Widgets)  # 비즈니스 로직 포함 컴포넌트
├── lib/                  # 유틸리티 함수
│   ├── date-utils.ts     # 날짜 포맷팅 및 타임존 처리 (KST)
│   ├── spaced-repetition.ts # 에빙하우스 복습 주기 알고리즘
│   ├── excel-parser.ts   # 엑셀 파일 파싱
│   └── notion.ts         # Notion API 타입 및 유틸
├── types/                # TypeScript 타입 정의 (DB 스키마 등)
└── utils/                # Supabase 클라이언트 생성기 등
```

---

## 4. 데이터베이스 스키마 (Database Schema)

### **1. wordbooks (단어장)**
- `id`: UUID (Primary Key)
- `user_id`: 사용자 ID
- `title`: 단어장 제목
- `is_public`: 공개 여부
- `created_at`: 생성일

### **2. words (단어)**
- `id`: UUID (Primary Key)
- `wordbook_id`: 단어장 ID (Foreign Key)
- `word`: 영어 단어
- `meaning`: 의미 (한글)
- `pronunciation`: 발음 기호
- `etymology`: 어원
- `root_affix`: 어근/접사 구성
- `is_starred`: 별표(중요) 여부

### **3. study_logs (학습 기록)**
- `id`: UUID
- `wordbook_id`: 단어장 ID
- `completed_step`: 현재 완료한 학습 단계 (1~6)
- `next_due_date`: 다음 복습 예정일 (YYYY-MM-DD)
- `last_studied_at`: 마지막 학습 일시

### **4. wrong_answers (오답 노트)**
- `word_id`: 틀린 단어 ID
- `wrong_count`: 틀린 횟수
- `test_session_id`: 테스트 회차 ID

---

## 5. 개발 히스토리 & 주요 변경 사항

### **[v1.0.0] 프로젝트 초기화 및 기본 기능**
- Next.js + Supabase 환경 구축.
- 인증 (로그인/회원가입) 구현.
- 엑셀 업로드 및 대량 등록 기능.

### **[v1.1.0] 학습 모드 고도화**
- 에빙하우스 복습 주기 알고리즘 적용 (`spaced-repetition.ts`).
- 단어장 카드 스와이프 UI 및 TTS 추가.
- Notion 가져오기 기능 추가.

### **[v1.2.0] 대시보드 및 테스트 모드 개선**
- 대시보드 복습 알림 UI 개선 (타임존 문제 해결).
- 테스트 모드: 주관식 입력 및 자가 채점(O/X) 기능 추가.
- Notion 데이터 매핑 로직 유연화 (다양한 컬럼명 지원).

---

## 6. 환경 변수 설정 (.env.local)

프로젝트 실행을 위해 다음 환경 변수가 필요합니다.
Vercel 배포 시에도 동일하게 설정해야 합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=실제_Supabase_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=실제_Anon_Key
NOTION_API_KEY=실제_Notion_Integration_Secret
```

---

*이 문서는 개발 진행 상황에 따라 지속적으로 업데이트됩니다.*
