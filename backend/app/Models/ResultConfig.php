<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResultConfig extends Model
{
    protected $fillable = [
        'institution_id', 'academic_session_id', 'class_id', 'name',
        'fail_criteria', 'pass_marks_percent', 'min_gpa', 'max_fail_subjects',
        'use_component_marks', 'custom_rules', 'is_active',
    ];

    protected $casts = [
        'pass_marks_percent' => 'decimal:2',
        'min_gpa' => 'decimal:2',
        'max_fail_subjects' => 'integer',
        'use_component_marks' => 'boolean',
        'custom_rules' => 'array',
        'is_active' => 'boolean',
    ];

    // ── Relationships ──

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function classModel(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    // ── Scopes ──

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Find the best matching config for a given class/session.
     * Priority: class+session specific → class-specific → institution-wide
     */
    public static function findFor(int $institutionId, ?int $classId = null, ?int $sessionId = null): ?self
    {
        return static::where('institution_id', $institutionId)
            ->active()
            ->when($classId, function ($q) use ($classId) {
                $q->where(fn($q2) => $q2->where('class_id', $classId)->orWhereNull('class_id'));
            })
            ->when($sessionId, function ($q) use ($sessionId) {
                $q->where(fn($q2) => $q2->where('academic_session_id', $sessionId)->orWhereNull('academic_session_id'));
            })
            ->orderByRaw('class_id IS NULL ASC, academic_session_id IS NULL ASC')
            ->first();
    }
}
