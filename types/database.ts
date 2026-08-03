export type Category = 'Web' | 'Forensics' | 'Pwn' | 'Crypto' | 'Reverse' | 'Misc';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type PlatformMode = 'practice' | 'competition';

export interface Profile {
  id: string;
  username: string;
  email: string;
  team_id: string | null;
  role: 'player' | 'admin';
  created_at: string;
  teams?: Team | null;
}

export interface Team {
  id: string;
  name: string;
  invite_code?: string; // column-level revoked from public queries; only available via dedicated API
  created_by: string;
  created_at: string;
  members?: Profile[];
  solves?: Solve[];
  total_points?: number;
  last_solve_time?: string | null;
}

export interface Challenge {
  id: string;
  title: string;
  category: Category;
  difficulty: Difficulty;
  description: string;
  points: number;
  flag?: string; // column-level revoked from non-server queries
  file_url?: string | null;
  author: string;
  is_visible: boolean;
  created_at: string;
  is_solved?: boolean;
  // First Blood tracking
  first_blood_user_id?: string | null;
  first_blood_team_id?: string | null;
  first_blood_at?: string | null;
  // Runtime fields
  has_runtime?: boolean;
  runtime_template?: string;
  runtime_folder?: string;
  runtime_timeout?: number;
  runtime_memory?: number;
  runtime_cpu?: number;
  runtime_pids?: number;
  runtime_port?: number;
  runtime_protocol?: string;
}

export interface Hint {
  id: string;
  challenge_id: string;
  hint_text?: string; // may be absent if not yet revealed
  cost: number;
  created_at: string;
}

export interface HintReveal {
  id: string;
  user_id: string;
  team_id: string | null;
  hint_id: string;
  challenge_id: string;
  cost_paid: number;
  revealed_at: string;
}

export interface Solve {
  id: string;
  team_id: string | null; // null for solo practice solves
  user_id: string;
  challenge_id: string;
  points: number;
  created_at: string;
  challenges?: Challenge;
  profiles?: Profile;
  teams?: Team | null;
}

export interface LeaderboardEntry {
  rank: number;
  team_id: string;
  team_name: string;
  total_points: number;
  solves_count: number;
  last_solve_time: string | null;
  members_count: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  profiles?: Profile;
}

export interface SubmissionLog {
  id: string;
  user_id: string;
  team_id: string | null;
  challenge_id: string;
  submitted_flag: string;
  is_correct: boolean;
  created_at: string;
  profiles?: Profile;
  teams?: Team | null;
  challenges?: Challenge;
}

export interface Writeup {
  id: string;
  challenge_id: string;
  user_id: string;
  url: string;
  created_at: string;
  profiles?: Profile;
  challenges?: Challenge;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}
