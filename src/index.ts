/**
 * Qdrant MCP Server - Main Entry Point
 *
 * This file sets up the MCP server using Cloudflare's Agents SDK.
 *
 * MULTI-TENANT ARCHITECTURE:
 * Tenant credentials (API keys, URLs) are parsed from request headers,
 * allowing a single server deployment to serve multiple customers.
 *
 * Required Headers:
 * - X-Qdrant-API-Key: API key for Qdrant authentication
 * - X-Qdrant-Base-URL: Qdrant instance URL (e.g., https://your-cluster.qdrant.io:6333)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { createQdrantClient } from './client.js';
import {
  registerBatchTools,
  registerClusterTools,
  registerCollectionTools,
  registerIndexTools,
  registerPayloadTools,
  registerPointTools,
  registerSearchTools,
  registerServiceTools,
  registerSnapshotTools,
  registerVectorTools,
} from './tools/index.js';
import {
  type Env,
  type TenantCredentials,
  parseTenantCredentials,
  validateCredentials,
} from './types/env.js';

// =============================================================================
// MCP Server Configuration
// =============================================================================

const SERVER_NAME = 'primrose-mcp-qdrant';
const SERVER_VERSION = '1.0.0';

// =============================================================================
// MCP Agent (Stateful - uses Durable Objects)
// =============================================================================

/**
 * McpAgent provides stateful MCP sessions backed by Durable Objects.
 *
 * NOTE: For multi-tenant deployments, use the stateless mode instead.
 * The stateful McpAgent is better suited for single-tenant deployments.
 */
export class QdrantMcpAgent extends McpAgent<Env> {
  server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  async init() {
    throw new Error(
      'Stateful mode (McpAgent) is not supported for multi-tenant deployments. ' +
        'Use the stateless /mcp endpoint with X-Qdrant-API-Key and X-Qdrant-Base-URL headers instead.'
    );
  }
}

// =============================================================================
// Stateless MCP Server (Recommended - no Durable Objects needed)
// =============================================================================

/**
 * Creates a stateless MCP server instance with tenant-specific credentials.
 *
 * MULTI-TENANT: Each request provides credentials via headers, allowing
 * a single server deployment to serve multiple tenants.
 */
function createStatelessServer(credentials: TenantCredentials): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Create client with tenant-specific credentials
  const client = createQdrantClient(credentials);

  // Register all tools
  registerCollectionTools(server, client);
  registerPointTools(server, client);
  registerSearchTools(server, client);
  registerPayloadTools(server, client);
  registerVectorTools(server, client);
  registerBatchTools(server, client);
  registerSnapshotTools(server, client);
  registerClusterTools(server, client);
  registerIndexTools(server, client);
  registerServiceTools(server, client);

  // Test connection tool
  server.tool(
    'qdrant_test_connection',
    'Test the connection to the Qdrant instance',
    {},
    async () => {
      try {
        const result = await client.testConnection();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  return server;
}

// =============================================================================
// Worker Export
// =============================================================================

export default {
  /**
   * Main fetch handler for the Worker
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', server: SERVER_NAME }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stateless MCP with Streamable HTTP
    if (url.pathname === '/mcp' && request.method === 'POST') {
      // Parse tenant credentials from request headers
      const credentials = parseTenantCredentials(request);

      // Validate credentials are present
      try {
        validateCredentials(credentials);
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message: error instanceof Error ? error.message : 'Invalid credentials',
            required_headers: ['X-Qdrant-API-Key', 'X-Qdrant-Base-URL'],
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Create server with tenant-specific credentials
      const server = createStatelessServer(credentials);

      // Import and use createMcpHandler for streamable HTTP
      const { createMcpHandler } = await import('agents/mcp');
      const handler = createMcpHandler(server);
      return handler(request, env, ctx);
    }

    // SSE endpoint for legacy clients
    if (url.pathname === '/sse') {
      return new Response('SSE endpoint requires Durable Objects. Enable in wrangler.jsonc.', {
        status: 501,
      });
    }

    // Default response
    return new Response(
      JSON.stringify({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        description: 'Multi-tenant Qdrant MCP Server',
        endpoints: {
          mcp: '/mcp (POST) - Streamable HTTP MCP endpoint',
          health: '/health - Health check',
        },
        authentication: {
          description: 'Pass tenant credentials via request headers',
          required_headers: {
            'X-Qdrant-API-Key': 'API key for Qdrant authentication',
            'X-Qdrant-Base-URL': 'Qdrant instance URL (e.g., https://your-cluster.qdrant.io:6333)',
          },
        },
        tools: [
          // Collections
          'qdrant_list_collections',
          'qdrant_get_collection',
          'qdrant_collection_exists',
          'qdrant_create_collection',
          'qdrant_create_collection_multi_vector',
          'qdrant_update_collection',
          'qdrant_delete_collection',
          // Aliases
          'qdrant_list_aliases',
          'qdrant_get_collection_aliases',
          'qdrant_create_alias',
          'qdrant_delete_alias',
          'qdrant_rename_alias',
          'qdrant_switch_alias',
          // Points
          'qdrant_upsert_points',
          'qdrant_get_points',
          'qdrant_get_point',
          'qdrant_delete_points',
          'qdrant_scroll_points',
          'qdrant_count_points',
          // Search
          'qdrant_search',
          'qdrant_search_named_vector',
          'qdrant_search_batch',
          'qdrant_query',
          'qdrant_query_groups',
          'qdrant_recommend',
          'qdrant_recommend_groups',
          'qdrant_discover',
          'qdrant_search_matrix_pairs',
          'qdrant_search_matrix_offsets',
          // Payload
          'qdrant_set_payload',
          'qdrant_overwrite_payload',
          'qdrant_delete_payload',
          'qdrant_clear_payload',
          // Vectors
          'qdrant_update_vectors',
          'qdrant_delete_vectors',
          // Batch
          'qdrant_batch_update',
          // Snapshots
          'qdrant_list_snapshots',
          'qdrant_create_snapshot',
          'qdrant_delete_snapshot',
          'qdrant_recover_snapshot',
          'qdrant_list_full_snapshots',
          'qdrant_create_full_snapshot',
          'qdrant_delete_full_snapshot',
          // Cluster
          'qdrant_get_cluster_status',
          'qdrant_recover_cluster',
          'qdrant_remove_peer',
          'qdrant_get_collection_cluster_info',
          'qdrant_move_shard',
          'qdrant_replicate_shard',
          'qdrant_drop_replica',
          'qdrant_abort_shard_transfer',
          'qdrant_create_shard_key',
          'qdrant_delete_shard_key',
          // Indexes
          'qdrant_create_field_index',
          'qdrant_create_text_index',
          'qdrant_create_integer_index',
          'qdrant_delete_field_index',
          // Service
          'qdrant_get_version',
          'qdrant_get_telemetry',
          'qdrant_get_metrics',
          'qdrant_get_locks',
          'qdrant_set_locks',
          // Connection
          'qdrant_test_connection',
        ],
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },
};
