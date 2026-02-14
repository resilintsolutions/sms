<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class VerificationToken extends Model
{
    protected $fillable = [
        'institution_id', 'token', 'student_enrollment_id', 'academic_session_id',
        'exam_term_id', 'doc_type', 'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    // ── Relationships ──

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
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

    // ── Helpers ──

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    /**
     * Generate a unique token and create a record.
     */
    public static function generate(
        int $institutionId,
        int $enrollmentId,
        int $sessionId,
        ?int $examTermId = null,
        string $docType = 'result_card'
    ): self {
        return static::updateOrCreate(
            [
                'institution_id' => $institutionId,
                'student_enrollment_id' => $enrollmentId,
                'academic_session_id' => $sessionId,
                'exam_term_id' => $examTermId,
                'doc_type' => $docType,
            ],
            [
                'token' => Str::random(48),
                'expires_at' => now()->addYear(),
            ]
        );
    }
}
