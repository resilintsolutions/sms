<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherRemark extends Model
{
    protected $fillable = [
        'student_enrollment_id', 'exam_term_id', 'academic_session_id',
        'class_teacher_remark', 'principal_remark', 'guardian_comment', 'remarked_by',
    ];

    public function studentEnrollment(): BelongsTo
    {
        return $this->belongsTo(StudentEnrollment::class);
    }

    public function examTerm(): BelongsTo
    {
        return $this->belongsTo(ExamTerm::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function remarkedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'remarked_by');
    }
}
