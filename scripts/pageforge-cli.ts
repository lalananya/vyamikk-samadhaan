#!/usr/bin/env node

/**
 * PageForge CLI
 * Usage: node scripts/pageforge-cli.ts --spec pages/attendance.yaml [--dry] [--force] [--interactive]
 */

import * as fs from 'fs';
import * as path from 'path';
import { PageForge } from '../tools/pageforge/pageforge';

interface CLIArgs {
  spec: string;
  dry?: boolean;
  force?: boolean;
  interactive?: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsed: CLIArgs = {
    spec: ''
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--spec' && i + 1 < args.length) {
      parsed.spec = args[i + 1];
      i++;
    } else if (arg === '--dry') {
      parsed.dry = true;
    } else if (arg === '--force') {
      parsed.force = true;
    } else if (arg === '--interactive') {
      parsed.interactive = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!parsed.spec) {
    console.error('❌ Error: --spec is required');
    printHelp();
    process.exit(1);
  }

  return parsed;
}

function printHelp() {
  console.log(`
PageForge CLI - Template-driven scaffolder for Expo React Native + Express

Usage:
  node scripts/pageforge-cli.ts --spec <spec-file> [options]

Options:
  --spec <file>     Path to YAML specification file (required)
  --dry            Show what would be generated without creating files
  --force          Overwrite existing files
  --interactive    Prompt for missing fields
  --help, -h       Show this help message

Examples:
  # Dry run
  node scripts/pageforge-cli.ts --spec pages/attendance.yaml --dry
  
  # Generate with prompts
  node scripts/pageforge-cli.ts --spec pages/attendance.yaml --interactive
  
  # Force overwrite existing files
  node scripts/pageforge-cli.ts --spec pages/attendance.yaml --force
`);
}

async function main() {
  try {
    const args = parseArgs();
    
    // Check if spec file exists
    if (!fs.existsSync(args.spec)) {
      console.error(`❌ Error: Specification file not found: ${args.spec}`);
      process.exit(1);
    }

    console.log(`🚀 PageForge CLI`);
    console.log(`📄 Spec: ${args.spec}`);
    console.log(`🔧 Options: ${JSON.stringify(args, null, 2)}`);
    console.log('');

    const pageForge = new PageForge();
    await pageForge.generateFromSpec(args.spec, args);

    if (!args.dry) {
      console.log('');
      console.log('✅ Generation complete!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Install dependencies: npm install');
      console.log('2. Start server: cd server && node index.js');
      console.log('3. Start mobile: npx expo start');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
