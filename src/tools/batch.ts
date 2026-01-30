/**
 * Batch Tools
 *
 * MCP tools for Qdrant batch operations.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { QdrantClient } from '../client.js';
import type { BatchOperation, Filter, PointId, PointStruct, Payload } from '../types/qdrant.js';
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
 * Register batch operation tools
 */
export function registerBatchTools(server: McpServer, client: QdrantClient): void {
  // ===========================================================================
  // Batch Update
  // ===========================================================================
  server.tool(
    'qdrant_batch_update',
    `Execute multiple point operations in a single request.

Supports: upsert, delete, set_payload, overwrite_payload, delete_payload, clear_payload, update_vectors, delete_vectors.

More efficient than multiple individual operations.

Args:
  - collectionName: Name of the collection
  - operations: Array of operations to execute
  - wait: Wait for all operations to complete`,
    {
      collectionName: z.string().describe('Name of the collection'),
      operations: z
        .array(
          z.union([
            z.object({
              upsert: z.object({
                points: z.array(
                  z.object({
                    id: pointIdSchema,
                    vector: z.union([z.array(z.number()), z.record(z.string(), z.array(z.number()))]),
                    payload: z.record(z.string(), z.any()).optional(),
                  })
                ),
              }),
            }),
            z.object({
              delete: z.object({
                points: z.array(pointIdSchema).optional(),
                filter: filterSchema.optional(),
              }),
            }),
            z.object({
              set_payload: z.object({
                payload: z.record(z.string(), z.any()),
                points: z.array(pointIdSchema).optional(),
                filter: filterSchema.optional(),
              }),
            }),
            z.object({
              overwrite_payload: z.object({
                payload: z.record(z.string(), z.any()),
                points: z.array(pointIdSchema).optional(),
                filter: filterSchema.optional(),
              }),
            }),
            z.object({
              delete_payload: z.object({
                keys: z.array(z.string()),
                points: z.array(pointIdSchema).optional(),
                filter: filterSchema.optional(),
              }),
            }),
            z.object({
              clear_payload: z.object({
                points: z.array(pointIdSchema).optional(),
                filter: filterSchema.optional(),
              }),
            }),
          ])
        )
        .min(1)
        .describe('Operations to execute'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ collectionName, operations, wait }) => {
      try {
        // Convert operations to proper format
        const batchOperations: BatchOperation[] = operations.map((op) => {
          if ('upsert' in op) {
            return {
              upsert: {
                points: op.upsert.points as PointStruct[],
              },
            };
          }
          if ('delete' in op) {
            return {
              delete: {
                points: op.delete.points as PointId[] | undefined,
                filter: op.delete.filter,
              },
            };
          }
          if ('set_payload' in op) {
            return {
              set_payload: {
                payload: op.set_payload.payload as Payload,
                points: op.set_payload.points as PointId[] | undefined,
                filter: op.set_payload.filter,
              },
            };
          }
          if ('overwrite_payload' in op) {
            return {
              overwrite_payload: {
                payload: op.overwrite_payload.payload as Payload,
                points: op.overwrite_payload.points as PointId[] | undefined,
                filter: op.overwrite_payload.filter,
              },
            };
          }
          if ('delete_payload' in op) {
            return {
              delete_payload: {
                keys: op.delete_payload.keys,
                points: op.delete_payload.points as PointId[] | undefined,
                filter: op.delete_payload.filter,
              },
            };
          }
          if ('clear_payload' in op) {
            return {
              clear_payload: {
                points: op.clear_payload.points as PointId[] | undefined,
                filter: op.clear_payload.filter,
              },
            };
          }
          throw new Error('Unknown operation type');
        });

        const results = await client.batchUpdate(
          collectionName,
          { operations: batchOperations },
          wait
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Executed ${operations.length} batch operations`,
                  results,
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
