"use client";

import { useState } from "react";
import { useCheckout } from "@moneydevkit/nextjs";

type Mode = "search" | "topic" | "account" | "ask";

const modes: { id: Mode; label: string; icon: string; desc: string }[] = [
  {
    id: "search",
    label: "Search",
    icon: "🔍",
    desc: "Find top/viral tweets on any topic with engagement metrics",
  },
  {
    id: "topic",
    label: "Topic Analysis",
    icon: "⚖️",
    desc: "Define two sides of a debate, see which camp wins on X",
  },
  {
    id: "account",
    label: "Account Analysis",
    icon: "👤",
    desc: "Analyze any account's positions across topics you define",
  },
  {
    id: "ask",
    label: "Ask",
    icon: "💬",
    desc: "Ask any natural language question about an account",
  },
];

export default function HomePage() {
  const { createCheckout, isLoading } = useCheckout();
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [handle, setHandle] = useState("");
  const [side1, setSide1] = useState("");
  const [side2, setSide2] = useState("");
  const [topics, setTopics] = useState("");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");

  const handleResearch = async () => {
    setError("");

    // Build metadata for the research request
    const metadata: Record<string, string> = { mode };
    if (mode === "search") metadata.query = query;
    if (mode === "topic") {
      metadata.query = query;
      metadata.side1 = side1;
      metadata.side2 = side2;
    }
    if (mode === "account") {
      metadata.handle = handle;
      metadata.topics = topics;
    }
    if (mode === "ask") {
      metadata.handle = handle;
      metadata.question = question;
    }

    const successUrl = `/results?${new URLSearchParams(metadata).toString()}`;

    const result = await createCheckout({
      type: "AMOUNT",
      amount: 1000,
      title: "X-Ray Research Report",
      description: `AI-powered X/Twitter ${mode} report`,
      currency: "SAT",
      successUrl,
      metadata,
    });

    if (result.error) {
      setError(result.error.message || "Failed to create checkout");
      return;
    }

    window.location.href = result.data.checkoutUrl;
  };

  const isValid = () => {
    if (mode === "search") return query.trim().length > 0;
    if (mode === "topic")
      return query.trim() && side1.trim() && side2.trim();
    if (mode === "account") return handle.trim() && topics.trim();
    if (mode === "ask") return handle.trim() && question.trim();
    return false;
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-8 text-center">
        <h1 className="text-5xl font-bold mb-3 tracking-tight">
          <span className="text-blue-400">X</span>
          <span className="text-gray-300">-Ray</span>
        </h1>
        <p className="text-lg text-gray-400 mb-2">
          AI-powered X/Twitter intelligence
        </p>
        <p className="text-sm text-gray-500">
          Pay per report · No account needed · Powered by Grok + Lightning ⚡
        </p>
      </div>

      {/* Mode Selector */}
      <div className="max-w-4xl mx-auto px-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                mode === m.id
                  ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                  : "border-gray-800 bg-gray-900 hover:border-gray-700"
              }`}
            >
              <div className="text-2xl mb-2">{m.icon}</div>
              <div className="font-semibold text-sm">{m.label}</div>
              <div className="text-xs text-gray-500 mt-1">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 mb-16">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          {mode === "search" && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                What do you want to find on X?
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='e.g. "AI regulation debate" or "Bitcoin ETF reactions"'
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {mode === "topic" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Topic / Debate
                </label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='e.g. "Should AI be open-source?"'
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Side A
                  </label>
                  <input
                    type="text"
                    value={side1}
                    onChange={(e) => setSide1(e.target.value)}
                    placeholder='e.g. "Pro open-source"'
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Side B
                  </label>
                  <input
                    type="text"
                    value={side2}
                    onChange={(e) => setSide2(e.target.value)}
                    placeholder='e.g. "Pro regulation"'
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {mode === "account" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  X Handle
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500">@</span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace("@", ""))}
                    placeholder="elonmusk"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Topics to analyze (comma-separated)
                </label>
                <input
                  type="text"
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="AI, crypto, space exploration, politics"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {mode === "ask" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  X Handle (optional — leave blank for general search)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500">@</span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace("@", ""))}
                    placeholder="elonmusk"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Your question
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What has this person said about Bitcoin in the last month?"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            onClick={handleResearch}
            disabled={!isValid() || isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Creating checkout…</span>
            ) : (
              <>
                <span>⚡</span>
                <span>Research — 1,000 sats</span>
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-600">
            Pay with Lightning. Report generated instantly after payment.
          </p>
        </div>
      </div>
    </div>
  );
}
