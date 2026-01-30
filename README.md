# Qdrant MCP Server

[![Primrose MCP](https://img.shields.io/badge/Primrose-MCP-blue)](https://primrose.dev/mcp/qdrant)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server for the Qdrant API. This server enables AI assistants to interact with Qdrant vector databases for similarity search and AI-powered applications.

## Features

- **Batch** - Batch operations for efficiency
- **Cluster** - Cluster management and info
- **Collections** - Create and manage collections
- **Indexes** - Manage payload indexes
- **Payload** - Manage point payloads
- **Points** - CRUD operations on points
- **Search** - Vector similarity search
- **Service** - Service health and info
- **Snapshots** - Create and manage snapshots
- **Vectors** - Vector operations

## Quick Start

The easiest way to get started is using the [Primrose SDK](https://github.com/primrose-ai/primrose-mcp):

```bash
npm install primrose-mcp
```

```typescript
import { createMCPClient } from 'primrose-mcp';

const client = createMCPClient('qdrant', {
  headers: {
    'X-Qdrant-API-Key': 'your-api-key',
    'X-Qdrant-Base-URL': 'https://your-cluster.qdrant.io:6333'
  }
});
```

## Manual Installation

Clone and install dependencies:

```bash
git clone https://github.com/primrose-ai/primrose-mcp-qdrant.git
cd primrose-mcp-qdrant
npm install
```

## Configuration

### Required Headers

| Header | Description |
|--------|-------------|
| `X-Qdrant-API-Key` | Your Qdrant API key |

### Optional Headers

| Header | Description |
|--------|-------------|
| `X-Qdrant-Base-URL` | Override the default Qdrant API base URL |

### Getting Your API Key

1. Log into [Qdrant Cloud](https://cloud.qdrant.io/)
2. Navigate to your cluster
3. Go to API Keys section
4. Create a new API key

## Available Tools

### Collection Tools
- `qdrant_list_collections` - List all collections
- `qdrant_get_collection` - Get collection details
- `qdrant_create_collection` - Create a new collection
- `qdrant_update_collection` - Update collection settings
- `qdrant_delete_collection` - Delete a collection
- `qdrant_get_collection_aliases` - List collection aliases
- `qdrant_update_aliases` - Update collection aliases

### Point Tools
- `qdrant_upsert_points` - Upsert points to a collection
- `qdrant_get_points` - Get points by IDs
- `qdrant_delete_points` - Delete points
- `qdrant_count_points` - Count points in collection
- `qdrant_scroll_points` - Scroll through points

### Search Tools
- `qdrant_search` - Search for similar vectors
- `qdrant_search_batch` - Batch similarity search
- `qdrant_recommend` - Get recommendations based on examples
- `qdrant_discover` - Discover points using context

### Payload Tools
- `qdrant_set_payload` - Set payload for points
- `qdrant_overwrite_payload` - Overwrite entire payload
- `qdrant_delete_payload` - Delete payload keys
- `qdrant_clear_payload` - Clear all payload

### Index Tools
- `qdrant_create_field_index` - Create a payload index
- `qdrant_delete_field_index` - Delete a payload index

### Vector Tools
- `qdrant_update_vectors` - Update vectors for points
- `qdrant_delete_vectors` - Delete named vectors

### Batch Tools
- `qdrant_batch_update` - Batch update operations

### Snapshot Tools
- `qdrant_list_snapshots` - List collection snapshots
- `qdrant_create_snapshot` - Create a snapshot
- `qdrant_delete_snapshot` - Delete a snapshot
- `qdrant_list_full_snapshots` - List full snapshots
- `qdrant_create_full_snapshot` - Create full snapshot

### Cluster Tools
- `qdrant_cluster_info` - Get cluster information
- `qdrant_recover_collection` - Recover a collection
- `qdrant_move_shard` - Move a shard

### Service Tools
- `qdrant_health` - Check service health
- `qdrant_telemetry` - Get telemetry data
- `qdrant_metrics` - Get Prometheus metrics

## Usage Examples

### Creating a Collection

```typescript
const result = await client.callTool('qdrant_create_collection', {
  collectionName: 'my-collection',
  vectorsConfig: {
    size: 1536,
    distance: 'Cosine'
  }
});
```

### Upserting Points

```typescript
const result = await client.callTool('qdrant_upsert_points', {
  collectionName: 'my-collection',
  points: [
    {
      id: 1,
      vector: [0.1, 0.2, 0.3, ...],
      payload: { category: 'technology', title: 'AI Article' }
    }
  ]
});
```

### Searching Vectors

```typescript
const result = await client.callTool('qdrant_search', {
  collectionName: 'my-collection',
  vector: [0.1, 0.2, 0.3, ...],
  limit: 10,
  filter: {
    must: [
      { key: 'category', match: { value: 'technology' } }
    ]
  },
  withPayload: true
});
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Related Resources

- [Primrose SDK](https://github.com/primrose-ai/primrose-mcp) - Unified SDK for all Primrose MCP servers
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Qdrant API Reference](https://qdrant.github.io/qdrant/redoc/index.html)
- [Model Context Protocol](https://modelcontextprotocol.io/)
