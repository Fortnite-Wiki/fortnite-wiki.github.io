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
  const input = document.getElementById("cosmeticInput").value.trim().toLowerCase();
  const sugDiv = document.getElementById("suggestions");
  sugDiv.innerHTML = "";
  if (!input) return;

  const matches = index.filter(e => e.name.toLowerCase().includes(input) || e.id.toLowerCase().includes(input));
  matches.slice(0, 10).forEach(e => {
    const div = document.createElement("div");
    div.textContent = `${e.name} (${e.id})`;
    div.onclick = () => { 
      document.getElementById("cosmeticInput").value = e.id; 
      sugDiv.innerHTML = ""; 
    };
    sugDiv.appendChild(div);
  });
}

async function getPakChunkFolders() {
  try {
    const resp = await fetch("https://fortnitecentral.genxgames.gg/api/v1/aes");
    const data = await resp.json();
    const folders = ["Fortnite_locchunk100"];
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
    return ["Fortnite_locchunk100"];
  }
}

async function search() {
  const input = document.getElementById("cosmeticInput").value.trim().toLowerCase();
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
    const nameKey = data[0].Properties.ItemName.Key;
    const descriptionKey = data[0].Properties.ItemDescription?.Key;

    const langs = ["en","ar","de","es","es-419","fr","id","it","ja","ko","pl","pt-BR","ru","th","tr","vi","zh-Hans","zh-Hant"];
    const folders = await getPakChunkFolders();
    
    // Get translations for both name and description
    const nameTranslations = {};
    const descriptionTranslations = {};

    for (const lang of langs) {
      let nameTextFound = false;
      let descTextFound = false;
      
      for (const folder of folders) {
        const path = `../../data/localization/${folder}/${lang}/${folder}.json`;
        try {
          const loc = await loadGzJson(path);
          
          // Get name translation
          if (!nameTextFound) {
            const nameText = loc[""]?.[nameKey];
            if (nameText) {
              nameTranslations[lang] = nameText;
              nameTextFound = true;
            }
          }
          
          // Get description translation if key exists
          if (descriptionKey && !descTextFound) {
            const descText = loc[""]?.[descriptionKey];
            if (descText) {
              descriptionTranslations[lang] = descText;
              descTextFound = true;
            }
          }
          
          if (nameTextFound && (descTextFound || !descriptionKey)) break;
        } catch {}
      }
    }

    // Build the Cosmetic Translations output
    let lines = ["== Other Languages ==", "{{Cosmetic Translations"];
    
    const nameEn = nameTranslations["en"] || "";
    if (nameEn) {
      lines.push(`|name = ${nameEn}`);
    }
    
    for (const lang of langs) {
      if (lang === "en") continue; // Skip English as it's already added as |name
      const langKey = lang === "pt-BR" ? "pt-br" : lang.toLowerCase();
      const translation = nameTranslations[lang] || "";
      if (translation) {
        lines.push(`|name-${langKey} = ${translation}`);
      }
    }
    
    lines.push("");
    
    if (descriptionKey) {
      const descEn = descriptionTranslations["en"] || "";
      if (descEn) {
        lines.push(`|desc = ${descEn}`);
      }
      
      for (const lang of langs) {
        if (lang === "en") continue; // Skip English as it's already added as |desc
        const langKey = lang === "pt-BR" ? "pt-br" : lang.toLowerCase();
        const translation = descriptionTranslations[lang] || "";
        if (translation) {
          lines.push(`|desc-${langKey} = ${translation}`);
        }
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
    document.getElementById("cosmeticInput").addEventListener("input", updateSuggestions);
    document.getElementById("cosmeticInput").addEventListener("keypress", function(e) {
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
