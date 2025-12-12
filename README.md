# rc language

`rc` is a small, compiled-to-bytecode language with a Bun-based CLI. It supports strings, ints, floats, arrays with user-provided max length, functions (sync/async), promises/await, variables (`let`/`const`), and `sys` globals. Blocks use braces.

## Install

```bash
bun install
```

## CLI (commander + clack)

```bash
# compile to bytecode JSON
bun run src/index.ts compile path/to/file.rc [-o out.json] [--array-max 256]

# compile and execute
bun run src/index.ts run path/to/file.rc [--array-max 256]

# execute precompiled bytecode
bun run src/index.ts run path/to/out.json --bytecode
```

-   `--array-max` sets the default max length for arrays that omit an explicit bound.
-   `compile` writes `<file>.rcb.json` when `-o` is not provided.

## Language overview

-   Types: `string` (surrounded by `'`, `"`, or `` ` ``), `int` (whole), `float` (decimal), `array` (comma list, mutable, requires a max length either inline or via `--array-max` default), promises (from async functions), void.
-   Variables: `let name = expr;` (mutable), `const name = expr;` (immutable).
-   `sys` makes a binding global: `sys let shared = 1;` accessible across functions.
-   Operators: `+` (numbers add; strings concat; arrays concat within max), `-` (numbers), `+=`, `-=` for assignments.
-   Functions: `function add(a, b) { return a + b; }`
-   Async functions: `async function fetcher() { return 1; }` returning a promise; use `await fetcher();`.
-   Blocks: braces are required for function bodies; statements accept optional semicolons after expressions/returns.
-   Arrays: `array<5> 1, 2, 3` (max length 5). If `<max>` omitted, the CLI default applies. Concatenation checks combined length does not exceed summed max.

## Bytecode pipeline

1. `lexer` → tokens
2. `parser` → AST
3. `semantics` → type/constraint checks (ops, const reassignment, array max, await on promises, nested function decls rejected)
4. `compiler` → bytecode JSON
5. `vm` → executes bytecode with async/await + sys globals

Bytecode layout (JSON):

-   `main`: instruction list for top-level code
-   `functions`: map of compiled functions with params/async flag
-   `globals`: names created via `sys`
-   `source`: original path

## Example

`hello.rc`

```
sys let shared = "hi";

function greet(name) {
  const msg = shared + ", " + name;
  return msg;
}

async function demo() {
  let nums = array<4> 1, 2;
  nums += array<4> 3, 4;
  return await greet("rc");
}

let result = await demo();
```

Compile and run:

```bash
bun run src/index.ts compile hello.rc
bun run src/index.ts run hello.rc
```
