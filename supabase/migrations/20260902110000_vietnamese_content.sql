update public.reaction_templates
set text = case text
  when 'Approved 😌' then 'Đã ghi nhận nha 😌'
  when 'You showed up ♡' then 'Hôm nay em đã xuất hiện ♡'
  when 'Hai tuần không biến mất. Proud of you.' then 'Hai tuần không biến mất. Anh tự hào về em.'
  else text
end
where text in (
  'Approved 😌',
  'You showed up ♡',
  'Hai tuần không biến mất. Proud of you.'
);

update public.reminder_templates
set text = 'Chuỗi ngày đang đợi em đó.'
where text = 'Streak đang đợi em đó.';

update public.reaction_deliveries
set rendered_text = case rendered_text
  when 'Approved 😌' then 'Đã ghi nhận nha 😌'
  when 'You showed up ♡' then 'Hôm nay em đã xuất hiện ♡'
  when 'Hai tuần không biến mất. Proud of you.' then 'Hai tuần không biến mất. Anh tự hào về em.'
  else rendered_text
end
where rendered_text in (
  'Approved 😌',
  'You showed up ♡',
  'Hai tuần không biến mất. Proud of you.'
);

update public.rewards
set
  title = 'Bảy bông hoa đầu tiên',
  public_description = 'Xuất hiện trong bảy ngày.'
where title = 'First seven flowers'
  and public_description = 'Show up for seven days.';
