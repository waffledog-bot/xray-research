"use client";

import { use, useEffect, useState, useCallback } from "react";

interface ResultData {
  status: string;
  html?: string;
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ResultData | null>(null);

  const poll = useCallback(async () => {
    const res = await fetch(`/api/results/${id}`);
    if (!res.ok) return;
    const json: ResultData = await res.json();
    setData(json);
    return json.status;
  }, [id]);

  useEffect(() => {
    poll();
    const interval = setInterval(async () => {
      const status = await poll();
      if (status === "complete" || status === "failed") {
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [poll]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-pulse">⚡</div>
      </div>
    );
  }

  if (data.status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-300 font-semibold mb-2">Payment pending</p>
          <p className="text-gray-500 text-sm">
            Waiting for Lightning payment confirmation.
          </p>
          <a
            href={`/checkout/${id}`}
            className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm"
          >
            ← Back to payment
          </a>
        </div>
      </div>
    );
  }

  if (data.status === "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">🔍</div>
          <p className="text-gray-300 font-semibold">Researching X/Twitter…</p>
          <p className="text-gray-500 text-sm mt-2">
            Grok is searching and analyzing tweets. This may take 15–30 seconds.
          </p>
        </div>
      </div>
    );
  }

  if (data.status === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 font-semibold mb-2">Research Failed</p>
          <p className="text-gray-500 text-sm">
            Something went wrong generating your report. Please contact support.
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

  // Complete — show results
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/" className="text-blue-400 hover:text-blue-300 text-sm">
              ← New Research
            </a>
            <h1 className="text-2xl font-bold mt-2">
              <span className="text-blue-400">X</span>-Ray Report
            </h1>
          </div>
          <div className="text-xs text-gray-600">
            {new Date().toLocaleDateString()}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <div
            className="report-content"
            dangerouslySetInnerHTML={{ __html: data.html! }}
          />
        </div>
      </div>
    </div>
  );
}
