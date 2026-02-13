<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveExamSubjectRulesRequest;
use App\Http\Requests\SaveResultConfigRequest;
use App\Http\Requests\StoreBehaviorRecordRequest;
use App\Http\Requests\StoreComponentMarksRequest;
use App\Http\Requests\StoreExamComponentRequest;
use App\Http\Requests\StoreTeacherRemarkRequest;
use App\Models\AttendanceSummary;
use App\Models\BehaviorRecord;
use App\Models\CoCurricularRecord;
use App\Models\ComponentMark;
use App\Models\ExamComponent;
use App\Models\ExamSubjectRule;
use App\Models\ResultConfig;
use App\Models\ResultSummary;
use App\Models\StudentEnrollment;
use App\Models\TeacherRemark;
use App\Models\VerificationToken;
use App\Services\ExamConfigService;
use App\Services\ResultCalculatorService;
use App\Services\ResultCardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResultCardController extends Controller
{
    public function __construct(
        private ExamConfigService $examConfigService,
        private ResultCalculatorService $resultCalculator,
        private ResultCardService $resultCardService,
    ) {}

    // ═══════════════════════════════════════════════════════
    //  EXAM COMPONENTS (Admin Config)
    // ═══════════════════════════════════════════════════════

    public function componentIndex(Request $request): JsonResponse
    {
        $institutionId = $request->user()->institution_id;
        $components = $this->examConfigService->getComponents($institutionId);
        return response()->json(['success' => true, 'data' => $components]);
    }

    public function componentStore(StoreExamComponentRequest $request): JsonResponse
    {
        $institutionId = $request->user()->institution_id;
        $component = $this->examConfigService->saveComponent(
            $institutionId,
            $request->validated()
        );
        return response()->json(['success' => true, 'data' => $component], 201);
    }

    public function componentUpdate(StoreExamComponentRequest $request, int $id): JsonResponse
    {
        $institutionId = $request->user()->institution_id;
        $component = $this->examConfigService->saveComponent(
            $institutionId,
            $request->validated(),
            $id
        );
        return response()->json(['success' => true, 'data' => $component]);
    }

    public function componentDestroy(int $id): JsonResponse
    {
        ExamComponent::findOrFail($id)->delete();
        return response()->json(['success' => true, 'message' => 'Deleted']);
    }

    // ═══════════════════════════════════════════════════════
    //  EXAM SUBJECT RULES (Admin Config)
    // ═══════════════════════════════════════════════════════

    public function subjectRulesIndex(Request $request): JsonResponse
    {
        $request->validate([
            'exam_term_id' => 'required|exists:exam_terms,id',
            'class_id' => 'required|exists:classes,id',
        ]);

        $rules = $this->examConfigService->getSubjectRules(
            $request->exam_term_id,
            $request->class_id
        );

        return response()->json(['success' => true, 'data' => $rules]);
    }

    public function subjectRulesStore(SaveExamSubjectRulesRequest $request): JsonResponse
    {
        $count = $this->examConfigService->saveSubjectRules(
            $request->exam_term_id,
            $request->class_id,
            $request->rules
        );

        return response()->json(['success' => true, 'message' => "{$count} rules saved"]);
    }

    public function subjectRuleDestroy(int $id): JsonResponse
    {
        $this->examConfigService->deleteSubjectRule($id);
        return response()->json(['success' => true, 'message' => 'Deleted']);
    }

    public function autoGenerateRules(Request $request): JsonResponse
    {
        $request->validate([
            'exam_term_id' => 'required|exists:exam_terms,id',
            'class_id' => 'required|exists:classes,id',
        ]);

        $count = $this->examConfigService->autoGenerateRules(
            $request->exam_term_id,
            $request->class_id,
            $request->user()->institution_id
        );

        return response()->json(['success' => true, 'message' => "{$count} rules auto-generated"]);
    }

    // ═══════════════════════════════════════════════════════
    //  COMPONENT MARKS ENTRY (Admin/Teacher)
    // ═══════════════════════════════════════════════════════

    public function componentMarksIndex(Request $request): JsonResponse
    {
        $request->validate([
            'exam_term_id' => 'required|exists:exam_terms,id',
            'section_id' => 'required|exists:sections,id',
            'subject_id' => 'required|exists:subjects,id',
            'component_id' => 'required|exists:exam_components,id',
        ]);

        $enrollments = StudentEnrollment::where('section_id', $request->section_id)
            ->with('student')
            ->orderBy('roll_no')
            ->get();

        $marks = ComponentMark::where('exam_term_id', $request->exam_term_id)
            ->where('subject_id', $request->subject_id)
            ->where('component_id', $request->component_id)
            ->whereIn('student_enrollment_id', $enrollments->pluck('id'))
            ->get()
            ->keyBy('student_enrollment_id');

        // Get rule for max_marks
        $rule = ExamSubjectRule::where('exam_term_id', $request->exam_term_id)
            ->where('subject_id', $request->subject_id)
            ->where('component_id', $request->component_id)
            ->first();

        $data = $enrollments->map(function ($e) use ($marks, $rule) {
            $m = $marks->get($e->id);
            return [
                'student_enrollment_id' => $e->id,
                'student' => $e->student,
                'roll_no' => $e->roll_no,
                'marks_obtained' => $m?->marks_obtained,
                'max_marks' => $m?->max_marks ?? $rule?->max_marks ?? 100,
                'absent_code' => $m?->absent_code,
            ];
        });

        return response()->json(['success' => true, 'data' => $data, 'rule' => $rule]);
    }

    public function componentMarksStore(StoreComponentMarksRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $userId = $request->user()?->id;

        foreach ($validated['marks'] as $m) {
            ComponentMark::updateOrCreate(
                [
                    'exam_term_id' => $validated['exam_term_id'],
                    'student_enrollment_id' => $m['student_enrollment_id'],
                    'subject_id' => $validated['subject_id'],
                    'component_id' => $validated['component_id'],
                ],
                [
                    'marks_obtained' => isset($m['absent_code']) ? null : ($m['marks_obtained'] ?? null),
                    'max_marks' => $m['max_marks'],
                    'absent_code' => $m['absent_code'] ?? null,
                    'entered_by' => $userId,
                ]
            );
        }

        return response()->json(['success' => true, 'message' => 'Component marks saved']);
    }

    // ═══════════════════════════════════════════════════════
    //  RESULT CONFIG (Promotion Rules)
    // ═══════════════════════════════════════════════════════

    public function resultConfigIndex(Request $request): JsonResponse
    {
        $configs = ResultConfig::where('institution_id', $request->user()->institution_id)
            ->with(['classModel', 'academicSession'])
            ->orderByDesc('is_active')
            ->get();

        return response()->json(['success' => true, 'data' => $configs]);
    }

    public function resultConfigStore(SaveResultConfigRequest $request): JsonResponse
    {
        $config = ResultConfig::create(
            array_merge($request->validated(), ['institution_id' => $request->user()->institution_id])
        );

        return response()->json(['success' => true, 'data' => $config], 201);
    }

    public function resultConfigUpdate(SaveResultConfigRequest $request, int $id): JsonResponse
    {
        $config = ResultConfig::findOrFail($id);
        $config->update($request->validated());
        return response()->json(['success' => true, 'data' => $config]);
    }

    public function resultConfigDestroy(int $id): JsonResponse
    {
        ResultConfig::findOrFail($id)->delete();
        return response()->json(['success' => true, 'message' => 'Deleted']);
    }

    // ═══════════════════════════════════════════════════════
    //  GENERATE RESULTS
    // ═══════════════════════════════════════════════════════

    public function generateResults(Request $request): JsonResponse
    {
        $request->validate([
            'exam_term_id' => 'required|exists:exam_terms,id',
            'class_id' => 'nullable|exists:classes,id',
        ]);

        $result = $this->resultCalculator->generateResults(
            $request->exam_term_id,
            $request->user()->institution_id,
            $request->class_id
        );

        return response()->json(['success' => true, ...$result]);
    }

    public function generateAnnualResults(Request $request): JsonResponse
    {
        $request->validate([
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'class_id' => 'nullable|exists:classes,id',
        ]);

        $result = $this->resultCalculator->generateAnnualResult(
            $request->user()->institution_id,
            $request->academic_session_id,
            $request->class_id
        );

        return response()->json(['success' => true, ...$result]);
    }

    // ═══════════════════════════════════════════════════════
    //  RESULT CARD VIEW (Web + API)
    // ═══════════════════════════════════════════════════════

    public function resultCard(Request $request): JsonResponse
    {
        $request->validate([
            'student_enrollment_id' => 'required|exists:student_enrollments,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'exam_term_id' => 'nullable|exists:exam_terms,id',
        ]);

        $data = $this->resultCardService->getResultCardData(
            $request->student_enrollment_id,
            $request->academic_session_id,
            $request->exam_term_id
        );

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Web view of result card (Blade).
     */
    public function resultCardView(int $studentId, int $year)
    {
        $enrollment = StudentEnrollment::whereHas('student', fn($q) => $q->where('id', $studentId))
            ->whereHas('academicSession', fn($q) => $q->where('id', $year))
            ->firstOrFail();

        $data = $this->resultCardService->getResultCardData($enrollment->id, $year);

        return view('result-cards.show', compact('data'));
    }

    /**
     * PDF download of result card.
     */
    public function resultCardPdf(int $studentId, int $year)
    {
        $enrollment = StudentEnrollment::whereHas('student', fn($q) => $q->where('id', $studentId))
            ->whereHas('academicSession', fn($q) => $q->where('id', $year))
            ->firstOrFail();

        $data = $this->resultCardService->getResultCardData($enrollment->id, $year);

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('result-cards.pdf', compact('data'))
            ->setPaper('a4', 'portrait')
            ->setOptions(['isHtml5ParserEnabled' => true, 'isRemoteEnabled' => true]);

        $filename = "Result_Card_{$data['student']['student_id']}_{$data['enrollment']['session_name']}.pdf";

        return $pdf->download($filename);
    }

    // ═══════════════════════════════════════════════════════
    //  QR VERIFICATION
    // ═══════════════════════════════════════════════════════

    public function verify(string $token): JsonResponse
    {
        $vt = VerificationToken::with([
            'studentEnrollment.student',
            'studentEnrollment.section.classModel',
            'academicSession',
            'examTerm',
            'institution',
        ])->where('token', $token)->first();

        if (!$vt) {
            return response()->json(['success' => false, 'message' => 'Invalid verification token'], 404);
        }

        if ($vt->isExpired()) {
            return response()->json(['success' => false, 'message' => 'Token has expired'], 410);
        }

        $enrollment = $vt->studentEnrollment;
        $summary = ResultSummary::where('student_enrollment_id', $enrollment->id)
            ->where(function ($q) use ($vt) {
                if ($vt->exam_term_id) {
                    $q->where('exam_term_id', $vt->exam_term_id);
                } else {
                    $q->whereNull('exam_term_id');
                }
            })
            ->first();

        return response()->json([
            'success' => true,
            'verified' => true,
            'data' => [
                'institution' => $vt->institution->name,
                'student_name' => $enrollment->student->name,
                'student_id' => $enrollment->student->student_id,
                'class' => $enrollment->section->classModel->name,
                'section' => $enrollment->section->name,
                'session' => $vt->academicSession->name,
                'exam' => $vt->examTerm?->name ?? 'Annual',
                'gpa' => $summary?->gpa,
                'grade' => $summary?->letter_grade,
                'status' => $summary?->status,
                'position' => $summary?->position,
                'doc_type' => $vt->doc_type,
            ],
        ]);
    }

    public function qrCode(string $token)
    {
        $vt = VerificationToken::where('token', $token)->firstOrFail();
        $verifyUrl = url("/verify/{$token}");

        $qr = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('svg')
            ->size(200)
            ->errorCorrection('H')
            ->generate($verifyUrl);

        return response($qr, 200, ['Content-Type' => 'image/svg+xml']);
    }

    // ═══════════════════════════════════════════════════════
    //  BEHAVIOR RECORDS
    // ═══════════════════════════════════════════════════════

    public function behaviorIndex(Request $request): JsonResponse
    {
        $request->validate([
            'student_enrollment_id' => 'required|exists:student_enrollments,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
        ]);

        $records = BehaviorRecord::where('student_enrollment_id', $request->student_enrollment_id)
            ->where('academic_session_id', $request->academic_session_id)
            ->get();

        return response()->json(['success' => true, 'data' => $records]);
    }

    public function behaviorStore(StoreBehaviorRecordRequest $request): JsonResponse
    {
        $record = BehaviorRecord::create(
            array_merge($request->validated(), ['recorded_by' => $request->user()->id])
        );

        return response()->json(['success' => true, 'data' => $record], 201);
    }

    public function behaviorDestroy(int $id): JsonResponse
    {
        BehaviorRecord::findOrFail($id)->delete();
        return response()->json(['success' => true, 'message' => 'Deleted']);
    }

    // ═══════════════════════════════════════════════════════
    //  CO-CURRICULAR RECORDS
    // ═══════════════════════════════════════════════════════

    public function coCurricularIndex(Request $request): JsonResponse
    {
        $request->validate([
            'student_enrollment_id' => 'required|exists:student_enrollments,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
        ]);

        $records = CoCurricularRecord::where('student_enrollment_id', $request->student_enrollment_id)
            ->where('academic_session_id', $request->academic_session_id)
            ->get();

        return response()->json(['success' => true, 'data' => $records]);
    }

    public function coCurricularStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_enrollment_id' => 'required|exists:student_enrollments,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'activity' => 'required|string|max:200',
            'activity_bn' => 'nullable|string|max:200',
            'achievement' => 'nullable|string|max:200',
            'achievement_bn' => 'nullable|string|max:200',
            'activity_date' => 'nullable|date',
            'note' => 'nullable|string|max:500',
        ]);

        $record = CoCurricularRecord::create(
            array_merge($validated, ['recorded_by' => $request->user()->id])
        );

        return response()->json(['success' => true, 'data' => $record], 201);
    }

    public function coCurricularDestroy(int $id): JsonResponse
    {
        CoCurricularRecord::findOrFail($id)->delete();
        return response()->json(['success' => true, 'message' => 'Deleted']);
    }

    // ═══════════════════════════════════════════════════════
    //  TEACHER REMARKS
    // ═══════════════════════════════════════════════════════

    public function remarkIndex(Request $request): JsonResponse
    {
        $request->validate([
            'student_enrollment_id' => 'required|exists:student_enrollments,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
        ]);

        $remarks = TeacherRemark::where('student_enrollment_id', $request->student_enrollment_id)
            ->where('academic_session_id', $request->academic_session_id)
            ->get();

        return response()->json(['success' => true, 'data' => $remarks]);
    }

    public function remarkStore(StoreTeacherRemarkRequest $request): JsonResponse
    {
        $remark = TeacherRemark::updateOrCreate(
            [
                'student_enrollment_id' => $request->student_enrollment_id,
                'exam_term_id' => $request->exam_term_id,
            ],
            array_merge($request->validated(), ['remarked_by' => $request->user()->id])
        );

        return response()->json(['success' => true, 'data' => $remark]);
    }

    // ═══════════════════════════════════════════════════════
    //  ATTENDANCE SUMMARY
    // ═══════════════════════════════════════════════════════

    public function attendanceSummaryIndex(Request $request): JsonResponse
    {
        $request->validate([
            'student_enrollment_id' => 'required|exists:student_enrollments,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
        ]);

        $summaries = AttendanceSummary::where('student_enrollment_id', $request->student_enrollment_id)
            ->where('academic_session_id', $request->academic_session_id)
            ->get();

        return response()->json(['success' => true, 'data' => $summaries]);
    }

    public function attendanceSummaryStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_enrollment_id' => 'required|exists:student_enrollments,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'exam_term_id' => 'nullable|exists:exam_terms,id',
            'total_days' => 'required|integer|min:0',
            'present_days' => 'required|integer|min:0',
            'absent_days' => 'nullable|integer|min:0',
            'late_days' => 'nullable|integer|min:0',
            'leave_days' => 'nullable|integer|min:0',
        ]);

        $validated['absent_days'] = $validated['absent_days'] ?? ($validated['total_days'] - $validated['present_days']);
        $validated['attendance_percent'] = $validated['total_days'] > 0
            ? round(($validated['present_days'] / $validated['total_days']) * 100, 2)
            : 0;

        $summary = AttendanceSummary::updateOrCreate(
            [
                'student_enrollment_id' => $validated['student_enrollment_id'],
                'exam_term_id' => $validated['exam_term_id'] ?? null,
            ],
            $validated
        );

        return response()->json(['success' => true, 'data' => $summary]);
    }

    // ═══════════════════════════════════════════════════════
    //  EXAM CONFIG OVERVIEW
    // ═══════════════════════════════════════════════════════

    public function examOverview(int $examTermId): JsonResponse
    {
        $overview = $this->examConfigService->getExamOverview($examTermId);
        return response()->json(['success' => true, 'data' => $overview]);
    }

    // ═══════════════════════════════════════════════════════
    //  RESULT SUMMARIES LIST (for admin dashboard)
    // ═══════════════════════════════════════════════════════

    public function resultSummaryIndex(Request $request): JsonResponse
    {
        $request->validate([
            'exam_term_id' => 'nullable|exists:exam_terms,id',
            'academic_session_id' => 'required|exists:academic_sessions,id',
            'class_id' => 'nullable|exists:classes,id',
            'section_id' => 'nullable|exists:sections,id',
        ]);

        $query = ResultSummary::where('academic_session_id', $request->academic_session_id)
            ->where('institution_id', $request->user()->institution_id)
            ->with([
                'studentEnrollment.student',
                'studentEnrollment.section.classModel',
                'examTerm',
            ]);

        if ($request->exam_term_id) {
            $query->where('exam_term_id', $request->exam_term_id);
        }

        if ($request->section_id) {
            $query->whereHas('studentEnrollment', fn($q) => $q->where('section_id', $request->section_id));
        } elseif ($request->class_id) {
            $query->whereHas('studentEnrollment.section', fn($q) => $q->where('class_id', $request->class_id));
        }

        $summaries = $query->orderBy('position')->get();

        return response()->json(['success' => true, 'data' => $summaries]);
    }
}
