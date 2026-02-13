<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Subject::with('institution');
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }
        $subjects = $query->get();
        return response()->json(['success' => true, 'data' => $subjects]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'name' => 'required|string|max:100',
            'name_bn' => 'nullable|string|max:100',
            'code' => 'nullable|string|max:20',
            'is_optional' => 'boolean',
        ]);
        $validated['is_optional'] = $validated['is_optional'] ?? false;
        $subject = Subject::create($validated);
        return response()->json(['success' => true, 'data' => $subject], 201);
    }

    public function show(Subject $subject): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $subject]);
    }

    public function update(Request $request, Subject $subject): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'name_bn' => 'nullable|string|max:100',
            'code' => 'nullable|string|max:20',
            'is_optional' => 'boolean',
        ]);
        $subject->update($validated);
        return response()->json(['success' => true, 'data' => $subject]);
    }
}
