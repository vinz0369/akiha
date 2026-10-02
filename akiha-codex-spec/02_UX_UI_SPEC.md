# Akiha — UX/UI Specification

## 1. Hướng thiết kế

Phong cách: **Japanese diary × Apple minimal × cute relationship app**.

Giao diện cần có cảm giác được làm riêng cho một người, nhưng không giống game trẻ em hoặc dashboard fitness. Mỗi màn chỉ dùng một màu accent chính cộng neutral; ảnh trong calendar là phần nhiều màu nhất.

## 2. Mobile-first layout

- Baseline viewport: 390 × 844 px.
- Phải hoạt động từ 360 px đến desktop.
- Content max-width user app: 480 px; desktop đặt giữa màn hình.
- Admin max-width: 1120 px.
- Safe-area padding cho iPhone standalone PWA.
- Bottom navigation cao 64 px cộng `env(safe-area-inset-bottom)`.
- Tap target tối thiểu 44 × 44 px.

## 3. Design tokens

### Color

| Token | Giá trị | Cách dùng |
|---|---:|---|
| `background` | `#FFF9F7` | Nền warm off-white |
| `surface` | `#FFFFFF` | Card/sheet |
| `text` | `#332B2D` | Text chính |
| `muted` | `#806F73` | Text phụ |
| `border` | `#EEDFE2` | Border nhẹ |
| `primary` | `#F2A7B8` | Sakura CTA |
| `primary-strong` | `#CC6F87` | Text/icon active |
| `lavender` | `#C9B8F4` | Secondary accent |
| `soft-yellow` | `#F6D889` | Reward/milestone |
| `success` | `#7EB89A` | Complete/claimed |
| `danger` | `#C86673` | Destructive action |

Kiểm tra contrast thực tế; text dài không dùng `primary` nhạt trên nền trắng.

### Shape và elevation

- Card radius: 20 px.
- CTA radius: 22–26 px; không dùng pill cho mọi thành phần.
- Calendar cell radius: 10–12 px.
- Border 1 px và shadow rất nhẹ; tránh nhiều lớp glassmorphism.
- Spacing theo scale 4/8/12/16/24/32/48.

### Typography

- Dùng một sans variable font có hỗ trợ tiếng Việt tốt, ưu tiên Geist Sans hoặc system fallback.
- Logo `akiha` có thể dùng serif mềm riêng nhưng không tải font nặng chỉ vì một chữ.
- Body 15–17 px; line-height 1.45–1.6.
- Số streak 48–64 px, tabular numerals nếu chuyển động số.
- Không viết toàn bộ câu bằng uppercase.

## 4. Motion principles

- Motion phải làm rõ state change, không cản thao tác.
- Check-in celebration: 1.5–2.5 giây, có skip.
- Dùng spring nhẹ, fade, scale 0.96→1, soft bounce nhỏ.
- Confetti chỉ dùng cho milestone hoặc reward unlock.
- Tôn trọng `prefers-reduced-motion`; thay animation bằng fade ngắn.
- Không autoplay audio.

## 5. App shell

### Header

- Wordmark nhỏ ở giữa hoặc trái.
- Avatar/settings ở phải; không chiếm nhiều chiều cao.
- Trên Home có thể bỏ header truyền thống để tăng cảm giác cá nhân.

### Bottom navigation

- `Today`, `Calendar`, `Rewards`.
- Icon + label luôn hiện; active state dùng `primary-strong` và background tint nhẹ.
- Hide/fade khi keyboard mở.

## 6. Screen specs

### 6.1 First run / Login

Mục tiêu: riêng tư, không giống SaaS login.

- Logo, một illustration/hoa đơn giản, copy `Made for you.`
- Chỉ có login; không có create account.
- Error viết rõ bằng ngôn ngữ tự nhiên.
- Sau login lần đầu, gợi ý cài PWA; notification permission để ở bước sau.

### 6.2 Home — chưa check-in

Thứ tự:

1. Greeting theo thời điểm: `Good evening, Thu 🌷`.
2. Ngày hiện tại.
3. Streak hero: icon lửa/hoa + `17 days`.
4. Copy ngắn: `You don't need a perfect workout. Just show up.`
5. CTA lớn `Check in ♡`.
6. Microcopy `10 minutes still counts.`
7. Next reward compact card.

Không đặt calendar, chart, feed và settings trên cùng màn này.

### 6.3 Check-in composer

- Mặc định chỉ hiện CTA confirm và 2 optional actions: `Add photo`, `Add a note`.
- Mood dùng 5 lựa chọn trực quan, không bắt buộc: energized, happy, okay, tired, proud.
- Image picker hiển thị preview, reorder cover, remove và tiến trình compress/upload.
- Tối đa 3 ảnh; note 280 ký tự.
- Nếu trong grace period, hiển thị segmented control `Today | Yesterday`; default Today.
- CTA sticky `I showed up`.
- Khi submit lỗi, giữ nguyên draft local để retry.

### 6.4 Check-in success

Sequence:

1. Nút hold/tap hoàn tất chuyển thành tick.
2. Số streak tăng nếu hợp lệ.
3. Reaction sticker/text xuất hiện.
4. Nếu reward unlock: mở reward celebration sau reaction, không chồng hai modal.

Copy chính: `You showed up today.` Không dùng copy gây tội lỗi.

### 6.5 Home — đã check-in

- Tick hoặc flower state.
- `You showed up.`
- Current streak.
- Reaction đã gán; refresh trang vẫn giữ nguyên reaction đó.
- Link nhẹ `View today's moment`.
- Không cho submit check-in thứ hai; chỉ cho edit moment.

### 6.6 Calendar

- Month header với previous/next; không cho đi quá xa vào future.
- Week bắt đầu Thứ Hai.
- 7 cột, khoảng cách 4–6 px.
- Cell aspect ratio gần 1:1, ưu tiên ảnh lớn nhất có thể.
- Số ngày overlay ở góc trên; dùng scrim nhẹ nếu nền ảnh sáng.

State cell:

| State | Visual |
|---|---|
| Check-in + ảnh | Thumbnail `cover`, badge `+N` nếu nhiều ảnh |
| Check-in không ảnh | Pastel gradient + flower/gym glyph nhỏ |
| Protected day | Hoa outline riêng + tooltip/detail `Streak protected` |
| Missed day | Neutral trống |
| Today | Border `primary-strong` |
| Future | Muted, không tương tác |

Month summary dưới calendar: `workouts`, `memories`, `longest streak`, `rewards`.

### 6.7 Moment detail

- Date, optional mood/note, carousel ảnh.
- Reaction của Vinh hiển thị như một card riêng.
- Edit note/mood; xóa ảnh với confirmation.
- Admin correction indicator kín đáo nếu ngày được backfill.
- Không hiển thị metadata kỹ thuật của ảnh.

### 6.8 Rewards

Ba section:

- `Next` — active reward và progress.
- `Unlocked` — chờ được trao.
- `Memories` — claimed rewards.

Mystery reward trước unlock chỉ hiển thị title teaser và threshold; secret content không có trong payload.

CTA user: `Wish for a reward` → title, optional note, goal type/threshold. Trạng thái proposal hiện `Waiting for Vinh`.

### 6.9 Reward unlock

- Modal/sheet full focus, soft-yellow accent.
- Hiển thị title/details nếu được phép.
- Secret letter có hành động `Open letter` riêng để tạo khoảnh khắc.
- Không tự đánh dấu claimed; chỉ admin thực hiện sau khi đã trao.

### 6.10 Settings

- Notification state: unavailable / off / on.
- Button `Enable reminders` từ user gesture.
- Install guide theo platform.
- Logout.
- Không cho user đổi role/email nhạy cảm.

### 6.11 Admin overview

Cards: current streak, total workouts, moments, pending reward proposals.

Quick actions:

- `Add reward`
- `Add reaction`
- `Correct a day`
- `Protect missed day`
- `Send encouragement`

Admin ưu tiên usability, không cần giữ layout 480 px.

## 7. Empty, loading và error states

- Dùng skeleton có kích thước cố định để tránh layout shift.
- Empty calendar: `Your first flower will appear here.`
- Empty rewards: `Something lovely can live here soon.`
- Offline check-in: không giả success. Giữ draft và yêu cầu retry khi có mạng.
- Upload partial failure: rollback metadata hoặc cho retry từng ảnh; không để check-in trỏ tới object không tồn tại.
- Session expired: lưu draft local, redirect login rồi restore draft.

## 8. Accessibility

- Tất cả icon-only button có accessible label.
- Calendar cell phải đọc được: `September 12, checked in, 2 photos`.
- Không dùng màu là tín hiệu duy nhất; state có icon/text/aria-label.
- Focus ring rõ; modal trap focus; Escape đóng được trên desktop.
- Hỗ trợ keyboard cho admin tables/forms.
- Ảnh user-generated dùng alt theo ngày, không tự suy đoán nội dung ảnh.

## 9. Responsive admin

- Desktop: table/list hai cột khi hữu ích.
- Mobile: đổi table thành stacked cards; action nguy hiểm nằm trong menu phụ.
- Không làm một dashboard chart phức tạp cho hai account.

## 10. Copy tone

- Dịu, ngắn, hơi playful.
- Celebrate việc đã đi; không phán xét buổi tập.
- Không dùng câu như `You failed`, `Lazy`, `Goal incomplete`.
- Nếu streak đứt: `A new streak can start today.`
- Protected day: `Rest day protected by Vinh 🌸`.

