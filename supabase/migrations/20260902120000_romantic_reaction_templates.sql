with templates (kind, text, milestone_value, weight) as (
  values
    ('normal'::public.reaction_kind, 'Anh thấy em rồi nha. Hôm nay em giỏi lắm ♡', null::integer, 2::smallint),
    ('normal'::public.reaction_kind, 'Thêm một ngày em chọn chăm sóc bản thân. Anh tự hào về em.', null::integer, 2::smallint),
    ('normal'::public.reaction_kind, 'Không cần hoàn hảo, em xuất hiện là đã rất tuyệt rồi.', null::integer, 2::smallint),
    ('normal'::public.reaction_kind, 'Anh biết có những ngày không dễ. Cảm ơn em vì vẫn cố gắng.', null::integer, 2::smallint),
    ('with_photo'::public.reaction_kind, 'Khoảnh khắc hôm nay anh giữ lại rồi nha 📸', null::integer, 2::smallint),
    ('with_photo'::public.reaction_kind, 'Nhìn em cố gắng thế này, đáng yêu thật đó ♡', null::integer, 2::smallint),
    ('with_photo'::public.reaction_kind, 'Tấm ảnh nhỏ, nhưng là một ngày rất đáng nhớ của em.', null::integer, 2::smallint),
    ('without_photo'::public.reaction_kind, 'Không cần ảnh đâu, anh tin em mà ♡', null::integer, 2::smallint),
    ('without_photo'::public.reaction_kind, 'Chỉ cần em nói đã làm, anh luôn tin em.', null::integer, 2::smallint),
    ('without_photo'::public.reaction_kind, 'Check-in nhỏ thôi, nhưng niềm tự hào của anh thì to lắm.', null::integer, 2::smallint),
    ('late_night'::public.reaction_kind, 'Muộn rồi mà em vẫn xuất hiện. Giỏi lắm, giờ nghỉ ngơi nhé ♡', null::integer, 2::smallint),
    ('late_night'::public.reaction_kind, 'Một ngày dài nhưng em vẫn giữ lời với chính mình. Anh thấy hết đó.', null::integer, 2::smallint),
    ('milestone'::public.reaction_kind, 'Bảy ngày liên tiếp rồi. Anh biết em đã cố gắng nhiều lắm ♡', 7, 2::smallint),
    ('milestone'::public.reaction_kind, 'Hai tuần rồi đó. Anh tự hào vì em vẫn luôn chọn bản thân.', 14, 2::smallint),
    ('milestone'::public.reaction_kind, 'Ba mươi ngày — món quà lớn nhất là phiên bản em đang trở thành ♡', 30, 2::smallint),
    ('milestone'::public.reaction_kind, 'Một trăm lần xuất hiện. Cảm ơn em vì đã không bỏ cuộc.', 100, 2::smallint)
)
insert into public.reaction_templates (
  kind,
  text,
  milestone_value,
  weight,
  is_active,
  created_by
)
select
  templates.kind,
  templates.text,
  templates.milestone_value,
  templates.weight,
  true,
  admin.id
from templates
cross join lateral (
  select id
  from public.profiles
  where role = 'admin'
  order by created_at
  limit 1
) admin
where not exists (
  select 1
  from public.reaction_templates existing
  where existing.kind = templates.kind
    and existing.text = templates.text
    and existing.milestone_value is not distinct from templates.milestone_value
);
