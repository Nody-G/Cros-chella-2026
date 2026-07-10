export type ParticipantStatus = "confirmed" | "pending" | "declined";
export type GameCategory = "quiz" | "physical" | "alcohol" | "disgusting" | "culture" | "creative" | "strategy" | "speed" | "luck" | "social" | "mystery" | "other";
export type ProgramDay = "friday" | "saturday" | "sunday";
export type DangerLevel = "easy" | "normal" | "hard" | "extreme";
export type TaskStatus = "pending" | "accepted" | "done";

export interface Participant {
  id: string;
  name: string;
  pseudo: string | null;
  avatar_url: string | null;
  status: ParticipantStatus;
  bed_assignment: string | null;
  bio: string | null;
  password?: string | null;
  admin_code?: string | null;
  is_admin: boolean;
  hype_level: number;
  created_at: string;
  updated_at: string;
  // Profil personnalisé
  tagline: string | null;
  emoji_avatar: string | null;
  fun_title: string | null;
  special_skill: string | null;
  festival_role: string | null;
  catchphrase: string | null;
  theme_song: string | null;
  superpower: string | null;
  weakness: string | null;
  alcohol_preferences: string[] | null;
  favorite_alcohol: string | null;
  smoking_preferences: string[] | null;
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
  // Nouveau : assignation de tâches
  responsible_id: string | null;
  task_status: TaskStatus;
  volunteer_note: string | null;
  // Joined
  responsible?: Participant;
}

export interface ProgramProposal {
  id: string;
  program_id: string | null;
  proposer_id: string;
  title: string;
  description: string | null;
  emoji: string;
  day: ProgramDay;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  image_url: string | null;
  vote_count: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  // Joined
  proposer?: Participant;
}

export interface ProgramProposalVote {
  id: string;
  proposal_id: string;
  participant_id: string;
  created_at: string;
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
  image_url: string | null;
  reactions: Record<string, string[]>;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
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

export interface PhotoComment {
  id: string;
  photo_id: string;
  author_id: string;
  content: string;
  created_at: string;
  // Joined
  author?: Participant;
}
