import { Command } from "commander";
import { Compiler } from "./compiler";
import path from "path";
const program = new Command();

program.command("compile").argument("<file>", "file to compile").action(async (filepath) => {
  console.log(`Compiling ${filepath}`)
  const file = Bun.file(filepath);
  const code = await file.text();
  console.log(`Compiling ${filepath}`)
  const [compiled, i] = new Compiler(code).compile();
  console.log(`Compiled ${filepath}`)

  await Bun.write(`${path.basename(filePath, path.extname(filePath))}.rc`, compiled)
  console.log(`Output ${filepath}\nRead ${i} characters`)
})

program.parse();