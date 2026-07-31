# RFC: QuickJS parse 与运行分离的可行性与边界

Status: **定稿 + 落地回执**(经两个不同模型子 agent 独立评审 + 第四轮终局 review + 第五轮追加 TS 融合路线评估;2026-08-01 由 `rfc-typescript-frontend` 全量实现验证)
Domain: 代码工程(→ `.otto/skills/rfc/references/code-engineering.md`)
档位: 完整档(评估型,无代码改动 → **后续落地型 RFC 已完成**,见落地回执)
Last updated: 2026-08-01
一手材料基线: 本仓库 QuickJS,VERSION `2026-06-04`,HEAD `04be246`

## 执行摘要

- **一句话背景**:回答"QuickJS 能否分离 parse 与运行",并把结论固化为可追溯的权威设计记忆。
- **核心结论**:**能,且是原生一等能力**——`JS_EVAL_FLAG_COMPILE_ONLY` + `JS_EvalFunction` 构成同进程分离,`JS_WriteObject`/`JS_ReadObject` 构成跨进程 AOT,`qjsc` 已是产品化落地。三种形态见 §D2。
- **关键决策**:D1 结论成立;D2 分三种分离形态;**D3 经评审修正**——"运行期零 parser"须限定为"零 **JS 语法** parser",词法基础设施被 `JSON.parse` 钉住,无法整体消除。
- **三条硬约束**:R1 字节码是信任边界(官方文档明文警告);R2 版本刚性,不可作分发格式;R3 剔 parser 的代价是失去所有 JS 源码 parse 入口((a) 语言层 5 类 + (b) 宿主/C API 4 类,同源失效),仅剩 JSON/RegExp 两个独立子系统((c))。
- **放弃方案**:不在本仓库落地实现(用户决策 A),不做性能基准,不把字节码当分发格式。
- **评审修订点(共 7 项)**:①D3 过强断言已限定范围(两个模型独立同时判定,为本轮最重要修正);②R3 拆为"JS 语言层入口"与"宿主/API 层入口"两张表;③R2 澄清 atom 双轨机制(用户 atom 重新 intern,预定义 atom 依赖固定枚举);④R1 措辞从"等价于内存破坏原语"改为分层表述并补官方文档一手证据;⑤R4 拆分 `STRIP_SOURCE` 与 `STRIP_DEBUG` 的不同后果;⑥补 realm 绑定与 ROM_DATA 两个遗漏约束(R7/R8);⑦Milestone 验证隔离表述修正为"共用源码基线、验证角色不同"。
- **后续路线(第五轮追加,见 §后续路线)**:确定的推进顺序是**先分离(本 RFC)→ 再在 JS parser 上融合 TS 解析**。融合技术成立(路径 P2:`ts_mode` 开关 + 类型语法消费函数,不碰字节码生成);但**类型驱动的字节码优化收益仅 3-8%**,因 QuickJS 已自带 `OP_add_loc` 三路特化(`quickjs.c:19743`)与 peephole 模式合并(`quickjs.c:35400-35465`),占掉了大部分优化空间。体积收益的真正来源是 F3 零 parser AOT(-10%),与 TS 无关。**最优组合:TS parser 放编译期 AOT + 运行期零 parser。**
- **风险**:结论绑定基线版本,上游 bump `BC_VERSION` 后需复核。
- **推进方案预览**:M1 证据接地(Done)→ M2 复核与独立评审(Done)→ M3 定稿与交付(Done)→ M4 TS 融合路线评估(Done,本轮追加);落地实现须另立 RFC。
- **落地回执(2026-08-01)**:后续落地型 RFC(`docs/rfc-typescript-frontend/`)已全量完成,本 RFC 的 T1-T4 路线结论全部兑现:
  - **T1/P2(TS 解析在 JS parser 上融合)已实现**:`ts_mode` 开关 + 类型语法消费函数族,零新增 opcode、零 BC_VERSION 变更(S3 规则),与 RFC §D1 预测完全一致;
  - **T3 最优组合(TS parser 放编译期 AOT + 运行期零 parser)已端到端验证**:`examples/ts_aot_demo.ts` → `qjsc -c`(compile-only)→ C 字节码 → 零-parser 宿主(`JS_ReadObject` + `JS_EvalFunction`,无 eval intrinsic),`AOT main() = 11`——即 F2 形态的 TS 版落地;
  - **T2(类型驱动字节码优化 3-8%,不建议)被验证为正确决策**:TS 前端全程未以性能为立项理由,未引入特化 opcode;
  - **F1(同进程 compile-then-run)**:`JS_EVAL_FLAG_COMPILE_ONLY` 路径被 `qjsc.c` TS 支持直接复用;
  - **D3 边界(词法基础设施被 JSON.parse 钉住)被实践验证**:TS 前端只新增类型消费函数,未触碰词法基础设施。

## 背景与问题

诉求源自一个终局/全局视角的技术判断题:**QuickJS 能否把「parse(编译)」与「运行(执行)」分离?** 只考虑技术可行性与边界,不考虑成本。

评估过程已完成两轮:第一轮给出结论,第二轮做对抗式自我 review 并**推翻了自己的两处结论**。本 RFC 的作用是把经过修正、且逐条挂上 `file:line` 证据的结论固化为权威定稿,避免这些认知只活在会话上下文里(→ 核心·活文档 / 防漂移)。

第二轮 review 修正出的实质错误(这是本 RFC 存在的主要价值):

1. **把 QuickJS 最好的设计说成了缺陷**。第一轮称"parser 代码段仍要链接进运行时二进制,只是调用被推迟",方向是反的——`eval` 是通过函数指针间接层做成**可选**的,不注册即不可达。
2. **漏掉了整个安全维度**。第一轮完全没提 `JS_ReadObject` 没有 bytecode verifier,而这是分离架构中最重要的设计约束。
3. **parser 入口列举不全**。只提了 `direct eval`,漏掉 `Function` 及其三个变体构造器。

## 目标与非目标

**目标**

- 给出「能否分离」的确定性结论,并明确**三种分离形态**及各自的技术边界。
- 把三条硬约束(信任边界 / 版本刚性 / 语义取舍)固化为重要事项规则,每条挂真实 `file:line` 证据。
- 记录第二轮 review 推翻的错误结论及其**根因**,防止后续会话重犯(→ 核心·重复漂移/犯错的升级)。

**非目标**

- **不修改 QuickJS 任何源码**(`quickjs.c` / `quickjs.h` / `Makefile` 等)。本仓库是上游镜像,本 RFC 为纯评估型产出,零 break 面。
- 不实现零-parser 宿主、不实现字节码签名校验。二者已作为放弃方案记录,可另立 RFC。
- 不做性能基准(启动耗时、内存占用的量化对比不在本期范围)。
- 不评估其他 JS 引擎(V8 / JSC / Hermes)的对应机制。

## 关键决策与理由

### D1. 结论:能分离,且分离是 QuickJS 的原生一等能力

不是「可以改造成能分离」,而是**本来就是三段式设计**,并已有产品化落地(`qjsc`)。

```
源码 ──[Parser+编译器]──> JSFunctionBytecode ──[解释器]──> 结果
        js_parse_program      (JS_TAG_FUNCTION_BYTECODE)    JS_EvalFunction
        js_create_function
        resolve_variables
        resolve_labels
```

证据:
- `quickjs.h:342` — `JS_EVAL_FLAG_COMPILE_ONLY (1 << 5)`,注释明示产物可交给 `JS_EvalFunction` 执行。
- `quickjs.c:37290` — `__JS_EvalInternal` 内的分叉点:`if (flags & JS_EVAL_FLAG_COMPILE_ONLY) ret_val = fun_obj; else ret_val = JS_EvalFunctionInternal(...)`。
- `quickjs.c:37182` — `JS_EvalFunction` 是独立的执行入口。
- `qjsc.c:346` / `qjsc.c:193` — 官方工具用 `COMPILE_ONLY` 编译后 `JS_WriteObject` 落盘,即 AOT parse。

### D2. 三种分离形态(按分离粒度分级)

| 形态 | 机制 | 技术状态 |
| --- | --- | --- |
| F1 同进程 compile-then-run | `JS_Eval(COMPILE_ONLY)` → 持有字节码 → `JS_EvalFunction` | 直接可用,零改造 |
| F2 跨进程/持久化 AOT | 加 `JS_WriteObject`/`JS_ReadObject`(`JS_*_OBJ_BYTECODE`) | 直接可用,即 `qjsc` 路线 |
| F3 运行期零 **JS 语法** parser | `JS_NewContextRaw` + 选择性 intrinsics(不注册 Eval)+ LTO | 官方支持,但有语义代价(→ R3)且消除范围有限(→ D3) |

### D3. F3 的机制是函数指针间接层;但"零 parser"须限定为"零 JS 语法 parser"

**机制部分(修正第一轮的反向错误)**:`quickjs.c:37303` 的注释直接写明设计意图 **"the indirection is needed to make 'eval' optional"**。

- `quickjs.c:555` — `eval_internal` 是 `JSContext` 上的函数指针成员,注释为 "if NULL, eval is not supported"。
- `quickjs.c:56174-56178` — `JS_AddIntrinsicEval` 函数体只有一行:`ctx->eval_internal = __JS_EvalInternal;`。
- `quickjs.c:37312` — 未注册时 `if (unlikely(!ctx->eval_internal)) return JS_ThrowTypeError(ctx, "eval is not supported");`。
- `quickjs.h:399-400` — `JS_NewContextRaw` / `JS_AddIntrinsicBaseObjects` 是公开 API,可自行组装 intrinsics。
- `qjsc.c:798` — 生成的宿主用 `JS_NewContextRaw`;`qjsc.c:69` — `feature_list` 中 `{ "eval", "Eval" }` 是可关闭 feature。
- 官方文档 `doc/quickjs.texi:853-856` 佐证此设计意图:"the compiler can be removed from the executable if no `eval` is required"。

**边界部分(第三轮经两个独立评审同时修正的过强断言)**:第二轮曾断言"parser 真正不可达,链接器/LTO 可整体消除"。这是**过强的**,须按子系统区分:

| 子系统 | 是否随 Eval 关闭而消除 | 证据 |
| --- | --- | --- |
| JS 语法 parser 主体(`js_parse_program` 及其递归下降子树) | ✅ 可消除。唯一调用点是 `__JS_EvalInternal` | `quickjs.c:37268` 为 `js_parse_program` 唯一引用;`__JS_EvalInternal` 仅被 `quickjs.c:56176` 引用 |
| 词法/`JSParseState` 基础设施(`js_parse_init`、`free_token`、`js_parse_error`) | ❌ **无法消除**,被 `JSON.parse` 复用 | `JS_ParseJSON3` 于 `quickjs.c:49676` 调 `js_parse_init`(`quickjs.c:37130`)、`49692` 调 `free_token`、`49656`/`49658`/`49684` 调 `js_parse_error`(共 129 处调用,JSON 占 3 处) |
| JSON parser(`json_next_token`/`json_parse_value`) | ❌ 独立维度,由 `JS_AddIntrinsicJSON` 控制 | `quickjs.c:23477`、`49484`、`49814` |
| RegExp 编译器(`lre_compile`) | ❌ 独立维度,由 `ctx->compile_regexp` 控制,不牵连 JS parser | `quickjs.c:47630`、`49261-49270` |
| 字节码序列化器(BCReader/BCWriter) | ❌ F2/F3 恰恰需要保留 | `quickjs.c:38744`、`39367` |

**精确表述**:不注册 Eval intrinsic 时,**JS 语法 parser 主体**真正不可达,在 `JS_NewContextRaw` + 关闭 eval feature + LTO/`-ffunction-sections` 的前提下可被消除;但**词法基础设施只要保留 JSON intrinsic 就无法消除**。故 F3 应称"运行期零 **JS 语法** parser",而非"零 parser"。

### D4. 单元粒度与评估口径

按代码工程领域约定,单元 = 编译单元/模块边界;本 RFC 的分析单元是 `quickjs.c` 内的四个子系统:parser/编译器、字节码序列化器(BCReader/BCWriter)、解释器、intrinsics 注册层。结论只依据**官方源码实际行为**,不依据文档或记忆(→ 领域文件 §1)。

## 重要事项规则(进里程碑前必读)

> 这些是不可违背的约束。R1–R3 是本 RFC 的核心产出;R4–R6 是流程与防漂移规则。

- **R1 · 字节码是信任边界,不是数据格式(最高优先级)**。分层表述:
  - **官方明文警告(一手证据)**:`doc/quickjs.texi:858-861` — "the bytecode format is linked to a given QuickJS version. Moreover, **no security check is done before its execution**. Hence the bytecode should not be loaded from untrusted sources. That's why there is no option to output the bytecode to a binary file in `qjsc`."(这解释了为何 `qjsc` 故意不提供输出二进制字节码文件的选项。)
  - **有什么校验**:结构级/边界级——缓冲区越界(`quickjs.c:38417`/`38425`)、atom 索引越界(`quickjs.c:38538-38541`)、对象引用越界(`quickjs.c:39406-39408`)、`function_size > INT32_MAX`(`quickjs.c:38808`)。
  - **没有什么校验**:语义级/指令级。`stack_size`/`var_count`/`arg_count`/`var_ref_count` 经 `bc_get_leb128_u16` 原样读入即被信任(`quickjs.c:38780-38788`);opcode 合法性与跳转目标范围完全不校验(`quickjs.c:38638-38669` 的 `default: break`);真正的验证器 `compute_stack_size`(`quickjs.c:35753`)**只在编译期**由 `js_create_function` 调用(`quickjs.c:36118`),**读路径永不调用**。
  - **结论**:不可信字节码是内存安全边界外的输入,官方明确不做校验、不应加载。F2/F3 必须保证来源在信任域内,或外加签名/完整性校验 + 版本 pinning,必要时进程隔离。仓库自带 `fuzz/fuzz_bytecode.c` 佐证这是已知攻击面。
- **R2 · 版本刚性,字节码不可作分发格式**。`quickjs.c:37505` 定义 `BC_VERSION 5`;`quickjs.c:39434-39437` 读取时**严格相等**校验,不等即抛 `"invalid version (%d expected=%d)"`,**无任何向后兼容窗口**。
  - **atom 是双轨机制**(第三轮澄清):**用户自定义 atom** 随字节码写出字符串,读回时经 `JS_ReadString` + `JS_NewAtomStr` **重新 intern**(`quickjs.c:39450-39457`),并对字节码中的 atom 操作数做 fixup(`quickjs.c:38650-38659`)——这部分**是可移植的**;但 `first_atom = JS_ATOM_END`(`quickjs.c:39496`),**预定义 atom 不序列化,靠固定枚举下标直接引用**(`bc_idx_to_atom` 中 `idx < first_atom` 时直接 `JS_DupAtom(ctx, idx)`,`quickjs.c:38534-38535`)。
  - **结论**:字节码绑定同一 bytecode 格式版本、opcode 编码、结构体语义与**预定义 atom 枚举布局**;只能作为与特定构建同生共死的内部缓存,不能作分发格式。
- **R3 · 剔除 parser 的语义代价大于"失去 eval"**。须区分两个层次(第三/四轮拆分):
  - **(a) JS 语言层动态代码生成入口 = 5 类**,全部经由同一 `eval_internal` 间接层,关闭 Eval 后**干净地降级为 `TypeError`**(不崩溃):`eval`(`js_global_eval` `quickjs.c:39883`,注册于 `quickjs.c:55011`)、以及 `js_function_constructor`(`quickjs.c:41055`,内部走 `JS_EvalObject(... JS_EVAL_TYPE_INDIRECT ...)` 于 `quickjs.c:41094`)所服务的 `Function`(`quickjs.c:56544`)、`AsyncFunction`(`quickjs.c:54666`)、`GeneratorFunction`(`quickjs.c:56699`)、`AsyncGeneratorFunction`(`quickjs.c:54702`)。直接 eval 的字节码指令 `OP_eval`/`OP_apply_eval`(`quickjs.c:18363`/`18392`)最终亦走此间接层。
  - **(b) 受 `eval_internal` 约束的宿主/C API 入口(关闭 Eval 后同样降级为 TypeError,与 (a) 同源)**:`JS_Eval`/`JS_EvalThis`(`quickjs.c:37343`/`37357`,内部 `quickjs.c:37349` → `JS_EvalInternal` → `37312` 检查 `eval_internal`)、`std.evalScript`(`quickjs-libc.c:915` 调 `JS_Eval`)、`JS_LoadModule`/module loader/动态 `import()`/Worker(宿主 loader `quickjs-libc.c:722` 用 `JS_Eval(COMPILE_ONLY)` 做 parse;`JS_LoadModuleInternal` `quickjs.c:30973` 调 `JS_EvalFunction` 执行,但 parse 经 loader 回调走 `JS_Eval` → `eval_internal`)。**这些入口与 (a) 共用同一间接层,关 Eval 即一并失效**——它们不是独立的沙箱绕过面。
  - **(c) 真正不受 `eval_internal` 约束的 parse 入口(关 Eval 后仍可用,是沙箱的真正独立绕过面)**:`JS_ParseJSON*`(`quickjs.c:49702`,独立调 `js_parse_init` `quickjs.c:49676`,不经 `eval_internal`)、RegExp 编译器(`lre_compile` `quickjs.c:47630`,由 `ctx->compile_regexp` 独立控制)。**注意:这两者保留的是各自的词法/编译设施,不是 JS 语法 parser**(→ D3 子系统消除表);它们的"可用"不意味着能 parse JS 源码。
  - **结论**:关闭 Eval intrinsic = 放弃所有 JS 源码 parse 能力((a)+(b) 全部入口),仅保留 JSON parse 与 RegExp 编译两个独立子系统((c))。沙箱化的真正含义是"封死 JS 源码 parse"——这在关 Eval 时即达成,无需额外封堵 (b)(因为 (b) 同源失效);但若目标还包含"连 JSON/RegExp 也不许",则需分别关 `JS_AddIntrinsicJSON` / `JS_AddIntrinsicRegExpCompiler`。
- **R4 · strip 决策在 parse 侧,后果在运行侧(两档需分开)**。`JS_SetStripInfo`(`quickjs.c:2253`)与 `JS_STRIP_SOURCE`/`JS_STRIP_DEBUG`(`quickjs.h:930-931`)的决策点在 **parse 侧**(`quickjs.c:32087-32088` 写入 `fd->strip_debug`/`fd->strip_source`,是两个独立字段),后果落在**运行侧**。两档后果不同(第三轮拆分):
  - `qjsc` **默认** `JS_STRIP_SOURCE`(`qjsc.c:597`):剥离源码文本,影响 `Function.prototype.toString`。
  - `-s` 才升级为 `JS_STRIP_DEBUG`(`qjsc.c:713`):进一步剥离全部 debug 信息,才影响错误栈行号与调试能力。
- **R7 · 字节码对象绑定 realm/context**。`JS_ReadFunctionTag` 结尾 `b->realm = JS_DupContext(ctx)`(`quickjs.c:38939`),与编译侧 `js_create_function`(`quickjs.c:36261`)一致。含义:读回的 `JSFunctionBytecode` 实例绑定读入它的 context,**不可跨 context 共享同一对象实例**;正确做法是每个 context 各自 `JS_ReadObject`(该 API 本就吃 `ctx` 参数,天然规避)。多 Runtime/Worker 场景需注意。
- **R8 · `JS_READ_OBJ_ROM_DATA` 零拷贝有双重前置条件**。该模式(`quickjs.c:39492`)直接复用输入缓冲区作字节码(`quickjs.c:38623-38628`),要求:① 缓冲区**终生驻留**(不可释放);② atom 索引必须原位对齐,否则静默退化——`quickjs.c:39458-39459` 中 `atom != i + first_atom` 时自动关闭 rom 模式。嵌入式 F2 部署的隐藏约束。
- **R5 · 断言必须挂 `file:line`,禁止凭记忆**。本 RFC 每条技术结论必须可追溯到本仓库源码位置。第二轮 review 推翻两条结论的根因就是**第一轮凭印象叙述而未核对 `JS_AddIntrinsicEval` 函数体**。凡写"无法/不支持/不存在",必须先用 2+ 同义词搜索确证(→ 核心·断言必须有证据)。
- **R6 · 零代码改动禁区**。本 RFC 及其里程碑**不得修改** `quickjs.c`、`quickjs.h`、`Makefile` 或任何上游源码文件;产出只允许落在 `docs/rfc-parse-run-separation/` 下。要落地实现须另立 RFC 并重新过 grill 确认。
- **R9 · 断言强度必须经"现状穷举"校准(重复问题,已第三次出现)**。本 RFC 五轮演进中同类错误犯了三次:①第一轮说"parser 无法从运行期剔除"(过弱)→ 第二轮说"可整体消除"(过强);②第三轮 R3(b) 把 `JS_Eval` 等归为"不受 Eval 约束"(未追调用链);③第五轮 T2 初稿断言"新增特化 opcode 可拿 15-25%"(未核对 QuickJS **已有** `OP_add_loc` 三路特化与 peephole 合并)。**规则**:
  - 凡涉及"可/不可""能/不能"的能力边界断言,必须按子系统/条件分解成限定条件表,不给单句结论;修正过强/过弱断言时显式检查是否越到另一端。
  - **凡估算"新增 X 能带来多少收益",必须先穷举"现状已实现多少 X"**——收益 = 理论上限 − 现状已覆盖。跳过这一步必然高估。
  - 归类"受/不受某开关约束"时,必须追踪到共同汇聚点(如 `eval_internal`),不以 API 名字或所在文件为依据。
  - 触发场景:代码可消除性、API 可用性、格式兼容性、**性能优化收益估算**。

## 目标架构:分离点与信任边界

```
              ┌─────────── 编译期(parse 侧) ───────────┐
  源码 ───►  Parser ──► 编译器 ──► JSFunctionBytecode
              │  strip 决策在此(R4)                     │
              └────────────────┬───────────────────────┘
                               │  JS_WriteObject
                          ═════╪═════  ◄── 信任边界(R1:无 verifier)
                               │  JS_ReadObject + BC_VERSION 严格校验(R2)
              ┌────────────────┴─── 运行期(execute 侧) ──┐
              │  解释器 ──► 结果                          │
              │  eval_internal == NULL ⇒ parser 不可达(D3) │
              │  代价:eval + 4 个构造器失效(R3)            │
              └───────────────────────────────────────────┘
```

模块场景下分离是**三段**而非两段:parse 只产出模块定义,运行前还需 `JS_ResolveModule`(`quickjs.h:1002`)解析依赖、`js_link_module`(`quickjs.c:37168`)链接,再由 `js_evaluate_module`(`quickjs.c:31535` / `37170`)执行。**依赖解析天然发生在运行侧。**

技术路线图见 `diagrams/roadmap.svg`。

## 后续路线:在分离基础上融合 TypeScript 解析(第五轮追加)

> **路线定位**:先完成 parse/run 分离(本 RFC 主体,已定稿),再在现有 JS parser 上**融合**支持 TS 解析。本节记录该路线的技术评估与量化收益,作为后续独立 RFC 的输入。本节**不改变本 RFC 的零代码改动约束(R6)**——落地须另立 RFC。

### T1. TS 解析在 JS parser 上的融合方式(技术成立)

QuickJS parser 是**手写递归下降**,不依赖语法表生成,这使融合成为可能:

- `JSParseState`(`quickjs.c:22134`)—— 状态机核心,字段少、耦合低,可直接新增 `BOOL ts_mode`。
- `JSToken`(`quickjs.c:22111`)+ `TOK_*` 枚举(`quickjs.c:21786` 起)—— token 层可扩展。
- 递归下降函数族约 101 个 `js_parse_*`,总计约 8248 行(占 `quickjs.c` 61424 行的 **13%**)。

**TS 相对 JS 的语法增量是纯增量**:类型注解 `: T`、泛型 `<T>`、`interface`/`type` 声明、`enum`、装饰器、`namespace`、`as`/`!` 断言。它们**不改变已有 JS 表达式/语句的递归下降路径**,只需在关键位置插入"消费类型语法但不生成字节码"的分支。

三条融合路径,按侵入性递增:

| 路径 | 做法 | parser 改动 | 适用 |
| --- | --- | --- | --- |
| P1 前置擦除 | 外部 transpile(tsc/swc/esbuild)后喂给 `js_parse_program` | 零改动 | 不符合"融合"诉求 |
| **P2 parser 内融合(推荐)** | 加 `ts_mode` 开关 + 新增 `js_parse_ts_type` 系列函数消费类型语法;在 `js_parse_assign_expr`/`js_parse_function_decl2`/`js_parse_class` 等处插入分支 | 中等,集中在 parse 层,**不碰字节码生成与解释器** | **本路线选定** |
| P3 保留类型信息 | 在 `JSFunctionDef`(`quickjs.c:21996`)新增类型注解表,供后续编译优化消费 | 较重,为 T2 铺垫 | 仅在需要类型驱动优化时 |

**结论:P2 技术上完全成立**,与 tsc 的 `parseExpression`/`parseClassDeclaration` 结构同构,无阻断性障碍,只有工作量。

### T2. 类型驱动的字节码优化:收益远低于直觉(实测修正)

**这是本节最重要的结论,推翻了一轮过强估算。**

#### 实测基线(本机 clang -O2)

| 基准 | 结果 |
| --- | --- |
| `compute`(10000 元素 × 5000 轮,含 typeof 分支) | 1280 ms |
| `pointDistance`(500000 次,属性访问+算术) | 24 ms |
| `pureArith`(10000 迭代 × 5000 轮,纯整数算术) | 576 ms |

#### 字节码指令实测分布(microbench.js dump)

```
get_loc   966 (12.5%)   drop      702 (9.1%)    label     678 (8.8%)
push_i    516 (6.7%)    dup       481 (6.2%)    get_var   264 (3.4%)
get_arg   258 (3.3%)    if_false  206 (2.7%)    add       151 (2.0%)
get_field 142 (1.8%)    mul        82 (1.1%)    typeof     15 (0.2%)
strict_eq   7 (0.09%)
```

**关键事实:`typeof` + `strict_eq` 合计仅 0.3%**——纯静态类型信息能直接消除的指令占比极低。

#### 决定性约束:QuickJS 已自带类型特化与 peephole 合并

这是推翻"新增特化 opcode 可拿 15-25%"的核心证据:

1. **已存在特化 opcode**:`OP_add_loc`/`OP_inc_loc`/`OP_dec_loc`(`quickjs-opcode.h`)。
2. **`OP_add_loc` 已做三路类型特化**(`quickjs.c:19743`):int/int 快路径、float/float 路径、string 路径,且**合并了"取局部变量+加法+写回"三个操作**。
3. **peephole 优化器已系统性做模式合并**(`resolve_labels`,`quickjs.c:35400-35465`):
   - `get_loc(n) inc dup put_loc(n) drop` → `OP_inc_loc`(`quickjs.c:35411`)
   - `get_loc(n) push_i32(x) add dup put_loc(n) drop` → `push_i32 OP_add_loc`(`quickjs.c:35444`)
   - `get_loc(n) get_loc(x) add dup put_loc(n) drop` → `get_loc(x) OP_add_loc`(`quickjs.c:35458`)
4. **`OP_add` 热路径仅 3 条指令**(`quickjs.c:19696`):`JS_VALUE_IS_BOTH_INT` 位比较 + 加法 + 溢出检查。
5. **TS `number` 不区分 int/float64**——即使有 TS 类型,运行时仍需 int vs float64 判断,**省不掉**。

**即最有价值的类型特化,QuickJS 已经做完了。** TS 静态类型的增量空间被压缩到极小。

#### 属性访问:唯一的潜在金矿,但被类型擦除堵死

`OP_get_field` 经 `GET_FIELD_INLINE`(`quickjs.c:19107`)→ `find_own_property`(`quickjs.c:6135`),每次访问需:哈希计算 + 哈希表查 + 链表遍历 + atom 比较,约 5-6 条指令。理论上若能编译期确定属性偏移,可降到 1-2 条。

**但被三重约束堵死**:
- QuickJS 的 `JSShape` 是**运行时动态**的,偏移取决于对象构造顺序,编译期不可知。
- TS `interface` **类型擦除后运行时不存在**,无法建立"TS 类型 → 运行时 shape"映射。
- 要做偏移直访必须引入 **inline cache / shape 反馈**机制——那已不是静态类型信息能做的事,是引擎级基础设施。

#### 量化收益表(修正后)

| 优化项 | 前置条件 | 可行收益 |
| --- | --- | --- |
| 消除 typeof 分支 | 纯静态类型 | **0.3%** |
| 消除参数数量检查 | 签名已知 | **~0.5%** |
| 不可达分支消除 | 类型收窄 | **0-3%**(程序相关) |
| 算术特化 | —— | **≈0%**(`OP_add_loc` 已做,TS 不区分 int/float) |
| 属性偏移直访 | 需 IC/shape 反馈 | **≈0%**(纯静态类型不可得) |
| **P2 纯 TS 解析 + 现有 opcode 合计** | | **3-8%(典型 3-5%)** |
| 新增特化 opcode + IC(引擎级改造) | 改解释器核心 + IC | **8-15%**(非 15-25%,因已有特化占掉大部分空间) |

#### 体积影响(实测)

| 产物 | 实测 |
| --- | --- |
| `qjs`(含符号) | 1.2 MB |
| `qjs` strip 后 | 966 KB |
| `quickjs.o` text 段 | 704 KB |
| parser+compiler 占比 | ~8248/61424 行 ≈ **13%** |

| 场景 | 体积影响 |
| --- | --- |
| P2:TS parser 进运行期 | **+5-8% text 段(+35~55KB)** |
| F3 + TS 离线 AOT(TS parser 只在编译期) | **-10~13% text 段(-70~90KB)** |
| 类型驱动优化对字节码体积 | **<1%**(可消除指令占比过低) |

### T3. 路线结论与决策建议

- **TS 解析融合(P2):技术成立,推荐**。价值在于"QuickJS 能直接跑 `.ts`",省掉外部 transpile 步骤;**不要以性能优化为立项理由**。
- **类型驱动字节码优化:不建议作为主要目标**。纯静态 TS 类型的收益 3-8%,且 QuickJS 已自带的特化与 peephole 占掉了大部分优化空间。
- **体积收益的真正来源是 F3 零 parser AOT(-10%),与 TS 无关**——TS 只是让 AOT 更有意义(离线编译 TS,运行期零 parser)。
- **最优组合**:TS parser 放**编译期**(AOT,配合 F3),运行期只保留字节码 reader + 解释器。这同时拿到"能跑 TS"与"运行期体积 -10%",避开 P2 的 +5-8% 体积代价。

### T4. 本节的方法论教训(第五轮,R9 第三次触发)

本节初稿曾断言"新增特化 opcode + IC 可拿 15-25%",经核实为**过强**——因为未先核对 QuickJS 是否**已有**特化机制。实测发现 `OP_add_loc` 三路特化(`quickjs.c:19743`)与 peephole 模式合并(`quickjs.c:35400-35465`)已覆盖最有价值的优化,增量空间被大幅压缩。

**这是 R9 规则第三次被触发**(前两次:D3 过弱→过强、R3(b) 入口分类)。根因一致:**估算"新增 X 能带来多少收益"时,未先穷举"现状已经做了多少 X"**。已将此模式补入 R9 的触发场景。

## 放弃方案

- **在本仓库实现零-parser 宿主 + 字节码签名校验的最小闭环**:放弃(用户决策 A)。理由:本仓库是上游镜像,引入本地补丁需长期维护;本期只需定论存档。可另立落地型 RFC。
- **把字节码当跨版本分发格式**:技术上不可行,`BC_VERSION` 严格相等校验(R2)直接否决。
- **依赖 `JS_ReadObject` 自身做安全校验**:不可行,无 verifier(R1)。需外层签名机制。
- **性能量化基准**:本期放弃(非目标),避免评估型 RFC 膨胀成 benchmark 工程。

## 风险与验证策略

| 风险 | 缓解 |
| --- | --- |
| 结论凭记忆而非源码,重犯第一轮的错 | R5 强制 `file:line`;M2 逐条复核每个引用位置真实存在且语义相符 **(已执行:两个不同模型独立评审,核对 30+ 引用位置)** |
| 遗漏 parser 入口(已漏过一次) | M2 用多同义词交叉搜索穷举而非抽样 **(已执行:发现 (b) 类宿主入口,R3 已拆两表)** |
| **修正过头:从一个过强断言荡到另一个过强断言** | **已发生并已修正**——第二轮 D3 "parser 可整体消除" 被两个模型独立判定过强,第三轮限定为"JS 语法 parser 主体"。这是 R5 的典型失效模式,已固化为 R9 |
| **R3(b) 入口分类错误(第四轮终局 review 发现)** | **已发生并已修正**——第三轮把 `JS_Eval`/`JS_LoadModule`/`std.evalScript`/Worker 列为"不受 Eval intrinsic 约束",实际它们都经 `JS_EvalInternal` → `eval_internal`(`quickjs.c:37349`→`37312`),关 Eval 即同源失效。第四轮改为 (a) 受约束语言层 / (b) 受约束宿主层(同源) / (c) 真正独立(JSON+RegExp)。根因同 R5:未追踪 `JS_Eval` 的调用链就归类 |
| 版本漂移:上游 bump `BC_VERSION` 后结论过期 | RFC 头部记录基线 `VERSION 2026-06-04` / HEAD `04be246`,结论随基线标注 |
| 评估型 RFC 无可运行证据,流于纸面 | Example 形态定为「用户可照做的源码核对命令序列」,每条命令输出即证据(→ 领域文件 §5) |

**验证策略**:M1 产出后委派子 agent(优先不同模型)从终局/全面/系统三视角独立评审(→ 核心·子 agent 独立评审·应用点 A);M2 做证据复核并由用户按 Example 亲手核对关键 `file:line`。

**已执行的独立评审记录(M2)**:委派两个不同模型(`GPT-5.5` 与 `Claude-Opus-4.8`)对抗式独立评审,**二者独立地得出同一最重要结论:D3 为过强断言**(判定 FAIL / 需修正)。共产出 7 项修订(见执行摘要),全部已落入本 RFC。两模型均确认 R1/R2 技术方向无误、仅需措辞精化,R3 入口列举在 (a) 层准确。
