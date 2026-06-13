<?php

use Illuminate\Support\Facades\Route;
use App\Models\Document; /** test 2 */

Route::get('/', function () {
    return view('welcome');
});


//GEÇİCİ TEST KODU
Route::get('/test-upload', function() {
    return '
        <form action="/api/v1/documents/upload" method="POST" enctype="multipart/form-data" style="padding: 50px; font-family: sans-serif; max-width: 500px; margin: 0 auto; background: #f9fafb; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin-top: 50px;">
            <h2 style="color: #1e3a8a; margin-bottom: 10px;">🚀 Yapay Zeka CV Analiz Testi</h2>
            <p style="color: #4b5563; font-size: 14px; margin-bottom: 20px;">Bilgisayarından bir PDF seçip yüklediğinde, sistem metni söküp yerel yapay zekana (Qwen) gönderecektir.</p>
            
            <input type="file" name="cv_file" required accept=".pdf" style="display: block; margin-bottom: 20px; padding: 10px; background: white; border: 1px solid #d1d5db; border-radius: 5px; width: 100%; box-sizing: border-box;"><br>
            
            <button type="submit" style="padding: 12px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%;">
                Yapay Zekayı Tetikle ve Analiz Et
            </button>
        </form>
    ';
});

/**test2 */
Route::get('/sonuc-gor', function() {
    return response()->json(Document::latest()->first()); 
});