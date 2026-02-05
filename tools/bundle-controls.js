let bundlesEntries = [];
let dataIndex = null;

export function initBundleControls(index) {
	dataIndex = index;
	bundlesEntries = [];
}

export function getBundleEntries() {
	return bundlesEntries;
}

export function createBundleEntry() {
	const list = document.getElementById('bundles-list');
	if (!list) return;

	const wrapper = document.createElement('div');
	wrapper.className = 'bundle-entry';

	const input = document.createElement('input');
	input.type = 'text';
	input.placeholder = 'enter bundle ID or Name';
	input.className = 'bundle-display';
	input.id = `bundle-display-${bundlesEntries.length + 1}`;
	input.style = "display: block; margin-left: auto; margin-right: auto;";

	const optionsWrapper = document.createElement('div');
	optionsWrapper.className = 'bundle-options';
	optionsWrapper.style.display = 'flex';
	optionsWrapper.style.justifyContent = 'center';
	optionsWrapper.style.alignItems = 'center';
	optionsWrapper.style.gap = '1rem';
	optionsWrapper.style.display = 'none';

	const bundleCost = document.createElement('input');
	bundleCost.type = 'text';
	bundleCost.inputMode = 'numeric';
	bundleCost.pattern = '^[0-9,]+$';
	bundleCost.placeholder = 'V-Bucks cost';
	bundleCost.className = 'vbucks-cost';
	bundleCost.style.width = '150px';

	const titleCaseLabel = document.createElement('label');
	titleCaseLabel.textContent = 'Force title case? ';
	titleCaseLabel.htmlFor = 'force-title-case';

	const forceTitleCase = document.createElement('input');
	forceTitleCase.type = 'checkbox';
	forceTitleCase.className = 'force-title-case';
	forceTitleCase.title = 'Force Title Case';

	const bundleID = document.createElement('input');
	bundleID.type = 'hidden';
	bundleID.className = 'bundle-input';
	bundleID.id = `bundle-id-${bundlesEntries.length + 1}`;

	const bundleName = document.createElement('input');
	bundleName.type = 'hidden';
	bundleName.className = 'bundle-input-name';
	bundleName.id = `bundle-name-${bundlesEntries.length + 1}`;

	const suggestions = document.createElement('div');
	suggestions.className = 'suggestions';

	input.addEventListener('input', () => updateBundleSuggestions(input, bundleID, bundleName, optionsWrapper, suggestions));

	wrapper.appendChild(input);
	optionsWrapper.appendChild(bundleCost);
	optionsWrapper.appendChild(titleCaseLabel);
	optionsWrapper.appendChild(forceTitleCase);
	wrapper.appendChild(optionsWrapper);
	wrapper.appendChild(bundleID);
	wrapper.appendChild(bundleName);
	wrapper.appendChild(suggestions);

	list.appendChild(wrapper);
	bundlesEntries.push({bundleID, bundleName, bundleCost, forceTitleCase, wrapper});
	input.focus();

	return wrapper;
}

export function removeBundleEntry() {
	if (bundlesEntries.length === 0) return;
	const entry = bundlesEntries.pop();
	if (entry && entry.wrapper && entry.wrapper.parentNode) entry.wrapper.parentNode.removeChild(entry.wrapper);
}

function updateBundleSuggestions(displayEl, hiddenIdEl, hiddenNameEl, optionsWrapper, sugDiv) {
	const input = displayEl.value.trim().toLowerCase();
	sugDiv.innerHTML = '';
	if (!input) return;

	if (!Array.isArray(dataIndex) || dataIndex.length === 0) return;

	const selectedIds = new Set(
		bundlesEntries
			.map(e => (e.bundleID && e.bundleID.value || '').trim().toLowerCase())
			.filter(id => id) // Filter out empty strings
	);

	const scoredMatches = dataIndex
		.filter(e => {
			if (typeof e.id === 'string' || typeof e.name === 'string') return false;
			if (!e.bundle_name || !e.bundle_id) return false;

			// Exclude already selected bundles
			if (selectedIds.has(e.bundle_id.toLowerCase())) return false;
			
			return true;
		})
		.map(e => {
			const bundle_name = (e.bundle_name || '').toLowerCase();
			const bundle_id = (e.bundle_id || '').toLowerCase();
			let score = 0;

			if (bundle_name === input) score += 100;
			else if (bundle_name.startsWith(input)) score += 75;
			else if (bundle_name.includes(input)) score += 50;

			if (bundle_id === input) score += 40;
			else if (bundle_id.startsWith(input)) score += 25;
			else if (bundle_id.includes(input)) score += 10;

			return { entry: e, score };
		})
		.filter(item => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 10);

	scoredMatches.forEach(({ entry }) => {
		const div = document.createElement('div');
		div.textContent = `${entry.bundle_name} (${entry.bundle_id})`;
		div.onclick = () => {
			displayEl.value = `${entry.bundle_name} (${entry.bundle_id})`;
			optionsWrapper.style.display = 'flex';
			hiddenIdEl.value = entry.bundle_id;
			hiddenNameEl.value = entry.bundle_name;
			sugDiv.innerHTML = '';
		};
		sugDiv.appendChild(div);
	});
}

export function setupBundleControls() {
	const addBtn = document.getElementById('add-bundle');
	const removeBtn = document.getElementById('remove-bundle');
	
	if (addBtn) {
		addBtn.addEventListener('click', (e) => {
			e.preventDefault();
			createBundleEntry();
		});
	}
	
	if (removeBtn) {
		removeBtn.addEventListener('click', (e) => {
			e.preventDefault();
			removeBundleEntry();
		});
	}
}
