import { execSync } from 'child_process';

const VERSION = '1.3.0';
const TAG = `v${VERSION}`;

function run(cmd, options = {}) {
  try {
    return execSync(cmd, { stdio: 'inherit', encoding: 'utf8', ...options });
  } catch (err) {
    if (options.ignoreError) return '';
    console.error(`[Error executing: ${cmd}]`);
    throw err;
  }
}

console.log('==============================================');
console.log(`  🚀 Marko Release Publisher — ${TAG}`);
console.log('==============================================\n');

// 1. Stage and commit all pending files
console.log('[1/4] Staging and committing changes...');
try {
  run('git add .');
  const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (status) {
    run(`git commit -m "feat: Marko v${VERSION} - Zen Fullscreen, Live Updates, Reading Hub & Automated Releases"`);
    console.log('✓ Changes committed successfully.');
  } else {
    console.log('✓ Working tree is already clean.');
  }
} catch (e) {
  console.log('Notice during commit:', e.message);
}

// 2. Manage tag locally
console.log(`\n[2/4] Creating tag ${TAG}...`);
run(`git tag -d ${TAG}`, { ignoreError: true, stdio: 'pipe' });
run(`git tag -a ${TAG} -m "Release Marko ${TAG}"`);
console.log(`✓ Git tag ${TAG} created.`);

// 3. Push to origin main
console.log('\n[3/4] Pushing commits to GitHub main branch...');
run('git push origin main');
console.log('✓ Branch main pushed.');

// 4. Push tag to origin
console.log(`\n[4/4] Pushing tag ${TAG} to GitHub...`);
run(`git push origin ${TAG} --force`);
console.log(`✓ Tag ${TAG} pushed.`);

console.log('\n===========================================================');
console.log(` 🎉 SUCCESS: Release ${TAG} initiated!`);
console.log(' GitHub Actions is now automatically building & releasing:');
console.log(' https://github.com/UXxArunjay/Marko---Markdown-.md-file-Viewer-and-editor/actions');
console.log(' Once ready, your release will be published at:');
console.log(' https://github.com/UXxArunjay/Marko---Markdown-.md-file-Viewer-and-editor/releases');
console.log('===========================================================\n');
