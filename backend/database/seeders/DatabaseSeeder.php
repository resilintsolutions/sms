<?php

namespace Database\Seeders;

use App\Models\AcademicSession;
use App\Models\ClassModel;
use App\Models\Institution;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $institution = Institution::firstOrCreate(
            ['eiin' => '000000'],
            [
                'name' => 'Demo School',
                'name_bn' => 'ডেমো স্কুল',
                'address' => 'Dhaka, Bangladesh',
                'phone' => '+8801700000000',
                'email' => 'admin@school.edu.bd',
                'currency' => 'BDT',
                'locale' => 'bn',
                'is_active' => true,
            ]
        );

        $roles = ['super_admin', 'admin', 'academic_admin', 'accounts', 'teacher', 'student', 'guardian'];
        foreach ($roles as $name) {
            Role::firstOrCreate(
                ['name' => $name],
                ['label' => ucfirst(str_replace('_', ' ', $name)), 'guard_name' => 'web']
            );
        }

        $admin = User::firstOrCreate(
            ['email' => 'admin@school.edu.bd'],
            [
                'institution_id' => $institution->id,
                'name' => 'Admin',
                'name_bn' => 'অ্যাডমিন',
                'password' => Hash::make('password'),
                'is_active' => true,
            ]
        );
        if (! $admin->roles()->where('name', 'admin')->exists()) {
            $admin->roles()->attach(Role::where('name', 'admin')->first()->id);
        }

        AcademicSession::firstOrCreate(
            [
                'institution_id' => $institution->id,
                'name' => date('Y'),
            ],
            [
                'start_date' => now()->startOfYear(),
                'end_date' => now()->endOfYear(),
                'is_current' => true,
            ]
        );

        for ($i = 1; $i <= 12; $i++) {
            ClassModel::firstOrCreate(
                ['institution_id' => $institution->id, 'name' => (string) $i],
                ['numeric_order' => $i]
            );
        }
    }
}
