-- 1) Un seul utilisateur : le premier compte créé devient le propriétaire, tout autre est refusé.
create or replace function public.enforce_single_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from auth.users) then
    raise exception 'Cette application est réservée à un seul utilisateur.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger enforce_single_user_before_insert
  before insert on auth.users
  for each row execute function public.enforce_single_user();

-- 2) Données initiales : réglages, matières, emploi du temps fixe.
create or replace function public.seed_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.settings (user_id) values (new.id);

  insert into public.subjects (user_id, name, color, icon, priority, position) values
    (new.id, 'Maths spécialité',     '#6366F1', 'sigma',        'haute',   0),
    (new.id, 'Maths expertes',       '#8B5CF6', 'infinity',     'haute',   1),
    (new.id, 'Physique-Chimie',      '#06B6D4', 'flask-conical','haute',   2),
    (new.id, 'Philosophie',          '#F59E0B', 'brain',        'haute',   3),
    (new.id, 'Histoire-Géo (arabe)', '#10B981', 'globe',        'normale', 4),
    (new.id, 'ACL',                  '#EC4899', 'languages',    'normale', 5),
    (new.id, 'CDM',                  '#F97316', 'compass',      'light',   6);

  -- Emploi du temps Pronote (Lycée Louis-Massignon, Terminale BFI), 1 = lundi
  insert into public.timetable_slots (user_id, weekday, start_time, end_time, label, teacher, room) values
    (new.id, 1, '08:00', '08:55', 'Approfondissement culturel et linguistique', 'AALLAM L.', 'L202'),
    (new.id, 1, '08:55', '09:50', 'Anglais', 'MOURID M.', 'L205'),
    (new.id, 1, '10:05', '11:55', 'Physique-Chimie', 'NAJID N.', 'L107 Sciences'),
    (new.id, 1, '13:25', '14:20', 'Philosophie', 'LEBOVIC C.', 'L205'),
    (new.id, 1, '14:20', '15:15', 'Histoire-Géographie', 'RAGIL Y.', 'L205'),
    (new.id, 1, '15:30', '16:25', 'Histoire-Géographie', 'RAGIL Y.', 'L205'),
    (new.id, 1, '16:25', '17:20', 'Accomp. orientation (A) / EMC (B)', 'LEBOVIC C. / RAGIL Y.', 'L101 / L205'),
    (new.id, 1, '17:20', '18:15', 'Approfondissement culturel et linguistique', 'AALLAM L.', 'L206'),
    (new.id, 2, '08:00', '10:05', 'Mathématiques', 'BAHAJ H.', 'C105 Collège'),
    (new.id, 2, '10:05', '11:00', 'Espagnol', 'ROZIER S.', 'L205'),
    (new.id, 2, '11:00', '11:55', 'Approfondissement culturel et linguistique', 'AALLAM L.', 'C206'),
    (new.id, 2, '13:25', '15:30', 'Philosophie', 'LEBOVIC C.', 'L105'),
    (new.id, 2, '15:30', '16:25', 'Enseignement scientifique', 'NASRI L.', 'L103 Sciences'),
    (new.id, 2, '16:25', '18:15', 'Maths expertes', 'RIVES J.', 'L101'),
    (new.id, 3, '08:00', '08:55', 'Histoire-Géographie', 'RAGIL Y.', 'L205'),
    (new.id, 3, '08:55', '09:50', 'Enseignement scientifique', 'BENJELLOUN K.', 'L205'),
    (new.id, 3, '10:05', '11:55', 'Physique-Chimie', 'NAJID N.', 'L002 Collège'),
    (new.id, 3, '11:55', '12:50', 'Histoire-Géographie en arabe', 'TAROUZ M.', 'L206'),
    (new.id, 4, '08:00', '10:05', 'Mathématiques', 'BAHAJ H.', 'L203'),
    (new.id, 4, '10:05', '11:55', 'EPS', 'AREJDAL I.', 'Ensemble sportif 3'),
    (new.id, 4, '13:25', '15:30', 'Physique-Chimie', 'NAJID N.', 'L202'),
    (new.id, 4, '15:30', '16:25', 'Espagnol', 'ROZIER S.', 'L203'),
    (new.id, 4, '16:25', '17:20', 'Maths expertes', 'RIVES J.', 'L201'),
    (new.id, 5, '08:00', '08:55', 'Anglais', 'MOURID M.', 'L205'),
    (new.id, 5, '08:55', '09:50', 'Philosophie', 'LEBOVIC C.', 'L202'),
    (new.id, 5, '10:05', '11:55', 'Mathématiques', 'BAHAJ H.', 'L205'),
    (new.id, 5, '13:25', '14:20', 'Approfondissement culturel et linguistique', 'AALLAM L.', 'L205'),
    (new.id, 5, '14:20', '15:15', 'Connaissance du monde', 'JANI S.', 'L205'),
    (new.id, 5, '15:30', '16:25', 'Connaissance du monde', 'JANI S.', 'L205'),
    (new.id, 5, '16:25', '17:20', 'Histoire-Géographie en arabe', 'TAROUZ M.', 'L201');

  return new;
end;
$$;

create trigger seed_new_user_after_insert
  after insert on auth.users
  for each row execute function public.seed_new_user();
