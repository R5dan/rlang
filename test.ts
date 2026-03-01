const loc = "tests\\func\\test"

// import Lexer from "./src/lexer";
// import path from "path";

// const lexer = new Lexer();
// const file = Bun.file(`${loc}.r`);
// const contents = await file.text();
// const tokens = lexer.lex(contents, `${loc}.r`);
// tokens.push({
//     kind: "EOF",
//     value: null,
//     pos: {
//         loc: null,
//         line: null,
//         col: null,
//         file: `${loc}.r`
//     }
// })
// const out = Bun.file(
//     path.join(
//         path.dirname(`${loc}.r`),
//         `${path.basename(`${loc}.r`, ".r")}.rl`
//     )
// );
// await out.write(JSON.stringify(tokens, null, 4));

// import path from "path"
// import Parser from "./src/parser";

// const file = Bun.file(`${loc}.rl`);
// const contents = await file.json()
// const parser = new Parser(contents);
// const tokens = parser.parse();
// const out = Bun.file(
//     path.join(
//         path.dirname(`${loc}.rl`),
//         `${path.basename(`${loc}.rl`, ".rl")}.rc`
//     )
// );
// await out.write(JSON.stringify(tokens, null, 4));

import builtins from "./src/builtin";
import { VM, Runner, Context, Line } from "./src/vm";

const file = Bun.file(`${loc}.rc`);
const data = (await file.json()) as any[];

const ctx = new Context(builtins);

const vm = new VM([], [], []);
const r = new Runner(vm, ctx);

r.load(data);
r.exec();
vm.run();
