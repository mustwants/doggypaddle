const { execSync } = require('child_process');
const { readdirSync, statSync } = require('fs');
const { join } = require('path');

function getFunctionFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFunctionFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  const functionDir = 'netlify/functions';
  let passed = 0;
  let checked = 0;

  try {
    const stats = statSync(functionDir);
    if (!stats.isDirectory()) {
      console.log('No Netlify functions to lint.');
      return;
    }
  } catch (error) {
    console.log('No Netlify functions to lint.');
    return;
  }

  const files = getFunctionFiles(functionDir);
  if (files.length === 0) {
    console.log('No Netlify function files found.');
    return;
  }

  for (const file of files) {
    checked += 1;
    try {
      execSync(`node --check ${file}`, { stdio: 'inherit' });
      passed += 1;
    } catch (error) {
      console.error(`Syntax check failed for ${file}`);
      process.exit(1);
    }
  }

  console.log(`Lint completed. ${passed}/${checked} files passed syntax checks.`);
}

main();
