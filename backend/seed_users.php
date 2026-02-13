<?php
/**
 * Adds teacher and parent users with roles. Run after seed_admin.php, setup_multitenant.php, and seed_dummy.php.
 * Usage: php seed_users.php
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
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}

$now = date('Y-m-d H:i:s');
$passwordHash = password_hash('password', PASSWORD_BCRYPT);
$instId = 1;

// Add teacher and parent roles if not exist
$pdo->exec("INSERT IGNORE INTO roles (id, name, label, guard_name, description, created_at, updated_at) VALUES
(3, 'teacher', 'Teacher', 'web', 'School teacher - marks attendance, enters marks', '$now', '$now'),
(4, 'parent', 'Parent', 'web', 'Parent/Guardian - views child performance', '$now', '$now')");

// Teacher user: teacher@school.edu.bd
$stmt = $pdo->prepare("INSERT INTO users (institution_id, name, name_bn, email, password, is_active, created_at, updated_at) VALUES 
(?, 'Rahim Teacher', 'রহিম শিক্ষক', 'teacher@school.edu.bd', ?, 1, '$now', '$now') 
ON DUPLICATE KEY UPDATE password = VALUES(password), name = VALUES(name), is_active = 1");
$stmt->execute([$instId, $passwordHash]);

$teacherUserId = (int) $pdo->query("SELECT id FROM users WHERE email = 'teacher@school.edu.bd'")->fetchColumn();
$teacherRoleId = (int) $pdo->query("SELECT id FROM roles WHERE name = 'teacher'")->fetchColumn();
$pdo->exec("INSERT IGNORE INTO model_has_roles (role_id, model_type, model_id) VALUES ($teacherRoleId, 'App\\\\Models\\\\User', $teacherUserId)");

// Create or update employee for teacher (link to user)
$empCount = (int) $pdo->query("SELECT COUNT(*) FROM employees WHERE user_id = $teacherUserId")->fetchColumn();
if ($empCount === 0) {
    $empId = (int) $pdo->query("SELECT COALESCE(MAX(id), 0) + 1 FROM employees")->fetchColumn();
    $pdo->exec("INSERT IGNORE INTO employees (id, institution_id, user_id, employee_id, name, designation, department, email, is_teacher, is_active, created_at, updated_at) VALUES 
    ($empId, $instId, $teacherUserId, 'EMP-001', 'Rahim Teacher', 'Assistant Teacher', 'Academic', 'teacher@school.edu.bd', 1, 1, '$now', '$now')");
    $empId = (int) $pdo->query("SELECT id FROM employees WHERE user_id = $teacherUserId")->fetchColumn();
    // Assign teacher to section 1 (Class 1-A), subject 1 (Bangla), session 2, as class teacher
    $pdo->exec("INSERT IGNORE INTO teacher_assignments (employee_id, section_id, subject_id, academic_session_id, is_class_teacher, created_at, updated_at) VALUES 
    ($empId, 1, 1, 2, 1, '$now', '$now'),
    ($empId, 1, 2, 2, 0, '$now', '$now')");
}

// Parent user: parent@school.edu.bd (links to guardian 1 - Rahim Ahmed)
$stmt = $pdo->prepare("INSERT INTO users (institution_id, name, name_bn, email, password, phone, is_active, created_at, updated_at) VALUES 
(?, 'Rahim Ahmed', 'রহিম আহমেদ', 'parent@school.edu.bd', ?, '+8801711111001', 1, '$now', '$now') 
ON DUPLICATE KEY UPDATE password = VALUES(password), name = VALUES(name), phone = VALUES(phone), is_active = 1");
$stmt->execute([$instId, $passwordHash]);

$parentUserId = (int) $pdo->query("SELECT id FROM users WHERE email = 'parent@school.edu.bd'")->fetchColumn();
$parentRoleId = (int) $pdo->query("SELECT id FROM roles WHERE name = 'parent'")->fetchColumn();
$pdo->exec("INSERT IGNORE INTO model_has_roles (role_id, model_type, model_id) VALUES ($parentRoleId, 'App\\\\Models\\\\User', $parentUserId)");

// Link parent user to guardian 1 (Rahim Ahmed) so guardian has user_id
$pdo->exec("UPDATE guardians SET user_id = $parentUserId WHERE id = 1");

echo "Done.\n";
echo "Teacher: teacher@school.edu.bd / password\n";
echo "Parent:  parent@school.edu.bd / password\n";
exit(0);
