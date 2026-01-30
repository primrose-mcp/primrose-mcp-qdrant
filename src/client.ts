/**
 * Qdrant API Client
 *
 * Handles all HTTP communication with the Qdrant REST API.
 *
 * MULTI-TENANT: This client receives credentials per-request via TenantCredentials,
 * allowing a single server to serve multiple tenants with different API keys.
 */

import type { TenantCredentials } from './types/env.js';
import type {
  AliasOperations,
  AliasesResponse,
  BatchRequest,
  ClearPayloadRequest,
  ClusterOperationRequest,
  ClusterStatus,
  CollectionClusterInfo,
  CollectionCreateRequest,
  CollectionInfo,
  CollectionUpdateRequest,
  CollectionsResponse,
  CountRequest,
  CountResult,
  CreateFieldIndexRequest,
  CreateShardKeyRequest,
  DeletePayloadRequest,
  DeleteShardKeyRequest,
  DeleteVectorsRequest,
  DiscoverBatchRequest,
  DiscoverRequest,
  DistanceMatrixOffsetsResult,
  DistanceMatrixPairsResult,
  DistanceMatrixRequest,
  GroupsResult,
  LocksOption,
  OverwritePayloadRequest,
  PointId,
  PointStruct,
  PointsDeleteRequest,
  QdrantResponse,
  QueryBatchRequest,
  QueryGroupsRequest,
  QueryRequest,
  RecommendBatchRequest,
  RecommendGroupsRequest,
  RecommendRequest,
  PointRecord,
  ScoredPoint,
  ScrollRequest,
  ScrollResult,
  SearchBatchRequest,
  SearchRequest,
  SetPayloadRequest,
  SnapshotDescription,
  SnapshotRecoverRequest,
  TelemetryData,
  UpdateResult,
  UpdateVectorsRequest,
  VersionInfo,
} from './types/qdrant.js';
import { AuthenticationError, QdrantApiError, RateLimitError } from './utils/errors.js';

// =============================================================================
// Qdrant Client Interface
// =============================================================================

export interface QdrantClient {
  // Connection
  testConnection(): Promise<{ connected: boolean; message: string }>;

  // Service
  getVersion(): Promise<VersionInfo>;
  getTelemetry(anonymize?: boolean): Promise<TelemetryData>;
  getMetrics(): Promise<string>;
  getLocks(): Promise<LocksOption>;
  setLocks(locks: LocksOption): Promise<LocksOption>;

  // Collections
  listCollections(): Promise<CollectionsResponse>;
  getCollection(collectionName: string): Promise<CollectionInfo>;
  collectionExists(collectionName: string): Promise<boolean>;
  createCollection(collectionName: string, config: CollectionCreateRequest): Promise<boolean>;
  updateCollection(collectionName: string, config: CollectionUpdateRequest): Promise<boolean>;
  deleteCollection(collectionName: string): Promise<boolean>;

  // Aliases
  listAliases(): Promise<AliasesResponse>;
  getCollectionAliases(collectionName: string): Promise<AliasesResponse>;
  updateAliases(operations: AliasOperations): Promise<boolean>;

  // Points
  upsertPoints(collectionName: string, points: PointStruct[], wait?: boolean): Promise<UpdateResult>;
  getPoints(
    collectionName: string,
    ids: PointId[],
    withPayload?: boolean,
    withVector?: boolean
  ): Promise<PointRecord[]>;
  getPoint(collectionName: string, id: PointId): Promise<PointRecord>;
  deletePoints(collectionName: string, request: PointsDeleteRequest, wait?: boolean): Promise<UpdateResult>;
  scrollPoints(collectionName: string, request: ScrollRequest): Promise<ScrollResult>;
  countPoints(collectionName: string, request?: CountRequest): Promise<CountResult>;

  // Vectors
  updateVectors(collectionName: string, request: UpdateVectorsRequest, wait?: boolean): Promise<UpdateResult>;
  deleteVectors(collectionName: string, request: DeleteVectorsRequest, wait?: boolean): Promise<UpdateResult>;

  // Payload
  setPayload(collectionName: string, request: SetPayloadRequest, wait?: boolean): Promise<UpdateResult>;
  overwritePayload(collectionName: string, request: OverwritePayloadRequest, wait?: boolean): Promise<UpdateResult>;
  deletePayload(collectionName: string, request: DeletePayloadRequest, wait?: boolean): Promise<UpdateResult>;
  clearPayload(collectionName: string, request: ClearPayloadRequest, wait?: boolean): Promise<UpdateResult>;

  // Batch
  batchUpdate(collectionName: string, request: BatchRequest, wait?: boolean): Promise<UpdateResult[]>;

  // Search (Legacy)
  search(collectionName: string, request: SearchRequest): Promise<ScoredPoint[]>;
  searchBatch(collectionName: string, request: SearchBatchRequest): Promise<ScoredPoint[][]>;

  // Query API (Universal)
  query(collectionName: string, request: QueryRequest): Promise<ScoredPoint[]>;
  queryBatch(collectionName: string, request: QueryBatchRequest): Promise<ScoredPoint[][]>;
  queryGroups(collectionName: string, request: QueryGroupsRequest): Promise<GroupsResult>;

  // Recommend
  recommend(collectionName: string, request: RecommendRequest): Promise<ScoredPoint[]>;
  recommendBatch(collectionName: string, request: RecommendBatchRequest): Promise<ScoredPoint[][]>;
  recommendGroups(collectionName: string, request: RecommendGroupsRequest): Promise<GroupsResult>;

  // Discover
  discover(collectionName: string, request: DiscoverRequest): Promise<ScoredPoint[]>;
  discoverBatch(collectionName: string, request: DiscoverBatchRequest): Promise<ScoredPoint[][]>;

  // Distance Matrix
  searchMatrixPairs(collectionName: string, request: DistanceMatrixRequest): Promise<DistanceMatrixPairsResult>;
  searchMatrixOffsets(collectionName: string, request: DistanceMatrixRequest): Promise<DistanceMatrixOffsetsResult>;

  // Snapshots - Collection
  listSnapshots(collectionName: string): Promise<SnapshotDescription[]>;
  createSnapshot(collectionName: string, wait?: boolean): Promise<SnapshotDescription>;
  deleteSnapshot(collectionName: string, snapshotName: string, wait?: boolean): Promise<boolean>;
  recoverSnapshot(collectionName: string, request: SnapshotRecoverRequest, wait?: boolean): Promise<boolean>;

  // Snapshots - Full Storage
  listFullSnapshots(): Promise<SnapshotDescription[]>;
  createFullSnapshot(wait?: boolean): Promise<SnapshotDescription>;
  deleteFullSnapshot(snapshotName: string, wait?: boolean): Promise<boolean>;

  // Cluster
  getClusterStatus(): Promise<ClusterStatus>;
  recoverCluster(): Promise<boolean>;
  removePeer(peerId: number, force?: boolean): Promise<boolean>;
  getCollectionClusterInfo(collectionName: string): Promise<CollectionClusterInfo>;
  updateCollectionCluster(collectionName: string, request: ClusterOperationRequest): Promise<boolean>;

  // Shards
  createShardKey(collectionName: string, request: CreateShardKeyRequest): Promise<boolean>;
  deleteShardKey(collectionName: string, request: DeleteShardKeyRequest): Promise<boolean>;

  // Indexes
  createFieldIndex(
    collectionName: string,
    fieldName: string,
    request?: CreateFieldIndexRequest,
    wait?: boolean
  ): Promise<UpdateResult>;
  deleteFieldIndex(collectionName: string, fieldName: string, wait?: boolean): Promise<UpdateResult>;
}

// =============================================================================
// Qdrant Client Implementation
// =============================================================================

class QdrantClientImpl implements QdrantClient {
  private credentials: TenantCredentials;
  private baseUrl: string;

  constructor(credentials: TenantCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.baseUrl || '';
  }

  // ===========================================================================
  // HTTP Request Helper
  // ===========================================================================

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.credentials.apiKey) {
      headers['api-key'] = this.credentials.apiKey;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.baseUrl) {
      throw new AuthenticationError('No Qdrant URL provided. Set X-Qdrant-Base-URL header.');
    }

    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitError('Rate limit exceeded', retryAfter ? parseInt(retryAfter, 10) : 60);
    }

    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError('Authentication failed. Check your API key.');
    }

    // Handle other errors
    if (!response.ok) {
      const errorBody = await response.text();
      let message = `API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorBody);
        message = errorJson.status?.error || errorJson.message || errorJson.error || message;
      } catch {
        // Use default message
      }
      throw new QdrantApiError(message, response.status);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // Check content type for metrics endpoint
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/plain')) {
      return (await response.text()) as T;
    }

    const json = (await response.json()) as QdrantResponse<T>;
    return json.result;
  }

  // ===========================================================================
  // Connection
  // ===========================================================================

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const version = await this.getVersion();
      return {
        connected: true,
        message: `Connected to Qdrant ${version.version}`,
      };
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  // ===========================================================================
  // Service
  // ===========================================================================

  async getVersion(): Promise<VersionInfo> {
    return this.request<VersionInfo>('/');
  }

  async getTelemetry(anonymize = true): Promise<TelemetryData> {
    return this.request<TelemetryData>(`/telemetry${anonymize ? '?anonymize=true' : ''}`);
  }

  async getMetrics(): Promise<string> {
    return this.request<string>('/metrics');
  }

  async getLocks(): Promise<LocksOption> {
    return this.request<LocksOption>('/locks');
  }

  async setLocks(locks: LocksOption): Promise<LocksOption> {
    return this.request<LocksOption>('/locks', {
      method: 'POST',
      body: JSON.stringify(locks),
    });
  }

  // ===========================================================================
  // Collections
  // ===========================================================================

  async listCollections(): Promise<CollectionsResponse> {
    return this.request<CollectionsResponse>('/collections');
  }

  async getCollection(collectionName: string): Promise<CollectionInfo> {
    return this.request<CollectionInfo>(`/collections/${encodeURIComponent(collectionName)}`);
  }

  async collectionExists(collectionName: string): Promise<boolean> {
    const result = await this.request<{ exists: boolean }>(
      `/collections/${encodeURIComponent(collectionName)}/exists`
    );
    return result.exists;
  }

  async createCollection(collectionName: string, config: CollectionCreateRequest): Promise<boolean> {
    await this.request<boolean>(`/collections/${encodeURIComponent(collectionName)}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    return true;
  }

  async updateCollection(collectionName: string, config: CollectionUpdateRequest): Promise<boolean> {
    await this.request<boolean>(`/collections/${encodeURIComponent(collectionName)}`, {
      method: 'PATCH',
      body: JSON.stringify(config),
    });
    return true;
  }

  async deleteCollection(collectionName: string): Promise<boolean> {
    await this.request<boolean>(`/collections/${encodeURIComponent(collectionName)}`, {
      method: 'DELETE',
    });
    return true;
  }

  // ===========================================================================
  // Aliases
  // ===========================================================================

  async listAliases(): Promise<AliasesResponse> {
    return this.request<AliasesResponse>('/aliases');
  }

  async getCollectionAliases(collectionName: string): Promise<AliasesResponse> {
    return this.request<AliasesResponse>(
      `/collections/${encodeURIComponent(collectionName)}/aliases`
    );
  }

  async updateAliases(operations: AliasOperations): Promise<boolean> {
    await this.request<boolean>('/collections/aliases', {
      method: 'POST',
      body: JSON.stringify(operations),
    });
    return true;
  }

  // ===========================================================================
  // Points
  // ===========================================================================

  async upsertPoints(
    collectionName: string,
    points: PointStruct[],
    wait = true
  ): Promise<UpdateResult> {
    return this.request<UpdateResult>(
      `/collections/${encodeURIComponent(collectionName)}/points?wait=${wait}`,
      {
        method: 'PUT',
        body: JSON.stringify({ points }),
      }
    );
  }

  async getPoints(
    collectionName: string,
    ids: PointId[],
    withPayload = true,
    withVector = false
  ): Promise<PointRecord[]> {
    return this.request<PointRecord[]>(
      `/collections/${encodeURIComponent(collectionName)}/points`,
      {
        method: 'POST',
        body: JSON.stringify({
          ids,
          with_payload: withPayload,
          with_vector: withVector,
        }),
      }
    );
  }

  async getPoint(collectionName: string, id: PointId): Promise<PointRecord> {
    return this.request<PointRecord>(
      `/collections/${encodeURIComponent(collectionName)}/points/${encodeURIComponent(String(id))}`
    );
  }

  async deletePoints(
    collectionName: string,
    request: PointsDeleteRequest,
    wait = true
  ): Promise<UpdateResult> {
    return this.request<UpdateResult>(
      `/collections/${encodeURIComponent(collectionName)}/points/delete?wait=${wait}`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  async scrollPoints(collectionName: string, request: ScrollRequest): Promise<ScrollResult> {
    return this.request<ScrollResult>(
      `/collections/${encodeURIComponent(collectionName)}/points/scroll`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  async countPoints(collectionName: string, request: CountRequest = {}): Promise<CountResult> {
    return this.request<CountResult>(
      `/collections/${encodeURIComponent(collectionName)}/points/count`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  // ===========================================================================
  // Vectors
  // ===========================================================================

  async updateVectors(
    collectionName: string,
    request: UpdateVectorsRequest,
    wait = true
  ): Promise<UpdateResult> {
    return this.request<UpdateResult>(
      `/collections/${encodeURIComponent(collectionName)}/points/vectors?wait=${wait}`,
      {
        method: 'PUT',
        body: JSON.stringify(request),
      }
    );
  }

  async deleteVectors(
    collectionName: string,
    request: DeleteVectorsRequest,
    wait = true
  ): Promise<UpdateResult> {
    return this.request<UpdateResult>(
      `/collections/${encodeURIComponent(collectionName)}/points/vectors/delete?wait=${wait}`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  // ===========================================================================
  // Payload
  // ===========================================================================

  async setPayload(
    collectionName: string,
    request: SetPayloadRequest,
    wait = true
  ): Promise<UpdateResult> {
    return this.request<UpdateResult>(
      `/collections/${encodeURIComponent(collectionName)}/points/payload?wait=${wait}`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  async overwritePayload(
    collectionName: string,
    request: OverwritePayloadRequest,
    wait = true
  ): Promise<UpdateResult> {
    return this.request<UpdateResult>(
      `/collections/${encodeURIComponent(collectionName)}/points/payload?wait=${wait}`,
      {
        method: 'PUT',
        body: JSON.stringify(request),
      }
    );
  }

  async deletePayload(
    collectionName: string,
    request: DeletePayloadRequest,
    wait = true
  ): Promise<UpdateResult> {
    return this.request<UpdateResult>(
      `/collections/${encodeURIComponent(collectionName)}/points/payload/delete?wait=${wait}`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  async clearPayload(
    collectionName: string,
    request: ClearPayloadRequest,
    wait = true
  ): Promise<UpdateResult> {
    return this.request<UpdateResult>(
      `/collections/${encodeURIComponent(collectionName)}/points/payload/clear?wait=${wait}`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  // ===========================================================================
  // Batch
  // ===========================================================================

  async batchUpdate(
    collectionName: string,
    request: BatchRequest,
    wait = true
  ): Promise<UpdateResult[]> {
    return this.request<UpdateResult[]>(
      `/collections/${encodeURIComponent(collectionName)}/points/batch?wait=${wait}`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  // ===========================================================================
  // Search (Legacy)
  // ===========================================================================

  async search(collectionName: string, request: SearchRequest): Promise<ScoredPoint[]> {
    return this.request<ScoredPoint[]>(
      `/collections/${encodeURIComponent(collectionName)}/points/search`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  async searchBatch(collectionName: string, request: SearchBatchRequest): Promise<ScoredPoint[][]> {
    return this.request<ScoredPoint[][]>(
      `/collections/${encodeURIComponent(collectionName)}/points/search/batch`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  // ===========================================================================
  // Query API (Universal)
  // ===========================================================================

  async query(collectionName: string, request: QueryRequest): Promise<ScoredPoint[]> {
    return this.request<ScoredPoint[]>(
      `/collections/${encodeURIComponent(collectionName)}/points/query`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  async queryBatch(collectionName: string, request: QueryBatchRequest): Promise<ScoredPoint[][]> {
    return this.request<ScoredPoint[][]>(
      `/collections/${encodeURIComponent(collectionName)}/points/query/batch`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  async queryGroups(collectionName: string, request: QueryGroupsRequest): Promise<GroupsResult> {
    return this.request<GroupsResult>(
      `/collections/${encodeURIComponent(collectionName)}/points/query/groups`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  // ===========================================================================
  // Recommend
  // ===========================================================================

  async recommend(collectionName: string, request: RecommendRequest): Promise<ScoredPoint[]> {
    return this.request<ScoredPoint[]>(
      `/collections/${encodeURIComponent(collectionName)}/points/recommend`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  async recommendBatch(
    collectionName: string,
    request: RecommendBatchRequest
  ): Promise<ScoredPoint[][]> {
    return this.request<ScoredPoint[][]>(
      `/collections/${encodeURIComponent(collectionName)}/points/recommend/batch`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  async recommendGroups(
    collectionName: string,
    request: RecommendGroupsRequest
  ): Promise<GroupsResult> {
    return this.request<GroupsResult>(
      `/collections/${encodeURIComponent(collectionName)}/points/recommend/groups`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  // ===========================================================================
  // Discover
  // ===========================================================================

  async discover(collectionName: string, request: DiscoverRequest): Promise<ScoredPoint[]> {
    return this.request<ScoredPoint[]>(
      `/collections/${encodeURIComponent(collectionName)}/points/discover`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  async discoverBatch(
    collectionName: string,
    request: DiscoverBatchRequest
  ): Promise<ScoredPoint[][]> {
    return this.request<ScoredPoint[][]>(
      `/collections/${encodeURIComponent(collectionName)}/points/discover/batch`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  // ===========================================================================
  // Distance Matrix
  // ===========================================================================

  async searchMatrixPairs(
    collectionName: string,
    request: DistanceMatrixRequest
  ): Promise<DistanceMatrixPairsResult> {
    return this.request<DistanceMatrixPairsResult>(
      `/collections/${encodeURIComponent(collectionName)}/points/search/matrix/pairs`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  async searchMatrixOffsets(
    collectionName: string,
    request: DistanceMatrixRequest
  ): Promise<DistanceMatrixOffsetsResult> {
    return this.request<DistanceMatrixOffsetsResult>(
      `/collections/${encodeURIComponent(collectionName)}/points/search/matrix/offsets`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  // ===========================================================================
  // Snapshots - Collection
  // ===========================================================================

  async listSnapshots(collectionName: string): Promise<SnapshotDescription[]> {
    return this.request<SnapshotDescription[]>(
      `/collections/${encodeURIComponent(collectionName)}/snapshots`
    );
  }

  async createSnapshot(collectionName: string, wait = true): Promise<SnapshotDescription> {
    return this.request<SnapshotDescription>(
      `/collections/${encodeURIComponent(collectionName)}/snapshots?wait=${wait}`,
      {
        method: 'POST',
      }
    );
  }

  async deleteSnapshot(collectionName: string, snapshotName: string, wait = true): Promise<boolean> {
    await this.request<boolean>(
      `/collections/${encodeURIComponent(collectionName)}/snapshots/${encodeURIComponent(snapshotName)}?wait=${wait}`,
      {
        method: 'DELETE',
      }
    );
    return true;
  }

  async recoverSnapshot(
    collectionName: string,
    request: SnapshotRecoverRequest,
    wait = true
  ): Promise<boolean> {
    await this.request<boolean>(
      `/collections/${encodeURIComponent(collectionName)}/snapshots/recover?wait=${wait}`,
      {
        method: 'PUT',
        body: JSON.stringify(request),
      }
    );
    return true;
  }

  // ===========================================================================
  // Snapshots - Full Storage
  // ===========================================================================

  async listFullSnapshots(): Promise<SnapshotDescription[]> {
    return this.request<SnapshotDescription[]>('/snapshots');
  }

  async createFullSnapshot(wait = true): Promise<SnapshotDescription> {
    return this.request<SnapshotDescription>(`/snapshots?wait=${wait}`, {
      method: 'POST',
    });
  }

  async deleteFullSnapshot(snapshotName: string, wait = true): Promise<boolean> {
    await this.request<boolean>(`/snapshots/${encodeURIComponent(snapshotName)}?wait=${wait}`, {
      method: 'DELETE',
    });
    return true;
  }

  // ===========================================================================
  // Cluster
  // ===========================================================================

  async getClusterStatus(): Promise<ClusterStatus> {
    return this.request<ClusterStatus>('/cluster');
  }

  async recoverCluster(): Promise<boolean> {
    await this.request<boolean>('/cluster/recover', {
      method: 'POST',
    });
    return true;
  }

  async removePeer(peerId: number, force = false): Promise<boolean> {
    await this.request<boolean>(`/cluster/peer/${peerId}?force=${force}`, {
      method: 'DELETE',
    });
    return true;
  }

  async getCollectionClusterInfo(collectionName: string): Promise<CollectionClusterInfo> {
    return this.request<CollectionClusterInfo>(
      `/collections/${encodeURIComponent(collectionName)}/cluster`
    );
  }

  async updateCollectionCluster(
    collectionName: string,
    request: ClusterOperationRequest
  ): Promise<boolean> {
    await this.request<boolean>(`/collections/${encodeURIComponent(collectionName)}/cluster`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return true;
  }

  // ===========================================================================
  // Shards
  // ===========================================================================

  async createShardKey(collectionName: string, request: CreateShardKeyRequest): Promise<boolean> {
    await this.request<boolean>(
      `/collections/${encodeURIComponent(collectionName)}/shards`,
      {
        method: 'PUT',
        body: JSON.stringify(request),
      }
    );
    return true;
  }

  async deleteShardKey(collectionName: string, request: DeleteShardKeyRequest): Promise<boolean> {
    await this.request<boolean>(
      `/collections/${encodeURIComponent(collectionName)}/shards/delete`,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
    return true;
  }

  // ===========================================================================
  // Indexes
  // ===========================================================================

  async createFieldIndex(
    collectionName: string,
    fieldName: string,
    request?: CreateFieldIndexRequest,
    wait = true
  ): Promise<UpdateResult> {
    return this.request<UpdateResult>(
      `/collections/${encodeURIComponent(collectionName)}/index?wait=${wait}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          field_name: fieldName,
          ...request,
        }),
      }
    );
  }

  async deleteFieldIndex(collectionName: string, fieldName: string, wait = true): Promise<UpdateResult> {
    return this.request<UpdateResult>(
      `/collections/${encodeURIComponent(collectionName)}/index/${encodeURIComponent(fieldName)}?wait=${wait}`,
      {
        method: 'DELETE',
      }
    );
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a Qdrant client instance with tenant-specific credentials.
 *
 * MULTI-TENANT: Each request provides its own credentials via headers,
 * allowing a single server deployment to serve multiple tenants.
 *
 * @param credentials - Tenant credentials parsed from request headers
 */
export function createQdrantClient(credentials: TenantCredentials): QdrantClient {
  return new QdrantClientImpl(credentials);
}
