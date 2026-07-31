// M6b 最终验证
var order: string[] = [];
function logDec(value, context) {
    order.push("dec:" + context.kind + ":" + String(context.name) + (context.static ? ":static" : ""));
    return value;
}
function fieldDec(value, context) {
    order.push("field:" + String(context.name));
    return value;
}
class Service {
    @logDec
    @logDec
    greet(): string { return "hi"; }
    @fieldDec
    count: number = 5;
    @logDec
    static version: number = 1;
}
print(order[0] === "dec:method:greet");
print(order[1] === "dec:method:greet");
print(order[2] === "field:count");
print(order[3] === "dec:field:version:static");

function replaceMethod(value, context) {
    return function() { return "replaced"; };
}
class Repl {
    @replaceMethod
    m() { return "orig"; }
}
print(new Repl().m() === "replaced");

function checkAccess(value, context) {
    print(typeof context.access === "object");
    print(context.metadata === undefined); /* QuickJS has no
        Symbol.metadata: stage3 metadata naturally degrades to
        undefined, same as tsc on runtimes without that symbol */
    return value;
}
class Acc {
    @checkAccess
    m() {}
}
print("ALL STAGE3 TESTS PASSED");

// TS-67: 字段初始化改写 + addInitializer 运行 (A1)
{
    var log: string[] = [];
    function ai(tag) {
        return function(v, c) {
            c.addInitializer(function() { log.push("extra:" + tag); });
            return v;
        };
    }
    function chain(value, context) {
        return function(prev) { return prev * 2; };
    }
    class M {
        @chain
        x = 10;
        @ai("a") a = 1;
        @ai("b") b = 2;
        @ai("m") m() {}
        @ai("s1") static sm() {}
    }
    var f = new M();
    // 与真实 tsc (--target ES2022) 逐字符一致的顺序:
    // 方法共享 extra 在第一个字段前; a 的 extra 在 b 前; b 的最后
    // 与真实 tsc (--target ES2022) 逐字符一致的顺序:
    // 静态成员 extra 在类定义时(class 尾部)运行; 方法共享 extra 在
    // 第一个实例字段前; a 的 extra 在 b 前; b 的最后(构造时)
    print(f.x === 20);                        // init 链: 10*2
    print(JSON.stringify(log) === JSON.stringify(["extra:s1","extra:m","extra:a","extra:b"]));
}
print("ALL STAGE3 TESTS PASSED");
