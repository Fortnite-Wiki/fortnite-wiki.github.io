import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { HOTFIX_DATA_URL, createHotfixLookup, hotfixEnglish, resolveCosmeticText, applyHotfixLanguages, loadLocalizationHotfixes, buildHotfixEntryNames, getHotfixedEntryName } from '../tools/localization-hotfixes.js?v=20261122-hotfix-names';
import { getCosmeticTranslationSection } from '../tools/cosmetic-translations.js';
import { parseReport, applyHotfixedReportNames, buildHotfixChangeEntries } from '../changelog/script.js';

const now = Date.parse('2026-11-22T20:00:00Z');
const record = (key, namespace, category, localizedStrings) => ({
  sourceFile: 'DefaultGame.ini', key, namespace, category,
  nativeCulture: 'en', nativeString: 'Blank', isMinimalPatch: true, localizedStrings
});
const dataset = (...replacements) => ({
  schemaVersion: 1, checkedAt: new Date(now).toISOString(), count: replacements.length, replacements
});

test('English cosmetic name and description use exact localization keys', () => {
  const lookup = createHotfixLookup(dataset(
    record('NAME', '', 'Game', { en: 'Golden Llama Crew', fr: 'Équipe du lama doré' }),
    record('DESC', '', 'Game', { en: 'A golden description.', de: 'Goldene Beschreibung.' })
  ), { now });
  assert.equal(hotfixEnglish(lookup, { Key: 'NAME', Namespace: '', LocalizedString: 'Blank' }, null, 'Blank'), 'Golden Llama Crew');
  assert.equal(hotfixEnglish(lookup, { Key: 'DESC', Namespace: '' }, null, 'Old description'), 'A golden description.');
  assert.equal(hotfixEnglish(lookup, { Key: 'OTHER', Namespace: '', LocalizedString: 'Blank' }, null, 'Blank'), 'Blank');

  const props = {
    ItemName: { Key: 'NAME', Namespace: '', LocalizedString: 'Old name' },
    ItemDescription: { Key: 'DESC', Namespace: '', LocalizedString: 'Old description' }
  };
  assert.deepEqual(resolveCosmeticText(props, { name: 'Old name' }, lookup), {
    assetName: 'Old name', name: 'Golden Llama Crew', description: 'A golden description.'
  });
  assert.deepEqual(resolveCosmeticText(props, { name: 'Old name' }, null), {
    assetName: 'Old name', name: 'Old name', description: 'Old description'
  });
});

test('namespace and category disambiguate duplicate keys; missing metadata does not guess', () => {
  const lookup = createHotfixLookup(dataset(
    record('SAME', 'A', 'Game', { en: 'One' }),
    record('SAME', 'B', 'Game', { en: 'Two' }),
    record('SAME', 'A', 'Other', { en: 'Three' })
  ), { now });
  assert.equal(lookup.find({ Key: 'SAME' }), null);
  assert.equal(lookup.find({ Key: 'SAME', Namespace: 'A' }), null);
  assert.equal(lookup.find({ Key: 'SAME', Namespace: 'A', Category: 'Game' })?.localizedStrings.en, 'One');
  assert.equal(lookup.find({ Key: 'SAME', Namespace: '' }), null);
});

test('conflicting exact duplicates are ignored', () => {
  const lookup = createHotfixLookup(dataset(
    record('SAME', '', 'Game', { en: 'One' }),
    record('SAME', '', 'Game', { en: 'Two' })
  ), { now });
  assert.equal(lookup.find({ Key: 'SAME', Namespace: '', Category: 'Game' }), null);
});

test('hotfix languages overlay only provided values and preserve ordinary translations', () => {
  const base = { en: 'Old name', fr: 'Ancien nom', de: 'Alter Name', 'pt-BR': 'Nome antigo' };
  applyHotfixLanguages(base, record('NAME', '', 'Game', {
    en: 'New name', fr: 'Nouveau nom', 'pt-br': 'Nome novo', es: 'Nombre nuevo'
  }));
  assert.deepEqual(base, {
    en: 'New name', fr: 'Nouveau nom', de: 'Alter Name', 'pt-BR': 'Nome novo', es: 'Nombre nuevo'
  });
});

test('missing English entry keeps the original name', () => {
  const lookup = createHotfixLookup(dataset(record('NAME', '', 'Game', { fr: 'Nouveau nom' })), { now });
  assert.equal(hotfixEnglish(lookup, { Key: 'NAME', Namespace: '' }, null, 'Old name'), 'Old name');
});

test('invalid dates are rejected, but an unchanged snapshot remains usable', () => {
  assert.throws(() => createHotfixLookup({ schemaVersion: 9, count: 0, replacements: [] }, { now }));
  const unchanged = createHotfixLookup(dataset(record('X', '', 'Game', { en: 'Text' })),
    { now: now + 30 * 86400000 });
  assert.equal(unchanged.find({ Key: 'X', Namespace: '' })?.localizedStrings.en, 'Text');
  assert.throws(() => createHotfixLookup({ ...dataset(), checkedAt: 'not-a-date' }, { now }));
  assert.throws(() => createHotfixLookup({ ...dataset(), checkedAt: new Date(now + 3600000).toISOString() }, { now }));
  assert.throws(() => createHotfixLookup({ ...dataset(), count: 1 }, { now }));
});

test('unavailable and malformed requests fail closed and are cached', async () => {
  const oldFetch = globalThis.fetch;
  const oldWarn = console.warn;
  let calls = 0;
  globalThis.fetch = async url => {
    calls++;
    return url === '/missing.json' ? { ok: false, status: 404 } : { ok: true, json: async () => ({}) };
  };
  console.warn = () => {};
  try {
    assert.equal(await loadLocalizationHotfixes('/missing.json'), null);
    assert.equal(await loadLocalizationHotfixes('/missing.json'), null);
    assert.equal(await loadLocalizationHotfixes('/malformed.json'), null);
    assert.equal(calls, 2);
    assert.equal(hotfixEnglish(null, { Key: 'X' }, null, 'Original'), 'Original');
  } finally {
    globalThis.fetch = oldFetch;
    console.warn = oldWarn;
  }
});

test('the real collector snapshot uses the supported schema and finds a cosmetic key', () => {
  const real = JSON.parse(readFileSync(new URL('../data/hotfixes/current.json', import.meta.url), 'utf8'));
  const lookup = createHotfixLookup(real, { now: Date.parse(real.checkedAt) + 3600000 });
  assert.equal(real.count, real.replacements.length);
  assert.equal(lookup.find({ Key: '91F3FB294DD0FBCAB7DD82B3C76EAE3A', Namespace: '' })?.localizedStrings.en,
    'Mechsuit Snowball');
});

test('the search key index resolves Golden Llama Crew without matching the word Blank', () => {
  const real = JSON.parse(readFileSync(new URL('../data/hotfixes/current.json', import.meta.url), 'utf8'));
  const keys = JSON.parse(gunzipSync(readFileSync(new URL('../data/hotfixes/cosmetic-keys.json.gz', import.meta.url))));
  const lookup = createHotfixLookup(real, { now: Date.parse(real.checkedAt) + 3600000 });
  const field = keys['Racing/Skins/Wurst/CarSkin_WurstTreasureHunt01.json'];
  assert.equal(field.Key, '3BEAC37F4C98EE7F10DF5A96A396D636');
  assert.equal(hotfixEnglish(lookup, field, null, 'Blank'), 'Golden Llama Crew');
  assert.equal(hotfixEnglish(lookup, { Key: 'NOT_A_HOTFIX', Namespace: '' }, null, 'Blank'), 'Blank');
  const entry = { id: 'CarSkin_WurstTreasureHunt01', name: 'Blank', path: 'Racing/Skins/Wurst/CarSkin_WurstTreasureHunt01.json' };
  const unrelated = { id: 'Other', name: 'Blank', path: 'other.json' };
  const names = buildHotfixEntryNames([entry, unrelated], lookup, keys);
  assert.equal(getHotfixedEntryName(entry, names), 'Golden Llama Crew');
  assert.equal(getHotfixedEntryName(unrelated, names), 'Blank');
  const report = parseReport('ADDED CarSkin_WurstTreasureHunt01 (Blank)\n\nADDED Other (Blank)\n');
  applyHotfixedReportNames(report, [entry, unrelated], names);
  assert.equal(report[0].title, 'CarSkin_WurstTreasureHunt01 (Golden Llama Crew)');
  assert.equal(report[1].title, 'Other (Blank)');
});

test('bundle names also use their exact saved localization key', () => {
  const keys = JSON.parse(gunzipSync(readFileSync(new URL('../data/hotfixes/cosmetic-keys.json.gz', import.meta.url))));
  const bundlePath = Object.keys(keys).find(path => path.startsWith('DA/'));
  assert.ok(bundlePath);
  const entry = { bundle_id: 'TestBundle', bundle_name: 'Old bundle', da_path: bundlePath };
  const lookup = createHotfixLookup(dataset(record(keys[bundlePath].Key,
    keys[bundlePath].Namespace, 'Game', { en: 'New bundle' })), { now });
  assert.equal(getHotfixedEntryName(entry, buildHotfixEntryNames([entry], lookup, keys)), 'New bundle');
  assert.equal(getHotfixedEntryName(entry, buildHotfixEntryNames([entry], null, keys)), 'Old bundle');
});

test('collector hotfix changes become cosmetic changelog entries', () => {
  const entry = { id: 'CID_Test', name: 'Old name', path: 'Characters/Test.json' };
  const report = {
    changes: [
      { type: 'modified', previous: record('NAME', '', 'Game', { en: 'Old name', fr: 'Ancien' }),
        current: record('NAME', '', 'Game', { en: 'New name', fr: 'Nouveau' }) },
      { type: 'added', current: record('NEW', '', 'Game', { en: 'Added name' }) }
    ]
  };
  const names = new Map([[entry, 'New name']]);
  const changes = buildHotfixChangeEntries(report, [entry], {
    'Characters/Test.json': { Key: 'NAME', Namespace: '' }
  }, names);
  assert.equal(changes[0].status, 'CHANGED');
  assert.equal(changes[0].title, 'CID_Test (New name) [hotfix]');
  assert.deepEqual(changes[0].changes[0], {
    kind: 'changed', text: 'Changed en hotfix', before: 'Old name', after: 'New name'
  });
  assert.equal(changes[1].status, 'ADDED');
  assert.equal(changes[1].changes.length, 0);
});

test('the existing translation section keeps unpatched languages and uses hotfix-only languages', async () => {
  const oldFetch = globalThis.fetch;
  const oldDocument = globalThis.document;
  const oldFflate = globalThis.fflate;
  const base = {
    en: { '': { NAME: 'Old name', DESC: 'Old description' } },
    fr: { '': { NAME: 'Ancien nom', DESC: 'Ancienne description' } },
    de: { '': { NAME: 'Alter Name', DESC: 'Alte Beschreibung' } }
  };
  globalThis.document = {
    createElement: () => ({}),
    head: { appendChild(script) {
      globalThis.fflate = {
        gunzipSync: bytes => new Uint8Array(gunzipSync(bytes)),
        strFromU8: bytes => new TextDecoder().decode(bytes)
      };
      script.onload();
    } }
  };
  globalThis.fetch = async url => {
    if (url === HOTFIX_DATA_URL || url === '/data/hotfixes/current.json') return {
      ok: true,
      json: async () => ({
        schemaVersion: 1, checkedAt: new Date().toISOString(), count: 2,
        replacements: [
          record('NAME', '', 'Game', { en: 'New name', fr: 'Nouveau nom', es: 'Nombre nuevo' }),
          record('DESC', '', 'Game', { en: 'New description', fr: 'Nouvelle description' })
        ]
      })
    };
    if (url === '/data/localization/index.json') return { ok: true, json: async () => ['Fixture'] };
    const match = url.match(/^\/data\/localization\/Fixture\/([^/]+)\/Fixture\.json\.gz$/);
    if (match) return {
      ok: true,
      arrayBuffer: async () => gzipSync(JSON.stringify(base[match[1]] || { '': {} }))
    };
    return { ok: false, status: 404 };
  };
  try {
    const output = await getCosmeticTranslationSection('NAME', 'DESC', {
      useHotfixes: true,
      nameField: { Key: 'NAME', Namespace: '' },
      descriptionField: { Key: 'DESC', Namespace: '' }
    });
    assert.match(output, /\|name = New name/);
    assert.match(output, /\|name-fr = Nouveau nom/);
    assert.match(output, /\|name-es = Nombre nuevo/);
    assert.match(output, /\|name-de = Alter Name/);
    assert.match(output, /\|desc = New description/);
    assert.match(output, /\|desc-fr = Nouvelle description/);
    assert.match(output, /\|desc-de = Alte Beschreibung/);

    const fallback = await getCosmeticTranslationSection('NAME', 'DESC', {
      useHotfixes: true, hotfixUrl: '/missing.json',
      nameField: { Key: 'NAME', Namespace: '' },
      descriptionField: { Key: 'DESC', Namespace: '' }
    });
    assert.match(fallback, /\|name = Old name/);
    assert.match(fallback, /\|name-fr = Ancien nom/);
    assert.match(fallback, /\|desc = Old description/);
    assert.doesNotMatch(fallback, /\|name-es =/);
  } finally {
    globalThis.fetch = oldFetch;
    globalThis.document = oldDocument;
    globalThis.fflate = oldFflate;
  }
});
