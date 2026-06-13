"use client";

import { useState } from "react";

export default function Home() {
  const [result, setResult] = useState<string>("Henüz test edilmedi.");

  async function testBackend() {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/health");
      const data = await response.json();

      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult("Backend bağlantısı başarısız.");
      console.error(error);
    }
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>CV Analiz Sistemi</h1>

      <p>Frontend - Backend bağlantı testi</p>

      <button onClick={testBackend}>
        Backend Test Et
      </button>

      <pre style={{ marginTop: 20 }}>
        {result}
      </pre>
    </main>
  );
}