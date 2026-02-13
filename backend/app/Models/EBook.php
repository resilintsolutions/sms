<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EBook extends Model
{
    protected $table = 'ebooks';

    protected $fillable = [
        'institution_id',
        'title',
        'title_bn',
        'author',
        'author_bn',
        'category',
        'description',
        'description_bn',
        'type',
        'link',
        'file_name',
        'file_type',
        'file_size',
        'cover_image',
        'is_public',
        'download_count',
        'added_by',
        'status',
    ];

    protected $casts = [
        'is_public' => 'boolean',
        'download_count' => 'integer',
        'file_size' => 'integer',
    ];

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}
