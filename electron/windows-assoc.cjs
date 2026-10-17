const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function runReg(args) {
  try {
    return spawnSync('reg.exe', args, { encoding: 'utf-8', windowsHide: true });
  } catch (err) {
    return { status: -1, stderr: err.message };
  }
}

function notifyShell() {
  try {
    const ps = 'Add-Type -TypeDefinition "using System; using System.Runtime.InteropServices; public class S { [DllImport(\\\"shell32.dll\\\")] public static extern void SHChangeNotify(int e, int f, IntPtr i1, IntPtr i2); }"; [S]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)';
    spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], { windowsHide: true });
  } catch (err) {
    console.error('[Marko] Shell notify error:', err.message);
  }
}

/**
 * Register Marko in Windows Registry for .md and .markdown files
 * Supports Open With, Default Apps, and context menus.
 */
function registerFileAssociations(customExePath) {
  if (process.platform !== 'win32') return;

  const exePath = customExePath || process.execPath;
  // If running in development with 'electron .', process.execPath points to electron.exe
  const isDev = exePath.toLowerCase().endsWith('electron.exe');
  if (isDev) {
    console.log('[Marko] Dev mode detected, skipping system association override');
    return;
  }

  const normalizedExe = path.resolve(exePath);

  const keys = [
    // 1. Applications\Marko.exe
    ['add', 'HKCU\\Software\\Classes\\Applications\\Marko.exe', '/ve', '/d', 'Marko - Markdown Viewer and Editor', '/f'],
    ['add', 'HKCU\\Software\\Classes\\Applications\\Marko.exe', '/v', 'FriendlyAppName', '/d', 'Marko', '/f'],
    ['add', 'HKCU\\Software\\Classes\\Applications\\Marko.exe', '/v', 'ApplicationDescription', '/d', 'Universal Markdown Viewer and Editor', '/f'],
    ['add', 'HKCU\\Software\\Classes\\Applications\\Marko.exe\\DefaultIcon', '/ve', '/d', `"${normalizedExe}",0`, '/f'],
    ['add', 'HKCU\\Software\\Classes\\Applications\\Marko.exe\\shell\\open\\command', '/ve', '/d', `"${normalizedExe}" "%1"`, '/f'],
    ['add', 'HKCU\\Software\\Classes\\Applications\\Marko.exe\\SupportedTypes', '/v', '.md', '/t', 'REG_SZ', '/d', '', '/f'],
    ['add', 'HKCU\\Software\\Classes\\Applications\\Marko.exe\\SupportedTypes', '/v', '.markdown', '/t', 'REG_SZ', '/d', '', '/f'],

    // 2. Marko.md ProgId
    ['add', 'HKCU\\Software\\Classes\\Marko.md', '/ve', '/d', 'Markdown Document', '/f'],
    ['add', 'HKCU\\Software\\Classes\\Marko.md', '/v', 'FriendlyTypeName', '/d', 'Markdown Document', '/f'],
    ['add', 'HKCU\\Software\\Classes\\Marko.md\\DefaultIcon', '/ve', '/d', `"${normalizedExe}",0`, '/f'],
    ['add', 'HKCU\\Software\\Classes\\Marko.md\\shell\\open\\command', '/ve', '/d', `"${normalizedExe}" "%1"`, '/f'],

    // 3. OpenWithProgids for .md and .markdown
    ['add', 'HKCU\\Software\\Classes\\.md\\OpenWithProgids', '/v', 'Marko.md', '/t', 'REG_SZ', '/d', '', '/f'],
    ['add', 'HKCU\\Software\\Classes\\.markdown\\OpenWithProgids', '/v', 'Marko.md', '/t', 'REG_SZ', '/d', '', '/f'],

    // 4. OpenWithList
    ['add', 'HKCU\\Software\\Classes\\.md\\OpenWithList\\Marko.exe', '/f'],
    ['add', 'HKCU\\Software\\Classes\\.markdown\\OpenWithList\\Marko.exe', '/f'],

    // 5. Capabilities & RegisteredApplications (Windows 10/11 Default Apps list)
    ['add', 'HKCU\\Software\\Marko\\Capabilities', '/v', 'ApplicationName', '/d', 'Marko', '/f'],
    ['add', 'HKCU\\Software\\Marko\\Capabilities', '/v', 'ApplicationDescription', '/d', 'Universal Markdown Viewer and Editor', '/f'],
    ['add', 'HKCU\\Software\\Marko\\Capabilities\\FileAssociations', '/v', '.md', '/d', 'Marko.md', '/f'],
    ['add', 'HKCU\\Software\\Marko\\Capabilities\\FileAssociations', '/v', '.markdown', '/d', 'Marko.md', '/f'],
    ['add', 'HKCU\\Software\\RegisteredApplications', '/v', 'Marko', '/d', 'Software\\Marko\\Capabilities', '/f']
  ];

  for (const k of keys) {
    runReg(k);
  }

  notifyShell();
  console.log('[Marko] Successfully registered file associations in Windows Registry');
}

/**
 * Check if Marko is currently the default handler for .md files
 */
function isDefaultMarkdownViewer() {
  if (process.platform !== 'win32') return false;

  try {
    const res = runReg(['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.md\\UserChoice', '/v', 'ProgId']);
    if (res.status === 0 && res.stdout) {
      const match = res.stdout.match(/ProgId\s+REG_SZ\s+(\S+)/);
      if (match && match[1]) {
        const progId = match[1].toLowerCase();
        if (progId.includes('marko')) {
          return true;
        }
      }
    }
  } catch {}

  // Fallback check in HKCU\Software\Classes\.md
  try {
    const res2 = runReg(['query', 'HKCU\\Software\\Classes\\.md', '/ve']);
    if (res2.status === 0 && res2.stdout) {
      const match = res2.stdout.match(/REG_SZ\s+(\S+)/);
      if (match && match[1] && match[1].toLowerCase().includes('marko')) {
        return true;
      }
    }
  } catch {}

  return false;
}

/**
 * Prompt Windows to set Marko as default handler
 */
function promptSetDefault(customExePath) {
  if (process.platform !== 'win32') return false;

  // 1. Ensure registration is up to date
  registerFileAssociations(customExePath);

  // 2. Set user class association
  runReg(['add', 'HKCU\\Software\\Classes\\.md', '/ve', '/d', 'Marko.md', '/f']);
  runReg(['add', 'HKCU\\Software\\Classes\\.markdown', '/ve', '/d', 'Marko.md', '/f']);
  notifyShell();

  // 3. Create a temporary dummy .md file to invoke Windows "Open With" dialog
  try {
    const tempFile = path.join(os.tmpdir(), 'marko_sample.md');
    if (!fs.existsSync(tempFile)) {
      fs.writeFileSync(tempFile, '# Marko Sample File\nTest markdown file for association.', 'utf-8');
    }

    // Launch OpenAs_RunDLL which displays the native "How do you want to open this file? Always use this app"
    spawn('rundll32.exe', ['shell32.dll,OpenAs_RunDLL', tempFile], {
      detached: true,
      stdio: 'ignore'
    }).unref();
  } catch (err) {
    console.error('[Marko] OpenAs_RunDLL error:', err);
  }

  // Also open Windows Settings > Default Apps for direct access
  try {
    spawn('cmd.exe', ['/c', 'start', 'ms-settings:defaultapps'], {
      detached: true,
      stdio: 'ignore'
    }).unref();
  } catch {}

  return true;
}

module.exports = {
  registerFileAssociations,
  isDefaultMarkdownViewer,
  promptSetDefault
};
