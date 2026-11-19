import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const OFF_HEADERS = {
  'User-Agent': 'SnackWise/1.0 (University Design Thinking Project)',
  Accept: 'application/json',
};

const SEARCH_FIELDS = [
  'code',
  'product_name',
  'generic_name',
  'brands',
  'quantity',
  'image_front_url',
  'image_front_small_url',
  'image_url',
  'categories_tags',
  'allergens_tags',
  'ingredients_text',
  'nutriments',
  'states_tags',
].join(',');

const PRODUCT_FIELDS = SEARCH_FIELDS;

const stripZero = (s) => String(s || '').replace(/\D/g, '').replace(/^0+/, '');

function pickSafeImage(rawUrl, code) {
  const url = String(rawUrl || '').trim();
  if (!url || !url.startsWith('https://')) return '';
  const m = url.match(/images\.openfoodfacts\.org\/images\/products\/([0-9/]+)\//);
  if (m && code) {
    const imgCode = stripZero(m[1].replace(/\//g, ''));
    const recCode = stripZero(code);
    if (imgCode && recCode && imgCode !== recCode) {
      return '';
    }
  }
  return url;
}

function normalizeHit(h) {
  if (!h || !h.code || (!h.product_name && !h.brands)) return null;
  const code = String(h.code).trim();
  const brand = Array.isArray(h.brands) ? h.brands.join(', ') : String(h.brands || '');
  const catsRaw = Array.isArray(h.categories_tags) ? h.categories_tags : [];
  const allergens = Array.isArray(h.allergens_tags)
    ? h.allergens_tags.map((a) => String(a).replace(/^.*:/, '').replace(/-/g, ' ')).filter(Boolean)
    : [];
  const imgFront = pickSafeImage(h.image_front_url, code);
  const imgSmall = pickSafeImage(h.image_front_small_url, code);
  const imgFallback = pickSafeImage(h.image_url, code);
  return {
    code,
    name: String(h.product_name || 'Unnamed product').trim(),
    generic: String(h.generic_name || '').trim(),
    brand: brand.trim(),
    qty: String(h.quantity || '').trim(),
    img: imgFront || imgFallback || imgSmall || '',
    imgSmall: imgSmall || imgFront || imgFallback || '',
    ing: String(h.ingredients_text || '').trim(),
    all: allergens.join(', '),
    allTags: Array.isArray(h.allergens_tags) ? h.allergens_tags : [],
    cats: catsRaw.filter((c) => c && c !== 'en:null'),
    hasNullCat: catsRaw.includes('en:null'),
    states: Array.isArray(h.states_tags) ? h.states_tags : [],
    nutriments: h.nutriments && typeof h.nutriments === 'object' ? h.nutriments : {},
    src: 'Open Food Facts',
  };
}

async function queryOffSearch(q, pageSize = 16) {
  const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=${pageSize}&fields=${encodeURIComponent(SEARCH_FIELDS)}`;
  const upstream = await fetch(url, {
    headers: OFF_HEADERS,
    signal: AbortSignal.timeout(9000),
  });
  if (!upstream.ok) {
    throw new Error('OFF_UPSTREAM_' + upstream.status);
  }
  const data = await upstream.json();
  return Array.isArray(data.hits) ? data.hits.map(normalizeHit).filter(Boolean) : [];
}

app.get('/api/off/search', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 120);
  if (!q) {
    return res.status(400).json({ error: 'Enter a product name to search.' });
  }
  try {
    const hits = await queryOffSearch(q, 12);
    return res.json({ hits });
  } catch (err) {
    return res.status(502).json({ error: 'Could not reach Open Food Facts search. Try again or use a barcode.' });
  }
});

const PROD_CACHE = new Map();
function getCachedProduct(code) {
  const hit = PROD_CACHE.get(code);
  if (!hit) return null;
  if (Date.now() - hit.ts > 600000) {
    PROD_CACHE.delete(code);
    return null;
  }
  return hit.data;
}
function setCachedProduct(code, data) {
  if (PROD_CACHE.size >= 200) {
    const firstKey = PROD_CACHE.keys().next().value;
    if (firstKey) PROD_CACHE.delete(firstKey);
  }
  PROD_CACHE.set(code, { ts: Date.now(), data });
}

async function fetchProductV2(cleanCode, timeoutMs = 6000) {
  const cached = getCachedProduct(cleanCode);
  if (cached) return cached;
  const url = `https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json?fields=${encodeURIComponent(PRODUCT_FIELDS)}`;
  const upstream = await fetch(url, {
    headers: OFF_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!upstream.ok) {
    const err = new Error('OFF_STATUS_' + upstream.status);
    err.status = upstream.status;
    throw err;
  }
  const data = await upstream.json();
  data.requestedCode = cleanCode;
  if (data && data.status === 1 && data.product) {
    setCachedProduct(cleanCode, data);
  }
  return data;
}

app.get('/api/off/product/:code', async (req, res) => {
  const code = String(req.params.code || '').replace(/\D/g, '');
  if (code.length < 8 || code.length > 14) {
    return res.status(400).json({ error: 'Invalid barcode.' });
  }
  try {
    const data = await fetchProductV2(code, 9000);
    return res.json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Open Food Facts product lookup is temporarily busy or unavailable.' });
  }
});

async function enrichCandidate(hit) {
  if ((hit.ing && hit.allTags && hit.allTags.length) || !hit.code) return hit;
  const cleanCode = String(hit.code).replace(/\D/g, '');
  if (cleanCode.length < 8 || cleanCode.length > 14) return hit;
  try {
    const j = await fetchProductV2(cleanCode, 4500);
    if (!j || j.status !== 1 || !j.product) return hit;
    const resCode = stripZero(j.code || j.product.code || '');
    if (resCode && resCode !== stripZero(cleanCode)) return hit;
    const full = normalizeHit({ ...j.product, code: j.code || j.product.code || cleanCode });
    return full || hit;
  } catch {
    return hit;
  }
}

app.get('/api/off/alternatives', async (req, res) => {
  const excludeCode = stripZero(req.query.code || '');
  const cat = String(req.query.cat || '').trim().slice(0, 100);
  const q = String(req.query.q || '').trim().slice(0, 100);
  const excludeWords = String(req.query.exclude || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 2)
    .slice(0, 40);
  if (!cat && !q) {
    return res.status(400).json({ error: 'Category or product query required.' });
  }

  const hitsExclusion = (c) => {
    if (!excludeWords.length) return false;
    const hay = [c.name, c.brand, c.ing, c.all, (c.allTags || []).join(' ')].join(' ').toLowerCase();
    return excludeWords.some((w) => hay.includes(w));
  };

  try {
    const seen = new Set();
    const candidates = [];
    let strategy = 'none';

    const collect = (list, via) => {
      for (const item of list) {
        const norm = stripZero(item.code);
        if (!norm || norm === excludeCode || seen.has(norm)) continue;
        seen.add(norm);
        candidates.push({ ...item, matchVia: via });
      }
    };

    if (cat && /^[a-z]{2}:[a-z0-9-]+$/i.test(cat) && cat !== 'en:null') {
      const catHits = await queryOffSearch(`categories_tags:"${cat}"`, 24);
      collect(catHits, 'category');
      if (candidates.length) strategy = 'category';
    }

    if (candidates.length < 10 && q) {
      const kwHits = await queryOffSearch(q, 24);
      collect(kwHits, 'keyword');
      strategy = strategy === 'category' ? 'category+keyword' : 'keyword';
    }

    // Filter out candidates already declaring excluded allergens/ingredients before spending v2/product enrichment budget
    const preExcluded = [];
    const surviving = [];
    for (const c of candidates) {
      if (hitsExclusion(c)) preExcluded.push(c);
      else surviving.push(c);
    }

    // Enrich up to 10 surviving candidates lacking full ingredients_text & allergens_tags in two gentle batches of 5
    let enrichBudget = 10;
    const toEnrich = [];
    const rest = [];
    for (const c of surviving) {
      const needsEnrich = !(c.ing && c.ing.trim() && c.allTags && c.allTags.length);
      if (enrichBudget > 0 && needsEnrich && c.code) {
        enrichBudget--;
        toEnrich.push(c);
      } else {
        rest.push(c);
      }
    }
    const enrichedHead = [];
    for (let i = 0; i < toEnrich.length; i += 5) {
      const batch = toEnrich.slice(i, i + 5);
      const done = await Promise.all(
        batch.map(async (c) => {
          const e = await enrichCandidate(c);
          return { ...e, matchVia: c.matchVia };
        }),
      );
      enrichedHead.push(...done);
    }
    const finalCandidates = [...enrichedHead, ...rest, ...preExcluded];

    return res.json({ source: 'Open Food Facts', strategy, candidates: finalCandidates });
  } catch (err) {
    return res.status(502).json({ error: 'Could not load alternatives from Open Food Facts right now.' });
  }
});

function detectMarketingBuzz(name = '') {
  const n = String(name).toLowerCase();
  const found = [];
  if (/\bnatural\b/.test(n)) found.push('Natural');
  if (/\borganic\b/.test(n)) found.push('Organic');
  if (/\bsugar[- ]?free\b|\bno added sugar\b|\bzero sugar\b/.test(n)) found.push('Sugar-free / No added sugar');
  if (/\bhigh[- ]?protein\b|\bprotein\b/.test(n)) found.push('Protein claim');
  if (/\bhealthy\b|\bdiet\b|\blite\b|\blight\b/.test(n)) found.push('Healthy / Lite');
  if (/\bmultigrain\b|\bwhole[- ]?grain\b/.test(n)) found.push('Multigrain / Whole-grain');
  return found;
}

const HEALTHY_CACHE = new Map();
const HEALTHY_QUERIES = {
  all: ['roasted makhana', 'roasted chana', 'millet', 'oats'],
  'roasted-baked': ['roasted makhana', 'roasted chana', 'baked chips'],
  fruit: ['dried mango', 'date bar', '100% fruit juice'],
  millet: ['millet', 'ragi', 'jowar'],
  'high-fibre': ['oats', 'roasted chana', 'multigrain'],
  'low-sugar': ['roasted makhana', 'oats', 'plain almonds'],
  'low-sodium': ['rolled oats', 'unsalted almonds', 'roasted makhana'],
  'protein-rich': ['roasted chana', 'chickpeas', 'greek yogurt'],
};

app.get('/api/off/healthy', async (req, res) => {
  const cat = String(req.query.cat || 'all').trim();
  const taste = String(req.query.taste || 'all').trim();
  const q = String(req.query.q || '').trim().slice(0, 80);
  const excludeWords = String(req.query.exclude || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 2)
    .slice(0, 40);

  const terms = q ? [q] : (HEALTHY_QUERIES[cat] || HEALTHY_QUERIES.all);
  const cacheKey = `${cat}|${terms.join(',').toLowerCase()}`;

  try {
    let rawHits;
    const cached = HEALTHY_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < 300000) {
      rawHits = cached.hits;
    } else {
      const settled = await Promise.allSettled(terms.map((t) => queryOffSearch(t, 12)));
      const seen = new Set();
      rawHits = [];
      for (const r of settled) {
        if (r.status === 'fulfilled') {
          for (const item of r.value) {
            const norm = stripZero(item.code);
            if (!norm || seen.has(norm)) continue;
            seen.add(norm);
            rawHits.push(item);
          }
        }
      }
      if (!rawHits.length && settled.every((r) => r.status === 'rejected')) {
        throw new Error('OFF_HEALTHY_FAILED');
      }
      if (HEALTHY_CACHE.size >= 40) {
        const fk = HEALTHY_CACHE.keys().next().value;
        if (fk) HEALTHY_CACHE.delete(fk);
      }
      HEALTHY_CACHE.set(cacheKey, { ts: Date.now(), hits: rawHits });
    }

    const items = [];
    let excludedCount = 0;
    let unverifiedNutritionSkipped = 0;

    // First pass: check numeric thresholds & quick text exclusions before optional v2 enrichment
    const preSurviving = [];
    for (const h of rawHits) {
      const hay = [h.name, h.generic, h.brand, h.ing, h.all, (h.allTags || []).join(' ')].join(' ').toLowerCase();
      if (excludeWords.length && excludeWords.some((w) => hay.includes(w))) {
        excludedCount++;
        continue;
      }

      const nu = h.nutriments || {};
      const sugar = typeof nu.sugars_100g === 'number' ? nu.sugars_100g : null;
      const salt = typeof nu.salt_100g === 'number' ? nu.salt_100g : null;
      const sodium = typeof nu.sodium_100g === 'number' ? nu.sodium_100g : null;
      const protein = typeof nu.proteins_100g === 'number' ? nu.proteins_100g : null;
      const fiber = typeof nu.fiber_100g === 'number' ? nu.fiber_100g : null;
      const effSalt = salt != null ? salt : sodium != null ? sodium * 2.5 : null;

      if (cat === 'low-sugar' && (sugar == null || sugar > 5)) {
        if (sugar == null) unverifiedNutritionSkipped++;
        continue;
      }
      if (cat === 'low-sodium' && (effSalt == null || effSalt > 0.6)) {
        if (effSalt == null) unverifiedNutritionSkipped++;
        continue;
      }
      if (cat === 'protein-rich' && (protein == null || protein < 8)) {
        if (protein == null) unverifiedNutritionSkipped++;
        continue;
      }
      if (cat === 'high-fibre' && (fiber == null || fiber < 3)) {
        if (fiber == null) unverifiedNutritionSkipped++;
        continue;
      }
      if (taste === 'sweet' && sugar != null && salt != null && sugar < 2 && salt > 0.8) continue;
      if (taste === 'savoury' && sugar != null && salt != null && sugar > 12 && salt < 0.2) continue;

      preSurviving.push(h);
    }

    // If active allergy/avoid exclusions exist and hits lack ingredients_text, enrich up to 10 in gentle batches
    let evaluatedHits = preSurviving;
    if (excludeWords.length) {
      const needEnrich = preSurviving.filter((h) => !(h.ing || '').trim()).slice(0, 10);
      const alreadyHasIng = preSurviving.filter((h) => (h.ing || '').trim());
      const enriched = [];
      for (let i = 0; i < needEnrich.length; i += 5) {
        const batch = needEnrich.slice(i, i + 5);
        const done = await Promise.all(batch.map((c) => enrichCandidate(c)));
        enriched.push(...done);
      }
      evaluatedHits = [...alreadyHasIng, ...enriched];
    }

    for (const h of evaluatedHits) {
      const hay = [h.name, h.generic, h.brand, h.ing, h.all, (h.allTags || []).join(' ')].join(' ').toLowerCase();
      if (excludeWords.length) {
        if (excludeWords.some((w) => hay.includes(w))) {
          excludedCount++;
          continue;
        }
        // Under active allergy/avoid filter, never pass records still missing ingredients_text
        if (!(h.ing || '').trim()) {
          unverifiedNutritionSkipped++;
          continue;
        }
      }

      const nu = h.nutriments || {};
      const sugar = typeof nu.sugars_100g === 'number' ? nu.sugars_100g : null;
      const salt = typeof nu.salt_100g === 'number' ? nu.salt_100g : null;
      const sodium = typeof nu.sodium_100g === 'number' ? nu.sodium_100g : null;
      const protein = typeof nu.proteins_100g === 'number' ? nu.proteins_100g : null;
      const fiber = typeof nu.fiber_100g === 'number' ? nu.fiber_100g : null;
      const energy = typeof nu['energy-kcal_100g'] === 'number' ? nu['energy-kcal_100g'] : null;
      const satfat = typeof nu['saturated-fat_100g'] === 'number' ? nu['saturated-fat_100g'] : null;
      const effSalt = salt != null ? salt : sodium != null ? sodium * 2.5 : null;

      const reasons = [];
      if (sugar != null && sugar <= 5) reasons.push(`Listed sugars: ${Math.round(sugar * 10) / 10}g / 100g`);
      if (effSalt != null && effSalt <= 0.6) reasons.push(`Listed salt: ${Math.round(effSalt * 100) / 100}g / 100g`);
      if (fiber != null && fiber >= 3) reasons.push(`Listed fibre: ${Math.round(fiber * 10) / 10}g / 100g`);
      if (protein != null && protein >= 8) reasons.push(`Listed protein: ${Math.round(protein * 10) / 10}g / 100g`);
      if (satfat != null && satfat <= 2) reasons.push(`Listed saturated fat: ${Math.round(satfat * 10) / 10}g / 100g`);
      if (!reasons.length && energy != null) {
        reasons.push(`Matched category search with listed energy (${Math.round(energy)} kcal / 100g); check all fields before choosing`);
      }

      const buzzwords = detectMarketingBuzz(h.name);
      items.push({
        ...h,
        reasons,
        buzzwords,
      });
    }

    return res.json({
      source: 'Open Food Facts',
      items: items.slice(0, 12),
      excludedCount,
      unverifiedNutritionSkipped,
    });
  } catch (err) {
    return res.status(502).json({ error: 'Could not reach Open Food Facts discovery right now.' });
  }
});

const LOCAL_CACHE = new Map();
const OSM_HEADERS = {
  'User-Agent': 'SnackWise/1.0 (University Design Thinking Healthy Food Discovery)',
  'Accept-Language': 'en-IN,en;q=0.9',
};

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function classifyOsmPlace(p) {
  const tags = p.extratags || {};
  const t = String(p.type || '').toLowerCase();
  const c = String(p.category || '').toLowerCase();
  const nameL = String(p.name || p.display_name || '').toLowerCase();
  if (tags.organic === 'yes' || t === 'health_food' || /organic|millet|millets|healthy|nutri|nature|whole/i.test(nameL)) {
    return { catKey: 'health-organic', catLabel: 'Organic / Health-Oriented Shop (OpenStreetMap)' };
  }
  if (t === 'bakery' || /baker|bakers|patisserie|bread/i.test(nameL)) {
    return { catKey: 'bakery', catLabel: 'Bakery (OpenStreetMap)' };
  }
  if (c === 'amenity' || t === 'cafe' || t === 'restaurant' || /cafe|salad|juice|kitchen/i.test(nameL)) {
    return { catKey: 'cafe', catLabel: 'Cafe / Food Outlet (OpenStreetMap)' };
  }
  if (t === 'greengrocer' || t === 'farm' || /fruit|veg|sabzi|fresh|kisan/i.test(nameL)) {
    return { catKey: 'produce-grocery', catLabel: 'Fresh Produce / Farm Store (OpenStreetMap)' };
  }
  return { catKey: 'produce-grocery', catLabel: `Food / Grocery Store (${t || c || 'OpenStreetMap'})` };
}

function formatOsmAddress(p) {
  const a = p.address || {};
  const parts = [
    a.house_number && a.road ? `${a.house_number} ${a.road}` : a.road,
    a.neighbourhood || a.suburb || a.residential || a.quarter,
    a.city || a.town || a.village || a.state_district,
    a.state,
    a.postcode,
  ].filter(Boolean);
  return parts.length ? [...new Set(parts)].join(', ') : String(p.display_name || 'Address not detailed in OpenStreetMap');
}

app.get('/api/local/search', async (req, res) => {
  const rawLoc = String(req.query.loc || 'Gurugram, 122002').trim().slice(0, 100);
  const type = String(req.query.type || 'all').trim();
  const latParam = req.query.lat != null && req.query.lat !== '' ? Number(req.query.lat) : null;
  const lonParam = req.query.lon != null && req.query.lon !== '' ? Number(req.query.lon) : null;
  const hasCoords = Number.isFinite(latParam) && Number.isFinite(lonParam);

  const cacheKey = hasCoords
    ? `geo:${latParam.toFixed(2)},${lonParam.toFixed(2)}:${type}`
    : `loc:${rawLoc.toLowerCase()}:${type}`;
  const cached = LOCAL_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < 300000) {
    return res.json(cached.payload);
  }

  try {
    let centerLat;
    let centerLon;
    let resolvedLabel = rawLoc;

    if (hasCoords) {
      centerLat = latParam;
      centerLon = lonParam;
      const revUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${centerLat}&lon=${centerLon}`;
      const revRes = await fetch(revUrl, { headers: OSM_HEADERS, signal: AbortSignal.timeout(7000) });
      if (revRes.ok) {
        const rev = await revRes.json();
        const ad = rev.address || {};
        resolvedLabel = [ad.suburb || ad.neighbourhood || ad.city || ad.town, ad.postcode, ad.state].filter(Boolean).join(', ') || rev.display_name || `${centerLat.toFixed(3)}, ${centerLon.toFixed(3)}`;
      }
    } else {
      const qGeo = /\bindia\b/i.test(rawLoc) ? rawLoc : `${rawLoc}, India`;
      const geoUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(qGeo)}`;
      const geoRes = await fetch(geoUrl, { headers: OSM_HEADERS, signal: AbortSignal.timeout(7000) });
      if (!geoRes.ok) throw new Error('GEO_STATUS_' + geoRes.status);
      const geoList = await geoRes.json();
      if (!Array.isArray(geoList) || !geoList.length) {
        return res.json({
          resolvedLocation: rawLoc,
          source: 'OpenStreetMap Nominatim',
          places: [],
          message: 'Could not resolve that city, locality or PIN code in OpenStreetMap. Try an area name like "Gurugram", "122002", "South Delhi", or "Noida".',
        });
      }
      centerLat = Number(geoList[0].lat);
      centerLon = Number(geoList[0].lon);
      const ad = geoList[0].address || {};
      resolvedLabel = [ad.suburb || ad.neighbourhood, ad.city || ad.town || ad.village || ad.state_district, ad.postcode, ad.state].filter(Boolean).join(', ') || geoList[0].display_name;
    }

    

    // Search nearby food-related places using OpenStreetMap Overpass
    const radius = 6000;

    const shopTypes = {
      all: ['health_food', 'organic', 'bakery', 'supermarket', 'convenience', 'greengrocer', 'farm', 'food'],
      'health-organic': ['health_food', 'organic'],
      'millet-grain': ['health_food', 'organic', 'supermarket', 'greengrocer', 'farm'],
      bakery: ['bakery'],
      cafe: [],
      'produce-grocery': ['supermarket', 'convenience', 'greengrocer', 'farm', 'food'],
    };

    const amenityTypes = {
      all: ['cafe', 'restaurant', 'fast_food', 'food_court'],
      'health-organic': [],
      'millet-grain': [],
      bakery: [],
      cafe: ['cafe', 'restaurant', 'fast_food', 'food_court'],
      'produce-grocery': [],
    };

    const selectedShops = shopTypes[type] || shopTypes.all;
    const selectedAmenities = amenityTypes[type] || amenityTypes.all;

    const clauses = [];

    if (selectedShops.length) {
      clauses.push(
        `nwr(around:${radius},${centerLat},${centerLon})["shop"~"^(${selectedShops.join('|')})$"];`
      );
    }

    if (selectedAmenities.length) {
      clauses.push(
        `nwr(around:${radius},${centerLat},${centerLon})["amenity"~"^(${selectedAmenities.join('|')})$"];`
      );
    }

    const overpassQuery = `
      [out:json][timeout:20];
      (
        ${clauses.join('\n')}
      );
      out center;
    `;

    const overpassResponse = await fetch(
      'https://overpass-api.de/api/interpreter',
      {
        method: 'POST',
        headers: {
          ...OSM_HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: AbortSignal.timeout(25000),
      }
    );

    if (!overpassResponse.ok) {
      throw new Error(`OVERPASS_STATUS_${overpassResponse.status}`);
    }

    const overpassData = await overpassResponse.json();
    const elements = Array.isArray(overpassData.elements)
      ? overpassData.elements
      : [];

    const seen = new Set();
    const places = [];

    for (const element of elements) {
      const tags = element.tags || {};
      const name = String(tags.name || tags.brand || '').trim();

      if (!name) continue;

      const key = `${element.type}:${element.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const pLat = Number(element.lat ?? element.center?.lat);
      const pLon = Number(element.lon ?? element.center?.lon);

      if (!Number.isFinite(pLat) || !Number.isFinite(pLon)) continue;

      const p = {
        name,
        type: tags.shop || tags.amenity || '',
        category: tags.amenity ? 'amenity' : 'shop',
        extratags: {
          ...tags,
          organic: tags.shop === 'organic' ? 'yes' : tags.organic,
        },
        display_name: name,
        address: {
          house_number: tags['addr:housenumber'],
          road: tags['addr:street'],
          neighbourhood: tags['addr:neighbourhood'],
          suburb: tags['addr:suburb'],
          city: tags['addr:city'] || tags['addr:town'],
          state: tags['addr:state'],
          postcode: tags['addr:postcode'],
        },
      };

      const cls = classifyOsmPlace(p);
      const dietTags = [];

      if (tags.organic === 'yes' || tags.shop === 'organic') {
        dietTags.push('Organic tagged');
      }
      if (tags['diet:vegetarian'] === 'yes') dietTags.push('Vegetarian tagged');
      if (tags['diet:vegan'] === 'yes') dietTags.push('Vegan tagged');
      if (tags['diet:gluten_free'] === 'yes') dietTags.push('Gluten-free tagged');

      places.push({
        id: key,
        name,
        address: formatOsmAddress(p),
        lat: pLat,
        lon: pLon,
        distanceKm: haversineKm(centerLat, centerLon, pLat, pLon),
        categoryKey: cls.catKey,
        categoryLabel: cls.catLabel,
        phone: tags.phone || tags['contact:phone'] || '',
        website: tags.website || tags['contact:website'] || '',
        openingHours: tags.opening_hours || '',
        dietTags,
        source: 'OpenStreetMap (community-mapped)',
        verified: false,
        osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      });
    }

    places.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    const payload = {
      resolvedLocation: resolvedLabel,
      center: { lat: centerLat, lon: centerLon },
      source: 'OpenStreetMap Overpass (live directory)',
      places: places.slice(0, 20),
    };
    if (LOCAL_CACHE.size >= 40) {
      const fk = LOCAL_CACHE.keys().next().value;
      if (fk) LOCAL_CACHE.delete(fk);
    }
    LOCAL_CACHE.set(cacheKey, { ts: Date.now(), payload });
    return res.json(payload);
  } catch (err) {
  console.error('LOCAL SEARCH ERROR:', err);

  return res.status(502).json({
    error: String(err.message || err),
    places: [],
  });
}
});

app.use(express.static(__dirname));

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SnackWise server running on http://0.0.0.0:${PORT}`);
});
