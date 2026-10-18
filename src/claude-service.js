/**
 * Claude AI Service for Marko Markdown Editor
 * Handles Anthropic API communication, models, streaming, thinking/reasoning,
 * conversation memory, and document context.
 */

export const CLAUDE_MODELS = [
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    tag: 'Latest & Smartest',
    supportsThinking: true,
    description: 'Hybrid reasoning model with extended thinking capabilities.'
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    tag: 'Recommended',
    supportsThinking: false,
    description: 'Fast, highly intelligent model ideal for general markdown editing.'
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    tag: 'Ultra Fast',
    supportsThinking: false,
    description: 'Lightweight model with rapid response times and high efficiency.'
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    tag: 'Deep Reasoning',
    supportsThinking: false,
    description: 'Deep analytical model for complex technical documentation.'
  }
];

export const DEFAULT_API_KEY = '';

export class ClaudeService {
  constructor() {
    this.storageKeyApiKey = 'marko_claude_api_key';
    this.storageKeyModel = 'marko_claude_model';
    this.storageKeyThinking = 'marko_claude_thinking';
    this.storageKeyThinkingBudget = 'marko_claude_thinking_budget';
    this.storageKeyDemoMode = 'marko_claude_demo_mode';
    this.storageKeyHistory = 'marko_claude_chat_history';

    // Load persisted settings or sensible defaults
    this.apiKey = localStorage.getItem(this.storageKeyApiKey) || DEFAULT_API_KEY;
    this.model = localStorage.getItem(this.storageKeyModel) || 'claude-3-7-sonnet-20250219';
    this.thinkingEnabled = localStorage.getItem(this.storageKeyThinking) === 'true';
    this.thinkingBudget = parseInt(localStorage.getItem(this.storageKeyThinkingBudget) || '2048', 10);
    this.demoMode = localStorage.getItem(this.storageKeyDemoMode) === 'true';

    // Conversation Memory
    this.history = this.loadHistory();
    this.activeController = null;
  }

  getApiKey() {
    return this.apiKey;
  }

  setApiKey(key) {
    this.apiKey = (key || '').trim();
    localStorage.setItem(this.storageKeyApiKey, this.apiKey);
  }

  getModel() {
    return this.model;
  }

  setModel(modelId) {
    const found = CLAUDE_MODELS.find(m => m.id === modelId);
    if (found) {
      this.model = modelId;
      localStorage.setItem(this.storageKeyModel, modelId);
    }
  }

  isThinkingEnabled() {
    const currentModelObj = CLAUDE_MODELS.find(m => m.id === this.model);
    return Boolean(currentModelObj?.supportsThinking && this.thinkingEnabled);
  }

  setThinkingEnabled(enabled) {
    this.thinkingEnabled = Boolean(enabled);
    localStorage.setItem(this.storageKeyThinking, String(this.thinkingEnabled));
  }

  getThinkingBudget() {
    return this.thinkingBudget;
  }

  setThinkingBudget(tokens) {
    this.thinkingBudget = Math.max(1024, Math.min(32000, Number(tokens) || 2048));
    localStorage.setItem(this.storageKeyThinkingBudget, String(this.thinkingBudget));
  }

  isDemoMode() {
    return this.demoMode;
  }

  setDemoMode(enabled) {
    this.demoMode = Boolean(enabled);
    localStorage.setItem(this.storageKeyDemoMode, String(this.demoMode));
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem(this.storageKeyHistory);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  saveHistory() {
    try {
      localStorage.setItem(this.storageKeyHistory, JSON.stringify(this.history));
    } catch (e) {
      console.warn('[ClaudeService] Failed to persist chat history:', e);
    }
  }

  clearHistory() {
    this.history = [];
    localStorage.removeItem(this.storageKeyHistory);
  }

  abortCurrentRequest() {
    if (this.activeController) {
      this.activeController.abort();
      this.activeController = null;
    }
  }

  /**
   * Build comprehensive system instructions tailored for Marko Markdown Editor
   */
  buildSystemPrompt(docContext) {
    let prompt = `You are Marko AI, an elite AI Markdown editor, technical writer, and document intelligence assistant built directly into Marko — the high-performance Markdown Viewer & Editor.
Your primary mission is to help the user read, analyze, edit, polish, format, restructure, and transform Markdown (.md) documents.

MARKDOWN & FORMATTING RULES:
1. Always output clean, standards-compliant GitHub Flavored Markdown (GFM).
2. When creating diagrams, use standard Mermaid syntax in \`\`\`mermaid code fences.
3. For math, use KaTeX syntax: inline $math$ or block $$ math $$.
4. For alerts/callouts, use GitHub alerts format:
   > [!NOTE]
   > [!TIP]
   > [!IMPORTANT]
   > [!WARNING]
   > [!CAUTION]
5. For task checklists, use standard \`- [ ]\` and \`- [x]\`.

DOCUMENT EDITING INSTRUCTIONS:
- Whenever you suggest modifications, improvements, rewrites, or new sections for the document, ALWAYS provide the proposed markdown enclosed in a \`\`\`markdown code block so Marko can offer the user 1-click "Apply to Document", "Insert at Cursor", and "Review Diff" options.
- If the user asks for a complete rewrite or substantial document edit, provide the complete revised markdown inside the \`\`\`markdown block.
- If the user asks for a specific snippet or section, provide that cleanly.
- Keep conversational explanations concise and focused before or after code blocks.`;

    if (docContext && docContext.content) {
      prompt += `\n\nCURRENT LOADED DOCUMENT IN MARKO:
Filename: ${docContext.fileName || 'Untitled.md'}
Word count: ${docContext.wordCount || 0}
----------------------------------------
${docContext.content}
----------------------------------------`;

      if (docContext.selection) {
        prompt += `\n\nCURRENTLY SELECTED TEXT IN DOCUMENT:\n"""\n${docContext.selection}\n"""\n(The user's prompt may specifically target this selection).`;
      }
    }

    return prompt;
  }

  /**
   * Send a prompt with memory and streaming support
   * @param {Object} options
   * @param {string} options.prompt - User's prompt text
   * @param {Object} [options.docContext] - Current document context { fileName, content, wordCount, selection }
   * @param {Function} [options.onStart] - Callback when generation begins
   * @param {Function} [options.onDelta] - Callback for incremental text chunks: (textDelta, fullText)
   * @param {Function} [options.onThinkingDelta] - Callback for thinking/reasoning chunks: (thinkingDelta, fullThinking)
   * @param {Function} [options.onComplete] - Callback when complete: ({ text, thinking, id })
   * @param {Function} [options.onError] - Callback on error: (error)
   */
  async sendMessage({
    prompt,
    docContext = null,
    onStart = () => {},
    onDelta = () => {},
    onThinkingDelta = () => {},
    onComplete = () => {},
    onError = () => {}
  }) {
    this.abortCurrentRequest();
    this.activeController = new AbortController();

    const userMessageId = 'msg-' + Date.now();
    const assistantMessageId = 'msg-' + (Date.now() + 1);

    // Append user message to history
    this.history.push({
      id: userMessageId,
      role: 'user',
      content: prompt,
      timestamp: Date.now()
    });
    this.saveHistory();

    onStart();

    // If Demo Mode is active, run the intelligent simulation
    if (this.demoMode) {
      await this.runDemoSimulation({
        prompt,
        docContext,
        assistantMessageId,
        onDelta,
        onThinkingDelta,
        onComplete
      });
      return;
    }

    const currentModelObj = CLAUDE_MODELS.find(m => m.id === this.model) || CLAUDE_MODELS[0];
    const useThinking = Boolean(currentModelObj.supportsThinking && this.thinkingEnabled);
    const systemPrompt = this.buildSystemPrompt(docContext);

    // Format conversation history for Anthropic API (max 20 messages for context)
    const recentMessages = this.history.slice(-20).map(m => ({
      role: m.role,
      content: m.content
    }));

    // Build API payload
    const payload = {
      model: this.model,
      max_tokens: useThinking ? Math.max(4096, this.thinkingBudget + 2048) : 4096,
      system: systemPrompt,
      messages: recentMessages,
      stream: true
    };

    if (useThinking) {
      payload.thinking = {
        type: 'enabled',
        budget_tokens: this.thinkingBudget
      };
      // When thinking is enabled, Anthropic requires temperature to be omitted or 1.0
    } else {
      payload.temperature = 0.7;
    }

    try {
      // Determine endpoint and fetch approach
      let response;
      const headers = {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      };

      // 1. If in Electron and IPC is available
      if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.claudeRequest) {
        // Send via Electron IPC (non-streaming fallback or stream events)
        const ipcResult = await window.electronAPI.claudeRequest({
          endpoint: 'https://api.anthropic.com/v1/messages',
          apiKey: this.apiKey,
          body: { ...payload, stream: false }
        });

        if (!ipcResult.ok) {
          throw new Error(this.formatErrorMessage(ipcResult.data || ipcResult.error));
        }

        let thinkingText = '';
        let fullText = '';
        if (ipcResult.data && Array.isArray(ipcResult.data.content)) {
          for (const block of ipcResult.data.content) {
            if (block.type === 'thinking') thinkingText += block.thinking || '';
            if (block.type === 'text') fullText += block.text || '';
          }
        }

        if (thinkingText) onThinkingDelta(thinkingText, thinkingText);
        onDelta(fullText, fullText);

        this.history.push({
          id: assistantMessageId,
          role: 'assistant',
          content: fullText,
          thinking: thinkingText,
          model: this.model,
          timestamp: Date.now()
        });
        this.saveHistory();

        onComplete({ id: assistantMessageId, text: fullText, thinking: thinkingText });
        return;
      }

      // 2. Direct browser fetch with Anthropic's browser header
      let endpoint = 'https://api.anthropic.com/v1/messages';
      
      // If running via Vite dev, Vite proxy can optionally route /api/claude
      if (window.location.hostname === 'localhost' && window.location.port === '5173') {
        endpoint = '/api/claude/v1/messages';
      }

      response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: this.activeController.signal
      });

      if (!response.ok) {
        let errJson = null;
        try {
          errJson = await response.json();
        } catch {}
        const errorMsg = this.formatErrorMessage(errJson, response.status);
        throw new Error(errorMsg);
      }

      // Stream response using SSE reader
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullText = '';
      let fullThinking = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep remainder

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const event = JSON.parse(dataStr);
            if (event.type === 'content_block_delta') {
              if (event.delta?.type === 'thinking_delta') {
                const tDelta = event.delta.thinking || '';
                fullThinking += tDelta;
                onThinkingDelta(tDelta, fullThinking);
              } else if (event.delta?.type === 'text_delta') {
                const delta = event.delta.text || '';
                fullText += delta;
                onDelta(delta, fullText);
              }
            }
          } catch {}
        }
      }

      // Append assistant message to history
      this.history.push({
        id: assistantMessageId,
        role: 'assistant',
        content: fullText,
        thinking: fullThinking,
        model: this.model,
        timestamp: Date.now()
      });
      this.saveHistory();

      onComplete({
        id: assistantMessageId,
        text: fullText,
        thinking: fullThinking
      });

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[ClaudeService] Request was cancelled by user');
        return;
      }
      console.error('[ClaudeService] Error calling Claude API:', err);
      onError(err);
    } finally {
      this.activeController = null;
    }
  }

  /**
   * Friendly error formatter that clearly explains credit or auth issues
   */
  formatErrorMessage(errJson, status = 0) {
    if (errJson && errJson.error) {
      const msg = errJson.error.message || JSON.stringify(errJson.error);
      if (msg.includes('credit balance is too low') || msg.includes('Plans & Billing')) {
        return `Anthropic Credit Limit: Your API key is authenticated, but your Anthropic balance is low. Please add credits at console.anthropic.com/settings/billing or toggle "Demo Mode" in Claude Settings to test Marko features immediately.`;
      }
      if (msg.includes('invalid x-api-key') || msg.includes('authentication')) {
        return `Invalid API Key: Please verify your Anthropic API key in Claude Settings.`;
      }
      return `Claude API Error: ${msg}`;
    }
    if (status === 401) return 'Authentication failed. Please verify your Claude API key.';
    if (status === 429) return 'Claude rate limit exceeded. Please try again shortly.';
    return errJson?.message || 'Failed to connect to Claude API. Check your internet connection or API key.';
  }

  /**
   * Realistic simulated response generator for testing Marko's prompt editing,
   * diff viewer, TOC, mermaid diagrams, and document updates offline or with low credits.
   */
  async runDemoSimulation({ prompt, docContext, assistantMessageId, onDelta, onThinkingDelta, onComplete }) {
    const isHindi = /karo|kardo|likho|bana|dekh|kuch|isme/i.test(prompt);
    const lower = prompt.toLowerCase();

    // Simulated Thinking
    const thinkingSteps = [
      `Analyzing prompt: "${prompt}"...`,
      `Inspecting active document: ${docContext?.fileName || 'README.md'} (${docContext?.wordCount || 100} words)...`,
      `Formulating high-quality markdown edits with GFM compliance and visual structure...`,
      `Synthesizing response with one-click apply capabilities.`
    ];

    for (const step of thinkingSteps) {
      if (this.activeController?.signal?.aborted) return;
      onThinkingDelta(step + '\n', thinkingSteps.join('\n'));
      await new Promise(r => setTimeout(r, 200));
    }

    let responseContent = '';

    if (lower.includes('mermaid') || lower.includes('diagram') || lower.includes('flowchart')) {
      responseContent = `I have generated a clean, responsive Mermaid architecture diagram for your document:

\`\`\`markdown
## 🏗️ System Architecture

\`\`\`mermaid
flowchart TD
    User([👤 User / Client]) -->|Edit & View| UI[🖥️ Marko Desktop / Web]
    UI -->|Markdown Parsing| Parser[Marked.js + KaTeX + Prism]
    UI -->|Document Context| Claude[🧠 Claude 3.7 Sonnet AI]
    Claude -->|Streaming Suggestions| Diff[🔍 Visual Diff & Auto-Apply]
    Diff -->|1-Click Update| Editor[📝 Active Markdown Editor]
    Editor -->|Live Render| Preview[👁️ Beautiful Preview Pane]
\`\`\`
\`\`\`

You can click **"Apply to Document"** or **"Insert at Cursor"** above to incorporate this diagram right into your document.`;
    } else if (lower.includes('grammar') || lower.includes('polish') || lower.includes('improve') || lower.includes('clean')) {
      const original = docContext?.content || '# Marko Markdown Editor\n\nA modern markdown editor.';
      responseContent = `I have reviewed and polished your document for clarity, tone, and formatting consistency:

\`\`\`markdown
${original}

> [!TIP]
> **Pro Tip**: Use \`Ctrl + J\` to open the Claude AI Assistant anytime to brainstorm, format, or generate structured documentation!
\`\`\`

Click **"Review Diff"** to inspect the line-by-line enhancements, or click **"Apply to Document"** to update your file instantly!`;
    } else if (lower.includes('table') || lower.includes('spec') || lower.includes('comparison')) {
      responseContent = `Here is a structured comparison table tailored for your document:

\`\`\`markdown
### 📊 Feature Comparison Matrix

| Feature | Marko Free | Marko Pro with Claude AI |
| :--- | :---: | :---: |
| GFM & Math (KaTeX) | ✅ Built-in | ✅ Built-in |
| Live Split-View | ✅ Yes | ✅ Yes |
| Mermaid Diagrams | ✅ Yes | ✅ Yes |
| Claude 3.7 Reasoning | ❌ | ✅ Extended Thinking |
| 1-Click Document Edits | ❌ | ✅ Visual Diff & Apply |
| Multi-turn Chat Memory | ❌ | ✅ Persistent History |
\`\`\`

Click **"Apply to Document"** to merge this into your document.`;
    } else {
      responseContent = `${isHindi ? 'नमस्ते! मैंने आपके दस्तावेज़ का विश्लेषण किया है।' : 'I have analyzed your request and document context.'}

Based on your prompt, here is the suggested markdown enhancement:

\`\`\`markdown
> [!NOTE]
> **Document Update by Claude AI**
> - Enhanced readability and structural clarity
> - Formatted with GitHub-style callouts and typography

### 🚀 Key Highlights
- **Intelligent Assistant**: Connected with Claude 3.7 Sonnet with long-thinking reasoning.
- **Document Memory**: Preserves context and conversation turns across your session.
- **Instant Actions**: One-click apply, cursor insert, and visual diff reviews.
\`\`\`

Would you like me to expand any specific section or modify another part of **${docContext?.fileName || 'your document'}**?`;
    }

    // Simulate streaming words
    const words = responseContent.split(' ');
    let currentText = '';
    for (let i = 0; i < words.length; i++) {
      if (this.activeController?.signal?.aborted) return;
      const chunk = (i === 0 ? '' : ' ') + words[i];
      currentText += chunk;
      onDelta(chunk, currentText);
      await new Promise(r => setTimeout(r, 20));
    }

    this.history.push({
      id: assistantMessageId,
      role: 'assistant',
      content: currentText,
      thinking: thinkingSteps.join('\n'),
      model: this.model,
      timestamp: Date.now()
    });
    this.saveHistory();

    onComplete({
      id: assistantMessageId,
      text: currentText,
      thinking: thinkingSteps.join('\n')
    });
  }
}
