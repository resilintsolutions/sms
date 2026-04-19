<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CommunityPost;
use App\Models\CommunityPostComment;
use App\Models\CommunityPostLike;
use App\Models\CommunityReport;
use App\Models\CommunitySetting;
use App\Services\CommunityAuditService;
use App\Services\ProfanityFilterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommunityPostController extends Controller
{
    public function __construct(
        private ProfanityFilterService $profanity,
        private CommunityAuditService $audit,
    ) {}

    /* ════════════════════════════════════════════
       FEED — GET /community/feed
       ════════════════════════════════════════════ */

    public function feed(Request $request): JsonResponse
    {
        $user = $request->user();
        $institutionId = $user->institution_id;
        $isSuperAdmin = $user->hasRole('super_admin');

        // If not super_admin, viewer's school must have community enabled
        if (! $isSuperAdmin) {
            $settings = CommunitySetting::where('institution_id', $institutionId)->first();
            if (! $settings || ! $settings->enable_community) {
                return response()->json([
                    'success' => false,
                    'message' => 'Community is not enabled for your school.',
                ], 403);
            }
        }

        $query = CommunityPost::with(['author:id,name,name_bn,avatar', 'author.roles:id,name', 'institution:id,name,name_bn,logo'])
            ->withCount(['likes', 'comments'])
            ->published();

        // Super Admin sees everything; others get visibility-scoped results
        if (! $isSuperAdmin) {
            $query->visibleTo($institutionId);
        }

        // Filters
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('school_id')) {
            $query->where('institution_id', $request->school_id);
        }
        if ($request->filled('tags')) {
            $tags = is_array($request->tags) ? $request->tags : explode(',', $request->tags);
            foreach ($tags as $tag) {
                $query->whereJsonContains('tags', trim($tag));
            }
        }
        if ($request->filled('q')) {
            $search = $request->q;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                  ->orWhere('body', 'LIKE', "%{$search}%");
            });
        }
        if ($request->filled('from')) {
            $query->where('published_at', '>=', $request->from);
        }
        if ($request->filled('to')) {
            $query->where('published_at', '<=', $request->to);
        }

        $posts = $query->latest('published_at')
                       ->paginate($request->get('per_page', 15));

        // Append whether current user liked each post
        $likedPostIds = CommunityPostLike::where('user_id', $user->id)
            ->whereIn('community_post_id', $posts->pluck('id'))
            ->pluck('community_post_id')
            ->toArray();

        $posts->getCollection()->transform(function ($post) use ($likedPostIds) {
            $post->is_liked = in_array($post->id, $likedPostIds);
            $this->appendAuthorRole($post);
            return $post;
        });

        return response()->json(['success' => true, 'data' => $posts]);
    }

    /* ════════════════════════════════════════════
       CREATE — POST /community/posts
       ════════════════════════════════════════════ */

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $institutionId = $user->institution_id;

        // Check community enabled + posting permission
        $permError = $this->checkPostingPermission($user);
        if ($permError) return $permError;

        $request->validate([
            'type'              => 'required|string|in:ANNOUNCEMENT,COMPETITION,SPORTS,KNOWLEDGE,RESOURCE',
            'title'             => 'required|string|max:500',
            'title_bn'          => 'nullable|string|max:500',
            'body'              => 'nullable|string|max:10000',
            'body_bn'           => 'nullable|string|max:10000',
            'tags'              => 'nullable|array|max:10',
            'tags.*'            => 'string|max:50',
            'visibility_scope'  => 'required|in:GLOBAL_ALL_SCHOOLS,INVITED_SCHOOLS_ONLY,SAME_SCHOOL_ONLY',
            'allowed_school_ids'=> 'nullable|array',
            'allowed_school_ids.*' => 'integer|exists:institutions,id',
            'status'            => 'nullable|in:DRAFT,PUBLISHED',
        ]);

        $status = $request->input('status', 'DRAFT');

        // Sanitize body — strip script tags for XSS prevention
        $body = $request->input('body');
        if ($body) {
            $body = strip_tags($body, '<p><br><b><i><u><strong><em><ul><ol><li><a><h1><h2><h3><h4><blockquote><code><pre><img>');
        }
        $bodyBn = $request->input('body_bn');
        if ($bodyBn) {
            $bodyBn = strip_tags($bodyBn, '<p><br><b><i><u><strong><em><ul><ol><li><a><h1><h2><h3><h4><blockquote><code><pre><img>');
        }

        $moderationStatus = $this->profanity->moderationStatus(
            $request->input('title', ''),
            $body ?? '',
            $bodyBn ?? ''
        );

        $post = CommunityPost::create([
            'institution_id'    => $institutionId,
            'author_user_id'    => $user->id,
            'type'              => $request->type,
            'title'             => $request->title,
            'title_bn'          => $request->title_bn,
            'body'              => $body,
            'body_bn'           => $bodyBn,
            'tags'              => $request->tags,
            'visibility_scope'  => $request->visibility_scope,
            'allowed_school_ids'=> $request->allowed_school_ids,
            'status'            => $status,
            'moderation_status' => $moderationStatus,
            'published_at'      => $status === 'PUBLISHED' ? now() : null,
        ]);

        $this->audit->log('post.created', $user->id, $institutionId, $post);

        if ($status === 'PUBLISHED') {
            $this->audit->log('post.published', $user->id, $institutionId, $post);
        }

        $post->load('author:id,name,name_bn,avatar', 'author.roles:id,name', 'institution:id,name,name_bn');
        $this->appendAuthorRole($post);

        return response()->json(['success' => true, 'data' => $post], 201);
    }

    /* ════════════════════════════════════════════
       SHOW — GET /community/posts/{id}
       ════════════════════════════════════════════ */

    public function show(Request $request, int $id): JsonResponse
    {
        $post = CommunityPost::with([
            'author:id,name,name_bn,avatar',
            'author.roles:id,name',
            'institution:id,name,name_bn,logo',
            'attachments',
        ])
        ->withCount(['likes', 'comments'])
        ->findOrFail($id);

        // Visibility check
        $visError = $this->checkViewPermission($request->user(), $post);
        if ($visError) return $visError;

        $post->is_liked = CommunityPostLike::where('community_post_id', $post->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        $this->appendAuthorRole($post);

        return response()->json(['success' => true, 'data' => $post]);
    }

    /* ════════════════════════════════════════════
       UPDATE — PATCH /community/posts/{id}
       ════════════════════════════════════════════ */

    public function update(Request $request, int $id): JsonResponse
    {
        $post = CommunityPost::findOrFail($id);
        $user = $request->user();

        // Only author or school admin or super_admin can edit
        if ($post->author_user_id !== $user->id
            && ! ($user->hasRole('admin') && $user->institution_id === $post->institution_id)
            && ! $user->hasRole('super_admin')
        ) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $request->validate([
            'title'             => 'sometimes|string|max:500',
            'title_bn'          => 'nullable|string|max:500',
            'body'              => 'nullable|string|max:10000',
            'body_bn'           => 'nullable|string|max:10000',
            'tags'              => 'nullable|array|max:10',
            'tags.*'            => 'string|max:50',
            'visibility_scope'  => 'sometimes|in:GLOBAL_ALL_SCHOOLS,INVITED_SCHOOLS_ONLY,SAME_SCHOOL_ONLY',
            'allowed_school_ids'=> 'nullable|array',
            'allowed_school_ids.*' => 'integer|exists:institutions,id',
            'type'              => 'sometimes|in:ANNOUNCEMENT,COMPETITION,SPORTS,KNOWLEDGE,RESOURCE',
        ]);

        $data = $request->only(['title', 'title_bn', 'body', 'body_bn', 'tags', 'visibility_scope', 'allowed_school_ids', 'type']);

        // Sanitize body
        if (isset($data['body'])) {
            $data['body'] = strip_tags($data['body'], '<p><br><b><i><u><strong><em><ul><ol><li><a><h1><h2><h3><h4><blockquote><code><pre><img>');
        }
        if (isset($data['body_bn'])) {
            $data['body_bn'] = strip_tags($data['body_bn'], '<p><br><b><i><u><strong><em><ul><ol><li><a><h1><h2><h3><h4><blockquote><code><pre><img>');
        }

        // Re-check profanity
        $data['moderation_status'] = $this->profanity->moderationStatus(
            $data['title'] ?? $post->title,
            $data['body'] ?? $post->body ?? '',
            $data['body_bn'] ?? $post->body_bn ?? ''
        );

        $post->update($data);

        $this->audit->log('post.edited', $user->id, $user->institution_id, $post);

        $post->load('author:id,name,name_bn,avatar', 'author.roles:id,name', 'institution:id,name,name_bn');
        $this->appendAuthorRole($post);

        return response()->json(['success' => true, 'data' => $post]);
    }

    /* ════════════════════════════════════════════
       PUBLISH — POST /community/posts/{id}/publish
       ════════════════════════════════════════════ */

    public function publish(Request $request, int $id): JsonResponse
    {
        $post = CommunityPost::findOrFail($id);
        $user = $request->user();

        if ($post->author_user_id !== $user->id
            && ! ($user->hasRole('admin') && $user->institution_id === $post->institution_id)
            && ! $user->hasRole('super_admin')
        ) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $post->update([
            'status' => 'PUBLISHED',
            'published_at' => now(),
        ]);

        $this->audit->log('post.published', $user->id, $user->institution_id, $post);

        return response()->json(['success' => true, 'data' => $post]);
    }

    /* ════════════════════════════════════════════
       DELETE (archive) — DELETE /community/posts/{id}
       ════════════════════════════════════════════ */

    public function destroy(Request $request, int $id): JsonResponse
    {
        $post = CommunityPost::findOrFail($id);
        $user = $request->user();

        if ($post->author_user_id !== $user->id
            && ! ($user->hasRole('admin') && $user->institution_id === $post->institution_id)
            && ! $user->hasRole('super_admin')
        ) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $post->update(['status' => 'ARCHIVED']);

        $this->audit->log('post.archived', $user->id, $user->institution_id, $post);

        return response()->json(['success' => true, 'message' => 'Post archived']);
    }

    /* ════════════════════════════════════════════
       LIKE — POST /community/posts/{id}/like
       ════════════════════════════════════════════ */

    public function like(Request $request, int $id): JsonResponse
    {
        $post = CommunityPost::findOrFail($id);
        $visError = $this->checkViewPermission($request->user(), $post);
        if ($visError) return $visError;

        CommunityPostLike::firstOrCreate([
            'community_post_id' => $id,
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'likes_count' => $post->likes()->count(),
        ]);
    }

    /* ════════════════════════════════════════════
       UNLIKE — DELETE /community/posts/{id}/like
       ════════════════════════════════════════════ */

    public function unlike(Request $request, int $id): JsonResponse
    {
        CommunityPostLike::where('community_post_id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        $count = CommunityPostLike::where('community_post_id', $id)->count();

        return response()->json(['success' => true, 'likes_count' => $count]);
    }

    /* ════════════════════════════════════════════
       COMMENTS — GET /community/posts/{id}/comments
       ════════════════════════════════════════════ */

    public function comments(Request $request, int $id): JsonResponse
    {
        $post = CommunityPost::findOrFail($id);
        $visError = $this->checkViewPermission($request->user(), $post);
        if ($visError) return $visError;

        $comments = CommunityPostComment::with('user:id,name,name_bn,avatar', 'institution:id,name,name_bn')
            ->where('community_post_id', $id)
            ->where('moderation_status', '!=', 'REMOVED')
            ->latest()
            ->paginate($request->get('per_page', 30));

        return response()->json(['success' => true, 'data' => $comments]);
    }

    /* ════════════════════════════════════════════
       ADD COMMENT — POST /community/posts/{id}/comments
       ════════════════════════════════════════════ */

    public function addComment(Request $request, int $id): JsonResponse
    {
        $post = CommunityPost::findOrFail($id);
        $user = $request->user();

        // Visibility check
        $visError = $this->checkViewPermission($user, $post);
        if ($visError) return $visError;

        // Cross-school commenting check
        if ($user->institution_id !== $post->institution_id && ! $user->hasRole('super_admin')) {
            $authorSettings = CommunitySetting::where('institution_id', $post->institution_id)->first();
            if ($authorSettings && ! $authorSettings->allow_cross_school_comments) {
                return response()->json([
                    'success' => false,
                    'message' => 'This school does not allow cross-school comments.',
                ], 403);
            }
        }

        $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        $body = strip_tags($request->body, '<p><br><b><i><u><strong><em>');
        $moderationStatus = $this->profanity->moderationStatus($body);

        $comment = CommunityPostComment::create([
            'community_post_id' => $id,
            'user_id'           => $user->id,
            'institution_id'    => $user->institution_id,
            'body'              => $body,
            'moderation_status' => $moderationStatus,
        ]);

        $comment->load('user:id,name,name_bn,avatar', 'institution:id,name,name_bn');

        return response()->json(['success' => true, 'data' => $comment], 201);
    }

    /* ════════════════════════════════════════════
       REPORT — POST /community/reports
       ════════════════════════════════════════════ */

    public function report(Request $request): JsonResponse
    {
        $request->validate([
            'reportable_type' => 'required|in:post,comment',
            'reportable_id'   => 'required|integer',
            'reason'          => 'required|in:SPAM,INAPPROPRIATE,HARASSMENT,MISINFORMATION,OTHER',
            'details'         => 'nullable|string|max:1000',
        ]);

        $type = $request->reportable_type === 'post'
            ? CommunityPost::class
            : CommunityPostComment::class;

        // Verify the target exists
        $target = $type::findOrFail($request->reportable_id);

        $user = $request->user();

        $report = CommunityReport::create([
            'reporter_user_id'        => $user->id,
            'reporter_institution_id' => $user->institution_id,
            'reportable_type'         => $type,
            'reportable_id'           => $request->reportable_id,
            'reason'                  => $request->reason,
            'details'                 => $request->details,
        ]);

        $this->audit->log('report.created', $user->id, $user->institution_id, $report);

        return response()->json(['success' => true, 'data' => $report], 201);
    }

    /* ════════════════════════════════════════════
       MY POSTS — GET /community/my-posts
       ════════════════════════════════════════════ */

    public function myPosts(Request $request): JsonResponse
    {
        $user = $request->user();

        $posts = CommunityPost::with(['author:id,name,name_bn,avatar', 'author.roles:id,name', 'institution:id,name,name_bn'])
            ->withCount(['likes', 'comments'])
            ->where('author_user_id', $user->id)
            ->latest()
            ->paginate($request->get('per_page', 15));

        $posts->getCollection()->transform(function ($post) {
            $this->appendAuthorRole($post);
            return $post;
        });

        return response()->json(['success' => true, 'data' => $posts]);
    }

    /* ═══════════ PRIVATE HELPERS ═══════════ */

    /**
     * Append the author's primary role name to the post's author data.
     */
    private function appendAuthorRole(CommunityPost $post): void
    {
        if ($post->author && $post->author->relationLoaded('roles')) {
            $role = $post->author->roles->first();
            $post->author->setAttribute('role_name', $role ? $role->name : null);
            $post->author->makeHidden('roles');
        }
    }

    /**
     * Check if user has permission to create posts.
     * All authenticated users can post as long as community is enabled for their school.
     */
    private function checkPostingPermission($user): ?JsonResponse
    {
        if ($user->hasRole('super_admin')) return null;

        $settings = CommunitySetting::where('institution_id', $user->institution_id)->first();
        if (! $settings || ! $settings->enable_community) {
            return response()->json(['success' => false, 'message' => 'Community is not enabled for your school.'], 403);
        }

        return null;
    }

    /**
     * Check if user has permission to view a specific post.
     */
    private function checkViewPermission($user, CommunityPost $post): ?JsonResponse
    {
        if ($user->hasRole('super_admin')) return null;

        $institutionId = $user->institution_id;

        // Check viewer's community is enabled (for cross-school content)
        if ($post->institution_id !== $institutionId) {
            $settings = CommunitySetting::where('institution_id', $institutionId)->first();
            if (! $settings || ! $settings->enable_community) {
                return response()->json(['success' => false, 'message' => 'Community is not enabled for your school.'], 403);
            }
        }

        $visible = match ($post->visibility_scope) {
            'SAME_SCHOOL_ONLY'       => $post->institution_id === $institutionId,
            'GLOBAL_ALL_SCHOOLS'     => true, // already checked community enabled above
            'INVITED_SCHOOLS_ONLY'   => $post->institution_id === $institutionId
                                        || in_array($institutionId, $post->allowed_school_ids ?? []),
            default => false,
        };

        if (! $visible) {
            return response()->json(['success' => false, 'message' => 'You do not have access to this content.'], 403);
        }

        // Don't show removed content to non-admins
        if ($post->moderation_status === 'REMOVED' && ! $user->hasRole(['admin'])) {
            return response()->json(['success' => false, 'message' => 'This content has been removed.'], 404);
        }

        return null;
    }
}
