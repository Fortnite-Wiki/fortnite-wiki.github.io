import { loadGzJson } from '../../jsondata.js';

const DATA_BASE_PATH = '../../../data/';
const BASE_URL = 'https://cosmo.fdeb.live.use1a.on.epicgames.com/v1/item';

const TYPE_MAPPINGS = {
	companion_: 'CosmeticMimosa',
	character_: 'AthenaCharacter',
	cid_: 'AthenaCharacter',
	eid_: 'AthenaDance',
	bid_: 'AthenaBackpack',
	backpack_: 'AthenaBackpack',
	pickaxe_: 'AthenaPickaxe',
	glider_: 'AthenaGlider',
	loadingscreen_: 'AthenaLoadingScreen',
	spray_: 'AthenaDance',
	spid_: 'AthenaDance',
	emoticon_: 'AthenaDance',
	musicpack_: 'AthenaMusicPack',
	banner_: 'HomebaseBannerIcon',
	trails_id_: 'AthenaSkyDiveContrail',
	shoes_: 'CosmeticShoes',
	vtid_: 'CosmeticVariantToken',
	sparksaura_: 'SparksAura',
	sparks_drum_: 'SparksDrums',
	carbody_: 'VehicleCosmetics_Body',
	carskin_: 'VehicleCosmetics_Skin',
};

const VARIANT_OPTION_FIELDS = [
	'ParticleOptions',
	'PartOptions',
	'MaterialOptions',
	'MeshOptions',
	'MorphOptions',
	'ColorOptions',
	'TextureOptions',
	'NumericalOptions',
	'ProgressiveStageOptions',
];

let index = [];
let generatedImages = [];
let selectedAsset = null;
let detectedStyleGroups = [];

const elements = {};

async function loadIndex() {
	index = await loadGzJson(DATA_BASE_PATH + 'index.json');
}

function showStatus(message, type = 'loading') {
	if (!elements.status) return;
	elements.status.textContent = message;
	elements.status.className = `status ${type}`;
}

function hideStatus() {
	if (!elements.status) return;
	elements.status.className = 'status hidden';
	elements.status.textContent = '';
}

function scoreMatch(value, input, exactScore, startScore, includeScore) {
	if (!value) return 0;
	const normalized = value.toLowerCase();
	if (normalized === input) return exactScore;
	if (normalized.startsWith(input)) return startScore;
	if (normalized.includes(input)) return includeScore;
	return 0;
}

function getAssetCandidates() {
	if (!Array.isArray(index)) return [];

	return index.flatMap((entry) => {
		const candidates = [];

		if (typeof entry.id === 'string' && typeof entry.name === 'string') {
			candidates.push({
				kind: 'Cosmetic',
				id: entry.id,
				name: entry.name,
				dataPath: entry.path || '',
				dav2Path: entry.dav2 || '',
				dav2Id: getDisplayAssetId(entry.dav2),
			});
		}

		if (typeof entry.bundle_id === 'string' && typeof entry.bundle_name === 'string') {
			candidates.push({
				kind: 'Bundle',
				id: entry.bundle_id,
				name: entry.bundle_name,
				dataPath: '',
				dav2Path: entry.dav2_path || '',
				dav2Id: getDisplayAssetId(entry.dav2_path),
			});
		}

		return candidates;
	});
}

function getDisplayAssetId(path) {
	if (typeof path !== 'string' || !path.trim()) return '';
	const fileName = path.split('/').pop() || '';
	return fileName.replace(/\.json$/i, '');
}

function updateAssetSuggestions() {
	const input = elements.assetDisplay.value.trim().toLowerCase();
	elements.assetId.value = '';
	elements.assetName.value = '';
	elements.assetKind.value = '';
	elements.assetDataPath.value = '';
	elements.assetDav2Path.value = '';
	elements.assetDav2Id.value = '';
	selectedAsset = null;
	clearDetectedStyles('Select an asset to load options.');
	elements.assetSuggestions.innerHTML = '';
	if (!input) return;

	const matches = getAssetCandidates()
		.map((asset) => ({
			asset,
			score:
				scoreMatch(asset.name, input, 100, 75, 50) +
				scoreMatch(asset.id, input, 60, 35, 15),
		}))
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 15);

	for (const { asset } of matches) {
		const div = document.createElement('div');
		const kind = document.createElement('span');
		const label = document.createElement('span');
		kind.className = 'suggestion-kind';
		kind.textContent = asset.kind;
		label.className = 'suggestion-label';
		label.textContent = `${asset.name} (${asset.id})`;
		div.append(kind, label);
		div.addEventListener('click', () => selectAsset(asset));
		elements.assetSuggestions.appendChild(div);
	}
}

async function selectAsset(asset) {
	selectedAsset = asset;
	elements.assetDisplay.value = `${asset.name} (${asset.id})`;
	elements.assetId.value = asset.id;
	elements.assetName.value = asset.name;
	elements.assetKind.value = asset.kind;
	elements.assetDataPath.value = asset.dataPath || '';
	elements.assetDav2Path.value = asset.dav2Path || '';
	elements.assetDav2Id.value = asset.dav2Id || '';
	elements.assetSuggestions.innerHTML = '';
	await loadDetectedStyles();
}

function clearDetectedStyles(message = '') {
	detectedStyleGroups = [];
	if (elements.detectedStyleControls) elements.detectedStyleControls.innerHTML = '';
	if (elements.detectedStyleStatus) elements.detectedStyleStatus.textContent = message;
}

async function loadDetectedStyles() {
	if (!selectedAsset) {
		clearDetectedStyles('Select an asset to load options.');
		return;
	}

	try {
		clearDetectedStyles('Loading options...');
		const imageType = elements.imageType.value;
		detectedStyleGroups = imageType === 'store_image'
			? await loadStoreStyleGroups(selectedAsset)
			: await loadCosmeticStyleGroups(selectedAsset);

		renderDetectedStyleControls();
	} catch (error) {
		clearDetectedStyles(error.message || String(error));
	}
}

async function loadCosmeticStyleGroups(asset) {
	if (asset.kind !== 'Cosmetic') {
		throw new Error('Detected style options are only available for cosmetic images or store images.');
	}

	if (!asset.dataPath) throw new Error('No cosmetic data path was found for this asset.');

	const data = await loadGzJson(`${DATA_BASE_PATH}cosmetics/${asset.dataPath}`);
	const item = Array.isArray(data) ? data.find((entry) => entry?.Name === asset.id) || data[0] : null;
	const variantRefs = item?.Properties?.ItemVariants;
	if (!Array.isArray(variantRefs) || variantRefs.length === 0) {
		return [];
	}

	return variantRefs
		.map((variantRef, channelIndex) => {
			const variant = findVariantObject(data, variantRef);
			const props = variant?.Properties || {};
			const optionField = VARIANT_OPTION_FIELDS.find((field) => Array.isArray(props[field]) && props[field].length > 0);
			const options = optionField ? props[optionField] : [];

			return {
				name: localizedText(props.VariantChannelName) || `Channel ${channelIndex + 1}`,
				options: options.map((option, optionIndex) => ({
					value: optionIndex,
					name: localizedText(option?.VariantName) || `Option ${optionIndex}`,
				})),
			};
		})
		.filter((group) => group.options.length > 0);
}

async function loadStoreStyleGroups(asset) {
	if (!asset.dav2Path) return [];

	const data = await loadGzJson(`${DATA_BASE_PATH}${asset.dav2Path}`);
	const presentations = Array.isArray(data)
		? data.flatMap((entry) => entry?.Properties?.ContextualPresentations || [])
		: [];

	if (!presentations.length) return [];

	return [{
		name: 'Store Image',
		options: presentations.map((presentation, index) => ({
			value: index,
			name: storePresentationName(presentation, index),
		})),
	}];
}

function findVariantObject(data, variantRef) {
	if (!Array.isArray(data) || !variantRef?.ObjectName) return null;
	const match = String(variantRef.ObjectName).match(/:([^']+)'?$/);
	const variantName = match ? match[1] : '';
	return data.find((entry) => entry?.Name === variantName) || null;
}

function localizedText(value) {
	if (!value) return '';
	return value.LocalizedString || value.SourceString || value.CultureInvariantString || '';
}

function storePresentationName(presentation, index) {
	const productTag = presentation?.ProductTag?.TagName || `Option ${index}`;
	return productTag;
}

function renderDetectedStyleControls() {
	elements.detectedStyleControls.innerHTML = '';

	if (!detectedStyleGroups.length) {
		elements.detectedStyleStatus.textContent = 'No detected style options for this asset/image type.';
		return;
	}

	const showAllOptions = elements.styleSource.value === 'detected-all';
	const imageType = elements.imageType.value;
	const generatedCount = getDetectedGeneratedCount(imageType);
	const detectedUnit = isVariantOptionImageType(imageType) || imageType === 'store_image'
		? 'option'
		: 'combination';
	elements.detectedStyleStatus.textContent = showAllOptions
		? `${generatedCount} detected ${detectedUnit}${generatedCount === 1 ? '' : 's'} will be generated.`
		: `${detectedStyleGroups.length} option group${detectedStyleGroups.length === 1 ? '' : 's'} detected.`;

	detectedStyleGroups.forEach((group, groupIndex) => {
		const row = document.createElement('div');
		row.className = 'detected-style-row';

		const label = document.createElement('label');
		label.htmlFor = `detected-style-${groupIndex}`;
		label.textContent = group.name;

		if (showAllOptions) {
			const options = document.createElement('div');
			options.className = 'detected-style-options';

			group.options.forEach((option) => {
				const optionEl = document.createElement('span');
				optionEl.className = 'detected-style-option';
				optionEl.textContent = `${option.value} - ${option.name}`;
				options.appendChild(optionEl);
			});

			row.append(label, options);
		} else {
			const select = document.createElement('select');
			select.id = `detected-style-${groupIndex}`;
			select.dataset.groupIndex = String(groupIndex);
			select.className = 'detected-style-select';

			group.options.forEach((option) => {
				const opt = document.createElement('option');
				opt.value = String(option.value);
				opt.textContent = `${option.value} - ${option.name}`;
				select.appendChild(opt);
			});

			row.append(label, select);
		}
		elements.detectedStyleControls.appendChild(row);
	});
}

function selectedDetectedStyle() {
	if (!detectedStyleGroups.length) return [null];

	return [Array.from(elements.detectedStyleControls.querySelectorAll('.detected-style-select'))
		.map((select) => Number(select.value))];
}

function allDetectedStyles() {
	if (!detectedStyleGroups.length) return [null];
	return cartesianProduct(detectedStyleGroups.map((group) => group.options.map((option) => option.value)));
}

function selectedDetectedOptionStyles() {
	if (!detectedStyleGroups.length) return [null];

	return Array.from(elements.detectedStyleControls.querySelectorAll('.detected-style-select'))
		.map((select) => [Number(select.dataset.groupIndex), Number(select.value)]);
}

function allDetectedOptionStyles() {
	if (!detectedStyleGroups.length) return [null];

	return detectedStyleGroups.flatMap((group, groupIndex) => (
		group.options.map((option) => [groupIndex, option.value])
	));
}

function getDetectedGeneratedCount(imageType) {
	if (!detectedStyleGroups.length) return 0;
	if (isVariantOptionImageType(imageType) || imageType === 'store_image') {
		return detectedStyleGroups.reduce((total, group) => total + group.options.length, 0);
	}

	return detectedStyleGroups.reduce((total, group) => total * group.options.length, 1);
}

function isVariantOptionImageType(imageType) {
	return imageType === 'preview_image';
}

function parseStyleInput(styleInput) {
	const trimmed = styleInput.trim();
	if (!trimmed) return [null];

	if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
		throw new Error('Style array must be enclosed in []');
	}

	const parts = trimmed.slice(1, -1).split(',');
	const values = parts.map((rawPart) => {
		const part = rawPart.trim();
		const match = part.match(/^(\d+)-(\d+)(!([\d,]+))?$/);

		if (!match) {
			const value = Number(part);
			if (!Number.isInteger(value)) throw new Error(`Invalid style value: ${part}`);
			return [value];
		}

		const start = Number(match[1]);
		const end = Number(match[2]);
		const excluded = new Set(
			match[4] ? match[4].split(',').map((value) => Number(value.trim())) : []
		);
		const range = [];

		for (let value = start; value <= end; value++) {
			if (!excluded.has(value)) range.push(value);
		}

		return range;
	});

	return cartesianProduct(values);
}

function cartesianProduct(arrays) {
	return arrays.reduce(
		(acc, values) => acc.flatMap((prefix) => values.map((value) => [...prefix, value])),
		[[]]
	);
}

function getAssetType(assetId, imageType, dav2Id = '') {
	if (imageType === 'store_image') {
		const storeId = dav2Id || (/^dav2_/i.test(assetId) ? assetId : `dav2_${assetId}`);
		return ['AthenaItemShopOfferDisplayData', storeId];
	}

	const baseId = assetId.split('[', 1)[0].toLowerCase();
	for (const [prefix, assetType] of Object.entries(TYPE_MAPPINGS)) {
		if (baseId.startsWith(prefix)) return [assetType, assetId];
	}

	throw new Error(`Unknown cosmetic type for ID: ${assetId}`);
}

function buildPath(assetId, imageType, styleArray, version, dav2Id = '') {
	let [assetType, normalizedId] = getAssetType(assetId, imageType, dav2Id);

	if (normalizedId.includes('[')) {
		const [base, suffix] = normalizedId.split('[', 2);
		normalizedId = `${base.toLowerCase()}[${suffix}`;
	} else {
		normalizedId = normalizedId.toLowerCase();
	}

	let path = `fn/${version}/${assetType}:${normalizedId}/${imageType}`;
	if (styleArray !== null) path += `[${styleArray.join(',')}]`;
	return path;
}

function base64ToBytes(value) {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

function bytesToBase64Url(bytes) {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_');
}

async function makeToken(assetPath, releaseKey) {
	const pathBytes = new TextEncoder().encode(assetPath);
	const keyBytes = base64ToBytes(releaseKey);
	const combined = new Uint8Array(pathBytes.length + keyBytes.length);
	combined.set(pathBytes, 0);
	combined.set(keyBytes, pathBytes.length);

	const hash = await crypto.subtle.digest('SHA-256', combined);
	return bytesToBase64Url(new Uint8Array(hash));
}

async function makeUrl(assetPath, releaseKey) {
	return `${BASE_URL}/${await makeToken(assetPath, releaseKey)}/png`;
}

function styleSuffix(styleArray) {
	return styleArray === null ? '' : `[${styleArray.join(',')}]`;
}

function getFileName(imageType, styleArray) {
	return `${imageType}${styleSuffix(styleArray)}.png`;
}

function getStyleSelections(styleArray, imageType) {
	if (!Array.isArray(styleArray) || !detectedStyleGroups.length) return [];

	if (isVariantOptionImageType(imageType)) {
		const [groupIndex, optionValue] = styleArray;
		const group = detectedStyleGroups[groupIndex];
		const option = group?.options.find((item) => Number(item.value) === Number(optionValue));

		return [{
			groupName: group?.name || `Channel ${groupIndex + 1}`,
			optionName: option?.name || `Option ${optionValue}`,
			value: optionValue,
		}];
	}

	return styleArray.map((value, index) => {
		const group = detectedStyleGroups[index];
		const option = group?.options.find((item) => Number(item.value) === Number(value));

		return {
			groupName: group?.name || `Channel ${index + 1}`,
			optionName: option?.name || `Option ${value}`,
			value,
		};
	});
}

function getStyleLabel(styleArray, imageType) {
	const selections = getStyleSelections(styleArray, imageType);
	if (!selections.length) return styleArray === null ? 'Default' : getFileName('Style', styleArray).replace(/\.png$/, '');
	return selections.map((selection) => `${selection.groupName}: ${selection.optionName}`).join(' | ');
}

async function generateImages() {
	const assetId = elements.assetId.value.trim();
	const imageType = elements.imageType.value;
	const version = elements.version.value.trim();
	const releaseKey = elements.releaseKey.value.trim();
	const dav2Id = elements.assetDav2Id.value.trim();

	if (!assetId) throw new Error('Please select an asset from the search results');
	if (!version) throw new Error('Please enter a version');
	if (!releaseKey) throw new Error('Please enter a release key');

	const styles = getStyleArrays(imageType);
	const images = [];

	for (const style of styles) {
		const path = buildPath(assetId, imageType, style, version, dav2Id);
		images.push({
			assetId,
			imageType,
			style,
			path,
			url: await makeUrl(path, releaseKey),
			fileName: getFileName(imageType, style),
			styleLabel: getStyleLabel(style, imageType),
			styleSelections: getStyleSelections(style, imageType),
		});
	}

	return images;
}

function getStyleArrays(imageType) {
	if (elements.styleSource.value === 'manual') {
		return parseStyleInput(elements.styleArray.value);
	}

	if (isVariantOptionImageType(imageType)) {
		return elements.styleSource.value === 'detected-all'
			? allDetectedOptionStyles()
			: selectedDetectedOptionStyles();
	}

	if (elements.styleSource.value === 'detected-all') {
		return allDetectedStyles();
	}

	return selectedDetectedStyle();
}

function updateStyleSourceUI() {
	const useManual = elements.styleSource.value === 'manual';
	elements.styleArray.closest('.inline-group').style.display = useManual ? 'flex' : 'none';
	elements.detectedStyleBox.style.display = useManual ? 'none' : 'block';
	if (!useManual) renderDetectedStyleControls();
}

function renderOutput(images) {
	elements.output.value = images
		.map((image) => `${image.path}\n${image.url}`)
		.join('\n\n');
}

function renderPreview(images) {
	elements.previewGrid.innerHTML = '';

	for (const image of images) {
		const card = document.createElement('div');
		card.className = 'preview-card';

		const img = document.createElement('img');
		img.src = image.url;
		img.alt = image.styleLabel || image.fileName;
		img.loading = 'lazy';
		img.title = 'Right-click to save this image manually';
		img.addEventListener('error', () => {
			card.classList.add('missing');
			status.textContent = 'Missing';
		});

		const status = document.createElement('span');
		status.className = 'preview-state';
		status.textContent = 'Preview';

		const styleInfo = document.createElement('div');
		styleInfo.className = 'preview-style-list';

		if (image.styleSelections.length) {
			for (const selection of image.styleSelections) {
				const row = document.createElement('div');
				row.className = 'preview-style-row';

				const group = document.createElement('span');
				group.className = 'preview-style-group';
				group.textContent = `${selection.groupName}:`;

				const option = document.createElement('span');
				option.className = 'preview-style-option';
				option.textContent = selection.optionName;

				row.append(group, option);
				styleInfo.appendChild(row);
			}
		} else {
			const name = document.createElement('span');
			name.className = 'preview-name';
			name.textContent = image.styleLabel;
			styleInfo.appendChild(name);
		}

		const path = document.createElement('code');
		path.textContent = image.path;

		const actions = document.createElement('div');
		actions.className = 'preview-actions';

		const open = document.createElement('a');
		open.className = 'sec-subm secondary compact-action';
		open.href = image.url;
		open.target = '_blank';
		open.rel = 'noopener';
		open.textContent = 'Open';

		actions.append(open);
		card.append(status, img, styleInfo, path, actions);
		elements.previewGrid.appendChild(card);
	}
}

async function handleGenerate() {
	try {
		showStatus('Generating URLs...', 'loading');
		generatedImages = await generateImages();
		renderOutput(generatedImages);
		renderPreview(generatedImages);
		showStatus(`Generated ${generatedImages.length} URL${generatedImages.length === 1 ? '' : 's'}.`, 'success');
	} catch (error) {
		generatedImages = [];
		showStatus(error.message || String(error), 'error');
	}
}

function clearAll() {
	generatedImages = [];
	elements.output.value = '';
	elements.previewGrid.innerHTML = '';
	hideStatus();
}

function cacheElements() {
	Object.assign(elements, {
		assetDisplay: document.getElementById('asset-display'),
		assetId: document.getElementById('asset-id'),
		assetName: document.getElementById('asset-name'),
		assetKind: document.getElementById('asset-kind'),
		assetDataPath: document.getElementById('asset-data-path'),
		assetDav2Path: document.getElementById('asset-dav2-path'),
		assetDav2Id: document.getElementById('asset-dav2-id'),
		assetSuggestions: document.getElementById('asset-suggestions'),
		imageType: document.getElementById('image-type'),
		styleArray: document.getElementById('style-array'),
		styleSource: document.getElementById('style-source'),
		detectedStyleBox: document.getElementById('detected-style-box'),
		detectedStyleStatus: document.getElementById('detected-style-status'),
		detectedStyleControls: document.getElementById('detected-style-controls'),
		version: document.getElementById('version'),
		releaseKey: document.getElementById('release-key'),
		generateBtn: document.getElementById('generate-btn'),
		clearBtn: document.getElementById('clear-btn'),
		status: document.getElementById('status'),
		output: document.getElementById('output'),
		previewGrid: document.getElementById('preview-grid'),
	});
}

function setupEvents() {
	elements.assetDisplay.addEventListener('input', updateAssetSuggestions);
	elements.imageType.addEventListener('change', loadDetectedStyles);
	elements.styleSource.addEventListener('change', updateStyleSourceUI);
	elements.generateBtn.addEventListener('click', handleGenerate);
	elements.clearBtn.addEventListener('click', clearAll);

	elements.assetDisplay.addEventListener('keypress', (event) => {
		if (event.key === 'Enter') handleGenerate();
	});

	document.addEventListener('click', (event) => {
		if (!event.target.closest('#asset-display, #asset-suggestions')) {
			elements.assetSuggestions.innerHTML = '';
		}
	});
}

window.addEventListener('DOMContentLoaded', async () => {
	cacheElements();
	setupEvents();
	updateStyleSourceUI();

	try {
		showStatus('Loading data...', 'loading');
		await loadIndex();
		hideStatus();
	} catch (error) {
		showStatus(`Failed to load index data: ${error.message || error}`, 'error');
	}
});
