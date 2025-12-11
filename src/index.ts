import { Command } from "commander";
import z from "zod";
import compile from "./compile";
import path from "path";
import { Executor, Runner } from "./run";

const compileFlags = z.object({
	output: z.string().optional(),
});

async function runAction(filePath: string) {
	const file = Bun.file(filePath);

	const code = await file.json();
	const executor = new Executor();
	const runner = new Runner(code, executor);
	runner.execute();
  await executor.execute();
  console.log(JSON.stringify(runner.ctx.ctx));
}

async function compileAction(
	filePath: string,
	args: z.infer<typeof compileFlags>
) {
	const flags = compileFlags.parse(args);

	const file = Bun.file(filePath);
	if (!(await file.exists())) {
		throw new Error(`File ${filePath} does not exist`);
	}
	const code = (await file.text()).split("\n");

	const [_, compiled] = compile(code);
	const data = JSON.stringify(compiled);

	if (flags.output) {
		await Bun.write(flags.output, data);
	} else {
		await Bun.write(
			`${path.basename(filePath, path.extname(filePath))}.rc`,
			data
		);
	}
}

const cmd = new Command();

cmd.command("compile")
	.argument("<file>", "file to compile")
	.option("-o, --output <file>", "output file")
	.action(compileAction);
cmd.command("run").argument("<file>", "file to run").action(runAction);
cmd.parse();
