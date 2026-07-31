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

// M3: interface (fully consumed, no runtime representation)
interface Point3 { x: number; y: number; }
interface Base3 { id: number; }
interface Derived3<T> extends Base3 { value: T; }
print("interface-ok");

// M3: type alias
type ID3 = number;
let idVal: ID3 = 7;
print(idVal);
type Box3<T> = { value: T };
let box3: Box3<number> = { value: 9 };
print(box3.value);

// M3: function overload signatures (no-body declarations)
function overload3(x: number): string;
function overload3(x) { return x; }
print(overload3(11));

// M3: declare function/const/class
declare function ambientFn(x: number): void;
declare const AMBIENT_VERSION: string;
declare let ambientCounter: number;
declare class AmbientClass { x: number; }
print("declare-ok");

// M3: 'declare'/'type'/'interface' used as ordinary identifiers must
// not be misparsed as TS declarations (regression guard for the
// pseudo-keyword detection added for M3)
var declare = 100;
declare = 101;
print(declare);
function declare2(x) { return x + 1; }
print(declare2(1));

// M4: enum (numeric, with reverse mapping)
enum Color { Red, Green, Blue }
print(Color.Red, Color.Green, Color.Blue);
print(Color[0], Color[1], Color[2]);

// M4: enum with explicit values and auto-increment continuation
enum Level { Low = 10, Mid, High }
print(Level.Low, Level.Mid, Level.High);

// M4: string enum (no reverse mapping)
enum Dir { Up = "UP", Down = "DOWN" }
print(Dir.Up, Dir.Down);
print(typeof Dir["UP"]);

// M4: heterogeneous enum
enum Mixed { A = 0, B = "str" }
print(Mixed.A, Mixed.B, Mixed[0]);

// M4: const enum (fully inlined, no runtime object/binding)
const enum Status { Active, Inactive }
print(Status.Active, Status.Inactive);
print(typeof Status);

// M4: const enum with string members
const enum CDir { Up = "UP", Down = "DOWN" }
print(CDir.Up, CDir.Down);

// M4: const enum lookup must not be confused with an ordinary object
// property of the same name (regression guard: enum_name+member_name
// are matched as a pair, not just the member name)
var lookAlike = { Active: 999 };
print(Status.Active, lookAlike.Active);

// M5: constructor parameter properties (non-derived)
class PointND {
    constructor(private x: number, public y: number, readonly z: number) {}
}
var pnd = new PointND(1, 2, 3);
print(pnd.x, pnd.y, pnd.z);

// M5: constructor parameter properties (derived, 'this' only usable
// after super())
class BaseD { constructor() { this.baseVal = 100; } }
class DerivedD extends BaseD {
    constructor(private x: number) { super(); }
}
var dd = new DerivedD(7);
print(dd.x, dd.baseVal);

// M5: parameter properties coexisting with class fields
class MixedPP {
    z = 99;
    constructor(private x: number) {}
}
var mpp = new MixedPP(5);
print(mpp.x, mpp.z);

// M5: namespace basic declaration + export const/function
namespace Basic {
    export const value = 42;
    export function greet() { return "hi from ns"; }
}
print(Basic.value, Basic.greet());

// M5: non-exported names inside a namespace are not leaked onto the
// namespace object
namespace WithSecret {
    const secret = 1;
    export const pub = secret + 1;
}
print(WithSecret.pub, typeof WithSecret.secret);

// M5: same-name namespace declaration merging (multiple blocks)
namespace Merged {
    export const a = 1;
}
namespace Merged {
    export const b = 2;
}
print(Merged.a, Merged.b);

// M5: namespace/class merging, direction 1 (class declared first)
class Album1 {
    constructor(t) { this.title = t; }
}
namespace Album1 {
    export function create(t) { return new Album1(t); }
}
var alb1 = Album1.create("dir1");
print(alb1.title, alb1 instanceof Album1);

// M5: namespace/class merging, direction 2 (namespace declared first)
namespace Album2 {
    export const label = "unknown";
}
class Album2 {
    constructor(t) { this.title = t; }
}
var alb2 = new Album2("dir2");
print(alb2.title, Album2.label, alb2 instanceof Album2);

// M5: namespace/function merging (both directions work "for free"
// since function declarations are var-like and reassignable)
function fnFirst() { return "fn"; }
namespace fnFirst {
    export const tag = "A";
}
print(fnFirst(), fnFirst.tag);

namespace fnSecond {
    export const tag = "B";
}
function fnSecond() { return "fn2 " + fnSecond.tag; }
print(fnSecond());

// M6a: legacy decorators -- method decorator
function logMethod(target, key, descriptor) {
    print("method decorated:", key);
}
class DecFoo1 {
    @logMethod
    greet() { return "hi"; }
}
print(new DecFoo1().greet());

// M6a: decorator factory + descriptor mutation
function enumerable(value) {
    return function(target, key, descriptor) {
        descriptor.enumerable = value;
        return descriptor;
    };
}
class DecFoo2 {
    @enumerable(false)
    greet() { return "hello"; }
}
var df2 = new DecFoo2();
print(Object.getOwnPropertyDescriptor(DecFoo2.prototype, "greet").enumerable, df2.greet());

// M6a: multiple decorators, composition order (top-to-bottom eval,
// bottom-to-top call)
var decOrder = [];
function first() {
    decOrder.push("first-eval");
    return function() { decOrder.push("first-call"); };
}
function second() {
    decOrder.push("second-eval");
    return function() { decOrder.push("second-call"); };
}
class DecFoo3 {
    @first()
    @second()
    method() {}
}
print(decOrder.join(","));

// M6a: property decorator (no descriptor, return value ignored)
var propDecorated = null;
function recordProp(target, key) { propDecorated = key; }
class DecFoo4 {
    @recordProp
    start;
}
print(propDecorated);

// M6a: static method decorator
function staticDec(target, key, descriptor) {
    print("static decorated on", typeof target === "function" ? "ctor" : "proto", key);
}
class DecFoo5 {
    @staticDec
    static method() { return 1; }
}
print(DecFoo5.method());

// M6a: class decorator (observe + replace)
var classDecCalled = false;
function sealedLike(ctor) { classDecCalled = true; }
@sealedLike
class DecFoo6 { x = 1; }
print(new DecFoo6().x, classDecCalled);

function reportable(ctor) {
    return class extends ctor {
        reportingURL = "http://example.com";
    };
}
@reportable
class DecFoo7 {
    type = "report";
    constructor(t) { this.title = t; }
}
var df7 = new DecFoo7("test");
print(df7.title, df7.type, df7.reportingURL);

// M6a: parameter decorator -- evaluated once at class declaration
// time (not per-construction), verified via a counter
var paramFactoryEvalCount = 0;
function traceParam(msg) {
    paramFactoryEvalCount++;
    return function(target, key, idx) {};
}
class DecFoo8 {
    constructor(@traceParam("p0") a, @traceParam("p1") b) {}
}
new DecFoo8(1, 2);
new DecFoo8(3, 4);
new DecFoo8(5, 6);
print(paramFactoryEvalCount);

// M6a: class + parameter decorators together (order matches tsc:
// __param entries applied before class decorator)
var comboOrder = [];
function comboClassDec(msg) {
    return function(ctor) { comboOrder.push("class:" + msg); };
}
function comboParamDec(msg) {
    return function(target, key, idx) { comboOrder.push("param:" + msg); };
}
@comboClassDec("A")
class DecFoo9 {
    constructor(@comboParamDec("p0") x) {}
}
print(comboOrder.join(","));

// M6a-metadata: emitDecoratorMetadata (Reflect.metadata polyfill,
// since QuickJS itself does not ship reflect-metadata -- matches the
// real-world usage pattern where reflect-metadata is imported by user
// code before design:type/paramtypes/returntype have any effect)
Reflect.metadata = function(k, v) {
    return function(target, key, descOrIdx) {
        var obj = (typeof descOrIdx === "number") ? target : (key === undefined ? target : target);
        obj.__meta = obj.__meta || {};
        var storeKey = (key === undefined ? "" : key + ":") + k;
        obj.__meta[storeKey] = v;
        if (descOrIdx !== undefined && typeof descOrIdx === "object" && descOrIdx !== null) {
            return descOrIdx;
        }
    };
};

function mdDec(target, key, desc) {}
class Point9 {}
class MetaLine {
    @mdDec point: Point9;
    @mdDec method(a: number, b: string): boolean { return true; }
}
print(MetaLine.prototype.__meta["point:design:type"] === Point9);
print(MetaLine.prototype.__meta["method:design:type"] === Function);
print(MetaLine.prototype.__meta["method:design:paramtypes"][0] === Number);
print(MetaLine.prototype.__meta["method:design:paramtypes"][1] === String);
print(MetaLine.prototype.__meta["method:design:returntype"] === Boolean);

function mdParamDec(t, k, i) {}
function mdClassDec(ctor) {}
@mdClassDec
class MetaCtor {
    constructor(a: number, b: Point9) {}
}
print(MetaCtor.__meta["design:paramtypes"][0] === Number);
print(MetaCtor.__meta["design:paramtypes"][1] === Point9);

class MetaCtor2 {
    constructor(@mdParamDec a: number, b: string) {}
}
print(MetaCtor2.__meta["design:paramtypes"][0] === Number);
print(MetaCtor2.__meta["design:paramtypes"][1] === String);

// regression: implicit default constructor (no explicit
// 'constructor(){}') must NOT get design:paramtypes, even though the
// class itself is decorated (real tsc distinguishes explicit vs.
// implicit constructors here -- this was a real bug caught during
// implementation: ctor_fd becomes non-NULL for the synthesized
// default constructor too, so "ctor_fd != NULL" alone is NOT a valid
// test for "has an explicit constructor")
function mdNoopClassDec(ctor) {}
@mdNoopClassDec
class MetaNoCtor {}
print(MetaNoCtor.__meta === undefined);

// explicit zero-parameter constructor DOES get an empty
// design:paramtypes array
@mdNoopClassDec
class MetaEmptyCtor {
    constructor() {}
}
print(Array.isArray(MetaEmptyCtor.__meta["design:paramtypes"]) &&
      MetaEmptyCtor.__meta["design:paramtypes"].length === 0);

// union type -> Object fallback (matches real tsc)
class MetaUnion {
    @mdDec u: number | string;
}
print(MetaUnion.prototype.__meta["u:design:type"] === Object);

// array type -> Array
class MetaArr {
    @mdDec a: number[];
}
print(MetaArr.prototype.__meta["a:design:type"] === Array);

// bigint -> BigInt (QuickJS has a global BigInt)
class MetaBig {
    @mdDec b: bigint;
}
print(MetaBig.prototype.__meta["b:design:type"] === BigInt);

// zero regression: no Reflect.metadata polyfill installed on a fresh
// decorated class still works fine (no crash, decorator itself still runs)
delete Reflect.metadata;
function plainDec(target, key, desc) { return desc; }
class NoMeta {
    @plainDec
    m(): number { return 42; }
}
print(new NoMeta().m());

// M7: postfix non-null assertion chains ('get()!.length')
{
    var m7map = new Map();
    m7map.set("row", [1, 2, 3]);
    print(m7map.get("row")!.length === 3);
    print(m7map.get("row")![0] === 1);
    print(m7map.get("row")!.map((x) => x * 2).length === 3);
}

// M7: class implements clause (type-level, consumed, no runtime effect)
class ImplBase {
    baseMethod(): number { return 1; }
}
interface IShape { area(): number; }
class ImplCircle extends ImplBase implements IShape, Iterable<number> {
    area(): number { return 9; }
}
print(new ImplCircle().area() === 9);
print(new ImplCircle().baseMethod() === 1);

// M7: TS modules (export interface / export enum / import chains)
// are exercised by tests/test_ts_module.ts run via `qjs -m` -- the
// .ts extension auto-enables the TS frontend in the module loader.

print("ALL TS TESTS PASSED");

// B1: abstract class/method/property (pure erasure)
{
    abstract class AbsBase {
        abstract m(a: number, b?: string): number;
        abstract get v(): string;
        abstract set v(x: string);
        abstract field: number;
        concrete(): number { return 1; }
    }
    var absB = new AbsBase();
    print(Object.keys(absB).length === 0);
    print(typeof AbsBase.prototype.m === "undefined");
    print(typeof AbsBase.prototype.v === "undefined");
    class AbsD extends AbsBase {
        m(a, b) { return a; }
        get v() { return "v"; }
        set v(x) {}
        field = 5;
    }
    print(new AbsD().m(2) === 2);
    print(new AbsD().v === "v" && new AbsD().field === 5);
    // 消歧: abstract 作普通标识符
    class AbsC { abstract = 5; }
    print(new AbsC().abstract === 5);
}
print("ALL TS TESTS PASSED");

print("ALL TS TESTS PASSED");

// B2: using 声明 (TS 5.2 显式资源管理)
{
    function mkRes(name) {
        return { [Symbol.dispose]() { print("d:" + name); }, name };
    }
    function usingF() {
        using ua = mkRes("a");
        using ub = mkRes("b");
        print("using-body");
    }
    usingF(); // 期望: using-body, d:b, d:a (LIFO)
    function usingThrow() {
        using ua = mkRes("t");
        throw new Error("boom");
    }
    try { usingThrow(); } catch (e) { print("caught:" + e.message); }
    function usingBlock() {
        { using ua = mkRes("in"); print("inner"); }
        print("outer");
    }
    usingBlock(); // 期望: inner, d:in, outer
    var using = 5; // 消歧
    print(using === 5);
    print(typeof Symbol.dispose === "symbol");
    print(typeof Symbol.asyncDispose === "symbol");
}
print("ALL TS TESTS PASSED");

// B3: await using (async 资源管理)
{
    function mkAsyncRes(name) {
        return { async [Symbol.asyncDispose]() { await Promise.resolve(); print("ad:" + name); }, name };
    }
    var alog = [];
    function mkAsyncLog(name) {
        return { async [Symbol.asyncDispose]() { await Promise.resolve(); alog.push(name); }, name };
    }
    async function ausingF() {
        await using ua = mkAsyncLog("a");
        await using ub = mkAsyncLog("b");
        print("ausing-body");
    }
    ausingF().then(function() {
        print(JSON.stringify(alog) === JSON.stringify(["b", "a"])); // LIFO
        print("ALL TS TESTS PASSED");
    });
}

// B4: 类型运算符 (keyof/typeof/infer/条件/索引/映射)
{
    type TK = keyof { a: number; b: string };
    type TV = { a: number }["a"];
    type TC = string extends number ? true : false;
    type TM = { [P in "x" | "y"]: number };
    type TI<T> = T extends infer U ? U : never;
    type TTO = typeof console;
    const tk: TK = "a";
    const tv: TV = 42;
    const tc: TC = false;
    const tm: TM = { x: 1, y: 2 };
    print(tk === "a" && tv === 42 && tc === false && tm.x + tm.y === 3);
    // 嵌套: 条件类型作为类型参数/默认值/函数返回
    type TU<T> = Array<T extends string ? 1 : 2>;
    type TD<T = string extends number ? 1 : 2> = T;
    type TF = (x: string) => string extends number ? 1 : 2;
    const tu: TU<number> = [2];
    print(tu[0] === 2);
}
print("ALL TS TESTS PASSED");

// B5: declare module (ambient module 声明)
{
    declare module "ambient-lib" {
        export const version: number;
        export function greet(name: string): string;
        export interface Config { debug: boolean; }
        export type Mode = "dev" | "prod";
        export enum Level { Low, High }
        export declare const extra: string;
    }
    declare module "shorthand-lib";
    // 普通代码不受 ambient 影响
    const dmVersion: number = 1;
    print(dmVersion === 1);
}
print("ALL TS TESTS PASSED");

// B6: 模板字面量类型 + import() 类型
{
    type TTpl = `pre-${string}-${number}`;
    type TTpl2 = `a${`nested-${boolean}`}b`;
    type TImp = import("./m").Foo;
    type TImp2 = import("./m").ns.Sub;
    const tt: TTpl = "pre-x-1";
    const ti: TImp = {} as any;
    print(tt === "pre-x-1");
    print(typeof ti === "object");
    // 表达式模板零回归
    var tplX = 5;
    print(`val=${tplX}` === "val=5");
}
print("ALL TS TESTS PASSED");

// B7: 映射类型键重映射 (TS 4.1)
{
    type TRemap = { [K in "a" | "b" as `get${K}`]: K };
    type TRemapCond = { [K in keyof { a: number } as K extends "a" ? `x${K}` : never]: K };
    type TRemapNest = { [K in "a" as `p-${`n-${K}`}`]: K };
    const tr: TRemap = { geta: "a", getb: "b" };
    const tn: TRemapNest = { "p-n-a": "a" };
    print(tr.geta === "a" && tr.getb === "b");
    print(tn["p-n-a"] === "a");
}
print("ALL TS TESTS PASSED");

// B8: unique symbol / 构造签名类型 / declare 字段
{
    type USym = unique symbol;
    type CtorSig = new (a: number) => string;
    class DeclField {
        declare x: number;
        constructor() { this.x = 42; }
    }
    const us: USym = Symbol();
    const cs: CtorSig = (a) => String(a);
    print(typeof us === "symbol");
    print(cs(7) === "7");
    print(new DeclField().x === 42);
}
print("ALL TS TESTS PASSED");
