<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subject extends Model
{
    protected $fillable = ['institution_id', 'name', 'name_bn', 'code', 'is_optional'];

    protected $casts = ['is_optional' => 'boolean'];
    

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function classSubjects(): HasMany
    {
        return $this->hasMany(ClassSubject::class);
    }

    public function teacherAssignments(): HasMany
    {
        return $this->hasMany(TeacherAssignment::class);
    }

    public function marks(): HasMany
    {
        return $this->hasMany(Mark::class);
    }
}
