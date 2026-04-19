<?php
$pdo = new PDO('mysql:host=127.0.0.1;dbname=school_management', 'root', '');
$rows = $pdo->query('SELECT id, name, email, custom_domain, subdomain, is_active, subscription_status FROM institutions ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);

echo str_pad("ID", 4) . str_pad("Name", 40) . str_pad("Custom Domain", 30) . str_pad("Subdomain", 20) . str_pad("Active", 8) . "Status\n";
echo str_repeat("-", 122) . "\n";

foreach ($rows as $row) {
    echo str_pad($row['id'], 4)
        . str_pad($row['name'], 40)
        . str_pad($row['custom_domain'] ?? 'NULL', 30)
        . str_pad($row['subdomain'] ?? 'NULL', 20)
        . str_pad($row['is_active'] ? 'Yes' : 'No', 8)
        . ($row['subscription_status'] ?? 'NULL') . "\n";
}

echo "\nTotal schools: " . count($rows) . "\n";
