import { useEffect, useState } from "react";
import { useSendMessage } from "./useSendMessage";
import { generateEncryptionClient, useDerivedAccount } from "~~/sdk/crypto";
import { cleanDisplayName } from "~~/sdk/display-name";
import { useStellarWallet } from "~~/sdk/stellar-wallet";

const RELAY_FINDING_PEERS_MESSAGE = "Private relay is finding peers.";

interface UseSendLocationParams {
  displayName?: string;
  enabled?: boolean;
  linkPublicKey?: `0x${string}`;
  participantId?: string;
  recipientPublicKey?: `0x${string}`;
}

export const useSendLocation = ({
  displayName,
  enabled = true,
  linkPublicKey,
  participantId,
  recipientPublicKey,
}: UseSendLocationParams) => {
  const { address } = useStellarWallet();
  const { derivedAccount } = useDerivedAccount();
  const { relayError, relayReady, relayStatus, send } = useSendMessage();
  const canShareLocation =
    enabled &&
    !!address &&
    !!linkPublicKey &&
    !!participantId &&
    !!recipientPublicKey &&
    !!derivedAccount &&
    relayReady;
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isGeolocationAvailable, setIsGeolocationAvailable] = useState(true);
  const [isGeolocationEnabled, setIsGeolocationEnabled] = useState(false);
  const [locationError, setLocationError] = useState<Error | null>(null);
  const [sendError, setSendError] = useState<Error | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setIsGeolocationAvailable(false);
      setIsGeolocationEnabled(false);
      return;
    }

    setIsGeolocationAvailable(true);

    const watchId = navigator.geolocation.watchPosition(
      position => {
        setIsGeolocationEnabled(true);
        setLocationError(null);
        setSendError(null);
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      error => {
        setIsGeolocationEnabled(false);
        setLocationError(error instanceof Error ? error : new Error(error.message || "Location access failed."));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled]);

  useEffect(() => {
    if (
      !canShareLocation ||
      !address ||
      !coords ||
      !derivedAccount ||
      !linkPublicKey ||
      !participantId ||
      !recipientPublicKey ||
      !relayReady
    )
      return;

    let stopped = false;

    const callback = async () => {
      const message = {
        displayName: cleanDisplayName(displayName),
        latitude: coords.latitude,
        longitude: coords.longitude,
        linkPublicKey,
        participantId,
        recipientPublicKey,
        senderPublicKey: derivedAccount.publicKey,
        senderAddress: address,
        sentAt: Date.now(),
      };

      const encryptionClient = generateEncryptionClient(recipientPublicKey);

      const encryptedMessage = await encryptionClient.encryptMessage(JSON.stringify(message));
      const stringifiedEncryptedMessage = JSON.stringify(encryptedMessage);

      if (!stopped) {
        await send({ message: stringifiedEncryptedMessage, sender: address });
        setSendError(null);
        setLastSentAt(Date.now());
      }
    };

    const publishLocation = () => {
      void callback().catch(error => {
        if (error instanceof Error && error.message === RELAY_FINDING_PEERS_MESSAGE) {
          setSendError(null);
          return;
        }

        setSendError(error instanceof Error ? error : new Error("Location could not be sent."));
      });
    };

    publishLocation();
    const intervalId = setInterval(() => {
      publishLocation();
    }, 3000);

    return () => {
      stopped = true;
      clearInterval(intervalId);
    };
  }, [
    send,
    canShareLocation,
    coords,
    address,
    linkPublicKey,
    participantId,
    recipientPublicKey,
    derivedAccount,
    displayName,
    relayReady,
  ]);

  return {
    coords,
    isGeolocationAvailable,
    isGeolocationEnabled,
    lastSentAt,
    locationError,
    relayError,
    relayReady,
    relayStatus,
    sendError,
  };
};
