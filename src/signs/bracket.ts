import type { Sign } from "./type";

export const open = {
  name: "Bracket",
  description: "Bracket",
  sign: "(",
  compile(pre, post) {
    const prep = pre[-1];
    if (prep && prep.type === "var") {
      const args = []
      let i = 0
      while (true) {
        const val = post[i];
        if (!val) {
          throw new Error("Syntax Error")
        }
        if (val.type === "sign" && val.data === "Close-Bracket") {
          break
        } else {
          args.push(val)
        }
        i++
      }
      return [{
        type: "expr",
        data: {
          expr: "call",
          data: {
            var: prep,
            args
          }
        }
      }]
    } else {
      const group = []
      let i = 0;
      while (true) {
        const val = post[i];
        if (!val) {
          throw new Error("Syntax Error")
        }
        if (val.type === "sign" && val.data === "Close-Bracket") {
          break
        } else {
          group.push(val)
        }
      }

      return [{
        type: "expr",
        data: {
          expr: "group",
          data: group
        }
      }, 0, i]
    }
  }
} satisfies Sign

export const close = {
  name: "Close-Bracket",
  description: "Bracket",
  sign: ")",
  compile(pre, post) {
    throw new Error("Syntax Error")
  }
} satisfies Sign