import { Command } from "commander";
import { intro, outro, spinner, text } from "@clack/prompts";
import { compileSource, loadSourceFile } from "./compiler";
import { executeBytecode } from "./vm";
import { resolve } from "node:path";

const pkg = { name: "rc", version: "0.1.0" };

export async function runCli() {
  const program = new Command();
  program.name("rc").description("rc language compiler and runner").version(pkg.version);

  program
    .command("compile")
    .argument("<file>", "rc source file")
    .option("-o, --out <file>", "output bytecode path", "")
    .option("--array-max <num>", "default max array length when unspecified", "256")
    .description("compile rc source to bytecode json")
    .action(async (file, opts) => {
      intro("rc compile");
      const s = spinner();
      s.start("Compiling");
      try {
        const maxArray = Number(opts.arrayMax ?? opts.arraymax ?? opts["array-max"]);
        const defaultArrayMax = Number.isFinite(maxArray) ? maxArray : 256;
        const { bytecode } = await compileSource(await loadSourceFile(file), { defaultArrayMax });
        const outPath = opts.out ? resolve(opts.out) : resolve(`${file}.rcb.json`);
        await Bun.write(outPath, JSON.stringify(bytecode, null, 2));
        s.stop(`Wrote bytecode -> ${outPath}`);
        outro("Done");
      } catch (err) {
        s.stop("Failed");
        outro((err as Error).message);
        process.exitCode = 1;
      }
    });

  program
    .command("run")
    .argument("<file>", "rc source file or bytecode json")
    .option("--bytecode", "treat input as precompiled bytecode", false)
    .option("--array-max <num>", "default max array length when unspecified", "256")
    .description("compile and run rc program (or run provided bytecode)")
    .action(async (file, opts) => {
      intro("rc run");
      const s = spinner();
      s.start(opts.bytecode ? "Loading bytecode" : "Compiling + running");
      try {
        const maxArray = Number(opts.arrayMax ?? opts.arraymax ?? opts["array-max"]);
        const source = await loadSourceFile(file);
        const defaultArrayMax = Number.isFinite(maxArray) ? maxArray : 256;
        const { bytecode } = opts.bytecode
          ? { bytecode: JSON.parse(source.content) }
          : await compileSource(source, { defaultArrayMax });
        s.stop("Starting VM");
        await executeBytecode(bytecode);
        outro("Execution finished");
      } catch (err) {
        s.stop("Failed");
        outro((err as Error).message);
        process.exitCode = 1;
      }
    });

  program
    .command("repl")
    .description("simple interactive compile+run loop")
    .action(async () => {
      intro("rc repl");
      const buffer: string[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const line = await text({ message: "rc>", placeholder: "type 'exit' to quit" });
        if (!line || line === "exit") break;
        buffer.push(String(line));
        if (line.trim().endsWith("}")) {
          const source = buffer.join("\n");
          try {
            const { bytecode } = await compileSource({ path: "<repl>", content: source }, { defaultArrayMax: 256 });
            await executeBytecode(bytecode);
          } catch (err) {
            outro((err as Error).message);
          }
          buffer.length = 0;
        }
      }
      outro("bye");
    });

  await program.parseAsync(process.argv);
}

