import { createQueryClient } from '@ixo/impactxclient-sdk';

import { IXO_BLOCKCHAIN_RPC_URL } from '@constants/env';

/**
 * Checks if an iid document (did) exists
 * @param did - The did to check for
 * @returns True if the iid document exists, false otherwise
 */
export async function checkIidDocumentExists(did: string) {
  try {
    const queryClient = await createQueryClient(IXO_BLOCKCHAIN_RPC_URL);
    const iidDocumentResponse = await queryClient.ixo.iid.v1beta1.iidDocument({ id: did });
    if (!iidDocumentResponse?.iidDocument?.id) {
      return false;
    }
    return true;
  } catch (error) {
    console.error(error);
    if ((error as Error).message?.includes('did document not found') || (error as Error).message?.includes('(22)')) {
      return false;
    }
    throw error;
  }
}
