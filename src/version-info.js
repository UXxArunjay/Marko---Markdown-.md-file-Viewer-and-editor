/**
 * Marko Application Version & Release Information
 * Central source of truth for versioning, changelog, and update checks.
 */

export const APP_INFO = {
  name: 'Marko',
  version: '1.3.0',
  releaseDate: 'October 2026',
  channel: 'Stable Channel',
  tagline: 'High-performance cross-platform Markdown (.md) Viewer & Editor',
  author: 'Arunjay Patel',
  authorUrl: 'https://github.com/UXxArunjay',
  repoUrl: 'https://github.com/UXxArunjay/Marko---Markdown-.md-file-Viewer-and-editor',
  releasesUrl: 'https://github.com/UXxArunjay/Marko---Markdown-.md-file-Viewer-and-editor/releases',
  latestReleaseUrl: 'https://github.com/UXxArunjay/Marko---Markdown-.md-file-Viewer-and-editor/releases/latest',
  releasesApiUrl: 'https://api.github.com/repos/UXxArunjay/Marko---Markdown-.md-file-Viewer-and-editor/releases/latest',
  issuesUrl: 'https://github.com/UXxArunjay/Marko---Markdown-.md-file-Viewer-and-editor/issues',
  license: 'MIT',
  techStack: [
    { name: 'Electron', version: '44.5' },
    { name: 'Capacitor', version: '8.5' },
    { name: 'Vite', version: '8.3' },
    { name: 'KaTeX (Math)', version: '0.19' },
    { name: 'Mermaid.js', version: '12.1' },
    { name: 'Highlight.js', version: '11.12' },
    { name: 'Marked (GFM)', version: '18.1' },
    { name: 'DOMPurify', version: '3.4' }
  ],
  changelog: [
    {
      version: '1.3.0',
      date: 'October 2026',
      isLatest: true,
      title: 'Zen Fullscreen, About & Update Center, and Reading Enhancements',
      highlights: [
        'Single-Tap Zen Fullscreen Mode: Tap anywhere in reading view to instantly enter distraction-free full screen; tap again to restore controls.',
        'Dedicated About Marko & Update Center: Interactive modal showing full version specs, technology stack, and full changelog history.',
        'Live "Check for Updates" Button: Real-time query to GitHub Releases API to notify you of newer releases with 1-click download.',
        'Reading Progress Bar: Ultra-slim top accent scroll indicator tracking your position from 0% to 100%.',
        'Typography & Appearance Customizer: Easily switch between Modern Sans, Literary Serif, and Monospace fonts, adjust font size and reading column width.',
        'Auto-Save Draft Protection: Automatic background persistence prevents lost work if the app closes unexpectedly.',
        'Automated GitHub Releases Pipeline: CI/CD workflow (.github/workflows/release.yml) to automatically compile Windows installers and Android APKs with zero git push file-size errors.'
      ]
    },
    {
      version: '1.2.0',
      date: 'October 2026',
      isLatest: false,
      title: 'Mobile Native Overhaul & Adaptive Scrollbars',
      highlights: [
        'Left Slide-Over TOC Drawer: Off-canvas table of contents with frosted glass backdrop blur.',
        'Thumb-Zone Bottom Navigation: 5 quick-access tabs (View, Edit, Save, Claude AI, More).',
        'Mobile Slide-Up Action Sheet: 3x3 touch grid for New Doc, File Open, Find, Outline, PDF Export, and Themes.',
        'Keyboard-Aware Touch Toolbar: Horizontally scrollable formatting bar above mobile keyboard.',
        'Universal Themed Slim Scrollbars: Sleek pill scrollbars adapting to Dark, Light, and Sepia modes.'
      ]
    },
    {
      version: '1.1.0',
      date: 'October 2026',
      isLatest: false,
      title: 'Claude AI Assistant & Windows File Association',
      highlights: [
        'Claude 3.7 Sonnet & 3.5 Haiku direct Anthropic API integration.',
        'Extended Thinking (Long Think) toggle for multi-step reasoning.',
        'Visual Line Diff Viewer before applying AI-generated modifications.',
        'Native Windows file associations (.md, .markdown) with double-click support and context menu integration.'
      ]
    },
    {
      version: '1.0.0',
      date: 'October 2026',
      isLatest: false,
      title: 'Initial Marko Release',
      highlights: [
        'Reading-first philosophy: Markdown documents open in View Mode by default.',
        'Zero-latency KaTeX mathematical formula rendering.',
        'Native Mermaid diagrams rendering flowcharts, architecture charts, and sequence diagrams.',
        'Syntax highlighting with 100+ languages, code copy buttons, and GFM alert callouts.'
      ]
    }
  ]
};

/**
 * Checks GitHub Releases API for newer versions
 * @returns {Promise<{ hasUpdate: boolean, latestVersion: string, releaseUrl: string, publishedAt: string, error?: string }>}
 */
export async function checkForAppUpdates() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(APP_INFO.releasesApiUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        // No official releases published yet
        return {
          hasUpdate: false,
          latestVersion: APP_INFO.version,
          releaseUrl: APP_INFO.releasesUrl,
          publishedAt: APP_INFO.releaseDate,
          isCurrentLatest: true,
          message: 'You are running the latest version (no newer releases published).'
        };
      }
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const data = await response.json();
    const remoteTag = (data.tag_name || '').replace(/^v/, '').trim();
    const currentVer = APP_INFO.version.replace(/^v/, '').trim();

    const isNewer = compareSemVer(remoteTag, currentVer) > 0;

    return {
      hasUpdate: isNewer,
      latestVersion: data.tag_name || remoteTag,
      currentVersion: APP_INFO.version,
      releaseUrl: data.html_url || APP_INFO.latestReleaseUrl,
      publishedAt: data.published_at ? new Date(data.published_at).toLocaleDateString() : 'Recent',
      releaseNotes: data.body || '',
      assets: data.assets || []
    };
  } catch (err) {
    console.warn('[Marko] Update check notice:', err.message);
    return {
      hasUpdate: false,
      error: err.message,
      releaseUrl: APP_INFO.releasesUrl
    };
  }
}

/**
 * Basic SemVer comparator
 */
function compareSemVer(a, b) {
  if (!a || !b) return 0;
  const partsA = a.split('.').map(n => parseInt(n, 10) || 0);
  const partsB = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}
