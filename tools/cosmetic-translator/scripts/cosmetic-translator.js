let index = [];
let jsonCache = {};
let locCache = {};
let pakoLoaded = false;

// Dynamically load pako library
async function loadPako() {
  if (pakoLoaded) return;
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pako@latest/dist/pako.min.js';
    script.onload = () => {
      pakoLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load pako library'));
    document.head.appendChild(script);
  });
}

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

async function loadGzJson(path, cacheObj) {
  if (!cacheObj[path]) {
    await loadPako(); // Ensure pako is loaded before using it
    const resp = await fetch(path + ".gz");
    const buf = await resp.arrayBuffer();
    const decompressed = pako.ungzip(new Uint8Array(buf), { to: "string" });
    cacheObj[path] = JSON.parse(decompressed);
  }
  return cacheObj[path];
}

async function loadIndex() {
  const resp = await fetch('../../data/index.json');
  index = await resp.json();
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
    const data = await loadGzJson("../../data/cosmetics/" + entryMeta.path, jsonCache);
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
          const loc = await loadGzJson(path, locCache);
          
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

  } catch (e) {
    console.error(e);
    output.value = "Error loading cosmetic data or localization.";
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
  try {
    await loadPako(); // Load pako library first
    document.getElementById("cosmeticInput").addEventListener("input", updateSuggestions);
    document.getElementById("cosmeticInput").addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        search();
      }
    });
    document.getElementById("translate-btn").addEventListener("click", search);
    loadIndex();
    initializeFlagCycling();
  } catch (error) {
    console.error('Failed to initialize cosmetic translator:', error);
  }
});
