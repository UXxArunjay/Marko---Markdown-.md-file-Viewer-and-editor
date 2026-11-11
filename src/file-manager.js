/**
 * File management module for Marko
 * Supports File System Access API with universal fallback,
 * Recently Opened Files, Most Opened Files tracking, Starred Favorites,
 * dirty state, and drag & drop.
 */

const RECENT_FILES_KEY = 'md_view_recent_files';
const MAX_RECENTS = 50;

export class FileManager {
  constructor(options = {}) {
    this.currentFileHandle = null;
    this.currentFilePath = null;
    this.currentFileName = 'README.md';
    this.lastSavedContent = '';
    this.onFileLoaded = options.onFileLoaded || (() => {});
    this.onDirtyStateChange = options.onDirtyStateChange || (() => {});
    this.onHistoryChange = options.onHistoryChange || (() => {});
  }

  isSupportedFSA() {
    return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
  }

  /**
   * Returns all stored file history records with schema normalization
   */
  getAllFileRecords() {
    try {
      const data = localStorage.getItem(RECENT_FILES_KEY);
      if (!data) return [];
      const raw = JSON.parse(data);
      if (!Array.isArray(raw)) return [];

      // Normalize items from older formats
      return raw.map((item, idx) => ({
        id: item.id || `doc_${item.timestamp || Date.now()}_${idx}`,
        name: item.name || 'Untitled.md',
        path: item.path || null,
        preview: item.preview || '',
        content: typeof item.content === 'string' ? item.content : null,
        size: typeof item.size === 'number' ? item.size : (item.content ? item.content.length : 0),
        timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
        openCount: typeof item.openCount === 'number' && item.openCount > 0 ? item.openCount : 1,
        isFavorite: Boolean(item.isFavorite)
      }));
    } catch (e) {
      console.warn('[FileManager] Could not read file history:', e);
      return [];
    }
  }

  saveAllFileRecords(records) {
    try {
      localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(records.slice(0, MAX_RECENTS)));
      this.onHistoryChange();
    } catch (e) {
      console.warn('[FileManager] Could not save file history:', e);
    }
  }

  /**
   * 1. Recently Opened Files: Sorted by last opened timestamp descending
   */
  getRecentFiles(limit = 20) {
    const list = this.getAllFileRecords();
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return list.slice(0, limit);
  }

  /**
   * 2. Most Opened Files: Sorted by frequency (openCount) descending
   */
  getMostOpenedFiles(limit = 10) {
    const list = this.getAllFileRecords();
    list.sort((a, b) => {
      const diff = (b.openCount || 1) - (a.openCount || 1);
      if (diff !== 0) return diff;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
    return list.slice(0, limit);
  }

  /**
   * 3. Favorite Files: All documents marked as favorite
   */
  getFavoriteFiles() {
    const list = this.getAllFileRecords();
    return list.filter(item => item.isFavorite).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  /**
   * Check if a document is starred as favorite
   */
  isFavorite(nameOrPath) {
    if (!nameOrPath) return false;
    const records = this.getAllFileRecords();
    const item = records.find(r => (r.path && r.path === nameOrPath) || r.name === nameOrPath);
    return Boolean(item && item.isFavorite);
  }

  /**
   * Toggle favorite state for a document
   */
  toggleFavorite(nameOrPath, fallbackContent = null) {
    if (!nameOrPath) return false;
    const records = this.getAllFileRecords();
    let target = records.find(r => (r.path && r.path === nameOrPath) || r.name === nameOrPath);

    if (target) {
      target.isFavorite = !target.isFavorite;
    } else {
      // If starring an active file not yet in records, create entry
      target = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: typeof nameOrPath === 'string' && nameOrPath.includes('\\') || nameOrPath.includes('/')
          ? nameOrPath.split(/[/\\]/).pop()
          : nameOrPath,
        path: typeof nameOrPath === 'string' && (nameOrPath.includes('\\') || nameOrPath.includes('/')) ? nameOrPath : null,
        preview: fallbackContent ? fallbackContent.replace(/^[#\s\-*`>]+/gm, '').trim().slice(0, 120) : '',
        content: fallbackContent ? fallbackContent.slice(0, 200000) : null,
        size: fallbackContent ? fallbackContent.length : 0,
        timestamp: Date.now(),
        openCount: 1,
        isFavorite: true
      };
      records.unshift(target);
    }

    this.saveAllFileRecords(records);
    return target.isFavorite;
  }

  /**
   * Records or updates a file open event in history
   */
  recordFileOpen({ name, path = null, content = '', size = 0 }) {
    if (!name) return;
    try {
      const records = this.getAllFileRecords();
      const preview = content
        ? content.replace(/^[#\s\-*`>]+/gm, '').trim().slice(0, 120)
        : '';

      // Find existing entry by matching path or name
      const existingIdx = records.findIndex(r => (path && r.path === path) || (!path && !r.path && r.name === name));

      let record;
      if (existingIdx !== -1) {
        record = records.splice(existingIdx, 1)[0];
        record.timestamp = Date.now();
        record.openCount = (record.openCount || 1) + 1;
        record.preview = preview || record.preview;
        if (content) {
          record.content = content.length < 500000 ? content : content.slice(0, 500000);
        }
        if (size) record.size = size;
        if (path) record.path = path;
      } else {
        record = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name,
          path: path || null,
          preview,
          content: content && content.length < 500000 ? content : null,
          size: size || (content ? content.length : 0),
          timestamp: Date.now(),
          openCount: 1,
          isFavorite: false
        };
      }

      records.unshift(record);
      this.saveAllFileRecords(records);
    } catch (e) {
      console.warn('[FileManager] Could not record file open:', e);
    }
  }

  // Alias for backward compatibility
  saveToRecentFiles(fileName, previewSnippet) {
    this.recordFileOpen({
      name: fileName,
      path: this.currentFilePath,
      content: previewSnippet || this.lastSavedContent
    });
  }

  /**
   * Remove a file from history
   */
  removeFromHistory(nameOrId) {
    let records = this.getAllFileRecords();
    records = records.filter(r => r.id !== nameOrId && r.name !== nameOrId && r.path !== nameOrId);
    this.saveAllFileRecords(records);
  }

  clearHistory() {
    localStorage.removeItem(RECENT_FILES_KEY);
    this.onHistoryChange();
  }

  /**
   * Open file using native File System Access API if available,
   * otherwise triggers standard file picker input
   */
  async openFile() {
    if (this.isSupportedFSA()) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'Markdown Files (*.md, *.markdown, *.txt)',
              accept: {
                'text/markdown': ['.md', '.markdown'],
                'text/plain': ['.txt']
              }
            }
          ],
          multiple: false
        });

        const file = await handle.getFile();
        const content = await file.text();

        this.currentFileHandle = handle;
        this.currentFileName = file.name;
        this.currentFilePath = null;
        this.lastSavedContent = content;

        this.recordFileOpen({
          name: file.name,
          path: null,
          content,
          size: file.size
        });

        this.onFileLoaded({
          name: file.name,
          content,
          handle,
          size: file.size
        });

        return { success: true, name: file.name, content };
      } catch (err) {
        if (err.name === 'AbortError') return { cancelled: true };
        console.warn('Native picker failed, falling back to input:', err);
      }
    }

    // Universal fallback for mobile, Firefox, and Safari
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md,.markdown,.txt,text/markdown,text/plain';

      input.onchange = async () => {
        if (!input.files || input.files.length === 0) {
          resolve({ cancelled: true });
          return;
        }

        const file = input.files[0];
        const content = await file.text();

        this.currentFileHandle = null;
        this.currentFileName = file.name;
        this.currentFilePath = null;
        this.lastSavedContent = content;

        this.recordFileOpen({
          name: file.name,
          path: null,
          content,
          size: file.size
        });

        this.onFileLoaded({
          name: file.name,
          content,
          handle: null,
          size: file.size
        });

        resolve({ success: true, name: file.name, content });
      };

      input.click();
    });
  }

  /**
   * Open directly from a history record (Recent, Favorite, Most Opened)
   */
  async openRecord(record) {
    if (!record) return { success: false };

    // 1. If running in Electron with a native file path, try reading from disk first
    if (record.path && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.readFile) {
      try {
        const res = await window.electronAPI.readFile(record.path);
        if (res && res.success && typeof res.content === 'string') {
          this.currentFileHandle = null;
          this.currentFilePath = res.filePath;
          this.currentFileName = res.fileName;
          this.lastSavedContent = res.content;

          this.recordFileOpen({
            name: res.fileName,
            path: res.filePath,
            content: res.content,
            size: res.size
          });

          this.onFileLoaded({
            name: res.fileName,
            content: res.content,
            filePath: res.filePath,
            handle: null,
            size: res.size
          });

          return { success: true, name: res.fileName, content: res.content, filePath: res.filePath };
        }
      } catch (err) {
        console.warn('[FileManager] Direct disk read failed, falling back to cache:', err);
      }
    }

    // 2. If cached content exists
    if (record.content) {
      this.currentFileHandle = null;
      this.currentFilePath = record.path || null;
      this.currentFileName = record.name;
      this.lastSavedContent = record.content;

      this.recordFileOpen({
        name: record.name,
        path: record.path,
        content: record.content,
        size: record.size
      });

      this.onFileLoaded({
        name: record.name,
        content: record.content,
        filePath: record.path,
        handle: null,
        size: record.size
      });

      return { success: true, name: record.name, content: record.content };
    }

    // 3. Fallback: ask user to select the file
    return this.openFile();
  }

  /**
   * Save content back to disk. If a file handle or Electron path is active, writes directly.
   * Otherwise falls back to Save As.
   */
  async saveFile(content) {
    // If running in Electron with a native file path
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.saveFile && this.currentFilePath) {
      try {
        const res = await window.electronAPI.saveFile(this.currentFilePath, content);
        if (res && res.success) {
          this.lastSavedContent = content;
          this.onDirtyStateChange(false);
          this.recordFileOpen({
            name: this.currentFileName,
            path: this.currentFilePath,
            content,
            size: content.length
          });
          return { success: true, name: this.currentFileName };
        }
      } catch (err) {
        console.warn('Electron direct save failed, falling back:', err);
      }
    }

    if (this.currentFileHandle && this.currentFileHandle.createWritable) {
      try {
        const writable = await this.currentFileHandle.createWritable();
        await writable.write(content);
        await writable.close();

        this.lastSavedContent = content;
        this.onDirtyStateChange(false);
        this.recordFileOpen({
          name: this.currentFileName,
          path: this.currentFilePath,
          content,
          size: content.length
        });

        return { success: true, name: this.currentFileName };
      } catch (err) {
        console.warn('Error saving to handle, trying Save As:', err);
      }
    }

    return this.saveFileAs(content, this.currentFileName);
  }

  /**
   * Prompt user to Save As with a chosen file name and location
   */
  async saveFileAs(content, suggestedName = 'document.md') {
    if (this.isSupportedFSA() && 'showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggestedName.endsWith('.md') ? suggestedName : `${suggestedName}.md`,
          types: [
            {
              description: 'Markdown File (*.md)',
              accept: { 'text/markdown': ['.md'] }
            }
          ]
        });

        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();

        const file = await handle.getFile();
        this.currentFileHandle = handle;
        this.currentFileName = file.name;
        this.lastSavedContent = content;
        this.onDirtyStateChange(false);
        this.recordFileOpen({
          name: file.name,
          content,
          size: file.size
        });

        return { success: true, name: file.name };
      } catch (err) {
        if (err.name === 'AbortError') return { cancelled: true };
        console.warn('Save As picker failed, using download fallback:', err);
      }
    }

    // Universal download fallback
    const fileName = suggestedName.endsWith('.md') ? suggestedName : `${suggestedName}.md`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.currentFileName = fileName;
    this.lastSavedContent = content;
    this.onDirtyStateChange(false);
    this.recordFileOpen({
      name: fileName,
      content,
      size: content.length
    });

    return { success: true, name: fileName, downloaded: true };
  }

  /**
   * Read dropped file from Drag & Drop event
   */
  async handleDroppedFile(file) {
    if (!file) return null;
    const content = await file.text();
    this.currentFileHandle = null;
    this.currentFileName = file.name;
    this.lastSavedContent = content;

    this.recordFileOpen({
      name: file.name,
      content,
      size: file.size
    });

    this.onFileLoaded({
      name: file.name,
      content,
      handle: null,
      size: file.size
    });

    return { name: file.name, content };
  }

  setCurrentFile(name, content, handle = null, filePath = null) {
    this.currentFileName = name;
    this.lastSavedContent = content;
    this.currentFileHandle = handle;
    this.currentFilePath = filePath;
    this.onDirtyStateChange(false);
  }

  isDirty(currentContent) {
    return currentContent !== this.lastSavedContent;
  }
}
