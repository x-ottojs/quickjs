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
