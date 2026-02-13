<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceSummary extends Model
{
    protected $fillable = [
        'student_enrollment_id', 'academic_session_id', 'exam_term_id',
        'total_days', 'present_days', 'absent_days', 'late_days', 'leave_days',
        'attendance_percent',
    ];

    protected function casts(): array
    {
        return [
            'total_days' => 'integer',
            'present_days' => 'integer',
            'absent_days' => 'integer',
            'late_days' => 'integer',
            'leave_days' => 'integer',
            'attendance_percent' => 'decimal:2',
        ];
    }

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
}
