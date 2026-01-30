/**
 * Qdrant API Types
 *
 * Type definitions for Qdrant vector database entities and operations.
 */

// =============================================================================
// Common Types
// =============================================================================

export type PointId = string | number;

export type Distance = 'Cosine' | 'Euclid' | 'Dot' | 'Manhattan';

export type Datatype = 'float32' | 'uint8' | 'float16';

// =============================================================================
// Vector Configuration
// =============================================================================

export interface VectorParams {
  size: number;
  distance: Distance;
  hnsw_config?: HnswConfig;
  quantization_config?: QuantizationConfig;
  on_disk?: boolean;
  datatype?: Datatype;
}

export interface SparseVectorParams {
  index?: SparseIndexConfig;
  modifier?: 'none' | 'idf';
}

export interface SparseIndexConfig {
  full_scan_threshold?: number;
  on_disk?: boolean;
  datatype?: Datatype;
}

export type VectorsConfig = VectorParams | Record<string, VectorParams>;

export interface HnswConfig {
  m?: number;
  ef_construct?: number;
  full_scan_threshold?: number;
  max_indexing_threads?: number;
  on_disk?: boolean;
  payload_m?: number;
}

export interface QuantizationConfig {
  scalar?: ScalarQuantization;
  product?: ProductQuantization;
  binary?: BinaryQuantization;
}

export interface ScalarQuantization {
  type: 'int8';
  quantile?: number;
  always_ram?: boolean;
}

export interface ProductQuantization {
  compression: 'x4' | 'x8' | 'x16' | 'x32' | 'x64';
  always_ram?: boolean;
}

export interface BinaryQuantization {
  always_ram?: boolean;
}

// =============================================================================
// Collection Types
// =============================================================================

export interface CollectionInfo {
  status: 'green' | 'yellow' | 'red' | 'grey';
  optimizer_status: 'ok' | { error: string };
  vectors_count?: number;
  indexed_vectors_count?: number;
  points_count?: number;
  segments_count?: number;
  config: CollectionConfig;
  payload_schema: Record<string, PayloadSchemaInfo>;
}

export interface CollectionConfig {
  params: CollectionParams;
  hnsw_config: HnswConfig;
  optimizer_config: OptimizerConfig;
  wal_config: WalConfig;
  quantization_config?: QuantizationConfig;
}

export interface CollectionParams {
  vectors: VectorsConfig;
  shard_number?: number;
  sharding_method?: 'auto' | 'custom';
  replication_factor?: number;
  write_consistency_factor?: number;
  read_fan_out_factor?: number;
  on_disk_payload?: boolean;
  sparse_vectors?: Record<string, SparseVectorParams>;
}

export interface OptimizerConfig {
  deleted_threshold?: number;
  vacuum_min_vector_number?: number;
  default_segment_number?: number;
  max_segment_size?: number;
  memmap_threshold?: number;
  indexing_threshold?: number;
  flush_interval_sec?: number;
  max_optimization_threads?: number;
}

export interface WalConfig {
  wal_capacity_mb?: number;
  wal_segments_ahead?: number;
}

export interface PayloadSchemaInfo {
  data_type: PayloadFieldType;
  params?: PayloadIndexParams;
  points?: number;
}

export type PayloadFieldType =
  | 'keyword'
  | 'integer'
  | 'float'
  | 'bool'
  | 'geo'
  | 'datetime'
  | 'text'
  | 'uuid';

export interface PayloadIndexParams {
  type?: string;
  tokenizer?: 'prefix' | 'whitespace' | 'word' | 'multilingual';
  min_token_len?: number;
  max_token_len?: number;
  lowercase?: boolean;
}

export interface CollectionCreateRequest {
  vectors: VectorsConfig;
  shard_number?: number;
  sharding_method?: 'auto' | 'custom';
  replication_factor?: number;
  write_consistency_factor?: number;
  on_disk_payload?: boolean;
  hnsw_config?: HnswConfig;
  wal_config?: WalConfig;
  optimizers_config?: OptimizerConfig;
  init_from?: { collection: string };
  quantization_config?: QuantizationConfig;
  sparse_vectors?: Record<string, SparseVectorParams>;
}

export interface CollectionUpdateRequest {
  vectors?: Record<string, VectorParamsUpdate>;
  optimizers_config?: OptimizerConfig;
  params?: CollectionParamsUpdate;
  hnsw_config?: HnswConfig;
  quantization_config?: QuantizationConfig;
  sparse_vectors?: Record<string, SparseVectorParams>;
}

export interface VectorParamsUpdate {
  hnsw_config?: HnswConfig;
  quantization_config?: QuantizationConfig;
  on_disk?: boolean;
}

export interface CollectionParamsUpdate {
  replication_factor?: number;
  write_consistency_factor?: number;
  read_fan_out_factor?: number;
  on_disk_payload?: boolean;
}

export interface CollectionDescription {
  name: string;
}

export interface CollectionsResponse {
  collections: CollectionDescription[];
}

// =============================================================================
// Alias Types
// =============================================================================

export interface AliasDescription {
  alias_name: string;
  collection_name: string;
}

export interface AliasesResponse {
  aliases: AliasDescription[];
}

export interface AliasOperations {
  actions: AliasAction[];
}

export type AliasAction =
  | { create_alias: { collection_name: string; alias_name: string } }
  | { delete_alias: { alias_name: string } }
  | { rename_alias: { old_alias_name: string; new_alias_name: string } };

// =============================================================================
// Point Types
// =============================================================================

export type Vector = number[] | Record<string, number[] | SparseVector>;

export interface SparseVector {
  indices: number[];
  values: number[];
}

export interface PointStruct {
  id: PointId;
  vector: Vector;
  payload?: Payload;
}

export type Payload = Record<string, PayloadValue>;

export type PayloadValue =
  | string
  | number
  | boolean
  | null
  | PayloadValue[]
  | { [key: string]: PayloadValue };

export interface ScoredPoint {
  id: PointId;
  version: number;
  score: number;
  payload?: Payload;
  vector?: Vector;
  shard_key?: string | number | (string | number)[];
}

export interface PointRecord {
  id: PointId;
  payload?: Payload;
  vector?: Vector;
  shard_key?: string | number | (string | number)[];
}

export interface PointsUpsertRequest {
  batch?: PointsBatch;
  points?: PointStruct[];
}

export interface PointsBatch {
  ids: PointId[];
  vectors: Vector[];
  payloads?: (Payload | null)[];
}

export interface UpdateResult {
  operation_id?: number;
  status: 'acknowledged' | 'completed';
}

// =============================================================================
// Search Types
// =============================================================================

export interface SearchRequest {
  vector: Vector | NamedVector | NearestQuery;
  filter?: Filter;
  params?: SearchParams;
  limit: number;
  offset?: number;
  with_payload?: boolean | string[] | PayloadSelector;
  with_vector?: boolean | string[];
  score_threshold?: number;
}

export interface NamedVector {
  name: string;
  vector: number[];
}

export interface NearestQuery {
  nearest: PointId | number[];
}

export interface SearchParams {
  hnsw_ef?: number;
  exact?: boolean;
  indexed_only?: boolean;
  quantization?: QuantizationSearchParams;
}

export interface QuantizationSearchParams {
  ignore?: boolean;
  rescore?: boolean;
  oversampling?: number;
}

export interface SearchBatchRequest {
  searches: SearchRequest[];
}

// =============================================================================
// Query API Types (Universal Query Interface)
// =============================================================================

export interface QueryRequest {
  prefetch?: Prefetch | Prefetch[];
  query?: Query;
  using?: string;
  filter?: Filter;
  params?: SearchParams;
  score_threshold?: number;
  limit?: number;
  offset?: number;
  with_payload?: boolean | string[] | PayloadSelector;
  with_vector?: boolean | string[];
  lookup_from?: LookupLocation;
}

export type Query =
  | number[] // Dense vector
  | SparseVector // Sparse vector
  | { nearest: PointId | number[] }
  | { recommend: RecommendInput }
  | { discover: DiscoverInput }
  | { context: ContextInput }
  | { order_by: OrderBy }
  | { fusion: 'rrf' | 'dbsf' }
  | { sample: 'random' };

export interface Prefetch {
  prefetch?: Prefetch | Prefetch[];
  query?: Query;
  using?: string;
  filter?: Filter;
  params?: SearchParams;
  score_threshold?: number;
  limit?: number;
  lookup_from?: LookupLocation;
}

export interface RecommendInput {
  positive?: (PointId | number[])[];
  negative?: (PointId | number[])[];
  strategy?: 'average_vector' | 'best_score';
}

export interface DiscoverInput {
  target: PointId | number[];
  context: ContextPair[];
}

export interface ContextInput {
  context: ContextPair[];
}

export interface ContextPair {
  positive: PointId | number[];
  negative: PointId | number[];
}

export interface OrderBy {
  key: string;
  direction?: 'asc' | 'desc';
  start_from?: number | string;
}

export interface LookupLocation {
  collection: string;
  vector?: string;
  shard_key?: string | number | (string | number)[];
}

export interface QueryBatchRequest {
  searches: QueryRequest[];
}

export interface QueryGroupsRequest extends QueryRequest {
  group_by: string;
  group_size?: number;
  with_lookup?: WithLookup;
}

export interface WithLookup {
  collection: string;
  with_payload?: boolean | string[] | PayloadSelector;
  with_vectors?: boolean | string[];
}

export interface GroupsResult {
  groups: PointGroup[];
}

export interface PointGroup {
  id: PayloadValue;
  hits: ScoredPoint[];
  lookup?: PointRecord;
}

// =============================================================================
// Scroll Types
// =============================================================================

export interface ScrollRequest {
  filter?: Filter;
  limit?: number;
  offset?: PointId;
  with_payload?: boolean | string[] | PayloadSelector;
  with_vector?: boolean | string[];
  order_by?: OrderBy;
}

export interface ScrollResult {
  points: PointRecord[];
  next_page_offset?: PointId;
}

// =============================================================================
// Count Types
// =============================================================================

export interface CountRequest {
  filter?: Filter;
  exact?: boolean;
}

export interface CountResult {
  count: number;
}

// =============================================================================
// Filter Types
// =============================================================================

export interface Filter {
  must?: Condition[];
  must_not?: Condition[];
  should?: Condition[];
  min_should?: MinShould;
}

export interface MinShould {
  conditions: Condition[];
  min_count: number;
}

export type Condition =
  | FieldCondition
  | IsEmptyCondition
  | IsNullCondition
  | HasIdCondition
  | NestedCondition
  | Filter;

export interface FieldCondition {
  key: string;
  match?: MatchCondition;
  range?: RangeCondition;
  geo_bounding_box?: GeoBoundingBox;
  geo_radius?: GeoRadius;
  geo_polygon?: GeoPolygon;
  values_count?: ValuesCount;
  datetime_range?: DatetimeRange;
}

export type MatchCondition =
  | { value: string | number | boolean }
  | { text: string }
  | { any: (string | number)[] }
  | { except: (string | number)[] };

export interface RangeCondition {
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
}

export interface DatetimeRange {
  lt?: string;
  lte?: string;
  gt?: string;
  gte?: string;
}

export interface GeoBoundingBox {
  top_left: GeoPoint;
  bottom_right: GeoPoint;
}

export interface GeoRadius {
  center: GeoPoint;
  radius: number;
}

export interface GeoPolygon {
  exterior: GeoLineString;
  interiors?: GeoLineString[];
}

export interface GeoLineString {
  points: GeoPoint[];
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface ValuesCount {
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
}

export interface IsEmptyCondition {
  is_empty: { key: string };
}

export interface IsNullCondition {
  is_null: { key: string };
}

export interface HasIdCondition {
  has_id: PointId[];
}

export interface NestedCondition {
  nested: {
    key: string;
    filter: Filter;
  };
}

// =============================================================================
// Payload Selector
// =============================================================================

export interface PayloadSelector {
  include?: string[];
  exclude?: string[];
}

// =============================================================================
// Payload Operations
// =============================================================================

export interface SetPayloadRequest {
  payload: Payload;
  points?: PointId[];
  filter?: Filter;
  key?: string;
}

export interface DeletePayloadRequest {
  keys: string[];
  points?: PointId[];
  filter?: Filter;
}

export interface ClearPayloadRequest {
  points?: PointId[];
  filter?: Filter;
}

export interface OverwritePayloadRequest {
  payload: Payload;
  points?: PointId[];
  filter?: Filter;
}

// =============================================================================
// Points Delete Types
// =============================================================================

export interface PointsDeleteRequest {
  points?: PointId[];
  filter?: Filter;
}

// =============================================================================
// Vector Operations
// =============================================================================

export interface UpdateVectorsRequest {
  points: {
    id: PointId;
    vector: Vector;
  }[];
}

export interface DeleteVectorsRequest {
  points?: PointId[];
  filter?: Filter;
  vector: string[];
}

// =============================================================================
// Batch Operations
// =============================================================================

export type BatchOperation =
  | { upsert: PointsUpsertRequest }
  | { delete: PointsDeleteRequest }
  | { set_payload: SetPayloadRequest }
  | { overwrite_payload: OverwritePayloadRequest }
  | { delete_payload: DeletePayloadRequest }
  | { clear_payload: ClearPayloadRequest }
  | { update_vectors: UpdateVectorsRequest }
  | { delete_vectors: DeleteVectorsRequest };

export interface BatchRequest {
  operations: BatchOperation[];
}

// =============================================================================
// Recommend Types
// =============================================================================

export interface RecommendRequest {
  positive?: (PointId | number[])[];
  negative?: (PointId | number[])[];
  strategy?: 'average_vector' | 'best_score';
  filter?: Filter;
  params?: SearchParams;
  limit: number;
  offset?: number;
  with_payload?: boolean | string[] | PayloadSelector;
  with_vector?: boolean | string[];
  score_threshold?: number;
  using?: string;
  lookup_from?: LookupLocation;
}

export interface RecommendBatchRequest {
  searches: RecommendRequest[];
}

export interface RecommendGroupsRequest extends RecommendRequest {
  group_by: string;
  group_size?: number;
  with_lookup?: WithLookup;
}

// =============================================================================
// Discover Types
// =============================================================================

export interface DiscoverRequest {
  target: PointId | number[];
  context: ContextPair[];
  filter?: Filter;
  params?: SearchParams;
  limit: number;
  offset?: number;
  with_payload?: boolean | string[] | PayloadSelector;
  with_vector?: boolean | string[];
  using?: string;
  lookup_from?: LookupLocation;
}

export interface DiscoverBatchRequest {
  searches: DiscoverRequest[];
}

// =============================================================================
// Snapshot Types
// =============================================================================

export interface SnapshotDescription {
  name: string;
  creation_time?: string;
  size: number;
  checksum?: string;
}

export interface SnapshotRecoverRequest {
  location: string;
  priority?: 'snapshot' | 'replica' | 'no_sync';
  checksum?: string;
  api_key?: string;
}

// =============================================================================
// Cluster Types
// =============================================================================

export interface ClusterStatus {
  status: 'disabled' | 'enabled';
  peer_id?: number;
  peers?: Record<string, PeerInfo>;
  raft_info?: RaftInfo;
  consensus_thread_status?: ConsensusThreadStatus;
  message_send_failures?: Record<string, MessageSendFailure>;
}

export interface PeerInfo {
  uri: string;
}

export interface RaftInfo {
  term: number;
  commit: number;
  pending_operations: number;
  leader?: number;
  role?: 'Follower' | 'Leader' | 'Candidate';
  is_voter: boolean;
}

export interface ConsensusThreadStatus {
  consensus_thread_status: 'working' | 'stopped' | { stopped_with_error: string };
  last_update?: string;
}

export interface MessageSendFailure {
  count: number;
  latest?: string;
}

export interface CollectionClusterInfo {
  peer_id: number;
  shard_count: number;
  local_shards: LocalShardInfo[];
  remote_shards: RemoteShardInfo[];
  shard_transfers: ShardTransferInfo[];
}

export interface LocalShardInfo {
  shard_id: number;
  shard_key?: string | number | (string | number)[];
  points_count: number;
  state: ShardState;
}

export interface RemoteShardInfo {
  shard_id: number;
  shard_key?: string | number | (string | number)[];
  peer_id: number;
  state: ShardState;
}

export type ShardState = 'Active' | 'Dead' | 'Partial' | 'Initializing' | 'Listener' | 'PartialSnapshot' | 'Recovery';

export interface ShardTransferInfo {
  shard_id: number;
  from: number;
  to: number;
  sync: boolean;
  method?: 'stream_records' | 'snapshot' | 'wal_delta' | 'resharding_stream_records';
  comment?: string;
}

export interface ClusterOperationRequest {
  move_shard?: MoveShard;
  replicate_shard?: ReplicateShard;
  abort_transfer?: AbortTransfer;
  drop_replica?: DropReplica;
  create_sharding_key?: CreateShardingKey;
  delete_sharding_key?: DeleteShardingKey;
  restart_transfer?: RestartTransfer;
}

export interface MoveShard {
  shard_id: number;
  from_peer_id: number;
  to_peer_id: number;
  method?: 'stream_records' | 'snapshot' | 'wal_delta';
}

export interface ReplicateShard {
  shard_id: number;
  from_peer_id: number;
  to_peer_id: number;
  method?: 'stream_records' | 'snapshot' | 'wal_delta';
}

export interface AbortTransfer {
  shard_id: number;
  from_peer_id: number;
  to_peer_id: number;
}

export interface DropReplica {
  shard_id: number;
  peer_id: number;
}

export interface CreateShardingKey {
  shard_key: string | number;
  shards_number?: number;
  replication_factor?: number;
  placement?: number[];
}

export interface DeleteShardingKey {
  shard_key: string | number;
}

export interface RestartTransfer {
  shard_id: number;
  from_peer_id: number;
  to_peer_id: number;
  method: 'stream_records' | 'snapshot' | 'wal_delta';
}

// =============================================================================
// Index Types
// =============================================================================

export interface CreateFieldIndexRequest {
  field_name: string;
  field_schema?: PayloadFieldSchema;
}

export type PayloadFieldSchema =
  | 'keyword'
  | 'integer'
  | 'float'
  | 'bool'
  | 'geo'
  | 'datetime'
  | 'text'
  | 'uuid'
  | TextIndexParams
  | IntegerIndexParams;

export interface TextIndexParams {
  type: 'text';
  tokenizer?: 'prefix' | 'whitespace' | 'word' | 'multilingual';
  min_token_len?: number;
  max_token_len?: number;
  lowercase?: boolean;
}

export interface IntegerIndexParams {
  type: 'integer';
  lookup?: boolean;
  range?: boolean;
}

// =============================================================================
// Service Types
// =============================================================================

export interface VersionInfo {
  title: string;
  version: string;
  commit?: string;
}

export interface TelemetryData {
  id: string;
  app: AppInfo;
  collections: CollectionsTelemetry;
  cluster: ClusterTelemetry;
  requests?: RequestsTelemetry;
}

export interface AppInfo {
  name: string;
  version: string;
  startup: string;
}

export interface CollectionsTelemetry {
  number_of_collections: number;
}

export interface ClusterTelemetry {
  enabled: boolean;
  status?: ClusterStatus;
}

export interface RequestsTelemetry {
  rest: RestRequestsTelemetry;
  grpc: GrpcRequestsTelemetry;
}

export interface RestRequestsTelemetry {
  responses: Record<string, ResponseStats>;
}

export interface GrpcRequestsTelemetry {
  responses: Record<string, ResponseStats>;
}

export interface ResponseStats {
  count: number;
  avg_duration_micros?: number;
  min_duration_micros?: number;
  max_duration_micros?: number;
}

export interface LocksOption {
  write: boolean;
  error_message?: string;
}

// =============================================================================
// Distance Matrix Types
// =============================================================================

export interface DistanceMatrixRequest {
  sample?: number;
  limit?: number;
  filter?: Filter;
}

export interface DistanceMatrixPairsResult {
  pairs: DistancePair[];
}

export interface DistancePair {
  a: PointId;
  b: PointId;
  score: number;
}

export interface DistanceMatrixOffsetsResult {
  offsets_row: number[];
  offsets_col: number[];
  scores: number[];
  ids: PointId[];
}

// =============================================================================
// Shard Key Types
// =============================================================================

export interface CreateShardKeyRequest {
  shard_key: string | number;
  shards_number?: number;
  replication_factor?: number;
  placement?: number[];
}

export interface DeleteShardKeyRequest {
  shard_key: string | number;
}

// =============================================================================
// API Response Wrapper
// =============================================================================

export interface QdrantResponse<T> {
  result: T;
  status: string;
  time: number;
}

export interface QdrantErrorResponse {
  status: {
    error: string;
  };
  time: number;
}
