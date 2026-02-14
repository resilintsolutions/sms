<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommunityPostAttachment extends Model
{
    protected $fillable = [
        'community_post_id',
        'file_name',
        'file_path',
        'file_type',
        'file_size',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(CommunityPost::class, 'community_post_id');
    }
}
