// Sample documents provided for immediate viewing and testing

export const SAMPLE_DOCS = {
  welcome: {
    id: 'welcome',
    name: 'README.md',
    content: `# 🚀 Marko — Universal Markdown (.md) Viewer & Editor

Welcome to **Marko**, a high-performance cross-platform Markdown Viewer and Editor designed for **macOS, Windows, Linux**, and mobile platforms (**Android & iOS**).

> [!NOTE]
> **View Mode Active by Default**: As configured, this application opens all documents in **View Mode** first for an optimal, distraction-free reading experience. You can switch to **Edit Mode** or **Split Mode** anytime from the top bar or by pressing \`Ctrl + E\` / \`Cmd + E\`.

---

## 🌟 Key Highlights

- 🖥️ **Cross-Platform Ready**: Seamless on Windows, Mac, Linux (Desktop PWA) and expandable to Android & iOS via Capacitor.
- 👁️ **Default View Mode**: Clean, distraction-free typography with dark, light, and warm sepia themes.
- ⚡ **Local File Access**: Open and save files directly on your hard drive with the modern File System Access API.
- 📊 **Mermaid Diagrams**: Interactive rendering for flowcharts, sequence diagrams, and architecture graphs.
- 🧮 **KaTeX Math Engine**: Lightning-fast LaTeX math formulas rendering for scientific notes.
- 🎨 **Syntax Highlighting**: Beautiful code blocks with line numbers and one-click copy.
- 📑 **Dynamic Table of Contents**: Real-time outline tracking your current reading position.
- 📤 **Instant Export**: Export clean styled PDFs, standalone HTML, or raw Markdown.

---

## 💡 GitHub Flavored Alerts

> [!TIP]
> Use keyboard shortcuts like \`Ctrl+O\` (Open File), \`Ctrl+S\` (Save File), and \`Ctrl+N\` (New File) to streamline your workflow!

> [!IMPORTANT]
> If your browser supports the File System Access API, changes saved with \`Ctrl+S\` will be written directly back to your local file without repeated download prompts.

> [!WARNING]
> Unsaved edits will be safeguarded in browser storage, but remember to save your work before closing the window.

---

## 📊 Live Mermaid Diagram Support

You can embed Mermaid diagrams directly into your Markdown files:

\`\`\`mermaid
graph TD
    A[Start: Open .md File] --> B{Default Mode}
    B -->|Automatic| C[👁️ View Mode]
    C -->|Ctrl+E| D[✏️ Edit Mode]
    C -->|Split View| E[⚡ Live Split Mode]
    D --> F[💾 Save to Local Disk]
    E --> F
    F --> G[🚀 Export PDF / HTML]
\`\`\`

Here is a sequence diagram example:

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User
    participant App as 💻 MD File View
    participant FS as 📁 Local Disk / Mobile
    User->>App: Open .md File
    App->>FS: Read file content
    FS-->>App: Raw Markdown
    App->>App: Render GFM, KaTeX & Mermaid
    App-->>User: Display in View Mode (Default)
\`\`\`

---

## 🧮 KaTeX Mathematical Equations

Write inline math like $E = mc^2$ or $\\lim_{x \\to \\infty} \\frac{1}{x} = 0$, or full display formulas:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
$$

The standard quadratic formula:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

Euler's identity, often celebrated as the most beautiful formula in mathematics:

$$
e^{i\\pi} + 1 = 0
$$

---

## 💻 Code Blocks with Syntax Highlighting

Here is a Python example with error handling and typing:

\`\`\`python
from typing import Optional
from pathlib import Path

def read_markdown_file(filepath: Path) -> Optional[str]:
    """Reads a markdown file with UTF-8 encoding."""
    try:
        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")
        return filepath.read_text(encoding="utf-8")
    except Exception as err:
        print(f"Error reading {filepath}: {err}")
        return None

if __name__ == "__main__":
    content = read_markdown_file(Path("README.md"))
    print(f"Loaded {len(content) if content else 0} bytes.")
\`\`\`

And a JavaScript snippet:

\`\`\`javascript
// Seamless cross-platform file saving
async function saveMarkdownFile(fileHandle, content) {
  if (fileHandle && fileHandle.createWritable) {
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  }
  return false;
}
\`\`\`

---

## 📋 Interactive Task Checklist

- [x] Cross-platform desktop support (macOS, Windows, Linux)
- [x] Future-proof mobile architecture for Android & iOS (Capacitor)
- [x] Default to View mode on document load
- [x] Rich Markdown rendering (GFM, Tables, Checklists)
- [x] Mermaid diagram integration
- [x] KaTeX math equation rendering
- [x] Code syntax highlighting with copy buttons
- [x] Table of Contents / Outline navigation
- [x] Export to PDF and standalone HTML
- [ ] Add your own custom markdown files!

---

## 📊 Formatted Data Tables

| Feature | macOS / Windows / Linux | Android / iOS | Status |
| :--- | :---: | :---: | :---: |
| **Markdown Rendering** | ✅ Yes | ✅ Yes | Built-in |
| **Mermaid Diagrams** | ✅ Yes | ✅ Yes | Interactive |
| **KaTeX Math Engine** | ✅ Yes | ✅ Yes | Zero-latency |
| **File System Access** | ✅ Native API | ✅ File Picker | Supported |
| **PDF & HTML Export** | ✅ Supported | ✅ Supported | Print engine |
| **Offline PWA** | ✅ Installable | ✅ Installable | Ready |

---

## 💬 Blockquotes & Inspirations

> "Simplicity is prerequisite for reliability."  
> — *Edsger W. Dijkstra*

> "Markdown allows you to write using an easy-to-read, easy-to-write plain text format, then convert it to structurally valid HTML."  
> — *John Gruber*
`
  },

  blank: {
    id: 'blank',
    name: 'Untitled.md',
    content: `# Untitled Document

Start writing your markdown here...

- Item 1
- Item 2
- Item 3
`
  },

  techDoc: {
    id: 'techDoc',
    name: 'Architecture_Design.md',
    content: `# 🏗️ Architecture Design Specification

## 1. Overview
This document specifies the technical architecture for the cross-platform Markdown Viewer & Editor application.

## 2. Core Principles
1. **View First**: Prioritize reading ergonomics; default to rendered presentation.
2. **Platform Agnostic**: Single responsive web codebase wrapping into Web, PWA, Electron, and Capacitor.
3. **Zero Data Loss**: In-memory and local cache persistence for all unsaved buffers.

## 3. Component Architecture

\`\`\`mermaid
flowchart LR
    subgraph UI ["User Interface Layer"]
        Viewer["Render Engine (Marked + KaTeX + Mermaid)"]
        Editor["Editor Core & Markdown Toolbar"]
        Sidebar["Outline TOC & File History"]
    end

    subgraph State ["State Management"]
        FileState["File Handle & Buffer State"]
        ThemeState["Theme & Settings"]
    end

    subgraph Platform ["Platform Adapters"]
        Desktop["Desktop (FSA API / Chrome / Edge / PWA)"]
        Mobile["Mobile (Capacitor / Android & iOS)"]
    end

    UI <--> State
    State <--> Platform
\`\`\`

## 4. Dependencies & Libraries
- **Marked**: High performance Markdown lexer and compiler.
- **KaTeX**: Fast mathematical typesetting library.
- **Mermaid**: Charting and diagramming tool.
- **Highlight.js**: Robust language syntax highlighting.
`
  },

  meetingNotes: {
    id: 'meetingNotes',
    name: 'Meeting_Notes.md',
    content: `# 📝 Sprint Planning & Roadmap

**Date**: Today  
**Participants**: Team Lead, Frontend Engineer, Mobile Dev  

---

## 🎯 Objectives
1. Implement default **View Mode** for all .md files.
2. Ensure full compatibility on Windows, macOS, and Linux.
3. Prepare Capacitor wrapper for Android and iOS mobile stores.

## 📌 Action Items
- [x] Scaffold Vite + PWA structure
- [x] Integrate Marked, KaTeX, and Mermaid.js
- [x] Configure File System Access API with fallback
- [ ] Review Android build configuration
- [ ] Test on tablet and mobile viewports
`
  }
};
