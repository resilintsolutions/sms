<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExamComponentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole(['admin', 'super_admin']);
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:100',
            'name_bn' => 'nullable|string|max:100',
            'short_code' => 'nullable|string|max:20',
            'sort_order' => 'nullable|integer|min:0|max:255',
            'is_active' => 'nullable|boolean',
        ];
    }
}
