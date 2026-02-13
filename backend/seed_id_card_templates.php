<?php
/**
 * Seed sample ID-card templates for every institution.
 *
 * Run: php seed_id_card_templates.php
 */
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\IdCardTemplate;
use App\Models\Institution;

$institutions = Institution::all();
if ($institutions->isEmpty()) {
    echo "No institutions found.\n";
    exit(1);
}

// Sample templates with built-in SVG designs
$sampleTemplates = [
    // ── Student Templates ──
    [
        'name' => 'Classic Blue — Student',
        'type' => 'student',
        'background_image' => '/samples/student-classic-blue',
        'is_sample' => true,
        'is_active' => true,
        'field_positions' => [
            'photoX' => 50, 'photoY' => 38, 'photoSize' => 22,
            'nameY' => 65, 'idY' => 72, 'classY' => 78, 'fontSize' => 13,
            'textColor' => '#1e293b', 'labelColor' => '#64748b',
        ],
    ],
    [
        'name' => 'Green Gradient — Student',
        'type' => 'student',
        'background_image' => '/samples/student-green-gradient',
        'is_sample' => true,
        'is_active' => true,
        'field_positions' => [
            'photoX' => 50, 'photoY' => 38, 'photoSize' => 22,
            'nameY' => 65, 'idY' => 72, 'classY' => 78, 'fontSize' => 13,
            'textColor' => '#1e293b', 'labelColor' => '#4b5563',
        ],
    ],
    [
        'name' => 'Elegant Purple — Student',
        'type' => 'student',
        'background_image' => '/samples/student-elegant-purple',
        'is_sample' => true,
        'is_active' => true,
        'field_positions' => [
            'photoX' => 50, 'photoY' => 38, 'photoSize' => 22,
            'nameY' => 65, 'idY' => 72, 'classY' => 78, 'fontSize' => 13,
            'textColor' => '#1e1b4b', 'labelColor' => '#6366f1',
        ],
    ],

    // ── Teacher Templates ──
    [
        'name' => 'Classic Blue — Teacher',
        'type' => 'teacher',
        'background_image' => '/samples/teacher-classic-blue',
        'is_sample' => true,
        'is_active' => true,
        'field_positions' => [
            'photoX' => 50, 'photoY' => 38, 'photoSize' => 22,
            'nameY' => 65, 'idY' => 72, 'deptY' => 78, 'fontSize' => 13,
            'textColor' => '#1e293b', 'labelColor' => '#64748b',
        ],
    ],
    [
        'name' => 'Green Gradient — Teacher',
        'type' => 'teacher',
        'background_image' => '/samples/teacher-green-gradient',
        'is_sample' => true,
        'is_active' => true,
        'field_positions' => [
            'photoX' => 50, 'photoY' => 38, 'photoSize' => 22,
            'nameY' => 65, 'idY' => 72, 'deptY' => 78, 'fontSize' => 13,
            'textColor' => '#1e293b', 'labelColor' => '#4b5563',
        ],
    ],
    [
        'name' => 'Elegant Purple — Teacher',
        'type' => 'teacher',
        'background_image' => '/samples/teacher-elegant-purple',
        'is_sample' => true,
        'is_active' => true,
        'field_positions' => [
            'photoX' => 50, 'photoY' => 38, 'photoSize' => 22,
            'nameY' => 65, 'idY' => 72, 'deptY' => 78, 'fontSize' => 13,
            'textColor' => '#1e1b4b', 'labelColor' => '#6366f1',
        ],
    ],

    // ── Staff Templates ──
    [
        'name' => 'Classic Blue — Staff',
        'type' => 'staff',
        'background_image' => '/samples/staff-classic-blue',
        'is_sample' => true,
        'is_active' => true,
        'field_positions' => [
            'photoX' => 50, 'photoY' => 38, 'photoSize' => 22,
            'nameY' => 65, 'idY' => 72, 'deptY' => 78, 'fontSize' => 13,
            'textColor' => '#1e293b', 'labelColor' => '#64748b',
        ],
    ],
    [
        'name' => 'Green Gradient — Staff',
        'type' => 'staff',
        'background_image' => '/samples/staff-green-gradient',
        'is_sample' => true,
        'is_active' => true,
        'field_positions' => [
            'photoX' => 50, 'photoY' => 38, 'photoSize' => 22,
            'nameY' => 65, 'idY' => 72, 'deptY' => 78, 'fontSize' => 13,
            'textColor' => '#1e293b', 'labelColor' => '#4b5563',
        ],
    ],
    [
        'name' => 'Elegant Purple — Staff',
        'type' => 'staff',
        'background_image' => '/samples/staff-elegant-purple',
        'is_sample' => true,
        'is_active' => true,
        'field_positions' => [
            'photoX' => 50, 'photoY' => 38, 'photoSize' => 22,
            'nameY' => 65, 'idY' => 72, 'deptY' => 78, 'fontSize' => 13,
            'textColor' => '#1e1b4b', 'labelColor' => '#6366f1',
        ],
    ],
];

foreach ($institutions as $inst) {
    echo "Seeding ID card templates for: {$inst->name}\n";
    foreach ($sampleTemplates as $tpl) {
        $data = array_merge($tpl, ['institution_id' => $inst->id]);
        // Ensure field_positions is stored as JSON string for updateOrCreate
        if (is_array($data['field_positions'] ?? null)) {
            $data['field_positions'] = json_encode($data['field_positions']);
        }
        IdCardTemplate::updateOrCreate(
            [
                'institution_id' => $inst->id,
                'name'           => $tpl['name'],
                'type'           => $tpl['type'],
                'is_sample'      => true,
            ],
            $data
        );
    }
}

echo "\n✅ ID card sample templates seeded.\n";
