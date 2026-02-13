<?php
/**
 * Seed 5 unique schools with FULL functionality:
 *   - Admin user (email/password)
 *   - Academic sessions, shifts, classes 1-12, sections, subjects
 *   - Students (20 per school), guardians, enrollments
 *   - Teachers (employees), teacher assignments
 *   - Attendance (30 days), grade rules
 *   - Exam terms, exam routines, marks, results
 *   - Fee heads, fee structures, invoices, payments
 *   - Notices, landing page configs
 *
 * Run: php seed_schools.php
 * Requires: MySQL running, seed_admin.php and setup_multitenant.php already run.
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
    echo "ERROR: Could not connect. Run seed_admin.php first.\n" . $e->getMessage() . "\n";
    exit(1);
}

$now = date('Y-m-d H:i:s');
$passwordHash = password_hash('password', PASSWORD_BCRYPT);

// Ensure admin role exists
$pdo->exec("INSERT IGNORE INTO roles (id, name, label, guard_name, created_at, updated_at) VALUES
(1, 'admin', 'Admin', 'web', '$now', '$now'),
(2, 'super_admin', 'Super Admin', 'web', '$now', '$now')");

// ════════════════════════════════════════════════════════════════════
// Define 5 unique schools
// ════════════════════════════════════════════════════════════════════
$schools = [
    [
        'name'    => 'Dhaka Ideal High School',
        'name_bn' => 'ঢাকা আদর্শ উচ্চ বিদ্যালয়',
        'eiin'    => '108234',
        'address' => '12/A Dhanmondi, Dhaka-1209',
        'phone'   => '+8801712345001',
        'email'   => 'info@dhakaideal.edu.bd',
        'subdomain' => 'dhaka-ideal',
        'admin_email' => 'admin@dhakaideal.edu.bd',
        'admin_name'  => 'Md. Hasanuzzaman',
        'admin_name_bn' => 'মোঃ হাসানুজ্জামান',
        'subjects' => [
            ['Bangla', 'বাংলা', 'BAN'], ['English', 'ইংরেজি', 'ENG'], ['Mathematics', 'গণিত', 'MATH'],
            ['Science', 'বিজ্ঞান', 'SCI'], ['Bangladesh & Global Studies', 'বাংলাদেশ ও বিশ্ব পরিচয়', 'BGS'],
            ['ICT', 'তথ্য ও যোগাযোগ প্রযুক্তি', 'ICT'], ['Religious Studies', 'ধর্ম শিক্ষা', 'REL'],
        ],
        'teachers' => [
            ['Shamsul Haq', 'শামসুল হক', 'Senior Teacher', 'Academic'],
            ['Rahima Khatun', 'রাহিমা খাতুন', 'Assistant Teacher', 'Academic'],
            ['Abul Kalam', 'আবুল কালাম', 'Teacher', 'Science'],
            ['Nasima Akter', 'নাসিমা আক্তার', 'Teacher', 'Arts'],
            ['Kamal Uddin', 'কামাল উদ্দিন', 'Head Teacher', 'Academic'],
        ],
        'students' => [
            ['Tamim Iqbal', 'তামিম ইকবাল', 'male'], ['Sumaiya Rahman', 'সুমাইয়া রহমান', 'female'],
            ['Ariful Islam', 'আরিফুল ইসলাম', 'male'], ['Fatema Tuz Zohra', 'ফাতেমা তুজ জোহরা', 'female'],
            ['Rayhan Ahmed', 'রায়হান আহমেদ', 'male'], ['Nusrat Jahan', 'নুসরাত জাহান', 'female'],
            ['Imran Khan', 'ইমরান খান', 'male'], ['Tasfia Binte Aziz', 'তাসফিয়া বিনতে আজিজ', 'female'],
            ['Samiul Haq', 'সামিউল হক', 'male'], ['Rifa Tasnim', 'রিফা তাসনিম', 'female'],
            ['Shanto Das', 'শান্ত দাস', 'male'], ['Mithila Rani', 'মিথিলা রানী', 'female'],
            ['Jubayer Islam', 'জুবায়ের ইসলাম', 'male'], ['Sharmin Sultana', 'শারমিন সুলতানা', 'female'],
            ['Sabbir Hossain', 'সাব্বির হোসাইন', 'male'], ['Afrina Ferdous', 'আফরিনা ফেরদৌস', 'female'],
            ['Nahid Hasan', 'নাহিদ হাসান', 'male'], ['Jannatul Ferdous', 'জান্নাতুল ফেরদৌস', 'female'],
            ['Mahfuz Ahmed', 'মাহফুজ আহমেদ', 'male'], ['Tahmina Akter', 'তাহমিনা আক্তার', 'female'],
        ],
        'guardians' => [
            ['Iqbal Hossain', 'father', '+8801711100001'], ['Sufia Begum', 'mother', '+8801711100002'],
            ['Arifur Rahman', 'father', '+8801711100003'], ['Nur Jahan', 'mother', '+8801711100004'],
            ['Rayhan Miah', 'father', '+8801711100005'], ['Nusrat Ara', 'mother', '+8801711100006'],
            ['Anwar Khan', 'father', '+8801711100007'], ['Aziza Begum', 'mother', '+8801711100008'],
            ['Samiur Rahman', 'father', '+8801711100009'], ['Tasnim Ara', 'mother', '+8801711100010'],
        ],
        'notices' => [
            ['Annual Prize Giving 2026', 'বার্ষিক পুরস্কার বিতরণী ২০২৬', 'Annual prize giving ceremony will be held on 25 March 2026.'],
            ['Admission Open for 2026', 'ভর্তি চলছে ২০২৬', 'Admission for new session 2026 is now open. Contact office for details.'],
            ['Monthly Parent Meeting', 'মাসিক অভিভাবক সভা', 'Monthly parent-teacher meeting on last Saturday of every month at 10 AM.'],
        ],
        'hero_title' => 'Dhaka Ideal High School',
        'hero_title_bn' => 'ঢাকা আদর্শ উচ্চ বিদ্যালয়',
        'hero_subtitle' => 'Building leaders of tomorrow with quality education since 1985.',
    ],
    [
        'name'    => 'Chittagong Model Academy',
        'name_bn' => 'চট্টগ্রাম মডেল একাডেমি',
        'eiin'    => '201456',
        'address' => '45 Agrabad C/A, Chittagong-4100',
        'phone'   => '+8801812345002',
        'email'   => 'info@ctgmodel.edu.bd',
        'subdomain' => 'ctg-model',
        'admin_email' => 'admin@ctgmodel.edu.bd',
        'admin_name'  => 'Aminul Haque Chowdhury',
        'admin_name_bn' => 'আমিনুল হক চৌধুরী',
        'subjects' => [
            ['Bangla', 'বাংলা', 'BAN'], ['English', 'ইংরেজি', 'ENG'], ['Mathematics', 'গণিত', 'MATH'],
            ['General Science', 'সাধারণ বিজ্ঞান', 'GS'], ['Social Science', 'সমাজ বিজ্ঞান', 'SS'],
            ['Physical Education', 'শারীরিক শিক্ষা', 'PE'], ['Art & Craft', 'চারু ও কারুকলা', 'ART'],
        ],
        'teachers' => [
            ['Golam Mostafa', 'গোলাম মোস্তফা', 'Principal', 'Administration'],
            ['Jahanara Imam', 'জাহানারা ইমাম', 'Senior Teacher', 'Academic'],
            ['Mizanur Rahman', 'মিজানুর রহমান', 'Teacher', 'Science'],
            ['Farzana Yasmin', 'ফারজানা ইয়াসমিন', 'Teacher', 'Language'],
            ['Tariqul Islam', 'তারিকুল ইসলাম', 'Teacher', 'Mathematics'],
        ],
        'students' => [
            ['Akash Chowdhury', 'আকাশ চৌধুরী', 'male'], ['Priya Sen', 'প্রিয়া সেন', 'female'],
            ['Ridwan Chowdhury', 'রিদওয়ান চৌধুরী', 'male'], ['Sadia Afrin', 'সাদিয়া আফরিন', 'female'],
            ['Tanvir Ahmed', 'তানভীর আহমেদ', 'male'], ['Mehnaz Hossain', 'মেহনাজ হোসাইন', 'female'],
            ['Asif Mahmud', 'আসিফ মাহমুদ', 'male'], ['Tamanna Nasrin', 'তামান্না নাসরিন', 'female'],
            ['Farhan Kabir', 'ফারহান কবীর', 'male'], ['Laboni Akter', 'লাবণী আক্তার', 'female'],
            ['Shihab Uddin', 'শিহাব উদ্দিন', 'male'], ['Rabeya Khatun', 'রাবেয়া খাতুন', 'female'],
            ['Nazmul Hasan', 'নাজমুল হাসান', 'male'], ['Maliha Rahman', 'মালিহা রহমান', 'female'],
            ['Rubel Miah', 'রুবেল মিয়া', 'male'], ['Shapla Begum', 'শাপলা বেগম', 'female'],
            ['Faisal Khan', 'ফয়সাল খান', 'male'], ['Sumi Akter', 'সুমি আক্তার', 'female'],
            ['Habibur Rahman', 'হাবিবুর রহমান', 'male'], ['Tania Islam', 'তানিয়া ইসলাম', 'female'],
        ],
        'guardians' => [
            ['Akhter Chowdhury', 'father', '+8801822200001'], ['Selina Sen', 'mother', '+8801822200002'],
            ['Rafiq Chowdhury', 'father', '+8801822200003'], ['Rina Afrin', 'mother', '+8801822200004'],
            ['Tanvir Miah', 'father', '+8801822200005'], ['Meher Banu', 'mother', '+8801822200006'],
            ['Mahmud Hasan', 'father', '+8801822200007'], ['Nasrin Begum', 'mother', '+8801822200008'],
            ['Kabir Ahmed', 'father', '+8801822200009'], ['Laboni Begum', 'mother', '+8801822200010'],
        ],
        'notices' => [
            ['Science Fair 2026', 'বিজ্ঞান মেলা ২০২৬', 'Annual Science Fair will be held on 10 February 2026. All students are encouraged to prepare projects.'],
            ['New Uniform Policy', 'নতুন ইউনিফর্ম নীতিমালা', 'New uniform guidelines effective from January 2026. See office for details.'],
            ['Mid-term Exam Notice', 'অর্ধ-বার্ষিক পরীক্ষার নোটিশ', 'Mid-term examinations will start from 15 March 2026.'],
        ],
        'hero_title' => 'Chittagong Model Academy',
        'hero_title_bn' => 'চট্টগ্রাম মডেল একাডেমি',
        'hero_subtitle' => 'Excellence in education, nurturing bright futures in the port city.',
    ],
    [
        'name'    => 'Rajshahi Collegiate School',
        'name_bn' => 'রাজশাহী কলেজিয়েট স্কুল',
        'eiin'    => '305678',
        'address' => 'Saheb Bazar, Rajshahi-6100',
        'phone'   => '+8801912345003',
        'email'   => 'info@rajcollegiate.edu.bd',
        'subdomain' => 'raj-collegiate',
        'admin_email' => 'admin@rajcollegiate.edu.bd',
        'admin_name'  => 'Dr. Shahidul Islam',
        'admin_name_bn' => 'ড. শহীদুল ইসলাম',
        'subjects' => [
            ['Bangla', 'বাংলা', 'BAN'], ['English', 'ইংরেজি', 'ENG'], ['Mathematics', 'গণিত', 'MATH'],
            ['Physics', 'পদার্থবিজ্ঞান', 'PHY'], ['Chemistry', 'রসায়ন', 'CHEM'],
            ['Biology', 'জীববিজ্ঞান', 'BIO'], ['History', 'ইতিহাস', 'HIST'],
        ],
        'teachers' => [
            ['Nurul Islam', 'নুরুল ইসলাম', 'Senior Teacher', 'Science'],
            ['Monira Begum', 'মনিরা বেগম', 'Assistant Teacher', 'Arts'],
            ['Alauddin Khan', 'আলাউদ্দিন খান', 'Teacher', 'Mathematics'],
            ['Saleha Khatun', 'সালেহা খাতুন', 'Senior Teacher', 'Language'],
            ['Mizanur Rashid', 'মিজানুর রশিদ', 'Head Teacher', 'Academic'],
        ],
        'students' => [
            ['Shakib Al Hasan', 'সাকিব আল হাসান', 'male'], ['Eshita Rani', 'ঈশিতা রানী', 'female'],
            ['Mushfiqur Rahim', 'মুশফিকুর রহিম', 'male'], ['Tumpa Sarkar', 'টুম্পা সরকার', 'female'],
            ['Taijul Islam', 'তাইজুল ইসলাম', 'male'], ['Bristy Das', 'বৃষ্টি দাস', 'female'],
            ['Soumya Sarkar', 'সৌম্য সরকার', 'male'], ['Puja Roy', 'পূজা রায়', 'female'],
            ['Liton Das', 'লিটন দাস', 'male'], ['Moushumi Akter', 'মৌসুমী আক্তার', 'female'],
            ['Mehedi Hasan', 'মেহেদী হাসান', 'male'], ['Rima Begum', 'রিমা বেগম', 'female'],
            ['Bijoy Sarkar', 'বিজয় সরকার', 'male'], ['Sharmin Nahar', 'শারমিন নাহার', 'female'],
            ['Sumon Hossain', 'সুমন হোসাইন', 'male'], ['Papiya Rani', 'পাপিয়া রানী', 'female'],
            ['Masud Rana', 'মাসুদ রানা', 'male'], ['Jui Akter', 'জুঁই আক্তার', 'female'],
            ['Rajib Ahmed', 'রাজিব আহমেদ', 'male'], ['Shilpi Rani Das', 'শিল্পী রানী দাস', 'female'],
        ],
        'guardians' => [
            ['Hasan Ali', 'father', '+8801933300001'], ['Kohinoor Begum', 'mother', '+8801933300002'],
            ['Rahim Sarkar', 'father', '+8801933300003'], ['Salma Begum', 'mother', '+8801933300004'],
            ['Taijul Miah', 'father', '+8801933300005'], ['Bristy Rani', 'mother', '+8801933300006'],
            ['Sarkar Ahmed', 'father', '+8801933300007'], ['Puja Devi', 'mother', '+8801933300008'],
            ['Liton Miah', 'father', '+8801933300009'], ['Moushumi Begum', 'mother', '+8801933300010'],
        ],
        'notices' => [
            ['Rajshahi Day Celebration', 'রাজশাহী দিবস উদযাপন', 'Special assembly on Rajshahi Day, 15 January 2026. Cultural program at 3 PM.'],
            ['Winter Vacation', 'শীতকালীন ছুটি', 'Winter vacation from 20 December 2025 to 5 January 2026.'],
            ['Book Fair Visit', 'বই মেলা পরিদর্শন', 'School trip to Rajshahi Book Fair on 8 February 2026. Permission slips required.'],
        ],
        'hero_title' => 'Rajshahi Collegiate School',
        'hero_title_bn' => 'রাজশাহী কলেজিয়েট স্কুল',
        'hero_subtitle' => 'A historic institution of excellence in North Bengal since 1828.',
    ],
    [
        'name'    => 'Sylhet International School',
        'name_bn' => 'সিলেট ইন্টারন্যাশনাল স্কুল',
        'eiin'    => '412890',
        'address' => 'Zindabazar, Sylhet-3100',
        'phone'   => '+8801612345004',
        'email'   => 'info@sylhetintl.edu.bd',
        'subdomain' => 'sylhet-intl',
        'admin_email' => 'admin@sylhetintl.edu.bd',
        'admin_name'  => 'Farid Ahmed Chowdhury',
        'admin_name_bn' => 'ফরিদ আহমেদ চৌধুরী',
        'subjects' => [
            ['Bangla', 'বাংলা', 'BAN'], ['English', 'ইংরেজি', 'ENG'], ['Mathematics', 'গণিত', 'MATH'],
            ['Environmental Science', 'পরিবেশ বিজ্ঞান', 'ENV'], ['Computer Science', 'কম্পিউটার বিজ্ঞান', 'CS'],
            ['Arabic', 'আরবি', 'ARB'], ['Music', 'সংগীত', 'MUS'],
        ],
        'teachers' => [
            ['Moinul Haq', 'মঈনুল হক', 'Principal', 'Administration'],
            ['Safina Begum', 'সাফিনা বেগম', 'Senior Teacher', 'Language'],
            ['Hashem Ali', 'হাশেম আলী', 'Teacher', 'Science'],
            ['Rowshan Ara', 'রওশন আরা', 'Teacher', 'Computer'],
            ['Abdul Latif', 'আব্দুল লতিফ', 'Teacher', 'Arabic'],
        ],
        'students' => [
            ['Yasin Arafat', 'ইয়াসিন আরাফাত', 'male'], ['Maryam Chowdhury', 'মারিয়াম চৌধুরী', 'female'],
            ['Ibrahim Khalil', 'ইব্রাহিম খলিল', 'male'], ['Ayesha Siddiqua', 'আয়েশা সিদ্দিকা', 'female'],
            ['Yusuf Ali', 'ইউসুফ আলী', 'male'], ['Khadija Begum', 'খাদিজা বেগম', 'female'],
            ['Hamza Ahmed', 'হামজা আহমেদ', 'male'], ['Safiya Islam', 'সাফিয়া ইসলাম', 'female'],
            ['Bilal Hossain', 'বেলাল হোসাইন', 'male'], ['Amina Khatun', 'আমিনা খাতুন', 'female'],
            ['Muaz Rahman', 'মুআজ রহমান', 'male'], ['Rabia Akhter', 'রাবিয়া আখতার', 'female'],
            ['Talha Miah', 'তালহা মিয়া', 'male'], ['Samira Chowdhury', 'সামিরা চৌধুরী', 'female'],
            ['Rifat Uddin', 'রিফাত উদ্দিন', 'male'], ['Halima Akter', 'হালিমা আক্তার', 'female'],
            ['Junaid Ahmed', 'জুনাইদ আহমেদ', 'male'], ['Nazia Islam', 'নাজিয়া ইসলাম', 'female'],
            ['Anas Khan', 'আনাস খান', 'male'], ['Tasneem Begum', 'তাসনীম বেগম', 'female'],
        ],
        'guardians' => [
            ['Arafat Miah', 'father', '+8801644400001'], ['Fatima Chowdhury', 'mother', '+8801644400002'],
            ['Khalilur Rahman', 'father', '+8801644400003'], ['Siddiqua Begum', 'mother', '+8801644400004'],
            ['Ali Ahmed', 'father', '+8801644400005'], ['Khadija Akhter', 'mother', '+8801644400006'],
            ['Ahmed Kabir', 'father', '+8801644400007'], ['Safiya Begum', 'mother', '+8801644400008'],
            ['Hossain Ali', 'father', '+8801644400009'], ['Amina Begum', 'mother', '+8801644400010'],
        ],
        'notices' => [
            ['Quran Recitation Competition', 'কুরআন তেলাওয়াত প্রতিযোগিতা', 'Inter-class Quran recitation competition on 20 January 2026 at 9 AM.'],
            ['English Week 2026', 'ইংরেজি সপ্তাহ ২০২৬', 'English Week activities from 3-7 February 2026. Debate, essay, and spelling competitions.'],
            ['Parent Orientation Day', 'অভিভাবক ওরিয়েন্টেশন দিবস', 'New parents orientation on 10 January 2026 at 11 AM in the school auditorium.'],
        ],
        'hero_title' => 'Sylhet International School',
        'hero_title_bn' => 'সিলেট ইন্টারন্যাশনাল স্কুল',
        'hero_subtitle' => 'Where tradition meets modern education in the heart of Sylhet.',
    ],
    [
        'name'    => 'Khulna Public School & College',
        'name_bn' => 'খুলনা পাবলিক স্কুল ও কলেজ',
        'eiin'    => '507123',
        'address' => 'KDA Avenue, Khulna-9100',
        'phone'   => '+8801512345005',
        'email'   => 'info@khulnapublic.edu.bd',
        'subdomain' => 'khulna-public',
        'admin_email' => 'admin@khulnapublic.edu.bd',
        'admin_name'  => 'Prof. Abdur Rahim',
        'admin_name_bn' => 'প্রফেসর আব্দুর রহিম',
        'subjects' => [
            ['Bangla', 'বাংলা', 'BAN'], ['English', 'ইংরেজি', 'ENG'], ['Mathematics', 'গণিত', 'MATH'],
            ['Higher Mathematics', 'উচ্চতর গণিত', 'HMATH'], ['Accounting', 'হিসাববিজ্ঞান', 'ACC'],
            ['Geography', 'ভূগোল', 'GEO'], ['Agriculture', 'কৃষি শিক্ষা', 'AGRI'],
        ],
        'teachers' => [
            ['Shahjalal Miah', 'শাহজালাল মিয়া', 'Vice Principal', 'Academic'],
            ['Beauty Akter', 'বিউটি আক্তার', 'Senior Teacher', 'Academic'],
            ['Moazzem Hossain', 'মোয়াজ্জেম হোসাইন', 'Teacher', 'Science'],
            ['Ruma Khatun', 'রুমা খাতুন', 'Teacher', 'Commerce'],
            ['Jalal Uddin', 'জালাল উদ্দিন', 'Head Teacher', 'Academic'],
        ],
        'students' => [
            ['Shoaib Akhter', 'শোয়াইব আখতার', 'male'], ['Afsana Mimi', 'আফসানা মিমি', 'female'],
            ['Rasel Ahmed', 'রাসেল আহমেদ', 'male'], ['Sonia Akter', 'সনিয়া আক্তার', 'female'],
            ['Belal Uddin', 'বেলাল উদ্দিন', 'male'], ['Shapna Begum', 'স্বপ্না বেগম', 'female'],
            ['Monir Hossain', 'মনির হোসাইন', 'male'], ['Lucky Akter', 'লাকি আক্তার', 'female'],
            ['Alamin Sheikh', 'আলামিন শেখ', 'male'], ['Mina Rani', 'মিনা রানী', 'female'],
            ['Sakib Hasan', 'সাকিব হাসান', 'male'], ['Poly Begum', 'পলি বেগম', 'female'],
            ['Jibon Miah', 'জীবন মিয়া', 'male'], ['Runa Laila', 'রুনা লাইলা', 'female'],
            ['Arif Sheikh', 'আরিফ শেখ', 'male'], ['Swarna Akter', 'স্বর্ণা আক্তার', 'female'],
            ['Touhid Islam', 'তৌহিদ ইসলাম', 'male'], ['Keya Moni', 'কেয়া মণি', 'female'],
            ['Rakib Hasan', 'রাকিব হাসান', 'male'], ['Reshmi Akter', 'রেশমী আক্তার', 'female'],
        ],
        'guardians' => [
            ['Akhter Hossain', 'father', '+8801555500001'], ['Mimi Begum', 'mother', '+8801555500002'],
            ['Rashidul Islam', 'father', '+8801555500003'], ['Sonia Begum', 'mother', '+8801555500004'],
            ['Belal Miah', 'father', '+8801555500005'], ['Shapna Rani', 'mother', '+8801555500006'],
            ['Monir Miah', 'father', '+8801555500007'], ['Lucky Begum', 'mother', '+8801555500008'],
            ['Alamgir Sheikh', 'father', '+8801555500009'], ['Mina Begum', 'mother', '+8801555500010'],
        ],
        'notices' => [
            ['Sundarban Field Trip', 'সুন্দরবন শিক্ষা সফর', 'Educational trip to Sundarban on 25 February 2026. Permission and fee ৳500 required by 15 Feb.'],
            ['Annual Sports Week', 'বার্ষিক ক্রীড়া সপ্তাহ', 'Annual sports week from 10-14 March 2026. All students must participate in at least one event.'],
            ['Free Textbook Distribution', 'বিনামূল্যে পাঠ্যপুস্তক বিতরণ', 'Free government textbooks will be distributed on 2 January 2026.'],
        ],
        'hero_title' => 'Khulna Public School & College',
        'hero_title_bn' => 'খুলনা পাবলিক স্কুল ও কলেজ',
        'hero_subtitle' => 'Shaping futures in the industrial capital of Bangladesh.',
    ],
];

echo "═══════════════════════════════════════════\n";
echo "  Seeding 5 Schools with Full Data\n";
echo "═══════════════════════════════════════════\n\n";

$adminRoleId = (int) $pdo->query("SELECT id FROM roles WHERE name = 'admin'")->fetchColumn();

foreach ($schools as $schoolIdx => $school) {
    $schoolNum = $schoolIdx + 1;
    echo "[$schoolNum/5] {$school['name']}...\n";

    // ─── 1. Institution ───
    $stmt = $pdo->prepare("INSERT INTO institutions (name, name_bn, eiin, address, phone, email, subdomain, subscription_status, feature_flags, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, 1, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name)");
    $featureFlags = json_encode(['fees' => true, 'attendance' => true, 'exams' => true, 'notices' => true, 'landing_page' => true]);
    $stmt->execute([$school['name'], $school['name_bn'], $school['eiin'], $school['address'], $school['phone'], $school['email'], $school['subdomain'], $featureFlags, $now, $now]);
    $instId = (int) $pdo->query("SELECT id FROM institutions WHERE eiin = '{$school['eiin']}'")->fetchColumn();
    echo "  Institution ID: $instId\n";

    // ─── 2. Admin user ───
    $stmt = $pdo->prepare("INSERT INTO users (institution_id, name, name_bn, email, password, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        ON DUPLICATE KEY UPDATE password = VALUES(password), institution_id = VALUES(institution_id)");
    $stmt->execute([$instId, $school['admin_name'], $school['admin_name_bn'], $school['admin_email'], $passwordHash, $now, $now]);
    $adminUserId = (int) $pdo->query("SELECT id FROM users WHERE email = '" . addslashes($school['admin_email']) . "'")->fetchColumn();
    $pdo->exec("INSERT IGNORE INTO model_has_roles (role_id, model_type, model_id) VALUES ($adminRoleId, 'App\\\\Models\\\\User', $adminUserId)");
    echo "  Admin: {$school['admin_email']}\n";

    // ─── 3. Academic sessions ───
    $pdo->exec("INSERT IGNORE INTO academic_sessions (institution_id, name, start_date, end_date, is_current, created_at, updated_at) VALUES
        ($instId, '2024-2025', '2024-01-01', '2025-12-31', 0, '$now', '$now'),
        ($instId, '2025-2026', '2025-01-01', '2026-12-31', 1, '$now', '$now')");
    $currentSessionId = (int) $pdo->query("SELECT id FROM academic_sessions WHERE institution_id = $instId AND is_current = 1")->fetchColumn();

    // ─── 4. Shifts ───
    $pdo->exec("INSERT IGNORE INTO shifts (institution_id, name, start_time, end_time, created_at, updated_at) VALUES
        ($instId, 'Morning', '07:30:00', '12:30:00', '$now', '$now'),
        ($instId, 'Day', '13:00:00', '17:30:00', '$now', '$now')");
    $shiftIds = $pdo->query("SELECT id FROM shifts WHERE institution_id = $instId ORDER BY id")->fetchAll(PDO::FETCH_COLUMN);

    // ─── 5. Classes 1-12 ───
    for ($i = 1; $i <= 12; $i++) {
        $grp = $i >= 9 ? ($i % 3 === 0 ? 'Science' : ($i % 3 === 1 ? 'Arts' : 'Commerce')) : null;
        $grpSql = $grp ? "'$grp'" : 'NULL';
        $pdo->exec("INSERT IGNORE INTO classes (institution_id, name, numeric_order, `group`, created_at, updated_at)
            VALUES ($instId, '$i', $i, $grpSql, '$now', '$now')");
    }
    $classIds = $pdo->query("SELECT id FROM classes WHERE institution_id = $instId ORDER BY numeric_order")->fetchAll(PDO::FETCH_COLUMN);

    // ─── 6. Sections (A, B for classes 1-5) ───
    $sectionIds = [];
    foreach (array_slice($classIds, 0, 5) as $ci => $classId) {
        foreach (['A', 'B'] as $si => $secName) {
            $shiftId = $shiftIds[$si % count($shiftIds)] ?? $shiftIds[0];
            $pdo->exec("INSERT IGNORE INTO sections (class_id, shift_id, name, capacity, created_at, updated_at)
                VALUES ($classId, $shiftId, '$secName', 40, '$now', '$now')");
        }
    }
    $sectionIds = $pdo->query("SELECT s.id FROM sections s INNER JOIN classes c ON s.class_id = c.id WHERE c.institution_id = $instId ORDER BY c.numeric_order, s.name")->fetchAll(PDO::FETCH_COLUMN);

    // ─── 7. Subjects ───
    $subjectIds = [];
    foreach ($school['subjects'] as $sub) {
        $n = addslashes($sub[0]); $nb = addslashes($sub[1]); $code = $sub[2];
        $pdo->exec("INSERT IGNORE INTO subjects (institution_id, name, name_bn, code, is_optional, created_at, updated_at)
            VALUES ($instId, '$n', '$nb', '$code', 0, '$now', '$now')");
        $subjectIds[] = (int) $pdo->query("SELECT id FROM subjects WHERE institution_id = $instId AND code = '$code'")->fetchColumn();
    }

    // ─── 8. Class-subjects (first 5 classes × all subjects) ───
    foreach (array_slice($classIds, 0, 5) as $classId) {
        foreach ($subjectIds as $subId) {
            $pdo->exec("INSERT IGNORE INTO class_subjects (class_id, subject_id, full_marks, pass_marks, weight, is_optional, created_at, updated_at)
                VALUES ($classId, $subId, 100, 33, 1, 0, '$now', '$now')");
        }
    }

    // ─── 9. Guardians ───
    $guardianIds = [];
    foreach ($school['guardians'] as $g) {
        $gName = addslashes($g[0]);
        $pdo->exec("INSERT IGNORE INTO guardians (institution_id, name, relation, phone, is_primary, created_at, updated_at)
            VALUES ($instId, '$gName', '{$g[1]}', '{$g[2]}', 1, '$now', '$now')");
        $guardianIds[] = (int) $pdo->lastInsertId() ?: (int) $pdo->query("SELECT id FROM guardians WHERE institution_id = $instId AND phone = '{$g[2]}'")->fetchColumn();
    }

    // ─── 10. Students ───
    $studentIds = [];
    foreach ($school['students'] as $si => $st) {
        $sname = addslashes($st[0]); $snameBn = addslashes($st[1]);
        $sid = sprintf('STU-%s-%05d', $school['eiin'], $si + 1);
        $dob = date('Y-m-d', strtotime('-' . (7 + ($si % 5)) . ' years'));
        $pdo->exec("INSERT IGNORE INTO students (institution_id, student_id, name, name_bn, date_of_birth, gender, status, admission_date, created_at, updated_at)
            VALUES ($instId, '$sid', '$sname', '$snameBn', '$dob', '{$st[2]}', 'active', '2025-01-01', '$now', '$now')");
        $studentIds[] = (int) $pdo->query("SELECT id FROM students WHERE institution_id = $instId AND student_id = '$sid'")->fetchColumn();
    }

    // Student-guardian links (pair every 2 students with 1 guardian)
    foreach ($studentIds as $si => $stId) {
        $gi = intdiv($si, 2); // pair every 2 students to a guardian
        if (isset($guardianIds[$gi]) && $stId > 0) {
            $pdo->exec("INSERT IGNORE INTO student_guardians (student_id, guardian_id, is_primary, created_at, updated_at)
                VALUES ($stId, {$guardianIds[$gi]}, 1, '$now', '$now')");
        }
    }

    // ─── 11. Enrollments (distribute 20 students across first 4 sections, 5 each) ───
    $enrollmentIds = [];
    foreach ($studentIds as $si => $stId) {
        if ($stId <= 0) continue;
        $secIdx = intdiv($si, 5) % count($sectionIds);
        $secId = $sectionIds[$secIdx];
        $roll = ($si % 5) + 1;
        $pdo->exec("INSERT IGNORE INTO student_enrollments (student_id, section_id, academic_session_id, roll_no, created_at, updated_at)
            VALUES ($stId, $secId, $currentSessionId, $roll, '$now', '$now')");
        $enId = (int) $pdo->query("SELECT id FROM student_enrollments WHERE student_id = $stId AND academic_session_id = $currentSessionId")->fetchColumn();
        if ($enId) $enrollmentIds[] = $enId;
    }

    // ─── 12. Employees / Teachers ───
    $employeeIds = [];
    foreach ($school['teachers'] as $ti => $t) {
        $tname = addslashes($t[0]); $tnameBn = addslashes($t[1]);
        $empCode = sprintf('EMP-%s-%03d', $school['eiin'], $ti + 1);
        $pdo->exec("INSERT IGNORE INTO employees (institution_id, employee_id, name, name_bn, designation, department, is_teacher, is_active, created_at, updated_at)
            VALUES ($instId, '$empCode', '$tname', '$tnameBn', '{$t[2]}', '{$t[3]}', 1, 1, '$now', '$now')");
        $employeeIds[] = (int) $pdo->query("SELECT id FROM employees WHERE institution_id = $instId AND employee_id = '$empCode'")->fetchColumn();
    }

    // Teacher assignments (distribute across first few sections and subjects)
    foreach ($employeeIds as $ei => $empId) {
        if ($empId <= 0 || !isset($sectionIds[$ei % count($sectionIds)])) continue;
        $secId = $sectionIds[$ei % count($sectionIds)];
        $subId = $subjectIds[$ei % count($subjectIds)];
        $isClassTeacher = ($ei === 0) ? 1 : 0;
        $pdo->exec("INSERT IGNORE INTO teacher_assignments (employee_id, section_id, subject_id, academic_session_id, is_class_teacher, created_at, updated_at)
            VALUES ($empId, $secId, $subId, $currentSessionId, $isClassTeacher, '$now', '$now')");
        // Second assignment for variety
        $secId2 = $sectionIds[($ei + 1) % count($sectionIds)];
        $subId2 = $subjectIds[($ei + 1) % count($subjectIds)];
        $pdo->exec("INSERT IGNORE INTO teacher_assignments (employee_id, section_id, subject_id, academic_session_id, is_class_teacher, created_at, updated_at)
            VALUES ($empId, $secId2, $subId2, $currentSessionId, 0, '$now', '$now')");
    }

    // ─── 13. Attendance (last 30 days for all enrollments) ───
    foreach ($enrollmentIds as $enId) {
        for ($d = 0; $d < 30; $d++) {
            $aDate = date('Y-m-d', strtotime("-$d days"));
            $status = rand(1, 10) > 1 ? 'present' : (rand(0, 1) ? 'absent' : 'late');
            $pdo->exec("INSERT IGNORE INTO student_attendances (student_enrollment_id, date, status, marked_by, created_at, updated_at)
                VALUES ($enId, '$aDate', '$status', $adminUserId, '$now', '$now')");
        }
    }

    // ─── 14. Grade rules (class 1-3) ───
    $grades = [['A+', 5.0, 80, 100], ['A', 4.0, 70, 79], ['A-', 3.5, 60, 69], ['B', 3.0, 50, 59], ['C', 2.0, 40, 49], ['D', 1.0, 33, 39], ['F', 0, 0, 32]];
    foreach (array_slice($classIds, 0, 3) as $classId) {
        foreach ($grades as $g) {
            $pdo->exec("INSERT IGNORE INTO grade_rules (institution_id, class_id, letter_grade, grade_point, min_marks, max_marks, created_at, updated_at)
                VALUES ($instId, $classId, '{$g[0]}', {$g[1]}, {$g[2]}, {$g[3]}, '$now', '$now')");
        }
    }

    // ─── 15. Exam terms ───
    $pdo->exec("INSERT IGNORE INTO exam_terms (institution_id, academic_session_id, name, start_date, end_date, publish_status, created_at, updated_at) VALUES
        ($instId, $currentSessionId, 'Half Yearly 2025', '2025-06-01', '2025-06-15', 'published', '$now', '$now'),
        ($instId, $currentSessionId, 'Annual 2025', '2025-11-01', '2025-11-20', 'draft', '$now', '$now')");
    $examTermId = (int) $pdo->query("SELECT id FROM exam_terms WHERE institution_id = $instId AND publish_status = 'published' ORDER BY id DESC LIMIT 1")->fetchColumn();

    // ─── 16. Exam routines (published term, class 1, all subjects) ───
    $c1 = $classIds[0];
    foreach ($subjectIds as $si => $subId) {
        $examDate = date('Y-m-d', strtotime("2025-06-0" . ($si + 1)));
        $pdo->exec("INSERT IGNORE INTO exam_routines (exam_term_id, class_id, subject_id, exam_date, start_time, end_time, full_marks, created_at, updated_at)
            VALUES ($examTermId, $c1, $subId, '$examDate', '09:00:00', '12:00:00', 100, '$now', '$now')");
    }

    // ─── 17. Marks for all enrollments, exam term, all subjects ───
    foreach ($enrollmentIds as $enId) {
        foreach ($subjectIds as $subId) {
            $m = rand(35, 98);
            $pdo->exec("INSERT IGNORE INTO marks (exam_term_id, student_enrollment_id, subject_id, marks_obtained, full_marks, entered_by, created_at, updated_at)
                VALUES ($examTermId, $enId, $subId, $m, 100, $adminUserId, '$now', '$now')");
        }
    }

    // ─── 18. Results ───
    $numSubjects = count($subjectIds);
    $pos = 0;
    foreach ($enrollmentIds as $enId) {
        $total = (int) $pdo->query("SELECT COALESCE(SUM(marks_obtained), 0) FROM marks WHERE exam_term_id = $examTermId AND student_enrollment_id = $enId")->fetchColumn();
        $avg = $numSubjects > 0 ? $total / $numSubjects : 0;
        $gpa = $avg >= 80 ? 5.0 : ($avg >= 70 ? 4.0 : ($avg >= 60 ? 3.5 : ($avg >= 50 ? 3.0 : ($avg >= 40 ? 2.0 : ($avg >= 33 ? 1.0 : 0)))));
        $grade = $gpa >= 5 ? 'A+' : ($gpa >= 4 ? 'A' : ($gpa >= 3.5 ? 'A-' : ($gpa >= 3 ? 'B' : ($gpa >= 2 ? 'C' : ($gpa >= 1 ? 'D' : 'F')))));
        $pos++;
        $totalStudents = count($enrollmentIds);
        $pdo->exec("INSERT INTO results (exam_term_id, student_enrollment_id, total_marks, gpa, letter_grade, position, total_students, created_at, updated_at)
            VALUES ($examTermId, $enId, $total, $gpa, '$grade', $pos, $totalStudents, '$now', '$now')
            ON DUPLICATE KEY UPDATE total_marks = VALUES(total_marks), gpa = VALUES(gpa), letter_grade = VALUES(letter_grade), position = VALUES(position), total_students = VALUES(total_students)");
    }

    // ─── 19. Fee heads ───
    $feeHeadNames = [
        ['Tuition Fee', 'টিউশন ফি', 'monthly'],
        ['Admission Fee', 'ভর্তি ফি', 'one_time'],
        ['Exam Fee', 'পরীক্ষা ফি', 'annual'],
        ['Library Fee', 'লাইব্রেরি ফি', 'annual'],
    ];
    $feeHeadIds = [];
    foreach ($feeHeadNames as $fh) {
        $fhn = addslashes($fh[0]); $fhnBn = addslashes($fh[1]);
        $pdo->exec("INSERT IGNORE INTO fee_heads (institution_id, name, name_bn, frequency, created_at, updated_at)
            VALUES ($instId, '$fhn', '$fhnBn', '{$fh[2]}', '$now', '$now')");
        $feeHeadIds[] = (int) $pdo->query("SELECT id FROM fee_heads WHERE institution_id = $instId AND name = '$fhn'")->fetchColumn();
    }

    // ─── 20. Fee structures (class 1-3) ───
    $amounts = [1200 + ($schoolIdx * 200), 5000, 800, 500];
    foreach (array_slice($classIds, 0, 3) as $classId) {
        foreach ($feeHeadIds as $fi => $fhId) {
            if ($fhId <= 0) continue;
            $amt = $amounts[$fi] ?? 1000;
            $pdo->exec("INSERT IGNORE INTO fee_structures (institution_id, academic_session_id, class_id, fee_head_id, amount, created_at, updated_at)
                VALUES ($instId, $currentSessionId, $classId, $fhId, $amt, '$now', '$now')");
        }
    }

    // ─── 21. Invoices and payments (for first 15 students) ───
    foreach (array_slice($studentIds, 0, 15) as $si => $stId) {
        if ($stId <= 0) continue;
        $invNo = 'INV-' . strtoupper(substr(md5($school['eiin'] . $stId . $si), 0, 12));
        $total = array_sum($amounts);
        $paid = $si % 3 === 0 ? 0 : ($si % 3 === 1 ? $total : rand(1000, intval($total * 0.7)));
        $due = max(0, $total - $paid);
        $status = $due <= 0 ? 'paid' : ($paid > 0 ? 'partial' : 'pending');
        $month = $si < 5 ? '2025-01' : ($si < 10 ? '2025-02' : '2025-03');
        $pdo->exec("INSERT IGNORE INTO invoices (institution_id, student_id, academic_session_id, invoice_no, month, sub_total, discount_amount, total_amount, paid_amount, due_amount, status, due_date, created_at, updated_at)
            VALUES ($instId, $stId, $currentSessionId, '$invNo', '$month', $total, 0, $total, $paid, $due, '$status', '2025-03-31', '$now', '$now')");
        $invId = (int) $pdo->query("SELECT id FROM invoices WHERE invoice_no = '$invNo'")->fetchColumn();
        if ($invId) {
            foreach ($feeHeadIds as $fi => $fhId) {
                if ($fhId <= 0) continue;
                $pdo->exec("INSERT IGNORE INTO invoice_items (invoice_id, fee_head_id, amount, created_at, updated_at) VALUES ($invId, $fhId, {$amounts[$fi]}, '$now', '$now')");
            }
            if ($paid > 0) {
                $rcp = 'RCP-' . strtoupper(substr(md5($invNo), 0, 12));
                $payDate = date('Y-m-d');
                $pdo->exec("INSERT IGNORE INTO payments (institution_id, invoice_id, receipt_no, amount, payment_date, method, collected_by, created_at, updated_at)
                    VALUES ($instId, $invId, '$rcp', $paid, '$payDate', 'cash', $adminUserId, '$now', '$now')");
            }
        }
    }

    // ─── 22. Notices ───
    foreach ($school['notices'] as $ni => $notice) {
        $title = addslashes($notice[0]); $titleBn = addslashes($notice[1]); $body = addslashes($notice[2]);
        $pdo->exec("INSERT IGNORE INTO notices (institution_id, created_by, title, title_bn, body, audience, is_published, published_at, created_at, updated_at)
            VALUES ($instId, $adminUserId, '$title', '$titleBn', '$body', 'all', 1, '$now', '$now', '$now')");
    }

    // ─── 23. Landing page config ───
    $landingConfig = [
        'hero' => [
            'title' => $school['hero_title'],
            'title_bn' => $school['hero_title_bn'],
            'subtitle' => $school['hero_subtitle'],
            'subtitle_bn' => '',
            'ctaText' => 'Login to Portal',
            'ctaLink' => '/login',
            'imageUrl' => '',
            'background' => 'gradient',
        ],
        'about' => [
            'heading' => 'About ' . $school['name'],
            'heading_bn' => $school['name_bn'] . ' সম্পর্কে',
            'body' => 'We are committed to providing excellent education, fostering academic and personal growth for every student.',
            'body_bn' => 'আমরা প্রতিটি শিক্ষার্থীর একাডেমিক ও ব্যক্তিগত বিকাশের জন্য চমৎকার শিক্ষা প্রদানে প্রতিশ্রুতিবদ্ধ।',
            'imageUrl' => '',
        ],
        'features' => [
            ['title' => 'Quality Education', 'title_bn' => 'মানসম্মত শিক্ষা', 'description' => 'Experienced teachers and modern curriculum.', 'icon' => 'GraduationCap'],
            ['title' => 'Safe Campus', 'title_bn' => 'নিরাপদ ক্যাম্পাস', 'description' => 'Secure and supportive campus.', 'icon' => 'Shield'],
            ['title' => 'Digital Portal', 'title_bn' => 'ডিজিটাল পোর্টাল', 'description' => 'Track attendance, fees, and results online.', 'icon' => 'Users'],
        ],
        'contact' => [
            'email' => $school['email'],
            'phone' => $school['phone'],
            'address' => $school['address'],
            'address_bn' => '',
            'mapEmbed' => '',
            'showSection' => true,
        ],
        'footer' => [
            'text' => 'Empowering students since day one.',
            'copyright' => '© 2026 ' . $school['name'] . '. All rights reserved.',
            'facebook' => '', 'youtube' => '', 'twitter' => '',
        ],
        'seo' => [
            'metaTitle' => $school['name'] . ' - Quality Education',
            'metaDescription' => 'Official website of ' . $school['name'] . '.',
        ],
        'notices' => [
            'enabled' => true,
            'maxItems' => 5,
            'sectionTitle' => 'Latest Notices',
            'sectionTitle_bn' => 'সর্বশেষ নোটিশ',
        ],
    ];
    $configJson = $pdo->quote(json_encode($landingConfig, JSON_UNESCAPED_UNICODE));
    $pdo->exec("INSERT IGNORE INTO landing_page_configs (institution_id, config, created_at, updated_at) VALUES ($instId, $configJson, '$now', '$now')");

    echo "  ✓ Sessions, Shifts, 12 Classes, " . count($sectionIds) . " Sections, " . count($subjectIds) . " Subjects\n";
    echo "  ✓ " . count($studentIds) . " Students, " . count($guardianIds) . " Guardians, " . count($enrollmentIds) . " Enrollments\n";
    echo "  ✓ " . count($employeeIds) . " Teachers, Attendance (30 days), Grade Rules\n";
    echo "  ✓ Exam Terms, Exam Routines, Marks, Results\n";
    echo "  ✓ Fee Heads, Fee Structures, Invoices, Payments\n";
    echo "  ✓ " . count($school['notices']) . " Notices, Landing Page Config\n\n";
}

echo "═══════════════════════════════════════════\n";
echo "  All 5 schools seeded successfully!\n";
echo "═══════════════════════════════════════════\n\n";
echo "Admin credentials (all use password: 'password'):\n";
foreach ($schools as $s) {
    echo "  {$s['name']}: {$s['admin_email']}\n";
}
echo "\nSuper Admin: superadmin@schoolportal.bd / password\n";
echo "Login as super admin to see all schools.\n";
