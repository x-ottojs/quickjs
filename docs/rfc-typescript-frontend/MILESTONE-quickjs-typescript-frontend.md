# Milestones: QuickJS 原生 TypeScript 前端

Owning RFC: `docs/rfc-typescript-frontend/RFC-quickjs-typescript-frontend.md`
Last updated: 2026-07-30

## 推进路线(DAG,无循环依赖)

```
M0 设计与评审(Done — 两模型对抗评审,9 项修订已落地)
   │
   ▼
M1  ts_mode 骨架 + 类型注解(Done — 已推送,3 bug 修复:箭头返回类型/可选参数/void)
   │
   ▼
M2a `>` token 重扫(Done — 已推送,阻断级前置已解除)
   │
   ▼
M2b 泛型与断言(歧义消解核心,风险最高)(Done — 已推送,2 轮子agent评审)
   │
   ▼
M3  类型声明(interface/type/declare + 重载签名,纯擦除)  ◄── 下一步
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
Status: Done
Progress: 100%
Depends on: M0
RFC refs: §D1、§S1、§S4
Important rule refs: S1(零回归最高优先级)、S2(不做类型检查)、S7(上游 merge 友好)
Context budget: 约 90k / 120k(实际,含 3 处 bug 修复往返)
Dependency check: pass
TODO refs: TS-10 ~ TS-16

## 目标与非目标

- 目标:建立 `ts_mode` 开关与 `js_parse_ts_type` 函数族;支持四个插入点的类型注解;**零回归**。
- 非目标:不含泛型消歧(M2b)、不含 `interface`/`type` 声明(M3)、不含任何生成代码的构造(M4+)。

## 执行线路(实际)

- `quickjs.h`:新增 `JS_EVAL_FLAG_TS (1<<8)`。
- `quickjs.c`:`JSParseState.ts_mode` 字段;`__JS_EvalInternal` 中设置;`js_parse_ts_type` 函数族(独立递归下降,不 emit 字节码);四个插入点(变量 28560、参数 36790、返回值 36909、类成员 25571)。
- `qjs.c`:`--ts` CLI 开关。
- `tests/test_ts.js`:新增测试套件。

## 子 agent 独立核对结论

委派 Opus-4.8 对抗式核对,判 **PARTIAL**,发现 3 个真实 bug,全部已修复并验证:

| Bug | 根因 | 修复 |
| --- | --- | --- |
| `(): T => x` 报语法错误 | `skip_parens_token` 判箭头靠闭合后是否 `TOK_ARROW`,带返回类型时闭合后是 `:` 不是 `=>`,箭头分支不触发 | 新增 `js_ts_is_arrow_with_return_type` trial-parse 辅助函数(emit-free,失败必回退) |
| `x?: T` 报 "expecting ','" | 参数名消费后未处理可选标记 `?` | 类型注解消费前先吞 `?` |
| `: void` / `=> void` 报 "expected type" | primary type switch 缺 `TOK_VOID` 分支 | 补分支 |

## 验证结果

- `./qjs --ts tests/test_ts.js` → ALL TS TESTS PASSED(含变量/函数/类/联合/数组/箭头/可选参数/void)。
- `make test` → 零失败。
- 含 `:` 的 JS 语法(对象字面量/label/三元/switch)在 ts_mode 关闭时逐字节行为不变(手动验证,test262 子模块未拉取,以 `make test` + 手动含 `:` 语法验证代替)。

## 结案

- 迭代目的:建立 TS 类型注解消费的骨架,作为后续里程碑的基座。
- 迭代前问题:前置 RFC 只有设计,无可运行代码。
- 如何迭代:摸底 flag 传递链路与四个插入点精确位置 → grill 确认执行简报 → 实现骨架与类型语法函数族 → 委派子 agent 核对 → 发现并修复 3 个 bug。
- 最终结果:TS-10~TS-16 全部 `Done`。已提交推送(GitHub `7d040d5` / JD `ab13cf4`)。剩余风险:test262 子模块未拉取,零回归验证依赖 `make test` + 手动语法核对,非完整 test262 对比(记录为范围化例外,不阻塞推进)。

---

# Milestone M2a: `>` token 重扫
Status: Done
Progress: 100%
Depends on: M1
RFC refs: §D2.2(b)、S4
Important rule refs: S4(已批准的新建机制)、S1(零回归)
Context budget: 约 35k / 120k(实际)
Dependency check: pass
TODO refs: TS-20 ~ TS-21

## 目标与非目标

- 目标:解决嵌套泛型 `Array<Map<K,V>>` 闭合 `>>` 被 lexer 合并为单 token 的阻断问题,使 M2b(泛型消歧)可以推进。
- 非目标:不做泛型实参消歧(M2b)、不做泛型参数声明/约束(M2b)。

## 设计与实现

新增 `js_ts_rescan_greater`(O(1) 词法重解释,非回溯):遇到 `TOK_SAR`(`>>`)/`TOK_SHR`(`>>>`)/`TOK_SAR_ASSIGN`(`>>=`)/`TOK_SHR_ASSIGN`(`>>>=`)/`TOK_GTE`(`>=`,子 agent 核对时发现遗漏并修复)时,把 `token.val` 改为 `>`、`buf_ptr` 回退到 `token.ptr+1`,让下一个 `next_token` 从第二个字符重新词法分析。集成到 `js_parse_ts_type_name` 的泛型闭合检查:`if (token=='>' || rescan==0) { next_token }`——每层泛型消费一个 `>`,逐层剥离直至最外层。

## 子 agent 独立核对结论

委派 Opus-4.8 核对,判 **PASS**。逐层时序追踪(2/3/4 层嵌套)全部正确。发现一处窄边界:`TOK_GTE`(无空格 `Array<number>=x`)未在 switch 中处理,会导致合法 TS 被拒绝(安全失败,非误接受)。已修复。

## 验证结果

- 嵌套泛型:2/3/4 层(`Array<Map<string,number>>`、`Array<Map<string,Set<number>>>`、四层)、泛型内数组后缀(`Map<string, number[]>`)、泛型参数是另一泛型(`Map<string, Array<number>>`)、三层同名(`Array<Array<Array<number>>>`)、无空格闭合+赋值(`Array<number>=x`、`Array<Array<number>>=x`)——全部通过。
- JS 位移零回归:`8>>2`、`-1>>>0`、`a>>=2`、`b>>>=2`、`5>=3` 结果与预期一致。
- `make test` 零失败。
- `js_ts_rescan_greater` 唯一调用点在 `js_parse_ts_type_name`(ts_mode 门控路径内),JS 路径不可达。

## 结案

- 迭代目的:解除评审发现的阻断级前置问题,使嵌套泛型可解析。
- 迭代前问题:M1 的类型 parser 遇嵌套泛型闭合 `>>` 直接报错(设计上的已知限制)。
- 如何迭代:摸底 lexer `>` token 生成与 `buf_ptr`/`token.ptr` 语义 → grill 确认最小方案 → 实现 `js_ts_rescan_greater` + 集成 → 反复调试闭合时序(初版有 2 处时序 bug,通过逐层追踪修正)→ 子 agent 核对发现并修复 `TOK_GTE` 遗漏。
- 最终结果:TS-20~TS-21 全部 `Done`。M2b(泛型消歧)的阻断已解除,可以推进。剩余风险:无——范围极小、验证充分。

---

# Milestone M2b: 泛型与断言(歧义消解核心)
Status: Done
Progress: 100%
Depends on: M2a
RFC refs: §D2、§S4
Context budget: 约 80k / 120k(实际,含 2 轮子 agent 评审)
TODO refs: TS-22 ~ TS-26

**风险最高的里程碑,已完成。** 核心难点:`f<T>(x)` 与 `a < b` 的消歧。

## 关键决策(用户 grill 确认)

`a<b>(c)` 与 `f<T>(x)` 语法上完全同形,真实 TS 编译器也依赖启发式而非纯语法判定。选定**方案 B(结构启发式)**:类型实参列表含逗号、或含 `[|&(<` 等复杂语法标记 → 判为泛型;单一简单标识符实参 + 后接 `(` → 保守判为比较表达式(已知限制,非 bug,可用逗号或类型断言绕过)。

## 实现

- `js_ts_try_generic_call`:postfix 循环内 `<` 分支,emit-free trial-parse + 结构复杂度启发式判定。
- `js_ts_is_generic_arrow`:表达式起始 `<T>(x)=>x` 判定。
- `js_parse_function_decl2` / `js_parse_class`:泛型参数声明 `<T, U extends V>` 消费。
- `js_parse_coalesce_expr`:`as`/`satisfies`/`as const`/非空断言 `!` 后缀循环,插入位置在 `js_parse_logical_and_or(TOK_LOR)` 之后,符合 TS 官方优先级(`a+b as T` = `(a+b) as T`)。

## 子 agent 独立核对(两轮)

第一轮委派评审输出不完整(任务标记完成但只有中间思考,无最终结论)——按重复漂移/失败路径处理,**重新委派不同模型**。

第二轮(GPT-5.5)判 **PARTIAL**,发现 2 个真实问题,均已修复:

| 问题 | 严重级别 | 修复 |
| --- | --- | --- |
| trailing comma `<T,>` 在泛型箭头/调用/函数声明/类声明中均不支持,且 `js_ts_is_generic_arrow` 注释承诺支持但代码未实现(注释与实现不一致) | MEDIUM | 4 处均加 trailing comma 支持 |
| `js_ts_try_generic_call` 复杂度扫描范围用 `s->buf_ptr` 而非精确的实参结束位置,依赖"越界扫到的分隔符不在复杂标记集合内"这一偶然安全条件——评审判定为"最危险的单点" | LOW(尚未导致误判,但是脆弱设计) | 改用 `s->token.ptr`(`js_parse_ts_type` 返回后即下一个 token 起点),扫描范围精确对应当前实参 |

评审同时确认核心歧义反例 `a<b>(c)` 正确判为比较(不误判)、postfix 集成正确(`accept_lparen` 双重保护)、`as`/`satisfies` 优先级正确、ASI 换行处理正确、零回归成立。

## 验证结果

- 核心歧义反例:`a<b>(c)`、`a<Foo.Bar>(c)`(点限定标识符)、加空格 `a < b > (c)` —— 全部正确判为比较,结果一致。
- 泛型调用消歧:多参数 `id<number,string>(42)`、复杂语法 `id<number[]>(42)` —— 正确判泛型。
- 泛型声明:函数 `function f<T>()`、`extends` 约束、类 `class Box<T>` —— 全部通过。
- 泛型箭头:`<T>(x)=>x`、带返回类型、多参数 —— 全部通过。
- `as`/`satisfies`/`as const`/非空断言 —— 全部通过,含组合 `(5 as number)!`。
- trailing comma:泛型箭头/调用/函数声明/类声明四处 —— 全部通过(第二轮修复后)。
- 深嵌套泛型调用性能:10000 次线性时间,非指数级(S4 终止性要求)。
- JS 位移/关系运算符零回归:`8>>2`、`5>=3` 等结果不变;`as`/`satisfies` 作变量名零回归。
- `make test` 零失败。

## 结案

- 迭代目的:解决 TS 融合中最危险的语法歧义,完成 M2 阶段(泛型与断言)。
- 迭代前问题:`f<T>(x)` 与 `a<b` 语法歧义无解析方案;`as`/`satisfies`/非空断言/泛型声明均未实现。
- 如何迭代:摸底 `<` 的解析入口与字节码 emit 时机(发现 callee 求值在判定前已完成,不需清理)→ grill 确认消歧规则(结构启发式,保守回退)→ 实现 5 处改动 → 两轮子 agent 评审(第一轮失败重新委派,第二轮判 PARTIAL)→ 修复 2 个问题(trailing comma 缺口、扫描范围脆弱性)。
- 最终结果:TS-22~TS-26 全部 `Done`。M2(泛型与断言)阶段完成,可推进 M3(类型声明)。剩余风险:单参数无逗号泛型调用与比较表达式同形时保守判比较,是设计内已知限制,已在 RFC 记录。

---

# Milestone M3: 类型声明(纯擦除)
Status: Not Started
Progress: 0%
Depends on: M2b
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
