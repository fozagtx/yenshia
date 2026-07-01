import { useEffect, useState } from "react";
import { CONTENT_TOPIC, locationMessage } from "../constants";
import { useNode } from "./useNode";
import type { IDecodedMessage } from "@waku/sdk";
import { useDerivedAccount, useDerivedAccountEncryption } from "~~/sdk/crypto";
import { cleanDisplayName } from "~~/sdk/display-name";

type HexPublicKey = `0x${string}`;

type ReceivedLocation = {
  displayName: string;
  latitude: number;
  longitude: number;
  linkPublicKey: HexPublicKey;
  participantId: string;
  recipientPublicKey: HexPublicKey;
  senderAddress: string;
  senderPublicKey: HexPublicKey;
  sentAt: number;
};

const isHexPublicKey = (value: unknown): value is HexPublicKey =>
  typeof value === "string" && /^0x04[0-9a-fA-F]{128}$/.test(value);

const parseLocationPayload = (payload: unknown): ReceivedLocation | null => {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as Record<string, unknown>;
  if (
    typeof candidate.latitude !== "number" ||
    typeof candidate.longitude !== "number" ||
    typeof candidate.participantId !== "string" ||
    candidate.participantId.length === 0 ||
    typeof candidate.senderAddress !== "string" ||
    typeof candidate.sentAt !== "number" ||
    !isHexPublicKey(candidate.linkPublicKey) ||
    !isHexPublicKey(candidate.recipientPublicKey) ||
    !isHexPublicKey(candidate.senderPublicKey)
  ) {
    return null;
  }

  if (candidate.latitude < -90 || candidate.latitude > 90 || candidate.longitude < -180 || candidate.longitude > 180) {
    return null;
  }

  return {
    displayName: cleanDisplayName(candidate.displayName as string | undefined),
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    linkPublicKey: candidate.linkPublicKey,
    participantId: candidate.participantId,
    recipientPublicKey: candidate.recipientPublicKey,
    senderAddress: candidate.senderAddress,
    senderPublicKey: candidate.senderPublicKey,
    sentAt: candidate.sentAt,
  };
};

export const useReceiveLocation = ({
  enabled = true,
  expectedSenderPublicKey,
  linkPublicKey,
  ownParticipantId,
}: {
  enabled?: boolean;
  expectedSenderPublicKey?: HexPublicKey;
  linkPublicKey?: HexPublicKey;
  ownParticipantId?: string;
} = {}) => {
  const { data: node, error: relayError, status: relayStatus } = useNode();
  const { derivedAccount } = useDerivedAccount();
  const { decryptMessage, derivedAccountReady } = useDerivedAccountEncryption();

  const [location, setLocation] = useState<ReceivedLocation | null>(null);
  const [receiveError, setReceiveError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !node || !derivedAccountReady || !derivedAccount || !linkPublicKey || !ownParticipantId) return;

    const decoder = node.createDecoder({ contentTopic: CONTENT_TOPIC });

    const handleMessage = async (wakuMessage: IDecodedMessage) => {
      if (!wakuMessage.payload) return;

      try {
        const decodedMessage = locationMessage.decode(wakuMessage.payload).toJSON();
        const decryptedMessageField = await decryptMessage(JSON.parse(decodedMessage.message));
        const parsedPayload = parseLocationPayload(JSON.parse(decryptedMessageField));

        if (!parsedPayload) {
          setReceiveError(new Error("Received location data was not valid."));
          return;
        }

        if (parsedPayload.recipientPublicKey.toLowerCase() !== derivedAccount.publicKey.toLowerCase()) return;
        if (parsedPayload.linkPublicKey.toLowerCase() !== linkPublicKey.toLowerCase()) return;
        if (
          expectedSenderPublicKey &&
          parsedPayload.senderPublicKey.toLowerCase() !== expectedSenderPublicKey.toLowerCase()
        ) {
          return;
        }
        if (parsedPayload.participantId === ownParticipantId) return;

        setReceiveError(null);
        setLocation(currentLocation => {
          if (currentLocation && currentLocation.sentAt > parsedPayload.sentAt) return currentLocation;
          return parsedPayload;
        });
      } catch {
        // Messages for other Yenshia links share the same public Waku topic and will not decrypt here.
      }
    };

    let cancelled = false;

    const subscribe = async () => {
      await node.filter.subscribe([decoder], handleMessage);
      if (cancelled) return;

      void node.store
        .queryWithOrderedCallback([decoder], handleMessage, {
          paginationForward: false,
          paginationLimit: 25,
          timeStart: new Date(Date.now() - 10 * 60 * 1000),
          timeEnd: new Date(),
        })
        .catch(() => undefined);
    };

    void subscribe().catch(error => {
      setReceiveError(error instanceof Error ? error : new Error("Could not listen for shared location."));
    });

    return () => {
      cancelled = true;
      void node.filter.unsubscribe([decoder]);
    };
  }, [
    enabled,
    node,
    decryptMessage,
    derivedAccountReady,
    derivedAccount,
    expectedSenderPublicKey,
    linkPublicKey,
    ownParticipantId,
  ]);

  return {
    coords: location ? { latitude: location.latitude, longitude: location.longitude } : null,
    location,
    receiveError,
    relayError: relayError instanceof Error ? relayError : null,
    relayReady: !!node,
    relayStatus,
  };
};
