<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudentEnrollment extends Model
{
    protected $fillable = ['student_id', 'section_id', 'academic_session_id', 'roll_no'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function studentAttendances(): HasMany
    {
        return $this->hasMany(StudentAttendance::class, 'student_enrollment_id');
    }

    public function marks(): HasMany
    {
        return $this->hasMany(Mark::class, 'student_enrollment_id');
    }

    public function results(): HasMany
    {
        return $this->hasMany(Result::class, 'student_enrollment_id');
    }

    // ── New: Result Card Module relationships ──

    public function componentMarks(): HasMany
    {
        return $this->hasMany(ComponentMark::class, 'student_enrollment_id');
    }

    public function resultSummaries(): HasMany
    {
        return $this->hasMany(ResultSummary::class, 'student_enrollment_id');
    }

    public function attendanceSummaries(): HasMany
    {
        return $this->hasMany(AttendanceSummary::class, 'student_enrollment_id');
    }

    public function behaviorRecords(): HasMany
    {
        return $this->hasMany(BehaviorRecord::class, 'student_enrollment_id');
    }

    public function coCurricularRecords(): HasMany
    {
        return $this->hasMany(CoCurricularRecord::class, 'student_enrollment_id');
    }

    public function teacherRemarks(): HasMany
    {
        return $this->hasMany(TeacherRemark::class, 'student_enrollment_id');
    }

    public function verificationTokens(): HasMany
    {
        return $this->hasMany(VerificationToken::class, 'student_enrollment_id');
    }
}
