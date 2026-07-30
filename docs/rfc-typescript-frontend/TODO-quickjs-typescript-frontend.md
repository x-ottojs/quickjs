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
| TS-20 | Not Started | 0 | Not Run | `quickjs.c:23125-23145` lexer | **`>` token 重扫机制**:类型上下文中把 `TOK_SAR`/`TOK_SHR`/`TOK_SAR_ASSIGN`/`TOK_SHR_ASSIGN` 拆为单个 `>` | RFC §D2.2(b)、S4 | — |
| TS-21 | Not Started | 0 | Not Run | `tests/` | 重扫单测:`Array<Map<string, number>>`、`a<b<c<d<e>>>>`、确认 JS 位移运算零回归 | RFC §S1、S4 | — |
| **M2b · 泛型与断言(歧义消解核心)** | | | | | | | |
| TS-22 | Not Started | 0 | Not Run | `quickjs.c` | 泛型参数声明 `function f<T>()` / `class C<T>` / 约束与默认值 `<T extends U = V>` / 变体修饰符 | RFC §D2 | — |
| TS-23 | Not Started | 0 | Not Run | `quickjs.c` | **泛型实参消歧**(emit-free trial-parse + 失败回退 + `memset OP_nop` 清理):`f<T>(x)`、`obj.m<T>()`、`new C<T>()`、tagged template、`fn<T>?.()` | RFC §D2.2(a)、S4 | — |
| TS-24 | Not Started | 0 | Not Run | `quickjs.c` | 泛型箭头函数 `<T>(x: T) => x`、带返回类型箭头 `(): T => x` | RFC §D2.1、D2.3 | — |
| TS-25 | Not Started | 0 | Not Run | `quickjs.c` | `as` / `satisfies` / `as const` / 非空断言 `!` / 确定赋值断言 `x!: T` | RFC §D2.1 | — |
| TS-26 | Not Started | 0 | Not Run | `tests/` | M2b 单测(重点:歧义反例 `a<b>(c)` 须解析为两次比较 + 最坏回溯复杂度) | RFC §S4、风险表 | — |
| **M3 · 类型声明(纯擦除)** | | | | | | | |
| TS-30 | Not Started | 0 | Not Run | `quickjs.c` | `interface` 声明(整体消费丢弃) | RFC §B1 | — |
| TS-31 | Not Started | 0 | Not Run | `quickjs.c` | `type` 别名(含泛型、条件类型等仅语法消费) | RFC §B1 | — |
| TS-32 | Not Started | 0 | Not Run | `quickjs.c` | `declare` / 仅类型 import-export(`import type`) | RFC §B1 | — |
| TS-33 | Not Started | 0 | Not Run | `tests/` | M3 单测 + 回归 | RFC §S1 | — |
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
