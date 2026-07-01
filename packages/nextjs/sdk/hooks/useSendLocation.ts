import { useEffect, useState } from "react";
import { useSendMessage } from "./useSendMessage";
import { generateEncryptionClient, useDerivedAccount } from "~~/sdk/crypto";
import { useStellarWallet } from "~~/sdk/stellar-wallet";

interface UseSendLocationParams {
  enabled?: boolean;
  linkPublicKey?: `0x${string}`;
  participantId?: string;
  recipientPublicKey?: `0x${string}`;
}

export const useSendLocation = ({
  enabled = true,
  linkPublicKey,
  participantId,
  recipientPublicKey,
}: UseSendLocationParams) => {
  const { address } = useStellarWallet();
  const { derivedAccount } = useDerivedAccount();
  const canShareLocation =
    enabled && !!address && !!linkPublicKey && !!participantId && !!recipientPublicKey && !!derivedAccount;
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isGeolocationAvailable, setIsGeolocationAvailable] = useState(true);
  const [isGeolocationEnabled, setIsGeolocationEnabled] = useState(false);
  const [locationError, setLocationError] = useState<Error | null>(null);
  const [sendError, setSendError] = useState<Error | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);

  const { relayError, relayReady, relayStatus, send } = useSendMessage();

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
      !recipientPublicKey
    )
      return;

    let stopped = false;

    const callback = async () => {
      const message = {
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
  }, [send, canShareLocation, coords, address, linkPublicKey, participantId, recipientPublicKey, derivedAccount]);

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
