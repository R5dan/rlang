import type { Type } from "./type";
import type { CODE, TOKEN, TYPE } from "../types_";
import { assert, debug } from "../utils";

export default {
	name: "function",
	description: "A function",
	char: "function ",

	lex(val, ctx, loc) {
		let part = "name";
		let name = "";
		const args: TOKEN<any>[] = [];
		const code: TOKEN<any>[] = [];
		ctx.advance(9);
		while (true) {
			const char = ctx.advance();
			console.log(
				`........ ${JSON.stringify(char)} ${JSON.stringify(
					ctx.loc()
				)} ${part}`
			);
			if (part === "name") {
				if (char === "(") {
					console.log(`PART ${char} ${ctx.loc()}`);
					part = "args";
					name = name.trim();
					continue;
				} else if (ctx.isAlnum(char) || char === " ") {
					name += char;
				} else {
					console.log(`Name: ${name} Char: ${char}`);
					throw new Error(
						`Unexpected character '${char}' at ${JSON.stringify(
							ctx.loc()
						)}`
					);
				}
			} else if (part === "args") {
				if (char === ")") {
					part = "code";
				} else if (char === ",") {
					args.push({
						type: "char",
						value: char,
						from: loc,
						to: loc,
					});
				} else {
					args.push(...ctx.lex(char));
				}
			} else if (part === "code") {
				if (char === "}") {
					break;
				} else {
					code.push(...ctx.lex(char));
				}
			}
		}

		ctx.push(
			"function",
			{
				name,
				args,
				code,
			},
			loc
		);
	},

	compile(val, ctx) {
		const args = new Map<string, TYPE<any> | undefined>();
		const argTemp = val.value.args.reduce(
			(acc, val) => {
				if (val.type !== "char") {
					throw new Error("Syntax Error");
				}
				if (val.value === ",") {
					acc[1].push(acc[0]);
					acc[0] = [];
				} else {
					acc[0].push(val);
				}
				return acc;
			},
			[[], []] as [TOKEN<any>[], TOKEN<any>[][]]
		);
		const preArgs = argTemp[1];
		preArgs.push(argTemp[0]);

		const compArgs = preArgs.map((arg) => ctx.compile(arg));
		compArgs.forEach((long) => {
			const arg = long[0];
			if (!arg)
				throw new Error(`Invalid argument '${JSON.stringify(long)}'`);

			if (arg.type === "var") {
				args.set(arg.data.name, undefined);
			} else if (arg.type === "expr") {
				assert(
					arg.data.expr === "setVar",
					debug`Not a valid expr ${arg}`
				);
				args.set(arg.data.data.var, arg.data.data.val);
			}
		});

		const code = ctx.compile(val.value.code);
		return {
			type: "type",
			data: {
				type: "function",
				value: {
					name: val.value.name,
					args,
					code,
				},
			},
		};
	},
} satisfies Type<
	{
		name: string;
		args: TOKEN<any>[];
		code: TOKEN<any>[];
	},
	{
		name: string;
		args: Map<string, TYPE<any> | undefined>;
		code: CODE[];
	}
>;
