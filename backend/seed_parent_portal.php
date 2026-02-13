<?php
/**
 * Seeds comprehensive dummy data for testing the Parent Portal.
 * Adds: class routines, assignments + submissions, study materials,
 *       extended attendance & notices, additional invoices, second parent user.
 *
 * Run after seed_dummy.php and seed_users.php.
 * Usage: php seed_parent_portal.php
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
    echo "ERROR: Could not connect — " . $e->getMessage() . "\n";
    exit(1);
}

echo "=== Parent Portal Dummy Data Seeder ===\n\n";

$now = date('Y-m-d H:i:s');
$instId = 1;
$sessionId = 2; // current academic session

$userId = (int) $pdo->query("SELECT id FROM users WHERE email = 'admin@school.edu.bd' LIMIT 1")->fetchColumn();
if (!$userId) $userId = 1;

$teacherUserId = (int) $pdo->query("SELECT id FROM users WHERE email = 'teacher@school.edu.bd' LIMIT 1")->fetchColumn();
if (!$teacherUserId) $teacherUserId = $userId;

$passwordHash = password_hash('password', PASSWORD_BCRYPT);

// ================================================================
// 1. Create missing tables (if migrations haven't run)
// ================================================================
echo "1. Ensuring tables exist...\n";

$extraTables = [
    'class_routines' => "CREATE TABLE IF NOT EXISTS class_routines (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        academic_session_id BIGINT UNSIGNED NOT NULL,
        class_id BIGINT UNSIGNED NOT NULL,
        section_id BIGINT UNSIGNED NOT NULL,
        subject_id BIGINT UNSIGNED NOT NULL,
        teacher_id BIGINT UNSIGNED NULL,
        day ENUM('saturday','sunday','monday','tuesday','wednesday','thursday') NOT NULL,
        period_number TINYINT UNSIGNED NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        room VARCHAR(255) NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        UNIQUE KEY section_day_period_session (section_id, day, period_number, academic_session_id),
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES employees(id) ON DELETE SET NULL
    )",
    'assignments' => "CREATE TABLE IF NOT EXISTS assignments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        academic_session_id BIGINT UNSIGNED NOT NULL,
        class_id BIGINT UNSIGNED NOT NULL,
        section_id BIGINT UNSIGNED NULL,
        subject_id BIGINT UNSIGNED NOT NULL,
        created_by BIGINT UNSIGNED NOT NULL,
        title VARCHAR(200) NOT NULL,
        title_bn VARCHAR(200) NULL,
        description TEXT NULL,
        description_bn TEXT NULL,
        type ENUM('assignment','quiz','homework','project') DEFAULT 'assignment',
        total_marks INT DEFAULT 100,
        due_date DATE NULL,
        start_time DATETIME NULL,
        end_time DATETIME NULL,
        scope ENUM('class','section','individual') DEFAULT 'class',
        status ENUM('draft','published','closed') DEFAULT 'draft',
        attachments JSON NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )",
    'assignment_students' => "CREATE TABLE IF NOT EXISTS assignment_students (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        assignment_id BIGINT UNSIGNED NOT NULL,
        student_enrollment_id BIGINT UNSIGNED NOT NULL,
        UNIQUE KEY (assignment_id, student_enrollment_id),
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE
    )",
    'assignment_submissions' => "CREATE TABLE IF NOT EXISTS assignment_submissions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        assignment_id BIGINT UNSIGNED NOT NULL,
        student_enrollment_id BIGINT UNSIGNED NOT NULL,
        answer TEXT NULL,
        attachments JSON NULL,
        marks_obtained DECIMAL(8,2) NULL,
        feedback TEXT NULL,
        status ENUM('submitted','late','graded','returned') DEFAULT 'submitted',
        graded_by BIGINT UNSIGNED NULL,
        submitted_at TIMESTAMP NULL,
        graded_at TIMESTAMP NULL,
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        UNIQUE KEY (assignment_id, student_enrollment_id),
        FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
        FOREIGN KEY (student_enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
        FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL
    )",
    'study_materials' => "CREATE TABLE IF NOT EXISTS study_materials (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        institution_id BIGINT UNSIGNED NOT NULL,
        academic_session_id BIGINT UNSIGNED NOT NULL,
        class_id BIGINT UNSIGNED NOT NULL,
        section_id BIGINT UNSIGNED NULL,
        subject_id BIGINT UNSIGNED NOT NULL,
        created_by BIGINT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        title_bn VARCHAR(255) NULL,
        description TEXT NULL,
        description_bn TEXT NULL,
        type ENUM('google_drive','dropbox','youtube','website','document','other') DEFAULT 'other',
        link TEXT NOT NULL,
        file_name VARCHAR(255) NULL,
        file_type VARCHAR(50) NULL,
        is_public TINYINT(1) DEFAULT 1,
        status ENUM('draft','published') DEFAULT 'published',
        created_at TIMESTAMP NULL,
        updated_at TIMESTAMP NULL,
        FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )",
];

foreach ($extraTables as $name => $sql) {
    try {
        $pdo->exec($sql);
        echo "  + $name\n";
    } catch (PDOException $e) {
        echo "  ! $name: " . $e->getMessage() . "\n";
    }
}

// ================================================================
// 2. Enrich existing student & guardian profiles
// ================================================================
echo "\n2. Enriching student & guardian profiles...\n";

$studentUpdates = [
    [1, 'O+',  '12 Green Road, Dhanmondi, Dhaka-1205'],
    [2, 'A+',  '45 Road 7, Mirpur-10, Dhaka-1216'],
    [3, 'B+',  '78/A Mohammadpur Housing, Dhaka-1207'],
    [4, 'AB+', '23 Lake Circus, Dhanmondi, Dhaka-1205'],
    [5, 'O-',  '56 Sector 7, Uttara, Dhaka-1230'],
];
foreach ($studentUpdates as $su) {
    $addr = addslashes($su[2]);
    $pdo->exec("UPDATE students SET blood_group = '{$su[1]}', address = '$addr' WHERE id = {$su[0]} AND (blood_group IS NULL OR blood_group = '')");
}

$guardianUpdates = [
    [1, 'রহিম আহমেদ',   'rahim.ahmed@gmail.com',   '12 Green Road, Dhanmondi, Dhaka-1205',     'Businessman',       85000],
    [2, 'ফাতেমা বেগম',   'fatema.begum@gmail.com',   '12 Green Road, Dhanmondi, Dhaka-1205',     'School Teacher',    45000],
    [3, 'করিম হোসেন',    'karim.hossain@gmail.com',  '78/A Mohammadpur Housing, Dhaka-1207',     'Software Engineer', 120000],
    [4, 'আয়েশা খান',    'ayesha.khan@gmail.com',    '78/A Mohammadpur Housing, Dhaka-1207',     'Physician',         110000],
    [5, 'মিজান রহমান',   'mizan.rahman@gmail.com',   '56 Sector 7, Uttara, Dhaka-1230',          'Government Officer', 72000],
];
foreach ($guardianUpdates as $gu) {
    $nameBn = $gu[1];
    $email  = addslashes($gu[2]);
    $addr   = addslashes($gu[3]);
    $occ    = addslashes($gu[4]);
    $pdo->exec("UPDATE guardians SET name_bn = '$nameBn', email = '$email', address = '$addr', occupation = '$occ', monthly_income = {$gu[5]} WHERE id = {$gu[0]}");
}
echo "  + Updated 5 student & 5 guardian profiles\n";

// ================================================================
// 3. CLASS ROUTINES (sections 1 & 2)
// ================================================================
echo "\n3. Seeding class routines...\n";

$times = [
    1 => ['08:00:00', '08:45:00'],
    2 => ['08:50:00', '09:35:00'],
    3 => ['09:40:00', '10:25:00'],
    4 => ['10:45:00', '11:30:00'],
    5 => ['11:35:00', '12:20:00'],
    6 => ['12:25:00', '13:10:00'],
];

// [subject_id, teacher_id] per period
// Section 1 (Class 1-A) teachers: Bangla→1, English→2, Math→2, Science→4, SSC→5
$section1Schedule = [
    'saturday'  => [[1,1],[2,2],[3,2],[4,4],[5,5],[1,1]],
    'sunday'    => [[3,2],[1,1],[2,2],[5,5],[4,4],[3,2]],
    'monday'    => [[2,2],[3,2],[1,1],[4,4],[5,5],[2,2]],
    'tuesday'   => [[4,4],[5,5],[3,2],[1,1],[2,2],[4,4]],
    'wednesday' => [[1,1],[4,4],[5,5],[2,2],[3,2],[1,1]],
    'thursday'  => [[3,2],[2,2],[1,1],[5,5]],
];

// Section 2 (Class 1-B) teachers: Bangla→2, English→2, Math→3, Science→3, SSC→5
$section2Schedule = [
    'saturday'  => [[3,3],[4,3],[1,2],[2,2],[5,5],[3,3]],
    'sunday'    => [[1,2],[2,2],[4,3],[3,3],[5,5],[1,2]],
    'monday'    => [[5,5],[3,3],[2,2],[1,2],[4,3],[5,5]],
    'tuesday'   => [[2,2],[1,2],[3,3],[4,3],[5,5],[2,2]],
    'wednesday' => [[4,3],[5,5],[1,2],[3,3],[2,2],[4,3]],
    'thursday'  => [[1,2],[3,3],[4,3],[2,2]],
];

$routineCount = 0;
foreach ([1 => $section1Schedule, 2 => $section2Schedule] as $sectionId => $schedule) {
    $classId = 1;
    foreach ($schedule as $day => $periods) {
        foreach ($periods as $pIdx => $pd) {
            $periodNum = $pIdx + 1;
            $subjectId = $pd[0];
            $teacherId = $pd[1];
            $room = ($subjectId === 4) ? 'Science Lab' : "Room 10{$sectionId}";
            $start = $times[$periodNum][0];
            $end   = $times[$periodNum][1];
            $pdo->exec("INSERT IGNORE INTO class_routines
                (institution_id, academic_session_id, class_id, section_id, subject_id, teacher_id, day, period_number, start_time, end_time, room, created_at, updated_at)
                VALUES ($instId, $sessionId, $classId, $sectionId, $subjectId, $teacherId, '$day', $periodNum, '$start', '$end', '$room', '$now', '$now')");
            $routineCount++;
        }
    }
}
echo "  + Inserted $routineCount class routine periods\n";

// ================================================================
// 4. EXAM ROUTINES for Term 2 (future — March 2026)
// ================================================================
echo "\n4. Seeding exam routines for Annual 2026...\n";

// Update term 2 to future dates
$pdo->exec("UPDATE exam_terms SET name = 'Annual 2026', start_date = '2026-03-01', end_date = '2026-03-15', publish_status = 'published' WHERE id = 2");

// Add times to existing term 1 routines
$pdo->exec("UPDATE exam_routines SET start_time = '10:00:00', end_time = '13:00:00' WHERE start_time IS NULL");

// Exam routines for term 2, class 1
$examDatesC1 = ['2026-03-02','2026-03-04','2026-03-06','2026-03-09','2026-03-11'];
foreach (range(1, 5) as $i) {
    $pdo->exec("INSERT IGNORE INTO exam_routines
        (exam_term_id, class_id, subject_id, exam_date, start_time, end_time, full_marks, created_at, updated_at)
        VALUES (2, 1, $i, '{$examDatesC1[$i-1]}', '10:00:00', '13:00:00', 100, '$now', '$now')");
}

// Exam routines for term 2, class 2
$examDatesC2 = ['2026-03-03','2026-03-05','2026-03-07','2026-03-10','2026-03-12'];
foreach (range(1, 5) as $i) {
    $pdo->exec("INSERT IGNORE INTO exam_routines
        (exam_term_id, class_id, subject_id, exam_date, start_time, end_time, full_marks, created_at, updated_at)
        VALUES (2, 2, $i, '{$examDatesC2[$i-1]}', '10:00:00', '13:00:00', 100, '$now', '$now')");
}
echo "  + Exam routines for Annual 2026 (Class 1 & 2, 10 exams)\n";

// ================================================================
// 5. ASSIGNMENTS (15 for class 1, published, scope=class)
// ================================================================
echo "\n5. Seeding assignments...\n";

$assignmentCount = (int) $pdo->query("SELECT COUNT(*) FROM assignments WHERE institution_id = $instId")->fetchColumn();
if ($assignmentCount === 0) {
    // [subject_id, title, title_bn, type, total_marks, due_date, description, description_bn]
    $assignments = [
        // --- PAST (overdue — January 2026) ---
        [1, 'Write a paragraph about your family',
            'তোমার পরিবার সম্পর্কে একটি অনুচ্ছেদ লেখো',
            'assignment', 50, '2026-01-10',
            'Write a 200-word paragraph about your family members, their occupations, and what you love about them.',
            'তোমার পরিবারের সদস্য, তাদের পেশা এবং তুমি তাদের কী ভালোবাসো তা নিয়ে ২০০ শব্দের একটি অনুচ্ছেদ লেখো।'],
        [3, 'Math Worksheet — Addition & Subtraction',
            'গণিত কার্যপত্র — যোগ ও বিয়োগ',
            'homework', 50, '2026-01-15',
            'Complete all 20 problems from page 45 of the textbook. Show your work step by step.',
            'পাঠ্যপুস্তকের ৪৫ পৃষ্ঠা থেকে সব ২০টি সমস্যা সম্পূর্ণ করো। ধাপে ধাপে কাজ দেখাও।'],
        [4, 'Science Quiz — Animals & Plants',
            'বিজ্ঞান কুইজ — প্রাণী ও উদ্ভিদ',
            'quiz', 30, '2026-01-20',
            'Online quiz covering chapters 3-4. You have 30 minutes to complete.',
            'অনলাইন কুইজ অধ্যায় ৩-৪ থেকে। সম্পূর্ণ করতে ৩০ মিনিট সময়।'],
        [2, 'English — Fill in the Blanks',
            'ইংরেজি — শূন্যস্থান পূরণ',
            'homework', 25, '2026-01-25',
            'Fill in the blanks with correct prepositions. Exercise 5A and 5B.',
            'সঠিক পদান্বয়ী অব্যয় দিয়ে শূন্যস্থান পূরণ করো। অনুশীলন ৫ক এবং ৫খ।'],
        [5, 'Social Science Map Work',
            'সামাজিক বিজ্ঞান মানচিত্র কাজ',
            'assignment', 40, '2026-01-28',
            'Draw and label the map of Bangladesh showing major rivers and cities.',
            'বাংলাদেশের মানচিত্র আঁকো এবং প্রধান নদী ও শহরগুলো চিহ্নিত করো।'],

        // --- CURRENT (due this week / next week — Feb 2026) ---
        [1, 'Bangla Poem Recitation',
            'বাংলা কবিতা আবৃত্তি',
            'assignment', 30, '2026-02-14',
            'Memorize and recite the poem "Amar Sonar Bangla". Record a video if needed.',
            '"আমার সোনার বাংলা" কবিতাটি মুখস্থ করো এবং আবৃত্তি করো। প্রয়োজনে ভিডিও রেকর্ড করো।'],
        [3, 'Math — Multiplication Tables',
            'গণিত — গুণের নামতা',
            'homework', 40, '2026-02-16',
            'Write multiplication tables from 2 to 12. Practice each table 3 times.',
            '২ থেকে ১২ পর্যন্ত গুণের নামতা লেখো। প্রতিটি নামতা ৩ বার অনুশীলন করো।'],
        [2, 'English Story Reading',
            'ইংরেজি গল্প পড়া',
            'homework', 25, '2026-02-18',
            'Read the story "The Tortoise and the Hare" and write 5 things you learned from it.',
            '"খরগোশ ও কচ্ছপ" গল্পটি পড়ো এবং তুমি যা শিখেছ তা থেকে ৫টি বিষয় লেখো।'],
        [4, 'Science Drawing — Water Cycle',
            'বিজ্ঞান অঙ্কন — পানি চক্র',
            'assignment', 50, '2026-02-20',
            'Draw and label the water cycle diagram. Color it neatly.',
            'পানি চক্রের ডায়াগ্রাম আঁকো এবং চিহ্নিত করো। সুন্দরভাবে রং করো।'],
        [5, 'Social Science Chapter Review',
            'সামাজিক বিজ্ঞান অধ্যায় পর্যালোচনা',
            'quiz', 15, '2026-02-22',
            'Review quiz on Chapter 6 — Our Community. 15 MCQ questions.',
            'অধ্যায় ৬ - আমাদের সম্প্রদায় এর পর্যালোচনা কুইজ। ১৫টি বহুনির্বাচনী প্রশ্ন।'],

        // --- FUTURE (March 2026) ---
        [1, 'My Favorite Season — Essay',
            'আমার প্রিয় ঋতু — রচনা',
            'assignment', 60, '2026-03-05',
            'Write a 300-word essay about your favorite season. Include reasons why you like it.',
            'তোমার প্রিয় ঋতু সম্পর্কে ৩০০ শব্দের একটি রচনা লেখো। কেন পছন্দ করো তার কারণ অন্তর্ভুক্ত করো।'],
        [3, 'Math Problem Set — Geometry',
            'গণিত সমস্যা সেট — জ্যামিতি',
            'homework', 75, '2026-03-10',
            'Solve problems 1-15 from the geometry chapter. Draw shapes accurately.',
            'জ্যামিতি অধ্যায় থেকে ১-১৫ সমস্যা সমাধান করো। আকৃতিগুলো সঠিকভাবে আঁকো।'],
        [4, 'Science Project — Plant Growth',
            'বিজ্ঞান প্রকল্প — উদ্ভিদ বৃদ্ধি',
            'project', 100, '2026-03-20',
            'Plant a seed and record its growth over 2 weeks. Take photos daily and create a chart.',
            'একটি বীজ রোপণ করো এবং ২ সপ্তাহ ধরে এর বৃদ্ধি রেকর্ড করো। প্রতিদিন ছবি তোলো এবং একটি চার্ট তৈরি করো।'],
        [2, 'English Grammar Quiz',
            'ইংরেজি ব্যাকরণ কুইজ',
            'quiz', 20, '2026-03-15',
            'Quiz covering tenses, articles, and pronouns. Chapters 7-9.',
            'কাল, আর্টিকেল এবং সর্বনাম নিয়ে কুইজ। অধ্যায় ৭-৯।'],
        [5, 'Cultural Heritage Project',
            'সাংস্কৃতিক ঐতিহ্য প্রকল্প',
            'project', 80, '2026-03-25',
            'Create a poster about Bangladeshi cultural heritage. Include festivals, food, and traditions.',
            'বাংলাদেশের সাংস্কৃতিক ঐতিহ্য সম্পর্কে একটি পোস্টার তৈরি করো। উৎসব, খাবার এবং ঐতিহ্য অন্তর্ভুক্ত করো।'],
    ];

    foreach ($assignments as $a) {
        $subId    = $a[0];
        $title    = addslashes($a[1]);
        $titleBn  = addslashes($a[2]);
        $type     = $a[3];
        $marks    = $a[4];
        $due      = $a[5];
        $desc     = addslashes($a[6]);
        $descBn   = addslashes($a[7]);
        $pdo->exec("INSERT INTO assignments
            (institution_id, academic_session_id, class_id, subject_id, created_by, title, title_bn, description, description_bn, type, total_marks, due_date, scope, status, created_at, updated_at)
            VALUES ($instId, $sessionId, 1, $subId, $teacherUserId, '$title', '$titleBn', '$desc', '$descBn', '$type', $marks, '$due', 'class', 'published', '$now', '$now')");
    }
    echo "  + Created 15 assignments (5 past, 5 current, 5 future)\n";
} else {
    echo "  ~ Assignments already exist ($assignmentCount found), skipping\n";
}

// ================================================================
// 6. ASSIGNMENT SUBMISSIONS
// ================================================================
echo "\n6. Seeding assignment submissions...\n";

$subCheck = (int) $pdo->query("SELECT COUNT(*) FROM assignment_submissions")->fetchColumn();
if ($subCheck === 0) {
    $aIds = $pdo->query("SELECT id FROM assignments WHERE institution_id = $instId AND status = 'published' ORDER BY id")->fetchAll(PDO::FETCH_COLUMN);

    if (count($aIds) >= 15) {
        // [assignment_id, enrollment_id, answer, marks_obtained, feedback, status, submitted_at, graded_at]
        $submissions = [
            // -------- Enrollment 1 — Ayan Rahman (Class 1-A) --------
            // Past — graded
            [$aIds[0],  1, 'My family is very special to me. We are five members...',            42, 'Excellent paragraph! Good use of descriptive language.', 'graded', '2026-01-09 15:30:00', '2026-01-11 10:00:00'],
            [$aIds[1],  1, 'All 20 problems solved step by step.',                               48, 'Very well done! All steps correct. Keep it up!',         'graded', '2026-01-14 16:00:00', '2026-01-16 09:00:00'],
            [$aIds[2],  1, 'Quiz answers submitted online.',                                     27, 'Good effort! 27/30 correct. Review plant reproduction.', 'graded', '2026-01-20 10:30:00', '2026-01-21 11:00:00'],
            [$aIds[3],  1, 'Filled in all prepositions for exercises 5A & 5B.',                  22, 'Almost perfect. Review usage of "at" vs "in".',          'graded', '2026-01-24 14:00:00', '2026-01-26 10:00:00'],
            // Past #5 (Social Science Map) — NOT submitted (overdue!)
            // Current — submitted, awaiting grading
            [$aIds[5],  1, 'Video of poem recitation recorded and attached.',                    null, null, 'submitted', '2026-02-13 09:00:00', null],
            [$aIds[6],  1, 'Multiplication tables 2-12 written and practiced 3 times each.',     null, null, 'submitted', '2026-02-13 10:00:00', null],
            // Current #8, #9, #10 — not submitted yet
            // Future — not submitted yet

            // -------- Enrollment 2 — Sara Islam (Class 1-A) --------
            // Past — graded
            [$aIds[0],  2, 'My family consists of four members. My father, mother, me...',       45, 'Beautiful writing! Very descriptive and well structured.', 'graded', '2026-01-09 14:00:00', '2026-01-11 10:30:00'],
            [$aIds[1],  2, 'Completed all exercises from page 45.',                              38, 'Good work but show more steps for questions 15-20.',       'graded', '2026-01-14 17:00:00', '2026-01-16 09:30:00'],
            [$aIds[2],  2, 'All quiz questions answered.',                                       25, 'Nice attempt! 25/30. Review animal habitats.',            'graded', '2026-01-20 10:20:00', '2026-01-21 11:00:00'],
            [$aIds[3],  2, 'Sorry for the late submission. All blanks filled.',                   20, 'Submitted late, -2 marks. Good work otherwise.',          'graded', '2026-01-26 18:00:00', '2026-01-27 10:00:00'],
            [$aIds[4],  2, 'Map of Bangladesh drawn and labeled with rivers and cities.',         35, 'Great map! All major rivers labeled correctly.',           'graded', '2026-01-27 16:00:00', '2026-01-29 10:00:00'],
            // Current — submitted
            [$aIds[5],  2, 'Poem recitation video attached. Memorized fully.',                   null, null, 'submitted', '2026-02-12 11:00:00', null],

            // -------- Enrollment 3 — Rafid Hassan (Class 1-B, for parent 2) --------
            [$aIds[0],  3, 'My family is the best. We love spending time together.',              40, 'Good paragraph structure. Add more details next time.',    'graded', '2026-01-10 10:00:00', '2026-01-12 10:00:00'],
            [$aIds[1],  3, 'All worksheets solved carefully.',                                    44, 'Excellent! Nearly perfect work.',                          'graded', '2026-01-15 11:00:00', '2026-01-17 09:00:00'],
            [$aIds[2],  3, 'Quiz completed within time limit.',                                   28, 'Great performance! 28/30.',                                'graded', '2026-01-20 10:15:00', '2026-01-21 11:00:00'],
            [$aIds[5],  3, 'Poem recitation done. Memorized the full poem.',                      null, null, 'submitted', '2026-02-13 08:00:00', null],

            // -------- Enrollment 4 — Nadia Akter (Class 1-B, for parent 2) --------
            [$aIds[0],  4, 'We are a happy family of five members...',                            38, 'Good effort. Work on sentence structure.',                 'graded', '2026-01-09 15:00:00', '2026-01-11 10:00:00'],
            [$aIds[1],  4, 'Solved all 20 problems from the worksheet.',                          41, 'Well done! Minor calculation errors in Q8.',              'graded', '2026-01-14 14:30:00', '2026-01-16 09:00:00'],
            [$aIds[2],  4, 'Answered all quiz questions on time.',                                 28, 'Great performance! 28/30. Keep it up.',                   'graded', '2026-01-20 10:25:00', '2026-01-21 11:00:00'],
            [$aIds[4],  4, 'Map work completed with colored markers.',                             36, 'Very neat work! Well labeled.',                            'graded', '2026-01-28 09:00:00', '2026-01-30 10:00:00'],
            [$aIds[6],  4, 'Tables written neatly in notebook.',                                   null, null, 'submitted', '2026-02-14 08:30:00', null],
        ];

        $submissionCount = 0;
        foreach ($submissions as $s) {
            $answer    = addslashes($s[2]);
            $marks     = ($s[3] !== null) ? $s[3] : 'NULL';
            $feedback  = ($s[4] !== null) ? "'" . addslashes($s[4]) . "'" : 'NULL';
            $status    = $s[5];
            $subAt     = $s[6];
            $gradedAt  = ($s[7] !== null) ? "'{$s[7]}'" : 'NULL';
            $gradedBy  = ($s[7] !== null) ? $teacherUserId : 'NULL';
            $pdo->exec("INSERT IGNORE INTO assignment_submissions
                (assignment_id, student_enrollment_id, answer, marks_obtained, feedback, status, graded_by, submitted_at, graded_at, created_at, updated_at)
                VALUES ({$s[0]}, {$s[1]}, '$answer', $marks, $feedback, '$status', $gradedBy, '$subAt', $gradedAt, '$now', '$now')");
            $submissionCount++;
        }
        echo "  + Created $submissionCount assignment submissions\n";
    } else {
        echo "  ! Not enough assignments found to seed submissions\n";
    }
} else {
    echo "  ~ Submissions already exist ($subCheck found), skipping\n";
}

// ================================================================
// 7. STUDY MATERIALS (8 items for class 1)
// ================================================================
echo "\n7. Seeding study materials...\n";

$matCheck = (int) $pdo->query("SELECT COUNT(*) FROM study_materials WHERE institution_id = $instId")->fetchColumn();
if ($matCheck === 0) {
    // [subject_id, title, title_bn, description, type, link]
    $materials = [
        [1, 'Bangla Alphabet Song — Fun Animation',
            'বাংলা বর্ণমালা গান — মজার অ্যানিমেশন',
            'Fun animated video to learn Bangla alphabets with colorful animation and catchy music. Great for young learners.',
            'youtube', 'https://www.youtube.com/watch?v=bangla_alphabet_example'],
        [2, 'English Grammar Workbook — Class 1',
            'ইংরেজি ব্যাকরণ ওয়ার্কবুক — শ্রেণি ১',
            'Complete grammar workbook with exercises on nouns, pronouns, verbs, and prepositions. Ideal for Class 1 students.',
            'google_drive', 'https://drive.google.com/file/d/grammar_workbook_class1/view'],
        [3, 'Math Practice Sheets — Numbers 1-100',
            'গণিত অনুশীলন শিট — সংখ্যা ১-১০০',
            'Printable worksheets covering addition, subtraction, and number recognition from 1 to 100.',
            'document', 'https://schoolresources.example.com/math-class1-numbers.pdf'],
        [4, 'Animals Around Us — Science Video',
            'আমাদের চারপাশের প্রাণী — বিজ্ঞান ভিডিও',
            'Interactive educational video about different animals, their habitats, food habits, and how they adapt to the environment.',
            'youtube', 'https://www.youtube.com/watch?v=animals_science_class1'],
        [5, 'Bangladesh Map — Interactive Learning',
            'বাংলাদেশ মানচিত্র — ইন্টারেক্টিভ শিক্ষা',
            'Interactive map of Bangladesh for geography practice. Click on districts to learn about each one.',
            'website', 'https://maps.example.com/bangladesh-interactive'],
        [1, 'Bangla Short Stories Collection',
            'বাংলা ছোটগল্প সংকলন',
            'A collection of 20 age-appropriate short stories for young readers. Great for reading practice and comprehension.',
            'google_drive', 'https://drive.google.com/file/d/bangla_stories_collection/view'],
        [3, 'Times Tables — Visual Guide (2-12)',
            'গুণের নামতা — ভিজ্যুয়াল গাইড (২-১২)',
            'Visual and musical guide to multiplication tables from 2 to 12. Makes memorization fun and easy.',
            'youtube', 'https://www.youtube.com/watch?v=times_tables_visual'],
        [2, 'English Vocabulary Flashcards',
            'ইংরেজি শব্দভাণ্ডার ফ্ল্যাশকার্ড',
            'Printable flashcards with 100 essential English words. Each card has the word, image, and usage example.',
            'document', 'https://schoolresources.example.com/vocab-flashcards-class1.pdf'],
    ];

    foreach ($materials as $m) {
        $subId   = $m[0];
        $title   = addslashes($m[1]);
        $titleBn = addslashes($m[2]);
        $desc    = addslashes($m[3]);
        $type    = $m[4];
        $link    = addslashes($m[5]);
        $pdo->exec("INSERT INTO study_materials
            (institution_id, academic_session_id, class_id, subject_id, created_by, title, title_bn, description, description_bn, type, link, is_public, status, created_at, updated_at)
            VALUES ($instId, $sessionId, 1, $subId, $teacherUserId, '$title', '$titleBn', '$desc', '$desc', '$type', '$link', 1, 'published', '$now', '$now')");
    }
    echo "  + Created 8 study materials (videos, documents, websites)\n";
} else {
    echo "  ~ Study materials already exist ($matCheck found), skipping\n";
}

// ================================================================
// 8. EXTENDED ATTENDANCE (60+ days for enrollments 1-4)
// ================================================================
echo "\n8. Extending attendance data...\n";

$attCount = 0;
for ($d = 0; $d < 60; $d++) {
    $date = date('Y-m-d', strtotime("-$d days"));
    $dayOfWeek = (int) date('N', strtotime($date)); // 5=Fri, 6=Sat
    if ($dayOfWeek === 5) continue; // Skip Friday (weekend in Bangladesh)

    foreach ([1, 2, 3, 4] as $enId) {
        $r = rand(1, 100);
        if ($r <= 82) $status = 'present';
        elseif ($r <= 90) $status = 'absent';
        elseif ($r <= 96) $status = 'late';
        else $status = 'leave';
        $remark = ($status === 'absent') ? "'Absent without notice'" : (($status === 'leave') ? "'On approved leave'" : 'NULL');
        $result = $pdo->exec("INSERT IGNORE INTO student_attendances
            (student_enrollment_id, date, status, remark, marked_by, created_at, updated_at)
            VALUES ($enId, '$date', '$status', $remark, $userId, '$now', '$now')");
        if ($result) $attCount++;
    }
}
echo "  + Added $attCount attendance records (60 days, 4 students)\n";

// ================================================================
// 9. ADDITIONAL NOTICES (varied audiences)
// ================================================================
echo "\n9. Seeding additional notices...\n";

$maxNoticeId = (int) $pdo->query("SELECT COALESCE(MAX(id), 0) FROM notices")->fetchColumn();
$extraNotices = [
    ['Parent-Teacher Meeting — February 2026',
     'অভিভাবক-শিক্ষক সভা — ফেব্রুয়ারি ২০২৬',
     'Dear parents, a parent-teacher meeting is scheduled for 25th February 2026 at 10:00 AM in the school auditorium. Please bring your child\'s progress report card. Refreshments will be provided.',
     'প্রিয় অভিভাবকগণ, ২৫ ফেব্রুয়ারি ২০২৬ তারিখে সকাল ১০:০০ টায় স্কুল অডিটোরিয়ামে অভিভাবক-শিক্ষক সভা অনুষ্ঠিত হবে। দয়া করে আপনার সন্তানের অগ্রগতি রিপোর্ট কার্ড নিয়ে আসুন।',
     'parents'],
    ['Fee Payment Deadline Extended',
     'ফি প্রদানের সময়সীমা বর্ধিত',
     'The deadline for January 2026 fee payment has been extended to 28th February 2026. Please clear all outstanding dues to avoid late fine of BDT 100 per month.',
     'জানুয়ারি ২০২৬-এর ফি প্রদানের সময়সীমা ২৮ ফেব্রুয়ারি ২০২৬ পর্যন্ত বর্ধিত করা হয়েছে। প্রতি মাসে ১০০ টাকা জরিমানা এড়াতে সমস্ত বকেয়া পরিশোধ করুন।',
     'parents'],
    ['Annual Sports Day 2026',
     'বার্ষিক ক্রীড়া দিবস ২০২৬',
     'Annual sports competition will be held on 20th March 2026 at the school grounds. Events include 100m dash, sack race, musical chairs, and relay. Students should register for events by 1st March.',
     'বার্ষিক ক্রীড়া প্রতিযোগিতা ২০ মার্চ ২০২৬ তারিখে স্কুল মাঠে অনুষ্ঠিত হবে। শিক্ষার্থীদের ১ মার্চের মধ্যে ইভেন্টে নাম লেখাতে হবে।',
     'students'],
    ['New Library Books Available',
     'নতুন লাইব্রেরি বই পাওয়া যাচ্ছে',
     'We have added 200 new books to our school library including science fiction, Bengali literature, history, and mathematics reference books. Visit the library during break time (10:25 AM - 10:45 AM).',
     'আমরা স্কুল লাইব্রেরিতে ২০০টি নতুন বই যোগ করেছি। বিরতির সময় (সকাল ১০:২৫ - ১০:৪৫) লাইব্রেরি পরিদর্শন করুন।',
     'all'],
    ['Science Fair 2026 — Call for Projects',
     'বিজ্ঞান মেলা ২০২৬ — প্রকল্প আহ্বান',
     'Science fair will be held in April 2026. Students from Class 1-5 can participate individually or in teams of 2-3. Submit your project proposal to your science teacher by 15th March 2026.',
     'বিজ্ঞান মেলা এপ্রিল ২০২৬-এ অনুষ্ঠিত হবে। শ্রেণি ১-৫ এর শিক্ষার্থীরা একক বা ২-৩ জনের দলে অংশ নিতে পারবে। ১৫ মার্চের মধ্যে প্রকল্প প্রস্তাব জমা দিন।',
     'students'],
    ['Staff Training Day — No Classes on 28 Feb',
     'কর্মী প্রশিক্ষণ দিবস — ২৮ ফেব্রুয়ারি ক্লাস নেই',
     'School will remain closed for students on 28th February 2026 due to staff professional development training. Regular classes will resume on 1st March.',
     'কর্মী পেশাগত উন্নয়ন প্রশিক্ষণের জন্য ২৮ ফেব্রুয়ারি ২০২৬ তারিখে শিক্ষার্থীদের জন্য স্কুল বন্ধ থাকবে। ১ মার্চ থেকে নিয়মিত ক্লাস শুরু হবে।',
     'all'],
    ['Uniform & ID Card Reminder',
     'ইউনিফর্ম ও আইডি কার্ড স্মরণিকা',
     'All students must wear proper school uniform including white shirt, navy blue pants/skirt, black shoes, and school ID card at all times. Parents are requested to ensure compliance starting from next week.',
     'সকল শিক্ষার্থীকে সাদা শার্ট, গাঢ় নীল প্যান্ট/স্কার্ট, কালো জুতা এবং স্কুল আইডি কার্ডসহ সঠিক স্কুল ইউনিফর্ম পরতে হবে। আগামী সপ্তাহ থেকে অভিভাবকদের সম্মতি নিশ্চিত করার অনুরোধ করা হচ্ছে।',
     'parents'],
];

$noticeAdded = 0;
foreach ($extraNotices as $n) {
    $maxNoticeId++;
    $title   = addslashes($n[0]);
    $titleBn = addslashes($n[1]);
    $body    = addslashes($n[2]);
    $bodyBn  = addslashes($n[3]);
    $aud     = $n[4];
    $daysAgo = rand(0, 14);
    $pubDate = date('Y-m-d H:i:s', strtotime("-$daysAgo days"));
    $result  = $pdo->exec("INSERT IGNORE INTO notices
        (id, institution_id, created_by, title, title_bn, body, body_bn, audience, is_published, published_at, created_at, updated_at)
        VALUES ($maxNoticeId, $instId, $userId, '$title', '$titleBn', '$body', '$bodyBn', '$aud', 1, '$pubDate', '$now', '$now')");
    if ($result) $noticeAdded++;
}
echo "  + Added $noticeAdded notices (parents/students/all audiences)\n";

// ================================================================
// 10. ADDITIONAL INVOICES (monthly, for students 1-4)
// ================================================================
echo "\n10. Seeding monthly invoices...\n";

$invCount = 0;
$months = ['2025-02','2025-03','2025-04','2025-05','2025-06','2025-07','2025-08','2025-09','2025-10','2025-11','2025-12','2026-01','2026-02'];

foreach ([1, 2, 3, 4] as $studentId) {
    foreach ($months as $month) {
        $existing = (int) $pdo->query("SELECT COUNT(*) FROM invoices WHERE student_id = $studentId AND month = '$month'")->fetchColumn();
        if ($existing > 0) continue;

        $invNo = 'INV-' . strtoupper(uniqid()) . "-S$studentId";
        $total = 2500; // Tuition(1500) + Transport(1000)
        $r = rand(1, 100);
        if ($r <= 50)      { $paid = $total; $due = 0;            $status = 'paid'; }
        elseif ($r <= 80)  { $paid = rand(800, 2000); $due = $total - $paid; $status = 'partial'; }
        else               { $paid = 0; $due = $total;            $status = 'pending'; }

        // Due date = last day of the month
        $parts = explode('-', $month);
        $lastDay = date('t', mktime(0, 0, 0, (int)$parts[1], 1, (int)$parts[0]));
        $dueDate = "$month-$lastDay";

        $pdo->exec("INSERT INTO invoices
            (institution_id, student_id, academic_session_id, invoice_no, month, sub_total, discount_amount, total_amount, paid_amount, due_amount, status, due_date, created_at, updated_at)
            VALUES ($instId, $studentId, $sessionId, '$invNo', '$month', $total, 0, $total, $paid, $due, '$status', '$dueDate', '$now', '$now')");
        $invId = $pdo->lastInsertId();

        $pdo->exec("INSERT INTO invoice_items (invoice_id, fee_head_id, amount, created_at, updated_at) VALUES
            ($invId, 1, 1500, '$now', '$now'),
            ($invId, 4, 1000, '$now', '$now')");

        if ($paid > 0) {
            $rcp = 'RCP-' . strtoupper(uniqid()) . "-S$studentId";
            $payDay = rand(1, min(20, (int)$lastDay));
            $payDate = sprintf('%s-%02d', $month, $payDay);
            $methods = ['cash', 'bkash', 'nagad', 'bank'];
            $method = $methods[array_rand($methods)];
            $pdo->exec("INSERT INTO payments
                (institution_id, invoice_id, receipt_no, amount, payment_date, method, collected_by, created_at, updated_at)
                VALUES ($instId, $invId, '$rcp', $paid, '$payDate', '$method', $userId, '$now', '$now')");
        }
        $invCount++;
    }
}
echo "  + Added $invCount monthly invoices with payments\n";

// ================================================================
// 11. SECOND PARENT USER (parent2@school.edu.bd → guardian 3)
// ================================================================
echo "\n11. Creating second parent user...\n";

$stmt = $pdo->prepare("INSERT INTO users
    (institution_id, name, name_bn, email, password, phone, is_active, created_at, updated_at)
    VALUES (?, 'Karim Hossain', 'করিম হোসেন', 'parent2@school.edu.bd', ?, '+8801722222003', 1, '$now', '$now')
    ON DUPLICATE KEY UPDATE password = VALUES(password), name = VALUES(name), phone = VALUES(phone), is_active = 1");
$stmt->execute([$instId, $passwordHash]);

$parent2UserId = (int) $pdo->query("SELECT id FROM users WHERE email = 'parent2@school.edu.bd'")->fetchColumn();
$parentRoleId  = (int) $pdo->query("SELECT id FROM roles WHERE name = 'parent'")->fetchColumn();
if ($parentRoleId && $parent2UserId) {
    $pdo->exec("INSERT IGNORE INTO model_has_roles (role_id, model_type, model_id) VALUES ($parentRoleId, 'App\\\\Models\\\\User', $parent2UserId)");
    $pdo->exec("UPDATE guardians SET user_id = $parent2UserId WHERE id = 3");
    echo "  + Created parent2@school.edu.bd linked to guardian Karim Hossain\n";
} else {
    echo "  ! Could not create second parent user (missing role or user)\n";
}

// ================================================================
// SUMMARY
// ================================================================
echo "\n" . str_repeat('=', 55) . "\n";
echo " Parent Portal Dummy Data — Complete!\n";
echo str_repeat('=', 55) . "\n\n";

echo "Login Credentials:\n";
echo "  Parent 1: parent@school.edu.bd  / password\n";
echo "    -> Children: Ayan Rahman (Class 1-A, Roll 1)\n";
echo "                 Sara Islam  (Class 1-A, Roll 2)\n\n";
echo "  Parent 2: parent2@school.edu.bd / password\n";
echo "    -> Children: Rafid Hassan (Class 1-B, Roll 1)\n";
echo "                 Nadia Akter  (Class 1-B, Roll 2)\n\n";

echo "Data Summary:\n";
echo "  * Class routines    : $routineCount periods (Sec 1-A & 1-B, Sat-Thu)\n";
echo "  * Exam routines     : 10 exams for Annual 2026 (March 2026)\n";
echo "  * Assignments       : 15 (5 past / 5 current / 5 future)\n";
echo "  * Submissions       : " . ($submissionCount ?? 0) . " (graded + submitted + overdue)\n";
echo "  * Study materials   : 8 (YouTube, Drive, PDFs, websites)\n";
echo "  * Attendance        : 60 days x 4 students (+$attCount new records)\n";
echo "  * Notices           : +$noticeAdded (parents/students/all)\n";
echo "  * Invoices          : +$invCount monthly (Feb 2025 — Feb 2026)\n";
echo "  * Guardian profiles : enriched with Bangla names, address, occupation\n";
echo "  * Student profiles  : enriched with blood group and address\n";
echo "\n";
