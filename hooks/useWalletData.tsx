import { useEffect, useState } from 'react';

import { TOKEN_ASSET } from '@utils/currency';
import { getErrorMessage } from '@utils/misc';
import { DELEGATION, DELEGATION_REWARDS, UNBONDING_DELEGATION } from 'types/validators';
import { CURRENCY_TOKEN } from 'types/wallet';
import { QUERY_CLIENT } from 'types/query';
import useChainContext from './useChainContext';
import { CHAIN_ID } from '@constants/env';
import { feeCurrency } from '@constants/chains';

const defaultData = {
  loading: false,
  error: undefined,
  data: undefined,
};

type FetchWalletData = (
  queryClient: QUERY_CLIENT,
  chain: string,
  address: string,
  stakeCurrency: TOKEN_ASSET,
) => Promise<CURRENCY_TOKEN[] | DELEGATION[] | DELEGATION_REWARDS | UNBONDING_DELEGATION[] | undefined>;

type UseWalletData = {
  loading?: boolean;
  error?: string;
  data?: CURRENCY_TOKEN[] | DELEGATION[] | DELEGATION_REWARDS | UNBONDING_DELEGATION[];
};

type UseWalletDataReturn = [UseWalletData, () => void, () => void];

const useWalletData = (fetchData: FetchWalletData, address: string | undefined): UseWalletDataReturn => {
  const [data, setData] = useState<UseWalletData>(defaultData);

  const { queryClient } = useChainContext();

  const fetch = async () => {
    if (!queryClient || !address) return;

    setData((prevState) => ({ ...prevState, loading: true, error: undefined }));
    try {
      const result = await fetchData(queryClient!, CHAIN_ID, address, feeCurrency);
      setData((prevState) => ({ ...prevState, loading: false, data: result }));
    } catch (error) {
      console.error('useWalletData::fetch::', error);
      setData((prevState) => ({ ...prevState, loading: false, error: getErrorMessage(error) }));
    }
  };

  const clear = () => setData(defaultData);

  useEffect(() => {
    if (!queryClient || !address) setData({ loading: false, error: undefined, data: undefined });
    else fetch();
  }, [queryClient, address]);

  return [data, fetch, clear];
};

export default useWalletData;
