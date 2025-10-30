import { loadGzJson } from '../../../tools/jsondata.js';

// Global variables
let jamTracksData = null;
let currentTrackData = null;

// Load jam tracks data from API
async function loadJamTracksData() {
    try {
        console.log('Loading jam tracks data from API...');
        
        // Use CORS proxy to bypass CORS Policy restrictions
        const apiUrl = 'https://fortnitecontent-website-prod07.ol.epicgames.com/content/api/pages/fortnite-game/spark-tracks';
        const corsProxyUrl = 'https://corsproxy.io/?';
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
        templateId: track.ti || ''
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

// Initialize the application
async function init() {
    jamTracksData = await loadJamTracksData();
    setupEventHandlers();
    setupSearch();
}

// Set up event handlers
function setupEventHandlers() {
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    generateBtn.addEventListener('click', generatePage);
    copyBtn.addEventListener('click', copyToClipboard);
    clearBtn.addEventListener('click', clearOutput);
}

// Set up search functionality with suggestions
function setupSearch() {
    const input = document.getElementById('jamTrackInput');
    const suggestionsDiv = document.getElementById('suggestions');
    
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        suggestionsDiv.innerHTML = '';
        
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
            suggestion.textContent = match.title;
            suggestion.addEventListener('click', () => {
                input.value = match.title;
                currentTrackData = parseTrackData(match.key, match.data);
                suggestionsDiv.innerHTML = '';
            });
            suggestionsDiv.appendChild(suggestion);
        });
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.innerHTML = '';
        }
    });
}

function generatePage() {
    const trackName = document.getElementById('jamTrackInput').value.trim();
    
    if (!trackName) {
        alert('Please enter a jam track name');
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
            alert('Track not found. Please select from suggestions.');
            return;
        }
    }
    
    const wikiText = generateWikiText(currentTrackData);
    const output = document.getElementById('output');
    output.value = wikiText;
    document.getElementById('copy-btn').disabled = false;
}

function generateWikiText(track) {
    const duration = formatDuration(track.duration);
    const keyScale = formatKeyScale(track.music_key, track.scale);
    const templateId = getTemplateIdShort(track.templateId);
    
    // Get form values
    const includeCollaboration = document.getElementById('collaborationCheck').checked;
    const sharedMusicEmote = document.getElementById('sharedMusicEmote').value.trim();
    let artist;
    const artistInput = cleanSpotifyLink(document.getElementById('artistInput').value.trim());
    if (artistInput) {
        artist = `[${artistInput} ${track.artist}]`;
    } else {
        artist = track.artist;
    }
    const album = document.getElementById('albumInput').value.trim() || track.album;
    const appearances = document.getElementById('appearancesInput').value.trim();
    const includeFeaturedRotation = document.getElementById('featuredRotationCheck').checked;
    const spotifyLink = cleanSpotifyLink(document.getElementById('spotifyLink').value.trim());
    const spotifyTitle = document.getElementById('spotifyTitle').value.trim() || track.title;
    
    let wikiText = '';
    
    if (includeCollaboration) {
        wikiText += '{{Collaboration|Cosmetic}}\n';
    }
    
    if (sharedMusicEmote) {
        wikiText += `{{SharedMusic|Image=${sharedMusicEmote} - Emote - Fortnite.png|Type=Jam Track|CosmeticType=Jam Track|Location=[[${sharedMusicEmote}|<span style="color: white;">${sharedMusicEmote}</span>]]}}\n`;
    }
    
    // Infobox
    wikiText += '{{Infobox Jam Tracks\n';
    wikiText += `|image = ${album || track.title} - Jam Track - Fortnite Festival.jpg\n`;
    wikiText += `|artist = ${artist}\n`;
    wikiText += `|year = ${track.year}\n`;
    wikiText += `|length = ${duration}\n`;
    wikiText += `|genre = ${track.genre}\n`;
    wikiText += `|key = ${keyScale}\n`;
    wikiText += `|bpm = ${track.bpm}\n`;
    wikiText += '|unlocked = \n';
    wikiText += '|cost = \n';
    wikiText += '|release = \n';
    wikiText += `|appearances = ${appearances}\n`;
    wikiText += `|preview = [[File:${track.title} (Preview) - Jam Track - Fortnite Festival.ogg]]\n`;
    wikiText += `|ID = ${templateId}\n`;
    wikiText += '}}\n';
    
    // Introduction
    wikiText += `'''${track.title}''' is a [[Jam Track]] in [[Fortnite]].\n\n`;
    
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
    wikiText += '== Lyrics ==\n';
    wikiText += '{{Scrollbox Clear\n';
    wikiText += '|BoxHeight = 450\n';
    wikiText += '|Content = \n';
    wikiText += '}}\n\n';
    
    // Item Shop Appearances
    if (appearances) {
        wikiText += '== [[Item Shop]] Appearances ==\n';
        wikiText += '{{ItemShopAppearances\n';
        wikiText += `|name = ${appearances}\n`;
        wikiText += '}}\n\n';
    }
    
    // Jam Track Appearances (conditional)
    if (includeFeaturedRotation) {
        wikiText += '{{JamTrackAppearances}}\n\n';
    }
    
    // External Links (conditional)
    if (spotifyLink) {
        wikiText += '== External Links ==\n';
        wikiText += `* {{Spotify}} [${spotifyLink} ${spotifyTitle}]\n\n`;
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
    
    return wikiText;
}

// Copy to clipboard
async function copyToClipboard() {
    const output = document.getElementById('output');
    try {
        await navigator.clipboard.writeText(output.value);
        const btn = document.getElementById('copy-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy: ', err);
        // Fallback for older browsers
        output.select();
        document.execCommand('copy');
    }
}

// Clear output
function clearOutput() {
    document.getElementById('output').value = '';
    document.getElementById('copy-btn').disabled = true;
    document.getElementById('jamTrackInput').value = '';
    document.getElementById('albumInput').value = '';
    document.getElementById('sharedMusicEmote').value = '';
    document.getElementById('artistInput').value = '';
    document.getElementById('appearancesInput').value = '';
    document.getElementById('spotifyLink').value = '';
    document.getElementById('spotifyTitle').value = '';
    document.getElementById('collaborationCheck').checked = true;
    document.getElementById('featuredRotationCheck').checked = false;
    currentTrackData = null;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);