-- The assessment belongs to the client who performed the workout. Trainers
-- retain read access through the active trainer-client link, but may not
-- create, update or delete the client's self-assessment.
drop policy if exists "trainer manages client feedback" on public.post_workout_feedback;
