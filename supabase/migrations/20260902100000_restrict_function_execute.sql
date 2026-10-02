-- Supabase hosted projects may grant EXECUTE directly to API roles when a
-- function is created. Revoking from PUBLIC alone does not remove those
-- explicit grants, so anonymous callers must be revoked separately.
do $$
declare
  function_signature text;
begin
  for function_signature in
    select function_row.oid::regprocedure::text
    from pg_proc function_row
    join pg_namespace namespace_row on namespace_row.oid = function_row.pronamespace
    where namespace_row.nspname = 'public'
      and function_row.prosecdef
  loop
    execute format('revoke execute on function %s from anon', function_signature);
  end loop;
end;
$$;
