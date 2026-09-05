import { loadGzJson } from '../../jsondata.js';

const DATA_BASE_PATH = '../../../data/';
const BASE_URL = 'https://cosmo.fdeb.live.use1a.on.epicgames.com/v1/item';
const COSMO_PROXY_URL = 'https://cosmo-proxy.fortnite-wiki-tools.workers.dev/?url=';
const CUSTOM_RELEASE_VALUE = '__custom__';
const MAX_AUTO_COMBINATIONS = 1000;
const MAX_PARALLEL_PREVIEW_LOADS = 6;
const ZIP_DOWNLOAD_TIMEOUT_MS = 10000;
const MIN_DAV2_SEASON = 19;

const RELEASES = [
	{
		version: '42.10',
		key: 's6BZWKurWDx0uXEMiH6NuHgrdhYAYxtDej6OzDZkaGs=',
		label: '42.10 - Latest',
	},
	{
		version: '42.00',
		key: 'x7SL9QH7uQccGqpounh26Jz4x+ugIx0fsl+Wf+EpVKQ=',
		label: '42.00',
	},
	{
		version: '41.30',
		key: 'OE4VTg8RVeDrg28sI23J6cClN+ROG0fVeEJTy6+lAnI=',
		label: '41.30',
	},
	{
		version: '41.20',
		key: 'fYm7gPh1KVzF1iWkD1rqGQBhAb7FHmJO4CNBCfYlZBk=',
		label: '41.20',
	},
	{
		version: '41.10',
		key: 'vHckCP9oI+pW5prHTYaMbXiC1YVJ2w4yRBtGUQzmYMY=',
		label: '41.10',
	},
	{
		version: '41.00',
		key: 'BhmLB0jhpLStVemxcXODVXCbCdmAVHozdTbrG4+R+4E=',
		label: '41.00',
	},
	{
		version: '40.41',
		key: 'N9X0xYQZe74po4fNeCQxwTTGlKVpTzjr9QE1E8SMrEU=',
		label: '40.41',
	},
	{
		version: '40.40',
		key: 'otRg6EEDUM+ZE9v5GZzq+dX8AklDcUb6NY0YI9lyNJU=',
		label: '40.40',
	},
];

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
	sparks_bass_: 'SparksBass',
	sparks_drum_: 'SparksDrums',
	sparks_guitar_: 'SparksGuitar',
	sparks_keytar_: 'SparksKeyboard',
	sparks_mic_: 'SparksMic',
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
	'GenericPropertyOptions',
	'ContextualAnimSceneEmoteOptions',
	'AdditivePoseOptions',
	'Variants',
];

const SPARKS_INSTRUMENT_TYPES = {
	bass: 'SparksBass',
	drum: 'SparksDrums',
	drumkit: 'SparksDrums',
	guitar: 'SparksGuitar',
	keytar: 'SparksKeyboard',
	mic: 'SparksMic',
};

const ZIP_ASSET_TYPE_LABELS = [
	[/^bundle_/i, 'Bundle'],
	[/^(character_|cid_)/i, 'Outfit'],
	[/^(bid_|backpack_)/i, 'Back Bling'],
	[/^pickaxe_/i, 'Pickaxe'],
	[/^glider_/i, 'Glider'],
	[/^(eid_|spray_|spid_|emoticon_)/i, 'Emote'],
	[/^musicpack_/i, 'Music'],
	[/^loadingscreen_/i, 'Loading Screen'],
	[/^banner_/i, 'Banner'],
	[/^trails_id_/i, 'Contrail'],
	[/^shoes_/i, 'Kicks'],
	[/^companion_/i, 'Companion'],
	[/^sparks_bass_/i, 'Bass'],
	[/^sparks_drum_/i, 'Drums'],
	[/^sparks_guitar_/i, 'Guitar'],
	[/^sparks_keytar_/i, 'Keytar'],
	[/^sparks_mic_/i, 'Microphone'],
	[/^sparksaura_/i, 'Aura'],
	[/^carbody_/i, 'Car Body'],
	[/^carskin_/i, 'Car Decal'],
];

const ZIP_IMAGE_TYPE_LABELS = {
	locker_preview_image: 'Locker Preview',
	preview_image: 'Preview',
	preview_permutation_image: 'Preview Permutation',
	store_image: 'Store',
};

let index = [];
let latestDav2Paths = new Map();
let generatedImages = [];
let selectedAsset = null;
let detectedStyleGroups = [];
let previewLoadRun = 0;

const elements = {};

async function loadIndex() {
	index = await loadGzJson(DATA_BASE_PATH + 'index.json');
	latestDav2Paths = buildLatestDav2PathMap(index);
}

function buildLatestDav2PathMap(entries) {
	const map = new Map();
	if (!Array.isArray(entries)) return map;

	for (const entry of entries) {
		for (const path of [entry?.dav2, entry?.dav2_path]) {
			const dav2Id = getDisplayAssetId(path);
			if (!dav2Id) continue;

			const key = dav2Id.toLowerCase();
			const season = getDav2Season(path);
			const existing = map.get(key);
			if (!existing || season > existing.season) {
				map.set(key, { path, season });
			}
		}
	}

	return map;
}

function getLatestDav2Path(path) {
	const dav2Id = getDisplayAssetId(path);
	if (!dav2Id) return path || '';
	return latestDav2Paths.get(dav2Id.toLowerCase())?.path || path || '';
}

function getDav2Season(path) {
	const match = String(path || '').match(/\/S(\d+)\//i);
	return match ? Number(match[1]) : -1;
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
			const dav2Path = getLatestDav2Path(entry.dav2);
			candidates.push({
				kind: 'Cosmetic',
				id: entry.id,
				name: entry.name,
				dataPath: entry.path || '',
				dav2Path,
				dav2Id: getDisplayAssetId(dav2Path) || getPrimaryDisplayAssetId(entry.id),
			});
		}

		if (typeof entry.bundle_id === 'string' && typeof entry.bundle_name === 'string') {
			const dav2Path = getLatestDav2Path(entry.dav2_path);
			candidates.push({
				kind: 'Bundle',
				id: entry.bundle_id,
				name: entry.bundle_name,
				dataPath: '',
				dav2Path,
				dav2Id: getDisplayAssetId(dav2Path),
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
	applyAssetMode();
	clearDetectedStyles('Select an asset to load options, or generate a custom ID without detected styles.');
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
	applyAssetMode(asset);
	await loadDetectedStyles();
}

function applyAssetMode(asset = selectedAsset) {
	const isBundle = asset?.kind === 'Bundle';
	const isCompanion = asset?.kind === 'Cosmetic' && isCompanionAssetId(asset.id);

	elements.imageType.disabled = isBundle;
	if (isBundle) elements.imageType.value = 'store_image';

	elements.checkLargeStyleSets.checked = isCompanion;
	elements.checkLargeStyleSets.disabled = isCompanion;
}

function clearDetectedStyles(message = '') {
	detectedStyleGroups = [];
	if (elements.detectedStyleControls) elements.detectedStyleControls.innerHTML = '';
	if (elements.detectedStyleStatus) elements.detectedStyleStatus.textContent = message;
}

async function loadDetectedStyles() {
	if (!selectedAsset) {
		clearDetectedStyles('Select an asset to load options, or generate a custom ID without detected styles.');
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

	const styleGroups = await Promise.all(variantRefs
		.map(async (variantRef, channelIndex) => {
			const variant = findVariantObject(data, variantRef);
			const props = variant?.Properties || {};
			const optionInfo = await getVariantOptionInfo(props);
			const name = localizedText(props.VariantChannelName) || friendlyVariantType(variant?.Type) || `Channel ${channelIndex + 1}`;
			return {
				channelIndex,
				name,
				tagName: props.VariantChannelTag?.TagName || '',
				optionSource: optionInfo.source,
				options: optionInfo.options,
			};
		}));

	return styleGroups.filter((group) => !isUnsupportedCosmoStyleGroup(group));
}

async function loadStoreStyleGroups(asset) {
	const displayAsset = await loadDisplayAssetData(asset);
	if (!displayAsset) return [];

	const presentations = Array.isArray(displayAsset.data)
		? displayAsset.data.flatMap((entry) => entry?.Properties?.ContextualPresentations || [])
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

async function loadDisplayAssetData(asset) {
	if (asset.dav2Path) {
		return {
			path: asset.dav2Path,
			id: getDisplayAssetId(asset.dav2Path),
			data: await loadGzJson(`${DATA_BASE_PATH}${asset.dav2Path}`),
		};
	}

	const ids = uniqueStrings([
		asset.dav2Id,
		...getDisplayAssetIdCandidates(asset.id),
	]);

	for (const id of ids) {
		const indexedPath = getLatestDav2Path(`${id}.json`);
		const paths = uniqueStrings([
			indexedPath,
			...getDisplayAssetPathCandidates(id),
		]);

		for (const path of paths) {
			if (!path || !(await dataFileExists(`${DATA_BASE_PATH}${path}`))) continue;

			const data = await loadGzJson(`${DATA_BASE_PATH}${path}`);
			asset.dav2Path = path;
			asset.dav2Id = id;
			if (asset === selectedAsset) {
				elements.assetDav2Path.value = path;
				elements.assetDav2Id.value = id;
			}
			return { path, id, data };
		}
	}

	return null;
}

function getPrimaryDisplayAssetId(assetId) {
	return getDisplayAssetIdCandidates(assetId)[0] || '';
}

function getDisplayAssetIdCandidates(assetId) {
	if (typeof assetId !== 'string' || !assetId.trim()) return [];
	if (/^dav2_/i.test(assetId)) return [assetId];

	const ids = [`DAv2_${assetId}`];
	const festivalMatch = assetId.match(/^Sparks_(Bass|Drum|DrumKit|Guitar|Keytar|Mic)_(.+)$/i);
	if (festivalMatch) {
		const instrument = festivalMatch[1];
		const baseId = festivalMatch[2];
		const instruments = /^Drum/i.test(instrument) ? ['Drum', 'DrumKit'] : [instrument];
		for (const itemInstrument of instruments) {
			ids.unshift(`DAv2_Sparks_${baseId}_${itemInstrument}`);
		}
	}

	const festivalSuffixMatch = assetId.match(/^Sparks_(.+)_(Bass|Drum|DrumKit|Guitar|Keytar|Mic)$/i);
	if (festivalSuffixMatch) {
		const baseId = festivalSuffixMatch[1];
		const instrument = festivalSuffixMatch[2];
		const instruments = /^Drum/i.test(instrument) ? ['Drum', 'DrumKit'] : [instrument];
		for (const itemInstrument of instruments) {
			ids.unshift(`DAv2_Sparks_${baseId}_${itemInstrument}`);
			ids.push(`DAv2_Sparks_${itemInstrument}_${baseId}`);
		}
	}

	return uniqueStrings(ids);
}

function getDisplayAssetPathCandidates(dav2Id) {
	const fileName = `${dav2Id}.json`;
	const paths = [];
	for (let season = getLatestReleaseSeason(); season >= MIN_DAV2_SEASON; season--) {
		paths.push(`DAv2/S${season}/${fileName}`);
	}
	paths.push(`DAv2/${fileName}`);
	return paths;
}

function getLatestReleaseSeason() {
	const season = Number.parseInt(RELEASES[0].version.split('.')[0], 10);
	return Number.isFinite(season) ? season : 42;
}

async function dataFileExists(path) {
	try {
		const response = await fetch(path.endsWith('.gz') ? path : `${path}.gz`, { method: 'HEAD' });
		return response.ok;
	} catch {
		return false;
	}
}

function uniqueStrings(values) {
	const seen = new Set();
	return values.filter((value) => {
		if (!value || seen.has(value)) return false;
		seen.add(value);
		return true;
	});
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

async function getVariantOptionInfo(props) {
	const optionField = VARIANT_OPTION_FIELDS.find((field) => Array.isArray(props[field]) && props[field].length > 0);
	if (optionField) {
		return {
			source: optionField,
			options: props[optionField].map((option, optionIndex) => ({
				value: optionIndex,
				name: localizedText(option?.VariantName) || localizedText(option?.ColorName) || option?.Name || `Option ${optionIndex}`,
			})),
		};
	}

	if (Array.isArray(props.BakedSwatchColors) && props.BakedSwatchColors.length > 0) {
		const namedSwatches = await loadColorSwatchChoices(props);
		return {
			source: 'BakedSwatchColors',
			options: props.BakedSwatchColors.map((swatch, optionIndex) => ({
				value: optionIndex,
				name: colorSwatchChoiceName(swatch, namedSwatches, optionIndex),
			})),
		};
	}

	const materialParameterChoices = await loadMaterialParameterSetChoices(props);
	if (materialParameterChoices.length > 0) {
		return {
			source: 'MaterialParameterSetChoices',
			options: materialParameterChoices.map((choice, optionIndex) => ({
				value: optionIndex,
				name: localizedText(choice?.DisplayName) || choice?.CustomizationVariantTag?.TagName?.split('.').pop() || `Color ${optionIndex}`,
			})),
		};
	}

	if (Array.isArray(props.LoadoutAugmentations) && props.LoadoutAugmentations.length > 0) {
		return {
			source: 'LoadoutAugmentations',
			options: props.LoadoutAugmentations.map((option, optionIndex) => ({
				value: optionIndex,
				name: localizedText(option?.VariantName) || loadoutItemName(option?.LoadoutItem) || `Option ${optionIndex}`,
			})),
		};
	}

	return {
		source: 'Default',
		options: [{
			value: 0,
			name: 'Default',
		}],
	};
}

async function loadMaterialParameterSetChoices(props) {
	const ref = props.InlineVariant?.MaterialParameterSetChoices;
	if (!ref?.ObjectPath) return [];

	const localPath = materialParameterSetDataPath(ref.ObjectPath);
	if (!localPath) return [];

	try {
		const data = await loadGzJson(localPath);
		const objectName = ref.ObjectName ? String(ref.ObjectName).match(/'([^']+)'/)?.[1] : '';
		const entry = Array.isArray(data)
			? data.find((item) => item?.Name === objectName) || data[0]
			: null;
		return Array.isArray(entry?.Properties?.Choices) ? entry.Properties.Choices : [];
	} catch {
		return [];
	}
}

async function loadColorSwatchChoices(props) {
	const ref = props.InlineVariant?.RichColorVar?.ColorSwatchForChoices;
	if (!ref?.AssetPathName) return [];

	for (const localPath of colorSwatchDataPaths(ref.AssetPathName)) {
		try {
			const data = await loadGzJson(localPath);
			const objectName = ref.AssetPathName.split('.').pop() || '';
			const entry = Array.isArray(data)
				? data.find((item) => item?.Name === objectName) || data[0]
				: null;
			const colorPairs = entry?.Properties?.ColorPairs;
			if (!Array.isArray(colorPairs)) continue;

			return colorPairs.map((pair) => ({
				name: localizedText(pair?.ColorDisplayName) || pair?.ColorName || (pair?.ColorValue?.Hex ? `#${pair.ColorValue.Hex}` : ''),
				hex: pair?.ColorValue?.Hex || '',
			}));
		} catch {
			continue;
		}
	}

	return [];
}

function materialParameterSetDataPath(objectPath) {
	const parts = String(objectPath).split('/').filter(Boolean);
	const folderIndex = parts.findIndex((part) => part === 'MaterialParameterSets');
	if (folderIndex < 1 || folderIndex >= parts.length - 1) return '';

	const companionFolder = parts[folderIndex - 1];
	const fileName = parts[folderIndex + 1].replace(/\.\d+$/, '');
	if (!companionFolder || !fileName) return '';

	return `${DATA_BASE_PATH}cosmetics/Companions/MaterialParameterSets/${companionFolder}/${fileName}.json`;
}

function colorSwatchDataPaths(assetPathName) {
	const [objectPath] = String(assetPathName).split('.');
	const parts = objectPath.split('/').filter(Boolean);
	const folderIndex = parts.findIndex((part) => part === 'ColorSwatches');
	if (folderIndex < 0 || folderIndex >= parts.length - 1) return [];

	const fileName = parts[parts.length - 1];
	if (!fileName) return [];

	const paths = [];
	const companionFolder = parts[folderIndex - 1];
	if (companionFolder && companionFolder !== fileName) {
		paths.push(`${DATA_BASE_PATH}cosmetics/Companions/ColorSwatches/${companionFolder}/${fileName}.json`);
	}

	paths.push(`${DATA_BASE_PATH}cosmetics/Characters/ColorSwatches/${fileName}.json`);

	return paths;
}

function colorSwatchChoiceName(swatch, namedSwatches, optionIndex) {
	const swatchHex = swatch?.Hex || '';
	const hexMatch = namedSwatches.find((choice) => choice.hex && choice.hex.toLowerCase() === swatchHex.toLowerCase());
	return namedSwatches[optionIndex]?.name || hexMatch?.name || (swatchHex ? `#${swatchHex}` : `Color ${optionIndex}`);
}

function isUnsupportedCosmoStyleGroup(group) {
	return group.optionSource === 'GenericPropertyOptions' || /lego/i.test(group.name);
}

function friendlyVariantType(type) {
	if (typeof type !== 'string' || !type) return '';

	return type
		.replace(/^FortCosmetic/, '')
		.replace(/Variant$/, '')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.trim();
}

function loadoutItemName(loadoutItem) {
	const assetPath = loadoutItem?.AssetPathName;
	if (typeof assetPath !== 'string' || !assetPath) return '';
	return assetPath.split('.').pop() || '';
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
	const detectedUnit = usesVariantOptionStyleFormat(imageType) || imageType === 'store_image'
		? 'option'
		: 'combination';
	if (showAllOptions && shouldUseDefaultOnlyForLargeCombos(imageType)) {
		const comboCount = getFullCombinationCount();
		elements.detectedStyleStatus.textContent = `${comboCount.toLocaleString()} combinations detected. Only default candidates will be checked for this large set.`;
	} else {
		elements.detectedStyleStatus.textContent = showAllOptions
			? `${generatedCount} detected ${detectedUnit}${generatedCount === 1 ? '' : 's'} will be generated.`
			: `${detectedStyleGroups.length} option group${detectedStyleGroups.length === 1 ? '' : 's'} detected.`;
	}

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

	const selectedByGroupIndex = new Map(
		Array.from(elements.detectedStyleControls.querySelectorAll('.detected-style-select'))
			.map((select) => [Number(select.dataset.groupIndex), Number(select.value)])
	);

	return [detectedStyleGroups.map((group, groupIndex) => (
		selectedByGroupIndex.get(groupIndex) ?? getDefaultOptionValue(group)
	))];
}

function allDetectedStyles() {
	if (!detectedStyleGroups.length) return [null];
	return cartesianProduct(detectedStyleGroups.map((group) => getStyleValuesForCombination(group)));
}

function selectedDetectedOptionStyles() {
	if (!detectedStyleGroups.length) return [null];

	return Array.from(elements.detectedStyleControls.querySelectorAll('.detected-style-select'))
		.map((select) => {
			const group = detectedStyleGroups[Number(select.dataset.groupIndex)];
			return [group?.channelIndex ?? Number(select.dataset.groupIndex), Number(select.value)];
		});
}

function allDetectedOptionStyles() {
	if (!detectedStyleGroups.length) return [null];

	return detectedStyleGroups.flatMap((group, groupIndex) => (
		group.options.map((option) => [group.channelIndex ?? groupIndex, option.value])
	));
}

function getDetectedGeneratedCount(imageType) {
	if (!detectedStyleGroups.length) return 0;
	if (shouldUseDefaultOnlyForLargeCombos(imageType)) return getDefaultStyleArrays().length;
	if (shouldIncludeCompanionBaseLocker(imageType)) {
		return 1 + (
			elements.styleSource?.value === 'detected-all'
				? allDetectedStyles().length
				: selectedDetectedStyle().length
		);
	}
	if (usesVariantOptionStyleFormat(imageType) || imageType === 'store_image') {
		return detectedStyleGroups.reduce((total, group) => total + group.options.length, 0);
	}

	return getFullCombinationCount();
}

function getFullCombinationCount() {
	if (!detectedStyleGroups.length) return 0;
	return detectedStyleGroups.reduce((total, group) => total * getStyleValuesForCombination(group).length, 1);
}

function getStyleValuesForCombination(group) {
	return group.options.map((option) => option.value);
}

function getDefaultOptionValue(group) {
	return group.options.find((option) => option.value === 0)?.value ?? group.options[0]?.value ?? 0;
}

function shouldUseDefaultOnlyForLargeCombos(imageType) {
	return (
		usesFullStyleCombinations(imageType) &&
		elements.styleSource?.value === 'detected-all' &&
		!elements.checkLargeStyleSets?.checked &&
		getFullCombinationCount() > MAX_AUTO_COMBINATIONS
	);
}

function usesFullStyleCombinations(imageType) {
	return imageType !== 'store_image' && !usesVariantOptionStyleFormat(imageType);
}

function shouldIncludeCompanionBaseLocker(imageType, assetId = getCurrentAssetId()) {
	return (
		imageType === 'locker_preview_image' &&
		elements.styleSource?.value !== 'manual' &&
		isCompanionAssetId(assetId)
	);
}

function isCompanionAssetId(assetId) {
	return typeof assetId === 'string' && assetId.toLowerCase().startsWith('companion_');
}

function isVariantOptionImageType(imageType) {
	return imageType === 'preview_image';
}

function usesVariantOptionStyleFormat(imageType) {
	return isVariantOptionImageType(imageType);
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
		const storeId = dav2Id || getPrimaryDisplayAssetId(assetId) || (/^dav2_/i.test(assetId) ? assetId : `dav2_${assetId}`);
		return ['AthenaItemShopOfferDisplayData', storeId];
	}

	const baseId = assetId.split('[', 1)[0].toLowerCase();
	const sparksType = getSparksInstrumentType(baseId);
	if (sparksType) return [sparksType, assetId];

	for (const [prefix, assetType] of Object.entries(TYPE_MAPPINGS)) {
		if (baseId.startsWith(prefix)) return [assetType, assetId];
	}

	throw new Error(`Unknown cosmetic type for ID: ${assetId}`);
}

function getSparksInstrumentType(baseId) {
	const parts = baseId.split('_');
	if (parts[0] !== 'sparks') return '';

	return SPARKS_INSTRUMENT_TYPES[parts[1]] || SPARKS_INSTRUMENT_TYPES[parts[parts.length - 1]] || '';
}

function getEnteredAssetId() {
	const selectedId = elements.assetId.value.trim();
	if (selectedId) return selectedId;

	const entered = elements.assetDisplay.value.trim();
	const match = entered.match(/\(([^()]+)\)\s*$/);
	return (match ? match[1] : entered).trim();
}

function getCurrentAssetId() {
	return elements.assetId?.value.trim() || selectedAsset?.id || elements.assetDisplay?.value.trim() || '';
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

	if (usesVariantOptionStyleFormat(imageType)) {
		const [groupIndex, optionValue] = styleArray;
		const group = detectedStyleGroups.find((item) => item.channelIndex === groupIndex) || detectedStyleGroups[groupIndex];
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
	}).filter(Boolean);
}

function getStyleLabel(styleArray, imageType) {
	const selections = getStyleSelections(styleArray, imageType);
	if (!selections.length) return styleArray === null ? 'Default' : getFileName('Style', styleArray).replace(/\.png$/, '');
	return selections.map((selection) => `${selection.groupName}: ${selection.optionName}`).join(' | ');
}

async function generateImages() {
	const assetId = getEnteredAssetId();
	const imageType = elements.imageType.value;
	const dav2Id = elements.assetDav2Id.value.trim();
	const release = getSelectedRelease();

	if (!assetId) throw new Error('Please enter an asset ID or select an asset from the search results');
	if (shouldUseDefaultOnlyForLargeCombos(imageType)) {
		showStatus(`Large style set detected. Checking default candidates only instead of ${getFullCombinationCount().toLocaleString()} combinations.`, 'loading');
	}

	const styles = getStyleArrays(imageType);
	const images = [];

	for (const style of styles) {
		const path = buildPath(assetId, imageType, style, release.version, dav2Id);
		images.push({
			assetId,
			imageType,
			requestedImageType: imageType,
			style,
			path,
			url: await makeUrl(path, release.key),
			fileName: getFileName(imageType, style),
			styleLabel: getStyleLabel(style, imageType),
			styleSelections: getStyleSelections(style, imageType),
		});
	}

	return images;
}

function getSelectedRelease() {
	if (elements.releaseVersion.value === CUSTOM_RELEASE_VALUE) {
		const version = elements.customReleaseVersion.value.trim();
		const key = elements.customReleaseKey.value.replace(/\s+/g, '');

		if (!version) throw new Error('Please enter a custom release version.');
		if (!key) throw new Error('Please enter a custom release key.');
		validateReleaseKey(key);

		return {
			version,
			key,
			label: `${version} - Custom`,
		};
	}

	return RELEASES.find((release) => release.version === elements.releaseVersion.value) || RELEASES[0];
}

function validateReleaseKey(key) {
	try {
		base64ToBytes(key);
	} catch {
		throw new Error('Custom release key must be valid base64.');
	}
}

function getStyleArrays(imageType) {
	if (elements.styleSource.value === 'manual') {
		return parseStyleInput(elements.styleArray.value);
	}

	if (shouldUseDefaultOnlyForLargeCombos(imageType)) {
		return getDefaultStyleArrays();
	}

	if (shouldIncludeCompanionBaseLocker(imageType)) {
		const detectedStyles = elements.styleSource.value === 'detected-all'
			? allDetectedStyles()
			: selectedDetectedStyle();
		return uniqueStyleArrays([null, ...detectedStyles]);
	}

	if (usesVariantOptionStyleFormat(imageType)) {
		return elements.styleSource.value === 'detected-all'
			? allDetectedOptionStyles()
			: selectedDetectedOptionStyles();
	}

	if (elements.styleSource.value === 'detected-all') {
		return allDetectedStyles();
	}

	return selectedDetectedStyle();
}

function getDefaultStyleArrays() {
	if (!detectedStyleGroups.length) return [null];
	return [null, detectedStyleGroups.map(() => 0)];
}

function uniqueStyleArrays(styleArrays) {
	const seen = new Set();
	return styleArrays.filter((styleArray) => {
		const key = styleArray === null ? 'null' : styleArray.join(',');
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function updateStyleSourceUI() {
	const useManual = elements.styleSource.value === 'manual';
	elements.styleArray.closest('.inline-group').style.display = useManual ? 'flex' : 'none';
	elements.detectedStyleBox.style.display = useManual ? 'none' : 'block';
	if (!useManual) renderDetectedStyleControls();
}

function getLoadedImages() {
	return generatedImages.filter((image) => image.exists === true);
}

function refreshGeneratedResults() {
	const loadedImages = getLoadedImages();
	const checkedCount = generatedImages.filter((image) => image.exists !== null).length;
	const missingCount = generatedImages.filter((image) => image.exists === false).length;

	updatePreviewEmptyMessage(loadedImages.length, checkedCount);
	updateSelectionControls();

	if (checkedCount !== generatedImages.length) {
		showStatus(`Checking ${checkedCount}/${generatedImages.length} candidate image${generatedImages.length === 1 ? '' : 's'}...`, 'loading');
		return;
	}

	if (!loadedImages.length) {
		showStatus('No images were found for those Cosmo paths.', 'error');
		return;
	}

	const skipped = missingCount ? ` ${missingCount} missing skipped.` : '';
	showStatus(`Found ${loadedImages.length} image${loadedImages.length === 1 ? '' : 's'}.${skipped}`, 'success');
}

function updatePreviewEmptyMessage(loadedCount, checkedCount) {
	elements.previewGrid.querySelector('.preview-empty')?.remove();
	if (!generatedImages.length || checkedCount !== generatedImages.length || loadedCount > 0) return;

	const empty = document.createElement('div');
	empty.className = 'preview-empty';
	empty.textContent = 'No preview images found.';
	elements.previewGrid.appendChild(empty);
}

function renderPreview(images) {
	elements.previewGrid.innerHTML = '';
	const loadRun = ++previewLoadRun;
	const previewItems = [];

	for (const image of images) {
		const card = document.createElement('div');
		card.className = 'preview-card';

		const header = document.createElement('div');
		header.className = 'preview-card-header';

		const selectLabel = document.createElement('label');
		selectLabel.className = 'preview-select';

		const selectInput = document.createElement('input');
		selectInput.type = 'checkbox';
		selectInput.checked = image.selected !== false;
		selectInput.addEventListener('change', () => {
			image.selected = selectInput.checked;
			updateSelectionControls();
		});

		selectLabel.append(selectInput, document.createTextNode('Select'));

		const img = document.createElement('img');
		img.alt = image.styleLabel || image.fileName;
		img.loading = 'eager';
		img.title = 'Right-click to save this image manually';

		const status = document.createElement('span');
		status.className = 'preview-state';
		status.textContent = 'Preview';
		header.append(selectLabel, status);

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

		const download = document.createElement('button');
		download.type = 'button';
		download.className = 'sec-subm compact-action';
		download.textContent = 'Download';
		download.addEventListener('click', () => {
			downloadSingleImage(image, download);
		});

		actions.append(open, download);
		card.append(header, img, styleInfo, path, actions);
		elements.previewGrid.appendChild(card);
		previewItems.push({ card, image, img, status, selectInput });
	}

	updateSelectionControls();
	loadPreviewImages(previewItems, loadRun);
}

async function loadPreviewImages(previewItems, loadRun) {
	let nextIndex = 0;

	async function worker() {
		while (nextIndex < previewItems.length) {
			if (loadRun !== previewLoadRun) return;

			const previewItem = previewItems[nextIndex++];
			previewItem.status.textContent = 'Checking';
			await loadPreviewImage(previewItem, loadRun);
		}
	}

	const workerCount = Math.min(MAX_PARALLEL_PREVIEW_LOADS, previewItems.length);
	await Promise.all(Array.from({ length: workerCount }, worker));
}

function loadPreviewImage({ card, image, img, status, selectInput }, loadRun) {
	return new Promise((resolve) => {
		const settle = (exists) => {
			if (loadRun !== previewLoadRun) {
				resolve();
				return;
			}

			image.exists = exists;
			if (exists) {
				status.textContent = 'Found';
			} else {
				selectInput.checked = false;
				image.selected = false;
				card.remove();
			}
			refreshGeneratedResults();
			resolve();
		};

		img.addEventListener('load', () => settle(true), { once: true });
		img.addEventListener('error', () => settle(false), { once: true });
		img.src = image.url;
	});
}

function getSelectedLoadedImages() {
	return getLoadedImages().filter((image) => image.selected !== false);
}

function updateSelectionControls() {
	if (!elements.selectionCount || !elements.selectAllImages || !elements.downloadSelectedZip) return;

	const loadedImages = getLoadedImages();
	const selectedImages = getSelectedLoadedImages();
	const loadedCount = loadedImages.length;
	const selectedCount = selectedImages.length;

	elements.selectionCount.textContent = `${selectedCount}/${loadedCount} selected`;
	elements.selectAllImages.disabled = loadedCount === 0;
	elements.downloadSelectedZip.disabled = selectedCount === 0;
}

function selectAllImages() {
	for (const image of getLoadedImages()) {
		image.selected = true;
	}

	elements.previewGrid.querySelectorAll('.preview-select input').forEach((input) => {
		input.checked = true;
	});
	updateSelectionControls();
}

async function downloadSelectedZip() {
	const selectedImages = getSelectedLoadedImages();
	if (!selectedImages.length) {
		showStatus('No loaded images are selected.', 'error');
		return;
	}

	elements.downloadSelectedZip.disabled = true;
	showStatus(`Downloading ${selectedImages.length} selected image${selectedImages.length === 1 ? '' : 's'}...`, 'loading');

	try {
		const files = [];
		const failedImages = [];
		const usedFileNames = new Set();

		for (let index = 0; index < selectedImages.length; index++) {
			const image = selectedImages[index];
			showStatus(`Downloading ${index + 1}/${selectedImages.length}: ${image.fileName}`, 'loading');

			try {
				const data = await downloadCosmoImageBytes(image);

				files.push({
					name: getUniqueZipFileName(getImageDownloadFileName(image), usedFileNames),
					data,
				});
			} catch (error) {
				failedImages.push({ image, error });
			}
		}

		if (!files.length) throw new Error('Failed to download every selected image.');

		const zipBlob = createZipBlob(files);
		downloadBlob(zipBlob, getZipDownloadName());
		if (failedImages.length) {
			showStatus(
				`Downloaded ${files.length} image${files.length === 1 ? '' : 's'} as a ZIP. ${failedImages.length} failed to download.`,
				'error',
			);
		} else {
			showStatus(`Downloaded ${files.length} image${files.length === 1 ? '' : 's'} as a ZIP.`, 'success');
		}
	} catch (error) {
		showStatus(`${error.message || error}\nThe proxy returned an error while downloading Cosmo image bytes.`, 'error');
	} finally {
		updateSelectionControls();
	}
}

async function downloadSingleImage(image, button) {
	const fileName = getImageDownloadFileName(image);
	const originalText = button.textContent;
	button.disabled = true;
	button.textContent = 'Downloading';
	showStatus(`Downloading ${fileName}...`, 'loading');

	try {
		const data = await downloadCosmoImageBytes(image);
		downloadBlob(new Blob([data], { type: 'image/png' }), fileName);
		showStatus(`Downloaded ${fileName}.`, 'success');
	} catch (error) {
		showStatus(`Failed to download ${fileName}: ${error.message || error}`, 'error');
	} finally {
		button.disabled = false;
		button.textContent = originalText;
	}
}

async function downloadCosmoImageBytes(image) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), ZIP_DOWNLOAD_TIMEOUT_MS);

	try {
		const response = await fetch(getProxiedCosmoUrl(image.url), {
			cache: 'no-store',
			credentials: 'omit',
			referrerPolicy: 'no-referrer',
			signal: controller.signal,
		});
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return new Uint8Array(await response.arrayBuffer());
	} finally {
		clearTimeout(timeout);
	}
}

function getProxiedCosmoUrl(url) {
	return `${COSMO_PROXY_URL}${encodeURIComponent(url)}`;
}

function getImageDownloadFileName(image) {
	if (image.imageType === 'store_image') {
		return getStoreImageDownloadFileName(image);
	}

	const cosmeticName = getZipCosmeticName(image);
	const imageType = getZipImageTypeLabel(image);
	const stylePart = getZipStylePart(image);
	const assetType = getZipAssetTypeLabel(image);
	const game = getZipGameLabel(image);
	return sanitizeFileName(`${cosmeticName} (${imageType} - ${stylePart}) - ${assetType} - ${game}.png`);
}

function getStoreImageDownloadFileName(image) {
	const cosmeticName = getZipCosmeticName(image);
	const storeOption = getStoreImageOption(image);
	const assetType = getZipAssetTypeLabel(image);
	const descriptor = getZipStoreDescriptor(image, storeOption, assetType);
	const game = getZipGameLabel(image, storeOption);
	if (isZipBundleImage(image)) {
		return sanitizeFileName(getZipBundleStoreFileName(cosmeticName, descriptor));
	}

	return sanitizeFileName(`${cosmeticName} (${descriptor}) - ${assetType} - ${game}.png`);
}

function getZipBundleStoreFileName(bundleName, descriptor) {
	const suffix = descriptor === 'Featured' ? '' : ` (${descriptor.replace(/ - Featured$/i, '')})`;
	return `${bundleName}${suffix} - Item Shop Bundle - Fortnite.png`;
}

function isZipBundleImage(image) {
	return elements.assetKind.value === 'Bundle' || selectedAsset?.kind === 'Bundle' || /^bundle_/i.test(image?.assetId || '');
}

function getZipCosmeticName(image) {
	const storedName = elements.assetName.value.trim() || selectedAsset?.name || '';
	if (storedName) return storedName;

	const displayValue = elements.assetDisplay.value.trim();
	const displayMatch = displayValue.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
	if (displayMatch?.[1]) return displayMatch[1].trim();

	return image.assetId || 'Cosmo Image';
}

function getZipImageTypeLabel(image) {
	return ZIP_IMAGE_TYPE_LABELS[image.imageType] || friendlyVariantType(image.imageType || 'Image');
}

function getZipStylePart(image) {
	return Array.isArray(image.style) ? image.style.join(',') : 'Default';
}

function getZipStoreDescriptor(image, storeOption, assetType) {
	const baseLabel = getZipStoreBaseLabel(storeOption?.name);
	if (isLegoStoreOption(image, storeOption)) {
		const legoDescriptor = getNumberedLegoStoreDescriptor(storeOption);
		if (legoDescriptor) return legoDescriptor;
		if (assetType === 'Outfit') return 'Featured';
		return 'LEGO';
	}
	if (!shouldNumberStoreImage(image, storeOption)) return baseLabel;

	const index = getStoreImageOptionIndex(image, storeOption);
	return `${String(index + 1).padStart(2, '0')} - ${baseLabel}`;
}

function getZipStoreBaseLabel(name) {
	const rawName = String(name || '').trim();
	const tagName = rawName.includes('.') ? rawName.split('.').pop() : rawName;
	const normalized = tagName.replace(/[_-]+/g, ' ').trim();

	if (!normalized || /^default$/i.test(normalized)) return 'Featured';
	if (/^(br|battle royale)$/i.test(normalized)) return 'Featured';
	if (/^(juno|lego)$/i.test(normalized)) return 'LEGO';
	if (/^featured$/i.test(normalized)) return 'Featured';

	return titleCaseWords(normalized);
}

function shouldNumberStoreImage(image, storeOption) {
	const index = getStoreImageOptionIndex(image, storeOption);
	if (index <= 0 || isLegoStoreOption(image, storeOption)) return false;

	return (
		elements.assetKind.value === 'Bundle' ||
		selectedAsset?.kind === 'Bundle' ||
		isCompanionAssetId(image.assetId) ||
		getStoreImageOptionCount() > 1
	);
}

function getStoreImageOption(image) {
	const value = getStoreImageOptionIndex(image);
	const option = detectedStyleGroups[0]?.options.find((item) => Number(item.value) === value);
	if (option) return option;

	const selection = image.styleSelections?.[0];
	if (!selection) return null;

	return {
		value: selection.value,
		name: selection.optionName,
	};
}

function getStoreImageOptionIndex(image, storeOption = null) {
	if (Number.isFinite(Number(storeOption?.value))) return Number(storeOption.value);
	if (Array.isArray(image.style) && Number.isFinite(Number(image.style[0]))) return Number(image.style[0]);
	return 0;
}

function getStoreImageOptionCount() {
	return detectedStyleGroups[0]?.options?.length || 0;
}

function getNumberedLegoStoreDescriptor(storeOption) {
	const legoOptions = getLegoStoreOptions();
	if (legoOptions.length <= 1) return '';

	const legoIndex = legoOptions.findIndex((option) => Number(option.value) === Number(storeOption?.value));
	if (legoIndex < 0) return '';
	if (legoIndex === 0) return 'LEGO';
	return `LEGO - ${String(legoIndex + 1).padStart(2, '0')}`;
}

function getLegoStoreOptions() {
	return (detectedStyleGroups[0]?.options || []).filter((option) => isLegoStoreOptionName(option?.name));
}

function isLegoStoreOptionName(name) {
	return /juno|lego/i.test(String(name || ''));
}

function isLegoStoreOption(image, storeOption) {
	return /juno|lego/i.test([
		storeOption?.name,
		image?.path,
		image?.assetId,
		elements.assetDav2Id.value,
		elements.assetDav2Path.value,
		selectedAsset?.dav2Id,
		selectedAsset?.dav2Path,
	].filter(Boolean).join(' '));
}

function getZipAssetTypeLabel(image) {
	const assetId = image?.assetId || image;
	if (elements.assetKind.value === 'Bundle' || selectedAsset?.kind === 'Bundle') return 'Bundle';

	const baseId = String(assetId || '').split('[', 1)[0];
	const match = ZIP_ASSET_TYPE_LABELS.find(([pattern]) => pattern.test(baseId));
	return match?.[1] || 'Cosmetic';
}

function getZipGameLabel(image, storeOption = null) {
	const assetId = image?.assetId || image;
	if (isLegoStoreOption(image, storeOption)) return 'LEGO Fortnite';
	return /^sparks/i.test(String(assetId || '')) ? 'Fortnite Festival' : 'Fortnite';
}

function titleCaseWords(value) {
	return String(value || '')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}

function getUniqueZipFileName(fileName, usedFileNames) {
	const safeName = sanitizeFileName(fileName || 'cosmo-image.png') || 'cosmo-image.png';
	const dotIndex = safeName.lastIndexOf('.');
	const baseName = dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
	const extension = dotIndex > 0 ? safeName.slice(dotIndex) : '';
	let candidate = safeName;
	let counter = 2;

	while (usedFileNames.has(candidate.toLowerCase())) {
		candidate = `${baseName}-${counter}${extension}`;
		counter++;
	}

	usedFileNames.add(candidate.toLowerCase());
	return candidate;
}

function getZipDownloadName() {
	const assetId = sanitizeFileName(getEnteredAssetId() || 'cosmo-images') || 'cosmo-images';
	const imageType = sanitizeFileName(elements.imageType.value || 'images') || 'images';
	return `${assetId}-${imageType}.zip`;
}

function sanitizeFileName(value) {
	return String(value || '')
		.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
		.replace(/\s+/g, ' ')
		.trim();
}

function createZipBlob(files) {
	const localChunks = [];
	const centralChunks = [];
	const now = new Date();
	const { dosTime, dosDate } = getDosDateTime(now);
	let offset = 0;

	for (const file of files) {
		const nameBytes = new TextEncoder().encode(file.name);
		const data = file.data;
		const crc = crc32(data);
		const localHeader = createZipLocalHeader(nameBytes, data.length, crc, dosTime, dosDate);
		const centralHeader = createZipCentralHeader(nameBytes, data.length, crc, dosTime, dosDate, offset);

		localChunks.push(localHeader, nameBytes, data);
		centralChunks.push(centralHeader, nameBytes);
		offset += localHeader.length + nameBytes.length + data.length;
	}

	const centralOffset = offset;
	const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const endRecord = createZipEndRecord(files.length, centralSize, centralOffset);
	return new Blob([...localChunks, ...centralChunks, endRecord], { type: 'application/zip' });
}

function createZipLocalHeader(nameBytes, size, crc, dosTime, dosDate) {
	const bytes = new Uint8Array(30);
	const view = new DataView(bytes.buffer);
	view.setUint32(0, 0x04034b50, true);
	view.setUint16(4, 20, true);
	view.setUint16(6, 0, true);
	view.setUint16(8, 0, true);
	view.setUint16(10, dosTime, true);
	view.setUint16(12, dosDate, true);
	view.setUint32(14, crc, true);
	view.setUint32(18, size, true);
	view.setUint32(22, size, true);
	view.setUint16(26, nameBytes.length, true);
	view.setUint16(28, 0, true);
	return bytes;
}

function createZipCentralHeader(nameBytes, size, crc, dosTime, dosDate, offset) {
	const bytes = new Uint8Array(46);
	const view = new DataView(bytes.buffer);
	view.setUint32(0, 0x02014b50, true);
	view.setUint16(4, 20, true);
	view.setUint16(6, 20, true);
	view.setUint16(8, 0, true);
	view.setUint16(10, 0, true);
	view.setUint16(12, dosTime, true);
	view.setUint16(14, dosDate, true);
	view.setUint32(16, crc, true);
	view.setUint32(20, size, true);
	view.setUint32(24, size, true);
	view.setUint16(28, nameBytes.length, true);
	view.setUint16(30, 0, true);
	view.setUint16(32, 0, true);
	view.setUint16(34, 0, true);
	view.setUint16(36, 0, true);
	view.setUint32(38, 0, true);
	view.setUint32(42, offset, true);
	return bytes;
}

function createZipEndRecord(fileCount, centralSize, centralOffset) {
	const bytes = new Uint8Array(22);
	const view = new DataView(bytes.buffer);
	view.setUint32(0, 0x06054b50, true);
	view.setUint16(4, 0, true);
	view.setUint16(6, 0, true);
	view.setUint16(8, fileCount, true);
	view.setUint16(10, fileCount, true);
	view.setUint32(12, centralSize, true);
	view.setUint32(16, centralOffset, true);
	view.setUint16(20, 0, true);
	return bytes;
}

function getDosDateTime(date) {
	const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
	const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
	return { dosTime, dosDate };
}

function crc32(bytes) {
	let crc = 0xffffffff;
	const table = getCrc32Table();

	for (const byte of bytes) {
		crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
	}

	return (crc ^ 0xffffffff) >>> 0;
}

let crc32Table = null;
function getCrc32Table() {
	if (crc32Table) return crc32Table;

	crc32Table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let value = i;
		for (let bit = 0; bit < 8; bit++) {
			value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
		}
		crc32Table[i] = value >>> 0;
	}
	return crc32Table;
}

function downloadBlob(blob, fileName) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function handleGenerate() {
	try {
		showStatus('Generating candidate URLs...', 'loading');
		generatedImages = await generateImages();
		generatedImages.forEach((image) => {
			image.exists = null;
			image.selected = true;
		});
		renderPreview(generatedImages);
		if (!generatedImages.length) {
			showStatus('No candidate URLs were generated.', 'error');
		} else {
			showStatus(`Checking ${generatedImages.length} candidate image${generatedImages.length === 1 ? '' : 's'}...`, 'loading');
		}
	} catch (error) {
		generatedImages = [];
		showStatus(error.message || String(error), 'error');
	}
}

function clearAll() {
	previewLoadRun++;
	generatedImages = [];
	elements.previewGrid.innerHTML = '';
	updateSelectionControls();
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
		releaseVersion: document.getElementById('release-version'),
		customReleaseFields: document.getElementById('custom-release-fields'),
		customReleaseVersion: document.getElementById('custom-release-version'),
		customReleaseKey: document.getElementById('custom-release-key'),
		styleArray: document.getElementById('style-array'),
		styleSource: document.getElementById('style-source'),
		checkLargeStyleSets: document.getElementById('check-large-style-sets'),
		detectedStyleBox: document.getElementById('detected-style-box'),
		detectedStyleStatus: document.getElementById('detected-style-status'),
		detectedStyleControls: document.getElementById('detected-style-controls'),
		generateBtn: document.getElementById('generate-btn'),
		clearBtn: document.getElementById('clear-btn'),
		status: document.getElementById('status'),
		previewGrid: document.getElementById('preview-grid'),
		selectAllImages: document.getElementById('select-all-images'),
		downloadSelectedZip: document.getElementById('download-selected-zip'),
		selectionCount: document.getElementById('selection-count'),
	});
}

function populateReleaseOptions() {
	elements.releaseVersion.innerHTML = '';
	for (const release of RELEASES) {
		const option = document.createElement('option');
		option.value = release.version;
		option.textContent = release.label;
		elements.releaseVersion.appendChild(option);
	}

	const customOption = document.createElement('option');
	customOption.value = CUSTOM_RELEASE_VALUE;
	customOption.textContent = 'Custom...';
	elements.releaseVersion.appendChild(customOption);

	elements.releaseVersion.value = RELEASES[0].version;
	updateCustomReleaseFields();
}

function updateCustomReleaseFields() {
	const useCustom = elements.releaseVersion.value === CUSTOM_RELEASE_VALUE;
	elements.customReleaseFields.hidden = !useCustom;
}

function setupEvents() {
	elements.assetDisplay.addEventListener('input', updateAssetSuggestions);
	elements.imageType.addEventListener('change', loadDetectedStyles);
	elements.releaseVersion.addEventListener('change', updateCustomReleaseFields);
	elements.styleSource.addEventListener('change', updateStyleSourceUI);
	elements.checkLargeStyleSets.addEventListener('change', renderDetectedStyleControls);
	elements.generateBtn.addEventListener('click', handleGenerate);
	elements.clearBtn.addEventListener('click', clearAll);
	elements.selectAllImages.addEventListener('click', selectAllImages);
	elements.downloadSelectedZip.addEventListener('click', downloadSelectedZip);

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
	populateReleaseOptions();
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
