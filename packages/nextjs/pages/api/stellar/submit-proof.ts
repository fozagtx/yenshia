import { TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";
import type { NextApiRequest, NextApiResponse } from "next";

type SubmitProofRequest = {
  signedTransactionXdr?: unknown;
};

type SubmitProofResponse =
  | {
      success: true;
      hash: string;
      submitStatus: "PENDING" | "DUPLICATE";
      finalStatus: "SUCCESS";
      latestLedger: number;
      ledger: number;
      resultXdr: string;
      resultMetaXdr: string;
      returnValueXdr?: string;
    }
  | {
      success: false;
      error: string;
      hash?: string;
      submitStatus?: string;
      finalStatus?: string;
      latestLedger?: number;
      ledger?: number;
      resultXdr?: string;
      diagnosticEventsXdr?: string[];
    };

const getPositiveIntegerEnv = (name: string, defaultValue: number) => {
  const value = process.env[name];
  if (!value) return defaultValue;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getRequiredConfig = () => {
  const rpcUrl = process.env.STELLAR_RPC_URL;
  const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE;

  if (!rpcUrl || !networkPassphrase) {
    throw new Error("STELLAR_RPC_URL and STELLAR_NETWORK_PASSPHRASE are required.");
  }

  return { rpcUrl, networkPassphrase };
};

const getSignedTransaction = (signedTransactionXdr: string, networkPassphrase: string) => {
  const transaction = TransactionBuilder.fromXDR(signedTransactionXdr, networkPassphrase);

  if (transaction.signatures.length === 0) {
    throw new Error("Signed Stellar transaction XDR is required.");
  }

  const hasSorobanInvocation = transaction.operations.some(operation => operation.type === "invokeHostFunction");
  if (!hasSorobanInvocation) {
    throw new Error("The signed transaction must invoke a Soroban verifier contract.");
  }

  return transaction;
};

const pollForFinalStatus = async (
  server: rpc.Server,
  hash: string,
  attempts: number,
  intervalMs: number,
): Promise<rpc.Api.GetTransactionResponse | null> => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const transaction = await server.getTransaction(hash);
    if (transaction.status !== rpc.Api.GetTransactionStatus.NOT_FOUND) {
      return transaction;
    }

    await sleep(intervalMs);
  }

  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<SubmitProofResponse>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Only POST requests are allowed." });
  }

  const { signedTransactionXdr } = req.body as SubmitProofRequest;
  if (typeof signedTransactionXdr !== "string" || signedTransactionXdr.trim().length === 0) {
    return res.status(400).json({ success: false, error: "signedTransactionXdr is required." });
  }

  try {
    const { rpcUrl, networkPassphrase } = getRequiredConfig();
    const pollAttempts = getPositiveIntegerEnv("STELLAR_SUBMIT_POLL_ATTEMPTS", 30);
    const pollIntervalMs = getPositiveIntegerEnv("STELLAR_SUBMIT_POLL_INTERVAL_MS", 1000);
    const transaction = getSignedTransaction(signedTransactionXdr.trim(), networkPassphrase);
    const server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });

    const submitResult = await server.sendTransaction(transaction);
    if (submitResult.status !== "PENDING" && submitResult.status !== "DUPLICATE") {
      return res.status(400).json({
        success: false,
        hash: submitResult.hash,
        submitStatus: submitResult.status,
        error: submitResult.errorResult?.toXDR("base64") || "Stellar RPC rejected the signed transaction.",
        latestLedger: submitResult.latestLedger,
      });
    }

    const finalResult = await pollForFinalStatus(server, submitResult.hash, pollAttempts, pollIntervalMs);
    if (!finalResult) {
      return res.status(202).json({
        success: false,
        hash: submitResult.hash,
        submitStatus: submitResult.status,
        finalStatus: "PENDING",
        latestLedger: submitResult.latestLedger,
        error: "Transaction was submitted but did not finalize before the polling window closed.",
      });
    }

    if (finalResult.status === rpc.Api.GetTransactionStatus.FAILED) {
      return res.status(200).json({
        success: false,
        hash: finalResult.txHash,
        submitStatus: submitResult.status,
        finalStatus: finalResult.status,
        latestLedger: finalResult.latestLedger,
        ledger: finalResult.ledger,
        resultXdr: finalResult.resultXdr.toXDR("base64"),
        diagnosticEventsXdr: finalResult.diagnosticEventsXdr?.map((event: xdr.DiagnosticEvent) =>
          event.toXDR("base64"),
        ),
        error: "Stellar network finalized the transaction as failed.",
      });
    }

    if (finalResult.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      return res.status(202).json({
        success: false,
        hash: finalResult.txHash,
        submitStatus: submitResult.status,
        finalStatus: finalResult.status,
        latestLedger: finalResult.latestLedger,
        error: "Transaction has not finalized successfully.",
      });
    }

    return res.status(200).json({
      success: true,
      hash: finalResult.txHash,
      submitStatus: submitResult.status,
      finalStatus: finalResult.status,
      latestLedger: finalResult.latestLedger,
      ledger: finalResult.ledger,
      resultXdr: finalResult.resultXdr.toXDR("base64"),
      resultMetaXdr: finalResult.resultMetaXdr.toXDR("base64"),
      returnValueXdr: finalResult.returnValue?.toXDR("base64"),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Stellar transaction submission error.";
    return res.status(400).json({ success: false, error: message });
  }
}
