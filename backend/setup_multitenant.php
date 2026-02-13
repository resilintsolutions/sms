<?php
/**
 * Adds multi-tenant columns to institutions, super_admin role, and super admin user.
 * Run: php setup_multitenant.php
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

echo "Adding multi-tenant columns to institutions...\n";

$columns = $pdo->query("SHOW COLUMNS FROM institutions LIKE 'custom_domain'")->fetch();
if (!$columns) {
    $pdo->exec("ALTER TABLE institutions
        ADD COLUMN custom_domain VARCHAR(255) NULL AFTER email,
        ADD COLUMN subdomain VARCHAR(255) NULL AFTER custom_domain,
        ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'active' AFTER is_active,
        ADD COLUMN feature_flags JSON NULL AFTER subscription_status");
    echo "  - Added custom_domain, subdomain, subscription_status, feature_flags\n";
} else {
    echo "  - Columns already exist, skipping.\n";
}

echo "Adding super_admin role...\n";
$pdo->exec("INSERT IGNORE INTO roles (id, name, label, guard_name, description, created_at, updated_at) VALUES
(2, 'super_admin', 'Super Admin', 'web', 'Platform administrator - manages all schools', NOW(), NOW())");

echo "Creating super admin user (superadmin@schoolportal.bd / password)...\n";
$passwordHash = password_hash('password', PASSWORD_BCRYPT);
$stmt = $pdo->prepare("INSERT INTO users (institution_id, name, name_bn, email, password, is_active, created_at, updated_at) 
    VALUES (NULL, 'Super Admin', 'সুপার অ্যাডমিন', 'superadmin@schoolportal.bd', ?, 1, NOW(), NOW()) 
    ON DUPLICATE KEY UPDATE password = VALUES(password), name = VALUES(name), is_active = 1");
$stmt->execute([$passwordHash]);

$superAdminId = $pdo->query("SELECT id FROM users WHERE email = 'superadmin@schoolportal.bd'")->fetchColumn();
$superAdminRoleId = $pdo->query("SELECT id FROM roles WHERE name = 'super_admin'")->fetchColumn();
$pdo->exec("INSERT IGNORE INTO model_has_roles (role_id, model_type, model_id) VALUES ($superAdminRoleId, 'App\\\\Models\\\\User', $superAdminId)");

echo "Done.\n";
echo "Super Admin: superadmin@schoolportal.bd / password\n";
echo "Multi-tenant columns: custom_domain, subdomain, subscription_status, feature_flags\n";
exit(0);
