<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClassSubject extends Model
{
    protected $fillable = ['class_id', 'subject_id', 'full_marks', 'pass_marks', 'weight', 'is_optional'];

    protected $casts = [
        'full_marks' => 'integer',
        'pass_marks' => 'integer',
        'weight' => 'float',
        'is_optional' => 'boolean',
    ];
    

    public function class(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }
}
