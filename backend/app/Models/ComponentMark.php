<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComponentMark extends Model
{
    protected $fillable = [
        'exam_term_id', 'student_enrollment_id', 'subject_id', 'component_id',
        'marks_obtained', 'max_marks', 'absent_code', 'entered_by',
    ];

    protected $casts = [
        'marks_obtained' => 'decimal:2',
        'max_marks' => 'integer',
    ];

    // ── Relationships ──

    public function examTerm(): BelongsTo
    {
        return $this->belongsTo(ExamTerm::class);
    }

    public function studentEnrollment(): BelongsTo
    {
        return $this->belongsTo(StudentEnrollment::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(ExamComponent::class, 'component_id');
    }

    public function enteredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'entered_by');
    }

    // ── Helpers ──

    public function isAbsent(): bool
    {
        return $this->absent_code !== null || $this->marks_obtained === null;
    }
}
