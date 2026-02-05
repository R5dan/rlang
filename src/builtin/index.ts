import { functionType, type, voidType, object } from "../types";
import type { AnyData, Expr, Type, Variable } from "../type";
import { call } from "../types";
import { Context, Runner, VM } from "../vm";

const ctx = new Context();
function register(name: string, data: Type) {
	ctx.setVar(name, data);
}

register(
	"exit",
	functionType((args, runner, vm) => {
		vm.break = true;
		return voidType();
	}),
);

register(
	"print",
	functionType((args: (Variable | Expr | Type)[], runner: Runner, vm: VM) => {
		console.log(
			`${args
				.map((a) =>
					call(vm.execAny(a, runner).data.private.__str__, [], runner, vm).data.private.value,
				)
				.join(" ")}`,
		);
		return voidType();
	}),
);

// register("console", {
// 	name: "console",
// 	inheritance: [object()],
// 	public: {
// 		log: type({
// 			name: "function",
// 			inheritance: [type()],
// 			public: {},
// 			private: {
// 				__call__(args: (Variable | Expr | Type)[], runner: Runner, vm: VM) {
// 					console.log(JSON.stringify(runner.ctx));
// 					console.log(args.map((a) => vm.execAny(a, runner)));
// 					console.log(
// 						`'${args
// 							.map((a) =>
// 								call(vm.execAny(a, runner).data.public.__str__, [], runner, vm),
// 							)
// 							.join("' '")}'`,
// 					);
// 					return voidType();
// 				},
// 			},
// 		}),
// 	},
// });

export default ctx;
