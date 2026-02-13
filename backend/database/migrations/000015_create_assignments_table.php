<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('section_id')->nullable()->constrained()->nullOnDelete(); // null = all sections
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete(); // teacher
            $table->string('title', 200);
            $table->string('title_bn', 200)->nullable();
            $table->text('description')->nullable();
            $table->text('description_bn')->nullable();
            $table->enum('type', ['assignment', 'quiz', 'homework', 'project'])->default('assignment');
            $table->integer('total_marks')->default(100);
            $table->date('due_date')->nullable();
            $table->dateTime('start_time')->nullable(); // for quizzes
            $table->dateTime('end_time')->nullable();   // for quizzes
            $table->enum('scope', ['class', 'section', 'individual'])->default('class');
            $table->enum('status', ['draft', 'published', 'closed'])->default('draft');
            $table->json('attachments')->nullable();
            $table->timestamps();

            $table->index(['class_id', 'subject_id', 'academic_session_id']);
            $table->index(['created_by', 'status']);
        });

        // For individual student targeting
        Schema::create('assignment_students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_enrollment_id')->constrained()->cascadeOnDelete();
            $table->unique(['assignment_id', 'student_enrollment_id'], 'asgn_students_uniq');
        });

        // Submissions from students
        Schema::create('assignment_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assignment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_enrollment_id')->constrained()->cascadeOnDelete();
            $table->text('answer')->nullable();
            $table->json('attachments')->nullable();
            $table->decimal('marks_obtained', 8, 2)->nullable();
            $table->text('feedback')->nullable();
            $table->enum('status', ['submitted', 'late', 'graded', 'returned'])->default('submitted');
            $table->foreignId('graded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('graded_at')->nullable();
            $table->timestamps();

            $table->unique(['assignment_id', 'student_enrollment_id'], 'asgn_submissions_uniq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignment_submissions');
        Schema::dropIfExists('assignment_students');
        Schema::dropIfExists('assignments');
    }
};
