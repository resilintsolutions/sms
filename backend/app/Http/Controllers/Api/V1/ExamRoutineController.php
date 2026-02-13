<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ExamRoutine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamRoutineController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ExamRoutine::with(['examTerm', 'class', 'subject']);

        if ($request->has('exam_term_id')) {
            $query->where('exam_term_id', $request->exam_term_id);
        }
        if ($request->has('class_id')) {
            $query->where('class_id', $request->class_id);
        }

        $routines = $query->orderBy('exam_date')->orderBy('start_time')->get();

        return response()->json(['success' => true, 'data' => $routines]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'exam_term_id' => 'required|exists:exam_terms,id',
            'class_id' => 'required|exists:classes,id',
            'subject_id' => 'required|exists:subjects,id',
            'exam_date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'full_marks' => 'nullable|integer|min:1',
        ]);

        $routine = ExamRoutine::create($validated);
        $routine->load(['examTerm', 'class', 'subject']);

        return response()->json(['success' => true, 'data' => $routine], 201);
    }

    public function show(ExamRoutine $examRoutine): JsonResponse
    {
        $examRoutine->load(['examTerm', 'class', 'subject']);
        return response()->json(['success' => true, 'data' => $examRoutine]);
    }

    public function update(Request $request, ExamRoutine $examRoutine): JsonResponse
    {
        $validated = $request->validate([
            'exam_term_id' => 'sometimes|exists:exam_terms,id',
            'class_id' => 'sometimes|exists:classes,id',
            'subject_id' => 'sometimes|exists:subjects,id',
            'exam_date' => 'sometimes|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'full_marks' => 'nullable|integer|min:1',
        ]);

        $examRoutine->update($validated);
        $examRoutine->load(['examTerm', 'class', 'subject']);

        return response()->json(['success' => true, 'data' => $examRoutine]);
    }

    public function destroy(ExamRoutine $examRoutine): JsonResponse
    {
        $examRoutine->delete();
        return response()->json(['success' => true, 'message' => 'Exam routine deleted']);
    }
}
