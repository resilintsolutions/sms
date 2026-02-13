<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grade_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->foreignId('class_id')->nullable()->constrained()->nullOnDelete();
            $table->string('letter_grade', 5); // A+, A, A-, etc.
            $table->decimal('grade_point', 4, 2);
            $table->unsignedSmallInteger('min_marks');
            $table->unsignedSmallInteger('max_marks');
            $table->timestamps();
        });

        Schema::create('exam_terms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // Class Test, Term 1, Final
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->enum('publish_status', ['draft', 'published'])->default('draft');
            $table->timestamps();
        });

        Schema::create('exam_routines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_term_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->date('exam_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->unsignedSmallInteger('full_marks')->default(100);
            $table->timestamps();
        });

        Schema::create('marks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_term_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_enrollment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->decimal('marks_obtained', 6, 2)->nullable(); // null = absent
            $table->unsignedSmallInteger('full_marks');
            $table->string('absent_code', 10)->nullable(); // AB, etc.
            $table->foreignId('entered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['exam_term_id', 'student_enrollment_id', 'subject_id'], 'exam_student_subject');
        });

        Schema::create('results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_term_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_enrollment_id')->constrained()->cascadeOnDelete();
            $table->decimal('total_marks', 8, 2)->default(0);
            $table->decimal('gpa', 4, 2)->nullable();
            $table->string('letter_grade', 5)->nullable();
            $table->unsignedInteger('position')->nullable();
            $table->unsignedInteger('total_students')->nullable();
            $table->timestamps();
            $table->unique(['exam_term_id', 'student_enrollment_id'], 'exam_enrollment');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('results');
        Schema::dropIfExists('marks');
        Schema::dropIfExists('exam_routines');
        Schema::dropIfExists('exam_terms');
        Schema::dropIfExists('grade_rules');
    }
};
