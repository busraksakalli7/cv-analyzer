<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route; 
use App\Http\Controllers\DocumentController; 

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Frontendin erişeceği api
            Route::prefix('api/v1') // Tüm adreslerin başına api/v1 ekler
                ->group(function () {
                    // POST metoduyla dosya gönderildiğinde DocumentController içindeki upload fonksiyonunu çalıştır
                    Route::post('/documents/upload', [DocumentController::class, 'upload']);
                });
        }
    )
    ->withMiddleware(function (Middleware $middleware) {
        //
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();