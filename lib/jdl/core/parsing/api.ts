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

import { buildJDLAstBuilderVisitor } from './jdl-ast-builder-visitor.ts';
import JDLParser from './jdl-parser.ts';
import type { ParsedJDLApplications } from './types/parsed.ts';
import type { JDLRuntime } from './types/runtime.ts';
import performAdditionalSyntaxChecks from './validator.ts';

type ParseOptions = {
  startRule?: string;
  /** Receives the warnings about what the jdl uses, a deprecated option for instance. */
  onWarning?: (message: string) => void;
};

export type JDLSourcePosition = {
  offset: number;
  line: number;
  column: number;
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

/** Parse for tooling: return a best-effort AST and every diagnostic collected without throwing. */
export function parse(input: string, runtime: JDLRuntime, options?: ParseOptions): JDLParseResult {
  const { cst, diagnostics } = getCstWithDiagnostics(input, runtime, options);
  let ast: ParsedJDLApplications | undefined;

  try {
    const astBuilderVisitor = buildJDLAstBuilderVisitor(runtime, options?.onWarning ?? (() => {}));
    ast = astBuilderVisitor.visit(cst);
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

/** Explicit alias for callers that want to make the non-throwing contract visible at the call site. */
export const parseWithDiagnostics = parse;

/** Fail-fast compatibility wrapper for generator callers. */
export function parseOrThrow(input: string, runtime: JDLRuntime, options?: ParseOptions): ParsedJDLApplications {
  const cst = getCst(input, runtime, options);
  // eslint-disable-next-line no-console
  const astBuilderVisitor = buildJDLAstBuilderVisitor(runtime, options?.onWarning ?? (message => console.warn(message)));
  return astBuilderVisitor.visit(cst);
}

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
      range: rangeFromOffsets(input, error.offset, error.offset + Math.max(1, error.length)),
    })),
  );

  const parser = new JDLParser(runtime.tokens, true);
  parser.parse();
  parser.input = lexResult.tokens;

  const cst = (parser as unknown as Record<string, () => CstNode>)[options?.startRule ?? 'prog']();

  diagnostics.push(...parser.errors.map(error => diagnosticFromRecognitionError(error, input, 'parser')));

  try {
    diagnostics.push(...performAdditionalSyntaxChecks(cst, runtime).map(error => diagnosticFromRecognitionError(error, input, 'syntax')));
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

function diagnosticFromRecognitionError(error: IRecognitionException, input: string, source: 'parser' | 'syntax'): JDLDiagnostic {
  const context = error.context as { ruleStack?: string[] } | undefined;
  return {
    severity: 'error',
    source,
    ruleId: context?.ruleStack?.at(-1) ?? error.name ?? source,
    message: `${error.name ? `${error.name}: ` : ''}${error.message}`,
    range: rangeFromToken(error.token, input),
  };
}

function rangeFromToken(token: IToken, input: string): JDLSourceRange {
  const startOffset = finiteOffset(token.startOffset, input.length);
  const inclusiveEndOffset = finiteOffset(token.endOffset, startOffset);
  return rangeFromOffsets(input, startOffset, Math.min(input.length, Math.max(startOffset, inclusiveEndOffset + 1)));
}

function rangeFromOffsets(input: string, start: number, end: number): JDLSourceRange {
  const startOffset = Math.min(input.length, Math.max(0, finiteOffset(start, input.length)));
  const endOffset = Math.min(input.length, Math.max(startOffset, finiteOffset(end, startOffset)));
  return {
    start: positionAtOffset(input, startOffset),
    end: positionAtOffset(input, endOffset),
  };
}

function positionAtOffset(input: string, offset: number): JDLSourcePosition {
  let line = 1;
  let column = 1;
  for (let index = 0; index < offset; index++) {
    if (input[index] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { offset, line, column };
}

function rangeAtEnd(input: string): JDLSourceRange {
  return rangeFromOffsets(input, input.length, input.length);
}

function finiteOffset(value: number | undefined, fallback: number) {
  return value === undefined || !Number.isFinite(value) ? fallback : value;
}

/** What a statement may be, by the rule it is parsed in: the list chevrotain expects is a wall of token sequences. */
const EXPECTED_STATEMENTS: Record<string, string> = {
  prog: 'an entity, an enum, a relationship, an application, a deployment, a use statement, a constant or an option statement',
  applicationSubDeclaration: 'a config block, an entities statement, a use statement or an option statement',
};

function throwParserError(errors: IRecognitionException[]) {
  const parserError = errors[0];
  if (parserError.name === 'MismatchedTokenException') {
    throwErrorAboutInvalidToken(parserError);
  }
  const expectedStatements = EXPECTED_STATEMENTS[parserError.context.ruleStack.at(-1)!];
  if (parserError.name === 'NoViableAltException' && expectedStatements && parserError.token.tokenType.name === 'IDENTIFIER') {
    const { token } = parserError;
    throw new Error(
      `Unknown statement '${token.image}', expected ${expectedStatements}.\n\tat line: ${token.startLine}, column: ${token.startColumn}`,
    );
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
