"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

const LIGHTNING_ADDRESS = "xray@breez.tips";
const AMOUNT_SATS = 1000;

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<string>("pending");
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [error, setError] = useState("");

  // Generate QR code for the lightning address
  useEffect(() => {
    QRCode.toDataURL(`lightning:${LIGHTNING_ADDRESS}`, {
      width: 256,
      margin: 2,
      color: { dark: "#ffffff", light: "#111827" },
    }).then(setQrDataUrl);
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/checkout/${id}/status`);
      if (!res.ok) {
        setError("Session not found");
        return;
      }
      const json = await res.json();
      setStatus(json.status);
      if (json.status === "complete" || json.status === "paid") {
        router.push(`/results/${id}`);
      }
    } catch {
      // Network error — keep trying
    }
  }, [id, router]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 2500);
    return () => clearInterval(interval);
  }, [poll]);

  const copyAddress = () => {
    navigator.clipboard.writeText(LIGHTNING_ADDRESS).then(() => {
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
              ⚡ {AMOUNT_SATS.toLocaleString()}
            </div>
            <div className="text-gray-500 text-sm mt-1">sats</div>
          </div>

          {/* QR Code */}
          {qrDataUrl && (
            <div className="flex justify-center">
              <div className="rounded-xl overflow-hidden border border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`Pay to ${LIGHTNING_ADDRESS}`}
                  width={220}
                  height={220}
                />
              </div>
            </div>
          )}

          {/* Lightning Address */}
          <div>
            <label className="block text-xs text-gray-500 mb-2 uppercase tracking-wider">
              Lightning Address
            </label>
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-gray-200 font-mono text-sm">
                {LIGHTNING_ADDRESS}
              </span>
              <button
                onClick={copyAddress}
                className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-gray-400">
              {status === "pending"
                ? "Waiting for payment…"
                : "Payment received — generating report…"}
            </span>
          </div>

          {/* Wallet button */}
          <a
            href={`lightning:${LIGHTNING_ADDRESS}`}
            className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-center"
          >
            ⚡ Open in Wallet
          </a>

          <p className="text-center text-xs text-gray-600">
            Send exactly {AMOUNT_SATS.toLocaleString()} sats. Page updates automatically after payment.
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
