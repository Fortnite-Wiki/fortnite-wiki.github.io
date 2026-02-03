import { LEGO_SEASON_NAMES } from '../data/datesAndVersions.js';

const createCheckbox = (id, label, extra = '') => `
	<label class="checkbox-label" ${extra}>
		<input type="checkbox" id="${id}" name="source"> ${label}
	</label>`;

const SOURCE_CHECKBOXES = {
	itemShop: createCheckbox('source-item-shop', 'Item Shop'),
	battlePass: createCheckbox('source-battle-pass', 'Battle Pass'),
	fortniteCrew: createCheckbox('source-fortnite-crew', 'Fortnite Crew'),
	ogPass: createCheckbox('source-og-pass', 'OG Pass'),
	musicPass: createCheckbox('source-music-pass', 'Music Pass'),
	legoPass: createCheckbox('source-lego-pass', 'LEGO Pass'),
	questReward: createCheckbox('source-quest-reward', 'Quest Reward'),
	rocketPass: createCheckbox('source-rocket-pass', 'Rocket Pass', 'id="rocket-pass-field" style="display: none"')
};

const SOURCE_SETTINGS = {
	itemShop: `
		<div id="item-shop-settings" class="source-settings hidden">
			<h5>Item Shop Settings</h5>
			<div class="inline-group">
				<label for="shop-cost">V-Bucks Cost:</label>
				<input type="text" id="shop-cost" placeholder="1,200"/>
				<p style="margin: 0rem !important"><small><small>(Leave blank if cannot be purchased directly)</small></small></p>
			</div>
			<hr>
			<div id="bundles-box">
				<h5>Bundles it's contained in:</h5>
				<div id="bundles-controls">
					<button id="add-bundle" class="sec-subm" style="padding: 0.25rem 0.5rem !important;">add</button>
					<button id="remove-bundle" class="sec-subm secondary" style="padding: 0.25rem 0.5rem !important;">remove</button>
				</div>
				<div id="bundles-list" class="scrollbox">
					<!-- Bundle entries appended here -->
				</div>
			</div>
			<hr>
			<div class="inline-group">
				<label class="checkbox-label">
					<input type="checkbox" id="include-appearances">
					Include ItemShopAppearances
				</label>
			</div>
			<div class="inline-group appearances-fields" style="display: none;">
				<input type="text" id="shop-appearances" />
			</div>
		</div>`,
	battlePass: `
		<div id="battle-pass-settings" class="source-settings hidden">
			<h5>Battle Pass Settings</h5>
			<div class="inline-group">
				<label for="bp-season">Season:</label>
				<input type="text" id="bp-season" placeholder="C6S4" pattern="C[0-9]+S[0-9]+">
			</div>
			<div class="inline-group" id="bp-mode-group">
				<label>Battle Pass Type:</label>
				<label class="checkbox-label"><input type="radio" name="bp-mode" id="bp-mode-linear" value="linear"> Linear</label>
				<label class="checkbox-label"><input type="radio" name="bp-mode" id="bp-mode-nonlinear" value="non-linear"> Non-Linear</label>
			</div>
			<div class="inline-group">
				<label for="bp-page">Page:</label>
				<input type="number" id="bp-page" placeholder="5" min="1" max="20">
			</div>
			<!-- Non-Linear specific fields -->
			<div class="inline-group" id="bp-nonlinear-fields" style="display: none; gap: 1rem; flex-wrap:wrap;">
				<label for="bp-nonlinear-set">Outfit Set Name:</label>
				<input type="text" id="bp-nonlinear-set" placeholder="Enter outfit set name" />
				<label for="bp-nonlinear-level">Set Unlock Level (if applicable):</label>
				<input type="number" id="bp-nonlinear-level" placeholder="e.g. 25" min="1" style="width:80px;" />
			</div>
			<div class="inline-group" id="bp-bonus-group" style="margin-bottom:0.5rem;">
				<label class="checkbox-label">
					<input type="checkbox" id="bp-bonus">
					Bonus reward?
				</label>
				<label class="checkbox-label">
					<input type="checkbox" id="pass-free-bp">
					Free?
				</label>
			</div>
			<div class="inline-group">
				<label class="checkbox-label">
					<input type="checkbox" id="bp-page-completion">
					Obtained on page completion?
				</label>
			</div>
		</div>`,
	fortniteCrew: `
		<div id="fortnite-crew-settings" class="source-settings hidden">
			<h5>Fortnite Crew Settings</h5>
			<div class="inline-group">
				<label for="crew-month">Month:</label>
				<select id="crew-month">
					<option value="">Select month</option>
					<option value="January">January</option>
					<option value="February">February</option>
					<option value="March">March</option>
					<option value="April">April</option>
					<option value="May">May</option>
					<option value="June">June</option>
					<option value="July">July</option>
					<option value="August">August</option>
					<option value="September">September</option>
					<option value="October">October</option>
					<option value="November">November</option>
					<option value="December">December</option>
				</select>
			</div>
			<div class="inline-group">
				<label for="crew-year">Year:</label>
				<input type="number" id="crew-year" placeholder="2025" min="2020" max="2030">
			</div>
		</div>`,
	ogPass: `
		<div id="og-pass-settings" class="source-settings hidden">
			<h5>OG Pass Settings</h5>
			<div class="inline-group">
				<label for="og-season">Season:</label>
				<input type="text" id="og-season" placeholder="6" pattern="[0-9]+">
			</div>
			<div class="inline-group">
				<label for="og-page">Page:</label>
				<input type="number" id="og-page" placeholder="1" min="1" max="6">
			</div>
			<div class="inline-group">
				<label class="checkbox-label">
					<input type="checkbox" id="pass-free-og">
					Free?
				</label>
			</div>
			<div class="inline-group">
				<label class="checkbox-label">
					<input type="checkbox" id="og-page-completion">
					Obtained on page completion?
				</label>
			</div>
		</div>`,
	musicPass: `
		<div id="music-pass-settings" class="source-settings hidden">
			<h5>Music Pass Settings</h5>
			<div class="inline-group">
				<label for="music-season">Season:</label>
				<input type="text" id="music-season" placeholder="11" pattern="[0-9]+">
			</div>
			<div class="inline-group">
				<label for="music-page">Page:</label>
				<input type="number" id="music-page" placeholder="1" min="1" max="4">
			</div>
			<div class="inline-group">
				<label class="checkbox-label">
					<input type="checkbox" id="pass-free-music">
					Free?
				</label>
			</div>
			<div class="inline-group">
				<label class="checkbox-label">
					<input type="checkbox" id="music-page-completion">
					Obtained on page completion?
				</label>
			</div>
		</div>`,
	legoPass: `
		<div id="lego-pass-settings" class="source-settings hidden">
			<h5>LEGO Pass Settings</h5>
			<div class="inline-group">
				<label for="lego-season">Season Name:</label>
				<select id="lego-season">
					<option value="">Select season</option>
					${LEGO_SEASON_NAMES.map(season => `<option value="${season}">${season}</option>`).join('')}
				</select>
			</div>
			<div class="inline-group">
				<label for="lego-page">Page:</label>
				<input type="number" id="lego-page" placeholder="1" min="1" max="4">
			</div>
			<div class="inline-group">
				<label class="checkbox-label">
					<input type="checkbox" id="pass-free-lego">
					Free?
				</label>
			</div>
			<div class="inline-group">
				<label class="checkbox-label">
					<input type="checkbox" id="lego-page-completion">
					Obtained on page completion?
				</label>
			</div>
		</div>`,
	questReward: `
		<div id="quest-reward-settings" class="source-settings hidden">
			<h5>Quest Reward Settings</h5>
			<div class="inline-group">
				<input type="text" id="quest-name" placeholder="Enter quests name"  />
				<input type="text" id="quest-cost" placeholder="Enter cost to use" />
			</div>
			<label class="checkbox-label">
				<input type="checkbox" id="quest-first-released" checked>
				Was FIRST released?
			</label>
		</div>`,
	rocketPass: `
		<div id="rocket-pass-settings" class="source-settings hidden">
			<h5>Rocket Pass Settings</h5>
			<div class="inline-group">
				<label for="rocket-pass-season">Season:</label>
				<input type="text" id="rocket-pass-season" placeholder="6" pattern="[0-9]+">
			</div>
			<div class="inline-group">
				<label for="rocket-pass-level">Level:</label>
				<input type="number" id="rocket-pass-level" placeholder="1" min="1" max="100">
			</div>
		</div>`
};

export function injectSourceSettings(container, sources) {
	if (!container) {
		console.error('Container element not found');
		return;
	}

	// Create checkboxes section
	const checkboxesDiv = document.createElement('div');
	checkboxesDiv.className = 'source-options';
	sources.forEach(sourceKey => {
		if (SOURCE_CHECKBOXES[sourceKey]) {
			checkboxesDiv.innerHTML += SOURCE_CHECKBOXES[sourceKey];
		}
	});

	container.appendChild(checkboxesDiv);

	// Create settings sections
	sources.forEach(sourceKey => {
		if (SOURCE_SETTINGS[sourceKey]) {
			const settingsDiv = document.createElement('div');
			settingsDiv.innerHTML = SOURCE_SETTINGS[sourceKey];
			container.appendChild(settingsDiv.firstElementChild);
		}
	});
}


// Map of which form fields belong to each source
export const SOURCE_SETTINGS_FIELDS = {
	itemShop: ['shop-cost', 'include-appearances', 'shop-appearances'],
	battlePass: ['bp-season', 'bp-page', 'bp-mode-linear', 'bp-mode-nonlinear', 'bp-nonlinear-set', 'bp-nonlinear-level', 'bp-bonus', 'bp-page-completion', 'pass-free-bp'],
	fortniteCrew: ['crew-month', 'crew-year'],
	ogPass: ['og-season', 'og-page', 'og-page-completion', 'pass-free-og'],
	musicPass: ['music-season', 'music-page', 'music-page-completion', 'pass-free-music'],
	legoPass: ['lego-season', 'lego-season-abbr', 'lego-page', 'lego-page-completion', 'pass-free-lego'],
	questReward: ['quest-name', 'quest-cost', 'quest-first-released'],
	rocketPass: ['rocket-pass-season', 'rocket-pass-level']
};

export function generateSourceReleaseHTML(sources, includeUpdateVersion = true) {
	const checkboxesHTML = sources.map(key => SOURCE_CHECKBOXES[key] || '').join('\n\t\t\t\t\t\t');
	const settingsHTML = sources.map(key => SOURCE_SETTINGS[key] || '').join('\n\n\t\t\t\t\t\t');

	return `
		<div class="two-column-layout">
			<!-- Left Column: Cosmetic Source -->
			<div class="column">
				<h4>Cosmetic Source</h4>
				<div class="source-options">
					${checkboxesHTML}
				</div>

				${settingsHTML}
			</div>
			
			<!-- Right Column: Release Status -->
			${generateReleaseHTML(includeUpdateVersion)}
		</div>`;
}

export function generateReleaseHTML(includeUpdateVersion = true) {
	return `
			<div class="column">
				<h4>Release Status</h4>
				<div class="inline-group">
					<label for="released-switch">Released?</label>
					<div class="switch-container">
						<label class="switch">
							<input type="checkbox" id="released-switch">
							<span class="slider"></span>
						</label>
						<span id="released-label">No</span>
					</div>
				</div>
				
				<div class="inline-group released-fields" style="display: none;">
					<label for="release-date">Release date:</label>
					<input type="date" id="release-date" />
				</div>
				
				<div class="inline-group released-fields" id="item-shop-history-field" style="display: none;">
					<label class="checkbox-label">
						<input type="checkbox" id="item-shop-history">
						Item Shop History link
					</label>
					<input type="number" id="shop-history-part" placeholder="Part" min="1" max="4" style="display: none; width: 80px;">
				</div>

				${includeUpdateVersion ? `<div class="inline-group">
					<label for="update-version">Update Version:</label>
					<input type="text" id="update-version" placeholder="36.30" pattern="[0-9]+\\.[0-9]+" required>
				</div>` : ''}
			</div>`;
}