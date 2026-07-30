# TODO Tracker: QuickJS 原生 TypeScript 前端

Owning RFC: `docs/rfc-typescript-frontend/RFC-quickjs-typescript-frontend.md`
档位: 完整档(落地实现型,允许改上游源码)
Last updated: 2026-07-30

> 本 tracker 只服务上述单一 RFC(→ 核心·RFC 文档归属方案)。前置 RFC(parse/run 分离)的 T-01~T-11 归 `docs/rfc-parse-run-separation/`,两者不混用。

| ID | 状态 | 完成% | 验证 | 文件/模块 | 功能介绍 | 文档引用 | 完成时设计核对 |
| -- | ---- | ----: | ---- | --------- | -------- | -------- | -------------- |
| TS-01 | Done | 100 | Pass | `quickjs.c` parser 摸底 | 确认回溯基础设施(`js_parse_get_pos`/`seek_token`/`skip_parens_token`)可复用于 TS 歧义消解 | RFC §D2 | `24745`/`24752`/`24800` + 已有用例 `28143`/`28162`/`28179` 已核 |
| TS-02 | Done | 100 | Pass | `quickjs.c` 插入点摸底 | 定位类型注解四个插入点 | RFC §D1 | `28515`/`24455`/`25274`/`26338` 已核 |
| TS-03 | Done | 100 | Pass | `quickjs.c` emit 层摸底 | 确认 B2 所需 emit 原语齐备、无需新增 opcode;定位 `emit_class_field_init` 范式 | RFC §D3 | `23837`-`23974`/`24303`/`25184` 已核 |
| TS-04 | Done | 100 | Pass | `docs/rfc-typescript-frontend/` | RFC + 路线图 + 三份活文档 | RFC 全文 | 图示遵循 `diagram-style.svg` 基准 |
| TS-05 | Done | 100 | Pass | RFC | 委派 2 个不同模型对抗式独立评审 | 核心·应用点 A | Opus-4.8 判 PARTIAL、GPT-5.5 判"严重低估";二者独立同证 D2 核心断言不成立 |
| TS-06 | Done | 100 | Pass | RFC 全文 | 按评审完成 9 项修订:D2 重写、D3.1 时序修正、D3.2-D3.4、S2/S4 边界修订、B1/B2 清单补齐、非目标显式化 | RFC §独立评审记录 | 三份文档状态一致 |
| **M1 · ts_mode 骨架与类型注解** | | | | | | | |
| TS-10 | Not Started | 0 | Not Run | `quickjs.h`, `quickjs.c` | 新增 `JS_EVAL_FLAG_TS` 标志 + `JSParseState.ts_mode` 字段与传递链路 | RFC §D1 | — |
| TS-11 | Not Started | 0 | Not Run | `quickjs.c` | 新增 `js_parse_ts_type` 函数族:基础类型、联合/交叉、数组、元组、函数类型、字面量类型、括号 | RFC §D1、S4 | — |
| TS-12 | Not Started | 0 | Not Run | `quickjs.c:28515` | 变量声明类型注解 `let x: T` | RFC §D1 | — |
| TS-13 | Not Started | 0 | Not Run | `quickjs.c:24455` | 函数参数/返回值注解 + 可选参数 `x?: T` | RFC §D1、D2 | — |
| TS-14 | Not Started | 0 | Not Run | `quickjs.c:25274` | 类成员注解、`readonly`、访问修饰符、可选成员 | RFC §D1 | — |
| TS-15 | Not Started | 0 | Not Run | `quickjs.c:26338` | 解构类型注解 | RFC §D1 | — |
| TS-16 | Not Started | 0 | Not Run | `tests/` | M1 单测 + `make test` + test262 零新增失败 | RFC §S1 | — |
| **M2a · `>` token 重扫(阻断级前置,评审发现)** | | | | | | | |
| TS-20 | Done | 100 | Pass | `quickjs.c:23125-23145` lexer(未改) + 新增 `js_ts_rescan_greater` | **`>` token 重扫机制**:O(1) 词法重解释,把 `TOK_SAR`/`TOK_SHR`/`TOK_SAR_ASSIGN`/`TOK_SHR_ASSIGN`/`TOK_GTE` 重扫为单个 `>` | RFC §D2.2(b)、S4 | 子 agent(Opus-4.8)独立核对 PASS;发现并修复 `TOK_GTE`(`>=`)遗漏 |
| TS-21 | Done | 100 | Pass | `tests/test_ts.js` | 重扫单测:2/3/4 层嵌套泛型、泛型内数组后缀、无空格闭合 `Array<number>=x`;确认 JS 位移(`>>`/`>>>`/`>>=`/`>>>=`/`>=`)零回归 | RFC §S1、S4 | `make test` 零失败;子 agent 追踪 4 层嵌套时序全部正确 |
| **M2b · 泛型与断言(歧义消解核心)** | | | | | | | |
| TS-22 | Done | 100 | Pass | `quickjs.c` `js_parse_function_decl2`/`js_parse_class` | 泛型参数声明:`function f<T>()` / `class C<T>` / 约束与默认值 `<T extends U = V>`;支持 trailing comma `<T,>` | RFC §D2 | 子 agent 二轮核对 |
| TS-23 | Done | 100 | Pass | `quickjs.c` `js_ts_try_generic_call` | **泛型实参消歧**(emit-free trial-parse + 结构启发式,不需 memset OP_nop——callee 求值在判定前已完成且两种判定均需要它):`f<T>(x)`、`obj.m<T>()`、`id<number,string>()`、trailing comma | RFC §D2.2(a)、S4 | PARTIAL→2问题修复:trailing comma 缺口、复杂度扫描范围脆弱性 |
| TS-24 | Done | 100 | Pass | `quickjs.c` `js_ts_is_generic_arrow` | 泛型箭头函数 `<T>(x: T) => x`、带返回类型、多参数 | RFC §D2.1、D2.3 | — |
| TS-25 | Done | 100 | Pass | `quickjs.c` `js_parse_coalesce_expr` | `as` / `satisfies` / `as const` / 非空断言 `!`;插入位置符合 TS 优先级(`a+b as T`=`(a+b) as T`);ASI 换行处理正确 | RFC §D2.1 | — |
| TS-26 | Done | 100 | Pass | `tests/test_ts.js` | 歧义反例(`a<b>(c)`、点限定标识符、加空格)+ 深嵌套泛型性能(10000次线性)+ make test 零回归 | RFC §S4、风险表 | 第一轮子 agent 评审输出不完整,重新委派不同模型 |
| **M3 · 类型声明(纯擦除)** | | | | | | | |
| TS-30 | Done | 100 | Pass | `quickjs.c` `js_parse_ts_interface` | `interface` 声明(整体消费丢弃);修正 strict-only 关键字问题,加统一伪关键字前置检测 | RFC §B1、S9 | strict-only 陷阱定位并修复;子agent核对 |
| TS-31 | Done | 100 | Pass | `quickjs.c` `js_parse_ts_type_alias` | `type` 别名(含泛型仅语法消费);`export type Foo=...`/`export type {X,Y}` | RFC §B1 | — |
| TS-32 | Done | 100 | Pass | `quickjs.c` `js_parse_ts_declare`、`js_ts_declare_looks_like_decl`、`js_parse_import`/`js_parse_export` | `declare function/const/let/var/class`;`import type`/`export type`(整句+specifier级) | RFC §B1、S9 | 子agent发现declare误判P0(主会话已提前自修);补EOF边界P2 |
| TS-33 | Done | 100 | Pass | `tests/test_ts.js` | M3 单测(interface/type/declare/重载签名) + 回归守卫(declare/type作普通标识符) + make test 零失败 | RFC §S1 | — |
| **M4 · enum(首个生成运行时代码的里程碑)** | | | | | | | |
| TS-40 | Not Started | 0 | Not Run | `quickjs.c` | `enum` 降级为对象 + 正反向映射 emit | RFC §D3 | — |
| TS-41 | Not Started | 0 | Not Run | `quickjs.c` | `const enum` 编译期常量内联 | RFC §D3 | — |
| TS-42 | Not Started | 0 | Not Run | `tests/` | M4 单测 + **字节码 dump 对比等价 JS** | RFC §验证策略 | — |
| **M5 · 参数属性与 namespace** | | | | | | | |
| TS-50 | Not Started | 0 | Not Run | `quickjs.c` | 构造函数参数属性 `constructor(private x: T)`,借鉴 `emit_class_field_init` | RFC §D3 | — |
| TS-51 | Not Started | 0 | Not Run | `quickjs.c` | `namespace`/`module` 降级为 IIFE + 对象 | RFC §D3 | — |
| TS-52 | Not Started | 0 | Not Run | `tests/` | M5 单测 + 字节码 dump 对比 | RFC §验证策略 | — |
| **M6a · 装饰器 legacy(优先,真实项目依赖)** | | | | | | | |
| TS-60 | Not Started | 0 | Not Run | `quickjs.c` lexer | 新增 `@` 词法 token(当前零支持)+ 处理 `@` 后 regexp/division 上下文 | RFC §D2.2(g) | — |
| TS-61 | Not Started | 0 | Not Run | `quickjs.c` | 双后端 emit 架构骨架(可切换 legacy/stage3,避免反向返工) | RFC §D3.4 | — |
| TS-62 | Not Started | 0 | Not Run | `quickjs.c` | legacy 类/方法/属性装饰器 emit(三参数签名 `target, key, descriptor`) | RFC §D3.4 | — |
| TS-63 | Not Started | 0 | Not Run | `quickjs.c` | legacy **参数装饰器**(DI 框架硬需求,stage3 无此能力) | RFC §D3.4 | — |
| TS-64 | Not Started | 0 | Not Run | `quickjs.c` | 可选 `emitDecoratorMetadata`:受限类型序列化(`number`→`Number` 等) | RFC §D3.4、S2 | — |
| TS-65 | Not Started | 0 | Not Run | `tests/` | M6a 单测 + 真实框架样例(NestJS 风格 DI 片段) | RFC §验证策略 | — |
| **M6b · 装饰器 stage 3(后续,标准生态)** | | | | | | | |
| TS-66 | Not Started | 0 | Not Run | `quickjs.c` | stage3 装饰器:`(value, context)` 签名 + context 对象(kind/name/static/private/access) | RFC §D3.4 | — |
| TS-67 | Not Started | 0 | Not Run | `quickjs.c` | `addInitializer` + `accessor` 关键字(auto-accessor) | RFC §D3.4 | — |
| TS-68 | Not Started | 0 | Not Run | `tests/` | M6b 单测 + 与 M6a 的开关切换验证 | RFC §验证策略 | — |
| **M7 · 集成与端到端** | | | | | | | |
| TS-70 | Not Started | 0 | Not Run | `qjs.c`, `qjsc.c` | `.ts` 文件扩展名自动识别 + CLI 开关 | RFC §目标 | — |
| TS-71 | Not Started | 0 | Not Run | `quickjs.c` AOT 链路 | 与前置 RFC F2/F3 组合:TS 编译期 AOT + 运行期零 parser | 前置 RFC §T3 | — |
| TS-72 | Not Started | 0 | Not Run | `tests/`, `examples/` | 端到端串联用例(仅本里程碑允许)+ 用户可跑 Example | 核心·推进路径约束 | — |

## 状态说明

- TS-01~TS-03 为摸底产出,证据已挂 `file:line` 落入 RFC §D1-D3。
- TS-04/TS-05 是设计阶段闸门,未通过不得进入 M1 实现。
- M1~M7 构成 DAG:M1 → M2 → M3 → M4 → M5 → M6 → M7,无循环依赖。M4-M6 均依赖 M1(ts_mode 骨架),M7 依赖全部。
- 每个里程碑的验证独立(各自 TS 语法单测),**端到端串联只在 M7**(→ 核心·推进路径约束)。
