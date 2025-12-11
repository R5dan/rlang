import types from "./types";
import signs from "./signs";
import type { CODE, TYPE } from "./types_";
import { z } from "zod";
export class Compiler {
	constructor(public code: string) {}

	isBreak(char: string) {
		return char === "\n" || char === ";" || char === "}";
	}

	compile() {
		let i = 0;
		const line: (TYPE | { type: "sign"; data: string })[] = [];
		while (true) {
			const char = this.code[i];
			if (!char) {
				break;
			}
			let found = false;
			for (const type of Object.values(types)) {
				console.log(JSON.stringify(type));
				const match = new RegExp(type.begin).exec(char);
				if (match) {
					found = true;
					i += match[0].length;
					const [data, length] = type.compile(this.code.slice(i), {
						res: char,
						comp: this,
					});
					line.push(data);
					i += length;
					break;
				}
			}
			if (found) continue;
			for (const sign of Object.values(signs)) {
				if (sign.sign === char) {
					line.push({
						type: "sign",
						data: char,
					});
					found = true;
					break;
				}
			}
			if (found) continue;
			if (char === " ") {
				continue;
      } else if (this.isBreak(char)) {
        break;
      }
			throw new Error(`Invalid character: ${char}`);
		}
		const compiled: CODE[] = [];
		i = 0;
		while (true) {
			const item = line[i];
			if (!item) {
				break;
			}
			if (item.type === "sign") {
				const sign = signs[item.data as keyof typeof signs];
				if (!sign) {
					throw new Error("Invalid sign");
				}
				const [data, pre, post] = sign.compile(compiled, line, this);
				compiled.push(data);
				i += post;
				new Array(pre).forEach(() => compiled.pop());
			} else if (typeof item === "string") {
				throw new Error("Invalid item");
			} else {
				compiled.push(item);
				i++;
			}
		}

		return [compiled, i];
	}
}
