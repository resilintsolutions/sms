<?php

namespace App\Services;

use App\Models\ClassSubject;
use App\Models\ExamComponent;
use App\Models\ExamSubjectRule;
use App\Models\ExamTerm;
use Illuminate\Support\Facades\DB;

class ExamConfigService
{
    /**
     * Get all exam components for an institution.
     */
    public function getComponents(int $institutionId): \Illuminate\Database\Eloquent\Collection
    {
        return ExamComponent::forInstitution($institutionId)
            ->active()
            ->orderBy('sort_order')
            ->get();
    }

    /**
     * Create or update an exam component.
     */
    public function saveComponent(int $institutionId, array $data, ?int $id = null): ExamComponent
    {
        return ExamComponent::updateOrCreate(
            ['id' => $id, 'institution_id' => $institutionId],
            array_merge($data, ['institution_id' => $institutionId])
        );
    }

    /**
     * Get subject rules configured for an exam + class.
     * Returns rules grouped by subject.
     */
    public function getSubjectRules(int $examTermId, int $classId): array
    {
        $rules = ExamSubjectRule::forExam($examTermId, $classId)
            ->with(['subject', 'component'])
            ->orderBy('subject_id')
            ->orderBy('component_id')
            ->get();

        return $rules->groupBy('subject_id')->map(function ($group) {
            return [
                'subject' => $group->first()->subject,
                'components' => $group->map(function ($rule) {
                    return [
                        'id' => $rule->id,
                        'component' => $rule->component,
                        'max_marks' => $rule->max_marks,
                        'weight' => (float) $rule->weight,
                        'is_optional' => $rule->is_optional,
                    ];
                })->values(),
            ];
        })->values()->toArray();
    }

    /**
     * Bulk save subject-component rules for an exam + class.
     *
     * @param int $examTermId
     * @param int $classId
     * @param array $rules  Array of [{subject_id, component_id, max_marks, weight, is_optional}]
     */
    public function saveSubjectRules(int $examTermId, int $classId, array $rules): int
    {
        return DB::transaction(function () use ($examTermId, $classId, $rules) {
            $count = 0;
            foreach ($rules as $rule) {
                ExamSubjectRule::updateOrCreate(
                    [
                        'exam_term_id' => $examTermId,
                        'class_id' => $classId,
                        'subject_id' => $rule['subject_id'],
                        'component_id' => $rule['component_id'],
                    ],
                    [
                        'max_marks' => $rule['max_marks'] ?? 100,
                        'weight' => $rule['weight'] ?? 1.00,
                        'is_optional' => $rule['is_optional'] ?? false,
                    ]
                );
                $count++;
            }
            return $count;
        });
    }

    /**
     * Remove a specific subject rule.
     */
    public function deleteSubjectRule(int $ruleId): bool
    {
        return ExamSubjectRule::destroy($ruleId) > 0;
    }

    /**
     * Auto-generate exam subject rules from class_subjects for an exam.
     * Assigns all active components with equal weight split.
     */
    public function autoGenerateRules(int $examTermId, int $classId, int $institutionId): int
    {
        $classSubjects = ClassSubject::where('class_id', $classId)->get();
        $components = ExamComponent::forInstitution($institutionId)->active()->orderBy('sort_order')->get();

        if ($classSubjects->isEmpty() || $components->isEmpty()) return 0;

        return DB::transaction(function () use ($examTermId, $classId, $classSubjects, $components) {
            $count = 0;
            foreach ($classSubjects as $cs) {
                // Distribute full marks across components
                $perComponent = round($cs->full_marks / $components->count());

                foreach ($components as $comp) {
                    ExamSubjectRule::updateOrCreate(
                        [
                            'exam_term_id' => $examTermId,
                            'class_id' => $classId,
                            'subject_id' => $cs->subject_id,
                            'component_id' => $comp->id,
                        ],
                        [
                            'max_marks' => $perComponent,
                            'weight' => 1.00,
                            'is_optional' => false,
                        ]
                    );
                    $count++;
                }
            }
            return $count;
        });
    }

    /**
     * Get a complete exam configuration overview: term + all class rules.
     */
    public function getExamOverview(int $examTermId): array
    {
        $term = ExamTerm::with('examRoutines.subject')->findOrFail($examTermId);
        $classIds = $term->examRoutines->pluck('class_id')->unique()->filter()->values();

        $config = [];
        foreach ($classIds as $classId) {
            $config[$classId] = $this->getSubjectRules($examTermId, $classId);
        }

        return [
            'exam_term' => $term,
            'class_configs' => $config,
        ];
    }
}
