import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const ORANGE_BIN =
  process.env.ORANGE_BIN || "/home/client_1764_3/.cargo/bin/orange";
const ORANGE_CONFIG =
  process.env.ORANGE_CONFIG ||
  "/home/client_1764_3/waffleclaw/store/orange-wallet/config.toml";

export interface OrangeInvoice {
  invoice: string;
  address: string | null;
  amount_sats: number;
  full_uri: string;
  from_trusted: boolean;
}

export async function createInvoice(amountSats: number): Promise<OrangeInvoice> {
  const { stdout } = await execFileAsync(ORANGE_BIN, [
    "--config",
    ORANGE_CONFIG,
    "receive",
    "--amount",
    String(amountSats),
  ]);
  return JSON.parse(stdout);
}
