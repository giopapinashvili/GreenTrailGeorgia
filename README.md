# GreenTrail Georgia

საქართველოს სალაშქრო მარშრუტების საიტი: მარშრუტები სირთულით, დღეებით, გაჩერებებით, აღჭურვილობით და რჩევებით; 3D რუკა; ბლოგი (ყველა პოსტი მარშრუტზეა მიბმული); პირადი მიმოწერა ფოტოებით; პროფილები; გიდები და ტურები; AI დამგეგმავი; ადმინ პანელი.

## როგორ მუშაობს

- **საიტი** — React + TypeScript + Vite + Tailwind. ქვეყნდება Cloudflare-ზე (Worker „greentrailgeorgia“): GitHub-ზე ატვირთვისას ავტომატურად აეწყობა (`npm run build`) და გამოქვეყნდება `dist/` (`wrangler.jsonc`).
- **ბაზა, ავტორიზაცია, ფოტოები, მიმოწერა** — Supabase (პროექტი `wgshyhcjezszogccodkz`). ყველა ცხრილი დაცულია Row Level Security-ით, ამიტომ ბრაუზერში მხოლოდ საჯარო (publishable) გასაღებია (`src/lib/config.ts`).
- **რუკა** — MapLibre: OpenFreeMap-ის ფენები, AWS Terrain Tiles-ის რელიეფი (3D, ჰორიზონტალები), Esri-ის თანამგზავრი. ბილიკის ხაზები BRouter-ით (OpenStreetMap) იგება ადმინ პანელიდან.
- **AI დამგეგმავი** — Supabase Edge Function `plan-trip` (`supabase/functions/plan-trip`). AI-ის გასაღები ადმინ პანელში იწერება (AI პარამეტრები) და მხოლოდ ბაზაშია; AI-ის გარეშეც დამგეგმავი ჩაშენებული ფილტრით მუშაობს.

## ადმინისტრატორი

ადმინ პანელი: `/admin`. ადმინის როლს ანიჭებს ბაზა (`profiles.role = 'admin'`). პანელში: მარშრუტების რედაქტორი (გაჩერებები რუკაზე, ხაზის აგება, GPX, ფოტო), სტატიები, გიდების დადასტურება, შეტყობინებები/მოდერაცია, მომხმარებლები, AI პარამეტრები, ხელსაწყოები (ხაზების და ფოტოების მასობრივი შევსება).

## ლოკალურად გაშვება

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # შემოწმება + აწყობა dist/-ში
```

## საქაღალდეები

- `src/pages` — გვერდები (`admin/`, `auth/`), `src/components` — კომპონენტები, `src/lib` — მონაცემები, ფორმატები, რუკის და გეო-ფუნქციები.
- `supabase/migrations` — ბაზის სტრუქტურა და უსაფრთხოების წესები (თანმიმდევრობით).
- `supabase/functions/plan-trip` — AI დამგეგმავის სერვერული ფუნქცია.
- `supabase/seed` — მარშრუტების საწყისი მონაცემები (Python წყაროები `r_*.py` და მათგან აწყობილი SQL: ჯერ `sql_regions.sql`, `sql_gear.sql`, მერე `sql_routes_*.sql`, `sql_stops_*.sql`, `sql_articles.sql`). SQL-ის ხელახლა აწყობა: `python3 write_sql.py`.
- `docs/CONVENTIONS.md` — დიზაინის და კოდის წესები ახალი გვერდებისთვის.

## მონაცემების წყაროები

OpenStreetMap-ის მოხალისეები (ODbL), OpenFreeMap, Mapzen/AWS Terrain Tiles, Esri World Imagery, BRouter, Wikimedia Commons, caucasus-trekking.com, apa.gov.ge, transcaucasiantrail.org და სხვა — თითოეული მარშრუტის წყაროები მის გვერდზეა.
