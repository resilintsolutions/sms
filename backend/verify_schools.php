<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=school_management','root','');
echo "=== Institutions ===\n";
$r = $pdo->query('SELECT id, name, eiin, subdomain, is_active FROM institutions ORDER BY id');
foreach ($r as $row) {
    echo $row['id'] . ' | ' . $row['name'] . ' | EIIN:' . $row['eiin'] . ' | ' . ($row['subdomain'] ?? '-') . ' | active:' . $row['is_active'] . "\n";
}
echo "\n=== Counts per Institution ===\n";
$ids = $pdo->query('SELECT id, name FROM institutions ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
foreach ($ids as $inst) {
    $id = $inst['id'];
    $stu = $pdo->query("SELECT COUNT(*) FROM students WHERE institution_id = $id")->fetchColumn();
    $emp = $pdo->query("SELECT COUNT(*) FROM employees WHERE institution_id = $id")->fetchColumn();
    $cls = $pdo->query("SELECT COUNT(*) FROM classes WHERE institution_id = $id")->fetchColumn();
    $sub = $pdo->query("SELECT COUNT(*) FROM subjects WHERE institution_id = $id")->fetchColumn();
    $not = $pdo->query("SELECT COUNT(*) FROM notices WHERE institution_id = $id")->fetchColumn();
    echo "{$inst['name']}: {$stu} students, {$emp} employees, {$cls} classes, {$sub} subjects, {$not} notices\n";
}
