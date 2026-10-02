# Akiha

Akiha là PWA nhật ký ảnh hằng ngày riêng tư dành cho Thu và Vinh.

## Trải nghiệm chính

- Hai tài khoản là hai thành viên ngang quyền trong cùng một `couple`.
- Mỗi người gửi được nhiều khoảnh khắc trong ngày.
- Mỗi khoảnh khắc có một ảnh và ghi chú tùy chọn tối đa 280 ký tự.
- Trang Hôm nay cập nhật ảnh mới bằng Supabase Realtime.
- Lịch gom ảnh theo ngày và hiển thị tối đa ba thumbnail xếp chồng.
- Người nhận có thể reaction hoặc trả lời ảnh; không có like count công khai.
- Người đăng có thể sửa ghi chú hoặc xóa ảnh của mình.
- Akiha AI tiếp tục dùng `deepseek/deepseek-v4-flash-0731` qua OpenRouter.
- Ảnh nằm trong Supabase private Storage và được đọc bằng signed URL.

## Công nghệ

- Next.js 16.3.4 App Router
- React 19.2.8
- Tailwind CSS 4
- Supabase Auth, Postgres, Storage, Realtime và Edge Functions
- Vitest và Playwright

## Chạy local

```powershell
npm install
npx supabase start
npx supabase db reset
npm run dev
```

Tài khoản seed local:

- `thu@akiha.local` / `akiha-local-user`
- `vinh@akiha.local` / `akiha-local-admin`

Tên mật khẩu cũ được giữ để không phá môi trường local; trong sản phẩm hai tài khoản không còn quan hệ user/admin.

## Kiểm tra

```powershell
npm run check
npm run test:edge
npm run build
```

Database test cần Docker và Supabase local:

```powershell
npm run test:db
npm run test:storage
```

## Migration 2.0

Migration `20260908010000_couple_daily_moments.sql`:

1. Tạo `couples` và `couple_members`.
2. Sao lưu dữ liệu lõi vào schema không public `akiha_archive`.
3. Giữ nguyên bảng và object ảnh cũ, nhưng bỏ giới hạn một check-in/ngày.
4. Thêm request ID để retry không tạo ảnh trùng.
5. Thêm reaction, reply và trạng thái đã mở.
6. Thay RLS admin/owner bằng quyền thành viên trong cùng couple.
7. Thu hồi quyền gọi các RPC admin cũ khỏi ứng dụng.

## Release

Frontend được host bằng Vercel. Backend dùng Supabase project đã link trong thư mục `supabase`.

Không đưa `.env.local`, khóa Supabase, OpenRouter hoặc VAPID vào source control.
