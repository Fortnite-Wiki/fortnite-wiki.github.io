// jsondata.js - shared JSON data loading for generators

let fflatePromise = null;

export function loadFflate() {
  if (fflatePromise) return fflatePromise;

  fflatePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/fflate@0.8.3/umd/index.js';

    script.onload = resolve;
    script.onerror = () => {
      fflatePromise = null;
      reject(new Error('Failed to load fflate library'));
    };

    document.head.appendChild(script);
  });

  return fflatePromise;
}

// Global cache for loaded JSON data
const globalJsonCache = new Map();

export async function loadGzJson(path) {
  const fullPath = path.endsWith('.gz') ? path : path + '.gz';

  if (globalJsonCache.has(fullPath)) {
    return globalJsonCache.get(fullPath);
  }

  try {
    await loadFflate();

    const resp = await fetch(fullPath);

    if (!resp.ok) {
      throw new Error(`Failed to fetch ${fullPath}: ${resp.status}`);
    }

    const compressed = new Uint8Array(await resp.arrayBuffer());
    const data = JSON.parse(fflate.strFromU8(fflate.gunzipSync(compressed)));

    globalJsonCache.set(fullPath, data);
    return data;
  } catch (error) {
    console.error(`Error loading ${fullPath}:`, error);
    throw error;
  }
}
