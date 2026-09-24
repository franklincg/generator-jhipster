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

import type {
  ParsedJDLAnnotation,
  ParsedJDLApplications,
  ParsedJDLEntity,
  ParsedJDLEntityField,
  ParsedJDLEnum,
  ParsedJDLEnumValue,
  ParsedJDLLocation,
  ParsedJDLNode,
  ParsedJDLRelationship,
  ParsedJDLRelationshipSide,
} from '../types/parsed.ts';

import { locationFromContext } from './location.ts';

type CstElement = CstNode | IToken;

type Locatable = ParsedJDLNode & Record<string, any>;

const isCstNode = (element: CstElement): element is CstNode => 'children' in element;
const isToken = (element: CstElement): element is IToken => 'image' in element;

const children = (node: CstNode | undefined, key: string): CstNode[] =>
  ((node?.children[key] ?? []) as CstElement[]).filter(isCstNode);

const tokens = (node: CstNode | undefined, key: string): IToken[] =>
  ((node?.children[key] ?? []) as CstElement[]).filter(isToken);

const firstChild = (node: CstNode | undefined, key: string): CstNode | undefined => children(node, key)[0];

const mergeLocation = (current: ParsedJDLLocation | undefined, next: ParsedJDLLocation | undefined): ParsedJDLLocation | undefined => {
  if (!current) return next;
  if (!next) return current;

  const start = current.startOffset <= next.startOffset ? current : next;
  const end = current.endOffset >= next.endOffset ? current : next;
  return {
    startOffset: start.startOffset,
    endOffset: end.endOffset,
    ...(start.startLine !== undefined ? { startLine: start.startLine } : {}),
    ...(end.endLine !== undefined ? { endLine: end.endLine } : {}),
    ...(start.startColumn !== undefined ? { startColumn: start.startColumn } : {}),
    ...(end.endColumn !== undefined ? { endColumn: end.endColumn } : {}),
  };
};

const locate = <T extends ParsedJDLNode>(target: T | undefined, node: CstNode | undefined): T | undefined => {
  if (target && node) {
    target.location = locationFromContext({ node: [node] });
  }
  return target;
};

const locateMerged = (target: Locatable | undefined, node: CstNode | undefined) => {
  if (target && node) {
    target.location = mergeLocation(target.location, locationFromContext({ node: [node] }));
  }
};

const locateAnnotations = (annotations: ParsedJDLAnnotation[] | undefined, nodes: CstNode[]) => {
  annotations?.forEach((annotation, index) => locate(annotation, nodes[index]));
};

const locateField = (field: ParsedJDLEntityField, node: CstNode | undefined) => {
  locate(field, node);
  locateAnnotations(field.annotations, children(node, 'annotationDeclaration'));
  field.validations.forEach((validation, index) => locate(validation, children(node, 'validation')[index]));
};

const locateEntity = (entity: ParsedJDLEntity, node: CstNode | undefined) => {
  locate(entity, node);
  locateAnnotations(entity.annotations, children(node, 'annotationDeclaration'));

  const body = firstChild(node, 'entityBody');
  entity.body?.forEach((field, index) => locateField(field, children(body, 'fieldDeclaration')[index]));
};

const locateEnumValue = (value: ParsedJDLEnumValue, node: CstNode | undefined) => locate(value, node);

const locateEnum = (enumeration: ParsedJDLEnum, node: CstNode | undefined) => {
  locate(enumeration, node);
  const list = firstChild(node, 'enumPropList');
  enumeration.values.forEach((value, index) => locateEnumValue(value, children(list, 'enumProp')[index]));
};

const locateRelationshipSide = (side: ParsedJDLRelationshipSide, node: CstNode | undefined) => locate(side, node);

const locateRelationship = (relationship: ParsedJDLRelationship, node: CstNode | undefined) => {
  locate(relationship, node);
  locateRelationshipSide(relationship.from, firstChild(node, 'from'));
  locateRelationshipSide(relationship.to, firstChild(node, 'to'));

  const sourceOptions = children(node, 'annotationOnSourceSide');
  const destinationOptions = children(node, 'annotationOnDestinationSide');
  const globalOptions = firstChild(node, 'relationshipOptions');
  const optionNodes = [...sourceOptions, ...destinationOptions, ...(globalOptions ? [globalOptions] : [])];

  if (optionNodes.length > 0) {
    optionNodes.forEach(optionNode => locateMerged(relationship.options, optionNode));
  } else {
    locate(relationship.options, node);
  }

  locateAnnotations(relationship.options.source, sourceOptions);
  locateAnnotations(relationship.options.destination, destinationOptions);
  locateAnnotations(relationship.options.global, children(globalOptions, 'relationshipOption'));
};

const locateOptionDeclarations = (options: Record<string, any> | undefined, unaryNodes: CstNode[], binaryNodes: CstNode[]) => {
  if (!options) return;

  unaryNodes.forEach(node => {
    const optionName = tokens(node, 'UNARY_OPTION')[0]?.image;
    if (optionName) {
      locateMerged(options[optionName] as Locatable | undefined, node);
    }
  });

  binaryNodes.forEach(node => {
    const optionName = tokens(node, 'BINARY_OPTION')[0]?.image;
    const valueNode = firstChild(node, 'entityList');
    const optionValue = tokens(valueNode, 'NAME').at(-1)?.image;
    if (optionName && optionValue) {
      locateMerged(options[optionName]?.[optionValue] as Locatable | undefined, node);
    }
  });
};

const locateApplication = (application: ParsedJDLApplications['applications'][number], node: CstNode | undefined) => {
  locate(application, node);
  const subDeclaration = firstChild(node, 'applicationSubDeclaration');
  locateOptionDeclarations(
    application.options,
    children(subDeclaration, 'unaryOptionDeclaration'),
    children(subDeclaration, 'binaryOptionDeclaration'),
  );
  application.useOptions?.forEach((option, index) => locate(option, children(subDeclaration, 'useOptionDeclaration')[index]));

  const configNodes = children(subDeclaration, 'applicationSubConfig');
  if (configNodes.length > 0) {
    locate(application.config, configNodes.at(-1));
  }
};

/**
 * Adds source ranges to the semantic nodes produced by the legacy AST visitor.
 * Keeping this as a tooling-only post-build pass preserves the historical
 * throwing parser shape while exposing CST ranges to editors and linters.
 */
export const attachAstLocations = (ast: ParsedJDLApplications, cst: CstNode): ParsedJDLApplications => {
  locate(ast, cst);

  ast.entities.forEach((entity, index) => locateEntity(entity, children(cst, 'entityDeclaration')[index]));
  ast.enums.forEach((enumeration, index) => locateEnum(enumeration, children(cst, 'enumDeclaration')[index]));

  const relationshipBodies = children(cst, 'relationDeclaration').flatMap(node => children(node, 'relationshipBody'));
  ast.relationships.forEach((relationship, index) => locateRelationship(relationship, relationshipBodies[index]));

  ast.applications.forEach((application, index) => locateApplication(application, children(cst, 'applicationDeclaration')[index]));
  ast.deployments.forEach((deployment, index) => locate(deployment, children(cst, 'deploymentDeclaration')[index]));
  ast.useOptions.forEach((option, index) => locate(option, children(cst, 'useOptionDeclaration')[index]));
  locateOptionDeclarations(ast.options, children(cst, 'unaryOptionDeclaration'), children(cst, 'binaryOptionDeclaration'));

  return ast;
};
