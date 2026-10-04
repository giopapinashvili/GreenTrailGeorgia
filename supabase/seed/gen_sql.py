import json, importlib, sys
sys.path.insert(0, '.')
from regions import REGIONS
import common
GEAR_KEY = {json.dumps(v, ensure_ascii=False, sort_keys=True): k for k, v in vars(common).items() if isinstance(v, dict) and 'name' in v and 'essential' in v}

def q(v):
    if v is None:
        return 'null'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"

def arr_text(xs):
    if not xs:
        return "'{}'::text[]"
    return 'array[' + ','.join(q(x) for x in xs) + ']::text[]'

def arr_int(xs):
    return "'{" + ','.join(str(int(x)) for x in xs) + "}'::smallint[]"

def load_routes():
    from fixes import COORDS, DROP_STOPS, SKIP_ROUTES
    routes = []
    for m in ['r_svaneti', 'r_kazbegi', 'r_east', 'r_south', 'r_west']:
        routes += importlib.import_module(m).ROUTES
    out = []
    for r in routes:
        if r['slug'] in SKIP_ROUTES:
            continue
        drop = DROP_STOPS.get(r['slug'], set())
        stops = []
        for s in r['stops']:
            key = s.get('en') or s['name']
            if key in drop:
                continue
            if key in COORDS:
                s = {**s, 'lat': COORDS[key][0], 'lng': COORDS[key][1]}
            stops.append(s)
        out.append({**r, 'stops': stops})
    return out

def regions_sql():
    rows = []
    for rid, name, desc, sort, lat, lng in REGIONS:
        rows.append(f"({q(rid)},{q(name)},{q(desc)},{sort},{lat},{lng})")
    return ("insert into public.regions (id, name, description, sort, lat, lng) values\n" + ",\n".join(rows) +
            "\non conflict (id) do update set name = excluded.name, description = excluded.description, sort = excluded.sort, lat = excluded.lat, lng = excluded.lng;")

ROUTE_COLS = ['slug', 'name', 'name_en', 'region_id', 'difficulty', 'days_min', 'days_max', 'duration_hours', 'distance_km',
              'elevation_gain_m', 'elevation_loss_m', 'max_altitude_m', 'min_altitude_m', 'route_type', 'season_months', 'tags',
              'summary', 'description', 'difficulty_notes', 'getting_there', 'accommodation', 'water', 'permits', 'dangers',
              'mobile_coverage', 'gear', 'tips', 'start_name', 'start_lat', 'start_lng', 'end_name', 'end_lat', 'end_lng',
              'featured', 'status', 'sources']

def route_values(r):
    stops = r['stops']
    first, last = stops[0], stops[-1]
    vals = {
        **r,
        'duration_hours': r.get('duration_hours'),
        'accommodation': r.get('accommodation'),
        'featured': r.get('featured', False),
        'status': 'published',
        'start_name': first['name'], 'start_lat': first['lat'], 'start_lng': first['lng'],
        'end_name': last['name'], 'end_lat': last['lat'], 'end_lng': last['lng'],
    }
    out = []
    for c in ROUTE_COLS:
        v = vals.get(c)
        if c == 'season_months':
            out.append(arr_int(v))
        elif c in ('tags', 'tips'):
            out.append(arr_text(v or []))
        elif c == 'gear':
            keys = list(dict.fromkeys(GEAR_KEY[json.dumps(it, ensure_ascii=False, sort_keys=True)] for it in (v or [])))
            out.append('seed.gear(array[' + ','.join(q(k) for k in keys) + '])')
        else:
            out.append(q(v))
    return '(' + ','.join(out) + ')'

def routes_sql(routes):
    upd = ', '.join(f'{c} = excluded.{c}' for c in ROUTE_COLS if c != 'slug')
    return ("insert into public.routes (" + ', '.join(ROUTE_COLS) + ") values\n" + ",\n".join(route_values(r) for r in routes) +
            f"\non conflict (slug) do update set {upd};")

def stops_sql(routes):
    rows = []
    for r in routes:
        for i, s in enumerate(r['stops']):
            rows.append(f"((select id from public.routes where slug = {q(r['slug'])}),{i},{q(s.get('day'))},{q(s['name'])},{q(s['kind'])},{s['lat']},{s['lng']},{q(s.get('altitude_m'))},{q(bool(s.get('overnight')))},{q(s.get('description'))})")
    return ("insert into public.route_stops (route_id, position, day, name, kind, lat, lng, altitude_m, overnight, description) values\n" + ",\n".join(rows) + ";")

if __name__ == '__main__':
    routes = load_routes()
    slugs = [r['slug'] for r in routes]
    assert len(slugs) == len(set(slugs)), 'duplicate slug'
    for r in routes:
        assert r['region_id'] in {x[0] for x in REGIONS}, r['slug']
        assert r['difficulty'] in ('easy', 'moderate', 'hard', 'expert'), r['slug']
        assert r['days_max'] >= r['days_min'], r['slug']
        for s in r['stops']:
            assert s['kind'] in ('start','finish','village','guesthouse','hut','camp','pass','lake','peak','viewpoint','water','waterfall','glacier','church','fortress','bridge','other'), (r['slug'], s['kind'])
    print(len(routes), 'routes ok', file=sys.stderr)
