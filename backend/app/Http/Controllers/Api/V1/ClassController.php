<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClassController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ClassModel::with(['institution', 'sections.shift']);
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }
        $classes = $query->orderBy('numeric_order')->get();
        return response()->json(['success' => true, 'data' => $classes]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'name' => 'required|string|max:20',
            'numeric_order' => 'nullable|integer|min:0',
            'group' => 'nullable|string|max:50',
        ]);
        $validated['numeric_order'] = $validated['numeric_order'] ?? 0;
        $class = ClassModel::create($validated);
        return response()->json(['success' => true, 'data' => $class], 201);
    }

    public function show(ClassModel $class): JsonResponse
    {
        $class->load(['sections.shift', 'classSubjects.subject']);
        return response()->json(['success' => true, 'data' => $class]);
    }

    public function update(Request $request, ClassModel $class): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:20',
            'numeric_order' => 'nullable|integer|min:0',
            'group' => 'nullable|string|max:50',
        ]);
        $class->update($validated);
        return response()->json(['success' => true, 'data' => $class]);
    }

    public function destroy(ClassModel $class): JsonResponse
    {
        $class->delete();
        return response()->json(['success' => true, 'message' => 'Class deleted']);
    }
}
