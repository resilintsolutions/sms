<?php
/**
 * Creates library tables (books, book_issues, ebooks) and seeds dummy data.
 * Run after seed_dummy.php and seed_user_management.php.
 * Usage: php seed_librarian.php
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

// Get institution_id from institutions table
$instRow = $pdo->query("SELECT id FROM institutions LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$instRow) { echo "ERROR: No institution found. Run seed_admin.php first.\n"; exit(1); }
$institutionId = $instRow['id'];

// Get the librarian user id
$librarianRow = $pdo->query("SELECT id FROM users WHERE email LIKE '%librarian%' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$librarianId = $librarianRow ? $librarianRow['id'] : 1;

// Get some student IDs
$studentRows = $pdo->query("SELECT id FROM students WHERE institution_id = $institutionId LIMIT 30")->fetchAll(PDO::FETCH_COLUMN);
if (empty($studentRows)) {
    echo "WARNING: No students found. Book issues won't be created.\n";
}

// ============================================================
// 1. CREATE TABLES
// ============================================================

echo "Creating library tables...\n";

$pdo->exec("CREATE TABLE IF NOT EXISTS books (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institution_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_bn VARCHAR(500) NULL,
    author VARCHAR(300) NOT NULL,
    author_bn VARCHAR(300) NULL,
    isbn VARCHAR(30) NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Other',
    publisher VARCHAR(300) NULL,
    edition VARCHAR(50) NULL,
    language VARCHAR(50) DEFAULT 'Bangla',
    pages INT UNSIGNED NULL,
    shelf_location VARCHAR(100) NULL,
    total_copies INT UNSIGNED NOT NULL DEFAULT 1,
    available_copies INT UNSIGNED NOT NULL DEFAULT 1,
    cover_image VARCHAR(500) NULL,
    description TEXT NULL,
    description_bn TEXT NULL,
    added_by BIGINT UNSIGNED NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_books_institution (institution_id),
    INDEX idx_books_category (category),
    INDEX idx_books_isbn (isbn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS book_issues (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institution_id BIGINT UNSIGNED NOT NULL,
    book_id BIGINT UNSIGNED NOT NULL,
    student_id BIGINT UNSIGNED NOT NULL,
    issued_by BIGINT UNSIGNED NULL,
    returned_to BIGINT UNSIGNED NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE NULL,
    fine_amount DECIMAL(8,2) DEFAULT 0.00,
    fine_paid TINYINT(1) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'issued',
    remarks TEXT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_issues_institution (institution_id),
    INDEX idx_issues_book (book_id),
    INDEX idx_issues_student (student_id),
    INDEX idx_issues_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$pdo->exec("CREATE TABLE IF NOT EXISTS ebooks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institution_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_bn VARCHAR(500) NULL,
    author VARCHAR(300) NOT NULL,
    author_bn VARCHAR(300) NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Other',
    description TEXT NULL,
    description_bn TEXT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'pdf',
    link VARCHAR(1000) NOT NULL,
    file_name VARCHAR(300) NULL,
    file_type VARCHAR(50) NULL,
    file_size BIGINT UNSIGNED NULL,
    cover_image VARCHAR(500) NULL,
    is_public TINYINT(1) DEFAULT 1,
    download_count INT UNSIGNED DEFAULT 0,
    added_by BIGINT UNSIGNED NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_ebooks_institution (institution_id),
    INDEX idx_ebooks_category (category),
    INDEX idx_ebooks_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

echo "  Tables created.\n";

// ============================================================
// 2. CHECK IF DATA ALREADY EXISTS
// ============================================================

$bookCount = $pdo->query("SELECT COUNT(*) FROM books WHERE institution_id = $institutionId")->fetchColumn();
if ($bookCount > 0) {
    echo "Library data already exists ($bookCount books). Skipping seed.\n";
    exit(0);
}

// ============================================================
// 3. SEED BOOKS (50 books across categories)
// ============================================================

echo "Seeding books...\n";

$books = [
    // Literature (8)
    ['পথের পাঁচালী', 'Pather Panchali', 'বিভূতিভূষণ বন্দ্যোপাধ্যায়', 'Bibhutibhushan Bandyopadhyay', '978-984-8700-01-1', 'Literature', 'মিত্র ও ঘোষ', '15th', 'Bangla', 320, 'Shelf A-1', 3],
    ['গীতাঞ্জলি', 'Gitanjali', 'রবীন্দ্রনাথ ঠাকুর', 'Rabindranath Tagore', '978-984-8700-02-8', 'Literature', 'বিশ্বভারতী', '50th', 'Bangla', 104, 'Shelf A-1', 4],
    ['শ্রীকান্ত', 'Srikanta', 'শরৎচন্দ্র চট্টোপাধ্যায়', 'Sarat Chandra Chattopadhyay', '978-984-8700-03-5', 'Literature', 'দে\'জ পাবলিশিং', '20th', 'Bangla', 450, 'Shelf A-2', 2],
    ['দেবদাস', 'Devdas', 'শরৎচন্দ্র চট্টোপাধ্যায়', 'Sarat Chandra Chattopadhyay', '978-984-8700-04-2', 'Literature', 'দে\'জ পাবলিশিং', '25th', 'Bangla', 180, 'Shelf A-2', 3],
    ['লালসালু', 'Lalsalu', 'সৈয়দ ওয়ালীউল্লাহ্', 'Syed Waliullah', '978-984-8700-05-9', 'Literature', 'নওরোজ কিতাবিস্তান', '10th', 'Bangla', 156, 'Shelf A-3', 2],
    ['কপালকুণ্ডলা', 'Kapalkundala', 'বঙ্কিমচন্দ্র চট্টোপাধ্যায়', 'Bankim Chandra Chattopadhyay', '978-984-8700-06-6', 'Literature', 'দে\'জ পাবলিশিং', '12th', 'Bangla', 200, 'Shelf A-3', 2],
    ['Things Fall Apart', 'Things Fall Apart', 'চিনুয়া আচেবে', 'Chinua Achebe', '978-0-385-47454-2', 'Literature', 'Penguin Books', '1st', 'English', 209, 'Shelf A-4', 2],
    ['To Kill a Mockingbird', 'To Kill a Mockingbird', 'হার্পার লি', 'Harper Lee', '978-0-06-112008-4', 'Literature', 'Harper Collins', '1st', 'English', 336, 'Shelf A-4', 2],

    // Science (7)
    ['সাধারণ বিজ্ঞান - নবম-দশম শ্রেণি', 'General Science 9-10', 'এনসিটিবি', 'NCTB', '978-984-8700-10-3', 'Science', 'NCTB', '2024', 'Bangla', 280, 'Shelf B-1', 5],
    ['পদার্থবিজ্ঞান - একাদশ শ্রেণি', 'Physics Class 11', 'এনসিটিবি', 'NCTB', '978-984-8700-11-0', 'Science', 'NCTB', '2024', 'Bangla', 350, 'Shelf B-1', 4],
    ['রসায়ন - নবম-দশম শ্রেণি', 'Chemistry 9-10', 'এনসিটিবি', 'NCTB', '978-984-8700-12-7', 'Science', 'NCTB', '2024', 'Bangla', 300, 'Shelf B-2', 5],
    ['জীববিজ্ঞান - নবম-দশম শ্রেণি', 'Biology 9-10', 'এনসিটিবি', 'NCTB', '978-984-8700-13-4', 'Science', 'NCTB', '2024', 'Bangla', 310, 'Shelf B-2', 5],
    ['A Brief History of Time', 'A Brief History of Time', 'স্টিফেন হকিং', 'Stephen Hawking', '978-0-553-38016-3', 'Science', 'Bantam Books', '1st', 'English', 256, 'Shelf B-3', 2],
    ['Cosmos', 'Cosmos', 'কার্ল সেগান', 'Carl Sagan', '978-0-345-53943-4', 'Science', 'Ballantine Books', '1st', 'English', 432, 'Shelf B-3', 2],
    ['The Origin of Species', 'The Origin of Species', 'চার্লস ডারউইন', 'Charles Darwin', '978-0-451-52906-0', 'Science', 'Penguin Classics', '1st', 'English', 480, 'Shelf B-3', 1],

    // Mathematics (5)
    ['গণিত - নবম-দশম শ্রেণি', 'Mathematics 9-10', 'এনসিটিবি', 'NCTB', '978-984-8700-20-2', 'Mathematics', 'NCTB', '2024', 'Bangla', 400, 'Shelf C-1', 6],
    ['উচ্চতর গণিত - একাদশ শ্রেণি', 'Higher Math Class 11', 'এনসিটিবি', 'NCTB', '978-984-8700-21-9', 'Mathematics', 'NCTB', '2024', 'Bangla', 450, 'Shelf C-1', 4],
    ['Fundamentals of Mathematics', 'Fundamentals of Mathematics', 'সেলিনা কনসেপশন', 'Selina Concepcion', '978-984-8700-22-6', 'Mathematics', 'Pearson', '3rd', 'English', 520, 'Shelf C-2', 2],
    ['Geometry Essentials', 'Geometry Essentials', 'আর.ডি. শর্মা', 'R.D. Sharma', '978-984-8700-23-3', 'Mathematics', 'Dhanpat Rai', '5th', 'English', 380, 'Shelf C-2', 2],
    ['অঙ্ক ভাবনা', 'Math Thinking', 'মুহাম্মদ জাফর ইকবাল', 'Muhammad Zafar Iqbal', '978-984-8700-24-0', 'Mathematics', 'কাকলী প্রকাশনী', '4th', 'Bangla', 180, 'Shelf C-3', 3],

    // History (5)
    ['বাংলাদেশ ও বিশ্বপরিচয়', 'Bangladesh & World', 'এনসিটিবি', 'NCTB', '978-984-8700-30-1', 'History', 'NCTB', '2024', 'Bangla', 250, 'Shelf D-1', 5],
    ['বাংলাদেশের ইতিহাস ও বিশ্বসভ্যতা', 'History of Bangladesh', 'এনসিটিবি', 'NCTB', '978-984-8700-31-8', 'History', 'NCTB', '2024', 'Bangla', 290, 'Shelf D-1', 4],
    ['অসমাপ্ত আত্মজীবনী', 'The Unfinished Memoirs', 'শেখ মুজিবুর রহমান', 'Sheikh Mujibur Rahman', '978-984-8700-32-5', 'History', 'ইউপিএল', '5th', 'Bangla', 330, 'Shelf D-2', 3],
    ['Sapiens: A Brief History', 'Sapiens', 'ইউভাল নোয়া হারারি', 'Yuval Noah Harari', '978-0-06-231609-7', 'History', 'Harper Collins', '1st', 'English', 498, 'Shelf D-2', 2],
    ['মুক্তিযুদ্ধের ইতিহাস', 'History of Liberation War', 'এম.আর. আখতার মুকুল', 'M.R. Akhtar Mukul', '978-984-8700-34-9', 'History', 'বাংলা একাডেমি', '3rd', 'Bangla', 280, 'Shelf D-3', 2],

    // Religion (4)
    ['ইসলাম শিক্ষা - নবম-দশম শ্রেণি', 'Islam Studies 9-10', 'এনসিটিবি', 'NCTB', '978-984-8700-40-0', 'Religion', 'NCTB', '2024', 'Bangla', 200, 'Shelf E-1', 5],
    ['হিন্দুধর্ম শিক্ষা', 'Hindu Studies', 'এনসিটিবি', 'NCTB', '978-984-8700-41-7', 'Religion', 'NCTB', '2024', 'Bangla', 180, 'Shelf E-1', 3],
    ['The Holy Quran Translation', 'Quran Translation', 'আব্দুল্লাহ ইউসুফ আলী', 'Abdullah Yusuf Ali', '978-984-8700-42-4', 'Religion', 'Islamic Foundation', '1st', 'English', 600, 'Shelf E-2', 2],
    ['নৈতিক শিক্ষা', 'Moral Education', 'এনসিটিবি', 'NCTB', '978-984-8700-43-1', 'Religion', 'NCTB', '2024', 'Bangla', 150, 'Shelf E-2', 4],

    // Geography (3)
    ['ভূগোল ও পরিবেশ', 'Geography & Environment', 'এনসিটিবি', 'NCTB', '978-984-8700-50-9', 'Geography', 'NCTB', '2024', 'Bangla', 260, 'Shelf F-1', 4],
    ['National Geographic Atlas', 'Nat Geo Atlas', 'ন্যাশনাল জিওগ্রাফিক', 'National Geographic', '978-1-4262-1593-0', 'Geography', 'Nat Geographic', '11th', 'English', 400, 'Shelf F-1', 1],
    ['বাংলাদেশের মানচিত্র', 'Maps of Bangladesh', 'সার্ভে অব বাংলাদেশ', 'Survey of Bangladesh', '978-984-8700-52-3', 'Geography', 'সার্ভে অব বাংলাদেশ', '2nd', 'Bangla', 120, 'Shelf F-2', 2],

    // Language (4)
    ['বাংলা ব্যাকরণ ও নির্মিতি', 'Bangla Grammar', 'এনসিটিবি', 'NCTB', '978-984-8700-60-8', 'Language', 'NCTB', '2024', 'Bangla', 320, 'Shelf G-1', 5],
    ['English Grammar & Composition', 'English Grammar', 'ওয়ারেন & মারখামের', 'Wren & Martin', '978-984-8700-61-5', 'Language', 'S. Chand', '2nd', 'English', 380, 'Shelf G-1', 3],
    ['Oxford Advanced Learner Dictionary', 'Oxford Dictionary', 'অক্সফোর্ড', 'Oxford', '978-0-19-479879-5', 'Language', 'OUP', '10th', 'English', 1800, 'Shelf G-2', 2],
    ['বাংলা অভিধান', 'Bangla Dictionary', 'বাংলা একাডেমি', 'Bangla Academy', '978-984-8700-63-9', 'Language', 'বাংলা একাডেমি', '4th', 'Bangla', 1500, 'Shelf G-2', 2],

    // Children / Reference (4)
    ['রাখাল ছেলে', 'Rakhal Chhele', 'সুকুমার রায়', 'Sukumar Ray', '978-984-8700-70-7', 'Children', 'দে\'জ পাবলিশিং', '8th', 'Bangla', 80, 'Shelf H-1', 3],
    ['আবোল তাবোল', 'Abol Tabol', 'সুকুমার রায়', 'Sukumar Ray', '978-984-8700-71-4', 'Children', 'দে\'জ পাবলিশিং', '15th', 'Bangla', 96, 'Shelf H-1', 4],
    ['বিজ্ঞানী সমগ্র', 'Scientists Collection', 'আবদুল্লাহ আল মুতী শরফুদ্দিন', 'Abdullah Al-Muti', '978-984-8700-72-1', 'Reference', 'মুক্তধারা', '3rd', 'Bangla', 350, 'Shelf H-2', 2],
    ['Encyclopedia Britannica', 'Encyclopedia Britannica', 'এনসাইক্লোপিডিয়া ব্রিটানিকা', 'Britannica Inc.', '978-1-59339-292-5', 'Reference', 'Britannica', '15th', 'English', 2000, 'Shelf H-2', 1],

    // Technology (3)
    ['তথ্য ও যোগাযোগ প্রযুক্তি', 'ICT Studies', 'এনসিটিবি', 'NCTB', '978-984-8700-80-6', 'Technology', 'NCTB', '2024', 'Bangla', 220, 'Shelf I-1', 5],
    ['Introduction to Programming', 'Intro to Programming', 'তামিম শাহরিয়ার সুবীন', 'Tamim Shahriar Subeen', '978-984-8700-81-3', 'Technology', 'দ্বিমিক প্রকাশনী', '2nd', 'Bangla', 200, 'Shelf I-1', 3],
    ['Clean Code', 'Clean Code', 'রবার্ট সি. মার্টিন', 'Robert C. Martin', '978-0-13-235088-4', 'Technology', 'Prentice Hall', '1st', 'English', 464, 'Shelf I-2', 1],
];

$bookIds = [];
$stmt = $pdo->prepare("INSERT INTO books (institution_id, title, title_bn, author, author_bn, isbn, category, publisher, edition, language, pages, shelf_location, total_copies, available_copies, added_by, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)");

foreach ($books as $b) {
    [$titleBn, $title, $authorBn, $author, $isbn, $category, $publisher, $edition, $lang, $pages, $shelf, $copies] = $b;
    $stmt->execute([$institutionId, $title, $titleBn, $author, $authorBn, $isbn, $category, $publisher, $edition, $lang, $pages, $shelf, $copies, $copies, $librarianId, $now, $now]);
    $bookIds[] = $pdo->lastInsertId();
}
echo "  Seeded " . count($bookIds) . " books.\n";

// ============================================================
// 4. SEED BOOK ISSUES (25 issues — mix of issued, returned, overdue)
// ============================================================

if (!empty($studentRows)) {
    echo "Seeding book issues...\n";

    $issueCount = 0;

    // 10 returned books (past issues)
    for ($i = 0; $i < 10; $i++) {
        $bookIdx = $i % count($bookIds);
        $bookId = $bookIds[$bookIdx];
        $studentId = $studentRows[$i % count($studentRows)];
        $issueDate = date('Y-m-d', strtotime("-" . (30 + $i * 3) . " days"));
        $dueDate = date('Y-m-d', strtotime($issueDate . " +14 days"));
        $returnDate = date('Y-m-d', strtotime($dueDate . " -" . rand(0, 5) . " days"));
        $fine = 0;
        $finePaid = 0;

        // Some returns are late with fines
        if ($i % 3 === 0) {
            $returnDate = date('Y-m-d', strtotime($dueDate . " +" . rand(1, 7) . " days"));
            $daysLate = (strtotime($returnDate) - strtotime($dueDate)) / 86400;
            $fine = $daysLate * 5;
            $finePaid = 1;
        }

        $pdo->prepare("INSERT INTO book_issues (institution_id, book_id, student_id, issued_by, returned_to, issue_date, due_date, return_date, fine_amount, fine_paid, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'returned', ?, ?)")
            ->execute([$institutionId, $bookId, $studentId, $librarianId, $librarianId, $issueDate, $dueDate, $returnDate, $fine, $finePaid, $now, $now]);
        $issueCount++;
    }

    // 10 currently issued books (some will be overdue)
    for ($i = 0; $i < 10; $i++) {
        $bookIdx = ($i + 10) % count($bookIds);
        $bookId = $bookIds[$bookIdx];
        $studentId = $studentRows[($i + 10) % count($studentRows)];

        if ($i < 4) {
            // Overdue — issued 20-35 days ago with 14-day due
            $daysAgo = 20 + $i * 5;
            $issueDate = date('Y-m-d', strtotime("-$daysAgo days"));
            $dueDate = date('Y-m-d', strtotime($issueDate . " +14 days"));
        } else {
            // Active — issued recently
            $daysAgo = rand(1, 10);
            $issueDate = date('Y-m-d', strtotime("-$daysAgo days"));
            $dueDate = date('Y-m-d', strtotime($issueDate . " +14 days"));
        }

        $pdo->prepare("INSERT INTO book_issues (institution_id, book_id, student_id, issued_by, issue_date, due_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'issued', ?, ?)")
            ->execute([$institutionId, $bookId, $studentId, $librarianId, $issueDate, $dueDate, $now, $now]);
        $issueCount++;

        // Decrease available_copies for this book
        $pdo->exec("UPDATE books SET available_copies = GREATEST(0, available_copies - 1) WHERE id = $bookId");
    }

    // 5 more returned books from longer ago
    for ($i = 0; $i < 5; $i++) {
        $bookIdx = ($i + 20) % count($bookIds);
        $bookId = $bookIds[$bookIdx];
        $studentId = $studentRows[($i + 20) % count($studentRows)];
        $issueDate = date('Y-m-d', strtotime("-" . (60 + $i * 10) . " days"));
        $dueDate = date('Y-m-d', strtotime($issueDate . " +14 days"));
        $returnDate = date('Y-m-d', strtotime($dueDate . " -" . rand(1, 7) . " days"));

        $pdo->prepare("INSERT INTO book_issues (institution_id, book_id, student_id, issued_by, returned_to, issue_date, due_date, return_date, fine_amount, fine_paid, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'returned', ?, ?)")
            ->execute([$institutionId, $bookId, $studentId, $librarianId, $librarianId, $issueDate, $dueDate, $returnDate, $now, $now]);
        $issueCount++;
    }

    echo "  Seeded $issueCount book issues.\n";
} else {
    echo "  Skipped book issues (no students).\n";
}

// ============================================================
// 5. SEED EBOOKS (15 digital resources)
// ============================================================

echo "Seeding e-library resources...\n";

$ebooks = [
    // PDF resources
    ['NCTB Physics PDF - Class 9-10', 'এনসিটিবি পদার্থবিজ্ঞান পিডিএফ ৯-১০', 'NCTB', 'এনসিটিবি', 'Science', 'Official NCTB physics textbook in digital format', 'pdf', 'https://nctb.gov.bd/textbook/physics-9-10.pdf', 1],
    ['NCTB Mathematics PDF - Class 9-10', 'এনসিটিবি গণিত পিডিএফ ৯-১০', 'NCTB', 'এনসিটিবি', 'Mathematics', 'Official NCTB mathematics textbook in digital format', 'pdf', 'https://nctb.gov.bd/textbook/math-9-10.pdf', 1],
    ['Bangla Grammar Guide PDF', 'বাংলা ব্যাকরণ গাইড পিডিএফ', 'Bangla Academy', 'বাংলা একাডেমি', 'Language', 'Comprehensive Bangla grammar reference', 'pdf', 'https://banglaacademy.gov.bd/grammar-guide.pdf', 1],
    ['Bangladesh Liberation War Documents', 'মুক্তিযুদ্ধের দলিলপত্র', 'Ministry of Education', 'শিক্ষা মন্ত্রণালয়', 'History', 'Historical documents from 1971', 'pdf', 'https://liberation-museum.gov.bd/documents.pdf', 1],

    // YouTube videos
    ['Khan Academy - Algebra Basics', 'খান অ্যাকাডেমি - বীজগণিত', 'Khan Academy', 'খান অ্যাকাডেমি', 'Mathematics', 'Introduction to algebraic concepts', 'youtube', 'https://www.youtube.com/watch?v=NybHckSEQBI', 1],
    ['Physics Experiments Demo', 'পদার্থবিজ্ঞান পরীক্ষা', '10 Minute School', '১০ মিনিট স্কুল', 'Science', 'Practical physics experiments for students', 'youtube', 'https://www.youtube.com/watch?v=example1', 1],
    ['Bangla Literature Analysis', 'বাংলা সাহিত্য বিশ্লেষণ', 'Bangla Academy', 'বাংলা একাডেমি', 'Literature', 'Video lectures on classic Bengali literature', 'youtube', 'https://www.youtube.com/watch?v=example2', 1],
    ['English Speaking Practice', 'ইংরেজি কথোপকথন অনুশীলন', 'BBC Learning English', 'বিবিসি লার্নিং ইংলিশ', 'Language', 'Daily English conversation practice', 'youtube', 'https://www.youtube.com/watch?v=example3', 1],

    // Websites
    ['Bangladesh National Curriculum', 'জাতীয় শিক্ষাক্রম', 'NCTB', 'এনসিটিবি', 'Reference', 'Official national curriculum and textbook board', 'website', 'https://nctb.gov.bd', 1],
    ['e-Pathshala Learning Portal', 'ই-পাঠশালা', 'Ministry of Education', 'শিক্ষা মন্ত্রণালয়', 'Reference', 'Government digital learning platform', 'website', 'https://epathshala.gov.bd', 1],
    ['Project Gutenberg - Free Books', 'প্রজেক্ট গুটেনবার্গ', 'Project Gutenberg', 'প্রজেক্ট গুটেনবার্গ', 'Literature', 'Free classic e-books library', 'website', 'https://www.gutenberg.org', 1],

    // Google Drive
    ['Science Lab Manual Collection', 'বিজ্ঞান ল্যাব ম্যানুয়াল', 'Science Dept', 'বিজ্ঞান বিভাগ', 'Science', 'Lab manuals for all science practical classes', 'google_drive', 'https://drive.google.com/drive/folders/example1', 1],
    ['Past Exam Papers Archive', 'বিগত বছরের পরীক্ষার প্রশ্ন', 'School Admin', 'স্কুল প্রশাসন', 'Reference', 'Collection of past exam papers', 'google_drive', 'https://drive.google.com/drive/folders/example2', 1],

    // Documents
    ['Student Handbook 2024', 'ছাত্র হ্যান্ডবুক ২০২৪', 'School Admin', 'স্কুল প্রশাসন', 'Reference', 'Student rules and guidelines', 'document', 'https://school-docs.example.com/handbook-2024.docx', 1],
    ['Creative Writing Guidelines', 'সৃজনশীল লেখার নির্দেশিকা', 'Bangla Dept', 'বাংলা বিভাগ', 'Language', 'Guidelines for creative writing assignments', 'document', 'https://school-docs.example.com/creative-writing.docx', 1],
];

$ebookStmt = $pdo->prepare("INSERT INTO ebooks (institution_id, title, title_bn, author, author_bn, category, description, type, link, is_public, download_count, added_by, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)");

foreach ($ebooks as $eb) {
    [$title, $titleBn, $author, $authorBn, $category, $desc, $type, $link, $isPublic] = $eb;
    $downloads = rand(0, 50);
    $ebookStmt->execute([$institutionId, $title, $titleBn, $author, $authorBn, $category, $desc, $type, $link, $isPublic, $downloads, $librarianId, $now, $now]);
}

echo "  Seeded " . count($ebooks) . " e-library resources.\n";

// ============================================================
// 6. ADD LIBRARIAN PERMISSIONS
// ============================================================

echo "Adding librarian permissions...\n";

$newPerms = [
    'library.books.view', 'library.books.create', 'library.books.edit', 'library.books.delete',
    'library.issues.view', 'library.issues.create', 'library.issues.return',
    'library.ebooks.view', 'library.ebooks.create', 'library.ebooks.edit', 'library.ebooks.delete',
    'library.students.view',
];

foreach ($newPerms as $perm) {
    $exists = $pdo->prepare("SELECT COUNT(*) FROM permissions WHERE name = ?");
    $exists->execute([$perm]);
    if ($exists->fetchColumn() == 0) {
        $pdo->prepare("INSERT INTO permissions (name, guard_name, created_at, updated_at) VALUES (?, 'web', ?, ?)")
            ->execute([$perm, $now, $now]);
    }
}

// Assign permissions to librarian role
$libRole = $pdo->prepare("SELECT id FROM roles WHERE name = 'librarian'");
$libRole->execute();
$roleRow = $libRole->fetch(PDO::FETCH_ASSOC);
if ($roleRow) {
    $roleId = $roleRow['id'];
    foreach ($newPerms as $perm) {
        $permId = $pdo->query("SELECT id FROM permissions WHERE name = '$perm'")->fetchColumn();
        if ($permId) {
            $exists = $pdo->prepare("SELECT COUNT(*) FROM role_has_permissions WHERE role_id = ? AND permission_id = ?");
            $exists->execute([$roleId, $permId]);
            if ($exists->fetchColumn() == 0) {
                $pdo->prepare("INSERT INTO role_has_permissions (role_id, permission_id) VALUES (?, ?)")
                    ->execute([$roleId, $permId]);
            }
        }
    }
    echo "  Permissions assigned to librarian role.\n";
}

echo "\n=== Library seed complete! ===\n";
echo "  Books: " . count($bookIds) . "\n";
echo "  E-Books: " . count($ebooks) . "\n";
echo "  Login: morium.librarian@school.edu.bd / password\n";
