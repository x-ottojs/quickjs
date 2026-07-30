# Milestones: QuickJS 原生 TypeScript 前端

Owning RFC: `docs/rfc-typescript-frontend/RFC-quickjs-typescript-frontend.md`
Last updated: 2026-07-30

## 推进路线(DAG,无循环依赖)

```
M0 设计与评审(Done — 两模型对抗评审,9 项修订已落地)
   │
   ▼
M1  ts_mode 骨架 + 类型注解  ◄── 所有后续里程碑的基座
   │
   ▼
M2a `>` token 重扫(阻断级前置,评审发现)◄── 嵌套泛型的先决条件
   │
   ▼
M2b 泛型与断言(歧义消解核心,风险最高)
   │
   ▼
M3  类型声明(interface/type/declare + 重载签名,纯擦除)
   │   └─ 至此 B1 完成,可独立交付
   ▼
M4  enum + const enum(首个生成运行时代码,含最小 binder)
   │
   ▼
M5  参数属性 + namespace(声明合并)
   │
   ▼
M6a 装饰器 legacy(优先 — 真实项目依赖,含参数装饰器+metadata)
   │
   ▼
M6b 装饰器 stage 3(标准生态,双后端切换)
   │
   ▼
M7  集成与端到端(唯一允许串联用例的里程碑)
```

**第二轮调整说明(按评审)**:① 原 M2 拆为 **M2a(`>` token 重扫)+ M2b(泛型消歧)**——重扫是嵌套泛型的阻断级先决条件,必须独立成里程碑;② 原 M6 拆为 **M6a(legacy)+ M6b(stage 3)**——终局视角决策为两套并存、legacy 优先,双后端架构在 M6a 即建立以避免反向返工;③ M3 增加函数重载签名。

**验证隔离**:M1-M6 各自用独立的 TS 语法单测,不共用 fixture;端到端串联仅在 M7(→ 核心·推进路径约束)。所有里程碑共用的**回归基线**(`make test` + test262)不算共用 fixture——它是零回归红线(S1),每个里程碑都必须独立通过。

**阶段划分**:M1-M3 = B1 可擦除语法(改动局限 parser 层);M4-M6 = B2 生成运行时代码(触及字节码生成层);M7 = 集成。**B1 完成即可独立交付价值**(能跑绝大多数 TS 代码)。

---

# Milestone M0: 设计与独立评审
Status: Done
Progress: 100%
Depends on: 前置 RFC(parse/run 分离,已定稿)
RFC refs: 全文
Important rule refs: S5(file:line)、S6(现状穷举校准)
Context budget: 约 55k / 120k(实际,含两份评审报告)
Dependency check: pass — 前置 RFC 已定稿并推送;摸底已完成(TS-01~TS-03)
TODO refs: TS-01 ~ TS-06

## 目标与非目标

- 目标:摸清 parser 现状 → 产出 RFC 草案与推进方案 → 通过子 agent 独立评审。
- 非目标:不写任何实现代码(实现从 M1 起)。

## 前置检查结果

- 领域:代码工程 → 已加载 `references/code-engineering.md`。
- 档位:复杂问题(跨 parser/字节码生成两层、7 个里程碑、有顺序依赖、改上游源码有回归风险)→ 完整档。
- 归属:本 RFC 为**新独立问题域**,已另建一套三份文档;前置 RFC 的 TODO 不迁入(→ 核心·RFC 文档归属方案)。
- 覆盖范围:用户 grill 确认选 **B**(可擦除 + 生成运行时代码)。

## 摸底结论(关键,决定全部设计)

| 摸底项 | 结论 | 证据 |
| --- | --- | --- |
| 回溯/lookahead 设施 | **已存在,可直接复用** | `js_parse_get_pos` `quickjs.c:24745`、`js_parse_seek_token` `24752`、`js_parse_skip_parens_token` `24800` |
| 该设施是否已用于同类歧义 | **是**,箭头函数/解构/for-of 均用此模式 | `quickjs.c:28143`、`28162`(失败回退)、`28179`、`28746` |
| 类型注解插入点 | 4 处,均为纯增量 | `28515`、`24455`、`25274`、`26338` |
| B2 是否需新增 opcode | **不需要**,emit 原语齐备 | `emit_op` `23864`、`emit_atom` `23873`、`emit_label` `23931`、`emit_goto` `23944`、`emit_push_const` `23974`、`define_var` `24303` |
| 参数属性实现范式 | 有现成范式可借鉴 | `emit_class_field_init` `quickjs.c:25184`、`js_parse_function_class_fields_init` `24454` |

**摸底的决定性价值**:因为回溯设施与 emit 原语都已存在,P2 路径(不新造机制、不新增 opcode)才成立。这是 S6 规则的直接产物。

## 执行线路(预计 → 实际)

| 预计 | 实际 | 说明 |
| --- | --- | --- |
| 摸底 parser 现状 | ✅ TS-01~TS-03 完成 | 五项结论已落 RFC |
| grill 确认覆盖范围 | ✅ 用户选 B | 决定里程碑拆为 B1(M1-M3)+B2(M4-M6) |
| 新建三份活文档 + 路线图 | ✅ 本轮 | `docs/rfc-typescript-frontend/` |
| 委派子 agent 独立评审 | ⏳ 待执行 | TS-05 |
| 按评审修订定稿 | ⏳ 待执行 | — |

## 独立评审结论(应用点 A)

| 评审者 | 视角 | 判定 | 最重要发现 |
| --- | --- | --- | --- |
| `Claude-Opus-4.8` | 终局/全面/系统 + 源码核实 | **PARTIAL** | `>>` token 合并是硬阻断(`quickjs.c:23125-23145`);参数属性派生类时序错;`skip_parens_token` 不跟踪 `<>` |
| `GPT-5.5` | TS 语言/编译器专家 | **严重低估** | 独立穷举 30+ 歧义点(初稿仅 5);装饰器语义版本是最危险单点;`const enum`/metadata 突破零类型检查边界 |

**交叉验证**:两模型互不知情下**同时判定 D2 核心断言不成立**;主会话独立取证亦命中(`JSParsePos` 仅存 2 字段 `quickjs.c:24740`、`memset OP_nop` 回滚范式 `26788`)。三方一致 ⇒ 结论确凿。

## 修复(9 项,全部已落地)

D2 重写(拆 D2.1 可复用 / D2.2 须新建 7 项) → D3.1 参数属性时序修正(派生类须 super() 后,证据 `27395-27404`) → D3.2 `const enum` 分级 → D3.3 enum/namespace 语义完备性 → D3.4 装饰器双套并存 legacy 优先 → S2 边界修订(允许最小 binder/常量求值/受限类型序列化) → S4 批准 4 项新机制 → B1/B2 清单补 10+ 项 → 非目标显式化(JSX/tsx、CommonJS 互操作、三斜线)。

里程碑同步调整:M2 拆 M2a(`>` 重扫)+M2b(泛型);M6 拆 M6a(legacy)+M6b(stage3);M3 加重载签名。

## 压缩迭代摘要

- **本里程碑最大价值**:在写任何实现代码前,证伪了 RFC 初稿的核心可行性支柱("复用现有回溯即可")。若直接进 M2 实现,会在遭遇 `Array<Map<K,V>>` 时才发现 lexer 把 `>>` 合并成单 token,届时设计闸门与预算双双被打穿。
- **S6 规则再次生效**:摸底阶段确认了"回溯设施存在",但**未穷举其能力边界**(不跟踪 `<>`、不能拆 token)。教训:确认"设施存在"不等于确认"设施够用",必须核对目标场景的具体要求。
- **装饰器决策**:用户指示按终局视角 ⇒ 两套并存。这避免了评审指出的"选单套在终局都是错的"陷阱。

## 结案

- 迭代目的:把"在 JS parser 上融合 TS"从路线设想变成可执行的、经独立评审的设计。
- 迭代前问题:前置 RFC 只给出"技术成立"的结论,缺可落地的设计与真实复杂度评估。
- 如何迭代:摸底 parser 现状(回溯/插入点/emit 原语)→ grill 确认覆盖范围 B → 产出三份文档 → 两模型对抗评审 → 9 项修订 → 里程碑重拆。
- 最终结果:TS-01~TS-06 `Done`。RFC 已定稿,M1 可启动。剩余风险:M2a 的 token 重扫是新机制,需实测确认对 JS 位移运算零回归;装饰器双后端架构复杂度需在 M6a 设计闸门细化。

---

# Milestone M1: ts_mode 骨架与类型注解
Status: Not Started
Progress: 0%
Depends on: M0
RFC refs: §D1、§S1、§S4
Important rule refs: S1(零回归最高优先级)、S2(不做类型检查)、S7(上游 merge 友好)
Context budget: 约 90k / 120k(改动面较大,含 4 个插入点 + 类型语法函数族)
Dependency check: 待执行
TODO refs: TS-10 ~ TS-16

## 目标与非目标

- 目标:建立 `ts_mode` 开关与 `js_parse_ts_type` 函数族;支持四个插入点的类型注解;**零回归**。
- 非目标:不含泛型(M2)、不含 `interface`/`type` 声明(M3)、不含任何生成代码的构造(M4+)。

## 设计闸门(待 M1 启动时填写)

需产出:`js_parse_ts_type` 的职责边界与递归下降结构、`ts_mode` 的传递链路(`JS_Eval` flag → `JSParseState`)、四个插入点的改动契约、单元测试设计。

## 验证设计(M1 独立)

- 正常:各插入点的基础类型注解可被正确消费并执行。
- 边界:嵌套类型(`Array<Map<string, number[]>>` 形态的语法消费)、可选参数、默认值 + 注解共存。
- 错误:`ts_mode` 关闭时遇到 `:` 注解须报语法错误(与现有 JS 行为一致)。
- **回归红线(S1)**:`make test` 全通过 + test262 对比 `test262_errors.txt` 零新增失败。

## Example 设计(待 M1 完成时交付)

用户可跑:写一个含类型注解的 `.ts` 文件,用 `./qjs --ts hello.ts` 执行,预期正常输出且类型注解被忽略。

---

# Milestone M2: 泛型与断言(歧义消解核心)
Status: Not Started
Progress: 0%
Depends on: M1
RFC refs: §D2、§S4
Context budget: 约 80k / 120k
TODO refs: TS-20 ~ TS-23

**风险最高的里程碑**。核心难点:`f<T>(x)` 与 `a < b` 的消歧。策略见 RFC §D2——回溯试探 + 失败回退,复用 `js_parse_get_pos`/`js_parse_seek_token`。

验证必须含**歧义反例**:`a<b>(c)` 在 JS 语义下是 `(a<b)>(c)` 两次比较,不得被误判为泛型调用;并测深嵌套泛型的最坏回溯性能(S4 终止性要求)。

---

# Milestone M3: 类型声明(纯擦除)
Status: Not Started
Progress: 0%
Depends on: M2
RFC refs: §B1
Context budget: 约 60k / 120k
TODO refs: TS-30 ~ TS-33

`interface` / `type` / `declare` / `import type` 整体消费丢弃。依赖 M2 因为类型别名可含泛型。至此 **B1 阶段完成,可独立交付**。

---

# Milestone M4: enum(首个生成运行时代码)
Status: Not Started
Progress: 0%
Depends on: M1(骨架)、M3(B1 完成)
RFC refs: §D3、§S3
Context budget: 约 70k / 120k
TODO refs: TS-40 ~ TS-42

**首个触及字节码生成层的里程碑**。`enum` 降级为对象 + 正反向映射;`const enum` 编译期内联。

额外验证要求:**字节码 dump 对比**——`enum` 生成的字节码须与手写等价 JS 对象字面量的字节码语义一致(用 `-DDUMP_BYTECODE=2` 重编译对比)。

---

# Milestone M5: 参数属性与 namespace
Status: Not Started
Progress: 0%
Depends on: M4
RFC refs: §D3
Context budget: 约 75k / 120k
TODO refs: TS-50 ~ TS-52

参数属性借鉴 `emit_class_field_init`(`quickjs.c:25184`)在构造函数首部注入 `this.x = x`;`namespace` 降级为 IIFE + 对象。

---

# Milestone M6: 装饰器
Status: Not Started
Progress: 0%
Depends on: M5
RFC refs: §D3、§风险表
Context budget: 约 85k / 120k
TODO refs: TS-60 ~ TS-63

**入口需 grill 确认语义版本**(TC39 stage 3 vs TS legacy `experimentalDecorators`)——两者语义不兼容,必须先定再实现(TS-60)。

---

# Milestone M7: 集成与端到端
Status: Not Started
Progress: 0%
Depends on: M1-M6 全部
RFC refs: §目标、前置 RFC §T3
Context budget: 约 60k / 120k
TODO refs: TS-70 ~ TS-72

`.ts` 扩展名识别 + CLI 开关(`qjs.c`/`qjsc.c`);与前置 RFC F2/F3 组合实现"TS 编译期 AOT + 运行期零 parser"。

**唯一允许端到端串联用例的里程碑**(→ 核心·推进路径约束)。Example:用户拿一个真实 TS 项目片段(含 enum + 装饰器 + 泛型),`./qjsc` 编译为字节码,再用零-parser 宿主执行。
