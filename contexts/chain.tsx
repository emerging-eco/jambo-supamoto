import { createContext, useState, useEffect, HTMLAttributes, useRef } from 'react';
import { createQueryClient } from '@ixo/impactxclient-sdk';

import Banner from '@components/Banner/Banner';
import { CHAIN_NETWORK_TYPE } from 'types/chain';
import { QUERY_CLIENT } from 'types/query';
import { CHAIN_ID, CHAIN_NETWORK, IXO_BLOCKCHAIN_RPC_URL } from '@constants/env';

type CHAIN_STATE_TYPE = {
  chainId: string;
  chainNetwork: CHAIN_NETWORK_TYPE;
  chainLoading: boolean;
};

const DEFAULT_CHAIN: CHAIN_STATE_TYPE = {
  chainId: CHAIN_ID as string,
  chainNetwork: CHAIN_NETWORK as CHAIN_NETWORK_TYPE,
  chainLoading: true,
};

export const ChainContext = createContext({
  chain: DEFAULT_CHAIN as CHAIN_STATE_TYPE,
  queryClient: undefined as QUERY_CLIENT | undefined,
});

export const ChainProvider = ({ children }: HTMLAttributes<HTMLDivElement>) => {
  const [chainLoading, setChainLoading] = useState<boolean>(true);

  const queryClientRef = useRef<QUERY_CLIENT | undefined>(undefined);

  async function initQueryClient() {
    try {
      if (!IXO_BLOCKCHAIN_RPC_URL) throw new Error('IXO_BLOCKCHAIN_RPC_URL is not set');
      const queryClient = await createQueryClient(IXO_BLOCKCHAIN_RPC_URL as string);
      queryClientRef.current = queryClient;
    } catch (error) {
      if (queryClientRef.current) queryClientRef.current = undefined;
      console.error('initQueryClient::', error);
    }
    setChainLoading(false);
  }

  useEffect(function () {
    initQueryClient();
  }, []);

  const value = {
    chain: {
      chainId: CHAIN_ID as string,
      chainNetwork: CHAIN_NETWORK as CHAIN_NETWORK_TYPE,
      chainLoading: chainLoading,
    },
    queryClient: queryClientRef.current,
  };

  return (
    <ChainContext.Provider value={value}>
      {children}
      <Banner label={CHAIN_NETWORK === 'devnet' ? 'DEV' : 'TEST'} display={CHAIN_NETWORK !== 'mainnet'}></Banner>
    </ChainContext.Provider>
  );
};
