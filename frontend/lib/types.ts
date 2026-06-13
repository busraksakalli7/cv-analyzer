export type DocumentStatus =
  | "uploaded"
  | "processing"
  | "completed"
  | "failed";

export type AnalysisResult = {
  score: number;
  summary: string;
  questions: string[];
};

export type CvDocument = {
  id: number;
  original_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  status: DocumentStatus;
  extracted_text: string | null;
  analysis_result: AnalysisResult | null;
  created_at: string;
  updated_at: string;
};

export type UploadResponse = {
  message: string;
  data: CvDocument;
};

export type DocumentResponse = {
  data: CvDocument;
};

export type UploadPhase =
  | "idle"
  | "uploading"
  | "analyzing"
  | "completed"
  | "failed";
