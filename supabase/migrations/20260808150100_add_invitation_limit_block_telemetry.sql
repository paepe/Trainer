alter table public.trainer_invitation_operation_events
  drop constraint if exists trainer_invitation_operation_events_event_type_check;

alter table public.trainer_invitation_operation_events
  add constraint trainer_invitation_operation_events_event_type_check
  check (event_type in (
    'created', 'declined', 'accepted', 'revoked', 'archived', 'restored', 'link_ended', 'blocked_limit'
  ));
