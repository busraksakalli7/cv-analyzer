<?php

namespace App\Jobs;

use App\Models\Document;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Symfony\Component\Process\Process;

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
            $fullPath = storage_path('app/private/' . str_replace('/', DIRECTORY_SEPARATOR, $document->file_path));

            if (!file_exists($executablePath)) {
                throw new \RuntimeException("pdftotext.exe bulunamadı: {$executablePath}");
            }

            if (!file_exists($fullPath)) {
                throw new \RuntimeException("PDF dosyası bulunamadı: {$fullPath}");
            }

            // Windows'ta spatie/pdf-to-text is_readable() yüzünden hata verebiliyor; Process doğrudan kullanılır.
            $process = new Process([$executablePath, $fullPath, '-']);
            $process->setTimeout(120);
            $process->run();

            if (!$process->isSuccessful()) {
                throw new \RuntimeException(
                    'pdftotext hatası: ' . trim($process->getErrorOutput() ?: $process->getOutput())
                );
            }

            $text = trim($process->getOutput());
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

        } catch (\Throwable $e) {
            Log::error('CV analizi başarısız', [
                'document_id' => $this->documentId,
                'message' => $e->getMessage(),
            ]);

            $document->update([
                'status' => 'failed',
                'analysis_result' => [
                    'error' => $e->getMessage(),
                ],
            ]);
        }
    }
}