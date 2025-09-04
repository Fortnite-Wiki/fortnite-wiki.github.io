import tools from '../data/tools.js';

const thisToolName = window.location.pathname.replace(/\/tools\/|\/|index\.html|^\./g, '');

/* Add Version Number */
const versionElm = document.querySelector('header .version');
if (versionElm) {
    for (const tool of tools) {
        if (tool.version && tool.id === thisToolName) {
            versionElm.innerText = tool.version;
            break;
        }
    }
}

// Global cache for loaded JSON data
const globalJsonCache = new Map();
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

// Shared loadGzJson function with global cache
export async function loadGzJson(path) {
  const fullPath = path.endsWith('.gz') ? path : path + '.gz';
  
  if (globalJsonCache.has(fullPath)) {
    return globalJsonCache.get(fullPath);
  }
  
  try {
    await loadPako(); // Ensure pako is loaded before using it
    const resp = await fetch(fullPath);
    if (!resp.ok) {
      throw new Error(`Failed to fetch ${fullPath}: ${resp.status}`);
    }
    const buf = await resp.arrayBuffer();
    const decompressed = pako.ungzip(new Uint8Array(buf), { to: "string" });
    const data = JSON.parse(decompressed);
    globalJsonCache.set(fullPath, data);
    return data;
  } catch (error) {
    console.error(`Error loading ${fullPath}:`, error);
    throw error;
  }
}

// Clear cache function for debugging
export function clearGzJsonCache() {
  globalJsonCache.clear();
}