import type Cmd from "../cmd";
import type { CODE } from "../../types";
import type { FunctionData } from "./types";

export default {
	keyword: "function" as const,
	compile(line, ctx) {
		const regex = new RegExp(
			"(?<name>[a-zA-Z_]+)\\s*\\((?<args>[a-zA-Z, ]*)\\)"
		);
		const advancedRegex = new RegExp(
			"(?<name>[a-zA-Z_]+)\\s*\\((?<args>[a-zA-Z, ]*)\\)\\s*{(?<line>.*)"
		);
		const match = regex.exec(line);
		if (!match) {
			throw new Error("Invalid function");
		}
		const args = match!.groups!.args!.split(",").map((arg) => {
			console.log(`    "${arg}"`);
			return arg.trim();
		});
		const name = match!.groups!.name!;
		if (!args.every((arg) => new RegExp("^[a-zA-Z]+$").test(arg.trim()))) {
			console.error(args);
			console.log(`"${match!.groups!.args}"`);
			console.log(`"${match!.groups!.name}" ${name}`);
			throw new Error("Invalid args");
		}
		let code: CODE[] = [];
		let length = 1;
		const advancedMatch = advancedRegex.exec(line);
		if (advancedMatch) {
			[length, code] = ctx.compile(
				[advancedMatch.groups!.line!].concat(ctx.code)
			);
		} else if (!ctx.code[0]!.trim().startsWith("{")) {
			throw new Error("Invalid function");
		} else {
			[length, code] = ctx.compile(
				[ctx.code[0]?.trim().slice(1)!].concat(ctx.code)
			);
		}
		return [
			length+1,
			{
				name,
				code,
				args,
				length,
				async: false,
			} satisfies FunctionData<false>,
		];
	},
	async execute(data, ctx) {
		ctx.ctx.ctx[data.name] = {
			type: "function",
			value: data,
		};
	},
} satisfies Cmd<FunctionData<false>>;
