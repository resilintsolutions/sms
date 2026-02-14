<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamComponent extends Model
{
    protected $fillable = [
        'institution_id', 'name', 'name_bn', 'short_code', 'sort_order', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    // ── Relationships ──

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function examSubjectRules(): HasMany
    {
        return $this->hasMany(ExamSubjectRule::class, 'component_id');
    }

    public function componentMarks(): HasMany
    {
        return $this->hasMany(ComponentMark::class, 'component_id');
    }

    // ── Scopes ──

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForInstitution($query, int $institutionId)
    {
        return $query->where('institution_id', $institutionId);
    }
}
