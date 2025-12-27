import Lexer from "./lexer";
import { Command } from "commander";
import { z } from "zod";

const program = new Command();

program
	.command("lex")
	.argument("<file>")
	.action(async (fileLoc) => {
		const lexer = new Lexer();
		const file = Bun.file(fileLoc);
		const contents = await file.text();
		const tokens = lexer.lex(contents);
		const out = Bun.file("lex.json");
		await out.write(JSON.stringify(tokens, null, 4));
	});

program.parse();
