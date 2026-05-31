"use client";

import { useState } from "react";
import type { Job } from "../types";
import { API_URL } from "../lib/api";

const MOCK_JOBS: Job[] = [
  {
    id: 1,
    title: "Senior Frontend Engineer",
    company: "Vercel",
    description: "We're looking for a senior frontend engineer to join our growth team. You'll work closely with design and backend teams to build fast, accessible, and delightful user interfaces. Experience with React, TypeScript, and Next.js required.",
    url: "https://www.linkedin.com/jobs/view/example1",
    score: 9,
    fit_reasoning: "Exceptional match — your 5 years of React/TypeScript experience aligns perfectly with the role. Next.js expertise is a direct requirement you satisfy.",
    status: "scored",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Full Stack Engineer",
    company: "Linear",
    description: "Join Linear's small, high-output engineering team. You'll own features end-to-end, from database schema to pixel-perfect UI. We use TypeScript throughout — React on the frontend, Node on the backend.",
    url: "https://www.linkedin.com/jobs/view/example2",
    score: 8,
    fit_reasoning: "Strong fit — full-stack TypeScript experience matches well. Linear values autonomy and ownership, which aligns with your background in product-focused roles.",
    status: "scored",
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    title: "Software Engineer, Platform",
    company: "Stripe",
    description: "Stripe's platform team builds the infrastructure that powers payments for millions of businesses worldwide. You'll work on high-scale distributed systems, API design, and developer tooling.",
    url: "https://www.linkedin.com/jobs/view/example3",
    score: 7,
    fit_reasoning: "Good fit — your API design experience is relevant. The role leans more infrastructure-heavy than your recent work, but your fundamentals are solid.",
    status: "scored",
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    title: "React Engineer",
    company: "Figma",
    description: "Help build Figma's collaborative design tool used by millions. The UI Engineering team works on performance-critical rendering, real-time collaboration features, and plugin APIs.",
    url: "https://www.linkedin.com/jobs/view/example4",
    score: 8,
    fit_reasoning: "Strong match — React expertise and attention to UI performance are both requirements you meet. Collaborative product environment suits your background.",
    status: "scored",
    created_at: new Date().toISOString(),
  },
  {
    id: 5,
    title: "Backend Engineer, Data",
    company: "Notion",
    description: "Work on Notion's data infrastructure — pipelines, ETL, and storage systems that power analytics and ML features. Python and SQL expertise needed.",
    url: null,
    score: 5,
    fit_reasoning: "Partial match — the role is backend/data-focused with Python, which differs from your primary frontend stack. Consider if this aligns with your goals.",
    status: "scored",
    created_at: new Date().toISOString(),
  },
  {
    id: 6,
    title: "Frontend Engineer, Design Systems",
    company: "Airbnb",
    description: "Build and maintain Airbnb's design system used across all products. Deep expertise in accessibility, component APIs, and cross-platform consistency required.",
    url: "https://www.linkedin.com/jobs/view/example6",
    score: 9,
    fit_reasoning: "Excellent fit — your component library and accessibility work is a direct match. Design systems experience is exactly what this team needs.",
    status: "scored",
    created_at: new Date().toISOString(),
  },
];

type SearchPhase = "idle" | "searching" | "done";

interface Props {
  onJobsFound: (jobs: Job[]) => void;
}

export default function JobSearchWithResults({ onJobsFound }: Props) {
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState(10);
  const [phase, setPhase] = useState<SearchPhase>("idle");
  const [resultCount, setResultCount] = useState(0);
  const [loadingStep, setLoadingStep] = useState({ title: "Searching LinkedIn", subtitle: "Fetching and ranking top matching roles…" });

  const canSearch = role.trim().length > 0 && location.trim().length > 0;
  const isLoading = phase === "searching";

  const handleSearch = async () => {
    if (!canSearch || isLoading) return;

    const resumeId = localStorage.getItem("resume_id");
    if (!resumeId) {
      alert("Please upload and parse your resume first!");
      return;
    }

    onJobsFound([]);
    setPhase("searching");
    setLoadingStep({ title: "Discovering Jobs", subtitle: "Scraping UI for matches..." });

    try {
      // 1. Discover Jobs
      const discoverRes = await fetch(`${API_URL}/jobs/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: 1, title: role, location, limit }),
      });

      if (!discoverRes.ok) throw new Error("Discovery request failed");

      const { task_id: discover_task_id, search_id } = await discoverRes.json();
      console.log("Started discovery task:", discover_task_id, "search_id:", search_id);
      localStorage.setItem("discover_task_id", discover_task_id);
      localStorage.setItem("search_id", search_id.toString());

      // Poll Discovery
      while (true) {
        console.log(`Polling discover status for task ${discover_task_id}...`);
        const statusRes = await fetch(`${API_URL}/jobs/discover/${discover_task_id}/status`);
        const statusData = await statusRes.json();
        console.log(`Discover task state:`, statusData.state);

        if (statusData.state === "SUCCESS") break;
        if (statusData.state === "FAILURE") throw new Error("Discovery task failed");
        await new Promise(r => setTimeout(r, 2000));
      }

      // 2. Score Batch
      setLoadingStep({ title: "Scoring Fits", subtitle: "AI is evaluating jobs against your resume..." });
      const scoreRes = await fetch(`${API_URL}/jobs/score/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: 1, resume_id: parseInt(resumeId, 10), search_id }),
      });

      if (!scoreRes.ok) throw new Error("Scoring request failed");

      const { task_id: score_task_id } = await scoreRes.json();
      console.log("Started scoring task:", score_task_id);
      localStorage.setItem("scoring_task_id", score_task_id);

      // Poll Scoring
      while (true) {
        console.log(`Polling scoring status for task ${score_task_id}...`);
        const sRes = await fetch(`${API_URL}/jobs/score/${score_task_id}/status`);
        const sData = await sRes.json();
        console.log(`Scoring task state:`, sData.state);

        if (sData.state === "SUCCESS") break;
        if (sData.state === "FAILURE") throw new Error("Scoring task failed");
        await new Promise(r => setTimeout(r, 2500));
      }

      // 3. List Jobs
      setLoadingStep({ title: "Loading Results", subtitle: "Fetching your prioritized jobs..." });
      const listRes = await fetch(`${API_URL}/jobs/?user_id=1&search_id=${search_id}`);
      if (!listRes.ok) throw new Error("Failed to fetch final jobs list");

      const finalJobs = await listRes.json();
      setResultCount(finalJobs.length);
      onJobsFound(finalJobs);
      setPhase("done");

    } catch (error) {
      console.error("Search workflow error:", error);
      alert("An error occurred during the job search process.");
      setPhase("idle");
    }
  };

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
            <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h2 style={{ color: "#ecfdf5", fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em" }}>
            Find Jobs
          </h2>
          <p style={{ color: "#2d5c47", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            LinkedIn · AI-ranked results
          </p>
        </div>
        {phase === "done" && resultCount > 0 && (
          <div
            className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981", boxShadow: "0 0 6px rgba(16,185,129,0.8)" }} />
            <span style={{ color: "#6ee7b7", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {resultCount} Found
            </span>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="7" width="20" height="14" rx="2" stroke="#2d5c47" strokeWidth="2" />
              <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="#2d5c47" strokeWidth="2" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Job role  (e.g. Frontend Engineer)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isLoading}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-9 pr-4 py-3 rounded-xl outline-none transition-all duration-200"
            style={{
              background: "rgba(16,185,129,0.04)",
              border: "1px solid rgba(16,185,129,0.18)",
              color: "#ecfdf5",
              fontSize: "0.875rem",
              fontWeight: 500,
              fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(16,185,129,0.45)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(16,185,129,0.18)")}
          />
        </div>

        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#2d5c47" strokeWidth="2" />
              <circle cx="12" cy="9" r="2.5" stroke="#2d5c47" strokeWidth="2" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Location  (e.g. Remote, New York)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isLoading}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-9 pr-4 py-3 rounded-xl outline-none transition-all duration-200"
            style={{
              background: "rgba(16,185,129,0.04)",
              border: "1px solid rgba(16,185,129,0.18)",
              color: "#ecfdf5",
              fontSize: "0.875rem",
              fontWeight: 500,
              fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(16,185,129,0.45)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(16,185,129,0.18)")}
          />
        </div>

        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="#2d5c47" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <input
            type="number"
            placeholder="Result limit  (e.g. 10)"
            value={limit}
            min={1}
            max={50}
            onChange={(e) => setLimit(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
            disabled={isLoading}
            className="w-full pl-9 pr-4 py-3 rounded-xl outline-none transition-all duration-200"
            style={{
              background: "rgba(16,185,129,0.04)",
              border: "1px solid rgba(16,185,129,0.18)",
              color: "#ecfdf5",
              fontSize: "0.875rem",
              fontWeight: 500,
              fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = "rgba(16,185,129,0.45)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(16,185,129,0.18)")}
          />
        </div>

        <p className="flex items-center gap-1.5" style={{ color: "#2d5c47", fontSize: "0.75rem", fontWeight: 500 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#2d5c47" strokeWidth="2" />
            <path d="M12 8v4M12 16h.01" stroke="#2d5c47" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Upload your resume to unlock AI fit scores
        </p>
      </div>

      {/* Search button */}
      <button
        onClick={handleSearch}
        disabled={!canSearch || isLoading}
        className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl transition-all duration-200"
        style={{
          background: canSearch && !isLoading ? "linear-gradient(135deg, #059669, #10b981)" : "rgba(16,185,129,0.1)",
          color: canSearch && !isLoading ? "#ecfdf5" : "#2d5c47",
          fontWeight: 700,
          fontSize: "0.9375rem",
          fontFamily: "inherit",
          letterSpacing: "-0.01em",
          cursor: canSearch && !isLoading ? "pointer" : "not-allowed",
          boxShadow: canSearch && !isLoading ? "0 4px 20px rgba(16,185,129,0.28)" : "none",
          border: "none",
        }}
        onMouseEnter={(e) => {
          if (canSearch && !isLoading) {
            e.currentTarget.style.background = "linear-gradient(135deg, #047857, #059669)";
            e.currentTarget.style.boxShadow = "0 6px 28px rgba(16,185,129,0.45)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          if (canSearch && !isLoading) {
            e.currentTarget.style.background = "linear-gradient(135deg, #059669, #10b981)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(16,185,129,0.28)";
            e.currentTarget.style.transform = "translateY(0)";
          }
        }}
      >
        {isLoading ? (
          <>
            <div className="spinner w-4 h-4 rounded-full flex-shrink-0" style={{ border: "2px solid rgba(16,185,129,0.2)", borderTopColor: "#6ee7b7" }} />
            <span>Finding jobs…</span>
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Search Jobs
          </>
        )}
      </button>

      {/* Loading hint */}
      {isLoading && (
        <div className="mt-4 animate-fade-in">
          <div
            className="rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <p style={{ color: "#6ee7b7", fontSize: "0.8125rem", fontWeight: 600 }}>{loadingStep.title}</p>
              <p style={{ color: "#2d5c47", fontSize: "0.75rem", fontWeight: 500, marginTop: "2px" }}>
                {loadingStep.subtitle}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
