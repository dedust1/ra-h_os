---
name: DB Operations
description: "Use for graph read, write, connect, classify, or traverse operations with strict data quality standards."
---

# DB Operations

## Core Rules

1. Search before create to avoid duplicates.
2. Every create/update must include an explicit description of WHAT the thing is and WHY it matters.
3. Use event dates when known (when it happened, not when saved).
4. Apply dimensions deliberately; prefer existing dimensions over creating noisy new ones.
5. Create edges when relationships are meaningful; edge explanations should read as a sentence.

## Write Quality Contract

- `title`: clear and specific.
- `description`: concrete object-level description, not vague summaries.
- `source`: full verbatim or canonical content of the node (transcript, article text, book passage, user's thoughts). This is what gets chunked and embedded for semantic search.
- `link`: external source URL only.
- Derived analysis, briefs, and research notes should be stored in a separate linked node, not appended to the source node.

## Execution Pattern

1. Read context (search + relevant nodes + relevant edges).
2. Decide: create vs update vs connect.
3. Execute minimum required writes.
4. Verify result reflects user intent exactly.

## Do Not

- Create duplicate nodes when an update is correct.
- Write vague descriptions ("discusses", "explores", "is about").
- Create weak or directionless edges.
