import sys, hashlib, json
sys.path.insert(0, '.')
from gen_sql import load_routes, routes_sql, q, regions_sql

def stops_sql(routes):
    rows = []
    for r in routes:
        for i, s in enumerate(r['stops']):
            rows.append(f"({q(r['slug'])},{i},{q(s.get('day'))},{q(s['name'])},{q(s['kind'])},{s['lat']},{s['lng']},{q(s.get('altitude_m'))},{q(bool(s.get('overnight')))},{q(s.get('description'))})")
    return ("insert into public.route_stops (route_id, position, day, name, kind, lat, lng, altitude_m, overnight, description)\n"
            "select r.id, v.p, v.d, v.n, v.k, v.la, v.lo, v.a, v.o, v.ds from (values\n" + ",\n".join(rows) +
            "\n) as v(slug, p, d, n, k, la, lo, a, o, ds) join public.routes r on r.slug = v.slug\n"
            "on conflict (route_id, position) do update set day = excluded.day, name = excluded.name, kind = excluded.kind, lat = excluded.lat, lng = excluded.lng, altitude_m = excluded.altitude_m, overnight = excluded.overnight, description = excluded.description;")

routes = load_routes()
for i in range(0, len(routes), 6):
    open(f'sql_routes_{i//6}.sql', 'w', encoding='utf-8').write(routes_sql(routes[i:i+6]))
# stops in 3 chunks by route
chunks = [routes[0:16], routes[16:32], routes[32:]]
for i, c in enumerate(chunks):
    open(f'sql_stops_{i}.sql', 'w', encoding='utf-8').write(stops_sql(c))

# checksums (text fields)
TXT = ['slug','name','name_en','summary','description','difficulty_notes','getting_there','accommodation','water','permits','dangers','mobile_coverage']
def rsum(r):
    parts = [r.get(c) for c in TXT] + ['|'.join(r.get('tips') or []), r['stops'][0]['name'], r['stops'][-1]['name']]
    return hashlib.md5('§'.join(p for p in parts if p is not None).encode('utf-8')).hexdigest()
sums = {r['slug']: rsum(r) for r in routes}
json.dump(sums, open('route_md5.json','w'), ensure_ascii=False, indent=0)
ss = []
for r in sorted(routes, key=lambda x: x['slug']):
    for i, s in enumerate(r['stops']):
        ss.append('§'.join(str(x) for x in [r['slug'], i, s['name'], s['kind'], s.get('description') or '']))
print('stops md5', hashlib.md5('\n'.join(ss).encode('utf-8')).hexdigest(), 'count', len(ss))
print('routes', len(routes))
