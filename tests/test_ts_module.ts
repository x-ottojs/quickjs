// M7: TS module chain -- run with: ./qjs -m tests/test_ts_module.ts
// Covers: export interface / export enum / implements / import type /
// cross-module .ts chains (module loader auto-enables TS for .ts).
import { ShapeKind, Circle, PI } from "./ts_lib/shapes.ts";
import type { Shape } from "./ts_lib/shapes.ts";

const c: Shape = new Circle(2);
print(c.kind === ShapeKind.Circle);
print(c.area().toFixed(2) === "12.57");
print(PI.toFixed(5) === "3.14159");
print("TS MODULE TESTS PASSED");
