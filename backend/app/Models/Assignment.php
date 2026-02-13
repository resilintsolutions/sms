<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assignment extends Model
{
    protected $fillable = [
        'institution_id', 'academic_session_id', 'class_id', 'section_id',
        'subject_id', 'created_by', 'title', 'title_bn', 'description',
        'description_bn', 'type', 'total_marks', 'due_date', 'start_time',
        'end_time', 'scope', 'status', 'attachments',
    ];

    protected function casts(): array
    {
        return [
            'total_marks' => 'integer',
            'due_date' => 'date',
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'attachments' => 'array',
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

    public function classModel(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function targetStudents(): HasMany
    {
        return $this->hasMany(AssignmentStudent::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(AssignmentSubmission::class);
    }
}
