import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { extractWebsite } from '@/services/typescript/extractors/website';
import { formatNodeForChat } from '../infrastructure/nodeFormatter';

interface ExistingDimension {
  name: string;
  description: string | null;
}

function inferWebsiteContentType(url: string): 'website' | 'tweet' {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === 'x.com' || hostname.endsWith('.x.com') || hostname === 'twitter.com' || hostname.endsWith('.twitter.com')
      ? 'tweet'
      : 'website';
  } catch {
    return 'website';
  }
}

async function fetchExistingDimensions(): Promise<ExistingDimension[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/dimensions/popular`);
    if (!response.ok) return [];

    const result = await response.json();
    if (!Array.isArray(result.data)) return [];

    return result.data
      .map((dimension: { dimension?: unknown; description?: unknown }) => ({
        name: typeof dimension.dimension === 'string' ? dimension.dimension.trim() : '',
        description: typeof dimension.description === 'string' ? dimension.description.trim() : null
      }))
      .filter((dimension: ExistingDimension) => dimension.name.length > 0);
  } catch (error) {
    console.warn('Website dimension fetch fallback (no dimension context):', error);
    return [];
  }
}

function selectExistingDimensions(
  selected: unknown,
  existingDimensions: ExistingDimension[],
  max = 5
): string[] {
  if (!Array.isArray(selected) || existingDimensions.length === 0) return [];

  const byLowerName = new Map(existingDimensions.map((dimension) => [dimension.name.toLowerCase(), dimension.name]));
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const value of selected) {
    if (typeof value !== 'string') continue;
    const matched = byLowerName.get(value.trim().toLowerCase());
    if (!matched) continue;
    const key = matched.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(matched);
    if (normalized.length >= max) break;
  }

  return normalized;
}

// AI-powered content analysis
async function analyzeContentWithAI(
  title: string,
  description: string,
  contentType: string,
  existingDimensions: ExistingDimension[]
) {
  try {
    const availableDimensionsBlock = existingDimensions.length > 0
      ? existingDimensions
          .map((dimension) => `- ${dimension.name}${dimension.description ? `: ${dimension.description}` : ''}`)
          .join('\n')
      : '- No existing dimensions available. Return an empty dimensions array.';
    const prompt = `Analyze this ${contentType} content and provide classification.

Title: "${title}"
Description: "${description}"

CRITICAL — nodeDescription rules (max 280 chars):
1. Say WHAT this literally is using explicit entity words only: "Blog post by…", "Article from…", "Essay arguing…", "Tutorial on…", "Thread by…", "Tweet by…", "Post by…"
2. Name the author/site if known from the metadata.
3. State the actual claim or thesis — don't paraphrase into vague abstractions.
4. End with why it's interesting or important — one concrete phrase.
5. ABSOLUTELY FORBIDDEN: "discusses", "explores", "examines", "talks about", "delves into", "emphasizing the need for". State things directly.

DIMENSION SELECTION (critical):
You must select 0-3 dimensions from the list below.
Do NOT invent new dimension names.
Pick only dimensions that genuinely fit this content.
If nothing fits, return an empty array.

Available dimensions:
${availableDimensionsBlock}

Examples:
- Title: "Software is eating the world — again" / Author: Andrej Karpathy
  GOOD: "Karpathy's blog post arguing AI agents make software fluid — they can rip functionality from repos instead of taking dependencies. Signals the end of monolithic libraries."
  BAD: "By Karpathy — discusses the importance of software becoming more fluid and malleable with agents."

- Title: "The case for slowing down AI" / Site: The Atlantic
  GOOD: "Atlantic article making the case that AI labs should voluntarily slow capability research until safety catches up. Notable because it cites internal lab disagreements."
  BAD: "This article explores ideas about slowing down AI development and its implications."

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "enhancedDescription": "A comprehensive summary (3-6 paragraphs, 800-1500 chars). Cover key points, arguments, takeaways.",
  "nodeDescription": "<your 280-char description following the rules above>",
  "dimensions": ["existing-dimension-1", "existing-dimension-2"],
  "reasoning": "Brief explanation of classification choices"
}`;

    const response = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      maxOutputTokens: 800
    });

    let content = response.text || '{}';

    // Clean up the response - remove markdown code blocks if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const result = JSON.parse(content);

    return {
      enhancedDescription: result.enhancedDescription || description,
      nodeDescription: typeof result.nodeDescription === 'string' ? result.nodeDescription.slice(0, 280) : undefined,
      dimensions: selectExistingDimensions(result.dimensions, existingDimensions, 5),
      reasoning: result.reasoning || 'AI analysis completed'
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.warn('Website analysis fallback (using default description):', message);
    return {
      enhancedDescription: description,
      nodeDescription: undefined,
      dimensions: [],
      reasoning: 'Fallback description used'
    };
  }
}

export const websiteExtractTool = tool({
  description: 'Extract website content and metadata into a node with summary, tags, and raw chunk',
  inputSchema: z.object({
    url: z.string().describe('The website URL to add to knowledge base'),
    title: z.string().optional().describe('Custom title (auto-generated if not provided)'),
    dimensions: z.array(z.string()).min(1).max(5).optional().describe('Dimension tags to apply to the created node (locked dimensions first)')
  }),
  execute: async ({ url, title, dimensions }) => {
    try {
      // Validate URL format
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return {
          success: false,
          error: 'Invalid URL format - must start with http:// or https://',
          data: null
        };
      }

      let result: { success: boolean; notes?: string; chunk?: string; metadata?: any; error?: string };
      
      try {
        const extractionResult = await extractWebsite(url);
        result = {
          success: true,
          notes: extractionResult.content,
          chunk: extractionResult.chunk,
          metadata: {
            title: extractionResult.metadata.title,
            author: extractionResult.metadata.author,
            date: extractionResult.metadata.date,
            description: extractionResult.metadata.description,
            og_image: extractionResult.metadata.og_image,
            site_name: extractionResult.metadata.site_name,
            extraction_method: 'typescript'
          }
        };
      } catch (error: any) {
        result = { 
          success: false, 
          error: error.message || 'TypeScript extraction failed' 
        };
      }

      if (!result.success || (!result.notes && !result.chunk)) {
        return {
          success: false,
          error: result.error || 'Failed to extract website content',
          data: null
        };
      }

      console.log('🎯 Website extraction successful, analyzing with AI...');

      // Step 2: AI Analysis for enhanced metadata
      const existingDimensions = await fetchExistingDimensions();
      const contentType = inferWebsiteContentType(url);
      const aiAnalysis = await analyzeContentWithAI(
        result.metadata?.title || `Website: ${new URL(url).hostname}`, 
        result.notes?.substring(0, 2000) || 'Website content', 
        contentType,
        existingDimensions
      );

      // Step 3: Create node with extracted content and AI analysis
      const nodeTitle = title || result.metadata?.title || `Website: ${new URL(url).hostname}`;
      const enhancedDescription = aiAnalysis?.enhancedDescription || `Website content from ${new URL(url).hostname}`;
      
      const suppliedDimensions = Array.isArray(dimensions) ? dimensions : [];
      let trimmedDimensions = suppliedDimensions
        .map(dim => (typeof dim === 'string' ? dim.trim() : ''))
        .filter(Boolean);

      trimmedDimensions = trimmedDimensions.slice(0, 5);
      const finalDimensions = trimmedDimensions.length > 0
        ? trimmedDimensions
        : (aiAnalysis?.dimensions || []).slice(0, 5);

      const createResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: nodeTitle,
          description: aiAnalysis?.nodeDescription,
          notes: enhancedDescription,
          link: url,
          event_date: result.metadata?.published_date || result.metadata?.date || null,
          dimensions: finalDimensions,
          chunk: result.chunk || result.notes,
          metadata: {
            source: contentType,
            hostname: new URL(url).hostname,
            author: result.metadata?.author,
            published_date: result.metadata?.published_date || result.metadata?.date,
            content_length: (result.chunk || result.notes)?.length,
            extraction_method: result.metadata?.extraction_method || 'python_beautifulsoup',
            ai_analysis: aiAnalysis?.reasoning,
            enhanced_description: enhancedDescription,
            refined_at: new Date().toISOString()
          }
        })
      });

      const createResult = await createResponse.json();

      if (!createResponse.ok) {
        return {
          success: false,
          error: createResult.error || 'Failed to create node',
          data: null
        };
      }

      console.log('🎯 WebsiteExtract completed successfully');

      // Use actual assigned dimensions from API response (includes auto-assigned locked + keywords)
      const actualDimensions: string[] = createResult.data?.dimensions || finalDimensions || [];
      const formattedNode = createResult.data?.id
        ? formatNodeForChat({ id: createResult.data.id, title: nodeTitle, dimensions: actualDimensions })
        : nodeTitle;
      const dimsDisplay = actualDimensions.length > 0 ? actualDimensions.join(', ') : 'none';

      return {
        success: true,
        message: `Added ${formattedNode} with dimensions: ${dimsDisplay}`,
        data: {
          nodeId: createResult.data?.id,
          title: nodeTitle,
          contentLength: (result.chunk || result.notes || '').length,
          url: url,
          dimensions: actualDimensions
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract website content',
        data: null
      };
    }
  }
});
