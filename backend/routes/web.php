<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['app' => 'School Management API', 'version' => '1.0', 'docs' => '/api/v1'];
});
