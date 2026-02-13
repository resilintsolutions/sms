<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Mark;
use App\Models\Notice;
use App\Models\Payment;
use App\Models\Result;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\StudentEnrollment;
use App\Models\TeacherAssignment;
use App\Models\Employee;
use App\Models\ExamTerm;
use App\Models\Guardian;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /**
     * Student Report Card: marks per subject for a given exam term.
     * Auto-detects student from logged-in user if no student_id provided.
     */
    public function studentReportCard(Request $request): JsonResponse
    {
        $user = $request->user();

        // Resolve student
        $student = null;
        if ($request->filled('student_id')) {
            $student = Student::with(['enrollments.section.class', 'enrollments.academicSession', 'guardians'])->find($request->student_id);
        } else {
            $student = Student::with(['enrollments.section.class', 'enrollments.academicSession', 'guardians'])
                ->where('user_id', $user->id)->first();
        }

        if (!$student) {
            return response()->json(['success' => false, 'message' => 'Student not found'], 404);
        }

        $enrollmentIds = $student->enrollments->pluck('id');

        // Get available exam terms
        $examTermIds = Result::whereIn('student_enrollment_id', $enrollmentIds)->pluck('exam_term_id')->unique();
        $examTerms = ExamTerm::whereIn('id', $examTermIds)->orderBy('start_date')->get(['id', 'name', 'start_date', 'end_date']);

        // Build report card data per exam term
        $reportCards = [];
        foreach ($examTerms as $term) {
            $result = Result::where('exam_term_id', $term->id)
                ->whereIn('student_enrollment_id', $enrollmentIds)
                ->first();

            $marks = Mark::where('exam_term_id', $term->id)
                ->whereIn('student_enrollment_id', $enrollmentIds)
                ->with('subject')
                ->get()
                ->map(fn ($m) => [
                    'subject_name'   => $m->subject?->name ?? '—',
                    'subject_name_bn' => $m->subject?->name_bn ?? null,
                    'marks_obtained' => $m->marks_obtained,
                    'full_marks'     => $m->full_marks,
                    'percentage'     => $m->full_marks > 0 ? round(($m->marks_obtained / $m->full_marks) * 100, 1) : 0,
                ]);

            $reportCards[] = [
                'exam_term'     => ['id' => $term->id, 'name' => $term->name, 'start_date' => $term->start_date, 'end_date' => $term->end_date],
                'marks'         => $marks,
                'total_marks'   => $result?->total_marks ?? $marks->sum('marks_obtained'),
                'total_full'    => $marks->sum('full_marks'),
                'gpa'           => $result?->gpa,
                'letter_grade'  => $result?->letter_grade,
                'position'      => $result?->position,
                'total_students' => $result?->total_students,
            ];
        }

        // Current enrollment info
        $currentEnrollment = $student->enrollments
            ->sortByDesc(fn ($e) => $e->academicSession?->is_current ? 1 : 0)
            ->first();

        // Guardian info
        $father = $student->guardians->firstWhere('relation', 'father');
        $mother = $student->guardians->firstWhere('relation', 'mother');

        return response()->json([
            'success' => true,
            'data' => [
                'student' => [
                    'id'              => $student->id,
                    'student_id'      => $student->student_id,
                    'name'            => $student->name,
                    'name_bn'         => $student->name_bn,
                    'photo'           => $student->photo,
                    'gender'          => $student->gender,
                    'date_of_birth'   => $student->date_of_birth,
                    'blood_group'     => $student->blood_group,
                    'father_name'     => $father?->name,
                    'father_name_bn'  => $father?->name_bn,
                    'mother_name'     => $mother?->name,
                    'mother_name_bn'  => $mother?->name_bn,
                ],
                'enrollment' => $currentEnrollment ? [
                    'class_name'   => $currentEnrollment->section?->class?->name ?? '',
                    'section_name' => $currentEnrollment->section?->name ?? '',
                    'session_name' => $currentEnrollment->academicSession?->name ?? '',
                    'roll_no'      => $currentEnrollment->roll_no,
                ] : null,
                'report_cards' => $reportCards,
            ],
        ]);
    }

    /**
     * Student Attendance Detail: full attendance records for the student.
     * Auto-detects from logged-in user if no student_id provided.
     */
    public function studentAttendanceDetail(Request $request): JsonResponse
    {
        $user = $request->user();

        $student = null;
        if ($request->filled('student_id')) {
            $student = Student::with('enrollments.section.class', 'enrollments.academicSession')->find($request->student_id);
        } else {
            $student = Student::with('enrollments.section.class', 'enrollments.academicSession')
                ->where('user_id', $user->id)->first();
        }

        if (!$student) {
            return response()->json(['success' => false, 'message' => 'Student not found'], 404);
        }

        $currentEnrollment = $student->enrollments
            ->sortByDesc(fn ($e) => $e->academicSession?->is_current ? 1 : 0)
            ->first();

        $records = [];
        $summary = ['total' => 0, 'present' => 0, 'absent' => 0, 'late' => 0, 'leave' => 0];

        if ($currentEnrollment) {
            $attendance = StudentAttendance::where('student_enrollment_id', $currentEnrollment->id)
                ->orderByDesc('date')
                ->get(['date', 'status', 'remark']);

            $records = $attendance->map(fn ($a) => [
                'date'   => $a->date->format('Y-m-d'),
                'status' => $a->status,
                'remark' => $a->remark,
            ]);

            $summary['total']   = $attendance->count();
            $summary['present'] = $attendance->where('status', 'present')->count() + $attendance->where('status', 'late')->count();
            $summary['absent']  = $attendance->where('status', 'absent')->count();
            $summary['late']    = $attendance->where('status', 'late')->count();
            $summary['leave']   = $attendance->where('status', 'leave')->count();
            $summary['rate']    = $summary['total'] > 0 ? round(($summary['present'] / $summary['total']) * 100, 1) : 0;

            // Monthly breakdown
            $monthly = $attendance->groupBy(fn ($a) => $a->date->format('Y-m'))->map(function ($group, $month) {
                $total = $group->count();
                $present = $group->whereIn('status', ['present', 'late'])->count();
                return [
                    'month'   => $month,
                    'total'   => $total,
                    'present' => $present,
                    'absent'  => $group->where('status', 'absent')->count(),
                    'late'    => $group->where('status', 'late')->count(),
                    'leave'   => $group->where('status', 'leave')->count(),
                    'rate'    => $total > 0 ? round(($present / $total) * 100, 1) : 0,
                ];
            })->values();
        } else {
            $monthly = collect();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'student' => [
                    'id'         => $student->id,
                    'student_id' => $student->student_id,
                    'name'       => $student->name,
                    'name_bn'    => $student->name_bn,
                ],
                'enrollment' => $currentEnrollment ? [
                    'class_name'   => $currentEnrollment->section?->class?->name ?? '',
                    'section_name' => $currentEnrollment->section?->name ?? '',
                    'session_name' => $currentEnrollment->academicSession?->name ?? '',
                    'roll_no'      => $currentEnrollment->roll_no,
                ] : null,
                'records'  => $records,
                'summary'  => $summary,
                'monthly'  => $monthly ?? [],
            ],
        ]);
    }

    /**
     * Student Fee History: invoices + payments for a student.
     */
    public function studentFeeHistory(Request $request): JsonResponse
    {
        $user = $request->user();

        $student = null;
        if ($request->filled('student_id')) {
            $student = Student::find($request->student_id);
        } else {
            $student = Student::where('user_id', $user->id)->first();
        }

        if (!$student) {
            return response()->json(['success' => false, 'message' => 'Student not found'], 404);
        }

        $invoices = Invoice::where('student_id', $student->id)
            ->with(['academicSession', 'items.feeHead', 'payments'])
            ->orderByDesc('id')
            ->get();

        $totalAmount = $invoices->sum('total_amount');
        $totalPaid = $invoices->sum('paid_amount');
        $totalDue = $invoices->sum('due_amount');

        return response()->json([
            'success' => true,
            'data' => [
                'student' => [
                    'id'         => $student->id,
                    'student_id' => $student->student_id,
                    'name'       => $student->name,
                    'name_bn'    => $student->name_bn,
                ],
                'invoices' => $invoices->map(fn ($inv) => [
                    'id'            => $inv->id,
                    'invoice_no'    => $inv->invoice_no,
                    'session'       => $inv->academicSession?->name ?? '',
                    'month'         => $inv->month,
                    'total_amount'  => $inv->total_amount,
                    'paid_amount'   => $inv->paid_amount,
                    'due_amount'    => $inv->due_amount,
                    'discount'      => $inv->discount_amount,
                    'status'        => $inv->status,
                    'due_date'      => $inv->due_date?->format('Y-m-d'),
                    'items'         => $inv->items->map(fn ($it) => [
                        'fee_head' => $it->feeHead?->name ?? '—',
                        'amount'   => $it->amount,
                    ]),
                    'payments'      => $inv->payments->map(fn ($p) => [
                        'receipt_no'   => $p->receipt_no,
                        'amount'       => $p->amount,
                        'payment_date' => $p->payment_date?->format('Y-m-d'),
                        'method'       => $p->method,
                    ]),
                ]),
                'summary' => [
                    'total_invoices' => $invoices->count(),
                    'total_amount'   => round($totalAmount, 2),
                    'total_paid'     => round($totalPaid, 2),
                    'total_due'      => round($totalDue, 2),
                ],
            ],
        ]);
    }

    /**
     * Teacher Section Results: marks overview for a specific section + exam term.
     */
    public function teacherSectionResults(Request $request): JsonResponse
    {
        $request->validate([
            'section_id'   => 'required|exists:sections,id',
            'exam_term_id' => 'required|exists:exam_terms,id',
        ]);

        $sectionId = $request->section_id;
        $examTermId = $request->exam_term_id;

        $enrollments = StudentEnrollment::where('section_id', $sectionId)
            ->with('student')
            ->get();

        $enrollmentIds = $enrollments->pluck('id');

        // Get all marks for this section + exam
        $marks = Mark::where('exam_term_id', $examTermId)
            ->whereIn('student_enrollment_id', $enrollmentIds)
            ->with('subject')
            ->get();

        // Get results
        $results = Result::where('exam_term_id', $examTermId)
            ->whereIn('student_enrollment_id', $enrollmentIds)
            ->get()
            ->keyBy('student_enrollment_id');

        // Get unique subjects
        $subjects = $marks->pluck('subject')->unique('id')->values()->map(fn ($s) => [
            'id'   => $s->id,
            'name' => $s->name,
        ]);

        // Build per-student data
        $students = $enrollments->map(function ($enroll) use ($marks, $results, $subjects) {
            $studentMarks = $marks->where('student_enrollment_id', $enroll->id);
            $result = $results->get($enroll->id);

            $subjectMarks = [];
            foreach ($subjects as $subject) {
                $mark = $studentMarks->firstWhere('subject_id', $subject['id']);
                $subjectMarks[] = [
                    'subject_id'     => $subject['id'],
                    'marks_obtained' => $mark?->marks_obtained,
                    'full_marks'     => $mark?->full_marks,
                ];
            }

            return [
                'student_id'   => $enroll->student?->student_id,
                'name'         => $enroll->student?->name,
                'roll_no'      => $enroll->roll_no,
                'subject_marks' => $subjectMarks,
                'total_marks'  => $result?->total_marks ?? $studentMarks->sum('marks_obtained'),
                'gpa'          => $result?->gpa,
                'letter_grade' => $result?->letter_grade,
                'position'     => $result?->position,
            ];
        })->sortBy('roll_no')->values();

        // Class averages per subject
        $subjectAverages = $subjects->map(function ($subject) use ($marks) {
            $subjectMarks = $marks->where('subject_id', $subject['id']);
            return [
                'subject_id' => $subject['id'],
                'name'       => $subject['name'],
                'average'    => $subjectMarks->count() > 0 ? round($subjectMarks->avg('marks_obtained'), 1) : 0,
                'highest'    => $subjectMarks->max('marks_obtained') ?? 0,
                'lowest'     => $subjectMarks->min('marks_obtained') ?? 0,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'subjects'         => $subjects,
                'students'         => $students,
                'subject_averages' => $subjectAverages,
                'total_students'   => $enrollments->count(),
            ],
        ]);
    }

    /**
     * Teacher Section Attendance: attendance summary for a section.
     */
    public function teacherSectionAttendance(Request $request): JsonResponse
    {
        $request->validate([
            'section_id' => 'required|exists:sections,id',
            'from_date'  => 'required|date',
            'to_date'    => 'required|date|after_or_equal:from_date',
        ]);

        $sectionId = $request->section_id;
        $from = $request->from_date;
        $to = $request->to_date;

        $enrollments = StudentEnrollment::where('section_id', $sectionId)
            ->with('student')
            ->get();

        $enrollmentIds = $enrollments->pluck('id');

        $attendances = StudentAttendance::whereIn('student_enrollment_id', $enrollmentIds)
            ->whereBetween('date', [$from, $to])
            ->get();

        // Per-student summary
        $studentSummary = $enrollments->map(function ($enroll) use ($attendances) {
            $sa = $attendances->where('student_enrollment_id', $enroll->id);
            $total = $sa->count();
            $present = $sa->whereIn('status', ['present', 'late'])->count();
            return [
                'student_id' => $enroll->student?->student_id,
                'name'       => $enroll->student?->name,
                'roll_no'    => $enroll->roll_no,
                'total'      => $total,
                'present'    => $present,
                'absent'     => $sa->where('status', 'absent')->count(),
                'late'       => $sa->where('status', 'late')->count(),
                'leave'      => $sa->where('status', 'leave')->count(),
                'rate'       => $total > 0 ? round(($present / $total) * 100, 1) : 0,
            ];
        })->sortBy('roll_no')->values();

        // Daily summary
        $dailySummary = [];
        $date = $from;
        while ($date <= $to) {
            $dayAtt = $attendances->where('date', $date);
            if ($dayAtt->count() > 0) {
                $dailySummary[] = [
                    'date'    => $date,
                    'present' => $dayAtt->whereIn('status', ['present', 'late'])->count(),
                    'absent'  => $dayAtt->where('status', 'absent')->count(),
                    'late'    => $dayAtt->where('status', 'late')->count(),
                    'leave'   => $dayAtt->where('status', 'leave')->count(),
                    'total'   => $dayAtt->count(),
                ];
            }
            $date = date('Y-m-d', strtotime($date . ' +1 day'));
        }

        return response()->json([
            'success' => true,
            'data' => [
                'students'      => $studentSummary,
                'daily_summary' => $dailySummary,
                'total_students' => $enrollments->count(),
            ],
        ]);
    }

    /**
     * Parent children overview: all children with their report cards.
     */
    public function parentChildrenReport(Request $request): JsonResponse
    {
        $user = $request->user();
        $guardian = Guardian::where('user_id', $user->id)->first();

        if (!$guardian) {
            return response()->json(['success' => true, 'data' => ['children' => []]]);
        }

        $students = $guardian->students()->with(['enrollments.section.class', 'enrollments.academicSession'])->get();

        $children = [];
        foreach ($students as $student) {
            $enrollmentIds = $student->enrollments->pluck('id');
            $currentEnrollment = $student->enrollments
                ->sortByDesc(fn ($e) => $e->academicSession?->is_current ? 1 : 0)
                ->first();

            // Results per exam term
            $examTermIds = Result::whereIn('student_enrollment_id', $enrollmentIds)->pluck('exam_term_id')->unique();
            $examTerms = ExamTerm::whereIn('id', $examTermIds)->orderBy('start_date')->get();

            $reportCards = [];
            foreach ($examTerms as $term) {
                $result = Result::where('exam_term_id', $term->id)
                    ->whereIn('student_enrollment_id', $enrollmentIds)
                    ->first();

                $marks = Mark::where('exam_term_id', $term->id)
                    ->whereIn('student_enrollment_id', $enrollmentIds)
                    ->with('subject')
                    ->get()
                    ->map(fn ($m) => [
                        'subject_name'   => $m->subject?->name ?? '—',
                        'marks_obtained' => $m->marks_obtained,
                        'full_marks'     => $m->full_marks,
                    ]);

                $reportCards[] = [
                    'exam_name'    => $term->name,
                    'marks'        => $marks,
                    'total_marks'  => $result?->total_marks ?? $marks->sum('marks_obtained'),
                    'gpa'          => $result?->gpa,
                    'letter_grade' => $result?->letter_grade,
                    'position'     => $result?->position,
                ];
            }

            // Attendance summary
            $attSummary = null;
            if ($currentEnrollment) {
                $total = StudentAttendance::where('student_enrollment_id', $currentEnrollment->id)->count();
                $present = StudentAttendance::where('student_enrollment_id', $currentEnrollment->id)->whereIn('status', ['present', 'late'])->count();
                $attSummary = [
                    'total' => $total,
                    'present' => $present,
                    'rate' => $total > 0 ? round(($present / $total) * 100, 1) : 0,
                ];
            }

            // Pending fees
            $pendingDue = Invoice::where('student_id', $student->id)->whereIn('status', ['pending', 'partial'])->sum('due_amount');

            $children[] = [
                'id'           => $student->id,
                'student_id'   => $student->student_id,
                'name'         => $student->name,
                'name_bn'      => $student->name_bn,
                'enrollment'   => $currentEnrollment ? [
                    'class_name'   => $currentEnrollment->section?->class?->name ?? '',
                    'section_name' => $currentEnrollment->section?->name ?? '',
                    'session_name' => $currentEnrollment->academicSession?->name ?? '',
                    'roll_no'      => $currentEnrollment->roll_no,
                ] : null,
                'report_cards'      => $reportCards,
                'attendance_summary' => $attSummary,
                'pending_due'       => round($pendingDue, 2),
            ];
        }

        return response()->json(['success' => true, 'data' => ['children' => $children]]);
    }

    /**
     * Notices list for authenticated users.
     */
    public function notices(Request $request): JsonResponse
    {
        $user = $request->user();
        $institutionId = $user->institution_id ?? 1;

        $notices = Notice::where('institution_id', $institutionId)
            ->where('is_published', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderByDesc('published_at')
            ->limit(50)
            ->get(['id', 'title', 'title_bn', 'body', 'body_bn', 'audience', 'published_at', 'attachments']);

        return response()->json(['success' => true, 'data' => $notices]);
    }

    /**
     * Admin Bulk Result Cards: report cards for every student in a section/exam-term.
     * Used by the admin portal for printing result cards.
     */
    public function bulkResultCards(Request $request): JsonResponse
    {
        $request->validate([
            'section_id'   => 'required|exists:sections,id',
            'exam_term_id' => 'required|exists:exam_terms,id',
        ]);

        $sectionId  = $request->section_id;
        $examTermId = $request->exam_term_id;

        $examTerm = ExamTerm::with('academicSession')->find($examTermId);

        $enrollments = StudentEnrollment::where('section_id', $sectionId)
            ->with(['student.guardians', 'section.class'])
            ->orderBy('roll_no')
            ->get();

        $enrollmentIds = $enrollments->pluck('id');

        // All marks for this exam term + section
        $allMarks = Mark::where('exam_term_id', $examTermId)
            ->whereIn('student_enrollment_id', $enrollmentIds)
            ->with('subject')
            ->get();

        // All results
        $allResults = Result::where('exam_term_id', $examTermId)
            ->whereIn('student_enrollment_id', $enrollmentIds)
            ->get()
            ->keyBy('student_enrollment_id');

        $cards = [];
        foreach ($enrollments as $enroll) {
            $student = $enroll->student;
            if (!$student) continue;

            $studentMarks = $allMarks->where('student_enrollment_id', $enroll->id);
            $result = $allResults->get($enroll->id);

            $marks = $studentMarks->map(fn ($m) => [
                'subject_name'    => $m->subject?->name ?? '—',
                'subject_name_bn' => $m->subject?->name_bn ?? null,
                'marks_obtained'  => $m->marks_obtained,
                'full_marks'      => $m->full_marks,
                'percentage'      => $m->full_marks > 0 ? round(($m->marks_obtained / $m->full_marks) * 100, 1) : 0,
            ])->values();

            // Guardian info (father & mother)
            $father = $student->guardians->firstWhere('relation', 'father');
            $mother = $student->guardians->firstWhere('relation', 'mother');

            $cards[] = [
                'student' => [
                    'id'            => $student->id,
                    'student_id'    => $student->student_id,
                    'name'          => $student->name,
                    'name_bn'       => $student->name_bn,
                    'photo'         => $student->photo,
                    'gender'        => $student->gender,
                    'date_of_birth' => $student->date_of_birth?->format('Y-m-d'),
                    'blood_group'   => $student->blood_group,
                    'father_name'   => $father?->name ?? null,
                    'father_name_bn'=> $father?->name_bn ?? null,
                    'mother_name'   => $mother?->name ?? null,
                    'mother_name_bn'=> $mother?->name_bn ?? null,
                ],
                'enrollment' => [
                    'class_name'   => $enroll->section?->class?->name ?? '',
                    'section_name' => $enroll->section?->name ?? '',
                    'session_name' => $examTerm->academicSession?->name ?? '',
                    'roll_no'      => $enroll->roll_no,
                ],
                'marks'          => $marks,
                'total_marks'    => $result?->total_marks ?? $studentMarks->sum('marks_obtained'),
                'total_full'     => $marks->sum('full_marks'),
                'gpa'            => $result?->gpa,
                'letter_grade'   => $result?->letter_grade,
                'position'       => $result?->position,
                'total_students' => $result?->total_students ?? $enrollments->count(),
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'exam_term' => [
                    'id'         => $examTerm->id,
                    'name'       => $examTerm->name,
                    'start_date' => $examTerm->start_date,
                    'end_date'   => $examTerm->end_date,
                    'session'    => $examTerm->academicSession?->name ?? '',
                ],
                'cards' => $cards,
            ],
        ]);
    }

    /**
     * Search students for individual result card generation (admin only).
     */
    public function searchStudentsForResults(Request $request): JsonResponse
    {
        $request->validate(['search' => 'required|string|min:1']);

        $term = '%' . $request->search . '%';
        $students = Student::where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                  ->orWhere('name_bn', 'like', $term)
                  ->orWhere('student_id', 'like', $term);
            })
            ->where('status', 'active')
            ->with(['enrollments' => function ($q) {
                $q->with(['section.class', 'academicSession'])
                  ->latest('academic_session_id')
                  ->limit(1);
            }])
            ->limit(20)
            ->get();

        $data = $students->map(function ($s) {
            $enrollment = $s->enrollments->first();
            return [
                'id'           => $s->id,
                'student_id'   => $s->student_id,
                'name'         => $s->name,
                'name_bn'      => $s->name_bn,
                'photo'        => $s->photo,
                'class_name'   => $enrollment?->section?->class?->name ?? '—',
                'section_name' => $enrollment?->section?->name ?? '—',
                'session_name' => $enrollment?->academicSession?->name ?? '—',
                'roll_no'      => $enrollment?->roll_no,
            ];
        });

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Individual student result card: detailed report card for one student with all exam terms.
     * Returns student info, guardian info, enrollment, and per-exam-term marks.
     */
    public function individualResultCard(Request $request): JsonResponse
    {
        $request->validate([
            'student_id'   => 'required|exists:students,id',
            'exam_term_id' => 'nullable|exists:exam_terms,id',
        ]);

        $student = Student::with(['guardians', 'enrollments.section.class', 'enrollments.academicSession'])
            ->find($request->student_id);

        if (!$student) {
            return response()->json(['success' => false, 'message' => 'Student not found'], 404);
        }

        $enrollmentIds = $student->enrollments->pluck('id');

        // Get available exam terms
        $examTermQuery = Result::whereIn('student_enrollment_id', $enrollmentIds);
        if ($request->filled('exam_term_id')) {
            $examTermQuery->where('exam_term_id', $request->exam_term_id);
        }
        $examTermIds = $examTermQuery->pluck('exam_term_id')->unique();
        $examTerms = ExamTerm::whereIn('id', $examTermIds)->with('academicSession')->orderBy('start_date')->get();

        // Build report cards
        $reportCards = [];
        foreach ($examTerms as $term) {
            $result = Result::where('exam_term_id', $term->id)
                ->whereIn('student_enrollment_id', $enrollmentIds)
                ->first();

            $marks = Mark::where('exam_term_id', $term->id)
                ->whereIn('student_enrollment_id', $enrollmentIds)
                ->with('subject')
                ->get()
                ->map(fn ($m) => [
                    'subject_name'    => $m->subject?->name ?? '—',
                    'subject_name_bn' => $m->subject?->name_bn ?? null,
                    'marks_obtained'  => $m->marks_obtained,
                    'full_marks'      => $m->full_marks,
                    'percentage'      => $m->full_marks > 0 ? round(($m->marks_obtained / $m->full_marks) * 100, 1) : 0,
                ]);

            // Get enrollment for this specific exam term's session
            $enrollment = $student->enrollments
                ->where('academic_session_id', $term->academic_session_id)
                ->first();

            $reportCards[] = [
                'exam_term' => [
                    'id'         => $term->id,
                    'name'       => $term->name,
                    'start_date' => $term->start_date,
                    'end_date'   => $term->end_date,
                    'session'    => $term->academicSession?->name ?? '',
                ],
                'enrollment' => $enrollment ? [
                    'class_name'   => $enrollment->section?->class?->name ?? '',
                    'section_name' => $enrollment->section?->name ?? '',
                    'session_name' => $enrollment->academicSession?->name ?? '',
                    'roll_no'      => $enrollment->roll_no,
                ] : null,
                'marks'          => $marks,
                'total_marks'    => $result?->total_marks ?? $marks->sum('marks_obtained'),
                'total_full'     => $marks->sum('full_marks'),
                'gpa'            => $result?->gpa,
                'letter_grade'   => $result?->letter_grade,
                'position'       => $result?->position,
                'total_students' => $result?->total_students,
            ];
        }

        // Current enrollment
        $currentEnrollment = $student->enrollments
            ->sortByDesc(fn ($e) => $e->academicSession?->is_current ? 1 : 0)
            ->first();

        // Guardian info
        $father = $student->guardians->firstWhere('relation', 'father');
        $mother = $student->guardians->firstWhere('relation', 'mother');

        return response()->json([
            'success' => true,
            'data' => [
                'student' => [
                    'id'            => $student->id,
                    'student_id'    => $student->student_id,
                    'name'          => $student->name,
                    'name_bn'       => $student->name_bn,
                    'photo'         => $student->photo,
                    'gender'        => $student->gender,
                    'date_of_birth' => $student->date_of_birth?->format('Y-m-d'),
                    'blood_group'   => $student->blood_group,
                    'father_name'   => $father?->name ?? null,
                    'father_name_bn'=> $father?->name_bn ?? null,
                    'mother_name'   => $mother?->name ?? null,
                    'mother_name_bn'=> $mother?->name_bn ?? null,
                ],
                'enrollment' => $currentEnrollment ? [
                    'class_name'   => $currentEnrollment->section?->class?->name ?? '',
                    'section_name' => $currentEnrollment->section?->name ?? '',
                    'session_name' => $currentEnrollment->academicSession?->name ?? '',
                    'roll_no'      => $currentEnrollment->roll_no,
                ] : null,
                'report_cards' => $reportCards,
            ],
        ]);
    }
}
