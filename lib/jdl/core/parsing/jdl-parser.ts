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
import { type CstNode, CstParser, type TokenType } from 'chevrotain';

import { NAME } from './lexer/shared-tokens.ts';

// Chevrotain actually returns a CstNode instead of this noopCst
const noopCst = undefined as unknown as CstNode;

export default class JDLParser extends CstParser {
  private readonly tokens: Record<string, TokenType>;

  constructor(tokens: Record<string, TokenType>) {
    // Recovery is required by tooling consumers: they need a best-effort CST/AST
    // together with diagnostics instead of losing the whole document on the
    // first parser error. Legacy generator callers still use the throwing API.
    super(tokens, { outputCst: true, recoveryEnabled: true } as any);
    this.tokens = tokens;
  }

  parse() {
    this.prog();
    this.constantDeclaration();
    this.entityDeclaration();
    this.annotationDeclaration();
    this.entityTableNameDeclaration();
    this.entityBody();
    this.fieldDeclaration();
    this.type();
    this.validation();
    this.minMaxValidation();
    this.pattern();
    this.relationDeclaration();
    this.relationshipType();
    this.relationshipBody();
    this.relationshipSide();
    this.relationshipOptions();
    this.relationshipOption();
    this.enumDeclaration();
    this.enumPropList();
    this.enumProp();
    this.entityList();
    this.exclusion();
    this.useOptionDeclaration();
    this.unaryOptionDeclaration();
    this.binaryOptionDeclaration();
    this.filterDef();
    this.comment();
    this.deploymentDeclaration();
    this.deploymentConfigDeclaration();
    this.deploymentConfigValue();
    this.applicationDeclaration();
    this.applicationSubDeclaration();
    this.applicationSubConfig();
    this.applicationSubNamespaceConfig();
    this.applicationSubEntities();
    this.applicationConfigDeclaration();
    this.configValue();
    this.applicationNamespaceConfigDeclaration();
    this.namespaceConfigValue();
    this.qualifiedName();
    this.quotedList();
    this.list();

    // very important to call this after all the rules have been defined.
    // otherwise the parsers may not work correctly as it will lack information
    // derived during the self analysis phase.
    this.performSelfAnalysis();
  }

  prog(): CstNode {
    this.RULE('prog', () => {
      this.MANY(() => {
        this.OR([
          { ALT: () => this.SUBRULE(this.entityDeclaration) },
          { ALT: () => this.SUBRULE(this.relationDeclaration) },
          { ALT: () => this.SUBRULE(this.enumDeclaration) },
          { ALT: () => this.CONSUME(this.tokens.JAVADOC) },
          { ALT: () => this.SUBRULE(this.useOptionDeclaration) },
          { ALT: () => this.SUBRULE(this.unaryOptionDeclaration) },
          { ALT: () => this.SUBRULE(this.binaryOptionDeclaration) },
          { ALT: () => this.SUBRULE(this.applicationDeclaration) },
          { ALT: () => this.SUBRULE(this.deploymentDeclaration) },
          // a constantDeclaration starts with a NAME, but any keyword is also a NAME
          // So to avoid conflicts with most of the above alternatives (which start with keywords)
          // this alternative must be last.
          {
            // - A Constant starts with a NAME
            // - NAME tokens are very common
            // That is why a more precise lookahead condition is used (The GATE)
            // To avoid confusing errors ("expecting EQUALS but found ...")
            GATE: () => this.LA(2).tokenType === this.tokens.EQUALS,
            ALT: () => this.SUBRULE(this.constantDeclaration),
          },
        ]);
      });
    });
    return noopCst;
  }

  constantDeclaration(): CstNode {
    this.RULE('constantDeclaration', () => {
      this.CONSUME(this.tokens.NAME);
      this.CONSUME(this.tokens.EQUALS);
      this.OR([{ ALT: () => this.CONSUME(this.tokens.DECIMAL) }, { ALT: () => this.CONSUME(this.tokens.INTEGER) }]);
    });
    return noopCst;
  }

  entityDeclaration(): CstNode {
    this.RULE('entityDeclaration', () => {
      this.OPTION(() => this.CONSUME(this.tokens.JAVADOC));
      this.MANY(() => this.SUBRULE(this.annotationDeclaration));
      this.CONSUME(this.tokens.ENTITY);
      this.CONSUME(this.tokens.NAME);
      this.OPTION1(() => this.SUBRULE(this.entityTableNameDeclaration));
      this.SUBRULE(this.entityBody);
    });
    return noopCst;
  }

  annotationDeclaration(): CstNode {
    this.RULE('annotationDeclaration', () => {
      this.CONSUME(this.tokens.AT);
      this.CONSUME(this.tokens.NAME, { LABEL: 'option' });
      this.OPTION(() => {
        this.CONSUME(this.tokens.LPAREN);
        this.OR([
          { ALT: () => this.CONSUME(this.tokens.NAME, { LABEL: 'value' }) },
          { ALT: () => this.CONSUME(this.tokens.STRING, { LABEL: 'value' }) },
          { ALT: () => this.CONSUME(this.tokens.INTEGER, { LABEL: 'value' }) },
          { ALT: () => this.CONSUME(this.tokens.DECIMAL, { LABEL: 'value' }) },
          { ALT: () => this.CONSUME(this.tokens.TRUE, { LABEL: 'value' }) },
          { ALT: () => this.CONSUME(this.tokens.FALSE, { LABEL: 'value' }) },
        ]);
        this.CONSUME(this.tokens.RPAREN);
      });
    });
    return noopCst;
  }

  entityTableNameDeclaration(): CstNode {
    this.RULE('entityTableNameDeclaration', () => {
      this.CONSUME(this.tokens.LPAREN);
      this.CONSUME(this.tokens.NAME);
      this.CONSUME(this.tokens.RPAREN);
    });
    return noopCst;
  }

  entityBody(): CstNode {
    this.RULE('entityBody', () => {
      this.CONSUME(this.tokens.LBRACE);
      this.MANY(() => this.SUBRULE(this.fieldDeclaration));
      this.CONSUME(this.tokens.RBRACE);
    });
    return noopCst;
  }

  fieldDeclaration(): CstNode {
    this.RULE('fieldDeclaration', () => {
      this.OPTION(() => this.CONSUME(this.tokens.JAVADOC));
      this.MANY(() => this.SUBRULE(this.annotationDeclaration));
      this.CONSUME(this.tokens.NAME);
      this.SUBRULE(this.type);
      this.MANY1(() => this.SUBRULE(this.validation));
    });
    return noopCst;
  }

  type(): CstNode {
    this.RULE('type', () => {
      this.CONSUME(this.tokens.NAME);
    });
    return noopCst;
  }

  validation(): CstNode {
    this.RULE('validation', () => {
      this.OR([
        { ALT: () => this.CONSUME(this.tokens.REQUIRED) },
        { ALT: () => this.CONSUME(this.tokens.UNIQUE) },
        { ALT: () => this.SUBRULE(this.minMaxValidation) },
        { ALT: () => this.SUBRULE(this.pattern) },
      ]);
    });
    return noopCst;
  }

  minMaxValidation(): CstNode {
    this.RULE('minMaxValidation', () => {
      this.CONSUME(this.tokens.MIN_MAX_KEYWORD);
      this.CONSUME(this.tokens.LPAREN);
      this.OR([
        { ALT: () => this.CONSUME(this.tokens.INTEGER) },
        { ALT: () => this.CONSUME(this.tokens.DECIMAL) },
        { ALT: () => this.CONSUME(this.tokens.NAME) },
      ]);
      this.CONSUME(this.tokens.RPAREN);
    });
    return noopCst;
  }

  pattern(): CstNode {
    this.RULE('pattern', () => {
      this.CONSUME(this.tokens.PATTERN);
      this.CONSUME(this.tokens.LPAREN);
      this.CONSUME(this.tokens.REGEX);
      this.CONSUME(this.tokens.RPAREN);
    });
    return noopCst;
  }

  relationDeclaration(): CstNode {
    this.RULE('relationDeclaration', () => {
      this.CONSUME(this.tokens.RELATIONSHIP);
      this.SUBRULE(this.relationshipType);
      this.CONSUME(this.tokens.LBRACE);
      this.AT_LEAST_ONE_SEP({ SEP: this.tokens.COMMA, DEF: () => this.SUBRULE(this.relationshipBody) });
      this.CONSUME(this.tokens.RBRACE);
    });
    return noopCst;
  }

  relationshipType(): CstNode {
    this.RULE('relationshipType', () => {
      this.CONSUME(this.tokens.RELATIONSHIP_TYPE);
    });
    return noopCst;
  }

  relationshipBody(): CstNode {
    this.RULE('relationshipBody', () => {
      this.SUBRULE(this.relationshipSide, { LABEL: 'from' });
      this.MANY(() => this.SUBRULE(this.relationshipOption, { LABEL: 'annotationOnSourceSide' }));
      this.CONSUME(this.tokens.TO);
      this.SUBRULE2(this.relationshipSide, { LABEL: 'to' });
      this.MANY1(() => this.SUBRULE2(this.relationshipOption, { LABEL: 'annotationOnDestinationSide' }));
      this.OPTION(() => this.SUBRULE(this.relationshipOptions));
    });
    return noopCst;
  }

  relationshipSide(): CstNode {
    this.RULE('relationshipSide', () => {
      this.SUBRULE(this.comment);
      this.CONSUME(this.tokens.NAME);
      this.OPTION(() => {
        this.CONSUME(this.tokens.LBRACE);
        this.CONSUME2(this.tokens.NAME, { LABEL: 'injectedField' });
        this.OPTION1(() => {
          this.CONSUME(this.tokens.LPAREN);
          this.CONSUME3(this.tokens.NAME, { LABEL: 'injectedFieldParam' });
          this.CONSUME(this.tokens.RPAREN);
        });
        this.OPTION2(() => this.CONSUME(this.tokens.REQUIRED));
        this.CONSUME(this.tokens.RBRACE);
      });
    });
    return noopCst;
  }

  relationshipOptions(): CstNode {
    this.RULE('relationshipOptions', () => {
      this.CONSUME(this.tokens.WITH);
      this.AT_LEAST_ONE_SEP({ SEP: this.tokens.COMMA, DEF: () => this.SUBRULE(this.relationshipOption) });
    });
    return noopCst;
  }

  relationshipOption(): CstNode {
    this.RULE('relationshipOption', () => {
      this.CONSUME(this.tokens.RELATIONSHIP_OPTION);
    });
    return noopCst;
  }

  enumDeclaration(): CstNode {
    this.RULE('enumDeclaration', () => {
      this.OPTION(() => this.CONSUME(this.tokens.JAVADOC));
      this.CONSUME(this.tokens.ENUM);
      this.CONSUME(this.tokens.NAME);
      this.CONSUME(this.tokens.LBRACE);
      this.SUBRULE(this.enumPropList);
      this.CONSUME(this.tokens.RBRACE);
    });
    return noopCst;
  }

  enumPropList(): CstNode {
    this.RULE('enumPropList', () => {
      this.OPTION(() => this.SUBRULE(this.enumProp));
      this.MANY(() => {
        this.CONSUME(this.tokens.COMMA);
        this.SUBRULE2(this.enumProp);
      });
    });
    return noopCst;
  }

  enumProp(): CstNode {
    this.RULE('enumProp', () => {
      this.OPTION(() => this.CONSUME(this.tokens.JAVADOC));
      this.CONSUME(this.tokens.NAME, { LABEL: 'enumPropKey' });
      this.OPTION1(() => {
        this.CONSUME(this.tokens.LPAREN);
        this.OR([
          { ALT: () => this.CONSUME2(this.tokens.NAME, { LABEL: 'enumPropValue' }) },
          { ALT: () => this.CONSUME(this.tokens.STRING, { LABEL: 'enumPropValueWithQuotes' }) },
        ]);
        this.CONSUME(this.tokens.RPAREN);
      });
    });
    return noopCst;
  }

  entityList(): CstNode {
    this.RULE('entityList', () => {
      this.OR([
        { ALT: () => this.CONSUME(this.tokens.STAR) },
        {
          ALT: () =>
            this.AT_LEAST_ONE_SEP({
              SEP: this.tokens.COMMA,
              DEF: () => this.CONSUME(this.tokens.NAME),
            }),
        },
      ]);
    });
    return noopCst;
  }

  exclusion(): CstNode {
    this.RULE('exclusion', () => {
      this.CONSUME(this.tokens.EXCEPT);
      this.AT_LEAST_ONE_SEP({ SEP: this.tokens.COMMA, DEF: () => this.CONSUME(this.tokens.NAME) });
    });
    return noopCst;
  }

  useOptionDeclaration(): CstNode {
    this.RULE('useOptionDeclaration', () => {
      this.CONSUME(this.tokens.USE);
      this.AT_LEAST_ONE_SEP({ SEP: this.tokens.COMMA, DEF: () => this.CONSUME(this.tokens.NAME) });
      this.CONSUME(this.tokens.FOR);
      this.SUBRULE(this.filterDef);
      this.OPTION(() => this.SUBRULE(this.exclusion));
    });
    return noopCst;
  }

  unaryOptionDeclaration(): CstNode {
    this.RULE('unaryOptionDeclaration', () => {
      this.CONSUME(this.tokens.UNARY_OPTION);
      this.SUBRULE(this.filterDef);
      this.OPTION(() => this.SUBRULE(this.exclusion));
    });
    return noopCst;
  }

  binaryOptionDeclaration(): CstNode {
    this.RULE('binaryOptionDeclaration', () => {
      this.CONSUME(this.tokens.BINARY_OPTION);
      this.SUBRULE(this.filterDef);
      this.CONSUME(this.tokens.WITH);
      this.SUBRULE(this.entityList);
      this.OPTION(() => this.SUBRULE(this.exclusion));
    });
    return noopCst;
  }

  filterDef(): CstNode {
    this.RULE('filterDef', () => {
      this.OR([
        { ALT: () => this.CONSUME(this.tokens.STAR) },
        {
          ALT: () =>
            this.AT_LEAST_ONE_SEP({
              SEP: this.tokens.COMMA,
              DEF: () => this.CONSUME(this.tokens.NAME),
            }),
        },
      ]);
    });
    return noopCst;
  }

  comment(): CstNode {
    this.RULE('comment', () => {
      this.OPTION(() => this.CONSUME(this.tokens.JAVADOC));
    });
    return noopCst;
  }

  deploymentDeclaration(): CstNode {
    this.RULE('deploymentDeclaration', () => {
      this.CONSUME(this.tokens.DEPLOYMENT);
      this.CONSUME(this.tokens.LBRACE);
      this.CONSUME(this.tokens.CONFIG);
      this.CONSUME2(this.tokens.LBRACE);
      this.MANY(() => this.SUBRULE(this.deploymentConfigDeclaration));
      this.CONSUME2(this.tokens.RBRACE);
      this.CONSUME(this.tokens.RBRACE);
    });
    return noopCst;
  }

  deploymentConfigDeclaration(): CstNode {
    this.RULE('deploymentConfigDeclaration', () => {
      this.CONSUME(this.tokens.DEPLOYMENT_KEY);
      this.SUBRULE(this.deploymentConfigValue);
    });
    return noopCst;
  }

  deploymentConfigValue(): CstNode {
    this.RULE('deploymentConfigValue', () => {
      this.SUBRULE(this.configValue);
    });
    return noopCst;
  }

  applicationDeclaration(): CstNode {
    this.RULE('applicationDeclaration', () => {
      this.CONSUME(this.tokens.APPLICATION);
      this.CONSUME(this.tokens.LBRACE);
      this.SUBRULE(this.applicationSubDeclaration);
      this.CONSUME(this.tokens.RBRACE);
    });
    return noopCst;
  }

  applicationSubDeclaration(): CstNode {
    this.RULE('applicationSubDeclaration', () => {
      this.MANY(() => {
        this.OR([
          { ALT: () => this.SUBRULE(this.applicationSubConfig) },
          { ALT: () => this.SUBRULE(this.applicationSubNamespaceConfig) },
          { ALT: () => this.SUBRULE(this.applicationSubEntities) },
          { ALT: () => this.SUBRULE(this.unaryOptionDeclaration) },
          { ALT: () => this.SUBRULE(this.binaryOptionDeclaration) },
          { ALT: () => this.SUBRULE(this.useOptionDeclaration) },
        ]);
      });
    });
    return noopCst;
  }

  applicationSubConfig(): CstNode {
    this.RULE('applicationSubConfig', () => {
      this.CONSUME(this.tokens.CONFIG);
      this.CONSUME(this.tokens.LBRACE);
      this.MANY(() => this.SUBRULE(this.applicationConfigDeclaration));
      this.CONSUME(this.tokens.RBRACE);
    });
    return noopCst;
  }

  applicationSubNamespaceConfig(): CstNode {
    this.RULE('applicationSubNamespaceConfig', () => {
      this.CONSUME(this.tokens.NAME, { LABEL: 'namespace' });
      this.CONSUME(this.tokens.LBRACE);
      this.MANY(() => this.SUBRULE(this.applicationNamespaceConfigDeclaration));
      this.CONSUME(this.tokens.RBRACE);
    });
    return noopCst;
  }

  applicationSubEntities(): CstNode {
    this.RULE('applicationSubEntities', () => {
      this.CONSUME(this.tokens.UNARY_OPTION);
      this.SUBRULE(this.filterDef);
      this.OPTION(() => this.SUBRULE(this.exclusion));
    });
    return noopCst;
  }

  applicationConfigDeclaration(): CstNode {
    this.RULE('applicationConfigDeclaration', () => {
      this.CONSUME(this.tokens.CONFIG_KEY);
      this.SUBRULE(this.configValue);
    });
    return noopCst;
  }

  configValue(): CstNode {
    this.RULE('configValue', () => {
      this.OR([
        { ALT: () => this.SUBRULE(this.qualifiedName) },
        { ALT: () => this.SUBRULE(this.list) },
        { ALT: () => this.SUBRULE(this.quotedList) },
        { ALT: () => this.CONSUME(this.tokens.INTEGER) },
        { ALT: () => this.CONSUME(this.tokens.STRING) },
        { ALT: () => this.CONSUME(this.tokens.BOOLEAN) },
      ]);
    });
    return noopCst;
  }

  applicationNamespaceConfigDeclaration(): CstNode {
    this.RULE('applicationNamespaceConfigDeclaration', () => {
      this.CONSUME(this.tokens.NAME);
      this.SUBRULE(this.namespaceConfigValue);
    });
    return noopCst;
  }

  namespaceConfigValue(): CstNode {
    this.RULE('namespaceConfigValue', () => {
      this.SUBRULE(this.configValue);
    });
    return noopCst;
  }

  qualifiedName(): CstNode {
    this.RULE('qualifiedName', () => {
      this.CONSUME(this.tokens.NAME);
      this.AT_LEAST_ONE(() => {
        this.CONSUME(this.tokens.DOT);
        this.CONSUME2(this.tokens.NAME);
      });
    });
    return noopCst;
  }

  quotedList(): CstNode {
    this.RULE('quotedList', () => {
      this.CONSUME(this.tokens.LBRACKET);
      this.OPTION(() =>
        this.AT_LEAST_ONE_SEP({
          SEP: this.tokens.COMMA,
          DEF: () => this.CONSUME(this.tokens.STRING),
        }),
      );
      this.CONSUME(this.tokens.RBRACKET);
    });
    return noopCst;
  }

  list(): CstNode {
    this.RULE('list', () => {
      this.CONSUME(this.tokens.LBRACKET);
      this.OPTION(() =>
        this.AT_LEAST_ONE_SEP({
          SEP: this.tokens.COMMA,
          DEF: () => this.CONSUME(this.tokens.NAME),
        }),
      );
      this.CONSUME(this.tokens.RBRACKET);
    });
    return noopCst;
  }
}
