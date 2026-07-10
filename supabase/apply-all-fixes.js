const fs = require('fs');

// 1. Fix types.ts
let types = fs.readFileSync('src/lib/types.ts', 'utf8');
if (!types.includes('voter_ids')) {
  types = types.replace(
    '  vote_count: number;\r\n  status:',
    '  vote_count: number;\r\n  voter_ids?: string[];\r\n  status:'
  );
  if (!types.includes('voter_ids')) {
    types = types.replace(
      '  vote_count: number;\n  status:',
      '  vote_count: number;\n  voter_ids?: string[];\n  status:'
    );
  }
}
if (!types.includes('comment_count')) {
  types = types.replace(
    '  caption: string | null;\r\n  created_at: string;\r\n  // Joined\r\n  author?: Participant;\r\n}',
    '  caption: string | null;\r\n  comment_count?: number;\r\n  created_at: string;\r\n  // Joined\r\n  author?: Participant;\r\n}'
  );
  if (!types.includes('comment_count')) {
    types = types.replace(
      '  caption: string | null;\n  created_at: string;\n  // Joined\n  author?: Participant;\n}',
      '  caption: string | null;\n  comment_count?: number;\n  created_at: string;\n  // Joined\n  author?: Participant;\n}'
    );
  }
}
fs.writeFileSync('src/lib/types.ts', types, 'utf8');
console.log('types.ts: voter_ids=' + types.includes('voter_ids') + ' comment_count=' + types.includes('comment_count'));

// 2. Fix supabase-queries.ts
let queries = fs.readFileSync('src/lib/supabase-queries.ts', 'utf8');

// Add updateProposalComment
if (!queries.includes('updateProposalComment')) {
  const marker = 'export async function deleteProposalComment';
  const idx = queries.indexOf(marker);
  // Find end of that function
  let braceCount = 0;
  let i = queries.indexOf('{', idx);
  let started = false;
  for (; i < queries.length; i++) {
    if (queries[i] === '{') { braceCount++; started = true; }
    if (queries[i] === '}') braceCount--;
    if (started && braceCount === 0) break;
  }
  const insertAt = i + 1;
  const newFunc = `

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
}`;
  queries = queries.slice(0, insertAt) + newFunc + queries.slice(insertAt);
  console.log('Added updateProposalComment');
}

// Add getProposalVoters
if (!queries.includes('getProposalVoters')) {
  const marker2 = 'export async function approveProposal';
  const idx2 = queries.indexOf(marker2);
  const newFunc2 = `export async function getProposalVoters(proposalId: string): Promise<{ id: string; pseudo: string | null; name: string; emoji_avatar: string | null }[]> {
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

`;
  queries = queries.slice(0, idx2) + newFunc2 + queries.slice(idx2);
  console.log('Added getProposalVoters');
}

// Update getProgramProposals to include voter_ids
if (!queries.includes('votes:program_proposal_votes')) {
  queries = queries.replace(
    '.select("*, proposer:participants(*)")',
    '.select("*, proposer:participants(*), votes:program_proposal_votes(participant_id)")'
  );
  // Add voter_ids mapping
  queries = queries.replace(
    '  return data as ProgramProposal[];\n}',
    `  // Map votes to voter_ids array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((p: any) => {
    const voter_ids = (p.votes || []).map((v: { participant_id: string }) => v.participant_id);
    delete p.votes;
    return { ...p, voter_ids };
  }) as ProgramProposal[];\n}`
  );
  console.log('Updated getProgramProposals with voter_ids');
}

fs.writeFileSync('src/lib/supabase-queries.ts', queries, 'utf8');
console.log('supabase-queries.ts saved');
