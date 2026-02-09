import { fn, type, voidType, object, boolean } from "../types";
import type { AnyData, Expr, Type, TypeInstance, Variable } from "../type";
import { call } from "../types";
import { Context, Runner, VM } from "../vm";

const ctx = new Context();
function register(name: string, data: TypeInstance<Type>) {
	ctx.setVar(name, data);
}

register(
	"exit",
	fn((args, runner, vm, obj) => {
		vm.break = true;
		return voidType();
	}),
);

register(
	"print",
	fn((args, runner, vm, obj) => {
		console.log(
			`${Object.values(args)
				.map((a) => {
					const val = vm.execAny(a, runner);
					const obj = call(val, val.data.class.public.__str__, [], runner, vm);
					return obj.data.private.value;
				})
				.join(" ")}`,
		);
		return voidType();
	}, ["a","b","c","d"]),
);

register("true", boolean(true))
register("false", boolean(false))

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
