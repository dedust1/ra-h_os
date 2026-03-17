# User Interface

> How to navigate and use RA-OS's interface.

**How it works:** RA-OS uses a collapsible left navigation rail plus a flexible workspace that can show one or two panes at once. Nodes, dimensions, map, table, skills, and settings all live inside the same workspace.

---

## Workspace Layout

```
┌────────┬──────────────────────┬──────────────────────┐
│  NAV   │      PANE A          │      PANE B          │
│        │                      │                      │
│ Search │ Nodes / Focus        │ Optional second pane │
│ Add    │ Dimensions / Map     │ for compare/browse   │
│ Views  │ Table / Skills       │                      │
└────────┴──────────────────────┴──────────────────────┘
```

---

## Left Navigation

The left rail can stay compact or expand into a labeled navigation column.

### Features

- **Search** — Cmd+K opens global search
- **Add Stuff** — open the quick-add flow
- **Refresh** — reload pane data
- **Workspace views** — Nodes, Skills, Map, Dimensions, and Table
- **Settings** — open settings and MCP/config panels

---

## Nodes Pane

Browse and manage your knowledge base in the main feed.

### Features

- **Search bar** — filter nodes by text
- **Dimension filters** — filter the feed with one or more dimensions
- **Pending quick-add items** — processing placeholders appear in the feed
- **Open in other pane** — send a node to the second pane for comparison

### Node Display

Each node shows:
- Title and preview
- Dimension tags
- Last updated timestamp
- Node ID badge

---

## Dimensions Pane

The dimensions pane is now a dedicated browser instead of a modal-only overlay.

### Features

- Browse dimension cards with counts and lock state
- Create new dimensions from the pane header
- Select a dimension to push that filter into the Nodes pane
- Manage dimension metadata and node grouping from one place

---

## Focus Pane

Active workspace for the node(s) you're working with.

### Tabbed Interface

- **Primary tab** — Main focused node
- **Additional tabs** — Related nodes opened from links
- **Tab controls** — Close (×), reorder, switch

### Node Detail View

| Section | Content |
|---------|---------|
| **Header** | Title, node ID, trash icon |
| **Content** | Full markdown notes with node tokens and links |
| **Metadata** | Created, updated, type, link |
| **Dimensions** | Editable dimension tags |
| **Connections** | Incoming/outgoing edges |

### Content Rendering

- Markdown support
- `[NODE:id:"title"]` renders as clickable links
- Syntax highlighting for code blocks
- YouTube embeds (if link is YouTube URL)

---

## Search (Cmd+K)

Global search modal with 4-tier relevance:

1. **Exact title match** — Highest priority
2. **Title substring** — High priority
3. **FTS content match** — Medium priority
4. **Semantic embedding** — Conceptual matches

**Features:**
- Type-ahead instant results
- Keyboard navigation (↑↓, Enter)
- Click or Enter to open in Focus panel

---

## Settings Panel

**Access:** Settings item in the left navigation

### Tabs

| Tab | Purpose |
|-----|---------|
| **API Keys** | Configure OpenAI/Tavily keys |
| **Skills** | View, edit, create skills |
| **Tools** | View available tools |
| **Database** | Full node table with filters/sorting |
| **Logs** | Activity feed (last 100 entries) |
| **Context** | Context/system information viewer |
| **Agents** | External agent (MCP) configuration |

---

## Map View

Visual graph of your knowledge network.

**Features:**
- Dimension View and Hub View modes
- Saved node positions per view mode
- Pan/zoom with fit controls and minimap
- Node size proportional to edge count
- Top nodes labeled by title and dimension color
- Click node to highlight connections
- Selection shows connected nodes in green

---

## Database View

Full table view of all nodes.

**Columns:**
- Node (title + ID)
- Dimensions (folder badges)
- Edges (count)
- Updated (timestamp)

**Features:**
- Search by title/content
- Filter by dimensions
- Sort by updated/edges/created
- Pagination
- Toolbar lives in the pane header for faster switching

---

## Dimension Icons

Each dimension can have a custom Lucide icon.

**To set:**
1. Open Folder View → hover over dimension
2. Click edit (pencil) icon
3. Choose icon from curated options
4. Icons persist in localStorage

---

## Node References

**Format:** `[NODE:id:"title"]`

**Rendering:**
- Clickable labels in node content
- Hover shows preview tooltip
- Click opens in Focus panel

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open search |
| `Cmd+Shift+R` | Refresh all panes |
| `Escape` | Close modals/overlays |

---

## Design System

### Colors

- **Background:** `#0a0a0a` (near black)
- **Accent:** Green (`#22c55e`) for actions, selections
- **Text:** White (primary), neutral-400 (secondary)

### Typography

- **Font:** Geist (monospace feel)
- **Sizes:** 11-14px for UI, larger for content

### Buttons

- **Primary:** White bg, black text
- **Secondary:** Transparent, border, white text
- **Toggle:** 28×28px, subtle border, icon only
