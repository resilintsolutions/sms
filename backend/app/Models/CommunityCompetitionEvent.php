<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommunityCompetitionEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'institution_id',
        'created_by_user_id',
        'community_post_id',
        'title',
        'title_bn',
        'description',
        'description_bn',
        'category',
        'start_date_time',
        'end_date_time',
        'location',
        'registration_deadline',
        'status',
        'visibility_scope',
        'allowed_school_ids',
    ];

    protected $casts = [
        'start_date_time' => 'datetime',
        'end_date_time' => 'datetime',
        'registration_deadline' => 'date',
        'allowed_school_ids' => 'array',
    ];
    

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function feedPost(): BelongsTo
    {
        return $this->belongsTo(CommunityPost::class, 'community_post_id');
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(CommunityCompetitionInvitation::class, 'competition_event_id');
    }

    /**
     * Scope: visible to a given institution.
     */
    public function scopeVisibleTo($query, int $institutionId)
    {
        return $query->where(function ($q) use ($institutionId) {
            $q->where('visibility_scope', 'GLOBAL_ALL_SCHOOLS')
              ->orWhere(function ($sub) use ($institutionId) {
                  $sub->where('visibility_scope', 'SAME_SCHOOL_ONLY')
                      ->where('institution_id', $institutionId);
              })
              ->orWhere(function ($sub) use ($institutionId) {
                  $sub->where('visibility_scope', 'INVITED_SCHOOLS_ONLY')
                      ->where(function ($inner) use ($institutionId) {
                          $inner->where('institution_id', $institutionId)
                                ->orWhereJsonContains('allowed_school_ids', $institutionId);
                      });
              });
        });
    }
}
