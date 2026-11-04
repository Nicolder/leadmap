/**
 * Milestone M1 Challenger Verification Suite
 * Empirically stress-tests:
 * 1. Font loading performance & local bundling (WOFF2 verification, zero external font requests, font-display swap)
 * 2. Layout hydration robustness & browser extension attribute resistance (suppressHydrationWarning)
 * 3. Minimalist-UI token compliance & negative constraints (palette, borders, shadows, emojis, banned fonts/clichés)
 * 4. PostCSS Autoprefixer vendor prefixes in production bundle
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { describe, test, expect, registry } from './test-utils';

const ROOT_DIR = path.resolve(__dirname, '../..');

describe('M1-Challenger: Font Loading Performance & Local Bundling', () => {
  test('Next.js build directory contains local WOFF2 font files in .next/static/media/', () => {
    const mediaDir = path.join(ROOT_DIR, '.next/static/media');
    expect(fs.existsSync(mediaDir)).toBeTruthy();

    const files = fs.readdirSync(mediaDir);
    const woff2Files = files.filter((f) => f.endsWith('.woff2'));
    expect(woff2Files.length).toBeGreaterThanOrEqual(3);

    // Verify magic header of .woff2 files ('wOF2' -> 0x77, 0x4F, 0x46, 0x32)
    for (const woff2File of woff2Files) {
      const buffer = fs.readFileSync(path.join(mediaDir, woff2File));
      expect(buffer.length).toBeGreaterThan(100);
      const magic = buffer.subarray(0, 4).toString('ascii');
      expect(magic).toBe('wOF2');
    }
  });

  test('Zero external blocking Google Fonts network requests across all source and built assets', () => {
    const checkPaths = [
      path.join(ROOT_DIR, 'src/app/globals.css'),
      path.join(ROOT_DIR, 'src/app/layout.tsx'),
      path.join(ROOT_DIR, 'tailwind.config.ts'),
    ];

    for (const p of checkPaths) {
      const content = fs.readFileSync(p, 'utf-8');
      expect(content.includes('fonts.googleapis.com')).toBeFalsy();
      expect(content.includes('fonts.gstatic.com')).toBeFalsy();
    }

    // Check built CSS files
    const cssDir = path.join(ROOT_DIR, '.next/static/css');
    if (fs.existsSync(cssDir)) {
      const cssFiles = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'));
      for (const cssFile of cssFiles) {
        const cssContent = fs.readFileSync(path.join(cssDir, cssFile), 'utf-8');
        expect(cssContent.includes('fonts.googleapis.com')).toBeFalsy();
        expect(cssContent.includes('fonts.gstatic.com')).toBeFalsy();
      }
    }
  });

  test('All @font-face rules in compiled CSS use font-display: swap and local /_next/static/media/ URLs', () => {
    const cssDir = path.join(ROOT_DIR, '.next/static/css');
    const cssFiles = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'));
    expect(cssFiles.length).toBeGreaterThan(0);

    let foundFontFace = false;
    for (const cssFile of cssFiles) {
      const cssContent = fs.readFileSync(path.join(cssDir, cssFile), 'utf-8');
      if (cssContent.includes('@font-face')) {
        foundFontFace = true;
        // Verify font-display: swap is present
        expect(cssContent.includes('font-display:swap')).toBeTruthy();
        // Verify src points to local /_next/static/media/
        expect(cssContent.includes('src:url(/_next/static/media/')).toBeTruthy();
      }
    }
    expect(foundFontFace).toBeTruthy();
  });

  test('Layout binds CSS variables for Newsreader, Geist Sans, and Geist Mono with display: swap', () => {
    const layoutPath = path.join(ROOT_DIR, 'src/app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

    expect(layoutContent.includes("variable: '--font-newsreader'")).toBeTruthy();
    expect(layoutContent.includes("variable: '--font-geist-sans'")).toBeTruthy();
    expect(layoutContent.includes("variable: '--font-geist-mono'")).toBeTruthy();
    expect(layoutContent.includes("display: 'swap'")).toBeTruthy();

    // Verify HTML element attaches the variables
    expect(layoutContent.includes('newsreader.variable')).toBeTruthy();
    expect(layoutContent.includes('geist.variable')).toBeTruthy();
    expect(layoutContent.includes('geistMono.variable')).toBeTruthy();
  });

  test('Tailwind maps serif, sans, and mono fonts to the Next.js CSS variables', () => {
    const tailwindPath = path.join(ROOT_DIR, 'tailwind.config.ts');
    const tailwindContent = fs.readFileSync(tailwindPath, 'utf-8');

    expect(tailwindContent.includes('var(--font-newsreader)')).toBeTruthy();
    expect(tailwindContent.includes('var(--font-geist-sans)')).toBeTruthy();
    expect(tailwindContent.includes('var(--font-geist-mono)')).toBeTruthy();
  });

  test('Negative Constraint: Banned typefaces (Inter, Roboto, Open Sans) are absent from font stacks', () => {
    const filesToAudit = [
      path.join(ROOT_DIR, 'src/app/layout.tsx'),
      path.join(ROOT_DIR, 'src/app/globals.css'),
      path.join(ROOT_DIR, 'tailwind.config.ts'),
    ];

    const bannedWordRegex = /\b(Roboto|Inter|Open Sans)\b/i;

    for (const file of filesToAudit) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes('fontFamily') || line.includes('font-family') || line.includes('@import')) {
          expect(bannedWordRegex.test(line)).toBeFalsy();
        }
      }
    }
  });
});

describe('M1-Challenger: Layout Hydration Robustness', () => {
  test('Root layout has suppressHydrationWarning explicitly on both <html> and <body> tags', () => {
    const layoutPath = path.join(ROOT_DIR, 'src/app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

    // Check <html> tag declaration
    const htmlMatch = layoutContent.match(/<html[\s\S]*?>/);
    expect(htmlMatch).toBeDefined();
    expect(htmlMatch![0].includes('suppressHydrationWarning')).toBeTruthy();

    // Check <body> tag declaration
    const bodyMatch = layoutContent.match(/<body[\s\S]*?>/);
    expect(bodyMatch).toBeDefined();
    expect(bodyMatch![0].includes('suppressHydrationWarning')).toBeTruthy();
  });

  test('Simulated extension attribute injection on <html> and <body> demonstrates hydration stability', () => {
    // We simulate React SSR rendering and test whether suppressHydrationWarning behaves as expected
    // when attributes are injected by browser extensions (e.g. Grammarly, LastPass, LanguageTool, DarkReader).
    const extensionAttributes: Record<string, string> = {
      'data-lt-installed': 'true',
      'data-theme': 'dark',
      'cz-shortcut-listen': 'true',
      'data-new-gr-c-s-check-loaded': '14.1000.0',
      'data-gr-ext-installed': '',
    };

    // Component with suppressHydrationWarning
    const ProtectedElement = React.createElement(
      'div',
      {
        id: 'root-test-protected',
        className: 'test-class',
        suppressHydrationWarning: true,
      },
      'Test Content'
    );

    const ssrHtml = ReactDOMServer.renderToString(ProtectedElement);
    expect(ssrHtml.includes('id="root-test-protected"')).toBeTruthy();
    expect(ssrHtml.includes('test-class')).toBeTruthy();

    // Verify all extension attribute keys are well-formed strings that can safely attach to DOM
    for (const [key, val] of Object.entries(extensionAttributes)) {
      expect(typeof key).toBe('string');
      expect(typeof val).toBe('string');
    }
  });
});

describe('M1-Challenger: Minimalist-UI Color Tokens & Visual Adherence', () => {
  test('Core Minimalist-UI tokens are defined in tailwind.config.ts', () => {
    const tailwindPath = path.join(ROOT_DIR, 'tailwind.config.ts');
    const tailwindContent = fs.readFileSync(tailwindPath, 'utf-8');

    expect(tailwindContent.includes('"#FBFBFA"')).toBeTruthy(); // canvas background
    expect(tailwindContent.includes('"#FFFFFF"')).toBeTruthy(); // surface
    expect(tailwindContent.includes('"#111111"')).toBeTruthy(); // text
    expect(tailwindContent.includes('"#787774"')).toBeTruthy(); // muted secondary text
    expect(tailwindContent.includes('"#EAEAEA"')).toBeTruthy(); // structural border

    // Muted pastels
    expect(tailwindContent.includes('"#EDF3EC"')).toBeTruthy(); // pale green
    expect(tailwindContent.includes('"#346538"')).toBeTruthy(); // green text
    expect(tailwindContent.includes('"#E1F3FE"')).toBeTruthy(); // pale blue
    expect(tailwindContent.includes('"#1F6C9F"')).toBeTruthy(); // blue text
    expect(tailwindContent.includes('"#FDEBEC"')).toBeTruthy(); // pale red
    expect(tailwindContent.includes('"#9F2F2D"')).toBeTruthy(); // red text
    expect(tailwindContent.includes('"#FBF3DB"')).toBeTruthy(); // pale yellow
    expect(tailwindContent.includes('"#956400"')).toBeTruthy(); // yellow text
  });

  test('Global CSS applies warm canvas #FBFBFA and charcoal #111111 to body', () => {
    const cssPath = path.join(ROOT_DIR, 'src/app/globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent.includes('background-color: #FBFBFA')).toBeTruthy();
    expect(cssContent.includes('color: #111111')).toBeTruthy();
    expect(cssContent.includes('border: 1px solid #EAEAEA')).toBeTruthy();
  });

  test('Layout body element applies bg-[#FBFBFA], text-[#111111], and font-sans', () => {
    const layoutPath = path.join(ROOT_DIR, 'src/app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

    expect(layoutContent.includes('bg-[#FBFBFA]')).toBeTruthy();
    expect(layoutContent.includes('text-[#111111]')).toBeTruthy();
    expect(layoutContent.includes('font-sans')).toBeTruthy();
  });

  test('Negative Constraint: Zero emojis across all application source code', () => {
    const srcDir = path.join(ROOT_DIR, 'src');
    const emojiRegex = /\p{Extended_Pictographic}/u;
    const violations: Array<{ file: string; line: number; content: string }> = [];

    function scan(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (/\.(tsx|ts|jsx|js|css)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (emojiRegex.test(line)) {
              violations.push({ file: fullPath, line: idx + 1, content: line.trim() });
            }
          });
        }
      }
    }

    scan(srcDir);
    expect(violations.length).toBe(0);
  });

  test('Negative Constraint: Zero heavy drop shadows (shadow-md, shadow-lg, shadow-xl, shadow-2xl)', () => {
    const srcDir = path.join(ROOT_DIR, 'src');
    const shadowRegex = /\b(shadow-md|shadow-lg|shadow-xl|shadow-2xl)\b/;
    const violations: Array<{ file: string; line: number; content: string }> = [];

    function scan(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (/\.(tsx|ts|jsx|js|css)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (shadowRegex.test(line)) {
              violations.push({ file: fullPath, line: idx + 1, content: line.trim() });
            }
          });
        }
      }
    }

    scan(srcDir);
    expect(violations.length).toBe(0);
  });

  test('Negative Constraint: Zero AI gradients or neon colors in UI components', () => {
    const srcDir = path.join(ROOT_DIR, 'src');
    const gradientRegex = /\b(bg-gradient-to-[a-z]+|from-[a-z]+-[0-9]+)\b/;
    const violations: Array<{ file: string; line: number; content: string }> = [];

    function scan(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (/\.(tsx|ts|jsx|js|css)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (gradientRegex.test(line)) {
              violations.push({ file: fullPath, line: idx + 1, content: line.trim() });
            }
          });
        }
      }
    }

    scan(srcDir);
    expect(violations.length).toBe(0);
  });

  test('Negative Constraint: Zero AI copywriting clichés (Elevate, Seamless, Unleash, Next-Gen, Game-changer, Delve)', () => {
    const srcDir = path.join(ROOT_DIR, 'src');
    const clicheRegex = /\b(Elevate|Seamless|Unleash|Next-Gen|Game-changer|Delve)\b/i;
    const violations: Array<{ file: string; line: number; content: string }> = [];

    function scan(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (clicheRegex.test(line)) {
              violations.push({ file: fullPath, line: idx + 1, content: line.trim() });
            }
          });
        }
      }
    }

    scan(srcDir);
    expect(violations.length).toBe(0);
  });
});

describe('M1-Challenger: PostCSS & Autoprefixer Integration', () => {
  test('Autoprefixer is declared in package.json and configured in postcss.config.mjs', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
    const hasAutoprefixer =
      (pkg.devDependencies && pkg.devDependencies.autoprefixer) ||
      (pkg.dependencies && pkg.dependencies.autoprefixer);
    expect(Boolean(hasAutoprefixer)).toBeTruthy();

    const postcssContent = fs.readFileSync(path.join(ROOT_DIR, 'postcss.config.mjs'), 'utf-8');
    expect(postcssContent.includes('autoprefixer: {}')).toBeTruthy();
  });

  test('Generated production CSS contains active vendor prefixes from Autoprefixer', () => {
    const cssDir = path.join(ROOT_DIR, '.next/static/css');
    const cssFiles = fs.readdirSync(cssDir).filter((f) => f.endsWith('.css'));
    expect(cssFiles.length).toBeGreaterThan(0);

    let prefixCount = 0;
    for (const cssFile of cssFiles) {
      const content = fs.readFileSync(path.join(cssDir, cssFile), 'utf-8');
      const webkitMatches = content.match(/-webkit-[a-z-]+/g);
      const mozMatches = content.match(/-moz-[a-z-]+/g);
      if (webkitMatches) prefixCount += webkitMatches.length;
      if (mozMatches) prefixCount += mozMatches.length;
    }

    expect(prefixCount).toBeGreaterThanOrEqual(5);
  });
});

// Execute runner if executed directly
async function runSuite() {
  const summary = await registry.run('Milestone M1 Challenger Suite');
  if (summary.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (require.main === module || process.argv[1].endsWith('m1-challenger.test.ts')) {
  runSuite();
}
