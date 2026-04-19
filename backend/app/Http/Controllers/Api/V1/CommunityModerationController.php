<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CommunityPost;
use App\Models\CommunityPostComment;
use App\Models\CommunityReport;
use App\Models\CommunityAuditLog;
use App\Services\CommunityAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommunityModerationController extends Controller
{
    public function __construct(private CommunityAuditService $audit) {}

    /* ════════════════════════════════════════════
       REPORTS — GET /community/moderation/reports
       Super Admin: all | School Admin: own school
       ════════════════════════════════════════════ */

    public function reports(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = CommunityReport::with([
            'reporter:id,name,name_bn',
            'reportable',
            'reviewer:id,name,name_bn',
        ])->latest();

        // School admins see only reports against their school's content
        if (! $user->hasRole('super_admin')) {
            $query->where('reporter_institution_id', $user->institution_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('reason')) {
            $query->where('reason', $request->reason);
        }
        if ($request->filled('type')) {
            $type = $request->type === 'post'
                ? CommunityPost::class
                : CommunityPostComment::class;
            $query->where('reportable_type', $type);
        }

        $reports = $query->paginate($request->get('per_page', 15));

        return response()->json(['success' => true, 'data' => $reports]);
    }

    /* ════════════════════════════════════════════
       REVIEW REPORT — PATCH /community/moderation/reports/{id}
       ════════════════════════════════════════════ */

    public function reviewReport(Request $request, int $id): JsonResponse
    {
        $report = CommunityReport::findOrFail($id);
        $user = $request->user();

        // School admins can only review reports from their school
        if (! $user->hasRole('super_admin') && $report->reporter_institution_id !== $user->institution_id) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $request->validate([
            'status'         => 'required|in:REVIEWED,DISMISSED,ACTION_TAKEN',
            'review_notes'   => 'nullable|string|max:2000',
            'action'         => 'nullable|in:REMOVE_CONTENT,WARN_USER,NONE',
        ]);

        $report->update([
            'status'             => $request->status,
            'review_notes'       => $request->review_notes,
            'reviewed_by_user_id'=> $user->id,
            'reviewed_at'        => now(),
        ]);

        // Auto-remove content if action requested
        if ($request->action === 'REMOVE_CONTENT') {
            $target = $report->reportable;
            if ($target) {
                $target->update(['moderation_status' => 'REMOVED']);
                $this->audit->log('content.removed_by_report', $user->id, $user->institution_id, $target, [
                    'report_id' => $report->id,
                ]);
            }
        }

        $this->audit->log('report.reviewed', $user->id, $user->institution_id, $report, [
            'status' => $request->status,
            'action' => $request->action,
        ]);

        return response()->json(['success' => true, 'data' => $report]);
    }

    /* ════════════════════════════════════════════
       REMOVE POST — POST /community/moderation/posts/{id}/remove
       ════════════════════════════════════════════ */

    public function removePost(Request $request, int $id): JsonResponse
    {
        $post = CommunityPost::findOrFail($id);
        $user = $request->user();

        if (! $user->hasRole('super_admin') && $user->institution_id !== $post->institution_id) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $post->update(['moderation_status' => 'REMOVED']);

        $this->audit->log('post.removed', $user->id, $user->institution_id, $post, [
            'reason' => $request->reason,
        ]);

        return response()->json(['success' => true, 'message' => 'Post removed']);
    }

    /* ════════════════════════════════════════════
       RESTORE POST — POST /community/moderation/posts/{id}/restore
       ════════════════════════════════════════════ */

    public function restorePost(Request $request, int $id): JsonResponse
    {
        $post = CommunityPost::findOrFail($id);
        $user = $request->user();

        if (! $user->hasRole('super_admin') && $user->institution_id !== $post->institution_id) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $post->update(['moderation_status' => 'CLEAN']);

        $this->audit->log('post.restored', $user->id, $user->institution_id, $post);

        return response()->json(['success' => true, 'message' => 'Post restored']);
    }

    /* ════════════════════════════════════════════
       REMOVE COMMENT — POST /community/moderation/comments/{id}/remove
       ════════════════════════════════════════════ */

    public function removeComment(Request $request, int $id): JsonResponse
    {
        $comment = CommunityPostComment::findOrFail($id);
        $user = $request->user();

        if (! $user->hasRole('super_admin') && $user->institution_id !== $comment->institution_id) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $comment->update(['moderation_status' => 'REMOVED']);

        $this->audit->log('comment.removed', $user->id, $user->institution_id, $comment);

        return response()->json(['success' => true, 'message' => 'Comment removed']);
    }

    /* ════════════════════════════════════════════
       FLAGGED CONTENT — GET /community/moderation/flagged
       ════════════════════════════════════════════ */

    public function flaggedContent(Request $request): JsonResponse
    {
        $user = $request->user();

        // Flagged posts
        $postQuery = CommunityPost::with('author:id,name,name_bn', 'institution:id,name,name_bn')
            ->where('moderation_status', 'FLAGGED');
        if (! $user->hasRole('super_admin')) {
            $postQuery->where('institution_id', $user->institution_id);
        }
        $flaggedPosts = $postQuery->latest()->get();

        // Flagged comments
        $commentQuery = CommunityPostComment::with('user:id,name,name_bn', 'institution:id,name,name_bn', 'post:id,title')
            ->where('moderation_status', 'FLAGGED');
        if (! $user->hasRole('super_admin')) {
            $commentQuery->where('institution_id', $user->institution_id);
        }
        $flaggedComments = $commentQuery->latest()->get();

        return response()->json([
            'success' => true,
            'data' => [
                'posts'    => $flaggedPosts,
                'comments' => $flaggedComments,
            ],
        ]);
    }

    /* ════════════════════════════════════════════
       AUDIT LOG — GET /community/moderation/audit-log
       Super Admin only
       ════════════════════════════════════════════ */

    public function auditLog(Request $request): JsonResponse
    {
        $query = CommunityAuditLog::with('user:id,name,name_bn')
            ->latest();

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }
        if ($request->filled('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        $logs = $query->paginate($request->get('per_page', 30));

        return response()->json(['success' => true, 'data' => $logs]);
    }

    /* ════════════════════════════════════════════
       STATS — GET /community/moderation/stats
       ════════════════════════════════════════════ */

    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super_admin');

        $postQuery = CommunityPost::query();
        $commentQuery = CommunityPostComment::query();
        $reportQuery = CommunityReport::query();

        if (! $isSuperAdmin) {
            $postQuery->where('institution_id', $user->institution_id);
            $commentQuery->where('institution_id', $user->institution_id);
            $reportQuery->where('reporter_institution_id', $user->institution_id);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_posts'       => (clone $postQuery)->count(),
                'published_posts'   => (clone $postQuery)->where('status', 'PUBLISHED')->count(),
                'flagged_posts'     => (clone $postQuery)->where('moderation_status', 'FLAGGED')->count(),
                'removed_posts'     => (clone $postQuery)->where('moderation_status', 'REMOVED')->count(),
                'total_comments'    => (clone $commentQuery)->count(),
                'flagged_comments'  => (clone $commentQuery)->where('moderation_status', 'FLAGGED')->count(),
                'pending_reports'   => (clone $reportQuery)->where('status', 'PENDING')->count(),
                'reviewed_reports'  => (clone $reportQuery)->where('status', '!=', 'PENDING')->count(),
            ],
        ]);
    }
}
