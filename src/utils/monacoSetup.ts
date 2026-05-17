import * as monaco from 'monaco-editor'
import { loader } from '@guolao/vue-monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// Route Monaco's worker factory to Vite-bundled workers. Spec forbids CDN loading.
const monacoEnv: {
  getWorker: (workerId: string, label: string) => Worker
} = {
  getWorker(_workerId: string, label: string): Worker {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  },
}

;(self as unknown as { MonacoEnvironment: typeof monacoEnv }).MonacoEnvironment = monacoEnv

// Tell the wrapper to use our locally-bundled monaco instance instead of fetching from CDN.
loader.config({ monaco })

// Register the dark theme our design uses. Custom colors approximate the
// graphite surface / accent blue / token highlights from the prototype.
monaco.editor.defineTheme('webfx-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6F839F', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c792ea' },
    { token: 'type', foreground: '82aaff' },
    { token: 'string', foreground: 'a5e075' },
    { token: 'number', foreground: 'f78c6c' },
  ],
  colors: {
    'editor.background': '#1e1e1d',
    'editor.foreground': '#fafafa',
    'editorLineNumber.foreground': '#5b5b59',
    'editorLineNumber.activeForeground': '#fafafa',
    'editorCursor.foreground': '#217eff',
    'editor.selectionBackground': '#217eff59',
    'editor.lineHighlightBackground': '#ffffff08',
    'editorGutter.background': '#19191a',
    'editorWidget.background': '#1e1e1d',
    'editorWidget.border': '#353433',
    'editorIndentGuide.background': '#262625',
    'editorIndentGuide.activeBackground': '#353433',
  },
})

// Monaco ships WGSL but not GLSL. Register a Monarch grammar so .frag / .vert /
// .glsl light up with the same token classes the webfx-dark theme already styles.
monaco.languages.register({
  id: 'glsl',
  extensions: ['.glsl', '.frag', '.vert'],
  aliases: ['GLSL', 'glsl'],
})

monaco.languages.setLanguageConfiguration('glsl', {
  comments: { lineComment: '//', blockComment: ['/*', '*/'] },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
  ],
})

monaco.languages.setMonarchTokensProvider('glsl', {
  defaultToken: '',
  tokenPostfix: '.glsl',
  keywords: [
    'attribute', 'const', 'uniform', 'varying', 'buffer', 'shared', 'coherent',
    'volatile', 'restrict', 'readonly', 'writeonly', 'layout', 'centroid',
    'flat', 'smooth', 'noperspective', 'patch', 'sample', 'subroutine',
    'in', 'out', 'inout', 'invariant', 'precise',
    'break', 'continue', 'do', 'for', 'while', 'switch', 'case', 'default',
    'if', 'else', 'discard', 'return',
    'struct', 'void', 'true', 'false', 'precision', 'highp', 'mediump', 'lowp',
  ],
  typeKeywords: [
    'bool', 'int', 'uint', 'float', 'double',
    'vec2', 'vec3', 'vec4',
    'dvec2', 'dvec3', 'dvec4',
    'bvec2', 'bvec3', 'bvec4',
    'ivec2', 'ivec3', 'ivec4',
    'uvec2', 'uvec3', 'uvec4',
    'mat2', 'mat3', 'mat4',
    'mat2x2', 'mat2x3', 'mat2x4',
    'mat3x2', 'mat3x3', 'mat3x4',
    'mat4x2', 'mat4x3', 'mat4x4',
    'sampler1D', 'sampler2D', 'sampler3D',
    'samplerCube', 'sampler2DArray', 'samplerCubeArray',
    'sampler2DShadow', 'samplerCubeShadow',
    'isampler2D', 'isampler3D', 'isamplerCube',
    'usampler2D', 'usampler3D', 'usamplerCube',
    'image2D', 'image3D', 'imageCube', 'image2DArray',
  ],
  builtinFunctions: [
    'radians', 'degrees', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
    'pow', 'exp', 'exp2', 'log', 'log2', 'sqrt', 'inversesqrt',
    'abs', 'sign', 'floor', 'ceil', 'fract', 'mod', 'modf',
    'min', 'max', 'clamp', 'mix', 'step', 'smoothstep',
    'isnan', 'isinf', 'floatBitsToInt', 'floatBitsToUint',
    'intBitsToFloat', 'uintBitsToFloat',
    'length', 'distance', 'dot', 'cross', 'normalize',
    'faceforward', 'reflect', 'refract',
    'matrixCompMult', 'outerProduct', 'transpose', 'determinant', 'inverse',
    'lessThan', 'lessThanEqual', 'greaterThan', 'greaterThanEqual',
    'equal', 'notEqual', 'any', 'all', 'not',
    'texture', 'texture2D', 'textureCube', 'textureLod', 'textureGrad',
    'texelFetch', 'textureSize', 'textureProj', 'texture2DProj',
    'dFdx', 'dFdy', 'fwidth',
  ],
  builtinVariables: [
    'gl_Position', 'gl_PointSize', 'gl_VertexID', 'gl_InstanceID',
    'gl_FragCoord', 'gl_FragColor', 'gl_FragData', 'gl_FragDepth',
    'gl_PointCoord', 'gl_FrontFacing', 'gl_PrimitiveID',
  ],
  operators: [
    '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
    '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
    '<<', '>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=', '%=',
    '<<=', '>>=',
  ],
  symbols: /[=><!~?:&|+\-*/^%]+/,
  tokenizer: {
    root: [
      // Preprocessor directives consume the rest of the line.
      [/^\s*#\s*\w+.*$/, 'metatag'],
      // Identifiers + keyword / type / builtin matching.
      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            '@typeKeywords': 'type.identifier',
            '@keywords': 'keyword',
            '@builtinFunctions': 'predefined',
            '@builtinVariables': 'variable.predefined',
            '@default': 'identifier',
          },
        },
      ],
      { include: '@whitespace' },
      // Numbers: hex / float (with exponent) / int, with optional GLSL suffixes.
      [/0[xX][0-9a-fA-F]+[uU]?/, 'number.hex'],
      [/\d*\.\d+([eE][-+]?\d+)?[fF]?/, 'number.float'],
      [/\d+\.\d*([eE][-+]?\d+)?[fF]?/, 'number.float'],
      [/\d+[eE][-+]?\d+[fF]?/, 'number.float'],
      [/\d+[uU]?/, 'number'],
      // Delimiters and operators.
      [/[{}()[\]]/, '@brackets'],
      [/[;,.]/, 'delimiter'],
      [
        /@symbols/,
        { cases: { '@operators': 'operator', '@default': '' } },
      ],
      // Strings (rare in GLSL but harmless to support).
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@stringDouble'],
      [/'/, 'string', '@stringSingle'],
    ],
    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
    ],
    comment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],
    stringDouble: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],
    stringSingle: [
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape'],
      [/'/, 'string', '@pop'],
    ],
  },
})

export { monaco }
