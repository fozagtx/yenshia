import { BASE_FEE, Contract, StrKey, TransactionBuilder, nativeToScVal, rpc } from "@stellar/stellar-sdk";
import type { NextApiRequest, NextApiResponse } from "next";

type PrepareProofRequest = {
  proofBytesBase64?: unknown;
  publicInputsBase64?: unknown;
  sourceAddress?: unknown;
};

type PrepareProofResponse =
  | {
      success: true;
      contractId: string;
      networkPassphrase: string;
      unsignedTransactionXdr: string;
    }
  | {
      success: false;
      error: string;
    };

const getRequiredConfig = () => {
  const contractId = process.env.YENSHIA_VERIFIER_CONTRACT_ID;
  const rpcUrl = process.env.STELLAR_RPC_URL;
  const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE;

  if (!rpcUrl || !networkPassphrase || !contractId) {
    throw new Error("STELLAR_RPC_URL, STELLAR_NETWORK_PASSPHRASE, and YENSHIA_VERIFIER_CONTRACT_ID are required.");
  }

  if (!StrKey.isValidContract(contractId)) {
    throw new Error("YENSHIA_VERIFIER_CONTRACT_ID must be a valid Stellar contract id.");
  }

  return { contractId, networkPassphrase, rpcUrl };
};

const readBase64Artifact = (value: unknown, envName: string, requestName: string) => {
  const artifact = typeof value === "string" && value.trim() ? value.trim() : process.env[envName]?.trim();

  if (!artifact) {
    throw new Error(`${requestName} is required from a real Noir proof. Only real proof data is accepted.`);
  }

  const bytes = Buffer.from(artifact, "base64");
  if (bytes.length === 0 || bytes.toString("base64").replace(/=+$/, "") !== artifact.replace(/=+$/, "")) {
    throw new Error(`${requestName} must be valid base64 proof data.`);
  }

  return new Uint8Array(bytes);
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<PrepareProofResponse>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Only POST requests are allowed." });
  }

  const { proofBytesBase64, publicInputsBase64, sourceAddress } = req.body as PrepareProofRequest;
  if (typeof sourceAddress !== "string" || !StrKey.isValidEd25519PublicKey(sourceAddress)) {
    return res.status(400).json({ success: false, error: "A real Stellar wallet address is required." });
  }

  try {
    const { contractId, networkPassphrase, rpcUrl } = getRequiredConfig();
    const publicInputs = readBase64Artifact(publicInputsBase64, "YENSHIA_PUBLIC_INPUTS_BASE64", "publicInputsBase64");
    const proofBytes = readBase64Artifact(proofBytesBase64, "YENSHIA_PROOF_BYTES_BASE64", "proofBytesBase64");

    const server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
    const sourceAccount = await server.getAccount(sourceAddress);
    const contract = new Contract(contractId);
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          "verify_location_proof",
          nativeToScVal(publicInputs, { type: "bytes" }),
          nativeToScVal(proofBytes, { type: "bytes" }),
        ),
      )
      .setTimeout(60)
      .build();

    const preparedTransaction = await server.prepareTransaction(transaction);

    return res.status(200).json({
      success: true,
      contractId,
      networkPassphrase,
      unsignedTransactionXdr: preparedTransaction.toXDR(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stellar proof transaction could not be prepared.";
    return res.status(400).json({ success: false, error: message });
  }
}
