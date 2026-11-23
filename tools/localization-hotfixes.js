import { loadGzJson } from './jsondata.js';

// Set this before loading the generator when a public feed replaces the local snapshot.
export const HOTFIX_DATA_URL = globalThis.FORTNITE_LOCALIZATION_HOTFIX_URL || '/data/hotfixes/current.json';
const requests = new Map();

export function createHotfixLookup(data, { now = Date.now() } = {}) {
  if (data?.schemaVersion !== 1 || !Array.isArray(data.replacements) ||
      !Number.isInteger(data.count) || data.count !== data.replacements.length) {
    throw new Error('Invalid localization hotfix dataset.');
  }
  const checkedAt = Date.parse(data.checkedAt);
  // The collector writes checkedAt only when the snapshot changes, not on every successful poll.
  if (!Number.isFinite(checkedAt) || checkedAt > now + 5 * 60 * 1000) {
    throw new Error('Localization hotfix dataset has an invalid checkedAt date.');
  }

  const byKey = new Map();
  for (const record of data.replacements) {
    if (!record || typeof record.key !== 'string' || !record.key ||
        typeof record.namespace !== 'string' || typeof record.category !== 'string' ||
        !record.localizedStrings || typeof record.localizedStrings !== 'object' ||
        Array.isArray(record.localizedStrings)) {
      throw new Error('Invalid localization hotfix replacement.');
    }
    for (const value of Object.values(record.localizedStrings)) {
      if (typeof value !== 'string') throw new Error('Invalid localization hotfix translation.');
    }
    const records = byKey.get(record.key) || [];
    records.push(record);
    byKey.set(record.key, records);
  }

  return {
    find(field, fallbackKey) {
      const key = field?.Key || fallbackKey;
      if (typeof key !== 'string' || !key) return null;
      const namespace = field?.Namespace ?? field?.namespace;
      const category = field?.Category ?? field?.category;
      const matches = (byKey.get(key) || []).filter(record =>
        (namespace == null || record.namespace === namespace) &&
        (category == null || record.category === category));
      if (!matches.length) return null;
      // Identical duplicate records are harmless; conflicting or distinct matches are ambiguous.
      const first = matches[0];
      if (matches.some(record => record.namespace !== first.namespace ||
          record.category !== first.category ||
          JSON.stringify(record.localizedStrings) !== JSON.stringify(first.localizedStrings))) {
        console.warn(`Ambiguous localization hotfix key ${key}; keeping original localization.`);
        return null;
      }
      return first;
    }
  };
}

export function loadLocalizationHotfixes(url = HOTFIX_DATA_URL) {
  if (!requests.has(url)) {
    requests.set(url, (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return createHotfixLookup(await response.json());
      } catch (error) {
        console.warn(`Localization hotfixes unavailable at ${url}; using original cosmetic data.`, error);
        return null;
      }
    })());
  }
  return requests.get(url);
}

export function hotfixEnglish(lookup, field, fallbackKey, original) {
  const value = lookup?.find(field, fallbackKey)?.localizedStrings.en;
  return typeof value === 'string' && value.trim() ? value : original;
}

export function buildHotfixEntryNames(entries, lookup, keys = {}) {
  const names = new Map();
  if (!lookup) return names;
  for (const entry of entries) {
    const original = entry?.name || entry?.bundle_name;
    if (!(entry?.id || entry?.bundle_id) || !original) continue;
    const name = hotfixEnglish(lookup, keys[entry.path || entry.da_path],
      entry.itemNameKey || entry.bundleNameKey, original);
    if (name !== original) names.set(entry, name);
  }
  return names;
}

export async function loadHotfixEntryNames(entries, dataBasePath = '/data/') {
  const lookup = await loadLocalizationHotfixes();
  if (!lookup) return new Map();
  let keys = {};
  try {
    keys = await loadGzJson(`${dataBasePath}hotfixes/cosmetic-keys.json`);
  } catch (error) {
    console.warn('Cosmetic localization key index unavailable; using keys already in the search index.', error);
  }
  return buildHotfixEntryNames(entries, lookup, keys);
}

export function getHotfixedEntryName(entry, names) {
  return entry && (names.get(entry) || entry.name || entry.bundle_name);
}

export function resolveCosmeticText(props, entryMeta, lookup) {
  const assetName = props.ItemName?.LocalizedString?.trim() || 'Unknown';
  return {
    assetName,
    name: hotfixEnglish(lookup, props.ItemName, entryMeta.itemNameKey, assetName),
    description: hotfixEnglish(lookup, props.ItemDescription, entryMeta.itemDescriptionKey,
      props.ItemDescription?.LocalizedString?.trim() || '')
  };
}

export function applyHotfixLanguages(translations, record) {
  const byLanguage = new Map();
  for (const [lang, value] of Object.entries(record?.localizedStrings || {})) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const normalized = lang.toLowerCase();
    const previous = byLanguage.get(normalized);
    byLanguage.set(normalized, previous && previous !== value ? null : value);
  }
  for (const [lang, value] of byLanguage) {
    if (!value) continue;
    const existing = Object.keys(translations).find(key => key.toLowerCase() === lang);
    translations[existing || lang] = value;
  }
  return translations;
}
