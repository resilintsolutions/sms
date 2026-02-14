<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class CommunityAuditLog extends Model
{
    protected $fillable = [
        'user_id',
        'institution_id',
        'action',
        'auditable_type',
        'auditable_id',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];
    

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }
}
