import { tool } from 'ai';
import { z } from 'zod';
import { getInternalApiBaseUrl } from '@/services/runtime/apiBase';
import { normalizeDimensions, validateExplicitDescription } from '@/services/database/quality';

export const updateNodeTool = tool({
  description: 'Update node fields. Description is REQUIRED on every update and must explicitly state WHAT this is + WHY it matters.',
  inputSchema: z.object({
    id: z.number().describe('The ID of the node to update'),
    updates: z.object({
      title: z.string().optional().describe('New title'),
      description: z.string().max(280).describe('REQUIRED on every update. Explicitly state WHAT this is + WHY it matters. No "discusses/explores".'),
      source: z.string().optional().describe('Canonical source content for embedding. Use this only to set or correct the raw source text.'),
      link: z.string().optional().describe('New link'),
      event_date: z.string().optional().describe('When the thing actually happened (ISO 8601). Not when it was added to the graph.'),
      dimensions: z.array(z.string()).optional().describe('New dimension tags - completely replaces existing dimensions'),
      metadata: z.record(z.any()).optional().describe('New metadata - completely replaces existing metadata')
    }).describe('Object containing the fields to update. Derived analysis should be stored in a separate linked node, not appended to the source node.')
  }),
  execute: async ({ id, updates }) => {
    try {
      if (!updates || Object.keys(updates).length === 0) {
        return {
          success: false,
          error: 'updateNode requires at least one field in the updates object.',
          data: null
        };
      }

      if (!updates.description) {
        return {
          success: false,
          error: 'Every node update requires an explicit description (WHAT this is + WHY it matters).',
          data: null
        };
      }
      const descriptionError = validateExplicitDescription(updates.description);
      if (descriptionError) {
        return {
          success: false,
          error: descriptionError,
          data: null
        };
      }

      if (Array.isArray(updates.dimensions)) {
        updates.dimensions = normalizeDimensions(updates.dimensions, 5);
      }

      // Call the nodes API endpoint
      const response = await fetch(`${getInternalApiBaseUrl()}/api/nodes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to update node',
          data: null
        };
      }

      return {
        success: true,
        data: result.node,
        message: `Updated node ID ${id}${updates.dimensions ? ` with dimensions: ${updates.dimensions.join(', ')}` : ''}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update node',
        data: null
        };
    }
  }
});

// Legacy export for backwards compatibility
export const updateItemTool = updateNodeTool;
