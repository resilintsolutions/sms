<?php

namespace Tests\Feature;

use App\Models\AcademicSession;
use App\Models\ClassModel;
use App\Models\ComponentMark;
use App\Models\ExamComponent;
use App\Models\ExamSubjectRule;
use App\Models\ExamTerm;
use App\Models\GradeRule;
use App\Models\Institution;
use App\Models\ResultConfig;
use App\Models\ResultSummary;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\Subject;
use App\Models\User;
use App\Services\ResultCalculatorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResultCalculatorTest extends TestCase
{
    use RefreshDatabase;

    protected Institution $institution;
    protected AcademicSession $session;
    protected ClassModel $class;
    protected Section $section;
    protected ExamTerm $examTerm;
    protected User $admin;
    protected array $subjects = [];
    protected array $enrollments = [];
    protected array $components = [];
    protected ResultCalculatorService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ResultCalculatorService();
        $this->seedTestData();
    }

    /**
     * Create all prerequisite data for tests.
     */
    private function seedTestData(): void
    {
        // Institution
        $this->institution = Institution::create([
            'name' => 'Test School',
            'address' => '123 Test St',
            'phone' => '01700000000',
        ]);

        // Admin user
        $this->admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'institution_id' => $this->institution->id,
        ]);

        // Academic session
        $this->session = AcademicSession::create([
            'institution_id' => $this->institution->id,
            'name' => '2024',
            'start_date' => '2024-01-01',
            'end_date' => '2024-12-31',
            'is_current' => true,
        ]);

        // Class & section
        $this->class = ClassModel::create([
            'institution_id' => $this->institution->id,
            'name' => 'Class 5',
            'numeric_order' => 5,
        ]);

        $this->section = Section::create([
            'class_id' => $this->class->id,
            'name' => 'A',
            'capacity' => 40,
        ]);

        // Subjects
        $subjectNames = ['Bangla', 'English', 'Mathematics', 'Science', 'Social Studies'];
        foreach ($subjectNames as $name) {
            $subj = Subject::create([
                'institution_id' => $this->institution->id,
                'name' => $name,
            ]);
            $this->subjects[] = $subj;

            // class_subjects
            \DB::table('class_subjects')->insert([
                'institution_id' => $this->institution->id,
                'class_id' => $this->class->id,
                'subject_id' => $subj->id,
                'full_marks' => 100,
                'pass_marks' => 33,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Grade rules (Bangladesh standard)
        $grades = [
            ['A+', 5.00, 80, 100],
            ['A',  4.00, 70, 79],
            ['A-', 3.50, 60, 69],
            ['B',  3.00, 50, 59],
            ['C',  2.00, 40, 49],
            ['D',  1.00, 33, 39],
            ['F',  0.00, 0,  32],
        ];
        foreach ($grades as $g) {
            GradeRule::create([
                'institution_id' => $this->institution->id,
                'class_id' => $this->class->id,
                'letter_grade' => $g[0],
                'grade_point' => $g[1],
                'min_marks' => $g[2],
                'max_marks' => $g[3],
            ]);
        }

        // Exam term
        $this->examTerm = ExamTerm::create([
            'institution_id' => $this->institution->id,
            'academic_session_id' => $this->session->id,
            'name' => 'Half Yearly 2024',
            'start_date' => '2024-06-01',
            'end_date' => '2024-06-15',
            'publish_status' => 'draft',
        ]);

        // Exam routine for the class (so the calculator knows which classes to cover)
        \DB::table('exam_routines')->insert([
            'exam_term_id' => $this->examTerm->id,
            'class_id' => $this->class->id,
            'subject_id' => $this->subjects[0]->id,
            'exam_date' => '2024-06-02',
            'start_time' => '10:00',
            'end_time' => '12:00',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Exam components
        $componentNames = ['Written', 'Class Test'];
        foreach ($componentNames as $idx => $name) {
            $comp = ExamComponent::create([
                'institution_id' => $this->institution->id,
                'name' => $name,
                'short_code' => $idx === 0 ? 'WR' : 'CT',
                'sort_order' => $idx + 1,
            ]);
            $this->components[] = $comp;
        }

        // 5 Students with enrollments
        for ($i = 1; $i <= 5; $i++) {
            $student = Student::create([
                'institution_id' => $this->institution->id,
                'student_id' => "STU-2024-{$i}",
                'name' => "Student $i",
                'date_of_birth' => "2010-0{$i}-15",
                'gender' => $i % 2 === 0 ? 'female' : 'male',
            ]);
            $enrollment = StudentEnrollment::create([
                'student_id' => $student->id,
                'section_id' => $this->section->id,
                'academic_session_id' => $this->session->id,
                'roll_no' => $i,
            ]);
            $this->enrollments[] = $enrollment;
        }

        // Result config (use component marks)
        ResultConfig::create([
            'institution_id' => $this->institution->id,
            'name' => 'Test Config',
            'fail_criteria' => 'any_subject_below_pass',
            'pass_marks_percent' => 33.00,
            'use_component_marks' => true,
            'is_active' => true,
        ]);
    }

    /**
     * Helper: seed component marks for a student-subject.
     */
    private function seedComponentMarks(int $enrollmentId, int $subjectId, float $writtenMark, float $ctMark, int $writtenMax = 70, int $ctMax = 30): void
    {
        // Create subject rules if not already present
        ExamSubjectRule::firstOrCreate([
            'exam_term_id' => $this->examTerm->id,
            'class_id' => $this->class->id,
            'subject_id' => $subjectId,
            'component_id' => $this->components[0]->id,
        ], [
            'max_marks' => $writtenMax,
            'weight' => 0.70,
        ]);

        ExamSubjectRule::firstOrCreate([
            'exam_term_id' => $this->examTerm->id,
            'class_id' => $this->class->id,
            'subject_id' => $subjectId,
            'component_id' => $this->components[1]->id,
        ], [
            'max_marks' => $ctMax,
            'weight' => 0.30,
        ]);

        // Create component marks
        ComponentMark::updateOrCreate([
            'exam_term_id' => $this->examTerm->id,
            'student_enrollment_id' => $enrollmentId,
            'subject_id' => $subjectId,
            'component_id' => $this->components[0]->id,
        ], [
            'marks_obtained' => $writtenMark,
            'max_marks' => $writtenMax,
            'entered_by' => $this->admin->id,
        ]);

        ComponentMark::updateOrCreate([
            'exam_term_id' => $this->examTerm->id,
            'student_enrollment_id' => $enrollmentId,
            'subject_id' => $subjectId,
            'component_id' => $this->components[1]->id,
        ], [
            'marks_obtained' => $ctMark,
            'max_marks' => $ctMax,
            'entered_by' => $this->admin->id,
        ]);
    }

    // ────────────────────────────────────────────────
    // TEST: Component marks calculation
    // ────────────────────────────────────────────────
    public function test_component_marks_are_weighted_correctly()
    {
        $enrollment = $this->enrollments[0];
        $subject = $this->subjects[0];

        // Written: 60/70 (weight 0.70) -> (60/70)*70*0.70 = 42
        // CT:      25/30 (weight 0.30) -> (25/30)*30*0.30 = 7.5
        // Total weighted = 42 + 7.5 = 49.5
        // Full weighted  = 70*0.70 + 30*0.30 = 49 + 9 = 58
        $this->seedComponentMarks($enrollment->id, $subject->id, 60, 25);

        // Seed all other subjects with passing marks
        for ($s = 1; $s < 5; $s++) {
            $this->seedComponentMarks($enrollment->id, $this->subjects[$s]->id, 50, 20);
        }

        $result = $this->service->generateResults(
            $this->examTerm->id,
            $this->institution->id,
            $this->class->id
        );

        $this->assertGreaterThan(0, $result['count']);

        $summary = ResultSummary::where('student_enrollment_id', $enrollment->id)
            ->where('exam_term_id', $this->examTerm->id)
            ->first();

        $this->assertNotNull($summary);
        $this->assertNotNull($summary->subject_grades);

        // Check first subject's calculated marks
        $subjectGrades = $summary->subject_grades;
        $firstSubject = collect($subjectGrades)->firstWhere('subject_id', $subject->id);

        $this->assertNotNull($firstSubject);
        // Percentage should be (49.5/58)*100 ≈ 85.34%
        $this->assertGreaterThan(80, $firstSubject['percentage']);
    }

    // ────────────────────────────────────────────────
    // TEST: Grade assignment
    // ────────────────────────────────────────────────
    public function test_grade_assigned_correctly_for_high_marks()
    {
        $enrollment = $this->enrollments[0];

        // All subjects excellent (80%+) => A+ grade
        foreach ($this->subjects as $subject) {
            $this->seedComponentMarks($enrollment->id, $subject->id, 62, 28); // 90/100 ≈ 90%
        }

        $this->service->generateResults(
            $this->examTerm->id,
            $this->institution->id,
            $this->class->id
        );

        $summary = ResultSummary::where('student_enrollment_id', $enrollment->id)
            ->where('exam_term_id', $this->examTerm->id)
            ->first();

        $this->assertEquals('pass', $summary->status);
        $this->assertTrue($summary->promoted);
        $this->assertEquals(0, $summary->fail_count);
        // GPA should be high (A+ = 5.00 or close)
        $this->assertGreaterThanOrEqual(4.0, $summary->gpa);
    }

    // ────────────────────────────────────────────────
    // TEST: Fail if any subject below pass marks (Bangladesh rule)
    // ────────────────────────────────────────────────
    public function test_fail_when_any_subject_below_pass_marks()
    {
        $enrollment = $this->enrollments[0];

        // 4 subjects pass, 1 subject fail (very low marks)
        for ($s = 0; $s < 4; $s++) {
            $this->seedComponentMarks($enrollment->id, $this->subjects[$s]->id, 55, 22);
        }
        // This subject: Written 5/70, CT 3/30 → total very low → F grade, below 33%
        $this->seedComponentMarks($enrollment->id, $this->subjects[4]->id, 5, 3);

        $this->service->generateResults(
            $this->examTerm->id,
            $this->institution->id,
            $this->class->id
        );

        $summary = ResultSummary::where('student_enrollment_id', $enrollment->id)
            ->where('exam_term_id', $this->examTerm->id)
            ->first();

        $this->assertEquals('fail', $summary->status);
        $this->assertFalse($summary->promoted);
        $this->assertGreaterThanOrEqual(1, $summary->fail_count);
        // Bangladesh rule: if any subject fails, overall GPA = 0.00
        $this->assertEquals(0.00, $summary->gpa);
        $this->assertEquals('F', $summary->letter_grade);
    }

    // ────────────────────────────────────────────────
    // TEST: All subjects pass → promoted
    // ────────────────────────────────────────────────
    public function test_pass_and_promoted_when_all_subjects_pass()
    {
        $enrollment = $this->enrollments[0];

        foreach ($this->subjects as $subject) {
            // 45/70 + 18/30 → passing marks
            $this->seedComponentMarks($enrollment->id, $subject->id, 45, 18);
        }

        $this->service->generateResults(
            $this->examTerm->id,
            $this->institution->id,
            $this->class->id
        );

        $summary = ResultSummary::where('student_enrollment_id', $enrollment->id)
            ->where('exam_term_id', $this->examTerm->id)
            ->first();

        $this->assertEquals('pass', $summary->status);
        $this->assertTrue($summary->promoted);
    }

    // ────────────────────────────────────────────────
    // TEST: Position assignment with ties
    // ────────────────────────────────────────────────
    public function test_positions_assigned_with_tie_handling()
    {
        // Give same marks to student 1 and 2, different to 3
        $markSets = [
            [60, 24], // Student 1 - high
            [60, 24], // Student 2 - same as 1 (tie)
            [40, 15], // Student 3 - lower
            [55, 22], // Student 4 - middle
            [35, 13], // Student 5 - lowest
        ];

        foreach ($this->enrollments as $idx => $enrollment) {
            foreach ($this->subjects as $subject) {
                $this->seedComponentMarks(
                    $enrollment->id,
                    $subject->id,
                    $markSets[$idx][0],
                    $markSets[$idx][1]
                );
            }
        }

        $this->service->generateResults(
            $this->examTerm->id,
            $this->institution->id,
            $this->class->id
        );

        // Check positions
        $summaries = ResultSummary::where('exam_term_id', $this->examTerm->id)
            ->orderBy('position')
            ->get();

        $this->assertGreaterThanOrEqual(5, $summaries->count());

        // Students 1 & 2 should have same position (1 or 1)
        $s1 = $summaries->firstWhere('student_enrollment_id', $this->enrollments[0]->id);
        $s2 = $summaries->firstWhere('student_enrollment_id', $this->enrollments[1]->id);

        $this->assertEquals($s1->position, $s2->position);
        $this->assertEquals(5, $s1->total_students);
    }

    // ────────────────────────────────────────────────
    // TEST: Generate returns count and message
    // ────────────────────────────────────────────────
    public function test_generate_results_returns_summary()
    {
        foreach ($this->enrollments as $enrollment) {
            foreach ($this->subjects as $subject) {
                $this->seedComponentMarks($enrollment->id, $subject->id, 50, 20);
            }
        }

        $result = $this->service->generateResults(
            $this->examTerm->id,
            $this->institution->id,
            $this->class->id
        );

        $this->assertArrayHasKey('count', $result);
        $this->assertArrayHasKey('message', $result);
        $this->assertEquals(5, $result['count']);
    }

    // ────────────────────────────────────────────────
    // TEST: Annual result aggregation with weights
    // ────────────────────────────────────────────────
    public function test_annual_result_aggregates_multiple_exams()
    {
        // Create a second exam term
        $examTerm2 = ExamTerm::create([
            'institution_id' => $this->institution->id,
            'academic_session_id' => $this->session->id,
            'name' => 'Annual 2024',
            'start_date' => '2024-11-01',
            'end_date' => '2024-11-15',
            'publish_status' => 'draft',
            'exam_type' => 'annual',
            'weight' => 60,
        ]);

        // Set weight on first exam term
        $this->examTerm->update(['exam_type' => 'half_yearly', 'weight' => 40]);

        // Exam routine for term 2
        \DB::table('exam_routines')->insert([
            'exam_term_id' => $examTerm2->id,
            'class_id' => $this->class->id,
            'subject_id' => $this->subjects[0]->id,
            'exam_date' => '2024-11-02',
            'start_time' => '10:00',
            'end_time' => '12:00',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $enrollment = $this->enrollments[0];

        // Seed & generate exam 1
        foreach ($this->subjects as $subject) {
            $this->seedComponentMarks($enrollment->id, $subject->id, 50, 20);
        }
        $this->service->generateResults($this->examTerm->id, $this->institution->id, $this->class->id);

        // Seed & generate exam 2
        foreach ($this->subjects as $subject) {
            ExamSubjectRule::firstOrCreate([
                'exam_term_id' => $examTerm2->id,
                'class_id' => $this->class->id,
                'subject_id' => $subject->id,
                'component_id' => $this->components[0]->id,
            ], ['max_marks' => 70, 'weight' => 0.70]);

            ExamSubjectRule::firstOrCreate([
                'exam_term_id' => $examTerm2->id,
                'class_id' => $this->class->id,
                'subject_id' => $subject->id,
                'component_id' => $this->components[1]->id,
            ], ['max_marks' => 30, 'weight' => 0.30]);

            ComponentMark::create([
                'exam_term_id' => $examTerm2->id,
                'student_enrollment_id' => $enrollment->id,
                'subject_id' => $subject->id,
                'component_id' => $this->components[0]->id,
                'marks_obtained' => 55,
                'max_marks' => 70,
                'entered_by' => $this->admin->id,
            ]);
            ComponentMark::create([
                'exam_term_id' => $examTerm2->id,
                'student_enrollment_id' => $enrollment->id,
                'subject_id' => $subject->id,
                'component_id' => $this->components[1]->id,
                'marks_obtained' => 22,
                'max_marks' => 30,
                'entered_by' => $this->admin->id,
            ]);
        }
        $this->service->generateResults($examTerm2->id, $this->institution->id, $this->class->id);

        // Now generate annual result
        $result = $this->service->generateAnnualResult(
            $this->institution->id,
            $this->session->id,
            $this->class->id
        );

        $this->assertGreaterThan(0, $result['count']);

        // Check annual summary (exam_term_id = null)
        $annual = ResultSummary::where('student_enrollment_id', $enrollment->id)
            ->whereNull('exam_term_id')
            ->first();

        $this->assertNotNull($annual);
        $this->assertNotNull($annual->percentage);
        $this->assertEquals('pass', $annual->status);
    }

    // ────────────────────────────────────────────────
    // TEST: No marks → no result generated
    // ────────────────────────────────────────────────
    public function test_no_result_when_no_marks_entered()
    {
        $result = $this->service->generateResults(
            $this->examTerm->id,
            $this->institution->id,
            $this->class->id
        );

        $this->assertEquals(0, $result['count']);
    }

    // ────────────────────────────────────────────────
    // TEST: fail_count_exceeds criteria
    // ────────────────────────────────────────────────
    public function test_fail_count_exceeds_criteria()
    {
        // Update config to allow up to 2 failed subjects
        ResultConfig::query()->update([
            'fail_criteria' => 'fail_count_exceeds',
            'max_fail_subjects' => 2,
        ]);

        $enrollment = $this->enrollments[0];

        // 3 subjects pass, 2 subjects fail
        for ($s = 0; $s < 3; $s++) {
            $this->seedComponentMarks($enrollment->id, $this->subjects[$s]->id, 50, 20);
        }
        for ($s = 3; $s < 5; $s++) {
            $this->seedComponentMarks($enrollment->id, $this->subjects[$s]->id, 3, 1);
        }

        $this->service->generateResults(
            $this->examTerm->id,
            $this->institution->id,
            $this->class->id
        );

        $summary = ResultSummary::where('student_enrollment_id', $enrollment->id)
            ->where('exam_term_id', $this->examTerm->id)
            ->first();

        // 2 fail subjects, max_fail_subjects = 2 → fail_count (2) > max_fail (2) is false → pass
        // Actually: 2 > 2 is false, so should pass
        $this->assertEquals('pass', $summary->status);
    }

    // ────────────────────────────────────────────────
    // TEST: API endpoint - generate results
    // ────────────────────────────────────────────────
    public function test_api_generate_results_requires_auth()
    {
        $response = $this->postJson('/api/v1/result-cards/generate', [
            'exam_term_id' => $this->examTerm->id,
        ]);

        $response->assertStatus(401);
    }

    public function test_api_generate_results_as_admin()
    {
        $enrollment = $this->enrollments[0];
        foreach ($this->subjects as $subject) {
            $this->seedComponentMarks($enrollment->id, $subject->id, 50, 20);
        }

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/result-cards/generate', [
                'exam_term_id' => $this->examTerm->id,
                'class_id' => $this->class->id,
            ]);

        $response->assertOk();
        $response->assertJsonStructure(['count', 'message']);
    }

    // ────────────────────────────────────────────────
    // TEST: API endpoint - components CRUD
    // ────────────────────────────────────────────────
    public function test_api_list_components()
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/result-cards/components');

        $response->assertOk();
    }

    public function test_api_create_component()
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/result-cards/components', [
                'name' => 'Practical',
                'short_code' => 'PR',
                'sort_order' => 3,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('exam_components', [
            'name' => 'Practical',
            'institution_id' => $this->institution->id,
        ]);
    }
}
