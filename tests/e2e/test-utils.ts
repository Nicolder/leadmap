/**
 * LeadMap E2E Test Harness & Assertion Utilities
 * Provides a lightweight, zero-dependency, type-safe testing framework for Next.js E2E tests.
 */

export interface TestResult {
  suite: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: Error;
}

export interface SuiteSummary {
  name: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  results: TestResult[];
}

type TestFn = () => Promise<void> | void;

interface TestCase {
  suite: string;
  name: string;
  fn: TestFn;
}

class TestRegistry {
  private currentSuite: string = 'Default';
  private testCases: TestCase[] = [];
  private beforeEachFns: Array<() => Promise<void> | void> = [];
  private afterEachFns: Array<() => Promise<void> | void> = [];

  describe(name: string, fn: () => void) {
    const prevSuite = this.currentSuite;
    this.currentSuite = name;
    try {
      fn();
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  test(name: string, fn: TestFn) {
    this.testCases.push({
      suite: this.currentSuite,
      name,
      fn,
    });
  }

  beforeEach(fn: () => Promise<void> | void) {
    this.beforeEachFns.push(fn);
  }

  afterEach(fn: () => Promise<void> | void) {
    this.afterEachFns.push(fn);
  }

  clear() {
    this.testCases = [];
    this.beforeEachFns = [];
    this.afterEachFns = [];
    this.currentSuite = 'Default';
  }

  async run(tierName: string = 'Test Suite'): Promise<SuiteSummary> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    console.log(`\n============================================================`);
    console.log(`  RUNNING: ${tierName} (${this.testCases.length} tests)`);
    console.log(`============================================================`);

    for (const tc of this.testCases) {
      const tcStart = Date.now();
      try {
        for (const hook of this.beforeEachFns) {
          await hook();
        }

        await tc.fn();

        for (const hook of this.afterEachFns) {
          await hook();
        }

        const durationMs = Date.now() - tcStart;
        passed++;
        results.push({
          suite: tc.suite,
          name: tc.name,
          status: 'passed',
          durationMs,
        });
        console.log(`  \x1b[32m✓\x1b[0m [${tc.suite}] ${tc.name} \x1b[90m(${durationMs}ms)\x1b[0m`);
      } catch (err: any) {
        const durationMs = Date.now() - tcStart;
        failed++;
        results.push({
          suite: tc.suite,
          name: tc.name,
          status: 'failed',
          durationMs,
          error: err,
        });
        console.log(`  \x1b[31m✗\x1b[0m [${tc.suite}] ${tc.name} \x1b[90m(${durationMs}ms)\x1b[0m`);
        console.log(`    \x1b[31mError:\x1b[0m ${err.message || err}`);
        if (err.stack) {
          const relevantStack = err.stack
            .split('\n')
            .slice(1, 4)
            .map((line: string) => `      ${line.trim()}`)
            .join('\n');
          console.log(`\x1b[90m${relevantStack}\x1b[0m`);
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`------------------------------------------------------------`);
    console.log(
      `  Total: ${this.testCases.length} | \x1b[32mPassed: ${passed}\x1b[0m | \x1b[31mFailed: ${failed}\x1b[0m | Duration: ${(
        totalDuration / 1000
      ).toFixed(2)}s`
    );
    console.log(`============================================================\n`);

    return {
      name: tierName,
      total: this.testCases.length,
      passed,
      failed,
      skipped,
      durationMs: totalDuration,
      results,
    };
  }
}

// Global registry instance
export const registry = new TestRegistry();

export function describe(name: string, fn: () => void) {
  registry.describe(name, fn);
}

export function test(name: string, fn: TestFn) {
  registry.test(name, fn);
}

export function beforeEach(fn: () => Promise<void> | void) {
  registry.beforeEach(fn);
}

export function afterEach(fn: () => Promise<void> | void) {
  registry.afterEach(fn);
}

export function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} (type: ${typeof expected}), but received ${JSON.stringify(actual)} (type: ${typeof actual})`);
      }
    },
    toEqual(expected: any) {
      const actStr = JSON.stringify(actual);
      const expStr = JSON.stringify(expected);
      if (actStr !== expStr) {
        throw new Error(`Expected equal to:\n  ${expStr}\nReceived:\n  ${actStr}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, but received: ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, but received: ${actual}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined, but received undefined`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, but received: ${actual}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (typeof actual !== 'number' || actual < expected) {
        throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (typeof actual !== 'number' || actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected: number) {
      if (typeof actual !== 'number' || actual > expected) {
        throw new Error(`Expected ${actual} to be less than or equal to ${expected}`);
      }
    },
    toContain(expected: any) {
      if (typeof actual === 'string') {
        if (!actual.includes(expected)) {
          throw new Error(`Expected string "${actual}" to contain "${expected}"`);
        }
      } else if (Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(`Expected array ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
        }
      } else if (actual && typeof actual === 'object') {
        if (!(expected in actual)) {
          throw new Error(`Expected object to contain property key "${expected}"`);
        }
      } else {
        throw new Error(`Expected container type for toContain, got ${typeof actual}`);
      }
    },
    toMatch(regex: RegExp | string) {
      const re = typeof regex === 'string' ? new RegExp(regex) : regex;
      if (typeof actual !== 'string' || !re.test(actual)) {
        throw new Error(`Expected string "${actual}" to match pattern ${re}`);
      }
    },
    toThrow(expectedMsg?: string | RegExp) {
      if (typeof actual !== 'function') {
        throw new Error(`Expected a function for toThrow, got ${typeof actual}`);
      }
      let threw = false;
      let thrownError: any = null;
      try {
        actual();
      } catch (err: any) {
        threw = true;
        thrownError = err;
      }
      if (!threw) {
        throw new Error(`Expected function to throw, but it did not throw`);
      }
      if (expectedMsg) {
        const msg = thrownError?.message || String(thrownError);
        if (typeof expectedMsg === 'string' && !msg.includes(expectedMsg)) {
          throw new Error(`Expected error message to include "${expectedMsg}", got "${msg}"`);
        } else if (expectedMsg instanceof RegExp && !expectedMsg.test(msg)) {
          throw new Error(`Expected error message to match ${expectedMsg}, got "${msg}"`);
        }
      }
    },
  };
}
