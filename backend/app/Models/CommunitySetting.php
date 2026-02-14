<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommunitySetting extends Model
{
    use HasFactory;

    protected $table = 'community_settings';

    protected $fillable = [
        'institution_id',
        'enable_community',
        'who_can_post',
        'allow_cross_school_comments',
    ];

    protected $casts = [
        'enable_community' => 'boolean',
        'allow_cross_school_comments' => 'boolean',
    ];
    

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }
}
