/* ===== SnackWise Phase 4 Application Script ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let S = {};
try { S = JSON.parse(localStorage.getItem('snackwise')) || {}; } catch (e) {}
const hasProfData = p => Boolean(p && (p.name || p.instr || p.avoid || p.likes || p.other || (p.conditions && p.conditions.length)));
S = Object.assign({
  mode: hasProfData(S.profile) ? 'parent' : 'guest',
  theme: 'light',
  profile: {},
  snacks: [],
  products: [],
  savedProdIds: [],
  savedRecipes: [],
  savedPlaces: [],
  localListings: [],
  notes: '',
  notesUpdatedAt: '',
  plan: {},
  cmp: [],
}, S);
if (!Array.isArray(S.savedProdIds)) S.savedProdIds = [];
if (!Array.isArray(S.savedRecipes)) S.savedRecipes = [];
if (!Array.isArray(S.savedPlaces)) S.savedPlaces = [];
if (!Array.isArray(S.localListings)) S.localListings = [];

const save = () => { try { localStorage.setItem('snackwise', JSON.stringify(S)); } catch (e) {} };
const isParent = () => S.mode === 'parent';

const applyTheme = () => {
  const t = S.theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  const b = $('#themeBtn');
  if (b) {
    b.innerHTML = t === 'dark' ? '<span aria-hidden="true">☀</span> Light' : '<span aria-hidden="true">☾</span> Dark';
    b.setAttribute('aria-pressed', String(t === 'dark'));
    b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    b.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }
};

const updateModeUI = () => {
  const btn = $('#modeBtn');
  if (btn) {
    if (isParent()) {
      btn.textContent = S.profile?.name ? 'Parent: ' + S.profile.name.slice(0, 12) : 'Parent Profile';
      btn.classList.add('is-parent');
    } else {
      btn.textContent = 'Guest Mode';
      btn.classList.remove('is-parent');
    }
  }
  const g = $('#modeGuest'), p = $('#modeParent');
  if (g && p) {
    g.classList.toggle('on', !isParent());
    p.classList.toggle('on', isParent());
    p.textContent = S.profile?.name && isParent() ? 'Parent: ' + S.profile.name.slice(0, 12) : 'Parent';
  }
};

window.toggleTheme = () => { S.theme = S.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); };
window.setMode = (m, redir) => {
  S.mode = m === 'parent' ? 'parent' : 'guest';
  save();
  updateModeUI();
  if (redir) go(redir);
  else render();
  toast(isParent() ? 'Parent Profile mode active' : 'Guest Mode active');
};
window.toggleMenu = () => {
  const n = $('#nav'), m = $('#menu');
  if (n && m) {
    const o = n.classList.toggle('open');
    m.setAttribute('aria-expanded', String(o));
  }
};
applyTheme();
updateModeUI();

const SLOTS = ['School picnic', 'Lunchbox', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ===== DATA & TERMINOLOGY ===== */
const SNACKS = [
  { n: 'Ragi or millet chips (packaged)', t: 'savoury', x: ['crunchy', 'light'], e: 'none', o: ['picnic', 'lunchbox'], i: ['ragi', 'millet', 'oil', 'salt'], d: 'Chip-style crunch like what friends bring. Check the label for salt and fat.', pk: 1 },
  { n: 'Baked multigrain chips (packaged)', t: 'savoury', x: ['crunchy'], e: 'none', o: ['picnic', 'lunchbox'], i: ['multigrain', 'oil', 'salt'], d: 'A baked take on the chips friends bring.', pk: 1 },
  { n: 'Dark chocolate squares (packaged)', t: 'sweet', x: ['crunchy'], e: 'none', o: ['picnic'], i: ['cocoa', 'sugar', 'cocoa butter'], d: 'Feels like a chocolate treat. Sugar and cocoa vary by brand; check the label and ask your doctor if it suits your child.', pk: 1 },
  { n: 'Millet or oat cookies (packaged)', t: 'sweet', x: ['crunchy', 'chewy'], e: 'none', o: ['picnic', 'lunchbox'], i: ['millet', 'oats', 'sugar', 'butter'], d: 'Cookie feel with whole grains. Sugar varies a lot, so compare labels.', pk: 1 },
  { n: 'Roasted namkeen mix (packaged)', t: 'savoury', x: ['crunchy'], e: 'none', o: ['picnic', 'everyday'], i: ['chana', 'peanuts', 'spices', 'salt'], d: 'Namkeen-style mix that is roasted rather than fried. Check the salt.', pk: 1 },
  { n: 'Fruit and nut bar (packaged)', t: 'sweet', x: ['chewy'], e: 'none', o: ['picnic', 'lunchbox'], i: ['dates', 'nuts', 'fruit'], d: 'Chewy bar that looks like a snack bar friends carry.', pk: 1 },
  { n: '100% orange juice (packaged)', t: 'sweet', x: ['juicy'], e: 'none', o: ['picnic', 'lunchbox'], i: ['orange juice'], d: 'A fruit-juice option to compare with soft drinks. Check whether it is 100% juice, the serving size and total sugars; natural fruit sugars are still present.', pk: 1 },
  { n: '100% mixed fruit juice (packaged)', t: 'sweet', x: ['juicy'], e: 'none', o: ['picnic', 'lunchbox'], i: ['mixed fruit juice'], d: 'A fruity alternative to a fizzy drink. Compare the ingredient list and sugars, and check for added sugar or juice-drink concentrates.', pk: 1 },
  { n: 'Roasted makhana (fox nuts)', t: 'savoury', x: ['crunchy', 'light'], e: 'quick', o: ['picnic', 'everyday'], i: ['makhana', 'ghee', 'salt'], d: 'Light, crunchy puffs, dry-roasted with a pinch of seasoning.' },
  { n: 'Roasted chana', t: 'savoury', x: ['crunchy'], e: 'quick', o: ['picnic', 'everyday'], i: ['chana', 'chickpeas', 'spices'], d: 'Crunchy roasted chickpeas, a chips-style bite.' },
  { n: 'Fruit chaat cup', t: 'sweet', x: ['soft', 'juicy'], e: 'quick', o: ['picnic', 'lunchbox', 'everyday'], i: ['apple', 'banana', 'orange', 'pomegranate', 'lemon'], d: 'Chopped seasonal fruit with a squeeze of lemon.' },
  { n: 'Homemade poha chivda', t: 'savoury', x: ['crunchy', 'light'], e: 'cook', o: ['picnic', 'everyday'], i: ['poha', 'pumpkin seeds', 'curry leaves', 'oil'], d: 'Namkeen-style mix where you control salt and oil.' },
  { n: 'Air-popped popcorn', t: 'savoury', x: ['crunchy', 'light'], e: 'quick', o: ['picnic', 'everyday'], i: ['corn', 'popcorn', 'salt'], d: 'Movie-snack feel; season it yourself.' },
  { n: 'Curd and fruit cup', t: 'sweet', x: ['creamy', 'soft'], e: 'none', o: ['lunchbox', 'everyday'], i: ['curd', 'yogurt', 'banana', 'apple'], d: 'Creamy dessert-like cup, sweetness from the fruit.' },
  { n: 'Besan chilla roll', t: 'savoury', x: ['soft'], e: 'cook', o: ['lunchbox', 'everyday'], i: ['besan', 'onion', 'tomato', 'oil'], d: 'Soft savoury pancake rolled around veggies.' },
  { n: 'Vegetable sandwich fingers', t: 'savoury', x: ['soft'], e: 'quick', o: ['picnic', 'lunchbox'], i: ['bread', 'cucumber', 'tomato', 'paneer', 'cheese'], d: 'Cut into fun shapes for a picnic box.' },
  { n: 'Baked sweet potato fries', t: 'savoury', x: ['crunchy', 'soft'], e: 'cook', o: ['everyday', 'picnic'], i: ['sweet potato', 'oil', 'salt'], d: 'Fry-style bites baked in the oven.' },
  { n: 'Oats banana cookies', t: 'sweet', x: ['chewy', 'soft'], e: 'cook', o: ['picnic', 'lunchbox', 'everyday'], i: ['oats', 'banana', 'raisins'], d: 'Chewy cookies with few ingredients.' },
  { n: 'Date and nut balls', t: 'sweet', x: ['chewy'], e: 'quick', o: ['picnic', 'lunchbox'], i: ['dates', 'almonds', 'walnuts', 'coconut'], d: 'Chewy bites, like a toffee substitute.' },
  { n: 'Cucumber and carrot sticks with hummus', t: 'savoury', x: ['crunchy', 'creamy'], e: 'quick', o: ['lunchbox', 'picnic', 'everyday'], i: ['cucumber', 'carrot', 'chickpeas', 'curd'], d: 'Crunchy dippers with a creamy dip.' },
  { n: 'Paneer cubes with chaat masala', t: 'savoury', x: ['soft', 'chewy'], e: 'quick', o: ['lunchbox', 'everyday'], i: ['paneer', 'chaat masala'], d: 'Soft, protein-rich finger food.' },
  { n: 'Mini idli bites', t: 'savoury', x: ['soft'], e: 'cook', o: ['lunchbox', 'everyday'], i: ['idli', 'rice', 'urad dal', 'curd'], d: 'Bite-size idlis that pack well.' },
  { n: 'Frozen banana pops', t: 'sweet', x: ['creamy', 'chewy'], e: 'quick', o: ['everyday', 'picnic'], i: ['banana', 'curd'], d: 'Ice-cream-like treat from frozen banana.' },
  { n: 'Cheese and cracker stacks', t: 'savoury', x: ['crunchy', 'creamy'], e: 'none', o: ['picnic', 'lunchbox'], i: ['cheese', 'crackers', 'cucumber'], d: 'Check the cracker label for salt and fat.' },
  { n: 'Fresh mosambi juice (no added sugar)', t: 'sweet', x: ['juicy'], e: 'quick', o: ['picnic', 'everyday'], i: ['mosambi', 'sweet lime'], d: 'A fresh citrus drink without added sugar; it still contains naturally occurring fruit sugars, so consider portion and individual guidance.' },
  { n: 'Fresh watermelon juice (no added sugar)', t: 'sweet', x: ['juicy'], e: 'quick', o: ['picnic', 'everyday'], i: ['watermelon'], d: 'A refreshing fruit-based drink with no added sugar; naturally occurring sugars remain. Check portion guidance for your child.' },
];

const LOOK = [
  { k: ['chip', 'crisp', 'wafer', 'lays', 'kurkure', 'potato'], f: 'salty, crunchy, light', a: [['Ragi or millet chips (packaged)', 'Same chip format and crunch as what friends bring. Check the label for salt and fat.', 'Packaged type'], ['Baked multigrain chips (packaged)', 'Looks and crunches like regular chips, but baked.', 'Packaged type'], ['Roasted makhana (fox nuts)', 'Similar light crunch and salty seasoning, but a different base ingredient.', 'Homemade'], ['Baked sweet potato fries', 'Fry-style shape and crisp edges, oven-baked.', 'Homemade'], ['Roasted chana', 'Crunchy and savoury; denser than chips.', 'Homemade']] },
  { k: ['chocolate', 'choco', 'biscuit', 'cookie', 'brownie'], f: 'sweet, crisp or chewy, cocoa flavour', a: [['Dark chocolate squares (packaged)', 'Looks and snaps like the chocolate friends bring, often less sweet. Sugar and cocoa vary, so check the label.', 'Packaged type'], ['Millet or oat cookies (packaged)', 'Biscuit feel with whole grains.', 'Packaged type'], ['Oats banana cookies', 'Chewy cookie feel with fruit-based sweetness.', 'Homemade'], ['Date and nut balls', 'Chewy, rich and sweet like a chocolate bite.', 'Homemade'], ['Frozen banana pops', 'Cold, sweet and creamy; can be rolled in a little cocoa.', 'Homemade']] },
  { k: ['cream', 'sandwich biscuit', 'oreo', 'bourbon', 'filled'], f: 'sweet, crisp outside, creamy inside', a: [['Cheese and cracker stacks', 'Crisp layer with a creamy middle, but savoury.', 'Homemade'], ['Curd and fruit cup', 'Creamy and dessert-like.', 'Homemade'], ['Frozen banana pops', 'Creamy and sweet with a fun hold-in-hand format.', 'Homemade']] },
  { k: ['namkeen', 'bhujia', 'sev', 'mixture', 'chivda', 'farsan'], f: 'salty, spicy, crunchy mix', a: [['Roasted namkeen mix (packaged)', 'Same namkeen feel, roasted instead of fried. Check the salt.', 'Packaged type'], ['Homemade poha chivda', 'Same mix feel; you decide the salt and oil.', 'Homemade'], ['Roasted chana', 'Crunchy, spiced and savoury.', 'Homemade'], ['Roasted makhana (fox nuts)', 'Light crunch with masala seasoning.', 'Homemade']] },
  { k: ['popcorn', 'puff', 'crunchy'], f: 'light, airy, crunchy', a: [['Roasted makhana (fox nuts)', 'Very similar airy crunch.', 'Homemade'], ['Air-popped popcorn', 'The same snack with your own seasoning.', 'Homemade']] },
  { k: ['soda', 'soft drink', 'cola', 'fizzy drink', 'carbonated', 'sprite', 'coke', 'pepsi'], f: 'cold, refreshing, fruity drink', a: [['100% mixed fruit juice (packaged)', 'A fruit-forward option; check the label for added sugar and total sugars.', 'Packaged type'], ['100% orange juice (packaged)', 'A familiar citrus flavour. It contains natural fruit sugars, so compare serving sizes.', 'Packaged type'], ['Fresh mosambi juice (no added sugar)', 'Fresh citrus taste without added sugar; portion still matters.', 'Homemade'], ['Fresh watermelon juice (no added sugar)', 'A refreshing fruit-based option; naturally occurring sugars remain.', 'Homemade'], ['Chilled water with lemon and mint', 'A refreshing, no-added-sugar alternative to a fizzy drink.', 'Homemade']] },
];

const GLOSS = [
  { k: ['sodium', 'salt'], t: 'Sodium / salt', x: 'Sodium is the part of salt the body tracks. Labels may show salt (g) or sodium (mg or g). Salt is roughly 2.5 times the sodium amount.' },
  { k: ['saturated'], t: 'Saturated fat', x: 'A type of fat found in butter, ghee, cream, coconut and palm oil. Labels list it separately from total fat.' },
  { k: ['added sugar', 'sugar', 'sucrose', 'glucose', 'syrup', 'dextrose', 'fructose'], t: 'Sugars and added sugars', x: '"Sugars" includes natural sugars (like in fruit or milk). "Added sugars" are put in during making, sometimes under names like sucrose, glucose syrup or dextrose.' },
  { k: ['maltodextrin'], t: 'Maltodextrin', x: 'A starch-based powder used to add bulk or texture. The body digests it quickly, so it behaves like a sugar in the body even if the label lists it separately.' },
  { k: ['monosodium', 'msg', 'e621'], t: 'MSG (monosodium glutamate)', x: 'A flavour enhancer that adds a savoury taste. It also contains sodium.' },
  { k: ['palm', 'hydrogenated'], t: 'Palm oil / hydrogenated oil', x: 'Cheap cooking fats common in packaged snacks. Palm oil is high in saturated fat; hydrogenated oils can contain trans fats.' },
  { k: ['lecithin', 'emulsifier', 'e322', 'e471'], t: 'Emulsifiers (lecithin, E471)', x: 'Help oil and water mix and keep texture smooth. Soy lecithin comes from soy, which matters for soy allergies.' },
  { k: ['preservative', 'e202', 'e211', 'e330'], t: 'Preservatives and E-numbers', x: 'Additives that keep food fresh or change its look. "E" numbers are standard codes for additives.' },
];

const NUT = [
  ['energy', 'Energy', 'kcal'],
  ['sugar', 'Sugars', 'g'],
  ['salt', 'Salt', 'g'],
  ['sodium', 'Sodium', 'g'],
  ['satfat', 'Saturated fat', 'g'],
  ['fat', 'Total fat', 'g'],
  ['carbs', 'Carbohydrates', 'g'],
  ['fiber', 'Dietary fibre', 'g'],
  ['protein', 'Protein', 'g'],
];

/* ===== HELPERS, VALIDATION & PERSONALISATION ===== */
const list = s => (s || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
const stripZero = s => String(s || '').replace(/\D/g, '').replace(/^0+/, '');
const stripNegations = txt => String(txt || '').toLowerCase()
  .replace(/\b[a-z0-9-]+[- ](?:free|friendly|friendliness|allergy)\b/g, ' ')
  .replace(/\b(?:no|without|free from|free of|instead of)\s+[a-z0-9-]+(?:\s+[a-z0-9-]+)?\b/g, ' ');

const COND_EXCLUSIONS = {
  'Peanut allergy': ['peanut', 'peanuts', 'groundnut', 'arachis'],
  'Lactose intolerance': ['milk', 'lactose', 'whey', 'casein', 'skimmed milk', 'skim milk', 'milk powder', 'butter', 'buttermilk', 'cream', 'cheese', 'paneer', 'curd', 'yogurt', 'dairy', 'milkfat', 'ghee'],
  'Gluten intolerance / coeliac disease': ['gluten', 'wheat', 'barley', 'rye', 'malt', 'semolina', 'maida', 'spelt', 'durum'],
};

const getActiveExclusions = () => {
  if (!isParent()) return { avoidWords: [], allergyExclusions: [], allExclusions: [], conditions: [] };
  const conds = S.profile.conditions || [];
  const avoidWords = list(S.profile.avoid);
  const allergyExclusions = [];
  conds.forEach(c => {
    (COND_EXCLUSIONS[c] || []).forEach(w => { if (!allergyExclusions.includes(w)) allergyExclusions.push(w); });
  });
  const allExclusions = [...new Set([...avoidWords, ...allergyExclusions])];
  return { avoidWords, allergyExclusions, allExclusions, conditions: conds };
};

const matchWordInText = (txt, word) => {
  const t = String(txt || '').toLowerCase();
  if (!t || !word) return false;
  return t.includes(word.toLowerCase());
};

const flags = (txt, optionalTitle = '') => {
  if (!isParent()) return [];
  const { allExclusions } = getActiveExclusions();
  const cleanTitle = stripNegations(optionalTitle);
  const combined = (String(txt || '').toLowerCase() + ' ' + cleanTitle).trim();
  return allExclusions.filter(w => matchWordInText(combined, w));
};

const toast = (m) => {
  document.querySelectorAll('.sw-toast').forEach(x => x.remove());
  const d = document.createElement('div');
  d.className = 'sw-toast';
  d.setAttribute('role', 'status');
  d.textContent = m;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2200);
};

const trackUse = () => {
  S.usage = S.usage || { count: 0, asked: false, submitted: false };
  if (S.usage.asked || S.usage.submitted) return;
  S.usage.count = (S.usage.count || 0) + 1;
  save();
  if (S.usage.count >= (S.usage.nextPromptAt || 15)) {
    S.usage.asked = true;
    save();
    setTimeout(showReviewPrompt, 450);
  }
};

window.openFeedback = () => showReviewPrompt(true);

const showReviewPrompt = (manualOpen = false) => {
  if (document.getElementById('reviewBackdrop')) return;
  if (!manualOpen && S.usage?.submitted) return;
  S.reviewRating = S.review?.rating || S.reviewRating || 0;
  const wrap = document.createElement('div');
  wrap.id = 'reviewBackdrop';
  wrap.className = 'review-backdrop';
  wrap.onclick = e => { if (e.target === wrap) closeReview(); };
  wrap.innerHTML = `<div class="review-modal" role="dialog" aria-modal="true" aria-labelledby="reviewTitle">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem">
      <div><span class="kicker-text">Feedback</span><h2 id="reviewTitle" style="margin:.25rem 0 .35rem">How has SnackWise helped?</h2></div>
      <button type="button" class="btn s l" onclick="closeReview()" aria-label="Close feedback">Close</button>
    </div>
    <p class="mut" style="margin-top:0">Share whether SnackWise has made discovering or comparing snacks easier for your family.</p>
    <div class="review-stars" role="group" aria-label="Rate SnackWise">
      ${[1, 2, 3, 4, 5].map(n => `<button type="button" data-rating="${n}" class="${n <= (S.reviewRating || 0) ? 'selected' : ''}" aria-label="${n} stars">${n <= (S.reviewRating || 0) ? '★' : '☆'}</button>`).join('')}
    </div>
    <label for="reviewText">Your thoughts or suggestions</label>
    <textarea id="reviewText" placeholder="What worked well, and what could be clearer or more reliable?">${esc(S.review?.text || '')}</textarea>
    <p id="reviewErr" class="err-line" hidden></p>
    <div style="display:flex;justify-content:space-between;gap:.65rem;flex-wrap:wrap;margin-top:.85rem">
      <button class="btn l" type="button" onclick="closeReview()">Ask me later</button>
      <button class="btn" type="button" onclick="submitReview()">Send feedback</button>
    </div>
  </div>`;
  document.body.appendChild(wrap);
  wrap.querySelectorAll('[data-rating]').forEach(b => b.addEventListener('click', () => {
    S.reviewRating = Number(b.dataset.rating);
    const err = $('#reviewErr'); if (err) err.hidden = true;
    wrap.querySelectorAll('[data-rating]').forEach(x => {
      x.classList.toggle('selected', Number(x.dataset.rating) <= S.reviewRating);
      x.textContent = Number(x.dataset.rating) <= S.reviewRating ? '★' : '☆';
    });
  }));
};

window.closeReview = () => {
  const x = document.getElementById('reviewBackdrop');
  if (x) x.remove();
  if (S.usage && !S.usage.submitted) {
    S.usage.asked = false;
    S.usage.nextPromptAt = (S.usage.count || 15) + 5;
    save();
  }
};

window.submitReview = () => {
  const txt = (document.getElementById('reviewText')?.value || '').trim();
  const rating = Number(S.reviewRating || 0);
  const errEl = document.getElementById('reviewErr');
  if (!rating && txt.length < 5) {
    if (errEl) {
      errEl.textContent = 'Please choose a star rating or write a brief comment (at least 5 characters) before sending.';
      errEl.hidden = false;
    }
    return;
  }
  S.usage = S.usage || {};
  S.usage.submitted = true;
  S.review = { rating: rating || null, text: txt, date: new Date().toISOString() };
  save();
  const modal = document.querySelector('#reviewBackdrop .review-modal');
  if (modal) {
    modal.innerHTML = `<span class="kicker-text">Feedback received</span>
      <h2 style="margin:.35rem 0">Thank you for helping improve SnackWise</h2>
      <p class="mut">Your feedback${rating ? ` (${rating}/5 stars)` : ''} has been saved locally in this session.</p>
      <p style="margin-top:1rem"><button class="btn" type="button" onclick="closeReview()">Done</button></p>`;
  } else {
    closeReview();
    toast('Thank you for your feedback!');
  }
};

const saveSnack = (n, btn) => {
  if (!S.snacks.includes(n)) S.snacks.push(n);
  save();
  if (btn) btn.textContent = 'Saved';
  toast('Saved to Saved Choices');
  trackUse();
};
const isProdSaved = id => S.savedProdIds.includes(id);
window.toggleSaveProd = (id, btn) => {
  if (!id) return;
  const idx = S.savedProdIds.indexOf(id);
  if (idx >= 0) {
    S.savedProdIds.splice(idx, 1);
    if (btn) btn.textContent = 'Save product';
    toast('Removed from Saved Choices');
  } else {
    S.savedProdIds.push(id);
    if (btn) btn.textContent = 'Saved';
    toast('Saved product to Saved Choices');
    trackUse();
  }
  save();
};

const addPlan = (n, slot) => {
  const name = String(n || '').trim();
  if (!slot || !name) return;
  S.plan[slot] = S.plan[slot] || [];
  if (!S.plan[slot].includes(name)) {
    S.plan[slot].push(name);
    save();
    toast('Added to ' + slot);
    trackUse();
  } else {
    toast('Already in ' + slot);
  }
};
const slotSel = n => `<select aria-label="Add to plan" data-n="${esc(n)}" onchange="addPlan(this.dataset.n,this.value);this.value=''"><option value="">Add to plan...</option>${SLOTS.map(s => `<option>${s}</option>`).join('')}</select>`;

const snackCard = (n, d, tags, ing, why) => {
  const f = flags((ing || []).join(' '), n);
  const saved = S.snacks.includes(n);
  const metaLine = (tags || []).filter(Boolean).join(' · ');
  return `<article class="card snack-card">
    ${picHTML(n)}
    <div class="meta-line" style="margin-bottom:.3rem">${esc(metaLine)}</div>
    <h3>${esc(n)}</h3>
    <p class="mut" style="margin:0 0 .5rem">${esc(d)}</p>
    ${why ? `<p class="mut" style="font-size:.85rem;margin:0 0 .45rem"><b>Why suggested:</b> ${esc(why)}</p>` : ''}
    ${ing ? `<p class="mut" style="font-size:.84rem;margin:0">Typical ingredients: ${esc(ing.join(', '))}</p>` : ''}
    ${f.length ? `<div class="alert-inline warn" style="margin-top:.65rem"><b>Check label:</b> Matches profile words (<b>${esc(f.join(', '))}</b>).</div>` : ''}
    <div class="snack-actions"><button class="btn s l" data-n="${esc(n)}" onclick="saveSnack(this.dataset.n,this)">${saved ? 'Saved' : 'Save idea'}</button> ${slotSel(n)}</div>
    <p class="mut safety-hint">Always verify actual package ingredients before serving.</p>
  </article>`;
};

const fmt = (v, u) => v == null || v === '' || isNaN(v) ? '<span class="mut">Not listed</span>' : (Math.round(v * 100) / 100) + ' ' + u;
const glossFor = txt => { const t = (txt || '').toLowerCase(); return GLOSS.filter(g => g.k.some(k => t.includes(k))); };
window.catGo = (k, v) => { D = { taste: '', tex: '', occ: '', eff: '', kind: '', ing: '' }; if (k in D) D[k] = v; go('discover'); };

const pickSafeImage = (url, code) => {
  const u = String(url || '').trim();
  if (!u || !u.startsWith('https://')) return '';
  const m = u.match(/images\.openfoodfacts\.org\/images\/products\/([0-9/]+)\//);
  if (m && code) {
    const ic = stripZero(m[1].replace(/\//g, ''));
    const rc = stripZero(code);
    if (ic && rc && ic !== rc) return '';
  }
  return u;
};

window.imgFail = el => {
  const w = el.closest('.prod-img-wrap,.dash-mini-img,.recipe-pic,.pic');
  if (w) { w.classList.remove('is-loading'); w.classList.add('is-empty'); }
  el.removeAttribute('src');
  el.style.display = 'none';
};

const PKG_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 5V3h8v2M9 11h6M9 15h4"/></svg>`;

const prodImgHTML = (p, size = 'sm') => {
  const src = pickSafeImage(size === 'lg' ? (p.img || p.imgSmall) : (p.imgSmall || p.img), p.code);
  const alt = esc((p.name || 'Product') + ' packaging');
  return `<div class="prod-img-wrap ${size} ${src ? 'is-loading' : 'is-empty'}">${src ? `<img src="${esc(src)}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer" onload="this.parentElement.classList.remove('is-loading')" onerror="imgFail(this)">` : ''}<div class="img-fallback">${PKG_ICON}<span>${src ? 'Image failed to load' : 'No package image listed'}</span></div></div>`;
};

const extractNut = n => ({
  energy: n?.['energy-kcal_100g'],
  sugar: n?.sugars_100g,
  salt: n?.salt_100g,
  sodium: n?.sodium_100g,
  satfat: n?.['saturated-fat_100g'],
  fat: n?.fat_100g,
  carbs: n?.carbohydrates_100g,
  fiber: n?.fiber_100g,
  protein: n?.proteins_100g,
});

const nutBasisLabel = p => {
  const per = String(p?.nutPer || '').toLowerCase();
  if (per.includes('100ml') || per === 'ml') return 'Per 100 ml';
  if (!per && /\b(ml|litre|liter|l)\b/i.test(p?.qty || '')) return 'Per 100 ml (check pack)';
  return 'Per 100 g';
};

const validateProduct = p => {
  if (!p || p.src === 'Entered by you') return { status: 'manual', label: 'Entered manually by you', issues: [] };
  const issues = [];
  let ambig = false;
  if (p.reqCode && p.resCode && stripZero(p.reqCode) !== stripZero(p.resCode)) {
    issues.push('Returned barcode (' + p.resCode + ') did not match requested barcode (' + p.reqCode + '). Do not treat this record as verified.');
    ambig = true;
  }
  if (p.hasNullCat) issues.push('Category metadata includes an unfinished "en:null" tag in Open Food Facts.');
  if (p.generic && p.name && !p.name.toLowerCase().includes(p.generic.toLowerCase()) && /[+&]|with\s/i.test(p.name)) {
    issues.push('Multi-part product ("' + p.name + '") carries a single generic name ("' + p.generic + '") in Open Food Facts; verify both components on the physical pack.');
    ambig = true;
  }
  if (/\b[A-Z0-9 ]{2,}\s+INGREDIENTS:/i.test(p.ing || '') && !/[+&]|with\s/i.test(p.name || '')) {
    issues.push('Ingredients text lists multiple sub-product sections; verify it matches this exact pack.');
  }
  const st = p.states || [];
  if (st.includes('en:ingredients-to-be-completed') || !(p.ing || '').trim()) {
    issues.push('Ingredient list is missing or marked incomplete in Open Food Facts.');
  }
  if (st.includes('en:nutrition-facts-to-be-completed') || Object.values(p.n || {}).every(v => v == null || isNaN(v))) {
    issues.push('Nutrition facts are missing or marked incomplete in Open Food Facts.');
  }
  const allList = list(p.all);
  if (allList.length && (p.ing || '').trim()) {
    const missingAll = allList.filter(a => a !== 'gluten' && !(p.ing.toLowerCase().includes(a) || (a === 'nuts' && (p.ing.toLowerCase().includes('hazelnut') || p.ing.toLowerCase().includes('almond') || p.ing.toLowerCase().includes('peanut') || p.ing.toLowerCase().includes('walnut') || p.ing.toLowerCase().includes('cashew')))));
    if (missingAll.length && p.ing.length < 40) {
      issues.push('Declared allergens (' + missingAll.join(', ') + ') do not appear in the short ingredients text — community ingredient entry is likely truncated.');
      ambig = true;
    }
  }
  const status = ambig ? 'ambiguous' : (issues.length ? 'partial' : 'complete');
  const label = status === 'ambiguous' ? 'Ambiguous or incomplete community record' : (status === 'partial' ? 'Partial community record' : 'Community record with core fields');
  return { status, label, issues };
};

const PICS = [
  ['juice', 'cooler', '#fde4e0'], ['popcorn', 'popcorn', '#fff2d6'], ['fruit chaat', 'fruitchaat', '#fde4e0'],
  ['curd', 'yogurt', '#e8eefb'], ['yogurt', 'yogurt', '#e8eefb'], ['besan chilla', 'chilla', '#f6e8d0'],
  ['paneer', 'paneer', '#e4f1e6'], ['idli', 'idli', '#fff2d6'], ['chocolate', 'choc', '#f3e3d6'],
  ['cookie', 'cookie', '#f6e8d0'], ['chip', 'chips', '#fdf1cf'], ['makhana', 'puff', '#fdf1cf'],
  ['chana', 'sprouts', '#f6e8d0'], ['chivda', 'namkeen', '#f6e8d0'], ['namkeen', 'namkeen', '#f6e8d0'],
  ['poha', 'namkeen', '#f6e8d0'], ['date', 'nuts', '#f6e8d0'], ['pops', 'fruit', '#fff2d6'],
  ['fruit', 'fruit', '#fde4e0'], ['sandwich', 'sand', '#e4f1e6'], ['sweet potato', 'fries', '#fde9d2'],
];
const FOOD_IMAGES = window.FOOD_IMAGES || {};
const EXTRA_RECIPE_IMAGES = {
  millet: '/src/assets/images/millet_snack_platter_1795096750249.jpg',
  sprouts: '/src/assets/images/roasted_chana_sprouts_1795096750569.jpg',
  cooler: '/src/assets/images/mint_lemon_cooler_1795096751047.jpg',
  dhokla: '/src/assets/images/dhokla_besan_bites_1795096750930.jpg',
};
const getRecipes = () => Array.isArray(window.RECIPES_50) ? window.RECIPES_50 : [];
const recipeImgSrc = r => EXTRA_RECIPE_IMAGES[r.imgKey] || FOOD_IMAGES[r.imgKey] || EXTRA_RECIPE_IMAGES.millet;

const picHTML = (n) => {
  const l = n.toLowerCase();
  const m = PICS.find(x => l.includes(x[0])) || ['', 'fruit', '#e4f1e6'];
  const key = m[1];
  const src = EXTRA_RECIPE_IMAGES[key] || FOOD_IMAGES[key] || EXTRA_RECIPE_IMAGES.millet;
  return `<div class="pic" style="background:${m[2]}"><img src="${esc(src)}" alt="${esc(n)}" loading="lazy" referrerpolicy="no-referrer" onerror="imgFail(this)"><div class="img-fallback">${PKG_ICON}<span>Snack idea</span></div></div>`;
};

const empty = m => `<div class="empty">${m}</div>`;

const recipeImgHTML = (r) => {
  const src = recipeImgSrc(r);
  return `<div class="recipe-pic"><img loading="lazy" referrerpolicy="no-referrer" alt="${esc(r.n)}" src="${esc(src)}" onerror="imgFail(this)"><div class="img-fallback">${PKG_ICON}<span>Homemade recipe</span></div></div>`;
};

const recipeFlags = r => {
  if (!isParent()) return [];
  const ingClean = stripNegations((r.ing || []).join(' '));
  const allergenClean = stripNegations(r.allergens || '');
  const titleClean = stripNegations(r.n || '');
  const hay = `${titleClean} ${ingClean} ${allergenClean}`.trim();
  return getActiveExclusions().allExclusions.filter(w => hay.includes(w));
};

const isRecipeSaved = id => S.savedRecipes.includes(id);
window.toggleSaveRecipe = (id, btn) => {
  const idx = S.savedRecipes.indexOf(id);
  if (idx >= 0) {
    S.savedRecipes.splice(idx, 1);
    if (btn) btn.textContent = 'Save recipe';
    toast('Removed recipe');
  } else {
    S.savedRecipes.push(id);
    if (btn) btn.textContent = 'Saved';
    toast('Saved recipe to Saved Choices');
    trackUse();
  }
  save();
};

const isPlaceSaved = id => S.savedPlaces.some(x => x.id === id);
window.toggleSavePlace = (placeObj, btn) => {
  if (!placeObj || !placeObj.id) return;
  const idx = S.savedPlaces.findIndex(x => x.id === placeObj.id);
  if (idx >= 0) {
    S.savedPlaces.splice(idx, 1);
    if (btn) btn.textContent = 'Save place';
    toast('Removed local place');
  } else {
    S.savedPlaces.unshift(placeObj);
    if (btn) btn.textContent = 'Saved';
    toast('Saved local place to Saved Choices');
    trackUse();
  }
  save();
};

window.closeDetailModal = () => { const el = $('#detailBackdrop'); if (el) el.remove(); };
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeDetailModal();
    if (document.getElementById('reviewBackdrop')) closeReview();
  }
});

window.openRecipe = id => {
  const r = getRecipes().find(x => x.id === id);
  if (!r) return;
  closeDetailModal();
  const f = recipeFlags(r), saved = isRecipeSaved(r.id);
  const w = document.createElement('div');
  w.id = 'detailBackdrop';
  w.className = 'detail-backdrop';
  w.onclick = e => { if (e.target === w) closeDetailModal(); };
  w.innerHTML = `<div class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="recTitle">
    <div class="detail-modal-head">
      <div>
        <div class="meta-line" style="margin-bottom:.3rem"><span>${esc(r.cat)}</span><span aria-hidden="true">·</span><span>${esc(r.t)}</span><span aria-hidden="true">·</span><span class="num">${esc(r.prep)}</span></div>
        <h2 id="recTitle" style="margin:0">${esc(r.n)}</h2>
      </div>
      <button type="button" class="btn s l" onclick="closeDetailModal()" aria-label="Close recipe">Close</button>
    </div>
    <div class="detail-hero-img"><img src="${esc(recipeImgSrc(r))}" alt="${esc(r.n)}" referrerpolicy="no-referrer" onerror="this.style.display='none'"></div>
    ${r.swapFor ? `<div class="swap-box"><b>Homemade alternative for:</b> ${esc(r.swapFor)} <span class="mut">· Budget: ${esc(r.budget || 'budget')}</span></div>` : ''}
    <div class="meta-line" style="margin:.4rem 0">${esc((r.diet || []).join(' · '))}</div>
    <p style="margin:.6rem 0"><b>Allergen &amp; dietary note:</b> ${esc(r.allergens)}</p>
    ${f.length ? `<div class="alert-inline warn"><b>Parent Profile Check:</b> Standard ingredients or allergen notes reference <b>${esc(f.join(', '))}</b>. Check the substitution tip below and verify every home ingredient.</div>` : ''}
    <div class="detail-cols">
      <div class="detail-pane"><h3>Measured Ingredients</h3><ul class="detail-list">${(r.ing || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>
      <div class="detail-pane"><h3>Step-by-Step Instructions</h3><ol class="detail-list">${(r.steps || []).map(st => `<li>${esc(st)}</li>`).join('')}</ol></div>
    </div>
    <div class="val-box"><b>Ingredient Substitutions:</b> ${esc(r.subs)}</div>
    <div class="snack-actions" style="margin-top:1rem">
      <button type="button" class="btn s" onclick="toggleSaveRecipe('${esc(r.id)}',this)">${saved ? 'Saved' : 'Save recipe'}</button>
      ${slotSel(r.n)}
      <a class="btn s l" href="#healthy" onclick="closeDetailModal()">Healthy Discovery</a>
      <a class="btn s l" href="#local" onclick="closeDetailModal()">Find ingredients near you</a>
    </div>
    <p class="mut safety-hint">Homemade recipe guidance is informational only and does not claim medical suitability. Verify individual ingredient labels for allergens and follow your doctor or dietitian's advice.</p>
  </div>`;
  document.body.appendChild(w);
};

/* ===== VIEWS ===== */
const V = {}, INIT = {};

const getPersonalSuggestions = () => {
  const p = S.profile || {};
  const likes = list(p.likes);
  const { allExclusions, avoidWords, allergyExclusions } = getActiveExclusions();
  const out = [];
  for (const s of SNACKS) {
    const ingTxt = stripNegations((s.i || []).join(' ') + ' ' + s.n);
    const matchedExcl = allExclusions.filter(w => ingTxt.includes(w));
    if (matchedExcl.length) continue;
    const hay = [s.n, s.d, s.t, ...s.x, ...s.i].join(' ').toLowerCase();
    const matchedLikes = likes.filter(l => hay.includes(l));
    if (likes.length && !matchedLikes.length) continue;
    const reasons = [];
    if (matchedLikes.length) reasons.push('Matches preference: ' + matchedLikes.join(', '));
    else reasons.push('General ' + s.t + ' (' + s.x.join(', ') + ') option');
    if (avoidWords.length) reasons.push('None of your checked words (' + avoidWords.join(', ') + ') in typical ingredients');
    if (allergyExclusions.length) reasons.push('Excludes recorded allergy triggers in typical ingredients');
    out.push({ s, why: reasons.join(' · ') });
  }
  return out.slice(0, 4);
};

const getPersonalRecipes = () => {
  const p = S.profile || {};
  const likes = list(p.likes);
  const { allExclusions, avoidWords, allergyExclusions } = getActiveExclusions();
  const out = [];
  for (const r of getRecipes()) {
    const hayExcl = `${stripNegations(r.n)} ${stripNegations((r.ing || []).join(' '))} ${stripNegations(r.allergens || '')}`;
    if (allExclusions.some(w => hayExcl.includes(w))) continue;
    const hay = [r.n, r.cat, r.t, r.swapFor || '', ...(r.focus || []), ...(r.ing || [])].join(' ').toLowerCase();
    const matchedLikes = likes.filter(l => hay.includes(l));
    if (likes.length && !matchedLikes.length) continue;
    const why = [];
    if (matchedLikes.length) why.push('Matches taste/texture: ' + matchedLikes.join(', '));
    else why.push(r.cat + ' · ' + r.prep);
    if (avoidWords.length || allergyExclusions.length) why.push('No recorded checked words in standard ingredients');
    out.push({ r, why: why.join(' · ') });
  }
  return out.slice(0, 3);
};

const renderParentHome = () => {
  const p = S.profile || {};
  const hasProf = hasProfData(p);
  const { avoidWords, allergyExclusions, conditions } = getActiveExclusions();
  const ageLabel = { '1-3': '1 to 3 years', '4-7': '4 to 7 years', '8-12': '8 to 12 years', '13-16': '13 to 16 years' }[p.who || '4-7'] || '4 to 7 years';
  if (!hasProf) {
    return `<section class="dash-hero">
      <div class="dash-top">
        <div>
          <span class="kicker-text">Parent Profile Mode · Local browser storage</span>
          <h1 style="font-size:clamp(1.85rem,3.6vw,2.65rem);margin:.45rem 0">Personalise SnackWise for your child</h1>
          <p class="mut" style="max-width:60ch">No child profile is saved yet. Add your child's age group, dietary context, favourite textures, or ingredients to watch so SnackWise can highlight relevant label details across searches and recipes.</p>
        </div>
      </div>
      <div class="hero-actions">
        <a class="btn" href="#profile">Create child profile</a>
        <button class="btn l" type="button" onclick="setMode('guest')">Switch to Guest Mode</button>
        <a class="btn l" href="#healthy">Healthy Snack Discovery</a>
      </div>
    </section>
    <div class="quick-tools">
      <div class="quick-search">
        <input id="hq" placeholder="Search packaged products by name or barcode (e.g. Lay's, Oreo, 8901058851243)" onkeydown="if(event.key==='Enter')homeSearch()">
        <button class="btn s" type="button" onclick="homeSearch()">Search</button>
      </div>
      <div class="quick-links"><a href="#healthy">Healthy Discovery</a><a href="#local">Near You</a><a href="#recipes">${getRecipes().length} Recipes</a><a href="#scan">Scan Barcode</a></div>
    </div>
    <div class="grid home-tools">${[
      ['profile', 'Set Up Child Profile', 'Record age group, preferences and ingredient words to check locally.'],
      ['healthy', 'Healthy Snack Discovery', 'Filter roasted, millet, fruit, lower-sugar and homemade options transparently.'],
      ['local', 'Find Healthy Food Near You', 'Discover nearby organic stores, produce shops and homemade snack sellers.'],
      ['recipes', 'Recipe Studio (' + getRecipes().length + ' Recipes)', 'Complete measured Indian snacks, lunchbox bites and homemade packaged swaps.'],
      ['scan', 'Product Check & Labels', 'Search Open Food Facts products, inspect nutrition panels and view alternatives.'],
      ['planner', 'Picnic & Week Planner', 'Organise snacks for school picnics and weekly lunchboxes.'],
    ].map((c, idx) => `<a class="card tile" href="#${c[0]}"><span class="step-num">0${idx + 1}</span><h3>${c[1]}</h3><span class="mut">${c[2]}</span></a>`).join('')}</div>`;
  }

  const suggestions = getPersonalSuggestions();
  const recSuggestions = getPersonalRecipes();
  const savedProds = S.savedProdIds.map(id => S.products.find(x => x.id === id)).filter(Boolean);
  const recentProds = S.products.slice(0, 4);
  const likesList = list(p.likes);
  const condText = [...conditions, p.other].filter(Boolean).join(', ');
  return `<section class="dash-hero">
    <div class="dash-top">
      <div>
        <div class="meta-line" style="margin-bottom:.35rem"><span>Parent Profile Active</span><span aria-hidden="true">·</span><span>Saved locally in this browser only</span></div>
        <h1 style="font-size:clamp(1.85rem,3.5vw,2.55rem);margin:0 0 .35rem">${p.name ? esc(p.name) + '\'s Snack Dashboard' : 'Parent Snack Dashboard'}</h1>
        <p class="mut" style="margin:0;max-width:62ch">Tailored around your recorded preferences and ingredient checks across Healthy Discovery, Recipes, and Label Checks. Always verify physical product labels before serving.</p>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap"><a class="btn s" href="#profile">Edit profile</a><button class="btn s l" type="button" onclick="setMode('guest')">Guest Mode</button></div>
    </div>
    <div class="dash-summary">
      <div class="dash-stat"><div class="dash-k">Age Group</div><div class="dash-v">${esc(ageLabel)}</div></div>
      <div class="dash-stat"><div class="dash-k">Dietary Context</div><div class="dash-v">${condText ? esc(condText) : '<span class="mut">None selected</span>'}</div></div>
      <div class="dash-stat"><div class="dash-k">Saved Tastes &amp; Textures</div><div class="dash-v">${p.likes ? esc(p.likes) : '<span class="mut">Not specified</span>'}</div></div>
      <div class="dash-stat"><div class="dash-k">Ingredients Highlighted</div><div class="dash-v">${avoidWords.length ? esc(avoidWords.join(', ')) : '<span class="mut">None listed</span>'}</div></div>
    </div>
    ${p.instr ? `<div class="note" style="margin:.95rem 0 0"><b>Recorded doctor / dietitian note:</b> ${esc(p.instr)} <span class="mut">(Shown as entered; SnackWise does not clinically validate foods.)</span></div>` : ''}
  </section>
  <div class="quick-tools">
    <div class="quick-search">
      <input id="hq" placeholder="Check a packaged product for ${p.name ? esc(p.name) : 'your child'} (e.g. Lay's, Oreo, barcode)" onkeydown="if(event.key==='Enter')homeSearch()">
      <button class="btn s" type="button" onclick="homeSearch()">Search</button>
    </div>
    <div class="quick-links"><a href="#healthy">Healthy Discovery</a><a href="#local">Near You</a><a href="#recipes">${getRecipes().length} Recipes</a><a href="#scan">Scan</a><a href="#compare">Compare</a><a href="#planner">Planner</a></div>
  </div>
  <div class="home-intro">
    <div><h2>Personalised snack &amp; recipe suggestions</h2><p class="mut">Filtered using ${p.name ? esc(p.name) + '\'s' : 'your'} recorded preferences${(avoidWords.length || allergyExclusions.length) ? ' while excluding checked words and recorded allergy ingredients' : ''}.</p></div>
    <div style="display:flex;gap:.45rem;flex-wrap:wrap"><a class="btn s l" href="#healthy">Healthy Discovery</a><a class="btn s l" href="#recipes">Recipe Studio</a></div>
  </div>
  ${suggestions.length ? `<div class="grid">${suggestions.map(o => snackCard(o.s.n, o.s.d, [o.s.pk ? 'Packaged idea' : 'Homemade idea', o.s.t, ...o.s.x], o.s.i, o.why)).join('')}</div>` : `<div class="note">No built-in snack ideas matched all recorded preferences (${esc(likesList.join(', ') || 'none')}) without conflicting with checked words (${esc([...avoidWords, ...allergyExclusions].join(', '))}). Try <a href="#healthy">Healthy Discovery</a> or <a href="#scan">Search &amp; Scan</a>.</div>`}
  ${recSuggestions.length ? `<div class="split-head"><h3>Homemade recipes matched to profile</h3><a class="btn s l" href="#recipes">See all ${getRecipes().length} recipes</a></div><div class="grid">${recSuggestions.map(({ r, why }) => `<article class="card snack-card">${recipeImgHTML(r)}<div class="meta-line" style="margin-bottom:.25rem">${esc(r.cat)} · ${esc(r.prep)}</div><h3>${esc(r.n)}</h3><p class="mut" style="font-size:.86rem;margin:0 0 .45rem"><b>Why suggested:</b> ${esc(why)}</p><div class="meta-line" style="margin-bottom:.5rem">${esc((r.diet || []).slice(0, 3).join(' · '))}</div><div class="snack-actions"><button type="button" class="btn s" onclick="openRecipe('${esc(r.id)}')">View recipe</button><button type="button" class="btn s l" onclick="toggleSaveRecipe('${esc(r.id)}',this)">${isRecipeSaved(r.id) ? 'Saved' : 'Save recipe'}</button></div></article>`).join('')}</div>` : ''}
  <div class="dash-cols">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.75rem"><h3 style="margin:0">Recent Product Checks</h3><a class="btn s l" href="#scan">Check product</a></div>
      ${recentProds.length ? recentProds.map(pr => {
        const f = flags(pr.ing + ' ' + pr.all, pr.name);
        const thumb = pickSafeImage(pr.imgSmall || pr.img, pr.code);
        return `<div class="dash-list-item"><div class="dash-mini-img">${thumb ? `<img src="${esc(thumb)}" alt="${esc(pr.name)}" referrerpolicy="no-referrer" onerror="imgFail(this)">` : PKG_ICON}</div><div style="flex:1;min-width:0"><div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(pr.name)}</div><div class="meta-line"><span>${esc(pr.brand || 'Brand unlisted')}</span>${pr.qty ? `<span>· ${esc(pr.qty)}</span>` : ''}${f.length ? `<span class="alert-text">· Flagged: ${esc(f.join(', '))}</span>` : ''}</div></div><button class="btn s l" type="button" onclick="viewProd('${esc(pr.id)}')">Inspect</button></div>`;
      }).join('') : `<p class="mut">No products checked yet. Search or scan a barcode to see label checks here.</p>`}
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.75rem"><h3 style="margin:0">Saved Choices, Recipes &amp; Places</h3><a class="btn s l" href="#saved">View all</a></div>
      ${(savedProds.length || S.snacks.length || S.savedRecipes.length || S.savedPlaces.length) ? `${savedProds.slice(0, 2).map(pr => {
        const thumb = pickSafeImage(pr.imgSmall || pr.img, pr.code);
        return `<div class="dash-list-item"><div class="dash-mini-img">${thumb ? `<img src="${esc(thumb)}" alt="${esc(pr.name)}" referrerpolicy="no-referrer" onerror="imgFail(this)">` : PKG_ICON}</div><div style="flex:1;min-width:0"><div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(pr.name)}</div><div class="meta-line"><span>Saved product</span>${pr.qty ? `<span>· ${esc(pr.qty)}</span>` : ''}</div></div><button class="btn s l" type="button" onclick="viewProd('${esc(pr.id)}')">Open</button></div>`;
      }).join('')}${S.savedRecipes.slice(0, 2).map(rid => {
        const rc = getRecipes().find(x => x.id === rid);
        return rc ? `<div class="dash-list-item"><div style="flex:1;min-width:0"><b>${esc(rc.n)}</b><div class="meta-line"><span>Saved recipe</span><span>· ${esc(rc.prep)}</span></div></div><button class="btn s l" type="button" onclick="openRecipe('${esc(rc.id)}')">Open</button></div>` : '';
      }).join('')}${S.savedPlaces.slice(0, 2).map(pl => `<div class="dash-list-item"><div style="flex:1;min-width:0"><b>${esc(pl.name)}</b><div class="meta-line"><span>Saved local place</span></div></div><a class="btn s l" href="#local">Finder</a></div>`).join('')}${S.snacks.slice(0, 2).map(sn => `<div class="dash-list-item"><div style="flex:1;min-width:0"><b>${esc(sn)}</b><div class="meta-line"><span>Saved snack idea</span></div></div><a class="btn s l" href="#planner">Plan</a></div>`).join('')}` : `<p class="mut">Nothing saved yet. Save products, recipes from Recipe Studio, or local places near you.</p>`}
    </div>
  </div>`;
};

const HERO_VISUAL_PART = `<div class="hero-visual">
  <div class="hero-photo main"><img src="/src/assets/images/millet_snack_platter_1795096750249.jpg" alt="Roasted makhana, millet crisps and wholesome Indian snacks" referrerpolicy="no-referrer" onerror="imgFail(this)"></div>
  <div class="hero-photo small"><img src="/src/assets/images/dhokla_besan_bites_1795096750930.jpg" alt="Steamed besan dhokla bites with fresh herbs" referrerpolicy="no-referrer" onerror="imgFail(this)"></div>
  <div class="hero-photo small"><img src="/src/assets/images/mint_lemon_cooler_1795096751047.jpg" alt="Fresh mint lemon cooler with basil seeds" referrerpolicy="no-referrer" onerror="imgFail(this)"></div>
</div>`;

V.home = () => {
  if (isParent()) return renderParentHome();
  return `<section class="hero">
    <div class="hero-copy">
      <span class="kicker-text">Health-oriented food discovery &amp; decision support</span>
      <h1>Understand your food. Choose with confidence.</h1>
      <p>Discover healthier snacks for children ages 1–16 and adults, inspect real packaged food labels side by side, cook ${getRecipes().length} complete Indian &amp; lunchbox recipes, and find local healthy food stores near you.</p>
      <div class="hero-actions">
        <a class="btn" href="#healthy">Explore Healthy Snacks</a>
        <a class="btn l" href="#scan">Search &amp; Scan Label</a>
      </div>
      <div class="hero-points">
        <span>Open Food Facts label checks</span>
        <span aria-hidden="true">·</span>
        <span>${getRecipes().length} complete recipes</span>
        <span aria-hidden="true">·</span>
        <span>Local healthy directory</span>
      </div>
    </div>
    ${HERO_VISUAL_PART}
  </section>

  <div class="quick-tools">
    <div class="quick-search">
      <input id="hq" placeholder="Search packaged products by name or barcode (e.g. Lay's, Oreo, 8901058851243)" onkeydown="if(event.key==='Enter')homeSearch()">
      <button class="btn s" type="button" onclick="homeSearch()">Search</button>
    </div>
    <div class="quick-links">
      <button type="button" class="link-btn" onclick="$('#hq').value='Makhana';homeSearch()">Try Makhana</button>
      <button type="button" class="link-btn" onclick="$('#hq').value='8901058851243';homeSearch()">Sample Barcode</button>
      <a href="#local">Near You</a>
      <a href="#recipes">${getRecipes().length} Recipes</a>
    </div>
  </div>

  <div class="home-intro">
    <div><h2>Everything you need to evaluate snacks</h2><p class="mut">Browse freely in Guest Mode or switch to Parent Profile for personalised ingredient alerts saved locally in your browser.</p></div>
    <button type="button" class="btn s l" onclick="setMode('parent','profile')">Set up Parent Profile</button>
  </div>

  <div class="bento-grid">
    <a class="card tile bento-wide" href="#healthy">
      <span class="step-num">01 · Core Discovery</span>
      <h3>Healthy Snack Discovery</h3>
      <p class="mut">Filter roasted, millet, fruit, high-fibre, lower-sugar and lower-sodium options with transparent nutrient reasons—no arbitrary health scores or marketing hype.</p>
      <span class="tile-cta">Browse healthy filters →</span>
    </a>
    <a class="card tile" href="#scan">
      <span class="step-num">02 · Label Check</span>
      <h3>Search &amp; Scan Products</h3>
      <p class="mut">Look up packaged items by name or camera barcode, inspect ingredients and allergens, and explore better alternatives.</p>
      <span class="tile-cta">Check a label →</span>
    </a>
    <a class="card tile" href="#recipes">
      <span class="step-num">03 · Kitchen Studio</span>
      <h3>${getRecipes().length} Complete Recipes</h3>
      <p class="mut">Measured Indian snacks, school picnic boxes and homemade swaps for chips, biscuits and fizzy drinks.</p>
      <span class="tile-cta">Open Recipe Studio →</span>
    </a>
    <a class="card tile" href="#compare">
      <span class="step-num">04 · Side-by-Side</span>
      <h3>Compare Food Labels</h3>
      <p class="mut">Compare sugars, salt, sodium, fibre, saturated fat, protein, pack size and ingredients per 100g or 100ml.</p>
      <span class="tile-cta">Compare products →</span>
    </a>
    <a class="card tile" href="#local">
      <span class="step-num">05 · Local Directory</span>
      <h3>Find Healthy Food Near You</h3>
      <p class="mut">Search Indian cities, PIN codes or your location for organic shops, fresh produce markets and community sellers.</p>
      <span class="tile-cta">Search nearby →</span>
    </a>
    <a class="card tile" href="#planner">
      <span class="step-num">06 · Weekly Routine</span>
      <h3>Picnic &amp; Lunchbox Planner</h3>
      <p class="mut">Organise snack ideas and homemade recipes across school picnics, lunchboxes and weekdays.</p>
      <span class="tile-cta">Open planner →</span>
    </a>
  </div>

  <div class="home-promo">
    <div>
      <h3>School picnic or lunchbox coming up?</h3>
      <p>Start with snacks your child already enjoys and discover familiar look-alike textures, homemade recipes, and local stores.</p>
    </div>
    <div style="display:flex;gap:.55rem;flex-wrap:wrap">
      <a class="btn" href="#similar">Look-Alike Finder</a>
      <button class="btn l" type="button" onclick="catGo('occ','picnic')">Picnic ideas</button>
    </div>
  </div>

  <div class="home-paths">
    <a class="path-card tile" href="#similar">
      <span class="step-num">Swaps</span>
      <div><h3>Snack Look-Alike Finder</h3><p class="mut">Start with potato chips, chocolate biscuits, namkeen or soda and explore similar crunch or sweetness.</p></div>
    </a>
    <a class="path-card tile" href="#discover">
      <span class="step-num">Explore</span>
      <div><h3>Discover by Taste &amp; Texture</h3><p class="mut">Filter quick snack ideas by crunch, juiciness, effort and ingredients already in your kitchen.</p></div>
    </a>
  </div>

  <div class="methodology">
    <h2>How SnackWise supports your decisions</h2>
    <div class="method-grid">
      <div class="method-item"><span class="step-num">01</span><h3>Evidence over marketing</h3><p class="mut">Claims like “natural”, “organic”, or “high-protein” are cross-checked against listed sugars, sodium, oils and ingredients.</p></div>
      <div class="method-item"><span class="step-num">02</span><h3>Honest missing-data handling</h3><p class="mut">Missing nutrition or ingredient fields are flagged explicitly rather than assumed safe or filled with invented numbers.</p></div>
      <div class="method-item"><span class="step-num">03</span><h3>Not medical verification</h3><p class="mut">SnackWise highlights words you want to watch locally; always verify physical package labels and follow clinical advice.</p></div>
    </div>
  </div>`;
};

/* --- Profile / Mode --- */
V.profile = () => {
  const p = S.profile;
  const conditions = ['Diabetes', 'Lactose intolerance', 'Gluten intolerance / coeliac disease', 'Peanut allergy', 'Other food allergy', 'Heart-related dietary restriction', 'Other dietary requirement'];
  const quickWords = ['peanut', 'milk', 'wheat', 'soy', 'egg', 'sesame', 'palm oil', 'sugar', 'monosodium'];
  return `<div class="page-head">
    <div><h2>${isParent() ? 'Parent Profile' : 'Guest Mode &amp; Parent Profile'}</h2><p class="mut">All profile details are saved locally in this browser only and are never sent to a public database.</p></div>
    <span class="status-text">${isParent() ? 'Parent Profile active' : 'Guest Mode active'}</span>
  </div>
  <div class="card g" style="margin-bottom:1.1rem">
    <div class="row" style="justify-content:space-between;align-items:center">
      <div>
        <h3 style="margin-bottom:.25rem">Choose how you want to use SnackWise</h3>
        <p class="mut" style="margin:0">${isParent() ? 'Parent Profile highlights words you asked to check across snack ideas, product lookups, recipes and comparisons.' : 'Guest Mode lets you browse, search, scan, compare and explore snacks without creating or applying a child profile.'}</p>
      </div>
      <div class="mode-switch" role="group" aria-label="Switch mode">
        <button type="button" id="modeGuest" class="mode-opt ${!isParent() ? 'on' : ''}" onclick="setMode('guest')">Guest Mode</button>
        <button type="button" id="modeParent" class="mode-opt ${isParent() ? 'on' : ''}" onclick="setMode('parent')">Parent Profile</button>
      </div>
    </div>
  </div>
  ${!isParent() ? `<div class="card">
    <h3>You are browsing in Guest Mode</h3>
    <p class="mut">No child profile or personal dietary flags are active right now. You can freely discover snack ideas, search or scan Open Food Facts products, compare labels, and build a snack plan.</p>
    ${hasProfData(p) ? `<p class="note">A local Parent Profile${p.name ? ' for <b>' + esc(p.name) + '</b>' : ''} is saved on this browser. Switch to Parent Profile to view, edit or apply it.</p>` : ''}
    <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem">
      <button type="button" class="btn" onclick="setMode('parent')">${hasProfData(p) ? 'Switch to Parent Profile' : 'Create a Parent Profile'}</button>
      <a class="btn l" href="#healthy">Continue browsing as Guest</a>
    </div>
  </div>`
  : `<div class="card">
    <h3>Child Dietary &amp; Preference Profile</h3>
    <div class="row">
      <div><label for="pn">Your child's first name (optional)</label><input id="pn" style="width:100%" value="${esc(p.name)}" placeholder="e.g. Aarav"></div>
      <div><label for="pf">Age group</label><select id="pf"><option value="1-3">1 to 3 years</option><option value="4-7">4 to 7 years</option><option value="8-12">8 to 12 years</option><option value="13-16">13 to 16 years</option></select></div>
    </div>
    <label>Dietary conditions or restrictions (select all that apply)</label>
    <div class="condition-options">${conditions.map(c => `<label class="condition-option"><input type="checkbox" name="condition" value="${esc(c)}" ${(p.conditions || []).includes(c) ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div>
    <label for="pother">Other condition or dietary context (optional)</label>
    <input id="pother" style="width:100%" value="${esc(p.other || '')}" placeholder="Enter another dietary requirement">
    <label for="pi">Dietary instructions from your doctor or dietitian (optional)</label>
    <textarea id="pi" placeholder="Enter the instructions provided by your child's healthcare professional">${esc(p.instr)}</textarea>
    <label for="pa">Ingredients or words to check (comma separated)</label>
    <input id="pa" style="width:100%" value="${esc(p.avoid)}" placeholder="e.g. peanut, milk, wheat, sugar">
    <div class="quick-chips" style="margin-top:.45rem"><span class="mut" style="font-size:.82rem">Quick add:</span> ${quickWords.map(w => `<button type="button" class="seg-btn" onclick="addAvoidChip('${w}')">+ ${w}</button>`).join('')}</div>
    <label for="pt">Favourite tastes and textures</label>
    <input id="pt" style="width:100%" value="${esc(p.likes)}" placeholder="e.g. crunchy, spicy, chocolatey, millet">
    <p id="profErr" class="err-line" hidden></p>
    <div class="note"><b>Important:</b> Condition selections record dietary context locally; they do not generate medically approved meal plans or confirm that a food is safe. Snack ideas and product data are not clinically validated. Always verify the physical package label and follow professional healthcare guidance.</div>
    <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;margin-top:.85rem">
      <button type="button" class="btn" onclick="saveProfile()">Save profile</button>
      <button type="button" class="btn l" onclick="setMode('guest')">Switch to Guest Mode</button>
      <button type="button" id="clrProfBtn" class="btn s danger" onclick="clearProfile()">Clear local profile</button>
    </div>
  </div>`}`;
};

INIT.profile = () => {
  if (isParent() && $('#pf')) {
    const w = S.profile.who;
    $('#pf').value = ['1-3', '4-7', '8-12', '13-16'].includes(w) ? w : '4-7';
  }
};

window.addAvoidChip = w => {
  const el = $('#pa');
  if (!el) return;
  const cur = list(el.value);
  if (!cur.includes(w)) cur.push(w);
  el.value = cur.join(', ');
};

window.saveProfile = () => {
  const name = ($('#pn')?.value || '').trim();
  const who = $('#pf')?.value || '4-7';
  const conditions = [...document.querySelectorAll('input[name=condition]:checked')].map(x => x.value);
  const other = ($('#pother')?.value || '').trim();
  const instr = ($('#pi')?.value || '').trim();
  const avoid = [...new Set(list($('#pa')?.value || ''))].join(', ');
  const likes = [...new Set(list($('#pt')?.value || ''))].join(', ');
  const errEl = $('#profErr');
  if (!name && !conditions.length && !other && !instr && !avoid && !likes) {
    if (errEl) {
      errEl.textContent = 'Enter at least one preference, ingredient to check, condition, or child name before saving.';
      errEl.hidden = false;
    }
    return;
  }
  if (errEl) errEl.hidden = true;
  S.mode = 'parent';
  S.profile = { name, who, conditions, other, instr, avoid, likes };
  save();
  updateModeUI();
  toast('Profile saved locally');
  trackUse();
  render();
};

let clrStep = false;
window.clearProfile = () => {
  const b = $('#clrProfBtn');
  if (!clrStep) {
    clrStep = true;
    if (b) b.textContent = 'Click again to confirm clear';
    setTimeout(() => { clrStep = false; if ($('#clrProfBtn')) $('#clrProfBtn').textContent = 'Clear local profile'; }, 3500);
    return;
  }
  clrStep = false;
  S.profile = {};
  save();
  updateModeUI();
  render();
  toast('Local profile cleared');
};

/* --- Discover --- */
let D = { taste: '', tex: '', occ: '', eff: '', kind: '', ing: '' };
V.discover = () => {
  const sel = (id, l, o) => `<div><label for="${id}">${l}</label><select id="${id}" onchange="upD()"><option value="">Any</option>${o.map(x => `<option>${x}</option>`).join('')}</select></div>`;
  return `<div class="page-head">
    <div><h2>Discover by Taste &amp; Texture</h2><p class="mut section-intro" style="margin-bottom:0">No product name needed. Choose a taste, texture or occasion and explore snack ideas.</p></div>
    <span class="status-text">${isParent() ? 'Parent Profile' : 'Guest Mode'}</span>
  </div>
  ${isParent() && ((S.profile.conditions || []).length || S.profile.other) ? `<div class="note"><b>Profile context:</b> ${esc([...(S.profile.conditions || []), S.profile.other].filter(Boolean).join(', '))}. Saved instructions and ingredient words are for reference; these suggestions are not medically screened or confirmed safe.</div>` : ''}
  <div class="card g">
    <div class="row">${sel('dt', 'Taste', ['sweet', 'savoury'])}${sel('dx', 'Texture', ['crunchy', 'soft', 'chewy', 'creamy', 'juicy', 'light'])}${sel('do', 'Occasion', ['picnic', 'lunchbox', 'everyday'])}${sel('de', 'Effort', ['none', 'quick', 'cook'])}${sel('dk', 'Type', ['packaged', 'homemade'])}</div>
    <div class="row" style="margin-top:.2rem">
      <div style="flex:2"><label for="di">Ingredients you have at home (optional)</label><input id="di" style="width:100%" placeholder="e.g. banana, oats, curd" oninput="upD()" value="${esc(D.ing)}"></div>
      <div style="flex:0 0 auto"><button type="button" class="btn s l" onclick="resetD()">Reset filters</button></div>
    </div>
  </div>
  <p class="mut">Explore options such as ragi or millet chips, dark chocolate and fruit juices. These are not automatically healthy or suitable for every child: compare the full label, serving size, added sugars, salt and fats, and follow individual professional guidance.</p>
  <div id="res" class="grid" style="margin-top:1rem"></div>`;
};
INIT.discover = () => { ['dt', 'dx', 'do', 'de', 'dk'].forEach((id, k) => $('#' + id).value = D[['taste', 'tex', 'occ', 'eff', 'kind'][k]] || ''); upD(); };
window.resetD = () => { D = { taste: '', tex: '', occ: '', eff: '', kind: '', ing: '' }; INIT.discover(); };
window.upD = () => {
  D = { taste: $('#dt').value, tex: $('#dx').value, occ: $('#do').value, eff: $('#de').value, kind: $('#dk').value, ing: $('#di').value };
  const have = list(D.ing);
  const r = SNACKS.filter(s => (!D.taste || s.t === D.taste) && (!D.tex || s.x.includes(D.tex)) && (!D.occ || s.o.includes(D.occ)) && (!D.eff || s.e === D.eff) && (!D.kind || (D.kind === 'packaged') === !!s.pk))
    .map(s => ({ s, m: have.filter(h => s.i.some(i => i.includes(h) || h.includes(i))).length }))
    .filter(o => !have.length || o.m > 0)
    .sort((a, b) => b.m - a.m);
  $('#res').innerHTML = r.length ? r.map(o => snackCard(o.s.n, o.s.d, [o.s.pk ? 'Packaged idea' : 'Homemade idea', o.s.t, ...o.s.x], o.s.i)).join('') : empty('No ideas match all those filters. Try changing one filter to Any or resetting filters.');
};

/* --- Look-alike --- */
V.similar = () => `<div class="page-head">
  <div><h2>Snack Look-Alike Finder</h2><p class="mut section-intro" style="margin-bottom:0">Type a snack your child enjoys—such as potato chips, chocolate biscuits, cream biscuits or namkeen—to explore options with a similar format, taste or texture.</p></div>
  <span class="status-text">${isParent() ? 'Parent Profile' : 'Guest Mode'}</span>
</div>
<div class="card g">
  <div class="row"><div><input id="sq" style="width:100%" placeholder="e.g. potato chips, chocolate biscuits, soda" onkeydown="if(event.key==='Enter')look()"></div><button class="btn" onclick="look()">Find alternatives</button></div>
  <div class="quick-chips" style="margin-top:.7rem"><span class="mut" style="font-size:.84rem">Quick examples:</span> ${['Potato chips', 'Chocolate biscuits', 'Cream biscuits', 'Namkeen', 'Popcorn', 'Soda'].map(x => `<button type="button" class="seg-btn" onclick="$('#sq').value='${x}';look()">${x}</button>`).join(' ')}</div>
</div>
<div id="lr" style="margin-top:1rem"></div>`;

window.look = () => {
  const q = $('#sq').value.trim().toLowerCase();
  if (!q) { $('#lr').innerHTML = empty('Type a snack name first.'); return; }
  trackUse();
  const g = LOOK.find(g => g.k.some(k => q.includes(k)));
  $('#lr').innerHTML = g
    ? `<p>Similar sensory feel: <b>${esc(g.f)}</b></p><div class="grid">${g.a.map(a => snackCard(a[0], a[1], [a[2]])).join('')}</div><p class="note">Similar taste or texture does not mean similar nutrition or medical suitability. Packaged brands vary, and the ideas shown here are not medically screened. <a href="#scan">Search or scan the pack</a>, verify the physical label, and follow your child's professional guidance.</p>`
    : empty('We do not have a match for "' + esc(q) + '" yet. Try <a href="#discover">Discover</a> and pick the texture you want, or <a href="#scan">search or scan the product</a>.');
};

/* --- Scan, Product Search, Validation & Alternatives --- */
let stream, timer, h5, pendingSearch = '', activeProdId = null;
const ALT_CACHE = {};

V.scan = () => `<div class="page-head">
  <div><h2>Search &amp; Scan Food Products</h2><p class="mut" style="margin-bottom:0">Search Open Food Facts by product name, type a barcode, or scan a pack with your camera. Product names, packaging photos, ingredients, allergens and nutrition come strictly from each individual Open Food Facts record and are not medically verified.</p></div>
  <span class="status-text">${isParent() ? 'Parent Profile' : 'Guest Mode'}</span>
</div>
<div class="card g" style="margin-bottom:1.1rem">
  <h3>Search by product name</h3>
  <p class="mut" style="margin:.2rem 0 .7rem">Find packaged products with packaging photos, then click any result to inspect ingredients, label analysis and alternatives.</p>
  <div class="row"><div><input id="pq" placeholder="e.g. Lay's, Oreo, Makhana, millet chips" onkeydown="if(event.key==='Enter')searchProducts($('#pq').value)"></div><button class="btn" type="button" onclick="searchProducts($('#pq').value)">Search products</button></div>
  <div class="quick-chips" style="margin-top:.7rem">
    <span class="mut" style="font-size:.84rem">Quick search:</span>
    ${['Roasted makhana', 'Oreo', "Lay's", 'Ragi chips'].map(q => `<button type="button" class="seg-btn" onclick="$('#pq').value=&quot;${q}&quot;;searchProducts(&quot;${q}&quot;)">${q}</button>`).join('')}
  </div>
  <div id="sr" style="margin-top:1rem"></div>
</div>
<div class="scan-grid">
  <div class="card">
    <h3>Camera barcode scan</h3>
    <p class="mut" style="margin-top:0">Point your device camera at an EAN/UPC barcode on a food packet.</p>
    <video id="vid" playsinline muted hidden></video>
    <div id="reader" hidden></div>
    <p style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn" onclick="startScan()">Start camera</button> <button class="btn l" onclick="stopScan()">Stop</button></p>
    <p id="cm" class="mut"></p>
  </div>
  <div class="card">
    <h3>Type the barcode</h3>
    <p class="mut" style="margin-top:0">Enter an 8 to 14 digit barcode number printed under the bars.</p>
    <div class="row"><div><input id="bc" inputmode="numeric" placeholder="e.g. 8901058851243" onkeydown="if(event.key==='Enter')lookup($('#bc').value)"></div><button class="btn" onclick="lookup($('#bc').value)">Look up</button></div>
    <div class="quick-chips" style="margin-top:.7rem">
      <span class="mut" style="font-size:.84rem">Sample barcodes:</span>
      <button type="button" class="seg-btn" onclick="lookup('8901058851243')">8901058851243</button>
      <button type="button" class="seg-btn" onclick="lookup('3017620422003')">3017620422003</button>
    </div>
  </div>
</div>
<div id="pr" style="margin-top:1.1rem"></div>
<details id="manualDetails" style="margin-top:1.1rem"><summary>Product not found? Enter package details yourself</summary>
  <div class="card" style="margin-top:.6rem">
    <p class="mut" style="margin-top:0">Values entered manually are stored locally in this browser for label inspection and side-by-side comparison.</p>
    <div class="row">
      <div><label for="mn">Product name *</label><input id="mn" placeholder="e.g. Roasted Ragi Chips"></div>
      <div><label for="mb">Brand</label><input id="mb" placeholder="e.g. Brand name"></div>
      <div><label for="mq">Quantity / pack size</label><input id="mq" placeholder="e.g. 50 g"></div>
      <div><label for="mper">Nutrition basis</label><select id="mper"><option value="100g">Per 100 g</option><option value="100ml">Per 100 ml</option></select></div>
    </div>
    <label for="ma_all">Allergens listed (comma separated)</label><input id="ma_all" style="width:100%" placeholder="e.g. milk, wheat, soy, peanuts">
    <label for="mi">Ingredients (type or paste the list from the pack)</label><textarea id="mi" placeholder="Paste full ingredient list from the package"></textarea>
    <div class="row">
      <div><label for="me">Energy (kcal)</label><input id="me" type="number" min="0" step="0.1"></div>
      <div><label for="ms">Sugars (g)</label><input id="ms" type="number" min="0" step="0.1"></div>
      <div><label for="ma">Salt (g)</label><input id="ma" type="number" min="0" step="0.01"></div>
      <div><label for="mso">Sodium (g)</label><input id="mso" type="number" min="0" step="0.001"></div>
      <div><label for="mf">Sat. fat (g)</label><input id="mf" type="number" min="0" step="0.1"></div>
    </div>
    <div class="row">
      <div><label for="mft">Total fat (g)</label><input id="mft" type="number" min="0" step="0.1"></div>
      <div><label for="mc">Carbohydrates (g)</label><input id="mc" type="number" min="0" step="0.1"></div>
      <div><label for="mfi">Dietary fibre (g)</label><input id="mfi" type="number" min="0" step="0.1"></div>
      <div><label for="mpr">Protein (g)</label><input id="mpr" type="number" min="0" step="0.1"></div>
      <div><label for="mp">Price (₹)</label><input id="mp" type="number" min="0" step="1"></div>
    </div>
    <p id="manErr" class="err-line" hidden></p>
    <p style="margin-top:1rem"><button class="btn" type="button" onclick="manual()">Add product</button></p>
  </div>
</details>`;

INIT.scan = () => {
  if (!window.isSecureContext) $('#cm').textContent = 'Camera needs HTTPS or localhost. You can still type the barcode or search by name.';
  if (pendingSearch) {
    const q = pendingSearch;
    pendingSearch = '';
    if ($('#pq')) { $('#pq').value = q; searchProducts(q); }
  }
  if (activeProdId) {
    const p = S.products.find(x => x.id === activeProdId);
    activeProdId = null;
    if (p && $('#pr')) { $('#pr').innerHTML = prodHTML(p, true); loadAlternatives(p); }
  }
};

window.homeSearch = () => {
  const q = ($('#hq')?.value || '').trim();
  if (!q) { go('scan'); return; }
  if (/^\d{8,14}$/.test(q.replace(/\D/g, '')) && !/[a-zA-Z]/.test(q)) {
    go('scan');
    setTimeout(() => { if ($('#bc')) $('#bc').value = q.replace(/\D/g, ''); lookup(q); }, 50);
    return;
  }
  pendingSearch = q;
  go('scan');
};

window.searchProducts = async raw => {
  const q = (raw || '').trim();
  const out = $('#sr');
  if (!out) return;
  if (q.length < 2) {
    out.innerHTML = empty('Enter at least 2 characters of a product name to search Open Food Facts.');
    return;
  }
  trackUse();
  out.innerHTML = `<div class="loading-box"><span class="spinner" aria-hidden="true"></span><span>Searching Open Food Facts for “${esc(q)}”…</span></div>`;
  try {
    const r = await fetch('/api/off/search?q=' + encodeURIComponent(q));
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Search failed');
    const hits = j.hits || [];
    if (!hits.length) {
      out.innerHTML = `<div class="note">No matching products found for <b>${esc(q)}</b>. Try another keyword, scan the barcode, or <button type="button" class="link-btn" onclick="openManualEntry()">enter the product manually below</button>.</div>`;
      return;
    }
    out.innerHTML = `<div class="grid">${hits.map(h => {
      const n = h.nutriments || {};
      const info = [];
      if (h.qty) info.push(esc(h.qty));
      if (n['energy-kcal_100g'] != null) info.push(Math.round(n['energy-kcal_100g']) + ' kcal/100g');
      if (n.sugars_100g != null) info.push((Math.round(n.sugars_100g * 10) / 10) + 'g sugar/100g');
      if (n.salt_100g != null) info.push((Math.round(n.salt_100g * 100) / 100) + 'g salt/100g');
      const f = flags((h.ing || '') + ' ' + (h.all || ''), h.name);
      return `<article class="card search-hit clickable" tabindex="0" role="button" aria-label="Inspect ${esc(h.name)}" onclick="lookup('${esc(h.code)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();lookup('${esc(h.code)}')}">
        <div>
          ${prodImgHTML(h, 'sm')}
          <div class="meta-line" style="margin-bottom:.25rem"><span>${esc(h.brand) || 'Brand unlisted'}</span><span aria-hidden="true">·</span><span class="num">${esc(h.code)}</span></div>
          <h4 style="margin-bottom:.35rem">${esc(h.name)}</h4>
          ${info.length ? `<div class="meta-line num" style="margin-bottom:.45rem">${info.join(' · ')}</div>` : `<div class="meta-line" style="margin-bottom:.45rem">Nutrition summary not listed in search hit</div>`}
          ${f.length ? `<div class="alert-inline bad"><b>Flagged:</b> ${esc(f.join(', '))}</div>` : ''}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-top:.35rem"><span class="mut" style="font-size:.78rem">Open Food Facts</span><span class="btn s">Inspect label →</span></div>
      </article>`;
    }).join('')}</div>`;
  } catch (e) {
    out.innerHTML = `<div class="note"><b>Search unavailable:</b> ${esc(e.message || 'Could not reach Open Food Facts search.')} <button type="button" class="btn s l" style="margin-left:.5rem" onclick="searchProducts($('#pq').value)">Try again</button></div>`;
  }
};

window.openManualEntry = () => {
  const det = $('#manualDetails');
  if (det) { det.open = true; det.scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#mn')?.focus(); }
};

const cmsg = m => { const e = $('#cm'); if (e) e.textContent = m; };
window.stopScan = () => {
  clearInterval(timer);
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  if (h5) { h5.stop().catch(() => {}); h5 = null; }
  const v = $('#vid'), r = $('#reader');
  if (v) v.hidden = true;
  if (r) r.hidden = true;
};

window.startScan = async () => {
  stopScan();
  if (!navigator.mediaDevices || !window.isSecureContext) {
    cmsg('Camera is not available here (needs HTTPS or localhost). Type the barcode instead.');
    return;
  }
  if ('BarcodeDetector' in window) {
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); }
    catch (e) { cmsg('Camera permission denied or unavailable. Type the barcode instead.'); return; }
    const v = $('#vid');
    v.srcObject = stream;
    v.hidden = false;
    await v.play();
    cmsg('Point the camera at the barcode.');
    const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    timer = setInterval(async () => {
      try {
        const c = await det.detect(v);
        if (c.length) { const code = c[0].rawValue; stopScan(); $('#bc').value = code; lookup(code); }
      } catch (e) {}
    }, 400);
  } else {
    cmsg('Loading scanner…');
    try {
      await loadH5();
      $('#reader').hidden = false;
      h5 = new Html5Qrcode('reader');
      await h5.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 260, height: 150 } }, code => { stopScan(); $('#bc').value = code; lookup(code); });
      cmsg('Point the camera at the barcode.');
    } catch (e) {
      cmsg('Could not start the scanner (needs internet and camera permission). Type the barcode instead.');
    }
  }
};

const loadH5 = () => window.Html5Qrcode ? Promise.resolve() : new Promise((ok, no) => {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
  s.onload = ok;
  s.onerror = no;
  document.head.appendChild(s);
});

window.lookup = async raw => {
  const code = (raw || '').replace(/\D/g, '');
  const out = $('#pr');
  if (!out) return;
  if (code.length < 8 || code.length > 14) {
    out.innerHTML = empty('Enter a valid barcode (8 to 14 digits).');
    return;
  }
  out.innerHTML = `<div class="loading-box"><span class="spinner" aria-hidden="true"></span><span>Looking up barcode <span class="num">${esc(code)}</span> from Open Food Facts…</span></div>`;
  if ($('#bc')) $('#bc').value = code;
  const fetchOFF = async () => {
    const r2 = await fetch(`/api/off/product/${code}`).catch(() => null);
    if (r2 && r2.ok) return await r2.json();
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=code,product_name,generic_name,brands,quantity,image_front_url,image_front_small_url,image_url,ingredients_text,allergens_tags,nutriments,nutrition_data_per,categories_tags,states_tags`);
      if (r.ok || r.status === 404) { const d = await r.json(); d.requestedCode = code; return d; }
    } catch (e) {}
    if (r2) {
      const errBody = await r2.json().catch(() => ({}));
      throw new Error(errBody.error || 'Open Food Facts is temporarily busy.');
    }
    throw new Error('Could not reach Open Food Facts.');
  };
  try {
    const j = await fetchOFF();
    if (j.status !== 1 || !j.product) {
      out.innerHTML = `<div class="note"><b>Not found in Open Food Facts:</b> No product record matched barcode <span class="num">${esc(code)}</span>. Community databases do not cover every local product. <button type="button" class="link-btn" onclick="openManualEntry()">Enter package details manually below</button>.</div>`;
      return;
    }
    const p = j.product;
    const resCode = String(j.code || p.code || code).trim();
    const catsRaw = Array.isArray(p.categories_tags) ? p.categories_tags : [];
    const rec = {
      id: code,
      code,
      reqCode: code,
      resCode,
      name: String(p.product_name || 'Unnamed product').trim(),
      generic: String(p.generic_name || '').trim(),
      brand: String(p.brands || '').trim(),
      qty: String(p.quantity || '').trim(),
      nutPer: String(p.nutrition_data_per || '100g').trim(),
      img: pickSafeImage(p.image_front_url || p.image_url || p.image_front_small_url, resCode),
      imgSmall: pickSafeImage(p.image_front_small_url || p.image_front_url || p.image_url, resCode),
      ing: String(p.ingredients_text || '').trim(),
      all: (p.allergens_tags || []).map(a => a.replace(/^.*:/, '').replace(/-/g, ' ')).join(', '),
      allTags: p.allergens_tags || [],
      cats: catsRaw.filter(c => c && c !== 'en:null'),
      hasNullCat: catsRaw.includes('en:null'),
      states: p.states_tags || [],
      src: 'Open Food Facts',
      n: extractNut(p.nutriments || {}),
    };
    addProduct(rec);
  } catch (e) {
    out.innerHTML = `<div class="note"><b>Lookup unavailable:</b> ${esc(e.message || 'Could not reach Open Food Facts.')} <button type="button" class="btn s l" style="margin-left:.5rem" onclick="lookup('${esc(code)}')">Retry</button> <button type="button" class="link-btn" style="margin-left:.5rem" onclick="openManualEntry()">Enter manually</button></div>`;
  }
};

function addProduct(p, renderNow = true) {
  const i = S.products.findIndex(x => x.id === p.id);
  if (i >= 0) { p.price = p.price ?? S.products[i].price; S.products[i] = p; }
  else S.products.unshift(p);
  save();
  if (renderNow) {
    const el = $('#pr');
    if (el) { el.innerHTML = prodHTML(p, true); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); loadAlternatives(p); }
  }
}

window.manual = () => {
  const name = ($('#mn')?.value || '').trim();
  const errEl = $('#manErr');
  const setErr = msg => { if (errEl) { errEl.textContent = msg; errEl.hidden = false; } };
  if (name.length < 2) { setErr('Enter a product name (at least 2 characters).'); return; }
  const numIds = ['me', 'ms', 'ma', 'mso', 'mf', 'mft', 'mc', 'mfi', 'mpr', 'mp'];
  for (const id of numIds) {
    const raw = $('#' + id)?.value;
    if (raw !== '' && (isNaN(Number(raw)) || Number(raw) < 0)) {
      setErr('Nutrition values and price must be zero or positive numbers.');
      return;
    }
  }
  if (errEl) errEl.hidden = true;
  const v = id => { const x = $('#' + id)?.value; return x === '' ? null : Number(x); };
  addProduct({
    id: 'm' + Date.now(),
    name,
    brand: ($('#mb')?.value || '').trim(),
    qty: ($('#mq')?.value || '').trim(),
    nutPer: $('#mper')?.value || '100g',
    ing: ($('#mi')?.value || '').trim(),
    all: ($('#ma_all')?.value || '').trim(),
    src: 'Entered by you',
    price: v('mp'),
    n: { energy: v('me'), sugar: v('ms'), salt: v('ma'), sodium: v('mso'), satfat: v('mf'), fat: v('mft'), carbs: v('mc'), fiber: v('mfi'), protein: v('mpr') },
  });
  ['mn', 'mb', 'mq', 'ma_all', 'mi', ...numIds].forEach(id => { if ($('#' + id)) $('#' + id).value = ''; });
  toast('Product added');
};

const analyzeProduct = p => {
  const n = p.n || {}, ingL = (p.ing || '').toLowerCase();
  const basis = nutBasisLabel(p).toLowerCase();
  const points = [];
  if (n.sugar != null && !isNaN(n.sugar)) points.push({ k: 'Sugars (' + (Math.round(n.sugar * 10) / 10) + ' g / ' + basis.replace('per ', '') + ')', d: n.sugar >= 15 ? 'Relatively high sugar concentration; check serving size and added sugars on the pack.' : (n.sugar >= 5 ? 'Moderate sugar level; compare portion sizes across brands.' : 'Low total sugars listed.') });
  if (n.salt != null && !isNaN(n.salt)) points.push({ k: 'Salt (' + (Math.round(n.salt * 100) / 100) + ' g / ' + basis.replace('per ', '') + ')', d: n.salt >= 1.2 ? 'Higher salt content; compare against lower-salt options.' : (n.salt >= 0.3 ? 'Moderate salt level.' : 'Lower salt compared with many savoury snacks.') });
  else if (n.sodium != null && !isNaN(n.sodium)) points.push({ k: 'Sodium (' + (Math.round(n.sodium * 1000) / 1000) + ' g / ' + basis.replace('per ', '') + ')', d: 'Labels also use sodium to show salt content (salt is roughly 2.5× sodium).' });
  if (n.satfat != null && !isNaN(n.satfat)) points.push({ k: 'Saturated fat (' + (Math.round(n.satfat * 10) / 10) + ' g)', d: n.satfat >= 5 ? 'Notable saturated fat level; check listed cooking oils (e.g. palm oil or butter).' : 'Lower saturated fat listed.' });
  if (n.fiber != null && !isNaN(n.fiber) && n.fiber >= 3) points.push({ k: 'Dietary fibre (' + (Math.round(n.fiber * 10) / 10) + ' g)', d: 'Contains notable listed fibre per 100g/100ml.' });
  if (ingL.includes('palm')) points.push({ k: 'Contains palm oil', d: 'Listed in ingredients; palm oil contributes to saturated fat content.' });
  if (ingL.includes('hydrogenated')) points.push({ k: 'Contains hydrogenated fat', d: 'Hydrogenated oils can be a source of trans fats; check the nutrition panel.' });
  if (ingL.includes('maltodextrin') || ingL.includes('glucose') || ingL.includes('fructose') || ingL.includes('syrup')) points.push({ k: 'Added carbohydrate / syrup ingredients', d: 'Ingredients include fast-digesting syrups or starches (such as glucose syrup or maltodextrin).' });
  if (ingL.includes('monosodium') || ingL.includes('e621') || ingL.includes('flavour enhancer')) points.push({ k: 'Flavour enhancers listed', d: 'Includes MSG or flavour enhancers, which also add to savoury taste and sodium.' });
  if (isParent()) {
    const { conditions, avoidWords, allergyExclusions } = getActiveExclusions();
    const matched = flags(p.ing + ' ' + p.all, p.name);
    if (matched.length) points.unshift({ k: 'Matches your Parent Profile check words', d: 'Found ' + matched.join(', ') + ' in available label text. Always review the physical package before serving.' });
    else if (avoidWords.length || allergyExclusions.length) points.unshift({ k: 'Checked words not seen in available text', d: 'Did not spot ' + [...avoidWords, ...allergyExclusions].slice(0, 5).join(', ') + ' in the text above—however Open Food Facts records may be incomplete and do not confirm cross-contact safety.' });
    if (conditions.includes('Diabetes') && (n.sugar != null || n.carbs != null)) points.push({ k: 'Context for recorded Diabetes profile', d: 'Check total carbohydrates (' + (n.carbs != null ? Math.round(n.carbs * 10) / 10 + 'g' : 'unlisted') + '), sugars (' + (n.sugar != null ? Math.round(n.sugar * 10) / 10 + 'g' : 'unlisted') + '), and follow your doctor/dietitian plan.' });
    if (conditions.includes('Heart-related dietary restriction') && (n.salt != null || n.satfat != null)) points.push({ k: 'Context for heart-related restriction', d: 'Review sodium/salt and saturated fat amounts per serving against your professional dietary guidance.' });
  }
  return points;
};

function prodHTML(p, act) {
  const f = flags(p.ing + ' ' + p.all, p.name);
  const g = glossFor(p.ing);
  const val = validateProduct(p);
  const analysis = analyzeProduct(p);
  const saved = isProdSaved(p.id);
  const basis = nutBasisLabel(p);
  const valClass = val.status === 'ambiguous' ? 'bad' : (val.status === 'partial' ? 'warn' : '');
  return `<div class="card prod-card">
    <div class="prod-top">
      ${p.src === 'Entered by you' ? '' : prodImgHTML(p, 'lg')}
      <div class="prod-top-info">
        <div class="meta-line" style="margin-bottom:.35rem"><span>Source: ${esc(p.src)}</span>${p.code ? `<span>·</span><span class="num">Barcode ${esc(p.code)}</span>` : ''}${p.qty ? `<span>·</span><span>${esc(p.qty)}</span>` : ''}</div>
        <h3 style="margin-bottom:.25rem">${esc(p.name)}</h3>
        <p class="mut" style="margin:0 0 .7rem">${esc(p.brand) || 'Brand not available'}${p.price != null ? ' · ₹' + esc(p.price) : ''}</p>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
          <button type="button" class="btn s l" onclick="toggleSaveProd('${esc(p.id)}',this)">${saved ? 'Saved' : 'Save product'}</button>
          ${act ? `<a class="btn s" href="#compare" onclick="S.cmp=[...new Set([...S.cmp,'${esc(p.id)}'])];save()">Compare this</a>` : ''}
          ${p.code ? `<a class="btn s l" href="https://world.openfoodfacts.org/product/${esc(p.code)}" target="_blank" rel="noopener noreferrer">Verify on OFF ↗</a>` : ''}
        </div>
      </div>
    </div>
    ${val.issues.length ? `<div class="val-box ${valClass}"><b>Data Check · ${esc(val.label)}</b><ul>${val.issues.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : `<div class="val-box"><b>Data Check · ${esc(val.label)}</b> — Community product data is not medically verified. Always verify the physical package for the latest recipe and allergen warnings.</div>`}
    ${f.length ? `<div class="alert-inline bad" style="margin-bottom:.85rem"><b>Profile Alert:</b> Contains words related to your Parent Profile checks (<b>${esc(f.join(', '))}</b>). Review the full physical package label.</div>` : ''}
    <div class="scroll"><table><tr><th>${esc(basis)}</th><th>Amount</th></tr>${NUT.map(r => `<tr><td>${r[1]}</td><td class="num">${fmt(p.n?.[r[0]], r[2])}</td></tr>`).join('')}</table></div>
    <p style="margin-top:.9rem"><b>Ingredients:</b> ${p.ing ? esc(p.ing) : '<span class="mut">Not listed. A missing ingredient list does not mean the product is safe; check the physical pack.</span>'}</p>
    <p><b>Allergens listed:</b> ${p.all ? esc(p.all) : '<span class="mut">Not listed in Open Food Facts (check the physical pack for allergen and cross-contact warnings).</span>'}</p>
    ${analysis.length ? `<div class="analysis-box"><h3 style="margin-bottom:.25rem">Label Analysis${isParent() && S.profile.name ? ' for ' + esc(S.profile.name) : ''}</h3><p class="mut" style="margin:0 0 .65rem">Informational observations based on listed values (not medical advice or a safety guarantee).</p><div class="analysis-grid">${analysis.map(a => `<div class="analysis-item"><strong>${esc(a.k)}</strong><span class="mut" style="font-size:.86rem">${esc(a.d)}</span></div>`).join('')}</div></div>` : ''}
    ${g.length ? `<div class="analysis-box"><h3>Terms explained</h3>${g.map(x => `<p><b>${x.t}:</b> ${x.x}</p>`).join('')}</div>` : ''}
    <div id="altBox" class="alt-section"></div>
  </div>`;
}

const pickAltQuery = p => {
  const genericCats = new Set(['en:snacks', 'en:plant-based-foods-and-beverages', 'en:plant-based-foods', 'en:sweet-snacks', 'en:salty-snacks', 'en:cereals-and-potatoes', 'en:breakfasts', 'en:spreads', 'en:sweet-spreads', 'en:beverages']);
  const cats = (p.cats || []).filter(c => c && c !== 'en:null');
  const specific = [...cats].reverse().find(c => !genericCats.has(c)) || cats[cats.length - 1] || '';
  const cleanName = (p.name || '').replace(/\b(classic|magic|masala|original|family|pack|mini|go!?|plus|\+)\b/gi, ' ').replace(/[^\w\s]/g, ' ').trim().split(/\s+/).slice(0, 3).join(' ');
  const q = specific ? specific.replace(/^..:/, '').replace(/-/g, ' ') : cleanName;
  return { cat: specific, q: cleanName || q };
};

const altCacheKey = id => id + '|' + getActiveExclusions().allExclusions.join(',');

window.compareWith = (idA, idB) => {
  const cacheList = (ALT_CACHE[altCacheKey(idA)] || ALT_CACHE[idA])?.candidates || [];
  const cand = cacheList.find(c => c.code === idB);
  if (cand) {
    addProduct({
      id: cand.code, code: cand.code, reqCode: cand.code, resCode: cand.code,
      name: cand.name, generic: cand.generic || '', brand: cand.brand || '', qty: cand.qty || '', nutPer: cand.nutPer || '100g',
      img: cand.img || '', imgSmall: cand.imgSmall || cand.img || '', ing: cand.ing || '', all: cand.all || '',
      allTags: cand.allTags || [], cats: cand.cats || [], hasNullCat: !!cand.hasNullCat, states: cand.states || [],
      src: 'Open Food Facts', n: extractNut(cand.nutriments || {}),
    }, false);
  }
  S.cmp = [...new Set([idA, idB])];
  save();
  go('compare');
};

window.saveAlt = (idA, idB, btn) => {
  const cacheList = (ALT_CACHE[altCacheKey(idA)] || ALT_CACHE[idA])?.candidates || [];
  const cand = cacheList.find(c => c.code === idB);
  if (cand && !S.products.some(x => x.id === idB)) {
    addProduct({
      id: cand.code, code: cand.code, reqCode: cand.code, resCode: cand.code,
      name: cand.name, generic: cand.generic || '', brand: cand.brand || '', qty: cand.qty || '', nutPer: cand.nutPer || '100g',
      img: cand.img || '', imgSmall: cand.imgSmall || cand.img || '', ing: cand.ing || '', all: cand.all || '',
      allTags: cand.allTags || [], cats: cand.cats || [], hasNullCat: !!cand.hasNullCat, states: cand.states || [],
      src: 'Open Food Facts', n: extractNut(cand.nutriments || {}),
    }, false);
  }
  toggleSaveProd(idB, btn);
};

async function loadAlternatives(p) {
  const box = $('#altBox');
  if (!box || !p) return;
  if (p.src === 'Entered by you') {
    const ideaGroup = LOOK.find(g => g.k.some(k => (p.name || '').toLowerCase().includes(k)));
    box.innerHTML = `<div class="analysis-box"><h3>Better Alternatives to Explore</h3><p class="mut">Manual entries do not carry an Open Food Facts barcode to query packaged equivalents. ${ideaGroup ? 'General food ideas below share a similar format (not brand-verified):' : 'Try searching Open Food Facts by product name to view packaged alternatives.'}</p>${ideaGroup ? `<div class="grid">${ideaGroup.a.slice(0, 3).map(a => snackCard(a[0], a[1], [a[2], 'General idea'])).join('')}</div>` : ''}</div>`;
    return;
  }
  const { cat, q } = pickAltQuery(p);
  if (!cat && !q) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="analysis-box"><h3>Better Alternatives to Explore</h3><div class="loading-box"><span class="spinner" aria-hidden="true"></span><span>Searching Open Food Facts for verified products in a similar category…</span></div></div>`;
  try {
    const { allExclusions } = getActiveExclusions();
    const key = altCacheKey(p.id);
    let data = ALT_CACHE[key];
    if (!data) {
      const r = await fetch(`/api/off/alternatives?code=${encodeURIComponent(p.code || '')}&cat=${encodeURIComponent(cat)}&q=${encodeURIComponent(q)}&exclude=${encodeURIComponent(allExclusions.join(','))}`);
      if (!r.ok) throw new Error('Could not load alternatives');
      data = await r.json();
      ALT_CACHE[key] = data;
    }
    renderAlternatives(p, data);
  } catch (e) {
    if ($('#altBox')) $('#altBox').innerHTML = `<div class="analysis-box"><h3>Better Alternatives to Explore</h3><p class="note">Could not load packaged alternatives from Open Food Facts right now. No unverified or fabricated alternatives are shown.</p></div>`;
  }
}

function renderAlternatives(p, data) {
  const box = $('#altBox');
  if (!box) return;
  const { avoidWords, allergyExclusions, allExclusions, conditions } = getActiveExclusions();
  const baseN = p.n || {};
  const baseIng = (p.ing || '').toLowerCase();
  const cands = data?.candidates || [];
  let excludedAllergy = 0, skippedIncomplete = 0;
  const qualified = [];

  for (const c of cands) {
    const n = extractNut(c.nutriments || {});
    const strictHay = [c.ing, c.all, (c.allTags || []).join(' ')].join(' ').toLowerCase();
    const nameHay = stripNegations([c.name, c.generic, c.brand].join(' '));
    const hay = `${strictHay} ${nameHay}`;
    const hitExcl = allExclusions.filter(w => hay.includes(w));
    if (hitExcl.length) { excludedAllergy++; continue; }
    if (allExclusions.length && !(c.ing || '').trim()) { skippedIncomplete++; continue; }
    const hasNutrition = [n.sugar, n.salt, n.satfat, n.energy, n.protein, n.fiber].some(v => v != null && !isNaN(v));
    if (!hasNutrition && !(c.ing || '').trim()) continue;

    const reasons = [];
    let score = 0;
    if (baseN.sugar != null && n.sugar != null && n.sugar < baseN.sugar - 0.5) { reasons.push('Lower sugars (' + (Math.round(n.sugar * 10) / 10) + 'g vs ' + (Math.round(baseN.sugar * 10) / 10) + 'g)'); score += 2; }
    if (baseN.salt != null && n.salt != null && n.salt < baseN.salt - 0.05) { reasons.push('Lower salt (' + (Math.round(n.salt * 100) / 100) + 'g vs ' + (Math.round(baseN.salt * 100) / 100) + 'g)'); score += 2; }
    if (baseN.satfat != null && n.satfat != null && n.satfat < baseN.satfat - 0.3) { reasons.push('Lower saturated fat (' + (Math.round(n.satfat * 10) / 10) + 'g vs ' + (Math.round(baseN.satfat * 10) / 10) + 'g)'); score += 2; }
    if (baseN.energy != null && n.energy != null && n.energy < baseN.energy - 15) { reasons.push('Lower energy (' + Math.round(n.energy) + ' vs ' + Math.round(baseN.energy) + ' kcal)'); score += 1; }
    if (baseN.protein != null && n.protein != null && n.protein > baseN.protein + 1) { reasons.push('Higher protein (' + (Math.round(n.protein * 10) / 10) + 'g vs ' + (Math.round(baseN.protein * 10) / 10) + 'g)'); score += 1; }
    if (baseIng.includes('palm') && (c.ing || '').trim() && !c.ing.toLowerCase().includes('palm')) { reasons.push('No palm oil listed in available ingredients'); score += 2; }
    if (isParent() && (avoidWords.length || allergyExclusions.length) && (c.ing || '').trim()) { reasons.push('No declared match for your profile\'s checked ingredients in listed text'); score += 1; }
    if (score <= 0 && hasNutrition) { reasons.push('Same product group in Open Food Facts for side-by-side nutrition comparison'); score += 0.5; }
    if (score > 0) qualified.push({ c, n, reasons, score });
  }
  qualified.sort((a, b) => b.score - a.score);
  const top = qualified.slice(0, 4);

  const lookKey = (p.name + ' ' + (p.cats || []).join(' ')).toLowerCase();
  const matchedLook = LOOK.find(g => g.k.some(k => lookKey.includes(k)));
  const generalIdeas = matchedLook ? matchedLook.a.filter(a => !allExclusions.some(w => stripNegations(a[0] + ' ' + a[1]).includes(w))).slice(0, 2) : [];

  box.innerHTML = `<div class="analysis-box">
    <h3>Better Alternatives to Explore</h3>
    <p class="mut" style="margin:.2rem 0 .7rem">${isParent() ? 'Compared using Open Food Facts values and filtered against your Parent Profile' + (conditions.length ? ' (' + esc(conditions.join(', ')) + ')' : '') : 'General side-by-side alternatives from Open Food Facts based on nutrition and ingredients (no medical condition assumed)'}. ${excludedAllergy ? `<b>${excludedAllergy}</b> product(s) listing matching allergens or checked words were excluded. ` : ''}${skippedIncomplete ? `<b>${skippedIncomplete}</b> product(s) without complete ingredient text were skipped so exclusions can be checked reliably.` : ''}</p>
    ${allergyExclusions.length || avoidWords.length ? `<div class="note"><b>Allergy &amp; label safety notice:</b> Products declaring matching allergens (${esc([...allergyExclusions, ...avoidWords].join(', '))}) were excluded where Open Food Facts listed them. Community labels can be incomplete and rarely include factory cross-contact warnings—always verify the physical pack.</div>` : ''}
    ${top.length ? `<div class="grid">${top.map(({ c, n, reasons }) => {
      const saved = isProdSaved(c.id || c.code);
      const nutParts = [];
      if (n.energy != null) nutParts.push(Math.round(n.energy) + ' kcal');
      if (n.sugar != null) nutParts.push((Math.round(n.sugar * 10) / 10) + 'g sugar');
      if (n.salt != null) nutParts.push((Math.round(n.salt * 100) / 100) + 'g salt');
      if (n.satfat != null) nutParts.push((Math.round(n.satfat * 10) / 10) + 'g sat fat');
      return `<article class="card alt-card">
        <div>
          ${prodImgHTML(c, 'sm')}
          <div class="meta-line" style="margin-bottom:.25rem"><span>${esc(c.brand || 'Brand unlisted')}</span>${c.qty ? `<span>· ${esc(c.qty)}</span>` : ''}</div>
          <h4 style="margin-bottom:.3rem">${esc(c.name)}</h4>
          ${nutParts.length ? `<div class="meta-line num" style="margin-bottom:.45rem">${nutParts.join(' · ')} / 100g</div>` : `<div class="meta-line" style="margin-bottom:.45rem">Partial nutrition data</div>`}
          <ul class="alt-reasons">${reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
          ${!(c.ing || '').trim() ? `<p class="mut" style="font-size:.8rem;margin:.25rem 0">Ingredients text not listed in Open Food Facts; verify pack before choosing.</p>` : ''}
        </div>
        <div class="alt-actions">
          <button type="button" class="btn s" onclick="lookup('${esc(c.code)}')">Inspect</button>
          <button type="button" class="btn s l" onclick="compareWith('${esc(p.id)}','${esc(c.code)}')">Compare</button>
          <button type="button" class="btn s l" onclick="saveAlt('${esc(p.id)}','${esc(c.code)}',this)">${saved ? 'Saved' : 'Save'}</button>
        </div>
      </article>`;
    }).join('')}</div>` : `<div class="empty">No verified Open Food Facts packaged alternative met the nutritional comparison and dietary exclusion criteria for this product.</div>`}
    <div class="swap-box" style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;flex-wrap:wrap">
      <span>Want homemade recipes, lower-sugar packaged discovery, or local healthy food sellers instead?</span>
      <div style="display:flex;gap:.45rem;flex-wrap:wrap"><a class="btn s" href="#recipes">Explore ${getRecipes().length} recipes</a><a class="btn s l" href="#healthy">Healthy Discovery</a><a class="btn s l" href="#local">Find Near You</a></div>
    </div>
    ${generalIdeas.length ? `<div style="margin-top:1.25rem"><h4 style="margin-bottom:.25rem">General Food Ideas to Consider (Not Brand-Verified Products)</h4><p class="mut" style="margin:0 0 .7rem;font-size:.86rem">These are homemade or concept ideas with a similar feel—not Open Food Facts verified products.</p><div class="grid">${generalIdeas.map(a => snackCard(a[0], a[1], [a[2], 'General idea'])).join('')}</div></div>` : ''}
  </div>`;
}

/* --- Healthy Snack Discovery --- */
let HF = { cat: 'all', taste: 'all', src: 'all', diet: 'all', avoid: '', prep: 'all', budget: 'all', q: '', showAllHome: false };
window._healthyPackMap = {};
const HEALTHY_CATS = [['all', 'All categories'], ['roasted-baked', 'Roasted & baked'], ['fruit', 'Fruit-based'], ['millet', 'Millet & whole-grain'], ['high-fibre', 'High-fibre'], ['low-sugar', 'Lower-sugar'], ['low-sodium', 'Lower-sodium'], ['protein-rich', 'Protein-rich']];

V.healthy = () => {
  const { allExclusions } = getActiveExclusions();
  return `<div class="page-head">
    <div><h2>Healthy Snack Discovery</h2><p class="mut section-intro" style="margin-bottom:0">Explore nutrient-checked packaged options alongside homemade recipes. Reasons cite actual listed values rather than arbitrary scores—and marketing buzzwords like “natural”, “organic”, or “high-protein” are never treated as proof.</p></div>
    <span class="status-text">${isParent() ? 'Parent Profile' : 'Guest Mode'}</span>
  </div>
  ${allExclusions.length ? `<div class="note"><b>Parent Profile Active:</b> Filtering out products or recipes listing <b>${esc(allExclusions.join(', '))}</b> (and skipping Open Food Facts records missing ingredient lists).</div>` : ''}
  <div class="card g">
    <label style="margin-top:0">Focus category</label>
    <div class="seg-bar" id="hCats">${HEALTHY_CATS.map(([k, lbl]) => `<button type="button" class="seg-btn ${HF.cat === k ? 'on' : ''}" onclick="setHealthyCat('${k}')">${lbl}</button>`).join('')}</div>
    <div class="row">
      <div><label for="hTaste">Sweet / savoury</label><select id="hTaste" onchange="runHealthy()"><option value="all">Any taste</option><option value="savoury">Savoury</option><option value="sweet">Sweet</option></select></div>
      <div><label for="hSrc">Packaged or homemade</label><select id="hSrc" onchange="runHealthy()"><option value="all">Both packaged &amp; homemade</option><option value="homemade">Homemade recipes only</option><option value="packaged">Packaged products only (OFF)</option></select></div>
      <div><label for="hDiet">Dietary preference</label><select id="hDiet" onchange="runHealthy()"><option value="all">Any diet</option><option>Vegetarian</option><option>Vegan</option><option>Gluten-free</option><option>Dairy-free</option><option>Nut-free</option></select></div>
      <div><label for="hPrep">Preparation time</label><select id="hPrep" onchange="runHealthy()"><option value="all">Any prep time</option><option value="none">Ready / no prep (packaged)</option><option value="quick">Quick (≤ 10 mins)</option><option value="cook">Cook / bake (10–30 mins)</option></select></div>
      <div><label for="hBudget">Budget</label><select id="hBudget" onchange="runHealthy()"><option value="all">Any budget</option><option value="budget">Budget-friendly (home / entered)</option><option value="moderate">Moderate (home / entered)</option><option value="price-entered">Packaged with entered ₹ price</option></select></div>
    </div>
    <div class="row" style="margin-top:.2rem">
      <div><label for="hQ">Search ingredient or snack keyword (optional)</label><input id="hQ" placeholder="e.g. makhana, ragi, oats, dates" value="${esc(HF.q)}" onkeydown="if(event.key==='Enter')runHealthy()"></div>
      <div><label for="hAvoid">Extra ingredients to avoid or check (comma separated)</label><input id="hAvoid" placeholder="e.g. palm oil, peanut, maida" value="${esc(HF.avoid)}" oninput="runHealthy()"></div>
      <div style="flex:0 0 auto;display:flex;gap:.45rem"><button type="button" class="btn" onclick="runHealthy()">Update results</button><button type="button" class="btn l" onclick="resetHealthy()">Reset</button></div>
    </div>
  </div>
  <div id="healthyOut" style="margin-top:1.1rem"></div>`;
};

window.setHealthyCat = k => {
  HF.cat = k;
  HF.showAllHome = false;
  document.querySelectorAll('#hCats .seg-btn').forEach((b, i) => b.classList.toggle('on', HEALTHY_CATS[i][0] === k));
  runHealthy();
};

window.resetHealthy = () => {
  HF = { cat: 'all', taste: 'all', src: 'all', diet: 'all', avoid: '', prep: 'all', budget: 'all', q: '', showAllHome: false };
  if ($('#hTaste')) $('#hTaste').value = 'all';
  if ($('#hSrc')) $('#hSrc').value = 'all';
  if ($('#hDiet')) $('#hDiet').value = 'all';
  if ($('#hPrep')) $('#hPrep').value = 'all';
  if ($('#hBudget')) $('#hBudget').value = 'all';
  if ($('#hQ')) $('#hQ').value = '';
  if ($('#hAvoid')) $('#hAvoid').value = '';
  document.querySelectorAll('#hCats .seg-btn').forEach((b, i) => b.classList.toggle('on', HEALTHY_CATS[i][0] === 'all'));
  runHealthy();
};

window.healthyAction = (code, act, btn) => {
  const c = window._healthyPackMap[code];
  if (!c) return;
  if (!S.products.some(x => x.id === code)) {
    addProduct({
      id: c.code, code: c.code, reqCode: c.code, resCode: c.code,
      name: c.name, generic: c.generic || '', brand: c.brand || '', qty: c.qty || '', nutPer: c.nutPer || '100g',
      img: c.img || '', imgSmall: c.imgSmall || c.img || '', ing: c.ing || '', all: c.all || '',
      allTags: c.allTags || [], cats: c.cats || [], hasNullCat: !!c.hasNullCat, states: c.states || [],
      src: 'Open Food Facts', n: extractNut(c.nutriments || {}),
    }, false);
  }
  if (act === 'compare') { S.cmp = [...new Set([...S.cmp, code])]; save(); go('compare'); return; }
  if (act === 'save') { toggleSaveProd(code, btn); return; }
  lookup(code);
};

let _healthyReqSeq = 0;
window.showMoreHealthyRecipes = () => { HF.showAllHome = true; runHealthy(); };

window.runHealthy = async () => {
  const out = $('#healthyOut');
  if (!out) return;
  HF.taste = $('#hTaste')?.value || 'all';
  HF.src = $('#hSrc')?.value || 'all';
  HF.diet = $('#hDiet')?.value || 'all';
  HF.prep = $('#hPrep')?.value || 'all';
  HF.budget = $('#hBudget')?.value || 'all';
  HF.q = ($('#hQ')?.value || '').trim();
  HF.avoid = ($('#hAvoid')?.value || '').trim();
  const { allExclusions } = getActiveExclusions();
  const extraAvoid = list(HF.avoid);
  const excl = [...new Set([...allExclusions, ...extraAvoid])];
  const reqId = ++_healthyReqSeq;

  const wantHome = HF.src !== 'packaged' && HF.prep !== 'none' && HF.budget !== 'price-entered';
  const recMatches = wantHome ? getRecipes().filter(r => {
    if (HF.cat !== 'all' && !(r.focus || []).includes(HF.cat)) return false;
    if (HF.taste !== 'all' && r.t !== HF.taste) return false;
    if (HF.diet !== 'all' && !(r.diet || []).includes(HF.diet)) return false;
    if (HF.prep === 'quick' && r.prepMin > 10) return false;
    if (HF.prep === 'cook' && r.prepMin <= 10) return false;
    if ((HF.budget === 'budget' || HF.budget === 'moderate') && r.budget !== HF.budget) return false;
    const hay = [r.n, r.cat, r.swapFor || '', r.allergens || '', r.subs || '', ...(r.ing || []), ...(r.focus || [])].join(' ').toLowerCase();
    if (HF.q && !hay.includes(HF.q.toLowerCase())) return false;
    const hayExcl = `${stripNegations(r.n)} ${stripNegations((r.ing || []).join(' '))} ${stripNegations(r.allergens || '')}`;
    if (excl.length && excl.some(w => hayExcl.includes(w))) return false;
    return true;
  }) : [];

  const shownRecs = HF.showAllHome ? recMatches : recMatches.slice(0, 9);
  const wantPack = HF.src !== 'homemade' && HF.prep !== 'quick' && HF.prep !== 'cook';
  const homeSection = wantHome ? `<div class="split-head"><h3>Homemade &amp; Kitchen Options (${recMatches.length} recipe${recMatches.length === 1 ? '' : 's'})</h3><a class="btn s l" href="#recipes">Open full Recipe Studio (${getRecipes().length})</a></div>
    ${shownRecs.length ? `<div class="grid">${shownRecs.map(r => {
      const why = [];
      if (HF.cat !== 'all') why.push('Focus: ' + HF.cat.replace(/-/g, ' '));
      if (r.swapFor) why.push('Swap for ' + r.swapFor);
      if (HF.diet !== 'all') why.push('Matches ' + HF.diet);
      else why.push('Home-controlled salt, oil & sugar (' + r.prep + ')');
      return `<article class="card snack-card">${recipeImgHTML(r)}<div class="meta-line" style="margin-bottom:.25rem">${esc(r.cat)} · ${esc(r.prep)}</div><h3>${esc(r.n)}</h3><p class="mut" style="font-size:.86rem;margin:0 0 .45rem"><b>Why it appears:</b> ${esc(why.join(' · '))}</p><div class="meta-line" style="margin-bottom:.5rem">${esc((r.diet || []).slice(0, 3).join(' · '))}</div><div class="snack-actions"><button type="button" class="btn s" onclick="openRecipe('${esc(r.id)}')">View recipe &amp; steps</button><button type="button" class="btn s l" onclick="toggleSaveRecipe('${esc(r.id)}',this)">${isRecipeSaved(r.id) ? 'Saved' : 'Save recipe'}</button></div></article>`;
    }).join('')}</div>${!HF.showAllHome && recMatches.length > 9 ? `<p style="margin-top:.85rem"><button type="button" class="btn s l" onclick="showMoreHealthyRecipes()">Show all ${recMatches.length} matching recipes</button></p>` : ''}` : `<div class="empty">No homemade recipes matched all selected filters. Try broadening prep time, taste, or category.</div>`}` : '';

  if (!wantPack) {
    out.innerHTML = homeSection || `<div class="empty">No items match the combination of “Packaged” source and “${esc(HF.prep)}” preparation time.</div>`;
    return;
  }

  out.innerHTML = `<div class="split-head"><h3>Packaged Products (Open Food Facts)</h3><span class="mut" style="font-size:.86rem">Checking listed nutrition values…</span></div><div class="loading-box"><span class="spinner" aria-hidden="true"></span><span>Fetching Open Food Facts products with nutrition checks…</span></div>${homeSection}`;

  try {
    const url = `/api/off/healthy?cat=${encodeURIComponent(HF.cat)}&taste=${encodeURIComponent(HF.taste)}&q=${encodeURIComponent(HF.q)}&exclude=${encodeURIComponent(excl.join(','))}`;
    const res = await fetch(url);
    const data = await res.json();
    if (reqId !== _healthyReqSeq) return;
    if (!res.ok) throw new Error(data.error || 'Search unavailable');
    let packItems = data.items || [];

    if (HF.diet !== 'all') {
      const df = HF.diet.toLowerCase();
      packItems = packItems.filter(it => {
        const cleanIng = stripNegations([it.ing, it.all, (it.allTags || []).join(' ')].join(' '));
        const cleanCats = stripNegations((it.cats || []).join(' '));
        const hay = `${cleanIng} ${cleanCats}`;
        if (df === 'vegan') return (it.cats || []).some(c => c.includes('vegan')) || (!/\b(milk|dairy|butter|ghee|honey|egg|meat|fish|gelatin)\b/.test(hay) && (it.ing || '').trim());
        if (df === 'vegetarian') return !/\b(meat|chicken|fish|gelatin|beef|pork)\b/.test(hay);
        if (df === 'gluten-free') return !/\b(wheat|gluten|barley|rye|maida|malt|semolina)\b/.test(hay) && (it.ing || '').trim();
        if (df === 'dairy-free') return !/\b(milk|lactose|whey|butter|ghee|cream|cheese|paneer|curd|yogurt)\b/.test(hay) && (it.ing || '').trim();
        if (df === 'nut-free') return !/\b(peanut|peanuts|almond|almonds|cashew|cashews|walnut|walnuts|hazelnut|hazelnuts|pistachio|pistachios|pecan|macadamia|tree nuts?|nuts)\b/.test(hay) && (it.ing || '').trim();
        return true;
      });
    }
    if (HF.budget === 'price-entered') {
      const pricedIds = new Set(S.products.filter(x => x.price != null).map(x => x.code || x.id));
      packItems = packItems.filter(it => pricedIds.has(it.code));
    }
    packItems.forEach(it => { window._healthyPackMap[it.code] = it; });

    const packHTML = `<div class="split-head"><h3>Packaged Products (${packItems.length} shown · Open Food Facts)</h3><span class="mut" style="font-size:.84rem">${HF.budget === 'budget' || HF.budget === 'moderate' ? 'Retail prices are not listed in Open Food Facts (enter ₹ price in Compare).' : 'No unsupported health scores assigned.'}</span></div>
    ${(data.excludedCount || data.unverifiedNutritionSkipped) ? `<p class="mut" style="margin:.2rem 0 .7rem;font-size:.86rem">${data.excludedCount ? `<b>${data.excludedCount}</b> item(s) matching avoided ingredients/allergens were excluded. ` : ''}${data.unverifiedNutritionSkipped ? `<b>${data.unverifiedNutritionSkipped}</b> item(s) missing required nutrition/ingredient fields were skipped rather than assumed safe or healthy.` : ''}</p>` : ''}
    ${packItems.length ? `<div class="grid">${packItems.map(it => {
      const nu = it.nutriments || {};
      const facts = [];
      if (nu['energy-kcal_100g'] != null) facts.push(Math.round(nu['energy-kcal_100g']) + ' kcal');
      if (nu.sugars_100g != null) facts.push((Math.round(nu.sugars_100g * 10) / 10) + 'g sugar');
      if (nu.salt_100g != null) facts.push((Math.round(nu.salt_100g * 100) / 100) + 'g salt');
      if (nu.fiber_100g != null) facts.push((Math.round(nu.fiber_100g * 10) / 10) + 'g fibre');
      if (nu.proteins_100g != null) facts.push((Math.round(nu.proteins_100g * 10) / 10) + 'g protein');
      const saved = isProdSaved(it.code);
      return `<article class="card alt-card">
        <div>
          ${prodImgHTML(it, 'sm')}
          <div class="meta-line" style="margin-bottom:.25rem"><span>${esc(it.brand || 'Brand unlisted')}</span>${it.qty ? `<span>· ${esc(it.qty)}</span>` : ''}</div>
          <h4 style="margin-bottom:.3rem">${esc(it.name)}</h4>
          ${facts.length ? `<div class="meta-line num" style="margin-bottom:.4rem">${facts.join(' · ')} / 100g</div>` : `<div class="meta-line" style="margin-bottom:.4rem">Partial nutrition listed</div>`}
          ${it.ing ? `<p class="mut" style="font-size:.82rem;margin:.25rem 0"><b>Ingredients:</b> ${esc(it.ing.slice(0, 120))}${it.ing.length > 120 ? '…' : ''}</p>` : `<p class="mut" style="font-size:.82rem;margin:.25rem 0"><b>Ingredients:</b> Not listed in Open Food Facts.</p>`}
          ${(it.reasons || []).length ? `<ul class="alt-reasons">${it.reasons.map(rs => `<li><b>Listed:</b> ${esc(rs)}</li>`).join('')}</ul>` : ''}
          ${(it.buzzwords || []).length ? `<div class="buzz-warn"><b>Marketing Claim vs Label:</b> Label uses “${esc(it.buzzwords.join(', '))}”. Marketing words alone do not make a snack healthy—always check listed sugars, salt and oils.</div>` : ''}
        </div>
        <div class="alt-actions">
          <button type="button" class="btn s" onclick="healthyAction('${esc(it.code)}','inspect')">Inspect</button>
          <button type="button" class="btn s l" onclick="healthyAction('${esc(it.code)}','compare')">Compare</button>
          <button type="button" class="btn s l" onclick="healthyAction('${esc(it.code)}','save',this)">${saved ? 'Saved' : 'Save'}</button>
        </div>
      </article>`;
    }).join('')}</div>` : `<div class="empty">No Open Food Facts packaged items met all strict nutrition/exclusion filters for this query. ${HF.budget === 'price-entered' ? 'No checked products have an entered ₹ price yet—add a price in Compare or Scan.' : ''} Try clearing a keyword or switching to “All categories”.</div>`}`;
    out.innerHTML = packHTML + homeSection;
  } catch (e) {
    if (reqId !== _healthyReqSeq) return;
    out.innerHTML = `<div class="note"><b>Discovery unavailable:</b> ${esc(e.message || 'Could not load packaged products right now.')} <button type="button" class="btn s l" style="margin-left:.5rem" onclick="runHealthy()">Retry</button></div>` + homeSection;
  }
};
INIT.healthy = () => {
  if ($('#hTaste')) $('#hTaste').value = HF.taste;
  if ($('#hSrc')) $('#hSrc').value = HF.src;
  if ($('#hDiet')) $('#hDiet').value = HF.diet;
  if ($('#hPrep')) $('#hPrep').value = HF.prep;
  if ($('#hBudget')) $('#hBudget').value = HF.budget;
  runHealthy();
};

/* --- Local Healthy Food Finder --- */
let LF = { loc: 'Gurugram, 122002', type: 'all', diet: 'all', price: 'all', lat: null, lon: null, lastPayload: null };
window._placeMap = {};
const LOCAL_PRESETS = ['Gurugram, 122002', 'DLF Phase 4, Gurugram', 'Hauz Khas, South Delhi', 'Connaught Place, New Delhi', 'Noida Sector 18', 'Indiranagar, Bengaluru'];
const FAST_FOOD_CLIENT_RE = /\b(mcdonald|burger king|kfc|domino|pizza hut|subway|taco bell|wendy|dunkin|popeyes|papa john|baskin|cold stone|krispy kreme|carl'?s jr|wow!?\s*momo|chicago pizza|la pino)\b/i;

const LOCAL_CHECKLIST = {
  'health-organic': 'Confirm expiry dates, ingredient lists, and certified allergy/gluten-free seals on packaged millet, seed, and snack packs.',
  'millet-grain': 'Ask whether flours or millets are milled on shared wheat/gluten equipment if coeliac/gluten sensitivity applies.',
  bakery: 'Ask directly about butter/ghee vs palm oil, refined sugar vs jaggery, maida content, and nut cross-contact.',
  'homemade-biz': 'Confirm batch preparation date, full ingredient list, oil/salt used, and allergen cross-contact in the home kitchen.',
  cafe: 'Ask staff for exact allergen ingredients and oil/sugar additions before ordering smoothies, bowls or snacks.',
  'produce-grocery': 'Compare whole-food staples (fruits, roasted chana, makhana, plain curd) and inspect nutrition panels on packaged shelves.',
};

V.local = () => `<div class="page-head">
  <div><h2>Find Healthy Food Near You</h2><p class="mut section-intro" style="margin-bottom:0">Search by Indian city, locality, PIN code, or current location to discover organic stores, fresh produce markets, millet sellers, bakeries, cafes, and community-added homemade snack makers. Unrelated fast-food chains are excluded.</p></div>
  <span class="status-text">${isParent() ? 'Parent Profile' : 'Guest Mode'}</span>
</div>
<div class="card g">
  <div class="row">
    <div style="flex:2;min-width:220px"><label for="lLoc" style="margin-top:0">City, locality or PIN code</label><input id="lLoc" placeholder="e.g. Gurugram, 122002 or Hauz Khas, Delhi" value="${esc(LF.loc)}" onkeydown="if(event.key==='Enter')searchLocal(false)"></div>
    <div><label for="lType" style="margin-top:0">Business / product type</label><select id="lType" onchange="searchLocal(false)"><option value="all">All healthy food places</option><option value="health-organic">Organic &amp; health stores</option><option value="millet-grain">Millet &amp; whole-grain sellers</option><option value="produce-grocery">Fresh produce &amp; groceries</option><option value="bakery">Bakeries</option><option value="cafe">Cafes &amp; juice outlets</option><option value="homemade-biz">Homemade snack businesses</option></select></div>
    <div><label for="lDiet" style="margin-top:0">Dietary tag</label><select id="lDiet" onchange="renderLocalResults()"><option value="all">Any dietary tag</option><option value="Organic">Organic tagged</option><option value="Vegetarian">Vegetarian tagged</option><option value="Vegan">Vegan tagged</option><option value="Gluten-free">Gluten-free tagged</option></select></div>
    <div><label for="lPrice" style="margin-top:0">Price range (community)</label><select id="lPrice" onchange="renderLocalResults()"><option value="all">Any price</option><option value="budget">Budget</option><option value="moderate">Moderate</option><option value="premium">Premium</option></select></div>
  </div>
  <div class="local-presets" aria-label="Quick Indian locations">
    ${LOCAL_PRESETS.map(p => `<button type="button" class="seg-btn" onclick="$('#lLoc').value='${p}';searchLocal(false)">${p}</button>`).join('')}
  </div>
  <div style="display:flex;gap:.55rem;flex-wrap:wrap;margin-top:.75rem">
    <button type="button" class="btn" onclick="searchLocal(false)">Search area</button>
    <button type="button" class="btn l" onclick="useMyLocation()">Use my current location</button>
    <a class="btn l" href="#healthy">Discover healthy snacks</a>
  </div>
  <p id="locStatus" class="mut" style="margin:.65rem 0 0;font-size:.86rem">Directory entries come from OpenStreetMap (community-mapped). Live stock, prices, ingredients and dietary suitability are not independently verified—always confirm directly with the seller.</p>
</div>
<details style="margin-top:1rem"><summary>+ Add a community local healthy shop or homemade snack maker (stored in this browser)</summary>
  <div class="card" style="margin-top:.6rem">
    <p class="mut" style="margin-top:0">Community listings added here are stored locally in your browser and marked clearly as <b>Community listing · Unverified</b>.</p>
    <div class="row">
      <div><label for="clName">Business name *</label><input id="clName" placeholder="e.g. Millet Kitchen Homemade Snacks"></div>
      <div><label for="clCat">Business type</label><select id="clCat"><option value="homemade-biz">Homemade snack business</option><option value="millet-grain">Millet &amp; whole-grain seller</option><option value="health-organic">Organic &amp; health store</option><option value="bakery">Healthy bakery</option><option value="cafe">Healthy outlet / cafe</option><option value="produce-grocery">Fresh produce &amp; farm seller</option></select></div>
      <div><label for="clCity">City / locality / PIN code *</label><input id="clCity" placeholder="e.g. Gurugram 122002"></div>
    </div>
    <div class="row">
      <div style="flex:2"><label for="clAddr">Street address / landmark</label><input id="clAddr" placeholder="e.g. Galleria Market, DLF Phase 4, Gurugram"></div>
      <div><label for="clPrice">Price range (optional)</label><select id="clPrice"><option value="">Not specified</option><option value="budget">Budget</option><option value="moderate">Moderate</option><option value="premium">Premium</option></select></div>
    </div>
    <label for="clProds">Products &amp; specialties (comma separated)</label><input id="clProds" style="width:100%" placeholder="e.g. Roasted ragi chips, jowar puffs, sugar-free laddoo">
    <div class="row">
      <div><label for="clDiet">Dietary notes (optional)</label><input id="clDiet" placeholder="e.g. Vegetarian, Gluten-free options"></div>
      <div><label for="clPhone">Phone / contact (optional)</label><input id="clPhone" placeholder="e.g. +91 98..."></div>
      <div><label for="clWeb">Website or ordering link (optional)</label><input id="clWeb" placeholder="https://..."></div>
    </div>
    <p id="clErr" class="err-line" hidden></p>
    <p style="margin-top:.9rem"><button type="button" class="btn" onclick="addCommunityPlace()">Save community listing</button></p>
  </div>
</details>
<div id="localOut" style="margin-top:1.1rem"></div>`;

window.addCommunityPlace = () => {
  const name = ($('#clName')?.value || '').trim();
  const city = ($('#clCity')?.value || '').trim();
  const addr = ($('#clAddr')?.value || '').trim();
  const web = ($('#clWeb')?.value || '').trim();
  const phone = ($('#clPhone')?.value || '').trim();
  const errEl = $('#clErr');
  const setErr = m => { if (errEl) { errEl.textContent = m; errEl.hidden = false; } };
  if (name.length < 2 || city.length < 2) { setErr('Enter both a business name and a city, locality or PIN code.'); return; }
  if (web && !/^https?:\/\/\S+\.\S+/i.test(web)) { setErr('Website must start with https:// or http:// (or leave blank).'); return; }
  if (phone && !/^[0-9+\-()\s]{6,20}$/.test(phone)) { setErr('Enter a valid phone number (or leave blank).'); return; }
  if (errEl) errEl.hidden = true;
  const cat = $('#clCat')?.value || 'homemade-biz';
  const catLabels = { 'homemade-biz': 'Homemade Snack Business', 'millet-grain': 'Millet & Whole-Grain Seller', 'health-organic': 'Organic / Health Store', bakery: 'Healthy Bakery', cafe: 'Healthy Outlet / Cafe', 'produce-grocery': 'Fresh Produce / Farm Store' };
  const item = {
    id: 'comm-' + Date.now(),
    name,
    city,
    address: addr ? `${addr}, ${city}` : city,
    categoryKey: cat,
    categoryLabel: catLabels[cat] || 'Local Seller',
    products: ($('#clProds')?.value || '').trim(),
    dietTags: ($('#clDiet')?.value || '').split(',').map(x => x.trim()).filter(Boolean),
    priceRange: $('#clPrice')?.value || '',
    phone,
    website: web,
    source: 'Community listing (added in this browser)',
    verified: false,
  };
  S.localListings.unshift(item);
  save();
  toast('Local community listing saved');
  ['clName', 'clCity', 'clAddr', 'clProds', 'clDiet', 'clPhone', 'clWeb'].forEach(id => { if ($('#' + id)) $('#' + id).value = ''; });
  renderLocalResults();
};

window.deleteCommunityPlace = id => {
  S.localListings = S.localListings.filter(x => x.id !== id);
  S.savedPlaces = S.savedPlaces.filter(x => x.id !== id);
  save();
  toast('Community listing removed');
  renderLocalResults();
};

window.useMyLocation = () => {
  const st = $('#locStatus');
  if (!navigator.geolocation) {
    if (st) st.textContent = 'Browser geolocation is not supported here. Enter a city, locality, or PIN code instead.';
    toast('Geolocation unsupported');
    return;
  }
  if (st) st.textContent = 'Requesting your explicit location permission…';
  navigator.geolocation.getCurrentPosition(
    pos => { LF.lat = pos.coords.latitude; LF.lon = pos.coords.longitude; searchLocal(true); },
    err => {
      if (st) st.textContent = 'Location permission was declined or unavailable (' + esc(err.message || 'permission denied') + '). You can search any city or PIN code above.';
      toast('Location not shared');
    },
    { timeout: 8000 }
  );
};

async function browserPhotonSearch(useGeo) {
  let centerLat = LF.lat, centerLon = LF.lon, resolvedLocation = LF.loc;
  if (!useGeo) {
    const qGeo = /\bindia\b/i.test(LF.loc) ? LF.loc : `${LF.loc}, India`;
    const geoRes = await fetch('https://photon.komoot.io/api/?' + new URLSearchParams({ q: qGeo, limit: '1', lang: 'en' }));
    if (!geoRes.ok) throw new Error('Location lookup failed');
    const geoData = await geoRes.json();
    const geo = geoData.features?.[0];
    if (!geo) throw new Error('Location not found');
    const coords = geo.geometry.coordinates;
    centerLon = Number(coords[0]);
    centerLat = Number(coords[1]);
    const gp = geo.properties || {};
    resolvedLocation = [gp.name, gp.city || gp.county, gp.state].filter(Boolean).join(', ') || LF.loc;
  }
  if (!Number.isFinite(centerLat) || !Number.isFinite(centerLon)) throw new Error('Invalid location coordinates');
  LF.lat = centerLat;
  LF.lon = centerLon;
  if (LF.type === 'homemade-biz') return { resolvedLocation, center: { lat: centerLat, lon: centerLon }, source: 'Community browser listings', places: [] };

  const shopTypes = {
    all: ['health_food', 'organic', 'greengrocer', 'farm', 'wholefoods', 'herbalist', 'nuts'],
    'health-organic': ['health_food', 'organic', 'wholefoods', 'herbalist'],
    'millet-grain': ['health_food', 'organic', 'greengrocer', 'farm', 'supermarket'],
    bakery: ['bakery'],
    cafe: [],
    'produce-grocery': ['greengrocer', 'farm', 'supermarket', 'food', 'nuts'],
  };
  const amenityTypes = { all: [], 'health-organic': [], 'millet-grain': [], bakery: [], cafe: ['cafe'], 'produce-grocery': [] };
  const params = new URLSearchParams({ lat: String(centerLat), lon: String(centerLon), radius: '7', limit: '50', lang: 'en' });
  (shopTypes[LF.type] || shopTypes.all).forEach(v => params.append('osm_tag', 'shop:' + v));
  (amenityTypes[LF.type] || []).forEach(v => params.append('osm_tag', 'amenity:' + v));

  const nearbyRes = await fetch('https://photon.komoot.io/reverse?' + params.toString());
  if (!nearbyRes.ok) throw new Error('Nearby search unavailable');
  const nearbyData = await nearbyRes.json();
  const features = Array.isArray(nearbyData.features) ? nearbyData.features : [];
  const seen = new Set();
  const places = [];
  for (const f of features) {
    const p = f.properties || {};
    const coords = f.geometry?.coordinates || [];
    const lon = Number(coords[0]), lat = Number(coords[1]);
    const name = String(p.name || '').trim();
    const osmVal = String(p.osm_value || '').toLowerCase();
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (['fast_food', 'food_court', 'pub', 'bar', 'ice_cream', 'alcohol', 'tobacco'].includes(osmVal)) continue;
    if (FAST_FOOD_CLIENT_RE.test(name)) continue;
    const key = (p.osm_type || 'N') + ':' + (p.osm_id || name + lat + lon);
    if (seen.has(key)) continue;
    seen.add(key);
    const shop = p.osm_key === 'shop';
    const isOrganic = shop && ['organic', 'health_food', 'wholefoods', 'herbalist'].includes(osmVal) || /organic|millet|healthy|nutri|nature|wholefood|satvik|sattvic/i.test(name);
    const categoryKey = isOrganic ? (LF.type === 'millet-grain' ? 'millet-grain' : 'health-organic') : (osmVal === 'bakery' ? 'bakery' : (!shop ? 'cafe' : 'produce-grocery'));
    const priority = isOrganic ? 1 : (categoryKey === 'produce-grocery' ? 2 : 4);
    const categoryLabels = { 'health-organic': 'Organic / Health Store', 'millet-grain': 'Food & Grain Retailer (Stock unverified)', bakery: 'Bakery (Ingredients unverified)', cafe: 'Cafe / Juice Outlet', 'produce-grocery': 'Fresh Produce / Grocery Store' };
    const address = [p.housenumber, p.street, p.district || p.locality, p.city || p.county, p.state, p.postcode].filter(Boolean).join(', ');
    const rad = x => x * Math.PI / 180;
    const dLat = rad(lat - centerLat), dLon = rad(lon - centerLon);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(centerLat)) * Math.cos(rad(lat)) * Math.sin(dLon / 2) ** 2;
    const distanceKm = Number((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
    const osmType = { N: 'node', W: 'way', R: 'relation' }[p.osm_type] || 'node';
    places.push({
      id: key, name, address: address || resolvedLocation, lat, lon, distanceKm, priority,
      categoryKey, categoryLabel: categoryLabels[categoryKey] || 'Food Business',
      phone: '', website: '', openingHours: '', dietTags: [],
      source: 'OpenStreetMap via Photon (community-mapped)', verified: false,
      osmUrl: p.osm_id ? `https://www.openstreetmap.org/${osmType}/${p.osm_id}` : '',
    });
  }
  places.sort((a, b) => (a.priority - b.priority) || (a.distanceKm - b.distanceKm));
  return { resolvedLocation, center: { lat: centerLat, lon: centerLon }, source: 'OpenStreetMap via Photon (live directory)', places: places.slice(0, 20) };
}

window.searchLocal = async (useGeo) => {
  const out = $('#localOut'), st = $('#locStatus');
  if (!out) return;
  LF.type = $('#lType')?.value || 'all';
  if (!useGeo) {
    LF.lat = null;
    LF.lon = null;
    LF.loc = ($('#lLoc')?.value || 'Gurugram, 122002').trim() || 'Gurugram, 122002';
  }
  if (st) st.textContent = 'Searching nearby healthy-food places…';
  out.innerHTML = `<div class="loading-box"><span class="spinner" aria-hidden="true"></span><span>Searching OpenStreetMap directory near ${useGeo ? 'your location' : esc(LF.loc)}…</span></div>`;
  try {
    let payload = null;
    const params = new URLSearchParams({ type: LF.type });
    if (useGeo && LF.lat != null && LF.lon != null) {
      params.set('lat', String(LF.lat));
      params.set('lon', String(LF.lon));
    } else {
      params.set('loc', LF.loc);
    }
    const apiRes = await fetch('/api/local/search?' + params.toString()).catch(() => null);
    if (apiRes && apiRes.ok) {
      payload = await apiRes.json();
    } else {
      payload = await browserPhotonSearch(useGeo);
    }
    LF.lastPayload = payload;
    if (st) st.textContent = 'Showing directory results near: ' + (payload.resolvedLocation || LF.loc) + ' · Stock & dietary suitability are not independently verified.';
    renderLocalResults();
  } catch (e) {
    LF.lastPayload = { places: [], error: e.message };
    if (st) st.textContent = 'Live directory temporarily unavailable (' + esc(e.message || 'network error') + '). Community listings remain available below.';
    renderLocalResults();
  }
};

window.renderLocalResults = () => {
  const out = $('#localOut');
  if (!out) return;
  LF.diet = $('#lDiet')?.value || 'all';
  LF.price = $('#lPrice')?.value || 'all';
  const locQ = (LF.loc || '').toLowerCase().split(',')[0].trim();
  const pins = (LF.loc || '').split(/\D+/).filter(p => p.length === 6);

  const osmPlaces = (LF.lastPayload?.places || []).filter(p => {
    if (LF.type === 'homemade-biz') return false;
    if (LF.diet !== 'all' && !(p.dietTags || []).some(t => t.toLowerCase().includes(LF.diet.toLowerCase()))) return false;
    if (LF.price !== 'all') return false;
    return true;
  });

  const commPlaces = S.localListings.filter(c => {
    if (LF.type !== 'all' && c.categoryKey !== LF.type) return false;
    if (LF.diet !== 'all' && !(c.dietTags || []).some(t => t.toLowerCase().includes(LF.diet.toLowerCase()))) return false;
    if (LF.price !== 'all' && c.priceRange !== LF.price) return false;
    return true;
  }).map(c => {
    const hay = (c.city + ' ' + c.address).toLowerCase();
    const inArea = !locQ || LF.lat != null || hay.includes(locQ) || pins.some(pin => hay.includes(pin));
    return { ...c, _inArea: inArea };
  });

  const allShown = [...commPlaces, ...osmPlaces];
  allShown.forEach(p => { window._placeMap[p.id] = p; });

  out.innerHTML = `${LF.price !== 'all' ? `<div class="note"><b>Price filter active (${esc(LF.price)}):</b> OpenStreetMap directory listings do not provide retail prices, so only community listings that recorded a price range are shown below.</div>` : ''}
  ${LF.diet !== 'all' && !osmPlaces.length ? `<div class="note"><b>Dietary tag filter (${esc(LF.diet)}):</b> OpenStreetMap listings rarely include verified dietary tags; switch Dietary tag to “Any dietary tag” to inspect all nearby directory shops and confirm in store.</div>` : ''}
  ${LF.lastPayload?.error ? `<div class="note"><b>Directory notice:</b> Could not fetch live OpenStreetMap places (${esc(LF.lastPayload.error)}). <button type="button" class="btn s l" style="margin-left:.5rem" onclick="searchLocal(false)">Retry</button></div>` : ''}
  ${commPlaces.length ? `<div class="split-head"><h3>Community Local Listings (${commPlaces.length})</h3><span class="mut" style="font-size:.82rem">User-submitted in this browser · Unverified</span></div><div class="grid">${commPlaces.map(placeCardHTML).join('')}</div>` : ''}
  <div class="split-head"><h3>OpenStreetMap Nearby Directory (${osmPlaces.length})</h3><span class="mut" style="font-size:.82rem">Community-mapped directory · Stock &amp; dietary safety unverified</span></div>
  ${osmPlaces.length ? `<div class="grid">${osmPlaces.map(placeCardHTML).join('')}</div>` : empty(LF.type === 'homemade-biz' ? 'OpenStreetMap does not index home kitchens. Add a homemade snack maker above to track local sellers in this browser.' : 'No OpenStreetMap healthy-food entries matched all active filters for this area. Try selecting “All healthy food places”, clearing Dietary/Price filters, or choosing another city preset above.')}`;
};

const placeCardHTML = p => {
  const saved = isPlaceSaved(p.id);
  const isComm = p.source.includes('Community listing');
  const safeWeb = /^https?:\/\//i.test(p.website || '') ? p.website : '';
  return `<article class="card local-card">
    <div>
      <div class="meta-line" style="margin-bottom:.35rem">
        <span class="${isComm ? 'alert-text' : ''}">${isComm ? 'Community listing · Unverified' : 'OSM Directory · Unverified stock'}</span>
        ${p.distanceKm != null ? `<span aria-hidden="true">·</span><span class="num">${p.distanceKm} km away</span>` : ''}
        ${isComm && p._inArea === false ? `<span aria-hidden="true">·</span><span>Other area</span>` : ''}
      </div>
      <h4 style="margin-bottom:.25rem">${esc(p.name)}</h4>
      <div class="meta-line" style="margin-bottom:.4rem"><span>${esc(p.categoryLabel)}</span>${p.priceRange ? `<span>· Price: ${esc(p.priceRange)}</span>` : ''}</div>
      <p class="mut" style="font-size:.87rem;margin:.2rem 0 .45rem">${esc(p.address)}</p>
      ${p.products ? `<p style="font-size:.86rem;margin:.3rem 0"><b>Listed items:</b> ${esc(p.products)}</p>` : ''}
      ${(p.dietTags || []).length ? `<div class="meta-line" style="margin:.25rem 0">${esc(p.dietTags.join(' · '))}</div>` : ''}
      ${p.phone || safeWeb ? `<div class="meta-line" style="margin-top:.35rem">${p.phone ? `<span>${esc(p.phone)}</span>` : ''}${safeWeb ? `<a href="${esc(safeWeb)}" target="_blank" rel="noopener noreferrer">Website ↗</a>` : ''}</div>` : ''}
    </div>
    <div class="alt-actions">
      <button type="button" class="btn s" onclick="openPlaceModal('${esc(p.id)}')">Explore &amp; checklist</button>
      <button type="button" class="btn s l" onclick="toggleSavePlace(window._placeMap['${esc(p.id)}'],this)">${saved ? 'Saved' : 'Save'}</button>
      ${isComm ? `<button type="button" class="btn s danger" onclick="deleteCommunityPlace('${esc(p.id)}')">Delete</button>` : ''}
    </div>
  </article>`;
};

window.openPlaceModal = id => {
  const p = window._placeMap[id] || S.savedPlaces.find(x => x.id === id) || S.localListings.find(x => x.id === id);
  if (!p) return;
  closeDetailModal();
  const saved = isPlaceSaved(p.id);
  const safeWeb = /^https?:\/\//i.test(p.website || '') ? p.website : '';
  const checklist = LOCAL_CHECKLIST[p.categoryKey] || LOCAL_CHECKLIST['produce-grocery'];
  const w = document.createElement('div');
  w.id = 'detailBackdrop';
  w.className = 'detail-backdrop';
  w.onclick = e => { if (e.target === w) closeDetailModal(); };
  w.innerHTML = `<div class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="plTitle">
    <div class="detail-modal-head">
      <div>
        <div class="meta-line" style="margin-bottom:.35rem"><span>${esc(p.source)} · Unverified stock &amp; dietary safety</span>${p.distanceKm != null ? `<span aria-hidden="true">·</span><span class="num">${p.distanceKm} km away</span>` : ''}</div>
        <h2 id="plTitle" style="margin:0">${esc(p.name)}</h2>
      </div>
      <button type="button" class="btn s l" onclick="closeDetailModal()">Close</button>
    </div>
    <p><b>Category:</b> ${esc(p.categoryLabel)}</p>
    <p><b>Address:</b> ${esc(p.address)}</p>
    ${p.openingHours ? `<p><b>Hours listed in OSM:</b> ${esc(p.openingHours)}</p>` : ''}
    ${p.phone ? `<p><b>Phone:</b> <a href="tel:${esc(p.phone)}">${esc(p.phone)}</a></p>` : ''}
    ${safeWeb ? `<p><b>Website / ordering link:</b> <a href="${esc(safeWeb)}" target="_blank" rel="noopener noreferrer">${esc(safeWeb)} ↗</a></p>` : ''}
    ${p.products ? `<div class="swap-box"><b>Listed Products / Specialties:</b> ${esc(p.products)}${p.priceRange ? ' · Price band: ' + esc(p.priceRange) : ''}</div>` : `<div class="swap-box"><b>Live Product Inventory Not Listed:</b> OpenStreetMap does not store live shop menus, stock, or prices.</div>`}
    <div class="val-box"><b>What to check in person before buying:</b> ${esc(checklist)}</div>
    <div class="snack-actions" style="margin-top:1rem">
      <button type="button" class="btn s" onclick="toggleSavePlace(window._placeMap['${esc(p.id)}']||S.savedPlaces.find(x=>x.id==='${esc(p.id)}'),this)">${saved ? 'Saved place' : 'Save place'}</button>
      ${p.osmUrl ? `<a class="btn s l" href="${esc(p.osmUrl)}" target="_blank" rel="noopener noreferrer">View on OpenStreetMap ↗</a>` : ''}
      <a class="btn s l" href="#scan" onclick="closeDetailModal()">Check packaged labels</a>
      <a class="btn s l" href="#recipes" onclick="closeDetailModal()">Explore recipes</a>
    </div>
  </div>`;
  document.body.appendChild(w);
};
INIT.local = () => {
  if ($('#lType')) $('#lType').value = LF.type;
  searchLocal(false);
};

/* --- Recipe Studio (50 Complete Recipes) --- */
let RF = { q: '', cat: 'all', taste: 'all', prep: 'all', diet: 'all', swap: 'all' };
V.recipes = () => {
  const recs = getRecipes();
  const cats = [...new Set(recs.map(r => r.cat).filter(Boolean))].sort();
  return `<div class="page-head">
    <div><h2>Recipe Studio (${recs.length} Complete Recipes)</h2><p class="mut section-intro" style="margin-bottom:0">Indian healthy snacks, picnic boxes, lunchbox bites, and homemade alternatives to packaged foods—each with exact measured ingredients, step-by-step instructions, allergen notes and substitutions.</p></div>
    <span class="status-text">${isParent() ? 'Parent Profile' : 'Guest Mode'}</span>
  </div>
  <div class="card g">
    <div class="row">
      <div style="flex:2;min-width:210px"><label for="rQ" style="margin-top:0">Search recipes, ingredients or swaps</label><input id="rQ" placeholder="e.g. makhana, ragi, chips, oats, paneer" value="${esc(RF.q)}" oninput="runRecipes()"></div>
      <div><label for="rCat" style="margin-top:0">Category</label><select id="rCat" onchange="runRecipes()"><option value="all">All categories</option>${cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></div>
      <div><label for="rTaste" style="margin-top:0">Taste</label><select id="rTaste" onchange="runRecipes()"><option value="all">Sweet &amp; savoury</option><option value="savoury">Savoury</option><option value="sweet">Sweet</option></select></div>
    </div>
    <div class="row" style="margin-top:.2rem">
      <div><label for="rPrep">Prep &amp; cook time</label><select id="rPrep" onchange="runRecipes()"><option value="all">Any time</option><option value="10">Quick (≤ 10 mins)</option><option value="20">Up to 20 mins</option></select></div>
      <div><label for="rDiet">Dietary compatibility</label><select id="rDiet" onchange="runRecipes()"><option value="all">Any diet</option><option>Vegetarian</option><option>Vegan</option><option>Gluten-free</option><option>Dairy-free</option><option>Nut-free</option></select></div>
      <div><label for="rSwap">Homemade swap for</label><select id="rSwap" onchange="runRecipes()"><option value="all">Any packaged snack</option><option value="chip">Chips, crisps &amp; puffs</option><option value="biscuit">Biscuits, cookies &amp; cakes</option><option value="namkeen">Namkeen, sev &amp; bhujia</option><option value="chocolate">Chocolates, bars &amp; spreads</option><option value="drink">Fizzy drinks &amp; bottled juices</option><option value="fried">Fried fast snacks</option></select></div>
      <div style="flex:0 0 auto"><button type="button" class="btn l" onclick="resetRecipes()">Reset filters</button></div>
    </div>
  </div>
  <div id="recCount" class="mut" style="margin:.9rem 0 .5rem;font-weight:600"></div>
  <div id="recGrid" class="grid"></div>`;
};

window.resetRecipes = () => {
  RF = { q: '', cat: 'all', taste: 'all', prep: 'all', diet: 'all', swap: 'all' };
  if ($('#rQ')) $('#rQ').value = '';
  if ($('#rCat')) $('#rCat').value = 'all';
  if ($('#rTaste')) $('#rTaste').value = 'all';
  if ($('#rPrep')) $('#rPrep').value = 'all';
  if ($('#rDiet')) $('#rDiet').value = 'all';
  if ($('#rSwap')) $('#rSwap').value = 'all';
  runRecipes();
};

window.runRecipes = () => {
  const grid = $('#recGrid'), cnt = $('#recCount');
  if (!grid) return;
  RF = {
    q: ($('#rQ')?.value || '').trim().toLowerCase(),
    cat: $('#rCat')?.value || 'all',
    taste: $('#rTaste')?.value || 'all',
    prep: $('#rPrep')?.value || 'all',
    diet: $('#rDiet')?.value || 'all',
    swap: $('#rSwap')?.value || 'all',
  };
  const all = getRecipes();
  const listOut = all.filter(r => {
    if (RF.cat !== 'all' && r.cat !== RF.cat) return false;
    if (RF.taste !== 'all' && r.t !== RF.taste) return false;
    if (RF.prep === '10' && r.prepMin > 10) return false;
    if (RF.prep === '20' && r.prepMin > 20) return false;
    if (RF.diet !== 'all' && !(r.diet || []).includes(RF.diet)) return false;
    if (RF.swap !== 'all') {
      const sw = (r.swapFor || '').toLowerCase();
      if (RF.swap === 'chip' && !/chip|crisp|puff|nacho|cracker|fry|fries/.test(sw)) return false;
      if (RF.swap === 'biscuit' && !/biscuit|cookie|cake|wafer/.test(sw)) return false;
      if (RF.swap === 'namkeen' && !/namkeen|sev|bhujia|mixture|chivda|peanut/.test(sw)) return false;
      if (RF.swap === 'chocolate' && !/choco|spread|bar|toffee|candy|sweet/.test(sw)) return false;
      if (RF.swap === 'drink' && !/soda|cola|drink|juice|shake/.test(sw)) return false;
      if (RF.swap === 'fried' && !/fried|samosa|pakora|fries|nugget/.test(sw)) return false;
    }
    if (RF.q) {
      const hay = [r.n, r.cat, r.swapFor || '', r.allergens || '', r.subs || '', ...(r.ing || [])].join(' ').toLowerCase();
      if (!hay.includes(RF.q)) return false;
    }
    return true;
  });
  if (cnt) cnt.textContent = `Showing ${listOut.length} of ${all.length} complete recipes`;
  grid.innerHTML = listOut.length ? listOut.map(r => {
    const f = recipeFlags(r), saved = isRecipeSaved(r.id);
    return `<article class="card snack-card">
      ${recipeImgHTML(r)}
      <div class="meta-line" style="margin-bottom:.25rem"><span>${esc(r.cat)}</span><span aria-hidden="true">·</span><span>${esc(r.t)}</span><span aria-hidden="true">·</span><span class="num">${esc(r.prep)}</span></div>
      <h3>${esc(r.n)}</h3>
      ${r.swapFor ? `<p class="mut" style="font-size:.85rem;margin:0 0 .45rem"><b>Homemade swap for:</b> ${esc(r.swapFor)}</p>` : ''}
      <div class="meta-line" style="margin-bottom:.35rem">${esc((r.diet || []).slice(0, 4).join(' · '))}</div>
      <p class="mut" style="font-size:.82rem;margin:.25rem 0 0"><b>Allergens:</b> ${esc(r.allergens)}</p>
      ${f.length ? `<div class="alert-inline warn" style="margin-top:.5rem">Matches Parent Profile checks (<b>${esc(f.join(', '))}</b>)—see substitutions inside recipe.</div>` : ''}
      <div class="snack-actions">
        <button type="button" class="btn s" onclick="openRecipe('${esc(r.id)}')">View recipe &amp; steps</button>
        <button type="button" class="btn s l" onclick="toggleSaveRecipe('${esc(r.id)}',this)">${saved ? 'Saved' : 'Save recipe'}</button>
        ${slotSel(r.n)}
      </div>
    </article>`;
  }).join('') : empty('No recipes matched those filters. Click Reset filters above to browse all ' + all.length + ' recipes.');
};
INIT.recipes = () => {
  if ($('#rCat')) $('#rCat').value = RF.cat;
  if ($('#rTaste')) $('#rTaste').value = RF.taste;
  if ($('#rPrep')) $('#rPrep').value = RF.prep;
  if ($('#rDiet')) $('#rDiet').value = RF.diet;
  if ($('#rSwap')) $('#rSwap').value = RF.swap;
  runRecipes();
};

/* --- Compare --- */
V.compare = () => {
  const P = S.products;
  if (!P.length) {
    return `<div class="page-head"><div><h2>Compare &amp; Understand</h2></div><span class="status-text">${isParent() ? 'Parent Profile' : 'Guest Mode'}</span></div>
    ${empty('No products checked yet. <a href="#scan">Search, scan or enter a product</a> to start comparing labels side by side.')}${glossHTML()}`;
  }
  return `<div class="page-head">
    <div><h2>Compare &amp; Understand</h2><p class="mut" style="margin-bottom:0">Tick two or more products. Bars and neutral value notes compare listed amounts relative to each other—not whether a food is medically suitable.</p></div>
    <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap"><button type="button" class="btn s l" onclick="clearCmp()">Clear selection</button><a class="btn s" href="#scan">+ Add product</a></div>
  </div>
  <div class="card g">
    ${P.map(p => `<label class="cmp-check"><input type="checkbox" ${S.cmp.includes(p.id) ? 'checked' : ''} onchange="togCmp('${esc(p.id)}',this.checked)"> <span><b>${esc(p.name)}</b>${p.brand ? ` <span class="mut">· ${esc(p.brand)}</span>` : ''}${p.qty ? ` <span class="mut">· ${esc(p.qty)}</span>` : ''}</span></label>`).join('')}
  </div>
  <div id="ct" style="margin-top:1rem"></div>${glossHTML()}`;
};
INIT.compare = () => drawCmp();
window.togCmp = (id, on) => { S.cmp = S.cmp.filter(x => x !== id); if (on) S.cmp.push(id); save(); drawCmp(); };
window.clearCmp = () => { S.cmp = []; save(); render(); };
window.setPrice = (id, v) => {
  const p = S.products.find(x => x.id === id);
  if (!p) return;
  if (v === '') { p.price = null; save(); return; }
  const num = Number(v);
  if (isNaN(num) || num < 0) { toast('Price cannot be negative'); return; }
  p.price = num;
  save();
};

function drawCmp() {
  const el = $('#ct');
  if (!el) return;
  const P = S.products.filter(p => S.cmp.includes(p.id));
  if (P.length < 2) {
    el.innerHTML = empty(P.length === 1 ? 'Select at least one more product above (or <a href="#scan">search/scan another product</a>) to compare side by side.' : 'Select at least two products above to compare.');
    return;
  }
  const bases = [...new Set(P.map(nutBasisLabel))];
  const row = (l, f) => `<tr><th>${l}</th>${P.map(f).map(c => `<td>${c}</td>`).join('')}</tr>`;
  const bar = (k, u) => {
    const vals = P.map(p => p.n?.[k]).filter(v => v != null && !isNaN(v));
    const mx = vals.length ? Math.max(...vals) : 0;
    const mn = vals.length ? Math.min(...vals) : 0;
    const hasDiff = vals.length >= 2 && mx > mn;
    return row(NUT.find(r => r[0] === k)[1], p => {
      const v = p.n?.[k];
      let note = '';
      if (hasDiff && v != null && !isNaN(v)) {
        if (v === mn) note = '<span class="cmp-tag low">Lowest listed</span>';
        else if (v === mx) note = '<span class="cmp-tag high">Highest listed</span>';
      }
      return `<div class="cmp-val">${fmt(v, u)} ${note}</div>` + (v != null && !isNaN(v) && mx > 0 ? `<div class="bar-track"><div class="bar2" style="width:${Math.max(4, v / mx * 100)}%"></div></div>` : '');
    });
  };
  el.innerHTML = `${bases.length > 1 ? `<div class="note"><b>Unit basis note:</b> Selected products use different nutrition bases (${esc(bases.join(' vs '))}). Check the Nutrition Basis row before comparing numbers directly.</div>` : ''}
  <div class="card scroll"><table>
    ${row('Product', p => (p.src !== 'Entered by you' && p.img ? `<div style="max-width:110px;margin-bottom:.4rem">${prodImgHTML(p, 'xs')}</div>` : '') + '<b>' + esc(p.name) + '</b>')}
    ${row('Brand', p => esc(p.brand) || '—')}
    ${row('Quantity / pack size', p => esc(p.qty) || '<span class="mut">Not listed</span>')}
    ${row('Nutrition basis', p => `<span class="num">${esc(nutBasisLabel(p))}</span>`)}
    ${row('Price (₹, optional)', p => `<input type="number" min="0" step="1" aria-label="Price in rupees for ${esc(p.name)}" style="width:95px" value="${p.price ?? ''}" onchange="setPrice('${esc(p.id)}',this.value)">`)}
    ${bar('energy', 'kcal')}${bar('sugar', 'g')}${bar('salt', 'g')}${bar('sodium', 'g')}${bar('satfat', 'g')}${bar('fat', 'g')}${bar('carbs', 'g')}${bar('fiber', 'g')}${bar('protein', 'g')}
    ${row('Allergens listed', p => p.all ? esc(p.all) : '<span class="mut">Not listed</span>')}
    ${row('Ingredients', p => p.ing ? esc(p.ing) : '<span class="mut">Not listed</span>')}
    ${row('Profile check words', p => isParent() ? (flags(p.ing + ' ' + p.all, p.name).map(esc).join(', ') || '<span class="mut">None found in available text</span>') : '<span class="mut">Inactive in Guest Mode</span>')}
  </table></div>
  <p class="mut" style="margin-top:.65rem">Missing values mean the data was not listed in Open Food Facts, not that the amount is zero. Always check the physical label.</p>`;
}
const glossHTML = () => `<h2 style="margin-top:2rem">Label terms in simple words</h2><div class="card">${GLOSS.map(g => `<details><summary>${g.t}</summary><p>${g.x}</p></details>`).join('')}</div>`;

/* --- Planner --- */
let clearPlanStep = false;
V.planner = () => {
  const totalItems = SLOTS.reduce((acc, s) => acc + (S.plan[s]?.length || 0), 0);
  const savedChoiceItems = [
    ...S.snacks,
    ...S.savedRecipes.map(id => getRecipes().find(r => r.id === id)?.n).filter(Boolean),
    ...S.savedProdIds.map(id => S.products.find(p => p.id === id)?.name).filter(Boolean),
  ];
  const uniqueSaved = [...new Set(savedChoiceItems)];
  return `<div class="page-head">
    <div><h2>Picnic &amp; Everyday Snack Planner</h2><p class="mut" style="margin-bottom:0">Organise ideas from Healthy Discovery, Recipe Studio, or your own kitchen across school picnics, lunchboxes and weekdays.</p></div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
      <span class="status-text num">${totalItems} planned item${totalItems === 1 ? '' : 's'}</span>
      <button type="button" class="btn s l" onclick="copyPlan()">Copy plan</button>
      <button type="button" id="clrPlanBtn" class="btn s danger" onclick="clearAllPlan()">Clear plan</button>
    </div>
  </div>
  <div class="card g" style="margin-bottom:1.1rem">
    <div class="row">
      <div style="flex:2;min-width:200px">
        <label for="qpItem" style="margin-top:0">${uniqueSaved.length ? 'Quick-add from your Saved Choices or Recipes' : 'Quick-add a snack or recipe'}</label>
        <select id="qpItem">
          <option value="">Choose an item…</option>
          ${uniqueSaved.length ? `<optgroup label="Your Saved Choices">${uniqueSaved.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}</optgroup>` : ''}
          <optgroup label="Popular Homemade Recipes">${getRecipes().slice(0, 15).map(r => `<option value="${esc(r.n)}">${esc(r.n)}</option>`).join('')}</optgroup>
        </select>
      </div>
      <div>
        <label for="qpSlot" style="margin-top:0">Target slot</label>
        <select id="qpSlot">${SLOTS.map(s => `<option>${s}</option>`).join('')}</select>
      </div>
      <div style="flex:0 0 auto"><button type="button" class="btn s" onclick="quickAddPlan()">Add to slot</button></div>
    </div>
  </div>
  <div class="grid">${SLOTS.map(s => {
    const it = S.plan[s] || [];
    return `<div class="card ${s.length > 4 ? 'g' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.5rem">
        <h3 style="margin:0">${s}</h3>
        ${it.length ? `<button type="button" class="link-btn" style="font-size:.82rem" onclick="clearSlot('${s}')">Clear</button>` : ''}
      </div>
      ${it.length ? it.map((x, i) => `<div class="plan-item"><span>${esc(x)}</span><button class="btn s l" aria-label="Remove ${esc(x)}" onclick="rmPlan('${s}',${i})">Remove</button></div>`).join('') : '<p class="mut">Nothing planned yet.</p>'}
      <div class="row" style="margin-top:.75rem"><div><input id="pl-${s.replace(/\W/g, '')}" placeholder="Add your own" onkeydown="if(event.key==='Enter')ownPlan('${s}')"></div><button class="btn s" onclick="ownPlan('${s}')">Add</button></div>
    </div>`;
  }).join('')}</div>`;
};

window.quickAddPlan = () => {
  const item = $('#qpItem')?.value;
  const slot = $('#qpSlot')?.value;
  if (!item) { toast('Choose a snack or recipe first'); return; }
  addPlan(item, slot);
  render();
};
window.rmPlan = (s, i) => { if (S.plan[s]) { S.plan[s].splice(i, 1); save(); render(); } };
window.clearSlot = s => { S.plan[s] = []; save(); render(); toast('Cleared ' + s); };
window.clearAllPlan = () => {
  const b = $('#clrPlanBtn');
  if (!clearPlanStep) {
    clearPlanStep = true;
    if (b) b.textContent = 'Click again to clear all';
    setTimeout(() => { clearPlanStep = false; if ($('#clrPlanBtn')) $('#clrPlanBtn').textContent = 'Clear plan'; }, 3500);
    return;
  }
  clearPlanStep = false;
  S.plan = {};
  save();
  render();
  toast('Snack plan cleared');
};
window.copyPlan = async () => {
  const lines = SLOTS.map(s => (S.plan[s]?.length ? `${s}: ${S.plan[s].join(', ')}` : '')).filter(Boolean);
  if (!lines.length) { toast('Plan is empty'); return; }
  const txt = 'SnackWise Planner\n' + lines.join('\n');
  try { await navigator.clipboard.writeText(txt); toast('Copied snack plan to clipboard'); }
  catch { toast('Copy unavailable in this browser'); }
};
window.ownPlan = s => {
  const el = $('#pl-' + s.replace(/\W/g, ''));
  const val = (el?.value || '').trim();
  if (!val) { toast('Type a snack name first'); return; }
  addPlan(val, s);
  render();
};

/* --- Saved & Parent Notes --- */
V.saved = () => {
  const savedProds = S.savedProdIds.map(id => S.products.find(x => x.id === id)).filter(Boolean);
  const savedRecs = S.savedRecipes.map(id => getRecipes().find(r => r.id === id)).filter(Boolean);
  return `<div class="page-head">
    <div><h2>Saved Choices, Recipes &amp; Parent Notes</h2><p class="mut" style="margin-bottom:0">All saved products, recipes, local places and personal notes stay stored locally in this browser.</p></div>
    <button type="button" class="btn s l" onclick="copySavedSummary()">Copy summary</button>
  </div>
  <div class="split-head"><h3>Saved packaged products &amp; alternatives (${savedProds.length})</h3></div>
  ${savedProds.length ? `<div class="grid">${savedProds.map(p => `<div class="card">${p.src === 'Entered by you' ? '' : prodImgHTML(p, 'xs')}<b>${esc(p.name)}</b><p class="mut" style="margin:.25rem 0 .6rem">${esc(p.brand) || 'Brand not available'}${p.qty ? ' · ' + esc(p.qty) : ''} · ${esc(p.src)}</p><div style="display:flex;gap:.45rem;flex-wrap:wrap"><button class="btn s" onclick="viewProd('${esc(p.id)}')">Inspect</button><button class="btn s l" onclick="S.cmp=[...new Set([...S.cmp,'${esc(p.id)}'])];save();go('compare')">Compare</button><button class="btn s l" onclick="toggleSaveProd('${esc(p.id)}');render()">Remove</button></div></div>`).join('')}</div>` : empty('No saved packaged products or alternatives yet. Save one while <a href="#scan">inspecting a product</a> or from <a href="#healthy">Healthy Discovery</a>.')}

  <div class="split-head"><h3>Saved recipes (${savedRecs.length})</h3></div>
  ${savedRecs.length ? `<div class="grid">${savedRecs.map(r => `<div class="card">${recipeImgHTML(r)}<b>${esc(r.n)}</b><p class="mut" style="margin:.25rem 0 .6rem">${esc(r.prep)} · ${(r.ing || []).length} ingredients</p><div class="snack-actions"><button type="button" class="btn s" onclick="openRecipe('${esc(r.id)}')">Open recipe</button><button type="button" class="btn s l" onclick="toggleSaveRecipe('${esc(r.id)}');render()">Remove</button> ${slotSel(r.n)}</div></div>`).join('')}</div>` : empty('No saved recipes yet. Browse <a href="#recipes">Recipe Studio</a> to save recipes.')}

  <div class="split-head"><h3>Saved local healthy food places (${S.savedPlaces.length})</h3></div>
  ${S.savedPlaces.length ? `<div class="grid">${S.savedPlaces.map(pl => `<div class="card"><b>${esc(pl.name)}</b><p class="mut" style="margin:.25rem 0 .45rem">${esc(pl.categoryLabel)} · ${esc(pl.address)}</p><div style="display:flex;gap:.45rem;flex-wrap:wrap"><button type="button" class="btn s" onclick="openPlaceModal('${esc(pl.id)}')">Details</button>${pl.osmUrl ? `<a class="btn s l" href="${esc(pl.osmUrl)}" target="_blank" rel="noopener noreferrer">Map ↗</a>` : ''}<button type="button" class="btn s l" onclick="rmPlace('${esc(pl.id)}')">Remove</button></div></div>`).join('')}</div>` : empty('No saved local places yet. Explore <a href="#local">Find Healthy Food Near You</a>.')}

  <div class="split-head"><h3>Saved snack ideas (${S.snacks.length})</h3></div>
  ${S.snacks.length ? `<div class="grid">${S.snacks.map((n, i) => `<div class="card"><b>${esc(n)}</b><div class="snack-actions"><button class="btn s l" onclick="rmSnack(${i})">Remove</button> ${slotSel(n)}</div></div>`).join('')}</div>` : empty('No saved ideas yet. Save some from <a href="#discover">Discover</a>.')}

  <div class="split-head"><h3>All explored products (${S.products.length})</h3>${S.products.length ? `<button type="button" class="link-btn" onclick="clearUnstarredProds()">Clear unsaved history</button>` : ''}</div>
  ${S.products.length ? `<div class="grid">${S.products.map(p => `<div class="card">${p.src === 'Entered by you' ? '' : prodImgHTML(p, 'xs')}<b>${esc(p.name)}</b><p class="mut" style="margin:.25rem 0 .6rem">${esc(p.brand) || 'Brand not available'}${p.qty ? ' · ' + esc(p.qty) : ''} · ${esc(p.src)}</p><div style="display:flex;gap:.45rem;flex-wrap:wrap"><button class="btn s" onclick="viewProd('${esc(p.id)}')">View</button><button class="btn s l" onclick="rmProd('${esc(p.id)}')">Remove</button></div></div>`).join('')}</div>` : empty('No products yet. <a href="#scan">Search or scan one</a>.')}

  <div class="split-head"><h3>My parent notes</h3><span id="notesStatus" class="mut" style="font-size:.82rem">${S.notesUpdatedAt ? 'Saved locally · ' + esc(S.notesUpdatedAt) : 'Auto-saved in this browser'}</span></div>
  <div class="card">
    <textarea id="nt" placeholder="Observations, comparison conclusions, what your child liked…" oninput="updateNotes(this.value)">${esc(S.notes)}</textarea>
  </div>`;
};

window.updateNotes = val => {
  S.notes = val;
  S.notesUpdatedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  save();
  const st = $('#notesStatus');
  if (st) st.textContent = 'Saved locally · ' + S.notesUpdatedAt;
};
window.clearUnstarredProds = () => {
  S.products = S.products.filter(p => S.savedProdIds.includes(p.id));
  S.cmp = S.cmp.filter(id => S.products.some(p => p.id === id));
  save();
  render();
  toast('Cleared unsaved product history');
};
window.copySavedSummary = async () => {
  const parts = [];
  const savedProds = S.savedProdIds.map(id => S.products.find(x => x.id === id)?.name).filter(Boolean);
  const savedRecs = S.savedRecipes.map(id => getRecipes().find(r => r.id === id)?.n).filter(Boolean);
  if (savedProds.length) parts.push('Saved Products: ' + savedProds.join(', '));
  if (savedRecs.length) parts.push('Saved Recipes: ' + savedRecs.join(', '));
  if (S.savedPlaces.length) parts.push('Saved Places: ' + S.savedPlaces.map(p => p.name).join(', '));
  if (S.snacks.length) parts.push('Saved Snack Ideas: ' + S.snacks.join(', '));
  if (S.notes.trim()) parts.push('Notes: ' + S.notes.trim());
  if (!parts.length) { toast('Nothing saved yet to copy'); return; }
  try { await navigator.clipboard.writeText('SnackWise Saved Choices\n' + parts.join('\n')); toast('Copied saved summary to clipboard'); }
  catch { toast('Copy unavailable in this browser'); }
};
window.viewProd = id => { activeProdId = id; go('scan'); };
window.rmSnack = i => { S.snacks.splice(i, 1); save(); render(); };
window.rmPlace = id => { S.savedPlaces = S.savedPlaces.filter(x => x.id !== id); save(); render(); };
window.rmProd = id => { S.products = S.products.filter(p => p.id !== id); S.cmp = S.cmp.filter(x => x !== id); S.savedProdIds = S.savedProdIds.filter(x => x !== id); save(); render(); };

/* ===== ROUTER ===== */
const NAV = [
  ['home', 'Home'],
  ['healthy', 'Healthy'],
  ['local', 'Near You'],
  ['recipes', 'Recipes'],
  ['scan', 'Scan'],
  ['compare', 'Compare'],
  ['planner', 'Planner'],
  ['saved', 'Saved'],
];
let cur = '';
function render() {
  const v = cur || location.hash.slice(1) || 'home';
  const key = V[v] ? v : 'home';
  stopScan();
  $('#app').innerHTML = V[key]();
  if (INIT[key]) INIT[key]();
  $('#nav').innerHTML = NAV.map(n => `<a href="#${n[0]}" class="${n[0] === key ? 'on' : ''}" onclick="document.getElementById('nav').classList.remove('open');document.getElementById('menu').setAttribute('aria-expanded','false')">${n[1]}</a>`).join('');
  applyTheme();
  updateModeUI();
  window.scrollTo(0, 0);
}
window.go = v => { cur = v; try { location.hash = v; } catch (e) {} render(); };
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (a) { e.preventDefault(); go(a.getAttribute('href').slice(1)); }
});
window.addEventListener('hashchange', () => { cur = ''; render(); });
render();
