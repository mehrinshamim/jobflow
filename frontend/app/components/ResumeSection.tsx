"use client";

import { useState, useRef, useCallback } from "react";
import { API_URL } from "../lib/api";

type ParseState = "idle" | "parsing" | "done";

export default function ResumeSection() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ParseState>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) return;
    setFile(f);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setState("parsing");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/resumes/upload?user_id=1`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      console.log("Upload successful:", data);
      
      if (data.resume_id) {
        localStorage.setItem("resume_id", data.resume_id.toString());
      }
      
      setState("done");
    } catch (error) {
      console.error("Upload error:", error);
      setState("idle");
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const reset = () => {
    setFile(null);
    setState("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const isDone = state === "done";
  const isParsing = state === "parsing";

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "linear-gradient(135deg, #071020 0%, #0a1628 100%)",
        border: "1px solid rgba(16,185,129,0.15)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.4), 0 0 60px rgba(16,185,129,0.04)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #065f46, #10b981)", boxShadow: "0 4px 16px rgba(16,185,129,0.3)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8L14 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 2v6h6M9 13h6M9 17h4" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h2 style={{ color: "#ecfdf5", fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em" }}>
            Resume
          </h2>
          <p style={{ color: "#2d5c47", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Upload once, apply everywhere
          </p>
        </div>
        {isDone && (
          <div
            className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981", boxShadow: "0 0 6px rgba(16,185,129,0.8)" }} />
            <span style={{ color: "#6ee7b7", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Parsed</span>
          </div>
        )}
      </div>

      {/* Drop zone */}
      {!file && (
        <div
          className="rounded-xl p-8 text-center cursor-pointer transition-all duration-200"
          style={{
            border: `1.5px dashed ${isDragging ? "#34d399" : "rgba(16,185,129,0.28)"}`,
            background: isDragging ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.03)",
            transform: isDragging ? "scale(1.01)" : "scale(1)",
          }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 15V4M12 4L8.5 7.5M12 4l3.5 3.5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p style={{ color: "#a7f3d0", fontWeight: 600, fontSize: "0.875rem" }}>
                Click or drag &amp; drop your resume
              </p>
              <p style={{ color: "#2d5c47", fontWeight: 500, fontSize: "0.75rem", marginTop: "4px" }}>
                PDF only · max 5 MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File chip + status */}
      {file && (
        <div className="animate-slide-up space-y-3">
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8L14 2z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
              <path d="M14 2v6h6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="flex-1 truncate" style={{ color: "#6ee7b7", fontWeight: 600, fontSize: "0.8125rem" }}>
              {file.name}
            </span>
            {!isParsing && (
              <button
                onClick={reset}
                className="flex-shrink-0 p-1.5 rounded-lg"
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {isParsing && (
            <div className="flex items-center gap-2.5">
              <div className="spinner w-4 h-4 rounded-full" style={{ border: "2px solid rgba(16,185,129,0.15)", borderTopColor: "#10b981" }} />
              <span style={{ color: "#6ee7b7", fontSize: "0.8125rem", fontWeight: 500 }}>Parsing resume…</span>
            </div>
          )}

          {isDone && (
            <div
              className="rounded-xl p-4 animate-fade-in"
              style={{ background: "rgba(6,18,32,0.8)", border: "1px solid rgba(16,185,129,0.18)" }}
            >
              <div className="flex items-start gap-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.5" />
                  <path d="M8 12l3 3 5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p style={{ color: "#6ee7b7", fontSize: "0.8125rem", fontWeight: 600 }}>Resume parsed successfully</p>
                  <p style={{ color: "#2d5c47", fontSize: "0.75rem", fontWeight: 500, marginTop: "2px" }}>
                    Ready to search and match jobs
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isParsing && !isDone && (
            <button
              onClick={handleUpload}
              className="w-full mt-2 py-3 rounded-xl font-bold transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(16,185,129,0.4)"
              }}
            >
              Submit Resume
            </button>
          )}
        </div>
      )}
    </div>
  );
}
