import type {
  CvDocument,
  DocumentResponse,
  UploadResponse,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json();

    if (typeof body.message === "string") {
      return body.message;
    }

    if (body.errors && typeof body.errors === "object") {
      const firstError = Object.values(body.errors)[0];

      if (Array.isArray(firstError) && firstError[0]) {
        return String(firstError[0]);
      }
    }
  } catch {
    // JSON parse hatasında varsayılan mesaj kullanılır.
  }

  return `İstek başarısız oldu (HTTP ${response.status}).`;
}

export async function uploadCv(file: File): Promise<CvDocument> {
  const formData = new FormData();
  formData.append("cv_file", file);

  const response = await fetch(`${API_BASE}/api/v1/documents/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as UploadResponse;
  return body.data;
}

export async function fetchDocument(id: number): Promise<CvDocument> {
  const response = await fetch(`${API_BASE}/api/v1/documents/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const body = (await response.json()) as DocumentResponse;

  if (!body.data?.id || !body.data?.status) {
    throw new Error("Geçersiz sunucu yanıtı alındı. Backend bağlantısını kontrol edin.");
  }

  return body.data;
}

export async function waitForAnalysis(
  id: number,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    onUpdate?: (document: CvDocument) => void;
  },
): Promise<CvDocument> {
  const intervalMs = options?.intervalMs ?? 2000;
  const timeoutMs = options?.timeoutMs ?? 300000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const document = await fetchDocument(id);
    options?.onUpdate?.(document);

    if (document.status === "completed" || document.status === "failed") {
      return document;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Analiz zaman aşımına uğradı. Lütfen daha sonra tekrar deneyin.");
}
