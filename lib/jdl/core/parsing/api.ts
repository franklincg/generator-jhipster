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

import { type CstNode, EOF, type IRecognitionException, type IToken } from 'chevrotain';

import type { ParsedJDLApplications } from '../types/parsed.ts';
import type { JDLRuntime } from '../types/runtime.ts';

import { attachAstLocations } from './ast-locations.ts';
import { buildJDLAstBuilderVisitor } from './jdl-ast-builder-visitor.ts';
import performAdditionalSyntaxChecks from './validator.ts';

type ParseOptions = { startRule?: string };

export type JDLSourcePosition = {
  offset: number;
  line?: number;
  column?: number;
};

export type JDLSourceRange = {
  start: JDLSourcePosition;
  end: JDLSourcePosition;
};

export type JDLDiagnostic = {
  severity: 'error' | 'warning';
  source: 'lexer' | 'parser' | 'syntax' | 'ast';
  ruleId: string;
  message: string;
  range: JDLSourceRange;
};

export type JDLParseResult = {
  ast?: ParsedJDLApplications;
  diagnostics: JDLDiagnostic[];
};

/**
 * Tooling-oriented parser API. It returns a best-effort AST together with
 * structured diagnostics instead of stopping at the first error. Chevrotain
 * recovery is enabled on the runtime parser so editors and linters can keep
 * working with incomplete documents.
 */
export function parse(input: string, runtime: JDLRuntime, options?: ParseOptions): JDLParseResult {
  const { cst, diagnostics } = getCstWithDiagnostics(input, runtime, options);
  let ast: ParsedJDLApplications | undefined;

  try {
    const astBuilderVisitor = buildJDLAstBuilderVisitor(runtime);
    ast = attachAstLocations(astBuilderVisitor.visit(cst) as ParsedJDLApplications, cst);
  } catch (error) {
    diagnostics.push({
      severity: 'error',
      source: 'ast',
      ruleId: 'ast-builder',
      message: error instanceof Error ? error.message : String(error),
      range: rangeAtEnd(input),
    });
  }

  return { ast, diagnostics };
}

/** Backward-compatible explicit name for the diagnostics-returning API. */
export const parseWithDiagnostics = parse;

/**
 * Throwing compatibility wrapper used by generator code and callers that need
 * the historical fail-fast behaviour.
 */
export function parseOrThrow(input: string, runtime: JDLRuntime, options?: ParseOptions): ParsedJDLApplications {
  const cst = getCst(input, runtime, options);
  const astBuilderVisitor = buildJDLAstBuilderVisitor(runtime);
  return astBuilderVisitor.visit(cst) as ParsedJDLApplications;
}

/** Legacy throwing CST API kept for generator compatibility. */
export function getCst(input: string, runtime: JDLRuntime, options?: ParseOptions): CstNode {
  const lexResult = runtime.lexer.tokenize(input);

  if (lexResult.errors.length > 0) {
    throw new Error(lexResult.errors[0].message);
  }

  runtime.parser.input = lexResult.tokens;

  const cst = (runtime.parser as unknown as Record<string, () => CstNode>)[options?.startRule ?? 'prog']();

  if (runtime.parser.errors.length > 0) {
    throwParserError(runtime.parser.errors);
  }

  const extraSyntaxErrors = performAdditionalSyntaxChecks(cst, runtime);

  if (extraSyntaxErrors.length > 0) {
    throwSyntaxError(extraSyntaxErrors);
  }

  return cst;
}

function getCstWithDiagnostics(input: string, runtime: JDLRuntime, options?: ParseOptions) {
  const diagnostics: JDLDiagnostic[] = [];
  const lexResult = runtime.lexer.tokenize(input);

  diagnostics.push(
    ...lexResult.errors.map(error => ({
      severity: 'error' as const,
      source: 'lexer' as const,
      ruleId: 'lexer',
      message: error.message,
      range: rangeFromLexError(error, input),
    })),
  );

  runtime.parser.input = lexResult.tokens;
  const cst = (runtime.parser as unknown as Record<string, () => CstNode>)[options?.startRule ?? 'prog']();

  diagnostics.push(...runtime.parser.errors.map(error => diagnosticFromRecognitionError(error, input, 'parser')));

  try {
    diagnostics.push(
      ...performAdditionalSyntaxChecks(cst, runtime).map(error => diagnosticFromRecognitionError(error, input, 'syntax')),
    );
  } catch (error) {
    diagnostics.push({
      severity: 'error',
      source: 'syntax',
      ruleId: 'syntax-validator',
      message: error instanceof Error ? error.message : String(error),
      range: rangeAtEnd(input),
    });
  }

  return { cst, diagnostics };
}

function diagnosticFromRecognitionError(
  error: IRecognitionException,
  input: string,
  source: 'parser' | 'syntax',
): JDLDiagnostic {
  const context = (error as IRecognitionException & { context?: { ruleStack?: string[] } }).context;
  const ruleId = context?.ruleStack?.at(-1) ?? error.name ?? source;
  return {
    severity: 'error',
    source,
    ruleId,
    message: `${error.name ? `${error.name}: ` : ''}${error.message}`,
    range: rangeFromToken(error.token, input),
  };
}

function rangeFromLexError(error: { offset: number; length: number; line?: number; column?: number }, input: string): JDLSourceRange {
  const startOffset = finiteOr(error.offset, input.length);
  const length = Math.max(1, finiteOr(error.length, 1));
  const endOffset = Math.min(input.length, startOffset + length);
  return {
    start: {
      offset: startOffset,
      ...(error.line === undefined ? {} : { line: error.line }),
      ...(error.column === undefined ? {} : { column: error.column }),
    },
    end: { offset: endOffset },
  };
}

function rangeFromToken(token: IToken, input: string): JDLSourceRange {
  const startOffset = finiteOr(token.startOffset, input.length);
  const inclusiveEndOffset = finiteOr(token.endOffset, startOffset);
  const endOffset = Math.min(input.length, Math.max(startOffset, inclusiveEndOffset + 1));
  return {
    start: {
      offset: startOffset,
      ...(token.startLine === undefined ? {} : { line: token.startLine }),
      ...(token.startColumn === undefined ? {} : { column: token.startColumn }),
    },
    end: {
      offset: endOffset,
      ...(token.endLine === undefined ? {} : { line: token.endLine }),
      ...(token.endColumn === undefined ? {} : { column: token.endColumn }),
    },
  };
}

function rangeAtEnd(input: string): JDLSourceRange {
  return { start: { offset: input.length }, end: { offset: input.length } };
}

function finiteOr(value: number | undefined, fallback: number) {
  return value === undefined || !Number.isFinite(value) ? fallback : value;
}

function throwParserError(errors: IRecognitionException[]) {
  const parserError = errors[0];
  if (parserError.name === 'MismatchedTokenException') {
    throwErrorAboutInvalidToken(parserError);
  }
  const errorMessage = `${parserError.name}: ${parserError.message}`;
  const { token } = parserError;
  const errorMessageLocation = token.tokenType === EOF ? '' : `\n\tat line: ${token.startLine}, column: ${token.startColumn}`;
  throw new Error(`${errorMessage}${errorMessageLocation}`);
}

function throwErrorAboutInvalidToken(parserError: IRecognitionException) {
  const { token } = parserError;
  const errorMessageBeginning = `Found an invalid token '${token.image}'`;
  const errorMessageLocation = token.tokenType === EOF ? '' : `, at line: ${token.startLine} and column: ${token.startColumn}`;
  const errorMessageComplement = 'Please make sure your JDL content does not use invalid characters, keywords or options.';
  throw new Error(`${parserError.name}: ${errorMessageBeginning}${errorMessageLocation}.\n\t${errorMessageComplement}`);
}

function throwSyntaxError(errors: IRecognitionException[]) {
  throw new Error(
    errors.map(error => `${error.message}\n\tat line: ${error.token.startLine}, column: ${error.token.startColumn}`).join('\n'),
  );
}
