/* test_ts.js — TypeScript annotation consumption (M1)
 * Run with: ./qjs --ts tests/test_ts.js
 */

// variable type annotations
let x: number = 42;
print(x);

// const with type
const greeting: string = "hello";
print(greeting);

// boolean and null literal types
let b: boolean = true;
print(b);
let n: number | null = 5;
print(n);

// function parameters and return type
function add(a: number, b: number): number {
    return a + b;
}
print(add(1, 2));

// arrow function with type annotations
let mul: (a: number, b: number) => number = (a, b) => a * b;
print(mul(3, 4));

// union type
let v: string | number = "hello";
print(v);

// array type (postfix)
let arr: number[] = [1, 2, 3];
print(arr.length);

// tuple type
let pair: [number, string] = [1, "two"];
print(pair[0], pair[1]);

// generic type arguments
let nums: Array<number> = [10, 20, 30];
print(nums.length);

// intersection type
let obj: { a: number } & { b: string } = { a: 1, b: "x" };
print(obj.a, obj.b);

// class with typed members
class Point {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    sum(): number {
        return this.x + this.y;
    }
}
var p = new Point(1, 2);
print(p.x + p.y);
print(p.sum());

// readonly in object type (skipped to matching brace)
let vec: { readonly x: number; y: number } = { x: 1, y: 2 };
print(vec.x + vec.y);

// function type in return position
function makeFn(): () => number {
    return () => 99;
}
print(makeFn()());

// negative number literal type
let neg: -1 = -1;
print(neg);

// arrow function with return type annotation
var f1 = (): number => 42;
print(f1());

// optional parameter
function opt(x?: number): number { return x || 0; }
print(opt());
print(opt(5));

// arrow function with typed params and return type
var f2 = (a: number, b: number): number => a + b;
print(f2(10, 20));

// void return type
function voidFn(): void { print("void-ok"); }
voidFn();

// function type with void
var cb: (x: number) => void = (x) => print(x);
cb(7);

// nested generic type arguments (M2a: > token re-scanning)
let nested2: Array<Map<string, number>> = new Map();
print(typeof nested2);
let nested3: Array<Map<string, Set<number>>> = [];
print(typeof nested3);
let nested4: Array<Map<string, Set<Record<string, number>>>> = [];
print(typeof nested4);

// generic with union inside
let mixed: Array<string | number> = [1, "two", 3];
print(mixed.length);

// nested generic closing without space before '=' (>= / >>= merge test)
let tight1: Array<number>=[9];
print(tight1[0]);
let tight2: Array<Array<number>>=[[8]];
print(tight2[0][0]);

// M2b: generic call disambiguation
function id(x) { return x; }
print(id<number,string>(42));      // multi-arg => generic
print(id<number[]>(42));           // complex arg syntax => generic
var a1 = 5, b1 = 3, c1 = 1;
print(a1<b1>(c1));                 // single simple ident => comparison chain, NOT generic

// M2b: generic function/class declarations
function identity<T>(x) { return x; }
print(identity(99));
function bounded<T extends number>(x) { return x * 2; }
print(bounded(21));
class Box<T> {
    constructor(v) { this.v = v; }
}
var box = new Box(7);
print(box.v);

// M2b: generic arrow functions
var idArrow = <T>(x) => x;
print(idArrow(11));
var idArrowRet = <T>(x): number => x * 3;
print(idArrowRet(4));
var idArrowMulti = <T, U>(x, y) => x + y;
print(idArrowMulti(2, 3));

// M2b: as / satisfies / as const / non-null assertion
let asVal = 5 as number;
print(asVal);
let asConstVal = 5 as const;
print(asConstVal);
let satisfiesVal = { a: 1 } satisfies object;
print(satisfiesVal.a);
let nnVal = 5;
print(nnVal!);
print((5 as number)!);

// M2b: trailing comma in generic lists
var idArrowTC = <T,>(x) => x;
print(idArrowTC(13));
print(id<number,>(42));
function fTrailing<T,>(x) { return x; }
print(fTrailing(14));
class BoxTC<T,> { constructor(v) { this.v = v; } }
print(new BoxTC(15).v);

print("ALL TS TESTS PASSED");
