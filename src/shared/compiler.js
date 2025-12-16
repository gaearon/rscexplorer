import { transform } from '@babel/standalone';

export function parseExports(code) {
  const exports = [];
  const { ast } = transform(code, {
    presets: ['react'],
    ast: true,
  });

  for (const node of ast.program.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (node.declaration.type === 'FunctionDeclaration') {
          exports.push(node.declaration.id.name);
        } else if (node.declaration.type === 'VariableDeclaration') {
          for (const decl of node.declaration.declarations) {
            if (decl.id.type === 'Identifier') {
              exports.push(decl.id.name);
            }
          }
        }
      }
    } else if (node.type === 'ExportDefaultDeclaration') {
      exports.push('default');
    }
  }
  return exports;
}

function hasDirective(block, directive) {
  if (!block) return false;
  if (block.directives?.length > 0) {
    if (block.directives.some(d => d.value?.value === directive)) {
      return true;
    }
  }
  // Fallback for some parsers
  if (block.body) {
    for (const node of block.body) {
      if (node.type !== 'ExpressionStatement') break;
      if (node.directive === directive) return true;
      if (node.expression?.type === 'StringLiteral' && node.expression.value === directive) return true;
    }
  }
  return false;
}

function hasUseServerDirective(body) {
  if (!body || body.type !== 'BlockStatement') return false;
  return hasDirective(body, 'use server');
}

export function parseServerActions(code) {
  const { ast } = transform(code, {
    presets: ['react'],
    ast: true,
  });

  // 'use client' is not supported - this REPL only handles server code
  if (hasDirective(ast.program, 'use client')) {
    throw new Error(
      '"use client" is not supported. This environment only handles server code.'
    );
  }

  const hasModuleUseServer = hasDirective(ast.program, 'use server');

  const actions = [];

  function checkNoUseClient(body, name) {
    if (hasDirective(body, 'use client')) {
      throw new Error(
        `"use client" is not supported${name ? ` (found in "${name}")` : ''}. This environment only handles server code.`
      );
    }
  }

  function collectExportedFunction(node, name) {
    checkNoUseClient(node.body, name);
    if (hasModuleUseServer) {
      // Module-level 'use server': all exported functions are actions
      actions.push(name);
    } else if (hasUseServerDirective(node.body)) {
      // Function-level 'use server'
      actions.push(name);
    }
  }

  for (const node of ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id) {
      checkNoUseClient(node.body, node.id.name);
      if (!hasModuleUseServer && hasUseServerDirective(node.body)) {
        actions.push(node.id.name);
      }
    }
    else if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      if (node.declaration.type === 'FunctionDeclaration' && node.declaration.id) {
        collectExportedFunction(node.declaration, node.declaration.id.name);
      }
      else if (node.declaration.type === 'VariableDeclaration') {
        for (const decl of node.declaration.declarations) {
          if (decl.id.type === 'Identifier' && decl.init) {
            if (decl.init.type === 'ArrowFunctionExpression' ||
                decl.init.type === 'FunctionExpression') {
              collectExportedFunction(decl.init, decl.id.name);
            }
          }
        }
      }
    }
    else if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (decl.id.type === 'Identifier' && decl.init) {
          if (decl.init.type === 'ArrowFunctionExpression' ||
              decl.init.type === 'FunctionExpression') {
            checkNoUseClient(decl.init.body, decl.id.name);
            if (!hasModuleUseServer && hasUseServerDirective(decl.init.body)) {
              actions.push(decl.id.name);
            }
          }
        }
      }
    }
  }

  return actions;
}

export function parseClientModule(code) {
  const { ast } = transform(code, {
    presets: ['react'],
    ast: true,
  });

  // Require 'use client' at module level
  if (!hasDirective(ast.program, 'use client')) {
    throw new Error(
      'Client code must start with "use client" directive.'
    );
  }

  if (hasDirective(ast.program, 'use server')) {
    throw new Error(
      '"use server" is not supported in client code.'
    );
  }

  function checkFunction(body, name) {
    if (!body || body.type !== 'BlockStatement') return;
    if (hasDirective(body, 'use client')) {
      throw new Error(
        `"use client" must be at module level, not inside functions${name ? ` (found in "${name}")` : ''}.`
      );
    }
    if (hasDirective(body, 'use server')) {
      throw new Error(
        `"use server" is not supported in client code${name ? ` (found in "${name}")` : ''}.`
      );
    }
  }

  const exports = [];

  for (const node of ast.program.body) {
    if (node.type === 'FunctionDeclaration' && node.id) {
      checkFunction(node.body, node.id.name);
    }
    else if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (node.declaration.type === 'FunctionDeclaration') {
          checkFunction(node.declaration.body, node.declaration.id?.name);
          if (node.declaration.id) {
            exports.push(node.declaration.id.name);
          }
        } else if (node.declaration.type === 'VariableDeclaration') {
          for (const decl of node.declaration.declarations) {
            if (decl.init?.type === 'ArrowFunctionExpression' ||
                decl.init?.type === 'FunctionExpression') {
              checkFunction(decl.init.body, decl.id?.name);
            }
            if (decl.id.type === 'Identifier') {
              exports.push(decl.id.name);
            }
          }
        }
      }
    }
    else if (node.type === 'ExportDefaultDeclaration') {
      exports.push('default');
    }
    else if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        if (decl.init?.type === 'ArrowFunctionExpression' ||
            decl.init?.type === 'FunctionExpression') {
          checkFunction(decl.init.body, decl.id?.name);
        }
      }
    }
  }

  return exports;
}

export function compileToCommonJS(code) {
  const { code: compiled } = transform(code, {
    presets: ['react'],
    sourceType: 'module',
    plugins: [
      ['transform-modules-commonjs', { loose: true }]
    ],
  });
  return compiled;
}

export function buildManifest(moduleId, exportNames) {
  const manifest = {
    [moduleId]: {
      id: moduleId,
      chunks: [],
      name: '*',
    },
  };
  for (const name of exportNames) {
    manifest[`${moduleId}#${name}`] = {
      id: moduleId,
      chunks: [],
      name,
    };
  }
  return manifest;
}
