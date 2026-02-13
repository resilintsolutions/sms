<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('institutions', function (Blueprint $table) {
            if (!Schema::hasColumn('institutions', 'custom_domain')) {
                $table->string('custom_domain')->nullable()->after('email');
            }
            if (!Schema::hasColumn('institutions', 'subdomain')) {
                $table->string('subdomain')->nullable()->after('custom_domain');
            }
            if (!Schema::hasColumn('institutions', 'subscription_status')) {
                $table->string('subscription_status', 50)->default('active')->after('is_active');
            }
            if (!Schema::hasColumn('institutions', 'feature_flags')) {
                $table->json('feature_flags')->nullable()->after('subscription_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('institutions', function (Blueprint $table) {
            $table->dropColumn(['custom_domain', 'subdomain', 'subscription_status', 'feature_flags']);
        });
    }
};
