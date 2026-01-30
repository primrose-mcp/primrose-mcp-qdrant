/**
 * Payload Tools
 *
 * MCP tools for Qdrant payload operations.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { QdrantClient } from '../client.js';
import type { Filter, PointId, Payload } from '../types/qdrant.js';
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
 * Register all payload-related tools
 */
export function registerPayloadTools(server: McpServer, client: QdrantClient): void {
  // ===========================================================================
  // Set Payload
  // ===========================================================================
  server.tool(
    'qdrant_set_payload',
    `Set or update payload fields for points.

Merges with existing payload (does not replace).

Args:
  - collectionName: Name of the collection
  - payload: Payload fields to set
  - ids: Point IDs to update (optional if using filter)
  - filter: Filter to select points (optional if using ids)
  - wait: Wait for operation to complete`,
    {
      collectionName: z.string().describe('Name of the collection'),
      payload: z.record(z.string(), z.any()).describe('Payload fields to set'),
      ids: z.array(pointIdSchema).optional().describe('Point IDs'),
      filter: filterSchema.optional().describe('Filter to select points'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ collectionName, payload, ids, filter, wait }) => {
      try {
        const result = await client.setPayload(
          collectionName,
          {
            payload: payload as Payload,
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
                  message: 'Payload set',
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
  // Overwrite Payload
  // ===========================================================================
  server.tool(
    'qdrant_overwrite_payload',
    `Replace entire payload for points.

Completely replaces existing payload (does not merge).

Args:
  - collectionName: Name of the collection
  - payload: New payload to set
  - ids: Point IDs to update
  - filter: Filter to select points`,
    {
      collectionName: z.string().describe('Name of the collection'),
      payload: z.record(z.string(), z.any()).describe('New payload'),
      ids: z.array(pointIdSchema).optional().describe('Point IDs'),
      filter: filterSchema.optional().describe('Filter to select points'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ collectionName, payload, ids, filter, wait }) => {
      try {
        const result = await client.overwritePayload(
          collectionName,
          {
            payload: payload as Payload,
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
                  message: 'Payload overwritten',
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
  // Delete Payload Keys
  // ===========================================================================
  server.tool(
    'qdrant_delete_payload',
    `Delete specific payload fields from points.

Removes specified keys from payload.

Args:
  - collectionName: Name of the collection
  - keys: Payload keys to delete
  - ids: Point IDs to update
  - filter: Filter to select points`,
    {
      collectionName: z.string().describe('Name of the collection'),
      keys: z.array(z.string()).min(1).describe('Payload keys to delete'),
      ids: z.array(pointIdSchema).optional().describe('Point IDs'),
      filter: filterSchema.optional().describe('Filter to select points'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ collectionName, keys, ids, filter, wait }) => {
      try {
        const result = await client.deletePayload(
          collectionName,
          {
            keys,
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
                  message: `Deleted payload keys: ${keys.join(', ')}`,
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
  // Clear Payload
  // ===========================================================================
  server.tool(
    'qdrant_clear_payload',
    `Clear all payload from points.

Removes entire payload, keeping only vectors.

Args:
  - collectionName: Name of the collection
  - ids: Point IDs to clear
  - filter: Filter to select points`,
    {
      collectionName: z.string().describe('Name of the collection'),
      ids: z.array(pointIdSchema).optional().describe('Point IDs'),
      filter: filterSchema.optional().describe('Filter to select points'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ collectionName, ids, filter, wait }) => {
      try {
        const result = await client.clearPayload(
          collectionName,
          {
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
                  message: 'Payload cleared',
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
