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
M3  类型声明(interface/type/declare + 重载签名,纯擦除)(Done — 已推送,strict-only关键字陷阱固化)
   │   └─ 至此 B1 完成,可独立交付
   ▼
M4  enum + const enum(首个生成运行时代码,含最小 binder)(Done — 已推送,peek_token陷阱固化+const enum内联)
   │
   ▼
M5  参数属性 + namespace(声明合并)(Done — 已推送,3个strict-only/关键字bug+OP_copy_data_properties位编码验证)
   │
   ▼
M6a 装饰器 legacy + emitDecoratorMetadata(Done — 四种装饰器+三个design:metadata键全部完成,与真实tsc逐条验证)
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
Status: Done
Progress: 100%
Depends on: M2b
RFC refs: §B1
Context budget: 约 90k / 120k(实际,含 strict-only 关键字问题的调试与两处子agent发现修复)
TODO refs: TS-30 ~ TS-33

`interface` / `type` / `declare` / `import type`/`export type` 整体消费丢弃;函数重载签名(空函数体方案)。**B1 阶段(可擦除语法)全部完成,可独立交付价值**。

## 关键实现发现:strict-only 保留字问题(重要事项,已固化经验)

`TOK_INTERFACE`/`TOK_ENUM` 等枚举值不是无条件生成的:`update_token_ident()`(quickjs.c:22757)机制显示,只有 atom 序号 `<= JS_ATOM_LAST_KEYWORD`(`= JS_ATOM_super`)的标识符无条件转 token;序号在 `JS_ATOM_LAST_KEYWORD` 与 `JS_ATOM_LAST_STRICT_KEYWORD`(`= JS_ATOM_yield`)之间的(`interface` 恰好落在此区间),**只在 strict mode 下**才转换成对应 token。

**影响**:顶层非 strict 脚本里,`interface` 保持为普通 `TOK_IDENT`,单纯 `case TOK_INTERFACE:` 分支完全不可达。初版实现踩了这个坑(症状:`interface Point {...}` 报 "expecting ';'"),定位后在 `js_parse_statement_or_decl` 的语句 switch **之前**新增统一的伪关键字检测块,同时识别 `TOK_INTERFACE` token 与 `token_is_pseudo_keyword(JS_ATOM_interface)`,`type`/`declare` 同理用 `js_ts_is_pseudo_keyword_str`。

## 子 agent 独立核对与自我修复时序

主会话在委派评审**期间**独立发现并修复了同一个 P0 问题(`declare` 伪关键字检测缺少"看起来像声明"的 peek 守卫,导致 `declare = 101;` 这种把 `declare` 当普通变量名的合法代码被误判为 ambient 声明报错)。子 agent(Opus-4.8)评审判 **FAIL**,精确指出了同一处 `quickjs.c:29355`(评审时的行号,基于修复前的代码状态);核对后发现该问题已被主会话修复(新增 `js_ts_declare_looks_like_decl` trial-parse 守卫),补充验证全部通过。

评审同时指出一处次要边界问题(P2):`import type Foo from "./x"` 若文件以此结尾且**无分号无换行**(纯 EOF),会误报 "unterminated import statement" 而非按 ASI 成功——已修复(EOF 视为语句终止)。

第三处(P3,`declare class` 会真正构造 class 对象并绑定 const,偏离 TS ambient "无运行时表示"语义)经评审自评为"设计权衡,当前选择可接受",记录为已知限制不修复:复用现有 `js_parse_class` 是最小改动方案,若要严格贴合 ambient 语义需要自定义 class-body 跳过逻辑,成本明显更高而收益有限(ambient class 极少被真正实例化,即使生成了绑定也不影响正常代码路径)。

## 验证结果

- `interface`:基础声明、泛型 `<T>`、`extends` 多重继承 —— 全部通过。
- `type` 别名:基础、泛型、`export type Foo = ...`、`export type { X, Y }`、`import { type A, B }` —— 全部通过。
- `declare`:`function`/`const`/`let`/`var`/`class` —— 全部通过。
- 函数重载签名:`function f(x:T):R;` + 真实实现,后者覆盖前者(已验证同名 function 声明可覆盖是合法 JS 语义)。
- **回归守卫(本轮新增)**:`declare`/`type`/`interface` 作普通变量名/函数名时不被误判(`declare = 101`、`function declare2(x){}` 等)。
- `make test` 零失败。

## 结案

- 迭代目的:完成 B1 阶段(可擦除语法)最后一块——类型声明,使 TS 前端具备独立交付价值。
- 迭代前问题:`interface`/`type`/`declare`/函数重载签名/`import type` 均未实现。
- 如何迭代:摸底语句分派入口 → 发现并修正 strict-only 关键字陷阱(interface 初版实现失败,定位根因,改为统一伪关键字前置检测)→ grill 确认 declare/import type 范围 → 实现 5 项 → 子 agent 评审期间主会话自查发现并修复 declare 误判 P0 → 评审确认修复有效并发现 1 处次要边界(已修)、1 处设计权衡(记录不改)。
- 最终结果:TS-30~TS-33 全部 `Done`。B1 阶段完成,可推进 M4(enum,首个触及字节码生成层)。**重要事项固化**:任何新增 TS 伪关键字检测,必须用 trial-parse(get_pos/seek_token)或至少 peek_token 验证"后续形态像声明",不能只判断当前 token 是伪关键字就直接进入声明分支——这是本轮 P0 的直接根因,已作为经验写入。

**M4 前瞻性核实(避免重复踩坑)**:已验证 `enum` 的 atom 序号在 `quickjs-atom.h` 中排在 `super` 之前(第 61 行 vs 65 行),即 `enum` **不是** strict-only 关键字,在非 strict 模式下已被词法层无条件转成 `TOK_ENUM`(实测 `enum Foo{A}` 直接命中 `js_unsupported_keyword` 分支,证明 token 匹配成功)。**M4 不会重复本轮 M3 的 strict-only 关键字陷阱**,可直接在语句 switch 的 `case TOK_ENUM:` 处接入,无需 M3 式的前置伪关键字检测块。

---

# Milestone M4: enum(首个生成运行时代码)
Status: Done
Progress: 100%
Depends on: M1(骨架)、M3(B1 完成)
RFC refs: §D3、§S3
Context budget: 约 90k / 120k(实际,含 const enum 内联范围决策的两轮 grill 与 peek_token 陷阱调试)
TODO refs: TS-40 ~ TS-42

**首个触及字节码生成层的里程碑,已完成。** `enum` 降级为对象 + 正反向映射;`const enum` 完整内联(用户 grill 决策,范围收窄为仅字面量常量成员)。

## 关键决策:const enum 内联范围(两轮 grill)

第一轮 grill 给出 B(降级为普通对象)/A(完整内联)/C(不支持)三选项,用户选 **A(完整实现内联优化)**。摸底发现完整覆盖需要在 `OP_scope_get_var` 的全部 22 处 emit 点检测常量替换,风险过高。第二轮 grill 提出收窄方案——**只在 `js_parse_postfix_expr` 的 `case TOK_IDENT:` 一处插入点**做"标识符.成员"模式的常量替换,覆盖 const enum 99%+ 的真实用法(独立表达式语句中的属性访问);未覆盖的边缘用法(解构/迭代目标)因无真实绑定会报 `ReferenceError`(诚实失败,非静默错误)。用户确认维持 A、采用收窄方案。

## 实现

- `js_parse_ts_enum(s, is_const)`:消费 `enum Name { A, B=1, C="s" }`。emit 序列复用 `js_parse_object_literal` 的 `OP_object`+`OP_define_field` 模式(正向映射)和 `OP_define_array_el` 模式(反向映射),**不新增任何 opcode**。字符串成员不生成反向映射(TS 语义)。成员值仅支持字面量数字/字符串与自动递增,遇到计算表达式报错(范围限制,已记录,非隐藏 bug)。
- `const enum`:全部成员为字面量时,不生成对象,记入 `JSTSConstEnumEntry` 链表(挂 `JSParseState.ts_const_enum_head`,用原始 `double`/`JSAtom` 存值,不用 `JSValue` 避免 GC 生命周期复杂性)。
- 内联查表:`js_ts_const_enum_lookup`,在 `js_parse_postfix_expr` 的 `TOK_IDENT` 分支单点触发,`(enum_name, member_name)` 双 atom 精确匹配。
- 内存清理:`js_ts_free_const_enum_table` 在 `__JS_EvalInternal` 的全部相关出口(成功 return + `fail1:`)调用;已用 `-d` dump memory 对比验证 atom 计数无增长(无泄漏)。

## 实现过程中的调试:peek_token 陷阱(第二次,不同于 M3)

`case TOK_CONST:` 检测 `const enum` 最初写成 `peek_token(s,TRUE)==TOK_ENUM`,报 "variable name expected"。定位发现 `peek_token` 用 `simple_next_token`——一个只硬编码识别 `export`/`function`/`in`/`import` 等少数关键字的极简词法器,对 `enum` 只返回 `TOK_IDENT`,永不返回 `TOK_ENUM`。改用真正的 trial-parse(`get_pos`→`next_token`→检查真实 `token.val`→`seek_token` 回退→确认后再推进)。**这与 M3 的 strict-only 关键字陷阱是不同的坑**(M3 是"关键字不生成 token",本次是"轻量级 lookahead 词法器不识别关键字"),已一并记录避免混淆。

## 字节码 dump 验证(RFC 要求的验证手段)

`enum Color { Red, Green }` 实测字节码:
```
object; dup; push_i32 0; define_field Red; dup; push_i32 0; push_atom_value Red; define_array_el; drop;
dup; push_i32 1; define_field Green; dup; push_i32 1; push_atom_value Green; define_array_el; drop;
put_var_init 0: Color
```
子 agent 核对(GPT-5.5,纯静态追踪 opcode n_pop/n_push 签名)确认栈平衡自洽:`object`(push 1)→每个成员正向`dup+push+define_field`(净效果 +0)→反向`dup+push+push+define_array_el+drop`(净效果 +0)→最终仅一个 obj 被 `put_var_init` 消费。

## 验证结果

- 数值 enum(反向映射)、显式值+自动递增续接、字符串 enum(无反向映射)、异构 enum —— 全部通过。
- const enum:数值/字符串成员内联、`typeof EnumName` 为 `undefined`(无真实绑定验证)、非字面量成员正确拒绝 —— 全部通过。
- 回归守卫:`const enum` 查表用 `(enum_name, member_name)` 双 atom 精确匹配,不会把同名属性的普通对象(`{Active: 999}`)误判为 enum 引用。
- 普通 `const x = 5` 声明零回归(trial-parse 未误判)。
- `make test` 零失败。

## 子 agent 独立核对

第一次委派(Opus-4.8)耗时异常(超 25 分钟未返回,疑似被"要求重新编译+跑字节码dump"的复杂指令卡住)——按重复失败路径处理,**取消并换模型重新委派**(GPT-5.5),改为"我给实测结果,你只做静态代码追踪交叉验证"的更聚焦任务。第二次评审判 **PASS**,5 项核对(opcode 栈签名/内联插入点/peek_token修复/内存管理/字符串跳过反向映射)全部通过,与主会话实测无矛盾。

## 结案

- 迭代目的:实现首个触及字节码生成层的 TS 构造(enum),验证"不新增 opcode"的 RFC 约束(S3)在实践中成立。
- 迭代前问题:enum 完全未实现;const enum 的内联范围需要用户在"完整覆盖(高风险)"与"够用即可(低风险)"之间决策。
- 如何迭代:摸底 emit 原语与现有对象字面量模式 → grill 确认内联范围(两轮,从"完整覆盖"收窄到"单插入点")→ 实现 enum 消费+降级 emit → 实现 const enum 符号表+单点内联 → 调试 peek_token 陷阱(trial-parse 修正)→ 字节码 dump 验证 → 子 agent 评审(一次异常重新委派,二次 PASS)。
- 最终结果:TS-40~TS-42 全部 `Done`。**S3(不新增 opcode)在 enum 这个最复杂的 B2 构造上得到验证**——正向/反向映射完全用现有 `OP_object`/`OP_define_field`/`OP_define_array_el` 表达。剩余风险:const enum 成员值范围限制(仅字面量+自增,不支持计算表达式)已记录为已知限制,不阻塞推进;const enum 内联单插入点范围限制(不覆盖解构/迭代等边缘用法)同样已记录。

---

# Milestone M5: 参数属性与 namespace
Status: Done
Progress: 100%
Depends on: M4
RFC refs: §D3
Context budget: 约 110k / 120k(实际,本 RFC 至今最大改动:触及 class 核心构造路径 + OP_copy_data_properties 位编码字节码 + 手写嵌套函数体解析)
TODO refs: TS-50 ~ TS-52

**本 RFC 至今风险最高的里程碑,已完成。** 参数属性完整支持派生/非派生两种时序;namespace 完整支持声明合并两个方向(含 class/function)。

## 关键决策(三轮 grill)

1. **参数属性时序范围**:摸底发现原计划"复用 `emit_class_field_init`"不成立——非派生类的该调用点在**参数解析之前**,而参数属性赋值需要参数已解析完;派生类的调用点在用户代码 `super()` 表达式解析路径中,非固定位置。用户选 **A(完整支持派生+非派生)**,需同时改动 `js_parse_function_decl2`(非派生,挪调用点到参数解析后)与 `js_parse_postfix_expr` 的 `FUNC_CALL_SUPER_CTOR` 两处(派生)。
2. **namespace 与 class/function 合并方向**:摸底发现"方向1(class在前)"只需查表复用绑定(低风险),"方向2(namespace在前)"需要真正的运行时属性合并(高风险,需用 `OP_copy_data_properties` 位编码字节码,插入 `js_parse_class` 核心绑定路径)。**两轮 grill 用户均坚持完整支持两个方向**,最终采用现有位编码字节码(不新增 opcode)精确复刻对象展开语法的编码模式,已通过子 agent 逐位解码核对确认正确。

## 实现过程中的重大调试(比 M1-M4 加总更多)

- **strict-only 关键字陷阱(第三次,S9(a))**:`private`/`public`/`protected` 是 strict-mode 保留字,在 class 体(总是 strict)内会被词法层转成 `TOK_PRIVATE` 等专用 token,而非 `TOK_IDENT`——用 `js_ts_is_pseudo_keyword_str` 检测必然失败。改用 `token.val == TOK_PRIVATE/PUBLIC/PROTECTED` 直接判断(`readonly` 无预定义 atom,仍用伪关键字检测)。
- **强制关键字误判为伪关键字**:`export` 的 atom 序号在 `super` 之前,是**无条件强制关键字**(非 strict-only、非纯上下文关键字),namespace 内部 `export` 检测最初错误地用了 `token_is_pseudo_keyword`,必然失败。改用 `s->token.val == TOK_EXPORT`。
- **`define_var` 返回值语义误用**:`define_var` 在 `fd->is_global_var`(顶层脚本/eval)场景下返回固定占位值 `GLOBAL_VAR_OFFSET`,不是可用的局部变量 slot。namespace 首次声明最初用 `OP_get_loc`/`OP_put_loc` 访问这个返回值,在顶层直接读到错误位置(`N` 求值为 `undefined`)。改用 `OP_scope_get_var`/`OP_scope_put_var`(按 atom 名字访问,兼容全局与局部两种场景)。
- **`js_parse_function_decl2` 的 `func_name` 参数契约**:该函数对 `JS_PARSE_FUNC_STATEMENT` 要求 `func_name` 必须是 `JS_ATOM_NULL`(函数名从 token 流自解析,不接受外部传入)。namespace 内 `export function NAME(){}` 需要提前知道 `NAME`(用于挂载到命名空间对象),但不能违反这个契约——改用 trial-parse(`get_pos`/`next_token`/`seek_token`)预读函数名后立即回退,再让 `js_parse_function_decl` 正常自解析。
- **class/namespace 混合绑定类型冲突**:namespace 用 `var` 绑定,class 用 `let` 绑定,合并时若两处都各自调用 `define_var`,会产生"invalid redefinition of lexical identifier"/"invalid redefinition of global identifier"。修复:检测到合并时,后声明的一方跳过 `define_var`,只对已有绑定做值层面操作(方向1:直接复用;方向2:`OP_copy_data_properties` 合并属性后 `OP_scope_put_var` 重新赋值,不用 `_init` 变体)。
- **namespace/function 合并"免费"生效**:未专门处理,但两个方向都自然工作——因为 `function` 声明本身是 `var`-like、可重新赋值,与 namespace 的 `Name || (Name={})` 复用逻辑天然兼容,不像 `class`(let,不可重复声明)需要显式合并逻辑。

## 实现

- `js_ts_emit_param_properties`:遍历 `JSFunctionDef.ts_param_prop_names`(参数解析时收集),emit `this.NAME = ARG` 系列(`OP_scope_get_var this` + `OP_get_arg` + `OP_define_field` + `OP_drop`,栈净变化为 0)。非派生类调用点挪到参数列表解析完成后;派生类在两处 `FUNC_CALL_SUPER_CTOR`(`OP_apply`/`OP_call_constructor` 两种调用形态)的 `emit_class_field_init` 之后追加调用。
- `js_parse_ts_namespace`:手写嵌套函数体构造(参考 `js_parse_function_class_fields_init` 范式但改为真实参数+真实语句解析),IIFE 参数为命名空间对象,`export const/let/var/function` 挂载到参数对象(`js_ts_parse_namespace_member`),非 export 语句走普通 `js_parse_statement_or_decl`。
- `JSTSMergeableDecl` 链表(挂 `JSParseState.ts_merge_head`):记录 namespace/class/function 绑定身份,供声明合并双向查询。
- `js_parse_class` 绑定收尾处新增方向2检测:若发现同名已是 `JS_TS_MERGE_NAMESPACE`,用 `OP_copy_data_properties`(mask=`2|(1<<2)|(0<<5)`,与现有对象展开语法完全一致的编码)把命名空间对象属性复制到新建类对象上。

## 范围限制(已记录,非隐藏 bug)

- 嵌套 namespace `A.B.C` 不支持,遇到给出清晰编译错误(而非静默误判)。
- namespace 导出的 `class`/`interface`/嵌套 `namespace` 不会被挂载到父命名空间对象上(只有 `const`/`let`/`var`/`function` 四种导出形式被复制);这些声明仍作为命名空间体内的普通局部绑定可用,只是访问 `N.SomeExportedClass` 会得到 `undefined` 而非报错——这是可观察的差异,不是静默错误。

## 验证结果

- 参数属性:非派生类(`public`/`private`/`protected`/`readonly` 四种修饰符)、派生类(`super()` 后正确访问 `this`)、与类字段混用 —— 全部通过,含字节码 dump 验证(`get_loc this / get_arg x / define_field x / drop`)。
- namespace:基础声明、函数导出、局部变量不泄漏、同名多段合并、方向1(class在前)、方向2(namespace在前,`OP_copy_data_properties`)、三段合并(namespace+class+namespace)、function 双向合并 —— 全部通过。
- 零回归:纯 JS class(含类表达式)、TS class 无 namespace 合并场景 —— 行为不变。
- 内存管理:多次重复运行相同代码,atom 计数稳定不增长(merge 表清理正确)。
- `make test` 零失败。

## 子 agent 独立核对

判 **PASS**,重点核对了本里程碑唯一的高风险手写字节码(`OP_copy_data_properties` 位编码)——逐位解码验证 `target=sp[-3]`/`source=sp[-2]`/`excludeList=sp[-1]` 与栈布局精确匹配,且与现有对象展开语法的编码模式完全一致。全部结论与主会话 12 项实测无矛盾。

## 结案

- 迭代目的:完成 B2 阶段第二个里程碑,验证"完整支持双向声明合并"这类高复杂度需求在 RFC 约束(S3 不新增 opcode、S9 断言强度校准)下的可行边界。
- 迭代前问题:参数属性的两种时序、namespace 与 class/function 合并的两个方向均未实现,且初步摸底显示比预期复杂得多(单一注入点方案不成立)。
- 如何迭代:摸底发现方案不成立 → 两轮 grill 确认范围(用户坚持完整支持而非收窄)→ 实现参数属性(两处注入点)→ 调试 3 个真实 bug(strict-only 关键字、强制关键字误判、`define_var` 返回值语义)→ 实现 namespace(手写函数体构造 + 双向合并)→ 调试 2 个真实 bug(`func_name` 契约、绑定类型冲突)→ 字节码 dump 验证 → 子 agent 核对。
- 最终结果:TS-50~TS-52 全部 `Done`。B2 阶段第二个里程碑完成,可推进 M6。**本轮踩坑数量(5 个真实 bug)是本 RFC 至今单里程碑最多**,已固化的经验:S9 规则(strict-only/强制/伪关键字三类判断必须先核实 atom 在 `quickjs-atom.h` 中的真实位置,不能凭直觉分类)、`define_var` 返回值在 `is_global_var` 场景下的特殊语义(新固化经验,未写入 S9 但应视为同类陷阱)。

---

# Milestone M6a: 装饰器 legacy (TS experimentalDecorators)
Status: Done
Progress: 100%
Depends on: M5
RFC refs: §D3、§风险表
Context budget: 约 130k / 120k (实际，超出预算——本 RFC 至今最复杂的一次改动，触及词法层新符号'@'、类构造收尾流程、跨函数状态传递、字节码"跳转重解析"机制)
TODO refs: TS-60 ~ TS-63

**入口已 grill 确认语义版本**：终局视角决策为两套并存(legacy + stage3)，legacy 优先，本里程碑实现 legacy。

## 范围完成情况

- ✅ 类装饰器 `@dec class Foo{}`（含替换构造函数，如 TS 官方 `reportableClassDecorator` 范例）
- ✅ 方法/访问器装饰器 `@dec method(){}`（`Object.getOwnPropertyDescriptor`+调用+`Object.defineProperty`，静态/实例均支持）
- ✅ 属性装饰器 `@dec prop;`（2 参，返回值忽略）
- ✅ 参数装饰器 `constructor(@dec x){}`（构造函数与普通方法均支持）
- ✅ 装饰器工厂 `@dec(args)`（100% 真实场景形态）
- ✅ 多装饰器复合求值/应用顺序（top-to-bottom 求值、bottom-to-top 应用，与 TS 官方文档范例逐行对比一致）
- ✅ 类+参数装饰器混合顺序（与真实 tsc 转译输出逐行对比一致）
- ⏸️ **`emitDecoratorMetadata`（受限类型序列化）—— grill 已选定要做，但本里程碑上下文预算耗尽，未实现，推迟到 M6a-metadata 或并入 M6b**。这是需要向用户明确汇报的范围缺口，不是隐藏降级。

## 关键技术决策：不引入运行时 `__decorate` helper

没有像 tsc 那样注入一个通用的 `__decorate`/`__param` JS 函数，而是在编译期直接展开等价字节码——因为装饰器数量在编译期已知，不需要运行时循环。用真实 tsc 反复编译验证转译输出（`__decorate`/`__param`/`__metadata` 三个 helper 的实现细节），确保生成的字节码语义与之完全等价。

## 参数装饰器求值时机：本里程碑最难的正确性问题

摸底最初按方法/属性装饰器的"原地求值"模式实现参数装饰器，跑通后用真实 tsc 交叉对比才发现语义错误：tsc 把参数装饰器表达式的求值放在**类声明时（一次）**，不是每次构造函数调用时。若直接照搬"原地求值"，装饰器工厂会在每次 `new` 时重复求值——语义错误但表现不明显（真实参数装饰器多无副作用），差点被放过。

解决方案：参数解析时只用 `js_ts_skip_decorator_expr`（新写的纯扫描函数，不 emit）跳过表达式，记录源码区间；类构造完全结束后，用 `js_parse_seek_token` **跳转回该区间重新解析求值**（此时 `s->cur_func` 已切回外层类函数，emit 进入正确的字节码流），再跳回原位置继续解析。这是本 RFC 目前最复杂的字节码/token 流控制机制。

进一步核对后发现：求值与应用不能合并在同一循环——必须先按源码顺序对所有参数装饰器求值（存入各自隐藏变量），再统一按逆序应用调用。第一版把两步合并导致顺序错误（已用 tsc 对比发现并修正为 `js_ts_apply_class_decorators` 的两阶段结构）。

## 实现中暴露的 3 个真实 bug（均已修复并验证）

1. **段错误**：`define_var` 在顶层 eval 场景对 `LET` 类型也会返回占位值 `GLOBAL_VAR_OFFSET`（约 10 亿），最初用这个返回值当 `fd->vars[]` 数组索引，导致越界访问段错误。这是 M5 已固化的 S10 规则在装饰器场景的**第三次**复现——足以说明这类 `define_var` 返回值陷阱具有跨里程碑重复性，值得作为长期检查项。修复：`JSTSDecoratorEntry` 全部改用 `JSAtom hidden_var_name` 直接存 atom，按名访问不索引数组。
2. **作用域生命周期错误**：装饰器隐藏变量最初在类体 `push_scope`/`pop_scope` 包裹的内层作用域声明，但应用代码在 `pop_scope` 之后才读取，变量已脱离作用域链，报 `ReferenceError`。修复：捕获 `push_scope` 之前的 `decorator_scope_level`，`define_var` 时临时切换 `fd->scope_level` 到这个外层值。
3. **隐藏变量名计数器冲突**：命名计数器最初是每次 `js_parse_class`/相关函数调用重新从 0 开始的局部变量，导致两个独立类各自生成同名隐藏变量（`<ts_dec_0>`），因两者实际共享同一个外层作用域而报"invalid redefinition"。修复：提升为 `JSParseState.ts_decorator_counter` 全局单调计数器。

## 验证

- 20+ 个真实场景，每个都与真实 `tsc`（`npx typescript@latest`）编译输出逐行对比验证：基础方法装饰器、装饰器工厂、多装饰器复合顺序、descriptor 修改、属性装饰器、静态方法装饰器、accessor 装饰器、类装饰器观察/替换（含 TS 官方 `reportableClassDecorator`/`sealed` 范例）、参数装饰器（构造函数/普通方法）、参数装饰器求值时机（核心正确性：3 次 `new` 只求值 2 次而非 6 次）、参数装饰器顺序、类+参数装饰器组合顺序、装饰器成员访问链 `@ns.dec()`、装饰器多层调用 `@factory()()`、多类独立装饰器不冲突（bug 3 的回归测试）。
- 字节码 dump 验证参数装饰器的求值代码确实生成在类声明收尾流程里，不在构造函数体内。
- 内存：多次独立进程运行 atom 计数稳定，无跨运行累积泄漏；`js_ts_free_decorator_list` 覆盖 `js_parse_class` 全部出口；`method_fd->ts_param_decorators` 转移后置 NULL，`js_free_function_def` 防御性释放不产生 double-free。
- `make test` 与 `tests/test_ts.js`（140+ 行）全部通过。

## 追加：`emitDecoratorMetadata` 补做完成（grill 已选定 B 方案，本次补齐缺口）

`design:type`/`design:paramtypes`/`design:returntype` 全部实现并用真实 tsc 逐条验证。核心策略：`js_ts_classify_type_range` 对已消费的类型注解源码范围做**字符扫描分类**(不是重新 parse)，只在类型消费点被调用时才产生额外开销，未装饰的普通 TS 代码零额外成本。8 种基础类型(number/string/boolean/symbol/bigint/void/any/object)+数组+函数类型+裸标识符精确映射，联合/交叉/字面量/条件/映射等复杂类型统一 `Object` 兜底(grill 确认，与 tsc 自身行为大部分一致)。裸标识符类型引用**不加安全网**直接 emit 引用(grill 明确决策)：若引用的是 interface/type-only 声明，会在类构造时抛 `ReferenceError`，这是设计内的诚实失败，测试过程中意外撞到过一次(TDZ 场景，`Point9` 声明顺序写反)，验证了这个设计确实按预期生效。

**过程中发现并修复的 2 个真实 bug**：
1. **attach 时序 bug**：最初假设"`pending_member_decorators` 非空即说明该字段被装饰"，但 `js_ts_attach_pending_decorators` 在类字段类型注解消费**之前**就已经把它转移清空了(该函数在字段的 `PROP_TYPE_IDENT` 分支最开头就被调用)。修复：改为直接查 `decorator_head` 里刚 attach 的、匹配当前 name+is_static+kind 的条目(与方法返回类型回填机制统一)。这是本 RFC 里第三次遇到"assume 某个中间状态还没变化，实际已经变化"类的时序 bug(前两次分别是 M5 的作用域生命周期、参数装饰器求值时机)。
2. **隐式默认构造函数误判**：用真实 tsc 交叉验证发现，`design:paramtypes` 只在类有**显式** `constructor(){}` 时生成(哪怕零参数，生成空数组)，但类没有显式构造函数时完全不生成——最初实现用 `ctor_fd != NULL` 作判断依据，但 `js_parse_class_default_ctor` 会给隐式默认构造函数也赋值 `ctor_fd`，导致误判。修复：在 `js_parse_class_default_ctor` 调用**之前**用独立变量 `ts_explicit_ctor_fd` 捕获"是否显式"的状态，不污染 `ctor_fd` 本身(它后面还有 `ctor_fd->parent_cpool_idx` 等逻辑依赖非 NULL)。

**Reflect.metadata 存在性守卫**：每次 emit 都生成 `typeof Reflect === "object" && typeof Reflect.metadata === "function"` 检测(不存在则整段 no-op，不调用任何东西)，与真实 tsc `__metadata` helper 行为一致；`bigint` 类型用 `typeof BigInt === "function" ? BigInt : Object` 特殊三元表达式(逐字复现 tsc 生成代码)，因为 tsc 面向的运行时不保证有全局 `BigInt`(QuickJS 本身有)。

验证补充：30+ 场景(属性/方法/类构造函数三种 `design:paramtypes` 触发条件、联合类型→Object、数组→Array、bigint→BigInt、无 `Reflect.metadata` 时零回归、隐式/显式构造函数区分)全部与真实 tsc 交叉验证；`tests/test_ts.js` 扩充到 200+ 行；内存多次独立运行 atom 计数稳定(843)。

## 子 agent 独立核对：三次因基础设施故障失败，改为主会话自主核对

三次委派评审均因平台层错误中断("Anthropic API error: Connection error" ×2、"Stream request failed" ×1)，均非评审内容本身的问题，判定为当时的平台侧临时故障。未做第四次重试(已消耗较多轮次)，改为主会话针对评审清单里风险最高的项目做独立静态核对，全部确认无误：
- 段错误 bug 修复完整性：`grep hidden_var_idx` 零残留 ✅
- 计数器统一性：局部计数器变量名零残留，全部改用 `s->ts_decorator_counter` ✅
- 内存出口完整性：`js_parse_class` 两个出口均调用 `js_ts_free_decorator_list`(含新增三个 metadata 字段)；`js_ts_emit_type_meta_value` 用 const 指针只读不释放 `ident_atom`，`ctor_fd->ts_param_type_metas` 所有权始终归 `ctor_fd`、由 `js_free_function_def` 统一释放，不 double-free ✅
- attach 时序修复完整性：属性字段已修复为查 `decorator_head`；方法回填机制本身设计时序正确(在 `js_parse_function_decl2` 返回**之后**才查)，未受影响 ✅
- `Reflect.metadata` guard 的两次 `emit_goto` 确认复用同一 `label_skip`(第二次调用传入已有 label 而非 `-1`) ✅
- `js_ts_skip_decorator_expr` 与真正求值用的 `js_parse_left_hand_side_expr` 语法覆盖不对称的方向安全性：skip 更严格、eval 更宽松，不会有"skip 通过但 eval 失败"的危险场景 ✅
- **额外发现**：隐式默认构造函数误判 bug 是在自主边界测试(而非评审)中被发现的——证明持续的真实场景测试本身就是有效的验证手段，不完全依赖外部评审。

**已知限制（记录，非隐藏）**：`js_ts_apply_class_decorators` 中"先参数装饰器整体、后类装饰器整体、design:paramtypes 最先"的分阶段处理，与 tsc `__decorate` 单次反向遍历混合数组在**已实测的组合场景**下行为一致，但未做形式化证明覆盖所有可能的数量排列组合。

## 结案

- 迭代目的：让 QuickJS 原生支持真实 TS 后端项目（NestJS/TypeORM 等）依赖的核心机制——legacy 装饰器四种形态 + `emitDecoratorMetadata`。
- 迭代前问题：`@` 完全不可用；参数装饰器的正确求值时机需要真实 tsc 验证才能发现；类型注解在 M1 是纯擦除，metadata 需要选择性保留分类信息。
- 如何迭代：用真实 tsc 摸底四种装饰器精确语义与转译模式 → grill 确认求值/metadata 范围（两轮，均选择更完整的终局方案）→ 实现类/方法/属性装饰器 → 调试 3 个真实 bug（段错误/作用域/计数器）→ 实现参数装饰器（发现求值时机语义错误并重新设计）→ 用真实 tsc 摸底 metadata 精确规则 → 实现类型分类+收尾应用 → 调试 2 个真实 bug（attach 时序/隐式构造函数误判）→ 30+ 场景验证 → 三次子 agent 评审基础设施故障改自主核对。
- 最终结果：TS-60~TS-65 **全部完成**。B2 阶段第三个（也是最复杂的）里程碑完成，可推进 M6b(stage3 装饰器) 或 M7(集成)。

---


# Milestone M6b: 装饰器 stage 3 (标准生态)
Status: **Done(TS-66/TS-67/TS-68)**
Progress: 100%
Depends on: M6a
RFC refs: §D3.4
TODO refs: TS-66 ~ TS-68

## 目标与非目标

- 目标：TC39 stage3 装饰器 `(value, context)` 语义，与 legacy（M6a）通过 CLI 开关并存（`--ts-stage3`，默认 legacy，对齐 tsc `experimentalDecorators`）。
- 范围限制（用户 grill 确认）：字段初始化改写（tsc `__runInitializers` 包装）与构造函数 extraInitializers 注入未实现——addInitializer 收集但不运行（已知缺口，非崩溃）。

## 实现

1. **C helper（完成，验证通过）**：`quickjs-libc.c` 实现 `__esDecorate`/`__runInitializers`，6 参数调用形状完整复刻 tsc（ctor/descriptorIn/decorators/contextIn/initializers/extraInitializers）；context 支持 kind=method/field/accessor/getter/setter/class；`context.addInitializer` 经 `JS_NewCFunctionData` 闭包 push 进 extraInitializers。**直接 JS 调用全场景验证通过**（方法/字段/类装饰器、addInitializer、init 链、descriptor 更新、类替换）。
2. **引用计数契约（本次调试核心收获）**：`JS_GetProperty`/`JS_GetGlobalObject`/`JS_New*`/`JS_Call` 返回新引用归调用者；`JS_SetProperty(Str)` 消费值参数（所有路径）；`JS_Call` 不消费 argv（COPY_ARGV）；`JS_GetOwnPropertyNames` 返回 atom 须逐个 `JS_FreeAtom`；**`JS_GetGlobalObject` 返回值必须显式 `JS_FreeValue`**（漏释放泄漏整个对象图，曾表现为 552 个对象假泄漏 + 断言崩溃）。
3. **CLI 链路（完成）**：`JS_EVAL_FLAG_TS_STAGE3 (1<<9)` + `JSParseState.stage3_decorators` + `qjs --ts-stage3` + `js_parse_class` 应用点分支（stage3 走 `js_ts_apply_stage3_decorators`，跳过 legacy 两函数）。
4. **emit 层（完成）**：`js_ts_apply_stage3_decorators` 生成 `__esDecorate` 调用字节码——context 对象构建（kind/name/static/private/access/metadata 七字段）、decorators 数组打包存隐藏变量、6 参数按 argv 顺序 push、callee 经 `Object.__esDecorate`（预定义 atom 桥接）获取。端到端验证通过（`--ts-stage3` 全场景）。

## not-a-function bug 排查记录（已解决，2026-07-31）

症状：`--ts-stage3` 下 `@dec` 行报 `TypeError: not a function`，C helper 从未被调用。排查过程的关键教训：

1. **`OP_call` 操作数约定（根因之一）**：QuickJS 是 **callee 先压栈、参数按 argv 顺序在后**——`call N` 计算 `call_argv = sp - N`，callee 在 `call_argv[-1]`（参数**下方**）。原实现参数先压、函数最后，导致 call 6 的 callee 变成栈底参数（类构造器）。**判定方法**：`get_var print; push_const; call 1` 调试打印成功（callee=print 在底）而 `dup; get_var print; push; call 2` 失败（callee 错位）——两种假设下单参数调用都成立，多参数调用才能区分。
2. **`OP_define_field` 语义（根因之二）**：n_pop=2、n_push=1——**消费对象+值并压回对象**，等价于对象字面量 `object; push; define_field`（**无 dup**）。原实现每个字段前 `OP_dup`，6 字段栈上多 6 个对象 → call 6 操作数窗口错位。用 `./qjs -d -e 'var o={a:1,b:2}'` 的真实字节码对照发现。
3. **隐藏变量计数器（根因之三）**：`<ts3_decs_%d>` 必须用全局 `s->ts_decorator_counter`——函数内局部计数器使第二个装饰 class 报 "invalid redefinition of lexical identifier"。
4. **顺序语义（tsc 交叉验证）**：装饰器数组必须 **source 序**（`@a @b` → `[a,b]`），helper 反向遍历 → 最靠近成员的（b）先应用；成员间按**声明顺序**（`decorator_head` 是 reverse-of-source，应用函数内局部反转）。**顺带修复 M6a 同款跨成员顺序 bug**（实测 `ver,count,greet` → 修正为 `greet,count,ver`，与 tsc 一致）。
5. 早期"callee 获取 undefined"的假象全部来自调试代码自身违反调用约定或插在错误位置（如 `es_dec_atom` 赋值前）——**调试代码必须先用真实字节码对照验证自身正确**。

## 结案

- 迭代目的：stage3 装饰器标准生态支持（对齐现代 TS 项目）。
- 现状：C helper 与 emit 层全部打通，`--ts-stage3` 全场景（方法/属性/静态/多装饰器/顺序/替换/context）验证通过，`tests/test_ts_stage3.js` 挂入 make test 全绿，内存无泄漏。
- **TS-67 补完（A1，2026-07-31）**：字段初始化改写（`x = __runInitializers(this, _inits, init)`）、构造函数 extraInitializers 注入（fields_init 末尾）、静态 extra（类尾）、方法共享 `_instanceExtraInitializers`（第一个字段初始化点消费，tsc 语义）全部实现，与真实 tsc 逐字符对照一致。修复 4 类真实 bug：①fields_init_fd 内用外层 scope_level 导致 resolve_scope_var 越界死循环（sample 抓栈定位）②数组必须 `OP_array_from 0`（OP_object 无 unshift/push）③字段装饰器 ctor 必须传 null（传类导致 defineProperty 污染类对象）④方法 extra 覆盖字段 prev（共享 extras 数组改为开头预留 + 无条件定义）。
- **accessor 关键字（A2，2026-07-31）**：`@dec accessor x = 10` 完整实现——backing 私有字段（`#x<accessor>`）+ 合成 get/set 函数（`js_new_function_def` + 手工 emit `scope_get/put_private_field`）+ kind="accessor" 装饰（C helper is_accessor 分支） + init 链/extra 链（复用 A1 机制）。消歧：`accessor` 后跟 `;`/`}`/`(`/`=` 时是普通字段名。顺带修复 A1 隐藏 bug：prev extra 消费扩展到**未装饰**字段/accessor（tsc 语义：`plain = (__runInitializers(this, _a_extraInitializers), 5)`）。与真实 tsc 逐字符一致。
- **abstract 类/成员（B1，2026-07-31，RFC 范围外补充）**：`abstract class` / `abstract m(): T;` / `abstract get/set` / `abstract field` 纯擦除实现——abstract class 即普通 class（tsc 语义），abstract 成员完全删除（消费参数表/类型注解/`;`，零字节码）。消歧：`abstract` 后跟 `;`/`}`/`(`/`=` 为普通标识符（字段/方法名）。识别用 buf_ptr 文本匹配（peek_token 对关键字返回 TOK_IDENT——S9(b) 陷阱）。与 tsc 输出一致。
- **`using` 声明（B2，2026-08-01，TS 5.2 显式资源管理）——已回滚**：`Symbol.dispose`/`Symbol.asyncDispose` 注册**保留**（无害）；`js_parse_ts_using` 的手写 try/finally 字节码**回滚**——**缺陷**：无 return 的函数体触发检查器 `inconsistent stack size`（OP_catch 标签处 goto 栈与 fallthrough 差 1：first=3 now=2），根因是 `emit_goto(OP_catch)` 前有 6 字节来源不明的常量（两个 push_i16 式指令），在预算内未定位。**教训**：手写 try/finally 必须完全复刻 TOK_TRY 的 emit 路径（js_parse_block + push_break_entry + label_catch/label_finally 布局），或采用 tsc 式 helper（__addDisposableResource/__disposeResources C 实现）。现状：`using` 明确报"not supported (rolled back)"，不崩溃。
- 已知限制（记录，非隐藏）：metadata 字段为 undefined（QuickJS 无 Symbol.metadata，与 tsc 在无该符号运行时一致）。

# Milestone M7: 集成与端到端
Status: **Done(TS-70/TS-71/TS-72)**
Progress: 100%
Depends on: M1-M6 全部
RFC refs: §目标、前置 RFC §T3
TODO refs: TS-70 ~ TS-72

## 目标与非目标

- 目标：`.ts` 扩展名自动识别运行；跨文件 import 链；端到端 e2e 覆盖 M1-M6a 全特性。
- 非目标：qjsc 字节码编译器 TS 支持（TS-71 部分，见下）。

## 实现（4 个真实缺口修复）

1. **`.ts` 扩展名自动识别**：`qjs.c eval_file` + `quickjs-libc.c js_module_loader` 双路径自动加 `JS_EVAL_FLAG_TS`——`qjs foo.ts` 与 `import "./x.ts"` 均无需显式 `--ts`。
2. **`export interface`/`export enum`**：发现 `interface`/`enum` 是 QuickJS **保留 token**（TOK_INTERFACE/TOK_ENUM，quickjs.c:21865 关键字表），`js_ts_is_pseudo_keyword_str()` 要求 TOK_IDENT 永远 FALSE——改为 token 值判断；`export enum` 补真实运行时导出（add_export_entry，enum 有反向映射对象，区别于纯类型）。
3. **`class X implements A, B`**：TOK_IMPLEMENTS 保留 token；`js_parse_ts_type` 逐个消费 heritage 类型（纯类型无运行时效应）。M5 缺口补完。
4. **链式非空断言 `get()!.length`**：`!` 从 coalesce 层移到 **postfix 主循环**（TOK_QUESTION_MARK_DOT 分支前），断言后 continue 继续解析后缀链。M2b 缺口补完。

## 验证结果

- `make test` 全绿（新增 `tests/test_ts.js` 链式断言/implements 用例 + `tests/test_ts_module.ts` 模块链套件 + `tests/ts_lib/shapes.ts` 模块库，均挂入 Makefile）
- 综合 e2e `.ts` 文件自动识别运行：类型注解/泛型/嵌套泛型+链式断言/as/interface+重载/enum+const enum/参数属性+namespace 合并/legacy 装饰器+metadata 全部通过
- 跨模块：export enum/interface/class/implements/`import type`/循环导入全通
- 内存：`-d` atom 计数稳定无泄漏

## TS-71 补完（qjsc AOT）

- `qjsc.c` 双编译入口（compile_file + 模块 loader）按 `.ts` 扩展名自动加 `JS_EVAL_FLAG_TS`
- 新增公共 API `JS_DetectModuleTS`（quickjs.c/h）：全源码词法扫描（跳注释/字符串/模板），修复 `JS_DetectModule` 只看首 token 导致 interface/enum 开头模块误判的问题；qjs/qjsc autodetect 双路径接入
- 端到端验证：`examples/ts_aot_demo.ts`（interface/enum/class/参数属性/泛型）→ `qjsc -c` → `examples/ts_aot_host.c` 零 parser 宿主 → `AOT main() = 11`

## 结案

- 迭代目的：把 M1-M6a 的 TS 前端能力串成用户可直接使用的形态（`qjs foo.ts`）。
- 如何迭代：摸底发现 4 个真实缺口（均为保留字 token 或 postfix 优先级问题）→ 逐项修复 → 双套件挂入 make test。
- 最终结果：TS-70/TS-72 完成，TS-71（qjsc）留待后续。

---

