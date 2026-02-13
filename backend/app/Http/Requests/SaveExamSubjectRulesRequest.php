<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveExamSubjectRulesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole(['admin', 'super_admin']);
    }

    public function rules(): array
    {
        return [
            'exam_term_id' => 'required|exists:exam_terms,id',
            'class_id' => 'required|exists:classes,id',
            'rules' => 'required|array|min:1',
            'rules.*.subject_id' => 'required|exists:subjects,id',
            'rules.*.component_id' => 'required|exists:exam_components,id',
            'rules.*.max_marks' => 'required|integer|min:1|max:1000',
            'rules.*.weight' => 'nullable|numeric|min:0|max:10',
            'rules.*.is_optional' => 'nullable|boolean',
        ];
    }
}
