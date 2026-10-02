# UI/UX Design Agent — Coding Agent Execution Spec

> Mục đích của file này: giao trực tiếp cho một coding agent (Claude Code, Codex, Cursor Agent, Cline, OpenHands, v.v.) để phân tích repo hiện tại và triển khai một hệ thống **AI-assisted UI/UX workflow** theo hướng agentic.
>
> Coding agent phải xem tài liệu này như **source of truth** cho phạm vi công việc, nhưng cần ưu tiên tính tương thích với codebase hiện tại và không được phá vỡ chức năng đang có.

---

## 1. Vai trò của bạn

Bạn là **Senior Full-stack / AI Engineer + Product Engineer**.

Nhiệm vụ của bạn là xây dựng hoặc tích hợp một hệ thống hỗ trợ thiết kế UI/UX bằng nhiều agent, theo pipeline:

```text
Product Requirement / User Request
        ↓
Product Analyst Agent
        ↓
UX Research Agent
        ↓
UX Architect Agent
        ↓
UI Designer Agent
        ↓
UX Critic Agent
        ↓
Accessibility / Design System Validation
        ↓
Revision Loop
        ↓
Final UI Specification
        ↓
Optional: Generate production-ready UI/code
```

Không được coi đây là một chatbot đơn thuần.

Hệ thống cần có:
- trạng thái workflow rõ ràng;
- output có cấu trúc;
- agent chuyên trách;
- vòng lặp critique → revise;
- khả năng lưu lịch sử;
- khả năng tiếp tục từ trạng thái trước;
- output đủ rõ để developer hoặc AI code generator triển khai UI.

---

# 2. Nguyên tắc làm việc bắt buộc

Trước khi code:

1. Đọc toàn bộ repository hiện tại.
2. Xác định:
   - framework;
   - frontend;
   - backend;
   - database;
   - auth;
   - AI provider;
   - state management;
   - component library;
   - design system;
   - convention hiện có.
3. Không thay stack hiện tại nếu không thực sự cần thiết.
4. Không rewrite project từ đầu.
5. Không xóa chức năng đang hoạt động.
6. Ưu tiên tái sử dụng component, service và abstraction hiện có.
7. Nếu repo đã có architecture phù hợp, tích hợp vào architecture đó.
8. Nếu requirement trong file này xung đột với codebase thực tế:
   - ưu tiên backward compatibility;
   - ghi rõ quyết định trong tài liệu triển khai.

Trước mỗi thay đổi lớn, hãy hiểu dependency và luồng dữ liệu liên quan.

---

# 3. Mục tiêu sản phẩm

Người dùng có thể nhập:

- PRD;
- mô tả feature;
- business problem;
- pain point;
- yêu cầu UI;
- mô tả workflow;
- screenshot/reference nếu hệ thống hiện tại hỗ trợ multimodal.

Ví dụ:

```text
Thiết kế luồng onboarding nhân sự mới cho HR.

HR cần:
- tạo hồ sơ nhân viên mới;
- yêu cầu IT cấp tài khoản;
- cấp thiết bị;
- thu thập giấy tờ;
- lên lịch orientation;
- theo dõi tiến độ onboarding.
```

Hệ thống không được sinh UI ngay lập tức.

Hệ thống phải phân tích bài toán trước.

---

# 4. Workflow bắt buộc

## Phase A — Product Analysis

Agent: `ProductAnalyst`

Nhiệm vụ:

- hiểu business goal;
- xác định primary user;
- xác định secondary user;
- tìm Jobs To Be Done;
- pain points;
- use cases;
- success metrics;
- constraints;
- assumptions;
- missing information.

Output chuẩn:

```json
{
  "product_summary": "",
  "business_goal": [],
  "primary_users": [],
  "secondary_users": [],
  "jobs_to_be_done": [],
  "pain_points": [],
  "use_cases": [],
  "constraints": [],
  "assumptions": [],
  "success_metrics": []
}
```

Không tạo UI trong bước này.

---

# 5. UX Research Agent

Agent: `UXResearcher`

Input:
- original user request;
- ProductAnalyst output.

Nhiệm vụ:

- xây persona ở mức vừa đủ;
- xác định user intent;
- xác định critical task;
- xác định pain point;
- happy path;
- failure path;
- first-time experience;
- returning-user experience;
- edge cases.

Output:

```json
{
  "personas": [],
  "user_goals": [],
  "critical_tasks": [],
  "user_journey": [],
  "happy_paths": [],
  "failure_paths": [],
  "edge_cases": [],
  "ux_risks": []
}
```

Không tạo visual design.

---

# 6. UX Architect Agent

Agent: `UXArchitect`

Nhiệm vụ:

- xây information architecture;
- sitemap;
- navigation model;
- user flow;
- screen list;
- feature hierarchy;
- action hierarchy;
- primary vs secondary CTA;
- state của từng màn hình.

Phải xử lý tối thiểu:

```text
Default
Empty
Loading
Error
Success
Disabled
Permission denied
First-time user
Returning user
```

Output:

```json
{
  "information_architecture": {},
  "navigation": {},
  "user_flows": [],
  "screens": [
    {
      "id": "",
      "name": "",
      "purpose": "",
      "primary_action": "",
      "secondary_actions": [],
      "required_data": [],
      "states": []
    }
  ]
}
```

---

# 7. UI Designer Agent

Agent: `UIDesigner`

Không được chỉ đưa ra một phương án.

Mặc định phải tạo **3 design directions** khác nhau.

Ví dụ:

### Direction A — Dense Productivity

Phù hợp:
- admin;
- HR;
- power user;
- dữ liệu nhiều.

Đặc điểm:
- sidebar;
- table;
- compact spacing;
- keyboard-friendly;
- thao tác nhanh.

### Direction B — Task-Oriented

Phù hợp:
- user ít kinh nghiệm;
- workflow rõ ràng;
- onboarding.

Đặc điểm:
- card;
- task queue;
- large CTA;
- guided actions.

### Direction C — Progressive Disclosure

Phù hợp:
- workflow phức tạp;
- nhiều dữ liệu;
- cần giảm cognitive load.

Đặc điểm:
- wizard;
- stepper;
- details-on-demand;
- summary screen.

Mỗi direction phải có:

```json
{
  "name": "",
  "design_principle": "",
  "target_user": "",
  "layout": "",
  "navigation": "",
  "strengths": [],
  "weaknesses": [],
  "recommended_for": []
}
```

Sau đó agent phải đề xuất một direction tốt nhất.

---

# 8. Design System Agent

Agent: `DesignSystemGuardian`

Nhiệm vụ:

- kiểm tra component consistency;
- typography;
- spacing;
- color token;
- radius;
- shadows;
- layout grid;
- component reuse;
- responsive behavior.

Không được tạo component mới nếu đã tồn tại component tương đương.

Nếu repo có design system:

> REUSE IT.

Nếu repo không có design system, tạo một hệ thống tối thiểu.

Ví dụ token:

```yaml
spacing:
  xs: 4
  sm: 8
  md: 12
  lg: 16
  xl: 24
  2xl: 32

radius:
  sm: 6
  md: 8
  lg: 12

typography:
  body-sm: 14/20
  body-md: 16/24
  heading-sm: 20/28
  heading-md: 24/32
  heading-lg: 32/40
```

Không hard-code giá trị style lặp đi lặp lại nếu project đã dùng token/theme.

---

# 9. UX Critic Agent

Agent: `UXCritic`

Agent này KHÔNG được thiết kế UI mới ngay.

Nó phải review output trước.

Phân loại issue:

```text
Critical
Major
Medium
Minor
Cosmetic
```

Review theo:

- information hierarchy;
- cognitive load;
- navigation clarity;
- task completion speed;
- discoverability;
- affordance;
- consistency;
- error prevention;
- accessibility;
- mobile responsiveness;
- empty state;
- loading state;
- error state;
- permission state.

Output:

```json
{
  "score": 0,
  "critical_issues": [],
  "major_issues": [],
  "medium_issues": [],
  "minor_issues": [],
  "recommended_changes": []
}
```

Score: `0–100`.

---

# 10. Revision Loop

Nếu:

```text
score < 85
```

thì hệ thống phải quay về:

```text
UIDesigner
```

với critique trước đó.

Flow:

```text
UI Designer
     ↓
UX Critic
     ↓
score >= 85 ?
   ↙      ↘
 no       yes
 ↓         ↓
revise    finalize
```

Giới hạn:

```text
MAX_ITERATIONS = 3
```

Không được loop vô hạn.

Nếu sau 3 iteration vẫn dưới threshold:
- trả về best version;
- kèm unresolved issues.

---

# 11. Accessibility Agent

Agent: `AccessibilityReviewer`

Kiểm tra ít nhất:

- semantic HTML;
- keyboard navigation;
- focus state;
- form label;
- aria khi cần;
- contrast;
- touch target;
- heading hierarchy;
- error feedback;
- screen reader compatibility.

Target:

```text
WCAG 2.2 AA
```

Không cần over-engineer AAA nếu không có requirement.

---

# 12. Final UI Specification

Output cuối không chỉ là prose.

Phải có cấu trúc đủ để coding agent khác triển khai.

Ví dụ:

```json
{
  "screen": "Employee Onboarding Dashboard",
  "layout": {
    "type": "sidebar-content",
    "max_width": "1440px"
  },
  "sections": [
    {
      "name": "Header",
      "components": []
    },
    {
      "name": "Progress Summary",
      "components": []
    }
  ],
  "components": [],
  "states": [],
  "responsive_rules": [],
  "accessibility_rules": [],
  "design_tokens": {}
}
```

---

# 13. Component Tree

Final output cần có component hierarchy.

Ví dụ:

```text
AppShell
├── Sidebar
│   ├── Logo
│   ├── Navigation
│   └── UserMenu
│
└── Main
    ├── PageHeader
    │   ├── Breadcrumb
    │   ├── Title
    │   └── PrimaryAction
    │
    ├── StatsGrid
    │   └── StatCard[]
    │
    ├── FilterBar
    │
    └── EmployeeTable
        ├── TableHeader
        ├── EmployeeRow[]
        └── Pagination
```

---

# 14. Nếu hệ thống generate code

Nếu scope project cho phép generate UI code:

Ưu tiên:

```text
React
Next.js nếu repo đang dùng Next.js
TypeScript
Tailwind nếu repo dùng Tailwind
shadcn/ui nếu repo đã dùng hoặc phù hợp
```

NHƯNG:

Không tự ý migrate framework.

Nếu project dùng:

```text
Vue
Angular
Svelte
React Native
Flutter
```

thì giữ nguyên stack.

---

# 15. Frontend Quality Rules

UI phải:

- responsive;
- accessible;
- keyboard usable;
- không overflow bất thường;
- không fixed width vô lý;
- không dùng magic number tràn lan;
- không duplicate component;
- không duplicate business logic;
- có loading state;
- có empty state;
- có error state;
- có disabled state.

Ưu tiên:

```text
clarity > decoration
usability > visual effects
consistency > novelty
```

Không lạm dụng:
- gradients;
- glassmorphism;
- animation;
- giant cards;
- giant typography;
- excessive whitespace.

---

# 16. AI Provider Abstraction

Nếu project sử dụng LLM API:

Tạo abstraction kiểu:

```ts
interface LLMProvider {
  generate(input: AgentInput): Promise<AgentOutput>;
}
```

Không gọi trực tiếp provider ở khắp codebase.

Ví dụ structure:

```text
ai/
├── provider.ts
├── openai-provider.ts
├── anthropic-provider.ts
├── openrouter-provider.ts
└── mock-provider.ts
```

Nếu repo đã có AI abstraction thì dùng abstraction hiện tại.

---

# 17. Agent Interface

Khuyến nghị abstraction:

```ts
interface Agent<TInput, TOutput> {
  name: string;
  run(input: TInput): Promise<TOutput>;
}
```

Ví dụ:

```text
ProductAnalyst
UXResearcher
UXArchitect
UIDesigner
UXCritic
AccessibilityReviewer
DesignSystemGuardian
```

Không copy/paste orchestration logic cho từng agent.

---

# 18. Structured Output

Nếu LLM provider hỗ trợ JSON Schema / structured output:

Phải dùng.

Không dựa hoàn toàn vào việc parse JSON từ text tự do.

Mỗi agent nên có schema validation.

Khuyến nghị:

```text
Zod
JSON Schema
Pydantic
```

tùy stack.

Nếu output invalid:
- retry có giới hạn;
- log lỗi;
- không crash toàn workflow.

---

# 19. Workflow State

Cần có state object trung tâm.

Ví dụ:

```ts
type DesignWorkflowState = {
  id: string;

  originalRequest: string;

  productAnalysis?: ProductAnalysis;
  uxResearch?: UXResearch;
  uxArchitecture?: UXArchitecture;

  designDirections?: DesignDirection[];
  selectedDirection?: string;

  critiques: Critique[];
  iteration: number;

  finalSpec?: FinalUISpec;

  status:
    | "created"
    | "analyzing"
    | "researching"
    | "architecting"
    | "designing"
    | "reviewing"
    | "revising"
    | "completed"
    | "failed";
};
```

---

# 20. Persistence

Nếu project đã có DB:

Lưu:

- workflow;
- user request;
- từng agent output;
- critique;
- iteration;
- final result;
- created_at;
- updated_at.

Không bắt buộc lưu full chain-of-thought.

Chỉ lưu:
- structured result;
- summary;
- metadata;
- error.

---

# 21. Không lưu private chain-of-thought

Không thiết kế hệ thống phụ thuộc vào việc model xuất chain-of-thought.

Nếu cần reasoning trace, dùng dạng ngắn:

```json
{
  "decision": "",
  "rationale_summary": "",
  "tradeoffs": []
}
```

Không yêu cầu model tiết lộ reasoning nội bộ dài.

---

# 22. Prompt Management

Không hard-code prompt dài trực tiếp trong controller/component.

Structure gợi ý:

```text
prompts/
├── product-analyst.ts
├── ux-researcher.ts
├── ux-architect.ts
├── ui-designer.ts
├── ux-critic.ts
├── accessibility.ts
└── design-system.ts
```

Hoặc tương đương theo stack.

Prompt cần versionable.

Ví dụ:

```ts
export const PRODUCT_ANALYST_PROMPT_VERSION = "1.0";
```

---

# 23. Prompt — Product Analyst

Base behavior:

```text
You are a senior product strategist.

Analyze the product requirement before any UI is designed.

Identify:
- business goals
- primary users
- jobs to be done
- pain points
- critical use cases
- constraints
- assumptions
- success metrics

Do not design screens.
Do not choose colors.
Do not discuss visual style.

Return structured output only.
```

---

# 24. Prompt — UX Researcher

```text
You are a senior UX researcher.

Use the product analysis and original user request.

Identify:
- primary user goals
- critical tasks
- user journey
- happy paths
- failure paths
- first-time experience
- returning-user behavior
- edge cases
- UX risks

Focus on user behavior, not visual styling.

Return structured output only.
```

---

# 25. Prompt — UX Architect

```text
You are a senior UX architect.

Convert validated product and UX insights into:

- information architecture
- navigation model
- user flows
- screen inventory
- action hierarchy
- screen states

Every important screen must consider:
default,
loading,
empty,
error,
success,
permission,
disabled.

Optimize for minimum cognitive load
and minimum steps to complete the core task.

Return structured output only.
```

---

# 26. Prompt — UI Designer

```text
You are a senior product designer.

Design three clearly different UI directions.

Do not create superficial cosmetic variants.

Directions must differ in:
- interaction model
- information density
- navigation
- task guidance
- layout strategy

Evaluate strengths and weaknesses.

Recommend one direction based on user goals.

Respect the supplied design system.
```

---

# 27. Prompt — UX Critic

```text
You are a principal product designer reviewing another designer's work.

Do not redesign immediately.

Audit:
- hierarchy
- cognitive load
- navigation
- task completion
- discoverability
- affordance
- consistency
- accessibility
- error prevention
- system states

Classify issues:
Critical
Major
Medium
Minor
Cosmetic

Score the design from 0 to 100.

Provide concrete corrective actions.
```

---

# 28. Prompt — Accessibility Reviewer

```text
You are an accessibility specialist.

Evaluate the proposed UI against WCAG 2.2 AA.

Review:
- semantic structure
- keyboard navigation
- focus
- labels
- contrast
- headings
- form errors
- status messages
- touch targets
- screen reader behavior

Return actionable issues only.
```

---

# 29. UI cho chính ứng dụng Design Agent

Nếu cần xây UI cho tool này, layout đề xuất:

```text
┌─────────────────────────────────────────────┐
│ Header                                      │
├──────────────┬──────────────────────────────┤
│              │                              │
│ Workflow     │ Main Workspace               │
│ Steps        │                              │
│              │ Input / Result / Preview     │
│ Product      │                              │
│ Research     │                              │
│ UX Flow      │                              │
│ Design       │                              │
│ Critique     │                              │
│ Final        │                              │
│              │                              │
├──────────────┴──────────────────────────────┤
│ Run / Continue / Regenerate / Export        │
└─────────────────────────────────────────────┘
```

---

# 30. Main Workspace

Nên hỗ trợ tabs:

```text
Overview
Research
User Flow
Screens
Design Directions
Critique
Final Spec
```

Nếu có generated UI preview:

```text
Preview
Code
```

---

# 31. Workflow Progress UI

Hiển thị rõ:

```text
✓ Product Analysis
✓ UX Research
✓ UX Architecture
● UI Design
○ UX Review
○ Final
```

Không để người dùng không biết hệ thống đang làm gì.

---

# 32. Agent Output UI

Mỗi agent output nên có:

- agent name;
- status;
- timestamp;
- structured result;
- rerun;
- edit input;
- continue.

Ví dụ:

```text
UX Researcher

Status: Completed

Critical Tasks
- Create employee
- Assign equipment
- Create accounts

UX Risks
- Too many manual steps
- Missing ownership visibility

[Regenerate]
[Edit]
[Continue]
```

---

# 33. Error Handling

Không hiển thị:

```text
Something went wrong
```

nếu có thể cung cấp lỗi hữu ích hơn.

Ví dụ:

```text
The UX Critic response did not match the required schema.

Retrying...
Attempt 2/3
```

Sau retry limit:

```text
UX review could not be completed.

Previous design remains available.
```

---

# 34. Loading UX

Nếu agent call mất thời gian:

Hiển thị current phase.

Ví dụ:

```text
Analyzing product requirements...
```

sau đó:

```text
Building user flows...
```

Không dùng fake percentage nếu không có progress thật.

---

# 35. Concurrency

Chỉ chạy song song nếu agents độc lập.

Ví dụ sau UI draft:

```text
AccessibilityReviewer
DesignSystemGuardian
```

có thể chạy parallel.

Nhưng:

```text
ProductAnalyst
→ UXResearcher
→ UXArchitect
```

phải sequential vì phụ thuộc output.

---

# 36. Recommended Orchestration

Pseudo:

```ts
async function runDesignWorkflow(request: string) {
  const state = createWorkflow(request);

  state.productAnalysis =
    await productAnalyst.run(state);

  state.uxResearch =
    await uxResearcher.run(state);

  state.uxArchitecture =
    await uxArchitect.run(state);

  state.designDirections =
    await uiDesigner.run(state);

  for (let i = 0; i < 3; i++) {
    const critique =
      await uxCritic.run(state);

    state.critiques.push(critique);

    if (critique.score >= 85) {
      break;
    }

    state.designDirections =
      await uiDesigner.revise(state);
  }

  const [
    accessibility,
    designSystem
  ] = await Promise.all([
    accessibilityReviewer.run(state),
    designSystemGuardian.run(state)
  ]);

  state.finalSpec =
    finalizeDesign(
      state,
      accessibility,
      designSystem
    );

  return state;
}
```

Implement theo architecture thực tế của repo, không copy máy móc.

---

# 37. API

Nếu project dùng REST:

Gợi ý:

```text
POST   /api/design-workflows
GET    /api/design-workflows/:id
POST   /api/design-workflows/:id/run
POST   /api/design-workflows/:id/continue
POST   /api/design-workflows/:id/regenerate
GET    /api/design-workflows/:id/result
```

Nếu repo dùng:
- GraphQL;
- Server Actions;
- tRPC;
- RPC khác;

thì giữ convention hiện tại.

---

# 38. Security

Không expose:
- API key;
- system prompt private;
- internal secrets;
- provider credentials.

API key phải nằm:
- server-side;
- secret manager;
- env variables.

Không đưa key xuống client.

Validate:
- user input;
- workflow id;
- authorization;
- file upload nếu có.

---

# 39. Logging

Log:

```text
workflow_id
agent
provider
model
latency
status
retry_count
token_usage nếu provider trả về
```

Không log secret.

Không log sensitive user content trừ khi project đã có policy phù hợp.

---

# 40. Testing

Cần test ít nhất:

### Unit

- schema validation;
- state transition;
- score threshold;
- max iteration;
- error handling.

### Integration

Test pipeline:

```text
Product
→ Research
→ Architecture
→ Design
→ Critique
→ Final
```

### Failure

Test:
- malformed LLM output;
- timeout;
- rate limit;
- missing field;
- provider unavailable.

### UI

Test tối thiểu:
- loading;
- success;
- error;
- empty workflow;
- completed workflow.

---

# 41. Mock Provider

Phải có khả năng chạy local/test mà không tốn API.

Ví dụ:

```text
MockLLMProvider
```

trả structured fixture.

Điều này giúp:
- frontend development;
- testing;
- CI.

---

# 42. Acceptance Criteria

Feature được coi là hoàn thành khi:

- [ ] User có thể tạo một design workflow.
- [ ] Product Analyst chạy thành công.
- [ ] UX Researcher chạy thành công.
- [ ] UX Architect chạy thành công.
- [ ] UI Designer tạo 3 directions.
- [ ] UX Critic chấm điểm.
- [ ] Revision loop hoạt động.
- [ ] Loop dừng tối đa sau 3 lần.
- [ ] Accessibility review hoạt động.
- [ ] Design system review hoạt động.
- [ ] Có final structured UI spec.
- [ ] State được lưu hoặc ít nhất persist theo architecture hiện tại.
- [ ] Refresh không làm mất workflow nếu project có DB.
- [ ] Error từ LLM không crash app.
- [ ] Output được schema validate.
- [ ] UI có loading/error/empty states.
- [ ] Không leak API key.
- [ ] Test chính pass.
- [ ] Lint pass.
- [ ] Typecheck pass.
- [ ] Build pass.

---

# 43. Definition of Done

Trước khi kết thúc task:

Chạy các command phù hợp với repo, ví dụ:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Không giả định command nếu repo khác.

Hãy đọc:

```text
package.json
README
Makefile
pyproject.toml
requirements.txt
docker-compose.yml
```

hoặc file tương đương để xác định command đúng.

---

# 44. Không được làm

Không:

- rewrite toàn project;
- thay framework chỉ vì thích framework khác;
- tạo duplicate component;
- bỏ qua loading/error state;
- parse output LLM một cách mong manh;
- để API key client-side;
- loop agent vô hạn;
- generate UI ngay trước khi hiểu UX;
- tạo ba phương án UI chỉ khác màu;
- hard-code toàn bộ design;
- tạo mock giả rồi coi là production complete;
- bỏ lint/type errors tồn tại do code mới tạo.

---

# 45. Thứ tự triển khai

Ưu tiên:

## P0

1. Repo analysis
2. Types/schema
3. AI provider abstraction
4. Agent abstraction
5. Workflow state
6. ProductAnalyst
7. UXResearcher
8. UXArchitect
9. UIDesigner
10. UXCritic
11. Revision loop
12. API / server orchestration

## P1

13. Workflow UI
14. Agent results UI
15. Final UI spec
16. Persistence
17. Accessibility reviewer
18. Design system reviewer

## P2

19. Visual preview
20. Code generation
21. Figma integration
22. Export
23. Collaboration
24. Version history

Không làm P2 nếu P0/P1 chưa ổn định.

---

# 46. Bước đầu tiên bạn phải làm

Trước khi sửa code, hãy tạo một analysis ngắn dựa trên repo:

```text
1. Current architecture
2. Relevant existing modules
3. What can be reused
4. Missing pieces
5. Proposed implementation plan
6. Files likely to be added
7. Files likely to be modified
8. Risks
```

Sau đó tiến hành implement.

Không yêu cầu user xác nhận từng bước trừ khi gặp blocker thực sự không thể tự quyết định.

---

# 47. Nguyên tắc tự quyết định

Nếu gặp lựa chọn implementation nhỏ:

Tự quyết định theo thứ tự:

```text
existing project convention
> simplicity
> maintainability
> type safety
> performance
> novelty
```

Không dừng lại hỏi user các quyết định nhỏ.

---

# 48. Final Report của Coding Agent

Sau khi implement xong, trả về:

```text
## Implemented

...

## Architecture

...

## Files Changed

...

## Tests

...

## Known Limitations

...

## Suggested Next Steps

...
```

Nêu rõ:
- command đã chạy;
- command nào pass;
- command nào fail;
- lỗi có phải do code mới hay tồn tại từ trước.

---

# 49. Product Principle

Toàn bộ hệ thống phải tuân theo nguyên tắc:

> AI không nên chỉ “vẽ UI”.
>
> AI phải hiểu bài toán, thiết kế luồng, tạo phương án, tự critique, kiểm tra accessibility và chỉ sau đó mới finalize giao diện.

Mục tiêu cuối:

```text
Useful
→ Usable
→ Consistent
→ Accessible
→ Beautiful
```

không phải:

```text
Beautiful
→ Done
```

---

# 50. Start Now

Bắt đầu bằng việc:

1. Inspect repository.
2. Xác định architecture hiện tại.
3. Map requirement trong file này vào codebase.
4. Tạo implementation plan ngắn.
5. Implement P0 trước.
6. Chạy test/lint/typecheck.
7. Tiếp tục P1 nếu không có blocker.
8. Chỉ kết thúc khi acceptance criteria tương ứng với scope đã triển khai được kiểm tra.

Do not stop after creating placeholders.
Do not stop after only generating prompts.
Build an end-to-end working vertical slice first.
