import { Command } from "commander";
import { Compiler } from "./compiler";
import path from "path";
import * as p from "@clack/prompts";


const program = new Command();


program
	.command("lex")
	.argument("<path>", "file to lex")
	.action(async (filePath: string) => {
		const file = Bun.file(filePath);
		const code = await file.text();
		const compiler = new Compiler(code, []);
		const tokens = compiler.lex();
		const out = Bun.file(
			`${path.basename(filePath, path.extname(filePath))}.rl`
		);
		await out.write(JSON.stringify(tokens));
	});

program
	.command("compile")
	.argument("<path>", "file to compile")
	.option("--nl, --no-lex", "Do not lex the file")
	.option("--ol, --output-lex", "Output the lex file")
	.action(
		async (
			filePath,
			{
				noLex,
				outputLex,
			}: {
				noLex: boolean;
				outputLex: boolean;
			}
		) => {
			const file = Bun.file(filePath);
			const code = await file.text();
			console.log("Starting compilation")
			const compiler = new Compiler(code, []);
			if (!noLex) {
				console.log("Lexing code");
				const tokens = compiler.lex();
				console.log("Lexed");
				if (outputLex) {
					console.log("WRITING LEX");
					const out = Bun.file(
						`${path.basename(filePath, path.extname(filePath))}.rl`
					);
					const write = (a: number = 1) =>
						out
							.write(JSON.stringify(tokens))
							.then(() => {
								console.log("Successfully wrote file");
							})
							.catch(() => {
								if (a === 3) {
									console.error("Failed to write file");
								} else {
									write(a++);
								}
							});
					write();
				}
			}
			console.log("\n\n\n\n\n\n\n\n\n\n\n")
			const tokens = compiler.compile();
			console.log("COMPILED")
			const out = Bun.file(
				`${path.basename(filePath, path.extname(filePath))}.rc`
			);
			console.log("WRITING")
			await out.write(JSON.stringify(tokens));
			console.log("DONE")
		}
	);

program.parse();
