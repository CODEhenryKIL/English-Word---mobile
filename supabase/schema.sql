-- =============================================
-- 영단어 암기 앱 - Supabase 데이터베이스 스키마
-- =============================================
-- 이 SQL을 Supabase 대시보드의 SQL Editor에서 실행해주세요.

-- 1. wordbooks (단어장 테이블)
CREATE TABLE IF NOT EXISTS wordbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  current_step INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. words (영단어 테이블)
CREATE TABLE IF NOT EXISTS words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wordbook_id UUID NOT NULL REFERENCES wordbooks(id) ON DELETE CASCADE,
  word VARCHAR(255) NOT NULL,
  part_of_speech VARCHAR(50),
  meaning TEXT NOT NULL,
  pronunciation VARCHAR(255),
  root_affix VARCHAR(255),
  etymology TEXT,
  memo TEXT,
  is_starred BOOLEAN DEFAULT false
);

-- 3. study_logs (학습 기록/캘린더 테이블)
CREATE TABLE IF NOT EXISTS study_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wordbook_id UUID NOT NULL REFERENCES wordbooks(id) ON DELETE CASCADE,
  completed_step INTEGER NOT NULL,
  next_due_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. wrong_answers (오답 노트 테이블)
CREATE TABLE IF NOT EXISTS wrong_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  test_session INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 인덱스 생성 (캘린더 조회 성능 최적화)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_study_logs_due_date ON study_logs(next_due_date, wordbook_id);
CREATE INDEX IF NOT EXISTS idx_words_wordbook ON words(wordbook_id);
CREATE INDEX IF NOT EXISTS idx_wordbooks_user ON wordbooks(user_id);
CREATE INDEX IF NOT EXISTS idx_wrong_answers_word ON wrong_answers(word_id);

-- =============================================
-- RLS (Row-Level Security) 정책 설정
-- =============================================

-- wordbooks 테이블 RLS
ALTER TABLE wordbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 단어장만 조회 가능"
  ON wordbooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 단어장만 생성 가능"
  ON wordbooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 단어장만 수정 가능"
  ON wordbooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "사용자는 자신의 단어장만 삭제 가능"
  ON wordbooks FOR DELETE
  USING (auth.uid() = user_id);

-- words 테이블 RLS (wordbooks를 통해 간접 확인)
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 단어만 조회 가능"
  ON words FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wordbooks
      WHERE wordbooks.id = words.wordbook_id
      AND wordbooks.user_id = auth.uid()
    )
  );

CREATE POLICY "사용자는 자신의 단어장에만 단어 추가 가능"
  ON words FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wordbooks
      WHERE wordbooks.id = words.wordbook_id
      AND wordbooks.user_id = auth.uid()
    )
  );

CREATE POLICY "사용자는 자신의 단어만 수정 가능"
  ON words FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM wordbooks
      WHERE wordbooks.id = words.wordbook_id
      AND wordbooks.user_id = auth.uid()
    )
  );

CREATE POLICY "사용자는 자신의 단어만 삭제 가능"
  ON words FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM wordbooks
      WHERE wordbooks.id = words.wordbook_id
      AND wordbooks.user_id = auth.uid()
    )
  );

-- study_logs 테이블 RLS
ALTER TABLE study_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 학습기록만 조회 가능"
  ON study_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wordbooks
      WHERE wordbooks.id = study_logs.wordbook_id
      AND wordbooks.user_id = auth.uid()
    )
  );

CREATE POLICY "사용자는 자신의 단어장에만 학습기록 추가 가능"
  ON study_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wordbooks
      WHERE wordbooks.id = study_logs.wordbook_id
      AND wordbooks.user_id = auth.uid()
    )
  );

CREATE POLICY "사용자는 자신의 학습기록만 삭제 가능"
  ON study_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM wordbooks
      WHERE wordbooks.id = study_logs.wordbook_id
      AND wordbooks.user_id = auth.uid()
    )
  );

-- wrong_answers 테이블 RLS
ALTER TABLE wrong_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "사용자는 자신의 오답만 조회 가능"
  ON wrong_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM words
      JOIN wordbooks ON wordbooks.id = words.wordbook_id
      WHERE words.id = wrong_answers.word_id
      AND wordbooks.user_id = auth.uid()
    )
  );

CREATE POLICY "사용자는 자신의 단어에만 오답 추가 가능"
  ON wrong_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM words
      JOIN wordbooks ON wordbooks.id = words.wordbook_id
      WHERE words.id = wrong_answers.word_id
      AND wordbooks.user_id = auth.uid()
    )
  );

CREATE POLICY "사용자는 자신의 오답만 삭제 가능"
  ON wrong_answers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM words
      JOIN wordbooks ON wordbooks.id = words.wordbook_id
      WHERE words.id = wrong_answers.word_id
      AND wordbooks.user_id = auth.uid()
    )
  );
