<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Book extends Model
{
    protected $fillable = [
        'institution_id',
        'title',
        'title_bn',
        'author',
        'author_bn',
        'isbn',
        'category',
        'publisher',
        'edition',
        'language',
        'pages',
        'shelf_location',
        'total_copies',
        'available_copies',
        'cover_image',
        'description',
        'description_bn',
        'added_by',
        'status',
    ];

    protected $casts = [
        'total_copies' => 'integer',
        'available_copies' => 'integer',
        'pages' => 'integer',
    ];

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }

    public function issues(): HasMany
    {
        return $this->hasMany(BookIssue::class);
    }

    public function activeIssues(): HasMany
    {
        return $this->hasMany(BookIssue::class)->where('status', 'issued');
    }
}
