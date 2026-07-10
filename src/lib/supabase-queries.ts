import { supabase } from "@/lib/supabase";
import type { Participant, Game, Program, ProgramProposal, ProgramProposalVote, Spot, Poll, PollVote, Message, Photo, PhotoComment } from "@/lib/types";

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
  const payload = { ...updates, updated_at: new Date().toISOString() };
  console.log("[updateParticipant] id:", id, "payload keys:", Object.keys(payload));
  const { data, error, status, statusText } = await supabase
    .from("participants")
    .update(payload)
    .eq("id", id)
    .select();

  if (error) {
    console.error("[updateParticipant] Error:", JSON.stringify(error, null, 2));
    console.error("[updateParticipant] Status:", status, statusText);
    return false;
  }
  console.log("[updateParticipant] Success, updated rows:", data?.length);
  return true;
}

export async function uploadProfilePhoto(participantId: string, file: File): Promise<string | null> {
  // Always use .jpg since we compress to JPEG
  const filePath = `avatars/${participantId}.jpg`;

  // Remove old file first (ignore errors if doesn't exist)
  await supabase.storage.from('avatars').remove([filePath]);

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true, contentType: "image/jpeg" });

  if (uploadError) {
    console.error("Error uploading photo:", uploadError);
    return null;
  }

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Add cache-busting query param so updated photos show immediately
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function deleteProfilePhoto(participantId: string): Promise<boolean> {
  const filePath = `avatars/${participantId}.jpg`;

  const { error } = await supabase.storage
    .from('avatars')
    .remove([filePath]);

  if (error) {
    console.error("Error deleting photo:", error);
    return false;
  }

  // Clear avatar_url in DB
  const { error: dbError } = await supabase
    .from("participants")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", participantId);

  if (dbError) {
    console.error("Error clearing avatar_url:", dbError);
    return false;
  }

  return true;
}

export async function updateHype(name: string, hypeLevel: number): Promise<boolean> {
  // Map hype level to status: 1-3 = pending, 4-6 = confirmed
  const status = hypeLevel >= 4 ? "confirmed" : "pending";
  const { error } = await supabase
    .from("participants")
    .update({ hype_level: hypeLevel, status, updated_at: new Date().toISOString() })
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

export async function unrevealGame(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("games")
    .update({ is_revealed: false, revealed_at: null })
    .eq("id", id);

  if (error) {
    console.error("Error unrevealing game:", error);
    return false;
  }
  return true;
}

export async function deleteGame(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("games")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting game:", error);
    return false;
  }
  return true;
}

export async function updateGame(id: string, title: string, description: string, category: string): Promise<boolean> {
  const { error } = await supabase
    .from("games")
    .update({ title, description, category, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error updating game:", error);
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

export async function sendMessage(authorId: string, content: string, imageUrl?: string): Promise<boolean> {
  const insertData: { author_id: string; content: string; image_url?: string } = { author_id: authorId, content };
  if (imageUrl) insertData.image_url = imageUrl;

  const { error } = await supabase
    .from("messages")
    .insert(insertData);

  if (error) {
    console.error("Error sending message:", error);
    return false;
  }
  return true;
}

export async function editMessage(messageId: string, newContent: string): Promise<boolean> {
  const { error } = await supabase
    .from("messages")
    .update({ content: newContent, edited_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    console.error("Error editing message:", error);
    return false;
  }
  return true;
}

export async function deleteMessage(messageId: string): Promise<boolean> {
  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString(), content: "", image_url: null })
    .eq("id", messageId);

  if (error) {
    console.error("Error deleting message:", error);
    return false;
  }
  return true;
}

export async function uploadChatImage(authorId: string, file: File): Promise<string | null> {
  const ext = file.type === "image/png" ? "png" : "jpg";
  const fileName = `${authorId}_${Date.now()}.${ext}`;
  const filePath = `chat/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: false, contentType: file.type || "image/jpeg" });

  if (uploadError) {
    console.error("Error uploading chat image:", uploadError);
    return null;
  }

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return data.publicUrl;
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

export async function updatePhotoCaption(photoId: string, caption: string): Promise<boolean> {
  const { error } = await supabase
    .from("photos")
    .update({ caption: caption.trim() || null })
    .eq("id", photoId);

  if (error) {
    console.error("Error updating photo caption:", error);
    return false;
  }
  return true;
}

export async function deletePhoto(photoId: string): Promise<boolean> {
  const { error } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId);

  if (error) {
    console.error("Error deleting photo:", error);
    return false;
  }
  return true;
}

export async function getPhotoComments(photoId: string): Promise<PhotoComment[]> {
  const { data, error } = await supabase
    .from("photo_comments")
    .select("*, author:participants(*)")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching photo comments:", error);
    return [];
  }
  return data as PhotoComment[];
}

export async function addPhotoComment(photoId: string, authorId: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from("photo_comments")
    .insert({ photo_id: photoId, author_id: authorId, content: content.trim() });

  if (error) {
    console.error("Error adding photo comment:", error);
    return false;
  }
  return true;
}

export async function deletePhotoComment(commentId: string): Promise<boolean> {
  const { error } = await supabase
    .from("photo_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    console.error("Error deleting photo comment:", error);
    return false;
  }
  return true;
}

export async function updatePassword(id: string, password: string): Promise<boolean> {
  const { error } = await supabase
    .from("participants")
    .update({ password, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error updating password:", error);
    return false;
  }
  return true;
}

export async function updateAdminCode(id: string, adminCode: string): Promise<boolean> {
  const { error } = await supabase
    .from("participants")
    .update({ admin_code: adminCode, password: adminCode, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error updating admin code:", error);
    return false;
  }
  return true;
}

// ============================================
// PROGRAM — CRUD Admin
// ============================================

export async function createProgram(entry: {
  title: string;
  description?: string;
  emoji: string;
  day: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  sort_order?: number;
}): Promise<boolean> {
  const { error } = await supabase
    .from("program")
    .insert(entry);

  if (error) {
    console.error("Error creating program entry:", error);
    return false;
  }
  return true;
}

export async function updateProgram(id: string, updates: Partial<Program>): Promise<boolean> {
  const { error } = await supabase
    .from("program")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error updating program entry:", error);
    return false;
  }
  return true;
}

export async function deleteProgram(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("program")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting program entry:", error);
    return false;
  }
  return true;
}

export async function getProgramWithResponsible(): Promise<Program[]> {
  const { data, error } = await supabase
    .from("program")
    .select("*, responsible:participants(*)")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching program:", error);
    return [];
  }
  return data as Program[];
}

export async function volunteerForTask(programId: string, participantId: string, note?: string): Promise<boolean> {
  const { error } = await supabase
    .from("program")
    .update({
      responsible_id: participantId,
      task_status: "accepted",
      volunteer_note: note || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", programId);

  if (error) {
    console.error("Error volunteering for task:", error);
    return false;
  }
  return true;
}

export async function markTaskDone(programId: string): Promise<boolean> {
  const { error } = await supabase
    .from("program")
    .update({ task_status: "done", updated_at: new Date().toISOString() })
    .eq("id", programId);

  if (error) {
    console.error("Error marking task done:", error);
    return false;
  }
  return true;
}

export async function unassignTask(programId: string): Promise<boolean> {
  const { error } = await supabase
    .from("program")
    .update({
      responsible_id: null,
      task_status: "pending",
      volunteer_note: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", programId);

  if (error) {
    console.error("Error unassigning task:", error);
    return false;
  }
  return true;
}

// ============================================
// PROGRAM PROPOSALS
// ============================================

export async function getProgramProposals(): Promise<ProgramProposal[]> {
  const { data, error } = await supabase
    .from("program_proposals")
    .select("*, proposer:participants(*)")
    .order("vote_count", { ascending: false });

  if (error) {
    console.error("Error fetching proposals:", error);
    return [];
  }
  return data as ProgramProposal[];
}

export async function submitProposal(proposal: {
  proposer_id: string;
  title: string;
  description?: string;
  emoji?: string;
  day: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  image_url?: string;
}): Promise<boolean> {
  const { error } = await supabase
    .from("program_proposals")
    .insert(proposal);

  if (error) {
    console.error("Error submitting proposal:", error);
    return false;
  }
  return true;
}

export async function updateProposal(proposalId: string, updates: {
  title?: string;
  description?: string;
  emoji?: string;
  day?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  image_url?: string | null;
}): Promise<boolean> {
  const { error } = await supabase
    .from("program_proposals")
    .update(updates)
    .eq("id", proposalId);

  if (error) {
    console.error("Error updating proposal:", error);
    return false;
  }
  return true;
}

export async function deleteProposal(proposalId: string): Promise<boolean> {
  // Delete votes first
  await supabase.from("program_proposal_votes").delete().eq("proposal_id", proposalId);
  const { error } = await supabase
    .from("program_proposals")
    .delete()
    .eq("id", proposalId);

  if (error) {
    console.error("Error deleting proposal:", error);
    return false;
  }
  return true;
}

export async function uploadProposalImage(proposalId: string, file: File): Promise<string | null> {
  const filePath = `proposals/${proposalId}.jpg`;

  // Remove old file first
  await supabase.storage.from('avatars').remove([filePath]);

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true, contentType: "image/jpeg" });

  if (uploadError) {
    console.error("Error uploading proposal image:", uploadError);
    return null;
  }

  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function deleteProposalImage(proposalId: string): Promise<boolean> {
  const filePath = `proposals/${proposalId}.jpg`;
  const { error } = await supabase.storage.from('avatars').remove([filePath]);
  if (error) {
    console.error("Error deleting proposal image:", error);
    return false;
  }
  return true;
}

export async function voteProposal(proposalId: string, participantId: string): Promise<boolean> {
  // Check if already voted
  const { data: existing } = await supabase
    .from("program_proposal_votes")
    .select("id")
    .eq("proposal_id", proposalId)
    .eq("participant_id", participantId)
    .single();

  if (existing) {
    // Unvote
    await supabase.from("program_proposal_votes").delete().eq("id", existing.id);
    await supabase.rpc("decrement_vote_count", { p_id: proposalId });
  } else {
    // Vote
    await supabase.from("program_proposal_votes").insert({
      proposal_id: proposalId,
      participant_id: participantId,
    });
    await supabase.rpc("increment_vote_count", { p_id: proposalId });
  }

  return true;
}

export async function getProposalVotes(proposalId: string): Promise<ProgramProposalVote[]> {
  const { data, error } = await supabase
    .from("program_proposal_votes")
    .select("*")
    .eq("proposal_id", proposalId);

  if (error) {
    console.error("Error fetching proposal votes:", error);
    return [];
  }
  return data as ProgramProposalVote[];
}

export async function approveProposal(proposalId: string): Promise<boolean> {
  const { error } = await supabase
    .from("program_proposals")
    .update({ status: "approved" })
    .eq("id", proposalId);

  if (error) {
    console.error("Error approving proposal:", error);
    return false;
  }
  return true;
}

export async function rejectProposal(proposalId: string): Promise<boolean> {
  const { error } = await supabase
    .from("program_proposals")
    .update({ status: "rejected" })
    .eq("id", proposalId);

  if (error) {
    console.error("Error rejecting proposal:", error);
    return false;
  }
  return true;
}

