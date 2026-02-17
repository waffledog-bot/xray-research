"use client";

import { useCheckoutSuccess } from "@moneydevkit/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function ResultsContent() {
  const { isCheckoutPaidLoading, isCheckoutPaid } = useCheckoutSuccess();
  const searchParams = useSearchParams();
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState(false);

  const mode = searchParams.get("mode") || "search";

  useEffect(() => {
    if (!isCheckoutPaid || fetched) return;
    setFetched(true);
    setLoading(true);

    const body: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      body[key] = value;
    });

    fetch("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setHtml(data.html);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isCheckoutPaid, fetched, searchParams]);

  if (isCheckoutPaidLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚡</div>
          <p className="text-gray-400">Verifying payment…</p>
        </div>
      </div>
    );
  }

  if (!isCheckoutPaid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-300 font-semibold mb-2">Payment not confirmed</p>
          <p className="text-gray-500 text-sm">
            The payment could not be verified. Please try again.
          </p>
          <a
            href="/"
            className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm"
          >
            ← Back to X-Ray
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">🔍</div>
          <p className="text-gray-300 font-semibold">Researching X/Twitter…</p>
          <p className="text-gray-500 text-sm mt-2">
            Grok is searching and analyzing tweets. This may take 15-30 seconds.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 font-semibold mb-2">Research Error</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <a
            href="/"
            className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm"
          >
            ← Back to X-Ray
          </a>
        </div>
      </div>
    );
  }

  const modeLabel =
    mode === "search"
      ? "Search"
      : mode === "topic"
      ? "Topic Analysis"
      : mode === "account"
      ? "Account Analysis"
      : "Ask";

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/" className="text-blue-400 hover:text-blue-300 text-sm">
              ← New Research
            </a>
            <h1 className="text-2xl font-bold mt-2">
              <span className="text-blue-400">X</span>-Ray {modeLabel} Report
            </h1>
          </div>
          <div className="text-xs text-gray-600">
            {new Date().toLocaleDateString()}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div
            className="report-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-4xl animate-pulse">⚡</div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
