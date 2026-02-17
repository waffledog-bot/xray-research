export async function GET() {
  return Response.json({
    hasMdkToken: !!process.env.MDK_ACCESS_TOKEN,
    hasMdkMnemonic: !!process.env.MDK_MNEMONIC,
    hasXaiKey: !!process.env.XAI_API_KEY,
    tokenPrefix: process.env.MDK_ACCESS_TOKEN?.substring(0, 6) || "missing",
  });
}
