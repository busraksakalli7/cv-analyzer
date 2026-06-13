<?php

namespace App\Jobs;

use App\Models\Document;
use Spatie\PdfToText\Pdf;
use Illuminate\Support\Facades\Http;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class AnalyzeCvWithAi implements ShouldQueue

{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $documentId;
    public $timeout = 300;
    // İşçiye hangi dökümanı işleyeceğini ID olarak fırlatıyoruz
    public function __construct($documentId)
    {
        $this->documentId = $documentId;
    }

    public function handle(): void
    {
        // 1. Veritabanından ilgili dökümanı buluyoruz
        $document = Document::find($this->documentId);
        if (!$document) return;

        // Durumunu hemen 'processing' yapıyoruz ki herkes arkada iş döndüğünü anlasın
        $document->update(['status' => 'processing']);

        try {
            $executablePath = base_path('pdftotext.exe');
            $fullPath = storage_path('app/private/' . $document->file_path);

            // PDF Metnini sökme
            $text = (new Pdf($executablePath))->setPdf($fullPath)->text();
            $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');

            // Metni dökümana hemen kaydedelim
            $document->update(['extracted_text' => $text]);

            // Prompt hazırlığı
            $prompt = "Sen profesyonel bir İnsan Kaynakları (İK) uzmanı yapay zekasın. " .
                      "Sana verilen CV metnini teknik yetenekler, deneyimler ve projeler açısından incele. " .
                      "Bana KESİNLİKLE düz yazı, açıklama veya tebrik mesajı yazma. " .
                      "Sadece ve sadece şu anahtarlara sahip bir JSON objesi döndür: " .
                      "'score' (0-100 arası bir sayı), 'summary' (kısa bir özet), 'questions' (aday için 3 mülakat sorusu içeren bir liste).";

            // Ollama İsteği
            $response = Http::timeout(240)->post('http://localhost:11434/api/chat', [
                'model' => 'qwen3:8b',
                'messages' => [
                    ['role' => 'system', 'content' => $prompt],
                    ['role' => 'user', 'content' => "İşte aday CV metni: " . $text]
                ],
                'stream' => false,
                'format' => 'json',
                'options' => ['temperature' => 0.1]
            ]);

            $aiData = $response->json();
            $rawContent = $aiData['message']['content'] ?? $aiData['response'] ?? null;

            // Parantez cımbızlama filtresi
            $rawContent = trim($rawContent);
            $firstBracket = strpos($rawContent, '{');
            $lastBracket = strrpos($rawContent, '}');

            if ($firstBracket !== false && $lastBracket !== false) {
                $rawContent = substr($rawContent, $firstBracket, ($lastBracket - $firstBracket) + 1);
            }

            $analysisResult = json_decode($rawContent, true);

            // Başarıyla bittiğinde veritabanını güncelle
            $document->update([
                'analysis_result' => $analysisResult,
                'status' => 'completed'
            ]);

        } catch (\Exception $e) {
            // Eğer bir hata olursa döküman kilitli kalmasın, durumunu 'failed' yapalım
            $document->update(['status' => 'failed']);
        }
    }
}