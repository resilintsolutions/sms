<?php

namespace App\Services;

use App\Models\AttendanceSummary;
use App\Models\BehaviorRecord;
use App\Models\CoCurricularRecord;
use App\Models\ExamTerm;
use App\Models\GradeRule;
use App\Models\Institution;
use App\Models\ResultSummary;
use App\Models\StudentEnrollment;
use App\Models\TeacherRemark;
use App\Models\VerificationToken;

class ResultCardService
{
    /**
     * Assemble complete result card data for a student + academic year.
     * Used for both web view and PDF generation.
     */
    public function getResultCardData(int $enrollmentId, int $sessionId, ?int $examTermId = null): array
    {
        $enrollment = StudentEnrollment::with([
            'student.guardians',
            'section.classModel',
            'academicSession',
        ])->findOrFail($enrollmentId);

        $student = $enrollment->student;
        $section = $enrollment->section;
        $classModel = $section->classModel;
        $institution = Institution::findOrFail($student->institution_id);

        // Exam terms for this session
        $examTerms = ExamTerm::where('institution_id', $institution->id)
            ->where('academic_session_id', $sessionId)
            ->orderBy('start_date')
            ->get();

        // Result summaries (per exam term + annual if exists)
        $summaryQuery = ResultSummary::where('student_enrollment_id', $enrollment->id)
            ->where('academic_session_id', $sessionId);

        if ($examTermId) {
            $summaryQuery->where('exam_term_id', $examTermId);
        }

        $summaries = $summaryQuery->with('examTerm')->orderBy('exam_term_id')->get();

        // Grade scale
        $gradeRules = GradeRule::where('institution_id', $institution->id)
            ->where(function ($q) use ($classModel) {
                $q->where('class_id', $classModel->id)->orWhereNull('class_id');
            })
            ->orderByDesc('min_marks')
            ->get()
            ->map(fn ($r) => [
                'letter_grade' => $r->letter_grade,
                'grade_point' => $r->grade_point,
                'min_marks' => $r->min_marks,
                'max_marks' => $r->max_marks,
            ]);

        // Attendance summary
        $attendanceSummaryQuery = AttendanceSummary::where('student_enrollment_id', $enrollment->id)
            ->where('academic_session_id', $sessionId);
        if ($examTermId) {
            $attendanceSummaryQuery->where('exam_term_id', $examTermId);
        }
        $attendance = $attendanceSummaryQuery->get();

        // Behavior records
        $behavior = BehaviorRecord::where('student_enrollment_id', $enrollment->id)
            ->where('academic_session_id', $sessionId)
            ->when($examTermId, fn($q) => $q->where('exam_term_id', $examTermId))
            ->get()
            ->map(fn ($b) => [
                'category' => $b->category,
                'rating' => $b->rating,
                'label' => $b->rating_label,
                'note' => $b->note,
            ]);

        // Co-curricular records
        $coCurricular = CoCurricularRecord::where('student_enrollment_id', $enrollment->id)
            ->where('academic_session_id', $sessionId)
            ->get();

        // Teacher remarks
        $remarksQuery = TeacherRemark::where('student_enrollment_id', $enrollment->id)
            ->where('academic_session_id', $sessionId);
        if ($examTermId) {
            $remarksQuery->where('exam_term_id', $examTermId);
        }
        $remarks = $remarksQuery->get();

        // Verification token (generate if not exists)
        $verificationToken = VerificationToken::generate(
            $institution->id,
            $enrollment->id,
            $sessionId,
            $examTermId,
            'result_card'
        );

        // Father/mother from guardians
        $fatherGuardian = $student->guardians->first(fn($g) => strtolower($g->relation ?? '') === 'father');
        $motherGuardian = $student->guardians->first(fn($g) => strtolower($g->relation ?? '') === 'mother');

        return [
            'institution' => [
                'name' => $institution->name,
                'name_bn' => $institution->name_bn ?? $institution->name,
                'address' => $institution->address ?? '',
                'address_bn' => $institution->address_bn ?? $institution->address ?? '',
                'phone' => $institution->phone ?? '',
                'email' => $institution->email ?? '',
                'logo' => $institution->logo ?? '',
                'eiin' => $institution->eiin ?? '',
            ],
            'student' => [
                'id' => $student->id,
                'student_id' => $student->student_id,
                'name' => $student->name,
                'name_bn' => $student->name_bn ?? $student->name,
                'photo' => $student->photo,
                'gender' => $student->gender,
                'date_of_birth' => $student->date_of_birth?->format('Y-m-d'),
                'blood_group' => $student->blood_group,
                'father_name' => $fatherGuardian?->name ?? '',
                'father_name_bn' => $fatherGuardian?->name_bn ?? $fatherGuardian?->name ?? '',
                'mother_name' => $motherGuardian?->name ?? '',
                'mother_name_bn' => $motherGuardian?->name_bn ?? $motherGuardian?->name ?? '',
            ],
            'enrollment' => [
                'class_name' => $classModel->name,
                'section_name' => $section->name,
                'group' => $classModel->group,
                'session_name' => $enrollment->academicSession->name,
                'roll_no' => $enrollment->roll_no,
            ],
            'exam_terms' => $examTerms->map(fn ($et) => [
                'id' => $et->id,
                'name' => $et->name,
                'name_bn' => $et->name_bn ?? $et->name,
                'exam_type' => $et->exam_type,
                'weight' => (float) $et->weight,
                'start_date' => $et->start_date?->format('Y-m-d'),
                'end_date' => $et->end_date?->format('Y-m-d'),
            ]),
            'result_summaries' => $summaries->map(fn ($s) => [
                'exam_term_id' => $s->exam_term_id,
                'exam_term_name' => $s->examTerm?->name ?? 'Annual',
                'total_marks' => $s->total_marks,
                'total_full_marks' => $s->total_full_marks,
                'percentage' => $s->percentage,
                'gpa' => $s->gpa,
                'letter_grade' => $s->letter_grade,
                'fail_count' => $s->fail_count,
                'position' => $s->position,
                'total_students' => $s->total_students,
                'status' => $s->status,
                'promoted' => $s->promoted,
                'subject_grades' => $s->subject_grades,
            ]),
            'grade_scale' => $gradeRules,
            'attendance' => $attendance->map(fn ($a) => [
                'exam_term_id' => $a->exam_term_id,
                'total_days' => $a->total_days,
                'present_days' => $a->present_days,
                'absent_days' => $a->absent_days,
                'late_days' => $a->late_days,
                'leave_days' => $a->leave_days,
                'attendance_percent' => $a->attendance_percent,
            ]),
            'behavior' => $behavior,
            'co_curricular' => $coCurricular->map(fn ($c) => [
                'activity' => $c->activity,
                'activity_bn' => $c->activity_bn ?? $c->activity,
                'achievement' => $c->achievement,
                'achievement_bn' => $c->achievement_bn ?? $c->achievement,
                'date' => $c->activity_date?->format('Y-m-d'),
            ]),
            'teacher_remarks' => $remarks->map(fn ($r) => [
                'exam_term_id' => $r->exam_term_id,
                'class_teacher_remark' => $r->class_teacher_remark,
                'principal_remark' => $r->principal_remark,
                'guardian_comment' => $r->guardian_comment,
            ]),
            'verification' => [
                'token' => $verificationToken->token,
                'url' => url("/verify/{$verificationToken->token}"),
                'qr_url' => url("/api/v1/result-cards/qr/{$verificationToken->token}"),
            ],
        ];
    }
}
