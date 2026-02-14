<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notice extends Model
{
    protected $fillable = [
        'institution_id', 'created_by', 'title', 'title_bn', 'body', 'body_bn',
        'audience', 'attachments', 'published_at', 'expires_at', 'is_published',
    ];

    protected $casts = [
        'attachments' => 'array',
        'published_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_published' => 'boolean',
    ];
    

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
