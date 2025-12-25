import fs from "fs";
import path from "path";
import { parse } from "./parser.js";
import { typecheck, makeEnv } from "./typechecker.js";
import { compile } from "./compiler.js";
import { VM } from "./vm.js";
import { makeNativeRegistry, registerModule } from "./native-loader.js";

async function main() {
	const argv = process.argv.slice(2);
	if (argv.length === 0) {
		console.log("Usage: ts-node src/index.ts <file.mlang>");
		process.exit(1);
	}
	const entry = argv[0];
	const src = fs.readFileSync(entry, "utf8");
	const prog = parse(src);

	const native = makeNativeRegistry();
	// register a native module accessible as "console.log" or "console"
	registerModule(native, "console", {
		log: (...a: any[]) => console.log(...a),
	});
	// also register as a top-level function name 'print' exists in makeNativeRegistry

	const env = makeEnv();
	typecheck(prog, env, native);

	// collect native names for compiler to generate CALL_NATIVE
	const nativeNames = new Set<string>();
	for (const k of native.keys()) nativeNames.add(k);
	// also include registered module fns like console.log -> key 'console.log'
	const bc = compile(prog, nativeNames);

	// Create VM and load bytecode
	const vm = new VM(native);
	vm.loadBytecode(bc);

	// We need to register labels for functions compiled by compile()
	// compile() placed functions at their positions in instrs when creating labelPositions in code,
	// but we didn't transport that out. As a practical solution for this prototype,
	// we scan the bytecode for function prologues: we assume functions start at positions
	// where user compiled FuncDecls were placed; to keep things simple, compile() inlines
	// functions sequentially and set labelPositions inside compile() but didn't export.
	// Workaround: parse again to find function order and map them to PC in sequence.
	let pc = 0;
	const instrs = (bc as any).instrs as any[];
	// Build a list of function starting PCs by reading the compilation order:
	// We will rely on the parse order: functions were compiled in parse order,
	// so we iterate prog.body, and for each FuncDecl assign next function pc.
	for (const s of prog.body) {
		if (s.type === "FuncDecl") {
			vm.registerLabel(s.name, pc);
			// naive: find next RETURN for function to jump to next
			// We assume functions are back-to-back and end with RETURN
			// scan forward until a RETURN is found, then pc becomes next index
			let j = pc;
			while (j < instrs.length) {
				if (instrs[j].op === "RETURN") {
					j++;
					break;
				}
				j++;
			}
			pc = j;
		}
	}

	const result = vm.run();
	console.log("Program finished with:", result);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
