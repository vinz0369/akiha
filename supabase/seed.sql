-- Local-only credentials. Never apply this file to production.
-- Thu:   thu@akiha.local / akiha-local-user
-- Vinh:  vinh@akiha.local / akiha-local-admin

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'thu@akiha.local',
    crypt('akiha-local-user', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'vinh@akiha.local',
    crypt('akiha-local-admin', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
on conflict (id) do nothing;

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at,
  id
)
values
  (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '{"sub":"00000000-0000-4000-8000-000000000001","email":"thu@akiha.local"}'::jsonb,
    'email',
    now(),
    now(),
    now(),
    '00000000-0000-4000-8000-000000000011'
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    '{"sub":"00000000-0000-4000-8000-000000000002","email":"vinh@akiha.local"}'::jsonb,
    'email',
    now(),
    now(),
    now(),
    '00000000-0000-4000-8000-000000000012'
  )
on conflict (provider_id, provider) do nothing;

insert into public.profiles (id, display_name, role)
values
  ('00000000-0000-4000-8000-000000000001', 'Thu', 'user'),
  ('00000000-0000-4000-8000-000000000002', 'Vinh', 'admin')
on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role;

insert into public.app_settings (key, updated_by)
values ('default', '00000000-0000-4000-8000-000000000002')
on conflict (key) do nothing;

insert into public.reaction_templates (kind, text, milestone_value, created_by)
values
  ('normal', 'Đã ghi nhận nha 😌', null, '00000000-0000-4000-8000-000000000002'),
  ('normal', '+1. Anh thấy rồi nha 👀', null, '00000000-0000-4000-8000-000000000002'),
  ('normal', 'Hôm nay em đã xuất hiện ♡', null, '00000000-0000-4000-8000-000000000002'),
  ('normal', 'Mai tiếp nhé 🌷', null, '00000000-0000-4000-8000-000000000002'),
  ('with_photo', 'Có bằng chứng rồi nha 😌', null, '00000000-0000-4000-8000-000000000002'),
  ('with_photo', 'Akiha có thêm một kỷ niệm 🌸', null, '00000000-0000-4000-8000-000000000002'),
  ('without_photo', 'Tin em lần này 👀', null, '00000000-0000-4000-8000-000000000002'),
  ('without_photo', 'Không cần ảnh. Em đã đi là được.', null, '00000000-0000-4000-8000-000000000002'),
  ('milestone', 'Một tuần rồi đó 🌷', 7, '00000000-0000-4000-8000-000000000002'),
  ('milestone', 'Hai tuần không biến mất. Anh tự hào về em.', 14, '00000000-0000-4000-8000-000000000002'),
  ('milestone', '30 ngày??? Em nghiêm túc thật rồi ❤️', 30, '00000000-0000-4000-8000-000000000002'),
  ('milestone', 'Một trăm lần em đã chọn xuất hiện.', 100, '00000000-0000-4000-8000-000000000002'),
  ('normal', 'Anh thấy em rồi nha. Hôm nay em giỏi lắm ♡', null, '00000000-0000-4000-8000-000000000002'),
  ('normal', 'Thêm một ngày em chọn chăm sóc bản thân. Anh tự hào về em.', null, '00000000-0000-4000-8000-000000000002'),
  ('normal', 'Không cần hoàn hảo, em xuất hiện là đã rất tuyệt rồi.', null, '00000000-0000-4000-8000-000000000002'),
  ('normal', 'Anh biết có những ngày không dễ. Cảm ơn em vì vẫn cố gắng.', null, '00000000-0000-4000-8000-000000000002'),
  ('with_photo', 'Khoảnh khắc hôm nay anh giữ lại rồi nha 📸', null, '00000000-0000-4000-8000-000000000002'),
  ('with_photo', 'Nhìn em cố gắng thế này, đáng yêu thật đó ♡', null, '00000000-0000-4000-8000-000000000002'),
  ('with_photo', 'Tấm ảnh nhỏ, nhưng là một ngày rất đáng nhớ của em.', null, '00000000-0000-4000-8000-000000000002'),
  ('without_photo', 'Không cần ảnh đâu, anh tin em mà ♡', null, '00000000-0000-4000-8000-000000000002'),
  ('without_photo', 'Chỉ cần em nói đã làm, anh luôn tin em.', null, '00000000-0000-4000-8000-000000000002'),
  ('without_photo', 'Check-in nhỏ thôi, nhưng niềm tự hào của anh thì to lắm.', null, '00000000-0000-4000-8000-000000000002'),
  ('late_night', 'Muộn rồi mà em vẫn xuất hiện. Giỏi lắm, giờ nghỉ ngơi nhé ♡', null, '00000000-0000-4000-8000-000000000002'),
  ('late_night', 'Một ngày dài nhưng em vẫn giữ lời với chính mình. Anh thấy hết đó.', null, '00000000-0000-4000-8000-000000000002'),
  ('milestone', 'Bảy ngày liên tiếp rồi. Anh biết em đã cố gắng nhiều lắm ♡', 7, '00000000-0000-4000-8000-000000000002'),
  ('milestone', 'Hai tuần rồi đó. Anh tự hào vì em vẫn luôn chọn bản thân.', 14, '00000000-0000-4000-8000-000000000002'),
  ('milestone', 'Ba mươi ngày — món quà lớn nhất là phiên bản em đang trở thành ♡', 30, '00000000-0000-4000-8000-000000000002'),
  ('milestone', 'Một trăm lần xuất hiện. Cảm ơn em vì đã không bỏ cuộc.', 100, '00000000-0000-4000-8000-000000000002');

insert into public.reminder_templates (text, created_by)
values
  ('Hôm nay chưa thấy em đi gym nha 👀', '00000000-0000-4000-8000-000000000002'),
  ('10 phút cũng được mà 🌷', '00000000-0000-4000-8000-000000000002'),
  ('Chuỗi ngày đang đợi em đó.', '00000000-0000-4000-8000-000000000002'),
  ('Akiha chưa có kỷ niệm hôm nay ♡', '00000000-0000-4000-8000-000000000002');

insert into public.rewards (
  owner_id,
  source,
  created_by,
  title,
  public_description,
  rule_type,
  threshold,
  status,
  approved_by,
  approved_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  'admin',
  '00000000-0000-4000-8000-000000000002',
  'Bảy bông hoa đầu tiên',
  'Xuất hiện trong bảy ngày.',
  'streak_days',
  7,
  'active',
  '00000000-0000-4000-8000-000000000002',
  now()
);
