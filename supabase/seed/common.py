# Shared building blocks for the route dataset (Georgian content).

def g(name, essential=True):
    return {"name": name, "essential": essential}

BOOTS = g("სალაშქრო ფეხსაცმელი კარგი ძირით (წინასწარ ნაცადი — ახალი არა)")
SHOES_LIGHT = g("კომფორტული სპორტული ან სალაშქრო ფეხსაცმელი")
RAIN = g("წვიმის ქურთუკი")
FLEECE = g("თბილი შუა ფენა (ფლისი ან თხელი ქურთუკი)")
HAT_GLOVES = g("ქუდი და თხელი ხელთათმანი", False)
SUN = g("მზის სათვალე, კრემი და კეპი")
POLES = g("სალაშქრო ჯოხები", False)
POLES_REQ = g("სალაშქრო ჯოხები (დაღმართზე ძალიან გამოგადგება)")
WATER_1 = g("წყალი — მინიმუმ 1–1.5 ლიტრი")
WATER_2 = g("წყალი — მინიმუმ 2 ლიტრი, ცხელ ამინდში მეტი")
FILTER = g("წყლის ფილტრი ან გამწმენდი ტაბლეტები", False)
FILTER_REQ = g("წყლის ფილტრი ან გამწმენდი ტაბლეტები")
FIRST_AID = g("პირველადი დახმარების ნაკრები (ლეიკოპლასტირი, ბუშტუკების საფენი, ტკივილგამაყუჩებელი)")
HEADLAMP = g("თავის ფანარი")
OFFLINE_MAP = g("ოფლაინ რუკა ტელეფონში (Organic Maps / Maps.me) და GPX ფაილი")
POWERBANK = g("დამტენი (powerbank)", False)
CASH = g("ნაღდი ფული ლარებში — მთაში ბარათი იშვიათად მუშაობს")
ID = g("პასპორტი ან პირადობის მოწმობა (სასაზღვრო ზონაა)")
SNACKS = g("საგზალი და ენერგეტიკული საჭმელი (თხილი, შოკოლადი, ხმელი ხილი)")
FOOD_DAYS = g("საჭმელი ყველა დღისთვის + ერთი დღის მარაგი")
TENT = g("კარავი, საძილე ტომარა (+0…+5°C კომფორტი) და ხალიჩა")
SLEEPING_BAG = g("საძილე ტომარა და ხალიჩა (თავშესაფარში ლოგინი არ არის)")
STOVE = g("გაზის ქურა, ბალონი და ჭურჭელი")
SANDALS = g("სანდლები ან წყლის ფეხსაცმელი მდინარის გადასალახად")
BACKPACK_DAY = g("პატარა ზურგჩანთა (20–30 ლ)")
BACKPACK_MULTI = g("ზურგჩანთა 35–45 ლ (თუ საოჯახო სასტუმროებში ჩერდები)")
BACKPACK_CAMP = g("ზურგჩანთა 55–70 ლ (კარვით სიარულისთვის)")
TRASH = g("ნაგვის პარკი — რაც წაიღე, უკან ჩამოიტანე")
CRAMPONS = g("კრამპონები, ყინულის წერაქვი, ჩაფხუტი, ალპინისტური სისტემა და თოკი")
GLACIER_SKILLS = g("მყინვარზე მოძრაობის გამოცდილება ან ლიცენზირებული მთის გიდი")
INSECT = g("საწინააღმდეგო საშუალება კოღოსა და ტკიპის წინააღმდეგ", False)
SWIM = g("საცურაო და პირსახოცი", False)
MOUNT_BOOTS = g("ალპინისტური (ნახევრად ხისტი) ფეხსაცმელი კრამპონისთვის")
DOWN_JACKET = g("ფუმფულა ქურთუკი და სქელი ხელთათმანები")

DAY_EASY = [SHOES_LIGHT, WATER_1, SUN, RAIN, SNACKS, FIRST_AID, TRASH]
DAY_MOUNTAIN = [BOOTS, BACKPACK_DAY, WATER_2, RAIN, FLEECE, SUN, SNACKS, FIRST_AID, OFFLINE_MAP, POLES, HEADLAMP, TRASH]
MULTI_GUESTHOUSE = [BOOTS, BACKPACK_MULTI, RAIN, FLEECE, HAT_GLOVES, SUN, WATER_2, FILTER, SNACKS, FIRST_AID, OFFLINE_MAP, POLES_REQ, HEADLAMP, POWERBANK, CASH, TRASH]
MULTI_CAMP = [BOOTS, BACKPACK_CAMP, TENT, STOVE, FOOD_DAYS, RAIN, FLEECE, HAT_GLOVES, SUN, WATER_2, FILTER_REQ, FIRST_AID, OFFLINE_MAP, POLES_REQ, HEADLAMP, POWERBANK, CASH, TRASH]

ALL_YEAR = list(range(1, 13))

def stop(name, kind, lat, lng, day=None, alt=None, night=False, desc=None, en=None):
    return {"name": name, "kind": kind, "lat": lat, "lng": lng, "day": day, "altitude_m": alt, "overnight": night, "description": desc, "en": en}
