/**
 * Redesigned Homepage View for Marko
 * Features dedicated sections for:
 * - Favorite Files (Starred)
 * - Recently Opened Files (Chronological)
 * - Most Opened Files (Ranked by open frequency)
 * - Quick Actions & Starter Templates
 */

export class HomepageView {
  constructor(app, container) {
    this.app = app;
    this.container = container;
    this.searchQuery = '';
  }

  formatTimeAgo(timestamp) {
    if (!timestamp) return 'Recently';
    const now = Date.now();
    const diffSec = Math.floor((now - timestamp) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  render() {
    if (!this.container) return;

    const fileManager = this.app.fileManager;
    let favorites = fileManager.getFavoriteFiles();
    let recents = fileManager.getRecentFiles(12);
    let mostOpened = fileManager.getMostOpenedFiles(8);

    // Apply live search filter if present
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      const match = (item) =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.preview && item.preview.toLowerCase().includes(q)) ||
        (item.path && item.path.toLowerCase().includes(q));

      favorites = favorites.filter(match);
      recents = recents.filter(match);
      mostOpened = mostOpened.filter(match);
    }

    this.container.innerHTML = `
      <div class="homepage-wrapper">
        <!-- Hero Header -->
        <header class="homepage-hero">
          <div class="hero-brand-row">
            <img src="/icon-192.png" width="56" height="56" alt="Marko Logo" class="homepage-brand-logo" />
            <div>
              <div class="hero-title-wrap">
                <h1 class="homepage-title">Marko</h1>
                <span class="homepage-version-pill">v1.3.0</span>
              </div>
              <p class="homepage-subtitle">Universal Markdown (.md) Viewer & Editor</p>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div class="homepage-action-bar">
            <button class="home-btn home-btn-primary" id="hpBtnNewDoc">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>New Document</span>
            </button>

            <button class="home-btn" id="hpBtnOpenFile">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              <span>Open Local File</span>
            </button>

            <button class="home-btn home-btn-accent" id="hpBtnUserManual" title="Open the Marko User Manual">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              <span>User Manual</span>
            </button>
          </div>

          <!-- Document Filter Search -->
          <div class="homepage-search-wrap">
            <svg class="homepage-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              type="text"
              id="hpSearchInput"
              class="homepage-search-input"
              placeholder="Search in recent, favorite, and opened files..."
              value="${this.searchQuery}"
            />
            ${this.searchQuery ? `
              <button id="hpSearchClear" class="hp-search-clear-btn" title="Clear search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            ` : ''}
          </div>
        </header>

        <!-- Main Sections Grid -->
        <div class="homepage-content-grid">

          <!-- SECTION 1: ⭐ Favorite Files -->
          <section class="hp-section hp-section-favorites">
            <div class="hp-section-header">
              <div class="hp-section-title-wrap">
                <span class="hp-section-icon star-icon">⭐</span>
                <h2 class="hp-section-title">Favorite Files</h2>
                <span class="hp-count-badge">${favorites.length}</span>
              </div>
            </div>

            ${favorites.length === 0 ? `
              <div class="hp-empty-card">
                <div class="hp-empty-icon">⭐</div>
                <div class="hp-empty-title">No Favorite Files Yet</div>
                <p class="hp-empty-text">Click the star button on any document card or in the top navigation bar to pin your important files here.</p>
              </div>
            ` : `
              <div class="hp-cards-grid">
                ${favorites.map(item => this.renderFileCard(item, 'favorite')).join('')}
              </div>
            `}
          </section>

          <!-- SECTION 2: 🕒 Recently Opened Files -->
          <section class="hp-section hp-section-recents">
            <div class="hp-section-header">
              <div class="hp-section-title-wrap">
                <span class="hp-section-icon">🕒</span>
                <h2 class="hp-section-title">Recently Opened Files</h2>
                <span class="hp-count-badge">${recents.length}</span>
              </div>
              ${recents.length > 0 ? `
                <button id="hpBtnClearRecents" class="hp-section-action-btn" title="Clear all recent history">
                  Clear All
                </button>
              ` : ''}
            </div>

            ${recents.length === 0 ? `
              <div class="hp-empty-card">
                <div class="hp-empty-icon">📂</div>
                <div class="hp-empty-title">No Recent Documents</div>
                <p class="hp-empty-text">Files you open on this device will automatically appear here for rapid one-click access.</p>
              </div>
            ` : `
              <div class="hp-cards-grid">
                ${recents.map(item => this.renderFileCard(item, 'recent')).join('')}
              </div>
            `}
          </section>

          <!-- SECTION 3: 🔥 Most Opened Files -->
          <section class="hp-section hp-section-most-opened">
            <div class="hp-section-header">
              <div class="hp-section-title-wrap">
                <span class="hp-section-icon">🔥</span>
                <h2 class="hp-section-title">Most Opened Files</h2>
                <span class="hp-count-badge">${mostOpened.length}</span>
              </div>
            </div>

            ${mostOpened.length === 0 ? `
              <div class="hp-empty-card">
                <div class="hp-empty-icon">📊</div>
                <div class="hp-empty-title">No Frequency Data Yet</div>
                <p class="hp-empty-text">Marko tracks which files you reference most frequently and ranks them here automatically.</p>
              </div>
            ` : `
              <div class="hp-cards-grid">
                ${mostOpened.map((item, idx) => this.renderFileCard(item, 'most-opened', idx + 1)).join('')}
              </div>
            `}
          </section>

          <!-- SECTION 4: 📝 Quick Starter Templates -->
          <section class="hp-section hp-section-templates">
            <div class="hp-section-header">
              <div class="hp-section-title-wrap">
                <span class="hp-section-icon">📄</span>
                <h2 class="hp-section-title">Starter Document Templates</h2>
              </div>
            </div>

            <div class="hp-cards-grid hp-templates-grid">
              <div class="hp-template-card" data-template="blank">
                <div class="hp-template-icon">📄</div>
                <div class="hp-template-info">
                  <strong>Blank Document</strong>
                  <span>Start clean with an untitled markdown document</span>
                </div>
              </div>

              <div class="hp-template-card" data-template="techDoc">
                <div class="hp-template-icon">🏗️</div>
                <div class="hp-template-info">
                  <strong>Technical Spec</strong>
                  <span>Architecture blueprint with Mermaid diagrams</span>
                </div>
              </div>

              <div class="hp-template-card" data-template="meetingNotes">
                <div class="hp-template-icon">📋</div>
                <div class="hp-template-info">
                  <strong>Meeting Notes</strong>
                  <span>Action checklists, goals, and team agendas</span>
                </div>
              </div>

              <div class="hp-template-card" data-template="welcome">
                <div class="hp-template-icon">🚀</div>
                <div class="hp-template-info">
                  <strong>Feature Guide</strong>
                  <span>Full syntax reference with math & code blocks</span>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderFileCard(item, context = 'recent', rank = null) {
    const isFav = Boolean(item.isFavorite);
    const timeAgo = this.formatTimeAgo(item.timestamp);
    const sizeStr = this.formatFileSize(item.size);
    const openCount = item.openCount || 1;

    return `
      <div class="hp-doc-card" data-id="${item.id}" data-name="${item.name}">
        <div class="hp-card-top">
          <div class="hp-card-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            ${rank ? `<span class="hp-rank-badge">#${rank}</span>` : ''}
          </div>

          <div class="hp-card-actions" onclick="event.stopPropagation();">
            <button class="hp-star-btn ${isFav ? 'is-starred' : ''}" data-star-id="${item.id}" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            </button>
            <button class="hp-remove-btn" data-remove-id="${item.id}" title="Remove from history">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="hp-card-body">
          <div class="hp-card-filename" title="${item.name}">${item.name}</div>
          <div class="hp-card-preview">${item.preview || 'Markdown document'}</div>
        </div>

        <div class="hp-card-footer">
          <div class="hp-card-meta">
            <span>${timeAgo}</span>
            ${sizeStr ? `<span>•</span><span>${sizeStr}</span>` : ''}
          </div>
          <div class="hp-open-badge" title="Opened ${openCount} time${openCount === 1 ? '' : 's'}">
            ${openCount} open${openCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Quick Actions
    const btnNew = this.container.querySelector('#hpBtnNewDoc');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        if (this.app.dom.newFileModal) {
          this.app.dom.newFileModal.classList.add('is-active');
        }
      });
    }

    const btnOpen = this.container.querySelector('#hpBtnOpenFile');
    if (btnOpen) {
      btnOpen.addEventListener('click', async () => {
        await this.app.fileManager.openFile();
      });
    }

    const btnManual = this.container.querySelector('#hpBtnUserManual');
    if (btnManual) {
      btnManual.addEventListener('click', () => {
        this.app.openUserManual();
      });
    }

    // Search Input
    const searchInput = this.container.querySelector('#hpSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
        const reInput = this.container.querySelector('#hpSearchInput');
        if (reInput) {
          reInput.focus();
          reInput.setSelectionRange(reInput.value.length, reInput.value.length);
        }
      });
    }

    const btnClearSearch = this.container.querySelector('#hpSearchClear');
    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        this.searchQuery = '';
        this.render();
      });
    }

    const btnClearRecents = this.container.querySelector('#hpBtnClearRecents');
    if (btnClearRecents) {
      btnClearRecents.addEventListener('click', () => {
        if (confirm('Clear all recent files history? (Favorites will be kept)')) {
          const records = this.app.fileManager.getAllFileRecords().filter(r => r.isFavorite);
          this.app.fileManager.saveAllFileRecords(records);
          this.render();
          this.app.updateSidebarFileSections();
          this.app.showToast('Cleared recent files history', 'info');
        }
      });
    }

    // Template Cards
    this.container.querySelectorAll('.hp-template-card').forEach(card => {
      card.addEventListener('click', () => {
        const key = card.getAttribute('data-template');
        this.app.openTemplate(key);
      });
    });

    // File Cards Click -> Open File
    this.container.querySelectorAll('.hp-doc-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        if (e.target.closest('.hp-card-actions')) return;
        const id = card.getAttribute('data-id');
        const records = this.app.fileManager.getAllFileRecords();
        const target = records.find(r => r.id === id);
        if (target) {
          await this.app.fileManager.openRecord(target);
        }
      });
    });

    // Star Buttons -> Toggle Favorite
    this.container.querySelectorAll('.hp-star-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-star-id');
        const records = this.app.fileManager.getAllFileRecords();
        const target = records.find(r => r.id === id);
        if (target) {
          const isNowFav = this.app.fileManager.toggleFavorite(target.path || target.name, target.content);
          this.app.showToast(isNowFav ? `Starred "${target.name}"` : `Unstarred "${target.name}"`, 'success');
          this.render();
          this.app.updateSidebarFileSections();
          this.app.updateHeaderFavoritePill();
        }
      });
    });

    // Remove Buttons -> Remove from History
    this.container.querySelectorAll('.hp-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-remove-id');
        this.app.fileManager.removeFromHistory(id);
        this.render();
        this.app.updateSidebarFileSections();
      });
    });
  }
}

