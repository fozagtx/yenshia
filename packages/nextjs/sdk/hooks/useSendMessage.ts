import { CONTENT_TOPIC, locationMessage } from "../constants";
import { useNode } from "./useNode";
import { createEncoder } from "@waku/sdk";

export const useSendMessage = () => {
  const { data: node, error, status } = useNode();

  const send = async ({ message, sender }: { message: string; sender: string }) => {
    if (!node) {
      throw new Error("Private sharing is still starting.");
    }

    const encoder = createEncoder({ contentTopic: CONTENT_TOPIC });
    const protoMessage = locationMessage.create({
      timestamp: Date.now(),
      sender,
      message,
    });
    const serialisedMessage = locationMessage.encode(protoMessage).finish();

    const result = await node.lightPush.send(encoder, {
      payload: serialisedMessage,
    });

    if (result.recipients.length === 0) {
      const errorReason = result.errors?.length ? ` ${result.errors.join(", ")}` : "";
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
