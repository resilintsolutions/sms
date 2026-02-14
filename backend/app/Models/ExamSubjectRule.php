<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamSubjectRule extends Model
{
    protected $fillable = [
        'exam_term_id', 'class_id', 'subject_id', 'component_id',
        'max_marks', 'weight', 'is_optional',
    ];

    protected $casts = [
        'max_marks' => 'integer',
        'weight' => 'decimal:2',
        'is_optional' => 'boolean',
    ];

    // ── Relationships ──

    public function examTerm(): BelongsTo
    {
        return $this->belongsTo(ExamTerm::class);
    }

    public function classModel(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(ExamComponent::class, 'component_id');
    }

    // ── Scopes ──

    public function scopeForExam($query, int $examTermId, int $classId)
    {
        return $query->where('exam_term_id', $examTermId)->where('class_id', $classId);
    }

    /**
     * Calculate the converted marks based on weight.
     * e.g. Written max=80, obtained=60, weight=1.0 → converted = 60
     * e.g. CT max=20, obtained=18, weight=0.5 → converted = 9
     */
    public function convertMarks(float $obtained): float
    {
        if ($this->max_marks <= 0) return 0;
        return round(($obtained / $this->max_marks) * ($this->max_marks * $this->weight), 2);
    }
}
