<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CommunitySetting;
use App\Services\CommunityAuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommunitySettingsController extends Controller
{
    public function __construct(private CommunityAuditService $audit) {}

    /* ════════════════════════════════════════════
       GET — /community/settings
       ════════════════════════════════════════════ */

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $institutionId = $user->institution_id;

        // Super admin can query any school
        if ($user->hasRole('super_admin') && $request->filled('institution_id')) {
            $institutionId = $request->institution_id;
        }

        $settings = CommunitySetting::firstOrCreate(
            ['institution_id' => $institutionId],
            [
                'enable_community'           => false,
                'who_can_post'               => 'SCHOOL_ADMIN_ONLY',
                'allow_cross_school_comments' => true,
                'moderation_level'           => 'AUTO_FLAG',
            ]
        );

        return response()->json(['success' => true, 'data' => $settings]);
    }

    /* ════════════════════════════════════════════
       UPDATE — PATCH /community/settings
       ════════════════════════════════════════════ */

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $institutionId = $user->institution_id;

        if ($user->hasRole('super_admin') && $request->filled('institution_id')) {
            $institutionId = $request->institution_id;
        }

        $request->validate([
            'enable_community'           => 'sometimes|boolean',
            'who_can_post'               => 'sometimes|in:SCHOOL_ADMIN_ONLY,TEACHERS_ONLY,ALL_VERIFIED_USERS',
            'allow_cross_school_comments' => 'sometimes|boolean',
            'moderation_level'           => 'sometimes|in:AUTO_FLAG,MANUAL_REVIEW,AUTO_REMOVE',
        ]);

        $settings = CommunitySetting::firstOrCreate(
            ['institution_id' => $institutionId],
            [
                'enable_community'           => false,
                'who_can_post'               => 'SCHOOL_ADMIN_ONLY',
                'allow_cross_school_comments' => true,
                'moderation_level'           => 'AUTO_FLAG',
            ]
        );

        $settings->update($request->only([
            'enable_community',
            'who_can_post',
            'allow_cross_school_comments',
            'moderation_level',
        ]));

        $this->audit->log('settings.updated', $user->id, $institutionId, $settings);

        return response()->json(['success' => true, 'data' => $settings]);
    }

    /* ════════════════════════════════════════════
       STATUS — GET /community/status  (any authenticated user)
       Returns whether community is enabled for the user's school.
       ════════════════════════════════════════════ */

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        // Super-admin always has access
        if ($user->hasRole('super_admin')) {
            return response()->json(['success' => true, 'data' => ['enabled' => true]]);
        }

        $settings = CommunitySetting::where('institution_id', $user->institution_id)->first();

        return response()->json([
            'success' => true,
            'data'    => ['enabled' => $settings?->enable_community ?? false],
        ]);
    }

    /* ════════════════════════════════════════════
       TOGGLE ALL — POST /community/settings/toggle-all  (super admin)
       Enables or disables community for ALL schools at once.
       ════════════════════════════════════════════ */

    public function toggleAll(Request $request): JsonResponse
    {
        $request->validate([
            'enable_community' => 'required|boolean',
        ]);

        $enabled = $request->boolean('enable_community');

        CommunitySetting::query()->update(['enable_community' => $enabled]);

        $this->audit->log(
            $enabled ? 'community.enabled_all' : 'community.disabled_all',
            $request->user()->id,
            0,
            ['enable_community' => $enabled]
        );

        return response()->json([
            'success' => true,
            'message' => $enabled ? 'Community enabled for all schools' : 'Community disabled for all schools',
        ]);
    }

    /* ════════════════════════════════════════════
       ALL SETTINGS (super admin) — GET /community/settings/all
       ════════════════════════════════════════════ */

    public function all(Request $request): JsonResponse
    {
        $settings = CommunitySetting::with('institution:id,name,name_bn')
            ->latest()
            ->paginate($request->get('per_page', 30));

        return response()->json(['success' => true, 'data' => $settings]);
    }
}
