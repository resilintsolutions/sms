<?php
/**
 * Assign local test domains to each school for multi-domain testing.
 * Run: php assign_local_domains.php
 */

$pdo = new PDO('mysql:host=127.0.0.1;dbname=school_management', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$domains = [
    1 => ['subdomain' => 'demo',        'custom_domain' => 'demo-school.local'],
    2 => ['subdomain' => 'dhaka',       'custom_domain' => 'dhaka-ideal.local'],
    3 => ['subdomain' => 'chittagong',  'custom_domain' => 'chittagong-model.local'],
    4 => ['subdomain' => 'rajshahi',    'custom_domain' => 'rajshahi-collegiate.local'],
    5 => ['subdomain' => 'sylhet',      'custom_domain' => 'sylhet-international.local'],
    6 => ['subdomain' => 'khulna',      'custom_domain' => 'khulna-public.local'],
];

$stmt = $pdo->prepare('UPDATE institutions SET subdomain = :subdomain, custom_domain = :custom_domain WHERE id = :id');

foreach ($domains as $id => $cfg) {
    $stmt->execute([
        ':id' => $id,
        ':subdomain' => $cfg['subdomain'],
        ':custom_domain' => $cfg['custom_domain'],
    ]);
    echo "ID $id => subdomain: {$cfg['subdomain']}, custom_domain: {$cfg['custom_domain']}\n";
}

echo "\n--- Verification ---\n";
$rows = $pdo->query('SELECT id, name, subdomain, custom_domain FROM institutions ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $r) {
    echo "  [{$r['id']}] {$r['name']}\n";
    echo "       subdomain: {$r['subdomain']}\n";
    echo "       custom_domain: {$r['custom_domain']}\n";
    echo "       → http://{$r['subdomain']}.school.local:3000\n";
    echo "       → http://{$r['custom_domain']}:3000\n\n";
}

echo "Done! All schools have local domains assigned.\n";
