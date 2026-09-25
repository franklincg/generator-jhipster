/**
 * Copyright 2013-2026 the original author or authors from the JHipster project.
 *
 * Licensed under the Apache License, Version 2.0.
 */
import { describe, expect, it } from 'esmocha';

import { getDefaultRuntime } from '../../../jdl-config/jdl-runtime.ts';

import { parse, parseOrThrow, parseWithDiagnostics } from './api.ts';

describe('jdl - diagnostics parser API', () => {
  const jdlRuntime = getDefaultRuntime();

  it('returns an AST and no diagnostics for valid input', () => {
    const result = parse('entity Person { name String }', jdlRuntime);

    expect(result.diagnostics).toEqual([]);
    expect(result.ast?.entities).toHaveLength(1);
  });

  it('keeps parseWithDiagnostics as an alias for the public parse contract', () => {
    expect(parseWithDiagnostics).toBe(parse);
  });

  it('reports lexer errors with source ranges without throwing', () => {
    const result = parse('entity ± {', jdlRuntime);
    const diagnostic = result.diagnostics.find(item => item.source === 'lexer')!;

    expect(diagnostic).toBeDefined();
    expect(diagnostic.message).toContain('±');
    expect(diagnostic.range.start.offset).toBe(7);
  });

  it('reports parser errors with a rule id and range', () => {
    const result = parse('entity Person { ]', jdlRuntime);
    const diagnostic = result.diagnostics.find(item => item.source === 'parser')!;

    expect(diagnostic).toBeDefined();
    expect(diagnostic.ruleId).toBeTruthy();
    expect(diagnostic.range.start.line).toBe(1);
  });

  it('keeps the fail-fast parser available to generator callers', () => {
    expect(() => parseOrThrow('entity Person { ]', jdlRuntime)).toThrow();
  });
});
