import { useEffect, useState } from "react";
import { CONTENT_TOPIC, locationMessage } from "../constants";
import { useNode } from "./useNode";
import { DecodedMessage, createDecoder } from "@waku/sdk";
import { useDerivedAccountEncryption } from "~~/sdk/crypto";

export const useReceiveLocation = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { data: node } = useNode();
  const { decryptMessage, derivedAccountReady } = useDerivedAccountEncryption();

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!enabled || !node || !derivedAccountReady) return;

    const callback = async (wakuMessage: DecodedMessage) => {
      // Check if there is a payload on the message
      if (!wakuMessage.payload) return;

      const decodedMessage = locationMessage.decode(wakuMessage.payload).toJSON();

      const decryptedMessageField = await decryptMessage(JSON.parse(decodedMessage.message));
      const parsedDecryptedMessageField = JSON.parse(decryptedMessageField);

      setCoords({
        latitude: parsedDecryptedMessageField.latitude,
        longitude: parsedDecryptedMessageField.longitude,
      });
    };

    let unsubscribe: any;

    const subscribe = async () => {
      // Create a message and decoder
      const decoder = createDecoder(CONTENT_TOPIC);

      // Subscribe to content topics and display new messages
      await node.filter.subscribe([decoder], callback);
    };

    subscribe();

    return () => {
      unsubscribe?.();
    };
  }, [enabled, node, decryptMessage, derivedAccountReady]);

  return {
    coords,
  };
};
