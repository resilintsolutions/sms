<?php
/**
 * Creates remaining tables (if missing) and inserts dummy data for Sessions, Classes,
 * Students, Attendance, Exams, Fees, Notices. Run after seed_admin.php.
 * Usage: php seed_dummy.php
 */

$backendDir = __DIR__;
chdir($backendDir);

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
    echo "ERROR: Could not connect. Run seed_admin.php first.\n";
    exit(1);
}

$now = date('Y-m-d H:i:s');

// ----- Create tables if not exist (same order as migrations) -----
$tables = [
    'academic_sessions' => "CREATE TABLE IF NOT EXISTS academic_sessions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_current TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )",
    'shifts' => "CREATE TABLE IF NOT EXISTS shifts (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        start_time TIME NULL,
        end_time TIME NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )",
    'classes' => "CREATE TABLE IF NOT EXISTS classes (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        numeric_order TINYINT UNSIGNED DEFAULT 0,
        `group` VARCHAR(255) NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )",
    'sections' => "CREATE TABLE IF NOT EXISTS sections (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        class_id BIGINT UNSIGNED NOT NULL,
        shift_id BIGINT UNSIGNED NULL,
        name VARCHAR(255) NOT NULL,
        capacity TINYINT UNSIGNED NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
    )",
    'subjects' => "CREATE TABLE IF NOT EXISTS subjects (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        name_bn VARCHAR(255) NULL,
        code VARCHAR(20) NULL,
        is_optional TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )",
    'class_subjects' => "CREATE TABLE IF NOT EXISTS class_subjects (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        class_id BIGINT UNSIGNED NOT NULL,
        subject_id BIGINT UNSIGNED NOT NULL,
        full_marks SMALLINT UNSIGNED DEFAULT 100,
        pass_marks SMALLINT UNSIGNED NULL,
        weight DECIMAL(5,2) DEFAULT 1,
        is_optional TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        UNIQUE KEY (class_id, subject_id),
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )",
    'employees' => "CREATE TABLE IF NOT EXISTS employees (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        employee_id VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        name_bn VARCHAR(255) NULL,
        designation VARCHAR(255) NOT NULL,
        department VARCHAR(255) NULL,
        phone VARCHAR(255) NULL,
        email VARCHAR(255) NULL,
        join_date DATE NULL,
        is_teacher TINYINT(1) DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )",
    'teacher_assignments' => "CREATE TABLE IF NOT EXISTS teacher_assignments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        employee_id BIGINT UNSIGNED NOT NULL,
        section_id BIGINT UNSIGNED NOT NULL,
        subject_id BIGINT UNSIGNED NOT NULL,
        academic_session_id BIGINT UNSIGNED NOT NULL,
        is_class_teacher TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        UNIQUE KEY teacher_section_subject_session (employee_id, section_id, subject_id, academic_session_id),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE
    )",
    'guardians' => "CREATE TABLE IF NOT EXISTS guardians (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        name VARCHAR(255) NOT NULL,
        name_bn VARCHAR(255) NULL,
        relation VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        email VARCHAR(255) NULL,
        nid VARCHAR(20) NULL,
        address TEXT NULL,
        occupation VARCHAR(255) NULL,
        monthly_income DECIMAL(12,2) NULL,
        is_primary TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )",
    'students' => "CREATE TABLE IF NOT EXISTS students (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        student_id VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        name_bn VARCHAR(255) NULL,
        date_of_birth DATE NULL,
        gender VARCHAR(10) NULL,
        birth_reg_no VARCHAR(50) NULL,
        nid VARCHAR(20) NULL,
        address TEXT NULL,
        blood_group VARCHAR(5) NULL,
        photo VARCHAR(255) NULL,
        status VARCHAR(255) DEFAULT 'active',
        admission_date DATE NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )",
    'student_guardians' => "CREATE TABLE IF NOT EXISTS student_guardians (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        student_id BIGINT UNSIGNED NOT NULL,
        guardian_id BIGINT UNSIGNED NOT NULL,
        is_primary TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        UNIQUE KEY (student_id, guardian_id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (guardian_id) REFERENCES guardians(id) ON DELETE CASCADE
    )",
    'student_enrollments' => "CREATE TABLE IF NOT EXISTS student_enrollments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        student_id BIGINT UNSIGNED NOT NULL,
        section_id BIGINT UNSIGNED NOT NULL,
        academic_session_id BIGINT UNSIGNED NOT NULL,
        roll_no INT UNSIGNED NOT NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        UNIQUE KEY section_session_roll (section_id, academic_session_id, roll_no),
        UNIQUE KEY student_session (student_id, academic_session_id),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE
    )",
    'student_attendances' => "CREATE TABLE IF NOT EXISTS student_attendances (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        student_enrollment_id BIGINT UNSIGNED NOT NULL,
        date DATE NOT NULL,
        status VARCHAR(255) DEFAULT 'present',
        remark VARCHAR(255) NULL,
        marked_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        UNIQUE KEY enrollment_date (student_enrollment_id, date),
        FOREIGN KEY (student_enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
        FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
    )",
    'grade_rules' => "CREATE TABLE IF NOT EXISTS grade_rules (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NULL,
        class_id BIGINT UNSIGNED NULL,
        letter_grade VARCHAR(5) NOT NULL,
        grade_point DECIMAL(4,2) NOT NULL,
        min_marks SMALLINT UNSIGNED NOT NULL,
        max_marks SMALLINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
    )",
    'exam_terms' => "CREATE TABLE IF NOT EXISTS exam_terms (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        academic_session_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        start_date DATE NULL,
        end_date DATE NULL,
        publish_status VARCHAR(255) DEFAULT 'draft',
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE
    )",
    'exam_routines' => "CREATE TABLE IF NOT EXISTS exam_routines (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        exam_term_id BIGINT UNSIGNED NOT NULL,
        class_id BIGINT UNSIGNED NOT NULL,
        subject_id BIGINT UNSIGNED NOT NULL,
        exam_date DATE NOT NULL,
        start_time TIME NULL,
        end_time TIME NULL,
        full_marks SMALLINT UNSIGNED DEFAULT 100,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (exam_term_id) REFERENCES exam_terms(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )",
    'marks' => "CREATE TABLE IF NOT EXISTS marks (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        exam_term_id BIGINT UNSIGNED NOT NULL,
        student_enrollment_id BIGINT UNSIGNED NOT NULL,
        subject_id BIGINT UNSIGNED NOT NULL,
        marks_obtained DECIMAL(6,2) NULL,
        full_marks SMALLINT UNSIGNED NOT NULL,
        absent_code VARCHAR(10) NULL,
        entered_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        UNIQUE KEY exam_student_subject (exam_term_id, student_enrollment_id, subject_id),
        FOREIGN KEY (exam_term_id) REFERENCES exam_terms(id) ON DELETE CASCADE,
        FOREIGN KEY (student_enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL
    )",
    'results' => "CREATE TABLE IF NOT EXISTS results (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        exam_term_id BIGINT UNSIGNED NOT NULL,
        student_enrollment_id BIGINT UNSIGNED NOT NULL,
        total_marks DECIMAL(8,2) DEFAULT 0,
        gpa DECIMAL(4,2) NULL,
        letter_grade VARCHAR(5) NULL,
        position INT UNSIGNED NULL,
        total_students INT UNSIGNED NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        UNIQUE KEY exam_enrollment (exam_term_id, student_enrollment_id),
        FOREIGN KEY (exam_term_id) REFERENCES exam_terms(id) ON DELETE CASCADE,
        FOREIGN KEY (student_enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE
    )",
    'fee_heads' => "CREATE TABLE IF NOT EXISTS fee_heads (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        name_bn VARCHAR(255) NULL,
        frequency VARCHAR(255) DEFAULT 'monthly',
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )",
    'fee_structures' => "CREATE TABLE IF NOT EXISTS fee_structures (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        academic_session_id BIGINT UNSIGNED NOT NULL,
        class_id BIGINT UNSIGNED NOT NULL,
        fee_head_id BIGINT UNSIGNED NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        effective_from DATE NULL,
        effective_to DATE NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        UNIQUE KEY session_class_head (academic_session_id, class_id, fee_head_id),
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (fee_head_id) REFERENCES fee_heads(id) ON DELETE CASCADE
    )",
    'discounts' => "CREATE TABLE IF NOT EXISTS discounts (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(255) DEFAULT 'percentage',
        value DECIMAL(10,2) NOT NULL,
        description TEXT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )",
    'invoices' => "CREATE TABLE IF NOT EXISTS invoices (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        student_id BIGINT UNSIGNED NOT NULL,
        academic_session_id BIGINT UNSIGNED NOT NULL,
        invoice_no VARCHAR(255) NOT NULL UNIQUE,
        month VARCHAR(7) NULL,
        sub_total DECIMAL(12,2) DEFAULT 0,
        discount_amount DECIMAL(12,2) DEFAULT 0,
        total_amount DECIMAL(12,2) DEFAULT 0,
        paid_amount DECIMAL(12,2) DEFAULT 0,
        due_amount DECIMAL(12,2) DEFAULT 0,
        status VARCHAR(255) DEFAULT 'pending',
        due_date DATE NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE
    )",
    'invoice_items' => "CREATE TABLE IF NOT EXISTS invoice_items (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        invoice_id BIGINT UNSIGNED NOT NULL,
        fee_head_id BIGINT UNSIGNED NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (fee_head_id) REFERENCES fee_heads(id) ON DELETE CASCADE
    )",
    'payments' => "CREATE TABLE IF NOT EXISTS payments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        invoice_id BIGINT UNSIGNED NOT NULL,
        receipt_no VARCHAR(255) NOT NULL UNIQUE,
        amount DECIMAL(12,2) NOT NULL,
        payment_date DATE NOT NULL,
        method VARCHAR(255) DEFAULT 'cash',
        reference VARCHAR(255) NULL,
        note TEXT NULL,
        collected_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (collected_by) REFERENCES users(id) ON DELETE SET NULL
    )",
    'notices' => "CREATE TABLE IF NOT EXISTS notices (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        created_by BIGINT UNSIGNED NULL,
        title VARCHAR(255) NOT NULL,
        title_bn VARCHAR(255) NULL,
        body TEXT NULL,
        body_bn TEXT NULL,
        audience VARCHAR(255) DEFAULT 'all',
        attachments JSON NULL,
        published_at TIMESTAMP NULL,
        expires_at TIMESTAMP NULL,
        is_published TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )",
    'landing_page_configs' => "CREATE TABLE IF NOT EXISTS landing_page_configs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL UNIQUE,
        config JSON NOT NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
    )",
];

echo "Creating tables if not exist...\n";
foreach ($tables as $name => $sql) {
    try {
        $pdo->exec($sql);
        echo "  $name\n";
    } catch (PDOException $e) {
        echo "  $name: " . $e->getMessage() . "\n";
    }
}

$instId = 1;
$userId = (int) $pdo->query("SELECT id FROM users WHERE email = 'admin@school.edu.bd' LIMIT 1")->fetchColumn();
if (!$userId) $userId = 1;

// ----- Dummy data: avoid duplicates with INSERT IGNORE or check -----

// Academic sessions
$pdo->exec("INSERT IGNORE INTO academic_sessions (id, institution_id, name, start_date, end_date, is_current, created_at, updated_at) VALUES
(1, $instId, '2023-2024', '2023-01-01', '2024-12-31', 0, '$now', '$now'),
(2, $instId, '2024-2025', '2024-01-01', '2025-12-31', 1, '$now', '$now')");

// Shifts
$pdo->exec("INSERT IGNORE INTO shifts (id, institution_id, name, start_time, end_time, created_at, updated_at) VALUES
(1, $instId, 'Morning', '07:00:00', '12:00:00', '$now', '$now'),
(2, $instId, 'Day', '12:30:00', '17:30:00', '$now', '$now')");

// Classes 1-12
for ($i = 1; $i <= 12; $i++) {
    $grp = $i >= 9 ? ($i % 3 === 0 ? 'Science' : ($i % 3 === 1 ? 'Arts' : 'Commerce')) : null;
    $grp = $grp ? "'$grp'" : 'NULL';
    $pdo->exec("INSERT IGNORE INTO classes (id, institution_id, name, numeric_order, `group`, created_at, updated_at) VALUES ($i, $instId, '$i', $i, $grp, '$now', '$now')");
}

// Sections: A,B for class 1-5 (10 sections)
$secId = 0;
foreach ([1, 2, 3, 4, 5] as $classId) {
    foreach (['A', 'B'] as $name) {
        $secId++;
        $shiftId = $secId % 2 === 1 ? 1 : 2;
        $pdo->exec("INSERT IGNORE INTO sections (id, class_id, shift_id, name, capacity, created_at, updated_at) VALUES ($secId, $classId, $shiftId, '$name', 40, '$now', '$now')");
    }
}

// Subjects
$subjects = [
    ['Bangla', 'বাংলা', 'BAN'],
    ['English', 'ইংরেজি', 'ENG'],
    ['Mathematics', 'গণিত', 'MATH'],
    ['Science', 'বিজ্ঞান', 'SCI'],
    ['Social Science', 'সামাজিক বিজ্ঞান', 'SSC'],
];
foreach ($subjects as $i => $s) {
    $id = $i + 1;
    $n = addslashes($s[0]);
    $nb = addslashes($s[1]);
    $c = $s[2];
    $pdo->exec("INSERT IGNORE INTO subjects (id, institution_id, name, name_bn, code, is_optional, created_at, updated_at) VALUES ($id, $instId, '$n', '$nb', '$c', 0, '$now', '$now')");
}

// Class-subjects for classes 1-5
foreach ([1, 2, 3, 4, 5] as $classId) {
    for ($sid = 1; $sid <= 5; $sid++) {
        $pdo->exec("INSERT IGNORE INTO class_subjects (class_id, subject_id, full_marks, pass_marks, weight, is_optional, created_at, updated_at) VALUES ($classId, $sid, 100, 33, 1, 0, '$now', '$now')");
    }
}

// Guardians
$pdo->exec("INSERT IGNORE INTO guardians (id, institution_id, name, relation, phone, is_primary, created_at, updated_at) VALUES
(1, $instId, 'Rahim Ahmed', 'father', '+8801711111001', 1, '$now', '$now'),
(2, $instId, 'Fatema Begum', 'mother', '+8801711111002', 0, '$now', '$now'),
(3, $instId, 'Karim Hossain', 'father', '+8801711111003', 1, '$now', '$now'),
(4, $instId, 'Ayesha Khan', 'mother', '+8801711111004', 0, '$now', '$now'),
(5, $instId, 'Mizan Rahman', 'father', '+8801711111005', 1, '$now', '$now')");

// Students
$pdo->exec("INSERT IGNORE INTO students (id, institution_id, student_id, name, name_bn, date_of_birth, gender, status, admission_date, created_at, updated_at) VALUES
(1, $instId, 'STU-24-00001', 'Ayan Rahman', 'আয়ান রহমান', '2017-05-10', 'male', 'active', '2023-01-01', '$now', '$now'),
(2, $instId, 'STU-24-00002', 'Sara Islam', 'সারা ইসলাম', '2017-08-22', 'female', 'active', '2023-01-01', '$now', '$now'),
(3, $instId, 'STU-24-00003', 'Rafid Hassan', 'রাফিদ হাসান', '2016-11-15', 'male', 'active', '2023-01-01', '$now', '$now'),
(4, $instId, 'STU-24-00004', 'Nadia Akter', 'নাদিয়া আক্তার', '2017-02-28', 'female', 'active', '2024-01-01', '$now', '$now'),
(5, $instId, 'STU-24-00005', 'Omar Faruk', 'ওমর ফারুক', '2016-07-03', 'male', 'active', '2024-01-01', '$now', '$now')");

// Student-guardians
$pdo->exec("INSERT IGNORE INTO student_guardians (student_id, guardian_id, is_primary, created_at, updated_at) VALUES
(1, 1, 1, '$now', '$now'), (1, 2, 0, '$now', '$now'),
(2, 2, 0, '$now', '$now'), (2, 1, 1, '$now', '$now'),
(3, 3, 1, '$now', '$now'), (3, 4, 0, '$now', '$now'),
(4, 4, 0, '$now', '$now'), (4, 3, 1, '$now', '$now'),
(5, 5, 1, '$now', '$now')");

// Enrollments: section 1 = class 1 A, section 2 = class 1 B, etc. Session 2 = current
$enrollments = [
    [1, 1, 2, 1], [2, 1, 2, 2], [3, 2, 2, 1], [4, 2, 2, 2], [5, 3, 2, 1],
];
foreach ($enrollments as $i => $e) {
    $enId = $i + 1;
    $pdo->exec("INSERT IGNORE INTO student_enrollments (id, student_id, section_id, academic_session_id, roll_no, created_at, updated_at) VALUES ($enId, {$e[0]}, {$e[1]}, {$e[2]}, {$e[3]}, '$now', '$now')");
}

// Student attendance (last 7 days for enrollment 1,2,3)
$dates = [];
for ($d = 0; $d < 7; $d++) {
    $dates[] = date('Y-m-d', strtotime("-$d days"));
}
foreach ([1, 2, 3] as $enId) {
    foreach ($dates as $date) {
        $status = (rand(0, 10) > 1) ? 'present' : 'absent';
        $pdo->exec("INSERT IGNORE INTO student_attendances (student_enrollment_id, date, status, marked_by, created_at, updated_at) VALUES ($enId, '$date', '$status', $userId, '$now', '$now')");
    }
}

// Grade rules (class 1)
$grades = [['A+', 5.0, 80, 100], ['A', 4.0, 70, 79], ['A-', 3.5, 60, 69], ['B', 3.0, 50, 59], ['C', 2.0, 40, 49], ['D', 1.0, 33, 39], ['F', 0, 0, 32]];
foreach ($grades as $g) {
    $pdo->exec("INSERT IGNORE INTO grade_rules (institution_id, class_id, letter_grade, grade_point, min_marks, max_marks, created_at, updated_at) VALUES ($instId, 1, '{$g[0]}', {$g[1]}, {$g[2]}, {$g[3]}, '$now', '$now')");
}

// Exam terms
$pdo->exec("INSERT IGNORE INTO exam_terms (id, institution_id, academic_session_id, name, start_date, end_date, publish_status, created_at, updated_at) VALUES
(1, $instId, 2, 'Half Yearly 2024', '2024-06-01', '2024-06-15', 'published', '$now', '$now'),
(2, $instId, 2, 'Annual 2025', '2025-11-01', '2025-11-20', 'draft', '$now', '$now')");

// Exam routines (term 1, class 1, subjects 1-5)
foreach (range(1, 5) as $i) {
    $date = date('Y-m-d', strtotime("2024-06-0$i"));
    $pdo->exec("INSERT IGNORE INTO exam_routines (exam_term_id, class_id, subject_id, exam_date, full_marks, created_at, updated_at) VALUES (1, 1, $i, '$date', 100, '$now', '$now')");
}

// Marks for enrollments 1,2,3 for exam term 1
foreach ([1, 2, 3] as $enId) {
    foreach (range(1, 5) as $subId) {
        $m = rand(55, 95);
        $pdo->exec("INSERT IGNORE INTO marks (exam_term_id, student_enrollment_id, subject_id, marks_obtained, full_marks, entered_by, created_at, updated_at) VALUES (1, $enId, $subId, $m, 100, $userId, '$now', '$now')");
    }
}

// Fee heads
$pdo->exec("INSERT IGNORE INTO fee_heads (id, institution_id, name, name_bn, frequency, created_at, updated_at) VALUES
(1, $instId, 'Tuition', 'টিউশন', 'monthly', '$now', '$now'),
(2, $instId, 'Admission', 'ভর্তি ফি', 'one_time', '$now', '$now'),
(3, $instId, 'Exam', 'পরীক্ষা ফি', 'annual', '$now', '$now'),
(4, $instId, 'Transport', 'ট্রান্সপোর্ট', 'monthly', '$now', '$now')");

// Fee structures (session 2, class 1)
foreach ([1, 2, 3, 4] as $fhId) {
    $amt = [1 => 1500, 2 => 5000, 3 => 800, 4 => 1000][$fhId];
    $pdo->exec("INSERT IGNORE INTO fee_structures (institution_id, academic_session_id, class_id, fee_head_id, amount, created_at, updated_at) VALUES ($instId, 2, 1, $fhId, $amt, '$now', '$now')");
}

// Invoices (2 students, session 2) - only if no invoices yet
$invCount = (int) $pdo->query("SELECT COUNT(*) FROM invoices")->fetchColumn();
if ($invCount === 0) {
    $invNo1 = 'INV-' . strtoupper(uniqid());
    $invNo2 = 'INV-' . strtoupper(uniqid());
    $pdo->exec("INSERT INTO invoices (institution_id, student_id, academic_session_id, invoice_no, month, sub_total, discount_amount, total_amount, paid_amount, due_amount, status, due_date, created_at, updated_at) VALUES
    ($instId, 1, 2, '$invNo1', '2025-01', 3300, 0, 3300, 2000, 1300, 'partial', '2025-01-31', '$now', '$now'),
    ($instId, 2, 2, '$invNo2', '2025-01', 3300, 300, 3000, 0, 3000, 'pending', '2025-01-31', '$now', '$now')");
    $pdo->exec("INSERT INTO invoice_items (invoice_id, fee_head_id, amount, created_at, updated_at) VALUES
    (1, 1, 1500, '$now', '$now'), (1, 3, 800, '$now', '$now'), (1, 4, 1000, '$now', '$now'),
    (2, 1, 1500, '$now', '$now'), (2, 3, 800, '$now', '$now'), (2, 4, 1000, '$now', '$now')");
    $rcp = 'RCP-' . strtoupper(uniqid());
    $pdo->exec("INSERT INTO payments (institution_id, invoice_id, receipt_no, amount, payment_date, method, collected_by, created_at, updated_at) VALUES ($instId, 1, '$rcp', 2000, '" . date('Y-m-d') . "', 'cash', $userId, '$now', '$now')");
}

// Notices
$pdo->exec("INSERT IGNORE INTO notices (id, institution_id, created_by, title, title_bn, body, audience, is_published, published_at, created_at, updated_at) VALUES
(1, $instId, $userId, 'School Reopening Notice', 'স্কুল পুনরায় খোলার নোটিশ', 'School will reopen on 1st January 2025. All students must attend in full uniform.', 'all', 1, '$now', '$now', '$now'),
(2, $instId, $userId, 'Parent Meeting', 'অভিভাবক সমাবেশ', 'Parent-teacher meeting scheduled for 15th February 2025 at 10 AM.', 'all', 1, '$now', '$now', '$now'),
(3, $instId, $userId, 'Exam Schedule Published', 'পরীক্ষার সময়সূচি প্রকাশ', 'Half-yearly exam schedule has been published. Check notice board.', 'all', 1, '$now', '$now', '$now')");

// ----- Phase 2: Full system populate (only if we have few students) -----
$studentCount = (int) $pdo->query("SELECT COUNT(*) FROM students")->fetchColumn();
if ($studentCount < 35) {
    echo "Populating full dummy data (students, teachers, attendance, fees, etc.)...\n";

    // Guardians 6-35 (for new students)
    $guardianNames = [
        [6, 'Abdul Khalek', 'father', '+8801722222001'], [7, 'Rokeya Khatun', 'mother', '+8801722222002'],
        [8, 'Habibul Islam', 'father', '+8801722222003'], [9, 'Nasrin Jahan', 'mother', '+8801722222004'],
        [10, 'Shafiqul Alam', 'father', '+8801722222005'], [11, 'Taslima Akter', 'mother', '+8801722222006'],
        [12, 'Jahangir Hossain', 'father', '+8801722222007'], [13, 'Shabana Begum', 'mother', '+8801722222008'],
        [14, 'Motiur Rahman', 'father', '+8801722222009'], [15, 'Ferdousi Khan', 'mother', '+8801722222010'],
        [16, 'Kamrul Hasan', 'father', '+8801722222011'], [17, 'Ruma Akter', 'mother', '+8801722222012'],
        [18, 'Selim Reza', 'father', '+8801722222013'], [19, 'Sharmin Sultana', 'mother', '+8801722222014'],
        [20, 'Rashid Ahmed', 'father', '+8801722222015'], [21, 'Nargis Parvin', 'mother', '+8801722222016'],
        [22, 'Anwar Hossain', 'father', '+8801722222017'], [23, 'Shirin Akter', 'mother', '+8801722222018'],
        [24, 'Babul Miah', 'father', '+8801722222019'], [25, 'Kulsum Begum', 'mother', '+8801722222020'],
        [26, 'Faruk Ahmed', 'father', '+8801722222021'], [27, 'Rina Islam', 'mother', '+8801722222022'],
        [28, 'Salam Khan', 'father', '+8801722222023'], [29, 'Rehana Parvin', 'mother', '+8801722222024'],
        [30, 'Mahabub Ali', 'father', '+8801722222025'], [31, 'Jahanara Begum', 'mother', '+8801722222026'],
        [32, 'Alamgir Hossain', 'father', '+8801722222027'], [33, 'Shabnoor Akter', 'mother', '+8801722222028'],
        [34, 'Rafiqul Islam', 'father', '+8801722222029'], [35, 'Nazma Khatun', 'mother', '+8801722222030'],
    ];
    foreach ($guardianNames as $g) {
        $pdo->exec("INSERT IGNORE INTO guardians (id, institution_id, name, relation, phone, is_primary, created_at, updated_at) VALUES ({$g[0]}, $instId, '" . addslashes($g[1]) . "', '{$g[2]}', '{$g[3]}', 1, '$now', '$now')");
    }

    // Students 6-35
    $firstNames = ['Tahmid', 'Ishita', 'Arman', 'Faria', 'Rayan', 'Tanisha', 'Adnan', 'Nusaiba', 'Fahim', 'Zara', 'Ibrahim', 'Anika', 'Siam', 'Nabiha', 'Yasin', 'Samira', 'Rifat', 'Tamanna', 'Nabil', 'Tasnia', 'Rohan', 'Meher', 'Shadman', 'Zerin', 'Aryan', 'Inaya', 'Sakib', 'Lamya', 'Faiyaz', 'Hridita'];
    for ($s = 6; $s <= 35; $s++) {
        $idx = $s - 6;
        $name = $firstNames[$idx] . ' Rahman';
        $sid = sprintf('STU-24-%05d', $s);
        $gender = $idx % 2 === 0 ? 'male' : 'female';
        $dob = date('Y-m-d', strtotime('-' . (6 + ($idx % 5)) . ' years'));
        $pdo->exec("INSERT IGNORE INTO students (id, institution_id, student_id, name, date_of_birth, gender, status, admission_date, created_at, updated_at) VALUES ($s, $instId, '$sid', '" . addslashes($name) . "', '$dob', '$gender', 'active', '2024-01-01', '$now', '$now')");
    }

    // Student-guardians 6-35 (each student one guardian same id)
    for ($s = 6; $s <= 35; $s++) {
        $g = $s;
        if ($g <= 35) $pdo->exec("INSERT IGNORE INTO student_guardians (student_id, guardian_id, is_primary, created_at, updated_at) VALUES ($s, $g, 1, '$now', '$now')");
    }

    // Enrollments: fill sections 1,2,3 (class 1A, 1B, 2A) with more students. Section 1: rolls 3-12 = students 6-15; Section 2: rolls 2-11 = students 16-25; Section 3: rolls 3-12 = students 26-35
    $enId = 6;
    foreach ([[1, 6, 15], [2, 16, 25], [3, 26, 35]] as $spec) {
        $sectionId = $spec[0];
        $startSt = $spec[1];
        $endSt = $spec[2];
        $roll = $sectionId === 1 ? 3 : ($sectionId === 2 ? 2 : 3);
        for ($st = $startSt; $st <= $endSt; $st++, $roll++, $enId++) {
            $pdo->exec("INSERT IGNORE INTO student_enrollments (id, student_id, section_id, academic_session_id, roll_no, created_at, updated_at) VALUES ($enId, $st, $sectionId, 2, $roll, '$now', '$now')");
        }
    }

    // Attendance: last 30 days for all enrollments
    $enrollmentIds = $pdo->query("SELECT id FROM student_enrollments")->fetchAll(PDO::FETCH_COLUMN);
    for ($d = 0; $d < 30; $d++) {
        $date = date('Y-m-d', strtotime("-$d days"));
        foreach ($enrollmentIds as $enId) {
            $status = rand(1, 10) > 1 ? 'present' : (rand(1, 2) === 1 ? 'absent' : 'late');
            $pdo->exec("INSERT IGNORE INTO student_attendances (student_enrollment_id, date, status, marked_by, created_at, updated_at) VALUES ($enId, '$date', '$status', $userId, '$now', '$now')");
        }
    }

    // Grade rules for class 2 and 3
    foreach ([2, 3] as $classId) {
        $grades = [['A+', 5.0, 80, 100], ['A', 4.0, 70, 79], ['A-', 3.5, 60, 69], ['B', 3.0, 50, 59], ['C', 2.0, 40, 49], ['D', 1.0, 33, 39], ['F', 0, 0, 32]];
        foreach ($grades as $g) {
            $pdo->exec("INSERT IGNORE INTO grade_rules (institution_id, class_id, letter_grade, grade_point, min_marks, max_marks, created_at, updated_at) VALUES ($instId, $classId, '{$g[0]}', {$g[1]}, {$g[2]}, {$g[3]}, '$now', '$now')");
        }
    }

    // Employees (teachers)
    $pdo->exec("INSERT IGNORE INTO employees (id, institution_id, employee_id, name, designation, department, is_teacher, is_active, created_at, updated_at) VALUES
    (1, $instId, 'EMP-001', 'Md. Karim Ahmed', 'Senior Teacher', 'Academic', 1, 1, '$now', '$now'),
    (2, $instId, 'EMP-002', 'Fatema Begum', 'Assistant Teacher', 'Academic', 1, 1, '$now', '$now'),
    (3, $instId, 'EMP-003', 'Abdul Jabbar', 'Senior Teacher', 'Academic', 1, 1, '$now', '$now'),
    (4, $instId, 'EMP-004', 'Nargis Akter', 'Assistant Teacher', 'Academic', 1, 1, '$now', '$now'),
    (5, $instId, 'EMP-005', 'Rafiqul Islam', 'Senior Teacher', 'Academic', 1, 1, '$now', '$now')");

    // Teacher assignments (section 1,2,3 with subjects; session 2)
    $assignments = [
        [1, 1, 1, 2, 1], [1, 1, 2, 2, 0],  // emp1: section 1 Bangla, English (class teacher for 1)
        [2, 1, 2, 2, 0], [2, 1, 3, 2, 0],  // emp2: section 1 English, Math
        [2, 2, 1, 2, 1], [2, 2, 2, 2, 0],  // emp2: section 2 Bangla (CT), English
        [3, 2, 3, 2, 0], [3, 2, 4, 2, 0],  // emp3: section 2 Math, Science
        [3, 3, 1, 2, 1], [3, 3, 2, 2, 0],  // emp3: section 3 Bangla (CT), English
        [4, 3, 3, 2, 0], [4, 1, 4, 2, 0],  // emp4: section 3 Math, section 1 Science
        [5, 1, 5, 2, 0], [5, 2, 5, 2, 0], [5, 3, 5, 2, 0],  // emp5: Social Science all 3 sections
    ];
    foreach ($assignments as $a) {
        $pdo->exec("INSERT IGNORE INTO teacher_assignments (employee_id, section_id, subject_id, academic_session_id, is_class_teacher, created_at, updated_at) VALUES ({$a[0]}, {$a[1]}, {$a[2]}, {$a[3]}, {$a[4]}, '$now', '$now')");
    }

    // More marks for enrollments 6-15 (section 1) and 16-25 (section 2), 26-35 (section 3) for exam term 1
    $allEnrollments = $pdo->query("SELECT id FROM student_enrollments WHERE academic_session_id = 2")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($allEnrollments as $enId) {
        foreach (range(1, 5) as $subId) {
            $m = rand(40, 98);
            $pdo->exec("INSERT IGNORE INTO marks (exam_term_id, student_enrollment_id, subject_id, marks_obtained, full_marks, entered_by, created_at, updated_at) VALUES (1, $enId, $subId, $m, 100, $userId, '$now', '$now')");
        }
    }

    // Results for exam term 1 (all enrollments with marks)
    $totalStudents = count($allEnrollments);
    $pos = 0;
    foreach ($allEnrollments as $enId) {
        $total = (int) $pdo->query("SELECT COALESCE(SUM(marks_obtained), 0) FROM marks WHERE exam_term_id = 1 AND student_enrollment_id = " . (int)$enId)->fetchColumn();
        $gpa = $total >= 400 ? 5.0 : ($total >= 350 ? 4.5 : ($total >= 300 ? 4.0 : ($total >= 250 ? 3.5 : ($total >= 200 ? 3.0 : 2.0))));
        $grade = $gpa >= 5 ? 'A+' : ($gpa >= 4 ? 'A' : ($gpa >= 3.5 ? 'A-' : ($gpa >= 3 ? 'B' : ($gpa >= 2 ? 'C' : 'D'))));
        $pos++;
        $pdo->exec("INSERT INTO results (exam_term_id, student_enrollment_id, total_marks, gpa, letter_grade, position, total_students, created_at, updated_at) VALUES (1, $enId, $total, $gpa, '$grade', $pos, $totalStudents, '$now', '$now') ON DUPLICATE KEY UPDATE total_marks = VALUES(total_marks), gpa = VALUES(gpa), letter_grade = VALUES(letter_grade), position = VALUES(position), total_students = VALUES(total_students), updated_at = VALUES(updated_at)");
    }

    // Fee structures for class 2, 3
    foreach ([2, 3] as $classId) {
        foreach ([1, 2, 3, 4] as $fhId) {
            $amt = [1 => 1500 + $classId * 100, 2 => 5000, 3 => 800, 4 => 1000][$fhId];
            $pdo->exec("INSERT IGNORE INTO fee_structures (institution_id, academic_session_id, class_id, fee_head_id, amount, created_at, updated_at) VALUES ($instId, 2, $classId, $fhId, $amt, '$now', '$now')");
        }
    }

    // Invoices for students 1-25 (session 2, various months)
    $invCount = (int) $pdo->query("SELECT COUNT(*) FROM invoices")->fetchColumn();
    if ($invCount < 25) {
        for ($st = 1; $st <= 25; $st++) {
            $invNo = 'INV-' . strtoupper(uniqid());
            $total = 3300;
            $paid = $st % 3 === 0 ? 0 : ($st % 3 === 1 ? 3300 : rand(1000, 2000));
            $due = $total - $paid;
            $status = $due <= 0 ? 'paid' : ($paid > 0 ? 'partial' : 'pending');
            $month = $st <= 8 ? '2025-01' : ($st <= 16 ? '2025-02' : '2025-03');
            $pdo->exec("INSERT INTO invoices (institution_id, student_id, academic_session_id, invoice_no, month, sub_total, discount_amount, total_amount, paid_amount, due_amount, status, due_date, created_at, updated_at) VALUES ($instId, $st, 2, '$invNo', '$month', $total, 0, $total, $paid, $due, '$status', '2025-03-31', '$now', '$now')");
            $invId = $pdo->lastInsertId();
            $pdo->exec("INSERT INTO invoice_items (invoice_id, fee_head_id, amount, created_at, updated_at) VALUES ($invId, 1, 1500, '$now', '$now'), ($invId, 3, 800, '$now', '$now'), ($invId, 4, 1000, '$now', '$now')");
            if ($paid > 0) {
                $rcp = 'RCP-' . strtoupper(uniqid());
                $pdo->exec("INSERT INTO payments (institution_id, invoice_id, receipt_no, amount, payment_date, method, collected_by, created_at, updated_at) VALUES ($instId, $invId, '$rcp', $paid, '" . date('Y-m-d') . "', 'cash', $userId, '$now', '$now')");
            }
        }
    }

    // More notices
    $pdo->exec("INSERT IGNORE INTO notices (id, institution_id, created_by, title, title_bn, body, audience, is_published, published_at, created_at, updated_at) VALUES
    (4, $instId, $userId, 'Holiday Notice - Eid', 'ঈদ ছুটির নোটিশ', 'School will remain closed from 10-12 April 2025 for Eid-ul-Fitr.', 'all', 1, '$now', '$now', '$now'),
    (5, $instId, $userId, 'Result Publication', 'ফলাফল প্রকাশ', 'Half-yearly exam results will be published on 20 June 2024. Parents can collect from office.', 'all', 1, '$now', '$now', '$now'),
    (6, $instId, $userId, 'Fee Payment Reminder', 'ফি পরিশোধের রিমাইন্ডার', 'Please clear due fees by 31st of this month to avoid late fine.', 'all', 1, '$now', '$now', '$now'),
    (7, $instId, $userId, 'Sports Day 2025', 'বার্ষিক ক্রীড়া দিবস', 'Annual sports day will be held on 15 March 2025. All students are encouraged to participate.', 'all', 1, '$now', '$now', '$now'),
    (8, $instId, $userId, 'Library Hours Extended', 'লাইব্রেরি সময় বর্ধিত', 'Library will now remain open until 5 PM on weekdays.', 'all', 1, '$now', '$now', '$now')");

    echo "  Added 30 guardians, 30 students, enrollments, 30-day attendance, teachers, assignments, marks, results, fee structures, invoices, notices.\n";
}

// Landing page config (default for institution 1)
$landingConfig = [
    'hero' => [
        'title' => 'Welcome to Our School',
        'title_bn' => 'আমাদের স্কুলে স্বাগতম',
        'subtitle' => 'Quality education for a brighter future.',
        'subtitle_bn' => 'উজ্জ্বল ভবিষ্যতের জন্য মানসম্মত শিক্ষা।',
        'ctaText' => 'Login to Portal',
        'ctaLink' => '/login',
        'imageUrl' => '',
        'background' => 'gradient',
    ],
    'about' => [
        'heading' => 'About Our School',
        'heading_bn' => 'আমাদের স্কুল সম্পর্কে',
        'body' => 'We are committed to providing a nurturing environment where every student can excel academically and personally.',
        'body_bn' => 'আমরা এমন একটি পরিবেশ দেওয়ার জন্য প্রতিশ্রুতিবদ্ধ যেখানে প্রতিটি শিক্ষার্থী একাডেমিক এবং ব্যক্তিগতভাবে উৎকর্ষ অর্জন করতে পারে।',
        'imageUrl' => '',
    ],
    'features' => [
        ['title' => 'Quality Education', 'title_bn' => 'মানসম্মত শিক্ষা', 'description' => 'Experienced teachers and modern curriculum.', 'icon' => 'GraduationCap'],
        ['title' => 'Safe Environment', 'title_bn' => 'নিরাপদ পরিবেশ', 'description' => 'Secure and supportive campus.', 'icon' => 'Shield'],
        ['title' => 'Parent Portal', 'title_bn' => 'অভিভাবক পোর্টাল', 'description' => 'Track attendance, fees, and results online.', 'icon' => 'Users'],
    ],
    'contact' => [
        'email' => 'info@school.edu.bd',
        'phone' => '+880 1XXX-XXXXXX',
        'address' => 'School Address, City, Bangladesh',
        'address_bn' => 'স্কুলের ঠিকানা, শহর, বাংলাদেশ',
        'mapEmbed' => '',
        'showSection' => true,
    ],
    'footer' => [
        'text' => 'Empowering students since day one.',
        'copyright' => '© 2024 School Name. All rights reserved.',
        'facebook' => '',
        'youtube' => '',
        'twitter' => '',
    ],
    'seo' => [
        'metaTitle' => 'School Name - Quality Education',
        'metaDescription' => 'Official website of our school. Admissions, notices, and more.',
    ],
    'notices' => [
        'enabled' => true,
        'maxItems' => 5,
        'sectionTitle' => 'Latest Notices',
        'sectionTitle_bn' => 'সর্বশেষ নোটিশ',
    ],
];
$configJson = $pdo->quote(json_encode($landingConfig));
$pdo->exec("INSERT IGNORE INTO landing_page_configs (institution_id, config, created_at, updated_at) VALUES (1, $configJson, '$now', '$now')");

echo "Dummy data inserted.\n";
echo "Done. Sessions, Classes, Students, Attendance, Exams, Fees, Notices, Teachers, Website are ready.\n";
