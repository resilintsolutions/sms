<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BehaviorRecord extends Model
{
    protected $fillable = [
        'student_enrollment_id', 'academic_session_id', 'exam_term_id',
        'category', 'rating', 'note', 'recorded_by',
    ];

    public function studentEnrollment(): BelongsTo
    {
        return $this->belongsTo(StudentEnrollment::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function examTerm(): BelongsTo
    {
        return $this->belongsTo(ExamTerm::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /**
     * Human-readable rating label.
     */
    public function getRatingLabelAttribute(): string
    {
        return match ($this->rating) {
            'excellent' => 'Excellent',
            'very_good' => 'Very Good',
            'good' => 'Good',
            'satisfactory' => 'Satisfactory',
            'needs_improvement' => 'Needs Improvement',
            default => ucfirst($this->rating),
        };
    }
}
