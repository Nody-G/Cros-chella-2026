export type ParticipantStatus = "confirmed" | "pending" | "declined";
export type AttendanceStatus = "yes" | "maybe" | "no";
export type GameCategory = "quiz" | "physical" | "alcohol" | "disgusting" | "culture" | "creative" | "strategy" | "speed" | "luck" | "social" | "mystery" | "other";
export type ProgramDay = "thursday" | "friday" | "saturday" | "sunday";
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
  attendance: AttendanceStatus | null;
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
  deleted_at: string | null;
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
  created_by?: string | null;
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
  voter_ids?: string[];
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

export interface ProposalComment {
  id: string;
  proposal_id: string;
  author_id: string;
  content: string;
  created_at: string;
  // Joined
  author?: Participant;
}

export interface ProgramComment {
  id: string;
  program_id: string;
  participant_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined
  author?: Participant;
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
  creator?: Participant;
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
  source: "gallery" | "chat";
  comment_count?: number;
  created_at: string;
  // Joined
  author?: Participant;
}

export interface PhotoComment {
  id: string;
  photo_id: string;
  participant_id: string;
  content: string;
  created_at: string;
  // Joined
  author?: Participant;
}

// ============================================
// CUSTOM BADGES
// ============================================

export interface CustomBadge {
  id: string;
  participant_id: string;
  awarded_by: string;
  emoji: string;
  title: string;
  description: string | null;
  awarded_at: string;
  // Joined
  participant?: Participant;
  awarder?: Participant;
}

// ============================================
// BILLARD TOURNAMENTS (doubles)
// ============================================

export type BillardGameType = "8ball" | "9ball";
export type BillardTournamentStatus = "setup" | "active" | "done";
export type BillardMatchStatus = "pending" | "done" | "bye" | "waiting";

// ============================================
// TRICOUNT / EXPENSES
// ============================================

export interface Expense {
  id: string;
  paid_by: string; // participant id
  title: string;
  amount: number; // in cents to avoid float issues
  category: ExpenseCategory;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  paid_by_participant?: Participant;
  splits?: ExpenseSplit[];
}

export type ExpenseCategory = "food" | "alcohol" | "transport" | "activities" | "accommodation" | "other";

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; emoji: string }[] = [
  { value: "food", label: "Bouffe", emoji: "🍔" },
  { value: "alcohol", label: "Alcool", emoji: "🍺" },
  { value: "transport", label: "Transport", emoji: "🚗" },
  { value: "activities", label: "Activités", emoji: "🎯" },
  { value: "accommodation", label: "Logement", emoji: "🏠" },
  { value: "other", label: "Autre", emoji: "📦" },
];

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  participant_id: string;
  amount: number; // share in cents
  is_settled: boolean;
  created_at: string;
  // Joined
  participant?: Participant;
}

// ============================================
// BOT DOSSIERS / ANECDOTES
// ============================================

export type DossierCategory = "anecdote" | "surnom" | "dossier" | "enfance" | "autre";

export interface BotDossier {
  id: string;
  target_participant_id: string;
  author_participant_id: string | null;
  is_anonymous: boolean;
  category: DossierCategory;
  content: string;
  created_at: string;
  target?: Participant;
  author?: Participant;
}

export const DOSSIER_CATEGORIES: { value: DossierCategory; label: string; emoji: string }[] = [
  { value: "dossier", label: "Gros dossier", emoji: "💣" },
  { value: "anecdote", label: "Anecdote drôle", emoji: "📖" },
  { value: "surnom", label: "Surnom gênant", emoji: "🏷️" },
  { value: "enfance", label: "Souvenir d'enfance", emoji: "👶" },
  { value: "autre", label: "Autre pépite", emoji: "🤫" },
];

export interface Settlement {
  id: string;
  from_participant: string; // who pays
  to_participant: string; // who receives
  amount: number; // in cents
  is_confirmed: boolean;
  confirmed_at: string | null;
  created_at: string;
  // Joined
  from_participant_data?: Participant;
  to_participant_data?: Participant;
}

// Computed balance for each participant
export interface ParticipantBalance {
  participant_id: string;
  participant?: Participant;
  total_paid: number; // total they paid for others
  total_owed: number; // total they owe
  net_balance: number; // positive = owed money, negative = owes money
}

// ============================================
// FEEDBACK (bugs & ideas)
// ============================================

export type FeedbackType = "bug" | "idea";
export type FeedbackStatus = "open" | "in_progress" | "done" | "dismissed";

export interface Feedback {
  id: string;
  author_id: string | null;
  type: FeedbackType;
  title: string;
  description: string | null;
  status: FeedbackStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  author?: Participant;
}

export interface BillardTournament {
  id: string;
  name: string;
  game_type: BillardGameType;
  status: BillardTournamentStatus;
  winner_team_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  teams?: BillardTeam[];
  matches?: BillardMatch[];
  winner_team?: BillardTeam;
}

export interface BillardTeam {
  id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  team_name: string | null;
  created_at: string;
  // Joined
  player1?: Participant;
  player2?: Participant;
}

export interface BillardMatch {
  id: string;
  tournament_id: string;
  round: number;
  match_order: number;
  team1_id: string;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_team_id: string | null;
  status: BillardMatchStatus;
  notes: string | null;
  created_at: string;
  // Joined
  team1?: BillardTeam;
  team2?: BillardTeam;
  winner_team?: BillardTeam;
}
