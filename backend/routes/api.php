<?php

use App\Http\Controllers\Api\V1\AcademicSessionController;
use App\Http\Controllers\Api\V1\AttendanceController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ClassController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ExamRoutineController;
use App\Http\Controllers\Api\V1\ExamTermController;
use App\Http\Controllers\Api\V1\ClassRoutineController;
use App\Http\Controllers\Api\V1\FeeController;
use App\Http\Controllers\Api\V1\InstitutionController;
use App\Http\Controllers\Api\V1\LandingPageController;
use App\Http\Controllers\Api\V1\MarksController;
use App\Http\Controllers\Api\V1\NoticeController;
use App\Http\Controllers\Api\V1\PortalController;
use App\Http\Controllers\Api\V1\SectionController;
use App\Http\Controllers\Api\V1\StudentController;
use App\Http\Controllers\Api\V1\SubjectController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\SuperAdminController;
use App\Http\Controllers\Api\V1\UserManagementController;
use App\Http\Controllers\Api\V1\AssignmentController;
use App\Http\Controllers\Api\V1\LessonPlanController;
use App\Http\Controllers\Api\V1\IdCardController;
use App\Http\Controllers\Api\V1\LibraryController;
use App\Http\Controllers\Api\V1\ResultCardController;
use App\Http\Controllers\Api\V1\CommunityPostController;
use App\Http\Controllers\Api\V1\CommunityCompetitionController;
use App\Http\Controllers\Api\V1\CommunityModerationController;
use App\Http\Controllers\Api\V1\CommunitySettingsController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // ═══════════════════════════════════════════════
    // PUBLIC ROUTES (no auth)
    // ═══════════════════════════════════════════════
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('contact', [LandingPageController::class, 'submitContact'])->middleware('throttle:5,1');
    Route::get('landing-page', [LandingPageController::class, 'show']);
    Route::get('resolve-domain', [SuperAdminController::class, 'resolveDomain']);

    // ═══════════════════════════════════════════════
    // AUTHENTICATED ROUTES
    // ═══════════════════════════════════════════════
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('user', [AuthController::class, 'user']);
        Route::patch('profile', [AuthController::class, 'updateProfile']);
        Route::post('change-password', [AuthController::class, 'changePassword']);

        // ─── Dashboard: Admin (admin, accountant, librarian) ───
        Route::middleware('role:admin,super_admin,accountant,librarian')->group(function () {
            Route::get('dashboard', [DashboardController::class, 'admin']);
        });

        // ─── Dashboard: Teacher ───
        Route::middleware('role:teacher,super_admin')->group(function () {
            Route::get('dashboard/teacher', [DashboardController::class, 'teacher']);
        });

        // ─── Dashboard: Student ───
        Route::middleware('role:student,super_admin')->group(function () {
            Route::get('dashboard/student', [DashboardController::class, 'studentDashboard']);
        });

        // ─── Dashboard: Parent ───
        Route::middleware('role:parent,super_admin')->group(function () {
            Route::get('dashboard/parent', [DashboardController::class, 'parentDashboard']);
        });

        // ─── Dashboard: Accountant ───
        Route::middleware('role:accountant,super_admin')->group(function () {
            Route::get('dashboard/accountant', [DashboardController::class, 'accountantDashboard']);
            Route::get('dashboard/accountant/payments', [DashboardController::class, 'accountantPayments']);
        });

        // ─── Dashboard & Library: Librarian ───
        Route::middleware('role:librarian,super_admin')->group(function () {
            Route::get('dashboard/librarian', [LibraryController::class, 'dashboard']);

            // Books CRUD
            Route::get('library/books', [LibraryController::class, 'bookIndex']);
            Route::post('library/books', [LibraryController::class, 'bookStore']);
            Route::get('library/books/{id}', [LibraryController::class, 'bookShow']);
            Route::put('library/books/{id}', [LibraryController::class, 'bookUpdate']);
            Route::delete('library/books/{id}', [LibraryController::class, 'bookDestroy']);
            Route::get('library/categories', [LibraryController::class, 'categories']);

            // Issue / Return
            Route::get('library/issues', [LibraryController::class, 'issueIndex']);
            Route::post('library/issues', [LibraryController::class, 'issueBook']);
            Route::put('library/issues/{id}/return', [LibraryController::class, 'returnBook']);

            // Student book history
            Route::get('library/students/{studentId}/books', [LibraryController::class, 'studentBooks']);

            // E-Library CRUD
            Route::get('library/ebooks', [LibraryController::class, 'ebookIndex']);
            Route::post('library/ebooks', [LibraryController::class, 'ebookStore']);
            Route::put('library/ebooks/{id}', [LibraryController::class, 'ebookUpdate']);
            Route::delete('library/ebooks/{id}', [LibraryController::class, 'ebookDestroy']);
        });

        // ─── READ-ONLY: shared data for admin, teacher, accountant ───
        // These are needed for dropdowns/selectors in attendance, marks, fees pages
        Route::middleware('role:admin,super_admin,teacher,accountant')->group(function () {
            Route::get('classes', [ClassController::class, 'index']);
            Route::get('classes/{class}', [ClassController::class, 'show']);
            Route::get('sections', [SectionController::class, 'index']);
            Route::get('sections/{section}', [SectionController::class, 'show']);
            Route::get('subjects', [SubjectController::class, 'index']);
            Route::get('subjects/{subject}', [SubjectController::class, 'show']);
            Route::get('students', [StudentController::class, 'index']);
            Route::get('students/{student}', [StudentController::class, 'show']);
            Route::get('academic-sessions', [AcademicSessionController::class, 'index']);
            Route::get('academic-sessions/{academic_session}', [AcademicSessionController::class, 'show']);
            Route::get('exam-terms', [ExamTermController::class, 'index']);
            Route::get('exam-terms/{exam_term}', [ExamTermController::class, 'show']);

            // Teachers can view class routines too
            Route::get('class-routines/view', [ClassRoutineController::class, 'index']);

            // Teachers list
            Route::get('teachers', [AssignmentController::class, 'teachers']);

            // Class-subject associations (read)
            Route::get('class-subjects', [AssignmentController::class, 'classSubjects']);

            // Teacher assignments (read)
            Route::get('teacher-assignments', [AssignmentController::class, 'teacherAssignmentsList']);
        });

        // ─── WRITE: Academic setup (admin only) ───
        Route::middleware('role:admin,super_admin')->group(function () {
            // Institutions
            Route::apiResource('institutions', InstitutionController::class)->only(['index', 'show', 'update']);

            // Academic sessions (create/update/delete)
            Route::post('academic-sessions', [AcademicSessionController::class, 'store']);
            Route::put('academic-sessions/{academic_session}', [AcademicSessionController::class, 'update']);
            Route::delete('academic-sessions/{academic_session}', [AcademicSessionController::class, 'destroy']);

            // Classes (create/update/delete)
            Route::post('classes', [ClassController::class, 'store']);
            Route::put('classes/{class}', [ClassController::class, 'update']);
            Route::delete('classes/{class}', [ClassController::class, 'destroy']);

            // Sections (create/update/delete)
            Route::post('sections', [SectionController::class, 'store']);
            Route::put('sections/{section}', [SectionController::class, 'update']);
            Route::delete('sections/{section}', [SectionController::class, 'destroy']);

            // Subjects (create/update/delete)
            Route::post('subjects', [SubjectController::class, 'store']);
            Route::put('subjects/{subject}', [SubjectController::class, 'update']);
            Route::delete('subjects/{subject}', [SubjectController::class, 'destroy']);

            // Students (create/update/delete/enroll)
            Route::post('students/enroll', [StudentController::class, 'enroll']);
            Route::post('students', [StudentController::class, 'store']);
            Route::put('students/{student}', [StudentController::class, 'update']);
            Route::delete('students/{student}', [StudentController::class, 'destroy']);

            // Exams (create/update/delete)
            Route::post('exam-terms', [ExamTermController::class, 'store']);
            Route::put('exam-terms/{exam_term}', [ExamTermController::class, 'update']);
            Route::delete('exam-terms/{exam_term}', [ExamTermController::class, 'destroy']);
            Route::post('exam-terms/{examTermId}/calculate-results', [MarksController::class, 'calculateResults']);

            // Exam Routines (CRUD)
            Route::get('exam-routines', [ExamRoutineController::class, 'index']);
            Route::post('exam-routines', [ExamRoutineController::class, 'store']);
            Route::get('exam-routines/{exam_routine}', [ExamRoutineController::class, 'show']);
            Route::put('exam-routines/{exam_routine}', [ExamRoutineController::class, 'update']);
            Route::delete('exam-routines/{exam_routine}', [ExamRoutineController::class, 'destroy']);

            // Class Routines (CRUD + bulk)
            Route::get('class-routines', [ClassRoutineController::class, 'index']);
            Route::post('class-routines', [ClassRoutineController::class, 'store']);
            Route::post('class-routines/bulk', [ClassRoutineController::class, 'bulkStore']);
            Route::get('class-routines/{class_routine}', [ClassRoutineController::class, 'show']);
            Route::put('class-routines/{class_routine}', [ClassRoutineController::class, 'update']);
            Route::delete('class-routines/{class_routine}', [ClassRoutineController::class, 'destroy']);

            // Class-subject associations (write)
            Route::post('class-subjects', [AssignmentController::class, 'classSubjectStore']);
            Route::delete('class-subjects/{id}', [AssignmentController::class, 'classSubjectDestroy']);

            // Teacher assignments (write)
            Route::post('teacher-assignments', [AssignmentController::class, 'teacherAssignmentStore']);
            Route::delete('teacher-assignments/{id}', [AssignmentController::class, 'teacherAssignmentDestroy']);

            // Website / Landing page
            Route::get('landing-page/config', [LandingPageController::class, 'getConfig']);
            Route::put('landing-page', [LandingPageController::class, 'update']);
            Route::post('landing-page/upload', [LandingPageController::class, 'upload']);
        });

        // ─── Notices: read for all, write for admin ───
        Route::get('notices', [NoticeController::class, 'index']);
        Route::get('notices/{notice}', [NoticeController::class, 'show']);
        Route::middleware('role:admin,super_admin')->group(function () {
            Route::post('notices', [NoticeController::class, 'store']);
            Route::put('notices/{notice}', [NoticeController::class, 'update']);
            Route::delete('notices/{notice}', [NoticeController::class, 'destroy']);
        });

        // ─── Attendance (admin + teacher) ───
        Route::middleware('role:admin,super_admin,teacher')->group(function () {
            Route::get('attendance', [AttendanceController::class, 'index']);
            Route::post('attendance', [AttendanceController::class, 'store']);
            Route::get('attendance/report', [AttendanceController::class, 'report']);
        });

        // ─── Marks (admin + teacher) ───
        Route::middleware('role:admin,super_admin,teacher')->group(function () {
            Route::get('marks', [MarksController::class, 'index']);
            Route::post('marks', [MarksController::class, 'store']);
        });

        // ─── Assignments (admin + teacher) ───
        Route::middleware('role:admin,super_admin,teacher')->group(function () {
            Route::get('assignments', [AssignmentController::class, 'index']);
            Route::post('assignments', [AssignmentController::class, 'store']);
            Route::get('assignments/{assignment}', [AssignmentController::class, 'show']);
            Route::put('assignments/{assignment}', [AssignmentController::class, 'update']);
            Route::delete('assignments/{assignment}', [AssignmentController::class, 'destroy']);
            Route::get('assignments/{assignment}/submissions', [AssignmentController::class, 'submissions']);
            Route::put('assignment-submissions/{submission}/grade', [AssignmentController::class, 'gradeSubmission']);
        });

        // ─── Assignments: Teacher Portal ───
        Route::middleware('role:teacher,super_admin')->group(function () {
            Route::get('portal/teacher/my-assignments', [AssignmentController::class, 'teacherAssignments']);
        });

        // ─── Lesson Plans (admin + teacher) ───
        Route::middleware('role:admin,super_admin,teacher')->group(function () {
            Route::get('lesson-plans', [LessonPlanController::class, 'index']);
            Route::post('lesson-plans', [LessonPlanController::class, 'store']);
            Route::get('lesson-plans/{id}', [LessonPlanController::class, 'show']);
            Route::put('lesson-plans/{id}', [LessonPlanController::class, 'update']);
            Route::delete('lesson-plans/{id}', [LessonPlanController::class, 'destroy']);
        });

        // ─── Study Materials / Content Links (admin + teacher) ───
        Route::middleware('role:admin,super_admin,teacher')->group(function () {
            Route::get('study-materials', [LessonPlanController::class, 'materials']);
            Route::post('study-materials', [LessonPlanController::class, 'materialStore']);
            Route::get('study-materials/{id}', [LessonPlanController::class, 'materialShow']);
            Route::put('study-materials/{id}', [LessonPlanController::class, 'materialUpdate']);
            Route::delete('study-materials/{id}', [LessonPlanController::class, 'materialDestroy']);
        });

        // ─── Lesson Plans & Materials: Teacher Portal ───
        Route::middleware('role:teacher,super_admin')->prefix('portal/teacher')->group(function () {
            Route::get('lesson-plans', [LessonPlanController::class, 'teacherLessonPlans']);
            Route::get('study-materials', [LessonPlanController::class, 'teacherMaterials']);
        });

        // ─── Study Materials: Student Portal ───
        Route::middleware('role:student,super_admin')->group(function () {
            Route::get('portal/student/study-materials', [LessonPlanController::class, 'studentMaterials']);
        });

        // ─── Assignments: Student Portal ───
        Route::middleware('role:student,super_admin')->group(function () {
            Route::get('portal/student/assignments', [AssignmentController::class, 'studentAssignments']);
            Route::post('portal/student/assignments/{assignment}/submit', [AssignmentController::class, 'submitAssignment']);
        });

        // ─── Fees (admin + accountant) ───
        Route::middleware('role:admin,super_admin,accountant')->group(function () {
            Route::get('fee-heads', [FeeController::class, 'feeHeads']);
            Route::post('fee-heads', [FeeController::class, 'feeHeadStore']);
            Route::get('fee-heads/{fee_head}', [FeeController::class, 'feeHeadShow']);
            Route::put('fee-heads/{fee_head}', [FeeController::class, 'feeHeadUpdate']);
            Route::delete('fee-heads/{fee_head}', [FeeController::class, 'feeHeadDestroy']);
            Route::get('fee-structures', [FeeController::class, 'feeStructures']);
            Route::post('fee-structures', [FeeController::class, 'feeStructureStore']);
            Route::get('fee-structures/{fee_structure}', [FeeController::class, 'feeStructureShow']);
            Route::put('fee-structures/{fee_structure}', [FeeController::class, 'feeStructureUpdate']);
            Route::delete('fee-structures/{fee_structure}', [FeeController::class, 'feeStructureDestroy']);
            Route::get('invoices', [FeeController::class, 'invoices']);
            Route::get('invoices/{invoice}', [FeeController::class, 'invoiceShow']);
            Route::post('invoices', [FeeController::class, 'invoiceStore']);
            Route::put('invoices/{invoice}', [FeeController::class, 'invoiceUpdate']);
            Route::delete('invoices/{invoice}', [FeeController::class, 'invoiceDestroy']);
            Route::post('payments', [FeeController::class, 'collectPayment']);
            Route::get('fees/report', [FeeController::class, 'feeReport']);
        });

        // ─── Portal: Student ───
        Route::middleware('role:student')->prefix('portal')->group(function () {
            Route::get('student', [PortalController::class, 'student']);
        });

        // ─── Portal: Parent ───
        Route::middleware('role:parent,super_admin')->prefix('portal/parent')->group(function () {
            Route::get('students', [PortalController::class, 'parentStudents']);
            Route::get('students/{studentId}', [PortalController::class, 'parentStudentDetail']);
            Route::get('class-routines', [PortalController::class, 'parentClassRoutines']);
            Route::get('exam-routines', [PortalController::class, 'parentExamRoutines']);
            Route::get('assignments', [PortalController::class, 'parentAssignments']);
            Route::get('study-materials', [PortalController::class, 'parentStudyMaterials']);
        });

        // ─── Portal: Teacher ───
        Route::middleware('role:teacher,super_admin')->prefix('portal/teacher')->group(function () {
            Route::get('assignments', [PortalController::class, 'teacherAssignments']);
        });

        // ─── Reports: Student (student + parent + admin) ───
        Route::middleware('role:student,parent,admin,super_admin,teacher')->prefix('reports')->group(function () {
            Route::get('student/report-card', [ReportController::class, 'studentReportCard']);
            Route::get('student/attendance', [ReportController::class, 'studentAttendanceDetail']);
            Route::get('student/fees', [ReportController::class, 'studentFeeHistory']);
            Route::get('notices', [ReportController::class, 'notices']);
        });

        // ─── Reports: Admin — Bulk Result Cards ───
        Route::middleware('role:admin,super_admin')->prefix('reports/admin')->group(function () {
            Route::get('bulk-result-cards', [ReportController::class, 'bulkResultCards']);
            Route::get('search-students', [ReportController::class, 'searchStudentsForResults']);
            Route::get('individual-result-card', [ReportController::class, 'individualResultCard']);
        });

        // ─── Reports: Teacher (teacher + admin) ───
        Route::middleware('role:teacher,admin,super_admin')->prefix('reports/teacher')->group(function () {
            Route::get('section-results', [ReportController::class, 'teacherSectionResults']);
            Route::get('section-attendance', [ReportController::class, 'teacherSectionAttendance']);
        });

        // ─── Reports: Parent (parent) ───
        Route::middleware('role:parent,super_admin')->prefix('reports/parent')->group(function () {
            Route::get('children', [ReportController::class, 'parentChildrenReport']);
        });

        // ─── ID Cards (admin only) ───
        Route::middleware('role:admin,super_admin')->prefix('id-cards')->group(function () {
            Route::get('templates', [IdCardController::class, 'templates']);
            Route::post('templates', [IdCardController::class, 'storeTemplate']);
            Route::put('templates/{id}', [IdCardController::class, 'updateTemplate']);
            Route::delete('templates/{id}', [IdCardController::class, 'destroyTemplate']);
            Route::get('custom-fields', [IdCardController::class, 'customFields']);
            Route::post('custom-fields', [IdCardController::class, 'storeCustomField']);
            Route::put('custom-fields/{id}', [IdCardController::class, 'updateCustomField']);
            Route::delete('custom-fields/{id}', [IdCardController::class, 'destroyCustomField']);
            Route::get('students', [IdCardController::class, 'students']);
            Route::get('employees', [IdCardController::class, 'employees']);
            Route::get('institution', [IdCardController::class, 'institutionInfo']);
        });

        // ─── User Management (admin only) ───
        Route::middleware('role:admin,super_admin')->prefix('user-management')->group(function () {
            Route::get('users', [UserManagementController::class, 'index']);
            Route::post('users', [UserManagementController::class, 'store']);
            Route::get('users/{user}', [UserManagementController::class, 'show']);
            Route::put('users/{user}', [UserManagementController::class, 'update']);
            Route::delete('users/{user}', [UserManagementController::class, 'destroy']);
            Route::get('roles', [UserManagementController::class, 'roles']);
            Route::put('users/{user}/roles', [UserManagementController::class, 'updateRoles']);
            Route::patch('users/{user}/toggle-active', [UserManagementController::class, 'toggleActive']);
        });

        // ─── Super Admin ───
        Route::middleware('role:super_admin')->prefix('super-admin')->group(function () {
            Route::get('institutions', [SuperAdminController::class, 'index']);
            Route::post('institutions', [SuperAdminController::class, 'store']);
            Route::get('stats', [SuperAdminController::class, 'stats']);
            Route::get('institutions/{institution}', [SuperAdminController::class, 'show']);
            Route::put('institutions/{institution}', [SuperAdminController::class, 'update']);
            Route::put('institutions/{institution}/config', [SuperAdminController::class, 'updateConfig']);
            Route::get('institutions/{institution}/verify-domain', [SuperAdminController::class, 'verifyDomain']);
            // Admin user management per institution
            Route::get('institutions/{institution}/admins', [SuperAdminController::class, 'listAdmins']);
            Route::post('institutions/{institution}/admins', [SuperAdminController::class, 'addAdmin']);
            Route::put('institutions/{institution}/admins/{user}', [SuperAdminController::class, 'updateAdmin']);
            Route::post('institutions/{institution}/admins/{user}/reset-password', [SuperAdminController::class, 'resetAdminPassword']);
            Route::patch('institutions/{institution}/admins/{user}/toggle-active', [SuperAdminController::class, 'toggleAdminActive']);
        });

        // ═══════════════════════════════════════════════════════
        //  RESULT CARD & TRANSCRIPT MODULE
        // ═══════════════════════════════════════════════════════

        // ─── Config: Exam Components (admin) ───
        Route::middleware('role:admin,super_admin')->prefix('result-cards')->group(function () {
            // Exam Components CRUD
            Route::get('components', [ResultCardController::class, 'componentIndex']);
            Route::post('components', [ResultCardController::class, 'componentStore']);
            Route::put('components/{id}', [ResultCardController::class, 'componentUpdate']);
            Route::delete('components/{id}', [ResultCardController::class, 'componentDestroy']);

            // Exam Subject Rules
            Route::get('subject-rules', [ResultCardController::class, 'subjectRulesIndex']);
            Route::post('subject-rules', [ResultCardController::class, 'subjectRulesStore']);
            Route::delete('subject-rules/{id}', [ResultCardController::class, 'subjectRuleDestroy']);
            Route::post('subject-rules/auto-generate', [ResultCardController::class, 'autoGenerateRules']);

            // Result Config (Promotion Rules)
            Route::get('result-configs', [ResultCardController::class, 'resultConfigIndex']);
            Route::post('result-configs', [ResultCardController::class, 'resultConfigStore']);
            Route::put('result-configs/{id}', [ResultCardController::class, 'resultConfigUpdate']);
            Route::delete('result-configs/{id}', [ResultCardController::class, 'resultConfigDestroy']);

            // Generate Results
            Route::post('generate', [ResultCardController::class, 'generateResults']);
            Route::post('generate-annual', [ResultCardController::class, 'generateAnnualResults']);

            // Result Summaries (list)
            Route::get('summaries', [ResultCardController::class, 'resultSummaryIndex']);

            // Exam Config Overview
            Route::get('exam-overview/{examTermId}', [ResultCardController::class, 'examOverview']);

            // Result Card Data (API)
            Route::get('card', [ResultCardController::class, 'resultCard']);

            // Attendance Summary
            Route::get('attendance-summary', [ResultCardController::class, 'attendanceSummaryIndex']);
            Route::post('attendance-summary', [ResultCardController::class, 'attendanceSummaryStore']);

            // Behavior Records
            Route::get('behavior', [ResultCardController::class, 'behaviorIndex']);
            Route::post('behavior', [ResultCardController::class, 'behaviorStore']);
            Route::delete('behavior/{id}', [ResultCardController::class, 'behaviorDestroy']);

            // Co-curricular Records
            Route::get('co-curricular', [ResultCardController::class, 'coCurricularIndex']);
            Route::post('co-curricular', [ResultCardController::class, 'coCurricularStore']);
            Route::delete('co-curricular/{id}', [ResultCardController::class, 'coCurricularDestroy']);

            // Teacher Remarks
            Route::get('remarks', [ResultCardController::class, 'remarkIndex']);
            Route::post('remarks', [ResultCardController::class, 'remarkStore']);
        });

        // ─── Component Marks Entry (admin/teacher) ───
        Route::middleware('role:admin,super_admin,teacher')->prefix('result-cards')->group(function () {
            Route::get('component-marks', [ResultCardController::class, 'componentMarksIndex']);
            Route::post('component-marks', [ResultCardController::class, 'componentMarksStore']);
        });
    });

    // ─── Public: QR Verification ───
    Route::get('result-cards/verify/{token}', [ResultCardController::class, 'verify']);
    Route::get('result-cards/qr/{token}', [ResultCardController::class, 'qrCode']);

    // ─── Public: Result Card Web View + PDF ───
    Route::get('results/{student}/{year}', [ResultCardController::class, 'resultCardView']);
    Route::get('results/{student}/{year}/pdf', [ResultCardController::class, 'resultCardPdf']);

    // ═══════════════════════════════════════════════
    // COMMUNITY MODULE
    // ═══════════════════════════════════════════════
    Route::middleware('auth:sanctum')->prefix('community')->group(function () {

        // ─── Community status (any authenticated user) ───
        Route::get('status', [CommunitySettingsController::class, 'status']);

        // ─── Feed (any authenticated user with community enabled) ───
        Route::get('feed', [CommunityPostController::class, 'feed']);
        Route::get('my-posts', [CommunityPostController::class, 'myPosts']);

        // ─── Posts CRUD ───
        Route::post('posts', [CommunityPostController::class, 'store']);
        Route::get('posts/{id}', [CommunityPostController::class, 'show']);
        Route::patch('posts/{id}', [CommunityPostController::class, 'update']);
        Route::delete('posts/{id}', [CommunityPostController::class, 'destroy']);
        Route::post('posts/{id}/publish', [CommunityPostController::class, 'publish']);

        // ─── Likes ───
        Route::post('posts/{id}/like', [CommunityPostController::class, 'like']);
        Route::delete('posts/{id}/like', [CommunityPostController::class, 'unlike']);

        // ─── Comments ───
        Route::get('posts/{id}/comments', [CommunityPostController::class, 'comments']);
        Route::post('posts/{id}/comments', [CommunityPostController::class, 'addComment']);

        // ─── Reports ───
        Route::post('reports', [CommunityPostController::class, 'report']);

        // ─── Competitions ───
        Route::get('competitions', [CommunityCompetitionController::class, 'index']);
        Route::get('competitions/{id}', [CommunityCompetitionController::class, 'show']);
        Route::post('competitions', [CommunityCompetitionController::class, 'store'])->middleware('role:admin,super_admin');
        Route::patch('competitions/{id}', [CommunityCompetitionController::class, 'update'])->middleware('role:admin,super_admin');
        Route::post('competitions/{id}/invite', [CommunityCompetitionController::class, 'invite'])->middleware('role:admin,super_admin');
        Route::patch('competitions/{id}/respond', [CommunityCompetitionController::class, 'respond'])->middleware('role:admin,super_admin');

        // ─── Settings (School admin + super admin) ───
        Route::middleware('role:admin,super_admin')->group(function () {
            Route::get('settings', [CommunitySettingsController::class, 'show']);
            Route::patch('settings', [CommunitySettingsController::class, 'update']);
        });

        // ─── Moderation (admin / super_admin) ───
        Route::middleware('role:admin,super_admin')->prefix('moderation')->group(function () {
            Route::get('reports', [CommunityModerationController::class, 'reports']);
            Route::patch('reports/{id}', [CommunityModerationController::class, 'reviewReport']);
            Route::post('posts/{id}/remove', [CommunityModerationController::class, 'removePost']);
            Route::post('posts/{id}/restore', [CommunityModerationController::class, 'restorePost']);
            Route::post('comments/{id}/remove', [CommunityModerationController::class, 'removeComment']);
            Route::get('flagged', [CommunityModerationController::class, 'flaggedContent']);
            Route::get('stats', [CommunityModerationController::class, 'stats']);
        });

        // ─── Audit Log & Super-admin settings ───
        Route::middleware('role:super_admin')->group(function () {
            Route::get('moderation/audit-log', [CommunityModerationController::class, 'auditLog']);
            Route::get('settings/all', [CommunitySettingsController::class, 'all']);
            Route::post('settings/toggle-all', [CommunitySettingsController::class, 'toggleAll']);
        });
    });
});
