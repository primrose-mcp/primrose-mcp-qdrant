/**
 * Vector Tools
 *
 * MCP tools for Qdrant vector operations (update, delete vectors).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { QdrantClient } from '../client.js';
import type { Filter, PointId, Vector } from '../types/qdrant.js';
import { formatError } from '../utils/formatters.js';

// Zod schemas
const pointIdSchema = z.union([z.string(), z.number()]);

const filterSchema: z.ZodType<Filter> = z.lazy(() =>
  z.object({
    must: z.array(z.any()).optional(),
    must_not: z.array(z.any()).optional(),
    should: z.array(z.any()).optional(),
  })
);

/**
 * Register all vector-related tools
 */
export function registerVectorTools(server: McpServer, client: QdrantClient): void {
  // ===========================================================================
  // Update Vectors
  // ===========================================================================
  server.tool(
    'qdrant_update_vectors',
    `Update vectors for existing points.

Replaces vectors without modifying payload.

Args:
  - collectionName: Name of the collection
  - points: Array of {id, vector} pairs to update
  - wait: Wait for operation to complete`,
    {
      collectionName: z.string().describe('Name of the collection'),
      points: z
        .array(
          z.object({
            id: pointIdSchema.describe('Point ID'),
            vector: z
              .union([
                z.array(z.number()),
                z.record(z.string(), z.array(z.number())),
              ])
              .describe('New vector(s)'),
          })
        )
        .min(1)
        .describe('Points to update'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ collectionName, points, wait }) => {
      try {
        const result = await client.updateVectors(
          collectionName,
          {
            points: points.map((p) => ({
              id: p.id as PointId,
              vector: p.vector as Vector,
            })),
          },
          wait
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Updated vectors for ${points.length} points`,
                  status: result.status,
                  operationId: result.operation_id,
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
  // Delete Vectors
  // ===========================================================================
  server.tool(
    'qdrant_delete_vectors',
    `Delete specific named vectors from points.

For collections with multiple named vectors, removes specified vectors while keeping others.

Args:
  - collectionName: Name of the collection
  - vectorNames: Names of vectors to delete
  - ids: Point IDs to update
  - filter: Filter to select points`,
    {
      collectionName: z.string().describe('Name of the collection'),
      vectorNames: z.array(z.string()).min(1).describe('Vector names to delete'),
      ids: z.array(pointIdSchema).optional().describe('Point IDs'),
      filter: filterSchema.optional().describe('Filter to select points'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ collectionName, vectorNames, ids, filter, wait }) => {
      try {
        const result = await client.deleteVectors(
          collectionName,
          {
            vector: vectorNames,
            points: ids as PointId[] | undefined,
            filter,
          },
          wait
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Deleted vectors: ${vectorNames.join(', ')}`,
                  status: result.status,
                  operationId: result.operation_id,
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
