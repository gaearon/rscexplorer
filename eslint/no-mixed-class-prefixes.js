// @ts-check

/**
 * ESLint rule to enforce CSS class naming conventions:
 * 1. CSS imports must match the component file name
 * 2. All classNames in the file must use the file's prefix (poor man's CSS modules)
 */

/** @type {import('eslint').Rule.RuleModule} */
export const noMixedClassPrefixes = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce CSS class naming matches component file name",
    },
    schema: [],
    messages: {
      mismatchedClass: "Class '{{className}}' must start with '{{expectedPrefix}}' (the file name)",
      mismatchedCssImport:
        "CSS file '{{cssFile}}' does not match component file '{{componentFile}}'",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    const basename = filename.split("/").pop() || "";
    const filePrefix = basename.replace(/\.(tsx?|jsx?)$/, "");

    // Only apply to PascalCase component files
    if (!/^[A-Z]/.test(filePrefix)) {
      return {};
    }

    /**
     * Check if className is valid for this file
     * Valid: FilePrefix, FilePrefix-foo, FilePrefix--bar, FilePrefix-foo--bar
     * @param {string} className
     * @returns {boolean}
     */
    function isValidClassName(className) {
      if (className === filePrefix) return true;
      if (className.startsWith(filePrefix + "-")) return true;
      return false;
    }

    /**
     * Check classes in a string
     * @param {import('estree').Node} node
     * @param {string} value
     */
    function checkClassString(node, value) {
      const classes = value.split(/\s+/).filter(Boolean);

      for (const className of classes) {
        // Only check PascalCase classes (component classes)
        if (!/^[A-Z]/.test(className)) continue;

        if (!isValidClassName(className)) {
          context.report({
            node,
            messageId: "mismatchedClass",
            data: {
              className,
              expectedPrefix: filePrefix,
            },
          });
        }
      }
    }

    return {
      // Check CSS imports match file name
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") return;
        if (!source.endsWith(".css")) return;

        const cssBasename = source.split("/").pop() || "";
        const cssPrefix = cssBasename.replace(/\.css$/, "");

        if (cssPrefix !== filePrefix) {
          context.report({
            node,
            messageId: "mismatchedCssImport",
            data: {
              cssFile: cssBasename,
              componentFile: basename,
            },
          });
        }
      },

      // Check className attributes
      JSXAttribute(node) {
        if (node.name.name !== "className") return;

        const value = node.value;

        // className="foo bar"
        if (value && value.type === "Literal" && typeof value.value === "string") {
          checkClassString(value, value.value);
        }

        // className={...}
        if (value && value.type === "JSXExpressionContainer") {
          const expr = value.expression;

          // className={"foo bar"}
          if (expr.type === "Literal" && typeof expr.value === "string") {
            checkClassString(expr, expr.value);
          }

          // className={`foo ${bar}`}
          if (expr.type === "TemplateLiteral") {
            for (const quasi of expr.quasis) {
              if (quasi.value.raw) {
                checkClassString(quasi, quasi.value.raw);
              }
            }
          }
        }
      },
    };
  },
};
