import { useEffect } from "react";
import { useSendMessage } from "./useSendMessage";
import { useGeolocated } from "react-geolocated";
import { generateEncryptionClient, useDerivedAccount } from "~~/sdk/crypto";
import { useStellarWallet } from "~~/sdk/stellar-wallet";

interface UseSendLocationParams {
  publicKey?: `0x${string}`;
}

export const useSendLocation = ({ publicKey }: UseSendLocationParams) => {
  const { address } = useStellarWallet();
  const { derivedAccount } = useDerivedAccount();
  const canShareLocation = !!address && !!publicKey && !!derivedAccount;

  const { send } = useSendMessage();
  const { coords, isGeolocationAvailable, isGeolocationEnabled } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    suppressLocationOnMount: !canShareLocation,
    userDecisionTimeout: 3000,
    watchPosition: canShareLocation,
  });

  useEffect(() => {
    if (!address || !coords || !derivedAccount || !publicKey) return;

    const callback = async () => {
      const message = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        senderPublicKey: derivedAccount.publicKey,
        senderAddress: address,
      };

      const encryptionClient = generateEncryptionClient(publicKey);

      const encryptedMessage = await encryptionClient.encryptMessage(JSON.stringify(message));
      const stringifiedEncryptedMessage = JSON.stringify(encryptedMessage);

      send({ message: stringifiedEncryptedMessage, sender: address });
    };

    const intervalId = setInterval(callback, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [send, coords, address, publicKey, derivedAccount]);

  return {
    coords,
    isGeolocationAvailable,
    isGeolocationEnabled,
  };
};
