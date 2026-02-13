<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\ClassRoutine;
use App\Models\ExamRoutine;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\StudyMaterial;
use App\Models\TeacherAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortalController extends Controller
{
    /** Student portal: get student by student_id (e.g. STU-24-00001) with profile, enrollments, attendance summary, results, invoices, notices */
    public function student(Request $request): JsonResponse
    {
        $request->validate(['student_id' => 'required|string']);
        $student = Student::with(['guardians', 'enrollments.section.class', 'enrollments.academicSession'])
            ->where('student_id', $request->student_id)
            ->first();
        if (!$student) {
            return response()->json(['success' => false, 'message' => 'Student not found'], 404);
        }
        $enrollmentIds = $student->enrollments->pluck('id');
        $attendance = StudentAttendance::whereIn('student_enrollment_id', $enrollmentIds)
            ->orderByDesc('date')
            ->limit(60)
            ->get();
        $results = \App\Models\Result::whereIn('student_enrollment_id', $enrollmentIds)
            ->with('examTerm')
            ->orderByDesc('exam_term_id')
            ->limit(10)
            ->get();
        $invoices = \App\Models\Invoice::where('student_id', $student->id)
            ->with('academicSession')
            ->orderByDesc('id')
            ->limit(20)
            ->get();
        $notices = \App\Models\Notice::where('is_published', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderByDesc('published_at')
            ->limit(10)
            ->get(['id', 'title', 'title_bn', 'body', 'published_at']);
        return response()->json([
            'success' => true,
            'data' => [
                'student' => $student,
                'attendance' => $attendance,
                'results' => $results,
                'invoices' => $invoices,
                'notices' => $notices,
            ],
        ]);
    }

    /** Parent portal: get students linked to authenticated guardian */
    public function parentStudents(Request $request): JsonResponse
    {
        $guardian = Guardian::where('user_id', $request->user()->id)
            ->with(['students' => fn ($q) => $q->with('enrollments.section.class', 'enrollments.academicSession')])
            ->first();
        if (!$guardian) {
            return response()->json(['success' => true, 'data' => []]);
        }
        return response()->json(['success' => true, 'data' => $guardian->students]);
    }

    /** Parent portal: get one child's details (same as student portal for that student) */
    public function parentStudentDetail(Request $request, int $studentId): JsonResponse
    {
        // Verify the student belongs to this parent's guardian record
        $guardian = Guardian::where('user_id', $request->user()->id)->first();
        if (!$guardian) {
            return response()->json(['success' => false, 'message' => 'Guardian record not found'], 404);
        }
        if (!$guardian->students()->where('students.id', $studentId)->exists()) {
            return response()->json(['success' => false, 'message' => 'Not authorized to view this student'], 403);
        }

        $student = Student::with(['guardians', 'enrollments.section.class', 'enrollments.academicSession'])
            ->find($studentId);
        if (!$student) {
            return response()->json(['success' => false, 'message' => 'Student not found'], 404);
        }
        $enrollmentIds = $student->enrollments->pluck('id');
        $attendance = StudentAttendance::whereIn('student_enrollment_id', $enrollmentIds)
            ->orderByDesc('date')
            ->limit(60)
            ->get();
        $results = \App\Models\Result::whereIn('student_enrollment_id', $enrollmentIds)
            ->with('examTerm')
            ->orderByDesc('exam_term_id')
            ->limit(10)
            ->get();
        $invoices = \App\Models\Invoice::where('student_id', $student->id)
            ->with('academicSession')
            ->orderByDesc('id')
            ->limit(20)
            ->get();
        $notices = \App\Models\Notice::where('is_published', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderByDesc('published_at')
            ->limit(10)
            ->get(['id', 'title', 'title_bn', 'body', 'published_at']);
        return response()->json([
            'success' => true,
            'data' => [
                'student' => $student,
                'attendance' => $attendance,
                'results' => $results,
                'invoices' => $invoices,
                'notices' => $notices,
            ],
        ]);
    }

    /** Teacher portal: get assignments (sections/subjects) for an employee. For demo, pass employee_id or return all if none. */
    public function teacherAssignments(Request $request): JsonResponse
    {
        $query = TeacherAssignment::with(['section.class', 'section.shift', 'subject', 'academicSession']);
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        $assignments = $query->orderBy('academic_session_id')->get();
        return response()->json(['success' => true, 'data' => $assignments]);
    }

    // ════════════════════════════════════════════════════════════════
    // PARENT PORTAL — Extended Endpoints
    // ════════════════════════════════════════════════════════════════

    /**
     * Helper: get guardian + validate child ownership, return child's enrollment info.
     */
    private function resolveParentChild(Request $request): array
    {
        $request->validate(['student_id' => 'required|integer']);

        $guardian = Guardian::where('user_id', $request->user()->id)->first();
        if (!$guardian) {
            return ['error' => response()->json(['success' => false, 'message' => 'Guardian record not found'], 404)];
        }
        $student = $guardian->students()->where('students.id', $request->student_id)->first();
        if (!$student) {
            return ['error' => response()->json(['success' => false, 'message' => 'Not authorized to view this student'], 403)];
        }

        $enrollment = $student->enrollments()->with('section.class')->latest()->first();
        return ['student' => $student, 'enrollment' => $enrollment, 'error' => null];
    }

    /** Parent portal: get class routines (timetable) for a child */
    public function parentClassRoutines(Request $request): JsonResponse
    {
        $resolved = $this->resolveParentChild($request);
        if ($resolved['error']) return $resolved['error'];

        $enrollment = $resolved['enrollment'];
        if (!$enrollment) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $routines = ClassRoutine::with(['subject', 'teacher', 'class', 'section'])
            ->where('class_id', $enrollment->section->class_id)
            ->where('section_id', $enrollment->section_id)
            ->where('academic_session_id', $enrollment->academic_session_id)
            ->orderBy('day')
            ->orderBy('period_number')
            ->orderBy('start_time')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $routines,
            'meta' => [
                'student_name' => $resolved['student']->name,
                'class' => $enrollment->section->class->name ?? null,
                'section' => $enrollment->section->name ?? null,
                'session_id' => $enrollment->academic_session_id,
            ],
        ]);
    }

    /** Parent portal: get exam routines for a child's class */
    public function parentExamRoutines(Request $request): JsonResponse
    {
        $resolved = $this->resolveParentChild($request);
        if ($resolved['error']) return $resolved['error'];

        $enrollment = $resolved['enrollment'];
        if (!$enrollment) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $routines = ExamRoutine::with(['examTerm', 'subject', 'class'])
            ->where('class_id', $enrollment->section->class_id)
            ->orderBy('exam_date')
            ->orderBy('start_time')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $routines,
            'meta' => [
                'student_name' => $resolved['student']->name,
                'class' => $enrollment->section->class->name ?? null,
            ],
        ]);
    }

    /** Parent portal: get published assignments for a child (read-only, with submission status) */
    public function parentAssignments(Request $request): JsonResponse
    {
        $resolved = $this->resolveParentChild($request);
        if ($resolved['error']) return $resolved['error'];

        $student = $resolved['student'];
        $enrollment = $resolved['enrollment'];
        if (!$enrollment) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $enrollmentIds = $student->enrollments()->pluck('id');
        $sectionIds = $student->enrollments()->with('section')->get()->pluck('section_id')->unique()->filter();
        $classIds = $student->enrollments()->with('section.class')->get()
            ->map(fn($e) => $e->section?->class_id)->unique()->filter();

        $assignments = Assignment::with(['classModel', 'section', 'subject', 'creator:id,name,name_bn'])
            ->where('status', 'published')
            ->where(function ($q) use ($classIds, $sectionIds, $enrollmentIds) {
                $q->where(function ($q2) use ($classIds) {
                    $q2->where('scope', 'class')->whereIn('class_id', $classIds);
                })->orWhere(function ($q2) use ($sectionIds) {
                    $q2->where('scope', 'section')->whereIn('section_id', $sectionIds);
                })->orWhere(function ($q2) use ($enrollmentIds) {
                    $q2->where('scope', 'individual')
                        ->whereHas('targetStudents', function ($q3) use ($enrollmentIds) {
                            $q3->whereIn('student_enrollment_id', $enrollmentIds);
                        });
                });
            })
            ->orderByDesc('created_at')
            ->get();

        // Attach submission status
        $submissions = AssignmentSubmission::whereIn('assignment_id', $assignments->pluck('id'))
            ->whereIn('student_enrollment_id', $enrollmentIds)
            ->get()
            ->keyBy('assignment_id');

        $result = $assignments->map(function ($a) use ($submissions) {
            $arr = $a->toArray();
            $sub = $submissions->get($a->id);
            $arr['submission'] = $sub ? [
                'id' => $sub->id,
                'status' => $sub->status,
                'marks_obtained' => $sub->marks_obtained,
                'feedback' => $sub->feedback,
                'submitted_at' => $sub->submitted_at,
                'graded_at' => $sub->graded_at,
            ] : null;
            return $arr;
        });

        return response()->json(['success' => true, 'data' => $result]);
    }

    /** Parent portal: get published study materials for a child's class */
    public function parentStudyMaterials(Request $request): JsonResponse
    {
        $resolved = $this->resolveParentChild($request);
        if ($resolved['error']) return $resolved['error'];

        $enrollment = $resolved['enrollment'];
        if (!$enrollment) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $materials = StudyMaterial::with(['subject', 'creator', 'classModel'])
            ->where('status', 'published')
            ->where('is_public', true)
            ->where('class_id', $enrollment->section->class_id)
            ->where(function ($q) use ($enrollment) {
                $q->whereNull('section_id')
                  ->orWhere('section_id', $enrollment->section_id);
            })
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['success' => true, 'data' => $materials]);
    }
}
