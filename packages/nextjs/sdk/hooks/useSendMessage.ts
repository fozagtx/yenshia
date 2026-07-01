import { CONTENT_TOPIC, locationMessage } from "../constants";
import { useNode } from "./useNode";

const RELAY_FINDING_PEERS_MESSAGE = "Private relay is finding peers.";
const TRANSIENT_RELAY_ERRORS = new Set([
  "No peer available",
  "No relay peers available",
  "No stream available",
  "No response received",
  "Stream aborted",
  "Service temporarily unavailable",
  "Remote peer rejected",
]);

export const useSendMessage = () => {
  const { data: node, error, status } = useNode();

  const send = async ({ message, sender }: { message: string; sender: string }) => {
    if (!node) {
      throw new Error("Private sharing is still starting.");
    }

    const encoder = node.createEncoder({ contentTopic: CONTENT_TOPIC });
    const protoMessage = locationMessage.create({
      timestamp: Date.now(),
      sender,
      message,
    });
    const serialisedMessage = locationMessage.encode(protoMessage).finish();

    const result = await node.lightPush.send(encoder, {
      payload: serialisedMessage,
    });

    if (result.successes.length === 0) {
      const errors = result.failures?.map(failure => failure.error).filter(Boolean) ?? [];
      const isTransientRelayIssue = errors.length === 0 || errors.some(error => TRANSIENT_RELAY_ERRORS.has(error));
      if (isTransientRelayIssue) {
        throw new Error(RELAY_FINDING_PEERS_MESSAGE);
      }

      const errorReason = errors.length ? ` ${errors.join(", ")}` : "";
      throw new Error(`Private location was not accepted by the relay.${errorReason}`);
    }

    return result;
  };

  return {
    send,
    relayError: error instanceof Error ? error : null,
    relayStatus: status,
    relayReady: !!node,
  };
};
