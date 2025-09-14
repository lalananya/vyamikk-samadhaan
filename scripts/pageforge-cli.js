#!/usr/bin/env node

/**
 * PageForge CLI - JavaScript version
 * Usage: node scripts/pageforge-cli.js --spec pages/attendance.yaml [--dry] [--force]
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const ejs = require('ejs');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    spec: '',
    dry: false,
    force: false,
    interactive: false
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
  node scripts/pageforge-cli.js --spec <spec-file> [options]

Options:
  --spec <file>     Path to YAML specification file (required)
  --dry            Show what would be generated without creating files
  --force          Overwrite existing files
  --interactive    Prompt for missing fields
  --help, -h       Show this help message

Examples:
  # Dry run
  node scripts/pageforge-cli.js --spec pages/attendance.yaml --dry
  
  # Generate with prompts
  node scripts/pageforge-cli.js --spec pages/attendance.yaml --interactive
  
  # Force overwrite existing files
  node scripts/pageforge-cli.js --spec pages/attendance.yaml --force
`);
}

function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function pluralize(str) {
  if (str.endsWith('ch') || str.endsWith('sh') || str.endsWith('x') || str.endsWith('z')) {
    return str + 'es';
  } else if (str.endsWith('y') && !str.match(/[aeiou]y$/)) {
    return str.slice(0, -1) + 'ies';
  } else if (str.endsWith('f')) {
    return str.slice(0, -1) + 'ves';
  } else if (str.endsWith('fe')) {
    return str.slice(0, -2) + 'ves';
  } else {
    return str + 's';
  }
}

function pascalCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function camelCase(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
}

function getTypeScriptType(field) {
  const typeMap = {
    'string': 'string',
    'number': 'number',
    'boolean': 'boolean',
    'datetime': 'string',
    'time': 'string',
    'date': 'string',
    'money': 'number',
    'enum': 'string',
    'array<string>': 'string[]'
  };
  return typeMap[field.type] || 'any';
}

function getZodType(field) {
  const typeMap = {
    'string': 'z.string()',
    'number': 'z.number()',
    'boolean': 'z.boolean()',
    'datetime': 'z.string().datetime()',
    'time': 'z.string()',
    'date': 'z.string().date()',
    'money': 'z.number().positive()',
    'enum': field.values ? `z.enum([${field.values.map(v => `'${v.replace(/'/g, "\\'")}'`).join(', ')}])` : 'z.string()',
    'array<string>': 'z.array(z.string())'
  };
  return typeMap[field.type] || 'z.any()';
}

function getFieldLabel(field) {
  return field.key.charAt(0).toUpperCase() + field.key.slice(1).replace(/([A-Z])/g, ' $1');
}

function getHindiFieldLabel(field) {
  const labelMap = {
    'ts': 'समय',
    'type': 'प्रकार',
    'note': 'नोट',
    'name': 'नाम',
    'start': 'शुरुआत',
    'end': 'अंत',
    'workers': 'कर्मचारी',
    'userId': 'उपयोगकर्ता आईडी',
    'hours': 'घंटे',
    'otHours': 'ओवरटाइम घंटे',
    'rate': 'दर',
    'deductions': 'कटौती',
    'ecosystemId': 'ईकोसिस्टम आईडी',
    'displayName': 'प्रदर्शन नाम',
    'role': 'भूमिका',
    'to': 'को',
    'amount': 'राशि',
    'text': 'पाठ',
    'start': 'शुरुआत',
    'end': 'अंत'
  };
  return labelMap[field.key] || field.key;
}

function getHindiTitle(spec) {
  const titleMap = {
    'attendance': 'उपस्थिति',
    'shift-planner': 'शिफ्ट प्लानर',
    'payroll': 'वेतन',
    'directory': 'निर्देशिका',
    'payments': 'भुगतान',
    'chat': 'चैट',
    'settings': 'सेटिंग्स',
    'outages': 'बिजली कटौती'
  };
  return titleMap[spec.id] || spec.title;
}

function getEmptyStateIcon(spec) {
  const iconMap = {
    'attendance': 'time',
    'shifts': 'calendar',
    'payroll': 'card',
    'directory': 'people',
    'payments': 'wallet',
    'chat': 'chatbubbles',
    'settings': 'settings',
    'outages': 'flash'
  };
  return iconMap[spec.id] || 'document';
}

function getTestValue(field) {
  const valueMap = {
    'string': '"Test Value"',
    'number': '123',
    'boolean': 'true',
    'datetime': '"2025-09-14T12:00:00Z"',
    'time': '"12:00:00"',
    'date': '"2025-09-14"',
    'money': '100.50',
    'enum': `"${field.values?.[0] || 'VALUE'}"`,
    'array<string>': '["item1", "item2"]'
  };
  return valueMap[field.type] || 'null';
}

function getBodyValidation(endpoint) {
  if (!endpoint.body) return 'z.object({})';
  return 'z.object({})'; // Simplified for now
}

function getQueryValidation(endpoint) {
  if (!endpoint.query) return 'z.object({})';
  return 'z.object({})'; // Simplified for now
}

async function generateFiles(spec, options) {
  const files = [];
  const templatesDir = 'tools/pageforge/templates';

  // Generate mobile screen
  const screenTemplate = fs.readFileSync(path.join(templatesDir, 'screen.ejs'), 'utf8');
  const screenContent = ejs.render(screenTemplate, { 
    spec, 
    kebabCase, 
    pascalCase, 
    getEmptyStateIcon 
  });
  files.push({
    path: `mobile/src/screens/${kebabCase(spec.id)}/${pascalCase(spec.id)}Screen.tsx`,
    content: screenContent
  });

  // Generate API hook
  const apiTemplate = fs.readFileSync(path.join(templatesDir, 'api.ejs'), 'utf8');
  const apiContent = ejs.render(apiTemplate, { 
    spec, 
    kebabCase, 
    pascalCase, 
    getTypeScriptType,
    camelCase 
  });
  files.push({
    path: `mobile/src/api/${kebabCase(spec.id)}.ts`,
    content: apiContent
  });

  // Generate server route
  const serverTemplate = fs.readFileSync(path.join(templatesDir, 'server-route.ejs'), 'utf8');
  const serverContent = ejs.render(serverTemplate, { 
    spec, 
    kebabCase, 
    pascalCase, 
    camelCase,
    pluralize,
    getZodType,
    getBodyValidation,
    getQueryValidation 
  });
  files.push({
    path: `server/routes/${kebabCase(spec.id)}.js`,
    content: serverContent
  });

  // Generate i18n keys
  const i18nEnTemplate = fs.readFileSync(path.join(templatesDir, 'i18n-en.ejs'), 'utf8');
  const i18nEnContent = ejs.render(i18nEnTemplate, { 
    spec, 
    kebabCase, 
    getFieldLabel 
  });
  files.push({
    path: `mobile/src/i18n/en.json`,
    content: i18nEnContent
  });

  const i18nHiTemplate = fs.readFileSync(path.join(templatesDir, 'i18n-hi.ejs'), 'utf8');
  const i18nHiContent = ejs.render(i18nHiTemplate, { 
    spec, 
    kebabCase, 
    getHindiFieldLabel,
    getHindiTitle 
  });
  files.push({
    path: `mobile/src/i18n/hi.json`,
    content: i18nHiContent
  });

  // Generate test
  const testTemplate = fs.readFileSync(path.join(templatesDir, 'test.ejs'), 'utf8');
  const testContent = ejs.render(testTemplate, { 
    spec, 
    kebabCase, 
    pascalCase, 
    getTestValue 
  });
  files.push({
    path: `tests/${kebabCase(spec.id)}.test.ts`,
    content: testContent
  });

  return files;
}

async function writeFile(filePath, content, force = false) {
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!force && fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping existing file: ${filePath}`);
    return;
  }

  fs.writeFileSync(filePath, content);
  console.log(`✅ Generated: ${filePath}`);
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

    // Load spec
    const specContent = fs.readFileSync(args.spec, 'utf8');
    const spec = yaml.load(specContent);

    const files = await generateFiles(spec, args);
    
    if (args.dry) {
      console.log('DRY RUN - Files that would be generated:');
      files.forEach(file => console.log(`  ${file.path}`));
      return;
    }

    for (const file of files) {
      await writeFile(file.path, file.content, args.force);
    }

    console.log('');
    console.log('✅ Generation complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Install dependencies: npm install');
    console.log('2. Start server: cd server && node index.js');
    console.log('3. Start mobile: npx expo start');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
