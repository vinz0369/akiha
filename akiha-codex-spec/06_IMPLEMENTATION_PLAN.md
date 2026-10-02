# Akiha — Implementation Plan for Codex Agent

## 1. Cách thực hiện

Làm theo phase. Sau mỗi phase:

1. Chạy lint/typecheck/test liên quan.
2. Ghi ngắn phần đã hoàn thành và deviation.
3. Không bắt đầu animation polish khi security/data invariant chưa pass.

## Phase 0 — Bootstrap

### Tasks

- Tạo Next.js App Router project TypeScript strict.
- Cấu hình Tailwind, ESLint, Prettier nếu dùng, Vitest và Playwright.
- Tạo folder conventions rõ: `app`, `components`, `features`, `lib`, `supabase`, `tests`.
- Tạo design tokens và mobile app shell.
- Thêm `.env.example`, validation env khi boot.
- Khởi tạo Supabase CLI local config và migration đầu tiên.

### Exit criteria

- App chạy local.
- Lint/typecheck/unit smoke pass.
- Không có secret thật trong repository.

## Phase 1 — Database, auth và security baseline

### Tasks

- Tạo enum/tables/index/trigger theo `04_DATA_MODEL_AND_SECURITY.md`.
- Bật RLS cho mọi table.
- Tạo helper role an toàn và policies cơ bản.
- Tạo private storage buckets/policies.
- Tạo seed reaction/reminder và local test users.
- Implement login/logout/session refresh và route protection.
- Viết RLS test trước khi làm admin UI.

### Exit criteria

- Anonymous bị chặn.
- Thu không vào admin route hoặc gọi admin RPC.
- Vinh có quyền đúng; role không sửa từ client.
- Reward secret test không bị lộ.

## Phase 2 — Check-in vertical slice

### Tasks

- Implement `create_checkin` transactional RPC.
- Implement date/grace period/idempotency.
- Tạo image preprocessing, upload full/thumb và orphan cleanup strategy.
- Xây Home chưa check-in, composer và success state.
- Assign reaction snapshot trong transaction.
- Giữ draft khi upload/network fail.

### Exit criteria

- Happy path từ login → check-in → success chạy E2E.
- Double click/request retry chỉ có một check-in/reaction.
- Check-in không ảnh hoạt động.
- Full ảnh không được calendar request.

## Phase 3 — Streak và Calendar

### Tasks

- Implement pure streak functions và SQL/RPC aggregation.
- Home hiển thị current/longest streak chính xác.
- Xây calendar month 7 cột và mọi cell state.
- Moment detail/edit, multi-image `+N`.
- Month summary.

### Exit criteria

- Test boundary today/yesterday/gap/protected/timezone pass.
- Calendar 360 px không horizontal scroll.
- 12 tháng điều hướng không N+1 request.

## Phase 4 — Rewards

### Tasks

- Implement lifecycle, proposal/review và auto-unlock.
- Tách secret content và enforce RLS.
- Xây Rewards user UI, proposal form, unlock celebration.
- Xây Admin reward CRUD/review/claim.
- Handle multiple simultaneous unlocks.

### Exit criteria

- Streak và total-checkins rule đúng.
- Secret không xuất hiện trong API/browser trước unlock.
- Retry/correction không double-unlock hoặc tự relock.

## Phase 5 — Admin và protected day

### Tasks

- Overview và quick actions.
- Reaction CRUD, weights, kinds, milestone.
- Check-in backfill/correction/delete flow có reason + audit.
- Protected day quota và calendar state.
- Admin settings cho reminder time/quota.

### Exit criteria

- User token không gọi được các action trên.
- Quota protected day race-safe.
- Historical correction recompute đúng và không relock reward.

## Phase 6 — PWA và reminders

### Tasks

- Manifest, icons, maskable, service worker, install instructions.
- Push subscribe/unsubscribe/test flow.
- Supabase Edge Function gửi Web Push.
- pg_cron scheduling, message selection, idempotency và cleanup invalid subscriptions.
- In-app reminder fallback.

### Exit criteria

- App install được trên ít nhất Android Chrome và kiểm tra hướng dẫn iOS Safari.
- Không prompt notification khi chưa có user gesture.
- Đã check-in → không gửi reminder.
- Scheduler retry → không duplicate.

## Phase 7 — Polish, QA và deploy

### Tasks

- Motion/reduced-motion.
- Empty/loading/error/offline states.
- Accessibility pass.
- Performance pass; calendar thumbnails và bundle inspection.
- README setup/deploy/account bootstrap/backup.
- Deploy preview rồi production Vercel; apply Supabase migration/seed an toàn.
- Smoke test production bằng cả hai role.

### Exit criteria

- Toàn bộ checklist `07_TESTING_AND_ACCEPTANCE.md` pass hoặc deviation được ghi rõ.
- Production không dùng test accounts/password.
- RLS/storage policies đã xác minh trên hosted Supabase, không chỉ local.

## 2. Suggested repository structure

```text
app/
  (auth)/login/
  (user)/
    page.tsx
    check-in/
    calendar/
    moments/[date]/
    rewards/
    settings/
  admin/
  api/
components/
features/
  auth/
  checkins/
  calendar/
  rewards/
  reactions/
  notifications/
lib/
  dates/
  validation/
  supabase/
  image/
public/
supabase/
  migrations/
  functions/send-reminder/
  seed.sql
tests/
  unit/
  integration/
  e2e/
```

Không bắt buộc giữ nguyên nếu framework convention khác, nhưng tránh folder `utils` thành nơi chứa mọi logic.

## 3. Component boundaries

- `StreakHero`: presentation, nhận value/status đã derive.
- `CheckInComposer`: form/draft; không chứa authorization.
- `CalendarGrid`: deterministic date grid; không tự fetch.
- `CalendarCell`: state visual + accessible label.
- `RewardCard`: chỉ nhận data đã được phép; không nhận secret locked.
- `ReactionCard`: render snapshot delivery.
- `AdminGuard`: UX boundary; server/RLS vẫn là authorization thật.

## 4. Dependency policy

Chỉ thêm package khi:

- giải quyết browser/platform edge case đáng kể;
- được duy trì và tree-shake tốt;
- không duplicate native/đã có capability.

Đặc biệt cân nhắc kỹ package PWA, image compression và web-push. Ghi version/rationale trong PR hoặc README.

## 5. Deployment checklist

- Vercel project trên Hobby/personal project.
- Environment variables tách preview/production.
- Supabase production migrations được apply theo thứ tự.
- Tạo/invite hai account và gán role bằng trusted bootstrap process.
- Disable public signup nếu configuration cho phép; dù vậy RLS không dựa vào việc này.
- Bucket private và policy production kiểm tra bằng hai token thật.
- Edge Function secrets + cron configured.
- Custom domain là optional; app chạy được trên Vercel URL.
- Verify timezone bằng một test request gần midnight nếu có thể mô phỏng.

## 6. Yêu cầu report của coding agent

Khi bàn giao, trả về:

- Các phase đã hoàn thành.
- Commands test và kết quả.
- Link/route để review từng role.
- Migrations mới.
- Environment variable còn cần người dùng cung cấp.
- Bất kỳ khác biệt nào so với spec, lý do và ảnh hưởng.
- Known limitations của PWA notification trên thiết bị đã thử.

