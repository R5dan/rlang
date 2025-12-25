// Simple native loader: register a JS/TS object as a native module
import type { NativeRegistry } from "./vm.js";

export function makeNativeRegistry(): NativeRegistry {
	const m = new Map<string, (...args: any[]) => any>();
	// Register console.log by default
	m.set("print", (...args: any[]) => {
		console.log(...args);
	});
	// Example native module under name "sys"
	m.set("sys.now", () => Date.now());
	return m;
}

// helper to register a module object under a namespace, e.g. nativeRegistry.set("ns.fn", fn)
export function registerModule(
	reg: NativeRegistry,
	namespace: string,
	obj: Record<string, any>
) {
	for (const k of Object.keys(obj)) {
		reg.set(`${namespace}.${k}`, (...a: any[]) => obj[k](...a));
	}
}
