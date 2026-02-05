import builtins from "./src/builtin"
import { VM, Runner, Context, Line } from "./src/vm"

const file = Bun.file("tests\\func\\test.rl.rc.json")
const data = await file.json() as any[]

const ctx = new Context(builtins)

const vm = new VM([], [], [])
const r = new Runner(vm, ctx)

r.load(data)
r.exec()
vm.run()
