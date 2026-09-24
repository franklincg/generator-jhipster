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
import type { CstNode, IToken } from 'chevrotain';

import type { ParsedJDLLocation } from '../types/parsed.ts';

type LocatedCstElement = CstNode | IToken;
type VisitorLocationContext = Record<string, LocatedCstElement[] | undefined>;

const numeric = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value);

const fromToken = (token: IToken): ParsedJDLLocation | undefined => {
  if (!numeric(token.startOffset)) {
    return undefined;
  }

  return {
    startOffset: token.startOffset,
    endOffset: numeric(token.endOffset) ? token.endOffset : token.startOffset,
    ...(numeric(token.startLine) ? { startLine: token.startLine } : {}),
    ...(numeric(token.endLine) ? { endLine: token.endLine } : {}),
    ...(numeric(token.startColumn) ? { startColumn: token.startColumn } : {}),
    ...(numeric(token.endColumn) ? { endColumn: token.endColumn } : {}),
  };
};

const fromCstNode = (node: CstNode): ParsedJDLLocation | undefined => {
  const { location } = node;
  if (!numeric(location.startOffset)) {
    return undefined;
  }

  return {
    startOffset: location.startOffset,
    endOffset: numeric(location.endOffset) ? location.endOffset : location.startOffset,
    ...(numeric(location.startLine) ? { startLine: location.startLine } : {}),
    ...(numeric(location.endLine) ? { endLine: location.endLine } : {}),
    ...(numeric(location.startColumn) ? { startColumn: location.startColumn } : {}),
    ...(numeric(location.endColumn) ? { endColumn: location.endColumn } : {}),
  };
};

const locationOf = (element: LocatedCstElement): ParsedJDLLocation | undefined =>
  'image' in element ? fromToken(element) : fromCstNode(element);

export const locationFromContext = (context: VisitorLocationContext): ParsedJDLLocation | undefined => {
  const locations = Object.values(context)
    .flatMap(elements => elements ?? [])
    .map(locationOf)
    .filter((location): location is ParsedJDLLocation => location !== undefined);

  if (locations.length === 0) {
    return undefined;
  }

  const start = locations.reduce((candidate, location) => (location.startOffset < candidate.startOffset ? location : candidate));
  const end = locations.reduce((candidate, location) => (location.endOffset > candidate.endOffset ? location : candidate));

  return {
    startOffset: start.startOffset,
    endOffset: end.endOffset,
    ...(start.startLine !== undefined ? { startLine: start.startLine } : {}),
    ...(end.endLine !== undefined ? { endLine: end.endLine } : {}),
    ...(start.startColumn !== undefined ? { startColumn: start.startColumn } : {}),
    ...(end.endColumn !== undefined ? { endColumn: end.endColumn } : {}),
  };
};
