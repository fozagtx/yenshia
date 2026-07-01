import { CONTENT_TOPIC, locationMessage } from "../constants";
import { useNode } from "./useNode";
import { createEncoder } from "@waku/sdk";

export const useSendMessage = () => {
  const { data: node, error, status } = useNode();

  const send = async ({ message, sender }: { message: string; sender: string }) => {
    if (!node) {
      throw new Error("Private sharing is still starting.");
    }

    // Create a message encoder
    const encoder = createEncoder({ contentTopic: CONTENT_TOPIC });

    // Create a new message object
    const protoMessage = locationMessage.create({
      timestamp: Date.now(),
      sender,
      message,
    });

    // Serialise the message using Protobuf
    const serialisedMessage = locationMessage.encode(protoMessage).finish();

    await node.lightPush.send(encoder, {
      payload: serialisedMessage,
    });
  };

  return {
    send,
    relayError: error instanceof Error ? error : null,
    relayStatus: status,
    relayReady: !!node,
  };
};
