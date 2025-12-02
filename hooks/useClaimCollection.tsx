import { useEffect, useRef, useState } from 'react';
import { Collection } from '@ixo/impactxclient-sdk/types/codegen/ixo/claims/v1beta1/claims';
import { Grant } from '@ixo/impactxclient-sdk/types/codegen/cosmos/authz/v1beta1/authz';
import { IidDocument } from '@ixo/impactxclient-sdk/types/codegen/ixo/iid/v1beta1/iid';
import { Entity } from '@ixo/impactxclient-sdk/types/codegen/ixo/entity/v1beta1/entity';
import { createRegistry } from '@ixo/impactxclient-sdk';
import { DecodeObject } from '@cosmjs/proto-signing';

import useChainContext from './useChainContext';
import useWalletContext from './useWalletContext';
import { MATRIX_BID_BOT_URL } from '@constants/env';

type CacheData = Record<
  string,
  {
    collection?: Collection;
    grants?: Grant[];
    protocol?: { entity?: Entity; iidDocument?: IidDocument };
    vctServiceEndpoint?: string;
    vctEncrypted?: boolean;
    vctSurveyTemplate?: any;
    bcoServiceEndpoint?: string;
    bcoEncrypted?: boolean;
    bcoSurveyTemplate?: any;
    bevServiceEndpoint?: string;
    bevEncrypted?: boolean;
    bevSurveyTemplate?: any;
    bids?: any[];
  }
>;
class ClaimCollectionCache {
  private cache: CacheData = {};

  constructor() {
    console.log('ClaimCollectionCache instance created');
  }

  public has(collectionId: string): boolean {
    return !!this.cache[collectionId];
  }
  public get(collectionId: string): CacheData[string] {
    return this.cache[collectionId];
  }
  public set(collectionId: string, data: CacheData[string]) {
    this.cache[collectionId] = data;
  }
  // collection
  public hasCollection(collectionId: string): boolean {
    return !!this.cache[collectionId]?.collection;
  }
  public getCollection(collectionId: string): Collection | undefined {
    return this.cache[collectionId]?.collection;
  }
  public setCollection(collectionId: string, collection: Collection) {
    if (!this.cache[collectionId]) {
      this.cache[collectionId] = { collection };
    }
    this.cache[collectionId].collection = collection;
  }
  // grants
  public hasGrants(collectionId: string): boolean {
    return !!this.cache[collectionId]?.grants;
  }
  public getGrants(collectionId: string): Grant[] | undefined {
    return this.cache[collectionId]?.grants;
  }
  public setGrants(collectionId: string, grants: Grant[]) {
    if (!this.cache[collectionId]?.collection) {
      throw new Error(`Collection ${collectionId} not found - cannot set grants`);
    }
    this.cache[collectionId].grants = grants;
  }
  // protocol
  public hasProtocol(collectionId: string): boolean {
    return !!this.cache[collectionId]?.protocol;
  }
  public getProtocol(collectionId: string): { entity?: Entity; iidDocument?: IidDocument } | undefined {
    return this.cache[collectionId]?.protocol;
  }
  public setProtocol(collectionId: string, protocol: { entity?: Entity; iidDocument?: IidDocument }) {
    if (!this.cache[collectionId]?.collection) {
      throw new Error(`Collection ${collectionId} not found - cannot set protocol`);
    }
    this.cache[collectionId].protocol = protocol;
    if (protocol.iidDocument) {
      const protocolIidDocument = protocol.iidDocument;
      // vct
      try {
        const vctLinkedResources = protocolIidDocument.linkedResource?.filter((r) => r.type === 'surveyTemplate');
        const vct =
          vctLinkedResources?.find((r) => r.id?.includes('#vct-1')) ??
          vctLinkedResources?.find((r) => r.id?.includes('#vct')) ??
          vctLinkedResources?.find((r) => r.id?.includes('#surveyTemplate')) ??
          vctLinkedResources?.[0];

        if (!!vct?.id && vct.serviceEndpoint !== CACHE.getVctServiceEndpoint(collectionId)) {
          this.cache[collectionId].vctServiceEndpoint = vct.serviceEndpoint;
          this.cache[collectionId].vctEncrypted =
            typeof vct.encrypted === 'boolean' ? vct.encrypted : vct.encrypted === 'true';
          this.cache[collectionId].vctSurveyTemplate = undefined;
        }
      } catch {
        this.cache[collectionId].vctServiceEndpoint = undefined;
        this.cache[collectionId].vctEncrypted = undefined;
        this.cache[collectionId].vctSurveyTemplate = undefined;
      }
      // bco
      try {
        const bcoLinkedResources = protocolIidDocument.linkedResource?.filter((r) => r.type === 'bidContributor');
        const bco =
          bcoLinkedResources?.find((r) => r.id?.includes('#bco-1')) ??
          bcoLinkedResources?.find((r) => r.id?.includes('#bco')) ??
          bcoLinkedResources?.[0];

        if (!!bco?.id && bco.serviceEndpoint !== CACHE.getBcoServiceEndpoint(collectionId)) {
          this.cache[collectionId].bcoServiceEndpoint = bco.serviceEndpoint;
          this.cache[collectionId].bcoEncrypted =
            typeof bco.encrypted === 'boolean' ? bco.encrypted : bco.encrypted === 'true';
          this.cache[collectionId].bcoSurveyTemplate = undefined;
        }
      } catch {
        this.cache[collectionId].bcoServiceEndpoint = undefined;
        this.cache[collectionId].bcoEncrypted = undefined;
        this.cache[collectionId].bcoSurveyTemplate = undefined;
      }
    }
  }
  // vct service endpoint
  public hasVctServiceEndpoint(collectionId: string): boolean {
    return !!this.cache[collectionId]?.vctServiceEndpoint;
  }
  public getVctServiceEndpoint(collectionId: string): string | undefined {
    return this.cache[collectionId]?.vctServiceEndpoint;
  }
  public setVctServiceEndpoint(collectionId: string, vctServiceEndpoint: string) {
    if (!this.cache[collectionId]?.protocol?.iidDocument?.linkedResource?.length) {
      throw new Error(`Protocol for collection ${collectionId} not found - cannot set vct service endpoint`);
    }
    this.cache[collectionId].vctServiceEndpoint = vctServiceEndpoint;
  }
  // vct encrypted
  public hasVctEncrypted(collectionId: string): boolean {
    return !!this.cache[collectionId]?.vctEncrypted;
  }
  public getVctEncrypted(collectionId: string): boolean | undefined {
    return this.cache[collectionId]?.vctEncrypted;
  }
  public setVctEncrypted(collectionId: string, vctEncrypted: boolean) {
    if (!this.cache[collectionId]?.vctServiceEndpoint) {
      throw new Error(`VCT service endpoint for collection ${collectionId} not found - cannot set vct encrypted`);
    }
    this.cache[collectionId].vctEncrypted = vctEncrypted;
  }
  // vct survey template
  public hasVctSurveyTemplate(collectionId: string): boolean {
    return !!this.cache[collectionId]?.vctSurveyTemplate;
  }
  public getVctSurveyTemplate(collectionId: string): string | undefined {
    return this.cache[collectionId]?.vctSurveyTemplate;
  }
  public setVctSurveyTemplate(collectionId: string, vctSurveyTemplate: string) {
    if (!this.cache[collectionId]?.vctServiceEndpoint) {
      throw new Error(`VCT service endpoint for collection ${collectionId} not found - cannot set vct survey template`);
    }
    this.cache[collectionId].vctSurveyTemplate = vctSurveyTemplate;
  }
  // bco service endpoint
  public hasBcoServiceEndpoint(collectionId: string): boolean {
    return !!this.cache[collectionId]?.bcoServiceEndpoint;
  }
  public getBcoServiceEndpoint(collectionId: string): string | undefined {
    return this.cache[collectionId]?.bcoServiceEndpoint;
  }
  public setBcoServiceEndpoint(collectionId: string, bcoServiceEndpoint: string) {
    if (!this.cache[collectionId]?.protocol?.iidDocument?.linkedResource?.length) {
      throw new Error(`Protocol for collection ${collectionId} not found - cannot set bco service endpoint`);
    }
    this.cache[collectionId].bcoServiceEndpoint = bcoServiceEndpoint;
  }
  // bco encrypted
  public hasBcoEncrypted(collectionId: string): boolean {
    return !!this.cache[collectionId]?.bcoEncrypted;
  }
  public getBcoEncrypted(collectionId: string): boolean | undefined {
    return this.cache[collectionId]?.bcoEncrypted;
  }
  public setBcoEncrypted(collectionId: string, bcoEncrypted: boolean) {
    if (!this.cache[collectionId]?.bcoServiceEndpoint) {
      throw new Error(`Bco service endpoint for collection ${collectionId} not found - cannot set bco encrypted`);
    }
    this.cache[collectionId].bcoEncrypted = bcoEncrypted;
  }
  // bco survey template
  public hasBcoSurveyTemplate(collectionId: string): boolean {
    return !!this.cache[collectionId]?.bcoSurveyTemplate;
  }
  public getBcoSurveyTemplate(collectionId: string): string | undefined {
    return this.cache[collectionId]?.bcoSurveyTemplate;
  }
  public setBcoSurveyTemplate(collectionId: string, bcoSurveyTemplate: string) {
    if (!this.cache[collectionId]?.bcoServiceEndpoint) {
      throw new Error(`Bco service endpoint for collection ${collectionId} not found - cannot set bco survey template`);
    }
    this.cache[collectionId].bcoSurveyTemplate = bcoSurveyTemplate;
  }
  // bids
  public hasBids(collectionId: string): boolean {
    return !!this.cache[collectionId]?.bids;
  }
  public getBids(collectionId: string): any[] | undefined {
    return this.cache[collectionId]?.bids;
  }
  public setBids(collectionId: string, bids: any[]) {
    if (!this.cache[collectionId]?.collection) {
      throw new Error(`Collection ${collectionId} not found - cannot set bids`);
    }
    this.cache[collectionId].bids = bids;
  }
}

const CACHE = new ClaimCollectionCache();

export enum CLAIM_COLLECTION_STEP {
  LOAD_COLLECTION = 'load_collection',
  LOAD_GRANTS = 'load_grants',
  LOAD_PROTOCOL = 'load_protocol',
  LOAD_VCT = 'load_vct',
  VCT_FORM = 'vct_form',
  LOAD_BCO = 'load_bco',
  BCO_PENDING = 'bco_pending',
  BCO_FORM = 'bco_form',
  LOAD_BIDS = 'load_bids',
  ERROR = 'error',
}

function useClaimCollection(collectionId: string) {
  const [step, setStep] = useState<CLAIM_COLLECTION_STEP>(CLAIM_COLLECTION_STEP.LOAD_COLLECTION);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const { queryClient } = useChainContext();
  const { wallet } = useWalletContext();

  const loadingCollectionIdRef = useRef<string | undefined>(undefined);
  const registry = createRegistry();

  const stepIsLoadCollection = step === CLAIM_COLLECTION_STEP.LOAD_COLLECTION;
  const stepIsLoadGrants = step === CLAIM_COLLECTION_STEP.LOAD_GRANTS;
  const stepIsLoadProtocol = step === CLAIM_COLLECTION_STEP.LOAD_PROTOCOL;
  const stepIsLoadVct = step === CLAIM_COLLECTION_STEP.LOAD_VCT;
  const stepIsVctForm = step === CLAIM_COLLECTION_STEP.VCT_FORM;
  const stepIsLoadBco = step === CLAIM_COLLECTION_STEP.LOAD_BCO;
  const stepIsBcoPending = step === CLAIM_COLLECTION_STEP.BCO_PENDING;
  const stepIsBcoForm = step === CLAIM_COLLECTION_STEP.BCO_FORM;
  const stepIsLoadBids = step === CLAIM_COLLECTION_STEP.LOAD_BIDS;
  const stepIsError = step === CLAIM_COLLECTION_STEP.ERROR;

  function setStepToLoadCollection() {
    setStep(CLAIM_COLLECTION_STEP.LOAD_COLLECTION);
  }
  function setStepToLoadGrants() {
    setStep(CLAIM_COLLECTION_STEP.LOAD_GRANTS);
  }
  function setStepToLoadProtocol() {
    setStep(CLAIM_COLLECTION_STEP.LOAD_PROTOCOL);
  }
  function setStepToLoadVct() {
    setStep(CLAIM_COLLECTION_STEP.LOAD_VCT);
  }
  function setStepToVctForm() {
    setStep(CLAIM_COLLECTION_STEP.VCT_FORM);
  }
  function setStepToLoadBco() {
    setStep(CLAIM_COLLECTION_STEP.LOAD_BCO);
  }
  function setStepToBcoPending() {
    setStep(CLAIM_COLLECTION_STEP.BCO_PENDING);
  }
  function setStepToBcoForm() {
    setStep(CLAIM_COLLECTION_STEP.BCO_FORM);
  }
  function setStepToLoadBids() {
    setStep(CLAIM_COLLECTION_STEP.LOAD_BIDS);
  }
  function setStepToError(err: string) {
    setErrorMessage(err);
    setStep(CLAIM_COLLECTION_STEP.ERROR);
  }

  async function loadCollection({ collectionId }: { collectionId: string }) {
    try {
      if (!collectionId || typeof collectionId !== 'string') {
        throw new Error('Collection ID is required');
      }
      if (CACHE.hasCollection(collectionId)) {
        return CACHE.getCollection(collectionId);
      }
      const claimCollection = await queryClient?.ixo.claims.v1beta1.collection({
        id: collectionId,
      });
      if (!claimCollection?.collection?.id) {
        throw new Error(`Collection ${collectionId} not found`);
      }
      CACHE.setCollection(collectionId, claimCollection.collection);
      return CACHE.getCollection(collectionId);
    } catch (error) {
      console.error('loadCollection', error);
      setStepToError(error instanceof Error ? error.message : 'An unknown error occurred');
      return undefined;
    }
  }

  async function loadGrants({ collectionId }: { collectionId: string }) {
    try {
      if (!collectionId || typeof collectionId !== 'string') {
        throw new Error('Collection ID is required');
      }
      if (!CACHE.hasCollection(collectionId)) {
        throw new Error(`Collection ${collectionId} not found`);
      }
      const collection = CACHE.getCollection(collectionId)!;
      const authz = await queryClient?.cosmos.authz.v1beta1.grants({
        grantee: wallet?.user?.address as string,
        granter: collection.admin,
        msgTypeUrl: '',
      });
      if (!authz?.grants?.length) {
        CACHE.setGrants(collectionId, []);
        return [];
      }
      const grants = authz.grants
        .map((g) => {
          try {
            const decoded = registry.decode(g?.authorization as unknown as DecodeObject);
            return {
              typeUrl: g?.authorization?.typeUrl,
              value: decoded,
            };
          } catch {
            return g?.authorization;
          }
        })
        .filter((g) => g?.value?.constraints?.some((c: any) => c.collectionId === collectionId));
      CACHE.setGrants(collectionId, (grants as Grant[]) ?? []);
      return CACHE.getGrants(collectionId);
    } catch (error) {
      console.error('loadGrants', error);
      setStepToError(error instanceof Error ? error.message : 'An unknown error occurred');
      return undefined;
    }
  }

  async function loadProtocol({ collectionId }: { collectionId: string }) {
    try {
      if (!collectionId || typeof collectionId !== 'string') {
        throw new Error('Collection ID is required');
      }
      if (CACHE.hasProtocol(collectionId)) {
        return CACHE.getProtocol(collectionId);
      }
      if (!CACHE.hasCollection(collectionId)) {
        throw new Error(`Collection ${collectionId} not found`);
      }
      const collection = CACHE.getCollection(collectionId)!;
      const entity = await queryClient?.ixo.entity.v1beta1.entity({
        id: collection.protocol,
      });
      if (!entity?.entity?.id) {
        throw new Error('Protocol Entity not found');
      }
      if (!entity?.iidDocument?.id) {
        throw new Error('Protocol Entity IID Document not found');
      }
      CACHE.setProtocol(collectionId, { entity: entity.entity, iidDocument: entity.iidDocument });
      return CACHE.getProtocol(collectionId);
    } catch (error) {
      console.error('loadProtocol', error);
      setStepToError(error instanceof Error ? error.message : 'An unknown error occurred');
      return undefined;
    }
  }

  async function loadVct({ collectionId }: { collectionId: string }) {
    try {
      if (!collectionId || typeof collectionId !== 'string') {
        throw new Error('Collection ID is required');
      }
      if (CACHE.hasVctSurveyTemplate(collectionId)) {
        return CACHE.getVctSurveyTemplate(collectionId);
      }
      if (!CACHE.hasVctServiceEndpoint(collectionId)) {
        throw new Error(`VCT service endpoint for collection ${collectionId} not found`);
      }
      const vctServiceEndpoint = CACHE.getVctServiceEndpoint(collectionId)!;
      // const vctEncrypted = CACHE.getVctEncrypted(collectionId)!;
      const response = await fetch(vctServiceEndpoint);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? data.message ?? response.statusText);
      }
      const data = await response.json();
      CACHE.setVctSurveyTemplate(collectionId, data);
      return CACHE.getVctSurveyTemplate(collectionId);
    } catch (error) {
      console.error('loadVct', error);
      setStepToError(error instanceof Error ? error.message : 'An unknown error occurred');
      return undefined;
    }
  }

  async function loadBco({ collectionId }: { collectionId: string }) {
    try {
      if (!collectionId || typeof collectionId !== 'string') {
        throw new Error('Collection ID is required');
      }
      if (CACHE.hasBcoSurveyTemplate(collectionId)) {
        return CACHE.getBcoSurveyTemplate(collectionId);
      }
      if (!CACHE.hasBcoServiceEndpoint(collectionId)) {
        throw new Error(`Bco service endpoint for collection ${collectionId} not found`);
      }
      const bcoServiceEndpoint = CACHE.getBcoServiceEndpoint(collectionId)!;
      // const bcoEncrypted = CACHE.getBcoEncrypted(collectionId)!;
      const response = await fetch(bcoServiceEndpoint);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? data.message ?? response.statusText);
      }
      const data = await response.json();
      CACHE.setBcoSurveyTemplate(collectionId, data);
      return CACHE.getBcoSurveyTemplate(collectionId);
    } catch (error) {
      console.error('loadBco', error);
      setStepToError(error instanceof Error ? error.message : 'An unknown error occurred');
      return undefined;
    }
  }

  async function loadBids({ collectionId }: { collectionId: string }) {
    try {
      if (!collectionId || typeof collectionId !== 'string') {
        throw new Error('Collection ID is required');
      }
      const baseUrl = MATRIX_BID_BOT_URL;
      if (!baseUrl) {
        throw new Error('Bid bot URL not found');
      }
      if (!CACHE.hasCollection(collectionId)) {
        throw new Error(`Collection ${collectionId} not found - cannot load bids`);
      }
      const url = baseUrl + '/action';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wallet?.user?.matrix?.accessToken}`,
        },
        body: JSON.stringify({
          action: 'get-bids-by-did',
          flags: {
            collection: collectionId,
            did: wallet?.user?.did,
          },
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        if (data.errcode === 'IXO_BIDS_NOT_FOUND') {
          CACHE.setBids(collectionId, []);
          return [];
        }
        throw new Error(data.error ?? data.message ?? response.statusText);
      }
      const data = await response.json();
      CACHE.setBids(collectionId, data.data);
      return CACHE.getBids(collectionId);
    } catch (error) {
      console.error('loadBids', error);
      setStepToError(error instanceof Error ? error.message : 'An unknown error occurred');
      return undefined;
    }
  }

  useEffect(
    function () {
      if (collectionId && !loadingCollectionIdRef.current) {
        loadingCollectionIdRef.current = collectionId;
        loadClaimCollection({ collectionId });
      }
    },
    [collectionId],
  );

  async function loadClaimCollection({ collectionId }: { collectionId: string }) {
    try {
      setStepToLoadCollection();
      const collection = await loadCollection({ collectionId });
      if (!collection) {
        return;
      }
      setStepToLoadProtocol();
      const protocol = await loadProtocol({ collectionId });
      if (!protocol) {
        return;
      }
      setStepToLoadGrants();
      const grants = await loadGrants({ collectionId });
      if (!grants?.length) {
        setStepToLoadBids();
        const bids = await loadBids({ collectionId });
        if (bids === undefined) {
          return;
        }
        if (!bids.length) {
          setStepToLoadBco();
          const bco = await loadBco({ collectionId });
          if (!bco) {
            return;
          }
          setStepToBcoForm();
          return;
        }
        setStepToBcoPending();
        return;
      }
      setStepToLoadVct();
      const vct = await loadVct({ collectionId });
      if (!vct) {
        return;
      }
      setStepToVctForm();
      return;
    } finally {
      loadingCollectionIdRef.current = undefined;
    }
  }

  return {
    step,
    isLoading:
      stepIsLoadCollection ||
      stepIsLoadGrants ||
      stepIsLoadProtocol ||
      stepIsLoadVct ||
      stepIsLoadBco ||
      stepIsLoadBids,
    errorMessage,
    hasCollection: CACHE.hasCollection(collectionId),
    collection: CACHE.getCollection(collectionId),
    loadClaimCollection: loadClaimCollection,
    hasGrants: CACHE.hasGrants(collectionId),
    loadGrants: loadGrants,
    hasVctSurveyTemplate: CACHE.hasVctSurveyTemplate(collectionId),
    vctSurveyTemplate: CACHE.getVctSurveyTemplate(collectionId),
    loadVct: loadVct,
    hasBcoSurveyTemplate: CACHE.hasBcoSurveyTemplate(collectionId),
    bcoSurveyTemplate: CACHE.getBcoSurveyTemplate(collectionId),
    loadBco: loadBco,
    hasBids: CACHE.hasBids(collectionId),
    bids: CACHE.getBids(collectionId),
    loadBids: loadBids,
  };
}

export default useClaimCollection;
