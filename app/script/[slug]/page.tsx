'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScriptHubCard, HubScript } from '@/components/script-hub-card';
import { SiteHeader } from '@/components/site-header';
import { timeAgo, formatCount } from '@/lib/utils';
import {
  Key, Copy, CheckCircle, Download, ThumbsUp, ThumbsDown, Star,
  AlertTriangle, Eye, Clock, Gamepad2, Loader2, User, MessageSquare, ArrowLeft,
} from 'lucide-react';

interface Reactions {
  likes: number;
  dislikes: number;
  favorites: number;
  me: { like: boolean; dislike: boolean; favorite: boolean };
}
interface ScriptDetail extends HubScript {
  description: string;
  updated_at: string;
  loadstring: string;
  reactions: Reactions;
}
interface Comment {
  id: string;
  username: string;
  body: string;
  created_at: string;
}

function getAnonId() {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('ah_anon');
  if (!id) {
    id = (crypto.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '');
    localStorage.setItem('ah_anon', id);
  }
  return id;
}

export default function ScriptDetailPage({ params }: { params: { slug: string } }) {
  const [script, setScript] = useState<ScriptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showGames, setShowGames] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [others, setOthers] = useState<HubScript[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('ah_session') : null);

  const authHeaders = useCallback((json = false): Record<string, string> => {
    const h: Record<string, string> = {};
    if (json) h['Content-Type'] = 'application/json';
    const t = token();
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  }, []);

  useEffect(() => {
    setLoggedIn(!!token());
    const anon = getAnonId();
    fetch(`/api/scripts/public/${encodeURIComponent(params.slug)}?anon=${anon}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: ScriptDetail) => {
        setScript(data);
        // Load comments + related scripts once we know the script id.
        fetch(`/api/scripts/${data.id}/comments`)
          .then((r) => (r.ok ? r.json() : []))
          .then((list: Comment[]) => setComments(list));
        fetch(`/api/scripts/catalog?game=${encodeURIComponent(data.game)}&limit=8`)
          .then((r) => (r.ok ? r.json() : []))
          .then((list: HubScript[]) => setOthers(list.filter((s) => s.id !== data.id).slice(0, 8)));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.slug, authHeaders]);

  const react = async (kind: 'like' | 'dislike' | 'favorite') => {
    if (!script) return;
    const res = await fetch(`/api/scripts/${script.id}/react`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ kind, anon: getAnonId() }),
    });
    if (res.ok) setScript({ ...script, reactions: await res.json() });
  };

  const copyLoadstring = () => {
    if (!script) return;
    navigator.clipboard.writeText(script.loadstring);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadScript = () => {
    if (!script) return;
    const blob = new Blob([script.loadstring], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.slug}.lua`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const report = async () => {
    if (!script) return;
    if (!loggedIn) return alert('Please log in to report this script.');
    const reason = prompt('Why are you reporting this script?');
    if (!reason) return;
    const res = await fetch(`/api/scripts/${script.id}/report`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ reason }),
    });
    alert(res.ok ? 'Report submitted. Thank you!' : 'Could not submit report.');
  };

  const postComment = async () => {
    if (!script || !commentBody.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/scripts/${script.id}/comments`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ body: commentBody.trim() }),
    });
    if (res.ok) {
      const c = await res.json();
      setComments((prev) => [c, ...prev]);
      setCommentBody('');
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'Failed to post comment.');
    }
    setPosting(false);
  };

  const gradient = 'from-red-900/60 via-zinc-900 to-black';
  const longDesc = (script?.description?.length ?? 0) > 220;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to catalog
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        ) : notFound || !script ? (
          <Card className="bg-card border-border">
            <CardContent className="py-24 text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">Script not found</h1>
              <p className="text-muted-foreground mb-6">This script may have been removed or unpublished.</p>
              <Link href="/"><Button className="bg-red-600 hover:bg-red-700 text-white">Browse scripts</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top: preview + info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Preview */}
              <Card className="bg-card border-border overflow-hidden">
                <div className={`relative aspect-video w-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <span className="px-6 text-center text-2xl font-extrabold uppercase tracking-wide text-white/85 line-clamp-3 drop-shadow">
                    {script.name}
                  </span>
                  <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur">
                    <Eye className="h-3.5 w-3.5" /> {formatCount(script.view_count ?? 0)} Views
                  </div>
                  {script.is_protected && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-xs font-semibold text-black">
                      <Key className="h-3 w-3" /> Key System
                    </div>
                  )}
                </div>
              </Card>

              {/* Info */}
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <h1 className="text-3xl font-bold text-foreground">{script.name}</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">Script hub</p>

                  <p className="text-red-400 font-semibold mt-4 mb-1">Uploaded by</p>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-foreground font-medium">{script.owner_username}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2">
                    <Clock className="h-3.5 w-3.5" /> {timeAgo(script.created_at)}
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex flex-col gap-2">
                    <Button onClick={copyLoadstring} className="w-full bg-red-600 hover:bg-red-700 text-white h-11">
                      {copied ? <><CheckCircle className="mr-2 h-4 w-4" /> Copied!</> : <><Copy className="mr-2 h-4 w-4" /> Copy Loadstring</>}
                    </Button>
                    <Link href={`/get-key?scriptId=${script.id}`}>
                      <Button variant="outline" className="w-full border-red-900/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-11">
                        <Key className="mr-2 h-4 w-4" /> Get Key
                      </Button>
                    </Link>
                  </div>

                  {/* Reactions */}
                  <div className="mt-5 flex items-center gap-1 border-t border-border pt-4">
                    <ReactionButton
                      active={script.reactions.me.like}
                      onClick={() => react('like')}
                      icon={<ThumbsUp className="h-4 w-4" />}
                      count={script.reactions.likes}
                      activeClass="text-emerald-400"
                    />
                    <ReactionButton
                      active={script.reactions.me.dislike}
                      onClick={() => react('dislike')}
                      icon={<ThumbsDown className="h-4 w-4" />}
                      count={script.reactions.dislikes}
                      activeClass="text-red-400"
                    />
                    <ReactionButton
                      active={script.reactions.me.favorite}
                      onClick={() => react('favorite')}
                      icon={<Star className={`h-4 w-4 ${script.reactions.me.favorite ? 'fill-amber-400' : ''}`} />}
                      count={script.reactions.favorites}
                      label="Favorite"
                      activeClass="text-amber-400"
                    />
                    <button
                      onClick={report}
                      className="ml-auto flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <AlertTriangle className="h-4 w-4" /> Report
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            <Card className="bg-card border-border mt-5">
              <CardContent className="p-5">
                <h2 className="text-xl font-bold text-foreground mb-3">Description</h2>
                {script.description ? (
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {longDesc && !showFullDesc ? `${script.description.slice(0, 220)}…` : script.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No description provided.</p>
                )}
                <div className="flex flex-wrap gap-2 mt-4">
                  {longDesc && (
                    <Button variant="outline" size="sm" className="border-border text-muted-foreground" onClick={() => setShowFullDesc((v) => !v)}>
                      {showFullDesc ? 'Show less' : 'Show more'}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="border-border text-muted-foreground" onClick={() => setShowGames((v) => !v)}>
                    {showGames ? 'Hide supported games' : 'Show supported games'}
                  </Button>
                </div>
                {showGames && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {script.games?.map((g) => (
                      <Badge key={g} variant="secondary" className="bg-secondary text-muted-foreground gap-1">
                        <Gamepad2 className="h-3 w-3" /> {g}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* View Raw */}
            <Card className="bg-card border-border mt-5">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-foreground">View Raw</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-border text-muted-foreground" onClick={copyLoadstring}>
                      <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Script
                    </Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={downloadScript}>
                      <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                    </Button>
                  </div>
                </div>
                <pre className="bg-secondary border border-border rounded-lg p-4 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                  {script.loadstring}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">Replace <span className="font-mono text-foreground">YOUR_KEY_HERE</span> with a valid key from the Get Key page.</p>
              </CardContent>
            </Card>

            {/* Comments */}
            <Card className="bg-card border-border mt-5">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="h-5 w-5 text-red-400" />
                  <h2 className="text-xl font-bold text-foreground">Comments</h2>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-0">{comments.length}</Badge>
                </div>

                {loggedIn ? (
                  <div className="mb-5">
                    <Textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Add a comment…"
                      rows={3}
                      className="bg-secondary border-border resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <Button onClick={postComment} disabled={posting || !commentBody.trim()} className="bg-red-600 hover:bg-red-700 text-white">
                        {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post comment'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-5">
                    Please <Link href="/login" className="text-red-400 hover:underline">log in</Link> to add a comment.
                  </p>
                )}

                {comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No comments yet.</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((c) => (
                      <div key={c.id} className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{c.username}</span>
                            <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                          </div>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{c.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Other scripts */}
            {others.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-foreground mb-4">Other Scripts</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {others.map((s) => (
                    <ScriptHubCard key={s.id} script={s} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReactionButton({
  active, onClick, icon, count, label, activeClass,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  count: number;
  label?: string;
  activeClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary ${active ? activeClass : 'text-muted-foreground'}`}
    >
      {icon}
      <span>{label ? label : count}</span>
      {label && <span className="text-xs">{count}</span>}
    </button>
  );
}
