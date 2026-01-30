/**
 * Service Tools
 *
 * MCP tools for Qdrant service/system operations (health, telemetry, locks, etc.).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { QdrantClient } from '../client.js';
import { formatError, formatResponse } from '../utils/formatters.js';

/**
 * Register all service-related tools
 */
export function registerServiceTools(server: McpServer, client: QdrantClient): void {
  // ===========================================================================
  // Get Version
  // ===========================================================================
  server.tool(
    'qdrant_get_version',
    `Get Qdrant server version and build information.

Returns version, commit hash, and build info.`,
    {},
    async () => {
      try {
        const result = await client.getVersion();
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
  // Get Telemetry
  // ===========================================================================
  server.tool(
    'qdrant_get_telemetry',
    `Get telemetry data from Qdrant.

Returns information about collections, cluster state, and request statistics.

Args:
  - anonymize: Anonymize sensitive data (default: true)`,
    {
      anonymize: z.boolean().default(true).describe('Anonymize data'),
      format: z.enum(['json', 'markdown']).default('json').describe('Response format'),
    },
    async ({ anonymize, format }) => {
      try {
        const result = await client.getTelemetry(anonymize);
        return formatResponse(result, format, 'telemetry');
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Metrics
  // ===========================================================================
  server.tool(
    'qdrant_get_metrics',
    `Get Prometheus-format metrics from Qdrant.

Returns metrics in Prometheus/OpenMetrics format.`,
    {},
    async () => {
      try {
        const result = await client.getMetrics();
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (error) {
        return formatError(error);
      }
    }
  );

  // ===========================================================================
  // Get Locks
  // ===========================================================================
  server.tool(
    'qdrant_get_locks',
    `Get current lock status.

Returns whether write operations are locked.`,
    {},
    async () => {
      try {
        const result = await client.getLocks();
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
  // Set Locks
  // ===========================================================================
  server.tool(
    'qdrant_set_locks',
    `Set service locks.

Can lock write operations for maintenance.

Args:
  - write: Lock write operations
  - errorMessage: Message to return when locked operations are attempted`,
    {
      write: z.boolean().describe('Lock write operations'),
      errorMessage: z.string().optional().describe('Error message for locked operations'),
    },
    async ({ write, errorMessage }) => {
      try {
        const result = await client.setLocks({
          write,
          error_message: errorMessage,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: write ? 'Write operations locked' : 'Write operations unlocked',
                  locks: result,
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
