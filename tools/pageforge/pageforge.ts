/**
 * PageForge - Template-driven scaffolder for Expo React Native + Express
 * Generates screens, routes, API hooks, i18n strings, and tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as ejs from 'ejs';

export interface PageSpec {
  id: string;
  route: string;
  title: string;
  roles: string[];
  entities: EntitySpec[];
  api: ApiSpec;
  ui: UISpec;
  socket?: SocketSpec;
  copy?: CopySpec;
  hints?: string[];
  calculation?: CalculationSpec;
}

export interface EntitySpec {
  name: string;
  fields: FieldSpec[];
}

export interface FieldSpec {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'datetime' | 'time' | 'date' | 'money' | 'enum' | 'array<string>';
  required: boolean;
  max?: number;
  values?: string[];
}

export interface ApiSpec {
  base: string;
  endpoints: EndpointSpec[];
}

export interface EndpointSpec {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: Record<string, any>;
  query?: Record<string, any>;
  auth: boolean;
}

export interface UISpec {
  features: string[];
  emptyState?: CopySpec;
}

export interface SocketSpec {
  room: string;
}

export interface CopySpec {
  en: string;
  hi: string;
}

export interface CalculationSpec {
  rounding: string;
  constraints: string[];
}

export class PageForge {
  private templatesDir: string;
  private outputDir: string;

  constructor(templatesDir: string = 'tools/pageforge/templates', outputDir: string = '.') {
    this.templatesDir = templatesDir;
    this.outputDir = outputDir;
  }

  async generateFromSpec(specPath: string, options: { dry?: boolean; force?: boolean; interactive?: boolean } = {}) {
    const spec = await this.loadSpec(specPath);
    
    if (options.interactive) {
      await this.promptForMissingFields(spec);
    }

    const files = await this.generateFiles(spec, options);
    
    if (options.dry) {
      console.log('DRY RUN - Files that would be generated:');
      files.forEach(file => console.log(`  ${file.path}`));
      return;
    }

    for (const file of files) {
      await this.writeFile(file.path, file.content, options.force);
    }

    console.log(`✅ Generated ${files.length} files for ${spec.id}`);
  }

  private async loadSpec(specPath: string): Promise<PageSpec> {
    const content = fs.readFileSync(specPath, 'utf8');
    return yaml.load(content) as PageSpec;
  }

  private async promptForMissingFields(spec: PageSpec): Promise<void> {
    // Interactive prompts would go here
    // For now, we'll use defaults
  }

  private async generateFiles(spec: PageSpec, options: any): Promise<Array<{ path: string; content: string }>> {
    const files: Array<{ path: string; content: string }> = [];

    // Generate mobile screen
    const screenContent = await this.renderTemplate('screen.ejs', { spec });
    files.push({
      path: `mobile/src/screens/${this.kebabCase(spec.id)}/${this.pascalCase(spec.id)}Screen.tsx`,
      content: screenContent
    });

    // Generate API hook
    const apiContent = await this.renderTemplate('api.ejs', { spec });
    files.push({
      path: `mobile/src/api/${this.kebabCase(spec.id)}.ts`,
      content: apiContent
    });

    // Generate server route
    const serverContent = await this.renderTemplate('server-route.ejs', { spec });
    files.push({
      path: `server/routes/${this.kebabCase(spec.id)}.js`,
      content: serverContent
    });

    // Generate i18n keys
    const i18nEnContent = await this.renderTemplate('i18n-en.ejs', { spec });
    files.push({
      path: `mobile/src/i18n/en.json`,
      content: i18nEnContent
    });

    const i18nHiContent = await this.renderTemplate('i18n-hi.ejs', { spec });
    files.push({
      path: `mobile/src/i18n/hi.json`,
      content: i18nHiContent
    });

    // Generate test
    const testContent = await this.renderTemplate('test.ejs', { spec });
    files.push({
      path: `tests/${this.kebabCase(spec.id)}.test.ts`,
      content: testContent
    });

    return files;
  }

  private async renderTemplate(templateName: string, data: any): Promise<string> {
    const templatePath = path.join(this.templatesDir, templateName);
    const template = fs.readFileSync(templatePath, 'utf8');
    return ejs.render(template, data);
  }

  private async writeFile(filePath: string, content: string, force: boolean = false): Promise<void> {
    const fullPath = path.join(this.outputDir, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!force && fs.existsSync(fullPath)) {
      console.log(`⚠️  Skipping existing file: ${filePath}`);
      return;
    }

    fs.writeFileSync(fullPath, content);
    console.log(`✅ Generated: ${filePath}`);
  }

  private kebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  private pascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
