export type USER = {
  name?: string;
  pubKey: Uint8Array;
  address: string;
  algo?: string;
  ledgered?: boolean;
  did?: string;
  chainId?: string;
  matrix?: {
    accessToken?: string;
    userId?: string;
    deviceId?: string;
    baseUrl?: string;
  };
};
