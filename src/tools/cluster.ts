/**
 * Cluster Tools
 *
 * MCP tools for Qdrant cluster and shard operations.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { QdrantClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all cluster-related tools
 */
export function registerClusterTools(server: McpServer, client: QdrantClient): void {
  // ===========================================================================
  // Get Cluster Status
  // ===========================================================================
  server.tool(
    'qdrant_get_cluster_status',
    `Get cluster status and information.

Returns cluster status, peer information, and raft state for distributed deployments.`,
    {
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ format }) => {
      try {
        const result = await client.getClusterStatus();
        return formatResponse(result, format, 'cluster');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Recover Cluster
  // ===========================================================================
  server.tool(
    'qdrant_recover_cluster',
    `Trigger cluster recovery.

Attempts to recover the cluster from inconsistent state.`,
    {},
    async () => {
      try {
        await client.recoverCluster();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Cluster recovery initiated',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Remove Peer
  // ===========================================================================
  server.tool(
    'qdrant_remove_peer',
    `Remove a peer from the cluster.

Args:
  - peerId: ID of the peer to remove
  - force: Force removal even if unhealthy`,
    {
      peerId: z.number().int().describe('Peer ID'),
      force: z.boolean().default(false).describe('Force removal'),
    },
    async ({ peerId, force }) => {
      try {
        await client.removePeer(peerId, force);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Peer ${peerId} removed from cluster`,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Collection Cluster Info
  // ===========================================================================
  server.tool(
    'qdrant_get_collection_cluster_info',
    `Get cluster information for a specific collection.

Returns shard distribution and replication status.`,
    {
      collectionName: z.string().describe('Name of the collection'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ collectionName, format }) => {
      try {
        const result = await client.getCollectionClusterInfo(collectionName);
        return formatResponse(result, format, 'collection_cluster');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Move Shard
  // ===========================================================================
  server.tool(
    'qdrant_move_shard',
    `Move a shard from one peer to another.

Args:
  - collectionName: Name of the collection
  - shardId: ID of the shard to move
  - fromPeerId: Source peer ID
  - toPeerId: Destination peer ID
  - method: Transfer method`,
    {
      collectionName: z.string().describe('Name of the collection'),
      shardId: z.number().int().describe('Shard ID'),
      fromPeerId: z.number().int().describe('Source peer ID'),
      toPeerId: z.number().int().describe('Destination peer ID'),
      method: z
        .enum(['stream_records', 'snapshot', 'wal_delta'])
        .optional()
        .describe('Transfer method'),
    },
    async ({ collectionName, shardId, fromPeerId, toPeerId, method }) => {
      try {
        await client.updateCollectionCluster(collectionName, {
          move_shard: {
            shard_id: shardId,
            from_peer_id: fromPeerId,
            to_peer_id: toPeerId,
            method,
          },
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Shard ${shardId} move initiated from peer ${fromPeerId} to ${toPeerId}`,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Replicate Shard
  // ===========================================================================
  server.tool(
    'qdrant_replicate_shard',
    `Create a replica of a shard on another peer.

Args:
  - collectionName: Name of the collection
  - shardId: ID of the shard to replicate
  - fromPeerId: Source peer ID
  - toPeerId: Destination peer ID for replica`,
    {
      collectionName: z.string().describe('Name of the collection'),
      shardId: z.number().int().describe('Shard ID'),
      fromPeerId: z.number().int().describe('Source peer ID'),
      toPeerId: z.number().int().describe('Destination peer ID'),
      method: z
        .enum(['stream_records', 'snapshot', 'wal_delta'])
        .optional()
        .describe('Transfer method'),
    },
    async ({ collectionName, shardId, fromPeerId, toPeerId, method }) => {
      try {
        await client.updateCollectionCluster(collectionName, {
          replicate_shard: {
            shard_id: shardId,
            from_peer_id: fromPeerId,
            to_peer_id: toPeerId,
            method,
          },
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Shard ${shardId} replication initiated to peer ${toPeerId}`,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Drop Replica
  // ===========================================================================
  server.tool(
    'qdrant_drop_replica',
    `Drop a shard replica from a peer.

Args:
  - collectionName: Name of the collection
  - shardId: ID of the shard
  - peerId: Peer ID to drop replica from`,
    {
      collectionName: z.string().describe('Name of the collection'),
      shardId: z.number().int().describe('Shard ID'),
      peerId: z.number().int().describe('Peer ID'),
    },
    async ({ collectionName, shardId, peerId }) => {
      try {
        await client.updateCollectionCluster(collectionName, {
          drop_replica: {
            shard_id: shardId,
            peer_id: peerId,
          },
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Replica of shard ${shardId} dropped from peer ${peerId}`,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Abort Shard Transfer
  // ===========================================================================
  server.tool(
    'qdrant_abort_shard_transfer',
    `Abort an ongoing shard transfer.

Args:
  - collectionName: Name of the collection
  - shardId: ID of the shard
  - fromPeerId: Source peer ID
  - toPeerId: Destination peer ID`,
    {
      collectionName: z.string().describe('Name of the collection'),
      shardId: z.number().int().describe('Shard ID'),
      fromPeerId: z.number().int().describe('Source peer ID'),
      toPeerId: z.number().int().describe('Destination peer ID'),
    },
    async ({ collectionName, shardId, fromPeerId, toPeerId }) => {
      try {
        await client.updateCollectionCluster(collectionName, {
          abort_transfer: {
            shard_id: shardId,
            from_peer_id: fromPeerId,
            to_peer_id: toPeerId,
          },
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Shard ${shardId} transfer aborted`,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Shard Key
  // ===========================================================================
  server.tool(
    'qdrant_create_shard_key',
    `Create a custom shard key for a collection.

Enables custom sharding for multi-tenant scenarios.

Args:
  - collectionName: Name of the collection
  - shardKey: Shard key value
  - shardsNumber: Number of shards for this key
  - replicationFactor: Replication factor`,
    {
      collectionName: z.string().describe('Name of the collection'),
      shardKey: z.union([z.string(), z.number()]).describe('Shard key value'),
      shardsNumber: z.number().int().positive().optional().describe('Number of shards'),
      replicationFactor: z.number().int().positive().optional().describe('Replication factor'),
      placement: z.array(z.number().int()).optional().describe('Specific peer placement'),
    },
    async ({ collectionName, shardKey, shardsNumber, replicationFactor, placement }) => {
      try {
        await client.createShardKey(collectionName, {
          shard_key: shardKey,
          shards_number: shardsNumber,
          replication_factor: replicationFactor,
          placement,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Shard key '${shardKey}' created for collection '${collectionName}'`,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Delete Shard Key
  // ===========================================================================
  server.tool(
    'qdrant_delete_shard_key',
    `Delete a custom shard key from a collection.

WARNING: This deletes all data in the shard!

Args:
  - collectionName: Name of the collection
  - shardKey: Shard key to delete`,
    {
      collectionName: z.string().describe('Name of the collection'),
      shardKey: z.union([z.string(), z.number()]).describe('Shard key to delete'),
    },
    async ({ collectionName, shardKey }) => {
      try {
        await client.deleteShardKey(collectionName, {
          shard_key: shardKey,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Shard key '${shardKey}' deleted from collection '${collectionName}'`,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
