/**
 * Index Tools
 *
 * MCP tools for Qdrant payload field index operations.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { QdrantClient } from '../client.js';
import type { PayloadFieldSchema } from '../types/qdrant.js';
import { formatError } from '../utils/formatters.js';

/**
 * Register all index-related tools
 */
export function registerIndexTools(server: McpServer, client: QdrantClient): void {
  // ===========================================================================
  // Create Field Index
  // ===========================================================================
  server.tool(
    'qdrant_create_field_index',
    `Create a payload field index for faster filtering.

Indexes improve filter performance on specific payload fields.

Args:
  - collectionName: Name of the collection
  - fieldName: Payload field to index
  - fieldSchema: Index type (keyword, integer, float, bool, geo, datetime, text, uuid)
  - wait: Wait for indexing to complete`,
    {
      collectionName: z.string().describe('Name of the collection'),
      fieldName: z.string().describe('Payload field to index'),
      fieldSchema: z
        .enum(['keyword', 'integer', 'float', 'bool', 'geo', 'datetime', 'text', 'uuid'])
        .optional()
        .describe('Index type'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ collectionName, fieldName, fieldSchema, wait }) => {
      try {
        const result = await client.createFieldIndex(
          collectionName,
          fieldName,
          fieldSchema ? { field_name: fieldName, field_schema: fieldSchema as PayloadFieldSchema } : undefined,
          wait
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Index created on field '${fieldName}'`,
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
  // Create Text Index
  // ===========================================================================
  server.tool(
    'qdrant_create_text_index',
    `Create a full-text search index on a payload field.

Enables text search with tokenization.

Args:
  - collectionName: Name of the collection
  - fieldName: Payload field to index
  - tokenizer: Tokenization strategy
  - minTokenLen: Minimum token length
  - maxTokenLen: Maximum token length
  - lowercase: Convert to lowercase`,
    {
      collectionName: z.string().describe('Name of the collection'),
      fieldName: z.string().describe('Payload field to index'),
      tokenizer: z
        .enum(['prefix', 'whitespace', 'word', 'multilingual'])
        .default('word')
        .describe('Tokenizer type'),
      minTokenLen: z.number().int().min(1).optional().describe('Minimum token length'),
      maxTokenLen: z.number().int().optional().describe('Maximum token length'),
      lowercase: z.boolean().default(true).describe('Lowercase tokens'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ collectionName, fieldName, tokenizer, minTokenLen, maxTokenLen, lowercase, wait }) => {
      try {
        const result = await client.createFieldIndex(
          collectionName,
          fieldName,
          {
            field_name: fieldName,
            field_schema: {
              type: 'text',
              tokenizer,
              min_token_len: minTokenLen,
              max_token_len: maxTokenLen,
              lowercase,
            },
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
                  message: `Text index created on field '${fieldName}'`,
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
  // Create Integer Index with Options
  // ===========================================================================
  server.tool(
    'qdrant_create_integer_index',
    `Create an integer index with lookup and/or range support.

Args:
  - collectionName: Name of the collection
  - fieldName: Payload field to index
  - lookup: Enable direct lookup (Match filters)
  - range: Enable range queries`,
    {
      collectionName: z.string().describe('Name of the collection'),
      fieldName: z.string().describe('Payload field to index'),
      lookup: z.boolean().default(true).describe('Enable direct lookup'),
      range: z.boolean().default(true).describe('Enable range queries'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ collectionName, fieldName, lookup, range, wait }) => {
      try {
        const result = await client.createFieldIndex(
          collectionName,
          fieldName,
          {
            field_name: fieldName,
            field_schema: {
              type: 'integer',
              lookup,
              range,
            },
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
                  message: `Integer index created on field '${fieldName}'`,
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
  // Delete Field Index
  // ===========================================================================
  server.tool(
    'qdrant_delete_field_index',
    `Delete a payload field index.

Args:
  - collectionName: Name of the collection
  - fieldName: Payload field to remove index from`,
    {
      collectionName: z.string().describe('Name of the collection'),
      fieldName: z.string().describe('Payload field'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ collectionName, fieldName, wait }) => {
      try {
        const result = await client.deleteFieldIndex(collectionName, fieldName, wait);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Index removed from field '${fieldName}'`,
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
