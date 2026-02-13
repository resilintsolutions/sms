<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResultSummary extends Model
{
    protected $fillable = [
        'institution_id', 'academic_session_id', 'student_enrollment_id', 'exam_term_id',
        'total_marks', 'total_full_marks', 'percentage', 'gpa', 'letter_grade',
        'fail_count', 'position', 'total_students', 'status', 'promoted',
        'remarks', 'subject_grades',
    ];

    protected function casts(): array
    {
        return [
            'total_marks' => 'decimal:2',
            'total_full_marks' => 'decimal:2',
            'percentage' => 'decimal:2',
            'gpa' => 'decimal:2',
            'fail_count' => 'integer',
            'position' => 'integer',
            'total_students' => 'integer',
            'promoted' => 'boolean',
            'subject_grades' => 'array',
        ];
    }

    // ── Relationships ──

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function studentEnrollment(): BelongsTo
    {
        return $this->belongsTo(StudentEnrollment::class);
    }

    public function examTerm(): BelongsTo
    {
        return $this->belongsTo(ExamTerm::class);
    }

    // ── Helpers ──

    public function isPassed(): bool
    {
        return $this->status === 'pass';
    }

    public function isFailed(): bool
    {
        return $this->status === 'fail';
    }

    public function isPromoted(): bool
    {
        return $this->promoted;
    }
}
