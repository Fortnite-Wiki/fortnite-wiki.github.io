import { loadGzJson } from '../../jsondata.js';
import { decryptMidi, extractFormattedProVocalsSentences } from './midi-utils.js';
import { getSeasonReleased, pageExists } from '../../utils.js';
import { generateUnlockedParameter, generateCostParameter, generateReleaseParameter, generateArticleIntro } from '../../article-utils.js';
import { initSourceReleaseControls, getSourceReleaseSettings, validateSourceSettings } from '../../source-release.js';
import { initBundleControls, getBundleEntries, setupBundleControls } from '../../bundle-controls.js';
import { initFormBehaviors } from '../../form-behaviors.js';

let jamTracksData = null;
let trackOverrides = null;
let currentTrackData = null;
let cosmeticIndex = null;
let elements = {};

let pageTitle = '';

const AES_KEY = '29b4ac18d090166559244e15548bd4c11b98d33ad57f7b0d9bfff6ceb7cf6145';
const DATA_BASE_PATH = '../../../data/';

async function loadJamTracksData() {
	try {
		console.log('Loading jam tracks data from API...');
		
		// Use CORS proxy to bypass CORS Policy restrictions
		const apiUrl = 'https://fortnitecontent-website-prod07.ol.epicgames.com/content/api/pages/fortnite-game/spark-tracks';
		const corsProxyUrl = 'https://cors-proxy.mtonline.workers.dev/?url=';
		const proxiedUrl = corsProxyUrl + encodeURIComponent(apiUrl);
		
		const response = await fetch(proxiedUrl);
		
		if (!response.ok) {
			throw new Error(`CORS proxy request failed: ${response.status} ${response.statusText}`);
		}
		
		const data = await response.json();
		
		console.log('Jam tracks data loaded successfully from API via CORS proxy');
		const trackCount = Object.values(data).filter(t => t.track).length;
		console.log(`Loaded ${trackCount} tracks`);

		return data;
	} catch (error) {
		console.error('Error loading jam tracks data from API: ', error);
		showStatus('Error loading jam tracks data from API. Please refresh the page or try again later.', 'error');
	}
}
async function loadTrackOverrides() {
	try {
		console.log('Loading overrides from Fortnite-Wiki-Bot repo...');

		const overrides =  await fetch("https://fortnite-wiki-bot-repo.mtonline.workers.dev/data/spark-tracks/track_overrides.json").then(res => res.json());

		const trackCount = Object.values(overrides).length;
		console.log(`Loaded ${trackCount} track overrides`);

		return overrides;
	} catch (error) {
		console.error('Error loading overrides data from Fortnite-Wiki-Bot repo: ', error);
		return {};
	}
}

async function loadCosmeticIndex() {
	try {
		return await loadGzJson(DATA_BASE_PATH + 'index.json');
	} catch (error) {
		console.error('Error loading cosmetic index:', error);
		return [];
	}
}


// Parse track data from the API response structure
function parseTrackData(trackKey, trackData) {
	const track = trackData.track;
	if (!track) return null;
	
	return {
		key: trackKey,
		title: track.tt || trackKey,
		artist: track.an || '',
		year: track.ry || '',
		duration: track.dn || 0,
		album: track.ab || '',
		genre: Array.isArray(track.ge) && track.ge.length > 0 ? track.ge[0] : '',
		music_key: track.mk || '',
		scale: track.mm || '',
		bpm: track.mt || 0,
		difficulties: track.in || {},
		templateId: track.ti || '',
		midiUrl: track.mu || '',
	};
}

// Convert seconds to MM:SS format
function formatDuration(seconds) {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Get template ID short form (e.g., "SID_Placeholder_656" from "SparksSong:sid_placeholder_656")
function getTemplateIdShort(templateId) {
	if (!templateId) return '';
	const match = templateId.match(/sid_placeholder_(\d+)/i);
	return match ? `SID_Placeholder_${match[1]}` : templateId;
}

// Format key and scale
function formatKeyScale(key, scale) {
	if (!key && !scale) return '';
	return `${key} ${scale}`.trim();
}

// Clean Spotify links by removing tracking parameters
function cleanSpotifyLink(url) {
	if (!url) return '';
	
	try {
		const urlObj = new URL(url);
		// Remove common Spotify tracking parameters
		urlObj.searchParams.delete('si');
		urlObj.searchParams.delete('utm_source');
		urlObj.searchParams.delete('utm_medium');
		urlObj.searchParams.delete('utm_campaign');
		urlObj.searchParams.delete('utm_content');
		urlObj.searchParams.delete('utm_term');
		
		return urlObj.toString();
	} catch (error) {
		// If URL parsing fails, return original URL
		console.warn('Failed to parse Spotify URL:', url);
		return url;
	}
}

// Initialise the application
async function init() {
	// Initialize generator-specific DOM element references only
	elements = {
		jamTrackInput: document.getElementById('jamTrackInput'),
		suggestions: document.getElementById('suggestions'),
		albumInput: document.getElementById('albumInput'),
		collaborationCheck: document.getElementById('collaborationCheck'),

		// shared music inputs
		sharedMusicEmote: document.getElementById('sharedMusicEmote'),
		sharedMusicLobbyMusic: document.getElementById('sharedMusicLobbyMusic'),
		sharedMusicContrail: document.getElementById('sharedMusicContrail'),
		sharedMusicInputsContainer: document.getElementById('sharedMusicInputs'),
		addSharedMusicBtn: document.getElementById('addSharedMusicBtn'),

		// Spotify links
		artistSpotifyLink: document.getElementById('artistSpotifyLink'),
		spotifyLink: document.getElementById('spotifyLink'),
		spotifyTitle: document.getElementById('spotifyTitle'),
		albumSpotifyLink: document.getElementById('albumSpotifyLink'),

		featuredRotationCheck: document.getElementById('featuredRotationCheck'),
		displayTitle: document.getElementById('displayTitle'),
		ageRestricted: document.getElementById('ageRestricted'),
		generateBtn: document.getElementById('generate-btn'),
		wikiPageBtn: document.getElementById('wiki-page-btn'),
		copyBtn: document.getElementById('copy-btn'),
		clearBtn: document.getElementById('clear-btn'),
		output: document.getElementById('output'),
		status: document.getElementById('status')
	};
	
	jamTracksData = await loadJamTracksData();
	trackOverrides = await loadTrackOverrides();
	cosmeticIndex = await loadCosmeticIndex();

	// Initialize source/release controls - this augments elements with all source/release/settings fields
	initSourceReleaseControls({
		sources: ['itemShop', 'battlePass', 'musicPass', 'legoPass', 'questReward'],
		autoReleaseSources: ['battlePass', 'musicPass', 'legoPass']
	}, elements);

	// Initialize shared bundle controls
	initBundleControls(cosmeticIndex);
	setupBundleControls();

	// Initialize shared form behaviors
	initFormBehaviors(elements);

	setupEventHandlers();
	setupSearch();
}

// Set up event handlers
function setupEventHandlers() {
	const sharedMusicCheckboxes = [elements.sharedMusicEmote, elements.sharedMusicLobbyMusic, elements.sharedMusicContrail];

	sharedMusicCheckboxes.forEach(checkbox => {
		checkbox.addEventListener('change', (e) => {
			if (e.target.checked) {
				sharedMusicCheckboxes.forEach(cb => {
					if (cb !== e.target) cb.checked = false;
				});
			}
			const isChecked = sharedMusicCheckboxes.some(cb => cb.checked);
			elements.sharedMusicInputsContainer.style.display = isChecked ? 'block' : 'none';
			elements.addSharedMusicBtn.style.display = isChecked ? 'inline-block' : 'none';
			if (isChecked) {
				const inputs = elements.sharedMusicInputsContainer.querySelectorAll('.sharedMusicInput');
				inputs.forEach((inp, idx) => inp.hidden = false);
			}
		});
	});

	// Add shared music input handler
	elements.addSharedMusicBtn.addEventListener('click', addSharedMusicInput);

	elements.generateBtn.addEventListener('click', generatePage);
	elements.wikiPageBtn.addEventListener('click', openWikiPage);
	elements.copyBtn.addEventListener('click', copyToClipboard);
	elements.clearBtn.addEventListener('click', clearOutput);
}

function addSharedMusicInput() {
	const newRow = document.createElement('div');
	newRow.className = 'shared-music-input-row';
	newRow.style.marginTop = '0.5rem';
	newRow.innerHTML = `
		<span style="margin-right: 0.5rem;">and</span>
		<input type="text" class="sharedMusicInput" placeholder="e.g. Trophy Drop">
		<button type="button" class="remove-shared-music" style="margin-left: 0.5rem; padding: 0.3rem 0.6rem; font-size: 0.85rem;">Remove</button>
	`;
	elements.sharedMusicInputsContainer.appendChild(newRow);
	
	const removeBtn = newRow.querySelector('.remove-shared-music');
	removeBtn.addEventListener('click', () => newRow.remove());
}

function setupSearch() {
	elements.jamTrackInput.addEventListener('input', (e) => {
		const query = e.target.value.toLowerCase();
		elements.suggestions.innerHTML = '';
		
		if (query.length < 1 || !jamTracksData) return;
		
		const matches = [];
		for (const [key, trackData] of Object.entries(jamTracksData)) {
			if (key.startsWith('_') || !trackData.track) continue;
			
			const track = trackData.track;
			const title = track.tt || key;
			
			if (title.toLowerCase().includes(query) || key.toLowerCase().includes(query)) {
				matches.push({ key, title, data: trackData });
			}
		}
		
		matches.slice(0, 5).forEach(match => {
			const suggestion = document.createElement('div');
			if (trackOverrides && trackOverrides[match.key]) {
				suggestion.textContent = trackOverrides[match.key];
			} else {
				suggestion.textContent = match.title;
			}
			suggestion.onclick = () => {
				elements.jamTrackInput.value = trackOverrides[match.key] || match.title;
				currentTrackData = parseTrackData(match.key, match.data);

				elements.shopAppearances.value = elements.jamTrackInput.value.trim();

				const override = trackOverrides && trackOverrides[match.key];
				if (override) {
					elements.displayTitle.checked = true;
					elements.displayTitle.disabled = true;
				} else {
					elements.displayTitle.disabled = false;
				}

				if (currentTrackData.album && currentTrackData.album !== 'Fortnite') {
					elements.albumInput.value = currentTrackData.album;
				} else {
					elements.albumInput.value = '';
				}

				elements.suggestions.innerHTML = '';
				updateWikiPageButton();
			};
			elements.suggestions.appendChild(suggestion);
		});
	});
	
	// Hide suggestions when clicking outside
	document.addEventListener('click', (e) => {
		if (!elements.jamTrackInput.contains(e.target) && !elements.suggestions.contains(e.target)) {
			elements.suggestions.innerHTML = '';
		}
	});
}

async function updateWikiPageButton() {
	if (!currentTrackData) {
		elements.wikiPageBtn.disabled = true;
		elements.wikiPageBtn.textContent = 'Create page';
		return;
	}

	pageTitle = await determinePageTitle(currentTrackData.title, currentTrackData.key);
	console.log('Determined page title:', pageTitle);
	const exists = await pageExists(pageTitle);

	elements.wikiPageBtn.disabled = false;
	elements.wikiPageBtn.textContent = exists ? 'Edit page' : 'Create page';
}

async function generatePage() {
	hideStatus();
	const trackName = elements.jamTrackInput.value.trim();
	
	if (!trackName) {
		showStatus('Please enter a jam track name', 'error');
		return;
	}
	
	if (!currentTrackData) {
		if (jamTracksData) {
			for (const [key, trackData] of Object.entries(jamTracksData)) {
				if (key.startsWith('_') || !trackData.track) continue;
				
				const track = trackData.track;
				const title = track.tt || key;
				
				if (title.toLowerCase() === trackName.toLowerCase()) {
					currentTrackData = parseTrackData(key, trackData);
					break;
				}
			}
		}
		
		if (!currentTrackData) {
			showStatus('Track not found. Please select from suggestions.', 'error');
			return;
		}
	}

	let lyricSentences = [];
	if (currentTrackData.midiUrl) {
		try {
			const midiBytes = await decryptMidi(currentTrackData.midiUrl, AES_KEY);
			lyricSentences = extractFormattedProVocalsSentences(midiBytes);
		} catch (error) {
			console.warn("Failed to get lyrics:", error);
		}
	}
	
	// Build settings object - start with source/release settings from shared module
	const settings = getSourceReleaseSettings(elements);

	const validationError = validateSourceSettings(settings, elements);
	if (validationError) {
		showStatus(validationError, 'error');
		return;
	}
	
	// Add generator-specific settings
	settings.displayTitle = elements.displayTitle.checked;
	settings.isCollaboration = elements.collaborationCheck.checked;

	settings.sharesMusicWithEmote = elements.sharedMusicEmote.checked;
	settings.sharesMusicWithLobbyMusic = elements.sharedMusicLobbyMusic.checked;
	settings.sharesMusicWithContrail = elements.sharedMusicContrail.checked;
	// Collect all shared music inputs
	settings.sharedMusicInputs = Array.from(elements.sharedMusicInputsContainer.querySelectorAll('.sharedMusicInput'))
		.map(input => input.value.trim())
		.filter(val => val);

	settings.artistSpotifyLink = cleanSpotifyLink(elements.artistSpotifyLink.value.trim());
	settings.album = elements.albumInput.value.trim();
	settings.includeFeaturedRotation = elements.featuredRotationCheck.checked;
	settings.albumSpotifyLink = cleanSpotifyLink(elements.albumSpotifyLink.value.trim());
	settings.spotifyLink = cleanSpotifyLink(elements.spotifyLink.value.trim());
	settings.spotifyTitle = elements.spotifyTitle.value.trim();
	settings.ageRestricted = elements.ageRestricted.checked;
	
	const wikiText = generateWikiText(currentTrackData, lyricSentences, settings);
	elements.output.value = wikiText;
	elements.copyBtn.disabled = false;
	showStatus('Page generated successfully!', 'success');
}

function generateWikiText(track, lyricSentences = [], settings) {
	const duration = formatDuration(track.duration);
	const keyScale = formatKeyScale(track.music_key, track.scale);
	const templateId = getTemplateIdShort(track.templateId);

	const bundleEntries = getBundleEntries();
	
	// Process artist with link if provided
	let artist;
	if (settings.artistSpotifyLink) {
		artist = `[${settings.artistSpotifyLink} ${track.artist}]`;
	} else {
		artist = track.artist;
	}
	
	const album = settings.album || track.album;
	const spotifyTitle = settings.spotifyTitle || track.title;
	
	let wikiText = '';

	if (settings.isUnreleased) {
		wikiText += '{{Unreleased|Cosmetic}}\n';
	}
	
	if (settings.displayTitle) {
		wikiText += `{{DISPLAYTITLE:${track.title}}}\n`;
	}
	
	if (settings.isCollaboration) {
		wikiText += '{{Collaboration|Cosmetic}}\n';
	}
	
	const hasSharedMusic = settings.sharesMusicWithEmote || settings.sharesMusicWithLobbyMusic || settings.sharesMusicWithContrail;
	if (hasSharedMusic && settings.sharedMusicInputs && settings.sharedMusicInputs.length > 0) {
		let image = '';
		const firstMusic = settings.sharedMusicInputs[0];
		if (settings.sharesMusicWithEmote) {
			image = `${firstMusic} - Emote - Fortnite.png`;
		} else if (settings.sharesMusicWithLobbyMusic) {
			image = `${firstMusic} (Cover Art) - Lobby Music - Fortnite.png`;
		} else if (settings.sharesMusicWithContrail) {
			image = `${firstMusic} - Contrail - Fortnite.png`;
		}
		// Build location with multiple entries joined by "and"
		let location = '';
		settings.sharedMusicInputs.forEach((music, idx) => {
			if (idx > 0) location += ' and ';
			location += `[[${music}|<span style="color: white;">${music}</span>]]`;
		});
		wikiText += `{{SharedMusic|Image=${image}|Type=Jam Track|CosmeticType=Jam Track|Location=${location}}}\n`;
	}
	
	// Infobox
	wikiText += '{{Infobox Jam Tracks\n';
	wikiText += `|image = ${album !== 'Fortnite' && album || track.title} - Jam Track - Fortnite Festival.jpg\n`;
	wikiText += `|artist = ${artist}\n`;
	wikiText += `|year = ${track.year}\n`;
	wikiText += `|length = ${duration}\n`;
	wikiText += `|genre = ${track.genre}\n`;
	wikiText += `|key = ${keyScale}\n`;
	wikiText += `|bpm = ${track.bpm}\n`;

	if (album && album !== 'Fortnite') {
		wikiText += settings.albumSpotifyLink ?`|album = [${settings.albumSpotifyLink} ${album}]\n` : `|album = ${album}\n`;
	}

	wikiText += `|unlocked = ${generateUnlockedParameter(settings, bundleEntries)}\n`;
	wikiText += `|cost = ${generateCostParameter(settings, bundleEntries)}\n`;
	wikiText += `|release = ${generateReleaseParameter(settings)}\n`;

	if (settings.ageRestricted) {
		wikiText += '|age-restricted = y\n';
	}
	if (settings.isItemShop && settings.includeAppearances) {
		wikiText += `|appearances = ${settings.shopAppearances}\n`;
	}
	wikiText += `|ID = ${templateId}\n`;
	wikiText += '}}\n';

	wikiText += `'''${track.title}''' is a [[Jam Track]] in [[Fortnite]]`;

	wikiText += generateArticleIntro(settings, bundleEntries);

	const seasonFirstReleasedFlag = getSeasonReleased(settings.releaseDate, settings);
	if (seasonFirstReleasedFlag) {
		wikiText += ` ${track.title}${seasonFirstReleasedFlag}.`;
	}

	wikiText += '\n\n';
	
	// Difficulty section
	wikiText += '== Difficulty ==\n';
	wikiText += '{{FestivalDifficulty\n';
	wikiText += `|lead = ${track.difficulties.gr + 1 || 0}\n`;
	wikiText += `|bass = ${track.difficulties.ba + 1 || 0}\n`;
	wikiText += `|drums = ${track.difficulties.ds + 1 || 0}\n`;
	wikiText += `|vocals = ${track.difficulties.vl + 1 || 0}\n`;
	wikiText += `|prolead = ${track.difficulties.pg + 1 || 0}\n`;
	wikiText += `|probass = ${track.difficulties.pb + 1 || 0}\n`;
	wikiText += `|prodrums = ${track.difficulties.pd + 1 || 0}\n`;
	if (track.difficulties.bd) {
		wikiText += `|provocals = ${track.difficulties.bd + 1}\n`;
	}
	wikiText += '}}\n\n';
	
	// Lyrics section
	if (lyricSentences.length > 0) {
		wikiText += '== Lyrics ==\n';
		wikiText += '{{Scrollbox Clear\n';
		wikiText += '|BoxHeight = 450\n';
		wikiText += `|Content = '''${track.title} - ${track.artist}'''\n<br>`;
		wikiText += lyricSentences.join('\n') + '\n';
		wikiText += '}}\n\n';
	}
	
	// Item Shop Appearances
	if (settings.isItemShop && settings.includeAppearances) {
		wikiText += '== [[Item Shop]] Appearances ==\n';
		wikiText += '{{ItemShopAppearances\n';
		wikiText += `|name = ${settings.shopAppearances}\n`;
		if (track.title != settings.shopAppearances) wikiText += `|name2 = ${track.title}\n`;
		wikiText += '}}\n\n';
	}
	
	// Jam Track Appearances (conditional)
	if (settings.includeFeaturedRotation) {
		wikiText += '{{JamTrackAppearances}}\n\n';
	}
	
	// External Links (conditional)
	if (settings.spotifyLink) {
		wikiText += '== External Links ==\n';
		wikiText += `* {{Spotify}} [${settings.spotifyLink} ${spotifyTitle}]\n\n`;
	}
	
	// Categories
	wikiText += '[[Category:Jam Tracks]]\n';
	if (artist) {
		// Extract plain artist name from potential Spotify link format [link artist]
		let plainArtist = artist;
		const match = artist.match(/^\[.*?\s([^\]]+)\]$/);
		if (match) {
			plainArtist = match[1];
		}
		wikiText += `[[Category:Jam Tracks by ${plainArtist}]]\n`;
	}

	if (settings.isFree) {
		wikiText += `[[Category:Free Cosmetics]]\n`;
	}
	
	return wikiText;
}

function showStatus(message, type = 'info') {
	if (elements.status) {
		elements.status.textContent = message;
		elements.status.className = `status ${type}`;
		elements.status.classList.remove('hidden');
	}
}

function hideStatus() {
	if (elements.status) {
		elements.status.classList.add('hidden');
	}
}

async function copyToClipboard() {
	try {
		const content = elements.output.value;
		await navigator.clipboard.writeText(content);
		showStatus('Copied to clipboard!', 'success');
		setTimeout(hideStatus, 2000);
	} catch (error) {
		console.error('Failed to copy to clipboard:', error);
		showStatus('Failed to copy to clipboard', 'error');
		setTimeout(hideStatus, 3000);
	}
}


async function determinePageTitle(trackTitle, trackKey) {
	const override = trackOverrides && trackOverrides[trackKey];

	const matchingCosmetic = cosmeticIndex.find(cosmetic => cosmetic.name && (
		cosmetic.name === trackTitle ||
		(override && cosmetic.name === override)
	));

	const duplicates = Object.values(jamTracksData || {})
		.filter(t => t.track && (t.track.tt || t.track.key) === trackTitle);
	
	if (duplicates.length > 1) {
		return override;
	} else {
		return matchingCosmetic ? `${override || trackTitle} (Jam Track)` : override || trackTitle;
	}
}

async function openWikiPage() {	
	const exists = await pageExists(pageTitle);
	const wikiUrl = `https://fortnite.fandom.com/wiki/${encodeURIComponent(pageTitle)}`;
	const finalUrl = exists ? `${wikiUrl}?action=edit` : wikiUrl;
	
	window.open(finalUrl, '_blank');
	showStatus(`${exists ? 'Edit' : 'Create'} page opened in new tab`, 'success');
	setTimeout(hideStatus, 2000);
}

// Clear output
function clearOutput() {
	elements.output.value = '';
	elements.copyBtn.disabled = true;
	elements.jamTrackInput.value = '';
	elements.albumInput.value = '';
	elements.artistInput.value = '';
	elements.spotifyLink.value = '';
	elements.spotifyTitle.value = '';
	elements.collaborationCheck.checked = true;
	elements.featuredRotationCheck.checked = false;
	elements.displayTitle.checked = false;
	
	// Clear shared music inputs and hide container
	elements.sharedMusicInputsContainer.querySelectorAll('.sharedMusicInput').forEach((inp, idx) => {
		if (idx === 0) inp.value = '';
		else inp.parentElement.remove();
	});
	elements.sharedMusicEmote.checked = false;
	elements.sharedMusicLobbyMusic.checked = false;
	elements.sharedMusicContrail.checked = false;
	elements.sharedMusicInputsContainer.style.display = 'none';
	elements.addSharedMusicBtn.style.display = 'none';
	
	if (elements.releasedSwitch) elements.releasedSwitch.checked = false;
	if (elements.releaseDate) elements.releaseDate.value = '';
	if (elements.itemShopHistory) elements.itemShopHistory.checked = false;
	if (elements.shopHistoryPart) elements.shopHistoryPart.value = '';
	if (elements.releasedLabel) elements.releasedLabel.textContent = 'No';
	[
		elements.sourceItemShop,
		elements.sourceBattlePass,
		elements.sourceMusicPass,
		elements.sourceLegoPass,
		elements.sourceQuestReward
	].filter(Boolean).forEach((cb) => {
		cb.checked = false;
		cb.disabled = false;
		cb.dispatchEvent(new Event('change'));
	});
	currentTrackData = null;
	elements.wikiPageBtn.disabled = true;
	elements.wikiPageBtn.textContent = 'Create page';
	hideStatus();
}

// Wait for source controls to be ready, then initialize
function waitForSourceControls() {
	return new Promise((resolve) => {
		const container = document.getElementById('source-release-container');
		if (container && container.children.length > 0) {
			resolve();
		} else {
			document.addEventListener('sourceControlsReady', resolve, { once: true });
		}
	});
}

// Initialise when DOM is loaded AND source controls are ready
document.addEventListener('DOMContentLoaded', async () => {
	await waitForSourceControls();
	init();
});