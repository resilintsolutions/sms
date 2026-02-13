<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassModel extends Model
{
    protected $table = 'classes';

    protected $fillable = ['institution_id', 'name', 'numeric_order', 'group'];

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function sections(): HasMany
    {
        return $this->hasMany(Section::class, 'class_id');
    }

    public function classSubjects(): HasMany
    {
        return $this->hasMany(ClassSubject::class, 'class_id');
    }

    public function feeStructures(): HasMany
    {
        return $this->hasMany(FeeStructure::class, 'class_id');
    }

    public function examRoutines(): HasMany
    {
        return $this->hasMany(ExamRoutine::class, 'class_id');
    }

    public function gradeRules(): HasMany
    {
        return $this->hasMany(GradeRule::class, 'class_id');
    }
}
