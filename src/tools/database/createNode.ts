import { tool } from 'ai';
import { z } from 'zod';
import { getInternalApiBaseUrl } from '@/services/runtime/apiBase';
import { formatNodeForChat } from '../infrastructure/nodeFormatter';
import { normalizeDimensions, validateExplicitDescription } from '@/services/database/quality';

export const createNodeTool = tool({
  description: 'Create node. Description is REQUIRED and must be explicit about what the thing is (podcast, chat summary, idea, etc).',
  inputSchema: z.object({
    title: z.string().describe('The title of the node'),
    description: z.string().max(280).describe('REQUIRED. Explicitly state WHAT this is (e.g. podcast episode, conversation summary, user insight) + WHY it matters for context grounding.'),
    source: z.string().optional().describe('Raw content for embedding: transcript, article text, book passages, or user thoughts. If omitted, falls back to title + description.'),
    link: z.string().optional().describe('A URL link to the source'),
    event_date: z.string().optional().describe('When the thing actually happened (ISO 8601). Not when it was added to the graph.'),
    dimensions: z
      .array(z.string())
      .max(5)
      .optional()
      .describe('Optional dimension tags to apply to this node (0-5 items).'),
    metadata: z.record(z.any()).optional().describe('Additional metadata like source info, extraction details, etc.')
  }),
  execute: async (params) => {
    console.log('🎯 CreateNode tool called with params:', JSON.stringify(params, null, 2));
    try {
      const descriptionError = validateExplicitDescription(params.description);
      if (descriptionError) {
        return {
          success: false,
          error: `${descriptionError} Do not retry with minor rephrasing in the same turn. Rewrite the description so it explicitly names the entity type, such as note, node, person, episode, article, project, test node, or skill, and states why it matters.`,
          data: null
        };
      }

      const trimmedDimensions = normalizeDimensions(params.dimensions || [], 5);

      // Call the nodes API endpoint
      const response = await fetch(`${getInternalApiBaseUrl()}/api/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, dimensions: trimmedDimensions })
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Failed to create node',
          data: null
        };
      }

      // Format the created node for chat display
      const formattedDisplay = formatNodeForChat({
        id: result.data.id,
        title: result.data.title,
        dimensions: result.data.dimensions || trimmedDimensions
      });

      return {
        success: true,
        data: {
          ...result.data,
          formatted_display: formattedDisplay
        },
        message: `Created node ${formattedDisplay} with dimensions: ${result.data.dimensions ? result.data.dimensions.join(', ') : 'none'}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create node',
        data: null
      };
    }
  }
});

// Legacy export for backwards compatibility
export const createItemTool = createNodeTool;
