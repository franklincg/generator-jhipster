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

import { createJDLRuntime, getDefaultJDLDefinitions } from './jdl-runtime.ts';

describe('jdl - default definitions', () => {
  it('exports the complete definition set', () => {
    const definitions = getDefaultJDLDefinitions();

    expect(Object.keys(definitions).sort()).toEqual(['application', 'deployment', 'entity', 'relationship', 'validation']);
  });

  it('uses missing default definitions when creating a partial runtime', () => {
    const definitions = getDefaultJDLDefinitions();
    const runtime = createJDLRuntime({ application: definitions.application });

    expect(runtime.entityDefinition).toBe(definitions.entity);
    expect(runtime.relationshipDefinition).toBe(definitions.relationship);
    expect(runtime.validationDefinition).toBe(definitions.validation);
  });
});
