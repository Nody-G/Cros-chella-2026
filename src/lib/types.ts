export type ParticipantStatus = "confirmed" | "pending" | "declined";
export type GameCategory = "quiz" | "physical" | "alcohol" | "disgusting" | "culture" | "creative" | "other";
export type ProgramDay = "friday" | "saturday" | "sunday";
export type DangerLevel = "easy" | "normal" | "hard" | "extreme";

export interface Participant {
  id: string;
  name: string;
  pseudo: string | null;
  avatar_url: string | null;
  status: ParticipantStatus;
  bed_assignment: string | null;
  bio: string | null;
  is_admin: boolean;
  hype_level: number;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  category: GameCategory;
  is_revealed: boolean;
  revealed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  author?: Participant;
}

export interface Program {
  id: string;
  title: string;
  description: string | null;
  emoji: string;
  day: ProgramDay;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Spot {
  id: string;
  name: string;
  description: string | null;
  maps_url: string | null;
  image_url: string | null;
  danger_level: DangerLevel;
  sort_order: number;
  created_at: string;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  created_by: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  participant_id: string;
  option_index: number;
  created_at: string;
}

export interface Message {
  id: string;
  author_id: string;
  content: string;
  reactions: Record<string, string[]>;
  created_at: string;
  // Joined
  author?: Participant;
}

export interface Photo {
  id: string;
  author_id: string;
  url: string;
  caption: string | null;
  created_at: string;
  // Joined
  author?: Participant;
}
