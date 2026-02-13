<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBehaviorRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole(['admin', 'super_admin', 'teacher']);
    }

    public function rules(): array
    {
        return [
            'student_enrollment_id' => 'required|exists:student_enrollments,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'exam_term_id' => 'nullable|exists:exam_terms,id',
            'category' => 'required|in:discipline,punctuality,cleanliness,respect,participation,leadership,other',
            'rating' => 'required|in:excellent,very_good,good,satisfactory,needs_improvement',
            'note' => 'nullable|string|max:500',
        ];
    }
}
