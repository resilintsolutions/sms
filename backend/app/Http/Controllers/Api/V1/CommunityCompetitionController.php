<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CommunityCompetitionEvent;
use App\Models\CommunityCompetitionInvitation;
use App\Models\CommunityPost;
use App\Services\CommunityAuditService;
use App\Services\ProfanityFilterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommunityCompetitionController extends Controller
{
    public function __construct(
        private ProfanityFilterService $profanity,
        private CommunityAuditService $audit,
    ) {}

    /* ════════════════════════════════════════════
       LIST — GET /community/competitions
       ════════════════════════════════════════════ */

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super_admin');

        $query = CommunityCompetitionEvent::with([
            'institution:id,name,name_bn,logo',
            'organiser:id,name,name_bn',
        ])->withCount('invitations');

        if (! $isSuperAdmin) {
            $query->visibleTo($user->institution_id);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('q')) {
            $s = $request->q;
            $query->where(function ($q) use ($s) {
                $q->where('title', 'LIKE', "%{$s}%")
                  ->orWhere('description', 'LIKE', "%{$s}%");
            });
        }

        $events = $query->latest()->paginate($request->get('per_page', 15));

        // Attach invitation status for non-super-admins
        if (! $isSuperAdmin) {
            $eventIds = $events->pluck('id');
            $invitations = CommunityCompetitionInvitation::where('institution_id', $user->institution_id)
                ->whereIn('community_competition_event_id', $eventIds)
                ->pluck('status', 'community_competition_event_id');

            $events->getCollection()->transform(function ($event) use ($invitations, $user) {
                $event->my_invitation_status = $invitations[$event->id] ?? null;
                $event->is_mine = $event->institution_id === $user->institution_id;
                return $event;
            });
        }

        return response()->json(['success' => true, 'data' => $events]);
    }

    /* ════════════════════════════════════════════
       SHOW — GET /community/competitions/{id}
       ════════════════════════════════════════════ */

    public function show(Request $request, int $id): JsonResponse
    {
        $event = CommunityCompetitionEvent::with([
            'institution:id,name,name_bn,logo',
            'organiser:id,name,name_bn,avatar',
            'invitations.institution:id,name,name_bn',
            'feedPost:id,title,title_bn',
        ])->withCount('invitations')->findOrFail($id);

        return response()->json(['success' => true, 'data' => $event]);
    }

    /* ════════════════════════════════════════════
       CREATE — POST /community/competitions
       ════════════════════════════════════════════ */

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'title'              => 'required|string|max:500',
            'title_bn'           => 'nullable|string|max:500',
            'description'        => 'nullable|string|max:5000',
            'description_bn'     => 'nullable|string|max:5000',
            'category'           => 'required|in:SPORTS,ACADEMIC,CULTURAL,OTHER',
            'event_start'        => 'required|date|after_or_equal:today',
            'event_end'          => 'required|date|after_or_equal:event_start',
            'reg_deadline'       => 'nullable|date|before_or_equal:event_start',
            'max_participants'   => 'nullable|integer|min:1',
            'venue'              => 'nullable|string|max:500',
            'visibility_scope'   => 'required|in:GLOBAL_ALL_SCHOOLS,INVITED_SCHOOLS_ONLY',
            'invited_school_ids' => 'nullable|array',
            'invited_school_ids.*' => 'integer|exists:institutions,id',
            'create_feed_post'   => 'nullable|boolean',
        ]);

        // Check profanity
        $modStatus = $this->profanity->moderationStatus(
            $request->input('title', ''),
            $request->input('description', '')
        );

        // Optionally create a linked feed post
        $feedPostId = null;
        if ($request->input('create_feed_post', true)) {
            $feedPost = CommunityPost::create([
                'institution_id'    => $user->institution_id,
                'author_user_id'    => $user->id,
                'type'              => 'COMPETITION',
                'title'             => $request->title,
                'title_bn'          => $request->title_bn,
                'body'              => $request->description,
                'body_bn'           => $request->description_bn,
                'visibility_scope'  => $request->visibility_scope,
                'allowed_school_ids'=> $request->invited_school_ids,
                'status'            => 'PUBLISHED',
                'moderation_status' => $modStatus,
                'published_at'      => now(),
            ]);
            $feedPostId = $feedPost->id;
        }

        $event = CommunityCompetitionEvent::create([
            'institution_id'       => $user->institution_id,
            'organiser_user_id'    => $user->id,
            'community_post_id'    => $feedPostId,
            'title'                => $request->title,
            'title_bn'             => $request->title_bn,
            'description'          => $request->description,
            'description_bn'       => $request->description_bn,
            'category'             => $request->category,
            'event_start'          => $request->event_start,
            'event_end'            => $request->event_end,
            'registration_deadline'=> $request->reg_deadline,
            'max_participants_per_school' => $request->max_participants,
            'venue'                => $request->venue,
            'visibility_scope'     => $request->visibility_scope,
            'status'               => 'UPCOMING',
        ]);

        // Create invitations
        if ($request->visibility_scope === 'INVITED_SCHOOLS_ONLY' && $request->filled('invited_school_ids')) {
            foreach ($request->invited_school_ids as $schoolId) {
                if ($schoolId == $user->institution_id) continue;
                CommunityCompetitionInvitation::create([
                    'community_competition_event_id' => $event->id,
                    'institution_id' => $schoolId,
                    'status' => 'PENDING',
                ]);
            }
        }

        $this->audit->log('competition.created', $user->id, $user->institution_id, $event);

        $event->load('institution:id,name,name_bn', 'invitations.institution:id,name,name_bn');

        return response()->json(['success' => true, 'data' => $event], 201);
    }

    /* ════════════════════════════════════════════
       UPDATE — PATCH /community/competitions/{id}
       ════════════════════════════════════════════ */

    public function update(Request $request, int $id): JsonResponse
    {
        $event = CommunityCompetitionEvent::findOrFail($id);
        $user = $request->user();

        if ($event->organiser_user_id !== $user->id
            && ! ($user->hasRole('admin') && $user->institution_id === $event->institution_id)
            && ! $user->hasRole('super_admin')
        ) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $request->validate([
            'title'            => 'sometimes|string|max:500',
            'title_bn'         => 'nullable|string|max:500',
            'description'      => 'nullable|string|max:5000',
            'description_bn'   => 'nullable|string|max:5000',
            'category'         => 'sometimes|in:SPORTS,ACADEMIC,CULTURAL,OTHER',
            'event_start'      => 'sometimes|date',
            'event_end'        => 'sometimes|date',
            'reg_deadline'     => 'nullable|date',
            'max_participants' => 'nullable|integer|min:1',
            'venue'            => 'nullable|string|max:500',
            'status'           => 'sometimes|in:UPCOMING,ONGOING,COMPLETED,CANCELLED',
        ]);

        $event->update($request->only([
            'title', 'title_bn', 'description', 'description_bn',
            'category', 'event_start', 'event_end', 'reg_deadline',
            'max_participants', 'venue', 'status',
        ]));

        $this->audit->log('competition.updated', $user->id, $user->institution_id, $event);

        return response()->json(['success' => true, 'data' => $event]);
    }

    /* ════════════════════════════════════════════
       INVITE SCHOOLS — POST /community/competitions/{id}/invite
       ════════════════════════════════════════════ */

    public function invite(Request $request, int $id): JsonResponse
    {
        $event = CommunityCompetitionEvent::findOrFail($id);
        $user = $request->user();

        if ($event->organiser_user_id !== $user->id
            && ! ($user->hasRole('admin') && $user->institution_id === $event->institution_id)
            && ! $user->hasRole('super_admin')
        ) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $request->validate([
            'school_ids'   => 'required|array|min:1',
            'school_ids.*' => 'integer|exists:institutions,id',
        ]);

        $created = [];
        foreach ($request->school_ids as $schoolId) {
            if ($schoolId == $event->institution_id) continue;
            $inv = CommunityCompetitionInvitation::firstOrCreate([
                'community_competition_event_id' => $event->id,
                'institution_id' => $schoolId,
            ], ['status' => 'PENDING']);
            $created[] = $inv;
        }

        return response()->json(['success' => true, 'data' => $created]);
    }

    /* ════════════════════════════════════════════
       RESPOND TO INVITATION — PATCH /community/competitions/{id}/respond
       ════════════════════════════════════════════ */

    public function respond(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'status' => 'required|in:ACCEPTED,DECLINED',
        ]);

        $inv = CommunityCompetitionInvitation::where('community_competition_event_id', $id)
            ->where('institution_id', $user->institution_id)
            ->firstOrFail();

        $inv->update([
            'status'       => $request->status,
            'responded_at' => now(),
        ]);

        $this->audit->log(
            'invitation.' . strtolower($request->status),
            $user->id,
            $user->institution_id,
            $inv
        );

        return response()->json(['success' => true, 'data' => $inv]);
    }
}
