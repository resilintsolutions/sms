<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Result Card & Transcript Module — Configurable Bangladesh School System (Class 1–12)
 *
 * This migration adds extensible tables for:
 *  - Exam components (Written, CT, Practical, Viva, etc.)
 *  - Subject-level component rules per exam
 *  - Component-level marks
 *  - Result configuration (promotion rules)
 *  - Attendance summary (for transcript)
 *  - Behavior & co-curricular records
 *  - Teacher remarks
 *  - QR verification tokens
 *
 * Existing tables (exam_terms, marks, results, grade_rules) remain untouched.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─────────────────────────────────────────────────
        // 1. EXAM COMPONENTS (Written, CT, Practical, etc.)
        // ─────────────────────────────────────────────────
        Schema::create('exam_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->string('name');                    // Written, Class Test, Practical, Viva, Assignment, etc.
            $table->string('name_bn')->nullable();
            $table->string('short_code', 20)->nullable(); // WR, CT, PR, VI, AS
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['institution_id', 'is_active']);
        });

        // ─────────────────────────────────────────────────
        // 2. EXAM SUBJECT RULES
        //    Which components apply for a subject in a specific exam, with max marks & weight
        // ─────────────────────────────────────────────────
        Schema::create('exam_subject_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_term_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('component_id')->constrained('exam_components')->cascadeOnDelete();
            $table->unsignedSmallInteger('max_marks')->default(100);   // Max marks for this component
            $table->decimal('weight', 5, 2)->default(1.00);            // Weight multiplier (e.g. 0.20 = 20%)
            $table->boolean('is_optional')->default(false);            // Can mark as N/A
            $table->timestamps();

            $table->unique(
                ['exam_term_id', 'class_id', 'subject_id', 'component_id'],
                'esr_term_class_subj_comp'
            );
            $table->index(['exam_term_id', 'class_id']);
        });

        // ─────────────────────────────────────────────────
        // 3. COMPONENT MARKS
        //    Per-student, per-subject, per-component marks for an exam
        // ─────────────────────────────────────────────────
        Schema::create('component_marks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_term_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_enrollment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('component_id')->constrained('exam_components')->cascadeOnDelete();
            $table->decimal('marks_obtained', 6, 2)->nullable();       // null = absent/not entered
            $table->unsignedSmallInteger('max_marks');
            $table->string('absent_code', 10)->nullable();             // AB, EX (exempt), etc.
            $table->foreignId('entered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['exam_term_id', 'student_enrollment_id', 'subject_id', 'component_id'],
                'cm_term_enroll_subj_comp'
            );
            $table->index(['exam_term_id', 'student_enrollment_id']);
        });

        // ─────────────────────────────────────────────────
        // 4. RESULT CONFIGURATION (Promotion / Fail Rules)
        // ─────────────────────────────────────────────────
        Schema::create('result_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('class_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');                                     // e.g. "Class 1-5 Rules", "SSC Science Rules"

            // Promotion rule type
            $table->enum('fail_criteria', [
                'any_subject_below_pass',       // Fail if ANY subject is below pass marks
                'gpa_below_threshold',          // Fail if overall GPA below threshold
                'fail_count_exceeds',           // Fail if fail_count > N
                'custom',                       // Custom rule (JSON logic)
            ])->default('any_subject_below_pass');

            $table->decimal('pass_marks_percent', 5, 2)->default(33.00);  // Default pass percentage
            $table->decimal('min_gpa', 4, 2)->nullable();                  // Min GPA to pass
            $table->unsignedTinyInteger('max_fail_subjects')->default(0);  // Max allowed fail subjects
            $table->boolean('use_component_marks')->default(false);        // Use component_marks instead of legacy marks
            $table->json('custom_rules')->nullable();                      // Extensible JSON config
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['institution_id', 'is_active']);
        });

        // ─────────────────────────────────────────────────
        // 5. RESULT SUMMARIES (Enhanced — extends results)
        //    Stores computed per-exam or annual aggregates
        // ─────────────────────────────────────────────────
        Schema::create('result_summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_enrollment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('exam_term_id')->nullable()->constrained()->nullOnDelete(); // null = annual
            $table->decimal('total_marks', 8, 2)->default(0);
            $table->decimal('total_full_marks', 8, 2)->default(0);
            $table->decimal('percentage', 5, 2)->nullable();
            $table->decimal('gpa', 4, 2)->nullable();
            $table->string('letter_grade', 5)->nullable();
            $table->unsignedSmallInteger('fail_count')->default(0);
            $table->unsignedInteger('position')->nullable();
            $table->unsignedInteger('total_students')->nullable();
            $table->enum('status', ['pass', 'fail', 'pending', 'withheld'])->default('pending');
            $table->boolean('promoted')->default(false);
            $table->text('remarks')->nullable();
            $table->json('subject_grades')->nullable();                  // Cached JSON: [{subject_id, total, grade, gpa}]
            $table->timestamps();

            $table->unique(
                ['student_enrollment_id', 'exam_term_id'],
                'rs_enrollment_exam'
            );
            $table->index(['institution_id', 'academic_session_id']);
        });

        // ─────────────────────────────────────────────────
        // 6. ATTENDANCE SUMMARIES (for result card)
        // ─────────────────────────────────────────────────
        Schema::create('attendance_summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_enrollment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('exam_term_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('total_days')->default(0);
            $table->unsignedSmallInteger('present_days')->default(0);
            $table->unsignedSmallInteger('absent_days')->default(0);
            $table->unsignedSmallInteger('late_days')->default(0);
            $table->unsignedSmallInteger('leave_days')->default(0);
            $table->decimal('attendance_percent', 5, 2)->nullable();
            $table->timestamps();

            $table->unique(
                ['student_enrollment_id', 'exam_term_id'],
                'as_enrollment_exam'
            );
        });

        // ─────────────────────────────────────────────────
        // 7. BEHAVIOR RECORDS (for result card)
        // ─────────────────────────────────────────────────
        Schema::create('behavior_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_enrollment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('exam_term_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('category', [
                'discipline', 'punctuality', 'cleanliness', 'respect',
                'participation', 'leadership', 'other'
            ])->default('discipline');
            $table->enum('rating', ['excellent', 'very_good', 'good', 'satisfactory', 'needs_improvement'])->default('good');
            $table->text('note')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['student_enrollment_id', 'exam_term_id']);
        });

        // ─────────────────────────────────────────────────
        // 8. CO-CURRICULAR RECORDS
        // ─────────────────────────────────────────────────
        Schema::create('co_curricular_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_enrollment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained()->cascadeOnDelete();
            $table->string('activity');                  // Sports, Debate, Art, Scout, etc.
            $table->string('activity_bn')->nullable();
            $table->string('achievement')->nullable();   // 1st Prize, Participant, Captain, etc.
            $table->string('achievement_bn')->nullable();
            $table->date('activity_date')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['student_enrollment_id', 'academic_session_id'], 'ccr_enrollment_session');
        });

        // ─────────────────────────────────────────────────
        // 9. TEACHER REMARKS (per exam or annual)
        // ─────────────────────────────────────────────────
        Schema::create('teacher_remarks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_enrollment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('exam_term_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('academic_session_id')->constrained()->cascadeOnDelete();
            $table->text('class_teacher_remark')->nullable();
            $table->text('principal_remark')->nullable();
            $table->text('guardian_comment')->nullable();
            $table->foreignId('remarked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['student_enrollment_id', 'exam_term_id'],
                'tr_enrollment_exam'
            );
        });

        // ─────────────────────────────────────────────────
        // 10. VERIFICATION TOKENS (QR code verification)
        // ─────────────────────────────────────────────────
        Schema::create('verification_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->foreignId('student_enrollment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('academic_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('exam_term_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('doc_type', ['result_card', 'transcript', 'certificate'])->default('result_card');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index('token');
            $table->index(['student_enrollment_id', 'exam_term_id']);
        });

        // ─────────────────────────────────────────────────
        // 11. Add name_bn to exam_terms (if not present)
        // ─────────────────────────────────────────────────
        if (!Schema::hasColumn('exam_terms', 'name_bn')) {
            Schema::table('exam_terms', function (Blueprint $table) {
                $table->string('name_bn')->nullable()->after('name');
            });
        }

        // ─────────────────────────────────────────────────
        // 12. Add exam_type to exam_terms for categorization
        // ─────────────────────────────────────────────────
        if (!Schema::hasColumn('exam_terms', 'exam_type')) {
            Schema::table('exam_terms', function (Blueprint $table) {
                $table->string('exam_type', 30)->nullable()->after('name_bn')
                    ->comment('monthly, half_yearly, annual, test, grand_final, etc.');
            });
        }

        // ─────────────────────────────────────────────────
        // 13. Add weight to exam_terms (for grand final calc)
        // ─────────────────────────────────────────────────
        if (!Schema::hasColumn('exam_terms', 'weight')) {
            Schema::table('exam_terms', function (Blueprint $table) {
                $table->decimal('weight', 5, 2)->default(1.00)->after('exam_type')
                    ->comment('Weight for grand final aggregation, e.g. 0.30=30%');
            });
        }
    }

    public function down(): void
    {
        // Drop columns added to exam_terms
        Schema::table('exam_terms', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('exam_terms', 'name_bn')) $cols[] = 'name_bn';
            if (Schema::hasColumn('exam_terms', 'exam_type')) $cols[] = 'exam_type';
            if (Schema::hasColumn('exam_terms', 'weight')) $cols[] = 'weight';
            if (!empty($cols)) $table->dropColumn($cols);
        });

        Schema::dropIfExists('verification_tokens');
        Schema::dropIfExists('teacher_remarks');
        Schema::dropIfExists('co_curricular_records');
        Schema::dropIfExists('behavior_records');
        Schema::dropIfExists('attendance_summaries');
        Schema::dropIfExists('result_summaries');
        Schema::dropIfExists('result_configs');
        Schema::dropIfExists('component_marks');
        Schema::dropIfExists('exam_subject_rules');
        Schema::dropIfExists('exam_components');
    }
};
