import z from "zod";

export default {
  name: "int",
  description: "integer",
  begin: "^[0-9]+",

  compile(val, ctx) {
    let num = "";
    num += val
    let i = 0;
    while (true) {
      const char = val[i]
      if (char in ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]) {
        num += char;
        i++;
      } else {
        return [{
          type: "type",
          data: {
            type: "int",
            value: num
          }
        }, i]
      }
    }
  }
}