# RFC: QuickJS 原生 TypeScript 前端(在 JS parser 上融合 TS 解析)

Status: **定稿**(经两个不同模型对抗式独立评审,9 项修订已落地)
Domain: 代码工程(→ `.otto/skills/rfc/references/code-engineering.md`)
档位: 完整档(落地实现型)
Last updated: 2026-07-30
一手材料基线: 本仓库 QuickJS,VERSION `2026-06-04`,HEAD `04be246`
上游 RFC: `docs/rfc-parse-run-separation/RFC-quickjs-parse-run-separation.md`(parse/run 分离评估,已定稿)

## 背景与问题

前置 RFC(parse/run 分离)已定稿,确立了三条硬约束与三种分离形态,并在 §后续路线 中评估了 TS 融合的可行性:**技术成立,推荐路径 P2**(在现有 JS parser 上加 `ts_mode` 开关 + 类型语法消费函数)。

用户确定的推进路线是:**先分离(已完成)→ 再在 JS parser 上融合 TS 解析**,覆盖范围选定为 **B:可擦除语法 + 需生成运行时代码的构造**(完整 TS 支持,而非仅类型擦除)。

本 RFC 是该路线的落地实现型 RFC。它**允许修改上游源码**(这是与前置 RFC 的关键区别,前置 RFC 的 R6 禁区仅约束其自身)。

**立项理由(重要)**:前置 RFC 已用实测数据证明,类型驱动的字节码优化收益仅 **3-8%**(因 QuickJS 已自带 `OP_add_loc` 三路特化与 peephole 合并)。因此本 RFC **不以性能优化为立项理由**,而以"**QuickJS 能原生直接执行 `.ts`,免除外部 transpile 步骤**"为唯一价值主张。

## 目标与非目标

**目标**

- 让 QuickJS 能直接 parse 并执行 TypeScript 源码,无需外部 tsc/swc/esbuild。
- 覆盖 **B 类范围**(第二轮按评审补齐遗漏项,标 ★ 为初稿遗漏、评审发现):
  - **B1 可擦除语法**:
    - 类型注解(变量/参数/返回值/类成员)、`interface`、`type` 别名、泛型参数与实参、`as`/`satisfies`/`as const`、非空断言 `!`、`readonly`、可选标记 `?`、`declare`、访问修饰符。
    - ★ **函数重载签名**(多个无 body 声明 + 一个实现;签名须消费且不 emit)——真实项目极常见。
    - ★ **`this` 参数**(`function f(this: T, x)`;须擦除且**不计入真实形参数量**)。
    - ★ **确定赋值断言**(`let x!: T` / `prop!: T`,与非空断言位置不同)。
    - ★ **仅类型导入导出**:`import type`、`export type`、inline `import { type A }`、`export type *`——**不擦除会导致运行时加载不存在的 value export**,优先级最高。
    - ★ **类成员 TS 语法**:`abstract`、`override`、`accessor`、`declare` 字段、可选方法 `m?()`、类索引签名 `[key: string]: T`。
    - ★ **类型谓词与断言返回类型**:`x is T`、`asserts x is T`。
    - ★ **完整类型语法消费**(不求值,但须能吃掉):条件类型(`T extends U ? A : B`)、映射类型(`{[K in keyof T]?: V}`)、索引访问、`keyof`/`typeof` 类型查询、`infer`、模板字面量类型、`unique symbol`、构造签名(`new (a:T)=>R`)、调用签名、元组进阶语法(named/optional/rest/readonly)、类型参数约束与默认值(`<T extends U = V>`)、变体修饰符(`in`/`out`)、`const` 类型参数。
    - ★ **`declare global` / 模块增强**(`declare module "./x" {}`)。
  - **B2 需生成运行时代码**:
    - `enum`(数值/字符串/异构/计算成员/声明合并,语义要求见 D3.3)、`const enum`(分级支持,见 D3.2)。
    - `namespace`/`module`(含嵌套、声明合并、与 class/function/enum 合并,见 D3.3)。
    - 构造函数参数属性(注入时序见 D3.1)。
    - 装饰器(**两套语义并存、legacy 优先**,见 D3.4)。
- 通过 `ts_mode` 开关启用,**默认关闭**,不影响现有 JS 行为(零回归)。
- 类型仅做**语法消费**,不做类型检查(见非目标)。

**非目标**

- **不做类型检查器**。TS 类型语法被解析并丢弃(B1)或用于代码生成(B2),但**不校验类型正确性**——`let x: number = "s"` 不报错。理由:类型检查器是 tsc 的核心复杂度所在(数万行),与"能执行 .ts"的目标正交。
- **不做类型驱动的字节码优化**(前置 RFC 实测证明收益仅 3-8%,不值当)。
- 不实现 `.d.ts` 生成、不实现 TS 的 `--strict` 系列语义检查。
- 不支持 TS 的类型级计算(条件类型、映射类型、`infer`)的**求值**——它们只需被语法消费。
- 不改变字节码格式版本(`BC_VERSION`)除非 B2 必需(见风险)。
- ★ **不支持 JSX / `.tsx`**(第二轮明确)。这是**整体非目标**,不仅是 `<T>expr` 断言。**兼容损失须记录**:React 生态的 `.tsx` 项目不在覆盖范围内。
- ★ **不支持 `<T>expr` 尖括号类型断言**(只支持 `as`)。
- ★ **不支持 TS 的 CommonJS 互操作语法**:`import x = require()`、`export =`、`export as namespace`。这些多见于 DefinitelyTyped 与老项目;如需支持须另立里程碑。
- ★ **不支持三斜线指令** `/// <reference>`(单文件执行场景下忽略)。

## 关键决策与理由

### D1. 融合方式:`ts_mode` 开关 + 类型语法消费函数族(沿用前置 RFC 的 P2)

在 `JSParseState`(`quickjs.c:22134`)新增 `BOOL ts_mode`,并新增 `js_parse_ts_type` 系列函数消费类型语法。类型注解的四个插入点已定位:

| 插入点 | 函数 | 位置 |
| --- | --- | --- |
| 变量声明 `let x: T` | `js_parse_var` | `quickjs.c:28515` |
| 函数参数与返回值 `(a: T): R` | `js_parse_function_decl2` | `quickjs.c:24455` |
| 类成员 `x: T` / 方法签名 | `js_parse_class` | `quickjs.c:25274` |
| 解构 `{a}: T` | `js_parse_destructuring_element` | `quickjs.c:26338` |

### D2. 歧义消解:分两类——一类复用现有设施,一类必须新建机制

> **第二轮修订**:初稿断言"复用现有回溯即可,不新造机制"。两个独立评审同时判定该断言**被证伪**——现有设施不足以处理泛型。现修正为分类表述。

**已具备且可直接复用的设施**:
- `js_parse_get_pos`(`quickjs.c:24745`,结构体 `JSParsePos` 仅含 `got_lf`+`ptr`)/ `js_parse_seek_token`(`quickjs.c:24752`)—— 保存与回退 token 流位置。
- `js_parse_skip_parens_token`(`quickjs.c:24800`)—— 跳跃匹配括号/模板,返回闭合后的下一个 token。**注意:其 switch(`quickjs.c:24870` 起)只跟踪 `()` `[]` `{}` 与模板,完全不跟踪 `<>`**。

**该模式已被现有代码用于同类歧义**(仅括号类):
- 箭头函数 vs 括号表达式:`quickjs.c:28143`、`28162`(失败则 `seek_token` 回退)。
- 解构 vs 对象/数组字面量:`quickjs.c:28179`。`for-in` vs `for-of`:`quickjs.c:28746`。
- 字节码回滚范式:`quickjs.c:26788-26791` —— 当 `skip_parens_token` 判断错误时,用 `memset(..., OP_nop, ...)` 覆写已 emit 字节码并回退 label 引用计数。**这是 trial-parse 失败后清理字节码的既有手法**。

#### D2.1 第一类:可复用现有设施的歧义

| 歧义 | 消解策略 | 依据 |
| --- | --- | --- |
| `(a: T) => x` vs `(expr)` | 复用 `skip_parens_token` 判 `TOK_ARROW`;类型注解内括号仍平衡,不影响计数 | `quickjs.c:28143` |
| `(): T => x` 带返回类型的箭头 | **skip_parens 不足**——`)` 后是 `:` 不是 `=>`。需在 skip 后追加"可选消费 `: Type`"再判 `=>` | 现有判定的反例 |
| `x as T` / `x satisfies T` / `as const` | `as`/`satisfies` 为伪关键字,按 `token_is_pseudo_keyword`(`quickjs.c:22598`)识别 | `as` atom 已存在(`quickjs-atom.h:159`,用于 import `quickjs.c:31737`) |
| `x?: T` vs 三元 vs `?.` | 按**位置**分层:声明成员位置=可选标记;表达式位置 `?.`=可选链;表达式裸 `?`=三元;类型位置 `? :`=条件类型 | 位置敏感,非 token 敏感 |
| `x!` 非空断言 vs `!x` 逻辑非 vs `x!: T` 确定赋值 | postfix 阶段消费 `x!`;类成员中 identifier 后 `!` 且接 `:`/`=`/`;` 为确定赋值断言 | 位置区分 |

#### D2.2 第二类:必须新建机制的歧义(初稿遗漏,评审发现)

**(a) 泛型实参消歧 `f<T>(x)` vs `a < b`——不能用 skip_parens**

`skip_parens_token` 不跟踪 `<>`(证据见上)。必须新建**无副作用 trial-parse**:`js_parse_get_pos` 存位 → 试解析类型实参列表 → 要求后续为 `(` / 模板 / `?.(` 等合法调用后缀 → 失败则 `seek_token` 回退按关系运算符处理。

- 覆盖形态:`f<T>(x)`、`obj.method<T>()`、`new C<T>()`、tagged template `tag<T>\`x\``、可选调用 `fn<T>?.()`。
- **必须 emit-free**:trial-parse 期间不得 emit 字节码;若已 emit(如 callee 求值),须用 `quickjs.c:26788` 的 `memset OP_nop` 范式清理。

**(b) `>` 闭合的 token 重扫——本 RFC 唯一被证伪的支柱,阻断级**

**问题**:lexer 在 `quickjs.c:23125-23145` 把 `>>` 合并为单个 `TOK_SAR`、`>>>` 合并为 `TOK_SHR`、`>>=`/`>>>=` 合并为赋值 token。因此 `Array<Map<string, number>>` 的闭合 `>>` 是**一个 token**,而 `js_parse_get_pos`/`seek_token` 只能回退**位置**,**无法把一个 `TOK_SAR` 拆成两个 `>`**。

**结论**:嵌套泛型无法仅靠现有回溯解析。必须新增 **`>` token 重扫机制**(等价于 tsc 的 `reScanGreaterToken`):在类型上下文中遇到 `TOK_SAR`/`TOK_SHR`/`TOK_SAR_ASSIGN`/`TOK_SHR_ASSIGN` 时,按单个 `>` 重新解释并推进 `buf_ptr` 一个字节。

**这是新机制,须在 S4 下豁免说明**——token 重扫不是 lookahead(不前瞻、不回溯),而是**词法重解释**,复杂度 O(1)、无回溯风险。

**(c) 类型上下文中 `>` 不参与运算符解析**

类型位置的 `>` 只作泛型闭合,不得进入 `js_parse_expr_binary`(`quickjs.c:24449` 附近)的关系运算符路径。类型 parser 必须独立,不复用表达式 parser。

**(d) 表达式位置 vs 类型位置的上下文分离(架构级要求)**

多个 token 在两个位置语义完全不同:`typeof`(类型查询 vs unary)、`import(...)`(类型导入 vs 动态 import)、`new`(构造签名 vs 构造调用)、`?:`(条件类型 vs 三元)、模板字面量(类型 vs 运行时)。**`js_parse_ts_type` 族必须是独立的递归下降子系统,不能"调用表达式 parser 再丢弃结果"。**

**(e) 类成员起始的修饰符 lookahead**

`abstract`/`override`/`readonly`/`accessor`/`declare`/`static` 及访问修饰符均为上下文关键字,可作字段名:`class C { accessor = 1 }`(字段)vs `accessor x`(修饰符)。需 lookahead 判定后续形态。

**(f) 索引签名 vs 计算属性名 vs 映射类型**

`[key: string]: T`(索引签名)/ `[expr]: v`(计算属性)/ `[K in keyof T]`(映射类型)共享 `[` 前缀,需按内部形态区分。

**(g) 装饰器 `@` 无 lexer token**

`quickjs.c` 中 `case '@'` **零命中**——`@` 当前不是任何 token。M6 须先新增 `@` 词法支持,并处理 `@` 后表达式起始的 regexp/division 上下文。

#### D2.3 不支持的构造(显式非目标)

| 构造 | 决定 |
| --- | --- |
| `<T>expr` 尖括号类型断言 | **不支持**;只支持 `as`(与 JSX 冲突,TS 官方在 .tsx 亦禁用) |
| JSX / `.tsx` | **不支持**(整体非目标,非仅断言);记录为兼容损失 |
| 泛型箭头 `<T>(x: T) => x` | **支持**(在 `.ts` 中合法且常见)——表达式起始遇 `<` 时 trial-parse 类型参数列表,要求后续为 `(` 且最终见 `=>` |

### D3. B2 构造的实现范式:借鉴类字段初始化

B2 需生成字节码,但**不需要新增 opcode**——全部可用现有 emit 基础设施表达:

- emit 原语齐备:`emit_op`(`quickjs.c:23864`)、`emit_atom`(`23873`)、`emit_u8/u16/u32`(`23837`/`23842`/`23847`)、`emit_label`(`23931`)、`emit_goto`(`23944`)、`emit_push_const`(`23974`)。
- 变量定义:`define_var`(`quickjs.c:24303`)、`add_var`(`24174`)、`add_scope_var`(`24193`)。
- **范式参考**:`emit_class_field_init`(`quickjs.c:25184`)与 `js_parse_function_class_fields_init`(`24454`)展示了"在构造函数中注入隐式初始化代码"的完整做法——这正是**参数属性**所需。

各 B2 构造的降级(desugar)方案:

| 构造 | 降级为 | 依据 |
| --- | --- | --- |
| `enum E { A, B }` | 对象 + **仅数值成员**生成反向映射 | `OP_put_field`/`OP_define_field`(`quickjs-opcode.h:136`/`146`)+ `OP_put_array_el`/`OP_define_array_el`(`:143`/`151`) |
| `const enum` | **降级处理,见 D3.2** | 需常量求值器,不是纯 parser 消费 |
| `namespace N { }` | IIFE + 对象参数,**须支持合并**,见 D3.3 | 现有函数与对象 emit 能力 |
| `constructor(private x: T)` | **非派生类=构造首部;派生类=`super()` 之后**,见 D3.1 | 复用 `emit_class_field_init` 注入点(`quickjs.c:27404`) |
| 装饰器 | **两套语义并存,legacy 优先**,见 D3.4 | 需先新增 `@` 词法 token |

#### D3.1 参数属性的注入时序(修正初稿错误)

> **初稿写"构造函数体首部注入",对派生类是错的**。两个独立评审同时指出,已核实。

派生类中 `this` 在 `super()` 返回前不可用。现有类字段初始化正是这样处理的——`quickjs.c:27395-27404` 显示:派生类走 `OP_call_constructor` → `OP_dup` → `OP_scope_put_var_init`(设 `this`)→ **然后才** `emit_class_field_init(s)`。

**正确时序**:
- **非派生类**:构造函数体首部注入 `this.x = x`。
- **派生类**:在 `super()` 之后注入,**复用 `quickjs.c:27404` 的同一汇聚点**。
- 顺序约束:`super()` → 类字段初始化 → 参数属性赋值 → 用户 body 剩余语句。
- **语法级拒绝**:解构参数不能是参数属性(`constructor(private {x}: T)` 非法);overload 签名与 `declare` 构造函数不生成赋值。

好消息:post-super 注入的基础设施**已存在**,可行性不受影响,仅文字描述需修正。

#### D3.2 `const enum` 的边界收缩(评审发现的耦合)

`const enum` 内联需要**常量表达式求值器 + 符号表**,跨文件引用还需 module resolver——这**超出"纯 parser 消费"范围**,与 S2 边界冲突。

**决定:分级支持**
- **支持**:同文件内、成员为常量字面量或简单常量表达式的 `const enum` → 编译期内联。
- **降级**:成员含跨文件引用或复杂表达式的 `const enum` → **按普通 enum 生成对象**(等价于 tsc 的 `preserveConstEnums` 行为),不内联。
- **不支持**:ambient `declare const enum` 的跨模块内联(与 `isolatedModules` 本身不兼容,官方亦有明文风险提示)。

#### D3.3 `enum` / `namespace` 的语义完备性要求

**enum 必须处理**:数值 enum(生成反向映射)、字符串 enum(**不生成**反向映射)、异构 enum(仅数值成员生成)、计算成员(保持求值顺序)、自动递增规则、`declare enum`(不 emit)、**enum 与 namespace 的声明合并**、enum 既是值又是类型(类型位置擦除、值位置保留)。

**namespace 必须处理**:嵌套 `namespace A.B.C`(逐级创建/复用)、**声明合并**(同名多段;`export` 成员挂对象,非 `export` 成员为 IIFE 局部且后续块不可见)、与 class/function/enum 合并、`declare namespace`/`declare module`(整块消费不 emit)。

**这引入了最小 binder 需求**(声明合并必须知道同名声明已存在)——已反映到 S2 修订。

#### D3.4 装饰器:两套语义并存,legacy 优先(终局视角决策)

> **决策依据(用户指示:终局视角)**:装饰器正处标准迁移期,终局形态必然是两套共存——tsc 自身即用 `experimentalDecorators` 开关切换。选单套在终局都是错的:只做 legacy 挡住未来标准生态,只做 stage 3 则跑不了当下真实项目(NestJS/TypeORM/class-validator 依赖 legacy 的**参数装饰器**做 DI,stage 3 无参数装饰器,无法替代)。

**架构要求**:装饰器 emit 必须从一开始就设计为**可切换的双后端**,而非先做一套再补另一套(评审明确指出反向补 legacy 是系统性返工)。

- **优先实现 legacy**(M6a):三参数签名 `(target, key, descriptor|index)`;支持类/方法/属性/**参数**装饰器;可选 `emitDecoratorMetadata`。
- **后续实现 stage 3**(M6b,独立里程碑):`(value, context)` 签名,context 含 `kind`/`name`/`static`/`private`/`access`/`addInitializer`;配套 `accessor` 关键字。
- **切换方式**:编译期开关(对应 tsconfig 的 `experimentalDecorators`),不在同一编译单元混用。

**`emitDecoratorMetadata` 突破 S2 边界(已在 S2 修订中反映)**:它需把类型序列化为运行时构造器(`number`→`Number`、`string`→`String`、类→类引用、其余→`Object`)。这是**受限的类型名到值映射**,不是类型检查,但必须显式纳入边界。

**前置工作**:`@` 当前无 lexer token(`quickjs.c` 中 `case '@'` 零命中),M6 须先新增词法支持。

### D4. 分阶段推进:B1 先行,B2 增量

B1(可擦除)与 B2(生成代码)风险量级不同:B1 局限于 parser 层;B2 触及字节码生成。故按 **B1 → B2** 顺序推进,B1 完成即可独立交付价值(能跑绝大多数 TS 代码)。

## 重要事项规则(进里程碑前必读)

- **S1 · 零回归是最高优先级**。`ts_mode` 默认关闭;关闭时 parser 行为必须与改动前**逐字节一致**。每个里程碑必须跑通 `make test` 与 test262 无新增失败(`test262_errors.txt` 不变),否则不得标 Done。
- **S2 · 不做类型检查,但允许为 emit 服务的最小语义基础设施(第二轮修订边界)**。
  - **禁止**:类型兼容性判断、类型推导、赋值可行性检查、`--strict` 系列语义校验。`let x: number = "s"` 不报错。
  - **允许(为 emit 所必需,评审指出的耦合)**:① **最小 binder**——声明合并(enum/namespace 同名合并)必须知道同名声明是否已存在;② **声明上下文标记**——`declare`/ambient 判定决定是否 emit;③ **type/value 空间区分**——enum 等既是类型又是值,类型位置擦除、值位置保留;④ **常量表达式求值**——`const enum` 同文件内联(边界见 D3.2);⑤ **受限类型序列化**——`emitDecoratorMetadata` 的类型名→运行时构造器映射(见 D3.4)。
  - 边界判据:**为生成正确代码所必需**则允许,**仅为报错/校验**则禁止。
- **S3 · 不新增 opcode,不改 `BC_VERSION`(除非证明必需)**。B2 全部构造须用现有 emit 原语表达(→ D3);已核实 `OP_put_field`/`OP_define_field`/`OP_put_array_el`/`OP_define_array_el` 足以支撑 enum 正反向映射。若某构造确实无法表达,须先 grill 确认再评估改 `BC_VERSION` 的代价(前置 RFC R2:版本严格相等校验,改动会使既有字节码全部失效)。**注意:新增 lexer token(如 `@`)与 token 重扫不属于 opcode 变更,不受此约束。**
- **S4 · 歧义消解优先复用现有设施;新建机制须论证终止性(第二轮修订)**。
  - 优先复用 `js_parse_get_pos`/`js_parse_seek_token`/`js_parse_skip_parens_token`。
  - **已批准的新建机制(初稿禁止,评审证明必需)**:① **`>` token 重扫**(拆分 `TOK_SAR`/`TOK_SHR` 为单个 `>`)——O(1) 词法重解释,无前瞻无回溯,不属 lookahead;② **emit-free 类型实参 trial-parse**——须有明确失败回退路径,且回退时用 `quickjs.c:26788` 的 `memset OP_nop` 范式清理已 emit 字节码;③ **`@` lexer token**;④ **类成员修饰符 lookahead**。
  - 禁止:无界回溯。每处 trial-parse 必须给出最坏复杂度界,并测深嵌套用例(如 `a<b<c<d<e>>>>`)。
  - **类型 parser 必须独立**:`js_parse_ts_type` 族不得"调用表达式 parser 再丢弃结果"(→ D2.2(d) 上下文分离要求)。
- **S5 · 断言必须挂 `file:line`,禁止凭记忆**(继承前置 RFC R5)。
- **S6 · 断言强度必须经"现状穷举"校准**(继承前置 RFC R9,已三次触发)。估算"新增 X 的收益/工作量"前,必须先穷举"现状已实现多少 X"。本 RFC 的 D2/D3 即是该规则的产物——先确认回溯设施与 emit 原语已存在,才敢定 P2 路径。
- **S7 · 上游 merge 友好**。本仓库是 `bellard/quickjs` 镜像。改动须尽量集中、可辨识:新增代码优先放在独立区块并加 `/* TS: ... */` 标记;避免大范围重排既有代码,降低未来 merge 冲突面。
- **S8 · 不以性能为理由做任何改动**。前置 RFC 实测证明类型驱动优化收益仅 3-8%。任何以"顺便优化性能"为名的改动须走单独 RFC(→ 立项理由)。
- **S9 · TS 伪关键字识别禁止只判"当前 token 是伪关键字"就进入声明分支,必须验证后续形态(M3/M4 两轮固化,阻断级 bug 的根因)**。两种不同的伪关键字陷阱,均已踩过:
  - **(a) strict-only 关键字陷阱(M3)**:`interface` 等属于 `JS_ATOM_LAST_KEYWORD` 与 `JS_ATOM_LAST_STRICT_KEYWORD` 之间的 strict-only 关键字(`update_token_ident`,`quickjs.c:22757`),在非 strict 顶层代码中不会被词法层转成对应 `TOK_*`,必须用 `token_is_pseudo_keyword`/`js_ts_is_pseudo_keyword_str` 识别。
  - **(b) peek_token 词法弱化陷阱(M4,不同于 (a))**:`enum` 是**无条件**强制关键字(atom 序号在 `JS_ATOM_LAST_KEYWORD` 之前),`next_token` 能正确识别为 `TOK_ENUM`,**但 `peek_token` 不能**——`peek_token` 用 `simple_next_token`,是只硬编码识别 `export`/`function`/`in`/`import` 等少数关键字的极简词法器,对其余关键字(含 `enum`)一律返回 `TOK_IDENT`。检测"`const` 后紧跟 `enum`"若用 `peek_token(s,TRUE)==TOK_ENUM` 永远为假。**规则:`peek_token` 只能用于判断是否为 `TOK_IDENT`/少数硬编码符号这类粗粒度信号,要精确判断某个具体关键字/标识符,必须用 `get_pos`+`next_token`+检查真实 `token.val`+`seek_token` 回退的完整 trial-parse,不能寄望 `peek_token` 返回该关键字对应的 `TOK_*`。**
  - **(a)+(b) 共同要求**:无论哪种陷阱,识别伪关键字后**仅识别不够**,必须再验证紧跟的 token 形态确实像声明,否则会把 `declare = 5;`、`declare();`、`declare.x` 这类把伪关键字用作普通标识符的合法代码误判为声明语句并报错(M3 的 `declare` 分支初版即漏了这一验证,被子 agent 判 FAIL,已修复)。**每新增一个 TS 伪关键字检测点,必须同时写一条"该词作普通标识符使用"的回归测试**(参考 `tests/test_ts.js` 的 `declare`/`declare2` 用例)。

## 目标架构

```
  .ts 源码
     │
     ▼
  ┌──────────────── parser 层(本 RFC 主战场) ────────────────┐
  │  next_token ──► js_parse_* 递归下降                      │
  │       │                                                   │
  │       ├─ ts_mode? ──► js_parse_ts_type 族(消费类型语法)  │
  │       │                 └─ B1: 消费后丢弃                 │
  │       │                                                   │
  │       └─ 歧义点 ──► js_parse_get_pos/seek_token 回退      │
  │                      (复用,不新造 → S4)                  │
  └───────────────────────┬───────────────────────────────────┘
                          │  B2 需生成代码
                          ▼
  ┌──────────── 字节码生成层(仅 B2 触及) ────────────┐
  │  emit_op / emit_atom / define_var                 │
  │  范式:emit_class_field_init(quickjs.c:25184)    │
  │  不新增 opcode、不改 BC_VERSION(→ S3)            │
  └───────────────────────┬───────────────────────────┘
                          ▼
              JSFunctionBytecode(格式不变)
                          │
                          ▼
              解释器 / JS_WriteObject(AOT)
              ↑ 完全不改动
```

**与前置 RFC 的接线**:本 RFC 产出的 TS 前端可与前置 RFC 的 F2/F3 组合——TS parser 放**编译期**(AOT),运行期零 parser,同时拿到"能跑 TS"与"运行期体积 -10%"(前置 RFC §后续路线 T3 结论)。

技术路线图见 `diagrams/roadmap.svg`。

## 放弃方案

- **外部 transpile(P1)**:放弃。用户明确要"在 JS parse 基础上融合",且外部方案已有成熟工具,本项目无增量价值。
- **仅做 B1 可擦除语法**:放弃(用户选 B)。B1 无法跑 NestJS 等重装饰器/enum 的真实项目。
- **实现完整类型检查器**:放弃(→ S2)。数万行工程,与"能执行"目标正交,应交给 tsc 在 CI 侧做。
- **`<T>expr` 尖括号类型断言**:放弃(→ D2)。与 JSX 语法冲突,TS 官方在 .tsx 中亦禁用,只支持 `as`。
- **类型驱动字节码优化**:放弃(→ S8)。前置 RFC 实测仅 3-8%。
- **新增特化 opcode**:放弃(→ S3)。前置 RFC 证明 `OP_add_loc`(`quickjs.c:19743`)与 peephole(`35400-35465`)已覆盖主要空间。

## 风险与验证策略

| 风险 | 缓解 |
| --- | --- |
| **回归**:改动 parser 影响既有 JS 解析 | S1 硬规则:`ts_mode` 默认关;每里程碑跑 `make test` + test262 对比 `test262_errors.txt`,零新增失败 |
| **歧义消解出错**:泛型 `<` 与关系运算符混淆导致误判 | emit-free trial-parse + 失败回退;每个歧义点必须有针对性单测(含反例:`a<b>(c)` 在 JS 语义下是 `(a<b)>(c)` 两次比较) |
| **★ `>>` token 合并阻断嵌套泛型(第二轮发现,阻断级)** | 已确认 lexer 在 `quickjs.c:23125-23145` 合并 `>>`→`TOK_SAR`、`>>>`→`TOK_SHR`。必须新增 `>` token 重扫机制(→ D2.2(b)、S4 已批准);M2 预算已上调并拆分 |
| **无限回溯导致性能退化** | S4 要求终止性论证与最坏复杂度界;测深嵌套泛型 `a<b<c<d<e>>>>` |
| **★ trial-parse 留下垃圾字节码** | 已确认 `JSParsePos`(`quickjs.c:24740`)只存 `ptr`+`got_lf`,**不含字节码位置**。回退须用 `quickjs.c:26788` 的 `memset OP_nop` 范式清理;S4 已强制要求 |
| **B2 需要新 opcode**,触发 `BC_VERSION` 变更 | S3 要求先证明不足并 grill 确认;已核实 `OP_put_field`/`define_field`/`put_array_el`/`define_array_el`(`quickjs-opcode.h:136`/`146`/`143`/`151`)足以支撑 enum |
| **★ 装饰器语义版本选错导致系统性返工** | **终局视角决策:两套并存、legacy 优先**(→ D3.4)。emit 管线从设计起即为可切换双后端,避免反向补 legacy 的返工。M6 拆为 M6a(legacy)+M6b(stage 3) |
| **★ `const enum` / metadata 突破"不做类型检查"边界** | S2 已修订边界:允许为 emit 服务的最小 binder、常量求值、受限类型序列化;`const enum` 分级支持(→ D3.2) |
| **★ 声明合并需要 binder** | enum/namespace 合并须知同名声明是否存在。S2 已允许最小 binder;M4/M5 设计闸门须明确其数据结构与作用域 |
| 上游 merge 冲突 | S7:改动集中、加 `/* TS: */` 标记、避免重排 |
| 工作量估算失真 | S6:已穷举现状(回溯设施、emit 原语齐备),故 P2 可行;每里程碑 ≤120k 上下文预算 |

**验证策略**:每个里程碑三层验证——① 新增 TS 语法单测(正常/边界/歧义反例);② `make test` 回归零失败;③ test262 无新增失败。已核实该手段可执行:`test262.conf:35` 定义 errorfile,`run-test262.c:2361-2365`/`1262-1269` 加载并按行比对,由 Makefile `test2` target(`Makefile:507`)驱动。B2 里程碑额外要求:字节码 dump 对比,确认降级结果与手写等价 JS 一致。

## 独立评审记录(M0,应用点 A)

委派**两个不同模型**并行对抗式评审,互不可见:

| 评审者 | 视角 | 判定 | 最重要发现 |
| --- | --- | --- | --- |
| `Claude-Opus-4.8` | 终局/全面/系统 + 源码核实 30+ 处 | **PARTIAL** | **`>>` token 合并是硬阻断**(`quickjs.c:23125-23145`),D2"复用现有回溯即可"是唯一被证伪的支柱;参数属性派生类时序错误;`skip_parens_token` 不跟踪 `<>` |
| `GPT-5.5` | TS 语言与编译器专家 | **严重低估** | 独立穷举出 30+ 歧义点(RFC 初稿仅列 5 个);装饰器语义版本是最危险单点判断;`const enum`/metadata 突破"零类型检查"边界;enum/namespace 声明合并需 binder |

**关键交叉验证**:两个模型在互不知情下**同时判定 D2 的核心断言不成立**(一个从 lexer token 合并角度,一个从 TS 语法完备性角度),且主会话独立取证亦命中(`JSParsePos` 只存 2 字段、`memset OP_nop` 回滚范式)。三方一致 ⇒ 该结论确凿。

**已完成修订(共 9 项)**:
1. **D2 重写**:拆为"可复用设施"(D2.1)与"必须新建机制"(D2.2),后者含 `>` token 重扫、emit-free trial-parse、上下文分离等 7 项。
2. **D3.1 修正参数属性时序**:派生类须在 `super()` 后注入(证据 `quickjs.c:27395-27404`)。
3. **D3.2 `const enum` 分级支持**:同文件常量内联,其余降级为普通 enum。
4. **D3.3 补 enum/namespace 语义完备性要求**(反向映射仅数值成员、声明合并等)。
5. **D3.4 装饰器双套并存、legacy 优先**(终局视角决策),emit 管线设计为可切换双后端。
6. **S2 边界修订**:允许为 emit 服务的最小 binder/常量求值/受限类型序列化,禁止仅为校验的类型检查。
7. **S4 规则修订**:批准 4 项新建机制并要求终止性论证与字节码清理。
8. **B1/B2 清单补齐**:新增函数重载签名、`this` 参数、`import type`、确定赋值断言、完整类型语法等 10+ 项(标 ★)。
9. **非目标显式化**:JSX/`.tsx` 整体不支持、CommonJS 互操作语法不支持、三斜线指令不支持,并记录兼容损失。

**评审确认无误的部分**:emit 原语齐备(不需新 opcode)、里程碑 DAG 无环、零回归策略可执行(test262 比对机制真实存在)、伪关键字方案安全(`enum`/`interface` 本已是保留字,`as` atom 已存在)。
