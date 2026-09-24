/**
 * Copyright 2013-2026 the original author or authors from the JHipster project.
 *
 * This file is part of the JHipster project, see https://www.jhipster.tech/
 * for more information.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
    expect(result.ast?.entities[0].name).toBe('Person');
  });

  it('keeps parseWithDiagnostics as an alias for the public parse contract', () => {
    expect(parseWithDiagnostics).toBe(parse);
  });

  it('reports lexer errors with source ranges without throwing', () => {
    const result = parse('entity ± {', jdlRuntime);

    expect(result.diagnostics.some(diagnostic => diagnostic.source === 'lexer')).toBe(true);
    const diagnostic = result.diagnostics.find(diagnostic => diagnostic.source === 'lexer')!;
    expect(diagnostic.message).toContain('±');
    expect(diagnostic.range.start.offset).toBe(7);
  });

  it('reports parser errors with a rule id and range', () => {
    const result = parse('entity Person { ]', jdlRuntime);

    const diagnostic = result.diagnostics.find(diagnostic => diagnostic.source === 'parser')!;
    expect(diagnostic).toBeDefined();
    expect(diagnostic.ruleId).toBeTruthy();
    expect(diagnostic.range.start.line).toBe(1);
  });

  it('keeps the fail-fast parser available to generator callers', () => {
    expect(() => parseOrThrow('entity Person { ]', jdlRuntime)).toThrow();
  });
});
