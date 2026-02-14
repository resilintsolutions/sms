<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommunityCompetitionInvitation extends Model
{
    protected $fillable = [
        'competition_event_id',
        'institution_id',
        'status',
        'responded_by',
        'responded_at',
    ];

    protected $casts = [
        'responded_at' => 'datetime',
    ];
    

    public function competitionEvent(): BelongsTo
    {
        return $this->belongsTo(CommunityCompetitionEvent::class, 'competition_event_id');
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function respondedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responded_by');
    }
}
