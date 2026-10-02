# Akiha — Testing and Acceptance Criteria

## 1. Test strategy

| Layer | Mục tiêu | Công cụ đề xuất |
|---|---|---|
| Unit | Date, streak, reward, reaction selection | Vitest |
| Component | Form, calendar cell/grid, reward state | Testing Library |
| Database/RLS | Constraint, policy, RPC, concurrency | Supabase local + SQL tests |
| Integration | Upload → RPC → read model | Vitest/Node against local Supabase |
| E2E | Critical user/admin flows | Playwright |
| Manual device | PWA install, camera picker, notification | iOS Safari + Android Chrome |

Không mock business logic trong E2E critical path; dùng local/test Supabase thật.

## 2. Unit test matrix

### Dates and grace period

- Today ở 00:00, 12:00, 23:59 hợp lệ.
- Yesterday ở 01:59 hợp lệ; 02:01 bị chặn.
- Day before yesterday bị chặn với user.
- Admin backfill past date hợp lệ khi có reason.
- UTC date khác local date vẫn chọn đúng Việt Nam.
- Leap day, month/year boundary.

### Current streak

- Không data → 0.
- Chỉ today → 1.
- Chỉ yesterday → 1 trước khi today kết thúc.
- Chuỗi đến yesterday → giữ nguyên vào sáng today.
- Gap ở yesterday và today trống → 0.
- Protected day nối hai check-in.
- Duplicate input dates không làm tăng streak.
- Future date bị bỏ qua/không tồn tại do validation.

### Longest streak

- Nhiều runs chọn run dài nhất.
- Tie không ảnh hưởng value.
- Protected day được tính continuity.
- Month summary cắt đúng boundary.

### Reward

- Threshold chưa đạt/đạt/vượt.
- Hai rewards unlock cùng check-in.
- Retry không đổi `unlocked_at` hoặc tạo event thứ hai.
- Approve proposal khi metric đã đạt → unlock ngay.
- Protected day ảnh hưởng streak reward nhưng không total-checkins reward.
- Historical delete không auto-relock reward.

### Reaction

- Exact milestone ưu tiên.
- Late-night ưu tiên photo pool nếu không milestone.
- With/without photo đúng pool.
- Loại 3 reaction gần nhất khi có candidate.
- Weighted selection chỉ chọn active template.
- Pool rỗng fallback normal rồi safe default.

## 3. Database and RLS tests

### Constraints/concurrency

- Hai insert cùng user/date: đúng một row.
- Hai request check-in retry: đúng một reaction delivery và một lần unlock.
- Không tạo asset position 3 hoặc asset thứ tư.
- Protected day không trùng check-in.
- Hai admin request dùng protected quota cuối cùng: chỉ một success.
- Daily reminder unique key chặn duplicate.

### Permissions

- Anonymous select/insert/update/delete bị chặn.
- Thu chỉ sửa mood/note của check-in mình qua flow cho phép.
- Thu không set local_date/created_by/source tùy ý.
- Thu không CRUD templates, protect day, review/claim reward.
- Thu không đọc audit log hoặc raw subscription khác.
- Thu không đọc `reward_secrets` khi active.
- Thu đọc secret khi unlocked/claimed.
- Vinh làm admin actions được nhưng secret/service key không nằm client.
- Storage prefix traversal/owner mismatch bị chặn.

## 4. Component tests

- Home chuyển đúng giữa chưa/đã check-in.
- Composer submit được khi tất cả optional field trống.
- Draft giữ lại sau upload/network error.
- Character count/validation note.
- Calendar grid Monday-first cho tháng bắt đầu mỗi weekday.
- Calendar cell từng state có visual + accessible label.
- `+N` đúng khi nhiều ảnh.
- Reward mystery không render secret node trong DOM trước unlock.
- Reduced motion không chạy spring/confetti dài.
- Notification button chỉ gọi permission từ click.

## 5. E2E critical paths

### E2E-01 — First check-in without photo

1. Thu login.
2. Home streak 0/chưa check-in.
3. Open composer, không nhập optional field.
4. Submit.
5. Thấy success, reaction và streak 1.
6. Reload: state/reaction giữ nguyên.
7. Calendar cell hôm nay là check-in không ảnh.

### E2E-02 — Check-in with images

1. Chọn 2 ảnh lớn.
2. Client tạo preview/compress; submit.
3. Calendar chỉ request thumbs, badge `+1`.
4. Detail mở full image khi cần.
5. Remove một ảnh; streak không đổi.

### E2E-03 — Duplicate and retry

1. Double-click submit hoặc resend request.
2. Chỉ một check-in, một delivery, một unlock event.
3. UI nhận existing result, không báo lỗi mơ hồ.

### E2E-04 — Late check-in

- Mô phỏng 01:30: chọn Yesterday và success.
- Mô phỏng 02:30: option ẩn/disabled, direct call bị chặn.

### E2E-05 — Reward proposal/unlock

1. Thu đề xuất reward.
2. Vinh thấy pending, chỉnh threshold và approve.
3. Thu thấy active progress.
4. Check-in đạt threshold → unlock celebration.
5. Vinh mark claimed; Thu thấy trong Memories.

### E2E-06 — Secret letter

1. Admin tạo mystery reward + letter.
2. Thu trước unlock không tìm thấy secret trong DOM/network response.
3. Sau threshold, `Open letter` đọc được.

### E2E-07 — Protected day

1. Chuỗi check-in có một gap quá khứ.
2. Admin protect gap; streak nối lại, calendar hiện protected icon.
3. Protected count không tăng workout count.
4. Vượt quota bị chặn rõ.

### E2E-08 — Reminder

1. Có subscription, chưa check-in, scheduler window đúng → một push.
2. Scheduler chạy lại → không thêm push.
3. Đã check-in trước window → delivery skipped/no push.
4. Subscription expired → deactivate.

### E2E-09 — Authorization

1. Thu điều hướng `/admin` → redirect/403.
2. Thu gọi trực tiếp admin RPC → permission denied.
3. Anonymous URL ảnh → không đọc được.

## 6. Manual QA matrix

| Area | iOS Safari installed | Android Chrome installed | Desktop Chrome |
|---|---|---|---|
| Login/session | Required | Required | Required |
| Camera/gallery picker | Required | Required | Optional |
| Image orientation | Required | Required | Required |
| Add to Home Screen | Required | Required | N/A |
| Standalone safe area | Required | Required | N/A |
| Push permission/test | Required nếu hỗ trợ | Required | Required |
| Offline shell/draft | Required | Required | Optional |
| Calendar 390/360 px | Required | Required | Required responsive |

Ghi browser/OS version trong QA note; không hứa support một platform chưa test.

## 7. Performance acceptance

- Calendar month không tải full-size images.
- Không có image upload nguyên bản nhiều MB nếu resize thành công.
- Không có request loop hoặc duplicate fetch rõ ràng.
- Home interactive hợp lý trên mobile 4G; mục tiêu LCP < 2.5 s.
- CLS thấp; skeleton giữ kích thước card/calendar.
- Bundle không chứa service-role/VAPID private key.

## 8. Accessibility acceptance

- Keyboard đi qua mọi action desktop.
- Visible focus.
- Modal focus trap và restore focus.
- Contrast text/action đạt WCAG AA nơi áp dụng.
- Calendar có semantic labels đầy đủ.
- Screen reader hiểu success/reward unlock qua live region không spam.
- Reduced motion hoạt động.
- Tap target >= 44 px.

## 9. Product acceptance checklist

- [ ] Check-in tối đa 3 thao tác từ Home.
- [ ] Check-in không ảnh/note/mood vẫn hợp lệ.
- [ ] Streak semantics đúng tài liệu.
- [ ] Calendar là signature view và nhìn rõ ở 360 px.
- [ ] Reaction ổn định sau reload.
- [ ] Reward proposal, active, unlock, claim hoàn chỉnh.
- [ ] Secret content thực sự được bảo vệ phía data.
- [ ] Admin correction/protected day có audit.
- [ ] Reminder có opt-in, idempotency và in-app fallback.
- [ ] Không có public signup path trong UI.
- [ ] Không có fitness analytics ngoài scope.
- [ ] UI pastel/cute nhưng mỗi màn không lạm dụng màu/animation.

## 10. Release gate

Không deploy production nếu còn một trong các lỗi:

- RLS bypass hoặc secret reward/image bị đọc trái phép.
- Duplicate check-in/unlock/reminder trong concurrency test.
- Sai local date quanh midnight.
- Xóa/correct check-in làm database và storage mất nhất quán không có recovery.
- Service secret xuất hiện client-side.
- Critical E2E login → check-in → calendar/reward fail.

Các hạn chế push notification theo browser có thể được chấp nhận nếu documented và in-app fallback hoạt động.

