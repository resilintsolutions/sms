<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LessonPlan extends Model
{
    protected $fillable = [
        'institution_id', 'academic_session_id', 'class_id', 'section_id',
        'subject_id', 'created_by', 'title', 'title_bn', 'objective',
        'objective_bn', 'content', 'content_bn', 'teaching_method',
        'resources', 'assessment', 'homework', 'plan_date',
        'duration_minutes', 'topic', 'topic_bn', 'week_number', 'status',
    ];

    protected $casts = [
        'plan_date' => 'date',
        'duration_minutes' => 'integer',
        'week_number' => 'integer',
    ];
    

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
}
