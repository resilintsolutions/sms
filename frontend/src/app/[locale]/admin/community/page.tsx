'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Plus,
  Heart,
  MessageCircle,
  Flag,
  Trophy,
  Settings,
  Send,
  Globe,
  School,
  Users,
  Search,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';

/* ══════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════ */

type Post = {
  id: number;
  type: string;
  title: string;
  title_bn: string | null;
  body: string | null;
  body_bn: string | null;
  tags: string[] | null;
  visibility_scope: string;
  status: string;
  moderation_status: string;
  published_at: string | null;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  author: { id: number; name: string; name_bn: string | null; avatar: string | null; role_name: string | null } | null;
  institution: { id: number; name: string; name_bn: string | null; logo: string | null } | null;
};

type Comment = {
  id: number;
  body: string;
  moderation_status: string;
  created_at: string;
  user: { id: number; name: string; name_bn: string | null; avatar: string | null } | null;
  institution: { id: number; name: string; name_bn: string | null } | null;
};

type Competition = {
  id: number;
  title: string;
  title_bn: string | null;
  description: string | null;
  category: string;
  status: string;
  event_start: string;
  event_end: string;
  registration_deadline: string | null;
  venue: string | null;
  visibility_scope: string;
  invitations_count: number;
  my_invitation_status: string | null;
  is_mine: boolean;
  institution: { id: number; name: string; name_bn: string | null; logo: string | null } | null;
  organiser: { id: number; name: string; name_bn: string | null } | null;
};

type CommunitySettings = {
  id: number;
  enable_community: boolean;
  who_can_post: string;
  allow_cross_school_comments: boolean;
  moderation_level: string;
};

type PaginatedRes<T> = { data: T[]; current_page: number; last_page: number; total: number };

function unwrap<T>(res: unknown): T[] {
  const d = (res as { data?: T[] | { data?: T[] } })?.data;
  return Array.isArray(d) ? d : (d as { data?: T[] })?.data ?? [];
}

/* ══════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════ */

type Tab = 'feed' | 'competitions' | 'settings';

export default function CommunityPage() {
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const [tab, setTab] = useState<Tab>('feed');

  const tabs: { key: Tab; label: string; icon: typeof Heart }[] = [
    { key: 'feed', label: 'Community Feed', icon: Globe },
    { key: 'competitions', label: 'Competitions', icon: Trophy },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">{tNav('community')}</h2>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              tab === key
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'feed' && <FeedTab />}
      {tab === 'competitions' && <CompetitionsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

/* ══════════════════════════════════════════
   FEED TAB
   ══════════════════════════════════════════ */

function FeedTab() {
  const t = useTranslations('common');
  const qc = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expandedComments, setExpandedComments] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (searchQ) p.set('q', searchQ);
    if (typeFilter) p.set('type', typeFilter);
    p.set('per_page', '20');
    return p.toString();
  }, [searchQ, typeFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['community-feed', params],
    queryFn: () => api<PaginatedRes<Post>>(`/community/feed?${params}`),
  });
  const posts = unwrap<Post>(data?.data ?? data);

  const likeMut = useMutation({
    mutationFn: (postId: number) => api(`/community/posts/${postId}/like`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-feed'] }),
  });

  const unlikeMut = useMutation({
    mutationFn: (postId: number) => api(`/community/posts/${postId}/like`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-feed'] }),
  });

  const commentMut = useMutation({
    mutationFn: ({ postId, body }: { postId: number; body: string }) =>
      api(`/community/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['community-feed'] });
      qc.invalidateQueries({ queryKey: ['post-comments', vars.postId] });
      setCommentText('');
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  const reportMut = useMutation({
    mutationFn: (data: { reportable_type: string; reportable_id: number; reason: string }) =>
      api('/community/reports', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => toast.success('Report submitted'),
    onError: () => toast.error('Failed to submit report'),
  });

  const toggleLike = (post: Post) => {
    if (post.is_liked) unlikeMut.mutate(post.id);
    else likeMut.mutate(post.id);
  };

  const typeOptions = ['', 'ANNOUNCEMENT', 'COMPETITION', 'SPORTS', 'KNOWLEDGE', 'RESOURCE'];

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input"
        >
          <option value="">All Types</option>
          {typeOptions.filter(Boolean).map((o) => (
            <option key={o} value={o}>{o.charAt(0) + o.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <button type="button" onClick={() => setComposerOpen(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Post
        </button>
      </div>

      {/* Posts */}
      {isLoading ? (
        <p className="text-slate-500">{t('loading')}</p>
      ) : posts.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <Globe className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-lg font-medium">No posts yet</p>
          <p className="text-sm">Be the first to share something with the community!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={() => toggleLike(post)}
              onComment={() => setExpandedComments(expandedComments === post.id ? null : post.id)}
              onReport={(reason) => reportMut.mutate({ reportable_type: 'post', reportable_id: post.id, reason })}
              expanded={expandedComments === post.id}
              commentText={commentText}
              onCommentChange={setCommentText}
              onSubmitComment={() => {
                if (commentText.trim()) commentMut.mutate({ postId: post.id, body: commentText });
              }}
              isSubmittingComment={commentMut.isPending}
            />
          ))}
        </div>
      )}

      {/* Composer modal */}
      {composerOpen && (
        <PostComposer
          onClose={() => setComposerOpen(false)}
          onCreated={() => {
            setComposerOpen(false);
            qc.invalidateQueries({ queryKey: ['community-feed'] });
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   POST CARD
   ══════════════════════════════════════════ */

function PostCard({
  post,
  onLike,
  onComment,
  onReport,
  expanded,
  commentText,
  onCommentChange,
  onSubmitComment,
  isSubmittingComment,
}: {
  post: Post;
  onLike: () => void;
  onComment: () => void;
  onReport: (reason: string) => void;
  expanded: boolean;
  commentText: string;
  onCommentChange: (v: string) => void;
  onSubmitComment: () => void;
  isSubmittingComment: boolean;
}) {
  const [showReport, setShowReport] = useState(false);

  const typeColors: Record<string, string> = {
    ANNOUNCEMENT: 'bg-blue-100 text-blue-700',
    COMPETITION: 'bg-purple-100 text-purple-700',
    SPORTS: 'bg-green-100 text-green-700',
    KNOWLEDGE: 'bg-amber-100 text-amber-700',
    RESOURCE: 'bg-indigo-100 text-indigo-700',
  };

  const scopeIcons: Record<string, typeof Globe> = {
    GLOBAL_ALL_SCHOOLS: Globe,
    INVITED_SCHOOLS_ONLY: Users,
    SAME_SCHOOL_ONLY: School,
  };
  const ScopeIcon = scopeIcons[post.visibility_scope] ?? Globe;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-sm shrink-0">
          {post.author?.name?.charAt(0) ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-sm">{post.author?.name_bn ?? post.author?.name ?? 'Unknown'}</span>
            {post.author?.role_name && (
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 capitalize">
                {post.author.role_name.replace('_', ' ')}
              </span>
            )}
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">{post.institution?.name_bn ?? post.institution?.name ?? ''}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeColors[post.type] ?? 'bg-slate-100 text-slate-600'}`}>
              {post.type}
            </span>
            <ScopeIcon className="h-3 w-3 text-slate-400" />
            {post.moderation_status === 'FLAGGED' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
                <AlertTriangle className="h-3 w-3" /> Flagged
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Draft'}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-2">
        <h3 className="font-semibold text-slate-800">{post.title_bn ?? post.title}</h3>
        {(post.body_bn ?? post.body) && (
          <p className="mt-1 text-sm text-slate-600 line-clamp-3" dangerouslySetInnerHTML={{ __html: post.body_bn ?? post.body ?? '' }} />
        )}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {post.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2">
        <button type="button" onClick={onLike} className={`flex items-center gap-1.5 text-sm transition-colors ${post.is_liked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}>
          <Heart className={`h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
          {post.likes_count}
        </button>
        <button type="button" onClick={onComment} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 transition-colors">
          <MessageCircle className="h-4 w-4" />
          {post.comments_count}
        </button>
        <div className="relative ml-auto">
          <button type="button" onClick={() => setShowReport(!showReport)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors">
            <Flag className="h-4 w-4" />
          </button>
          {showReport && (
            <div className="absolute right-0 top-8 z-10 w-48 rounded-lg bg-white shadow-lg border border-slate-200 py-1">
              {['SPAM', 'INAPPROPRIATE', 'HARASSMENT', 'MISINFORMATION'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { onReport(r); setShowReport(false); }}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Comments */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4">
          <CommentsSection postId={post.id} />
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => onCommentChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmitComment(); } }}
              className="input flex-1 text-sm"
            />
            <button
              type="button"
              onClick={onSubmitComment}
              disabled={isSubmittingComment || !commentText.trim()}
              className="btn btn-primary px-3"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   COMMENTS SECTION
   ══════════════════════════════════════════ */

function CommentsSection({ postId }: { postId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: () => api<PaginatedRes<Comment>>(`/community/posts/${postId}/comments?per_page=10`),
  });
  const comments = unwrap<Comment>(data?.data ?? data);

  if (isLoading) return <p className="text-sm text-slate-400">Loading comments...</p>;
  if (comments.length === 0) return <p className="text-sm text-slate-400">No comments yet</p>;

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold shrink-0">
            {c.user?.name?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">{c.user?.name_bn ?? c.user?.name ?? 'Unknown'}</span>
              <span className="text-[10px] text-slate-400">{c.institution?.name_bn ?? c.institution?.name ?? ''}</span>
            </div>
            <p className="text-sm text-slate-600">{c.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   POST COMPOSER MODAL
   ══════════════════════════════════════════ */

function PostComposer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const t = useTranslations('common');
  const [form, setForm] = useState({
    type: 'ANNOUNCEMENT',
    title: '',
    title_bn: '',
    body: '',
    body_bn: '',
    tags: '',
    visibility_scope: 'GLOBAL_ALL_SCHOOLS',
    status: 'PUBLISHED',
  });

  const createMut = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };
      return api('/community/posts', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: (res) => {
      if (res.success) { toast.success('Post created'); onCreated(); }
      else toast.error(res.message ?? 'Failed to create post');
    },
    onError: () => toast.error('Failed to create post'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Create Post</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="input w-full">
                <option value="ANNOUNCEMENT">Announcement</option>
                <option value="COMPETITION">Competition</option>
                <option value="SPORTS">Sports</option>
                <option value="KNOWLEDGE">Knowledge</option>
                <option value="RESOURCE">Resource</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Visibility</label>
              <select value={form.visibility_scope} onChange={(e) => setForm((f) => ({ ...f, visibility_scope: e.target.value }))} className="input w-full">
                <option value="GLOBAL_ALL_SCHOOLS">Global (All Schools)</option>
                <option value="INVITED_SCHOOLS_ONLY">Invited Schools Only</option>
                <option value="SAME_SCHOOL_ONLY">Same School Only</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title (বাংলা)</label>
            <input type="text" value={form.title_bn} onChange={(e) => setForm((f) => ({ ...f, title_bn: e.target.value }))} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Body</label>
            <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className="input w-full min-h-[100px]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Body (বাংলা)</label>
            <textarea value={form.body_bn} onChange={(e) => setForm((f) => ({ ...f, body_bn: e.target.value }))} className="input w-full min-h-[80px]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma separated)</label>
            <input type="text" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className="input w-full" placeholder="e.g. sports, debate, science" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="input w-full">
              <option value="PUBLISHED">Publish Now</option>
              <option value="DRAFT">Save as Draft</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn">{t('cancel')}</button>
          <button
            type="button"
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !form.title}
            className="btn btn-primary"
          >
            {createMut.isPending ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   COMPETITIONS TAB
   ══════════════════════════════════════════ */

function CompetitionsTab() {
  const t = useTranslations('common');
  const qc = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [catFilter, setCatFilter] = useState('');

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (catFilter) p.set('category', catFilter);
    p.set('per_page', '20');
    return p.toString();
  }, [catFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['community-competitions', params],
    queryFn: () => api<PaginatedRes<Competition>>(`/community/competitions?${params}`),
  });
  const competitions = unwrap<Competition>(data?.data ?? data);

  const respondMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/community/competitions/${id}/respond`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-competitions'] });
      toast.success('Response updated');
    },
    onError: () => toast.error('Failed to respond'),
  });

  const statusColors: Record<string, string> = {
    UPCOMING: 'bg-blue-100 text-blue-700',
    ONGOING: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-slate-100 text-slate-600',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  const catColors: Record<string, string> = {
    SPORTS: 'bg-green-100 text-green-700',
    ACADEMIC: 'bg-blue-100 text-blue-700',
    CULTURAL: 'bg-purple-100 text-purple-700',
    OTHER: 'bg-slate-100 text-slate-600',
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="input">
          <option value="">All Categories</option>
          <option value="SPORTS">Sports</option>
          <option value="ACADEMIC">Academic</option>
          <option value="CULTURAL">Cultural</option>
          <option value="OTHER">Other</option>
        </select>
        <button type="button" onClick={() => setComposerOpen(true)} className="btn btn-primary flex items-center gap-2 ml-auto">
          <Plus className="h-4 w-4" /> Create Competition
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate-500">{t('loading')}</p>
      ) : competitions.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          <Trophy className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-lg font-medium">No competitions yet</p>
          <p className="text-sm">Create a competition to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {competitions.map((comp) => (
            <div key={comp.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800">{comp.title_bn ?? comp.title}</h4>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {comp.institution?.name_bn ?? comp.institution?.name ?? ''}
                    {comp.organiser && ` • ${comp.organiser.name_bn ?? comp.organiser.name}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[comp.status] ?? ''}`}>
                    {comp.status}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${catColors[comp.category] ?? ''}`}>
                    {comp.category}
                  </span>
                </div>
              </div>

              {comp.description && (
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{comp.description}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(comp.event_start).toLocaleDateString()} — {new Date(comp.event_end).toLocaleDateString()}
                </span>
                {comp.venue && <span>📍 {comp.venue}</span>}
                <span>{comp.invitations_count} invited</span>
              </div>

              {/* Invitation response buttons */}
              {comp.my_invitation_status === 'PENDING' && !comp.is_mine && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => respondMut.mutate({ id: comp.id, status: 'ACCEPTED' })}
                    className="btn btn-primary text-xs flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" /> Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => respondMut.mutate({ id: comp.id, status: 'DECLINED' })}
                    className="btn text-xs flex items-center gap-1 text-red-600"
                  >
                    <X className="h-3 w-3" /> Decline
                  </button>
                </div>
              )}
              {comp.my_invitation_status === 'ACCEPTED' && (
                <p className="mt-2 text-xs font-medium text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Accepted
                </p>
              )}
              {comp.my_invitation_status === 'DECLINED' && (
                <p className="mt-2 text-xs font-medium text-red-500 flex items-center gap-1">
                  <X className="h-3 w-3" /> Declined
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {composerOpen && (
        <CompetitionComposer
          onClose={() => setComposerOpen(false)}
          onCreated={() => {
            setComposerOpen(false);
            qc.invalidateQueries({ queryKey: ['community-competitions'] });
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   COMPETITION COMPOSER MODAL
   ══════════════════════════════════════════ */

function CompetitionComposer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const t = useTranslations('common');
  const [form, setForm] = useState({
    title: '',
    title_bn: '',
    description: '',
    category: 'SPORTS',
    event_start: '',
    event_end: '',
    reg_deadline: '',
    venue: '',
    visibility_scope: 'GLOBAL_ALL_SCHOOLS',
  });

  const createMut = useMutation({
    mutationFn: () => api('/community/competitions', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: (res) => {
      if (res.success) { toast.success('Competition created'); onCreated(); }
      else toast.error(res.message ?? 'Failed');
    },
    onError: () => toast.error('Failed to create competition'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Create Competition</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title (বাংলা)</label>
            <input type="text" value={form.title_bn} onChange={(e) => setForm((f) => ({ ...f, title_bn: e.target.value }))} className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input w-full min-h-[80px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input w-full">
                <option value="SPORTS">Sports</option>
                <option value="ACADEMIC">Academic</option>
                <option value="CULTURAL">Cultural</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Visibility</label>
              <select value={form.visibility_scope} onChange={(e) => setForm((f) => ({ ...f, visibility_scope: e.target.value }))} className="input w-full">
                <option value="GLOBAL_ALL_SCHOOLS">Global (All Schools)</option>
                <option value="INVITED_SCHOOLS_ONLY">Invited Schools Only</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input type="date" value={form.event_start} onChange={(e) => setForm((f) => ({ ...f, event_start: e.target.value }))} className="input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input type="date" value={form.event_end} onChange={(e) => setForm((f) => ({ ...f, event_end: e.target.value }))} className="input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reg. Deadline</label>
              <input type="date" value={form.reg_deadline} onChange={(e) => setForm((f) => ({ ...f, reg_deadline: e.target.value }))} className="input w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Venue</label>
            <input type="text" value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} className="input w-full" />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn">{t('cancel')}</button>
          <button
            type="button"
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !form.title || !form.event_start || !form.event_end}
            className="btn btn-primary"
          >
            {createMut.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SETTINGS TAB
   ══════════════════════════════════════════ */

function SettingsTab() {
  const t = useTranslations('common');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['community-settings'],
    queryFn: () => api<CommunitySettings>('/community/settings'),
  });

  const settings: CommunitySettings | null = (data?.data as unknown as CommunitySettings) ?? null;

  const updateMut = useMutation({
    mutationFn: (payload: Partial<CommunitySettings>) =>
      api('/community/settings', { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-settings'] });
      toast.success('Settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  if (isLoading) return <p className="text-slate-500">{t('loading')}</p>;
  if (!settings) return <p className="text-slate-500">Unable to load settings</p>;

  return (
    <div className="card max-w-xl p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Community Settings</h3>

      <div className="space-y-4">
        {/* Enable community */}
        <label className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-700">Enable Community</p>
            <p className="text-sm text-slate-500">Allow your school to participate in the inter-school community</p>
          </div>
          <input
            type="checkbox"
            checked={settings.enable_community}
            onChange={(e) => updateMut.mutate({ enable_community: e.target.checked })}
            className="rounded h-5 w-5"
          />
        </label>

        {/* Who can post */}
        <div>
          <label className="block font-medium text-slate-700 mb-1">Who Can Post</label>
          <p className="text-sm text-slate-500 mb-2">Control which users can create community posts</p>
          <select
            value={settings.who_can_post}
            onChange={(e) => updateMut.mutate({ who_can_post: e.target.value })}
            className="input w-full"
          >
            <option value="SCHOOL_ADMIN_ONLY">School Admin Only</option>
            <option value="TEACHERS_ONLY">Teachers &amp; Admins</option>
            <option value="ALL_VERIFIED_USERS">All Verified Users</option>
          </select>
        </div>

        {/* Cross-school comments */}
        <label className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-700">Allow Cross-School Comments</p>
            <p className="text-sm text-slate-500">Let users from other schools comment on your posts</p>
          </div>
          <input
            type="checkbox"
            checked={settings.allow_cross_school_comments}
            onChange={(e) => updateMut.mutate({ allow_cross_school_comments: e.target.checked })}
            className="rounded h-5 w-5"
          />
        </label>

        {/* Moderation level */}
        <div>
          <label className="block font-medium text-slate-700 mb-1">Moderation Level</label>
          <p className="text-sm text-slate-500 mb-2">How flagged content is handled</p>
          <select
            value={settings.moderation_level}
            onChange={(e) => updateMut.mutate({ moderation_level: e.target.value })}
            className="input w-full"
          >
            <option value="AUTO_FLAG">Auto Flag (review manually)</option>
            <option value="MANUAL_REVIEW">Manual Review (all posts)</option>
            <option value="AUTO_REMOVE">Auto Remove (flagged content)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
