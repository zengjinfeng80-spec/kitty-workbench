create or replace function public.keep_newest_workbench_record()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at <= old.updated_at then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists keep_newest_workbench_record_on_update
  on public.workbench_records;

create trigger keep_newest_workbench_record_on_update
before update on public.workbench_records
for each row execute function public.keep_newest_workbench_record();
