<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Result extends Model
{
    protected $fillable = [
        'exam_term_id', 'student_enrollment_id', 'total_marks', 'gpa', 'letter_grade',
        'position', 'total_students',
    ];

    protected $casts = [
        'total_marks' => 'decimal:2',
        'gpa' => 'decimal:2',
    ];
    

    public function examTerm(): BelongsTo
    {
        return $this->belongsTo(ExamTerm::class);
    }

    public function studentEnrollment(): BelongsTo
    {
        return $this->belongsTo(StudentEnrollment::class);
    }
}
