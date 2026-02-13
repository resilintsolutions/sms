<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GradeRule;
use App\Models\Mark;
use App\Models\Result;
use App\Models\StudentEnrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MarksController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'exam_term_id' => 'required|exists:exam_terms,id',
            'section_id' => 'required|exists:sections,id',
            'subject_id' => 'required|exists:subjects,id',
        ]);
        $enrollments = StudentEnrollment::where('section_id', $request->section_id)->with('student')->get();
        $marks = Mark::where('exam_term_id', $request->exam_term_id)
            ->where('subject_id', $request->subject_id)
            ->whereIn('student_enrollment_id', $enrollments->pluck('id'))
            ->get()
            ->keyBy('student_enrollment_id');
        $data = $enrollments->map(function ($e) use ($marks) {
            $m = $marks->get($e->id);
            return [
                'student_enrollment_id' => $e->id,
                'student' => $e->student,
                'roll_no' => $e->roll_no,
                'marks_obtained' => $m?->marks_obtained,
                'full_marks' => $m?->full_marks ?? 100,
                'absent_code' => $m?->absent_code,
            ];
        });
        return response()->json(['success' => true, 'data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'exam_term_id' => 'required|exists:exam_terms,id',
            'subject_id' => 'required|exists:subjects,id',
            'marks' => 'required|array',
            'marks.*.student_enrollment_id' => 'required|exists:student_enrollments,id',
            'marks.*.marks_obtained' => 'nullable|numeric|min:0',
            'marks.*.full_marks' => 'required|integer|min:1',
            'marks.*.absent_code' => 'nullable|string|max:10',
        ]);
        $userId = $request->user()?->id;
        foreach ($validated['marks'] as $m) {
            Mark::updateOrCreate(
                [
                    'exam_term_id' => $validated['exam_term_id'],
                    'student_enrollment_id' => $m['student_enrollment_id'],
                    'subject_id' => $validated['subject_id'],
                ],
                [
                    'marks_obtained' => isset($m['absent_code']) ? null : ($m['marks_obtained'] ?? null),
                    'full_marks' => $m['full_marks'],
                    'absent_code' => $m['absent_code'] ?? null,
                    'entered_by' => $userId,
                ]
            );
        }
        return response()->json(['success' => true, 'message' => 'Marks saved']);
    }

    public function calculateResults(Request $request, int $examTermId): JsonResponse
    {
        $term = \App\Models\ExamTerm::with('examRoutines')->findOrFail($examTermId);
        $classIds = $term->examRoutines->pluck('class_id')->unique()->filter()->values();
        $sectionIds = \App\Models\Section::whereIn('class_id', $classIds)->pluck('id');
        $enrollments = StudentEnrollment::whereIn('section_id', $sectionIds)
            ->where('academic_session_id', $term->academic_session_id)
            ->get();

        foreach ($enrollments as $enrollment) {
            $marksList = Mark::where('exam_term_id', $examTermId)
                ->where('student_enrollment_id', $enrollment->id)
                ->get();
            $total = $marksList->sum(function ($m) {
                return $m->marks_obtained ?? 0;
            });
            $classId = $enrollment->section->class_id;
            $gradeInfo = GradeRule::getGradeForMarks((int) round($total), $classId, $term->institution_id);
            Result::updateOrCreate(
                ['exam_term_id' => $examTermId, 'student_enrollment_id' => $enrollment->id],
                [
                    'total_marks' => $total,
                    'gpa' => $gradeInfo ? $gradeInfo['grade_point'] : null,
                    'letter_grade' => $gradeInfo ? $gradeInfo['letter_grade'] : null,
                ]
            );
        }
        // Position
        $results = Result::where('exam_term_id', $examTermId)->orderByDesc('total_marks')->get();
        $position = 0;
        foreach ($results as $r) {
            $position++;
            $r->update(['position' => $position, 'total_students' => $results->count()]);
        }
        return response()->json(['success' => true, 'message' => 'Results calculated']);
    }
}
