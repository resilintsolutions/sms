<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveResultConfigRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole(['admin', 'super_admin']);
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:150',
            'academic_session_id' => 'nullable|exists:academic_sessions,id',
            'class_id' => 'nullable|exists:classes,id',
            'fail_criteria' => 'required|in:any_subject_below_pass,gpa_below_threshold,fail_count_exceeds,custom',
            'pass_marks_percent' => 'nullable|numeric|min:0|max:100',
            'min_gpa' => 'nullable|numeric|min:0|max:5',
            'max_fail_subjects' => 'nullable|integer|min:0|max:20',
            'use_component_marks' => 'nullable|boolean',
            'custom_rules' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ];
    }
}
