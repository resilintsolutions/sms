<?php
/**
 * Run this script to create the database, tables, and admin user (no Artisan needed).
 * Usage: php seed_admin.php
 * Requires: MySQL running, PHP with PDO MySQL. Load .env from backend folder.
 */

$backendDir = __DIR__;
chdir($backendDir);

// Load .env
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

echo "Connecting to MySQL...\n";

try {
    $pdo = new PDO(
        "mysql:host=$dbHost;port=$dbPort;charset=utf8mb4",
        $dbUser,
        $dbPass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    echo "ERROR: Could not connect to MySQL. Is MySQL running? (e.g. start it in XAMPP)\n";
    echo $e->getMessage() . "\n";
    exit(1);
}

$pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName`");
$pdo->exec("USE `$dbName`");

echo "Creating tables if not exist...\n";

$pdo->exec("
CREATE TABLE IF NOT EXISTS institutions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_bn VARCHAR(255) NULL,
    eiin VARCHAR(20) NULL,
    address TEXT NULL,
    phone VARCHAR(255) NULL,
    email VARCHAR(255) NULL,
    logo VARCHAR(255) NULL,
    currency VARCHAR(3) DEFAULT 'BDT',
    locale VARCHAR(5) DEFAULT 'bn',
    settings JSON NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$pdo->exec("
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    guard_name VARCHAR(255) DEFAULT 'web',
    description TEXT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$pdo->exec("
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institution_id BIGINT UNSIGNED NULL,
    name VARCHAR(255) NOT NULL,
    name_bn VARCHAR(255) NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at TIMESTAMP NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(255) NULL,
    avatar VARCHAR(255) NULL,
    is_active TINYINT(1) DEFAULT 1,
    last_login_at TIMESTAMP NULL,
    remember_token VARCHAR(100) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$pdo->exec("
CREATE TABLE IF NOT EXISTS model_has_roles (
    role_id BIGINT UNSIGNED NOT NULL,
    model_type VARCHAR(255) NOT NULL,
    model_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, model_id, model_type),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$pdo->exec("
CREATE TABLE IF NOT EXISTS landing_page_configs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    institution_id BIGINT UNSIGNED NOT NULL,
    config JSON NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    UNIQUE KEY (institution_id),
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$pdo->exec("
CREATE TABLE IF NOT EXISTS personal_access_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tokenable_type VARCHAR(255) NOT NULL,
    tokenable_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    abilities TEXT NULL,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$now = date('Y-m-d H:i:s');

// Insert institution
$pdo->exec("INSERT IGNORE INTO institutions (id, name, name_bn, eiin, address, phone, email, currency, locale, is_active, created_at, updated_at) VALUES
(1, 'Demo School', 'ডেমো স্কুল', '000000', 'Dhaka, Bangladesh', '+8801700000000', 'admin@school.edu.bd', 'BDT', 'bn', 1, '$now', '$now')");

// Insert admin role
$pdo->exec("INSERT IGNORE INTO roles (id, name, label, guard_name, created_at, updated_at) VALUES (1, 'admin', 'Admin', 'web', '$now', '$now')");

// Admin password: bcrypt for 'password'
$passwordHash = password_hash('password', PASSWORD_BCRYPT);

$stmt = $pdo->prepare("INSERT INTO users (institution_id, name, name_bn, email, password, is_active, created_at, updated_at) VALUES (1, 'Admin', 'অ্যাডমিন', 'admin@school.edu.bd', ?, 1, '$now', '$now') ON DUPLICATE KEY UPDATE password = VALUES(password), name = VALUES(name), is_active = 1");
$stmt->execute([$passwordHash]);

$userId = $pdo->query("SELECT id FROM users WHERE email = 'admin@school.edu.bd'")->fetchColumn();
$roleId = 1;

$pdo->exec("INSERT IGNORE INTO model_has_roles (role_id, model_type, model_id) VALUES ($roleId, 'App\\\\Models\\\\User', $userId)");

echo "Done.\n";
echo "Admin login: admin@school.edu.bd / password\n";
exit(0);
