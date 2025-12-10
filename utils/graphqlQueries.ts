import gqlQuery from './graphql';
import { BLOCKSYNC_GRAPHQL_URL } from '@constants/env';

// Helper to get base URL (strip /graphql if present since gqlQuery appends it)
function getGraphQLBaseUrl(): string {
  const url = BLOCKSYNC_GRAPHQL_URL;
  return url.endsWith('/graphql') ? url.slice(0, -8) : url;
}

export interface CollectionData {
  admin: string;
  approved: number;
  count: number;
  disputed: number;
  endDate: string;
  entity: string;
  evaluated: number;
  invalidated: number;
  id: string;
  quota: number;
  rejected: number;
  startDate: string;
  state: string;
}

export enum ClaimEvaluationStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  DISPUTED = 3,
}

export interface EvaluationData {
  status: string | number; // Can be numerical (0-3) or string
  reason?: string;
  evaluationDate?: string;
}

// Helper to convert numerical status to status word
export function getStatusFromNumber(status: string | number | undefined): string {
  if (status === undefined || status === null) return 'Pending';

  const statusNum = typeof status === 'string' ? parseInt(status, 10) : status;

  switch (statusNum) {
    case ClaimEvaluationStatus.PENDING:
      return 'Pending';
    case ClaimEvaluationStatus.APPROVED:
      return 'Approved';
    case ClaimEvaluationStatus.REJECTED:
      return 'Rejected';
    case ClaimEvaluationStatus.DISPUTED:
      return 'Disputed';
    default:
      // If it's already a string, return it as-is (for backwards compatibility)
      if (typeof status === 'string') return status;
      return 'Pending';
  }
}

export interface ClaimData {
  agentAddress: string;
  agentDid: string;
  claimId: string;
  collectionId: string;
  submissionDate: string;
  evaluationByClaimId?: EvaluationData;
}

interface CollectionQueryResponse {
  data?: {
    claimCollection?: CollectionData;
  };
  errors?: Array<{ message: string }>;
}

interface ClaimsQueryResponse {
  data?: {
    claims?: {
      nodes?: ClaimData[];
    };
  };
  errors?: Array<{ message: string }>;
}

export async function checkCollectionExists(collectionId: string): Promise<CollectionData | null> {
  try {
    const queryWithVariables = `
      query CollectionQuery {
        claimCollection(id: "${collectionId}") {
          admin
          approved
          count
          disputed
          endDate
          entity
          evaluated
          invalidated
          id
          quota
          rejected
          startDate
          state
        }
      }
    `;

    const result = await gqlQuery<CollectionQueryResponse>(getGraphQLBaseUrl(), queryWithVariables);

    if (result.error) {
      throw result.error;
    }

    if (result.data?.errors) {
      throw new Error(result.data.errors[0]?.message || 'GraphQL query error');
    }

    if (!result.data?.data?.claimCollection) {
      return null;
    }

    return result.data.data.claimCollection;
  } catch (error) {
    console.error('checkCollectionExists error:', error);
    throw error;
  }
}

export async function fetchClaimsByCollection(collectionId: string): Promise<ClaimData[]> {
  try {
    const queryWithVariables = `
      query ClaimsAndEvaluationsQuery {
        claims(filter: {collectionId: {equalTo: "${collectionId}"}}) {
          nodes {
            agentAddress
            agentDid
            claimId
            collectionId
            submissionDate
            evaluationByClaimId {
              status
              reason
              evaluationDate
            }
          }
        }
      }
    `;

    const result = await gqlQuery<ClaimsQueryResponse>(getGraphQLBaseUrl(), queryWithVariables);

    if (result.error) {
      throw result.error;
    }

    if (result.data?.errors) {
      throw new Error(result.data.errors[0]?.message || 'GraphQL query error');
    }

    return result.data?.data?.claims?.nodes || [];
  } catch (error) {
    console.error('fetchClaimsByCollection error:', error);
    throw error;
  }
}
