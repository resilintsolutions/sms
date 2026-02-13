<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExamTerm extends Model
{
    protected $fillable = [
        'institution_id', 'academic_session_id', 'name', 'name_bn', 'exam_type', 'weight',
        'start_date', 'end_date', 'publish_status',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'weight' => 'decimal:2',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function academicSession(): BelongsTo
    {
        return $this->belongsTo(AcademicSession::class);
    }

    public function examRoutines(): HasMany
    {
        return $this->hasMany(ExamRoutine::class);
    }

    public function marks(): HasMany
    {
        return $this->hasMany(Mark::class);
    }

    public function results(): HasMany
    {
        return $this->hasMany(Result::class);
    }

    // ── New: Result Card Module relationships ──

    public function examSubjectRules(): HasMany
    {
        return $this->hasMany(ExamSubjectRule::class);
    }

    public function componentMarks(): HasMany
    {
        return $this->hasMany(ComponentMark::class);
    }

    public function resultSummaries(): HasMany
    {
        return $this->hasMany(ResultSummary::class);
    }

    public function teacherRemarks(): HasMany
    {
        return $this->hasMany(TeacherRemark::class);
    }

    public function verificationTokens(): HasMany
    {
        return $this->hasMany(VerificationToken::class);
    }
}
