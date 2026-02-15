// 데이터베이스 타입 정의

export interface Wordbook {
  id: string;
  user_id: string;
  title: string;
  current_step: number;
  created_at: string;
}

export interface Word {
  id: string;
  wordbook_id: string;
  word: string;
  part_of_speech: string | null;
  meaning: string;
  pronunciation: string | null;
  root_affix: string | null;
  etymology: string | null;
  memo: string | null;
  is_starred: boolean;
}

export interface StudyLog {
  id: string;
  wordbook_id: string;
  completed_step: number;
  next_due_date: string;
  created_at: string;
}

export interface WrongAnswer {
  id: string;
  word_id: string;
  test_session: number;
  created_at: string;
}

// 단어 + 오답 정보를 합친 타입
export interface WordWithWrongAnswers extends Word {
  wrong_answers?: WrongAnswer[];
}

// 단어장 + 학습 기록을 합친 타입
export interface WordbookWithLogs extends Wordbook {
  study_logs?: StudyLog[];
  word_count?: number;
}
