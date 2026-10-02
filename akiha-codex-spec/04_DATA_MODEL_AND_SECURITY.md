# Akiha — Data Model and Security

## 1. Nguyên tắc

- PostgreSQL là source of truth.
- Mọi table trong `public` bật RLS.
- Mọi quyền dựa trên `auth.uid()` và role trong `profiles`; client không truyền role tin cậy.
- Dùng `timestamptz` cho thời điểm tuyệt đối và `date` cho ngày gym tại Việt Nam.
- Streak được derive từ ngày check-in/protected; không có cột `current_streak` mutable.
- Nội dung reward bí mật tách khỏi record public để không lọt vào payload trước unlock.
- Mutation nhiều bước dùng transaction/RPC; side effect có idempotency key.

## 2. Enum đề xuất

```sql
create type public.app_role as enum ('user', 'admin');
create type public.reward_source as enum ('admin', 'user_proposal');
create type public.reward_status as enum (
  'proposed', 'rejected', 'active', 'unlocked', 'claimed', 'archived'
);
create type public.reward_rule_type as enum ('streak_days', 'total_checkins');
create type public.reaction_kind as enum (
  'normal', 'milestone', 'late_night', 'with_photo', 'without_photo'
);
create type public.notification_kind as enum ('daily_reminder', 'encouragement');
create type public.delivery_status as enum ('pending', 'sent', 'skipped', 'failed');
```

Không dùng enum cho mood nếu muốn thay copy dễ dàng; dùng text có check constraint.

## 3. Tables

### 3.1 `profiles`

| Cột | Kiểu | Quy tắc |
|---|---|---|
| `id` | uuid PK | FK `auth.users(id)` on delete cascade |
| `display_name` | text | required, 1–50 chars |
| `role` | app_role | default `user`, chỉ bootstrap/admin migration đổi |
| `avatar_path` | text null | private storage path |
| `timezone` | text | default `Asia/Ho_Chi_Minh` |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | trigger |

Chỉ đúng hai profile được tạo trong deployment thật.

### 3.2 `app_settings`

Single-row settings, dùng khóa cố định `default`.

| Cột | Kiểu | Quy tắc |
|---|---|---|
| `key` | text PK | `default` |
| `timezone` | text | `Asia/Ho_Chi_Minh` |
| `reminder_time` | time | default `19:00` |
| `reminder_enabled` | boolean | default true |
| `protected_days_per_month` | smallint | default 2, 0–5 |
| `updated_by` | uuid | admin |
| `updated_at` | timestamptz | default now() |

### 3.3 `checkins`

| Cột | Kiểu | Quy tắc |
|---|---|---|
| `id` | uuid PK | generated |
| `user_id` | uuid | FK profile; user chủ sở hữu |
| `local_date` | date | ngày được tính streak |
| `checked_in_at` | timestamptz | thời điểm submit thực |
| `mood` | text null | check trong 5 giá trị hỗ trợ |
| `note` | text null | max 280 chars |
| `created_by` | uuid | actor; user hoặc admin |
| `source` | text | `user`, `late_checkin`, `admin_backfill` |
| `correction_reason` | text null | bắt buộc cho admin backfill/correct |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | trigger |

Constraint bắt buộc:

```sql
unique (user_id, local_date)
```

Không cho client update `user_id`, `local_date`, `created_by`, `source` trực tiếp.

### 3.4 `moment_assets`

| Cột | Kiểu | Quy tắc |
|---|---|---|
| `id` | uuid PK | generated |
| `checkin_id` | uuid | FK checkins on delete cascade |
| `owner_id` | uuid | denormalized để RLS/storage mapping dễ hơn |
| `position` | smallint | 0–2 |
| `full_path` | text | private object path |
| `thumb_path` | text | private object path |
| `mime_type` | text | allowlist |
| `width`/`height` | integer | > 0 |
| `size_bytes` | integer | giới hạn server-side |
| `created_at` | timestamptz | default now() |

Constraints: unique `(checkin_id, position)`, tối đa 3 asset/check-in được enforce trong RPC/trigger.

### 3.5 `protected_days`

| Cột | Kiểu | Quy tắc |
|---|---|---|
| `id` | uuid PK | generated |
| `user_id` | uuid | Thu |
| `local_date` | date | ngày được protect |
| `reason` | text | 1–120 chars |
| `created_by` | uuid | admin |
| `created_at` | timestamptz | default now() |

Unique `(user_id, local_date)`. Không được trùng ngày có check-in. Quota tháng được kiểm tra transactionally.

### 3.6 `reaction_templates`

| Cột | Kiểu | Quy tắc |
|---|---|---|
| `id` | uuid PK | generated |
| `kind` | reaction_kind | pool |
| `text` | text | 1–180 chars |
| `asset_path` | text null | sticker private/shared |
| `milestone_value` | integer null | chỉ dùng kind milestone |
| `weight` | smallint | default 1, 1–100 |
| `is_active` | boolean | default true |
| `created_by` | uuid | admin |
| timestamps | timestamptz | standard |

### 3.7 `reaction_deliveries`

| Cột | Kiểu | Quy tắc |
|---|---|---|
| `id` | uuid PK | generated |
| `checkin_id` | uuid unique | đúng một reaction/check-in |
| `template_id` | uuid | FK template; có thể restrict delete |
| `rendered_text` | text | snapshot để template edit không đổi lịch sử |
| `rendered_asset_path` | text null | snapshot path |
| `context` | jsonb | milestone/photo/late-night flags |
| `created_at` | timestamptz | default now() |

Không random lại khi reload.

### 3.8 `rewards`

| Cột | Kiểu | Quy tắc |
|---|---|---|
| `id` | uuid PK | generated |
| `owner_id` | uuid | Thu |
| `source` | reward_source | admin/user proposal |
| `created_by` | uuid | actor |
| `title` | text | 1–100 chars; teaser-safe |
| `public_description` | text null | nội dung đọc được trước unlock |
| `is_mystery` | boolean | default false |
| `rule_type` | reward_rule_type | streak/total |
| `threshold` | integer | 1–10000 |
| `status` | reward_status | lifecycle |
| `approved_by/approved_at` | uuid/timestamptz null | review |
| `unlocked_at` | timestamptz null | set một lần |
| `claimed_at` | timestamptz null | admin set |
| `rejected_reason` | text null | optional user-visible |
| timestamps | timestamptz | standard |

Không cho user tự đổi status sau proposal.

### 3.9 `reward_secrets`

| Cột | Kiểu | Quy tắc |
|---|---|---|
| `reward_id` | uuid PK | FK rewards on delete cascade |
| `secret_type` | text | `letter`, `message`, `image` |
| `secret_text` | text null | nội dung locked |
| `secret_asset_path` | text null | private path |
| `created_by` | uuid | admin |
| `created_at` | timestamptz | default now() |

User chỉ select được row này qua policy/view/RPC khi reward tương ứng `unlocked|claimed`. Trước đó không trả `null` placeholder từ cùng row; tốt nhất không trả row.

### 3.10 `push_subscriptions`

| Cột | Kiểu | Quy tắc |
|---|---|---|
| `id` | uuid PK | generated |
| `user_id` | uuid | owner |
| `endpoint_hash` | text unique | lookup/idempotency |
| `endpoint` | text | sensitive |
| `p256dh`/`auth_key` | text | sensitive |
| `user_agent` | text null | truncated |
| `is_active` | boolean | default true |
| `last_success_at` | timestamptz null | health |
| timestamps | timestamptz | standard |

Không trả subscription của người khác; UI không cần đọc raw keys.

### 3.11 `notification_deliveries`

| Cột | Kiểu | Quy tắc |
|---|---|---|
| `id` | uuid PK | generated |
| `recipient_id` | uuid | Thu |
| `local_date` | date | idempotency date |
| `kind` | notification_kind | reminder/encouragement |
| `message_snapshot` | text | text đã gửi |
| `status` | delivery_status | state |
| `attempt_count` | smallint | retries |
| `last_error_code` | text null | sanitized |
| `sent_at` | timestamptz null | success |
| `created_by` | uuid null | admin nếu manual |
| timestamps | timestamptz | standard |

Unique partial/index cho daily reminder: `(recipient_id, local_date, kind)` khi kind `daily_reminder`.

### 3.12 `audit_logs`

Admin-only, append-only.

| Cột | Kiểu |
|---|---|
| `id` | bigint identity PK |
| `actor_id` | uuid |
| `action` | text |
| `entity_type` | text |
| `entity_id` | uuid null |
| `before` | jsonb null |
| `after` | jsonb null |
| `reason` | text null |
| `created_at` | timestamptz |

Không ghi secret content hoặc push keys vào audit JSON.

## 4. Helper functions

Tạo security-definer helper cẩn thận, đặt `search_path` rõ:

```sql
public.current_role() returns app_role
public.is_admin() returns boolean
public.local_today() returns date
```

Không expose helper có thể nhận arbitrary user id để bypass RLS.

## 5. RLS matrix

| Resource | User | Admin |
|---|---|---|
| profiles | đọc profile của hai người; sửa display/avatar của mình | đọc tất cả; role chỉ sửa qua bootstrap/migration |
| checkins | đọc của mình; insert qua RPC; sửa mood/note qua RPC | đọc tất cả; correction qua admin RPC |
| moment_assets | đọc/xóa asset của check-in mình qua RPC | đọc/xóa tất cả qua admin flow |
| protected_days | đọc của mình | CRUD qua admin RPC |
| reaction templates | đọc active templates không cần thiết ở client; ưu tiên chỉ server/RPC | CRUD |
| reaction deliveries | đọc delivery thuộc check-in mình | đọc tất cả |
| rewards | đọc reward owner mình; đề xuất qua RPC | CRUD/review |
| reward secrets | chỉ đọc khi reward unlocked/claimed | CRUD/read |
| push subscriptions | insert/update/delete của mình | không cần đọc raw trừ service function |
| deliveries | đọc summary của mình nếu cần | đọc tất cả |
| audit logs | không | read-only |

Admin không mặc định bypass RLS từ browser. Policy admin dùng `is_admin()`; service role chỉ dành background function thật sự cần.

## 6. Storage policies

Bucket `moments` private:

- User upload chỉ dưới prefix chính `auth.uid()`.
- Metadata row/RPC phải xác nhận check-in owner trùng path owner.
- User đọc object của mình; admin đọc object khi `is_admin()`.
- Chỉ cho MIME allowlist và giới hạn size bằng application validation; thêm storage policy nếu platform hỗ trợ metadata cần thiết.
- Không dùng predictable signed URL lâu dài.

Bucket `app-assets` có thể public cho icon/illustration không nhạy cảm. Sticker mặt Vinh nếu coi là private thì giữ private.

## 7. Views/RPC output

### `home_state`

Trả đúng dữ liệu cần:

- today/local timezone
- today check-in summary
- current/longest streak
- assigned reaction
- next active rewards + progress
- pending unlocks

### `calendar_month`

Một row/ngày có dữ liệu:

- `local_date`, `state`, mood/note summary
- thumbnail paths + count
- protected flag
- unlocked reward count

Không trả full asset path nếu calendar chỉ cần thumb.

## 8. Indexes

Tối thiểu:

```sql
checkins (user_id, local_date desc)
protected_days (user_id, local_date desc)
moment_assets (checkin_id, position)
rewards (owner_id, status, created_at desc)
reaction_templates (kind, is_active)
notification_deliveries (recipient_id, local_date desc)
audit_logs (created_at desc)
```

## 9. Migration/seed

- Migrations ordered, immutable sau khi đã deploy.
- Seed local gồm hai deterministic test users nếu Supabase local hỗ trợ, reaction/reminder templates và sample reward.
- Production account phải invite/create thủ công; không commit email/password thật.
- Seed không chứa ảnh thật của người dùng.

## 10. Security test bắt buộc

- Anonymous không đọc bất kỳ private table/object nào.
- User không tự đổi role.
- User không đọc reward secret trước unlock bằng direct REST query.
- User không tạo protected day hoặc approve reward của mình.
- User không upload vào prefix người khác.
- User không backdate ngoài grace period bằng cách gọi RPC trực tiếp.
- Admin API từ user token trả 403/permission denied.
- Service key không xuất hiện trong client bundle hoặc browser network payload.

