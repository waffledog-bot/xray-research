"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface CheckoutData {
  id: string;
  status: string;
  bolt11: string;
  amount_sats: number;
}

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<CheckoutData | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/checkout/${id}/status`);
      if (!res.ok) {
        setError("Invoice not found");
        return;
      }
      const json: CheckoutData = await res.json();
      setData(json);
      if (json.status === "complete" || json.status === "paid") {
        router.push(`/results/${id}`);
      }
    } catch {
      // Network error, keep trying
    }
  }, [id, router]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [poll]);

  const copyInvoice = () => {
    if (!data?.bolt11) return;
    navigator.clipboard.writeText(data.bolt11).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-400">{error}</p>
          <a href="/" className="text-blue-400 text-sm mt-4 inline-block">
            ← Back
          </a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-pulse">⚡</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-blue-400">X</span>
            <span className="text-gray-300">-Ray</span>
          </h1>
          <p className="text-gray-400">Pay to generate your report</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
          {/* Amount */}
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-400">
              ⚡ {data.amount_sats.toLocaleString()}
            </div>
            <div className="text-gray-500 text-sm mt-1">sats</div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-gray-400">Waiting for payment…</span>
          </div>

          {/* Invoice */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
              Lightning Invoice
            </label>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400 font-mono break-all leading-relaxed">
                {data.bolt11}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <a
              href={`lightning:${data.bolt11}`}
              className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
            >
              ⚡ Open in Wallet
            </a>
            <button
              onClick={copyInvoice}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {copied ? "✓ Copied!" : "Copy Invoice"}
            </button>
          </div>

          <p className="text-center text-xs text-gray-600">
            This page will update automatically once payment is received
          </p>
        </div>

        <div className="text-center mt-4">
          <a href="/" className="text-gray-600 hover:text-gray-400 text-sm">
            ← Cancel
          </a>
        </div>
      </div>
    </div>
  );
}
