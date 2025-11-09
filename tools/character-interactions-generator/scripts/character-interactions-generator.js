import { loadGzJson } from '../../../tools/jsondata.js';
import { SERIES_CONVERSION, getMostUpToDateImage } from '../../../tools/utils.js';

const DATA_BASE_PATH = '../../../data/';

const fileInput = document.getElementById('file-input');
const dropArea = document.getElementById('drop-area');
const clearBtn = document.getElementById('clear-btn');
const output = document.getElementById('output');
const status = document.getElementById('status');
const copyBtn = document.getElementById('copy-btn');
const regenerateBtn = document.getElementById('regenerate-btn');

const characterNameEl = document.getElementById('character-name');

let lastJson = null;

function setStatus(text, type = 'info') {
  if (!status) return;
  status.classList.remove('hidden');
  status.textContent = text;
  status.className = `status ${type}`;
}

function clearStatus() {
  if (!status) return;
  status.classList.add('hidden');
  status.textContent = '';
}

function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const text = reader.result;
            const parsed = JSON.parse(text);
            lastJson = parsed;
            generateMarkup().catch(err => setStatus('Error generating markup: ' + err.message, 'error'));
        } catch (err) {
            lastJson = null;
            output.value = '';
            summary.innerHTML = '';
            setStatus('Invalid JSON: ' + err.message, 'error');
        }
    };
    reader.onerror = () => setStatus('Error reading file.', 'error');
    reader.readAsText(file, 'utf-8');
}


async function generateMarkup() {
    setStatus('Generating markup...', 'loading');
    if (!lastJson) {
        const empty = [];
        empty.push('== Interactions ==');
        empty.push('{{#tag:tabber|Default=');
        empty.push('{{Scrollbox|BoxHeight=340|Content=');
        empty.push('{{Character Interactions');
        empty.push('}}');
        empty.push('}}');
        empty.push('{{!}}-{{!}}Special=');
        empty.push('{{Scrollbox|BoxHeight=340|Content=');
        empty.push('}}');
        empty.push('}}');
        output.value = empty.join('\n');
        copyBtn.disabled = false;
        setStatus('Empty markup generated.', 'success');
        return;
    }

    if (!Array.isArray(lastJson)) {
        setStatus('Invalid JSON structure: expected an array at the root.', 'error');
        return;
    }

    const speech = lastJson.find(o => o.Type === 'Speech_C');
    if (!speech) { setStatus('Could not find a Speech_C node in the JSON.', 'error'); return; }

    const gen = speech.Properties && speech.Properties.GeneralConfig;
    const messages = gen?.ContextualMessages || [];
    const defaultMessage = gen?.DefaultMessage || null;

    let index = [];
    try { index = await loadGzJson(DATA_BASE_PATH + 'index.json'); } catch (e) { console.warn('Could not load index.json.gz', e); }

    function findReqByName(name) {
        if (!Array.isArray(lastJson)) return null;
        return lastJson.find(o => o.Name === name);
    }

    async function resolveCosmeticForAsset(assetPath) {
        // assetPath example: /BRCosmetics/.../CID_005_Athena_Commando_M_Default.CID_005_Athena_Commando_M
        if (!assetPath) return null;
        const parts = assetPath.split('/');
        const last = parts[parts.length - 1] || assetPath;
        const key = last.split('.')[0];

        const entry = (Array.isArray(index) ? index : []).find(e => {
            if (!e) return false;
            if (e.id && typeof e.id === 'string' && e.id.includes(key)) return true;
            if (e.path && typeof e.path === 'string' && e.path.includes(key)) return true;
            if (e.name && typeof e.name === 'string' && e.name.toLowerCase().includes(key.toLowerCase())) return true;
            return false;
        });

        if (!entry) return { name: key, rarity: 'Common' };

        try {
            const data = await loadGzJson(DATA_BASE_PATH + 'cosmetics/' + entry.path);
            const props = data?.[0]?.Properties || {};
            let rarity = props.Rarity?.split("::")?.pop()?.charAt(0).toUpperCase() + 
                         props.Rarity?.split("::")?.pop()?.slice(1).toLowerCase() || "Uncommon";
            // Check for series conversion
            const seriesEntry = (props.DataList || []).find(entry => entry?.Series);
            if (seriesEntry) {
                let series = seriesEntry.Series.ObjectName?.split("'")?.slice(-2)[0];
                rarity = SERIES_CONVERSION[series] || rarity;
            }
            const displayName = entry.name || (props?.ItemName?.Key || key);
            return { name: displayName, rarity };
        } catch (e) {
            return { name: entry.name || key, rarity: entry.rarity || 'Common' };
        }
    }

    const cn = (characterNameEl.value || '').trim();
    const icon = `{{Character Portrait|[[File:${cn} - Outfit - Fortnite.png|85px]]}}`

    const defaultLines = [];
    const specialLines = [];

    if (defaultMessage && defaultMessage.Message) {
        const text = defaultMessage.Message.LocalizedString || defaultMessage.Message.SourceString || '';
        defaultLines.push(buildCharacterInteraction({ title: cn, dialogue: text }));
    }

    for (const msg of messages) {
        const messageText = msg.Message?.LocalizedString || msg.Message?.SourceString || '';
        const reqObjName = msg.ContextRequirements?.[0]?.Requirement?.ObjectName || '';

        if (messageText.trim() === '') continue;

        if (/FortControllerRequirement_HasCID/.test(reqObjName)) {
            const match = reqObjName.match(/\.([^.']+)'?$/) || reqObjName.match(/([^:]+)'$/);
            const reqName = match ? match[1] : null;
            let reqEntry = reqName ? findReqByName(reqName) : null;
            if (!reqEntry) reqEntry = (Array.isArray(lastJson) ? lastJson.find(o => o.Type === 'FortControllerRequirement_HasCID') : null);

            const allowed = reqEntry?.Properties?.AllowedCIDs || [];
            if (allowed.length === 0) {
                specialLines.push(buildCharacterInteraction({ title: 'Outfit Reaction', dialogue: messageText, icon: icon }));
            } else {
                for (const a of allowed) {
                    const assetPath = a.AssetPathName || a;
                    const cos = await resolveCosmeticForAsset(assetPath);
                    const desc = `'''Wearing [[${cos.name}]]'''`;
                    let fileResult = null;
                    try {
                        fileResult = await getMostUpToDateImage(cos.name, 'Outfit');
                    } catch (e) {
                        fileResult = null;
                    }
                    let fileName = '';
                    if (fileResult) {
                        fileName = fileResult.file || `${cos.name} - Outfit - Fortnite.png`;
                    } else {
                        fileName = `${cos.name} - Outfit - Fortnite.png`;
                    }
                    const interaction = `{{${cos.rarity} Rarity|[[File:${fileName}|85px|center]]}}`;
                    specialLines.push(buildCharacterInteraction({ title: 'Outfit Reaction', dialogue: messageText, desc, interaction, icon: icon }));
                }
            }
        } else if (/FortControllerRequirement_IsFirstEverConversationWithNPC/.test(reqObjName)) {
            specialLines.push(buildCharacterInteraction({ title: 'First Encounter', dialogue: messageText, icon: icon }));
        } else {
            defaultLines.push(buildCharacterInteraction({ title: cn, dialogue: messageText, icon: icon }));
        }
    }

    const lines = [];
    lines.push('== Interactions ==');
    lines.push('{{#tag:tabber|Default=');
    lines.push('{{Scrollbox|BoxHeight=340|Content=');

    for (const l of defaultLines) lines.push(l);

    lines.push('}}');
    lines.push('{{!}}-{{!}}Special=');
    lines.push('{{Scrollbox|BoxHeight=340|Content=');
    for (const l of specialLines) lines.push(l);
    lines.push('}}');
    lines.push('}}');

    output.value = lines.join('\n');
    copyBtn.disabled = false;
    setStatus('Markup generated.', 'success');
}

function buildCharacterInteraction({ rarity = 'Common', icon = null, title = '', dialogue = '', interaction = '', desc = '' }) {
    const parts = ['{{Character Interactions'];
    if (rarity) parts.push(`|rarity=${rarity}`);
    if (icon) parts.push(`|icon=${icon}`);
    parts.push(`|title=${title}`);
    parts.push(`|dialogue=${dialogue}`);
    if (interaction) parts.push(`|interaction=${interaction}`);
    if (desc) parts.push(`|desc=${desc}`);
    parts.push('}}');
    return parts.join('\n');
}

['dragenter','dragover','dragleave','drop'].forEach(evt => {
    dropArea.addEventListener(evt, e => e.preventDefault());
});

dropArea.addEventListener('dragover', () => dropArea.classList.add('dragover'));
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover'));
dropArea.addEventListener('drop', e => {
    dropArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files && files[0]) handleFile(files[0]);
});

fileInput.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) handleFile(f);
});

regenerateBtn.addEventListener('click', () => {
    clearStatus();
    generateMarkup().catch(err => setStatus('Error generating markup: ' + err.message, 'error'));
});

clearBtn.addEventListener('click', () => {
    fileInput.value = '';
    output.value = '';
    summary.innerHTML = '';
    lastJson = null;
    copyBtn.disabled = true;
    clearStatus();
});

copyBtn.addEventListener('click', async () => {
    if (!output.value) return;
    try {
        await navigator.clipboard.writeText(output.value);
        setStatus('Copied to clipboard.', 'success');
    } catch (err) {
        setStatus('Copy failed: ' + err.message, 'error');
    }
});

// initial state
clearBtn.click();