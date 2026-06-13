"use client";

import { useMemo, useRef, useState } from "react";
import { uploadCv, waitForAnalysis } from "@/lib/api";
import type { CvDocument, UploadPhase } from "@/lib/types";

const statusLabels: Record<CvDocument["status"], string> = {
  uploaded: "Kuyrukta",
  processing: "Analiz ediliyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "-";

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function scoreTone(score: number): string {
  if (score >= 80) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (score >= 60) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
}

function PdfIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-8 w-8 text-indigo-500 dark:text-indigo-400"
      aria-hidden
    >
      <path
        d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.5 13h7M8.5 16.5h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [document, setDocument] = useState<CvDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isBusy = phase === "uploading" || phase === "analyzing";

  const progressSteps = useMemo(
    () => [
      { key: "upload", label: "Yükleme", active: phase !== "idle" },
      {
        key: "queue",
        label: "Kuyruk",
        active:
          phase === "analyzing" ||
          phase === "completed" ||
          phase === "failed",
      },
      {
        key: "analysis",
        label: "Yapay Zeka",
        active:
          document?.status === "processing" ||
          phase === "completed" ||
          phase === "failed",
      },
      {
        key: "done",
        label: "Sonuç",
        active: phase === "completed" || phase === "failed",
      },
    ],
    [document?.status, phase],
  );

  function pickFile(file: File | undefined) {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Lütfen yalnızca PDF dosyası seçin.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Dosya boyutu en fazla 10 MB olabilir.");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setDocument(null);
    setPhase("idle");
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    pickFile(event.dataTransfer.files[0]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile || isBusy) return;

    setError(null);
    setDocument(null);
    setPhase("uploading");

    try {
      const uploaded = await uploadCv(selectedFile);
      setDocument(uploaded);
      setPhase("analyzing");

      const result = await waitForAnalysis(uploaded.id, {
        onUpdate: setDocument,
      });

      setDocument(result);
      setPhase(result.status === "completed" ? "completed" : "failed");

      if (result.status === "failed") {
        setError(
          "CV analizi tamamlanamadı. Queue worker ve Ollama servisini kontrol edin.",
        );
      }
    } catch (submitError) {
      setPhase("failed");
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Beklenmeyen bir hata oluştu.",
      );
    }
  }

  function resetForm() {
    setSelectedFile(null);
    setDocument(null);
    setError(null);
    setPhase("idle");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-10 flex flex-col gap-6 sm:mb-12">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse-soft" />
          CV Analiz Sistemi
        </div>

        <div className="space-y-4">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            PDF CV&apos;nizi yükleyin,{" "}
            <span className="bg-linear-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent dark:from-indigo-400 dark:to-sky-300">
              yapay zeka analizini
            </span>{" "}
            alın
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            Dosyanız güvenli şekilde backend&apos;e iletilir, PDF metni çıkarılır
            ve yerel Ollama modeli ile puan, özet ve mülakat soruları üretilir.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="card-surface rounded-3xl p-6 sm:p-8">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={[
                "upload-zone rounded-2xl p-8 transition duration-200 sm:p-10",
                isDragging ? "upload-zone-active scale-[1.01]" : "",
              ].join(" ")}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(event) => pickFile(event.target.files?.[0])}
              />

              <div className="flex flex-col items-center gap-5 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10">
                  <PdfIcon />
                </div>

                <div className="rounded-full border border-zinc-200 bg-zinc-100 px-4 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  PDF · maksimum 10 MB
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                      Dosyayı sürükleyip bırakın
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      veya bilgisayarınızdan seçin
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={isBusy}
                    className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    Dosya Seç
                  </button>

                  {selectedFile && !isBusy && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    >
                      Temizle
                    </button>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!selectedFile || isBusy}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-400/70 dark:shadow-indigo-900/30"
              >
                {phase === "uploading"
                  ? "Yükleniyor..."
                  : phase === "analyzing"
                    ? "Analiz ediliyor..."
                    : "CV Analiz Et"}
              </button>

              {document && (
                <span className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  Durum: {statusLabels[document.status]}
                </span>
              )}
            </div>
          </section>
        </form>

        <aside className="space-y-5">
          <section className="card-surface rounded-3xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
              Nasıl çalışır?
            </h2>
            <ol className="mt-4 space-y-4">
              {[
                "PDF CV dosyanızı yükleyin.",
                "Backend metni çıkarır ve kuyruğa alır.",
                "Ollama modeli puan, özet ve sorular üretir.",
              ].map((item, index) => (
                <li
                  key={item}
                  className="flex gap-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </section>

          {phase !== "idle" && (
            <section className="card-surface rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                İşlem Durumu
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {progressSteps.map((step) => (
                  <div
                    key={step.key}
                    className={[
                      "rounded-2xl border px-4 py-3 text-sm font-medium transition",
                      step.active
                        ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200"
                        : "border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-500",
                    ].join(" ")}
                  >
                    {step.label}
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {document?.analysis_result && phase === "completed" && (
        <section className="card-surface mt-8 space-y-8 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
                Analiz Tamamlandı
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {document.original_name}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {formatFileSize(document.file_size)} ·{" "}
                {new Date(document.updated_at).toLocaleString("tr-TR")}
              </p>
            </div>

            <div
              className={[
                "flex min-w-[120px] flex-col items-center rounded-2xl border px-6 py-4 text-center",
                scoreTone(document.analysis_result.score),
              ].join(" ")}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
                Uygunluk Puanı
              </p>
              <p className="mt-1 text-4xl font-bold">
                {document.analysis_result.score}
              </p>
              <p className="mt-1 text-xs opacity-70">/ 100</p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900/70">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              Özet
            </h3>
            <p className="mt-3 leading-7 text-zinc-800 dark:text-zinc-200">
              {document.analysis_result.summary}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              Önerilen Mülakat Soruları
            </h3>
            <ol className="mt-4 space-y-3">
              {document.analysis_result.questions.map((question, index) => (
                <li
                  key={question}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-200"
                >
                  <span className="mr-2 font-semibold text-indigo-600 dark:text-indigo-400">
                    {index + 1}.
                  </span>
                  {question}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}
