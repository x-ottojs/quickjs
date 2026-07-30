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

print("ALL TS TESTS PASSED");
