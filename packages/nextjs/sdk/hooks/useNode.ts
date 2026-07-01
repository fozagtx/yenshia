import { useQuery } from "@tanstack/react-query";
import { enrTree, wakuDnsDiscovery } from "@waku/dns-discovery";
import { wakuPeerExchangeDiscovery } from "@waku/peer-exchange";
import { Protocols, createLightNode, waitForRemotePeer } from "@waku/sdk";

export const useNode = () => {
  return useQuery({
    queryKey: ["waku-node"],
    queryFn: async () => {
      // Create and start a Light Node
      const node = await createLightNode({
        defaultBootstrap: false,
        libp2p: {
          peerDiscovery: [
            wakuDnsDiscovery([enrTree["PROD"]], { lightPush: 6, filter: 6, store: 6 }),
            wakuPeerExchangeDiscovery(),
          ],
        },
      });
      await node.start();

      await Promise.race([
        waitForRemotePeer(node, [Protocols.Filter, Protocols.LightPush]),
        new Promise((_, reject) => {
          globalThis.setTimeout(() => reject(new Error("Private location relay did not connect.")), 20000);
        }),
      ]);

      return node;
    },
    retry: 1,
    staleTime: Infinity,
  });
};
