import { Marked } from 'marked';
import hljs from 'highlight.js';
import katex from 'katex';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';

// Initialize Mermaid with clean modern dark/light aware theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif'
});

export function updateMermaidTheme(isDark) {
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: 'Inter, system-ui, sans-serif'
  });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

/**
 * Custom Marked instance with customized renderer
 */
const markedInstance = new Marked({
  gfm: true,
  breaks: true
});

// Configure custom renderer
markedInstance.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const rawText = tokens.map(t => t.raw || t.text || '').join('');
      const id = slugify(rawText);
      return `
        <h${depth} id="${id}" class="heading-level-${depth}">
          <a href="#${id}" class="heading-anchor" aria-hidden="true" title="Direct link">#</a>
          <span>${text}</span>
        </h${depth}>
      `;
    },

    code({ text, lang }) {
      const language = (lang || '').trim().toLowerCase();

      // Mermaid diagrams
      if (language === 'mermaid') {
        const diagramId = 'mermaid-' + Math.random().toString(36).substring(2, 9);
        return `
          <div class="mermaid-container" id="${diagramId}">
            <div class="mermaid-diagram" data-mermaid-code="${encodeURIComponent(text)}">
              <pre class="mermaid">${escapeHtml(text)}</pre>
            </div>
            <div class="mermaid-actions">
              <button class="btn-copy-mermaid" data-code="${encodeURIComponent(text)}" title="Copy diagram code">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copy
              </button>
            </div>
          </div>
        `;
      }

      // Syntax highlighting with highlight.js
      let highlightedCode = '';
      let detectedLang = language || 'text';

      if (language && hljs.getLanguage(language)) {
        try {
          highlightedCode = hljs.highlight(text, { language, ignoreIllegals: true }).value;
        } catch {
          highlightedCode = escapeHtml(text);
        }
      } else {
        try {
          const auto = hljs.highlightAuto(text);
          highlightedCode = auto.value;
          detectedLang = auto.language || 'text';
        } catch {
          highlightedCode = escapeHtml(text);
        }
      }

      const encodedCode = encodeURIComponent(text);

      return `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="code-lang-badge">${detectedLang}</span>
            <button class="btn-copy-code" data-code="${encodedCode}" title="Copy code snippet">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>Copy</span>
            </button>
          </div>
          <pre><code class="hljs language-${detectedLang}">${highlightedCode}</code></pre>
        </div>
      `;
    },

    blockquote({ tokens }) {
      const body = this.parser.parse(tokens);
      
      // Check for GitHub callout alert syntax: > [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION]
      const alertMatch = body.match(/^\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*<br\s*\/?>)?([\s\S]*?)<\/p>([\s\S]*)$/i);
      
      if (alertMatch) {
        const type = alertMatch[1].toUpperCase();
        const firstLineRest = alertMatch[2];
        const restOfBody = alertMatch[3];
        
        const alertConfig = {
          NOTE: { icon: 'ℹ️', title: 'Note', class: 'alert-note' },
          TIP: { icon: '💡', title: 'Tip', class: 'alert-tip' },
          IMPORTANT: { icon: '❗', title: 'Important', class: 'alert-important' },
          WARNING: { icon: '⚠️', title: 'Warning', class: 'alert-warning' },
          CAUTION: { icon: '🛑', title: 'Caution', class: 'alert-caution' }
        }[type] || { icon: 'ℹ️', title: type, class: 'alert-note' };

        return `
          <div class="markdown-alert ${alertConfig.class}">
            <div class="markdown-alert-header">
              <span class="markdown-alert-icon">${alertConfig.icon}</span>
              <span class="markdown-alert-title">${alertConfig.title}</span>
            </div>
            <div class="markdown-alert-content">
              ${firstLineRest ? `<p>${firstLineRest}</p>` : ''}
              ${restOfBody}
            </div>
          </div>
        `;
      }

      return `<blockquote>${body}</blockquote>`;
    },

    listitem(item) {
      // Interactive GFM task list items
      if (item.task) {
        const checked = item.checked ? 'checked' : '';
        const text = this.parser.parse(item.tokens);
        return `
          <li class="task-list-item ${checked ? 'is-completed' : ''}">
            <input type="checkbox" class="task-list-item-checkbox" ${checked} />
            <div class="task-list-item-content">${text}</div>
          </li>
        `;
      }
      return `<li>${this.parser.parse(item.tokens)}</li>`;
    }
  }
});

/**
 * Main Markdown renderer that extracts Math formulas safely,
 * converts markdown to HTML, renders math with KaTeX,
 * and sanitizes the output.
 */
export function renderMarkdownToHtml(markdownText) {
  if (!markdownText) return '';

  const mathTokens = [];
  let tokenIndex = 0;

  // 1. Protect Display Math ($$...$$)
  let processed = markdownText.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
    const key = `@@KATEX_DISPLAY_${tokenIndex++}@@`;
    mathTokens.push({
      key,
      formula: formula.trim(),
      displayMode: true
    });
    return key;
  });

  // 2. Protect Inline Math ($...$) - skip escaped \$
  processed = processed.replace(/(^|[^\\])\$([^\$\n]+?)\$/g, (match, prefix, formula) => {
    // Basic heuristic to avoid dollar amounts like $10 or $100
    if (/^\d/.test(formula) && /\s/.test(formula) === false) {
      return match;
    }
    const key = `@@KATEX_INLINE_${tokenIndex++}@@`;
    mathTokens.push({
      key,
      formula: formula.trim(),
      displayMode: false
    });
    return `${prefix}${key}`;
  });

  // 3. Render Markdown
  let html = markedInstance.parse(processed);

  // 4. Substitute rendered KaTeX formulas
  for (const token of mathTokens) {
    let renderedMath = '';
    try {
      renderedMath = katex.renderToString(token.formula, {
        displayMode: token.displayMode,
        throwOnError: false
      });
      if (token.displayMode) {
        renderedMath = `<div class="katex-display-wrapper">${renderedMath}</div>`;
      }
    } catch {
      renderedMath = `<span class="katex-error" title="Math rendering error">${escapeHtml(token.formula)}</span>`;
    }
    html = html.replace(token.key, renderedMath);
  }

  // 5. Sanitize with DOMPurify while keeping SVG and math
  const cleanHtml = DOMPurify.sanitize(html, {
    ADD_TAGS: ['use', 'svg', 'path', 'rect', 'circle', 'line', 'polygon', 'foreignObject', 'math', 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'mroot', 'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd', 'mtext'],
    ADD_ATTR: ['aria-hidden', 'viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'rx', 'ry', 'data-code', 'data-mermaid-code', 'checked', 'target', 'rel']
  });

  // 6. Wrap tables in responsive container
  const finalHtml = cleanHtml
    .replace(/<table>/g, '<div class="table-responsive-wrapper"><table class="markdown-table">')
    .replace(/<\/table>/g, '</table></div>');

  return finalHtml;
}

/**
 * Render any mermaid diagrams inside the container
 */
export async function renderMermaidDiagrams(containerElement) {
  if (!containerElement) return;

  const diagramNodes = containerElement.querySelectorAll('.mermaid');
  if (diagramNodes.length === 0) return;

  try {
    await mermaid.run({
      nodes: Array.from(diagramNodes)
    });
  } catch (err) {
    console.warn('Mermaid rendering issue:', err);
  }
}

/**
 * Extract document outline (Table of Contents) from Markdown
 */
export function extractOutline(markdownText) {
  if (!markdownText) return [];

  const lines = markdownText.split('\n');
  const outline = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) continue;

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      // Strip markdown formatting from title
      const rawTitle = headingMatch[2]
        .replace(/[*_`~[\]]/g, '')
        .replace(/\(#[^)]+\)/g, '')
        .trim();
      const id = slugify(rawTitle);

      outline.push({
        level,
        title: rawTitle,
        id,
        lineNumber: i + 1
      });
    }
  }

  return outline;
}

/**
 * Calculate document reading statistics
 */
export function calculateDocStats(markdownText) {
  if (!markdownText) {
    return { words: 0, characters: 0, lines: 0, readingTimeMin: 1 };
  }

  const cleanText = markdownText.replace(/```[\s\S]*?```/g, '').replace(/[#*_~`]/g, '');
  const words = (cleanText.match(/\b\w+\b/g) || []).length;
  const characters = markdownText.length;
  const lines = markdownText.split('\n').length;
  const readingTimeMin = Math.max(1, Math.ceil(words / 200));

  return {
    words,
    characters,
    lines,
    readingTimeMin
  };
}
