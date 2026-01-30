/**
 * Snapshot Tools
 *
 * MCP tools for Qdrant snapshot operations.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { QdrantClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all snapshot-related tools
 */
export function registerSnapshotTools(server: McpServer, client: QdrantClient): void {
  // ===========================================================================
  // List Collection Snapshots
  // ===========================================================================
  server.tool(
    'qdrant_list_snapshots',
    `List all snapshots for a collection.

Returns snapshot names, sizes, and creation times.`,
    {
      collectionName: z.string().describe('Name of the collection'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ collectionName, format }) => {
      try {
        const result = await client.listSnapshots(collectionName);
        return formatResponse(result, format, 'snapshots');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Collection Snapshot
  // ===========================================================================
  server.tool(
    'qdrant_create_snapshot',
    `Create a snapshot of a collection.

Snapshots are point-in-time backups.

Args:
  - collectionName: Name of the collection
  - wait: Wait for snapshot creation to complete`,
    {
      collectionName: z.string().describe('Name of the collection'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ collectionName, wait }) => {
      try {
        const result = await client.createSnapshot(collectionName, wait);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Snapshot created',
                  snapshot: result,
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
  // Delete Collection Snapshot
  // ===========================================================================
  server.tool(
    'qdrant_delete_snapshot',
    `Delete a collection snapshot.

Args:
  - collectionName: Name of the collection
  - snapshotName: Name of the snapshot to delete`,
    {
      collectionName: z.string().describe('Name of the collection'),
      snapshotName: z.string().describe('Name of the snapshot'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ collectionName, snapshotName, wait }) => {
      try {
        await client.deleteSnapshot(collectionName, snapshotName, wait);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Snapshot '${snapshotName}' deleted from collection '${collectionName}'`,
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
  // Recover from Snapshot
  // ===========================================================================
  server.tool(
    'qdrant_recover_snapshot',
    `Recover a collection from a snapshot.

Can recover from a URL or local file path.

Args:
  - collectionName: Name of the collection to recover
  - location: Snapshot URL or file path
  - priority: Recovery priority (snapshot, replica, no_sync)`,
    {
      collectionName: z.string().describe('Name of the collection'),
      location: z.string().describe('Snapshot URL or file:// path'),
      priority: z
        .enum(['snapshot', 'replica', 'no_sync'])
        .default('replica')
        .describe('Recovery priority'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ collectionName, location, priority, wait }) => {
      try {
        await client.recoverSnapshot(
          collectionName,
          { location, priority },
          wait
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Collection '${collectionName}' recovered from snapshot`,
                  location,
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
  // List Full Storage Snapshots
  // ===========================================================================
  server.tool(
    'qdrant_list_full_snapshots',
    `List all full storage snapshots.

Full snapshots include all collections and aliases.`,
    {
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ format }) => {
      try {
        const result = await client.listFullSnapshots();
        return formatResponse(result, format, 'snapshots');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Create Full Storage Snapshot
  // ===========================================================================
  server.tool(
    'qdrant_create_full_snapshot',
    `Create a full storage snapshot.

Includes all collections and aliases.`,
    {
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ wait }) => {
      try {
        const result = await client.createFullSnapshot(wait);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: 'Full storage snapshot created',
                  snapshot: result,
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
  // Delete Full Storage Snapshot
  // ===========================================================================
  server.tool(
    'qdrant_delete_full_snapshot',
    `Delete a full storage snapshot.`,
    {
      snapshotName: z.string().describe('Name of the snapshot'),
      wait: z.boolean().default(true).describe('Wait for completion'),
    },
    async ({ snapshotName, wait }) => {
      try {
        await client.deleteFullSnapshot(snapshotName, wait);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Full snapshot '${snapshotName}' deleted`,
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
