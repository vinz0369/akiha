# Akiha — Domain Rules

## 1. Time model

Canonical timezone: `Asia/Ho_Chi_Minh`.

- `now`: thời điểm tuyệt đối `timestamptz`.
- `local_date`: ngày calendar/streak tại timezone canonical.
- Client clock chỉ dùng hiển thị; server/database quyết định ngày hợp lệ.
- DST hiện không ảnh hưởng Việt Nam nhưng code không được hard-code offset `+07:00`; dùng IANA timezone.

## 2. Check-in validity

Một check-in hợp lệ khi:

- actor là user chính hoặc admin;
- target date là today; hoặc yesterday khi user submit trước/equal 02:00 local;
- target date chưa có check-in;
- mood/note/assets hợp lệ;
- admin backfill có reason.

Ảnh, note, mood, thời lượng và GPS **không phải điều kiện** tính streak.

### Pseudocode

```ts
function allowedUserDate(now, targetDate, timeZone) {
  const today = localDate(now, timeZone)
  if (targetDate === today) return true

  const yesterday = addDays(today, -1)
  return targetDate === yesterday && localTime(now, timeZone) <= '02:00:00'
}
```

RPC vẫn phải dùng unique constraint. Hai request đồng thời: một success, một trả existing check-in/idempotent response thay vì 500.

## 3. Streak model

### 3.1 Source set

```text
active_dates = checkin_dates ∪ protected_dates
```

Hai loại date đều giữ continuity, nhưng:

- `workout_count` chỉ đếm `checkin_dates`.
- `protected_days` không mở reward loại `total_checkins`.
- Reward `streak_days` đếm chiều dài chuỗi active date, kể cả protected day.

### 3.2 Current streak

Gọi `today` là ngày hiện tại.

- Nếu `today ∈ active_dates`, anchor = today.
- Nếu hôm nay chưa active nhưng `yesterday ∈ active_dates`, anchor = yesterday.
- Nếu cả today và yesterday đều không active, current streak = 0.
- Từ anchor đi lùi từng ngày đến gap đầu tiên; số ngày là current streak.

Nhờ vậy buổi sáng chưa đi gym không hiển thị streak = 0 khi ngày vẫn chưa kết thúc.

### 3.3 Longest streak

Sort unique active dates tăng dần; tìm run ngày liên tiếp dài nhất. Không phụ thuộc current date.

### 3.4 Ví dụ

| Ngày | State | Current streak cuối ngày | Workout count |
|---|---|---:|---:|
| Sep 1 | Check-in | 1 | 1 |
| Sep 2 | Check-in | 2 | 2 |
| Sep 3 | Protected | 3 | 2 |
| Sep 4 | Check-in | 4 | 3 |
| Sep 5 | Missed | 0 sau khi ngày kết thúc | 3 |
| Sep 6 | Check-in | 1 | 4 |

## 4. Protected day

- Chỉ admin.
- Chỉ target ngày quá khứ, chưa có check-in/protected.
- Mặc định quota 2 ngày theo calendar month của target date.
- Quota tính số protected day tồn tại trong tháng; gỡ một ngày trả lại quota.
- Không auto-apply; admin phải chủ động và nhập reason.
- Protect/unprotect trigger recompute reward eligibility.
- Nếu unprotect khiến streak-based reward đã unlock trở thành không còn hợp lệ, **không tự khóa lại reward**. Ghi audit và yêu cầu admin quyết định; user không bị mất một reward đã thấy.

## 5. Reaction selection

Reaction được chọn trong transaction tạo check-in và snapshot vào delivery.

### Priority

1. Exact milestone: current streak trùng `milestone_value`.
2. Late-night: actual local submit time từ 22:30 trở đi.
3. With-photo.
4. Without-photo.
5. Normal fallback.

Không nối nhiều reaction. Chỉ chọn một pool cao nhất có template active.

### Weighted random + anti-repeat

- Lấy template active trong pool.
- Loại các template xuất hiện trong 3 deliveries gần nhất nếu còn candidate.
- Random theo `weight`.
- Nếu pool rỗng, fallback `normal`.
- Nếu mọi pool rỗng, dùng hardcoded safe fallback `You showed up ♡` và log warning.

Refresh/retry không chọn lại vì `reaction_deliveries.checkin_id` unique.

## 6. Reward lifecycle

### 6.1 Admin-created reward

Tạo ở trạng thái `active` hoặc draft nội bộ nếu implementation bổ sung draft. Khi active, progress bắt đầu được derive từ toàn bộ source-of-truth hiện tại, không chỉ từ ngày tạo trừ khi sau này thêm `starts_at`.

### 6.2 User proposal

- User tạo `proposed`.
- Admin `reject` hoặc approve; approve chuyển thành `active` và có thể sửa threshold/title.
- Nếu ngay lúc approve metric đã đạt threshold, unlock ngay trong cùng transaction.

### 6.3 Progress

```ts
if (ruleType === 'streak_days') progress = currentStreak
if (ruleType === 'total_checkins') progress = allTimeCheckinCount
```

UI clamp progress bar ở threshold nhưng vẫn có thể hiển thị số thực khi phù hợp.

### 6.4 Unlock

- Chỉ reward `active` được xét.
- Nếu progress >= threshold: set `status='unlocked'`, `unlocked_at=now()` nếu chưa set.
- Mutation idempotent; retry không tạo celebration/delivery thứ hai.
- Nhiều reward có thể unlock cùng một check-in; UI hiển thị tuần tự.
- Claimed chỉ do admin set và không thay đổi achievement history.

### 6.5 Secret content

- Trước unlock: user chỉ thấy teaser-safe fields từ `rewards`.
- Sau unlock/claimed: RPC mới join/return `reward_secrets`.
- Không gửi secret về client rồi chỉ ẩn bằng CSS.

## 7. Edit/delete semantics

### Edit moment

- User được sửa mood/note và asset order.
- Việc sửa/xóa ảnh không ảnh hưởng streak.
- `updated_at` thay đổi; reaction đã gán không random lại.

### Delete check-in

- User UI không expose hard delete trực tiếp trong V1; có thể request correction hoặc admin thực hiện.
- Admin delete/correct cần reason và audit.
- Sau delete: recompute streak/reward progress.
- Reward đã unlocked không auto-relock; audit discrepancy.
- Storage object xóa sau DB transaction bằng retryable cleanup; không để DB thất bại vì object đã mất.

## 8. Reminder rules

### Eligibility

Daily reminder được gửi khi tất cả đúng:

- reminder enabled;
- local time nằm trong scheduler window gần `reminder_time`;
- hôm nay chưa có check-in;
- có ít nhất một active push subscription;
- chưa có successful/pending daily reminder cho `(recipient, local_date)`.

### Scheduler idempotency

1. Transaction insert delivery `pending` với unique key.
2. Conflict nghĩa là skip.
3. Gửi đến active subscriptions.
4. Ít nhất một success → `sent`; tất cả permanent failure → `failed`; không có subscription → `skipped`.
5. Retry chỉ cho transient failure với capped attempts.

Nếu check-in xảy ra sau bước 1 nhưng trước send, function phải recheck ngay trước send và chuyển `skipped`.

### Message selection

- Random từ active reminder pool, tránh message gần nhất nếu có thể.
- Snapshot message vào delivery.
- Payload chứa route `/` và copy ngắn; không chứa ảnh riêng tư.

## 9. Manual encouragement

- Admin chọn template hoặc nhập text tối đa 180 chars.
- Rate limit đề xuất: không quá 3 lần/giờ và chống double-submit trong 30 giây bằng idempotency token.
- Nếu push unavailable, lưu delivery failed/skipped; không cần SMS/email fallback V1.

## 10. Calendar aggregation

- Week bắt đầu Monday.
- Query month phải bao gồm đúng local dates; không group theo UTC date.
- Cover = asset `position=0`.
- Memory count = số check-in có ít nhất một asset, hoặc số ảnh; chọn một nghĩa và label rõ. V1 dùng **số check-in có ảnh** cho `memories`, số ảnh hiển thị riêng khi cần.
- Longest streak in month: longest consecutive active run giao với month, tính phần nằm trong tháng; không kéo số ngày ngoài tháng vào label tháng.

## 11. Invariants

Các invariant sau phải có test và/hoặc constraint:

1. Một user/date tối đa một check-in.
2. Một check-in tối đa ba ảnh và một reaction delivery.
3. Protected date không trùng check-in date.
4. User không backdate ngoài grace period.
5. Chỉ admin protect/correct/approve/claim.
6. Secret reward không đọc được trước unlock.
7. Notification daily không gửi trùng.
8. Tất cả ngày nghiệp vụ dùng cùng timezone canonical.
9. Retry check-in không double-unlock hoặc double-reaction.
10. Reward đã unlock không tự relock do historical correction.

