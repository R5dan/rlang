// import Lexer from "./src/lexer";
// import path from "path";



// const lexer = new Lexer();
// const file = Bun.file("tests\\func\\test.r");
// const contents = await file.text();
// const tokens = lexer.lex(contents, "tests\\func\\test.r");
// tokens.push({
//     kind: "EOF",
//     value: null,
//     pos: {
//         loc: null,
//         line: null,
//         col: null,
//         file: "tests\\func\\test.r"
//     }
// })
// const out = Bun.file(
//     path.join(
//         path.dirname("tests\\func\\test.r"),
//         `${path.basename("tests\\func\\test.r", path.extname("tests\\func\\test.r"))}.rl.json`
//     )
// );
// await out.write(JSON.stringify(tokens, null, 4));

// import path from "path"
// import Parser from "./src/parser";

// const file = Bun.file("tests\\func\\test.rl.json");
// const contents = await file.json()
// const parser = new Parser(contents);
// const tokens = parser.parse();
// const out = Bun.file(
//     path.join(
//         path.dirname("tests\\func\\test.rl.json"),
//         `${path.basename("tests\\func\\test.rl.json", path.extname("tests\\func\\test.rl.json"))}.rc.json`
//     )
// );
// await out.write(JSON.stringify(tokens, null, 4));

import builtins from "./src/builtin";
import { VM, Runner, Context, Line } from "./src/vm";

const file = Bun.file("tests\\func\\test.rl.rc.json");
const data = (await file.json()) as any[];

const ctx = new Context(builtins);

const vm = new VM([], [], []);
const r = new Runner(vm, ctx);

r.load(data);
r.exec();
vm.run();
