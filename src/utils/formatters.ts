/**
 * Response Formatting Utilities
 *
 * Helpers for formatting tool responses in JSON or Markdown.
 */

import type {
  CollectionDescription,
  CollectionInfo,
  ScoredPoint,
  SnapshotDescription,
  PointRecord,
} from '../types/qdrant.js';
import { QdrantApiError, formatErrorForLogging } from './errors.js';

/**
 * Response format type
 */
export type ResponseFormat = 'json' | 'markdown';

/**
 * MCP tool response type
 */
export interface ToolResponse {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Format a successful response
 */
export function formatResponse(
  data: unknown,
  format: ResponseFormat,
  entityType: string
): ToolResponse {
  if (format === 'markdown') {
    return {
      content: [{ type: 'text', text: formatAsMarkdown(data, entityType) }],
    };
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Format an error response
 */
export function formatError(error: unknown): ToolResponse {
  const errorInfo = formatErrorForLogging(error);

  let message: string;
  if (error instanceof QdrantApiError) {
    message = `Error: ${error.message}`;
    if (error.retryable) {
      message += ' (retryable)';
    }
  } else if (error instanceof Error) {
    message = `Error: ${error.message}`;
  } else {
    message = `Error: ${String(error)}`;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: message, details: errorInfo }, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Format data as Markdown
 */
function formatAsMarkdown(data: unknown, entityType: string): string {
  if (Array.isArray(data)) {
    return formatArrayAsMarkdown(data, entityType);
  }

  if (typeof data === 'object' && data !== null) {
    return formatObjectAsMarkdown(data as Record<string, unknown>, entityType);
  }

  return String(data);
}

/**
 * Format an array as Markdown
 */
function formatArrayAsMarkdown(data: unknown[], entityType: string): string {
  if (data.length === 0) {
    return `## ${capitalize(entityType)}\n\n_No items found._`;
  }

  switch (entityType) {
    case 'collections':
      return formatCollectionsTable(data as CollectionDescription[]);
    case 'points':
    case 'search_results':
      return formatPointsTable(data as (ScoredPoint | PointRecord)[]);
    case 'snapshots':
      return formatSnapshotsTable(data as SnapshotDescription[]);
    default:
      return formatGenericTable(data);
  }
}

/**
 * Format collections as Markdown table
 */
function formatCollectionsTable(collections: CollectionDescription[]): string {
  const lines: string[] = [];
  lines.push('## Collections');
  lines.push('');
  lines.push(`**Count:** ${collections.length}`);
  lines.push('');
  lines.push('| Name |');
  lines.push('|---|');

  for (const collection of collections) {
    lines.push(`| ${collection.name} |`);
  }

  return lines.join('\n');
}

/**
 * Format points/search results as Markdown table
 */
function formatPointsTable(points: (ScoredPoint | PointRecord)[]): string {
  const lines: string[] = [];
  lines.push('## Points');
  lines.push('');
  lines.push(`**Count:** ${points.length}`);
  lines.push('');

  // Check if we have scores (search results)
  const hasScores = points.some((p) => 'score' in p);

  if (hasScores) {
    lines.push('| ID | Score | Payload Preview |');
    lines.push('|---|---|---|');
    for (const point of points as ScoredPoint[]) {
      const payloadPreview = point.payload
        ? JSON.stringify(point.payload).slice(0, 50) + '...'
        : '-';
      lines.push(`| ${point.id} | ${point.score.toFixed(4)} | ${payloadPreview} |`);
    }
  } else {
    lines.push('| ID | Payload Preview |');
    lines.push('|---|---|');
    for (const point of points as PointRecord[]) {
      const payloadPreview = point.payload
        ? JSON.stringify(point.payload).slice(0, 50) + '...'
        : '-';
      lines.push(`| ${point.id} | ${payloadPreview} |`);
    }
  }

  return lines.join('\n');
}

/**
 * Format snapshots as Markdown table
 */
function formatSnapshotsTable(snapshots: SnapshotDescription[]): string {
  const lines: string[] = [];
  lines.push('## Snapshots');
  lines.push('');
  lines.push(`**Count:** ${snapshots.length}`);
  lines.push('');
  lines.push('| Name | Size | Created |');
  lines.push('|---|---|---|');

  for (const snapshot of snapshots) {
    const size = formatBytes(snapshot.size);
    const created = snapshot.creation_time || '-';
    lines.push(`| ${snapshot.name} | ${size} | ${created} |`);
  }

  return lines.join('\n');
}

/**
 * Format a generic array as Markdown table
 */
function formatGenericTable(items: unknown[]): string {
  if (items.length === 0) return '_No items_';

  const first = items[0] as Record<string, unknown>;
  const keys = Object.keys(first).slice(0, 5); // Limit columns

  const lines: string[] = [];
  lines.push(`| ${keys.join(' | ')} |`);
  lines.push(`|${keys.map(() => '---').join('|')}|`);

  for (const item of items) {
    const record = item as Record<string, unknown>;
    const values = keys.map((k) => String(record[k] ?? '-'));
    lines.push(`| ${values.join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Format a single object as Markdown
 */
function formatObjectAsMarkdown(data: Record<string, unknown>, entityType: string): string {
  const lines: string[] = [];
  lines.push(`## ${capitalize(entityType.replace(/s$/, ''))}`);
  lines.push('');

  // Special handling for collection info
  if (entityType === 'collection' && 'status' in data) {
    const info = data as unknown as CollectionInfo;
    lines.push(`**Status:** ${info.status}`);
    if (info.points_count !== undefined) {
      lines.push(`**Points Count:** ${info.points_count.toLocaleString()}`);
    }
    if (info.vectors_count !== undefined) {
      lines.push(`**Vectors Count:** ${info.vectors_count.toLocaleString()}`);
    }
    if (info.segments_count !== undefined) {
      lines.push(`**Segments:** ${info.segments_count}`);
    }
    lines.push('');
    lines.push('### Configuration');
    lines.push('```json');
    lines.push(JSON.stringify(info.config, null, 2));
    lines.push('```');
    return lines.join('\n');
  }

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'object') {
      lines.push(`**${formatKey(key)}:**`);
      lines.push('```json');
      lines.push(JSON.stringify(value, null, 2));
      lines.push('```');
    } else {
      lines.push(`**${formatKey(key)}:** ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a key for display (camelCase to Title Case)
 */
function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
