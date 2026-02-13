<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClassRoutine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClassRoutineController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ClassRoutine::with(['class', 'section', 'subject', 'teacher', 'academicSession']);

        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }
        if ($request->has('academic_session_id')) {
            $query->where('academic_session_id', $request->academic_session_id);
        }
        if ($request->has('class_id')) {
            $query->where('class_id', $request->class_id);
        }
        if ($request->has('section_id')) {
            $query->where('section_id', $request->section_id);
        }
        if ($request->has('day')) {
            $query->where('day', $request->day);
        }

        $routines = $query->orderBy('day')
            ->orderBy('period_number')
            ->orderBy('start_time')
            ->get();

        return response()->json(['success' => true, 'data' => $routines]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'class_id' => 'required|exists:classes,id',
            'section_id' => 'required|exists:sections,id',
            'subject_id' => 'required|exists:subjects,id',
            'teacher_id' => 'nullable|exists:employees,id',
            'day' => 'required|in:saturday,sunday,monday,tuesday,wednesday,thursday',
            'period_number' => 'required|integer|min:1|max:12',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'room' => 'nullable|string|max:50',
        ]);

        $routine = ClassRoutine::create($validated);
        $routine->load(['class', 'section', 'subject', 'teacher']);

        return response()->json(['success' => true, 'data' => $routine], 201);
    }

    public function show(ClassRoutine $classRoutine): JsonResponse
    {
        $classRoutine->load(['class', 'section', 'subject', 'teacher', 'academicSession']);
        return response()->json(['success' => true, 'data' => $classRoutine]);
    }

    public function update(Request $request, ClassRoutine $classRoutine): JsonResponse
    {
        $validated = $request->validate([
            'subject_id' => 'sometimes|exists:subjects,id',
            'teacher_id' => 'nullable|exists:employees,id',
            'day' => 'sometimes|in:saturday,sunday,monday,tuesday,wednesday,thursday',
            'period_number' => 'sometimes|integer|min:1|max:12',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i',
            'room' => 'nullable|string|max:50',
        ]);

        $classRoutine->update($validated);
        $classRoutine->load(['class', 'section', 'subject', 'teacher']);

        return response()->json(['success' => true, 'data' => $classRoutine]);
    }

    public function destroy(ClassRoutine $classRoutine): JsonResponse
    {
        $classRoutine->delete();
        return response()->json(['success' => true, 'message' => 'Class routine entry deleted']);
    }

    /**
     * Bulk store / replace routine entries for a section + session.
     * Deletes existing entries for the given section & session, then inserts all new ones.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'class_id' => 'required|exists:classes,id',
            'section_id' => 'required|exists:sections,id',
            'entries' => 'required|array|min:1',
            'entries.*.subject_id' => 'required|exists:subjects,id',
            'entries.*.teacher_id' => 'nullable|exists:employees,id',
            'entries.*.day' => 'required|in:saturday,sunday,monday,tuesday,wednesday,thursday',
            'entries.*.period_number' => 'required|integer|min:1|max:12',
            'entries.*.start_time' => 'required|date_format:H:i',
            'entries.*.end_time' => 'required|date_format:H:i',
            'entries.*.room' => 'nullable|string|max:50',
        ]);

        // Delete existing entries
        ClassRoutine::where('section_id', $request->section_id)
            ->where('academic_session_id', $request->academic_session_id)
            ->delete();

        // Insert new entries
        $created = [];
        foreach ($request->entries as $entry) {
            $created[] = ClassRoutine::create([
                'institution_id' => $request->institution_id,
                'academic_session_id' => $request->academic_session_id,
                'class_id' => $request->class_id,
                'section_id' => $request->section_id,
                'subject_id' => $entry['subject_id'],
                'teacher_id' => $entry['teacher_id'] ?? null,
                'day' => $entry['day'],
                'period_number' => $entry['period_number'],
                'start_time' => $entry['start_time'],
                'end_time' => $entry['end_time'],
                'room' => $entry['room'] ?? null,
            ]);
        }

        $routines = ClassRoutine::with(['class', 'section', 'subject', 'teacher'])
            ->where('section_id', $request->section_id)
            ->where('academic_session_id', $request->academic_session_id)
            ->orderBy('day')
            ->orderBy('period_number')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $routines,
            'message' => count($created) . ' routine entries saved',
        ], 201);
    }
}
