import { loadGzJson } from '../../../scripts/pageinfo.js';

const DATA_BASE_PATH = '../../../data/';
let index = [];

// Flag cycling functionality
const flagThumbnails = ["flag-en", "flag-ar", "flag-de", "flag-es", "flag-fr", "flag-it", "flag-ja", "flag-ko", "flag-pl", "flag-pt-BR", "flag-ru", "flag-tr"];
let currentFlagIndex = -1;

function initializeFlagCycling() {
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
  
	const scoredMatches = index
	  .map(e => {
		const name = e.name.toLowerCase();
		const id = e.id.toLowerCase();
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
    const resp = await fetch("https://fortnitecentral.genxgames.gg/api/v1/aes");
    const data = await resp.json();
    const folders = ["SparksCosmetics", "VehicleCosmetics", "Fortnite_locchunk100"];
    if (data.dynamicKeys) {
      data.dynamicKeys.forEach(d => {
        const match = d.name.match(/^pakchunk(\d+)-/);
        if (match) {
          const folderName = `Fortnite_locchunk${match[1]}`;
          if (!folders.includes(folderName)) folders.push(folderName);
        }
      });
    }
    return folders;
  } catch {
    return ["SparksCosmetics", "VehicleCosmetics", "Fortnite_locchunk100"];
  }
}

async function search() {
  const input = document.getElementById("cosmetic-input").value.trim().toLowerCase();
  const output = document.getElementById("output");
  output.value = "";
  if (!input) return;

  const entryMeta = index.find(e => e.id.toLowerCase() === input || e.name.toLowerCase() === input);
  if (!entryMeta) {
    output.value = "Cosmetic not found.";
    return;
  }

  output.value = "Getting translations...";

  try {
    const data = await loadGzJson("../../data/cosmetics/" + entryMeta.path);
    const item = data[0]?.Properties;
    const nameKey = item?.ItemName?.Key;
    const descriptionKey = item?.ItemDescription?.Key;
	
    const folders = await getPakChunkFolders();
    const nameTranslations = {};
    const descriptionTranslations = {};

    for (const folder of folders) {
      try {
        const metaPath = `../../data/localization/${folder}/${folder}.json`;
        const meta = await loadGzJson(metaPath);
        const compiledLangs = Array.isArray(meta.CompiledCultures) ? meta.CompiledCultures : [];

        for (const lang of compiledLangs) {
          const alreadyHasName = nameTranslations[lang] !== undefined;
          const alreadyHasDesc = descriptionKey ? descriptionTranslations[lang] !== undefined : true;

          if (alreadyHasName && alreadyHasDesc) continue;

          const locPath = `../../data/localization/${folder}/${lang}/${folder}.json`;
          try {
            const loc = await loadGzJson(locPath);

            if (!alreadyHasName) {
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
    let lines = ["== Other Languages ==", "{{Cosmetic Translations"];
    
    const nameEn = nameTranslations["en"] || "";
    if (nameEn) lines.push(`|name = ${nameEn}`);
    
    for (const [lang, translation] of Object.entries(nameTranslations)) {
      if (lang === "en") continue; // Skip English as it's already added as |name
      const langKey = lang.toLowerCase().replace("pt-br", "pt-br");
      const translation = nameTranslations[lang] || "";
      lines.push(`|name-${langKey} = ${translation}`);
    }
    
    lines.push("");
    
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

  } catch (e) {
    console.error(e);
    output.value = "Error loading cosmetic data or localization.";
  }
}

// Copy to clipboard function
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

// Initialize when DOM is loaded
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
    initializeFlagCycling();
  } catch (error) {
    console.error('Failed to initialize cosmetic translator:', error);
  }
});
