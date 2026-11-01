-- ER paper forms as checklists, item-list fields, report layout and field photos.
-- Safe to run more than once. Run after 0001_init.sql and 0002_rpc_api.sql.

alter table public.checklists add column if not exists layout text check (layout in ('table', 'grid'));
alter table public.submissions add column if not exists photos jsonb;

-- Lists leave out signatures and photos unless asked for (keeps the dashboard fast).
create or replace function public.chk_submissions(p_secret text, p_filter jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  with_sig boolean := coalesce((p_filter ->> 'withSignature')::boolean, false);
begin
  perform private.chk_auth(p_secret);
  select coalesce(jsonb_agg(
           case when with_sig then to_jsonb(s.*)
                else (to_jsonb(s.*) - 'signature' - 'photos') || '{"signature":"","photos":{}}'::jsonb end
           order by s.submitted_at desc), '[]'::jsonb)
  into r
  from (
    select * from public.submissions x
    where (p_filter ->> 'checklist_id' is null or x.checklist_id = p_filter ->> 'checklist_id')
      and (p_filter ->> 'department_id' is null or x.department_id = p_filter ->> 'department_id')
      and (p_filter ->> 'from' is null or x.submitted_at >= (p_filter ->> 'from')::timestamptz)
      and (p_filter ->> 'to' is null or x.submitted_at < (p_filter ->> 'to')::timestamptz)
    order by x.submitted_at desc
    limit coalesce((p_filter ->> 'limit')::int, 5000)
  ) s;
  return r;
end $$;

insert into public.departments (id, slug, name_en, name_ar, icon, sort)
values ('dep-er', 'er', 'Emergency Room', 'قسم الطوارئ', 'Siren', 1)
on conflict (id) do nothing;

insert into public.checklists (id, department_id, title_en, title_ar, icon, color, fields, range_note, footer_note, orientation, layout, sort)
values
  ('chk-med-room',
   'dep-er',
   'Daily Temperature and Humidity Check for Medication Room',
   'التحقق اليومي من درجة الحرارة والرطوبة لغرفة الأدوية',
   'Thermometer',
   '#2BAAE2',
   '[{"key":"temperature","label_en":"Temperature","label_ar":"درجة الحرارة","type":"number","unit":"°C","min":22,"max":25,"required":true},{"key":"humidity","label_en":"Humidity","label_ar":"الرطوبة","type":"number","unit":"%","min":0,"max":70,"required":true}]'::jsonb,
   'NORMAL RANGE: TEMPERATURE RANGES FROM 22°C TO 25°C / RELATIVE HUMIDITY UP TO 70% · MORNING SHIFT ONLY',
   'Infection Prevention and Control Department',
   'portrait',
   'table',
   3),
  ('chk-defibrillator',
   'dep-er',
   'Daily Defibrillator Check Print Out (DLC Test)',
   'الفحص اليومي لجهاز الصدمات الكهربائية',
   'Zap',
   '#E9A23B',
   '[{"key":"dlc_user_test_done","label_en":"DLC user test done","label_ar":"تم إجراء فحص الجهاز","type":"check","required":true,"photo":true},{"key":"user_test_succeeded","label_en":"User test succeeded","label_ar":"نجح الفحص","type":"yesno","required":true}]'::jsonb,
   'Take a clear photo of the test print-out. Check every shift (morning, afternoon, night).',
   'Nursing Service Department · Emergency Department',
   'portrait',
   'table',
   4),
  ('chk-crash-cart-daily',
   'dep-er',
   'Crash Cart Daily Checklist',
   'قائمة الفحص اليومي لعربة الطوارئ',
   'HeartPulse',
   '#E0475B',
   '[{"key":"h_top_of_trolley","label_en":"Top of trolley","label_ar":"أعلى العربة","type":"heading","required":false},{"key":"defibrillator_with_ecg_cable","label_en":"Defibrillator with ECG cable","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"defibrillator_cable_plugged_on","label_en":"Defibrillator cable plugged on","label_ar":"","type":"check","required":true,"qty":"Y or N"},{"key":"defibrillator_checked","label_en":"Defibrillator checked","label_ar":"","type":"check","required":true,"qty":"Y or N"},{"key":"box_of_disposable_gloves","label_en":"Box of disposable gloves","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"box_of_face_mask_face_shield_mask","label_en":"Box of face mask / face shield mask","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"h_front_right_side_of_trolley","label_en":"Front & right side of trolley","label_ar":"الجهة الأمامية واليمنى","type":"heading","required":false},{"key":"cpr_board","label_en":"CPR board","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"ambu_bag_adult_and_pediatric","label_en":"Ambu bag (adult and pediatric)","label_ar":"","type":"check","required":true,"qty":"1 each"},{"key":"o2_tube","label_en":"O2 tube","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"o2_cylinder_at_least_500_psi","label_en":"O2 cylinder (at least 500 psi)","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"sharp_receptacle","label_en":"Sharp receptacle","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"portable_suction_working_properly","label_en":"Portable suction (working properly)","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"iv_pole_stand_attached","label_en":"IV pole stand (attached)","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"laryngoscope_with_different_sizes_of","label_en":"Laryngoscope with different sizes of blade","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"penlight","label_en":"Penlight","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"non_rebreathing_mask","label_en":"Non rebreathing mask","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"h_lock","label_en":"Lock","label_ar":"القفل","type":"heading","required":false},{"key":"lock_code_number","label_en":"Lock code number","label_ar":"رقم قفل العربة","type":"text","required":true},{"key":"date_lock_opened","label_en":"Date lock opened","label_ar":"تاريخ فتح القفل","type":"text","required":false}]'::jsonb,
   'To be checked every shift by the registered nurse. If the crash cart is opened or the lock code is not identical, please check the internal content of the crash cart.',
   'Nursing Service Department · Emergency Department',
   'portrait',
   'grid',
   5),
  ('chk-crash-cart-nursing',
   'dep-er',
   'Crash Cart Nursing Checklist (When Lock Is Opened)',
   'قائمة محتويات عربة الطوارئ (عند فتح القفل فقط)',
   'Ambulance',
   '#B4232F',
   '[{"key":"h_1st_drawer_crash_cart_drugs","label_en":"1st drawer · Crash cart drugs","label_ar":"الدرج الأول · أدوية الطوارئ","type":"heading","required":false},{"key":"amiodarone_50_mg_ml_3_ml_ampoule_iv_","label_en":"Amiodarone 50 mg/ml (3 ml ampoule) IV inj.","label_ar":"","type":"check","required":true,"qty":"5"},{"key":"adenosine_6_mg_2_ml_vial","label_en":"Adenosine 6 mg/2 ml vial","label_ar":"","type":"check","required":true,"qty":"10"},{"key":"atropine_sulphate_0_5_mg_ml","label_en":"Atropine sulphate 0.5 mg/ml","label_ar":"","type":"check","required":true,"qty":"5"},{"key":"calcium_chloride_1_g_10_ml_amp","label_en":"Calcium chloride 1 g/10 ml amp.","label_ar":"","type":"check","required":true,"qty":"2"},{"key":"dextrose_50_50_ml_iv_vial","label_en":"Dextrose 50% (50 ml) IV vial","label_ar":"","type":"check","required":true,"qty":"2"},{"key":"dobutamine_hcl_250_mg_50_ml_vial","label_en":"Dobutamine HCl 250 mg/50 ml vial","label_ar":"","type":"check","required":true,"qty":"2"},{"key":"dopamine_200_mg_5_ml_vial","label_en":"Dopamine 200 mg/5 ml vial","label_ar":"","type":"check","required":true,"qty":"2"},{"key":"epinephrine_1_10_000_0_1_mg_ml","label_en":"Epinephrine 1:10,000 (0.1 mg/ml)","label_ar":"","type":"check","required":true,"qty":"10"},{"key":"norepinephrine_1_mg_ml_4_ml_amp_iv_a","label_en":"Norepinephrine 1 mg/ml (4 ml/amp) IV amp","label_ar":"","type":"check","required":true,"qty":"2"},{"key":"procainamide_hcl_100_mg_1_ml_10_ml_v","label_en":"Procainamide HCl 100 mg/1 ml (10 ml/vial) IM/IV inj.","label_ar":"","type":"check","required":true,"qty":"2"},{"key":"sodium_bicarbonate_8_4_50_ml_iv_vial","label_en":"Sodium bicarbonate 8.4% (50 ml) IV vial","label_ar":"","type":"check","required":true,"qty":"2"},{"key":"magnesium_sulphate_10_2_g_20_ml_vial","label_en":"Magnesium sulphate 10% (2 g/20 ml) vial","label_ar":"","type":"check","required":true,"qty":"2"},{"key":"magnesium_sulfate_50_2_g_5_ml_inject","label_en":"Magnesium sulfate 50% (2 g/5 ml) injection, 5 ml ampoule","label_ar":"","type":"check","required":true,"qty":"2"},{"key":"lidocaine_2_20_mg_ml_200_mg_10_ml","label_en":"Lidocaine 2% (20 mg/ml) 200 mg/10 ml","label_ar":"","type":"check","required":true,"qty":"2"},{"key":"naloxone_0_02_mg_1_ml_ampoule","label_en":"Naloxone 0.02 mg/1 ml ampoule","label_ar":"","type":"check","required":true,"qty":"2"},{"key":"calcium_gluconate_1_g_10_ml_amp","label_en":"Calcium gluconate 1 g/10 ml amp.","label_ar":"","type":"check","required":true,"qty":"2"},{"key":"distilled_water_for_injection_10_ml","label_en":"Distilled water for injection 10 ml","label_ar":"","type":"check","required":true,"qty":"5"},{"key":"h_2nd_drawer_iv_essential_equipment","label_en":"2nd drawer · IV essential equipment","label_ar":"الدرج الثاني · مستلزمات الوريد","type":"heading","required":false},{"key":"syringes_3_5_10_20_50_ml","label_en":"Syringes (3, 5, 10, 20, 50 ml)","label_ar":"","type":"check","required":true,"qty":"5 each"},{"key":"iv_cannula_size_16_18_20_22_24_26","label_en":"IV cannula (size 16, 18, 20, 22, 24, 26)","label_ar":"","type":"check","required":true,"qty":"2 each"},{"key":"intraosseous_infusion_needles_adult_","label_en":"Intraosseous infusion needles (adult & pediatric)","label_ar":"","type":"check","required":true,"qty":"1 each"},{"key":"3_way_stop_cock","label_en":"3-way stop cock","label_ar":"","type":"check","required":true,"qty":"3 pieces"},{"key":"opsite_dressing_10x14_cm","label_en":"Opsite dressing (10x14 cm)","label_ar":"","type":"check","required":true,"qty":"3 pieces"},{"key":"central_venous_catheter_adult_pediat","label_en":"Central venous catheter (adult & pediatric)","label_ar":"","type":"check","required":true,"qty":"1 each"},{"key":"cvp_monitoring_set","label_en":"CVP monitoring set","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"suture_silk","label_en":"Suture (silk)","label_ar":"","type":"check","required":true,"qty":"2 pieces"},{"key":"aspirating_needles","label_en":"Aspirating needles","label_ar":"","type":"check","required":true,"qty":"2 pieces"},{"key":"alcohol_swabs","label_en":"Alcohol swabs","label_ar":"","type":"check","required":true,"qty":"1 box"},{"key":"burette_solu_set","label_en":"Burette / Solu-set","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"iv_set","label_en":"IV set","label_ar":"","type":"check","required":true,"qty":"3 pieces"},{"key":"scalpel_surgical_blades","label_en":"Scalpel / surgical blades","label_ar":"","type":"check","required":true,"qty":"2 pieces"},{"key":"clipper","label_en":"Clipper","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"adhesive_tape_roll_size_2_mm","label_en":"Adhesive tape roll (size 2 mm)","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"tourniquet","label_en":"Tourniquet","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"h_3rd_drawer_airway_management_equipme","label_en":"3rd drawer · Airway management equipment","label_ar":"الدرج الثالث · مستلزمات مجرى الهواء","type":"heading","required":false},{"key":"tracheostomy_tube_all_sizes","label_en":"Tracheostomy tube (all sizes)","label_ar":"","type":"check","required":true,"qty":"1 each"},{"key":"sterile_surgical_gloves_s_m_l","label_en":"Sterile surgical gloves (S, M, L)","label_ar":"","type":"check","required":true,"qty":"2 each"},{"key":"sterile_gauze_4x4_mm","label_en":"Sterile gauze (4x4 mm)","label_ar":"","type":"check","required":true,"qty":"1 pack"},{"key":"drainage_bag","label_en":"Drainage bag","label_ar":"","type":"check","required":true,"qty":"2 pieces"},{"key":"non_re_breathing_o2_mask","label_en":"Non re-breathing O2 mask","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"syringe_50_60_ml","label_en":"Syringe (50-60 ml)","label_ar":"","type":"check","required":true,"qty":"2 pieces"},{"key":"nasogastric_tubes_all_sizes_fr_6_8_1","label_en":"Nasogastric tubes, all sizes (Fr 6, 8, 10, 12, 14, 16, 18)","label_ar":"","type":"check","required":true,"qty":"2 each"},{"key":"suction_catheter_all_sizes_fr_6_8_10","label_en":"Suction catheter, all sizes (Fr 6, 8, 10, 12, 14, 16, 18, 20, 24)","label_ar":"","type":"check","required":true,"qty":"2 each"},{"key":"yankauer_adult_and_pediatric","label_en":"Yankauer (adult and pediatric)","label_ar":"","type":"check","required":true,"qty":"1 each"},{"key":"h_4th_drawer_airway_management_equipme","label_en":"4th drawer · Airway management equipment","label_ar":"الدرج الرابع · مستلزمات مجرى الهواء","type":"heading","required":false},{"key":"airway_size_0_5","label_en":"Airway (size 0-5)","label_ar":"","type":"check","required":true,"qty":"2 each"},{"key":"et_tubes_uncuffed_cuffed_pediatric_2","label_en":"ET tubes uncuffed/cuffed, pediatric (2.5-5.5 mm)","label_ar":"","type":"check","required":true,"qty":"2 each"},{"key":"et_tubes_cuffed_uncuffed_adult_6_8_5","label_en":"ET tubes cuffed/uncuffed, adult (6-8.5 mm)","label_ar":"","type":"check","required":true,"qty":"2 each"},{"key":"laryngoscope_set_with_assorted_blade","label_en":"Laryngoscope set with assorted blades & sizes (functional)","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"magill_s_forceps_adult_pediatric","label_en":"Magill''s forceps (adult & pediatric)","label_ar":"","type":"check","required":true,"qty":"1 each"},{"key":"intubation_stylet_adult_pediatric","label_en":"Intubation stylet (adult & pediatric)","label_ar":"","type":"check","required":true,"qty":"1 each"},{"key":"e_t_tie_roll_gauze","label_en":"E.T. tie / roll gauze","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"lidocaine_gel","label_en":"Lidocaine gel","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"bandage_scissors","label_en":"Bandage scissors","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"penlight_in_functional_order","label_en":"Penlight (in functional order)","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"spare_batteries_size_c_aa","label_en":"Spare batteries (size C & AA)","label_ar":"","type":"check","required":true,"qty":"1 pair"},{"key":"h_5th_drawer_fluids","label_en":"5th drawer · Fluids","label_ar":"الدرج الخامس · المحاليل","type":"heading","required":false},{"key":"dextrose_5_nacl_0_225_500_ml","label_en":"Dextrose 5% NaCl 0.225% 500 ml","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"dextrose_5_500_ml","label_en":"Dextrose 5% 500 ml","label_ar":"","type":"check","required":true,"qty":"2 pieces"},{"key":"dextrose_10_500_ml","label_en":"Dextrose 10% 500 ml","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"ringers_lactate_500_ml","label_en":"Ringers lactate 500 ml","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"nacl_0_9_500_ml","label_en":"NaCl 0.9% 500 ml","label_ar":"","type":"check","required":true,"qty":"2 pieces"},{"key":"plasma_protein_fraction_500_ml","label_en":"Plasma protein fraction 500 ml","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"mannitol_500_ml","label_en":"Mannitol 500 ml","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"hydroxyethyl_starch_hes_500_ml","label_en":"Hydroxyethyl starch (HES) 500 ml","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"h_left_side_of_trolley","label_en":"Left side of trolley","label_ar":"الجهة اليسرى","type":"heading","required":false},{"key":"stethoscope","label_en":"Stethoscope","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"bp_apparatus_aneroid_type","label_en":"BP apparatus (aneroid type)","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"spare_ecg_recording_paper","label_en":"Spare ECG recording paper","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"ecg_electrodes_adult_pediatric","label_en":"ECG electrodes (adult & pediatric)","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"defibrillator_conductive_gel","label_en":"Defibrillator conductive gel","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"chlorhexidine_swabstick_povidone_10_","label_en":"Chlorhexidine swabstick / povidone 10% bottle","label_ar":"","type":"check","required":true,"qty":"1 piece"},{"key":"ecg_test_strips","label_en":"ECG test strips","label_ar":"","type":"check","required":true},{"key":"h_lock","label_en":"Lock","label_ar":"القفل","type":"heading","required":false},{"key":"lock_code_number","label_en":"Lock code number","label_ar":"رقم قفل العربة","type":"text","required":true},{"key":"date_lock_opened","label_en":"Date lock opened","label_ar":"تاريخ فتح القفل","type":"text","required":false}]'::jsonb,
   'To be checked only if the crash cart lock is opened.',
   'Nursing Service Department · Emergency Department',
   'portrait',
   'grid',
   6),
  ('chk-narcotic',
   'dep-er',
   'Narcotic Check List in Emergency Department',
   'قائمة جرد الأدوية المخدرة في قسم الطوارئ',
   'Pill',
   '#7A5AF8',
   '[{"key":"inj_diazepam","label_en":"Inj Diazepam","label_ar":"","type":"number","unit":"","min":null,"max":null,"required":true},{"key":"morphine_inj","label_en":"Morphine inj","label_ar":"","type":"number","unit":"","min":null,"max":null,"required":true},{"key":"tramadol_inj","label_en":"Tramadol inj","label_ar":"","type":"number","unit":"","min":null,"max":null,"required":true},{"key":"midazolam_inj","label_en":"Midazolam inj","label_ar":"","type":"number","unit":"","min":null,"max":null,"required":true},{"key":"propoven_1_inj","label_en":"Propoven 1% inj","label_ar":"","type":"number","unit":"","min":null,"max":null,"required":true},{"key":"fentanyl_0_785_mg_inj","label_en":"Fentanyl 0.785 mg inj","label_ar":"","type":"number","unit":"","min":null,"max":null,"required":true},{"key":"inj_pethidine_50_mg","label_en":"Inj Pethidine 50 mg","label_ar":"","type":"number","unit":"","min":null,"max":null,"required":true}]'::jsonb,
   'Enter the number of ampoules/vials found each shift.',
   'Nursing Service Department · Emergency Department',
   'landscape',
   'grid',
   7),
  ('chk-medication-cart',
   'dep-er',
   'Medication Cart Checklist',
   'قائمة عربة الأدوية',
   'Tablets',
   '#1691D0',
   '[{"key":"h_injections","label_en":"Injections","label_ar":"الحقن","type":"heading","required":false},{"key":"inj_metronidazole","label_en":"Inj Metronidazole","label_ar":"","type":"check","required":true},{"key":"inj_ketorolac","label_en":"Inj Ketorolac","label_ar":"","type":"check","required":true},{"key":"inj_buscopan","label_en":"Inj Buscopan","label_ar":"","type":"check","required":true},{"key":"inj_plasil","label_en":"Inj Plasil","label_ar":"","type":"check","required":true},{"key":"inj_lasix","label_en":"Inj Lasix","label_ar":"","type":"check","required":true},{"key":"inj_vitamin_b12","label_en":"Inj Vitamin B12","label_ar":"","type":"check","required":true},{"key":"inj_hydrocortisone","label_en":"Inj Hydrocortisone","label_ar":"","type":"check","required":true},{"key":"inj_insulin_a","label_en":"Inj Insulin (A)","label_ar":"","type":"check","required":true},{"key":"inj_insulin_l","label_en":"Inj Insulin (L)","label_ar":"","type":"check","required":true},{"key":"inj_insulin_m","label_en":"Inj Insulin (M)","label_ar":"","type":"check","required":true},{"key":"inj_pen_insulin","label_en":"Inj Pen Insulin","label_ar":"","type":"check","required":true},{"key":"inj_tetavax","label_en":"Inj Tetavax","label_ar":"","type":"check","required":true},{"key":"inj_rantac","label_en":"Inj Rantac","label_ar":"","type":"check","required":true},{"key":"h_fluids_solutions","label_en":"Fluids & solutions","label_ar":"المحاليل","type":"heading","required":false},{"key":"normal_saline","label_en":"Normal saline","label_ar":"","type":"check","required":true},{"key":"ringer_lactate","label_en":"Ringer lactate","label_ar":"","type":"check","required":true},{"key":"dextrose_10","label_en":"Dextrose 10%","label_ar":"","type":"check","required":true},{"key":"d5_normal_saline","label_en":"D5 normal saline","label_ar":"","type":"check","required":true},{"key":"ventolin_sol","label_en":"Ventolin sol.","label_ar":"","type":"check","required":true}]'::jsonb,
   '',
   'Nursing Service Department · Emergency Department',
   'landscape',
   'grid',
   8),
  ('chk-dressing-room',
   'dep-er',
   'Dressing Room Supplies Checklist',
   'قائمة مستلزمات غرفة الغيار',
   'Bandage',
   '#51938B',
   '[{"key":"iodine","label_en":"Iodine","label_ar":"","type":"check","required":true},{"key":"gauze","label_en":"Gauze","label_ar":"","type":"check","required":true},{"key":"crepe_bandage","label_en":"Crepe bandage","label_ar":"","type":"check","required":true},{"key":"plaster_tape","label_en":"Plaster tape","label_ar":"","type":"check","required":true},{"key":"normal_saline","label_en":"Normal saline","label_ar":"","type":"check","required":true},{"key":"fucidin","label_en":"Fucidin","label_ar":"","type":"check","required":true},{"key":"flammazine","label_en":"Flammazine","label_ar":"","type":"check","required":true},{"key":"lidocaine_injection","label_en":"Lidocaine injection","label_ar":"","type":"check","required":true},{"key":"alcohol_swab","label_en":"Alcohol swab","label_ar":"","type":"check","required":true},{"key":"blade","label_en":"Blade","label_ar":"","type":"check","required":true},{"key":"sutures","label_en":"Sutures","label_ar":"","type":"check","required":true},{"key":"blanket","label_en":"Blanket","label_ar":"","type":"check","required":true},{"key":"arm_sling","label_en":"Arm sling","label_ar":"","type":"check","required":true},{"key":"green_sheet","label_en":"Green sheet","label_ar":"","type":"check","required":true}]'::jsonb,
   '',
   'Nursing Service Department · Emergency Department',
   'landscape',
   'grid',
   9),
  ('chk-machines',
   'dep-er',
   'Machine Checklist',
   'قائمة فحص الأجهزة',
   'Activity',
   '#04A67A',
   '[{"key":"ecg_machine","label_en":"ECG machine","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"thermometer","label_en":"Thermometer","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"glucometer","label_en":"Glucometer","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"vital_signs_machine","label_en":"Vital signs machine","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"crash_cart","label_en":"Crash cart","label_ar":"","type":"check","required":true,"qty":"2"},{"key":"examination_eye_and_ear","label_en":"Examination eye and ear","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"weighing_scale","label_en":"Weighing scale","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"iv_stand","label_en":"IV stand","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"stethoscope","label_en":"Stethoscope","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"suction_machine","label_en":"Suction machine","label_ar":"","type":"check","required":true,"qty":"1"},{"key":"steam_inhalation","label_en":"Steam inhalation","label_ar":"","type":"check","required":true,"qty":"1"}]'::jsonb,
   '',
   'Nursing Service Department · Emergency Department',
   'landscape',
   'grid',
   10),
  ('chk-vaccine',
   'dep-er',
   'Vaccine Checklist',
   'قائمة اللقاحات والأمصال',
   'Syringe',
   '#283A83',
   '[{"key":"rabies_vaccine","label_en":"Rabies vaccine","label_ar":"","type":"number","unit":"vial","min":null,"max":null,"required":true},{"key":"polyvalent_snake_antivenom","label_en":"Polyvalent snake antivenom","label_ar":"","type":"number","unit":"amp","min":null,"max":null,"required":true},{"key":"scorpion_antivenom","label_en":"Scorpion antivenom","label_ar":"","type":"number","unit":"amp","min":null,"max":null,"required":true},{"key":"tetanus","label_en":"Tetanus","label_ar":"","type":"number","unit":"amp","min":null,"max":null,"required":true}]'::jsonb,
   'Enter the number of vials/ampoules available.',
   'Nursing Service Department · Emergency Department',
   'landscape',
   'grid',
   11),
  ('chk-papr',
   'dep-er',
   'PAPR Checklist',
   'قائمة فحص جهاز التنفس PAPR',
   'Wind',
   '#3AC0C3',
   '[{"key":"equipment_of_papr","label_en":"Equipment of PAPR","label_ar":"","type":"check","required":true},{"key":"battery_of_papr_charging","label_en":"Battery of PAPR charging","label_ar":"","type":"check","required":true}]'::jsonb,
   '',
   'Nursing Service Department · Emergency Department',
   'portrait',
   'grid',
   12),
  ('chk-sterile-instruments',
   'dep-er',
   'Sterile Instruments Handover & Receipt',
   'تسليم واستلام الأدوات المعقمة',
   'Box',
   '#9ECC3B',
   '[{"key":"need_sterilization","label_en":"Are there instruments that need sterilization?","label_ar":"هل يوجد أدوات تحتاج التعقيم؟","type":"select","options":["No","Yes"],"required":true},{"key":"instrument_count","label_en":"Number of instruments","label_ar":"كم عدد الأدوات؟","type":"number","unit":"","min":null,"max":null,"required":false},{"key":"documented","label_en":"Documented on the sterilization handover form?","label_ar":"هل تم توثيقها؟","type":"select","options":["Yes","No"],"required":false}]'::jsonb,
   'If yes: enter the number of instruments and confirm they were documented. The paper handover form is still filled in by hand for the sterilization department.',
   'Nursing Service Department · Emergency Department',
   'portrait',
   'table',
   13)
on conflict (id) do nothing;
