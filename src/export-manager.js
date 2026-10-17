/**
 * Export manager for MD File View
 * Handles PDF printing, standalone HTML generation,
 * Markdown downloading, and clipboard exports.
 */

export class ExportManager {
  /**
   * Triggers browser native Print to PDF
   */
  static exportToPdf() {
    window.print();
  }

  /**
   * Generates a fully standalone, self-contained HTML file with dark/light styling
   */
  static exportToHtml(fileName, renderedHtml) {
    const title = fileName.replace(/\.[^/.]+$/, '');
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <style>
    :root {
      --bg: #0d1117;
      --text: #e6edf3;
      --accent: #58a6ff;
      --border: #30363d;
      --card-bg: #161b22;
      --code-bg: #161b22;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #ffffff;
        --text: #1f2328;
        --accent: #0969da;
        --border: #d0d7de;
        --card-bg: #f6f8fa;
        --code-bg: #f6f8fa;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 24px;
      background: var(--bg);
      color: var(--text);
    }
    h1, h2, h3, h4 { color: var(--text); border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    code { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; background: var(--code-bg); padding: 0.2em 0.4em; border-radius: 6px; font-size: 85%; }
    pre { background: var(--code-bg); padding: 16px; border-radius: 8px; overflow-x: auto; border: 1px solid var(--border); }
    pre code { background: transparent; padding: 0; }
    blockquote { border-left: 4px solid var(--border); padding: 0 16px; color: #8b949e; margin: 16px 0; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid var(--border); padding: 8px 14px; text-align: left; }
    th { background: var(--card-bg); }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    .markdown-alert { border-left: 4px solid var(--accent); background: var(--card-bg); padding: 12px 16px; border-radius: 6px; margin: 16px 0; }
    .task-list-item { list-style: none; margin-left: -20px; }
    @media print {
      body { background: #fff !important; color: #000 !important; max-width: 100% !important; padding: 0 !important; }
      pre, blockquote, table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${renderedHtml}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export raw markdown file
   */
  static exportMarkdown(fileName, content) {
    const cleanName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = cleanName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Copy text to clipboard
   */
  static async copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}
