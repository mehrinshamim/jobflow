import { API_BASE_URL } from '../config';

"use client";

import { useState, useRef, useCallback } from "react";

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

      const response = await fetch(`${API_BASE_URL}/resumes/upload?user_id=1`, {
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
        <h2 className="text-xl font-semibold text-white">Resume Parser</h2>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging ? "border-emerald-500 bg-emerald-950/10" : "border-slate-700 hover:border-slate-600"
        }`}
      >
        <input
          type="file"
          ref={inputRef}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          accept=".pdf"
          className="hidden"
        />
        
        {file ? (
          <p className="text-emerald-400 font-medium">{file.name}</p>
        ) : (
          <p className="text-slate-400">
            Drag & drop your PDF resume here, or <span className="text-emerald-400 underline">browse</span>
          </p>
        )}
      </div>

      {/* Actions */}
      {file && (
        <div className="flex gap-3 mt-4">
          {!isDone && (
            <button
              onClick={handleUpload}
              disabled={isParsing}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {isParsing ? "Parsing..." : "Upload & Parse"}
            </button>
          )}
          
          <button
            onClick={reset}
            className="border border-slate-700 hover:border-slate-600 text-slate-300 px-4 py-2 rounded-lg transition-colors"
          >
            {isDone ? "Upload New" : "Cancel"}
          </button>
        </div>
      )}

      {isDone && (
        <p className="mt-3 text-emerald-400 font-medium">✓ Resume uploaded successfully!</p>
      )}
    </div>
  );
}

