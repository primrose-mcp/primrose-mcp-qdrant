/**
 * Points Tools
 *
 * MCP tools for Qdrant point operations (upsert, get, delete, scroll, count).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { QdrantClient } from '../client.js';
import type { Filter, PointId, PointStruct, OrderBy } from '../types/qdrant.js';
import { formatError, formatResponse } from '../utils/formatters.js';

// Zod schemas for complex types
const pointIdSchema = z.union([z.string(), z.number()]);

const filterSchema: z.ZodType<Filter> = z.lazy(() =>
  z.object({
    must: z.array(z.any()).optional(),
    must_not: z.array(z.any()).optional(),
    should: z.array(z.any()).optional(),
  })
);

/**
 * Register all point-related tools
 */
export function registerPointTools(server: McpServer, client: QdrantClient): void {
  // ===========================================================================
  // Upsert Points
  // ===========================================================================
  server.tool(
    'qdrant_upsert_points',
    `Upsert (insert or update) points into a collection.

Points with existing IDs will be overwritten.

Args:
  - collectionName: Target collection
  - points: Array of points with id, vector, and optional payload
  - wait: Wait for operation to complete (default: true)`,
    {
      collectionName: z.string().describe('Name of the collection'),
      points: z
        .array(
          z.object({
            id: pointIdSchema.describe('Point ID (string or number)'),
            vector: z
              .union([
                z.array(z.number()),
                z.record(z.string(), z.union([z.array(z.number()), z.object({
                  indices: z.array(z.number()),
                  values: z.array(z.number()),
                })])),
              ])
              .describe('Vector(s) - single array or named vectors object'),
            payload: z.record(z.string(), z.any()).optional().describe('Point payload'),
          })
        )
        .min(1)
        .describe('Points to upsert'),
      wait: z.boolean().default(true).describe('Wait for operation to complete'),
    },
    async ({ collectionName, points, wait }) => {
      try {
        const result = await client.upsertPoints(
          collectionName,
          points as PointStruct[],
          wait
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Upserted ${points.length} points`,
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
  // Get Points by IDs
  // ===========================================================================
  server.tool(
    'qdrant_get_points',
    `Retrieve points by their IDs.

Args:
  - collectionName: Name of the collection
  - ids: Array of point IDs to retrieve
  - withPayload: Include payload in response (default: true)
  - withVector: Include vectors in response (default: false)`,
    {
      collectionName: z.string().describe('Name of the collection'),
      ids: z.array(pointIdSchema).min(1).describe('Point IDs to retrieve'),
      withPayload: z.boolean().default(true).describe('Include payload'),
      withVector: z.boolean().default(false).describe('Include vectors'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ collectionName, ids, withPayload, withVector, format }) => {
      try {
        const result = await client.getPoints(
          collectionName,
          ids as PointId[],
          withPayload,
          withVector
        );
        return formatResponse(result, format, 'points');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Single Point
  // ===========================================================================
  server.tool(
    'qdrant_get_point',
    `Retrieve a single point by ID.

Args:
  - collectionName: Name of the collection
  - id: Point ID to retrieve`,
    {
      collectionName: z.string().describe('Name of the collection'),
      id: pointIdSchema.describe('Point ID'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ collectionName, id, format }) => {
      try {
        const result = await client.getPoint(collectionName, id as PointId);
        return formatResponse(result, format, 'point');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Delete Points
  // ===========================================================================
  server.tool(
    'qdrant_delete_points',
    `Delete points from a collection.

Can delete by IDs or by filter.

Args:
  - collectionName: Name of the collection
  - ids: Array of point IDs to delete (optional)
  - filter: Filter to select points to delete (optional)
  - wait: Wait for operation to complete (default: true)`,
    {
      collectionName: z.string().describe('Name of the collection'),
      ids: z.array(pointIdSchema).optional().describe('Point IDs to delete'),
      filter: filterSchema.optional().describe('Filter to select points'),
      wait: z.boolean().default(true).describe('Wait for operation to complete'),
    },
    async ({ collectionName, ids, filter, wait }) => {
      try {
        const request: { points?: PointId[]; filter?: Filter } = {};
        if (ids) request.points = ids as PointId[];
        if (filter) request.filter = filter;

        const result = await client.deletePoints(collectionName, request, wait);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Points deleted',
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
  // Scroll Points
  // ===========================================================================
  server.tool(
    'qdrant_scroll_points',
    `Scroll through points in a collection with pagination.

Useful for iterating over all points or a filtered subset.

Args:
  - collectionName: Name of the collection
  - filter: Filter to select points (optional)
  - limit: Number of points to return (default: 10)
  - offset: Point ID to start from (for pagination)
  - withPayload: Include payload in response (default: true)
  - withVector: Include vectors in response (default: false)
  - orderBy: Order results by payload field`,
    {
      collectionName: z.string().describe('Name of the collection'),
      filter: filterSchema.optional().describe('Filter to select points'),
      limit: z.number().int().min(1).max(100).default(10).describe('Number of points'),
      offset: pointIdSchema.optional().describe('Start from this point ID'),
      withPayload: z.boolean().default(true).describe('Include payload'),
      withVector: z.boolean().default(false).describe('Include vectors'),
      orderBy: z
        .object({
          key: z.string().describe('Payload field to order by'),
          direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
        })
        .optional()
        .describe('Order by payload field'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ collectionName, filter, limit, offset, withPayload, withVector, orderBy, format }) => {
      try {
        const result = await client.scrollPoints(collectionName, {
          filter,
          limit,
          offset: offset as PointId | undefined,
          with_payload: withPayload,
          with_vector: withVector,
          order_by: orderBy as OrderBy | undefined,
        });
        return formatResponse(
          {
            points: result.points,
            nextPageOffset: result.next_page_offset,
            count: result.points.length,
          },
          format,
          'points'
        );
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Count Points
  // ===========================================================================
  server.tool(
    'qdrant_count_points',
    `Count points in a collection.

Can count all points or filtered subset.

Args:
  - collectionName: Name of the collection
  - filter: Filter to select points (optional)
  - exact: Return exact count (slower) vs estimate (default: true)`,
    {
      collectionName: z.string().describe('Name of the collection'),
      filter: filterSchema.optional().describe('Filter to count specific points'),
      exact: z.boolean().default(true).describe('Exact count vs estimate'),
    },
    async ({ collectionName, filter, exact }) => {
      try {
        const result = await client.countPoints(collectionName, { filter, exact });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  collectionName,
                  count: result.count,
                  exact,
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
