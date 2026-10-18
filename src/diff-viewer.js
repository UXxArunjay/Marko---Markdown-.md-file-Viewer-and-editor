/**
 * Diff Viewer for Marko Markdown Editor
 * Generates visual line-by-line diffs between current document and Claude's proposed modifications.
 */

export class DiffViewer {
  constructor(options = {}) {
    this.onApply = options.onApply || (() => {});
    this.modal = null;
    this.initModal();
  }

  initModal() {
    let modal = document.getElementById('diffViewerModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'diffViewerModal';
      modal.className = 'modal-overlay diff-modal-overlay';
      modal.innerHTML = `
        <div class="modal-box diff-modal-box">
          <div class="modal-header diff-modal-header">
            <div class="diff-header-left">
              <span class="diff-brand-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
              </span>
              <div>
                <h3 class="modal-title" id="diffModalTitle">Review Proposed Changes</h3>
                <span class="diff-stats-badge" id="diffStatsBadge">0 additions, 0 deletions</span>
              </div>
            </div>
            <div class="diff-header-actions">
              <button id="btnDiffApply" class="btn-action btn-primary" title="Apply these changes to your document">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>Apply Changes</span>
              </button>
              <button id="btnDiffClose" class="btn-icon-only" title="Close without applying">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
          <div class="modal-body diff-modal-body">
            <div class="diff-table-container">
              <table class="diff-table" id="diffTable">
                <tbody id="diffTableBody">
                  <!-- Dynamically rendered diff lines -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btnDiffClose').addEventListener('click', () => this.hide());
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.hide();
      });
    }

    this.modal = modal;
  }

  /**
   * Simple and effective Longest Common Subsequence line diff
   */
  computeDiff(oldText, newText) {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const n = oldLines.length;
    const m = newLines.length;

    // DP table for LCS
    const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        if (oldLines[i] === newLines[j]) {
          dp[i + 1][j + 1] = dp[i][j] + 1;
        } else {
          dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
    }

    // Backtrack to construct diff
    let i = n;
    let j = m;
    const diff = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        diff.unshift({
          type: 'unchanged',
          oldLine: i,
          newLine: j,
          content: oldLines[i - 1]
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        diff.unshift({
          type: 'added',
          oldLine: null,
          newLine: j,
          content: newLines[j - 1]
        });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        diff.unshift({
          type: 'removed',
          oldLine: i,
          newLine: null,
          content: oldLines[i - 1]
        });
        i--;
      }
    }

    return diff;
  }

  escape(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  show({ oldContent, newContent, fileName, onConfirm }) {
    this.initModal();
    const diff = this.computeDiff(oldContent, newContent);

    let additions = 0;
    let deletions = 0;
    diff.forEach(item => {
      if (item.type === 'added') additions++;
      if (item.type === 'removed') deletions++;
    });

    const titleEl = this.modal.querySelector('#diffModalTitle');
    const badgeEl = this.modal.querySelector('#diffStatsBadge');
    const tbodyEl = this.modal.querySelector('#diffTableBody');
    const applyBtn = this.modal.querySelector('#btnDiffApply');

    titleEl.textContent = `Review Proposed Changes: ${fileName || 'Document'}`;
    badgeEl.innerHTML = `
      <span class="diff-stat-add">+${additions} lines</span>
      <span class="diff-stat-del">-${deletions} lines</span>
    `;

    // Render table rows
    let html = '';
    for (const line of diff) {
      const cls = line.type === 'added' ? 'diff-row-added' : line.type === 'removed' ? 'diff-row-removed' : 'diff-row-unchanged';
      const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
      const oldNum = line.oldLine !== null ? line.oldLine : '';
      const newNum = line.newLine !== null ? line.newLine : '';

      html += `
        <tr class="${cls}">
          <td class="diff-num diff-num-old">${oldNum}</td>
          <td class="diff-num diff-num-new">${newNum}</td>
          <td class="diff-marker">${prefix}</td>
          <td class="diff-code"><code>${this.escape(line.content)}</code></td>
        </tr>
      `;
    }

    tbodyEl.innerHTML = html;

    // Bind apply button
    applyBtn.onclick = () => {
      this.hide();
      if (onConfirm) onConfirm(newContent);
      this.onApply(newContent);
    };

    this.modal.classList.add('is-open');
  }

  hide() {
    if (this.modal) {
      this.modal.classList.remove('is-open');
    }
  }
}
