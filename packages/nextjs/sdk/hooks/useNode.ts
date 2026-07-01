import { useQuery } from "@tanstack/react-query";
import { Protocols, createLightNode, waitForRemotePeer } from "@waku/sdk";

const RELAY_CONNECT_TIMEOUT_MS = 45000;
const RELAY_RETRY_DELAY_MS = 5000;

export const useNode = () => {
  return useQuery({
    queryKey: ["waku-node"],
    queryFn: async () => {
      const node = await createLightNode({
        defaultBootstrap: true,
      });
      await node.start();

      try {
        await waitForRemotePeer(node, [Protocols.Filter, Protocols.LightPush], RELAY_CONNECT_TIMEOUT_MS);
      } catch (error) {
        await node.stop().catch(() => undefined);
        throw error instanceof Error ? error : new Error("Private location relay did not connect.");
      }

      return node;
    },
    retry: true,
    retryDelay: RELAY_RETRY_DELAY_MS,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};
