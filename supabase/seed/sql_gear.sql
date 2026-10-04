create schema if not exists seed;
create table if not exists seed.gear_items (key text primary key, item jsonb not null);
insert into seed.gear_items (key, item) values
  ('BOOTS', '{"name": "სალაშქრო ფეხსაცმელი კარგი ძირით (წინასწარ ნაცადი — ახალი არა)", "essential": true}'::jsonb),
  ('SHOES_LIGHT', '{"name": "კომფორტული სპორტული ან სალაშქრო ფეხსაცმელი", "essential": true}'::jsonb),
  ('RAIN', '{"name": "წვიმის ქურთუკი", "essential": true}'::jsonb),
  ('FLEECE', '{"name": "თბილი შუა ფენა (ფლისი ან თხელი ქურთუკი)", "essential": true}'::jsonb),
  ('HAT_GLOVES', '{"name": "ქუდი და თხელი ხელთათმანი", "essential": false}'::jsonb),
  ('SUN', '{"name": "მზის სათვალე, კრემი და კეპი", "essential": true}'::jsonb),
  ('POLES', '{"name": "სალაშქრო ჯოხები", "essential": false}'::jsonb),
  ('POLES_REQ', '{"name": "სალაშქრო ჯოხები (დაღმართზე ძალიან გამოგადგება)", "essential": true}'::jsonb),
  ('WATER_1', '{"name": "წყალი — მინიმუმ 1–1.5 ლიტრი", "essential": true}'::jsonb),
  ('WATER_2', '{"name": "წყალი — მინიმუმ 2 ლიტრი, ცხელ ამინდში მეტი", "essential": true}'::jsonb),
  ('FILTER', '{"name": "წყლის ფილტრი ან გამწმენდი ტაბლეტები", "essential": false}'::jsonb),
  ('FILTER_REQ', '{"name": "წყლის ფილტრი ან გამწმენდი ტაბლეტები", "essential": true}'::jsonb),
  ('FIRST_AID', '{"name": "პირველადი დახმარების ნაკრები (ლეიკოპლასტირი, ბუშტუკების საფენი, ტკივილგამაყუჩებელი)", "essential": true}'::jsonb),
  ('HEADLAMP', '{"name": "თავის ფანარი", "essential": true}'::jsonb),
  ('OFFLINE_MAP', '{"name": "ოფლაინ რუკა ტელეფონში (Organic Maps / Maps.me) და GPX ფაილი", "essential": true}'::jsonb),
  ('POWERBANK', '{"name": "დამტენი (powerbank)", "essential": false}'::jsonb),
  ('CASH', '{"name": "ნაღდი ფული ლარებში — მთაში ბარათი იშვიათად მუშაობს", "essential": true}'::jsonb),
  ('ID', '{"name": "პასპორტი ან პირადობის მოწმობა (სასაზღვრო ზონაა)", "essential": true}'::jsonb),
  ('SNACKS', '{"name": "საგზალი და ენერგეტიკული საჭმელი (თხილი, შოკოლადი, ხმელი ხილი)", "essential": true}'::jsonb),
  ('FOOD_DAYS', '{"name": "საჭმელი ყველა დღისთვის + ერთი დღის მარაგი", "essential": true}'::jsonb),
  ('TENT', '{"name": "კარავი, საძილე ტომარა (+0…+5°C კომფორტი) და ხალიჩა", "essential": true}'::jsonb),
  ('SLEEPING_BAG', '{"name": "საძილე ტომარა და ხალიჩა (თავშესაფარში ლოგინი არ არის)", "essential": true}'::jsonb),
  ('STOVE', '{"name": "გაზის ქურა, ბალონი და ჭურჭელი", "essential": true}'::jsonb),
  ('SANDALS', '{"name": "სანდლები ან წყლის ფეხსაცმელი მდინარის გადასალახად", "essential": true}'::jsonb),
  ('BACKPACK_DAY', '{"name": "პატარა ზურგჩანთა (20–30 ლ)", "essential": true}'::jsonb),
  ('BACKPACK_MULTI', '{"name": "ზურგჩანთა 35–45 ლ (თუ საოჯახო სასტუმროებში ჩერდები)", "essential": true}'::jsonb),
  ('BACKPACK_CAMP', '{"name": "ზურგჩანთა 55–70 ლ (კარვით სიარულისთვის)", "essential": true}'::jsonb),
  ('TRASH', '{"name": "ნაგვის პარკი — რაც წაიღე, უკან ჩამოიტანე", "essential": true}'::jsonb),
  ('CRAMPONS', '{"name": "კრამპონები, ყინულის წერაქვი, ჩაფხუტი, ალპინისტური სისტემა და თოკი", "essential": true}'::jsonb),
  ('GLACIER_SKILLS', '{"name": "მყინვარზე მოძრაობის გამოცდილება ან ლიცენზირებული მთის გიდი", "essential": true}'::jsonb),
  ('INSECT', '{"name": "საწინააღმდეგო საშუალება კოღოსა და ტკიპის წინააღმდეგ", "essential": false}'::jsonb),
  ('SWIM', '{"name": "საცურაო და პირსახოცი", "essential": false}'::jsonb),
  ('MOUNT_BOOTS', '{"name": "ალპინისტური (ნახევრად ხისტი) ფეხსაცმელი კრამპონისთვის", "essential": true}'::jsonb),
  ('DOWN_JACKET', '{"name": "ფუმფულა ქურთუკი და სქელი ხელთათმანები", "essential": true}'::jsonb)
on conflict (key) do update set item = excluded.item;
create or replace function seed.gear(keys text[]) returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(g.item order by k.ord), '[]'::jsonb)
  from unnest(keys) with ordinality as k(key, ord)
  join seed.gear_items g on g.key = k.key;
$$;
select count(*) from seed.gear_items;