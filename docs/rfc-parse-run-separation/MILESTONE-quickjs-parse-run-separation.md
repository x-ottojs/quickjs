# Milestones: QuickJS parse 与运行分离(评估型 RFC)

Owning RFC: `docs/rfc-parse-run-separation/RFC-quickjs-parse-run-separation.md`
Last updated: 2026-07-30

推进路线:**M1 证据接地与草案** → **M2 复核与独立评审** → **M3 定稿与交付**

三个里程碑构成 DAG(M1 → M2 → M3),无循环依赖。

**验证隔离说明(经评审 F6 修正)**:三个里程碑**共用同一份源码基线作为 fixture**(本仓库 QuickJS `04be246`),这是评估型 RFC 的固有性质——无法也不应为各里程碑造不同的源码。真正隔离的是**验证角色与方法**:M1 = 主会话接地取证;M2 = 独立子 agent(不同模型)对抗式复核,不复用 M1 的搜索路径而是独立穷举;M3 = 用户亲手复现。端到端串联(用户按 Example 完整走一遍)只在 M3。

---

# Milestone M1: 证据接地与 RFC 草案
Status: Done
Progress: 100%
Depends on: none
RFC refs: §背景与问题、§D1、§D2、§D3、§R1–R6
Important rule refs: R5(断言挂 file:line)、R6(零代码改动禁区)
Context budget: 约 45k / 120k(已消耗,无需换会话)
Dependency check: pass — 一手材料为本仓库源码,基线 VERSION `2026-06-04` / HEAD `04be246`,工具链无需构建
TODO refs: T-01 ~ T-07

## 目标与非目标

- 目标:把 parse/run 分离的技术事实接地到真实源码,产出 RFC 草案与三份活文档骨架 + 技术路线图。
- 非目标:不做独立评审(M2)、不定稿(M3)、不改任何源码(R6)。

## 前置检查结果

- 领域判定:代码工程 → 已加载 `references/code-engineering.md`。
- 档位判定:复杂问题(跨子系统、有顺序依赖、结论影响架构决策)→ 完整档。
- 一手材料就绪:`quickjs.c`(2.03MB)、`quickjs.h`、`qjsc.c`、`fuzz/fuzz_bytecode.c` 均可直接读取。
- 归属检查:本仓库此前无任何 RFC/TODO/Milestone 文档,无旧文档归属整理需求。

## 设计闸门引用

分析单元 = `quickjs.c` 的四个子系统:parser/编译器、BCReader/BCWriter、解释器、intrinsics 注册层(→ RFC §D4)。各单元的职责边界与接口契约已在 RFC §目标架构以分离点与信任边界形式表达。

## 执行线路(预计 → 实际)

| 预计 | 实际 | 说明 |
| --- | --- | --- |
| 新增 RFC 文档 | ✅ `RFC-quickjs-parse-run-separation.md` | 草案,含 3 决策 + 6 规则 |
| 新增 TODO tracker | ✅ `TODO-quickjs-parse-run-separation.md` | T-01~T-10 |
| 新增 Milestone 文档 | ✅ 本文件 | M1–M3 |
| 新增技术路线图 | ✅ `diagrams/roadmap.svg` | 遵循 `diagram-style.svg` 基准 |
| 修改上游源码 | ❌ 零改动(符合 R6) | `git status` 仅显示新增 docs/ 与 .otto/ |

无偏差。

## 验证设计

- 每条技术结论必须能用 `grep -n` 在指定 `file:line` 复现,且语义与结论一致。
- 覆盖场景:正常(分离机制存在)、边界(模块三段式、strip 决策跨阶段)、错误(未注册 eval 时抛 TypeError)、回归(第一轮两处错误结论不得复现)。

## 压缩迭代摘要

- 第一轮评估给出结论后,第二轮对抗式 review **推翻两处**:① 把 `eval` 可选性(函数指针间接层)误述为"parser 必须链接进运行时",方向反了;② 完全漏掉 `JS_ReadObject` 无 verifier 的安全维度。另修正一处不完整:parser 入口漏掉 `Function` 系四构造器。
- 根因:第一轮凭印象叙述,未核对 `JS_AddIntrinsicEval` 函数体(实际仅一行赋值)。已固化为 R5。
- 最终状态:三条硬约束(R1 信任边界 / R2 版本刚性 / R3 语义取舍)+ 两条补充(R4 strip / R6 禁区)全部挂 `file:line` 落入 RFC。

## 结案

- 迭代目的:把会话中的技术评估固化为权威 RFC,防止认知随上下文丢失。
- 迭代前问题:结论只活在对话里,且含两处已知错误结论未被系统记录。
- 如何迭代:读一手源码接地 → 提取三段式流水线与三条硬约束 → 产出四份产物(RFC/TODO/Milestone/路线图),全程零源码改动。
- 最终结果:T-01~T-07 全部 `Done`;RFC 草案就绪待评审;剩余风险 = 引用位置尚未逐条复核(T-08)、尚未独立评审(T-09)。

---

# Milestone M2: 证据复核与子 agent 独立评审
Status: Done
Progress: 100%
Depends on: M1
RFC refs: §R5、§风险与验证策略
Important rule refs: R5(断言挂 file:line)、R6(零改动)
Context budget: 约 35k / 120k(实际约 40k,含两份评审报告读取)
Dependency check: pass — M1 产物就绪
TODO refs: T-08, T-09

## 目标与非目标

- 目标:① 逐条复核 RFC 中每个 `file:line` 真实存在且语义相符;② 委派子 agent(优先不同模型)从终局/全面/系统三视角独立评审,对抗立场挑刺。
- 非目标:不扩展结论范围、不做性能基准、不改源码。

## 验证设计

- 用 2+ 同义词交叉搜索穷举 `eval_internal` 的全部赋值点与调用点,确认 parser 入口无遗漏(R3 曾漏一次)。
- 对 RFC 中每个引用位置执行定点读取,核对行号与语义。
- 评审存疑项回 RFC 修订,重大问题重新决策。

## 子 agent 独立评审结论(应用点 A)

委派**两个不同模型**并行对抗式评审,互不可见:

| 评审者 | 关注面 | 总判定 | 最重要发现 |
| --- | --- | --- | --- |
| `oxygen/GPT-5.5` | 三视角全面评审 + 30+ 引用核对 + Example 实测 | **FAIL** | D3 过强(未区分 JS/JSON/RegExp 子系统);R3 漏宿主层入口;R2 atom 表述不准;R1 措辞过强;R4 混淆两档 strip |
| `oxygen-claude/Claude-Opus-4.8` | 三条硬约束技术准确性深挖 | **R3 的 D3 过强,须修正** | 同样独立指出 D3 过强,并给出 `quickjs.c:49676 → 37130` 的 file:line 级反例;补 realm 绑定与 ROM_DATA 两个遗漏约束 |

**关键交叉验证**:两个模型在互不知情下**得出同一最重要结论**(D3 过强),且主会话独立取证同样命中(`JS_ParseJSON3` 复用 `js_parse_init`)。三方一致 ⇒ 该结论确凿。

评审同时确认:R1/R2 技术方向无误(仅需措辞精化)、R3 的 (a) 层 5 类入口列举准确、其余 30+ 引用位置语义相符(仅 1 处行号小幅偏移:注释实为 `quickjs.c:37303`)。

## 修复(共 7 项,全部已落地)

F1 D3 限定范围 + 子系统消除范围表 → F2 R3 拆 (a)/(b) 两层入口表 → F3 R2 澄清 atom 双轨机制 → F4 R1 改分层表述并补 `doc/quickjs.texi:858-861` 官方警告 → F5 R4 拆 `STRIP_SOURCE`/`STRIP_DEBUG` → F6 Milestone 验证隔离表述改为"共用源码基线、验证角色不同" → F7 TODO tracker 状态与证据强度对齐。

额外新增:R7(realm 绑定)、R8(ROM_DATA 双重前置条件)、R9(禁止修正时荡到反向极端,重复问题固化)。

## 压缩迭代摘要

- **本里程碑最大价值**:证明了独立评审机制不可省。主会话在第二轮已做过一次自我对抗 review,仍未发现 D3 过强——因为它正是自己刚"修正"出的结论,存在锚定偏差。两个外部模型在干净上下文下立即命中。
- **根因固化**:同一类"能力边界断言过度"错误两次出现(第一轮过弱、第二轮过强),按核心·重复漂移升级机制固化为 RFC 硬规则 R9。

## 结案

- 迭代目的:复核 M1 结论的技术准确性,通过独立评审闸门。
- 迭代前问题:RFC 草案含一处承重的过强断言(D3),且遗漏 realm/ROM_DATA 两个约束、R1/R2/R3/R4 措辞不够精确。
- 如何迭代:逐条定点核对 30+ 引用 → 并行委派两个不同模型对抗评审 → 三方证据交叉验证 → 7 项修订 + 新增 3 条规则。
- 最终结果:T-08/T-09 `Done`;RFC 具备定稿条件;剩余风险 = 结论绑定基线版本(已在 RFC 头部标注)。

---

# Milestone M3: 定稿与交付
Status: Done
Progress: 100%
Depends on: M2
RFC refs: 全文 + 执行摘要
Important rule refs: R5、R6
Context budget: 约 25k / 120k
Dependency check: pass — M2 评审已通过并完成修订
TODO refs: T-10

## 目标与非目标

- 目标:按评审结论修订 RFC 并转 `定稿`,补写执行摘要(一句话背景、关键决策摘要、放弃方案、评审修订点、风险、推进方案预览),写入长期记忆锚定,向用户交付可照做的核对 Example。
- 非目标:不启动任何实现型工作(落地需另立 RFC → RFC §放弃方案)。

## Example 设计(代码工程领域:可运行核对命令 + 预期结果)

用户在仓库根目录逐条执行,每条命令的输出即为对应结论的证据:

1. **验证 D1(COMPILE_ONLY 分叉点存在)**
   ```bash
   sed -n '37288,37294p' quickjs.c
   ```
   预期:看到 `if (flags & JS_EVAL_FLAG_COMPILE_ONLY) { ret_val = fun_obj; } else { ret_val = JS_EvalFunctionInternal(...) }`。

2. **验证 D3 机制侧(eval 可选的函数指针间接层——第一轮错误的修正点)**
   ```bash
   sed -n '56174,56178p' quickjs.c && grep -n "the indirection is needed" quickjs.c
   ```
   预期:`JS_AddIntrinsicEval` 函数体仅一行 `ctx->eval_internal = __JS_EvalInternal;`;并在 **`quickjs.c:37303`** 看到注释 `/* the indirection is needed to make 'eval' optional */`。

2b. **验证 D3 边界侧(第二轮过强断言的反例——本 RFC 最重要的修订点)**
   ```bash
   grep -n "js_parse_init" quickjs.c
   ```
   预期:恰好 3 处——定义在 `37130`,`37201` 是 `__JS_EvalInternal` 调用,**`49676` 是 `JS_ParseJSON3` 调用**。第三处即证明:词法基础设施被 `JSON.parse` 复用,关闭 Eval 也无法整体消除,故 F3 只能称"零 JS 语法 parser"。

3. **验证 R2(BC_VERSION 严格相等,无兼容窗口)**
   ```bash
   grep -n "define BC_VERSION" quickjs.c && sed -n '39432,39438p' quickjs.c
   ```
   预期:`#define BC_VERSION 5`;读取处 `if (v8 != BC_VERSION)` 后抛 `"invalid version"`。

4. **验证 R3(parser 入口共 5 处,不止 eval)**
   ```bash
   grep -n "js_function_constructor\|js_global_eval" quickjs.c
   ```
   预期:看到 `js_global_eval` 及 `js_function_constructor` 被 `Function` / `AsyncFunction` / `GeneratorFunction` / `AsyncGeneratorFunction` 四处引用。

5. **验证 R1(字节码无语义级 verifier,是已知攻击面)**
   ```bash
   ls fuzz/fuzz_bytecode.c && grep -n "fake_bytecode\|malformed" fuzz/fuzz_bytecode.c
   ```
   预期:文件存在,且含伪造 header 后喂给 `JS_ReadObject` 的 malformed 路径。

5b. **验证 R1 的官方一手证据(最强证据,第三轮补充)**
   ```bash
   sed -n '857,863p' doc/quickjs.texi
   ```
   预期:官方文档明文 —— "no security check is done before its execution. Hence the bytecode should not be loaded from untrusted sources. That's why there is no option to output the bytecode to a binary file in `qjsc`."

5c. **验证 R1 的"有边界校验、无语义校验"分层(编译期验证器不在读路径)**
   ```bash
   grep -n "compute_stack_size" quickjs.c
   ```
   预期:定义处 + 仅由 `js_create_function`(编译期)调用;`JS_ReadFunctionTag` / `JS_ReadObject` 读路径**不出现**该调用。

6. **验证 R6(零代码改动禁区被遵守)**
   ```bash
   git status --short
   ```
   预期:只有新增的 `docs/` 与 `.otto/`,**无任何** `quickjs.c` / `quickjs.h` / `Makefile` 修改。

## 完成阶段

待 M2 通过后执行:变更清单 → 用户跑 Example → 里程碑审核(子 agent)+ 系统 review → 修复 → 结案 → 提交。
