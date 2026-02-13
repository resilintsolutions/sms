<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Section;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SectionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Section::with(['class', 'shift']);
        if ($request->has('class_id')) {
            $query->where('class_id', $request->class_id);
        }
        $sections = $query->get();
        return response()->json(['success' => true, 'data' => $sections]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'class_id' => 'required|exists:classes,id',
            'shift_id' => 'nullable|exists:shifts,id',
            'name' => 'required|string|max:20',
            'capacity' => 'nullable|integer|min:0',
        ]);
        $section = Section::create($validated);
        return response()->json(['success' => true, 'data' => $section->load('class', 'shift')], 201);
    }

    public function show(Section $section): JsonResponse
    {
        $section->load(['class', 'shift', 'studentEnrollments.student']);
        return response()->json(['success' => true, 'data' => $section]);
    }

    public function update(Request $request, Section $section): JsonResponse
    {
        $validated = $request->validate([
            'shift_id' => 'nullable|exists:shifts,id',
            'name' => 'sometimes|string|max:20',
            'capacity' => 'nullable|integer|min:0',
        ]);
        $section->update($validated);
        return response()->json(['success' => true, 'data' => $section->load('class', 'shift')]);
    }

    public function destroy(Section $section): JsonResponse
    {
        $section->delete();
        return response()->json(['success' => true, 'message' => 'Section deleted']);
    }
}
