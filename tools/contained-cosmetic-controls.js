let containedCosmeticEntries = [];
let dataIndex = null;

export function initContainedCosmeticControls(index) {
	dataIndex = index;
	containedCosmeticEntries = [];
}

export function getContainedCosmeticEntries() {
	return containedCosmeticEntries;
}

export function createContainedCosmeticEntry() {
	const list = document.getElementById('contained-cosmetics-list');
	if (!list) return;

	const wrapper = document.createElement('div');
	wrapper.className = 'contained-cosmetic-entry';

	const input = document.createElement('input');
	input.type = 'text';
	input.placeholder = 'enter cosmetic ID or Name';
	input.className = 'contained-cosmetic-display';
	input.id = `contained-cosmetic-display-${containedCosmeticEntries.length + 1}`;
	input.style = "display: block; margin-left: auto; margin-right: auto;";

	const optionsWrapper = document.createElement('div');
	optionsWrapper.className = 'contained-cosmetic-options';
	optionsWrapper.style.display = 'flex';
	optionsWrapper.style.justifyContent = 'center';
	optionsWrapper.style.alignItems = 'center';
	optionsWrapper.style.gap = '1rem';
	optionsWrapper.style.display = 'none';

	const cosmeticCost = document.createElement('input');
	cosmeticCost.type = 'text';
	cosmeticCost.inputMode = 'numeric';
	cosmeticCost.pattern = '^[0-9,]+$';
	cosmeticCost.placeholder = 'V-Bucks cost';
	cosmeticCost.className = 'vbucks-cost';
	cosmeticCost.style.width = '150px';
	cosmeticCost.addEventListener('input', updateShopAppearancesFromContainedCosmeticsIfNeeded);

	const titleCaseLabel = document.createElement('label');
	titleCaseLabel.textContent = 'Force title case? ';
	titleCaseLabel.htmlFor = 'force-title-case';

	const forceTitleCase = document.createElement('input');
	forceTitleCase.type = 'checkbox';
	forceTitleCase.className = 'force-title-case';
	forceTitleCase.title = 'Force Title Case';

	const cosmeticID = document.createElement('input');
	cosmeticID.type = 'hidden';
	cosmeticID.className = 'contained-cosmetic-input';
	cosmeticID.id = `contained-cosmetic-id-${containedCosmeticEntries.length + 1}`;

	const cosmeticName = document.createElement('input');
	cosmeticName.type = 'hidden';
	cosmeticName.className = 'contained-cosmetic-input-name';
	cosmeticName.id = `contained-cosmetic-name-${containedCosmeticEntries.length + 1}`;

	const cosmeticPath = document.createElement('input');
	cosmeticPath.type = 'hidden';
	cosmeticPath.className = 'contained-cosmetic-input-path';
	cosmeticPath.id = `contained-cosmetic-path-${containedCosmeticEntries.length + 1}`;

	const suggestions = document.createElement('div');
	suggestions.className = 'suggestions';

	input.addEventListener('input', () => updateContainedCosmeticSuggestions(input, cosmeticID, cosmeticName, cosmeticPath, optionsWrapper, suggestions));

	wrapper.appendChild(input);
	optionsWrapper.appendChild(cosmeticCost);
	optionsWrapper.appendChild(titleCaseLabel);
	optionsWrapper.appendChild(forceTitleCase);
	wrapper.appendChild(optionsWrapper);
	wrapper.appendChild(cosmeticID);
	wrapper.appendChild(cosmeticName);
	wrapper.appendChild(cosmeticPath);
	wrapper.appendChild(suggestions);

	list.appendChild(wrapper);
	containedCosmeticEntries.push({ cosmeticID, cosmeticName, cosmeticPath, cosmeticCost, forceTitleCase, wrapper });
	input.focus();

	return wrapper;
}

export function removeContainedCosmeticEntry() {
	if (containedCosmeticEntries.length === 0) return;
	const entry = containedCosmeticEntries.pop();
	if (entry && entry.wrapper && entry.wrapper.parentNode) entry.wrapper.parentNode.removeChild(entry.wrapper);
}

function updateContainedCosmeticSuggestions(displayEl, hiddenIdEl, hiddenNameEl, hiddenPathEl, optionsWrapper, sugDiv) {
	const input = displayEl.value.trim().toLowerCase();
	sugDiv.innerHTML = '';
	if (!input) return;

	if (!Array.isArray(dataIndex) || dataIndex.length === 0) return;

	const selectedIds = new Set(
		containedCosmeticEntries
			.map(e => (e.cosmeticID && e.cosmeticID.value || '').trim().toLowerCase())
			.filter(id => id)
	);
	const currentCosmeticId = document.getElementById('cosmetic-input')?.value?.trim().toLowerCase() || '';

	const scoredMatches = dataIndex
		.filter(e => {
			if (typeof e.bundle_id === 'string' || typeof e.bundle_name === 'string') return false;
			if (typeof e.banner_id === 'string' || typeof e.banner_icon === 'string') return false;
			if (!e.name || !e.id) return false;
			if (selectedIds.has(e.id.toLowerCase())) return false;
			if (currentCosmeticId && e.id.toLowerCase() === currentCosmeticId) return false;
			return true;
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
		const div = document.createElement('div');
		div.textContent = `${entry.name} (${entry.id})`;
		div.onclick = () => {
			displayEl.value = `${entry.name} (${entry.id})`;
			optionsWrapper.style.display = 'flex';
			hiddenIdEl.value = entry.id;
			hiddenNameEl.value = entry.name;
			hiddenPathEl.value = entry.path || '';
			sugDiv.innerHTML = '';
			updateShopAppearancesFromContainedCosmeticsIfNeeded();
		};
		sugDiv.appendChild(div);
	});
}

function updateShopAppearancesFromContainedCosmeticsIfNeeded() {
	const includeAppearances = document.getElementById('include-appearances');
	const shopAppearances = document.getElementById('shop-appearances');
	const shopCost = document.getElementById('shop-cost');
	if (!includeAppearances?.checked || !shopAppearances || !shopCost || shopCost.value.trim()) return;

	const firstPricedContainedCosmetic = containedCosmeticEntries.find(entry =>
		entry.cosmeticName?.value?.trim() && entry.cosmeticCost?.value?.trim()
	);
	if (firstPricedContainedCosmetic) {
		shopAppearances.value = firstPricedContainedCosmetic.cosmeticName.value.trim();
	}
}

export function setupContainedCosmeticControls() {
	const addBtn = document.getElementById('add-contained-cosmetic');
	const removeBtn = document.getElementById('remove-contained-cosmetic');

	if (addBtn) {
		addBtn.addEventListener('click', (e) => {
			e.preventDefault();
			createContainedCosmeticEntry();
		});
	}

	if (removeBtn) {
		removeBtn.addEventListener('click', (e) => {
			e.preventDefault();
			removeContainedCosmeticEntry();
		});
	}
}
