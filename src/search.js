/**
 * In-document text search and highlight module
 */

export class DocumentSearch {
  constructor(viewerContainer, options = {}) {
    this.viewer = viewerContainer;
    this.currentMatchIndex = -1;
    this.matches = [];
    this.onMatchesChanged = options.onMatchesChanged || (() => {});
  }

  search(query) {
    this.clearHighlights();
    this.currentMatchIndex = -1;
    this.matches = [];

    if (!query || !query.trim() || !this.viewer) {
      this.onMatchesChanged(0, 0);
      return;
    }

    const cleanQuery = query.trim().toLowerCase();
    this.highlightTextNodes(this.viewer, cleanQuery);

    this.matches = Array.from(this.viewer.querySelectorAll('.search-highlight'));
    if (this.matches.length > 0) {
      this.currentMatchIndex = 0;
      this.focusMatch(0);
    }

    this.onMatchesChanged(this.matches.length > 0 ? 1 : 0, this.matches.length);
  }

  highlightTextNodes(element, query) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script, style, and mermaid containers
          if (node.parentElement && ['SCRIPT', 'STYLE', 'BUTTON'].includes(node.parentElement.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.parentElement && node.parentElement.closest('.mermaid-container')) {
            return NodeFilter.FILTER_REJECT;
          }
          return node.textContent.toLowerCase().includes(query)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        }
      }
    );

    const nodesToReplace = [];
    while (walker.nextNode()) {
      nodesToReplace.push(walker.currentNode);
    }

    nodesToReplace.forEach(node => {
      const parent = node.parentNode;
      if (!parent) return;

      const text = node.textContent;
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const fragment = document.createDocumentFragment();

      let lastIdx = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIdx) {
          fragment.appendChild(document.createTextNode(text.substring(lastIdx, match.index)));
        }

        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = match[0];
        fragment.appendChild(mark);

        lastIdx = regex.lastIndex;
      }

      if (lastIdx < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIdx)));
      }

      parent.replaceChild(fragment, node);
    });
  }

  focusMatch(index) {
    if (this.matches.length === 0 || index < 0 || index >= this.matches.length) return;

    this.matches.forEach((m, idx) => {
      if (idx === index) {
        m.classList.add('is-current-match');
        m.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        m.classList.remove('is-current-match');
      }
    });

    this.currentMatchIndex = index;
    this.onMatchesChanged(this.currentMatchIndex + 1, this.matches.length);
  }

  next() {
    if (this.matches.length === 0) return;
    const nextIdx = (this.currentMatchIndex + 1) % this.matches.length;
    this.focusMatch(nextIdx);
  }

  prev() {
    if (this.matches.length === 0) return;
    const prevIdx = (this.currentMatchIndex - 1 + this.matches.length) % this.matches.length;
    this.focusMatch(prevIdx);
  }

  clearHighlights() {
    if (!this.viewer) return;
    const marks = this.viewer.querySelectorAll('.search-highlight');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      }
    });
    this.matches = [];
    this.currentMatchIndex = -1;
  }
}
