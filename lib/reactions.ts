export type ReactionKind = 'like' | 'dislike' | 'favorite';

export interface ReactionState {
  likes: number;
  dislikes: number;
  favorites: number;
  me: { like: boolean; dislike: boolean; favorite: boolean };
}

/** Build the identity string stored on a reaction row. */
export function reactionIdentity(userId: string | null, anonId: string | null): string | null {
  if (userId) return `u:${userId}`;
  if (anonId) return `a:${anonId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)}`;
  return null;
}

/** Tally all reactions for a script and flag which ones belong to `identity`. */
export async function fetchReactionState(
  supabase: any,
  scriptId: string,
  identity: string | null
): Promise<ReactionState> {
  const { data } = await supabase
    .from('script_reactions')
    .select('kind, identity')
    .eq('script_id', scriptId);

  const state: ReactionState = {
    likes: 0,
    dislikes: 0,
    favorites: 0,
    me: { like: false, dislike: false, favorite: false },
  };

  for (const row of data || []) {
    if (row.kind === 'like') state.likes++;
    else if (row.kind === 'dislike') state.dislikes++;
    else if (row.kind === 'favorite') state.favorites++;
    if (identity && row.identity === identity) {
      state.me[row.kind as ReactionKind] = true;
    }
  }
  return state;
}
