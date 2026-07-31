/* M7 TS AOT host (zero parser at runtime).
   Build:
     ./qjsc -c -o /tmp/ts_aot_demo.c examples/ts_aot_demo.ts
     cp examples/ts_aot_host.c /tmp/ && sed -i '' 's|ts_aot_demo.c|/tmp/ts_aot_demo.c|' /tmp/ts_aot_host.c
     clang -I. -o /tmp/ts_aot_host /tmp/ts_aot_host.c \
       .obj/quickjs.o .obj/libregexp.o .obj/libunicode.o .obj/cutils.o \
       .obj/quickjs-libc.o .obj/dtoa.o -lm -lpthread -ldl
   Run: /tmp/ts_aot_host   (expect: AOT main() = 11) */
#include <stdio.h>
#include "quickjs.h"
#include "quickjs-libc.h"
#include "ts_aot_demo.c"

int main(int argc, char **argv)
{
    JSRuntime *rt;
    JSContext *ctx;
    JSValue mod, ns, fn, ret;
    JSModuleDef *m;
    rt = JS_NewRuntime();
    ctx = JS_NewContext(rt);
    js_std_add_helpers(ctx, argc, argv);
    js_std_init_handlers(rt);
    mod = JS_ReadObject(ctx, qjsc_ts_aot_demo, qjsc_ts_aot_demo_size,
                        JS_READ_OBJ_BYTECODE);
    if (JS_IsException(mod)) { js_std_dump_error(ctx); return 1; }
    if (JS_ResolveModule(ctx, mod) < 0) { js_std_dump_error(ctx); return 1; }
    m = JS_VALUE_GET_PTR(mod);
    mod = JS_EvalFunction(ctx, mod);
    if (JS_IsException(mod)) { js_std_dump_error(ctx); return 1; }
    ns = JS_GetModuleNamespace(ctx, m);
    fn = JS_GetPropertyStr(ctx, ns, "main");
    ret = JS_Call(ctx, fn, JS_UNDEFINED, 0, NULL);
    if (JS_IsException(ret)) { js_std_dump_error(ctx); return 1; }
    printf("AOT main() = %d\n", JS_VALUE_GET_INT(ret));
    JS_FreeValue(ctx, ret);
    JS_FreeValue(ctx, fn);
    JS_FreeValue(ctx, ns);
    JS_FreeValue(ctx, mod);
    js_std_free_handlers(rt);
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
    return 0;
}
