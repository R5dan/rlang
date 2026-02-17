import Lexer from "./lexer";
import { Command } from "commander";
import path from "path";
import Parser from "./parser";

const program = new Command();

program
	.command("lex")
	.argument("<file>")
	.action(async (fileLoc) => {
		const lexer = new Lexer();
		const file = Bun.file(fileLoc);
		const contents = await file.text();
		const tokens = lexer.lex(contents, fileLoc);
		tokens.push({
			kind: "EOF",
			value: null,
			pos: {
				loc: null,
				line: null,
				col: null,
				file: fileLoc
			}
		})
		const out = Bun.file(
			path.join(
				path.dirname(fileLoc),
				`${path.basename(fileLoc, path.extname(fileLoc))}.rl.json`
			)
		);
		await out.write(JSON.stringify(tokens, null, 4));
	});

program
	.command("parse")
	.argument("<file>")
	.action(async (fileLoc) => {
		const file = Bun.file(fileLoc);
		const contents = await file.json()
		const parser = new Parser(contents);
		const tokens = parser.parse();
		const out = Bun.file(
			path.join(
				path.dirname(fileLoc),
				`${path.basename(fileLoc, path.extname(fileLoc))}.rc.json`
			)
		);
		await out.write(JSON.stringify(tokens, null, 4));
	});

program.parse();
