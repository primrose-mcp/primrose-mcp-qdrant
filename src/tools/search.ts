/**
 * Search Tools
 *
 * MCP tools for Qdrant search operations including vector search,
 * query API, recommendations, and discovery.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { QdrantClient } from '../client.js';
import type { Filter, PointId, SearchParams } from '../types/qdrant.js';
import { formatError, formatResponse } from '../utils/formatters.js';

// Zod schemas
const pointIdSchema = z.union([z.string(), z.number()]);

const filterSchema: z.ZodType<Filter> = z.lazy(() =>
  z.object({
    must: z.array(z.any()).optional(),
    must_not: z.array(z.any()).optional(),
    should: z.array(z.any()).optional(),
  })
);

const searchParamsSchema = z
  .object({
    hnsw_ef: z.number().int().optional().describe('HNSW ef parameter'),
    exact: z.boolean().optional().describe('Use exact search (slower but more accurate)'),
    indexed_only: z.boolean().optional().describe('Only search indexed segments'),
  })
  .optional();

/**
 * Register all search-related tools
 */
export function registerSearchTools(server: McpServer, client: QdrantClient): void {
  // ===========================================================================
  // Vector Search
  // ===========================================================================
  server.tool(
    'qdrant_search',
    `Search for similar vectors in a collection.

Performs approximate nearest neighbor search.

Args:
  - collectionName: Name of the collection
  - vector: Query vector (array of numbers)
  - limit: Number of results to return
  - filter: Filter to narrow search (optional)
  - withPayload: Include payload in results (default: true)
  - withVector: Include vectors in results (default: false)
  - scoreThreshold: Minimum score threshold (optional)
  - params: Search parameters (hnsw_ef, exact)`,
    {
      collectionName: z.string().describe('Name of the collection'),
      vector: z.array(z.number()).describe('Query vector'),
      limit: z.number().int().min(1).max(100).default(10).describe('Number of results'),
      filter: filterSchema.optional().describe('Filter conditions'),
      withPayload: z.boolean().default(true).describe('Include payload'),
      withVector: z.boolean().default(false).describe('Include vectors'),
      scoreThreshold: z.number().optional().describe('Minimum score'),
      params: searchParamsSchema.describe('Search parameters'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({
      collectionName,
      vector,
      limit,
      filter,
      withPayload,
      withVector,
      scoreThreshold,
      params,
      format,
    }) => {
      try {
        const result = await client.search(collectionName, {
          vector,
          limit,
          filter,
          with_payload: withPayload,
          with_vector: withVector,
          score_threshold: scoreThreshold,
          params: params as SearchParams,
        });
        return formatResponse(result, format, 'search_results');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Named Vector Search
  // ===========================================================================
  server.tool(
    'qdrant_search_named_vector',
    `Search using a named vector.

For collections with multiple named vectors.

Args:
  - collectionName: Name of the collection
  - vectorName: Name of the vector field to search
  - vector: Query vector
  - limit: Number of results`,
    {
      collectionName: z.string().describe('Name of the collection'),
      vectorName: z.string().describe('Name of the vector field'),
      vector: z.array(z.number()).describe('Query vector'),
      limit: z.number().int().min(1).max(100).default(10).describe('Number of results'),
      filter: filterSchema.optional().describe('Filter conditions'),
      withPayload: z.boolean().default(true).describe('Include payload'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ collectionName, vectorName, vector, limit, filter, withPayload, format }) => {
      try {
        const result = await client.search(collectionName, {
          vector: {
            name: vectorName,
            vector,
          },
          limit,
          filter,
          with_payload: withPayload,
        });
        return formatResponse(result, format, 'search_results');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Batch Search
  // ===========================================================================
  server.tool(
    'qdrant_search_batch',
    `Perform multiple searches in a single request.

More efficient than multiple individual searches.

Args:
  - collectionName: Name of the collection
  - searches: Array of search requests`,
    {
      collectionName: z.string().describe('Name of the collection'),
      searches: z
        .array(
          z.object({
            vector: z.array(z.number()).describe('Query vector'),
            limit: z.number().int().min(1).default(10).describe('Number of results'),
            filter: filterSchema.optional().describe('Filter conditions'),
          })
        )
        .min(1)
        .describe('Search requests'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ collectionName, searches, format }) => {
      try {
        const result = await client.searchBatch(collectionName, {
          searches: searches.map((s) => ({
            vector: s.vector,
            limit: s.limit,
            filter: s.filter,
          })),
        });
        return formatResponse(result, format, 'batch_results');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Query API (Universal)
  // ===========================================================================
  server.tool(
    'qdrant_query',
    `Universal query endpoint supporting various search modes.

Supports dense vectors, sparse vectors, and search by ID.

Args:
  - collectionName: Name of the collection
  - query: Query vector or point ID
  - using: Named vector to use (optional)
  - limit: Number of results
  - filter: Filter conditions`,
    {
      collectionName: z.string().describe('Name of the collection'),
      query: z
        .union([z.array(z.number()), pointIdSchema])
        .describe('Query vector or point ID'),
      using: z.string().optional().describe('Named vector to use'),
      limit: z.number().int().min(1).max(100).default(10).describe('Number of results'),
      offset: z.number().int().min(0).default(0).describe('Skip first N results'),
      filter: filterSchema.optional().describe('Filter conditions'),
      withPayload: z.boolean().default(true).describe('Include payload'),
      withVector: z.boolean().default(false).describe('Include vectors'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({
      collectionName,
      query,
      using,
      limit,
      offset,
      filter,
      withPayload,
      withVector,
      format,
    }) => {
      try {
        // Determine query type
        let queryObj: number[] | { nearest: PointId | number[] };
        if (Array.isArray(query)) {
          queryObj = query;
        } else {
          queryObj = { nearest: query as PointId };
        }

        const result = await client.query(collectionName, {
          query: queryObj,
          using,
          limit,
          offset,
          filter,
          with_payload: withPayload,
          with_vector: withVector,
        });
        return formatResponse(result, format, 'search_results');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Query Groups
  // ===========================================================================
  server.tool(
    'qdrant_query_groups',
    `Query with results grouped by a payload field.

Useful for grouping results by document, category, etc.

Args:
  - collectionName: Name of the collection
  - query: Query vector
  - groupBy: Payload field to group by
  - groupSize: Number of results per group
  - limit: Number of groups to return`,
    {
      collectionName: z.string().describe('Name of the collection'),
      query: z.array(z.number()).describe('Query vector'),
      groupBy: z.string().describe('Payload field to group by'),
      groupSize: z.number().int().min(1).default(3).describe('Results per group'),
      limit: z.number().int().min(1).default(10).describe('Number of groups'),
      filter: filterSchema.optional().describe('Filter conditions'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ collectionName, query, groupBy, groupSize, limit, filter, format }) => {
      try {
        const result = await client.queryGroups(collectionName, {
          query,
          group_by: groupBy,
          group_size: groupSize,
          limit,
          filter,
        });
        return formatResponse(result, format, 'groups');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Recommend
  // ===========================================================================
  server.tool(
    'qdrant_recommend',
    `Get recommendations based on positive and negative examples.

Finds points similar to positive examples and dissimilar to negative ones.

Args:
  - collectionName: Name of the collection
  - positive: Point IDs or vectors to use as positive examples
  - negative: Point IDs or vectors to use as negative examples (optional)
  - strategy: Recommendation strategy (average_vector or best_score)
  - limit: Number of results`,
    {
      collectionName: z.string().describe('Name of the collection'),
      positive: z
        .array(z.union([pointIdSchema, z.array(z.number())]))
        .min(1)
        .describe('Positive examples'),
      negative: z
        .array(z.union([pointIdSchema, z.array(z.number())]))
        .optional()
        .describe('Negative examples'),
      strategy: z
        .enum(['average_vector', 'best_score'])
        .default('average_vector')
        .describe('Recommendation strategy'),
      limit: z.number().int().min(1).max(100).default(10).describe('Number of results'),
      filter: filterSchema.optional().describe('Filter conditions'),
      withPayload: z.boolean().default(true).describe('Include payload'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({
      collectionName,
      positive,
      negative,
      strategy,
      limit,
      filter,
      withPayload,
      format,
    }) => {
      try {
        const result = await client.recommend(collectionName, {
          positive: positive as (PointId | number[])[],
          negative: negative as (PointId | number[])[] | undefined,
          strategy,
          limit,
          filter,
          with_payload: withPayload,
        });
        return formatResponse(result, format, 'search_results');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Recommend Groups
  // ===========================================================================
  server.tool(
    'qdrant_recommend_groups',
    `Get recommendations grouped by a payload field.`,
    {
      collectionName: z.string().describe('Name of the collection'),
      positive: z.array(pointIdSchema).min(1).describe('Positive example IDs'),
      groupBy: z.string().describe('Payload field to group by'),
      groupSize: z.number().int().min(1).default(3).describe('Results per group'),
      limit: z.number().int().min(1).default(10).describe('Number of groups'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ collectionName, positive, groupBy, groupSize, limit, format }) => {
      try {
        const result = await client.recommendGroups(collectionName, {
          positive: positive as PointId[],
          group_by: groupBy,
          group_size: groupSize,
          limit,
        });
        return formatResponse(result, format, 'groups');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Discover
  // ===========================================================================
  server.tool(
    'qdrant_discover',
    `Discover points using a target and context pairs.

Uses context pairs to define regions and finds points similar to target within those regions.

Args:
  - collectionName: Name of the collection
  - target: Target point ID or vector
  - context: Array of positive/negative pairs defining the search space
  - limit: Number of results`,
    {
      collectionName: z.string().describe('Name of the collection'),
      target: z.union([pointIdSchema, z.array(z.number())]).describe('Target point or vector'),
      context: z
        .array(
          z.object({
            positive: z.union([pointIdSchema, z.array(z.number())]).describe('Positive example'),
            negative: z.union([pointIdSchema, z.array(z.number())]).describe('Negative example'),
          })
        )
        .min(1)
        .describe('Context pairs'),
      limit: z.number().int().min(1).max(100).default(10).describe('Number of results'),
      filter: filterSchema.optional().describe('Filter conditions'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ collectionName, target, context, limit, filter, format }) => {
      try {
        const result = await client.discover(collectionName, {
          target: target as PointId | number[],
          context: context as { positive: PointId | number[]; negative: PointId | number[] }[],
          limit,
          filter,
        });
        return formatResponse(result, format, 'search_results');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Distance Matrix - Pairs
  // ===========================================================================
  server.tool(
    'qdrant_search_matrix_pairs',
    `Compute distance matrix between points as pairs.

Returns distances in pairwise format (point A, point B, score).

Args:
  - collectionName: Name of the collection
  - sample: Sample size (optional)
  - limit: Maximum pairs to return
  - filter: Filter to select points`,
    {
      collectionName: z.string().describe('Name of the collection'),
      sample: z.number().int().positive().optional().describe('Sample size'),
      limit: z.number().int().positive().optional().describe('Maximum pairs'),
      filter: filterSchema.optional().describe('Filter to select points'),
    },
    async ({ collectionName, sample, limit, filter }) => {
      try {
        const result = await client.searchMatrixPairs(collectionName, {
          sample,
          limit,
          filter,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Distance Matrix - Offsets
  // ===========================================================================
  server.tool(
    'qdrant_search_matrix_offsets',
    `Compute distance matrix in sparse matrix format.

Returns distances as offset arrays for efficient storage.`,
    {
      collectionName: z.string().describe('Name of the collection'),
      sample: z.number().int().positive().optional().describe('Sample size'),
      limit: z.number().int().positive().optional().describe('Maximum entries'),
      filter: filterSchema.optional().describe('Filter to select points'),
    },
    async ({ collectionName, sample, limit, filter }) => {
      try {
        const result = await client.searchMatrixOffsets(collectionName, {
          sample,
          limit,
          filter,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );
}
