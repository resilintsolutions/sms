<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Community Settings (per institution) ──
        Schema::create('community_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('enable_community')->default(false);
            $table->string('who_can_post')->default('SCHOOL_ADMIN_ONLY'); // SCHOOL_ADMIN_ONLY, TEACHERS_ONLY, ALL_VERIFIED_USERS
            $table->boolean('allow_cross_school_comments')->default(true);
            $table->timestamps();
        });

        // ── Community Posts ──
        Schema::create('community_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type'); // ANNOUNCEMENT, COMPETITION, SPORTS, KNOWLEDGE, RESOURCE
            $table->string('title');
            $table->string('title_bn')->nullable();
            $table->text('body')->nullable();
            $table->text('body_bn')->nullable();
            $table->json('tags')->nullable();
            $table->string('visibility_scope')->default('GLOBAL_ALL_SCHOOLS'); // GLOBAL_ALL_SCHOOLS, INVITED_SCHOOLS_ONLY, SAME_SCHOOL_ONLY
            $table->json('allowed_school_ids')->nullable(); // Used when visibility_scope = INVITED_SCHOOLS_ONLY
            $table->string('status')->default('DRAFT'); // DRAFT, PUBLISHED, ARCHIVED
            $table->string('moderation_status')->default('CLEAN'); // CLEAN, FLAGGED, REMOVED
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'moderation_status', 'visibility_scope']);
            $table->index('institution_id');
            $table->index('type');
        });

        // ── Post Attachments ──
        Schema::create('community_post_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('community_post_id')->constrained()->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('file_type')->nullable(); // mime type
            $table->unsignedBigInteger('file_size')->nullable();
            $table->timestamps();
        });

        // ── Post Likes ──
        Schema::create('community_post_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('community_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['community_post_id', 'user_id']); // One like per user per post
        });

        // ── Post Comments ──
        Schema::create('community_post_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('community_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->string('moderation_status')->default('CLEAN'); // CLEAN, FLAGGED, REMOVED
            $table->timestamps();

            $table->index('community_post_id');
        });

        // ── Content Reports (posts & comments) ──
        Schema::create('community_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reporter_institution_id')->constrained('institutions')->cascadeOnDelete();
            $table->nullableMorphs('reportable'); // reportable_type + reportable_id (CommunityPost or CommunityPostComment)
            $table->string('reason'); // SPAM, INAPPROPRIATE, HARASSMENT, MISINFORMATION, OTHER
            $table->text('details')->nullable();
            $table->string('status')->default('PENDING'); // PENDING, REVIEWED, DISMISSED
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        // ── Competition Events ──
        Schema::create('community_competition_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('community_post_id')->nullable()->constrained()->nullOnDelete(); // Linked feed post
            $table->string('title');
            $table->string('title_bn')->nullable();
            $table->text('description')->nullable();
            $table->text('description_bn')->nullable();
            $table->string('category'); // SPORTS, ACADEMIC, CULTURAL, OTHER
            $table->dateTime('start_date_time')->nullable();
            $table->dateTime('end_date_time')->nullable();
            $table->string('location')->nullable();
            $table->date('registration_deadline')->nullable();
            $table->string('status')->default('DRAFT'); // DRAFT, OPEN, CLOSED, COMPLETED, CANCELLED
            $table->string('visibility_scope')->default('GLOBAL_ALL_SCHOOLS');
            $table->json('allowed_school_ids')->nullable();
            $table->timestamps();

            $table->index(['status', 'visibility_scope']);
        });

        // ── Competition Invitations ──
        Schema::create('community_competition_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('competition_event_id')->constrained('community_competition_events')->cascadeOnDelete();
            $table->foreignId('institution_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('PENDING'); // PENDING, ACCEPTED, DECLINED
            $table->foreignId('responded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->unique(['competition_event_id', 'institution_id'], 'cc_inv_event_inst_unique');
        });

        // ── Community Audit Log ──
        Schema::create('community_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('institution_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action'); // post.created, post.published, post.removed, report.created, competition.invite.accepted, etc.
            $table->nullableMorphs('auditable'); // The target entity
            $table->json('meta')->nullable(); // Extra context
            $table->timestamps();

            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_audit_logs');
        Schema::dropIfExists('community_competition_invitations');
        Schema::dropIfExists('community_competition_events');
        Schema::dropIfExists('community_reports');
        Schema::dropIfExists('community_post_comments');
        Schema::dropIfExists('community_post_likes');
        Schema::dropIfExists('community_post_attachments');
        Schema::dropIfExists('community_posts');
        Schema::dropIfExists('community_settings');
    }
};
