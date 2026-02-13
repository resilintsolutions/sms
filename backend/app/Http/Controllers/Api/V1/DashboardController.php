<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\Employee;
use App\Models\ExamTerm;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\Notice;
use App\Models\Payment;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\StudentEnrollment;
use App\Models\TeacherAssignment;
use App\Models\Result;
use App\Models\Mark;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Admin / School-level dashboard.
     * Returns different data depending on the user's role.
     */
    public function admin(Request $request): JsonResponse
    {
        $user = $request->user();
        $institutionId = $user?->institution_id ?? 1;
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();

        // Core student stats
        $totalStudents = Student::where('institution_id', $institutionId)->where('status', 'active')->count();

        // Today's attendance
        $presentToday = StudentAttendance::whereHas('studentEnrollment', function ($q) use ($institutionId) {
            $q->whereHas('student', fn ($s) => $s->where('institution_id', $institutionId));
        })->where('date', $today)->where('status', 'present')->count();

        $absentToday = StudentAttendance::whereHas('studentEnrollment', function ($q) use ($institutionId) {
            $q->whereHas('student', fn ($s) => $s->where('institution_id', $institutionId));
        })->where('date', $today)->where('status', 'absent')->count();

        $lateToday = StudentAttendance::whereHas('studentEnrollment', function ($q) use ($institutionId) {
            $q->whereHas('student', fn ($s) => $s->where('institution_id', $institutionId));
        })->where('date', $today)->where('status', 'late')->count();

        // Teachers & employees
        $totalTeachers = Employee::where('institution_id', $institutionId)->where('is_teacher', true)->where('is_active', true)->count();
        $totalEmployees = Employee::where('institution_id', $institutionId)->where('is_active', true)->count();

        // Classes
        $totalClasses = ClassModel::where('institution_id', $institutionId)->count();

        // Financial stats
        $totalDue = Invoice::where('institution_id', $institutionId)->whereIn('status', ['pending', 'partial'])->sum('due_amount');
        $collectedThisMonth = Payment::where('institution_id', $institutionId)
            ->whereBetween('payment_date', [$monthStart, $monthEnd])
            ->sum('amount');
        $pendingInvoices = Invoice::where('institution_id', $institutionId)->whereIn('status', ['pending', 'partial'])->count();

        // Recent notices
        $recentNotices = Notice::where('institution_id', $institutionId)
            ->where('is_published', true)
            ->orderByDesc('published_at')
            ->limit(5)
            ->get(['id', 'title', 'title_bn', 'audience', 'published_at']);

        // Upcoming exams
        $upcomingExams = ExamTerm::where('institution_id', $institutionId)
            ->where('start_date', '>=', $today)
            ->orderBy('start_date')
            ->limit(3)
            ->get(['id', 'name', 'start_date', 'end_date']);

        // Attendance rate this month
        $totalAttendanceMarked = StudentAttendance::whereHas('studentEnrollment', function ($q) use ($institutionId) {
            $q->whereHas('student', fn ($s) => $s->where('institution_id', $institutionId));
        })->whereBetween('date', [$monthStart, $today])->count();

        $presentThisMonth = StudentAttendance::whereHas('studentEnrollment', function ($q) use ($institutionId) {
            $q->whereHas('student', fn ($s) => $s->where('institution_id', $institutionId));
        })->whereBetween('date', [$monthStart, $today])->whereIn('status', ['present', 'late'])->count();

        $attendanceRate = $totalAttendanceMarked > 0
            ? round(($presentThisMonth / $totalAttendanceMarked) * 100, 1)
            : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'total_students'       => $totalStudents,
                'students_present_today' => $presentToday,
                'students_absent_today'  => $absentToday,
                'students_late_today'    => $lateToday,
                'total_teachers'       => $totalTeachers,
                'total_employees'      => $totalEmployees,
                'total_classes'        => $totalClasses,
                'total_due_amount'     => round($totalDue, 2),
                'collected_this_month' => round($collectedThisMonth, 2),
                'pending_invoices'     => $pendingInvoices,
                'attendance_rate'      => $attendanceRate,
                'recent_notices'       => $recentNotices,
                'upcoming_exams'       => $upcomingExams,
            ],
        ]);
    }

    /**
     * Teacher dashboard data.
     * Auto-detects the teacher from the logged-in user.
     */
    public function teacher(Request $request): JsonResponse
    {
        $user = $request->user();
        $employee = Employee::where('user_id', $user->id)->where('is_teacher', true)->first();

        if (!$employee) {
            return response()->json([
                'success' => true,
                'data' => [
                    'employee'        => null,
                    'assignments'     => [],
                    'total_sections'  => 0,
                    'total_subjects'  => 0,
                    'total_students'  => 0,
                    'class_teacher_of' => null,
                    'recent_notices'  => [],
                ],
            ]);
        }

        $assignments = TeacherAssignment::with(['section.class', 'subject', 'academicSession'])
            ->where('employee_id', $employee->id)
            ->orderBy('academic_session_id')
            ->get();

        // Unique sections and subjects
        $sectionIds = $assignments->pluck('section_id')->unique()->values();
        $subjectIds = $assignments->pluck('subject_id')->unique()->filter()->values();

        // Count students in assigned sections
        $totalStudents = StudentEnrollment::whereIn('section_id', $sectionIds)->count();

        // Class teacher info
        $classTeacherAssignment = $assignments->firstWhere('is_class_teacher', true);
        $classTeacherOf = null;
        if ($classTeacherAssignment && $classTeacherAssignment->section) {
            $sec = $classTeacherAssignment->section;
            $classTeacherOf = [
                'section_id'   => $sec->id,
                'section_name' => $sec->name,
                'class_name'   => $sec->class?->name ?? '',
            ];
        }

        // Today's attendance status for assigned sections
        $today = now()->toDateString();
        $attendanceMarkedToday = StudentAttendance::whereIn('student_enrollment_id',
            StudentEnrollment::whereIn('section_id', $sectionIds)->pluck('id')
        )->where('date', $today)->exists();

        // Pending marks: exam terms that still need marks from this teacher
        $currentSession = \App\Models\AcademicSession::where('institution_id', $employee->institution_id)
            ->where('is_current', true)->first();
        $pendingExams = [];
        if ($currentSession) {
            $exams = ExamTerm::where('institution_id', $employee->institution_id)
                ->where('academic_session_id', $currentSession->id)
                ->where('start_date', '<=', now()->addDays(30))
                ->orderBy('start_date')
                ->get(['id', 'name', 'start_date', 'end_date']);

            foreach ($exams as $exam) {
                // Check if teacher has entered marks for all their assigned subjects
                foreach ($assignments as $assignment) {
                    if (!$assignment->subject_id) continue;
                    $marksEntered = Mark::where('exam_term_id', $exam->id)
                        ->where('subject_id', $assignment->subject_id)
                        ->whereIn('student_enrollment_id',
                            StudentEnrollment::where('section_id', $assignment->section_id)->pluck('id')
                        )->exists();

                    if (!$marksEntered) {
                        $pendingExams[] = [
                            'exam_name'    => $exam->name,
                            'subject'      => $assignment->subject?->name ?? '',
                            'section'      => ($assignment->section?->class?->name ?? '') . ' - ' . ($assignment->section?->name ?? ''),
                            'start_date'   => $exam->start_date,
                        ];
                    }
                }
            }
        }

        // Recent notices
        $recentNotices = Notice::where('institution_id', $employee->institution_id)
            ->where('is_published', true)
            ->where(function ($q) {
                $q->where('audience', 'all')
                  ->orWhere('audience', 'teachers')
                  ->orWhere('audience', 'staff');
            })
            ->orderByDesc('published_at')
            ->limit(5)
            ->get(['id', 'title', 'title_bn', 'published_at']);

        return response()->json([
            'success' => true,
            'data' => [
                'employee'           => [
                    'id'          => $employee->id,
                    'name'        => $employee->name,
                    'name_bn'     => $employee->name_bn,
                    'designation' => $employee->designation,
                    'department'  => $employee->department,
                    'employee_id' => $employee->employee_id,
                ],
                'assignments'        => $assignments,
                'total_sections'     => $sectionIds->count(),
                'total_subjects'     => $subjectIds->count(),
                'total_students'     => $totalStudents,
                'class_teacher_of'   => $classTeacherOf,
                'attendance_marked_today' => $attendanceMarkedToday,
                'pending_marks'      => array_slice($pendingExams, 0, 5),
                'recent_notices'     => $recentNotices,
            ],
        ]);
    }

    /**
     * Student dashboard data.
     * Auto-detects student from the logged-in user.
     */
    public function studentDashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = Student::with(['enrollments.section.class', 'enrollments.academicSession'])
            ->where('user_id', $user->id)
            ->first();

        if (!$student) {
            return response()->json([
                'success' => true,
                'data' => [
                    'student'    => null,
                    'enrollment' => null,
                    'attendance_summary' => null,
                    'recent_results'     => [],
                    'pending_fees'       => [],
                    'recent_notices'     => [],
                ],
            ]);
        }

        $currentEnrollment = $student->enrollments
            ->sortByDesc(fn ($e) => $e->academicSession?->is_current ? 1 : 0)
            ->first();

        $enrollmentIds = $student->enrollments->pluck('id');

        // Attendance summary for current session
        $attendanceSummary = null;
        if ($currentEnrollment) {
            $total = StudentAttendance::where('student_enrollment_id', $currentEnrollment->id)->count();
            $present = StudentAttendance::where('student_enrollment_id', $currentEnrollment->id)
                ->whereIn('status', ['present', 'late'])->count();
            $absent = StudentAttendance::where('student_enrollment_id', $currentEnrollment->id)
                ->where('status', 'absent')->count();
            $late = StudentAttendance::where('student_enrollment_id', $currentEnrollment->id)
                ->where('status', 'late')->count();

            $attendanceSummary = [
                'total_days'   => $total,
                'present'      => $present,
                'absent'       => $absent,
                'late'         => $late,
                'rate'         => $total > 0 ? round(($present / $total) * 100, 1) : 0,
            ];
        }

        // Recent results
        $recentResults = Result::whereIn('student_enrollment_id', $enrollmentIds)
            ->with('examTerm')
            ->orderByDesc('exam_term_id')
            ->limit(5)
            ->get();

        // Pending fees
        $pendingFees = Invoice::where('student_id', $student->id)
            ->whereIn('status', ['pending', 'partial'])
            ->with('academicSession')
            ->orderByDesc('id')
            ->limit(5)
            ->get(['id', 'invoice_no', 'total_amount', 'paid_amount', 'due_amount', 'status', 'due_date', 'academic_session_id']);

        // Recent notices
        $recentNotices = Notice::where('institution_id', $student->institution_id)
            ->where('is_published', true)
            ->where(function ($q) {
                $q->where('audience', 'all')
                  ->orWhere('audience', 'students');
            })
            ->orderByDesc('published_at')
            ->limit(5)
            ->get(['id', 'title', 'title_bn', 'body', 'published_at']);

        // Recent attendance records
        $recentAttendance = [];
        if ($currentEnrollment) {
            $recentAttendance = StudentAttendance::where('student_enrollment_id', $currentEnrollment->id)
                ->orderByDesc('date')
                ->limit(10)
                ->get(['date', 'status']);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'student' => [
                    'id'             => $student->id,
                    'student_id'     => $student->student_id,
                    'name'           => $student->name,
                    'name_bn'        => $student->name_bn,
                    'gender'         => $student->gender,
                    'photo'          => $student->photo,
                    'date_of_birth'  => $student->date_of_birth,
                    'admission_date' => $student->admission_date,
                    'status'         => $student->status,
                ],
                'enrollment' => $currentEnrollment ? [
                    'class_name'   => $currentEnrollment->section?->class?->name ?? '',
                    'section_name' => $currentEnrollment->section?->name ?? '',
                    'session_name' => $currentEnrollment->academicSession?->name ?? '',
                    'roll_no'      => $currentEnrollment->roll_no,
                ] : null,
                'attendance_summary' => $attendanceSummary,
                'recent_attendance'  => $recentAttendance,
                'recent_results'     => $recentResults,
                'pending_fees'       => $pendingFees,
                'recent_notices'     => $recentNotices,
            ],
        ]);
    }

    /**
     * Parent dashboard data.
     * Auto-detects children from the logged-in user's guardian record.
     */
    public function parentDashboard(Request $request): JsonResponse
    {
        $user = $request->user();

        // Find guardian record for this user
        $guardian = Guardian::where('user_id', $user->id)->first();

        if (!$guardian) {
            return response()->json([
                'success' => true,
                'data' => [
                    'guardian'  => null,
                    'children'  => [],
                    'recent_notices' => [],
                ],
            ]);
        }

        // Get children linked to this guardian
        $students = $guardian->students()
            ->with(['enrollments.section.class', 'enrollments.academicSession'])
            ->get();

        $children = [];
        foreach ($students as $student) {
            $currentEnrollment = $student->enrollments
                ->sortByDesc(fn ($e) => $e->academicSession?->is_current ? 1 : 0)
                ->first();

            // Attendance summary
            $attendanceSummary = null;
            if ($currentEnrollment) {
                $total = StudentAttendance::where('student_enrollment_id', $currentEnrollment->id)->count();
                $present = StudentAttendance::where('student_enrollment_id', $currentEnrollment->id)
                    ->whereIn('status', ['present', 'late'])->count();

                $attendanceSummary = [
                    'total_days' => $total,
                    'present'    => $present,
                    'rate'       => $total > 0 ? round(($present / $total) * 100, 1) : 0,
                ];
            }

            // Latest result
            $enrollmentIds = $student->enrollments->pluck('id');
            $latestResult = Result::whereIn('student_enrollment_id', $enrollmentIds)
                ->with('examTerm')
                ->orderByDesc('exam_term_id')
                ->first();

            // Pending fees
            $pendingDue = Invoice::where('student_id', $student->id)
                ->whereIn('status', ['pending', 'partial'])
                ->sum('due_amount');

            $children[] = [
                'id'           => $student->id,
                'student_id'   => $student->student_id,
                'name'         => $student->name,
                'name_bn'      => $student->name_bn,
                'photo'        => $student->photo,
                'gender'       => $student->gender,
                'enrollment'   => $currentEnrollment ? [
                    'class_name'   => $currentEnrollment->section?->class?->name ?? '',
                    'section_name' => $currentEnrollment->section?->name ?? '',
                    'session_name' => $currentEnrollment->academicSession?->name ?? '',
                    'roll_no'      => $currentEnrollment->roll_no,
                ] : null,
                'attendance_summary' => $attendanceSummary,
                'latest_result'      => $latestResult ? [
                    'exam_name'    => $latestResult->examTerm?->name ?? '',
                    'gpa'          => $latestResult->gpa,
                    'letter_grade' => $latestResult->letter_grade,
                    'total_marks'  => $latestResult->total_marks,
                ] : null,
                'pending_due'  => round($pendingDue, 2),
            ];
        }

        // Recent notices
        $recentNotices = Notice::where('institution_id', $guardian->institution_id)
            ->where('is_published', true)
            ->where(function ($q) {
                $q->where('audience', 'all')
                  ->orWhere('audience', 'parents')
                  ->orWhere('audience', 'guardians');
            })
            ->orderByDesc('published_at')
            ->limit(5)
            ->get(['id', 'title', 'title_bn', 'body', 'published_at']);

        return response()->json([
            'success' => true,
            'data' => [
                'guardian' => [
                    'id'       => $guardian->id,
                    'name'     => $guardian->name,
                    'name_bn'  => $guardian->name_bn,
                    'relation' => $guardian->relation,
                    'phone'    => $guardian->phone,
                ],
                'children'       => $children,
                'recent_notices' => $recentNotices,
            ],
        ]);
    }

    /**
     * Accountant dashboard data.
     * Finance-focused stats: dues, collections, invoices, payments.
     */
    public function accountantDashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $institutionId = $user?->institution_id ?? 1;
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();

        $totalStudents = Student::where('institution_id', $institutionId)->where('status', 'active')->count();

        // Financial stats
        $totalDue = Invoice::where('institution_id', $institutionId)->whereIn('status', ['pending', 'partial'])->sum('due_amount');
        $collectedThisMonth = Payment::where('institution_id', $institutionId)
            ->whereBetween('payment_date', [$monthStart, $monthEnd])
            ->sum('amount');
        $pendingInvoices = Invoice::where('institution_id', $institutionId)->whereIn('status', ['pending', 'partial'])->count();
        $totalInvoices = Invoice::where('institution_id', $institutionId)->count();

        // Collection rate
        $totalInvoiceAmount = Invoice::where('institution_id', $institutionId)->sum('total_amount');
        $totalPaidAmount = Invoice::where('institution_id', $institutionId)->sum('paid_amount');
        $collectionRate = $totalInvoiceAmount > 0 ? round(($totalPaidAmount / $totalInvoiceAmount) * 100, 1) : 0;

        // Recent payments
        $recentPayments = Payment::where('institution_id', $institutionId)
            ->with(['invoice.student'])
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->limit(10)
            ->get();

        // Overdue invoices
        $overdueInvoices = Invoice::where('institution_id', $institutionId)
            ->whereIn('status', ['pending', 'partial'])
            ->where('due_date', '<', $today)
            ->with('student')
            ->orderBy('due_date')
            ->limit(10)
            ->get(['id', 'invoice_no', 'due_amount', 'due_date', 'student_id']);

        return response()->json([
            'success' => true,
            'data' => [
                'total_due_amount'     => round($totalDue, 2),
                'collected_this_month' => round($collectedThisMonth, 2),
                'pending_invoices'     => $pendingInvoices,
                'total_invoices'       => $totalInvoices,
                'total_students'       => $totalStudents,
                'collection_rate'      => $collectionRate,
                'recent_payments'      => $recentPayments,
                'overdue_invoices'     => $overdueInvoices,
            ],
        ]);
    }

    /**
     * Accountant payments list.
     */
    public function accountantPayments(Request $request): JsonResponse
    {
        $user = $request->user();
        $institutionId = $user?->institution_id ?? 1;

        $payments = Payment::where('institution_id', $institutionId)
            ->with(['invoice.student'])
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $payments,
        ]);
    }

    /**
     * Librarian dashboard data.
     * Library stats — since no library tables exist yet, returns placeholder data.
     */
    public function librarianDashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $institutionId = $user?->institution_id ?? 1;

        $totalStudents = Student::where('institution_id', $institutionId)->where('status', 'active')->count();

        // Recent notices relevant to staff
        $recentNotices = Notice::where('institution_id', $institutionId)
            ->where('is_published', true)
            ->where(function ($q) {
                $q->where('audience', 'all')
                  ->orWhere('audience', 'staff');
            })
            ->orderByDesc('published_at')
            ->limit(5)
            ->get(['id', 'title', 'title_bn', 'published_at']);

        // Placeholder data for library — no library tables exist yet
        return response()->json([
            'success' => true,
            'data' => [
                'total_books'     => 0,
                'available_books' => 0,
                'issued_books'    => 0,
                'overdue_books'   => 0,
                'total_students'  => $totalStudents,
                'recent_issues'   => [],
                'popular_books'   => [],
                'recent_notices'  => $recentNotices,
            ],
        ]);
    }

    /**
     * Librarian books list (placeholder).
     */
    public function librarianBooks(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [],
        ]);
    }

    /**
     * Librarian issued books list (placeholder).
     */
    public function librarianIssued(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [],
        ]);
    }
}
