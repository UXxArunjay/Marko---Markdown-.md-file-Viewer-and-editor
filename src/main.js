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

// ==========================================================================
// Application State & Controller
// ==========================================================================

class AppController {
  constructor() {
    this.currentMode = 'view'; // DEFAULT IS 'view' as required
    this.currentFileName = 'README.md';
    this.currentContent = SAMPLE_DOCS.welcome.content;
    this.theme = localStorage.getItem('md_view_theme') || 'dark';

    // DOM Elements
    this.dom = {
      body: document.body,
      currentFileName: document.getElementById('currentFileName'),
      dirtyIndicator: document.getElementById('dirtyIndicator'),
      currentFilePill: document.getElementById('currentFilePill'),

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

      // Overlay & Toasts
      dropzoneOverlay: document.getElementById('dropzoneOverlay'),
      toastContainer: document.getElementById('toastContainer'),
      btnPwaInstall: document.getElementById('btnPwaInstall'),

      // Default App Banner & Buttons
      defaultAppBanner: document.getElementById('defaultAppBanner'),
      btnSetAsDefault: document.getElementById('btnSetAsDefault'),
      btnDismissDefaultBanner: document.getElementById('btnDismissDefaultBanner'),
      btnNeverAskDefault: document.getElementById('btnNeverAskDefault'),
      btnModalSetDefault: document.getElementById('btnModalSetDefault')
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
        // If on small screen, auto-collapse sidebar after heading click
        if (window.innerWidth <= 768) {
          this.dom.appSidebar.classList.add('is-collapsed');
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
    this.setMode('view'); // ALWAYS VIEW MODE BY DEFAULT
    this.loadDocument(this.currentFileName, this.currentContent);
    this.initEventListeners();
    this.initEditorToolbar();
    this.initDragAndDrop();
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

    // Re-render Mermaid diagrams with appropriate theme if in viewer
    if (this.currentMode === 'view' || this.currentMode === 'split') {
      this.renderMarkdown();
    }
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
      this.dom.appSidebar.classList.toggle('is-collapsed');
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
      this.dom.shortcutsModal.classList.add('is-active');
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

      if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
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
        this.dom.newFileModal.classList.remove('is-active');
        this.dom.shortcutsModal.classList.remove('is-active');
        this.closeSearchBar();
      }
    });
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
