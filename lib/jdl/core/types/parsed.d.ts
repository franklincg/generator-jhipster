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
import type { ApplicationType } from '../../../core/application-types.ts';
import type { RelationshipType } from '../basic-types/relationships.ts';

export type ParsedJDLLocation = {
  startOffset: number;
  endOffset: number;
  startLine?: number;
  endLine?: number;
  startColumn?: number;
  endColumn?: number;
};

export type ParsedJDLNode = {
  location?: ParsedJDLLocation;
};

export type ParsedJDLAnnotation = ParsedJDLNode & {
  optionName: string;
  type: 'UNARY' | 'BINARY';
  optionValue?: boolean | string | number;
};

export type ParsedJDLValidation = ParsedJDLNode & {
  key: string;
  value?: string | number | RegExp | boolean;
  constant?: boolean;
};

export type ParsedJDLEntityField = ParsedJDLNode & {
  annotations?: ParsedJDLAnnotation[];
  validations: ParsedJDLValidation[];
  name: string;
  type: string;
  documentation?: string;
};

export type ParsedJDLEntity = ParsedJDLNode & {
  name: string;
  tableName?: string;
  documentation?: string;
  annotations?: ParsedJDLAnnotation[];
  body?: ParsedJDLEntityField[];
};
export type ParsedJDLApplicationConfig = ParsedJDLNode & {
  baseName: string;
} & Record<string, any>;

export type ParsedJDLEnumValue = ParsedJDLNode & {
  key: string;
  value?: string;
  comment?: string;
};

export type ParsedJDLEnum = ParsedJDLNode & {
  name: string;
  values: ParsedJDLEnumValue[];
  documentation?: string;
};

export type ParsedJDLOptionConfig = ParsedJDLNode & {
  list: string[]; // entity names
  excluded: string[]; // excluded entity names
};

export type ParsedJDLOption = ParsedJDLNode & {
  optionName: string;
} & ParsedJDLOptionConfig;

export type ParsedJDLBinaryOption = ParsedJDLNode & {
  optionValue: string;
} & ParsedJDLOption;

export type ParsedJDLUseOption = ParsedJDLNode & {
  optionValues: string[];
} & ParsedJDLOptionConfig;

export type ParsedJDLApplication = ParsedJDLNode & {
  config: ParsedJDLApplicationConfig;
  namespaceConfigs?: Record<string, Record<string, boolean | number | string[] | string>>;
  entities?: string[];
  options?: Record<string, ParsedJDLOptionConfig | Record<string, ParsedJDLOptionConfig>>;
  useOptions?: ParsedJDLUseOption[];
};

export type ParsedJDLDeployment = ParsedJDLNode & {
  deploymentType: string;
  appsFolders?: string[];
  dockerRepositoryName?: string;
};

export type ParsedJDLRelationshipSide = ParsedJDLNode & {
  name: string;
  injectedField?: string;
  required: boolean;
  documentation?: string;
};

export type ParsedJDLRelationshipOption = ParsedJDLNode & {
  global: ParsedJDLAnnotation[];
  source: ParsedJDLAnnotation[];
  destination: ParsedJDLAnnotation[];
};

export type ParsedJDLRelationship = ParsedJDLNode & {
  from: ParsedJDLRelationshipSide;
  to: ParsedJDLRelationshipSide;
  cardinality: RelationshipType;
  options: ParsedJDLRelationshipOption;
};

export type ParsedJDLApplications = ParsedJDLNode & {
  applications: (ParsedJDLApplication & { entitiesOptions?: { entityList: string[]; excluded: string[] } })[];
  entities: ParsedJDLEntity[];
  relationships: ParsedJDLRelationship[];
  deployments: ParsedJDLDeployment[];
  enums: ParsedJDLEnum[];
  constants: Record<string, string>;
  options: Record<string, ParsedJDLOption | Record<string, ParsedJDLOption>>;
  useOptions: ParsedJDLUseOption[];
};

export type ParsedJDLRoot = ParsedJDLNode & {
  parsedContent: ParsedJDLApplications;
  document?: ParsedJDLApplications; // deprecated
  entities?: ParsedJDLEntity[];
  applicationType?: ApplicationType;
  applicationName?: string;
};
