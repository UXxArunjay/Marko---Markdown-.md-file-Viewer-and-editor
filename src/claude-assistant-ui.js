/**
 * Claude AI Assistant UI Component for Marko
 * Provides interactive sliding AI panel, model selector, extended thinking (long think) controls,
 * document context integration, streaming messages, one-click document edits, and diff reviews.
 */

import { CLAUDE_MODELS } from './claude-service.js';
import { DiffViewer } from './diff-viewer.js';
import { renderMarkdownToHtml } from './markdown-parser.js';

export class ClaudeAssistantUI {
  constructor({ claudeService, getDocContext, onApplyContent, onInsertAtCursor, showToast }) {
    this.claude = claudeService;
    this.getDocContext = getDocContext;
    this.onApplyContent = onApplyContent;
    this.onInsertAtCursor = onInsertAtCursor;
    this.showToast = showToast || console.log;

    this.isOpen = false;
    this.includeDocContext = true;
    this.diffViewer = new DiffViewer({
      onApply: (newContent) => {
        this.onApplyContent(newContent);
        this.showToast('✨ Applied AI edits to document', 'success');
      }
    });

    this.initElements();
    this.initEvents();
    this.renderHistory();
    this.updateModelDisplay();
    this.updateContextPill();
  }

  initElements() {
    // 1. Right Assistant Panel
    let panel = document.getElementById('claudeAssistantPanel');
    if (!panel) {
      panel = document.createElement('aside');
      panel.id = 'claudeAssistantPanel';
      panel.className = 'claude-assistant-panel is-closed';
      panel.innerHTML = `
        <!-- Panel Header -->
        <div class="claude-panel-header">
          <div class="claude-header-left">
            <div class="claude-brand-badge">
              <span class="claude-sparkle-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="url(#claudeGrad)" />
                  <defs>
                    <linearGradient id="claudeGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#d97706" />
                      <stop offset="0.5" stop-color="#d946ef" />
                      <stop offset="1" stop-color="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <span class="claude-title">Claude AI</span>
            </div>

            <!-- Model Switcher Dropdown Button -->
            <div class="claude-model-selector-wrap" id="claudeModelSelectorWrap">
              <button id="btnClaudeModelSelect" class="claude-model-btn" title="Switch Claude Model">
                <span id="claudeActiveModelName">Claude 3.7 Sonnet</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="claude-model-menu" id="claudeModelMenu">
                <!-- Populated dynamically -->
              </div>
            </div>
          </div>

          <div class="claude-header-right">
            <!-- Extended Thinking (Long Think) Toggle Button -->
            <button id="btnClaudeLongThink" class="claude-icon-btn ${this.claude.isThinkingEnabled() ? 'is-active' : ''}" title="Toggle Extended Thinking (Long Think)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-5.04z"></path><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-5.04z"></path></svg>
              <span class="claude-btn-label">Think</span>
            </button>

            <!-- Claude Settings Button -->
            <button id="btnClaudeSettings" class="claude-icon-btn" title="Claude Settings & API Key">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>

            <!-- Clear Chat Button -->
            <button id="btnClaudeClear" class="claude-icon-btn" title="New Chat / Clear History">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
            </button>

            <!-- Close Panel Button -->
            <button id="btnClaudeClose" class="claude-icon-btn" title="Close AI Panel (Ctrl+J)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <!-- Document Context Pill Bar -->
        <div class="claude-context-bar">
          <div class="claude-context-indicator" id="claudeContextIndicator">
            <span class="context-dot"></span>
            <span class="context-text" id="claudeContextText">Reading README.md</span>
          </div>
          <label class="claude-context-toggle" title="Toggle sending document context with prompts">
            <input type="checkbox" id="chkIncludeDocContext" checked />
            <span>Doc Context</span>
          </label>
        </div>

        <!-- Quick Prompts Scroll Bar -->
        <div class="claude-quick-chips">
          <button class="claude-chip" data-prompt="Please polish this document for professional tone, grammar, and readability.">✨ Polish Prose</button>
          <button class="claude-chip" data-prompt="Fix all spelling, grammar, and markdown formatting errors in this document.">📝 Fix Grammar</button>
          <button class="claude-chip" data-prompt="Generate a clean Table of Contents and outline for this document.">📑 Add Outline</button>
          <button class="claude-chip" data-prompt="Add a clear Mermaid architecture diagram explaining this document.">📊 Add Mermaid</button>
          <button class="claude-chip" data-prompt="Add relevant KaTeX mathematical formulations to enhance this document.">📐 Add Math</button>
          <button class="claude-chip" data-prompt="Summarize this document with key takeaways and structured bullets.">💡 Summarize</button>
          <button class="claude-chip" data-prompt="Translate this document to Hindi while preserving markdown code blocks.">🌐 Hindi Translate</button>
          <button class="claude-chip" data-prompt="Add GitHub alerts (> [!NOTE], > [!TIP], > [!WARNING]) to highlight key points.">🛡️ Add Alerts</button>
        </div>

        <!-- Chat Messages Container -->
        <div class="claude-messages-container" id="claudeMessagesContainer">
          <!-- Dynamic messages -->
        </div>

        <!-- Input Area -->
        <div class="claude-input-container">
          <div class="claude-input-wrapper">
            <textarea
              id="claudePromptInput"
              class="claude-prompt-input"
              placeholder="Ask Claude to edit, summarize, write, or format..."
              rows="1"
            ></textarea>
            <div class="claude-input-actions">
              <button id="btnClaudeStop" class="claude-btn-stop" style="display: none;" title="Stop generation">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>
                <span>Stop</span>
              </button>
              <button id="btnClaudeSend" class="claude-btn-send" title="Send Prompt (Enter)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          </div>
          <div class="claude-input-footer">
            <span id="claudeStatusHint" class="claude-status-hint">Press Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      `;

      // Mount inside workspace
      const workspace = document.querySelector('.app-workspace');
      if (workspace) {
        workspace.appendChild(panel);
      } else {
        document.body.appendChild(panel);
      }
    }

    this.panel = panel;

    // 2. Settings Modal
    let settingsModal = document.getElementById('claudeSettingsModal');
    if (!settingsModal) {
      settingsModal = document.createElement('div');
      settingsModal.id = 'claudeSettingsModal';
      settingsModal.className = 'modal-overlay claude-settings-overlay';
      settingsModal.innerHTML = `
        <div class="modal-box claude-settings-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="claude-sparkle-icon" style="width: 22px; height: 22px; display: inline-flex;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="url(#claudeGradModal)" />
                  <defs>
                    <linearGradient id="claudeGradModal" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stop-color="#d97706" />
                      <stop offset="0.5" stop-color="#d946ef" />
                      <stop offset="1" stop-color="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <h3 class="modal-title">Claude AI Configuration</h3>
            </div>
            <button id="btnCloseClaudeSettings" class="btn-icon-only">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="modal-body claude-settings-body">
            <!-- API Key Section -->
            <div class="setting-group">
              <label class="setting-label" for="txtClaudeApiKey">
                <span>Anthropic API Key</span>
                <span class="setting-badge">Stored Locally</span>
              </label>
              <div class="input-with-button">
                <input type="password" id="txtClaudeApiKey" class="setting-input" placeholder="sk-ant-api03-... or sk-ant-usr-..." />
                <button id="btnToggleApiKeyVisibility" class="btn-action" type="button" title="Show / Hide Key">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
              </div>
              <p class="setting-desc">
                Your key is stored securely in your browser/device localStorage and used directly for Anthropic API calls.
              </p>
            </div>

            <!-- Model Selection -->
            <div class="setting-group">
              <label class="setting-label" for="selClaudeModel">Default Model</label>
              <select id="selClaudeModel" class="setting-select">
                ${CLAUDE_MODELS.map(m => `<option value="${m.id}">${m.name} (${m.tag})</option>`).join('')}
              </select>
              <p class="setting-desc" id="lblModelDescription">Hybrid reasoning model with extended thinking capabilities.</p>
            </div>

            <!-- Extended Thinking (Long Think) -->
            <div class="setting-group" id="grpExtendedThinking">
              <div class="setting-row">
                <div>
                  <strong style="color: var(--text-primary); font-size: 13.5px;">Extended Thinking (Long Think)</strong>
                  <p class="setting-desc">Enables Claude 3.7 Sonnet deep step-by-step reasoning tokens before replying.</p>
                </div>
                <label class="switch-toggle">
                  <input type="checkbox" id="chkThinkingSetting" />
                  <span class="slider"></span>
                </label>
              </div>

              <div id="thinkingBudgetContainer" style="margin-top: 12px; display: none;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                  <span style="color: var(--text-secondary);">Thinking Budget:</span>
                  <span id="lblBudgetVal" style="font-weight: 600; color: var(--accent-hover);">2048 tokens</span>
                </div>
                <input type="range" id="rngThinkingBudget" min="1024" max="16384" step="1024" value="2048" class="setting-range" />
              </div>
            </div>

            <!-- Demo Mode / Local Simulation Toggle -->
            <div class="setting-group">
              <div class="setting-row">
                <div>
                  <strong style="color: var(--text-primary); font-size: 13.5px;">Simulation / Demo Mode</strong>
                  <p class="setting-desc">Test document modifications, visual diffs, and formatting without using Anthropic API credits.</p>
                </div>
                <label class="switch-toggle">
                  <input type="checkbox" id="chkDemoMode" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <!-- Billing link callout -->
            <div class="claude-billing-callout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <div>
                <strong>Need more Anthropic API credits?</strong>
                <p>If your account balance is low, you can manage plans or top-up credits at <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener">Anthropic Console Billing</a>.</p>
              </div>
            </div>
          </div>

          <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; border-top: 1px solid var(--border-subtle); background: var(--bg-tertiary);">
            <button id="btnSaveClaudeSettings" class="btn-action btn-primary">Save Settings</button>
            <button id="btnCloseSettingsFooter" class="btn-action">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(settingsModal);
    }
    this.settingsModal = settingsModal;
  }

  initEvents() {
    // Model Dropdown
    const modelBtn = this.panel.querySelector('#btnClaudeModelSelect');
    const modelMenu = this.panel.querySelector('#claudeModelMenu');

    modelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.populateModelMenu();
      modelMenu.classList.toggle('is-open');
    });

    document.addEventListener('click', () => {
      modelMenu.classList.remove('is-open');
    });

    // Long Think Button
    const thinkBtn = this.panel.querySelector('#btnClaudeLongThink');
    thinkBtn.addEventListener('click', () => {
      const newState = !this.claude.isThinkingEnabled();
      if (newState && this.claude.getModel() !== 'claude-3-7-sonnet-20250219') {
        this.claude.setModel('claude-3-7-sonnet-20250219');
        this.updateModelDisplay();
      }
      this.claude.setThinkingEnabled(newState);
      thinkBtn.classList.toggle('is-active', newState);
      this.showToast(newState ? '🧠 Long Think (Extended Reasoning) Enabled' : 'Standard Thinking Mode', 'info');
    });

    // Close Button
    this.panel.querySelector('#btnClaudeClose').addEventListener('click', () => {
      this.toggle(false);
    });

    // Clear History Button
    this.panel.querySelector('#btnClaudeClear').addEventListener('click', () => {
      if (confirm('Start a new chat thread? Previous conversation memory will be cleared.')) {
        this.claude.clearHistory();
        this.renderHistory();
        this.showToast('Conversation cleared', 'info');
      }
    });

    // Settings Modal
    const btnSettings = this.panel.querySelector('#btnClaudeSettings');
    btnSettings.addEventListener('click', () => this.openSettings());

    this.settingsModal.querySelector('#btnCloseClaudeSettings').addEventListener('click', () => this.closeSettings());
    this.settingsModal.querySelector('#btnCloseSettingsFooter').addEventListener('click', () => this.closeSettings());
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.closeSettings();
    });

    // Save Settings
    this.settingsModal.querySelector('#btnSaveClaudeSettings').addEventListener('click', () => {
      this.saveSettings();
    });

    // Visibility toggle for API Key
    const txtApiKey = this.settingsModal.querySelector('#txtClaudeApiKey');
    const btnToggleVis = this.settingsModal.querySelector('#btnToggleApiKeyVisibility');
    btnToggleVis.addEventListener('click', () => {
      if (txtApiKey.type === 'password') {
        txtApiKey.type = 'text';
      } else {
        txtApiKey.type = 'password';
      }
    });

    // Budget range sync
    const rngBudget = this.settingsModal.querySelector('#rngThinkingBudget');
    const lblBudget = this.settingsModal.querySelector('#lblBudgetVal');
    rngBudget.addEventListener('input', () => {
      lblBudget.textContent = `${rngBudget.value} tokens`;
    });

    // Include doc context toggle
    const chkDocContext = this.panel.querySelector('#chkIncludeDocContext');
    chkDocContext.addEventListener('change', (e) => {
      this.includeDocContext = e.target.checked;
      this.updateContextPill();
    });

    // Quick chips
    const chips = this.panel.querySelectorAll('.claude-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        this.sendPrompt(prompt);
      });
    });

    // Input auto-grow & send
    const input = this.panel.querySelector('#claudePromptInput');
    const btnSend = this.panel.querySelector('#btnClaudeSend');
    const btnStop = this.panel.querySelector('#btnClaudeStop');

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 140) + 'px';
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
          this.sendPrompt(text);
          input.value = '';
          input.style.height = 'auto';
        }
      }
    });

    btnSend.addEventListener('click', () => {
      const text = input.value.trim();
      if (text) {
        this.sendPrompt(text);
        input.value = '';
        input.style.height = 'auto';
      }
    });

    btnStop.addEventListener('click', () => {
      this.claude.abortCurrentRequest();
      btnStop.style.display = 'none';
      btnSend.style.display = 'flex';
      this.updateStatusHint('Generation stopped');
    });

    // Keyboard shortcut: Ctrl+J or Alt+C toggles panel
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && (e.key === 'j' || e.key === 'J')) || (e.altKey && (e.key === 'c' || e.key === 'C'))) {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  toggle(forceState = null) {
    this.isOpen = forceState !== null ? forceState : !this.isOpen;
    this.panel.classList.toggle('is-closed', !this.isOpen);

    const btnHeader = document.getElementById('btnClaudeToggle');
    if (btnHeader) {
      btnHeader.classList.toggle('is-active', this.isOpen);
    }

    const btnMobileNav = document.getElementById('mNavClaude');
    if (btnMobileNav) {
      btnMobileNav.classList.toggle('is-active', this.isOpen);
    }

    if (this.isOpen) {
      this.updateContextPill();
      setTimeout(() => {
        this.panel.querySelector('#claudePromptInput').focus();
      }, 200);
    }
  }

  updateContextPill() {
    const doc = this.getDocContext ? this.getDocContext() : null;
    const textEl = this.panel.querySelector('#claudeContextText');
    const dotEl = this.panel.querySelector('.context-dot');

    if (!this.includeDocContext) {
      textEl.textContent = 'Document context excluded';
      dotEl.style.backgroundColor = 'var(--text-muted)';
      return;
    }

    if (doc) {
      const wordCount = doc.wordCount || 0;
      if (doc.selection) {
        textEl.textContent = `Targeting Selection (${doc.selection.length} chars) in ${doc.fileName}`;
        dotEl.style.backgroundColor = 'var(--accent-purple)';
      } else {
        textEl.textContent = `Reading ${doc.fileName} (${wordCount} words)`;
        dotEl.style.backgroundColor = 'var(--accent-green)';
      }
    } else {
      textEl.textContent = 'No document loaded';
      dotEl.style.backgroundColor = 'var(--accent-amber)';
    }
  }

  updateModelDisplay() {
    const currentId = this.claude.getModel();
    const modelObj = CLAUDE_MODELS.find(m => m.id === currentId) || CLAUDE_MODELS[0];
    const nameEl = this.panel.querySelector('#claudeActiveModelName');
    if (nameEl) nameEl.textContent = modelObj.name;

    const thinkBtn = this.panel.querySelector('#btnClaudeLongThink');
    if (thinkBtn) {
      thinkBtn.classList.toggle('is-active', this.claude.isThinkingEnabled());
    }
  }

  populateModelMenu() {
    const menu = this.panel.querySelector('#claudeModelMenu');
    const currentId = this.claude.getModel();

    menu.innerHTML = CLAUDE_MODELS.map(m => `
      <button class="claude-model-item ${m.id === currentId ? 'is-selected' : ''}" data-model-id="${m.id}">
        <div class="model-item-top">
          <span class="model-name">${m.name}</span>
          <span class="model-tag">${m.tag}</span>
        </div>
        <p class="model-desc">${m.description}</p>
      </button>
    `).join('');

    menu.querySelectorAll('.claude-model-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const modelId = btn.getAttribute('data-model-id');
        this.claude.setModel(modelId);
        this.updateModelDisplay();
        menu.classList.remove('is-open');
        this.showToast(`Switched model to ${btn.querySelector('.model-name').textContent}`, 'info');
      });
    });
  }

  renderHistory() {
    const container = this.panel.querySelector('#claudeMessagesContainer');
    container.innerHTML = '';

    if (!this.claude.history || this.claude.history.length === 0) {
      container.innerHTML = `
        <div class="claude-empty-state">
          <div class="claude-empty-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="url(#emptySparkle)" />
              <defs>
                <linearGradient id="emptySparkle" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#d97706" />
                  <stop offset="0.5" stop-color="#d946ef" />
                  <stop offset="1" stop-color="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h4>Marko AI Assistant</h4>
          <p>Powered by Anthropic Claude with full document intelligence, extended thinking, and 1-click edits.</p>
          <div class="claude-features-grid">
            <div class="feature-item">
              <span>⚡</span>
              <div><strong>Prompt Edits</strong><p>Ask Claude to write, rewrite, or polish sections.</p></div>
            </div>
            <div class="feature-item">
              <span>🔍</span>
              <div><strong>Visual Diff</strong><p>Inspect line-by-line changes before applying.</p></div>
            </div>
            <div class="feature-item">
              <span>🧠</span>
              <div><strong>Long Think</strong><p>Claude 3.7 Sonnet reasoning for complex documents.</p></div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    this.claude.history.forEach(msg => {
      this.appendMessageElement(msg, false);
    });

    this.scrollToBottom();
  }

  /**
   * Append a message node into the chat thread
   */
  appendMessageElement(msg, autoScroll = true) {
    const container = this.panel.querySelector('#claudeMessagesContainer');
    const empty = container.querySelector('.claude-empty-state');
    if (empty) empty.remove();

    const isUser = msg.role === 'user';
    const msgEl = document.createElement('div');
    msgEl.className = `claude-message ${isUser ? 'is-user' : 'is-assistant'}`;
    msgEl.id = msg.id || 'msg-' + Date.now();

    if (isUser) {
      msgEl.innerHTML = `
        <div class="msg-bubble user-bubble">
          <div class="msg-text">${this.escape(msg.content)}</div>
        </div>
      `;
    } else {
      // Assistant message
      let thinkingHtml = '';
      if (msg.thinking) {
        thinkingHtml = `
          <details class="claude-thinking-details">
            <summary class="claude-thinking-summary">
              <span class="thinking-brain-icon">🧠</span>
              <span>Thought Process</span>
              <span class="thinking-badge">Reasoning</span>
            </summary>
            <div class="claude-thinking-content">${this.escape(msg.thinking)}</div>
          </details>
        `;
      }

      const renderedHtml = renderMarkdownToHtml(msg.content);

      msgEl.innerHTML = `
        <div class="msg-avatar claude-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="#d946ef" />
          </svg>
        </div>
        <div class="msg-bubble assistant-bubble">
          ${thinkingHtml}
          <div class="msg-prose markdown-body">${renderedHtml}</div>
          <div class="msg-actions-bar" id="msgActionsBar_${msgEl.id}"></div>
        </div>
      `;

      // Attach code block apply/diff actions
      this.attachCodeBlockActions(msgEl, msg.content);
    }

    container.appendChild(msgEl);
    if (autoScroll) this.scrollToBottom();
  }

  /**
   * Detect markdown code blocks inside assistant output and attach
   * "Apply to Document", "Review Diff", "Insert at Cursor", and "Copy" actions
   */
  attachCodeBlockActions(msgElement, rawMarkdownContent) {
    // 1. Look for markdown code blocks within the rendered HTML
    const codeBlocks = msgElement.querySelectorAll('pre');
    const markdownRegex = /```(?:markdown|md)?\n([\s\S]*?)```/g;
    const extractedBlocks = [];
    let match;

    while ((match = markdownRegex.exec(rawMarkdownContent)) !== null) {
      extractedBlocks.push(match[1].trim());
    }

    // Attach actions toolbar to code blocks
    codeBlocks.forEach((pre, index) => {
      const codeSnippet = extractedBlocks[index] || pre.querySelector('code')?.innerText || '';
      if (!codeSnippet) return;

      const toolbar = document.createElement('div');
      toolbar.className = 'code-action-toolbar';
      toolbar.innerHTML = `
        <button class="btn-code-action btn-apply-doc" title="Apply this markdown to active document">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Apply to Doc</span>
        </button>
        <button class="btn-code-action btn-review-diff" title="Review line-by-line diff before applying">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
          <span>Review Diff</span>
        </button>
        <button class="btn-code-action btn-insert-cursor" title="Insert at current cursor location">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Insert</span>
        </button>
        <button class="btn-code-action btn-copy-code" title="Copy snippet">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>Copy</span>
        </button>
      `;

      pre.style.position = 'relative';
      pre.insertBefore(toolbar, pre.firstChild);

      // Event handlers
      toolbar.querySelector('.btn-apply-doc').addEventListener('click', () => {
        this.onApplyContent(codeSnippet);
        this.showToast('✨ Applied AI Markdown to document', 'success');
      });

      toolbar.querySelector('.btn-review-diff').addEventListener('click', () => {
        const doc = this.getDocContext ? this.getDocContext() : {};
        this.diffViewer.show({
          oldContent: doc.content || '',
          newContent: codeSnippet,
          fileName: doc.fileName || 'Document'
        });
      });

      toolbar.querySelector('.btn-insert-cursor').addEventListener('click', () => {
        this.onInsertAtCursor(codeSnippet);
        this.showToast('Inserted snippet at cursor', 'info');
      });

      toolbar.querySelector('.btn-copy-code').addEventListener('click', async () => {
        await navigator.clipboard.writeText(codeSnippet);
        this.showToast('Copied code to clipboard', 'info');
      });
    });

    // 2. If at least one markdown block was extracted, also add a bottom master action bar
    if (extractedBlocks.length > 0) {
      const bestBlock = extractedBlocks[0];
      const bottomBar = msgElement.querySelector('.msg-actions-bar');
      if (bottomBar) {
        bottomBar.innerHTML = `
          <button class="claude-bar-action btn-master-apply">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Apply to Document</span>
          </button>
          <button class="claude-bar-action btn-master-diff">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            <span>Review Diff</span>
          </button>
        `;

        bottomBar.querySelector('.btn-master-apply').addEventListener('click', () => {
          this.onApplyContent(bestBlock);
          this.showToast('✨ Applied AI modifications to document', 'success');
        });

        bottomBar.querySelector('.btn-master-diff').addEventListener('click', () => {
          const doc = this.getDocContext ? this.getDocContext() : {};
          this.diffViewer.show({
            oldContent: doc.content || '',
            newContent: bestBlock,
            fileName: doc.fileName || 'Document'
          });
        });
      }
    }
  }

  /**
   * Main send prompt flow with real-time streaming
   */
  async sendPrompt(userPromptText) {
    if (!userPromptText || !userPromptText.trim()) return;

    const btnSend = this.panel.querySelector('#btnClaudeSend');
    const btnStop = this.panel.querySelector('#btnClaudeStop');

    btnSend.style.display = 'none';
    btnStop.style.display = 'flex';
    this.updateStatusHint('Claude is thinking & generating...');

    // Document context
    const doc = (this.includeDocContext && this.getDocContext) ? this.getDocContext() : null;

    // Temporary streaming message node
    const userMsg = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: userPromptText
    };
    this.appendMessageElement(userMsg);

    const streamMsgId = 'msg-' + (Date.now() + 1);
    const container = this.panel.querySelector('#claudeMessagesContainer');
    const streamEl = document.createElement('div');
    streamEl.className = 'claude-message is-assistant is-streaming';
    streamEl.id = streamMsgId;
    streamEl.innerHTML = `
      <div class="msg-avatar claude-avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="#d946ef" />
        </svg>
      </div>
      <div class="msg-bubble assistant-bubble">
        <div class="stream-thinking-slot"></div>
        <div class="stream-prose-slot markdown-body">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
        <div class="msg-actions-bar"></div>
      </div>
    `;
    container.appendChild(streamEl);
    this.scrollToBottom();

    let thinkingSoFar = '';
    let textSoFar = '';

    await this.claude.sendMessage({
      prompt: userPromptText,
      docContext: doc,
      onStart: () => {},
      onThinkingDelta: (_delta, fullThinking) => {
        thinkingSoFar = fullThinking;
        const thinkingSlot = streamEl.querySelector('.stream-thinking-slot');
        if (thinkingSlot) {
          thinkingSlot.innerHTML = `
            <details class="claude-thinking-details" open>
              <summary class="claude-thinking-summary">
                <span class="thinking-brain-icon pulse-animation">🧠</span>
                <span>Thinking Process (Claude Reasoning)</span>
              </summary>
              <div class="claude-thinking-content">${this.escape(fullThinking)}</div>
            </details>
          `;
          this.scrollToBottom();
        }
      },
      onDelta: (_delta, fullText) => {
        textSoFar = fullText;
        const proseSlot = streamEl.querySelector('.stream-prose-slot');
        if (proseSlot) {
          proseSlot.innerHTML = renderMarkdownToHtml(fullText);
          this.scrollToBottom();
        }
      },
      onComplete: ({ text, thinking }) => {
        btnStop.style.display = 'none';
        btnSend.style.display = 'flex';
        streamEl.classList.remove('is-streaming');
        this.updateStatusHint('Claude finished replying');

        // Re-attach code block actions
        this.attachCodeBlockActions(streamEl, text);
        this.scrollToBottom();
      },
      onError: (err) => {
        btnStop.style.display = 'none';
        btnSend.style.display = 'flex';
        streamEl.classList.remove('is-streaming');
        this.updateStatusHint('Claude error');

        const proseSlot = streamEl.querySelector('.stream-prose-slot');
        if (proseSlot) {
          proseSlot.innerHTML = `
            <div class="claude-error-banner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <div>
                <strong>Connection / Quota Notice</strong>
                <p>${this.escape(err.message)}</p>
                <div class="error-banner-actions">
                  <button class="btn-error-action" id="btnErrSettings">Configure API Key</button>
                  <button class="btn-error-action btn-error-demo" id="btnErrDemo">Enable Demo Mode</button>
                </div>
              </div>
            </div>
          `;

          const btnErrSettings = streamEl.querySelector('#btnErrSettings');
          if (btnErrSettings) {
            btnErrSettings.addEventListener('click', () => this.openSettings());
          }
          const btnErrDemo = streamEl.querySelector('#btnErrDemo');
          if (btnErrDemo) {
            btnErrDemo.addEventListener('click', () => {
              this.claude.setDemoMode(true);
              this.showToast('Demo Simulation Mode enabled! You can now test prompts without API credits.', 'success');
              this.sendPrompt(userPromptText); // Retry with demo mode
            });
          }
        }
      }
    });
  }

  updateStatusHint(hint) {
    const el = this.panel.querySelector('#claudeStatusHint');
    if (el) el.textContent = hint;
  }

  scrollToBottom() {
    const container = this.panel.querySelector('#claudeMessagesContainer');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  escape(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  openSettings() {
    const txtApiKey = this.settingsModal.querySelector('#txtClaudeApiKey');
    const selModel = this.settingsModal.querySelector('#selClaudeModel');
    const chkThinking = this.settingsModal.querySelector('#chkThinkingSetting');
    const budgetContainer = this.settingsModal.querySelector('#thinkingBudgetContainer');
    const rngBudget = this.settingsModal.querySelector('#rngThinkingBudget');
    const lblBudget = this.settingsModal.querySelector('#lblBudgetVal');
    const chkDemo = this.settingsModal.querySelector('#chkDemoMode');

    txtApiKey.value = this.claude.getApiKey();
    selModel.value = this.claude.getModel();
    chkThinking.checked = this.claude.isThinkingEnabled();
    rngBudget.value = this.claude.getThinkingBudget();
    lblBudget.textContent = `${rngBudget.value} tokens`;
    chkDemo.checked = this.claude.isDemoMode();

    budgetContainer.style.display = chkThinking.checked ? 'block' : 'none';
    chkThinking.onchange = () => {
      budgetContainer.style.display = chkThinking.checked ? 'block' : 'none';
    };

    this.settingsModal.classList.add('is-open');
  }

  closeSettings() {
    this.settingsModal.classList.remove('is-open');
  }

  saveSettings() {
    const txtApiKey = this.settingsModal.querySelector('#txtClaudeApiKey');
    const selModel = this.settingsModal.querySelector('#selClaudeModel');
    const chkThinking = this.settingsModal.querySelector('#chkThinkingSetting');
    const rngBudget = this.settingsModal.querySelector('#rngThinkingBudget');
    const chkDemo = this.settingsModal.querySelector('#chkDemoMode');

    this.claude.setApiKey(txtApiKey.value);
    this.claude.setModel(selModel.value);
    this.claude.setThinkingEnabled(chkThinking.checked);
    this.claude.setThinkingBudget(parseInt(rngBudget.value, 10));
    this.claude.setDemoMode(chkDemo.checked);

    this.updateModelDisplay();
    this.closeSettings();
    this.showToast('Claude settings saved', 'success');
  }
}
