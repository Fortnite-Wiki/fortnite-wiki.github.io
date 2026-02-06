import { loadGzJson } from '../../../tools/jsondata.js';
import { TYPE_MAP } from '../../../tools/utils.js';

const DATA_BASE_PATH = '../../../data/';
let index = [];

// Flag cycling functionality
const flagThumbnails = ["flag-en", "flag-ar", "flag-de", "flag-es", "flag-fr", "flag-it", "flag-ja", "flag-ko", "flag-pl", "flag-pt-BR", "flag-ru", "flag-tr"];
let currentFlagIndex = -1;

function initialiseFlagCycling() {
  const headerFlag = document.getElementById("header-flag");
  if (headerFlag && flagThumbnails.length > 0) {
    // Set initial random flag
    currentFlagIndex = Math.floor(Math.random() * flagThumbnails.length);
    headerFlag.src = `/files/images/tool-icons/${flagThumbnails[currentFlagIndex]}.png`;
    
    // Set up cycling
    setInterval(() => {
      let newIdx;
      do {
        newIdx = Math.floor(Math.random() * flagThumbnails.length);
      } while (newIdx === currentFlagIndex && flagThumbnails.length > 1);
      
      currentFlagIndex = newIdx;
      headerFlag.src = `/files/images/tool-icons/${flagThumbnails[newIdx]}.png`;
    }, 3000); // 3s interval
  }
}

async function loadIndex() {
  index = await loadGzJson(DATA_BASE_PATH + 'index.json');
}

function updateSuggestions() {
  const input = document.getElementById("cosmetic-display").value.trim().toLowerCase();
  const sugDiv = document.getElementById("suggestions");
  sugDiv.innerHTML = "";
  if (!input) return;

  const scoredMatches = (Array.isArray(index) ? index : [])
    .filter(e => {
      if (typeof e.bundle_id === 'string' || typeof e.bundle_name === 'string') return false;
      if (typeof e.banner_id === 'string' || typeof e.banner_icon === 'string') return false;
      return e.name && e.id;
    })
    .map(e => {
      const name = (e.name || '').toLowerCase();
      const id = (e.id || '').toLowerCase();
      let score = 0;

      if (name === input) score += 100;
      else if (name.startsWith(input)) score += 75;
      else if (name.includes(input)) score += 50;

      if (id === input) score += 40;
      else if (id.startsWith(input)) score += 25;
      else if (id.includes(input)) score += 10;

      return { entry: e, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  scoredMatches.forEach(({ entry }) => {
    const div = document.createElement("div");
    div.textContent = `${entry.name} (${entry.id})`;
    div.onclick = () => { 
	  document.getElementById("cosmetic-display").value = `${entry.name} (${entry.id})`;
	  document.getElementById("cosmetic-input").value = entry.id;
      sugDiv.innerHTML = ""; 
    };
    sugDiv.appendChild(div);
  });
}

async function getPakChunkFolders() {
  try {
    const resp = await fetch("https://api.fortniteapi.com/v1/aes");
    const data = await resp.json();
    const folders = ["SparksCosmetics", "VehicleCosmetics", "Fortnite_locchunk100", "Fortnite_locchunk30", "Fortnite_locchunk32", "Fortnite_locchunk20"];
    if (data.dynamicKeys) {
      data.dynamicKeys.forEach(d => {
        const match = d.name.match(/^pakchunk(\d+)-/);
        if (match) {
          const folderName = `Fortnite_locchunk${match[1]}`;
          if (!folders.includes(folderName)) folders.push(folderName);
        }
      });
    }
    console.log("Fetching translations from the following folders:", folders);
    return folders;
  } catch {
    return ["SparksCosmetics", "VehicleCosmetics", "Fortnite_locchunk100", "Fortnite_locchunk30", "Fortnite_locchunk32", "Fortnite_locchunk20"];
  }
}

async function search() {
  const input = document.getElementById("cosmetic-input").value.trim().toLowerCase();
  const output = document.getElementById("output");
  output.value = "";
  
  // Check if manual keys are provided
  const manualNameKey = document.getElementById("manual-name-key").value.trim();
  const manualDescKey = document.getElementById("manual-desc-key").value.trim();
  if (manualNameKey || manualDescKey) {
    await translateKeys(manualNameKey || null, manualDescKey || null);
    return;
  }
  
  if (!input) return;

  const entryMeta = index.find(e => e.id.toLowerCase() === input || e.name.toLowerCase() === input);
  if (!entryMeta) {
    output.value = "Cosmetic not found.";
    return;
  }

  output.value = "Getting translations...";

  try {
    let nameKey = null;
    let descriptionKey = null;

    if (entryMeta.path) {
      const data = await loadGzJson("../../data/cosmetics/" + entryMeta.path);
      
      const itemDefData = data.find(dataEntry => dataEntry.Type in TYPE_MAP) || data[0];
      const item = itemDefData?.Properties || {};
      nameKey = item?.ItemName?.Key;
      descriptionKey = item?.ItemDescription?.Key;
    } else {
      nameKey = entryMeta.itemNameKey || null;
      descriptionKey = entryMeta.itemDescriptionKey || null;
    }
	
    await translateKeys(nameKey, descriptionKey);
  } catch (e) {
    console.error(e);
    output.value = "Error loading cosmetic data or localization.";
  }
}

async function translateKeys(nameKey, descriptionKey) {
  const output = document.getElementById("output");
  
  let folders = null;
  if (nameKey || descriptionKey) {
    output.value = "Getting translations...";
    folders = await getPakChunkFolders();
  } else {
    output.value = "Couldn't figure out a localization key for both name and description of this cosmetic.";
    return;
  }
  
  const nameTranslations = {};
  const descriptionTranslations = {};

  for (const folder of folders) {
    try {
      const metaPath = `../../data/localization/${folder}/${folder}.json`;
      const meta = await loadGzJson(metaPath);
      const compiledLangs = Array.isArray(meta.CompiledCultures) ? meta.CompiledCultures : [];

      for (const lang of compiledLangs) {
        const alreadyHasName = nameKey ? nameTranslations[lang] !== undefined : true;
        const alreadyHasDesc = descriptionKey ? descriptionTranslations[lang] !== undefined : true;

        if (alreadyHasName && alreadyHasDesc) continue;

        const locPath = `../../data/localization/${folder}/${lang}/${folder}.json`;
        try {
          const loc = await loadGzJson(locPath);

          if (nameKey && !alreadyHasName) {
            const nameText = loc[""]?.[nameKey];
            if (nameText) nameTranslations[lang] = nameText;
          }

          if (descriptionKey && !alreadyHasDesc) {
            const descText = loc[""]?.[descriptionKey];
            if (descText) descriptionTranslations[lang] = descText;
          }
        } catch {}
      }
    } catch {}
  }

  // Build the Cosmetic Translations output
  const includeClear = document.getElementById("include-clear")?.checked ?? true;
  let lines = [];
  
  if (includeClear) {
    lines.push("{{Clear}}");
  }
  
  lines.push("== Other Languages ==", "{{Cosmetic Translations");
  
  if (nameKey) {
    const nameEn = nameTranslations["en"] || "";
    if (nameEn) lines.push(`|name = ${nameEn}`);
    
    for (const [lang, translation] of Object.entries(nameTranslations)) {
      if (lang === "en") continue; // Skip English as it's already added as |name
      const langKey = lang.toLowerCase().replace("pt-br", "pt-br");
      const translation = nameTranslations[lang] || "";
      lines.push(`|name-${langKey} = ${translation}`);
    }
    
    if (descriptionKey) {
      lines.push("");
    }
  }

  
  if (descriptionKey) {
    const descEn = descriptionTranslations["en"];
    if (descEn) lines.push(`|desc = ${descEn}`);
    
    for (const [lang, translation] of Object.entries(descriptionTranslations)) {
      if (lang === "en") continue; // Skip English as it's already added as |desc
      const langKey = lang.toLowerCase().replace("pt-br", "pt-br");
      lines.push(`|desc-${langKey} = ${translation}`);
    }
  }
  
  lines.push("}}");
  output.value = lines.join("\n");
  
  // Enable copy button
  const copyBtn = document.getElementById("copy-btn");
  copyBtn.disabled = false;
}

async function copyToClipboard() {
  const output = document.getElementById("output");
  const copyBtn = document.getElementById("copy-btn");
  
  try {
    await navigator.clipboard.writeText(output.value);
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    copyBtn.style.backgroundColor = "#28a745";
    
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.style.backgroundColor = "";
    }, 2000);
  } catch (err) {
    // Fallback for older browsers
    output.select();
    document.execCommand('copy');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    copyBtn.style.backgroundColor = "#28a745";
    
    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.style.backgroundColor = "";
    }, 2000);
  }
}

// Initialise when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
  try {
    document.getElementById("cosmetic-display").addEventListener("input", updateSuggestions);
    document.getElementById("cosmetic-display").addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        search();
      }
    });
    document.getElementById("translate-btn").addEventListener("click", search);
    document.getElementById("copy-btn").addEventListener("click", copyToClipboard);
    loadIndex();
    initialiseFlagCycling();
  } catch (error) {
    console.error('Failed to initialise cosmetic translator:', error);
  }
});
