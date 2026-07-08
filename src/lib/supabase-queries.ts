import { supabase } from "@/lib/supabase";
import type { Participant, Game, Program, Spot, Poll, PollVote, Message, Photo } from "@/lib/types";

// ============================================
// PARTICIPANTS
// ============================================

export async function getParticipants(): Promise<Participant[]> {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching participants:", error);
    return [];
  }
  return data as Participant[];
}

export async function getParticipant(id: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching participant:", error);
    return null;
  }
  return data as Participant;
}

export async function updateParticipant(id: string, updates: Partial<Participant>): Promise<boolean> {
  const { error } = await supabase
    .from("participants")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error updating participant:", error);
    return false;
  }
  return true;
}

export async function updateHype(name: string, hypeLevel: number): Promise<boolean> {
  const { error } = await supabase
    .from("participants")
    .update({ hype_level: hypeLevel, updated_at: new Date().toISOString() })
    .ilike("name", name);

  if (error) {
    console.error("Error updating hype:", error);
    return false;
  }
  return true;
}

// ============================================
// GAMES
// ============================================

export async function getGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
    .select("*, author:participants(*)")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching games:", error);
    return [];
  }
  return data as Game[];
}

export async function getRevealedGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
    .select("*, author:participants(*)")
    .eq("is_revealed", true)
    .order("revealed_at", { ascending: true });

  if (error) {
    console.error("Error fetching revealed games:", error);
    return [];
  }
  return data as Game[];
}

export async function submitGame(authorId: string, title: string, description: string, category: string): Promise<boolean> {
  const { error } = await supabase
    .from("games")
    .insert({ author_id: authorId, title, description, category });

  if (error) {
    console.error("Error submitting game:", error);
    return false;
  }
  return true;
}

export async function revealGame(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("games")
    .update({ is_revealed: true, revealed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error revealing game:", error);
    return false;
  }
  return true;
}

export async function revealAllGames(): Promise<boolean> {
  const { error } = await supabase
    .from("games")
    .update({ is_revealed: true, revealed_at: new Date().toISOString() })
    .eq("is_revealed", false);

  if (error) {
    console.error("Error revealing all games:", error);
    return false;
  }
  return true;
}

// ============================================
// PROGRAM
// ============================================

export async function getProgram(): Promise<Program[]> {
  const { data, error } = await supabase
    .from("program")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching program:", error);
    return [];
  }
  return data as Program[];
}

// ============================================
// SPOTS
// ============================================

export async function getSpots(): Promise<Spot[]> {
  const { data, error } = await supabase
    .from("spots")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching spots:", error);
    return [];
  }
  return data as Spot[];
}

// ============================================
// POLLS
// ============================================

export async function getPolls(): Promise<Poll[]> {
  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching polls:", error);
    return [];
  }
  return data as Poll[];
}

export async function getPollVotes(pollId: string): Promise<PollVote[]> {
  const { data, error } = await supabase
    .from("poll_votes")
    .select("*")
    .eq("poll_id", pollId);

  if (error) {
    console.error("Error fetching poll votes:", error);
    return [];
  }
  return data as PollVote[];
}

export async function votePoll(pollId: string, participantId: string, optionIndex: number): Promise<boolean> {
  const { error } = await supabase
    .from("poll_votes")
    .upsert({ poll_id: pollId, participant_id: participantId, option_index: optionIndex }, { onConflict: "poll_id,participant_id" });

  if (error) {
    console.error("Error voting:", error);
    return false;
  }
  return true;
}

// ============================================
// MESSAGES
// ============================================

export async function getMessages(): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*, author:participants(*)")
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
  return data as Message[];
}

export async function sendMessage(authorId: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from("messages")
    .insert({ author_id: authorId, content });

  if (error) {
    console.error("Error sending message:", error);
    return false;
  }
  return true;
}

// ============================================
// PHOTOS
// ============================================

export async function getPhotos(): Promise<Photo[]> {
  const { data, error } = await supabase
    .from("photos")
    .select("*, author:participants(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching photos:", error);
    return [];
  }
  return data as Photo[];
}
