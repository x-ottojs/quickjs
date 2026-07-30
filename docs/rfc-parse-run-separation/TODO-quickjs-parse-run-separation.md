# TODO Tracker: QuickJS parse 与运行分离(评估型 RFC)

Owning RFC: `docs/rfc-parse-run-separation/RFC-quickjs-parse-run-separation.md`
档位: 完整档(评估型,零代码改动 → R6)
Last updated: 2026-07-30

> 本 tracker 只服务上述单一 RFC(→ 核心·RFC 文档归属方案)。只记状态与一句话摘要,迭代细节归 Milestone 文档的压缩迭代摘要。

| ID | 状态 | 完成% | 验证 | 文件/模块 | 功能介绍 | 文档引用 | 完成时设计核对 |
| -- | ---- | ----: | ---- | --------- | -------- | -------- | -------------- |
| T-01 | Done | 100 | Pass | `quickjs.c` parser/编译器/解释器 | 确认三段式流水线与 `COMPILE_ONLY` 分叉点、`JS_EvalFunction` 独立执行入口 | RFC §D1 | 分离点位置与 `quickjs.c:37290` 语义相符 |
| T-02 | Done | 100 | Pass | `quickjs.c` BCReader/BCWriter | 确认 `BC_VERSION 5` 严格相等校验与 atom 表耦合 | RFC §R2 | `quickjs.c:37505`/`39434` 已核 |
| T-03 | Done | 100 | Pass | `quickjs.c` intrinsics 注册层 | 确认 `eval_internal` 函数指针间接层机制;**消除范围经评审限定为 JS 语法 parser 主体** | RFC §D3 | `quickjs.c:555`/`56176`/`37312`/`49676` 已核;过强断言已修正 |
| T-04 | Done | 100 | Pass | `quickjs.c` + `quickjs-libc.c` 动态代码生成入口 | 穷举 parser 入口,**第四轮修正为 (a) 受约束语言层 5 类 + (b) 受约束宿主层 4 类(同源失效) + (c) 真正独立 2 类(JSON/RegExp)** | RFC §R3 | `JS_Eval` 经 `37349`→`37312` 确受 eval_internal 约束,第三轮误判已修正 |
| T-05 | Done | 100 | Pass | `doc/quickjs.texi` + `quickjs.c` 读路径 | 确认无语义级 verifier;**补官方文档明文警告为一手证据** | RFC §R1 | `quickjs.texi:858-861`、`quickjs.c:38780-38788`/`35753`/`36118` 已核 |
| T-06 | Done | 100 | Pass | `quickjs.c` strip / `qjsc.c` | 确认 strip 决策在 parse 侧、后果在运行侧;**两档后果已拆分** | RFC §R4 | `quickjs.c:32087`/`qjsc.c:597`/`713` 已核 |
| T-07 | Done | 100 | N/A | `docs/rfc-parse-run-separation/` | 产出 RFC + 技术路线图 SVG + 三份活文档 | RFC 全文 | 图示遵循 `diagram-style.svg` 基准 |
| T-08 | Done | 100 | Pass | 全部 RFC 引用位置 | 逐条复核 30+ 个 `file:line` 真实存在且语义相符;多同义词交叉搜索防漏 | RFC §R5、风险表 | 仅 1 处小幅行号偏移(注释实为 `37303`),已修正 |
| T-09 | Done | 100 | Pass | RFC 草案 | 委派 2 个不同模型(GPT-5.5 / Claude-Opus-4.8)对抗式独立评审 | 核心·应用点 A | 二者独立同判 D3 过强 → FAIL;共 7 项修订 |
| T-10 | Done | 100 | Pass | RFC 定稿 | 按评审结论完成 7 项修订、补 R7/R8/R9、写执行摘要、转定稿 | RFC 头部执行摘要 | 三份文档状态一致 |

## 状态说明

- T-01 ~ T-07 的证据来自源码核对,已挂 `file:line` 落入 RFC。
- T-08 是 R5 的兑现动作:**不是重新调研,而是验证已写入 RFC 的每个引用**。结果:位置基本准确,1 处行号小幅偏移已修正。
- T-09 的关键产出:**两个不同模型独立地得出同一结论——D3 为过强断言**。这验证了独立评审机制的有效性(主会话自身第二轮 review 未能发现此问题)。
- T-10 已完成 7 项修订并新增 R7(realm 绑定)、R8(ROM_DATA 零拷贝)、R9(禁止荡到反向极端)。
