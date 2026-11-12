import { loadGzJson } from './jsondata.js';

const LOCALIZATION_LANGUAGES = ['ar', 'de', 'en', 'es', 'es-419', 'fr', 'id', 'it', 'ja', 'ko', 'pl', 'pt-BR', 'ru', 'th', 'tr', 'vi', 'zh-Hans', 'zh-Hant'];

async function getLocalizationFolders() {
  try {
    const response = await fetch('/data/localization/index.json');
    if (!response.ok) throw new Error(`Failed to fetch localization index: ${response.status}`);
    const folders = await response.json();
    if (!Array.isArray(folders) || !folders.length) throw new Error('Localization index is empty.');
    return folders.filter(folder => folder !== 'SparksCosmetics' && !folder.startsWith('UEFN'));
  } catch (error) {
    console.warn('Local localization folder index unavailable; trying FortniteAPI:', error);
    const response = await fetch('https://api.fortniteapi.com/v1/aes');
    if (!response.ok) throw new Error(`FortniteAPI AES request failed: ${response.status}`);
    const data = await response.json();
    const folders = [];
    for (const key of data.dynamicKeys || []) {
      const match = key.name?.match(/^pakchunk(\d+)-/);
      if (match) {
        const folder = `Fortnite_locchunk${match[1]}`;
        if (!folders.includes(folder)) folders.push(folder);
      }
    }
    return folders;
  }
}

export async function getCosmeticTranslationSection(nameKey, descriptionKey, { includeClear = false } = {}) {
  if (!nameKey && !descriptionKey) return '';

  const folders = await getLocalizationFolders();
  const nameTranslations = {};
  const descriptionTranslations = {};
  const englishFolders = [];

  for (const folder of folders) {
    try {
      const english = await loadGzJson(`/data/localization/${folder}/en/${folder}.json`);
      englishFolders.push({ folder, strings: english[''] || {} });
    } catch (error) {
      console.warn(`Could not load English localization for ${folder}:`, error);
    }
  }

  const resolveKeys = (key) => new Map(
    key ? englishFolders.filter(({ strings }) => Object.hasOwn(strings, key)).map(({ folder }) => [folder, key]) : []
  );
  const nameKeys = resolveKeys(nameKey);
  const descriptionKeys = resolveKeys(descriptionKey);

  for (const { folder, strings: englishStrings } of englishFolders) {
    const nameLookupKey = nameKeys.get(folder);
    const descriptionLookupKey = descriptionKeys.get(folder);
    if (!nameLookupKey && !descriptionLookupKey) continue;

    await Promise.all(LOCALIZATION_LANGUAGES.map(async (lang) => {
      const alreadyHasName = nameKey ? nameTranslations[lang] !== undefined : true;
      const alreadyHasDesc = descriptionKey ? descriptionTranslations[lang] !== undefined : true;
      if (alreadyHasName && alreadyHasDesc) return;
      try {
        const strings = lang === 'en'
          ? englishStrings
          : (await loadGzJson(`/data/localization/${folder}/${lang}/${folder}.json`))[''] || {};
        if (nameLookupKey && !alreadyHasName && strings[nameLookupKey]) {
          nameTranslations[lang] = strings[nameLookupKey];
        }
        if (descriptionLookupKey && !alreadyHasDesc && strings[descriptionLookupKey]) {
          descriptionTranslations[lang] = strings[descriptionLookupKey];
        }
      } catch {}
    }));
  }

  if (!Object.keys(nameTranslations).length && !Object.keys(descriptionTranslations).length) return '';

  const lines = [];
  if (includeClear) lines.push('{{Clear}}');
  lines.push('== Other Languages ==', '{{Cosmetic Translations');

  if (nameKey) {
    if (nameTranslations.en) lines.push(`|name = ${nameTranslations.en}`);
    for (const [lang, translation] of Object.entries(nameTranslations)) {
      if (lang !== 'en') lines.push(`|name-${lang.toLowerCase()} = ${translation}`);
    }
    if (descriptionKey) lines.push('');
  }

  if (descriptionKey) {
    if (descriptionTranslations.en) lines.push(`|desc = ${descriptionTranslations.en}`);
    for (const [lang, translation] of Object.entries(descriptionTranslations)) {
      if (lang !== 'en') lines.push(`|desc-${lang.toLowerCase()} = ${translation}`);
    }
  }

  lines.push('}}');
  return lines.join('\n');
}
