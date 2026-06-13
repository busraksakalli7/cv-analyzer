<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DocumentController;

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
    ]);
});

Route::prefix('v1')->group(function () {
    Route::post('/documents/upload', [DocumentController::class, 'upload']);
    Route::get('/documents/{document}', [DocumentController::class, 'show']);
});
