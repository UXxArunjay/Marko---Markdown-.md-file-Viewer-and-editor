/**
 * Markdown Editor helper for MD File View
 * Handles syntax insertions, selection wrapping, indentation, and keyboard events.
 */

export class MarkdownEditor {
  constructor(textareaElement, options = {}) {
    this.textarea = textareaElement;
    this.onChange = options.onChange || (() => {});
    this.initEventListeners();
  }

  initEventListeners() {
    if (!this.textarea) return;

    this.textarea.addEventListener('input', () => {
      this.onChange(this.textarea.value);
    });

    // Handle Tab and Indentation
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.handleTab(e.shiftKey);
      }
    });
  }

  getContent() {
    return this.textarea ? this.textarea.value : '';
  }

  setContent(value) {
    if (this.textarea) {
      this.textarea.value = value;
      this.onChange(value);
    }
  }

  handleTab(isShift) {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const value = this.textarea.value;

    if (start === end) {
      if (!isShift) {
        // Insert 2 spaces
        this.textarea.value = value.substring(0, start) + '  ' + value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
        this.onChange(this.textarea.value);
      }
    } else {
      // Multiline indent / unindent
      const lines = value.split('\n');
      let currentPos = 0;
      let newStart = start;
      let newEnd = end;

      const modifiedLines = lines.map((line) => {
        const lineStart = currentPos;
        const lineEnd = currentPos + line.length;
        currentPos = lineEnd + 1;

        if (lineEnd >= start && lineStart <= end) {
          if (isShift) {
            if (line.startsWith('  ')) {
              newEnd -= 2;
              return line.substring(2);
            } else if (line.startsWith(' ')) {
              newEnd -= 1;
              return line.substring(1);
            }
          } else {
            newEnd += 2;
            return '  ' + line;
          }
        }
        return line;
      });

      this.textarea.value = modifiedLines.join('\n');
      this.textarea.selectionStart = newStart;
      this.textarea.selectionEnd = Math.max(newStart, newEnd);
      this.onChange(this.textarea.value);
    }
  }

  wrapSelection(prefix, suffix, defaultText = 'text') {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const value = this.textarea.value;
    const selectedText = value.substring(start, end) || defaultText;

    const replacement = prefix + selectedText + suffix;
    this.textarea.value = value.substring(0, start) + replacement + value.substring(end);

    const newCursorStart = start + prefix.length;
    const newCursorEnd = newCursorStart + selectedText.length;

    this.textarea.focus();
    this.textarea.setSelectionRange(newCursorStart, newCursorEnd);
    this.onChange(this.textarea.value);
  }

  insertAtLineStart(prefix) {
    const start = this.textarea.selectionStart;
    const value = this.textarea.value;
    const lineStartIndex = value.lastIndexOf('\n', start - 1) + 1;

    this.textarea.value = value.substring(0, lineStartIndex) + prefix + value.substring(lineStartIndex);
    const newPos = start + prefix.length;
    this.textarea.focus();
    this.textarea.setSelectionRange(newPos, newPos);
    this.onChange(this.textarea.value);
  }

  insertBlock(blockText) {
    const start = this.textarea.selectionStart;
    const value = this.textarea.value;
    const prefixNewline = (start > 0 && value[start - 1] !== '\n') ? '\n\n' : '\n';
    const insertion = prefixNewline + blockText + '\n';

    this.textarea.value = value.substring(0, start) + insertion + value.substring(start);
    const newPos = start + insertion.length;
    this.textarea.focus();
    this.textarea.setSelectionRange(newPos, newPos);
    this.onChange(this.textarea.value);
  }

  // Formatting actions
  bold() { this.wrapSelection('**', '**', 'bold text'); }
  italic() { this.wrapSelection('*', '*', 'italic text'); }
  strikethrough() { this.wrapSelection('~~', '~~', 'strikethrough text'); }
  codeInline() { this.wrapSelection('`', '`', 'code'); }

  heading(level = 2) {
    const hashes = '#'.repeat(level) + ' ';
    this.insertAtLineStart(hashes);
  }

  bulletList() { this.insertAtLineStart('- '); }
  orderedList() { this.insertAtLineStart('1. '); }
  taskList() { this.insertAtLineStart('- [ ] '); }
  quote() { this.insertAtLineStart('> '); }

  codeBlock(lang = 'javascript') {
    this.insertBlock(`\`\`\`${lang}\n// Your code here\nconsole.log("Hello, world!");\n\`\`\``);
  }

  link() {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const selected = this.textarea.value.substring(start, end) || 'Link Text';
    this.wrapSelection('[', '](https://example.com)', selected);
  }

  image() {
    this.insertBlock('![Image Alt Text](https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80)');
  }

  table() {
    this.insertBlock(`| Header 1 | Header 2 | Header 3 |
| :--- | :--- | :--- |
| Row 1 Item | Value A | 100 |
| Row 2 Item | Value B | 200 |`);
  }

  mathBlock() {
    this.insertBlock(`$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
$$`);
  }

  mermaidBlock() {
    this.insertBlock(`\`\`\`mermaid
flowchart TD
    A[Start] --> B{Process}
    B -->|Success| C[Completed]
    B -->|Retry| A
\`\`\``);
  }

  horizontalRule() {
    this.insertBlock('---');
  }
}
