// M7 TS AOT demo: compile with
//   ./qjsc -c -o /tmp/ts_aot_demo.c examples/ts_aot_demo.ts
// then link the bytecode into a zero-parser host (see
// examples/ts_aot_host.c) and call the exported main().
interface Point { x: number; y: number; }
enum Color { Red, Green, Blue }
class Vec {
    constructor(public x: number, public y: number) {}
    add(o: Vec): Vec { return new Vec(this.x + o.x, this.y + o.y); }
}
function dist(p: Point): number { return p.x + p.y; }
export function main(): number {
    const v = new Vec(1, 2).add(new Vec(3, 4));
    return dist(v) + Color.Green; // 9 + 2 = 11
}
