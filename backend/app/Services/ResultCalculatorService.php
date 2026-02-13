<?php

namespace App\Services;

use App\Models\ClassSubject;
use App\Models\ComponentMark;
use App\Models\ExamSubjectRule;
use App\Models\ExamTerm;
use App\Models\GradeRule;
use App\Models\Mark;
use App\Models\ResultConfig;
use App\Models\ResultSummary;
use App\Models\Section;
use App\Models\StudentEnrollment;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ResultCalculatorService
{
    /**
     * Generate results for a given exam term and institution.
     * This is the main entry point — computes per-subject totals, grades, GPA, overall,
     * fail count, pass/fail status, position, and promotion.
     *
     * @param int $examTermId
     * @param int $institutionId
     * @param int|null $classId  Optional: limit to a specific class
     * @return array  Summary of generated results
     */
    public function generateResults(int $examTermId, int $institutionId, ?int $classId = null): array
    {
        return DB::transaction(function () use ($examTermId, $institutionId, $classId) {
            $examTerm = ExamTerm::with('examRoutines')->findOrFail($examTermId);

            // Determine which classes this exam covers
            $targetClassIds = $classId
                ? collect([$classId])
                : $examTerm->examRoutines->pluck('class_id')->unique()->filter()->values();

            if ($targetClassIds->isEmpty()) {
                return ['message' => 'No classes found for this exam', 'count' => 0];
            }

            $sectionIds = Section::whereIn('class_id', $targetClassIds)->pluck('id');
            $enrollments = StudentEnrollment::whereIn('section_id', $sectionIds)
                ->where('academic_session_id', $examTerm->academic_session_id)
                ->with('section')
                ->get();

            // Check if we should use component marks or legacy marks
            $config = ResultConfig::findFor($institutionId);
            $useComponents = $config?->use_component_marks ?? false;

            $summaries = [];

            foreach ($enrollments as $enrollment) {
                $classIdForEnrollment = $enrollment->section->class_id;

                // Get subjects for this class
                $classSubjects = ClassSubject::where('class_id', $classIdForEnrollment)
                    ->with('subject')
                    ->get();

                $subjectGrades = [];
                $totalMarks = 0;
                $totalFullMarks = 0;
                $failCount = 0;
                $subjectGpas = [];
                $hasAnyMarks = false;

                foreach ($classSubjects as $cs) {
                    $subjectResult = $useComponents
                        ? $this->calculateSubjectFromComponents($examTermId, $enrollment->id, $cs->subject_id, $classIdForEnrollment)
                        : $this->calculateSubjectFromLegacy($examTermId, $enrollment->id, $cs->subject_id);

                    if ($subjectResult === null) continue; // No marks entered

                    $hasAnyMarks = true;
                    $fullMarks = $cs->full_marks;
                    $passMark = $cs->pass_marks ?? round($fullMarks * ($config?->pass_marks_percent ?? 33) / 100);

                    // Normalize obtained to full_marks scale if needed
                    $obtained = $subjectResult['total'];
                    $rawFull = $subjectResult['full_marks'];
                    if ($rawFull > 0 && $rawFull != $fullMarks) {
                        $obtained = round(($obtained / $rawFull) * $fullMarks, 2);
                    }

                    // Get grade for percentage (0-100 scale)
                    $percentage = $rawFull > 0 ? round(($subjectResult['total'] / $rawFull) * 100, 2) : 0;
                    $gradeInfo = GradeRule::getGradeForMarks((int) round($percentage), $classIdForEnrollment, $institutionId);

                    $failed = $obtained < $passMark;
                    if ($failed) $failCount++;

                    $subjectGpas[] = $gradeInfo ? $gradeInfo['grade_point'] : 0;
                    $totalMarks += $obtained;
                    $totalFullMarks += $fullMarks;

                    $subjectGrades[] = [
                        'subject_id' => $cs->subject_id,
                        'subject_name' => $cs->subject->name,
                        'obtained' => $obtained,
                        'full_marks' => $fullMarks,
                        'percentage' => $percentage,
                        'grade' => $gradeInfo['letter_grade'] ?? null,
                        'gpa' => $gradeInfo['grade_point'] ?? null,
                        'passed' => !$failed,
                        'components' => $subjectResult['components'] ?? [],
                    ];
                }

                if (!$hasAnyMarks) continue;

                // Overall GPA (average of subject GPAs, Bangladesh system)
                $overallGpa = count($subjectGpas) > 0
                    ? round(collect($subjectGpas)->avg(), 2)
                    : null;

                // Override GPA: if any subject failed, GPA = 0.00 (Bangladesh rule)
                if ($failCount > 0 && $overallGpa !== null) {
                    $overallGpa = 0.00;
                }

                $overallPercentage = $totalFullMarks > 0 ? round(($totalMarks / $totalFullMarks) * 100, 2) : null;
                $overallGrade = GradeRule::getGradeForMarks((int) round($overallPercentage ?? 0), $classIdForEnrollment, $institutionId);

                // If failed, set grade to F
                if ($failCount > 0) {
                    $letterGrade = 'F';
                    $overallGpa = 0.00;
                } else {
                    $letterGrade = $overallGrade['letter_grade'] ?? null;
                }

                // Determine pass/fail based on config rules
                $status = $this->determineStatus($config, $failCount, $overallGpa, $subjectGrades);

                $summaries[] = ResultSummary::updateOrCreate(
                    [
                        'student_enrollment_id' => $enrollment->id,
                        'exam_term_id' => $examTermId,
                    ],
                    [
                        'institution_id' => $institutionId,
                        'academic_session_id' => $examTerm->academic_session_id,
                        'total_marks' => $totalMarks,
                        'total_full_marks' => $totalFullMarks,
                        'percentage' => $overallPercentage,
                        'gpa' => $overallGpa,
                        'letter_grade' => $letterGrade,
                        'fail_count' => $failCount,
                        'status' => $status,
                        'promoted' => $status === 'pass',
                        'subject_grades' => $subjectGrades,
                    ]
                );
            }

            // Calculate positions per class
            $this->assignPositions($examTermId, $targetClassIds, $examTerm->academic_session_id);

            return [
                'message' => 'Results generated successfully',
                'count' => count($summaries),
                'exam_term' => $examTerm->name,
            ];
        });
    }

    /**
     * Calculate a subject total from component marks.
     */
    private function calculateSubjectFromComponents(int $examTermId, int $enrollmentId, int $subjectId, int $classId): ?array
    {
        $rules = ExamSubjectRule::where('exam_term_id', $examTermId)
            ->where('class_id', $classId)
            ->where('subject_id', $subjectId)
            ->with('component')
            ->get();

        if ($rules->isEmpty()) {
            // Fall back to legacy marks
            return $this->calculateSubjectFromLegacy($examTermId, $enrollmentId, $subjectId);
        }

        $componentMarks = ComponentMark::where('exam_term_id', $examTermId)
            ->where('student_enrollment_id', $enrollmentId)
            ->where('subject_id', $subjectId)
            ->get()
            ->keyBy('component_id');

        $total = 0;
        $fullTotal = 0;
        $components = [];
        $hasAny = false;

        foreach ($rules as $rule) {
            $cm = $componentMarks->get($rule->component_id);
            $obtained = $cm?->marks_obtained;
            $absent = $cm?->absent_code;

            if ($obtained !== null) {
                $hasAny = true;
                // Apply weight: converted = (obtained / max) * (max * weight)
                $converted = $rule->weight != 1
                    ? round(($obtained / $rule->max_marks) * ($rule->max_marks * $rule->weight), 2)
                    : $obtained;
                $total += $converted;
            }

            $effectiveMax = round($rule->max_marks * $rule->weight, 2);
            $fullTotal += $effectiveMax;

            $components[] = [
                'component_id' => $rule->component_id,
                'component_name' => $rule->component->name,
                'max_marks' => $rule->max_marks,
                'weight' => (float) $rule->weight,
                'effective_max' => $effectiveMax,
                'obtained' => $obtained,
                'absent' => $absent,
            ];
        }

        return $hasAny ? ['total' => $total, 'full_marks' => $fullTotal, 'components' => $components] : null;
    }

    /**
     * Calculate a subject total from the legacy marks table.
     */
    private function calculateSubjectFromLegacy(int $examTermId, int $enrollmentId, int $subjectId): ?array
    {
        $mark = Mark::where('exam_term_id', $examTermId)
            ->where('student_enrollment_id', $enrollmentId)
            ->where('subject_id', $subjectId)
            ->first();

        if (!$mark || ($mark->marks_obtained === null && !$mark->absent_code)) {
            return null;
        }

        return [
            'total' => $mark->marks_obtained ?? 0,
            'full_marks' => $mark->full_marks,
            'components' => [],
        ];
    }

    /**
     * Determine pass/fail status from result config rules.
     */
    private function determineStatus(?ResultConfig $config, int $failCount, ?float $gpa, array $subjectGrades): string
    {
        if (!$config) {
            // Default: fail if any subject failed
            return $failCount > 0 ? 'fail' : 'pass';
        }

        return match ($config->fail_criteria) {
            'any_subject_below_pass' => $failCount > 0 ? 'fail' : 'pass',
            'gpa_below_threshold' => ($gpa !== null && $config->min_gpa !== null && $gpa < $config->min_gpa) ? 'fail' : ($failCount > 0 ? 'fail' : 'pass'),
            'fail_count_exceeds' => $failCount > $config->max_fail_subjects ? 'fail' : 'pass',
            'custom' => $this->evaluateCustomRules($config->custom_rules, $failCount, $gpa, $subjectGrades),
            default => $failCount > 0 ? 'fail' : 'pass',
        };
    }

    /**
     * Evaluate custom rules (extensible).
     */
    private function evaluateCustomRules(?array $rules, int $failCount, ?float $gpa, array $subjectGrades): string
    {
        if (!$rules) return $failCount > 0 ? 'fail' : 'pass';

        // Example custom rule: {"min_attendance_percent": 75, "max_fail_subjects": 2}
        $maxFail = $rules['max_fail_subjects'] ?? 0;
        if ($failCount > $maxFail) return 'fail';

        $minGpa = $rules['min_gpa'] ?? null;
        if ($minGpa !== null && $gpa !== null && $gpa < $minGpa) return 'fail';

        return 'pass';
    }

    /**
     * Assign merit positions per class for a given exam.
     */
    private function assignPositions(int $examTermId, Collection $classIds, int $sessionId): void
    {
        foreach ($classIds as $classId) {
            $sectionIds = Section::where('class_id', $classId)->pluck('id');
            $enrollmentIds = StudentEnrollment::whereIn('section_id', $sectionIds)
                ->where('academic_session_id', $sessionId)
                ->pluck('id');

            $summaries = ResultSummary::where('exam_term_id', $examTermId)
                ->whereIn('student_enrollment_id', $enrollmentIds)
                ->orderByDesc('total_marks')
                ->get();

            $total = $summaries->count();
            $pos = 0;
            $prevMarks = null;
            $prevPos = 0;

            foreach ($summaries as $s) {
                $pos++;
                if ($s->total_marks == $prevMarks) {
                    $s->update(['position' => $prevPos, 'total_students' => $total]);
                } else {
                    $prevPos = $pos;
                    $s->update(['position' => $pos, 'total_students' => $total]);
                }
                $prevMarks = $s->total_marks;
            }
        }
    }

    /**
     * Generate an annual/grand-final result by aggregating multiple exam terms.
     */
    public function generateAnnualResult(int $institutionId, int $sessionId, ?int $classId = null): array
    {
        return DB::transaction(function () use ($institutionId, $sessionId, $classId) {
            $examTerms = ExamTerm::where('institution_id', $institutionId)
                ->where('academic_session_id', $sessionId)
                ->get();

            if ($examTerms->isEmpty()) {
                return ['message' => 'No exam terms found', 'count' => 0];
            }

            $targetClassIds = $classId ? collect([$classId]) : null;

            if (!$targetClassIds) {
                $targetClassIds = $examTerms->flatMap(function ($et) {
                    return $et->examRoutines()->pluck('class_id');
                })->unique()->filter()->values();
            }

            $sectionIds = Section::whereIn('class_id', $targetClassIds)->pluck('id');
            $enrollments = StudentEnrollment::whereIn('section_id', $sectionIds)
                ->where('academic_session_id', $sessionId)
                ->with('section')
                ->get();

            $config = ResultConfig::findFor($institutionId);
            $count = 0;

            foreach ($enrollments as $enrollment) {
                $classIdForEnrollment = $enrollment->section->class_id;
                $termSummaries = ResultSummary::where('student_enrollment_id', $enrollment->id)
                    ->whereNotNull('exam_term_id')
                    ->with('examTerm')
                    ->get();

                if ($termSummaries->isEmpty()) continue;

                // Weighted aggregate
                $weightedTotal = 0;
                $weightedFull = 0;
                $totalFailCount = 0;

                foreach ($termSummaries as $ts) {
                    $w = $ts->examTerm->weight ?? 1;
                    $weightedTotal += $ts->total_marks * $w;
                    $weightedFull += $ts->total_full_marks * $w;
                    $totalFailCount += $ts->fail_count;
                }

                $percentage = $weightedFull > 0 ? round(($weightedTotal / $weightedFull) * 100, 2) : 0;
                $gradeInfo = GradeRule::getGradeForMarks((int) round($percentage), $classIdForEnrollment, $institutionId);

                $overallGpa = $gradeInfo ? $gradeInfo['grade_point'] : null;
                $letterGrade = $gradeInfo ? $gradeInfo['letter_grade'] : null;

                if ($totalFailCount > 0) {
                    $overallGpa = 0.00;
                    $letterGrade = 'F';
                }

                $status = $this->determineStatus($config, $totalFailCount, $overallGpa, []);

                ResultSummary::updateOrCreate(
                    [
                        'student_enrollment_id' => $enrollment->id,
                        'exam_term_id' => null, // null = annual
                    ],
                    [
                        'institution_id' => $institutionId,
                        'academic_session_id' => $sessionId,
                        'total_marks' => round($weightedTotal, 2),
                        'total_full_marks' => round($weightedFull, 2),
                        'percentage' => $percentage,
                        'gpa' => $overallGpa,
                        'letter_grade' => $letterGrade,
                        'fail_count' => $totalFailCount,
                        'status' => $status,
                        'promoted' => $status === 'pass',
                    ]
                );

                $count++;
            }

            // Assign annual positions
            $this->assignPositions(0, $targetClassIds, $sessionId);

            return [
                'message' => 'Annual results generated',
                'count' => $count,
            ];
        });
    }
}
