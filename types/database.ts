export type Category = 'Web' | 'Forensics' | 'Pwn' | 'Crypto' | 'Reverse' | 'Misc';

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
  invite_code: string;
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
  description: string;
  points: number;
  flag?: string; // Hidden in public queries
  file_url?: string | null;
  author: string;
  created_at: string;
  is_solved?: boolean;
}

export interface Solve {
  id: string;
  team_id: string;
  user_id: string;
  challenge_id: string;
  points: number;
  created_at: string;
  challenges?: Challenge;
  profiles?: Profile;
  teams?: Team;
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
