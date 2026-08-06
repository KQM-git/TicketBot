import js from "@eslint/js"
import stylistic from "@stylistic/eslint-plugin"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
    {
        ignores: ["dist/", "node_modules/"]
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.ts"],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: "module",
            globals: {
                ...globals.es2020,
                ...globals.node,
                Atomics: "readonly",
                SharedArrayBuffer: "readonly"
            },
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: import.meta.dirname
            }
        },
        plugins: {
            "@stylistic": stylistic
        },
        rules: {
            "camelcase": "off",
            "prefer-const": "warn",
            "@stylistic/no-trailing-spaces": "error",
            "@stylistic/indent": [
                "error",
                4,
                {
                    "SwitchCase": 1,
                    "VariableDeclarator": "first",
                    "FunctionExpression": {
                        "parameters": "first"
                    },
                    "CallExpression": {
                        "arguments": "first"
                    },
                    "ArrayExpression": "first",
                    "ObjectExpression": "first",
                    "ImportDeclaration": "first"
                }
            ],
            "@stylistic/spaced-comment": "warn",
            "@stylistic/linebreak-style": ["error", "unix"],
            "@stylistic/quotes": ["error", "double"],
            "dot-notation": "off",
            "@typescript-eslint/dot-notation": ["error"],
            "@stylistic/semi": ["error", "never"],
            "@stylistic/no-multiple-empty-lines": [
                "error",
                {
                    "max": 2,
                    "maxBOF": 0,
                    "maxEOF": 0
                }
            ],
            "@stylistic/keyword-spacing": [
                "warn",
                {
                    "before": true,
                    "after": true
                }
            ],
            "@stylistic/eol-last": "error",
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    "argsIgnorePattern": "^_"
                }
            ],
            "no-useless-escape": "error",
            "@stylistic/brace-style": ["error", "1tbs"],
            "@stylistic/object-curly-spacing": ["warn", "always"],
            "@stylistic/type-annotation-spacing": "warn",
            "@stylistic/comma-spacing": "warn",
            "no-console": "error",
            "@typescript-eslint/promise-function-async": "warn",
            "@typescript-eslint/require-await": "warn",
            "@typescript-eslint/no-floating-promises": "warn",
            "@stylistic/member-delimiter-style": [
                "error",
                {
                    "multiline": {
                        "delimiter": "none",
                        "requireLast": false
                    },
                    "singleline": {
                        "delimiter": "comma",
                        "requireLast": false
                    }
                }
            ]
        }
    }
)
