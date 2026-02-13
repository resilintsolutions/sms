<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTeacherRemarkRequest extends FormRequest
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
            'class_teacher_remark' => 'nullable|string|max:1000',
            'principal_remark' => 'nullable|string|max:1000',
            'guardian_comment' => 'nullable|string|max:1000',
        ];
    }
}
