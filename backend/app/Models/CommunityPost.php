<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class CommunityPost extends Model
{
    use HasFactory;

    protected $fillable = [
        'institution_id',
        'author_user_id',
        'type',
        'title',
        'title_bn',
        'body',
        'body_bn',
        'tags',
        'visibility_scope',
        'allowed_school_ids',
        'status',
        'moderation_status',
        'published_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'allowed_school_ids' => 'array',
        'published_at' => 'datetime',
    ];
    

    /* ── Relationships ── */

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_user_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(CommunityPostAttachment::class);
    }

    public function likes(): HasMany
    {
        return $this->hasMany(CommunityPostLike::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(CommunityPostComment::class);
    }

    public function reports(): MorphMany
    {
        return $this->morphMany(CommunityReport::class, 'reportable');
    }

    public function competitionEvent(): HasOne
    {
        return $this->hasOne(CommunityCompetitionEvent::class, 'community_post_id');
    }

    /* ── Scopes ── */

    /**
     * Scope: only published + not-removed posts.
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'PUBLISHED')
                     ->where('moderation_status', '!=', 'REMOVED');
    }

    /**
     * Scope: posts visible to a given institution_id.
     * Super Admin bypass should be handled at controller level.
     */
    public function scopeVisibleTo($query, int $institutionId)
    {
        // Get all institution IDs that have community enabled
        $enabledIds = CommunitySetting::where('enable_community', true)->pluck('institution_id');

        return $query->where(function ($q) use ($institutionId, $enabledIds) {
            // SAME_SCHOOL_ONLY: only if viewer is from the same school
            $q->where(function ($sub) use ($institutionId) {
                $sub->where('visibility_scope', 'SAME_SCHOOL_ONLY')
                    ->where('institution_id', $institutionId);
            })
            // GLOBAL_ALL_SCHOOLS: viewer's school must have community enabled
            ->orWhere(function ($sub) use ($institutionId, $enabledIds) {
                $sub->where('visibility_scope', 'GLOBAL_ALL_SCHOOLS')
                    ->whereIn('institution_id', $enabledIds) // Author's school also must have it enabled
                    ->where(function () use ($enabledIds, $institutionId) {
                        // Viewer's school must be enabled — checked at controller level
                    });
            })
            // INVITED_SCHOOLS_ONLY: viewer's institution_id must be in allowed_school_ids
            ->orWhere(function ($sub) use ($institutionId) {
                $sub->where('visibility_scope', 'INVITED_SCHOOLS_ONLY')
                    ->where(function ($inner) use ($institutionId) {
                        $inner->where('institution_id', $institutionId) // Author can see own
                              ->orWhereJsonContains('allowed_school_ids', $institutionId);
                    });
            });
        });
    }
}
