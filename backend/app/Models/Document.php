<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    protected $table = 'cv_documents';
    // Veritabanında otomatik doldurulmasına izin verdiğimiz alanlar:
    protected $fillable = [
        'original_name',
        'file_path',
        'mime_type',
        'file_size',
        'status',
        'extracted_text',
        'analysis_result'
    ];

    // analysis_result alanından veri okurken veya yazarken otomatik JSON dönüşümü yapması için:
    protected $casts = [
        'analysis_result' => 'array',
    ];
}