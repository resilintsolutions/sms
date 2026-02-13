<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ExamTerm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamTermController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ExamTerm::with(['academicSession', 'institution']);
        if ($request->has('academic_session_id')) {
            $query->where('academic_session_id', $request->academic_session_id);
        }
        $terms = $query->orderByDesc('start_date')->paginate($request->get('per_page', 15));
        return response()->json(['success' => true, 'data' => $terms]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'name' => 'required|string|max:100',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'publish_status' => 'in:draft,published',
        ]);
        $validated['publish_status'] = $validated['publish_status'] ?? 'draft';
        $term = ExamTerm::create($validated);
        return response()->json(['success' => true, 'data' => $term], 201);
    }

    public function show(ExamTerm $examTerm): JsonResponse
    {
        $examTerm->load('academicSession', 'examRoutines.subject');
        return response()->json(['success' => true, 'data' => $examTerm]);
    }

    public function update(Request $request, ExamTerm $examTerm): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'publish_status' => 'in:draft,published',
        ]);
        $examTerm->update($validated);
        return response()->json(['success' => true, 'data' => $examTerm]);
    }

    public function destroy(ExamTerm $examTerm): JsonResponse
    {
        $examTerm->delete();
        return response()->json(['success' => true, 'message' => 'Exam term deleted']);
    }
}
