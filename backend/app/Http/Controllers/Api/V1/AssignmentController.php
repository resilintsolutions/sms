<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentStudent;
use App\Models\AssignmentSubmission;
use App\Models\StudentEnrollment;
use App\Models\TeacherAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    /**
     * List assignments — filtered by role context.
     * Admin sees all, teacher sees own, student sees assigned-to-them.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Assignment::with(['classModel', 'section', 'subject', 'creator:id,name,name_bn'])
            ->withCount('submissions');

        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }
        if ($request->filled('section_id')) {
            $query->where(function ($q) use ($request) {
                $q->where('section_id', $request->section_id)->orWhereNull('section_id');
            });
        }
        if ($request->filled('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }

        $assignments = $query->orderByDesc('created_at')->paginate($request->get('per_page', 50));
        return response()->json(['success' => true, 'data' => $assignments]);
    }

    /**
     * Create a new assignment/quiz.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'institution_id' => 'required|exists:institutions,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'class_id' => 'required|exists:classes,id',
            'section_id' => 'nullable|exists:sections,id',
            'subject_id' => 'required|exists:subjects,id',
            'title' => 'required|string|max:200',
            'title_bn' => 'nullable|string|max:200',
            'description' => 'nullable|string',
            'description_bn' => 'nullable|string',
            'type' => 'required|in:assignment,quiz,homework,project',
            'total_marks' => 'required|integer|min:1',
            'due_date' => 'nullable|date',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date',
            'scope' => 'required|in:class,section,individual',
            'status' => 'in:draft,published',
            'student_enrollment_ids' => 'array', // for individual scope
            'student_enrollment_ids.*' => 'exists:student_enrollments,id',
        ]);

        $validated['created_by'] = $request->user()->id;
        $validated['status'] = $validated['status'] ?? 'draft';

        $studentIds = $validated['student_enrollment_ids'] ?? [];
        unset($validated['student_enrollment_ids']);

        $assignment = Assignment::create($validated);

        // If individual scope, link specific students
        if ($validated['scope'] === 'individual' && !empty($studentIds)) {
            foreach ($studentIds as $enrollmentId) {
                AssignmentStudent::create([
                    'assignment_id' => $assignment->id,
                    'student_enrollment_id' => $enrollmentId,
                ]);
            }
        }

        $assignment->load(['classModel', 'section', 'subject', 'creator:id,name,name_bn']);
        return response()->json(['success' => true, 'data' => $assignment], 201);
    }

    /**
     * Show single assignment with submissions.
     */
    public function show(Assignment $assignment): JsonResponse
    {
        $assignment->load([
            'classModel', 'section', 'subject', 'creator:id,name,name_bn',
            'targetStudents.studentEnrollment.student:id,name,name_bn,student_id',
            'submissions.studentEnrollment.student:id,name,name_bn,student_id',
        ]);
        return response()->json(['success' => true, 'data' => $assignment]);
    }

    /**
     * Update assignment.
     */
    public function update(Request $request, Assignment $assignment): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:200',
            'title_bn' => 'nullable|string|max:200',
            'description' => 'nullable|string',
            'description_bn' => 'nullable|string',
            'type' => 'sometimes|in:assignment,quiz,homework,project',
            'total_marks' => 'sometimes|integer|min:1',
            'due_date' => 'nullable|date',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date',
            'scope' => 'sometimes|in:class,section,individual',
            'status' => 'sometimes|in:draft,published,closed',
            'section_id' => 'nullable|exists:sections,id',
            'student_enrollment_ids' => 'array',
            'student_enrollment_ids.*' => 'exists:student_enrollments,id',
        ]);

        $studentIds = $validated['student_enrollment_ids'] ?? null;
        unset($validated['student_enrollment_ids']);

        $assignment->update($validated);

        // Update individual targets if provided
        if ($studentIds !== null) {
            AssignmentStudent::where('assignment_id', $assignment->id)->delete();
            foreach ($studentIds as $enrollmentId) {
                AssignmentStudent::create([
                    'assignment_id' => $assignment->id,
                    'student_enrollment_id' => $enrollmentId,
                ]);
            }
        }

        $assignment->load(['classModel', 'section', 'subject']);
        return response()->json(['success' => true, 'data' => $assignment]);
    }

    /**
     * Delete assignment.
     */
    public function destroy(Assignment $assignment): JsonResponse
    {
        $assignment->delete();
        return response()->json(['success' => true, 'message' => 'Assignment deleted']);
    }

    /**
     * Teacher: Get assignments for their own classes/subjects.
     */
    public function teacherAssignments(Request $request): JsonResponse
    {
        $user = $request->user();
        $employee = $user->employee;

        if (!$employee) {
            return response()->json(['success' => true, 'data' => []]);
        }

        // Get sections and subjects this teacher is assigned to
        $teacherAssignments = TeacherAssignment::where('employee_id', $employee->id)
            ->with(['section.class'])
            ->get();

        $sectionIds = $teacherAssignments->pluck('section_id')->unique()->filter()->values();
        $subjectIds = $teacherAssignments->pluck('subject_id')->unique()->filter()->values();

        $query = Assignment::with(['classModel', 'section', 'subject', 'creator:id,name,name_bn'])
            ->withCount('submissions')
            ->where('created_by', $user->id);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $assignments = $query->orderByDesc('created_at')->get();

        return response()->json(['success' => true, 'data' => $assignments]);
    }

    /**
     * Student: Get assignments assigned to this student.
     */
    public function studentAssignments(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;

        if (!$student) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $enrollmentIds = $student->enrollments()->pluck('id');
        $enrollments = $student->enrollments()->with('section.class')->get();
        $sectionIds = $enrollments->pluck('section_id')->unique()->filter()->values();
        $classIds = $enrollments->map(fn($e) => $e->section?->class_id)->unique()->filter()->values();

        // Assignments where: (scope=class AND class matches) OR
        //                     (scope=section AND section matches) OR
        //                     (scope=individual AND student is in assignment_students)
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

        // Attach submission status for each assignment
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

    /**
     * Student: Submit an assignment answer.
     */
    public function submitAssignment(Request $request, Assignment $assignment): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;
        if (!$student) {
            return response()->json(['success' => false, 'message' => 'Student profile not found'], 404);
        }

        $enrollment = $student->enrollments()->first();
        if (!$enrollment) {
            return response()->json(['success' => false, 'message' => 'No enrollment found'], 404);
        }

        $validated = $request->validate([
            'answer' => 'nullable|string',
        ]);

        $isLate = $assignment->due_date && now()->gt($assignment->due_date);

        $submission = AssignmentSubmission::updateOrCreate(
            [
                'assignment_id' => $assignment->id,
                'student_enrollment_id' => $enrollment->id,
            ],
            [
                'answer' => $validated['answer'] ?? null,
                'status' => $isLate ? 'late' : 'submitted',
                'submitted_at' => now(),
            ]
        );

        return response()->json(['success' => true, 'data' => $submission]);
    }

    /**
     * Teacher: Grade a submission.
     */
    public function gradeSubmission(Request $request, AssignmentSubmission $submission): JsonResponse
    {
        $validated = $request->validate([
            'marks_obtained' => 'required|numeric|min:0',
            'feedback' => 'nullable|string',
        ]);

        $submission->update([
            'marks_obtained' => $validated['marks_obtained'],
            'feedback' => $validated['feedback'] ?? null,
            'status' => 'graded',
            'graded_by' => $request->user()->id,
            'graded_at' => now(),
        ]);

        $submission->load('studentEnrollment.student:id,name,name_bn,student_id');
        return response()->json(['success' => true, 'data' => $submission]);
    }

    /**
     * Teacher: Get all submissions for an assignment.
     */
    public function submissions(Request $request, Assignment $assignment): JsonResponse
    {
        $assignment->load([
            'classModel', 'section', 'subject',
        ]);

        // Get all eligible students
        $query = StudentEnrollment::with('student:id,name,name_bn,student_id');

        if ($assignment->scope === 'individual') {
            $targetIds = $assignment->targetStudents()->pluck('student_enrollment_id');
            $query->whereIn('id', $targetIds);
        } elseif ($assignment->section_id) {
            $query->where('section_id', $assignment->section_id);
        } else {
            $sectionIds = \App\Models\Section::where('class_id', $assignment->class_id)->pluck('id');
            $query->whereIn('section_id', $sectionIds);
        }

        $enrollments = $query->get();
        $submissions = AssignmentSubmission::where('assignment_id', $assignment->id)
            ->whereIn('student_enrollment_id', $enrollments->pluck('id'))
            ->get()
            ->keyBy('student_enrollment_id');

        $data = $enrollments->map(function ($e) use ($submissions) {
            $sub = $submissions->get($e->id);
            return [
                'student_enrollment_id' => $e->id,
                'student' => $e->student,
                'roll_no' => $e->roll_no,
                'submission' => $sub,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'assignment' => $assignment,
                'students' => $data,
            ],
        ]);
    }

    /**
     * Admin: Manage class-subject associations.
     */
    public function classSubjects(Request $request): JsonResponse
    {
        $query = \App\Models\ClassSubject::with(['class', 'subject']);
        if ($request->filled('class_id')) {
            $query->where('class_id', $request->class_id);
        }
        $data = $query->get();
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Admin: Add/update class-subject association.
     */
    public function classSubjectStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'class_id' => 'required|exists:classes,id',
            'subject_id' => 'required|exists:subjects,id',
            'full_marks' => 'required|integer|min:1',
            'pass_marks' => 'required|integer|min:0',
            'weight' => 'nullable|numeric',
            'is_optional' => 'boolean',
        ]);

        $cs = \App\Models\ClassSubject::updateOrCreate(
            ['class_id' => $validated['class_id'], 'subject_id' => $validated['subject_id']],
            [
                'full_marks' => $validated['full_marks'],
                'pass_marks' => $validated['pass_marks'],
                'weight' => $validated['weight'] ?? 1.0,
                'is_optional' => $validated['is_optional'] ?? false,
            ]
        );
        $cs->load(['class', 'subject']);
        return response()->json(['success' => true, 'data' => $cs], 201);
    }

    /**
     * Admin: Remove class-subject association.
     */
    public function classSubjectDestroy(int $id): JsonResponse
    {
        $cs = \App\Models\ClassSubject::findOrFail($id);
        $cs->delete();
        return response()->json(['success' => true, 'message' => 'Class-subject removed']);
    }

    /**
     * Admin: List teacher assignments.
     */
    public function teacherAssignmentsList(Request $request): JsonResponse
    {
        $query = TeacherAssignment::with([
            'employee:id,name,name_bn,employee_id,designation',
            'section.class',
            'subject',
            'academicSession:id,name',
        ]);

        if ($request->filled('academic_session_id')) {
            $query->where('academic_session_id', $request->academic_session_id);
        }
        if ($request->filled('section_id')) {
            $query->where('section_id', $request->section_id);
        }
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        $data = $query->get();
        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Admin: Create teacher assignment (assign teacher to class-section-subject).
     */
    public function teacherAssignmentStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'section_id' => 'required|exists:sections,id',
            'subject_id' => 'required|exists:subjects,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'is_class_teacher' => 'boolean',
        ]);

        $ta = TeacherAssignment::updateOrCreate(
            [
                'employee_id' => $validated['employee_id'],
                'section_id' => $validated['section_id'],
                'subject_id' => $validated['subject_id'],
                'academic_session_id' => $validated['academic_session_id'],
            ],
            [
                'is_class_teacher' => $validated['is_class_teacher'] ?? false,
            ]
        );
        $ta->load(['employee:id,name,name_bn,employee_id,designation', 'section.class', 'subject', 'academicSession:id,name']);
        return response()->json(['success' => true, 'data' => $ta], 201);
    }

    /**
     * Admin: Delete teacher assignment.
     */
    public function teacherAssignmentDestroy(int $id): JsonResponse
    {
        $ta = TeacherAssignment::findOrFail($id);
        $ta->delete();
        return response()->json(['success' => true, 'message' => 'Teacher assignment removed']);
    }

    /**
     * Get list of employees who are teachers.
     */
    public function teachers(Request $request): JsonResponse
    {
        $teachers = \App\Models\Employee::where('is_teacher', true)
            ->where('is_active', true)
            ->get(['id', 'name', 'name_bn', 'employee_id', 'designation', 'department']);
        return response()->json(['success' => true, 'data' => $teachers]);
    }
}
