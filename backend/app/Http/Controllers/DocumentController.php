<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\Request;
use App\Jobs\AnalyzeCvWithAi;

class DocumentController extends Controller
{
    public function upload(Request $request)
    {
        // 1. GÜVENLİK KONTROLÜ
        $request->validate([
            'cv_file' => 'required|mimes:pdf|max:10240', 
        ]);

        // 2. DOSYAYI KAYDETME
        $file = $request->file('cv_file');
        $path = $file->store('cvs');

        // 3. İLK VERİTABANI KAYDI (Durum: uploaded)
        $document = Document::create([
            'original_name' => $file->getClientOriginalName(),
            'file_path'     => $path,
            'mime_type'     => $file->getMimeType(),
            'file_size'     => $file->getSize(),
            'status'        => 'uploaded', // İlk başta sadece yüklendi diyoruz
        ]);

        // dispatch() komutu bu işi arka plana atar ve kodun alt satıra geçmesini beklemez.
        AnalyzeCvWithAi::dispatch($document->id);

        // 4. ANINDA CEVAP (Kullanıcı sıfır saniye bekler!)
        return response()->json([
            'message' => 'CV başarıyla alındı! Arka planda yapay zeka analizi başlatıldı.',
            'data'    => $document
        ], 202);
    }

    public function show(Document $document)
    {
        return response()->json([
            'data' => $document,
        ]);
    }
}