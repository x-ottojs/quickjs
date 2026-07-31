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
| TS-40 | Done | 100 | Pass | `quickjs.c` `js_parse_ts_enum` | `enum` 降级为对象 + 正反向映射 emit(数值/字符串/异构/自动递增);字符串成员跳过反向映射 | RFC §D3 | 字节码dump验证栈平衡;子agent核对PASS |
| TS-41 | Done | 100 | Pass | `quickjs.c` `JSTSConstEnumEntry`/`js_ts_const_enum_lookup` | `const enum` 完整内联(用户grill决策A,收窄为单插入点+仅字面量成员) | RFC §D3 | 两轮grill定范围;peek_token陷阱已修复;内存清理无泄漏(atom计数验证) |
| TS-42 | Done | 100 | Pass | `tests/test_ts.js` | M4 单测 + **字节码 dump 对比**(`-DDUMP_BYTECODE=2`) + make test 零失败 | RFC §验证策略 | 首次评审耗时异常被取消,换模型重新委派后PASS |
| **M5 · 参数属性与 namespace** | | | | | | | |
| TS-50 | Done | 100 | Pass | `quickjs.c` `js_ts_emit_param_properties` | 构造函数参数属性(派生+非派生两种时序);`public`/`private`/`protected`/`readonly` | RFC §D3、S9(a) | 修复strict-only陷阱;子agent核对PASS |
| TS-51 | Done | 100 | Pass | `quickjs.c` `js_parse_ts_namespace`/`JSTSMergeableDecl` | `namespace` 降级为 IIFE + 对象;声明合并两方向(含class/function) | RFC §D3、S9(c)、S10 | `OP_copy_data_properties`位编码逐位核对PASS;修复3个真实bug |
| TS-52 | Done | 100 | Pass | `tests/test_ts.js` | M5 单测 + 字节码 dump 对比 | RFC §验证策略 | 12项场景+零回归+内存泄漏检查全通过 |
| **M6a · 装饰器 legacy(优先,真实项目依赖)** | | | | | | | |
| TS-60 | Done | 100 | Pass | `quickjs.c` 语句层/postfix expr | `@` 在词法层本已可用(default分支落到字符值,无需新token);类装饰器语句层收集入口 | RFC §D2.2(g) | 实测确认无需lexer改动 |
| TS-61 | Skipped | 0 | N/A | — | 双后端 emit 架构骨架 | RFC §D3.4 | 本轮预算耗尽未做,推迟到M6b立项时一并设计 |
| TS-62 | Done | 100 | Pass | `quickjs.c` `js_ts_apply_decorators` | legacy 类/方法/属性装饰器 emit(不引入运行时helper,编译期展开等价字节码) | RFC §D3.4 | 20+场景与真实tsc逐行对比;3个真实bug已修复 |
| TS-63 | Done | 100 | Pass | `quickjs.c` `js_ts_apply_class_decorators`、`js_ts_skip_decorator_expr` | legacy **参数装饰器**(DI框架硬需求);核心难点是求值时机(类声明时一次,非每次construct) | RFC §D3.4 | tsc交叉验证发现"每次new重复求值"语义错误并修正为skip+跳转重解析机制 |
| TS-64 | Done | 100 | Pass | `quickjs.c` `js_ts_classify_type_range`/`js_ts_emit_metadata_apply` | `emitDecoratorMetadata`:`design:type`/`design:paramtypes`/`design:returntype`,受限类型序列化(8种基础类型+数组+函数+裸标识符精确映射,其余Object兜底) | RFC §D3.4、S2 | 用真实tsc验证全部规则;修复2个真实bug(attach时序/隐式构造函数误判);子agent评审三次基础设施故障失败,改主会话自主核对 |
| TS-65 | Done | 100 | Pass | `tests/test_ts.js` | M6a + metadata 单测(200+行) | RFC §验证策略 | 与真实tsc交叉验证;30+场景;内存无泄漏 |
| **M6b · 装饰器 stage 3(后续,标准生态)** | | | | | | | |
| TS-66 | Done | 100 | Pass | `quickjs.c` `js_ts_apply_stage3_decorators`、`quickjs-libc.c` `js_ts_es_decorate` | stage3 装饰器:`(value, context)` 签名 + context 对象(kind/name/static/private/access) + `__esDecorate`/`__runInitializers` C helper(6参数调用形状复刻tsc) | RFC §D3.4 | **完成**。三根因修复:①`OP_call`约定是**callee先压栈、参数按序在后**(call_argv=sp-N,callee在sp-N-1)——原实现参数先压导致callee=类构造器;②`OP_define_field`是n_pop=2/n_push=1(**压回对象,不需要dup**)——每字段多余dup使栈多6个对象、call 6操作数窗口错位;③隐藏变量计数器必须用全局`ts_decorator_counter`(局部计数器跨class冲突)。另修:装饰器数组须source序(helper反向遍历→最靠近成员的先应用)、成员间按声明顺序(链表反转) |
| TS-67 | Partial | 70 | Partial | `quickjs.c`/`quickjs-libc.c` | `addInitializer` 收集已实现(C helper push 进 extraInitializers);**运行缺口**:字段初始化改写/构造函数 extraInitializers 注入未实现(已知范围限制);`accessor` 关键字未实现 | RFC §D3.4 | 已记录为已知缺口,非崩溃 |
| TS-68 | Done | 100 | Pass | `tests/test_ts_stage3.js` | M6b 单测(方法/属性/静态/多装饰器/顺序/替换/context)+ 与 M6a 的开关切换验证(`--ts-stage3` CLI,默认 legacy) | RFC §验证策略 | 挂入 make test 全绿;顺带修复 M6a 跨成员顺序bug(ver,count,greet→greet,count,ver,tsc验证) |
| **M7 · 集成与端到端** | | | | | | | |
| TS-70 | Done | 100 | Pass | `qjs.c`, `quickjs-libc.c` | `.ts` 文件扩展名自动识别(qjs eval_file + js_module_loader 均自动加 `JS_EVAL_FLAG_TS`)+ CLI 开关 | RFC §目标 | 跨文件 import 链/循环导入全通过 |
| TS-71 | Done | 100 | Pass | `qjsc.c` + `examples/ts_aot_demo.ts`/`ts_aot_host.c` | AOT 链路:qjsc 编译 .ts(interface/enum/class/参数属性/泛型)→ C 字节码 → 零 parser 宿主执行导出 main() | 前置 RFC §T3 | 端到端验证 `AOT main() = 11`;新增 `JS_DetectModuleTS`(全源码扫描,修复 interface 开头模块误判——JS_DetectModule 只看首 token);qjs/qjsc 双路径接入 |
| TS-72 | Done | 100 | Pass | `tests/test_ts.js`, `tests/test_ts_module.ts` | 端到端串联用例 + 模块链套件 + make test 挂载 | 核心·推进路径约束 | M7 顺带修复4个真实缺口:export interface/enum 保留字token判断、implements 子句、链式 `!` 断言、模块loader TS flag |

## M7 集成修复记录(4个真实缺口)

1. **`.ts` 扩展名自动识别**:`qjs.c eval_file` + `quickjs-libc.c js_module_loader` 双路径加 `JS_EVAL_FLAG_TS`——import 链跨 .ts 文件工作
2. **`export interface`/`export enum`**:`interface`/`enum` 是 QuickJS **保留 token**(TOK_INTERFACE/TOK_ENUM,见 quickjs.c:21865 关键字表),`js_ts_is_pseudo_keyword_str()`(要求 TOK_IDENT)永远 FALSE——改为 token 值判断;`export enum` 需注册真实运行时导出(enum 有反向映射对象)
3. **`class X implements A, B`**:TOK_IMPLEMENTS 保留 token,消费后 `js_parse_ts_type` 逐个解析(纯类型无运行时效应)
4. **链式非空断言 `get()!.length`**:`!` 从 coalesce 层移到 **postfix 循环**(TOK_QUESTION_MARK_DOT 分支前),断言后 continue 让 `.member`/`()` 继续解析

## 状态说明

- TS-01~TS-03 为摸底产出,证据已挂 `file:line` 落入 RFC §D1-D3。
- TS-04/TS-05 是设计阶段闸门,未通过不得进入 M1 实现。
- M1~M7 构成 DAG:M1 → M2 → M3 → M4 → M5 → M6 → M7,无循环依赖。M4-M6 均依赖 M1(ts_mode 骨架),M7 依赖全部。
- 每个里程碑的验证独立(各自 TS 语法单测),**端到端串联只在 M7**(→ 核心·推进路径约束)。
