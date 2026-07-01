import { useEffect, useState } from "react";
import { useSendMessage } from "./useSendMessage";
import { useGeolocated } from "react-geolocated";
import { generateEncryptionClient, useDerivedAccount } from "~~/sdk/crypto";
import { useStellarWallet } from "~~/sdk/stellar-wallet";

interface UseSendLocationParams {
  linkPublicKey?: `0x${string}`;
  recipientPublicKey?: `0x${string}`;
}

export const useSendLocation = ({ linkPublicKey, recipientPublicKey }: UseSendLocationParams) => {
  const { address } = useStellarWallet();
  const { derivedAccount } = useDerivedAccount();
  const canShareLocation = !!address && !!linkPublicKey && !!recipientPublicKey && !!derivedAccount;
  const [sendError, setSendError] = useState<Error | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);

  const { relayError, relayReady, relayStatus, send } = useSendMessage();
  const { coords, isGeolocationAvailable, isGeolocationEnabled } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    suppressLocationOnMount: !canShareLocation,
    userDecisionTimeout: 3000,
    watchPosition: canShareLocation,
  });

  useEffect(() => {
    if (!address || !coords || !derivedAccount || !linkPublicKey || !recipientPublicKey) return;

    let stopped = false;

    const callback = async () => {
      const message = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        linkPublicKey,
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
  }, [send, coords, address, linkPublicKey, recipientPublicKey, derivedAccount]);

  return {
    coords,
    isGeolocationAvailable,
    isGeolocationEnabled,
    lastSentAt,
    relayError,
    relayReady,
    relayStatus,
    sendError,
  };
};
