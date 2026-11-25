import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let HEALTHY_CATALOG = [];
try {
  HEALTHY_CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, 'healthy_catalog.json'), 'utf8'));
} catch {
  HEALTHY_CATALOG = [];
}

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
  'nutrition_data_per',
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
    nutPer: String(h.nutrition_data_per || '100g').trim(),
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
  all: ['roasted makhana', 'roasted chana', 'ragi chips', 'rolled oats'],
  'roasted-baked': ['roasted makhana', 'roasted chana', 'popcorn'],
  fruit: ['dried mango', 'dates', 'date bar'],
  millet: ['millet', 'ragi', 'jowar puffs'],
  'whole-grain': ['rolled oats', 'puffed rice cake', 'quinoa puffs'],
  'nuts-seeds': ['almonds', 'pumpkin seeds', 'trail mix'],
  'biscuits-crackers': ['multigrain crackers', 'oat biscuits', 'seed crackers'],
  'high-fibre': ['oats', 'roasted chana', 'multigrain crackers'],
  'low-sugar': ['roasted makhana', 'dark chocolate 85', 'unsweetened peanut butter'],
  'low-sodium': ['rolled oats', 'almonds', 'roasted chana'],
  'protein-rich': ['roasted chana', 'roasted chickpeas', 'unsweetened peanut butter'],
};

function inferHealthyCategory(h, fallbackCat = '') {
  if (h.snackCategory && h.snackCatKey) return { key: h.snackCatKey, label: h.snackCategory };
  const txt = [h.name, h.generic, ...(h.cats || [])].join(' ').toLowerCase();
  if (/ragi|millet|jowar|bajra/.test(txt)) return { key: 'millet', label: 'Millet-based snacks' };
  if (/makhana|chana|popcorn|roasted|baked/.test(txt)) return { key: 'roasted-baked', label: 'Roasted snacks' };
  if (/almond|walnut|cashew|seed|pistachio|trail mix/.test(txt)) return { key: 'nuts-seeds', label: 'Nuts & seeds' };
  if (/mango|date|raisin|fig|dried fruit|juice/.test(txt)) return { key: 'fruit', label: 'Dried fruits' };
  if (/cracker|biscuit|cookie|crispbread|digestive/.test(txt)) return { key: 'biscuits-crackers', label: 'Healthy biscuits & crackers' };
  if (/oat|rice cake|quinoa|multigrain|whole/.test(txt)) return { key: 'whole-grain', label: 'Whole-grain snacks' };
  if (/chickpea|protein|edamame|yogurt/.test(txt)) return { key: 'protein-rich', label: 'Protein & legume snacks' };
  if (fallbackCat && HEALTHY_QUERIES[fallbackCat]) return { key: fallbackCat, label: fallbackCat.replace(/-/g, ' ') };
  return { key: 'other', label: 'Packaged snack options' };
}

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
    // Evaluate verified HEALTHY_CATALOG matches first
    const catalogMatches = HEALTHY_CATALOG.filter((item) => {
      if (q) {
        const qL = q.toLowerCase();
        const hay = [item.name, item.brand, item.snackCategory, item.ing, ...(item.cats || [])].join(' ').toLowerCase();
        if (!hay.includes(qL)) return false;
      }
      if (cat !== 'all' && !['high-fibre', 'low-sugar', 'low-sodium', 'protein-rich'].includes(cat)) {
        if (cat === 'roasted-baked') return item.snackCatKey === 'roasted-baked' || item.snackCatKey === 'protein-rich';
        return item.snackCatKey === cat;
      }
      return true;
    });

    let liveHits = [];
    if (q || catalogMatches.length < 6) {
      if (q) {
        liveHits = await queryOffSearch(q, 24).catch(() => []);
      } else {
        const cached = HEALTHY_CACHE.get(cacheKey);
        if (cached && Date.now() - cached.ts < 600000) {
          liveHits = cached.hits;
        } else {
          const settled = await Promise.allSettled(terms.slice(0, 3).map((t) => queryOffSearch(t, 12)));
          const seenLive = new Set();
          for (const r of settled) {
            if (r.status === 'fulfilled') {
              for (const item of r.value) {
                const norm = stripZero(item.code);
                if (!norm || seenLive.has(norm)) continue;
                if (!item.imgSmall && !item.img) continue;
                seenLive.add(norm);
                liveHits.push(item);
              }
            }
          }
          if (liveHits.length) {
            if (HEALTHY_CACHE.size >= 40) {
              const fk = HEALTHY_CACHE.keys().next().value;
              if (fk) HEALTHY_CACHE.delete(fk);
            }
            HEALTHY_CACHE.set(cacheKey, { ts: Date.now(), hits: liveHits });
          }
        }
      }
    }

    // Merge verified HEALTHY_CATALOG with live OFF hits, deduplicating by code
    const seenMerged = new Set();
    const rawHits = [];
    const addUnique = (h) => {
      const norm = stripZero(h.code);
      if (!norm || seenMerged.has(norm)) return;
      seenMerged.add(norm);
      rawHits.push(h);
    };
    catalogMatches.forEach(addUnique);
    liveHits.forEach(addUnique);

    if (!rawHits.length && q) {
      return res.json({ source: 'Open Food Facts', items: [], excludedCount: 0, unverifiedNutritionSkipped: 0 });
    }

    const items = [];
    let excludedCount = 0;
    let unverifiedNutritionSkipped = 0;

    const stripNegations = (txt) =>
      String(txt || '')
        .toLowerCase()
        .replace(/\b[a-z0-9-]+[- ](?:free|friendly|friendliness|allergy)\b/g, ' ')
        .replace(/\b(?:no|without|free from|free of|instead of)\s+[a-z0-9-]+(?:\s+[a-z0-9-]+)?\b/g, ' ');

    const matchesExclusion = (h) => {
      if (!excludeWords.length) return false;
      const strictHay = [h.ing, h.all, (h.allTags || []).join(' ')].join(' ').toLowerCase();
      const nameHay = stripNegations([h.name, h.generic, h.brand].join(' '));
      const combined = `${strictHay} ${nameHay}`;
      return excludeWords.some((w) => combined.includes(w));
    };

    const preSurviving = [];
    for (const h of rawHits) {
      if (matchesExclusion(h)) {
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

      if (cat === 'low-sugar' && (sugar == null || sugar > 7)) {
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
      if (taste === 'sweet' && sugar != null && salt != null && sugar < 3 && salt > 0.5) continue;
      if (taste === 'savoury' && sugar != null && salt != null && sugar > 14 && salt < 0.25) continue;

      preSurviving.push(h);
    }

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
      if (excludeWords.length) {
        if (matchesExclusion(h)) {
          excludedCount++;
          continue;
        }
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
      if (sugar != null && sugar <= 5) reasons.push(`Low listed sugars: ${Math.round(sugar * 10) / 10}g / 100g`);
      if (effSalt != null && effSalt <= 0.6) reasons.push(`Low listed salt: ${Math.round(effSalt * 100) / 100}g / 100g`);
      if (fiber != null && fiber >= 3) reasons.push(`Source of fibre: ${Math.round(fiber * 10) / 10}g / 100g`);
      if (protein != null && protein >= 8) reasons.push(`Protein listed: ${Math.round(protein * 10) / 10}g / 100g`);
      if (satfat != null && satfat <= 2) reasons.push(`Low saturated fat: ${Math.round(satfat * 10) / 10}g / 100g`);
      if (!reasons.length && energy != null) {
        reasons.push(`Open Food Facts record (${Math.round(energy)} kcal / 100g); inspect full sugars, salt and oils`);
      }

      const catInfo = inferHealthyCategory(h, cat);
      const buzzwords = detectMarketingBuzz(h.name);
      items.push({
        ...h,
        snackCatKey: catInfo.key,
        snackCategory: catInfo.label,
        reasons,
        buzzwords,
      });
    }

    // Prioritize items with verified product images so cards render crisply
    items.sort((a, b) => Number(Boolean(b.imgSmall || b.img)) - Number(Boolean(a.imgSmall || a.img)));

    return res.json({
      source: 'Open Food Facts',
      items: items.slice(0, 52),
      totalCatalog: HEALTHY_CATALOG.length,
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

const FAST_FOOD_CHAIN_RE = /\b(mcdonald|burger king|kfc|domino|pizza hut|subway|taco bell|wendy|dunkin|popeyes|papa john|baskin|cold stone|krispy kreme|carl'?s jr|wow!?\s*momo|chicago pizza|la pino)\b/i;

function classifyOsmPlace(p, requestedType = 'all') {
  const tags = p.extratags || {};
  const t = String(p.type || '').toLowerCase();
  const c = String(p.category || '').toLowerCase();
  const nameL = String(p.name || p.display_name || '').toLowerCase();

  if (tags.organic === 'yes' || t === 'health_food' || t === 'organic' || t === 'herbalist' || t === 'wholefoods' || /organic|millet|millets|healthy|nutri|nature|wholefood|ayur|satvik|sattvic|khadi|natural/i.test(nameL)) {
    const isMillet = requestedType === 'millet-grain' || /millet|ragi|jowar|bajra|grain|atta|chakki|flour/i.test(nameL);
    return {
      catKey: isMillet ? 'millet-grain' : 'health-organic',
      catLabel: isMillet ? 'Millet / Whole-Grain & Health Store (OpenStreetMap)' : 'Organic / Health-Oriented Shop (OpenStreetMap)',
      priority: 1,
    };
  }
  if (t === 'greengrocer' || t === 'farm' || t === 'nuts' || /fruit|veg|sabzi|fresh|kisan|farm|harvest|sprout/i.test(nameL)) {
    return { catKey: 'produce-grocery', catLabel: 'Fresh Produce / Farm Store (OpenStreetMap)', priority: 2 };
  }
  if (t === 'bakery' || /baker|bakers|patisserie|bread|sourdough/i.test(nameL)) {
    return { catKey: 'bakery', catLabel: 'Bakery (OpenStreetMap · Ingredients unverified)', priority: 4 };
  }
  if (c === 'amenity' || t === 'cafe' || /cafe|salad|juice|smoothie|bowl|tea/i.test(nameL)) {
    return { catKey: 'cafe', catLabel: 'Cafe / Juice & Salad Outlet (OpenStreetMap)', priority: 4 };
  }
  return { catKey: 'produce-grocery', catLabel: `Food / Grocery Store (${t || c || 'OpenStreetMap'})`, priority: 3 };
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
  const qGeo = /\bindia\b/i.test(rawLoc)
    ? rawLoc
    : `${rawLoc}, India`;

  let geoResult = null;

  // First try Nominatim
  try {
    const geoUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(qGeo)}`;
    console.log('Trying Nominatim geocoding');
    const geoRes = await fetch(geoUrl, {
      headers: OSM_HEADERS,
      signal: AbortSignal.timeout(7000),
    });

    if (geoRes.ok) {
      const geoList = await geoRes.json();

      if (Array.isArray(geoList) && geoList.length) {
        geoResult = {
          lat: Number(geoList[0].lat),
          lon: Number(geoList[0].lon),
          address: geoList[0].address || {},
        };
      }
    }
  } catch (err) {
    console.warn('Nominatim lookup failed:', err.message);
  }

  // If Nominatim fails or is rate-limited, use Photon
  if (!geoResult) {
    const photonUrl =
      `https://photon.komoot.io/api/?limit=1&lang=en&q=${encodeURIComponent(qGeo)}`;
     console.log('Trying Photon geocoding');
    const photonRes = await fetch(photonUrl, {
      headers: {
        'User-Agent': 'SnackWise/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!photonRes.ok) {
      throw new Error(`PHOTON_STATUS_${photonRes.status}`);
    }

    const photonData = await photonRes.json();
    const feature = photonData.features?.[0];

    if (!feature) {
      throw new Error('LOCATION_NOT_FOUND');
    }

    const coordinates = feature.geometry?.coordinates || [];

    geoResult = {
      lon: Number(coordinates[0]),
      lat: Number(coordinates[1]),
      address: feature.properties || {},
    };
  }

  centerLat = geoResult.lat;
  centerLon = geoResult.lon;

  if (
    !Number.isFinite(centerLat) ||
    !Number.isFinite(centerLon)
  ) {
    throw new Error('INVALID_GEOCODE_COORDINATES');
  }

  const ad = geoResult.address;

  resolvedLabel = [
    ad.name,
    ad.suburb || ad.neighbourhood || ad.district,
    ad.city || ad.town || ad.county,
    ad.state,
  ].filter(Boolean).join(', ') || rawLoc;
}


    
    // Search nearby healthy-food-oriented places using Photon (no fast_food or food_court)
    const radius = 7;

    const shopTypes = {
      all: ['health_food', 'organic', 'greengrocer', 'farm', 'wholefoods', 'herbalist', 'nuts'],
      'health-organic': ['health_food', 'organic', 'wholefoods', 'herbalist'],
      'millet-grain': ['health_food', 'organic', 'greengrocer', 'farm', 'supermarket'],
      bakery: ['bakery'],
      cafe: [],
      'produce-grocery': ['greengrocer', 'farm', 'supermarket', 'food', 'nuts'],
    };

    const amenityTypes = {
      all: [],
      'health-organic': [],
      'millet-grain': [],
      bakery: [],
      cafe: ['cafe'],
      'produce-grocery': [],
    };

    if (type === 'homemade-biz') {
      return res.json({
        resolvedLocation: resolvedLabel,
        center: { lat: centerLat, lon: centerLon },
        source: 'Community browser listings',
        places: [],
      });
    }

    const selectedShops = shopTypes[type] || shopTypes.all;
    const selectedAmenities = amenityTypes[type] || amenityTypes.all;

    const params = new URLSearchParams({
      lat: String(centerLat),
      lon: String(centerLon),
      radius: String(radius),
      limit: '50',
      lang: 'en',
    });

    selectedShops.forEach(value => params.append('osm_tag', `shop:${value}`));
    selectedAmenities.forEach(value => params.append('osm_tag', `amenity:${value}`));

    const photonResponse = await fetch(
      `https://photon.komoot.io/reverse?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'SnackWise/1.0',
          'Accept-Language': 'en-IN,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!photonResponse.ok) {
      throw new Error(`PHOTON_PLACES_STATUS_${photonResponse.status}`);
    }

    const photonData = await photonResponse.json();
    const features = Array.isArray(photonData.features)
      ? photonData.features
      : [];

    const seen = new Set();
    const places = [];

    for (const feature of features) {
      const props = feature.properties || {};
      const name = String(props.name || '').trim();
      const osmVal = String(props.osm_value || '').toLowerCase();
      const coordinates = feature.geometry?.coordinates || [];

      const pLon = Number(coordinates[0]);
      const pLat = Number(coordinates[1]);

      if (!name || !Number.isFinite(pLat) || !Number.isFinite(pLon)) continue;
      if (['fast_food', 'food_court', 'pub', 'bar', 'ice_cream', 'alcohol', 'tobacco'].includes(osmVal)) continue;
      if (FAST_FOOD_CHAIN_RE.test(name)) continue;

      const distanceKm = haversineKm(centerLat, centerLon, pLat, pLon);
      if (distanceKm > radius) continue;

      const osmTypeMap = { N: 'node', W: 'way', R: 'relation' };
      const osmType = osmTypeMap[props.osm_type] || 'node';
      const key = `${osmType}:${props.osm_id || `${name}:${pLat}:${pLon}`}`;

      if (seen.has(key)) continue;
      seen.add(key);

      const p = {
        name,
        type: props.osm_value || '',
        category: props.osm_key === 'amenity' ? 'amenity' : 'shop',
        extratags: {},
        display_name: name,
        address: {
          house_number: props.housenumber,
          road: props.street,
          neighbourhood: props.district,
          suburb: props.locality,
          city: props.city,
          state: props.state,
          postcode: props.postcode,
        },
      };

      const cls = classifyOsmPlace(p, type);

      places.push({
        id: key,
        name,
        address: formatOsmAddress(p),
        lat: pLat,
        lon: pLon,
        distanceKm,
        categoryKey: cls.catKey,
        categoryLabel: cls.catLabel,
        priority: cls.priority,
        phone: '',
        website: '',
        openingHours: '',
        dietTags: [],
        source: 'OpenStreetMap via Photon (community-mapped)',
        verified: false,
        osmUrl: props.osm_id ? `https://www.openstreetmap.org/${osmType}/${props.osm_id}` : '',
      });
    }

    places.sort((a, b) => (a.priority - b.priority) || ((a.distanceKm ?? 999) - (b.distanceKm ?? 999)));
    const payload = {
      resolvedLocation: resolvedLabel,
      center: { lat: centerLat, lon: centerLon },
      source: 'OpenStreetMap via Photon (live directory)',
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
