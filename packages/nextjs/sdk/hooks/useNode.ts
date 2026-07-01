import { useQuery } from "@tanstack/react-query";
import { createLightNode } from "@waku/sdk";

export const useNode = () => {
  return useQuery({
    queryKey: ["waku-node"],
    queryFn: async () => {
      return createLightNode({
        defaultBootstrap: true,
        networkConfig: {
          clusterId: 1,
          numShardsInCluster: 8,
        },
      });
    },
    retry: 3,
    retryDelay: 3000,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};
