# Akiha — Product Requirements Document

## 1. Tóm tắt sản phẩm

Akiha là ứng dụng riêng tư do Vinh làm cho Thu, giúp Thu hình thành thói quen **ngày nào cũng xuất hiện ở phòng gym**, dù chỉ tập 10 phút. App biến sự đều đặn thành kỷ niệm trực quan thông qua streak, calendar ảnh, reaction của Vinh và reward.

App chỉ có một user và một admin, không có đăng ký công khai và không hướng tới mô hình multi-tenant trong V1.

## 2. Product principles

1. **Show up > perfect workout.** Check-in là đủ; không đánh giá cường độ.
2. **Emotion > analytics.** Kỷ niệm, lời động viên và reward quan trọng hơn biểu đồ fitness.
3. **Low friction.** Luồng chính phải nhanh, không biến thành form nhập liệu.
4. **Private by design.** Dữ liệu và ảnh chỉ thuộc về hai người.
5. **Cute, not childish.** Pastel và chuyển động mềm nhưng vẫn sạch, dễ đọc.
6. **Backend boring, frontend polished.** Ít service, logic rõ và an toàn.

## 3. Personas và quyền

### Thu — User

- Check-in hôm nay hoặc late check-in hôm qua trong grace period.
- Thêm tối đa 3 ảnh, mood và note ngắn; tất cả optional.
- Xem calendar, streak, moments và reward.
- Đề xuất reward cho bản thân.
- Chỉnh nội dung moment của mình và xóa ảnh sau confirmation.
- Bật/tắt push notification trên thiết bị của mình.

### Vinh — Admin

- Có toàn bộ quyền xem của user.
- Quản lý reaction và reminder message.
- Tạo, sửa, duyệt, từ chối, archive và đánh dấu reward đã trao.
- Tạo reward bí mật hoặc letter chỉ hiển thị sau khi unlock.
- Backfill/correct check-in và áp dụng protected day.
- Xem overview, thao tác audit cơ bản và gửi encouragement thủ công.

## 4. Mục tiêu V1

- Thu có thể hoàn thành check-in hằng ngày trong vài giây.
- Streak tạo động lực nhưng không phá hỏng trải nghiệm khi có sự cố ngoài ý muốn.
- Calendar trở thành visual memory map: nhìn vào tháng là thấy các ngày đã xuất hiện.
- Reward và reaction tạo cảm giác app được làm riêng cho Thu.
- Hệ thống hoạt động ở chi phí nền tảng gần bằng 0 cho hai tài khoản.

## 5. Ngoài phạm vi V1

- Social, friend list, leaderboard, share công khai.
- GPS/geofencing hoặc xác minh có mặt tại phòng gym.
- Workout plan, exercise, set, rep, weight, calories, BMI, body measurement.
- AI chatbot, AI recommendation hoặc AI-generated reaction.
- Subscription, payment, marketplace.
- Native iOS/Android app.
- Nhiều habit khác gym.
- Video/voice note; schema có thể mở rộng sau nhưng UI V1 không cần hỗ trợ.

## 6. Information architecture

### User navigation

- `/` — Home / Today
- `/check-in` — Check-in composer
- `/calendar` — Calendar và month summary
- `/moments/[date]` — Chi tiết ngày
- `/rewards` — Reward đang chạy, đã unlock và đã nhận
- `/settings` — Profile tối thiểu, notification và install guide

Bottom navigation mobile: **Today · Calendar · Rewards**.

### Admin navigation

- `/admin` — Overview
- `/admin/check-ins` — Backfill/correct/protect
- `/admin/rewards` — Reward lifecycle
- `/admin/reactions` — Reaction/reminder pool
- `/admin/settings` — Reminder time, quota protected day, content defaults

Admin không cần bottom navigation riêng; dùng tab/segment đơn giản.

## 7. Functional requirements

### FR-01 — Authentication

- Không hiển thị sign-up.
- Login bằng email/password hoặc magic link; chọn một phương án và ghi rõ trong README.
- Route user yêu cầu session hợp lệ; route admin yêu cầu role `admin` được kiểm tra server-side và RLS.
- Logout và session refresh hoạt động trên PWA.

### FR-02 — Home / Today

- Hiển thị ngày hiện tại theo giờ Việt Nam.
- Hiển thị current streak, trạng thái đã/chưa check-in và reward gần nhất.
- Nếu chưa check-in: CTA chính `Check in ♡`, copy `10 minutes still counts.`
- Nếu đã check-in: hiển thị `You showed up.`, streak mới và reaction được gán cho ngày đó.
- Không hiển thị dashboard analytics dày đặc.

### FR-03 — Check-in

- Một local date tối đa một check-in.
- Check-in không cần ảnh, duration, location hoặc mô tả.
- Optional: mood, note tối đa 280 ký tự, 0–3 ảnh.
- Client resize/compress ảnh trước upload; tạo thumbnail riêng.
- Submit có trạng thái loading rõ; retry không tạo duplicate.
- Sau success, chạy celebration 1.5–2.5 giây rồi cho phép bỏ qua.

### FR-04 — Late check-in và correction

- Từ 00:00 đến 02:00, user có thể chọn `Workout was yesterday` với confirmation.
- Sau 02:00, chỉ admin backfill/correct được.
- Admin mutation phải lưu actor, thời gian và lý do ngắn.
- Xóa check-in yêu cầu confirmation mạnh vì có thể ảnh hưởng streak/reward.

### FR-05 — Calendar / Moments

- Calendar tháng full-width, đúng 7 cột.
- Có ảnh: cell dùng thumbnail cover và overlay số ngày.
- Check-in không ảnh: nền pastel + icon hoa nhỏ.
- Protected day: ký hiệu riêng; không giả thành workout.
- Missed/future day: để trống; today có outline.
- Tap cell có dữ liệu mở detail/bottom sheet.
- Nhiều ảnh: cover ảnh đầu và badge `+N`.
- Month summary: workouts, memories, longest streak trong tháng và rewards unlocked.

### FR-06 — Streak

- Derive từ `checkins.local_date` và `protected_days.local_date`.
- Check-in tăng streak; protected day chỉ duy trì liên tục, không tăng total workouts.
- Missed day không được protect làm đứt streak.
- Current streak không về 0 chỉ vì hôm nay chưa kết thúc: nếu hôm qua vẫn liên tục thì hiển thị chuỗi đến hôm qua.
- Xem chi tiết rule trong `05_DOMAIN_RULES.md`.

### FR-07 — Reaction

- Mỗi check-in nhận đúng một reaction delivery ổn định, gồm text và optional sticker/image.
- Chọn pool theo context: normal, milestone, late-night, with-photo, without-photo.
- Milestone có ưu tiên cao hơn pool thông thường.
- Tránh lặp một reaction trong 3 delivery gần nhất khi pool đủ lớn.
- Admin CRUD và bật/tắt reaction.

### FR-08 — Reward

- Admin tạo reward công khai hoặc bí mật.
- User có thể đề xuất reward; reward chỉ active sau admin approval.
- Nhiều reward active song song.
- Rule V1: `streak_days` hoặc `total_checkins` với threshold nguyên dương.
- Khi đạt threshold, reward tự chuyển `unlocked` đúng một lần.
- Admin đánh dấu `claimed/given`; lưu thời điểm.
- Nội dung bí mật/letter không được client đọc trước khi unlock.

Reward lifecycle:

`proposed → approved/active → unlocked → claimed → archived`

Nhánh khác: `proposed → rejected`.

### FR-09 — Protected day

- Mặc định 2 lượt/tháng calendar, chỉ admin sử dụng.
- Chỉ áp dụng cho ngày quá khứ không có check-in.
- Không áp dụng cho ngày trước khi account bắt đầu hoặc ngày đã có protected day.
- Calendar phải ghi rõ đây là ngày được bảo vệ, không phải buổi tập.
- Admin có thể gỡ; reward/streak được recompute.

### FR-10 — Reminder và encouragement

- Reminder default 19:00 `Asia/Ho_Chi_Minh`, có thể đổi trong admin.
- Chỉ gửi nếu hôm đó chưa check-in, notification đã opt-in và chưa gửi reminder ngày đó.
- Message chọn ngẫu nhiên từ pool active; không gửi trùng do scheduler retry.
- Nếu push chưa được bật hoặc không được browser hỗ trợ, Home hiển thị in-app reminder.
- Admin có thể gửi encouragement thủ công; phải rate-limit để tránh double-click.

### FR-11 — Settings / PWA

- Có hướng dẫn `Add to Home Screen` phù hợp iOS/Android.
- Chỉ hỏi quyền notification sau hành động chủ động của user, không hỏi ngay khi mở app lần đầu.
- Hiển thị trạng thái notification và nút gửi test notification.
- PWA có icon, splash/theme color và offline shell.

## 8. Nội dung mặc định

### Reaction normal

- `Approved 😌`
- `+1. Anh thấy rồi nha 👀`
- `You showed up ♡`
- `Mai tiếp nhé 🌷`

### Reaction có ảnh

- `Có bằng chứng rồi nha 😌`
- `Akiha có thêm một kỷ niệm 🌸`

### Reaction không ảnh

- `Tin em lần này 👀`
- `Không cần ảnh. Em đã đi là được.`

### Milestone

- 7 ngày: `Một tuần rồi đó 🌷`
- 14 ngày: `Hai tuần không biến mất. Proud of you.`
- 30 ngày: `30 ngày??? Em nghiêm túc thật rồi ❤️`
- 100 ngày: `Một trăm lần em đã chọn xuất hiện.`

### Reminder

- `Hôm nay chưa thấy em đi gym nha 👀`
- `10 phút cũng được mà 🌷`
- `Streak đang đợi em đó.`
- `Akiha chưa có kỷ niệm hôm nay ♡`

## 9. Success metrics nội bộ

Không cần analytics bên thứ ba. Lưu aggregate/event tối thiểu để trả lời:

- Số ngày check-in trong 7 và 30 ngày gần nhất.
- Current và longest streak.
- Tỷ lệ check-in trước/sau reminder.
- Số moment có ảnh.
- Reward unlocked/claimed.

Không biến metric thành pressure trên UI user.

## 10. Priority

### P0 — Bắt buộc trước khi dùng thật

Auth, role, check-in, streak, calendar, image upload, reaction, reward cơ bản, RLS, PWA shell, tests critical path.

### P1 — Ngay sau P0

Push reminder, admin reaction/reward CRUD đầy đủ, reward proposal, protected day, locked letter, correction audit.

### P2 — Chỉ làm nếu P0/P1 ổn định

Monthly recap card, garden view, richer admin analytics, export/backup UX.

