-- ═══════════════════════════════════════════════════════════════════
-- TrAIner — Seed Data
-- 10 Trainers (5M + 5F) + 50 Clients (25M + 25F, idades 20-35)
-- Password universal: TrAIner2026!
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  pw   text := crypt('TrAIner2026!', gen_salt('bf', 6));
  inst uuid := '00000000-0000-0000-0000-000000000000';
BEGIN

-- ───────────────────────────────────────────────────────────────────
-- BLOCO 1 — AUTH USERS (trigger cria profiles automaticamente)
-- ───────────────────────────────────────────────────────────────────
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new
) VALUES
-- ── TRAINERS ───────────────────────────────────────────────────────
(gen_random_uuid(),inst,'authenticated','authenticated','carlos.silva@trainer.test',     pw,now(),'{"name":"Carlos Silva","role":"trainer"}'::jsonb,    now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','ana.ferreira@trainer.test',      pw,now(),'{"name":"Ana Ferreira","role":"trainer"}'::jsonb,     now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','joao.santos@trainer.test',       pw,now(),'{"name":"João Santos","role":"trainer"}'::jsonb,      now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','maria.costa@trainer.test',       pw,now(),'{"name":"Maria Costa","role":"trainer"}'::jsonb,      now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','pedro.oliveira@trainer.test',    pw,now(),'{"name":"Pedro Oliveira","role":"trainer"}'::jsonb,   now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','sofia.rodrigues@trainer.test',   pw,now(),'{"name":"Sofia Rodrigues","role":"trainer"}'::jsonb,  now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','miguel.pereira@trainer.test',    pw,now(),'{"name":"Miguel Pereira","role":"trainer"}'::jsonb,   now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','rita.carvalho@trainer.test',     pw,now(),'{"name":"Rita Carvalho","role":"trainer"}'::jsonb,    now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','rui.martins@trainer.test',       pw,now(),'{"name":"Rui Martins","role":"trainer"}'::jsonb,      now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','catarina.lopes@trainer.test',    pw,now(),'{"name":"Catarina Lopes","role":"trainer"}'::jsonb,   now(),now(),'','',''),
-- ── CLIENTS MASCULINOS (25) ─────────────────────────────────────────
(gen_random_uuid(),inst,'authenticated','authenticated','tiago.moreira@client.test',      pw,now(),'{"name":"Tiago Moreira","role":"client"}'::jsonb,     now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','diogo.barros@client.test',        pw,now(),'{"name":"Diogo Barros","role":"client"}'::jsonb,      now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','andre.lima@client.test',           pw,now(),'{"name":"André Lima","role":"client"}'::jsonb,        now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','goncalo.fonseca@client.test',     pw,now(),'{"name":"Gonçalo Fonseca","role":"client"}'::jsonb,   now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','filipe.azevedo@client.test',      pw,now(),'{"name":"Filipe Azevedo","role":"client"}'::jsonb,    now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','ricardo.sousa@client.test',       pw,now(),'{"name":"Ricardo Sousa","role":"client"}'::jsonb,     now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','nuno.barbosa@client.test',        pw,now(),'{"name":"Nuno Barbosa","role":"client"}'::jsonb,      now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','luis.fernandes@client.test',      pw,now(),'{"name":"Luís Fernandes","role":"client"}'::jsonb,    now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','bruno.correia@client.test',       pw,now(),'{"name":"Bruno Correia","role":"client"}'::jsonb,     now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','sergio.mendes@client.test',       pw,now(),'{"name":"Sérgio Mendes","role":"client"}'::jsonb,     now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','alexandre.costa@client.test',     pw,now(),'{"name":"Alexandre Costa","role":"client"}'::jsonb,   now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','vasco.pinto@client.test',         pw,now(),'{"name":"Vasco Pinto","role":"client"}'::jsonb,       now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','marco.alves@client.test',         pw,now(),'{"name":"Marco Alves","role":"client"}'::jsonb,       now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','daniel.castro@client.test',       pw,now(),'{"name":"Daniel Castro","role":"client"}'::jsonb,     now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','rodrigo.carvalho@client.test',    pw,now(),'{"name":"Rodrigo Carvalho","role":"client"}'::jsonb,  now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','henrique.mota@client.test',       pw,now(),'{"name":"Henrique Mota","role":"client"}'::jsonb,     now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','rafael.cunha@client.test',        pw,now(),'{"name":"Rafael Cunha","role":"client"}'::jsonb,      now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','gustavo.rocha@client.test',       pw,now(),'{"name":"Gustavo Rocha","role":"client"}'::jsonb,     now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','samuel.almeida@client.test',      pw,now(),'{"name":"Samuel Almeida","role":"client"}'::jsonb,    now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','leandro.ferreira@client.test',    pw,now(),'{"name":"Leandro Ferreira","role":"client"}'::jsonb,  now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','renato.gomes@client.test',        pw,now(),'{"name":"Renato Gomes","role":"client"}'::jsonb,      now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','fabio.vieira@client.test',        pw,now(),'{"name":"Fábio Vieira","role":"client"}'::jsonb,      now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','cristiano.lopes@client.test',     pw,now(),'{"name":"Cristiano Lopes","role":"client"}'::jsonb,   now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','marcio.santos@client.test',       pw,now(),'{"name":"Márcio Santos","role":"client"}'::jsonb,     now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','eduardo.freitas@client.test',     pw,now(),'{"name":"Eduardo Freitas","role":"client"}'::jsonb,   now(),now(),'','',''),
-- ── CLIENTS FEMININAS (25) ──────────────────────────────────────────
(gen_random_uuid(),inst,'authenticated','authenticated','beatriz.nunes@client.test',       pw,now(),'{"name":"Beatriz Nunes","role":"client"}'::jsonb,     now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','ines.rodrigues@client.test',      pw,now(),'{"name":"Inês Rodrigues","role":"client"}'::jsonb,    now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','mariana.santos@client.test',      pw,now(),'{"name":"Mariana Santos","role":"client"}'::jsonb,    now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','francisca.oliveira@client.test',  pw,now(),'{"name":"Francisca Oliveira","role":"client"}'::jsonb,now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','constanca.pereira@client.test',   pw,now(),'{"name":"Constança Pereira","role":"client"}'::jsonb, now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','leonor.martins@client.test',      pw,now(),'{"name":"Leonor Martins","role":"client"}'::jsonb,    now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','mafalda.ribeiro@client.test',     pw,now(),'{"name":"Mafalda Ribeiro","role":"client"}'::jsonb,   now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','matilde.costa@client.test',       pw,now(),'{"name":"Matilde Costa","role":"client"}'::jsonb,     now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','raquel.silva@client.test',        pw,now(),'{"name":"Raquel Silva","role":"client"}'::jsonb,      now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','vanessa.ferreira@client.test',    pw,now(),'{"name":"Vanessa Ferreira","role":"client"}'::jsonb,  now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','joana.carvalho@client.test',      pw,now(),'{"name":"Joana Carvalho","role":"client"}'::jsonb,    now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','patricia.figueiredo@client.test', pw,now(),'{"name":"Patrícia Figueiredo","role":"client"}'::jsonb,now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','liliana.azevedo@client.test',     pw,now(),'{"name":"Liliana Azevedo","role":"client"}'::jsonb,   now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','susana.monteiro@client.test',     pw,now(),'{"name":"Susana Monteiro","role":"client"}'::jsonb,   now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','catia.soares@client.test',        pw,now(),'{"name":"Cátia Soares","role":"client"}'::jsonb,      now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','veronica.pires@client.test',      pw,now(),'{"name":"Verónica Pires","role":"client"}'::jsonb,    now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','alexandra.baptista@client.test',  pw,now(),'{"name":"Alexandra Baptista","role":"client"}'::jsonb,now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','marta.teixeira@client.test',      pw,now(),'{"name":"Marta Teixeira","role":"client"}'::jsonb,    now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','cristina.varela@client.test',     pw,now(),'{"name":"Cristina Varela","role":"client"}'::jsonb,   now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','helena.duarte@client.test',       pw,now(),'{"name":"Helena Duarte","role":"client"}'::jsonb,     now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','luisa.goncalves@client.test',     pw,now(),'{"name":"Luísa Gonçalves","role":"client"}'::jsonb,   now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','isabel.campos@client.test',       pw,now(),'{"name":"Isabel Campos","role":"client"}'::jsonb,     now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','teresa.moura@client.test',        pw,now(),'{"name":"Teresa Moura","role":"client"}'::jsonb,      now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','celia.henriques@client.test',     pw,now(),'{"name":"Célia Henriques","role":"client"}'::jsonb,   now(),now(),'','',''),
(gen_random_uuid(),inst,'authenticated','authenticated','andreia.branco@client.test',      pw,now(),'{"name":"Andreia Branco","role":"client"}'::jsonb,    now(),now(),'','','');

END $$;

-- ───────────────────────────────────────────────────────────────────
-- BLOCO 2 — PHYSICAL PROFILES (clientes)
-- ───────────────────────────────────────────────────────────────────
INSERT INTO physical_profiles (
  user_id, weight_kg, height_cm, birth_year,
  fitness_level, primary_goal,
  available_minutes, location_preference,
  equipment, restrictions, updated_at
)
SELECT p.id,
       d.weight_kg, d.height_cm, d.birth_year,
       d.fitness_level, d.primary_goal,
       d.available_minutes, d.location_preference,
       d.equipment, d.restrictions, now()
FROM profiles p
JOIN (VALUES
-- ── MASCULINOS ─────────────────────────────────────────────────────
--  email                              kg   cm  ano   nivel          objetivo      min  local      equipamentos                               limitações
('tiago.moreira@client.test',         78, 178, 1999,'intermediate','Strength',     45,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY['Lower back']),
('diogo.barros@client.test',          72, 175, 2001,'beginner',    'Weight loss',  30,'gym',      ARRAY['Dumbbells'],                        ARRAY['Knees']),
('andre.lima@client.test',            85, 182, 1998,'advanced',    'Hypertrophy',  60,'gym',      ARRAY['Barbell','Dumbbells','Cables'],      ARRAY[]::text[]),
('goncalo.fonseca@client.test',       68, 170, 2003,'beginner',    'Endurance',    45,'outdoor',  ARRAY['Bands'],                            ARRAY[]::text[]),
('filipe.azevedo@client.test',        90, 180, 1996,'intermediate','Weight loss',  60,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY[]::text[]),
('ricardo.sousa@client.test',         75, 176, 2000,'intermediate','Strength',     45,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY['Shoulder']),
('nuno.barbosa@client.test',          83, 183, 1997,'advanced',    'Strength',     60,'gym',      ARRAY['Barbell','Dumbbells','Kettlebell'],  ARRAY['Lower back']),
('luis.fernandes@client.test',        71, 174, 2002,'beginner',    'Endurance',    30,'outdoor',  ARRAY[]::text[],                           ARRAY[]::text[]),
('bruno.correia@client.test',         88, 181, 1995,'intermediate','Weight loss',  45,'gym',      ARRAY['Dumbbells','Cables'],               ARRAY['Lower back','Shoulder']),
('sergio.mendes@client.test',         76, 177, 1999,'advanced',    'Hypertrophy',  60,'gym',      ARRAY['Barbell','Dumbbells','Cables'],      ARRAY[]::text[]),
('alexandre.costa@client.test',       65, 168, 2004,'beginner',    'Endurance',    30,'gym',      ARRAY['Dumbbells'],                        ARRAY['Knees']),
('vasco.pinto@client.test',           80, 179, 2001,'intermediate','Strength',     45,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY[]::text[]),
('marco.alves@client.test',           92, 185, 1996,'advanced',    'Strength',     90,'gym',      ARRAY['Barbell','Dumbbells','Cables','Kettlebell'], ARRAY[]::text[]),
('daniel.castro@client.test',         73, 172, 2003,'beginner',    'Mobility',     30,'home',     ARRAY['Bands','Mat'],                      ARRAY[]::text[]),
('rodrigo.carvalho@client.test',      79, 177, 2000,'intermediate','Hypertrophy',  60,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY['Lower back']),
('henrique.mota@client.test',         86, 184, 1998,'intermediate','Strength',     45,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY[]::text[]),
('rafael.cunha@client.test',          70, 173, 2002,'beginner',    'Weight loss',  30,'outdoor',  ARRAY[]::text[],                           ARRAY['Lower back']),
('gustavo.rocha@client.test',         82, 180, 1997,'advanced',    'Endurance',    60,'outdoor',  ARRAY[]::text[],                           ARRAY[]::text[]),
('samuel.almeida@client.test',        74, 176, 1999,'intermediate','Hypertrophy',  45,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY['Lower back']),
('leandro.ferreira@client.test',      69, 171, 2003,'beginner',    'Endurance',    30,'outdoor',  ARRAY[]::text[],                           ARRAY['Hip']),
('renato.gomes@client.test',          83, 181, 1996,'intermediate','Strength',     60,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY[]::text[]),
('fabio.vieira@client.test',          77, 175, 2001,'intermediate','Weight loss',  45,'gym',      ARRAY['Dumbbells','Cables'],               ARRAY[]::text[]),
('cristiano.lopes@client.test',       91, 187, 1995,'advanced',    'Hypertrophy',  90,'gym',      ARRAY['Barbell','Dumbbells','Cables','Kettlebell'], ARRAY['Wrist']),
('marcio.santos@client.test',         68, 169, 2004,'beginner',    'Mobility',     30,'home',     ARRAY['Bands','Mat'],                      ARRAY[]::text[]),
('eduardo.freitas@client.test',       87, 183, 1997,'intermediate','Strength',     60,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY[]::text[]),
-- ── FEMININAS ──────────────────────────────────────────────────────
('beatriz.nunes@client.test',         58, 162, 2001,'intermediate','Weight loss',  45,'gym',      ARRAY['Dumbbells','Cables'],               ARRAY[]::text[]),
('ines.rodrigues@client.test',        62, 165, 1999,'beginner',    'Mobility',     30,'home',     ARRAY['Bands','Mat'],                      ARRAY['Lower back']),
('mariana.santos@client.test',        55, 160, 2003,'beginner',    'Weight loss',  30,'gym',      ARRAY['Dumbbells'],                        ARRAY[]::text[]),
('francisca.oliveira@client.test',    68, 168, 1997,'intermediate','Strength',     45,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY[]::text[]),
('constanca.pereira@client.test',     57, 161, 2002,'beginner',    'Endurance',    30,'outdoor',  ARRAY[]::text[],                           ARRAY['Knees']),
('leonor.martins@client.test',        61, 164, 2000,'intermediate','Weight loss',  45,'gym',      ARRAY['Dumbbells','Cables'],               ARRAY[]::text[]),
('mafalda.ribeiro@client.test',       63, 166, 2001,'intermediate','Hypertrophy',  60,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY[]::text[]),
('matilde.costa@client.test',         59, 163, 2002,'beginner',    'Mobility',     30,'home',     ARRAY['Bands','Mat'],                      ARRAY[]::text[]),
('raquel.silva@client.test',          66, 167, 1998,'advanced',    'Strength',     60,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY[]::text[]),
('vanessa.ferreira@client.test',      60, 162, 2000,'intermediate','Weight loss',  45,'gym',      ARRAY['Dumbbells'],                        ARRAY['Knees']),
('joana.carvalho@client.test',        54, 158, 2004,'beginner',    'Endurance',    30,'outdoor',  ARRAY[]::text[],                           ARRAY['Shoulder']),
('patricia.figueiredo@client.test',   64, 165, 1999,'intermediate','Hypertrophy',  45,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY[]::text[]),
('liliana.azevedo@client.test',       70, 169, 1996,'intermediate','Weight loss',  60,'gym',      ARRAY['Dumbbells','Cables'],               ARRAY[]::text[]),
('susana.monteiro@client.test',       56, 160, 2001,'beginner',    'Mobility',     30,'home',     ARRAY['Bands','Mat'],                      ARRAY[]::text[]),
('catia.soares@client.test',          65, 166, 1998,'intermediate','Strength',     45,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY['Knees']),
('veronica.pires@client.test',        58, 161, 2003,'beginner',    'Weight loss',  30,'gym',      ARRAY['Dumbbells'],                        ARRAY[]::text[]),
('alexandra.baptista@client.test',    63, 164, 2000,'intermediate','Endurance',    45,'outdoor',  ARRAY[]::text[],                           ARRAY['Wrist']),
('marta.teixeira@client.test',        60, 162, 2002,'beginner',    'Mobility',     30,'home',     ARRAY['Bands','Mat'],                      ARRAY[]::text[]),
('cristina.varela@client.test',       67, 167, 1997,'advanced',    'Strength',     60,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY[]::text[]),
('helena.duarte@client.test',         55, 159, 2004,'beginner',    'Weight loss',  30,'gym',      ARRAY['Dumbbells'],                        ARRAY['Lower back']),
('luisa.goncalves@client.test',       62, 164, 2001,'intermediate','Hypertrophy',  45,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY[]::text[]),
('isabel.campos@client.test',         64, 165, 1999,'intermediate','Strength',     45,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY[]::text[]),
('teresa.moura@client.test',          59, 161, 2002,'beginner',    'Endurance',    30,'outdoor',  ARRAY[]::text[],                           ARRAY['Lower back']),
('celia.henriques@client.test',       61, 163, 2001,'intermediate','Weight loss',  45,'gym',      ARRAY['Dumbbells','Cables'],               ARRAY[]::text[]),
('andreia.branco@client.test',        66, 167, 1998,'advanced',    'Hypertrophy',  60,'gym',      ARRAY['Barbell','Dumbbells'],               ARRAY[]::text[])
) AS d(email, weight_kg, height_cm, birth_year, fitness_level, primary_goal,
       available_minutes, location_preference, equipment, restrictions)
ON p.email = d.email;

-- ───────────────────────────────────────────────────────────────────
-- BLOCO 3 — CYCLE CONFIG (25 clientes femininas)
-- ───────────────────────────────────────────────────────────────────
INSERT INTO cycle_config (user_id, cycle_length, period_length, last_start_date, updated_at)
SELECT p.id, d.cycle_length, d.period_length,
       current_date - d.days_ago::int,
       now()
FROM profiles p
JOIN (VALUES
-- email                               ciclo  período  dias_desde_início
('beatriz.nunes@client.test',           28,    5,       8),
('ines.rodrigues@client.test',          30,    6,       3),
('mariana.santos@client.test',          27,    4,      15),
('francisca.oliveira@client.test',      29,    5,      22),
('constanca.pereira@client.test',       26,    4,       1),
('leonor.martins@client.test',          31,    6,      12),
('mafalda.ribeiro@client.test',         28,    5,      19),
('matilde.costa@client.test',           27,    4,       6),
('raquel.silva@client.test',            30,    5,      25),
('vanessa.ferreira@client.test',        29,    6,      10),
('joana.carvalho@client.test',          28,    4,      17),
('patricia.figueiredo@client.test',     26,    5,       4),
('liliana.azevedo@client.test',         30,    6,      21),
('susana.monteiro@client.test',         28,    5,      13),
('catia.soares@client.test',            31,    4,       2),
('veronica.pires@client.test',          27,    5,      27),
('alexandra.baptista@client.test',      29,    6,       9),
('marta.teixeira@client.test',          28,    4,      16),
('cristina.varela@client.test',         30,    5,      23),
('helena.duarte@client.test',           26,    4,       5),
('luisa.goncalves@client.test',         29,    6,      18),
('isabel.campos@client.test',           28,    5,      11),
('teresa.moura@client.test',            31,    6,      24),
('celia.henriques@client.test',         27,    4,       7),
('andreia.branco@client.test',          30,    5,      20)
) AS d(email, cycle_length, period_length, days_ago)
ON p.email = d.email;

-- ───────────────────────────────────────────────────────────────────
-- BLOCO 4 — DAILY CHECK-INS (hoje, para todos os 50 clientes)
-- ───────────────────────────────────────────────────────────────────
INSERT INTO checkins (user_id, date, energy, soreness, minutes, goal, sleep_quality, location, created_at)
SELECT p.id, current_date,
       d.energy, d.soreness, d.minutes, d.goal,
       d.sleep_quality, d.location, now()
FROM profiles p
JOIN (VALUES
-- email                               energia  dores                          min  objetivo      sono     local
('tiago.moreira@client.test',          7,  ARRAY['Lower back'],                45, 'Strength',   'good',  'gym'),
('diogo.barros@client.test',           6,  ARRAY['Knees'],                     30, 'Recovery',   'fair',  'gym'),
('andre.lima@client.test',             9,  ARRAY['None'],                      60, 'Strength',   'good',  'gym'),
('goncalo.fonseca@client.test',        8,  ARRAY['None'],                      45, 'Endurance',  'good',  'outdoor'),
('filipe.azevedo@client.test',         7,  ARRAY['None'],                      60, 'Endurance',  'fair',  'gym'),
('ricardo.sousa@client.test',          5,  ARRAY['Shoulder'],                  45, 'Recovery',   'poor',  'gym'),
('nuno.barbosa@client.test',           8,  ARRAY['Lower back'],                60, 'Strength',   'good',  'gym'),
('luis.fernandes@client.test',         6,  ARRAY['None'],                      30, 'Endurance',  'fair',  'outdoor'),
('bruno.correia@client.test',          4,  ARRAY['Lower back','Shoulder'],     45, 'Recovery',   'poor',  'gym'),
('sergio.mendes@client.test',          9,  ARRAY['None'],                      60, 'Strength',   'good',  'gym'),
('alexandre.costa@client.test',        6,  ARRAY['Knees'],                     30, 'Recovery',   'fair',  'gym'),
('vasco.pinto@client.test',            8,  ARRAY['None'],                      45, 'Strength',   'good',  'gym'),
('marco.alves@client.test',            9,  ARRAY['None'],                      90, 'Strength',   'good',  'gym'),
('daniel.castro@client.test',          7,  ARRAY['None'],                      30, 'Mobility',   'fair',  'home'),
('rodrigo.carvalho@client.test',       5,  ARRAY['Lower back'],                60, 'Recovery',   'fair',  'gym'),
('henrique.mota@client.test',          8,  ARRAY['None'],                      45, 'Strength',   'good',  'gym'),
('rafael.cunha@client.test',           4,  ARRAY['Lower back'],                30, 'Recovery',   'poor',  'outdoor'),
('gustavo.rocha@client.test',          9,  ARRAY['None'],                      60, 'Endurance',  'good',  'outdoor'),
('samuel.almeida@client.test',         6,  ARRAY['Lower back'],                45, 'Recovery',   'fair',  'gym'),
('leandro.ferreira@client.test',       7,  ARRAY['Hip'],                       30, 'Mobility',   'good',  'outdoor'),
('renato.gomes@client.test',           8,  ARRAY['None'],                      60, 'Strength',   'good',  'gym'),
('fabio.vieira@client.test',           7,  ARRAY['None'],                      45, 'Endurance',  'fair',  'gym'),
('cristiano.lopes@client.test',        6,  ARRAY['Wrist'],                     90, 'Recovery',   'fair',  'gym'),
('marcio.santos@client.test',          8,  ARRAY['None'],                      30, 'Mobility',   'good',  'home'),
('eduardo.freitas@client.test',        9,  ARRAY['None'],                      60, 'Strength',   'good',  'gym'),
('beatriz.nunes@client.test',          7,  ARRAY['None'],                      45, 'Endurance',  'good',  'gym'),
('ines.rodrigues@client.test',         5,  ARRAY['Lower back'],                30, 'Recovery',   'poor',  'home'),
('mariana.santos@client.test',         8,  ARRAY['None'],                      30, 'Endurance',  'good',  'gym'),
('francisca.oliveira@client.test',     7,  ARRAY['None'],                      45, 'Strength',   'fair',  'gym'),
('constanca.pereira@client.test',      6,  ARRAY['Knees'],                     30, 'Recovery',   'fair',  'outdoor'),
('leonor.martins@client.test',         8,  ARRAY['None'],                      45, 'Endurance',  'good',  'gym'),
('mafalda.ribeiro@client.test',        7,  ARRAY['None'],                      60, 'Strength',   'good',  'gym'),
('matilde.costa@client.test',          9,  ARRAY['None'],                      30, 'Mobility',   'good',  'home'),
('raquel.silva@client.test',           8,  ARRAY['None'],                      60, 'Strength',   'good',  'gym'),
('vanessa.ferreira@client.test',       5,  ARRAY['Knees'],                     45, 'Recovery',   'poor',  'gym'),
('joana.carvalho@client.test',         7,  ARRAY['Shoulder'],                  30, 'Recovery',   'fair',  'outdoor'),
('patricia.figueiredo@client.test',    8,  ARRAY['None'],                      45, 'Strength',   'good',  'gym'),
('liliana.azevedo@client.test',        6,  ARRAY['None'],                      60, 'Endurance',  'fair',  'gym'),
('susana.monteiro@client.test',        9,  ARRAY['None'],                      30, 'Mobility',   'good',  'home'),
('catia.soares@client.test',           4,  ARRAY['Knees'],                     45, 'Recovery',   'poor',  'gym'),
('veronica.pires@client.test',         8,  ARRAY['None'],                      30, 'Endurance',  'good',  'gym'),
('alexandra.baptista@client.test',     6,  ARRAY['Wrist'],                     45, 'Recovery',   'fair',  'outdoor'),
('marta.teixeira@client.test',         7,  ARRAY['None'],                      30, 'Mobility',   'good',  'home'),
('cristina.varela@client.test',        9,  ARRAY['None'],                      60, 'Strength',   'good',  'gym'),
('helena.duarte@client.test',          5,  ARRAY['Lower back'],                30, 'Recovery',   'poor',  'gym'),
('luisa.goncalves@client.test',        8,  ARRAY['None'],                      45, 'Strength',   'good',  'gym'),
('isabel.campos@client.test',          7,  ARRAY['None'],                      45, 'Endurance',  'fair',  'gym'),
('teresa.moura@client.test',           4,  ARRAY['Lower back'],                30, 'Recovery',   'poor',  'outdoor'),
('celia.henriques@client.test',        8,  ARRAY['None'],                      45, 'Endurance',  'good',  'gym'),
('andreia.branco@client.test',         9,  ARRAY['None'],                      60, 'Strength',   'good',  'gym')
) AS d(email, energy, soreness, minutes, goal, sleep_quality, location)
ON p.email = d.email;

-- ───────────────────────────────────────────────────────────────────
-- BLOCO 5 — TRAINER ↔ CLIENTE (5 clientes por trainer)
-- ───────────────────────────────────────────────────────────────────
INSERT INTO trainer_clients (trainer_id, client_id, status, created_at)
SELECT t.id, c.id, 'active', now()
FROM profiles t, profiles c
WHERE (t.email, c.email) IN (VALUES
-- Carlos Silva → 5 clientes
('carlos.silva@trainer.test',    'tiago.moreira@client.test'),
('carlos.silva@trainer.test',    'diogo.barros@client.test'),
('carlos.silva@trainer.test',    'andre.lima@client.test'),
('carlos.silva@trainer.test',    'goncalo.fonseca@client.test'),
('carlos.silva@trainer.test',    'beatriz.nunes@client.test'),
-- Ana Ferreira → 5 clientes
('ana.ferreira@trainer.test',    'filipe.azevedo@client.test'),
('ana.ferreira@trainer.test',    'ricardo.sousa@client.test'),
('ana.ferreira@trainer.test',    'ines.rodrigues@client.test'),
('ana.ferreira@trainer.test',    'mariana.santos@client.test'),
('ana.ferreira@trainer.test',    'francisca.oliveira@client.test'),
-- João Santos → 5 clientes
('joao.santos@trainer.test',     'nuno.barbosa@client.test'),
('joao.santos@trainer.test',     'luis.fernandes@client.test'),
('joao.santos@trainer.test',     'constanca.pereira@client.test'),
('joao.santos@trainer.test',     'leonor.martins@client.test'),
('joao.santos@trainer.test',     'mafalda.ribeiro@client.test'),
-- Maria Costa → 5 clientes
('maria.costa@trainer.test',     'bruno.correia@client.test'),
('maria.costa@trainer.test',     'sergio.mendes@client.test'),
('maria.costa@trainer.test',     'matilde.costa@client.test'),
('maria.costa@trainer.test',     'raquel.silva@client.test'),
('maria.costa@trainer.test',     'vanessa.ferreira@client.test'),
-- Pedro Oliveira → 5 clientes
('pedro.oliveira@trainer.test',  'alexandre.costa@client.test'),
('pedro.oliveira@trainer.test',  'vasco.pinto@client.test'),
('pedro.oliveira@trainer.test',  'joana.carvalho@client.test'),
('pedro.oliveira@trainer.test',  'patricia.figueiredo@client.test'),
('pedro.oliveira@trainer.test',  'liliana.azevedo@client.test'),
-- Sofia Rodrigues → 5 clientes
('sofia.rodrigues@trainer.test', 'marco.alves@client.test'),
('sofia.rodrigues@trainer.test', 'daniel.castro@client.test'),
('sofia.rodrigues@trainer.test', 'susana.monteiro@client.test'),
('sofia.rodrigues@trainer.test', 'catia.soares@client.test'),
('sofia.rodrigues@trainer.test', 'veronica.pires@client.test'),
-- Miguel Pereira → 5 clientes
('miguel.pereira@trainer.test',  'rodrigo.carvalho@client.test'),
('miguel.pereira@trainer.test',  'henrique.mota@client.test'),
('miguel.pereira@trainer.test',  'alexandra.baptista@client.test'),
('miguel.pereira@trainer.test',  'marta.teixeira@client.test'),
('miguel.pereira@trainer.test',  'cristina.varela@client.test'),
-- Rita Carvalho → 5 clientes
('rita.carvalho@trainer.test',   'rafael.cunha@client.test'),
('rita.carvalho@trainer.test',   'gustavo.rocha@client.test'),
('rita.carvalho@trainer.test',   'helena.duarte@client.test'),
('rita.carvalho@trainer.test',   'luisa.goncalves@client.test'),
('rita.carvalho@trainer.test',   'isabel.campos@client.test'),
-- Rui Martins → 5 clientes
('rui.martins@trainer.test',     'samuel.almeida@client.test'),
('rui.martins@trainer.test',     'leandro.ferreira@client.test'),
('rui.martins@trainer.test',     'teresa.moura@client.test'),
('rui.martins@trainer.test',     'celia.henriques@client.test'),
('rui.martins@trainer.test',     'andreia.branco@client.test'),
-- Catarina Lopes → 5 clientes
('catarina.lopes@trainer.test',  'renato.gomes@client.test'),
('catarina.lopes@trainer.test',  'fabio.vieira@client.test'),
('catarina.lopes@trainer.test',  'cristiano.lopes@client.test'),
('catarina.lopes@trainer.test',  'marcio.santos@client.test'),
('catarina.lopes@trainer.test',  'eduardo.freitas@client.test')
);
