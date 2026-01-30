/**
 * Collection Tools
 *
 * MCP tools for Qdrant collection management.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { QdrantClient } from '../client.js';
import type { Distance, VectorsConfig } from '../types/qdrant.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all collection-related tools
 */
export function registerCollectionTools(server: McpServer, client: QdrantClient): void {
  // ===========================================================================
  // List Collections
  // ===========================================================================
  server.tool(
    'qdrant_list_collections',
    `List all collections in the Qdrant database.

Returns the names of all available collections.`,
    {
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ format }) => {
      try {
        const result = await client.listCollections();
        return formatResponse(result.collections, format, 'collections');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Collection
  // ===========================================================================
  server.tool(
    'qdrant_get_collection',
    `Get detailed information about a specific collection.

Returns collection configuration, status, vector count, and schema information.`,
    {
      collectionName: z.string().describe('Name of the collection'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ collectionName, format }) => {
      try {
        const result = await client.getCollection(collectionName);
        return formatResponse(result, format, 'collection');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Collection Exists
  // ===========================================================================
  server.tool(
    'qdrant_collection_exists',
    `Check if a collection exists.

Returns true if the collection exists, false otherwise.`,
    {
      collectionName: z.string().describe('Name of the collection'),
    },
    async ({ collectionName }) => {
      try {
        const exists = await client.collectionExists(collectionName);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ exists, collectionName }, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Collection
  // ===========================================================================
  server.tool(
    'qdrant_create_collection',
    `Create a new collection in Qdrant.

Args:
  - collectionName: Name for the new collection
  - vectorSize: Dimension of vectors to store
  - distance: Distance metric (Cosine, Euclid, Dot, Manhattan)
  - onDiskPayload: Store payload on disk instead of memory
  - shardNumber: Number of shards for distributed storage
  - replicationFactor: Number of replicas for each shard`,
    {
      collectionName: z.string().describe('Name for the new collection'),
      vectorSize: z.number().int().positive().describe('Dimension of vectors'),
      distance: z
        .enum(['Cosine', 'Euclid', 'Dot', 'Manhattan'])
        .default('Cosine')
        .describe('Distance metric'),
      onDiskPayload: z.boolean().optional().describe('Store payload on disk'),
      shardNumber: z.number().int().positive().optional().describe('Number of shards'),
      replicationFactor: z.number().int().positive().optional().describe('Replication factor'),
    },
    async ({ collectionName, vectorSize, distance, onDiskPayload, shardNumber, replicationFactor }) => {
      try {
        const vectors: VectorsConfig = {
          size: vectorSize,
          distance: distance as Distance,
        };

        await client.createCollection(collectionName, {
          vectors,
          on_disk_payload: onDiskPayload,
          shard_number: shardNumber,
          replication_factor: replicationFactor,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Collection '${collectionName}' created`, collectionName },
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
  // Create Collection with Named Vectors
  // ===========================================================================
  server.tool(
    'qdrant_create_collection_multi_vector',
    `Create a collection with multiple named vectors.

Allows storing multiple vectors per point with different dimensions and metrics.

Args:
  - collectionName: Name for the new collection
  - vectors: Array of vector configurations, each with name, size, and distance
  - onDiskPayload: Store payload on disk instead of memory`,
    {
      collectionName: z.string().describe('Name for the new collection'),
      vectors: z
        .array(
          z.object({
            name: z.string().describe('Vector name'),
            size: z.number().int().positive().describe('Vector dimension'),
            distance: z.enum(['Cosine', 'Euclid', 'Dot', 'Manhattan']).describe('Distance metric'),
          })
        )
        .min(1)
        .describe('Vector configurations'),
      onDiskPayload: z.boolean().optional().describe('Store payload on disk'),
    },
    async ({ collectionName, vectors, onDiskPayload }) => {
      try {
        const vectorsConfig: Record<string, { size: number; distance: Distance }> = {};
        for (const v of vectors) {
          vectorsConfig[v.name] = {
            size: v.size,
            distance: v.distance as Distance,
          };
        }

        await client.createCollection(collectionName, {
          vectors: vectorsConfig,
          on_disk_payload: onDiskPayload,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Collection '${collectionName}' created with ${vectors.length} named vectors`,
                  collectionName,
                  vectors: vectors.map((v) => v.name),
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
  // Update Collection
  // ===========================================================================
  server.tool(
    'qdrant_update_collection',
    `Update collection parameters.

Can modify optimizer settings, HNSW configuration, and other parameters.`,
    {
      collectionName: z.string().describe('Name of the collection'),
      optimizersConfig: z
        .object({
          deleted_threshold: z.number().optional(),
          vacuum_min_vector_number: z.number().int().optional(),
          default_segment_number: z.number().int().optional(),
          max_segment_size: z.number().int().optional(),
          memmap_threshold: z.number().int().optional(),
          indexing_threshold: z.number().int().optional(),
          flush_interval_sec: z.number().int().optional(),
          max_optimization_threads: z.number().int().optional(),
        })
        .optional()
        .describe('Optimizer configuration'),
      hnswConfig: z
        .object({
          m: z.number().int().optional(),
          ef_construct: z.number().int().optional(),
          full_scan_threshold: z.number().int().optional(),
          max_indexing_threads: z.number().int().optional(),
          on_disk: z.boolean().optional(),
        })
        .optional()
        .describe('HNSW index configuration'),
    },
    async ({ collectionName, optimizersConfig, hnswConfig }) => {
      try {
        await client.updateCollection(collectionName, {
          optimizers_config: optimizersConfig,
          hnsw_config: hnswConfig,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Collection '${collectionName}' updated` },
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
  // Delete Collection
  // ===========================================================================
  server.tool(
    'qdrant_delete_collection',
    `Delete a collection and all its data.

WARNING: This operation is irreversible!`,
    {
      collectionName: z.string().describe('Name of the collection to delete'),
    },
    async ({ collectionName }) => {
      try {
        await client.deleteCollection(collectionName);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Collection '${collectionName}' deleted` },
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
  // List Aliases
  // ===========================================================================
  server.tool(
    'qdrant_list_aliases',
    `List all collection aliases.

Returns all alias mappings in the database.`,
    {
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ format }) => {
      try {
        const result = await client.listAliases();
        return formatResponse(result.aliases, format, 'aliases');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Collection Aliases
  // ===========================================================================
  server.tool(
    'qdrant_get_collection_aliases',
    `Get aliases for a specific collection.`,
    {
      collectionName: z.string().describe('Name of the collection'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ collectionName, format }) => {
      try {
        const result = await client.getCollectionAliases(collectionName);
        return formatResponse(result.aliases, format, 'aliases');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Alias
  // ===========================================================================
  server.tool(
    'qdrant_create_alias',
    `Create an alias for a collection.

Aliases provide alternative names to reference collections.`,
    {
      aliasName: z.string().describe('Name for the alias'),
      collectionName: z.string().describe('Collection to alias'),
    },
    async ({ aliasName, collectionName }) => {
      try {
        await client.updateAliases({
          actions: [
            {
              create_alias: {
                collection_name: collectionName,
                alias_name: aliasName,
              },
            },
          ],
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Alias '${aliasName}' created for collection '${collectionName}'`,
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
  // Delete Alias
  // ===========================================================================
  server.tool(
    'qdrant_delete_alias',
    `Delete a collection alias.`,
    {
      aliasName: z.string().describe('Name of the alias to delete'),
    },
    async ({ aliasName }) => {
      try {
        await client.updateAliases({
          actions: [
            {
              delete_alias: {
                alias_name: aliasName,
              },
            },
          ],
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, message: `Alias '${aliasName}' deleted` },
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
  // Rename Alias
  // ===========================================================================
  server.tool(
    'qdrant_rename_alias',
    `Rename an existing alias.`,
    {
      oldAliasName: z.string().describe('Current alias name'),
      newAliasName: z.string().describe('New alias name'),
    },
    async ({ oldAliasName, newAliasName }) => {
      try {
        await client.updateAliases({
          actions: [
            {
              rename_alias: {
                old_alias_name: oldAliasName,
                new_alias_name: newAliasName,
              },
            },
          ],
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Alias renamed from '${oldAliasName}' to '${newAliasName}'`,
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
  // Switch Alias (Atomic)
  // ===========================================================================
  server.tool(
    'qdrant_switch_alias',
    `Atomically switch an alias from one collection to another.

Useful for zero-downtime collection updates.`,
    {
      aliasName: z.string().describe('Name of the alias'),
      newCollectionName: z.string().describe('New collection for the alias'),
    },
    async ({ aliasName, newCollectionName }) => {
      try {
        await client.updateAliases({
          actions: [
            {
              delete_alias: {
                alias_name: aliasName,
              },
            },
            {
              create_alias: {
                collection_name: newCollectionName,
                alias_name: aliasName,
              },
            },
          ],
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Alias '${aliasName}' switched to collection '${newCollectionName}'`,
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
