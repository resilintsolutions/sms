<?php
/**
 * Seeds the Result Card Module tables with realistic sample data.
 * Run after seed_dummy.php (which creates the base tables & data).
 *
 * Usage: php seed_result_card.php
 *
 * Seeds:
 *  - exam_components (Written, Class Test, Practical, Viva, Assignment)
 *  - exam_subject_rules for Class 1 subjects in Half Yearly 2024 (exam_term 1)
 *  - component_marks for 5 enrollments
 *  - result_configs (default Bangladesh rules)
 *  - attendance_summaries
 *  - behavior_records
 *  - co_curricular_records
 *  - teacher_remarks
 *  - result_summaries (pre-calculated)
 *
 * Assumes institution id = 1, class id = 1, exam_term ids = 1 & 2.
 */

$backendDir = __DIR__;
chdir($backendDir);

// ── DB connection ──
$env = [];
if (file_exists('.env')) {
    foreach (file('.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (preg_match('/^([^=]+)=(.*)$/', $line, $m)) {
            $env[trim($m[1])] = trim($m[2], " \t\n\r\0\x0B\"'");
        }
    }
}

$dbHost = $env['DB_HOST'] ?? '127.0.0.1';
$dbPort = $env['DB_PORT'] ?? '3306';
$dbName = $env['DB_DATABASE'] ?? 'school_management';
$dbUser = $env['DB_USERNAME'] ?? 'root';
$dbPass = $env['DB_PASSWORD'] ?? '';

try {
    $pdo = new PDO(
        "mysql:host=$dbHost;port=$dbPort;dbname=$dbName;charset=utf8mb4",
        $dbUser,
        $dbPass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    echo "ERROR: Could not connect to DB: {$e->getMessage()}\n";
    exit(1);
}

$now = date('Y-m-d H:i:s');
$instId = 1;

// ── Verify prerequisite data exists ──
$instCheck = $pdo->query("SELECT id FROM institutions WHERE id = $instId")->fetch();
if (!$instCheck) {
    echo "ERROR: Institution id=$instId not found. Run seed_admin.php first.\n";
    exit(1);
}

$examTermCheck = $pdo->query("SELECT id FROM exam_terms WHERE id = 1")->fetch();
if (!$examTermCheck) {
    echo "ERROR: exam_term id=1 not found. Run seed_dummy.php first.\n";
    exit(1);
}

echo "=== Seeding Result Card Module ===\n\n";

// ════════════════════════════════════════════
// 1. EXAM COMPONENTS
// ════════════════════════════════════════════
echo "1. Seeding exam_components...\n";
$components = [
    [1, 'Written',    'লিখিত',     'WR', 1],
    [2, 'Class Test', 'শ্রেণি পরীক্ষা', 'CT', 2],
    [3, 'Practical',  'ব্যবহারিক',  'PR', 3],
    [4, 'Viva',       'মৌখিক',     'VI', 4],
    [5, 'Assignment', 'অ্যাসাইনমেন্ট', 'AS', 5],
];
foreach ($components as $c) {
    $pdo->exec("INSERT IGNORE INTO exam_components (id, institution_id, name, name_bn, short_code, sort_order, is_active, created_at, updated_at)
        VALUES ({$c[0]}, $instId, '{$c[1]}', '{$c[2]}', '{$c[3]}', {$c[4]}, 1, '$now', '$now')");
}
echo "   -> 5 components created.\n";

// ════════════════════════════════════════════
// 2. UPDATE EXAM_TERMS with exam_type & weight
// ════════════════════════════════════════════
echo "2. Updating exam_terms with exam_type and weight...\n";
// Check if columns exist first
$columns = array_column($pdo->query("SHOW COLUMNS FROM exam_terms")->fetchAll(PDO::FETCH_ASSOC), 'Field');
if (in_array('exam_type', $columns)) {
    $pdo->exec("UPDATE exam_terms SET exam_type = 'half_yearly', weight = 40.00, name_bn = 'অর্ধবার্ষিক ২০২৪' WHERE id = 1");
    $pdo->exec("UPDATE exam_terms SET exam_type = 'annual', weight = 60.00, name_bn = 'বার্ষিক ২০২৫' WHERE id = 2");
    echo "   -> exam_terms 1 & 2 updated.\n";
} else {
    echo "   -> SKIPPED: exam_type column not found. Run migration first.\n";
}

// ════════════════════════════════════════════
// 3. EXAM SUBJECT RULES (Class 1, Exam Term 1)
// ════════════════════════════════════════════
echo "3. Seeding exam_subject_rules...\n";
// Get subjects for class 1
$subjects = $pdo->query("SELECT DISTINCT subject_id FROM class_subjects WHERE class_id = 1 ORDER BY subject_id")->fetchAll(PDO::FETCH_COLUMN);
if (empty($subjects)) {
    $subjects = $pdo->query("SELECT id FROM subjects ORDER BY id LIMIT 8")->fetchAll(PDO::FETCH_COLUMN);
}

$ruleId = 1;
foreach ($subjects as $subIdx => $subjectId) {
    // Every subject: Written (70 marks, weight 0.70) + Class Test (30 marks, weight 0.30)
    $pdo->exec("INSERT IGNORE INTO exam_subject_rules (id, exam_term_id, class_id, subject_id, component_id, max_marks, weight, is_optional, created_at, updated_at)
        VALUES ($ruleId, 1, 1, $subjectId, 1, 70, 0.70, 0, '$now', '$now')");
    $ruleId++;
    $pdo->exec("INSERT IGNORE INTO exam_subject_rules (id, exam_term_id, class_id, subject_id, component_id, max_marks, weight, is_optional, created_at, updated_at)
        VALUES ($ruleId, 1, 1, $subjectId, 2, 30, 0.30, 0, '$now', '$now')");
    $ruleId++;

    // Science-type subjects (3rd & 4th subjects): also add Practical (component 3)
    if ($subIdx >= 2 && $subIdx <= 3) {
        // Re-adjust weights: Written 0.50, CT 0.20, Practical 0.30
        $wrId = $ruleId - 2;
        $ctId = $ruleId - 1;
        $pdo->exec("UPDATE exam_subject_rules SET weight = 0.50, max_marks = 50 WHERE id = $wrId");
        $pdo->exec("UPDATE exam_subject_rules SET weight = 0.20, max_marks = 20 WHERE id = $ctId");
        $pdo->exec("INSERT IGNORE INTO exam_subject_rules (id, exam_term_id, class_id, subject_id, component_id, max_marks, weight, is_optional, created_at, updated_at)
            VALUES ($ruleId, 1, 1, $subjectId, 3, 30, 0.30, 0, '$now', '$now')");
        $ruleId++;
    }
}
$totalRules = $ruleId - 1;
echo "   -> $totalRules subject rules created for " . count($subjects) . " subjects.\n";

// ════════════════════════════════════════════
// 4. COMPONENT MARKS (5 enrollments, exam term 1)
// ════════════════════════════════════════════
echo "4. Seeding component_marks...\n";
$enrollments = $pdo->query("SELECT id FROM student_enrollments ORDER BY id LIMIT 5")->fetchAll(PDO::FETCH_COLUMN);
if (empty($enrollments)) {
    echo "   ERROR: No enrollments found. Cannot seed marks.\n";
} else {
    $markId = 1;
    $userId = $pdo->query("SELECT id FROM users ORDER BY id LIMIT 1")->fetchColumn() ?: 1;

    // Get rules for exam_term 1
    $rules = $pdo->query("SELECT id, subject_id, component_id, max_marks FROM exam_subject_rules WHERE exam_term_id = 1 ORDER BY subject_id, component_id")->fetchAll(PDO::FETCH_ASSOC);

    foreach ($enrollments as $enId) {
        foreach ($rules as $rule) {
            // Random realistic mark (50%-95% of max)
            $maxM = (int) $rule['max_marks'];
            $minMark = max(1, (int) ($maxM * 0.35)); // some may fail
            $mark = rand($minMark, $maxM);

            // 5% chance of being absent
            $absent = (rand(1, 100) <= 5) ? "'AB'" : 'NULL';
            $markVal = ($absent !== 'NULL') ? 'NULL' : $mark;

            $pdo->exec("INSERT IGNORE INTO component_marks (id, exam_term_id, student_enrollment_id, subject_id, component_id, marks_obtained, max_marks, absent_code, entered_by, created_at, updated_at)
                VALUES ($markId, 1, $enId, {$rule['subject_id']}, {$rule['component_id']}, $markVal, $maxM, $absent, $userId, '$now', '$now')");
            $markId++;
        }
    }
    $totalMarks = $markId - 1;
    echo "   -> $totalMarks component marks created.\n";
}

// ════════════════════════════════════════════
// 5. RESULT CONFIG
// ════════════════════════════════════════════
echo "5. Seeding result_configs...\n";
$pdo->exec("INSERT IGNORE INTO result_configs (id, institution_id, academic_session_id, class_id, name, fail_criteria, pass_marks_percent, min_gpa, max_fail_subjects, use_component_marks, is_active, created_at, updated_at)
VALUES
    (1, $instId, NULL, NULL, 'Default Bangladesh Rules', 'any_subject_below_pass', 33.00, 2.00, 0, 1, 1, '$now', '$now'),
    (2, $instId, 2, 1, 'Class 1 Rules (Session 2)', 'any_subject_below_pass', 33.00, NULL, 0, 1, 1, '$now', '$now')
");
echo "   -> 2 result configs created.\n";

// ════════════════════════════════════════════
// 6. ATTENDANCE SUMMARIES
// ════════════════════════════════════════════
echo "6. Seeding attendance_summaries...\n";
if (!empty($enrollments)) {
    foreach ($enrollments as $idx => $enId) {
        $totalDays = rand(100, 120);
        $present = $totalDays - rand(3, 15);
        $absent = rand(2, 8);
        $late = rand(1, 5);
        $leave = $totalDays - $present - $absent - $late;
        if ($leave < 0) $leave = 0;
        $pct = round(($present / $totalDays) * 100, 2);

        $pdo->exec("INSERT IGNORE INTO attendance_summaries (student_enrollment_id, academic_session_id, exam_term_id, total_days, present_days, absent_days, late_days, leave_days, attendance_percent, created_at, updated_at)
            VALUES ($enId, 2, 1, $totalDays, $present, $absent, $late, $leave, $pct, '$now', '$now')");
    }
    echo "   -> " . count($enrollments) . " attendance summaries created.\n";
}

// ════════════════════════════════════════════
// 7. BEHAVIOR RECORDS
// ════════════════════════════════════════════
echo "7. Seeding behavior_records...\n";
$categories = ['discipline', 'punctuality', 'cleanliness', 'respect', 'participation', 'homework'];
if (!empty($enrollments)) {
    foreach ($enrollments as $enId) {
        foreach ($categories as $cat) {
            $rating = rand(3, 5); // Mostly good behavior
            $pdo->exec("INSERT IGNORE INTO behavior_records (student_enrollment_id, academic_session_id, exam_term_id, category, rating, note, created_at, updated_at)
                VALUES ($enId, 2, 1, '$cat', $rating, NULL, '$now', '$now')");
        }
    }
    echo "   -> " . (count($enrollments) * count($categories)) . " behavior records created.\n";
}

// ════════════════════════════════════════════
// 8. CO-CURRICULAR RECORDS
// ════════════════════════════════════════════
echo "8. Seeding co_curricular_records...\n";
$activities = [
    ['Annual Sports', 'First in 100m race', '2024-03-15'],
    ['Art Competition', 'Second Prize', '2024-04-10'],
    ['Science Fair', 'Participation', '2024-05-20'],
    ['Debate', 'Best Speaker', '2024-06-05'],
    ['Math Olympiad', 'Bronze Medal', '2024-07-12'],
];
if (!empty($enrollments)) {
    foreach ($enrollments as $idx => $enId) {
        // Each student gets 1-3 random activities
        $numActivities = rand(1, 3);
        $chosen = array_rand($activities, $numActivities);
        if (!is_array($chosen)) $chosen = [$chosen];
        foreach ($chosen as $aIdx) {
            $a = $activities[$aIdx];
            $pdo->exec("INSERT IGNORE INTO co_curricular_records (student_enrollment_id, academic_session_id, activity, achievement, activity_date, created_at, updated_at)
                VALUES ($enId, 2, '{$a[0]}', '{$a[1]}', '{$a[2]}', '$now', '$now')");
        }
    }
    echo "   -> Co-curricular records created.\n";
}

// ════════════════════════════════════════════
// 9. TEACHER REMARKS
// ════════════════════════════════════════════
echo "9. Seeding teacher_remarks...\n";
$teacherRemarks = [
    'Excellent student. Very attentive in class.',
    'Good progress. Needs improvement in Mathematics.',
    'Shows potential. Should participate more in class activities.',
    'Hardworking student. Keep up the good work!',
    'Average performance. Needs to focus on studies.',
];
$principalRemarks = [
    'Keep striving for excellence.',
    'Recommended for special attention in weak subjects.',
    'Promoted to the next class with remarks.',
    'Good overall performance. Best wishes.',
    'Needs consistent effort. Parents are advised to monitor.',
];
if (!empty($enrollments)) {
    foreach ($enrollments as $idx => $enId) {
        $tr = $teacherRemarks[$idx % count($teacherRemarks)];
        $pr = $principalRemarks[$idx % count($principalRemarks)];
        $pdo->exec("INSERT IGNORE INTO teacher_remarks (student_enrollment_id, academic_session_id, exam_term_id, class_teacher_remark, principal_remark, guardian_comment, created_at, updated_at)
            VALUES ($enId, 2, 1, '$tr', '$pr', NULL, '$now', '$now')");
    }
    echo "   -> " . count($enrollments) . " teacher remarks created.\n";
}

// ════════════════════════════════════════════
// 10. RESULT SUMMARIES (Pre-calculated)
// ════════════════════════════════════════════
echo "10. Calculating & seeding result_summaries...\n";
if (!empty($enrollments) && !empty($subjects)) {
    // Get grade rules for class 1
    $gradeRules = $pdo->query("SELECT letter_grade, grade_point, min_marks, max_marks FROM grade_rules WHERE institution_id = $instId AND class_id = 1 ORDER BY min_marks DESC")->fetchAll(PDO::FETCH_ASSOC);
    if (empty($gradeRules)) {
        // try grade rules without class filter
        $gradeRules = $pdo->query("SELECT letter_grade, grade_point, min_marks, max_marks FROM grade_rules WHERE institution_id = $instId ORDER BY min_marks DESC")->fetchAll(PDO::FETCH_ASSOC);
    }

    foreach ($enrollments as $position => $enId) {
        $totalObtained = 0;
        $totalFull = 0;
        $failCount = 0;
        $subjectGrades = [];
        $gpas = [];

        foreach ($subjects as $subjectId) {
            // Sum component marks for this subject
            $subMarks = $pdo->query("
                SELECT COALESCE(SUM(marks_obtained), 0) as total_obtained, SUM(max_marks) as total_max
                FROM component_marks
                WHERE exam_term_id = 1 AND student_enrollment_id = $enId AND subject_id = $subjectId AND absent_code IS NULL
            ")->fetch(PDO::FETCH_ASSOC);

            $obtained = (float) ($subMarks['total_obtained'] ?? 0);
            $fullMarks = (float) ($subMarks['total_max'] ?? 100);
            $percentage = ($fullMarks > 0) ? round(($obtained / $fullMarks) * 100, 2) : 0;

            // Determine grade
            $grade = 'F'; $gpa = 0; $passed = true;
            foreach ($gradeRules as $gr) {
                if ($percentage >= $gr['min_marks'] && $percentage <= $gr['max_marks']) {
                    $grade = $gr['letter_grade'];
                    $gpa = (float) $gr['grade_point'];
                    break;
                }
            }
            if ($grade === 'F' || $gpa == 0) {
                $passed = false;
                $failCount++;
            }

            $totalObtained += $obtained;
            $totalFull += $fullMarks;
            $gpas[] = $gpa;

            $subjectGrades[] = [
                'subject_id'   => (int) $subjectId,
                'subject_name' => "Subject $subjectId",
                'obtained'     => $obtained,
                'full_marks'   => $fullMarks,
                'percentage'   => $percentage,
                'grade'        => $grade,
                'gpa'          => $gpa,
                'passed'       => $passed,
            ];
        }

        // Overall
        $overallPct = ($totalFull > 0) ? round(($totalObtained / $totalFull) * 100, 2) : 0;
        // Bangladesh: If any subject fails, overall GPA = 0.00, grade = F
        if ($failCount > 0) {
            $overallGpa = 0.00;
            $overallGrade = 'F';
            $status = 'fail';
            $promoted = 0;
        } else {
            $overallGpa = (count($gpas) > 0) ? round(array_sum($gpas) / count($gpas), 2) : 0;
            // Determine overall grade from GPA (standard mapping)
            if ($overallGpa >= 5.0) $overallGrade = 'A+';
            elseif ($overallGpa >= 4.0) $overallGrade = 'A';
            elseif ($overallGpa >= 3.5) $overallGrade = 'A-';
            elseif ($overallGpa >= 3.0) $overallGrade = 'B';
            elseif ($overallGpa >= 2.0) $overallGrade = 'C';
            elseif ($overallGpa >= 1.0) $overallGrade = 'D';
            else $overallGrade = 'F';

            $status = 'pass';
            $promoted = 1;
        }

        $subjectGradesJson = json_encode($subjectGrades);
        $subjectGradesJson = $pdo->quote($subjectGradesJson);

        $pdo->exec("INSERT IGNORE INTO result_summaries (institution_id, academic_session_id, student_enrollment_id, exam_term_id, total_marks, total_full_marks, percentage, gpa, letter_grade, fail_count, position, total_students, status, promoted, remarks, subject_grades, created_at, updated_at)
            VALUES ($instId, 2, $enId, 1, $totalObtained, $totalFull, $overallPct, $overallGpa, '$overallGrade', $failCount, " . ($position + 1) . ", " . count($enrollments) . ", '$status', $promoted, NULL, $subjectGradesJson, '$now', '$now')");
    }

    // Reassign positions by total_marks desc
    $ranked = $pdo->query("SELECT id, total_marks FROM result_summaries WHERE exam_term_id = 1 ORDER BY total_marks DESC")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($ranked as $pos => $r) {
        $pdo->exec("UPDATE result_summaries SET position = " . ($pos + 1) . " WHERE id = {$r['id']}");
    }

    echo "   -> " . count($enrollments) . " result summaries created with positions.\n";
}

echo "\n=== Result Card Module Seeding Complete! ===\n";
echo "\nNext steps:\n";
echo "  1. Run: php artisan migrate   (to create tables if not yet done)\n";
echo "  2. Hit API:  GET /api/v1/result-cards/components\n";
echo "  3. View:     GET /results/{student_id}/2024\n";
echo "  4. PDF:      GET /results/{student_id}/2024/pdf\n";
