<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add design_config JSON column to store full card design settings
        Schema::table('id_card_templates', function (Blueprint $table) {
            $table->json('design_config')->nullable()->after('field_positions');
        });

        // Custom fields that admins can create for ID cards
        if (!Schema::hasTable('id_card_custom_fields')) {
            Schema::create('id_card_custom_fields', function (Blueprint $table) {
                $table->id();
                $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
                $table->string('label');              // Display label e.g. "Emergency Contact"
                $table->string('label_bn')->nullable(); // Bengali label
                $table->string('field_key')->unique(); // Unique key e.g. "emergency_contact"
                $table->enum('applies_to', ['student', 'teacher', 'staff', 'all'])->default('all');
                $table->string('default_value')->nullable();
                $table->integer('sort_order')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::table('id_card_templates', function (Blueprint $table) {
            $table->dropColumn('design_config');
        });
        Schema::dropIfExists('id_card_custom_fields');
    }
};
