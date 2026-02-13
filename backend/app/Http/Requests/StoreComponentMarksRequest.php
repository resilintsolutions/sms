<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreComponentMarksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole(['admin', 'super_admin', 'teacher']);
    }

    public function rules(): array
    {
        return [
            'exam_term_id' => 'required|exists:exam_terms,id',
            'subject_id' => 'required|exists:subjects,id',
            'component_id' => 'required|exists:exam_components,id',
            'marks' => 'required|array|min:1',
            'marks.*.student_enrollment_id' => 'required|exists:student_enrollments,id',
            'marks.*.marks_obtained' => 'nullable|numeric|min:0',
            'marks.*.max_marks' => 'required|integer|min:1',
            'marks.*.absent_code' => 'nullable|string|max:10',
        ];
    }

    public function messages(): array
    {
        return [
            'marks.*.marks_obtained.min' => 'Marks cannot be negative.',
            'marks.*.max_marks.required' => 'Max/full marks is required for each entry.',
        ];
    }
}
