import { useState } from 'react';
import type { NextPage } from 'next';
import cls from 'classnames';

import utilsStyles from '@styles/utils.module.scss';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import Head from '@components/Head/Head';
import Input from '@components/Input/Input';
import Loader from '@components/Loader/Loader';
import IconText from '@components/IconText/IconText';
import SadFace from '@icons/sad_face.svg';
import ReloadIcon from '@icons/reload.svg';
import useWalletContext from '@hooks/useWalletContext';
import {
  checkCollectionExists,
  fetchClaimsByCollection,
  type CollectionData,
  type ClaimData,
  getStatusFromNumber,
} from '@utils/graphqlQueries';
import { timeAgo } from '@utils/timestamp';
import { shortenAddress, broadCastMessages } from '@utils/wallets';
import { generateEvaluateTrx, generateExecTrx } from '@utils/transactions';
import { toast } from 'react-toastify';

const Test: NextPage = () => {
  const { wallet } = useWalletContext();
  const [collectionId, setCollectionId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
  const [collection, setCollection] = useState<CollectionData | undefined>();
  const [claims, setClaims] = useState<ClaimData[]>([]);
  const [activeStatusTab, setActiveStatusTab] = useState<'All' | 'Pending' | 'Approved' | 'Rejected' | 'Disputed'>(
    'All',
  );
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Helper to shorten DID
  const shortenDid = (did: string): string => {
    if (!did || did.length <= 30) return did;
    return did.slice(0, 15) + '...' + did.slice(-15);
  };

  // Helper to truncate claim ID if too long (ellipse in the middle)
  const truncateClaimId = (claimId: string, maxLength: number = 20): string => {
    if (!claimId || claimId.length <= maxLength) return claimId;
    const startLength = Math.floor(maxLength / 2);
    const endLength = maxLength - startLength - 3; // -3 for '...'
    return claimId.slice(0, startLength) + '...' + claimId.slice(-endLength);
  };

  // Helper to format date for display
  const formatDate = (dateString: string): { relative: string; absolute: string } => {
    const date = new Date(dateString);
    const relative = timeAgo(date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const absolute = `${year}-${month}-${day} ${displayHours}:${minutes} ${ampm}`;
    return { relative, absolute };
  };

  // Helper to get payment status
  const getPaymentStatus = (claim: ClaimData): string => {
    // Use evaluation status if available, otherwise "Pending"
    return getStatusFromNumber(claim.evaluationByClaimId?.status);
  };

  // Helper to get status display info
  const getStatusInfo = (claim: ClaimData): { status: string; action: string } => {
    const status = getStatusFromNumber(claim.evaluationByClaimId?.status);
    return {
      status,
      action: status === 'Approved' ? 'Action: Complete' : `Action: ${status}`,
    };
  };

  // Helper to get claim status for filtering
  const getClaimStatus = (claim: ClaimData): string => {
    return getStatusFromNumber(claim.evaluationByClaimId?.status);
  };

  // Helper to get status dot color
  const getStatusDotColor = (status: string): string => {
    switch (status) {
      case 'Pending':
        return '#FFC107'; // Yellow
      case 'Approved':
        return '#4CAF50'; // Green
      case 'Rejected':
        return '#F44336'; // Red
      case 'Disputed':
        return '#9E9E9E'; // Grey
      default:
        return '#9E9E9E'; // Default to grey
    }
  };

  // Filter claims by status
  const filteredClaims = claims.filter((claim) => {
    if (activeStatusTab === 'All') return true;
    return getClaimStatus(claim) === activeStatusTab;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClaims = filteredClaims.slice(startIndex, endIndex);

  // Reset to page 1 when status filter or items per page changes
  const handleStatusTabChange = (status: 'All' | 'Pending' | 'Approved' | 'Rejected' | 'Disputed') => {
    setActiveStatusTab(status);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Get pending claims
  const pendingClaims = claims.filter((claim) => getClaimStatus(claim) === 'Pending');

  // Handle batch approval
  const handleApprovePendingClaims = async () => {
    if (!collection) {
      toast.error('Collection not found');
      return;
    }
    if (pendingClaims.length === 0) {
      toast.error('No pending claims found');
      return;
    }
    if (isApproving) {
      toast.error('Already approving claims');
      return;
    }

    const userAddress = wallet.user?.address;
    const userDid = wallet.user?.did;
    if (!userAddress || !userDid) {
      toast.error('Wallet user address or DID not found');
      return;
    }

    setIsApproving(true);
    const BATCH_SIZE = 40;

    try {
      // Process in batches of 40
      for (let i = 0; i < pendingClaims.length; i += BATCH_SIZE) {
        const batch = pendingClaims.slice(i, i + BATCH_SIZE);

        // Generate evaluate transactions for the batch
        const evaluateMsgs = batch.map((claim) =>
          generateEvaluateTrx({
            claimId: claim.claimId,
            collectionId: claim.collectionId,
            adminAddress: collection.admin,
            agentAddress: userAddress,
            agentDid: userDid,
            status: 1, // 1 = APPROVED
          }),
        );

        // Wrap in MsgExec
        const execTrx = generateExecTrx({
          grantee: userAddress,
          msgs: evaluateMsgs as any[],
        });

        // Broadcast the transaction
        const hash = await broadCastMessages(wallet, [execTrx], `Approve batch ${Math.floor(i / BATCH_SIZE) + 1}`);
        if (hash) {
          toast.success(`Batch ${Math.floor(i / BATCH_SIZE) + 1} approved (${hash})`);
        } else {
          throw new Error(`Failed to approve batch ${Math.floor(i / BATCH_SIZE) + 1}`);
        }
      }

      toast.success(`Successfully approved ${pendingClaims.length} pending claims`);

      // Refresh claims data
      if (collection) {
        const claimsData = await fetchClaimsByCollection(collection.id);
        setClaims(claimsData);
      }
    } catch (err) {
      console.error('Approve claims error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to approve claims');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle batch rejection
  const handleRejectPendingClaims = async () => {
    if (!collection) {
      toast.error('Collection not found');
      return;
    }
    if (pendingClaims.length === 0) {
      toast.error('No pending claims found');
      return;
    }
    if (isRejecting) {
      toast.error('Already rejecting claims');
      return;
    }
    if (!wallet.user) {
      toast.error('Wallet not connected');
      return;
    }

    const userAddress = wallet.user.address;
    const userDid = wallet.user.did;
    if (!userAddress || !userDid) {
      toast.error('Wallet user address or DID not found');
      return;
    }

    setIsRejecting(true);
    const BATCH_SIZE = 20;

    try {
      // Process in batches of 20
      for (let i = 0; i < pendingClaims.length; i += BATCH_SIZE) {
        const batch = pendingClaims.slice(i, i + BATCH_SIZE);

        // Generate evaluate transactions for the batch with REJECTED status
        const evaluateMsgs = batch.map((claim) =>
          generateEvaluateTrx({
            claimId: claim.claimId,
            collectionId: claim.collectionId,
            adminAddress: collection.admin,
            agentAddress: userAddress,
            agentDid: userDid,
            status: 2, // 2 = REJECTED
          }),
        );

        // Wrap in MsgExec
        const execTrx = generateExecTrx({
          grantee: userAddress,
          msgs: evaluateMsgs as any[],
        });

        // Broadcast the transaction
        const hash = await broadCastMessages(wallet, [execTrx], `Reject batch ${Math.floor(i / BATCH_SIZE) + 1}`);
        if (hash) {
          toast.success(`Batch ${Math.floor(i / BATCH_SIZE) + 1} rejected (${hash})`);
        } else {
          throw new Error(`Failed to reject batch ${Math.floor(i / BATCH_SIZE) + 1}`);
        }
      }

      toast.success(`Successfully rejected ${pendingClaims.length} pending claims`);

      // Refresh claims data
      if (collection) {
        const claimsData = await fetchClaimsByCollection(collection.id);
        setClaims(claimsData);
      }
    } catch (err) {
      console.error('Reject claims error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to reject claims');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCollectionQuery = async (): Promise<void> => {
    // Validate collection ID is numeric
    if (!collectionId || !/^\d+$/.test(collectionId.trim())) {
      setError('Please enter a valid collection ID (numerical string)');
      return;
    }

    try {
      setLoading(true);
      setError(undefined);
      setCollection(undefined);
      setClaims([]);

      const trimmedCollectionId = collectionId.trim();

      // Check if collection exists
      const collectionData = await checkCollectionExists(trimmedCollectionId);
      if (!collectionData) {
        throw new Error(`Collection ${trimmedCollectionId} not found`);
      }

      setCollection(collectionData);

      // Fetch claims for the collection
      const claimsData = await fetchClaimsByCollection(trimmedCollectionId);
      setClaims(claimsData);
    } catch (err) {
      console.error('Collection query error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch collection data');
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh - re-fetch collection and claims
  const handleRefresh = async (): Promise<void> => {
    if (!collection || isRefreshing) return;

    try {
      setIsRefreshing(true);
      setError(undefined);

      // Re-fetch collection
      const collectionData = await checkCollectionExists(collection.id);
      if (!collectionData) {
        throw new Error(`Collection ${collection.id} not found`);
      }
      setCollection(collectionData);

      // Re-fetch claims
      const claimsData = await fetchClaimsByCollection(collection.id);
      setClaims(claimsData);

      toast.success('Data refreshed successfully');
    } catch (err) {
      console.error('Refresh error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <Head title='Test Collection Claims' description='Test collection claims and evaluations page' />

      <Header />

      <main className={cls(utilsStyles.main, utilsStyles.columnJustifyCenter)}>
        <div className={utilsStyles.spacer3Flex} />

        {loading ? (
          <Loader />
        ) : error ? (
          <IconText title='Error' subTitle={error} Img={SadFace} imgSize={50} />
        ) : collection ? (
          <div
            className={utilsStyles.columnAlignCenter}
            style={{ maxWidth: '1200px', width: '100%', padding: '20px', margin: '0 auto' }}
          >
            {/* Collection Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ margin: 0, textAlign: 'center', fontSize: '24px', fontWeight: '600' }}>
                Collection {collection.id}
              </h2>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: isRefreshing ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isRefreshing ? 0.5 : 1,
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isRefreshing) {
                    e.currentTarget.style.transform = 'rotate(180deg)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isRefreshing) {
                    e.currentTarget.style.transform = 'rotate(0deg)';
                  }
                }}
                title='Refresh data'
              >
                <ReloadIcon
                  width={20}
                  height={20}
                  style={{
                    fill: '#666',
                    transform: isRefreshing ? 'rotate(360deg)' : 'none',
                    transition: isRefreshing ? 'transform 0.5s linear' : 'none',
                  }}
                />
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '40px',
                marginBottom: '24px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#333', lineHeight: '1.2' }}>
                  {collection.quota}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Quota</div>
              </div>
              <div
                style={{
                  width: '1px',
                  height: '50px',
                  backgroundColor: '#e0e0e0',
                }}
              />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#333', lineHeight: '1.2' }}>
                  {collection.count}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Count</div>
              </div>
              <div
                style={{
                  width: '1px',
                  height: '50px',
                  backgroundColor: '#e0e0e0',
                }}
              />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#333', lineHeight: '1.2' }}>
                  {collection.evaluated}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Evaluated</div>
              </div>
            </div>

            {/* Status Tabs */}
            <div
              style={{
                display: 'flex',
                borderBottom: '2px solid #e0e0e0',
                marginBottom: '20px',
                width: '100%',
                gap: '8px',
                justifyContent: 'center',
              }}
            >
              {(['All', 'Pending', 'Approved', 'Rejected', 'Disputed'] as const).map((status) => {
                const count =
                  status === 'All' ? claims.length : claims.filter((c) => getClaimStatus(c) === status).length;
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusTabChange(status)}
                    style={{
                      padding: '12px 24px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: activeStatusTab === status ? '600' : '400',
                      color: activeStatusTab === status ? '#333' : '#666',
                      borderBottom: activeStatusTab === status ? '3px solid #4CAF50' : '3px solid transparent',
                      marginBottom: '-2px',
                      position: 'relative',
                    }}
                  >
                    {status} {count > 0 && <span style={{ marginLeft: '6px', opacity: 0.7 }}>({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Claims Table */}
            {filteredClaims.length === 0 ? (
              <p style={{ textAlign: 'center' }}>
                No claims found for this collection
                {activeStatusTab !== 'All' ? ` with status "${activeStatusTab}"` : ''}.
              </p>
            ) : (
              <>
                <div style={{ width: '100%' }}>
                  {/* Table Header */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '3fr 2.5fr 2fr',
                      padding: '10px 16px',
                      fontWeight: '600',
                      fontSize: '14px',
                      color: '#666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>Claim ID</div>
                    <div style={{ textAlign: 'left' }}>Agent</div>
                    <div style={{ textAlign: 'left' }}>Date</div>
                  </div>

                  {/* Table Rows */}
                  {paginatedClaims.map((claim, index) => {
                    const dateInfo = claim.submissionDate ? formatDate(claim.submissionDate) : null;
                    const statusInfo = getStatusInfo(claim);

                    return (
                      <div
                        key={claim.claimId || index}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '3fr 2.5fr 2fr',
                          padding: '12px 16px',
                          marginBottom: '8px',
                          backgroundColor: '#fafafa',
                          borderRadius: '8px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        }}
                      >
                        {/* Claim ID Column */}
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                            {truncateClaimId(claim.claimId)}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#666',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span style={{ color: getStatusDotColor(statusInfo.status), fontSize: '8px' }}>●</span>
                            {statusInfo.status}
                          </div>
                        </div>

                        {/* Agent Column */}
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                            {shortenAddress(claim.agentAddress)}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{shortenDid(claim.agentDid)}</div>
                        </div>

                        {/* Date Column */}
                        <div style={{ textAlign: 'left' }}>
                          {dateInfo ? (
                            <>
                              <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                                {dateInfo.relative}
                              </div>
                              <div style={{ fontSize: '12px', color: '#666' }}>{dateInfo.absolute}</div>
                            </>
                          ) : (
                            <div style={{ color: '#666' }}>N/A</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '20px',
                    marginBottom: '16px',
                    width: '100%',
                  }}
                >
                  {/* Items per page - Left */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ fontSize: '14px', color: '#666' }}>Items per page:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      {[20, 40, 60, 80, 100].map((num) => (
                        <option key={num} value={num}>
                          {num}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pagination Navigation - Right */}
                  {totalPages > 1 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          background: currentPage === 1 ? '#f5f5f5' : '#fff',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          color: currentPage === 1 ? '#999' : '#333',
                          fontSize: '14px',
                        }}
                      >
                        Previous
                      </button>

                      <span style={{ fontSize: '14px', color: '#666' }}>
                        Showing {startIndex + 1} - {Math.min(endIndex, filteredClaims.length)} of{' '}
                        {filteredClaims.length} rows
                      </span>

                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          background: currentPage === totalPages ? '#f5f5f5' : '#fff',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          color: currentPage === totalPages ? '#999' : '#333',
                          fontSize: '14px',
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

                {/* Approve/Reject Pending Claims Buttons */}
                {pendingClaims.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
                    <button
                      onClick={handleApprovePendingClaims}
                      disabled={isApproving || isRejecting}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: 'transparent',
                        border: '2px solid #4CAF50',
                        color: '#4CAF50',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: isApproving || isRejecting ? 'not-allowed' : 'pointer',
                        opacity: isApproving || isRejecting ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isApproving && !isRejecting) {
                          e.currentTarget.style.backgroundColor = '#4CAF50';
                          e.currentTarget.style.color = '#fff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isApproving && !isRejecting) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#4CAF50';
                        }
                      }}
                    >
                      {isApproving ? 'Approving...' : `Approve Pending Claims (${pendingClaims.length})`}
                    </button>

                    <button
                      onClick={handleRejectPendingClaims}
                      disabled={isApproving || isRejecting}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: 'transparent',
                        border: '2px solid #F44336',
                        color: '#F44336',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: isApproving || isRejecting ? 'not-allowed' : 'pointer',
                        opacity: isApproving || isRejecting ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isApproving && !isRejecting) {
                          e.currentTarget.style.backgroundColor = '#F44336';
                          e.currentTarget.style.color = '#fff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isApproving && !isRejecting) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#F44336';
                        }
                      }}
                    >
                      {isRejecting ? 'Rejecting...' : `Reject Pending Claims (${pendingClaims.length})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <form
            className={utilsStyles.columnAlignCenter}
            style={{ maxWidth: '400px', width: '100%' }}
            autoComplete='none'
            onSubmit={(e) => {
              e.preventDefault();
              handleCollectionQuery();
            }}
          >
            <p className={utilsStyles.label}>Collection ID</p>
            <Input
              name='collectionId'
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              align='center'
              placeholder='Enter collection ID (e.g., 265)'
              style={{ width: '100%', maxWidth: '400px' }}
            />
          </form>
        )}

        <div className={utilsStyles.spacer3Flex} />
      </main>

      <Footer
        onForward={loading || collection ? null : handleCollectionQuery}
        showAccountButton={!!collection}
        showActionsButton={!!collection}
      />
    </>
  );
};

export default Test;
