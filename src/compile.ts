import cmds from "./cmd";
import types from "./types_";
import exprs from "./expr";
import type { CODE, EXPR, TYPE, VARIABLE } from "./types";
import path from "path";
import { readdir } from "fs/promises";

export function compileExpr(code: string): [EXPR | TYPE | VARIABLE, number] {
	let i = 0;
	let word = "";
	const line: (
		| VARIABLE
		| TYPE
		| { type: "expr"; data: { name: string; text?: string } }
		| { type: "comp"; data: EXPR | TYPE | VARIABLE }
	)[] = [];
	console.log(`COMPILE EXPR: "${code}"`);
	while (true) {
		const char = code[i];
		const rem = code.slice(i);
		console.log(`CHAR: "${char}" REM: "${rem}"`);
		console.log(`WORD: "${word}" LINE: "${JSON.stringify(line)}"`);

		if (!char) {
			console.log(`BREAK: "${word}"`);
			if (word) {
				console.log(`PUSHING VARIABLE: "${word}"`);
				line.push({
					type: "var",
					data: { name: word },
				});
			}
			break;
		}
		let found = false;
		if (char === " ") {
			if (word.trim() !== "") {
				line.push({
					type: "var",
					data: { name: word },
				});
				word = "";
			}
			i++;
			continue;
		}
		// if (char === "(") {
		// 	const [val, l] = compileExpr(code.slice(i + 1));
		// 	line.push({ type: "comp", data: val });
		// 	i += l;
		// }
		// if (char === ")") {
		// 	break;
		// }
		for (const [name, expr] of Object.entries(exprs)) {
			if (expr.sign === char) {
				if (word.trim() !== "") {
					console.log(`PUSHING VARIABLE:56: "${word}"`);
					line.push({ type: "var", data: { name: word } });
					word = "";
				}
				if (typeof expr.post === "number") {
					line.push({ type: "expr", data: { name } });
					i++;
				} else if (typeof expr.post === "string") {
					let text = "";
					console.log(`REM: ${rem}`);
					for (const x of rem.slice(1)) {
						console.log(`    ${x}`);
						if (x !== expr.post) {
							text += x;
						} else {
							break;
						}
					}
					line.push({ type: "expr", data: { name, text } });
					i += text.length + 1;
					console.log(`Skipping ${text}|${rem}|${i}|${text.length}`);
				}
				found = true;
				break;
			}
		}
		if (found) continue;
		for (const type of Object.values(types)) {
			if (typeof type.schema === "string") {
				const regex = new RegExp(`^${type.schema}`);
				const test = regex.exec(rem);
				if (test) {
					const val = type?.compile
						? type.compile(test.groups!.val!, compileExpr)
						: test.groups!.val!;
					if (word.trim() !== "") {
					console.log(`PUSHING VARIABLE:92: "${word}"`);
						line.push({ type: "var", data: { name: word } });
						word = "";
					}
					line.push({
						type: "type",
						data: {
							type: type.name,
							value: val,
						},
					});
					found = true;
					i += test[0].length;
					break;
				}
			} else if (Array.isArray(type.schema)) {
				for (const schema of type.schema) {
					const regex = new RegExp(`^${schema}`);
					const test = rem.match(regex);
					if (test) {
						const val = regex.exec(rem)!.groups!.val!;
						if (word.trim() !== "") {
							line.push({ type: "var", data: { name: word } });
							word = "";
						}
						line.push({
							type: "type",
							data: {
								type: type.name,
								value: val,
							},
						});
						i += test[0].length;
						found = true;
						break;
					}
				}
			} else {
				throw new Error("Invalid schema");
			}
		}
		if (found) continue;
		console.log("ADDED TO WORD");
		word += char;
		i++;
	}
	const files = readdir("./logs")
		.then((files) =>
			files.reduce((acc, file) => {
				return Math.max(
					acc,
					parseInt(path.basename(file, path.extname(file)))
				);
			}, 0)
		)
		.then((max) =>
			Bun.write(`./logs/${max + 1}.json`, JSON.stringify(line))
		)
		.catch((err) => console.error(err));
	const compiled: CODE[] = [];
	let lastExpr: TYPE | EXPR | VARIABLE;
	let isExpr = false;
	i = 0;
	console.log(`COMPILING: "${JSON.stringify(line)}"`)
	function expr_(item: {
		type: "expr";
		data: { name: string; text?: string };
	}) {
		console.log(`${item} ${exprs}`);
		const expr = exprs[item.data.name as keyof typeof exprs];
		if (!expr) throw new Error("Invalid expression type");

		const pre = compiled.splice(i - expr.pre, i);
		let data;
		if (typeof expr.post === "number") {
			const post = line.splice(i + 1, i + 1 + expr.post).map((x) => {
				if (x.type === "comp") {
					return x.data;
				} else if (x.type === "expr") {
					return expr_(x);
				} else {
					return x;
				}
			});

			data = expr.compile(pre, post);
		} else {
			const post = item.data.text!;
			data = expr.compile(pre, post);
		}
		const compiledData = {
			type: "expr",
			data: { expr: item.data.name, data },
		} satisfies EXPR;
		return compiledData;
	}
	while (i < line.length) {
		const item = line[i];
		if (!item) throw new Error("Invalid expression");
		if (item.type === "comp") {
			const comp = item.data;
			compiled.push(comp);
			i++;
		} else if (item.type === "expr") {
			const compiledData = expr_(item);
			compiled.push(compiledData as EXPR);
			lastExpr = compiledData;
			isExpr = true;
			i++;
		} else {
			if (!isExpr) {
				lastExpr = item;
			}
			compiled.push(item);
			i++;
		}
	}
	console.log(`RETURNING: "${JSON.stringify(lastExpr)}"`)
	return [lastExpr, i]!;
}

export default function compile(input: string[]) {
	let pc = 0;
	const compiled = [];
	const code = input.filter((l) => l.trim() !== "");
	let brackets = 1;
	while (true) {
		const line = code[pc]?.trim();
		console.log(`Line: ${pc}: ${line}`);
		if (!line) break;
		if (line === "}") {
			brackets--;
			pc++;
			continue;
		}
		if (brackets === 0) break;

		const cmd = line.split(" ")[0] as keyof typeof cmds;
		const inst = cmds[cmd];

		if (inst) {
			const [i, data] = inst.compile(line.slice(cmd.length + 1), {
				compile,
				compileExpr,
				code: code.map((x) => x).splice(pc + 1),
			});
			console.log(`SKIPPING ${i} for ${cmd} from ${pc}`);
			compiled.push({
				type: "kword",
				data: {
					kword: cmd,
					data,
				},
			});
			pc += i;
			continue;
		} else {
			const data = compileExpr(line);
			if (data) {
				compiled.push({
					type: "expr",
					data,
				});
			} else if (line.trim() === "{") {
				brackets++;
			} else if (line.trim() === "}") {
				brackets--;
			} else {
				throw new Error("Invalid line");
			}
		}
		pc++;
	}

	return [pc, compiled];
}
