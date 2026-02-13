<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GradeRule extends Model
{
    protected $fillable = ['institution_id', 'class_id', 'letter_grade', 'grade_point', 'min_marks', 'max_marks'];

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function class(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id');
    }

    public static function getGradeForMarks(int $marks, ?int $classId, int $institutionId): ?array
    {
        $query = static::where('institution_id', $institutionId)
            ->where('min_marks', '<=', $marks)
            ->where('max_marks', '>=', $marks);
        if ($classId) {
            $query->where(function ($q) use ($classId) {
                $q->where('class_id', $classId)->orWhereNull('class_id');
            });
        }
        $rule = $query->orderByDesc('class_id')->first();
        return $rule ? ['letter_grade' => $rule->letter_grade, 'grade_point' => $rule->grade_point] : null;
    }
}
