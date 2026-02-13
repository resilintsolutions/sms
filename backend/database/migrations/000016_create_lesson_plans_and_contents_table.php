<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── Lesson Plans ───
        Schema::create('lesson_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('section_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete(); // teacher
            $table->string('title', 255);
            $table->string('title_bn', 255)->nullable();
            $table->text('objective')->nullable();
            $table->text('objective_bn')->nullable();
            $table->text('content')->nullable();          // main lesson content / methodology
            $table->text('content_bn')->nullable();
            $table->text('teaching_method')->nullable();   // lecture, group work, etc.
            $table->text('resources')->nullable();         // textbook pages, tools, etc.
            $table->text('assessment')->nullable();        // how to evaluate
            $table->text('homework')->nullable();
            $table->date('plan_date')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->string('topic', 255)->nullable();
            $table->string('topic_bn', 255)->nullable();
            $table->integer('week_number')->nullable();
            $table->enum('status', ['draft', 'published', 'completed'])->default('draft');
            $table->timestamps();

            $table->index(['class_id', 'subject_id', 'academic_session_id']);
            $table->index(['created_by', 'status']);
            $table->index('plan_date');
        });

        // ─── Study Materials / Content Links ───
        Schema::create('study_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('section_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete(); // teacher
            $table->string('title', 255);
            $table->string('title_bn', 255)->nullable();
            $table->text('description')->nullable();
            $table->text('description_bn')->nullable();
            $table->enum('type', ['google_drive', 'dropbox', 'youtube', 'website', 'document', 'other'])->default('other');
            $table->text('link');                          // URL to content (Drive, Dropbox, etc.)
            $table->string('file_name', 255)->nullable();  // optional display name
            $table->string('file_type', 50)->nullable();   // pdf, pptx, video, etc.
            $table->boolean('is_public')->default(true);   // visible to students
            $table->enum('status', ['draft', 'published'])->default('published');
            $table->timestamps();

            $table->index(['class_id', 'subject_id', 'academic_session_id']);
            $table->index(['created_by', 'status']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('study_materials');
        Schema::dropIfExists('lesson_plans');
    }
};
