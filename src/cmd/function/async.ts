import type Cmd from "../cmd";
import type { CODE } from "../../types";
import type { FunctionData } from "./types";

export default {
	keyword: "async" as const,
	compile(line, ctx) {
		const regex = new RegExp(
			"function\\s+(?<name>[a-zA-Z_]+)\\s*\\((?<args>[a-zA-Z, ]*)\\)"
		);
		const advancedRegex = new RegExp(
			"function\\s+(?<name>[a-zA-Z_]+)\\s*\\((?<args>[a-zA-Z, ]*)\\)\\s*{(?<line>.*)"
		);
		const match = regex.exec(line);
		if (!match) {
			console.error(match);
			console.error(line);
			throw new Error("Invalid function");
		}
		const args = match!.groups!.args!.split(",").map((arg) => {
			return arg.trim();
		});
		const name = match!.groups!.name!;
		if (!args.every((arg) => new RegExp("^[a-zA-Z]+$").test(arg.trim()))) {
			throw new Error("Invalid args");
		}
		let code: CODE[] = [];
		let length = 0;
		const advancedMatch = advancedRegex.exec(line);
		if (advancedMatch) {
			const testCode = [advancedMatch.groups!.line!].concat(ctx.code);
			[length, code] = ctx.compile(testCode);
		} else if (!ctx.code[0]!.trim().startsWith("{")) {
			throw new Error("Invalid function");
		} else {
			[length, code] = ctx.compile(
				[ctx.code[0]?.trim().slice(1)!].concat(ctx.code)
			);
			length++;
		}

		return [
			length,
			{
				name,
				code,
				args,
				length,
				async: true,
			},
		];
	},
	async execute(data, ctx) {
		ctx.ctx.ctx[data.name] = {
			type: "type",
			value: {
				type: "function",
				value: {
					name: data.name,
					args: data.args,
					code: data.code,
					async: data.async,
				},
			},
		};
		ctx.pc += data.length;
	},
} satisfies Cmd<FunctionData<true>>;
