-- ═══════════════════════════════════════════════════════════════════
-- TrAIner — 30 Workout Protocols + Exercises
-- Linked to the existing Studio and its owner
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  s_id uuid;   -- studio id
  c_id uuid;   -- created_by (owner)
  -- Protocol IDs
  p01 uuid; p02 uuid; p03 uuid; p04 uuid; p05 uuid;
  p06 uuid; p07 uuid; p08 uuid; p09 uuid; p10 uuid;
  p11 uuid; p12 uuid; p13 uuid; p14 uuid; p15 uuid;
  p16 uuid; p17 uuid; p18 uuid; p19 uuid; p20 uuid;
  p21 uuid; p22 uuid; p23 uuid; p24 uuid; p25 uuid;
  p26 uuid; p27 uuid; p28 uuid; p29 uuid; p30 uuid;
BEGIN
  SELECT id, owner_id INTO s_id, c_id FROM studios LIMIT 1;

  -- ─── WEIGHT LOSS (6) ─────────────────────────────────────────────

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Full Body Beginner Fat Burn','Weight loss','beginner',45,
   'Gentle full-body circuit for beginners starting their fat-loss journey. Low impact, high repetition, minimal equipment.',
   ARRAY['Severe joint pain','Uncontrolled hypertension'],
   ARRAY['beginner','weight-loss','full-body','low-impact'],true)
  RETURNING id INTO p01;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'HIIT Cardio Blast','Weight loss','intermediate',30,
   '20/10 interval-style workout that spikes heart rate and maximises calorie burn in minimum time.',
   ARRAY['Knee injuries','Recent surgery','Pregnancy'],
   ARRAY['intermediate','hiit','cardio','weight-loss'],true)
  RETURNING id INTO p02;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Metabolic Circuit Training','Weight loss','intermediate',45,
   'Kettlebell and compound movements in circuit format. Keeps heart rate elevated throughout.',
   ARRAY['Lower back injury (acute)','Wrist instability'],
   ARRAY['intermediate','circuit','metabolic','kettlebell'],true)
  RETURNING id INTO p03;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Fat Burn Tabata','Weight loss','advanced',30,
   'Pure Tabata protocol: 8 rounds of 20s max effort / 10s rest per station. Maximises EPOC effect.',
   ARRAY['Cardiovascular conditions','Joint injuries','Beginners'],
   ARRAY['advanced','tabata','hiit','weight-loss'],true)
  RETURNING id INTO p04;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Express Lunch Break Burner','Weight loss','beginner',30,
   'Zero equipment 30-minute session designed for desk workers. Bodyweight only.',
   ARRAY['None'],
   ARRAY['beginner','bodyweight','express','office-friendly'],true)
  RETURNING id INTO p05;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Home Bodyweight Burn','Weight loss','intermediate',40,
   'No equipment needed. Plyometric and calisthenic movements for fat loss at home.',
   ARRAY['Knee injuries (jumping)','Lower back (acute)'],
   ARRAY['intermediate','home','bodyweight','weight-loss'],true)
  RETURNING id INTO p06;

  -- ─── STRENGTH (6) ────────────────────────────────────────────────

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Beginner Strength Foundation','Strength','beginner',45,
   'Teaches the fundamental movement patterns: squat, hinge, push, pull, carry. Safe loading with dumbbells.',
   ARRAY['None with proper form guidance'],
   ARRAY['beginner','strength','foundation','compound'],true)
  RETURNING id INTO p07;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Full Body Strength — Barbell','Strength','intermediate',60,
   'The big three plus accessories. Linear progression model. 4–6 rep ranges for strength adaptation.',
   ARRAY['Lower back injury','Shoulder impingement'],
   ARRAY['intermediate','strength','barbell','compound'],true)
  RETURNING id INTO p08;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Upper Body Strength Day','Strength','intermediate',60,
   'Push-pull split focused on shoulder girdle strength. Bench, weighted pull-up, overhead press.',
   ARRAY['Shoulder impingement (modify OHP)'],
   ARRAY['intermediate','strength','upper-body','push-pull'],true)
  RETURNING id INTO p09;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Lower Body Power Day','Strength','intermediate',60,
   'Heavy squat, RDL, leg press and Bulgarian split squat. 5×5 methodology for leg strength.',
   ARRAY['Knee injury (modify depth)','Hip impingement'],
   ARRAY['intermediate','strength','lower-body','powerlifting'],true)
  RETURNING id INTO p10;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Functional Fitness','Strength','intermediate',50,
   'Kettlebell, carries and compound movements. Trains movement quality over isolated strength.',
   ARRAY['Wrist instability (Turkish get-up)'],
   ARRAY['intermediate','functional','kettlebell','athletic'],true)
  RETURNING id INTO p11;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Advanced Powerlifting Session','Strength','advanced',90,
   'Competition-style heavy squat, bench and deadlift. Submaximal intensity with accessory work.',
   ARRAY['Untreated hypertension','Acute lower back injury','Beginners'],
   ARRAY['advanced','powerlifting','barbell','heavy'],true)
  RETURNING id INTO p12;

  -- ─── HYPERTROPHY (6) ─────────────────────────────────────────────

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Push Day — Chest & Shoulders','Hypertrophy','advanced',75,
   'Horizontal and vertical pushing patterns for chest, anterior and medial delts, triceps. 10–15 rep ranges.',
   ARRAY['Shoulder impingement (modify OHP)','Rotator cuff tear'],
   ARRAY['advanced','hypertrophy','push','chest','shoulders'],true)
  RETURNING id INTO p13;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Pull Day — Back & Biceps','Hypertrophy','advanced',75,
   'Vertical and horizontal pulling for lat width and back thickness. Bicep isolation at the end.',
   ARRAY['Bicep tendon issues'],
   ARRAY['advanced','hypertrophy','pull','back','biceps'],true)
  RETURNING id INTO p14;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Leg Day Hypertrophy','Hypertrophy','advanced',75,
   'High volume quad-dominant session. Squat, leg press, RDL, leg extension and curl. 10–15 reps.',
   ARRAY['Knee injury (modify depth)','Lower back (acute)'],
   ARRAY['advanced','hypertrophy','legs','quads','glutes'],true)
  RETURNING id INTO p15;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Arms & Core Sculpt','Hypertrophy','intermediate',45,
   'Dedicated arm session: bicep curls, tricep extensions, hammer curls, with core finisher.',
   ARRAY['Elbow tendinopathy'],
   ARRAY['intermediate','hypertrophy','arms','core'],true)
  RETURNING id INTO p16;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Chest & Back Superset','Hypertrophy','advanced',60,
   'Antagonist supersets pairing chest and back exercises. Maximises blood flow and time efficiency.',
   ARRAY['Shoulder impingement'],
   ARRAY['advanced','hypertrophy','superset','chest','back'],true)
  RETURNING id INTO p17;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Beginner Muscle Building','Hypertrophy','beginner',50,
   'Machine-based introduction to hypertrophy training. Safe loading with guided range of motion.',
   ARRAY['None with correct machine setup'],
   ARRAY['beginner','hypertrophy','machines','muscle-building'],true)
  RETURNING id INTO p18;

  -- ─── ENDURANCE (4) ───────────────────────────────────────────────

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Cardio Base Builder','Endurance','beginner',45,
   'Low-intensity steady-state cardio using multiple modalities. Builds aerobic base for beginners.',
   ARRAY['Cardiovascular disease (medical clearance required)'],
   ARRAY['beginner','endurance','cardio','steady-state','low-impact'],true)
  RETURNING id INTO p19;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Running Prep Circuit','Endurance','intermediate',45,
   'Activation, drills and tempo intervals. Prepares the body for running performance.',
   ARRAY['Ankle instability','IT band syndrome (modify)'],
   ARRAY['intermediate','endurance','running','drills'],true)
  RETURNING id INTO p20;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Endurance Circuit','Endurance','intermediate',60,
   'Jump rope, cycling and bodyweight movement circuits. Builds muscular and cardiovascular endurance.',
   ARRAY['Knee injuries (modify jumping)'],
   ARRAY['intermediate','endurance','circuit','cardio'],true)
  RETURNING id INTO p21;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'5K Training Session','Endurance','intermediate',50,
   'Structured 5K training block: warm-up, easy run, 400m intervals, cool-down.',
   ARRAY['Shin splints (reduce volume)','Plantar fasciitis'],
   ARRAY['intermediate','endurance','running','5k','intervals'],true)
  RETURNING id INTO p22;

  -- ─── MOBILITY & FLEXIBILITY (4) ──────────────────────────────────

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Morning Mobility Flow','Mobility','beginner',30,
   'Full-body mobility sequence ideal for morning use. Addresses spine, hips and shoulders.',
   ARRAY['None'],
   ARRAY['beginner','mobility','morning','flexibility','daily'],true)
  RETURNING id INTO p23;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Hip & Lower Back Relief','Mobility','beginner',30,
   'Targeted mobility and stretching for lower back pain relief. Gentle and safe for most populations.',
   ARRAY['Acute disc herniation (consult physio)'],
   ARRAY['beginner','mobility','lower-back','hip','pain-relief'],true)
  RETURNING id INTO p24;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Full Body Stretch & Recovery','Mobility','beginner',45,
   'Post-workout full-body stretching sequence. Addresses the major muscle groups trained.',
   ARRAY['None'],
   ARRAY['beginner','recovery','stretch','cool-down','flexibility'],true)
  RETURNING id INTO p25;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Postural Correction & Alignment','Mobility','beginner',45,
   'Targets the muscles responsible for poor posture: upper traps, pecs, hip flexors. Activates mid-back.',
   ARRAY['None'],
   ARRAY['beginner','posture','alignment','desk-worker','corrective'],true)
  RETURNING id INTO p26;

  -- ─── REHAB & LOW IMPACT (4) ──────────────────────────────────────

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Knee Rehab & Strengthening','Mobility','beginner',30,
   'Evidence-based knee rehabilitation focusing on VMO activation, quad control and hip abductors.',
   ARRAY['Post-surgical without physio clearance'],
   ARRAY['beginner','rehab','knee','VMO','low-impact'],true)
  RETURNING id INTO p27;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Shoulder Rehab Protocol','Mobility','beginner',30,
   'Rotator cuff strengthening and scapular stabilisation. Addresses common impingement causes.',
   ARRAY['Acute rotator cuff tear (surgeon clearance required)'],
   ARRAY['beginner','rehab','shoulder','rotator-cuff','low-impact'],true)
  RETURNING id INTO p28;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Low Back Rehab & Core','Mobility','beginner',40,
   'McKenzie-based approach combined with deep core activation. Reduces lumbar pain and builds stability.',
   ARRAY['Acute disc herniation','Spinal stenosis (modify extension work)'],
   ARRAY['beginner','rehab','lower-back','core','mckenzie'],true)
  RETURNING id INTO p29;

  INSERT INTO workout_protocols (studio_id,created_by,name,objective,level,duration_minutes,description,contraindications,tags,is_public) VALUES
  (s_id,c_id,'Cycle Phase Adaptation','Mobility','intermediate',45,
   'Adapted workout for the menstrual or luteal phase. Low impact, breathwork and pelvic mobility focus.',
   ARRAY['None — specifically designed for cycle-related discomfort'],
   ARRAY['intermediate','womens-health','cycle','low-impact','pelvic-floor'],true)
  RETURNING id INTO p30;

  -- ═══════════════════════════════════════════════════════════════════
  -- EXERCISES
  -- ═══════════════════════════════════════════════════════════════════

  -- ── P01: Full Body Beginner Fat Burn ────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p01,'Bodyweight Squat','Legs',3,15,null,45,'low','Foundation lower body movement; knee tracking over toes','Seated Leg Press',0),
  (p01,'Modified Push-up (Knees)','Chest',3,10,null,45,'low','Builds chest and tricep baseline; from knees if needed','Wall Push-up',1),
  (p01,'Dumbbell Bent-over Row','Back',3,12,8,45,'low','Introduces pulling mechanics; corrects posture','Resistance Band Row',2),
  (p01,'Plank Hold','Core',3,null,null,30,'low','Anti-extension core stability; protects lumbar spine',null,3),
  (p01,'Step-up','Legs',3,12,null,45,'low','Unilateral leg work with minimal joint stress','Reverse Lunge',4);

  -- ── P02: HIIT Cardio Blast ────────────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p02,'Jump Squat','Legs',4,15,null,20,'high','Plyometric lower body; spikes heart rate immediately','Squat (no jump)',0),
  (p02,'Burpee','Full body',4,10,null,20,'high','Full body power and cardio combined','Squat Thrust (no jump)',1),
  (p02,'Mountain Climber','Core',4,20,null,20,'high','Core and cardio combined; burns calories efficiently','Plank Hold',2),
  (p02,'High Knees','Cardio',4,null,null,15,'high','Elevates heart rate; engages hip flexors','Marching in Place',3),
  (p02,'Box Jump','Legs',4,8,null,30,'high','Explosive power; high calorie expenditure','Step-up',4);

  -- ── P03: Metabolic Circuit Training ─────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p03,'Kettlebell Swing','Full body',4,20,16,30,'high','Hip-hinge power movement; high metabolic demand','Dumbbell Deadlift',0),
  (p03,'Goblet Squat','Legs',4,15,12,30,'moderate','Front-loaded squat; quad and glute emphasis','Bodyweight Squat',1),
  (p03,'Dumbbell Thruster','Full body',4,12,10,30,'high','Squat to overhead press; full body metabolic compound','Squat + Shoulder Press',2),
  (p03,'Battle Rope Waves','Cardio',4,null,null,30,'high','Upper body conditioning and heart rate spike','Shadow Boxing',3),
  (p03,'Rowing Machine','Cardio',4,null,null,30,'high','Full body cardio; low impact on joints','Stationary Bike',4);

  -- ── P04: Fat Burn Tabata ─────────────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p04,'Treadmill Sprint (20s on / 10s off)','Cardio',8,null,null,10,'high','Max effort sprint; maximises EPOC effect','Bike Sprint',0),
  (p04,'Burpee (20s on / 10s off)','Full body',8,null,null,10,'high','Tabata burpees; total body calorie burn','Jumping Jacks',1),
  (p04,'Jump Rope (20s on / 10s off)','Cardio',8,null,null,10,'high','High calorie burn; coordination','High Knees',2),
  (p04,'Plyo Push-up (20s on / 10s off)','Chest',8,null,null,10,'high','Explosive upper body; maintains heart rate','Standard Push-up',3),
  (p04,'Jump Squat (20s on / 10s off)','Legs',8,null,null,10,'high','Lower body power; maintains elevated heart rate','Squat',4);

  -- ── P05: Express Lunch Break Burner ─────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p05,'Jumping Jacks','Full body',2,30,null,30,'moderate','Whole body warm-up and cardio; no equipment','March in Place',0),
  (p05,'Push-up','Chest',3,12,null,30,'moderate','Upper body compound; no equipment needed','Modified Push-up',1),
  (p05,'Bodyweight Squat','Legs',3,20,null,30,'moderate','Lower body activation; no equipment','Wall Sit',2),
  (p05,'Plank','Core',3,null,null,20,'moderate','Core stability; posture reset after desk work','Dead Bug',3),
  (p05,'Glute Bridge','Legs',3,15,null,30,'low','Glute activation; counteracts prolonged sitting','Donkey Kick',4);

  -- ── P06: Home Bodyweight Burn ─────────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p06,'Squat Jump','Legs',3,15,null,45,'high','Plyometric lower body; elevates heart rate','Sumo Squat',0),
  (p06,'Diamond Push-up','Arms',3,10,null,45,'moderate','Tricep emphasis; no equipment','Standard Push-up',1),
  (p06,'Reverse Lunge','Legs',3,12,null,45,'moderate','Unilateral leg work; glute and quad focused','Static Lunge',2),
  (p06,'Superman Hold','Back',3,12,null,30,'low','Lower back and glute activation','Bird-Dog',3),
  (p06,'Russian Twist','Core',3,20,null,30,'moderate','Rotational core work','Seated Knee Tuck',4),
  (p06,'Tricep Dip (Chair)','Arms',3,12,null,45,'moderate','Tricep compound using household furniture','Push-up',5);

  -- ── P07: Beginner Strength Foundation ───────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p07,'Goblet Squat','Legs',3,12,10,60,'low','Teaches squat pattern with frontal load; beginner-friendly','Bodyweight Squat',0),
  (p07,'Dumbbell Bench Press','Chest',3,10,12,60,'low','Fundamental pushing movement; dumbbells allow natural path','Push-up',1),
  (p07,'Seated Cable Row','Back',3,12,20,60,'low','Introduces pulling with controlled resistance','Resistance Band Row',2),
  (p07,'Dumbbell Shoulder Press','Shoulders',3,10,8,60,'low','Overhead pressing pattern; shoulder stability baseline','Front Raise',3),
  (p07,'Plank','Core',3,null,null,45,'low','Core bracing for safe lifting; protects lumbar in compound lifts','Dead Bug',4);

  -- ── P08: Full Body Strength — Barbell ───────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p08,'Barbell Back Squat','Legs',4,6,60,90,'high','Primary lower body compound; total body demand','Leg Press',0),
  (p08,'Bench Press','Chest',4,6,70,90,'high','Primary horizontal push; chest and triceps','Dumbbell Press',1),
  (p08,'Deadlift','Full body',3,5,80,120,'high','King of compound movements; posterior chain','Romanian Deadlift',2),
  (p08,'Barbell Row','Back',4,6,50,90,'high','Horizontal pull to balance pressing volume','Dumbbell Row',3),
  (p08,'Overhead Press','Shoulders',3,8,40,90,'high','Vertical push; shoulder and core stability','Seated DB Press',4);

  -- ── P09: Upper Body Strength Day ────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p09,'Bench Press','Chest',4,8,65,90,'high','Primary horizontal push for chest mass and strength','Dumbbell Bench Press',0),
  (p09,'Weighted Pull-up','Back',4,6,10,90,'high','Vertical pull; lat width and bicep strength','Lat Pulldown',1),
  (p09,'Barbell Row','Back',3,8,55,90,'moderate','Horizontal pull for mid-back thickness','Cable Row',2),
  (p09,'Overhead Press','Shoulders',3,8,45,90,'moderate','Vertical push; deltoid and tricep strength','Seated DB Press',3),
  (p09,'Dips','Arms',3,10,null,60,'high','Chest and tricep compound; bodyweight','Tricep Pushdown',4),
  (p09,'Barbell Curl','Arms',3,10,25,60,'moderate','Bicep development; supination emphasis','Dumbbell Curl',5);

  -- ── P10: Lower Body Power Day ────────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p10,'Back Squat','Legs',5,5,80,120,'high','Primary strength squat; maximal lower body load','Front Squat',0),
  (p10,'Romanian Deadlift','Legs',4,8,60,90,'high','Hip hinge; hamstring and glute emphasis','Lying Leg Curl',1),
  (p10,'Leg Press','Legs',4,10,120,60,'moderate','Quad volume with safe knee loading','Hack Squat',2),
  (p10,'Bulgarian Split Squat','Legs',3,10,20,90,'high','Unilateral strength; exposes left-right imbalances','Reverse Lunge',3),
  (p10,'Standing Calf Raise','Legs',4,15,40,45,'moderate','Calf strength; ankle stability','Seated Calf Raise',4);

  -- ── P11: Functional Fitness ──────────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p11,'Kettlebell Swing','Full body',4,15,20,60,'high','Hip-hinge power; functional posterior chain','Dumbbell Deadlift',0),
  (p11,'Turkish Get-up','Full body',3,3,16,90,'moderate','Total body stability, coordination and shoulder strength','Dumbbell Press + Sit-up',1),
  (p11,'Farmer''s Walk','Full body',4,null,24,60,'high','Loaded carry; grip and core stability under load','Suitcase Carry',2),
  (p11,'Box Jump','Legs',4,6,null,60,'high','Explosive power production; rate of force development','Step-up',3),
  (p11,'Battle Rope Slam','Cardio',4,null,null,30,'high','Metabolic conditioning; upper body power endurance','Resistance Band Slam',4);

  -- ── P12: Advanced Powerlifting Session ──────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p12,'Competition Squat','Legs',5,3,100,180,'high','Heavy squat at ~85% 1RM; maximal strength development','Pause Squat',0),
  (p12,'Competition Bench Press','Chest',5,3,90,180,'high','Heavy bench; maximal horizontal push strength','Close Grip Bench',1),
  (p12,'Competition Deadlift','Full body',4,2,120,240,'high','Heavy pull; posterior chain maximal strength','Sumo Deadlift',2),
  (p12,'Overhead Press','Shoulders',4,5,60,120,'high','Strict press; shoulder and tricep accessory','Push Press',3),
  (p12,'Barbell Row','Back',4,5,70,120,'high','Back thickness and pull strength accessory','T-Bar Row',4);

  -- ── P13: Push Day — Chest & Shoulders ───────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p13,'Flat Bench Press','Chest',4,10,75,90,'high','Primary chest mass builder; full pec stretch','Dumbbell Press',0),
  (p13,'Incline Dumbbell Press','Chest',4,12,28,75,'high','Upper chest emphasis; clavicular head activation','Incline Barbell Press',1),
  (p13,'Cable Fly','Chest',3,15,15,60,'moderate','Chest isolation; peak contraction at midline','Pec Dec',2),
  (p13,'Seated Dumbbell Press','Shoulders',4,12,22,75,'high','Shoulder mass; anterior and medial delts','Barbell OHP',3),
  (p13,'Lateral Raise','Shoulders',4,15,10,45,'moderate','Medial delt width; shoulder capping','Cable Lateral Raise',4),
  (p13,'Tricep Pushdown','Arms',3,15,20,45,'moderate','Tricep isolation after heavy pressing volume','Skull Crusher',5);

  -- ── P14: Pull Day — Back & Biceps ────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p14,'Deadlift','Full body',4,6,90,120,'high','Heavy pull for overall posterior chain mass','Trap Bar Deadlift',0),
  (p14,'Pull-up','Back',4,8,null,90,'high','Vertical pull; lat width and upper back strength','Assisted Pull-up',1),
  (p14,'Barbell Row','Back',4,10,60,75,'high','Horizontal pull for back thickness and density','T-Bar Row',2),
  (p14,'Face Pull','Shoulders',4,15,15,45,'moderate','Rear delt and external rotation; shoulder joint health','Reverse Fly',3),
  (p14,'Hammer Curl','Arms',3,12,18,60,'moderate','Brachialis and brachioradialis; arm thickness','Dumbbell Curl',4),
  (p14,'Incline Dumbbell Curl','Arms',3,12,12,60,'low','Bicep stretch position; peak contraction development','Cable Curl',5);

  -- ── P15: Leg Day Hypertrophy ──────────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p15,'Barbell Back Squat','Legs',4,10,80,90,'high','Primary quad and glute mass builder','Smith Machine Squat',0),
  (p15,'Leg Press','Legs',4,15,140,75,'high','Volume accumulation; safe knee loading for high reps','Hack Squat',1),
  (p15,'Romanian Deadlift','Legs',4,12,60,75,'high','Hamstring stretch loading; glute emphasis','Lying Leg Curl',2),
  (p15,'Leg Extension','Legs',4,15,35,45,'moderate','Quad isolation; terminal extension for VMO','Wall Sit',3),
  (p15,'Leg Curl','Legs',4,12,30,45,'moderate','Hamstring isolation; complements quad-dominant session','Nordic Curl',4),
  (p15,'Standing Calf Raise','Legs',5,20,60,45,'moderate','Calf hypertrophy requires high volume','Donkey Calf Raise',5);

  -- ── P16: Arms & Core Sculpt ──────────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p16,'Barbell Curl','Arms',4,12,25,60,'moderate','Bicep mass builder; full supination range','Dumbbell Curl',0),
  (p16,'Skull Crusher (EZ Bar)','Arms',4,12,25,60,'moderate','Tricep long head emphasis; mass builder','Overhead Tricep Extension',1),
  (p16,'Hammer Curl','Arms',3,12,18,45,'moderate','Brachialis and forearm thickness','Reverse Curl',2),
  (p16,'Cable Pushdown','Arms',3,15,20,45,'moderate','Tricep peak isolation; constant tension','Kickback',3),
  (p16,'Cable Crunch','Core',4,15,25,45,'moderate','Weighted core flexion; rectus abdominis','Crunch',4),
  (p16,'Side Plank','Core',3,null,null,30,'low','Oblique and lateral core stability','Hip Abduction',5);

  -- ── P17: Chest & Back Superset ────────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p17,'Bench Press (superset with Pull-up)','Chest',4,10,70,30,'high','Antagonist superset; chest press then vertical pull','DB Press + Lat Pulldown',0),
  (p17,'Incline Press (superset with Cable Row)','Chest',4,12,55,30,'high','Upper chest / mid-back balance in superset','DB Incline + DB Row',1),
  (p17,'Dumbbell Fly (superset with Face Pull)','Chest',3,15,14,30,'moderate','Chest isolation paired with rear delt health work','Cable Fly + Band Pull-apart',2),
  (p17,'Dips (superset with Inverted Row)','Arms',3,10,null,45,'high','Bodyweight push-pull superset; no equipment needed','Pushdown + Cable Row',3);

  -- ── P18: Beginner Muscle Building ────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p18,'Leg Press','Legs',3,12,60,75,'low','Safe lower body loading introduction; no balance required','Goblet Squat',0),
  (p18,'Dumbbell Chest Press','Chest',3,12,14,75,'low','Horizontal push with dumbbells; natural pressing path','Push-up',1),
  (p18,'Lat Pulldown','Back',3,12,35,75,'low','Vertical pulling introduction; builds lat width safely','Assisted Pull-up',2),
  (p18,'Dumbbell Shoulder Press','Shoulders',3,10,10,60,'low','Overhead pressing foundation; seated for stability','Front Raise',3),
  (p18,'Cable Bicep Curl','Arms',3,12,12,45,'low','Bicep introduction; constant cable tension','Dumbbell Curl',4),
  (p18,'Tricep Pushdown','Arms',3,12,12,45,'low','Tricep development; elbow health with cable','Overhead Tricep',5);

  -- ── P19: Cardio Base Builder ──────────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p19,'Treadmill Walk (warm-up)','Cardio',1,null,null,null,'low','10 min easy walk; establish aerobic baseline','Stationary Bike (easy)',0),
  (p19,'Stationary Bike (moderate)','Cardio',2,null,null,60,'low','10 min per set; fat-burning zone 60-70% HR max','Elliptical',1),
  (p19,'Rowing Machine','Cardio',2,null,null,60,'moderate','5 min per set; full body low impact cardio','Ski Erg',2),
  (p19,'Elliptical Trainer','Cardio',1,null,null,null,'low','10 min joint-friendly steady state','Bike',3),
  (p19,'Cool-down Walk','Cardio',1,null,null,null,'low','5 min gradual HR reduction','Stationary Bike (easy)',4);

  -- ── P20: Running Prep Circuit ─────────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p20,'Glute Bridge','Legs',3,15,null,30,'low','Glute activation before running; prevents hip drop','Hip Thrust',0),
  (p20,'Lateral Band Walk','Legs',3,15,null,30,'low','Hip abductor activation; prevents IT band issues','Side-lying Clamshell',1),
  (p20,'A-Skip Drill','Cardio',3,null,null,30,'moderate','Running mechanics drill; hip drive and cadence','High Knees',2),
  (p20,'Tempo Run (treadmill)','Cardio',4,null,null,90,'moderate','5 min per set at threshold pace; improves VO2 max','Cycling Intervals',3),
  (p20,'Standing Calf Raise','Legs',3,20,null,30,'moderate','Achilles and calf strength for running economy','Jump Rope',4);

  -- ── P21: Endurance Circuit ────────────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p21,'Jump Rope','Cardio',5,null,null,60,'moderate','2 min per set; cardio efficiency and coordination','High Knees',0),
  (p21,'Stationary Bike (moderate)','Cardio',3,null,null,60,'moderate','5 min per set; aerobic base between circuits','Rowing',1),
  (p21,'Step-up','Legs',4,15,null,45,'moderate','Leg muscular endurance; controlled single-leg movement','Reverse Lunge',2),
  (p21,'Push-up','Chest',4,20,null,45,'moderate','Upper body muscular endurance at high reps','Modified Push-up',3),
  (p21,'Plank','Core',4,null,null,30,'moderate','Core endurance; sustains posture under cardiovascular fatigue','Side Plank',4);

  -- ── P22: 5K Training Session ─────────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p22,'Dynamic Warm-up','Full body',1,null,null,null,'low','10 min joint mobility and muscle activation before running','Light Jog',0),
  (p22,'Easy Run','Cardio',1,null,null,null,'low','15 min at conversational pace; aerobic base','Treadmill Walk/Run',1),
  (p22,'400m Interval Run','Cardio',6,null,null,90,'high','6 x 400m at 5K race pace; improves speed and VO2 max','Bike Intervals',2),
  (p22,'Easy Run (cool-down)','Cardio',1,null,null,null,'low','10 min active recovery; flush lactic acid','Walk',3),
  (p22,'Standing Recovery Stretch','Full body',1,null,null,null,'low','5 min post-run stretch; hamstring and calf focus','Foam Roll',4);

  -- ── P23: Morning Mobility Flow ────────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p23,'Cat-Cow','Full body',3,10,null,15,'low','Spinal mobilisation; wakes up the spine gently','Seated Rotation',0),
  (p23,'World''s Greatest Stretch','Full body',3,5,null,20,'low','Multi-joint mobility; hip flexor and thoracic spine','Hip Flexor Lunge',1),
  (p23,'Hip Circle (standing)','Legs',2,10,null,15,'low','Hip joint mobility; reduces morning stiffness','Standing Hip Flexor Stretch',2),
  (p23,'Shoulder Dislocate (Band)','Shoulders',3,10,null,20,'low','Shoulder mobility; opens thoracic extension','Doorway Stretch',3),
  (p23,'Downward Dog to Cobra','Full body',3,8,null,15,'low','Full spine mobility and hamstring lengthening','Pike Stretch',4),
  (p23,'90/90 Hip Stretch','Legs',2,null,null,null,'low','Hip internal and external rotation; 45s per side','Figure-4 Stretch',5);

  -- ── P24: Hip & Lower Back Relief ─────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p24,'Knee-to-Chest Stretch','Legs',3,null,null,null,'low','Lumbar decompression; 30s per side','Supine Twist',0),
  (p24,'Piriformis Stretch (Figure-4)','Legs',3,null,null,null,'low','Sciatic nerve relief; hip external rotator; 30s per side','Seated Figure-4',1),
  (p24,'Child''s Pose','Full body',3,null,null,null,'low','Lower back lengthening; thoracic release; 45s hold','Seated Forward Fold',2),
  (p24,'Bird-Dog','Core',3,8,null,15,'low','Lumbar stability without spinal loading; alternating arm/leg','Dead Bug',3),
  (p24,'Glute Bridge','Legs',3,12,null,30,'low','Glute activation to unload and decompress lower back','Clamshell',4),
  (p24,'Cat-Cow (breath-led)','Full body',3,10,null,15,'low','Dynamic lumbar mobility with breath; pain-relieving','Pelvic Tilt',5);

  -- ── P25: Full Body Stretch & Recovery ────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p25,'Hamstring Stretch (supine)','Legs',3,null,null,null,'low','Post-workout hamstring lengthening; 45s per side','Standing Toe Touch',0),
  (p25,'Hip Flexor Lunge Stretch','Legs',3,null,null,null,'low','Counteracts squatting and sitting patterns; 45s per side','Lunge with Twist',1),
  (p25,'Lat Stretch (overhead)','Back',3,null,null,null,'low','Releases lat tension after pulling work; 30s per side','Overhead Side Bend',2),
  (p25,'Pec Stretch (doorway)','Chest',3,null,null,null,'low','Opens chest; counters forward posture; 30s per side','Band Pull-apart',3),
  (p25,'Standing Quad Stretch','Legs',3,null,null,null,'low','Releases quadricep tension post-training; 30s per side','Kneeling Stretch',4),
  (p25,'Shoulder Cross-body Stretch','Shoulders',3,null,null,null,'low','Posterior capsule release; 30s per side','Sleeper Stretch',5);

  -- ── P26: Postural Correction & Alignment ─────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p26,'Wall Angel','Shoulders',3,10,null,30,'low','Scapular retraction and thoracic extension against wall','Band Pull-apart',0),
  (p26,'Face Pull','Shoulders',4,15,10,30,'low','Rear delt and external rotation; key postural muscle','Reverse Fly',1),
  (p26,'Band Pull-apart','Shoulders',4,20,null,20,'low','Upper back activation; corrects rounded shoulders','Y-T-W Raises',2),
  (p26,'Dead Bug','Core',3,8,null,30,'low','Deep core stability; neutral spine maintenance','Bird-Dog',3),
  (p26,'Hip Thrust','Legs',3,15,null,30,'low','Glute activation; corrects anterior pelvic tilt','Glute Bridge',4),
  (p26,'Chin Tuck (seated)','Full body',3,10,null,20,'low','Cervical alignment; corrects forward head posture','Neck Retraction',5);

  -- ── P27: Knee Rehab & Strengthening ──────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p27,'Quad Set (isometric)','Legs',3,10,null,30,'low','Isometric quad activation; VMO recruitment at 0° extension','Straight Leg Raise',0),
  (p27,'Short Arc Quad','Legs',3,15,null,30,'low','Terminal knee extension; improves patellar tracking','Leg Extension (partial range)',1),
  (p27,'Clamshell','Legs',3,15,null,20,'low','Hip abductor strength; reduces knee valgus collapse','Side-lying Hip Abduction',2),
  (p27,'Step-down (eccentric)','Legs',3,10,null,45,'low','Eccentric quad control; loads patellar tendon safely','Wall Sit',3),
  (p27,'Terminal Knee Extension (Band)','Legs',3,15,null,30,'low','VMO isolation; knee joint stability in closed chain','Shallow Squat',4);

  -- ── P28: Shoulder Rehab Protocol ─────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p28,'Pendulum Exercise','Shoulders',3,null,null,30,'low','Glenohumeral joint distraction; pain-free passive motion','Arm Circles',0),
  (p28,'Internal/External Rotation (Band)','Shoulders',3,15,null,30,'low','Rotator cuff strengthening; stabilises glenohumeral joint','Light Dumbbell Rotation',1),
  (p28,'Scapular Wall Slide','Shoulders',3,10,null,30,'low','Serratus anterior and lower trapezius activation','Wall Angel',2),
  (p28,'Side-lying External Rotation','Shoulders',3,15,null,30,'low','Infraspinatus and teres minor; posterior rotator cuff','Band External Rotation',3),
  (p28,'Y-T-W Raises (prone)','Shoulders',3,10,null,30,'low','Lower trap and mid-back; scapular stability and control','Face Pull',4);

  -- ── P29: Low Back Rehab & Core ────────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p29,'Pelvic Tilt (supine)','Core',3,10,null,20,'low','Lumbar awareness and gentle core activation; pain relief','Cat-Cow',0),
  (p29,'Dead Bug','Core',3,6,null,30,'low','Anti-extension core stability; protects lumbar spine','Bird-Dog',1),
  (p29,'Glute Bridge','Legs',3,15,null,30,'low','Glute activation to reduce lumbar load and compression','Hip Thrust (no load)',2),
  (p29,'Prone Press-up (McKenzie)','Full body',3,8,null,20,'low','Lumbar extension; centralisation technique for disc pain','Cobra Pose',3),
  (p29,'Side-lying Hip Abduction','Legs',3,12,null,20,'low','Glute medius strength; reduces lumbar compensation','Clamshell',4),
  (p29,'Standing Cat-Cow','Full body',3,10,null,15,'low','Functional lumbar mobility in standing; daily movement','Seated Rotation',5);

  -- ── P30: Cycle Phase Adaptation ──────────────────────────────────
  INSERT INTO protocol_exercises (protocol_id,exercise_name,muscle_group,sets,reps,load_kg,rest_seconds,intensity,notes,alternative_exercise,order_index) VALUES
  (p30,'Standing Hip Circle','Legs',3,10,null,20,'low','Pelvic and hip mobility; relieves menstrual-related tension','Knee Circle',0),
  (p30,'Child''s Pose (restorative)','Full body',3,null,null,null,'low','Pelvic floor relief; lower back decompression; 60s hold','Seated Forward Fold',1),
  (p30,'Supported Glute Bridge','Legs',3,10,null,30,'low','Gentle glute and pelvic floor activation','Glute Squeeze',2),
  (p30,'Lateral Band Walk','Legs',3,12,null,30,'low','Hip abductor activation; reduces pelvic instability','Side Lunge',3),
  (p30,'Breathing Squat (slow tempo)','Legs',3,10,null,45,'low','Breath-integrated movement; nervous system regulation','Box Squat',4),
  (p30,'Cat-Cow with Breath (4-7-8)','Full body',3,10,null,20,'low','Parasympathetic activation; reduces cramping via breathwork','Seated Rotation',5);

END $$;
