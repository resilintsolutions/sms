<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

Illuminate\Support\Facades\Schema::dropIfExists('assignment_submissions');
Illuminate\Support\Facades\Schema::dropIfExists('assignment_students');
Illuminate\Support\Facades\Schema::dropIfExists('assignments');
echo "Dropped all 3 tables\n";
