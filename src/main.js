import './style.css';
import { SAMPLE_DOCS } from './sample-docs.js';
import {
  renderMarkdownToHtml,
  renderMermaidDiagrams,
  extractOutline,
  calculateDocStats,
  updateMermaidTheme
} from './markdown-parser.js';
import { FileManager } from './file-manager.js';
import { MarkdownEditor } from './editor.js';
import { DocumentOutline } from './outline.js';
import { DocumentSearch } from './search.js';
import { ExportManager } from './export-manager.js';
import { ClaudeService } from './claude-service.js';
import { ClaudeAssistantUI } from './claude-assistant-ui.js';
import { APP_INFO, checkForAppUpdates } from './version-info.js';

// ==========================================================================
// Application State & Controller
// ==========================================================================

class AppController {
  constructor() {
    this.currentMode = 'view'; // DEFAULT IS 'view' as required
    this.currentFileName = 'README.md';
    this.currentContent = SAMPLE_DOCS.welcome.content;
    this.theme = localStorage.getItem('md_view_theme') || 'dark';

    // Zen Fullscreen & Reading Preferences State
    this.isFullscreen = false;
    this.singleTapFullscreenEnabled = localStorage.getItem('marko_single_tap_fullscreen') !== 'false';
    this.readingFont = localStorage.getItem('marko_font_family') || 'sans';
    this.readingFontSize = localStorage.getItem('marko_font_size') || '16';
    this.readingWidth = localStorage.getItem('marko_reading_width') || '860';

    // DOM Elements
    this.dom = {
      body: document.body,
      currentFileName: document.getElementById('currentFileName'),
      dirtyIndicator: document.getElementById('dirtyIndicator'),
      currentFilePill: document.getElementById('currentFilePill'),

      // Reading Progress Bar & Zen Mode HUD
      readingProgressBar: document.getElementById('readingProgressBar'),
      zenFloatingHud: document.getElementById('zenFloatingHud'),
      btnExitZen: document.getElementById('btnExitZen'),

      // Branding & Version
      brandBadge: document.getElementById('brandBadge'),
      headerVersionBadge: document.getElementById('headerVersionBadge'),

      // Mode buttons
      btnModeView: document.getElementById('btnModeView'),
      btnModeEdit: document.getElementById('btnModeEdit'),
      btnModeSplit: document.getElementById('btnModeSplit'),

      // Action buttons
      btnNewFile: document.getElementById('btnNewFile'),
      btnOpenFile: document.getElementById('btnOpenFile'),
      btnSaveFile: document.getElementById('btnSaveFile'),
      btnSidebarToggle: document.getElementById('btnSidebarToggle'),
      btnClaudeToggle: document.getElementById('btnClaudeToggle'),
      btnFullscreenToggle: document.getElementById('btnFullscreenToggle'),
      btnTypographyToggle: document.getElementById('btnTypographyToggle'),

      // Containers
      appSidebar: document.getElementById('appSidebar'),
      outlineContainer: document.getElementById('outlineContainer'),
      recentFilesContainer: document.getElementById('recentFilesContainer'),
      viewerContainer: document.getElementById('viewerContainer'),
      viewerProse: document.getElementById('viewerProse'),
      editorContainer: document.getElementById('editorContainer'),
      editorTextarea: document.getElementById('editorTextarea'),

      // Stats
      statWords: document.getElementById('statWords'),
      statReadingTime: document.getElementById('statReadingTime'),
      statCharacters: document.getElementById('statCharacters'),
      statLines: document.getElementById('statLines'),

      // Search
      searchBarContainer: document.getElementById('searchBarContainer'),
      searchInput: document.getElementById('searchInput'),
      searchMatchCount: document.getElementById('searchMatchCount'),
      btnSearchToggle: document.getElementById('btnSearchToggle'),
      btnSearchPrev: document.getElementById('btnSearchPrev'),
      btnSearchNext: document.getElementById('btnSearchNext'),
      btnSearchClose: document.getElementById('btnSearchClose'),

      // Dropdowns
      exportDropdownContainer: document.getElementById('exportDropdownContainer'),
      btnExportDropdown: document.getElementById('btnExportDropdown'),
      themeDropdownContainer: document.getElementById('themeDropdownContainer'),
      btnThemeDropdown: document.getElementById('btnThemeDropdown'),

      // Export Actions
      btnExportPdf: document.getElementById('btnExportPdf'),
      btnExportHtml: document.getElementById('btnExportHtml'),
      btnExportMarkdown: document.getElementById('btnExportMarkdown'),
      btnCopyHtml: document.getElementById('btnCopyHtml'),
      btnCopyMarkdown: document.getElementById('btnCopyMarkdown'),

      // Modals
      newFileModal: document.getElementById('newFileModal'),
      btnCloseNewModal: document.getElementById('btnCloseNewModal'),
      shortcutsModal: document.getElementById('shortcutsModal'),
      btnShortcutsToggle: document.getElementById('btnShortcutsToggle'),
      btnCloseShortcutsModal: document.getElementById('btnCloseShortcutsModal'),

      // Marko Hub Modal Elements
      modalVersionBadge: document.getElementById('modalVersionBadge'),
      btnCheckForUpdates: document.getElementById('btnCheckForUpdates'),
      updateCheckResult: document.getElementById('updateCheckResult'),
      updateStatusText: document.getElementById('updateStatusText'),
      changelogTimelineContainer: document.getElementById('changelogTimelineContainer'),
      techSpecsGrid: document.getElementById('techSpecsGrid'),
      chkSingleTapFullscreen: document.getElementById('chkSingleTapFullscreen'),
      fontFamilyChoices: document.getElementById('fontFamilyChoices'),
      fontSizeChoices: document.getElementById('fontSizeChoices'),
      readingWidthChoices: document.getElementById('readingWidthChoices'),

      // Overlay & Toasts
      dropzoneOverlay: document.getElementById('dropzoneOverlay'),
      toastContainer: document.getElementById('toastContainer'),
      btnPwaInstall: document.getElementById('btnPwaInstall'),

      // Default App Banner & Buttons
      defaultAppBanner: document.getElementById('defaultAppBanner'),
      btnSetAsDefault: document.getElementById('btnSetAsDefault'),
      btnDismissDefaultBanner: document.getElementById('btnDismissDefaultBanner'),
      btnNeverAskDefault: document.getElementById('btnNeverAskDefault'),
      btnModalSetDefault: document.getElementById('btnModalSetDefault'),

      // Mobile Drawer & Navigation Elements
      sidebarBackdrop: document.getElementById('sidebarBackdrop'),
      btnSidebarCloseMobile: document.getElementById('btnSidebarCloseMobile'),
      btnMobileMore: document.getElementById('btnMobileMore'),
      mobileBottomNav: document.getElementById('mobileBottomNav'),
      mNavView: document.getElementById('mNavView'),
      mNavEdit: document.getElementById('mNavEdit'),
      mNavSave: document.getElementById('mNavSave'),
      mDirtyDot: document.getElementById('mDirtyDot'),
      mNavClaude: document.getElementById('mNavClaude'),
      mNavMore: document.getElementById('mNavMore'),

      // Mobile Bottom Sheet Elements
      mobileActionsSheet: document.getElementById('mobileActionsSheet'),
      mobileSheetBackdrop: document.getElementById('mobileSheetBackdrop'),
      btnCloseMobileSheet: document.getElementById('btnCloseMobileSheet'),
      mSheetDocName: document.getElementById('mSheetDocName'),
      mSheetNew: document.getElementById('mSheetNew'),
      mSheetOpen: document.getElementById('mSheetOpen'),
      mSheetSearch: document.getElementById('mSheetSearch'),
      mSheetTOC: document.getElementById('mSheetTOC'),
      mSheetExportPdf: document.getElementById('mSheetExportPdf'),
      mSheetExportHtml: document.getElementById('mSheetExportHtml'),
      mSheetExportMd: document.getElementById('mSheetExportMd'),
      mSheetFullscreen: document.getElementById('mSheetFullscreen'),
      mSheetTypography: document.getElementById('mSheetTypography'),
      mSheetTheme: document.getElementById('mSheetTheme'),
      mSheetThemeLabel: document.getElementById('mSheetThemeLabel'),
      mSheetAbout: document.getElementById('mSheetAbout')
    };

    // Subsystems
    this.fileManager = new FileManager({
      onFileLoaded: (fileData) => this.handleFileLoaded(fileData),
      onDirtyStateChange: (isDirty) => this.updateDirtyIndicator(isDirty)
    });

    this.editor = new MarkdownEditor(this.dom.editorTextarea, {
      onChange: (newContent) => this.handleContentChange(newContent)
    });

    this.outline = new DocumentOutline(
      this.dom.outlineContainer,
      this.dom.viewerProse,
      (headingId) => {
        // If on mobile screen, auto-collapse sidebar after heading click
        if (window.innerWidth <= 768) {
          this.closeMobileSidebar();
        }
      }
    );

    this.search = new DocumentSearch(this.dom.viewerProse, {
      onMatchesChanged: (current, total) => {
        this.dom.searchMatchCount.textContent = `${current} of ${total}`;
      }
    });

    this.previousAiContent = null;
    this.claudeService = new ClaudeService();
    this.claudeUI = new ClaudeAssistantUI({
      claudeService: this.claudeService,
      getDocContext: () => ({
        fileName: this.currentFileName,
        content: this.currentContent,
        wordCount: this.dom.statWords ? parseInt(this.dom.statWords.textContent.replace(/,/g, ''), 10) || 0 : 0,
        selection: this.getSelectedText()
      }),
      onApplyContent: (newContent) => this.applyAiContent(newContent),
      onInsertAtCursor: (snippet) => this.insertSnippetAtCursor(snippet),
      showToast: (msg, type) => this.showToast(msg, type)
    });

    this.deferredPrompt = null;
    this.init();
  }

  init() {
    this.applyTheme(this.theme);
    this.applyTypographySettings();
    this.setMode('view'); // ALWAYS VIEW MODE BY DEFAULT
    if (window.innerWidth <= 768) {
      this.closeMobileSidebar();
    }
    this.loadDocument(this.currentFileName, this.currentContent);
    this.initEventListeners();
    this.initEditorToolbar();
    this.initDragAndDrop();
    this.initReadingProgress();
    this.initZenFullscreen();
    this.initMarkoHubModal();
    this.initTypographyControls();
    this.initAutoSave();
    this.initPwa();
    this.initElectronIntegration();
    this.updateRecentFilesList();
  }

  initElectronIntegration() {
    if (typeof window !== 'undefined' && window.electronAPI) {
      // 1. Check for initial file passed via Windows argument / double-click
      window.electronAPI.getInitialFile().then((fileData) => {
        if (fileData && fileData.content !== undefined) {
          this.loadDocument(fileData.fileName, fileData.content, null, fileData.filePath);
        }
      });

      // 2. Listen for files opened while app is already running
      window.electronAPI.onOpenFile((fileData) => {
        if (fileData && fileData.content !== undefined) {
          this.loadDocument(fileData.fileName, fileData.content, null, fileData.filePath);
          this.showToast(`Opened "${fileData.fileName}"`, 'success');
        }
      });

      // 3. Check if Marko is default Markdown viewer
      this.checkDefaultAppStatus();
    }
  }

  // ------------------------------------------------------------------------
  // Mode Management: View / Edit / Split
  // ------------------------------------------------------------------------
  setMode(mode) {
    this.currentMode = mode;
    this.dom.body.className = `mode-${mode}`;

    this.dom.btnModeView.classList.toggle('is-active', mode === 'view');
    this.dom.btnModeEdit.classList.toggle('is-active', mode === 'edit');
    this.dom.btnModeSplit.classList.toggle('is-active', mode === 'split');

    if (this.dom.mNavView) this.dom.mNavView.classList.toggle('is-active', mode === 'view');
    if (this.dom.mNavEdit) this.dom.mNavEdit.classList.toggle('is-active', mode === 'edit');

    if (mode === 'view' || mode === 'split') {
      this.renderMarkdown();
    }

    if (mode === 'edit') {
      this.dom.editorTextarea.focus();
    }
  }

  toggleViewEditMode() {
    if (this.currentMode === 'view') {
      this.setMode('edit');
    } else {
      this.setMode('view');
    }
  }

  // ------------------------------------------------------------------------
  // Document Loading & Rendering
  // ------------------------------------------------------------------------
  loadDocument(fileName, content, fileHandle = null, filePath = null) {
    this.currentFileName = fileName;
    this.currentContent = content;
    this.dom.currentFileName.textContent = fileName;
    if (this.dom.mSheetDocName) {
      this.dom.mSheetDocName.textContent = fileName;
    }
    this.editor.setContent(content);
    this.fileManager.setCurrentFile(fileName, content, fileHandle, filePath);

    // Default function is VIEW MODE on opening any file!
    this.setMode('view');
    this.renderMarkdown();
    this.updateStats();
    this.updateDirtyIndicator(false);
    this.updateRecentFilesList();
    if (this.claudeUI) {
      this.claudeUI.updateContextPill();
    }
  }

  handleFileLoaded({ name, content, handle }) {
    this.loadDocument(name, content, handle);
    this.showToast(`Opened "${name}"`, 'success');
  }

  handleContentChange(newContent) {
    this.currentContent = newContent;
    const isDirty = this.fileManager.isDirty(newContent);
    this.updateDirtyIndicator(isDirty);
    this.updateStats();

    // If split mode, re-render markdown live
    if (this.currentMode === 'split') {
      this.renderMarkdown(false); // Skip full scroll jump
    }
    if (this.claudeUI) {
      this.claudeUI.updateContextPill();
    }
  }

  async renderMarkdown() {
    const html = renderMarkdownToHtml(this.currentContent);
    this.dom.viewerProse.innerHTML = html;

    // Attach interactive behaviors inside the rendered markdown
    this.attachViewerInteractions();

    // Render Mermaid diagrams
    await renderMermaidDiagrams(this.dom.viewerProse);

    // Update table of contents
    const outlineItems = extractOutline(this.currentContent);
    this.outline.update(outlineItems);
  }

  attachViewerInteractions() {
    // 1. Copy code buttons
    const copyBtns = this.dom.viewerProse.querySelectorAll('.btn-copy-code, .btn-copy-mermaid');
    copyBtns.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const code = decodeURIComponent(btn.getAttribute('data-code') || '');
        const success = await ExportManager.copyToClipboard(code);
        if (success) {
          const originalText = btn.innerHTML;
          btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3fb950" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span style="color: #3fb950;">Copied!</span>
          `;
          setTimeout(() => {
            btn.innerHTML = originalText;
          }, 1800);
        }
      });
    });

    // 2. Interactive GFM Task List Checkboxes
    const checkboxes = this.dom.viewerProse.querySelectorAll('.task-list-item-checkbox');
    checkboxes.forEach((cb) => {
      cb.addEventListener('change', () => {
        const item = cb.closest('.task-list-item');
        if (item) {
          item.classList.toggle('is-completed', cb.checked);
        }
        this.syncCheckboxesToSource();
      });
    });
  }

  syncCheckboxesToSource() {
    const checkboxes = Array.from(this.dom.viewerProse.querySelectorAll('.task-list-item-checkbox'));
    let cbIndex = 0;

    // Replace task checkbox patterns in the source markdown in order
    const updated = this.currentContent.replace(/^(\s*[-*+]\s+\[)([\sxX])(\])/gm, (match, prefix, state, suffix) => {
      if (cbIndex < checkboxes.length) {
        const isChecked = checkboxes[cbIndex++].checked;
        return `${prefix}${isChecked ? 'x' : ' '}${suffix}`;
      }
      return match;
    });

    if (updated !== this.currentContent) {
      this.currentContent = updated;
      this.editor.setContent(updated);
      this.updateDirtyIndicator(this.fileManager.isDirty(updated));
    }
  }

  updateDirtyIndicator(isDirty) {
    this.dom.dirtyIndicator.style.display = isDirty ? 'inline-block' : 'none';
    if (this.dom.mDirtyDot) {
      this.dom.mDirtyDot.style.display = isDirty ? 'block' : 'none';
    }
  }

  updateStats() {
    const stats = calculateDocStats(this.currentContent);
    this.dom.statWords.textContent = stats.words.toLocaleString();
    this.dom.statCharacters.textContent = stats.characters.toLocaleString();
    this.dom.statLines.textContent = stats.lines.toLocaleString();
    this.dom.statReadingTime.textContent = `${stats.readingTimeMin}m`;
  }

  updateRecentFilesList() {
    const recents = this.fileManager.getRecentFiles();
    if (!this.dom.recentFilesContainer) return;

    if (recents.length === 0) {
      this.dom.recentFilesContainer.innerHTML = `
        <div style="font-size:12px; color:var(--text-muted); padding:8px;">No recent files</div>
      `;
      return;
    }

    this.dom.recentFilesContainer.innerHTML = `
      <div class="recent-files-list">
        ${recents.map(r => `
          <div class="recent-file-item" data-name="${r.name}" title="${r.preview || r.name}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.name}</span>
          </div>
        `).join('')}
      </div>
    `;

    this.dom.recentFilesContainer.querySelectorAll('.recent-file-item').forEach(el => {
      el.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          this.closeMobileSidebar();
        }
        const name = el.getAttribute('data-name');
        if (name === this.currentFileName) return;
        this.fileManager.openFile();
      });
    });
  }

  // ------------------------------------------------------------------------
  // Theme Management
  // ------------------------------------------------------------------------
  applyTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('md_view_theme', theme);
    updateMermaidTheme(theme === 'dark');

    if (this.dom.mSheetThemeLabel) {
      const names = { dark: 'Theme: Dark 🌙', light: 'Theme: Light ☀️', sepia: 'Theme: Sepia 📜' };
      this.dom.mSheetThemeLabel.textContent = names[theme] || 'Theme';
    }

    // Re-render Mermaid diagrams with appropriate theme if in viewer
    if (this.currentMode === 'view' || this.currentMode === 'split') {
      this.renderMarkdown();
    }
  }

  cycleTheme() {
    const cycle = { dark: 'light', light: 'sepia', sepia: 'dark' };
    const nextTheme = cycle[this.theme] || 'dark';
    this.applyTheme(nextTheme);
    this.showToast(`Switched to ${nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1)} Mode`, 'info');
  }

  // ------------------------------------------------------------------------
  // Mobile Navigation & Drawer Handlers
  // ------------------------------------------------------------------------
  toggleSidebar() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      if (this.dom.appSidebar.classList.contains('mobile-open')) {
        this.closeMobileSidebar();
      } else {
        this.openMobileSidebar();
      }
    } else {
      this.dom.appSidebar.classList.toggle('is-collapsed');
    }
  }

  openMobileSidebar() {
    this.dom.appSidebar.classList.remove('is-collapsed');
    this.dom.appSidebar.classList.add('mobile-open');
    if (this.dom.sidebarBackdrop) {
      this.dom.sidebarBackdrop.classList.add('is-active');
    }
  }

  closeMobileSidebar() {
    this.dom.appSidebar.classList.remove('mobile-open');
    this.dom.appSidebar.classList.add('is-collapsed');
    if (this.dom.sidebarBackdrop) {
      this.dom.sidebarBackdrop.classList.remove('is-active');
    }
  }

  openMobileActionsSheet() {
    if (!this.dom.mobileActionsSheet) return;
    if (this.dom.mSheetDocName) {
      this.dom.mSheetDocName.textContent = this.currentFileName;
    }
    if (this.dom.mSheetThemeLabel) {
      const names = { dark: 'Theme: Dark 🌙', light: 'Theme: Light ☀️', sepia: 'Theme: Sepia 📜' };
      this.dom.mSheetThemeLabel.textContent = names[this.theme] || 'Theme';
    }
    this.dom.mobileActionsSheet.style.display = 'flex';
    requestAnimationFrame(() => {
      this.dom.mobileActionsSheet.classList.add('is-active');
    });
  }

  closeMobileActionsSheet() {
    if (!this.dom.mobileActionsSheet) return;
    this.dom.mobileActionsSheet.classList.remove('is-active');
    setTimeout(() => {
      if (!this.dom.mobileActionsSheet.classList.contains('is-active')) {
        this.dom.mobileActionsSheet.style.display = 'none';
      }
    }, 280);
  }

  // ------------------------------------------------------------------------
  // Event Listeners & Shortcuts
  // ------------------------------------------------------------------------
  initEventListeners() {
    // Mode switcher buttons
    this.dom.btnModeView.addEventListener('click', () => this.setMode('view'));
    this.dom.btnModeEdit.addEventListener('click', () => this.setMode('edit'));
    this.dom.btnModeSplit.addEventListener('click', () => this.setMode('split'));

    // Sidebar Toggle
    this.dom.btnSidebarToggle.addEventListener('click', () => {
      this.toggleSidebar();
    });

    // Claude AI Toggle Button
    if (this.dom.btnClaudeToggle) {
      this.dom.btnClaudeToggle.addEventListener('click', () => {
        this.claudeUI.toggle();
      });
    }

    // Selection changes update Claude context pill
    document.addEventListener('selectionchange', () => {
      if (this.claudeUI && this.claudeUI.isOpen) {
        this.claudeUI.updateContextPill();
      }
    });

    // File Action Buttons
    this.dom.btnNewFile.addEventListener('click', () => {
      this.dom.newFileModal.classList.add('is-active');
    });

    this.dom.btnOpenFile.addEventListener('click', async () => {
      await this.fileManager.openFile();
    });

    this.dom.btnSaveFile.addEventListener('click', async () => {
      const res = await this.fileManager.saveFile(this.currentContent);
      if (res && res.success) {
        this.showToast(`Saved "${res.name}" successfully!`, 'success');
      }
    });

    // Rename file on pill click
    this.dom.currentFilePill.addEventListener('click', () => {
      const newName = prompt('Rename document:', this.currentFileName);
      if (newName && newName.trim()) {
        const cleanName = newName.trim().endsWith('.md') ? newName.trim() : `${newName.trim()}.md`;
        this.currentFileName = cleanName;
        this.dom.currentFileName.textContent = cleanName;
        this.updateDirtyIndicator(true);
      }
    });

    // Export Dropdown
    this.dom.btnExportDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dom.exportDropdownContainer.classList.toggle('is-open');
    });

    document.addEventListener('click', () => {
      this.dom.exportDropdownContainer.classList.remove('is-open');
      this.dom.themeDropdownContainer.classList.remove('is-open');
    });

    this.dom.btnExportPdf.addEventListener('click', () => {
      ExportManager.exportToPdf();
    });

    this.dom.btnExportHtml.addEventListener('click', () => {
      ExportManager.exportToHtml(this.currentFileName, this.dom.viewerProse.innerHTML);
      this.showToast('Exported standalone HTML!', 'success');
    });

    this.dom.btnExportMarkdown.addEventListener('click', () => {
      ExportManager.exportMarkdown(this.currentFileName, this.currentContent);
      this.showToast('Downloaded Markdown file!', 'success');
    });

    this.dom.btnCopyHtml.addEventListener('click', async () => {
      await ExportManager.copyToClipboard(this.dom.viewerProse.innerHTML);
      this.showToast('Copied HTML to clipboard!', 'success');
    });

    this.dom.btnCopyMarkdown.addEventListener('click', async () => {
      await ExportManager.copyToClipboard(this.currentContent);
      this.showToast('Copied raw Markdown to clipboard!', 'success');
    });

    // Theme Dropdown
    this.dom.btnThemeDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dom.themeDropdownContainer.classList.toggle('is-open');
    });

    document.querySelectorAll('[data-set-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTheme = btn.getAttribute('data-set-theme');
        this.applyTheme(targetTheme);
      });
    });

    // Search Toggle
    this.dom.btnSearchToggle.addEventListener('click', () => {
      this.toggleSearchBar();
    });

    this.dom.searchInput.addEventListener('input', (e) => {
      this.search.search(e.target.value);
    });

    this.dom.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          this.search.prev();
        } else {
          this.search.next();
        }
      } else if (e.key === 'Escape') {
        this.closeSearchBar();
      }
    });

    this.dom.btnSearchNext.addEventListener('click', () => this.search.next());
    this.dom.btnSearchPrev.addEventListener('click', () => this.search.prev());
    this.dom.btnSearchClose.addEventListener('click', () => this.closeSearchBar());

    // Modals
    this.dom.btnCloseNewModal.addEventListener('click', () => {
      this.dom.newFileModal.classList.remove('is-active');
    });

    this.dom.btnShortcutsToggle.addEventListener('click', () => {
      this.openHubModal('updates');
    });

    this.dom.btnCloseShortcutsModal.addEventListener('click', () => {
      this.dom.shortcutsModal.classList.remove('is-active');
    });

    // Default App Banner & Setting Buttons
    if (this.dom.btnSetAsDefault) {
      this.dom.btnSetAsDefault.addEventListener('click', () => this.triggerSetDefaultApp());
    }
    if (this.dom.btnModalSetDefault) {
      this.dom.btnModalSetDefault.addEventListener('click', () => this.triggerSetDefaultApp());
    }
    if (this.dom.btnDismissDefaultBanner) {
      this.dom.btnDismissDefaultBanner.addEventListener('click', () => {
        if (this.dom.defaultAppBanner) this.dom.defaultAppBanner.style.display = 'none';
      });
    }
    if (this.dom.btnNeverAskDefault) {
      this.dom.btnNeverAskDefault.addEventListener('click', () => {
        localStorage.setItem('marko_never_ask_default', 'true');
        if (this.dom.defaultAppBanner) this.dom.defaultAppBanner.style.display = 'none';
        this.showToast('Default app prompt silenced. Re-enable anytime in Shortcuts & Help.', 'info');
      });
    }

    // Template Cards Selection
    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        const key = card.getAttribute('data-template');
        const doc = SAMPLE_DOCS[key] || SAMPLE_DOCS.blank;
        this.loadDocument(doc.name, doc.content);
        this.dom.newFileModal.classList.remove('is-active');
        this.showToast(`Created new document: ${doc.name}`, 'success');
      });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (e.key === 'F11' || (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        this.toggleFullscreen();
      } else if (e.key === 'F1') {
        e.preventDefault();
        this.openHubModal('updates');
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.dom.btnSaveFile.click();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        this.dom.btnOpenFile.click();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        this.dom.btnNewFile.click();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        this.toggleViewEditMode();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        this.toggleSearchBar();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        this.dom.appSidebar.classList.toggle('is-collapsed');
      } else if ((isCmdOrCtrl && e.key.toLowerCase() === 'j') || (e.altKey && e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        this.claudeUI.toggle();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        ExportManager.exportToPdf();
      } else if (e.key === 'Escape') {
        if (this.isFullscreen) {
          this.toggleFullscreen(false);
          return;
        }
        this.dom.newFileModal.classList.remove('is-active');
        this.dom.shortcutsModal.classList.remove('is-active');
        this.closeMobileActionsSheet();
        this.closeMobileSidebar();
        this.closeSearchBar();
        if (this.claudeUI && this.claudeUI.isOpen) {
          this.claudeUI.toggle(false);
        }
      }
    });

    // Mobile Drawer Close & Backdrop
    if (this.dom.btnSidebarCloseMobile) {
      this.dom.btnSidebarCloseMobile.addEventListener('click', () => {
        this.closeMobileSidebar();
      });
    }
    if (this.dom.sidebarBackdrop) {
      this.dom.sidebarBackdrop.addEventListener('click', () => {
        this.closeMobileSidebar();
      });
    }

    // Mobile Header More Button
    if (this.dom.btnMobileMore) {
      this.dom.btnMobileMore.addEventListener('click', () => {
        this.openMobileActionsSheet();
      });
    }

    // Mobile Bottom Navigation Bar Tabs
    if (this.dom.mNavView) {
      this.dom.mNavView.addEventListener('click', () => {
        this.setMode('view');
      });
    }
    if (this.dom.mNavEdit) {
      this.dom.mNavEdit.addEventListener('click', () => {
        this.setMode('edit');
      });
    }
    if (this.dom.mNavSave) {
      this.dom.mNavSave.addEventListener('click', async () => {
        const res = await this.fileManager.saveFile(this.currentContent);
        if (res && res.success) {
          this.showToast(`Saved "${res.name}" successfully!`, 'success');
        }
      });
    }
    if (this.dom.mNavClaude) {
      this.dom.mNavClaude.addEventListener('click', () => {
        this.claudeUI.toggle();
      });
    }
    if (this.dom.mNavMore) {
      this.dom.mNavMore.addEventListener('click', () => {
        this.openMobileActionsSheet();
      });
    }

    // Mobile Bottom Actions Sheet
    if (this.dom.mobileSheetBackdrop) {
      this.dom.mobileSheetBackdrop.addEventListener('click', () => {
        this.closeMobileActionsSheet();
      });
    }
    if (this.dom.btnCloseMobileSheet) {
      this.dom.btnCloseMobileSheet.addEventListener('click', () => {
        this.closeMobileActionsSheet();
      });
    }
    if (this.dom.mSheetNew) {
      this.dom.mSheetNew.addEventListener('click', () => {
        this.closeMobileActionsSheet();
        this.dom.newFileModal.classList.add('is-active');
      });
    }
    if (this.dom.mSheetOpen) {
      this.dom.mSheetOpen.addEventListener('click', async () => {
        this.closeMobileActionsSheet();
        await this.fileManager.openFile();
      });
    }
    if (this.dom.mSheetSearch) {
      this.dom.mSheetSearch.addEventListener('click', () => {
        this.closeMobileActionsSheet();
        this.toggleSearchBar();
      });
    }
    if (this.dom.mSheetTOC) {
      this.dom.mSheetTOC.addEventListener('click', () => {
        this.closeMobileActionsSheet();
        this.openMobileSidebar();
      });
    }
    if (this.dom.mSheetExportPdf) {
      this.dom.mSheetExportPdf.addEventListener('click', () => {
        this.closeMobileActionsSheet();
        ExportManager.exportToPdf();
      });
    }
    if (this.dom.mSheetExportHtml) {
      this.dom.mSheetExportHtml.addEventListener('click', () => {
        this.closeMobileActionsSheet();
        ExportManager.exportToHtml(this.currentFileName, this.dom.viewerProse.innerHTML);
        this.showToast('Exported standalone HTML!', 'success');
      });
    }
    if (this.dom.mSheetExportMd) {
      this.dom.mSheetExportMd.addEventListener('click', () => {
        this.closeMobileActionsSheet();
        ExportManager.exportMarkdown(this.currentFileName, this.currentContent);
        this.showToast('Downloaded Markdown file!', 'success');
      });
    }
    if (this.dom.mSheetFullscreen) {
      this.dom.mSheetFullscreen.addEventListener('click', () => {
        this.closeMobileActionsSheet();
        this.toggleFullscreen(true);
      });
    }
    if (this.dom.mSheetTypography) {
      this.dom.mSheetTypography.addEventListener('click', () => {
        this.closeMobileActionsSheet();
        this.openHubModal('typography');
      });
    }
    if (this.dom.mSheetTheme) {
      this.dom.mSheetTheme.addEventListener('click', () => {
        this.cycleTheme();
      });
    }
    if (this.dom.mSheetAbout) {
      this.dom.mSheetAbout.addEventListener('click', () => {
        this.closeMobileActionsSheet();
        this.openHubModal('about');
      });
    }

    // Responsive screen resize handler
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 768) {
        if (!this.dom.appSidebar.classList.contains('mobile-open')) {
          this.dom.appSidebar.classList.add('is-collapsed');
        }
      } else {
        this.closeMobileSidebar();
        this.closeMobileActionsSheet();
      }
    });
  }

  // ------------------------------------------------------------------------
  // Reading Progress Indicator
  // ------------------------------------------------------------------------
  initReadingProgress() {
    const updateProgress = () => {
      const container = this.dom.viewerContainer;
      if (!container || !this.dom.readingProgressBar) return;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const progress = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) : 0;
      this.dom.readingProgressBar.style.width = `${progress}%`;
    };

    if (this.dom.viewerContainer) {
      this.dom.viewerContainer.addEventListener('scroll', updateProgress, { passive: true });
    }
  }

  // ------------------------------------------------------------------------
  // Zen Fullscreen Mode (Single Tap & HUD)
  // ------------------------------------------------------------------------
  initZenFullscreen() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    // Track touch interactions to distinguish tap from scroll
    this.dom.viewerContainer.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: true });

    // Single Tap / Click detection on Reading View
    this.dom.viewerContainer.addEventListener('click', (e) => {
      // Only trigger in view mode (or when already in fullscreen mode)
      if (this.currentMode !== 'view' && !this.isFullscreen) return;

      // Check if user disabled single-tap fullscreen
      if (!this.singleTapFullscreenEnabled) return;

      // If user clicked inside an interactive element, ignore
      const interactiveTarget = e.target.closest(
        'a, button, input, select, textarea, .mermaid-actions, .btn-copy-code, .task-list-item-checkbox, .zen-floating-hud, pre, code'
      );
      if (interactiveTarget) return;

      // Check if user selected text
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) return;

      // If mobile touch, verify it wasn't a swipe or long-press
      if (touchStartTime > 0) {
        const elapsed = Date.now() - touchStartTime;
        if (elapsed > 450) return; // likely a long press
      }

      this.toggleFullscreen();
    });

    // Exit Zen HUD button
    if (this.dom.btnExitZen) {
      this.dom.btnExitZen.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFullscreen(false);
      });
    }

    // Header Fullscreen button
    if (this.dom.btnFullscreenToggle) {
      this.dom.btnFullscreenToggle.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }

    // HTML5 fullscreen change event listener
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this.isFullscreen) {
        this.toggleFullscreen(false);
      }
    });
  }

  toggleFullscreen(forceState = null) {
    const willBeFullscreen = forceState !== null ? forceState : !this.isFullscreen;
    this.isFullscreen = willBeFullscreen;
    document.body.classList.toggle('is-fullscreen', this.isFullscreen);

    // Update icons
    if (this.dom.btnFullscreenToggle) {
      const expIcon = this.dom.btnFullscreenToggle.querySelector('.icon-expand');
      const compIcon = this.dom.btnFullscreenToggle.querySelector('.icon-compress');
      if (expIcon && compIcon) {
        expIcon.style.display = this.isFullscreen ? 'none' : 'block';
        compIcon.style.display = this.isFullscreen ? 'block' : 'none';
      }
    }

    // Show/hide floating Zen HUD
    if (this.dom.zenFloatingHud) {
      this.dom.zenFloatingHud.style.display = this.isFullscreen ? 'inline-block' : 'none';
    }

    // Request/Exit HTML5 Fullscreen API safely
    if (this.isFullscreen) {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      this.showToast('Zen Fullscreen: Single tap screen or press Esc to exit', 'info');
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  // ------------------------------------------------------------------------
  // Marko Hub Modal (About, Updates, Typography & Shortcuts)
  // ------------------------------------------------------------------------
  initMarkoHubModal() {
    // Populate Version Badge
    if (this.dom.modalVersionBadge) {
      this.dom.modalVersionBadge.textContent = `v${APP_INFO.version}`;
    }
    if (this.dom.headerVersionBadge) {
      this.dom.headerVersionBadge.textContent = `v${APP_INFO.version}`;
    }
    if (this.dom.updateStatusText) {
      this.dom.updateStatusText.textContent = `You are running Marko v${APP_INFO.version}`;
    }

    // Render Changelog
    if (this.dom.changelogTimelineContainer) {
      this.dom.changelogTimelineContainer.innerHTML = APP_INFO.changelog.map(item => `
        <div class="changelog-card ${item.isLatest ? 'is-latest-release' : ''}">
          <div class="changelog-card-header">
            <div class="changelog-version-tag">
              <span class="changelog-v-badge">v${item.version}</span>
              ${item.isLatest ? '<span class="changelog-current-badge">Current Release</span>' : ''}
            </div>
            <span class="changelog-date">${item.date}</span>
          </div>
          <div class="changelog-title">${item.title}</div>
          <ul class="changelog-list">
            ${item.highlights.map(h => `<li>${h}</li>`).join('')}
          </ul>
        </div>
      `).join('');
    }

    // Render Tech Specs Grid
    if (this.dom.techSpecsGrid) {
      this.dom.techSpecsGrid.innerHTML = APP_INFO.techStack.map(tech => `
        <div class="tech-spec-chip">
          <strong>${tech.name}</strong>
          <span>v${tech.version}</span>
        </div>
      `).join('');
    }

    // Wire Modal Tab Buttons
    if (this.dom.shortcutsModal) {
      const tabButtons = this.dom.shortcutsModal.querySelectorAll('.modal-tab-btn');
      const tabPanes = this.dom.shortcutsModal.querySelectorAll('.modal-tab-pane');

      tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetTab = btn.getAttribute('data-tab');
          tabButtons.forEach(b => b.classList.toggle('is-active', b === btn));
          tabPanes.forEach(pane => {
            const isTarget = pane.id.toLowerCase() === `tab${targetTab}`;
            pane.style.display = isTarget ? 'block' : 'none';
            pane.classList.toggle('is-active', isTarget);
          });
        });
      });
    }

    // Brand badge click opens About Marko Hub
    if (this.dom.brandBadge) {
      this.dom.brandBadge.addEventListener('click', () => {
        this.openHubModal('updates');
      });
    }

    // Typography button opens Typography Tab
    if (this.dom.btnTypographyToggle) {
      this.dom.btnTypographyToggle.addEventListener('click', () => {
        this.openHubModal('typography');
      });
    }

    // Check for updates button
    if (this.dom.btnCheckForUpdates) {
      this.dom.btnCheckForUpdates.addEventListener('click', async () => {
        const spinIcon = this.dom.btnCheckForUpdates.querySelector('.spin-icon');
        if (spinIcon) spinIcon.classList.add('is-spinning');
        this.dom.btnCheckForUpdates.disabled = true;

        if (this.dom.updateCheckResult) {
          this.dom.updateCheckResult.style.display = 'block';
          this.dom.updateCheckResult.className = 'update-check-result';
          this.dom.updateCheckResult.innerHTML = 'Connecting to GitHub Releases API...';
        }

        const res = await checkForAppUpdates();
        if (spinIcon) spinIcon.classList.remove('is-spinning');
        this.dom.btnCheckForUpdates.disabled = false;

        if (!this.dom.updateCheckResult) return;

        if (res.hasUpdate) {
          this.dom.updateCheckResult.className = 'update-check-result result-update';
          this.dom.updateCheckResult.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <div>
                <strong>🎉 A new version of Marko (${res.latestVersion}) is available!</strong>
                <div style="font-size: 11.5px; opacity: 0.85; margin-top: 2px;">Published: ${res.publishedAt} • Current: v${res.currentVersion}</div>
              </div>
              <a href="${res.releaseUrl}" target="_blank" rel="noopener" class="btn-action btn-primary" style="font-size: 12px; padding: 4px 10px; text-decoration: none;">
                Download Update
              </a>
            </div>
          `;
        } else if (res.error) {
          this.dom.updateCheckResult.className = 'update-check-result result-error';
          this.dom.updateCheckResult.innerHTML = `
            <div>
              <strong>Notice:</strong> Unable to check GitHub updates directly (${res.error}).
              <div style="margin-top: 4px;">
                <a href="${res.releaseUrl}" target="_blank" rel="noopener" style="color: inherit; text-decoration: underline;">
                  View GitHub Releases page manually →
                </a>
              </div>
            </div>
          `;
        } else {
          this.dom.updateCheckResult.className = 'update-check-result result-latest';
          this.dom.updateCheckResult.innerHTML = `
            <strong>✓ You're up to date!</strong> Marko v${APP_INFO.version} is currently the latest stable release.
          `;
        }
      });
    }
  }

  openHubModal(tabName = 'updates') {
    if (!this.dom.shortcutsModal) return;
    this.dom.shortcutsModal.classList.add('is-active');

    const tabButtons = this.dom.shortcutsModal.querySelectorAll('.modal-tab-btn');
    const tabPanes = this.dom.shortcutsModal.querySelectorAll('.modal-tab-pane');

    tabButtons.forEach(b => {
      const isMatch = b.getAttribute('data-tab') === tabName;
      b.classList.toggle('is-active', isMatch);
    });

    tabPanes.forEach(pane => {
      const isTarget = pane.id.toLowerCase() === `tab${tabName}`;
      pane.style.display = isTarget ? 'block' : 'none';
      pane.classList.toggle('is-active', isTarget);
    });
  }

  // ------------------------------------------------------------------------
  // Reading Typography & Appearance Settings
  // ------------------------------------------------------------------------
  applyTypographySettings() {
    // Font Family
    document.body.classList.remove('font-sans', 'font-serif', 'font-mono');
    if (this.readingFont !== 'sans') {
      document.body.classList.add(`font-${this.readingFont}`);
    }

    // Font Size
    document.body.classList.remove('font-size-14', 'font-size-16', 'font-size-18', 'font-size-20');
    document.body.classList.add(`font-size-${this.readingFontSize}`);

    // Column Width
    if (this.dom.viewerProse) {
      this.dom.viewerProse.classList.remove('width-680', 'width-860', 'width-1080', 'width-full');
      const widthClass = this.readingWidth === '100%' ? 'width-full' : `width-${this.readingWidth}`;
      this.dom.viewerProse.classList.add(widthClass);
    }
  }

  initTypographyControls() {
    // Font Family Choice Buttons
    if (this.dom.fontFamilyChoices) {
      const btns = this.dom.fontFamilyChoices.querySelectorAll('.choice-btn');
      btns.forEach(btn => {
        const font = btn.getAttribute('data-font');
        btn.classList.toggle('is-active', font === this.readingFont);
        btn.addEventListener('click', () => {
          this.readingFont = font;
          localStorage.setItem('marko_font_family', font);
          btns.forEach(b => b.classList.toggle('is-active', b === btn));
          this.applyTypographySettings();
        });
      });
    }

    // Font Size Choice Buttons
    if (this.dom.fontSizeChoices) {
      const btns = this.dom.fontSizeChoices.querySelectorAll('.choice-btn');
      btns.forEach(btn => {
        const size = btn.getAttribute('data-size');
        btn.classList.toggle('is-active', size === this.readingFontSize);
        btn.addEventListener('click', () => {
          this.readingFontSize = size;
          localStorage.setItem('marko_font_size', size);
          btns.forEach(b => b.classList.toggle('is-active', b === btn));
          this.applyTypographySettings();
        });
      });
    }

    // Reading Width Choice Buttons
    if (this.dom.readingWidthChoices) {
      const btns = this.dom.readingWidthChoices.querySelectorAll('.choice-btn');
      btns.forEach(btn => {
        const width = btn.getAttribute('data-width');
        btn.classList.toggle('is-active', width === this.readingWidth);
        btn.addEventListener('click', () => {
          this.readingWidth = width;
          localStorage.setItem('marko_reading_width', width);
          btns.forEach(b => b.classList.toggle('is-active', b === btn));
          this.applyTypographySettings();
        });
      });
    }

    // Single Tap Fullscreen Toggle
    if (this.dom.chkSingleTapFullscreen) {
      this.dom.chkSingleTapFullscreen.checked = this.singleTapFullscreenEnabled;
      this.dom.chkSingleTapFullscreen.addEventListener('change', (e) => {
        this.singleTapFullscreenEnabled = e.target.checked;
        localStorage.setItem('marko_single_tap_fullscreen', e.target.checked ? 'true' : 'false');
        this.showToast(
          e.target.checked ? 'Single-tap Zen Fullscreen enabled' : 'Single-tap Zen Fullscreen disabled',
          'info'
        );
      });
    }
  }

  // ------------------------------------------------------------------------
  // Auto-Save Draft Protection
  // ------------------------------------------------------------------------
  initAutoSave() {
    // Check for recovered draft from previous session
    try {
      const backupStr = localStorage.getItem('marko_draft_backup');
      if (backupStr) {
        const backup = JSON.parse(backupStr);
        if (backup && backup.content && backup.content !== this.currentContent) {
          const ageHours = (Date.now() - (backup.timestamp || 0)) / (1000 * 60 * 60);
          if (ageHours < 48) {
            console.log(`[Marko] Found recoverable draft for "${backup.name}" (${backup.content.length} chars)`);
          }
        }
      }
    } catch (e) {}

    // Auto-save timer every 3 seconds
    setInterval(() => {
      if (this.fileManager && this.fileManager.isDirty(this.currentContent)) {
        try {
          localStorage.setItem('marko_draft_backup', JSON.stringify({
            name: this.currentFileName,
            content: this.currentContent,
            timestamp: Date.now()
          }));
        } catch (e) {}
      }
    }, 3000);
  }

  toggleSearchBar() {
    const isNowActive = this.dom.searchBarContainer.classList.toggle('is-active');
    if (isNowActive) {
      if (this.currentMode === 'edit') {
        this.setMode('view');
      }
      this.dom.searchInput.focus();
      this.dom.searchInput.select();
      if (this.dom.searchInput.value) {
        this.search.search(this.dom.searchInput.value);
      }
    } else {
      this.search.clearHighlights();
    }
  }

  closeSearchBar() {
    this.dom.searchBarContainer.classList.remove('is-active');
    this.search.clearHighlights();
  }

  initEditorToolbar() {
    const tb = {
      tbHeading: () => this.editor.heading(2),
      tbBold: () => this.editor.bold(),
      tbItalic: () => this.editor.italic(),
      tbStrikethrough: () => this.editor.strikethrough(),
      tbBulletList: () => this.editor.bulletList(),
      tbOrderedList: () => this.editor.orderedList(),
      tbTaskList: () => this.editor.taskList(),
      tbQuote: () => this.editor.quote(),
      tbCodeInline: () => this.editor.codeInline(),
      tbCodeBlock: () => this.editor.codeBlock('javascript'),
      tbTable: () => this.editor.table(),
      tbLink: () => this.editor.link(),
      tbImage: () => this.editor.image(),
      tbMath: () => this.editor.mathBlock(),
      tbMermaid: () => this.editor.mermaidBlock(),
      tbHr: () => this.editor.horizontalRule()
    };

    Object.keys(tb).forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => tb[id]());
      }
    });
  }

  // ------------------------------------------------------------------------
  // Drag and Drop File Support
  // ------------------------------------------------------------------------
  initDragAndDrop() {
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      this.dom.dropzoneOverlay.classList.add('is-active');
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        this.dom.dropzoneOverlay.classList.remove('is-active');
      }
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      dragCounter = 0;
      this.dom.dropzoneOverlay.classList.remove('is-active');

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const res = await this.fileManager.handleDroppedFile(file);
        if (res) {
          this.showToast(`Loaded "${res.name}"`, 'success');
        }
      }
    });
  }

  // ------------------------------------------------------------------------
  // PWA Support
  // ------------------------------------------------------------------------
  initPwa() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.dom.btnPwaInstall.style.display = 'inline-flex';
    });

    this.dom.btnPwaInstall.addEventListener('click', async () => {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          this.dom.btnPwaInstall.style.display = 'none';
        }
        this.deferredPrompt = null;
      }
    });
  }

  async checkDefaultAppStatus() {
    if (!window.electronAPI || !window.electronAPI.checkDefaultApp) {
      return;
    }

    try {
      const res = await window.electronAPI.checkDefaultApp();
      if (!res || !res.isWindows) return;

      const neverAsk = localStorage.getItem('marko_never_ask_default') === 'true';

      if (this.dom.btnModalSetDefault) {
        if (res.isDefault) {
          this.dom.btnModalSetDefault.textContent = '✓ Default Viewer';
          this.dom.btnModalSetDefault.disabled = true;
          this.dom.btnModalSetDefault.style.opacity = '0.7';
        } else {
          this.dom.btnModalSetDefault.textContent = 'Set as Default';
          this.dom.btnModalSetDefault.disabled = false;
          this.dom.btnModalSetDefault.style.opacity = '1';
        }
      }

      if (this.dom.defaultAppBanner) {
        if (!res.isDefault && !neverAsk) {
          this.dom.defaultAppBanner.style.display = 'block';
        } else {
          this.dom.defaultAppBanner.style.display = 'none';
        }
      }
    } catch (err) {
      console.error('[Marko] Error checking default app status:', err);
    }
  }

  async triggerSetDefaultApp() {
    if (!window.electronAPI || !window.electronAPI.setDefaultApp) {
      this.showToast('Please set default app in Windows Settings', 'info');
      return;
    }

    try {
      this.showToast('Opening Windows Default Apps dialog...', 'info');
      await window.electronAPI.setDefaultApp();

      if (this.dom.defaultAppBanner) {
        this.dom.defaultAppBanner.style.display = 'none';
      }

      setTimeout(() => this.checkDefaultAppStatus(), 2500);
    } catch (err) {
      console.error('[Marko] Failed to trigger set default app:', err);
      this.showToast('Could not open default app dialog', 'error');
    }
  }

  getSelectedText() {
    if (this.currentMode === 'edit' || this.currentMode === 'split') {
      const start = this.dom.editorTextarea.selectionStart;
      const end = this.dom.editorTextarea.selectionEnd;
      if (start !== end) {
        return this.dom.editorTextarea.value.substring(start, end);
      }
    }
    const winSel = window.getSelection();
    return winSel ? winSel.toString() : '';
  }

  applyAiContent(newContent) {
    this.previousAiContent = this.currentContent;
    this.currentContent = newContent;
    this.editor.setContent(newContent);
    this.renderMarkdown();
    this.updateStats();
    this.updateDirtyIndicator(true);
    if (this.claudeUI) {
      this.claudeUI.updateContextPill();
    }
  }

  insertSnippetAtCursor(snippet) {
    if (this.currentMode === 'view') {
      this.setMode('edit');
    }
    this.editor.insertBlock(snippet);
    this.renderMarkdown();
    this.updateStats();
    this.updateDirtyIndicator(true);
    if (this.claudeUI) {
      this.claudeUI.updateContextPill();
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    this.dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new AppController();
});
