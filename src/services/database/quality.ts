const WEAK_DESCRIPTION_PATTERNS = /\b(discusses|explores|examines|talks about|is about|delves into)\b/i;
const EXPLICIT_ENTITY_PATTERNS = /\b(article|artifact|book|brief|claim|company|concept|conversation|dataset|decision|dimension|document|episode|essay|event|guide|idea|insight|interview|lesson|link|node|note|paper|person|plan|placeholder|podcast|post|presentation|project|question|record|research|resource|skill|source|status|summary|talk|target|test node|thread|tool|transcript|tweet|update|video|website|workflow)\b/i;
const UNCERTAINTY_PATTERNS = /\b(likely|probably|possibly|appears to be|seems to be|unclear|uncertain)\b/i;
const GENERIC_EDGE_PATTERNS = /^(related|related to|connected|connected to|association|associated with)$/i;

export function normalizeDimensionName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeDimensions(values: unknown, max = 5): string[] {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = normalizeDimensionName(value);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
    if (normalized.length >= max) break;
  }

  return normalized;
}

export function validateExplicitDescription(description: string): string | null {
  const text = description.trim();
  if (text.length < 24) {
    return 'Description must be explicit and substantial (at least 24 characters).';
  }
  if (WEAK_DESCRIPTION_PATTERNS.test(text)) {
    return 'Description is too vague. State exactly what this is and why it matters.';
  }
  if (!EXPLICIT_ENTITY_PATTERNS.test(text) && !UNCERTAINTY_PATTERNS.test(text)) {
    return 'Description must explicitly identify what this thing is, or state uncertainty explicitly.';
  }
  return null;
}

export function validateEdgeExplanation(explanation: string): string | null {
  const text = explanation.trim();
  if (text.length < 8) {
    return 'Edge explanation must be explicit enough to describe the relationship.';
  }
  if (GENERIC_EDGE_PATTERNS.test(text)) {
    return 'Edge explanation is too generic. State the actual relationship or explicitly note uncertainty.';
  }
  return null;
}

export function validateDimensionDescription(description: string): string | null {
  const text = description.trim();
  if (!text) {
    return 'Dimension description is required.';
  }
  if (text.length > 500) {
    return 'Description must be 500 characters or less.';
  }
  return null;
}
