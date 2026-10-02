# Akiha — Codex Agent Handoff

## Nhiệm vụ

Xây dựng **Akiha**, một PWA riêng tư dành cho đúng hai tài khoản:

- **Thu — user:** check-in việc đã đến phòng gym, lưu ảnh/kỷ niệm, duy trì streak và nhận phần thưởng.
- **Vinh — admin:** quản lý reaction, reward, lời nhắc, protected day và nội dung dành riêng cho Thu.

Akiha không phải ứng dụng theo dõi fitness chuyên sâu. Giá trị chính là:

> **Consistency + emotion + memory.**

Thông điệp sản phẩm:

> **10 minutes still counts. Just show up.**

## Cách dùng bộ tài liệu

Đọc theo thứ tự:

1. `01_PRODUCT_REQUIREMENTS.md`
2. `02_UX_UI_SPEC.md`
3. `03_TECHNICAL_ARCHITECTURE.md`
4. `04_DATA_MODEL_AND_SECURITY.md`
5. `05_DOMAIN_RULES.md`
6. `06_IMPLEMENTATION_PLAN.md`
7. `07_TESTING_AND_ACCEPTANCE.md`

Nếu có mâu thuẫn, ưu tiên theo thứ tự:

1. Quy tắc nghiệp vụ trong `05_DOMAIN_RULES.md`.
2. Yêu cầu sản phẩm trong `01_PRODUCT_REQUIREMENTS.md`.
3. Schema và security trong `04_DATA_MODEL_AND_SECURITY.md`.
4. UX/UI và chi tiết triển khai.

## Quyết định đã chốt — không hỏi lại

- V1 chỉ dành cho gym.
- Một ngày chỉ cần có check-in hợp lệ là được tính streak; không yêu cầu thời lượng, GPS hay ảnh.
- Ảnh và mood là optional.
- Streak tính theo ngày liên tiếp, múi giờ `Asia/Ho_Chi_Minh`.
- Có late check-in cho ngày hôm trước đến 02:00 sáng; admin có thể backfill ngày cũ.
- Có tối đa 2 protected days mỗi tháng, chỉ admin sử dụng.
- Reward mở khóa tự động; Thu có thể đề xuất reward và Vinh duyệt.
- Có thể có nhiều reward active song song.
- Reaction sau check-in được chọn theo rule từ pool seed sẵn, không dùng AI.
- UI pastel, cute, tối giản; ảnh là phần nhiều màu nhất.
- Mobile-first PWA, deploy Vercel; Supabase dùng cho Auth, PostgreSQL và Storage.
- Không public registration. Chỉ có hai account được seed/invite thủ công.
- V1 không có social, leaderboard, calories, cân nặng, BMI, exercise/set/rep hay AI.

## Nguyên tắc phát triển

- Dùng TypeScript strict; không dùng `any` nếu không có giải thích.
- Database và RLS là nguồn thực thi quyền hạn; không tin role từ client.
- `checkins` và `protected_days` là source of truth. Không lưu `current_streak` như counter có thể lệch.
- Mọi mutation quan trọng phải idempotent hoặc được bảo vệ bởi unique constraint.
- Business logic quan trọng phải nằm trong hàm thuần hoặc transaction/RPC có test.
- Không thêm backend Python, Redis, queue, microservice hay state manager phức tạp.
- Tối ưu trải nghiệm trên màn hình 360–430 px trước desktop.
- Không log access token, nội dung reward bí mật, URL ảnh ký hoặc thông tin nhạy cảm.
- Ảnh phải resize/compress trước upload; calendar chỉ tải thumbnail.
- Hoàn thành từng phase, chạy test và commit nhỏ; không xây tất cả rồi mới kiểm thử.

## Stack mặc định

- Next.js App Router + TypeScript
- Tailwind CSS
- Motion for React
- Supabase JS + SSR helpers
- PostgreSQL migrations qua Supabase CLI
- PWA manifest + service worker
- Vitest + Testing Library
- Playwright cho E2E
- Zod cho validation ở boundary

Không tự đổi framework hoặc thêm dependency lớn nếu không chứng minh được giá trị trực tiếp cho V1.

## Definition of Done tổng thể

Sản phẩm chỉ được coi là hoàn thành khi:

- User có thể đăng nhập, check-in trong dưới 3 thao tác và thấy streak mới ngay.
- Check-in lặp lại không tạo hai bản ghi trong cùng ngày.
- Calendar hiển thị đúng ảnh thumbnail, ngày check-in không ảnh, protected day và ngày trống.
- Reward tự unlock đúng rule và nội dung bí mật không thể đọc trước khi unlock.
- User đề xuất reward; admin duyệt, sửa hoặc từ chối được.
- Reaction đúng pool và tránh lặp gần nhất.
- Reminder không gửi nếu đã check-in và không gửi trùng trong cùng ngày.
- Admin thao tác được nhưng user không truy cập được API/data admin bằng cách gọi trực tiếp.
- Ảnh nằm trong private bucket và chỉ hai account hợp lệ đọc được theo policy.
- PWA cài được; offline shell có fallback hợp lý; push có hướng dẫn bật và có in-app fallback.
- Unit, integration, RLS và E2E critical path đều pass.
- Lighthouse mobile không có lỗi accessibility nghiêm trọng; không có horizontal scroll ở 360 px.

## Output mong đợi từ coding agent

Ngoài source code, agent phải tạo:

- `.env.example`
- `README.md` với setup local, Supabase và deploy
- migrations + seed data
- hướng dẫn tạo hai account và gán role
- hướng dẫn cấu hình PWA/Web Push/reminder scheduler
- test suite và báo cáo các phần chưa thể tự động xác minh
- danh sách quyết định kỹ thuật mới nếu phải lệch khỏi bộ spec này

