import { loadGzJson } from '../../../tools/jsondata.js';
import { TYPE_MAP } from '../../../tools/utils.js';
import { getCosmeticTranslationSection } from '../../../tools/cosmetic-translations.js';

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

  const entryMeta = index.find(e => e.id && e.id.toLowerCase() === input || e.name && e.name.toLowerCase() === input);
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
  const copyBtn = document.getElementById("copy-btn");
  if (!nameKey && !descriptionKey) {
    output.value = "Couldn't figure out a localization key for both name and description of this cosmetic.";
    copyBtn.disabled = true;
    return;
  }

  output.value = "Getting translations...";
  try {
    const section = await getCosmeticTranslationSection(nameKey, descriptionKey, {
      includeClear: document.getElementById("include-clear")?.checked ?? true
    });
    output.value = section || 'No matching translations found in the local localization files.';
    copyBtn.disabled = !section;
  } catch (error) {
    console.error(error);
    output.value = 'Could not load the local localization files.';
    copyBtn.disabled = true;
  }
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
