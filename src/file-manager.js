/**
 * File management module for MD File View
 * Supports File System Access API with universal fallback,
 * recent files history, dirty state, and drag & drop.
 */

const RECENT_FILES_KEY = 'md_view_recent_files';
const MAX_RECENTS = 8;

export class FileManager {
  constructor(options = {}) {
    this.currentFileHandle = null;
    this.currentFilePath = null;
    this.currentFileName = 'README.md';
    this.lastSavedContent = '';
    this.onFileLoaded = options.onFileLoaded || (() => {});
    this.onDirtyStateChange = options.onDirtyStateChange || (() => {});
  }

  isSupportedFSA() {
    return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
  }

  getRecentFiles() {
    try {
      const data = localStorage.getItem(RECENT_FILES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveToRecentFiles(fileName, previewSnippet) {
    try {
      let list = this.getRecentFiles().filter(item => item.name !== fileName);
      list.unshift({
        name: fileName,
        preview: previewSnippet ? previewSnippet.slice(0, 100) : '',
        timestamp: Date.now()
      });
      list = list.slice(0, MAX_RECENTS);
      localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Could not save recent files:', e);
    }
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
        this.lastSavedContent = content;

        this.saveToRecentFiles(file.name, content);
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
        this.lastSavedContent = content;

        this.saveToRecentFiles(file.name, content);
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
   * Save content back to disk. If a file handle is active, writes directly.
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
          this.saveToRecentFiles(this.currentFileName, content);
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
        this.saveToRecentFiles(this.currentFileName, content);

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
        this.saveToRecentFiles(file.name, content);

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
    this.saveToRecentFiles(fileName, content);

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

    this.saveToRecentFiles(file.name, content);
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
