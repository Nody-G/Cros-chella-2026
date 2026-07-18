import { supabase } from "@/lib/supabase";
import type { Participant, Game, Program, ProgramProposal, ProgramProposalVote, ProposalComment, ProgramComment, Spot, Poll, PollVote, Message, Photo, PhotoComment, CustomBadge, BillardTournament, BillardTeam, BillardMatch, Feedback, Expense, Settlement, ParticipantBalance, ExpenseCategory, BotDossier } from "@/lib/types";

// ============================================
// PARTICIPANTS
// ============================================

export async function getParticipants(): Promise<Participant[]> {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .is("deleted_at", null)
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

export async function addParticipant(name: string, pseudo?: string): Promise<Participant | null> {
  const trimmedName = name.trim();

  // Check if a soft-deleted participant with the same name exists — restore instead of insert
  const { data: existing } = await supabase
    .from("participants")
    .select("*")
    .eq("name", trimmedName)
    .not("deleted_at", "is", null)
    .limit(1)
    .single();

  if (existing) {
    // Restore the soft-deleted participant
    const updateData: Record<string, unknown> = { deleted_at: null, status: "pending" };
    if (pseudo && pseudo.trim()) {
      updateData.pseudo = pseudo.trim();
    }
    const { data, error } = await supabase
      .from("participants")
      .update(updateData)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("[addParticipant] Restore error:", JSON.stringify(error, null, 2));
      throw new Error(error.message || "Erreur lors de la restauration");
    }
    return data as Participant;
  }

  // No existing soft-deleted — insert new
  const insertData: Record<string, unknown> = { name: trimmedName, status: "pending" };
  if (pseudo && pseudo.trim()) {
    insertData.pseudo = pseudo.trim();
  }
  const { data, error } = await supabase
    .from("participants")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("[addParticipant] Error:", JSON.stringify(error, null, 2));
    throw new Error(error.message || "Erreur lors de l'ajout");
  }
  return data as Participant;
}

export async function deleteParticipant(participantId: string): Promise<boolean> {
  const { error } = await supabase
    .from("participants")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", participantId);

  if (error) {
    console.error("[deleteParticipant] Error:", JSON.stringify(error, null, 2));
    return false;
  }
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

export async function updateAttendance(participantId: string, attendance: "yes" | "maybe" | "no"): Promise<boolean> {
  const { error } = await supabase
    .from("participants")
    .update({ attendance, updated_at: new Date().toISOString() })
    .eq("id", participantId);

  if (error) {
    console.error("Error updating attendance:", error);
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
    .select("*, creator:participants(*)")
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

  // Trigger push notification on poll vote
  try {
    const { data: poll } = await supabase.from("polls").select("question").eq("id", pollId).single();
    const { data: voter } = await supabase.from("participants").select("name, pseudo").eq("id", participantId).single();
    const voterName = voter ? (voter.pseudo || voter.name) : "Quelqu'un";
    triggerPushNotification(
      participantId,
      "Sondage 🗳️",
      `${voterName} a voté au sondage "${poll?.question || ""}"`,
      "/sondages"
    );
  } catch (e) {
    console.error("Error triggering poll vote push:", e);
  }

  return true;
}

export async function createPoll(question: string, options: string[], createdById: string): Promise<boolean> {
  const { error } = await supabase
    .from("polls")
    .insert({ question, options, created_by: createdById, is_active: true });

  if (error) {
    console.error("Error creating poll:", error);
    return false;
  }

  // Trigger push notifications
  try {
    const { data: creator } = await supabase.from("participants").select("name, pseudo").eq("id", createdById).single();
    const creatorName = creator ? (creator.pseudo || creator.name) : "Quelqu'un";
    triggerPushNotification(
      createdById,
      "Nouveau Sondage ! 🗳️",
      `${creatorName} a lancé le sondage : "${question}"`,
      "/sondages"
    );
  } catch (e) {
    console.error("Error triggering poll push notification:", e);
  }

  return true;
}

export async function deletePoll(pollId: string): Promise<boolean> {
  // Delete votes first, then the poll
  await supabase.from("poll_votes").delete().eq("poll_id", pollId);
  const { error } = await supabase.from("polls").delete().eq("id", pollId);
  if (error) {
    console.error("Error deleting poll:", error);
    return false;
  }
  return true;
}

// ============================================
// MESSAGES
// ============================================

export async function getMessages(limit?: number): Promise<Message[]> {
  if (limit) {
    const { data, error } = await supabase
      .from("messages")
      .select("*, author:participants(*)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
    return (data as Message[]).reverse();
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*, author:participants(*)")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
  return data as Message[];
}

export async function triggerPushNotification(
  authorId: string,
  title: string,
  body: string,
  url: string = "/chat"
): Promise<void> {
  try {
    fetch("/api/push-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorId, title, body, url }),
    }).catch((err) => console.error("Failed to trigger push notification API:", err));
  } catch (err) {
    console.error("Error in triggerPushNotification:", err);
  }
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

  // Trigger push notifications asynchronously
  try {
    const { data: author } = await supabase
      .from("participants")
      .select("name, pseudo")
      .eq("id", authorId)
      .single();
    const senderName = author ? (author.pseudo || author.name) : "Quelqu'un";
    const bodyText = imageUrl ? (content ? `${senderName}: ${content} 📷` : `${senderName} a envoyé une photo 📷`) : `${senderName}: ${content}`;
    triggerPushNotification(authorId, "Chat Cros-Chella 💬", bodyText, "/chat");
  } catch (e) {
    console.error("Failed to trigger message push:", e);
    triggerPushNotification(authorId, "Chat Cros-Chella 💬", content || "Nouveau message 📷", "/chat");
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
  // 1. Récupérer le message pour avoir l'image_url avant suppression
  const { data: msg, error: fetchError } = await supabase
    .from("messages")
    .select("image_url")
    .eq("id", messageId)
    .single();

  if (fetchError) {
    console.error("Error fetching message for delete:", fetchError);
    return false;
  }

  // 2. Supprimer l'image du Storage si elle existe
  if (msg?.image_url) {
    try {
      // Extraire le path relatif depuis l'URL publique
      // URL format: .../storage/v1/object/public/avatars/chat/xxx.jpg
      const urlParts = msg.image_url.split("/avatars/");
      if (urlParts.length > 1) {
        const storagePath = urlParts[1];
        await supabase.storage.from("avatars").remove([storagePath]);
      }
    } catch (e) {
      console.warn("Could not delete image from storage:", e);
      // On continue quand même le soft delete
    }
  }

  // 3. Soft delete en DB
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

export async function adminDeleteMessage(messageId: string): Promise<boolean> {
  // 1. Récupérer le message pour avoir l'image_url avant suppression
  const { data: msg, error: fetchError } = await supabase
    .from("messages")
    .select("image_url")
    .eq("id", messageId)
    .single();

  if (fetchError) {
    console.error("Error fetching message for admin delete:", fetchError);
    return false;
  }

  // 2. Supprimer l'image du Storage si elle existe
  if (msg?.image_url) {
    try {
      const urlParts = msg.image_url.split("/avatars/");
      if (urlParts.length > 1) {
        const storagePath = urlParts[1];
        await supabase.storage.from("avatars").remove([storagePath]);
      }
    } catch (e) {
      console.warn("Could not delete image from storage:", e);
    }
  }

  // 3. Hard delete — supprime complètement la ligne de la DB
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId);

  if (error) {
    console.error("Error admin deleting message:", error);
    return false;
  }
  return true;
}

export async function toggleMessageReaction(messageId: string, participantId: string, emoji: string): Promise<Record<string, string[]> | null> {
  const { data: msg, error: fetchError } = await supabase
    .from("messages")
    .select("reactions")
    .eq("id", messageId)
    .single();

  if (fetchError) {
    console.error("Error fetching message reactions:", fetchError);
    return null;
  }

  const reactions: Record<string, string[]> = (msg?.reactions as Record<string, string[]>) || {};
  const voters = reactions[emoji] || [];

  if (voters.includes(participantId)) {
    const newVoters = voters.filter((v: string) => v !== participantId);
    if (newVoters.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = newVoters;
    }
  } else {
    reactions[emoji] = [...voters, participantId];
  }

  const { error: updateError } = await supabase
    .from("messages")
    .update({ reactions })
    .eq("id", messageId);

  if (updateError) {
    console.error("Error updating reactions:", updateError);
    return null;
  }

  return reactions;
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

/**
 * Sauvegarde une image du chat dans la galerie (sans re-upload, juste référence URL)
 */
export async function saveChatImageToGallery(authorId: string, imageUrl: string, caption?: string): Promise<boolean> {
  const { error } = await supabase
    .from("photos")
    .insert({ author_id: authorId, url: imageUrl, caption: caption?.trim() || null, source: "chat" });

  if (error) {
    console.error("Error saving chat image to gallery:", error);
    return false;
  }

  // Trigger push notification
  try {
    const { data: author } = await supabase.from("participants").select("name, pseudo").eq("id", authorId).single();
    const senderName = author ? (author.pseudo || author.name) : "Quelqu'un";
    const bodyText = caption?.trim() ? `${senderName} a enregistré une photo du chat dans la galerie : "${caption.trim()}" 📸` : `${senderName} a enregistré une photo du chat dans la galerie 📸`;
    triggerPushNotification(authorId, "Galerie mise à jour 📸", bodyText, "/galerie");
  } catch (e) {
    console.error("Error triggering gallery push:", e);
  }

  return true;
}

export async function getPhotoComments(photoId: string): Promise<PhotoComment[]> {
  const { data, error } = await supabase
    .from("photo_comments")
    .select("*, author:participants!participant_id(*)")
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
    .insert({ photo_id: photoId, participant_id: authorId, content: content.trim() });

  if (error) {
    console.error("Error adding photo comment:", error);
    return false;
  }

  // Trigger push notification for comment
  try {
    const { data: commenter } = await supabase.from("participants").select("name, pseudo").eq("id", authorId).single();
    const commenterName = commenter ? (commenter.pseudo || commenter.name) : "Quelqu'un";
    triggerPushNotification(
      authorId,
      "Galerie 📸",
      `${commenterName} a commenté une photo : "${content.trim()}"`,
      "/galerie"
    );
  } catch (e) {
    console.error("Error triggering photo comment push:", e);
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
  created_by?: string;
}): Promise<boolean> {
  const { error } = await supabase
    .from("program")
    .insert(entry);

  if (error) {
    console.error("Error creating program entry:", error);
    return false;
  }

  // Trigger notification
  try {
    const { data: admin } = await supabase.from("participants").select("id").eq("is_admin", true).limit(1).single();
    const adminId = admin?.id || "system";
    triggerPushNotification(
      adminId,
      "Timeline mise à jour 📅",
      `L'activité "${entry.emoji || "🎪"} ${entry.title}" a été ajoutée au programme !`,
      "/programme"
    );
  } catch (e) {
    console.error("Error triggering program push:", e);
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
    .select("*, responsible:participants!program_responsible_id_fkey(*)")
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
    .select("*, proposer:participants(*), votes:program_proposal_votes(participant_id)")
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

  // Trigger notification
  try {
    const { data: proposer } = await supabase.from("participants").select("name, pseudo").eq("id", proposal.proposer_id).single();
    const proposerName = proposer ? (proposer.pseudo || proposer.name) : "Quelqu'un";
    triggerPushNotification(
      proposal.proposer_id,
      "Nouvelle proposition 💡",
      `${proposerName} propose l'activité : "${proposal.emoji || "🎪"} ${proposal.title}"`,
      "/programme"
    );
  } catch (e) {
    console.error("Error triggering proposal push:", e);
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

    // Trigger push notification for proposal vote
    try {
      const { data: prop } = await supabase.from("program_proposals").select("title").eq("id", proposalId).single();
      const { data: voter } = await supabase.from("participants").select("name, pseudo").eq("id", participantId).single();
      const voterName = voter ? (voter.pseudo || voter.name) : "Quelqu'un";
      triggerPushNotification(
        participantId,
        "Vote Programme 💡",
        `${voterName} a voté pour la proposition "${prop?.title || "une activité"}" !`,
        "/programme"
      );
    } catch (e) {
      console.error("Error triggering proposal vote push:", e);
    }
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

export async function getProposalVoters(proposalId: string): Promise<{ id: string; pseudo: string | null; name: string; emoji_avatar: string | null }[]> {
  const { data, error } = await supabase
    .from("program_proposal_votes")
    .select("participant_id")
    .eq("proposal_id", proposalId);

  if (error) {
    console.error("Error fetching proposal voters:", error);
    return [];
  }

  if (!data || data.length === 0) return [];

  const participantIds = data.map((v) => v.participant_id);
  const { data: participants } = await supabase
    .from("participants")
    .select("id, pseudo, name, emoji_avatar")
    .in("id", participantIds);

  return (participants || []) as { id: string; pseudo: string | null; name: string; emoji_avatar: string | null }[];
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

  // Trigger notification
  try {
    const { data: prop } = await supabase.from("program_proposals").select("title, proposed_by").eq("id", proposalId).single();
    if (prop) {
      const { data: admin } = await supabase.from("participants").select("id").eq("is_admin", true).limit(1).single();
      const adminId = admin?.id || "admin";
      triggerPushNotification(
        adminId,
        "Proposition approuvée ! ✅",
        `L'activité "${prop.title}" a été approuvée par l'admin !`,
        "/programme"
      );
    }
  } catch (e) {
    console.error("Error triggering approve proposal push:", e);
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

// ============================================
// PROPOSAL COMMENTS

export async function getProposalComments(proposalId: string): Promise<ProposalComment[]> {
  const { data, error } = await supabase
    .from("proposal_comments")
    .select("*, author:participants(*)")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching proposal comments:", error);
    return [];
  }
  return data as ProposalComment[];
}

export async function addProposalComment(proposalId: string, authorId: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from("proposal_comments")
    .insert({ proposal_id: proposalId, author_id: authorId, content });

  if (error) {
    console.error("Error adding proposal comment:", error);
    return false;
  }
  return true;
}

export async function deleteProposalComment(commentId: string): Promise<boolean> {
  const { error } = await supabase
    .from("proposal_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    console.error("Error deleting proposal comment:", error);
    return false;
  }
  return true;
}

export async function updateProposalComment(commentId: string, newContent: string): Promise<boolean> {
  const { error } = await supabase
    .from("proposal_comments")
    .update({ content: newContent })
    .eq("id", commentId);

  if (error) {
    console.error("Error updating proposal comment:", error);
    return false;
  }
  return true;
}

// ============================================
// PROGRAM COMMENTS (commentaires sur activités)
// ============================================

export async function getProgramComments(programId: string): Promise<ProgramComment[]> {
  const { data, error } = await supabase
    .from("program_comments")
    .select("*, author:participants!participant_id(*)")
    .eq("program_id", programId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching program comments:", error);
    return [];
  }
  return data as ProgramComment[];
}

export async function addProgramComment(programId: string, participantId: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from("program_comments")
    .insert({ program_id: programId, participant_id: participantId, content: content.trim() });

  if (error) {
    console.error("Error adding program comment:", error);
    return false;
  }
  return true;
}

export async function deleteProgramComment(commentId: string): Promise<boolean> {
  const { error } = await supabase
    .from("program_comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    console.error("Error deleting program comment:", error);
    return false;
  }
  return true;
}

export async function updateProgramComment(commentId: string, newContent: string): Promise<boolean> {
  const { error } = await supabase
    .from("program_comments")
    .update({ content: newContent, updated_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) {
    console.error("Error updating program comment:", error);
    return false;
  }
  return true;
}

// ============================================
// PHOTO LIKES
// ============================================

export async function getPhotoLikeCount(photoId: string): Promise<number> {
  const { count, error } = await supabase
    .from("photo_likes")
    .select("id", { count: "exact", head: true })
    .eq("photo_id", photoId);

  if (error) {
    console.error("Error fetching photo like count:", error);
    return 0;
  }
  return count || 0;
}

export async function hasLikedPhoto(photoId: string, participantId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("photo_likes")
    .select("id")
    .eq("photo_id", photoId)
    .eq("participant_id", participantId)
    .maybeSingle();

  if (error) {
    console.error("Error checking photo like:", error);
    return false;
  }
  return !!data;
}

export async function togglePhotoLike(photoId: string, participantId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from("photo_likes")
    .select("id")
    .eq("photo_id", photoId)
    .eq("participant_id", participantId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("photo_likes").delete().eq("id", existing.id);
    if (error) { console.error("Error removing photo like:", error); return false; }
  } else {
    const { error } = await supabase.from("photo_likes").insert({ photo_id: photoId, participant_id: participantId });
    if (error) { console.error("Error adding photo like:", error); return false; }

    // Trigger push notification on like
    try {
      const { data: liker } = await supabase.from("participants").select("name, pseudo").eq("id", participantId).single();
      const likerName = liker ? (liker.pseudo || liker.name) : "Quelqu'un";
      triggerPushNotification(
        participantId,
        "Galerie 📸",
        `${likerName} a aimé une photo ❤️`,
        "/galerie"
      );
    } catch (e) {
      console.error("Error triggering photo like push:", e);
    }
  }
  return true;
}

export async function getPhotoLikers(photoId: string): Promise<{ id: string; pseudo: string | null; name: string; emoji_avatar: string | null }[]> {
  const { data, error } = await supabase
    .from("photo_likes")
    .select("participant_id")
    .eq("photo_id", photoId);

  if (error || !data || data.length === 0) return [];

  const ids = data.map((l) => l.participant_id);
  const { data: participants } = await supabase
    .from("participants")
    .select("id, pseudo, name, emoji_avatar")
    .in("id", ids);

  return (participants || []) as { id: string; pseudo: string | null; name: string; emoji_avatar: string | null }[];
}

// ============================================
// CUSTOM BADGES
// ============================================

export async function getBadgesByParticipant(participantId: string): Promise<CustomBadge[]> {
  const { data, error } = await supabase
    .from("custom_badges")
    .select("*, awarder:participants!awarded_by(*)")
    .eq("participant_id", participantId)
    .order("awarded_at", { ascending: false });

  if (error) {
    console.error("Error fetching badges:", error);
    return [];
  }
  return data as CustomBadge[];
}

export async function getAllBadges(): Promise<CustomBadge[]> {
  const { data, error } = await supabase
    .from("custom_badges")
    .select("*, participant:participants!participant_id(*), awarder:participants!awarded_by(*)")
    .order("awarded_at", { ascending: false });

  if (error) {
    console.error("Error fetching all badges:", error);
    return [];
  }
  return data as CustomBadge[];
}

export async function awardBadge(badge: {
  participant_id: string;
  awarded_by: string;
  emoji: string;
  title: string;
  description?: string;
}): Promise<boolean> {
  const { error } = await supabase
    .from("custom_badges")
    .insert(badge);

  if (error) {
    console.error("Error awarding badge:", error);
    return false;
  }

  // Trigger push notifications
  try {
    const { data: giver } = await supabase.from("participants").select("name, pseudo").eq("id", badge.awarded_by).single();
    const { data: receiver } = await supabase.from("participants").select("name, pseudo").eq("id", badge.participant_id).single();
    const giverName = giver ? (giver.pseudo || giver.name) : "Quelqu'un";
    const receiverName = receiver ? (receiver.pseudo || receiver.name) : "quelqu'un";
    triggerPushNotification(
      badge.awarded_by,
      "Nouveau Badge ! 🏅",
      `${giverName} a décerné le badge "${badge.emoji} ${badge.title}" à ${receiverName} 🎉`,
      "/badges"
    );
  } catch (e) {
    console.error("Error triggering badge push notification:", e);
  }

  return true;
}

export async function deleteBadge(badgeId: string): Promise<boolean> {
  const { error } = await supabase
    .from("custom_badges")
    .delete()
    .eq("id", badgeId);

  if (error) {
    console.error("Error deleting badge:", error);
    return false;
  }
  return true;
}

// ============================================
// BILLARD TOURNAMENTS
// ============================================

export async function getBillardTournaments(): Promise<BillardTournament[]> {
  const { data, error } = await supabase
    .from("billard_tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tournaments:", error);
    return [];
  }
  return data as BillardTournament[];
}

export async function getBillardTournament(tournamentId: string): Promise<BillardTournament | null> {
  const { data, error } = await supabase
    .from("billard_tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (error) {
    console.error("Error fetching tournament:", error);
    return null;
  }
  return data as BillardTournament;
}

export async function createBillardTournament(name: string, gameType: "8ball" | "9ball"): Promise<string | null> {
  const { data, error } = await supabase
    .from("billard_tournaments")
    .insert({ name, game_type: gameType })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating tournament:", error);
    return null;
  }

  // Trigger push notification for new billard tournament
  try {
    const { data: admin } = await supabase.from("participants").select("id").eq("is_admin", true).limit(1).single();
    const adminId = admin?.id || "system";
    triggerPushNotification(
      adminId,
      "Tournoi de Billard 🎱",
      `Le tournoi "${name}" a été lancé ! Inscriptions et matchs ouverts.`,
      "/billard"
    );
  } catch (e) {
    console.error("Error triggering billard push:", e);
  }

  return data.id;
}

export async function updateBillardTournament(tournamentId: string, updates: { name?: string; status?: string; winner_team_id?: string | null }): Promise<boolean> {
  const { error } = await supabase
    .from("billard_tournaments")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", tournamentId);

  if (error) {
    console.error("Error updating tournament:", error);
    return false;
  }
  return true;
}

export async function deleteBillardTournament(tournamentId: string): Promise<boolean> {
  // Delete matches first, then teams, then tournament
  await supabase.from("billard_matches").delete().eq("tournament_id", tournamentId);
  await supabase.from("billard_teams").delete().eq("tournament_id", tournamentId);
  const { error } = await supabase.from("billard_tournaments").delete().eq("id", tournamentId);

  if (error) {
    console.error("Error deleting tournament:", error);
    return false;
  }
  return true;
}

// Billard Teams
export async function getBillardTeams(tournamentId: string): Promise<BillardTeam[]> {
  const { data, error } = await supabase
    .from("billard_teams")
    .select("*, player1:participants!player1_id(*), player2:participants!player2_id(*)")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching teams:", error);
    return [];
  }
  return data as BillardTeam[];
}

export async function createBillardTeam(tournamentId: string, player1Id: string, player2Id: string, teamName?: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("billard_teams")
    .insert({
      tournament_id: tournamentId,
      player1_id: player1Id,
      player2_id: player2Id,
      team_name: teamName || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating team:", error);
    return null;
  }
  return data.id;
}

export async function deleteBillardTeam(teamId: string): Promise<boolean> {
  const { error } = await supabase
    .from("billard_teams")
    .delete()
    .eq("id", teamId);

  if (error) {
    console.error("Error deleting team:", error);
    return false;
  }
  return true;
}

// Billard Matches
export async function getBillardMatches(tournamentId: string): Promise<BillardMatch[]> {
  const { data, error } = await supabase
    .from("billard_matches")
    .select("*, team1:billard_teams!team1_id(*, player1:participants!player1_id(*), player2:participants!player2_id(*)), team2:billard_teams!team2_id(*, player1:participants!player1_id(*), player2:participants!player2_id(*)), winner_team:billard_teams!winner_team_id(*)")
    .eq("tournament_id", tournamentId)
    .order("round", { ascending: true })
    .order("match_order", { ascending: true });

  if (error) {
    console.error("Error fetching matches:", error);
    return [];
  }
  return data as BillardMatch[];
}

export async function createBillardMatch(match: {
  tournament_id: string;
  round: number;
  match_order: number;
  team1_id?: string | null;
  team2_id?: string | null;
  status?: string;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from("billard_matches")
    .insert(match)
    .select("id")
    .single();

  if (error) {
    console.error("Error creating match:", error);
    return null;
  }
  return data.id;
}

export async function updateBillardMatchScore(
  matchId: string,
  winnerTeamId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("billard_matches")
    .update({
      winner_team_id: winnerTeamId,
      status: "done",
    })
    .eq("id", matchId);

  if (error) {
    console.error("Error updating match:", error);
    return false;
  }

  // Trigger push notification for match result
  try {
    const { data: team } = await supabase.from("billard_teams").select("name").eq("id", winnerTeamId).single();
    const { data: admin } = await supabase.from("participants").select("id").eq("is_admin", true).limit(1).single();
    const adminId = admin?.id || "system";
    triggerPushNotification(
      adminId,
      "Match de Billard 🎱",
      `Victoire de l'équipe "${team?.name || ""}" au billard ! 🏆`,
      "/billard"
    );
  } catch (e) {
    console.error("Error triggering match winner push:", e);
  }

  return true;
}

/**
 * Generate bracket matches for a tournament.
 * ALL rounds are created upfront so the full bracket is visible from the start.
 * Teams are shuffled randomly. Byes are auto-advanced.
 */
export async function generateBillardBracket(tournamentId: string): Promise<boolean> {
  const teams = await getBillardTeams(tournamentId);
  if (teams.length < 2) return false;

  // Shuffle teams randomly
  const shuffled = [...teams].sort(() => Math.random() - 0.5);

  // Calculate bracket size (next power of 2)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(shuffled.length)));
  const firstRoundCount = bracketSize / 2;

  // Delete any existing matches for this tournament
  await supabase.from("billard_matches").delete().eq("tournament_id", tournamentId);

  // First round number = bracketSize (e.g. 4 teams → round 4, then 2, 1)
  const firstRound = bracketSize;
  let matchOrder = 0;

  // Create first round matches
  let teamIdx = 0;
  for (let i = 0; i < firstRoundCount; i++) {
    const team1 = shuffled[teamIdx];
    teamIdx++;

    if (teamIdx < shuffled.length) {
      // Normal match
      const team2 = shuffled[teamIdx];
      teamIdx++;
      await createBillardMatch({
        tournament_id: tournamentId,
        round: firstRound,
        match_order: matchOrder,
        team1_id: team1.id,
        team2_id: team2.id,
      });
    } else {
      // Bye: team1 advances automatically
      const matchId = await createBillardMatch({
        tournament_id: tournamentId,
        round: firstRound,
        match_order: matchOrder,
        team1_id: team1.id,
        team2_id: null,
        status: "bye",
      });
      if (matchId) {
        await supabase
          .from("billard_matches")
          .update({ winner_team_id: team1.id, status: "bye" })
          .eq("id", matchId);
      }
    }
    matchOrder++;
  }

  // Create placeholder matches for ALL subsequent rounds (empty, waiting for winners)
  let currentRound = firstRound;
  let currentMatchCount = firstRoundCount;
  while (currentRound > 1) {
    const nextRound = currentRound / 2;
    const nextRoundMatchCount = currentMatchCount / 2;

    for (let i = 0; i < nextRoundMatchCount; i++) {
      await createBillardMatch({
        tournament_id: tournamentId,
        round: nextRound,
        match_order: i,
        team1_id: null,
        team2_id: null,
        status: "waiting",
      });
    }

    currentRound = nextRound;
    currentMatchCount = nextRoundMatchCount;
  }

  // Auto-advance bye winners into the next round
  const allMatches = await getBillardMatches(tournamentId);
  const byeMatches = allMatches.filter((m) => m.status === "bye" && m.winner_team_id);
  for (const byeMatch of byeMatches) {
    await propagateWinner(byeMatch);
  }

  // Mark tournament as active
  await updateBillardTournament(tournamentId, { status: "active" });

  return true;
}

/**
 * Helper: propagate a winner into the next round match.
 * Even match_order → team1 slot, odd → team2 slot.
 */
async function propagateWinner(match: BillardMatch): Promise<void> {
  if (!match.winner_team_id) return;

  const nextRound = match.round / 2;
  if (nextRound < 1) return; // was the finale

  const nextMatchOrder = Math.floor(match.match_order / 2);
  const isEvenMatch = match.match_order % 2 === 0;

  // Re-fetch fresh matches to avoid stale data
  const allMatches = await getBillardMatches(match.tournament_id);
  const nextMatch = allMatches.find(
    (m) => m.round === nextRound && m.match_order === nextMatchOrder
  );

  if (!nextMatch) return;

  const updates: Record<string, string> = {};
  if (isEvenMatch) {
    updates.team1_id = match.winner_team_id;
  } else {
    updates.team2_id = match.winner_team_id;
  }

  await supabase
    .from("billard_matches")
    .update(updates)
    .eq("id", nextMatch.id);
}

/**
 * Record a match result: set winner and propagate to next round.
 * Simple mode: just pick the winner, no scores needed.
 */
export async function recordBillardResult(
  matchId: string,
  winnerTeamId: string
): Promise<boolean> {
  // Get the match
  const { data: match, error: fetchError } = await supabase
    .from("billard_matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (fetchError || !match) {
    console.error("Error fetching match:", fetchError);
    return false;
  }

  // Update this match
  const success = await updateBillardMatchScore(matchId, winnerTeamId);
  if (!success) return false;

  // Check if this is the finale
  const nextRound = match.round / 2;
  if (nextRound < 1) {
    // Finale — set tournament winner
    await updateBillardTournament(match.tournament_id, {
      status: "done",
      winner_team_id: winnerTeamId,
    });
    return true;
  }

  // Propagate winner to next round (re-fetch fresh data)
  const updatedMatch = { ...match, winner_team_id: winnerTeamId, status: "done" as const };
  await propagateWinner(updatedMatch);

  return true;
}

// ============================================
// FEEDBACK (bugs & ideas)
// ============================================

export async function getFeedback(): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select("*, author:participants!feedback_author_id_fkey(id, name, pseudo, emoji_avatar, avatar_url)")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching feedback:", error);
    return [];
  }
  return (data || []) as Feedback[];
}

export async function createFeedback(entry: {
  author_id: string;
  type: "bug" | "idea";
  title: string;
  description?: string;
}): Promise<Feedback | null> {
  const { data, error } = await supabase
    .from("feedback")
    .insert(entry)
    .select("*, author:participants!feedback_author_id_fkey(id, name, pseudo, emoji_avatar, avatar_url)")
    .single();

  if (error) {
    console.error("Error creating feedback:", error);
    return null;
  }

  // Trigger push notification for new feedback
  try {
    const { data: author } = await supabase.from("participants").select("name, pseudo").eq("id", entry.author_id).single();
    const authorName = author ? (author.pseudo || author.name) : "Quelqu'un";
    const typeLabel = entry.type === "bug" ? "Signalement de bug 🐛" : "Nouvelle idée 💡";
    triggerPushNotification(
      entry.author_id,
      `${typeLabel}`,
      `${authorName} : "${entry.title}"`,
      "/admin/feedback"
    );
  } catch (e) {
    console.error("Error triggering feedback push:", e);
  }

  return data as Feedback;
}

export async function updateFeedbackStatus(
  id: string,
  status: string,
  adminNote?: string
): Promise<boolean> {
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (adminNote !== undefined) update.admin_note = adminNote;
  const { error } = await supabase.from("feedback").update(update).eq("id", id);
  if (error) {
    console.error("Error updating feedback:", error);
    return false;
  }
  return true;
}

export async function deleteFeedback(id: string): Promise<boolean> {
  const { error } = await supabase.from("feedback").delete().eq("id", id);
  if (error) {
    console.error("Error deleting feedback:", error);
    return false;
  }
  return true;
}

// ============================================
// TRICOUNT / EXPENSES
// ============================================

export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*, paid_by_participant:participants!paid_by(*), splits:expense_splits(*, participant:participants(*))")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
  return data as Expense[];
}

export async function createExpense(
  paidBy: string,
  title: string,
  amount: number,
  category: ExpenseCategory,
  splitAmong: string[] // participant ids
): Promise<Expense | null> {
  // Create the expense
  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({ paid_by: paidBy, title: title.trim(), amount, category })
    .select()
    .single();

  if (expenseError) {
    console.error("Error creating expense:", expenseError);
    return null;
  }

  // Create equal splits
  const splitAmount = Math.floor(amount / splitAmong.length);
  const remainder = amount - splitAmount * splitAmong.length;

  const splits = splitAmong.map((participantId, index) => ({
    expense_id: expense.id,
    participant_id: participantId,
    amount: splitAmount + (index === 0 ? remainder : 0), // first person pays the remainder cent
  }));

  const { error: splitsError } = await supabase
    .from("expense_splits")
    .insert(splits);

  if (splitsError) {
    console.error("Error creating splits:", splitsError);
    // Cleanup expense
    await supabase.from("expenses").delete().eq("id", expense.id);
    return null;
  }

  // Trigger notifications
  try {
    const { data: payer } = await supabase.from("participants").select("name, pseudo").eq("id", paidBy).single();
    const payerName = payer ? (payer.pseudo || payer.name) : "Quelqu'un";
    triggerPushNotification(
      paidBy,
      "Dépense ajoutée 🍕",
      `${payerName} a ajouté une dépense : "${title}" (${amount}€)`,
      "/depenses"
    );
  } catch (e) {
    console.error("Error triggering expense push notification:", e);
  }

  return expense as Expense;
}

export async function updateExpense(
  expenseId: string,
  updates: { title?: string; amount?: number; category?: ExpenseCategory }
): Promise<boolean> {
  const { error } = await supabase
    .from("expenses")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", expenseId);

  if (error) {
    console.error("Error updating expense:", error);
    return false;
  }
  return true;
}

export async function deleteExpense(expenseId: string): Promise<boolean> {
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) {
    console.error("Error deleting expense:", error);
    return false;
  }
  return true;
}

export async function getSettlements(): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from("settlements")
    .select("*, from_participant_data:participants!from_participant(*), to_participant_data:participants!to_participant(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching settlements:", error);
    return [];
  }
  return data as Settlement[];
}

export async function createSettlement(
  fromParticipant: string,
  toParticipant: string,
  amount: number
): Promise<Settlement | null> {
  const { data, error } = await supabase
    .from("settlements")
    .insert({ from_participant: fromParticipant, to_participant: toParticipant, amount })
    .select()
    .single();

  if (error) {
    console.error("Error creating settlement:", error);
    return null;
  }
  return data as Settlement;
}

export async function confirmSettlement(settlementId: string): Promise<boolean> {
  const { error } = await supabase
    .from("settlements")
    .update({ is_confirmed: true, confirmed_at: new Date().toISOString() })
    .eq("id", settlementId);

  if (error) {
    console.error("Error confirming settlement:", error);
    return false;
  }
  return true;
}

export async function deleteSettlement(settlementId: string): Promise<boolean> {
  const { error } = await supabase.from("settlements").delete().eq("id", settlementId);
  if (error) {
    console.error("Error deleting settlement:", error);
    return false;
  }
  return true;
}

/**
 * Compute balances for all participants based on expenses and settlements.
 * Returns a map of participant_id -> net balance (positive = owed money, negative = owes money).
 */
export async function computeBalances(): Promise<ParticipantBalance[]> {
  const [expenses, settlements, participants] = await Promise.all([
    getExpenses(),
    getSettlements(),
    getParticipants(),
  ]);

  const balanceMap: Record<string, { paid: number; owes: number }> = {};

  // Initialize all participants
  for (const p of participants) {
    balanceMap[p.id] = { paid: 0, owes: 0 };
  }

  // Process expenses: payer gets credited for what others owe
  for (const expense of expenses) {
    if (!expense.splits) continue;
    const payerId = expense.paid_by;
    if (!balanceMap[payerId]) balanceMap[payerId] = { paid: 0, owes: 0 };

    for (const split of expense.splits) {
      if (split.participant_id === payerId) continue; // skip payer's own share
      if (!balanceMap[split.participant_id]) balanceMap[split.participant_id] = { paid: 0, owes: 0 };

      balanceMap[payerId].paid += split.amount; // payer is owed this
      balanceMap[split.participant_id].owes += split.amount; // participant owes this
    }
  }

  // Process confirmed settlements: reduce the debt
  for (const settlement of settlements) {
    if (!settlement.is_confirmed) continue;
    if (!balanceMap[settlement.from_participant]) balanceMap[settlement.from_participant] = { paid: 0, owes: 0 };
    if (!balanceMap[settlement.to_participant]) balanceMap[settlement.to_participant] = { paid: 0, owes: 0 };

    balanceMap[settlement.from_participant].owes -= settlement.amount;
    balanceMap[settlement.to_participant].paid -= settlement.amount;
  }

  // Build result
  return participants.map((p) => {
    const b = balanceMap[p.id] || { paid: 0, owes: 0 };
    return {
      participant_id: p.id,
      participant: p,
      total_paid: b.paid,
      total_owed: b.owes,
      net_balance: b.paid - b.owes, // positive = others owe them, negative = they owe others
    };
  });
}

/**
 * Compute the optimal settlements (who should pay whom to settle all debts).
 * Uses a greedy algorithm to minimize the number of transactions.
 */
export function computeOptimalSettlements(balances: ParticipantBalance[]): { from: string; to: string; amount: number }[] {
  // Separate into creditors (positive balance) and debtors (negative balance)
  const creditors = balances
    .filter((b) => b.net_balance > 0)
    .map((b) => ({ id: b.participant_id, amount: b.net_balance }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = balances
    .filter((b) => b.net_balance < 0)
    .map((b) => ({ id: b.participant_id, amount: Math.abs(b.net_balance) }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: { from: string; to: string; amount: number }[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const settleAmount = Math.min(creditors[i].amount, debtors[j].amount);
    if (settleAmount > 0) {
      settlements.push({
        from: debtors[j].id,
        to: creditors[i].id,
        amount: settleAmount,
      });
    }

    creditors[i].amount -= settleAmount;
    debtors[j].amount -= settleAmount;

    if (creditors[i].amount <= 0) i++;
    if (debtors[j].amount <= 0) j++;
  }

  return settlements;
}

// ============================================
// BOT DOSSIERS & ANECDOTES
// ============================================

export async function getBotDossiers(): Promise<BotDossier[]> {
  const { data, error } = await supabase
    .from("bot_dossiers")
    .select("*, target:participants!target_participant_id(*), author:participants!author_participant_id(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching bot dossiers:", error);
    return [];
  }
  return data as BotDossier[];
}

export async function createBotDossier(
  targetParticipantId: string,
  authorParticipantId: string | null,
  content: string,
  category: string = "anecdote",
  isAnonymous: boolean = false
): Promise<BotDossier | null> {
  const { data, error } = await supabase
    .from("bot_dossiers")
    .insert({
      target_participant_id: targetParticipantId,
      author_participant_id: authorParticipantId,
      content: content.trim(),
      category,
      is_anonymous: isAnonymous,
    })
    .select("*, target:participants!target_participant_id(*), author:participants!author_participant_id(*)")
    .single();

  if (error) {
    console.error("Error creating bot dossier:", error);
    return null;
  }

  // Trigger Push Notification to all participants
  try {
    const { data: targetPerson } = await supabase
      .from("participants")
      .select("name, pseudo")
      .eq("id", targetParticipantId)
      .single();

    const targetName = targetPerson?.pseudo || targetPerson?.name || "un participant";
    const authorName = isAnonymous ? "Un inconnu" : "Quelqu'un";
    triggerPushNotification(
      authorParticipantId || "anonymous",
      "💣 Nouveau dossier balancé !",
      `${authorName} vient de balancer un dossier sur ${targetName} ! Botardèche est déjà au courant... 🤖`,
      "/dossiers"
    );
  } catch (err) {
    console.error("Error sending push notification for bot dossier:", err);
  }

  return data as BotDossier;
}

export async function deleteBotDossier(id: string): Promise<boolean> {
  const { error } = await supabase.from("bot_dossiers").delete().eq("id", id);
  if (error) {
    console.error("Error deleting bot dossier:", error);
    return false;
  }
  return true;
}

export async function updateBotDossier(
  id: string,
  updates: { target_participant_id?: string; content?: string; category?: string; is_anonymous?: boolean }
): Promise<boolean> {
  const { error } = await supabase
    .from("bot_dossiers")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating bot dossier:", error);
    return false;
  }
  return true;
}

// ============================================
// APP SETTINGS & ADMIN CONTROLS
// ============================================

export async function getAppSetting<T>(key: string, defaultValue: T): Promise<T> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error || !data) {
    return defaultValue;
  }
  return data.value as T;
}

export async function saveAppSetting<T>(key: string, value: T): Promise<boolean> {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) {
    console.error(`Error saving app_setting [${key}]:`, error);
    return false;
  }
  return true;
}

export async function updateParticipantAdminStatus(id: string, isAdmin: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("participants")
    .update({ is_admin: isAdmin })
    .eq("id", id);

  if (error) {
    console.error("Error updating admin status:", error);
    return false;
  }
  return true;
}

export async function updateParticipantPasswordAdmin(id: string, newPassword: string): Promise<boolean> {
  const { error } = await supabase
    .from("participants")
    .update({ password: newPassword })
    .eq("id", id);

  if (error) {
    console.error("Error updating participant password by admin:", error);
    return false;
  }
  return true;
}

export async function updateParticipantArrivalStatus(id: string, arrivalStatus: string): Promise<boolean> {
  const { error } = await supabase
    .from("participants")
    .update({ arrival_status: arrivalStatus })
    .eq("id", id);

  if (error) {
    console.error("Error updating participant arrival status:", error);
    return false;
  }
  return true;
}

export async function updateParticipantProfile(id: string, updates: { name?: string; pseudo?: string; emoji_avatar?: string }): Promise<boolean> {
  const { error } = await supabase
    .from("participants")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Error updating participant profile by admin:", error);
    return false;
  }
  return true;
}

export async function togglePollCloseStatus(pollId: string, isClosed: boolean): Promise<boolean> {
  const { error } = await supabase
    .from("polls")
    .update({ is_closed: isClosed })
    .eq("id", pollId);

  if (error) {
    console.error("Error toggling poll closed status:", error);
    return false;
  }
  return true;
}

export async function triggerCustomPushNotification(
  targetParticipantId: string | "all" | "admins",
  title: string,
  body: string,
  url: string = "/"
): Promise<boolean> {
  try {
    const res = await fetch("/api/push-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: "admin",
        title,
        body,
        url,
        targetParticipantId,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Error sending custom push notification:", err);
    return false;
  }
}
