/*
Adapted from:
- https://github.com/hmxmilohax/festivalinfobot/blob/main/bot/commands/lyrics.py
- https://github.com/hmxmilohax/festivalinfobot/blob/main/bot/tools/midi.py
*/

import { parseMidi } from 'https://cdn.jsdelivr.net/npm/midi-file@1.1.2/+esm';

const EVENT_MAP = {
    'intro': 'Intro',
    'verse': 'Verse',
    'build': 'Build',
    'chorus': 'Chorus',
    'prechorus': 'Pre-Chorus',
    'breakdown': 'Breakdown',
    'bridge': 'Bridge',
    'drop': 'Drop',
    'solo_guitar': 'Guitar Solo',
    'solo_bass': 'Bass Solo',
    'solo_drums': 'Drum Solo',
    'solo_vocals': 'Vocal Solo',
    'solo_keys': 'Keyboard Solo',
    'outro': 'Outro',
}

const decoder = new TextDecoder('utf-8');

export async function decryptMidi(urlToEncryptedDat, aesKey) {
    const encryptedBuffer = await fetch(urlToEncryptedDat).then(r => r.arrayBuffer());
    const datBytes = new Uint8Array(encryptedBuffer);

    if (isMidiHeader(datBytes, 0)) {
        console.log("MIDI file is already decrypted");
        return datBytes.buffer;
    }

    const key = CryptoJS.enc.Hex.parse(aesKey);
    const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.lib.WordArray.create(datBytes) },
        key,
        { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }
    );

	const decryptedBytes = new Uint8Array(decrypted.sigBytes);
	for (let i = 0; i < decrypted.sigBytes; i++) {
		decryptedBytes[i] = (decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	}

    return normalizeMidiBuffer(decryptedBytes).buffer;
}

export function extractFormattedProVocalsSentences(midiArrayBuffer) {
	const normalized = normalizeMidiBuffer(midiArrayBuffer);
	const midi = parseMidi(normalized);

	const tracks = midi.tracks || [];

	const proVocalsTrack = findTrackByName(tracks, 'PRO VOCALS');
	if (!proVocalsTrack) {
		throw new Error('Pro Vocals not supported');
	}

	const messages = toAbsoluteTime(proVocalsTrack);
	const messagesOnlyNotes = messages
		.filter(isNoteEvent)
		.map(event => ({
			...event,
			note: event.noteNumber,
			type: event.type
		}))
		.filter(m => Number.isInteger(m.note));

	const messagesOnlyPhrases = messagesOnlyNotes
		.filter(m => m.note === 105)
		.sort((a, b) => (a.time - b.time) || (a.note - b.note));

	const phrases = [];
	let curPhrase = null;
	for (const phrase of messagesOnlyPhrases) {
		if (phrase.type === 'noteOn' && !curPhrase) {
			curPhrase = {
				start: phrase.time,
				note: phrase.note,
				end: null,
				notes: []
			};
		} else if ((phrase.type === 'noteOff' || phrase.type === 'noteOn') && curPhrase && phrase.note === curPhrase.note) {
			curPhrase.end = phrase.time;
			phrases.push(curPhrase);
			curPhrase = null;
		}
	}

	const messagesOnlyLyrics = messages
		.filter(m => m.type === 'lyrics')
		.map(m => ({ ...m, text: decodeToUtf8(m.text) }))
		.sort((a, b) => a.time - b.time);

	const messagesOnlySung = messagesOnlyNotes
		.filter(m => m.note < 85 && m.note > 35)
		.sort((a, b) => a.time - b.time);

	const sung = [];
	const curSung = {};
	for (const s of messagesOnlySung) {
		if (s.type === 'noteOn') {
			if (curSung[s.note]) {
				curSung[s.note].end = s.time;
				sung.push(curSung[s.note]);
				curSung[s.note] = null;
				continue;
			}

			curSung[s.note] = {
				start: s.time,
				end: null,
				note: s.note,
				text: null
			};
		} else if (s.type === 'noteOff' && curSung[s.note]) {
			curSung[s.note].end = s.time;
			sung.push(curSung[s.note]);
			curSung[s.note] = null;
		}
	}

	sung.sort((a, b) => a.start - b.start);

	const messagesOnlyOverdrive = messagesOnlyNotes.filter(m => m.note === 116);
	const overdrivePhrases = [];
	let curOverdrivePhrase = null;
	for (const phrase of messagesOnlyOverdrive) {
		if (phrase.type === 'noteOn') {
			curOverdrivePhrase = {
				start: phrase.time,
				note: phrase.note,
				end: null,
				notes: []
			};
		} else if (phrase.type === 'noteOff' && curOverdrivePhrase && phrase.note === curOverdrivePhrase.note) {
			curOverdrivePhrase.end = phrase.time;
			overdrivePhrases.push(curOverdrivePhrase);
			curOverdrivePhrase = null;
		}
	}

	for (const lyric of messagesOnlyLyrics) {
		const matchingSung = sung.find(s => s.start === lyric.time);
		if (matchingSung) {
			matchingSung.text = lyric.text;
		}
	}

	for (let i = 0; i < phrases.length; i++) {
		const phrase = phrases[i];
		const nextPhrase = phrases[i + 1] || null;
		phrase.notes = [];

		for (const s of sung) {
			const a = s.start >= phrase.start;
			const b = s.end != null && phrase.end != null && s.end <= phrase.end;
			const c = s.text && s.text.trim().length > 0;
			const d = nextPhrase ? s.end < nextPhrase.start : true;

			if (a && b && c && d) {
				phrase.notes.push(s);
			}
		}
	}

	const sectionTrack = findTrackByName(tracks, 'SECTION');
	if (sectionTrack) {
		const sectionMessages = toAbsoluteTime(sectionTrack);
		for (const m of sectionMessages) {
			if (m.type === 'trackName') {
				continue;
			}

			const decodedText = decodeToUtf8(m.text);
			if (decodedText && decodedText.trim().length > 0) {
				phrases.push({
					start: m.time,
					note: null,
					end: m.time,
					notes: [{
						start: m.time,
						end: m.time,
						note: null,
						text: `SPECIAL-${decodedText}`
					}]
				});
			}
		}
	}

	for (const phrase of phrases) {
		const isOverdriveActive = overdrivePhrases.find(od => od.end != null && od.start <= phrase.start && phrase.start < od.end);
		if (isOverdriveActive) {
			phrase.notes.unshift({
				start: phrase.start,
				end: phrase.start,
				note: 116,
				text: '[[OD]]'
			});
		}
	}

	phrases.sort((a, b) => {
		if (a.start !== b.start) {
			return a.start - b.start;
		}
		const aSpecial = hasSpecial(a);
		const bSpecial = hasSpecial(b);

		return aSpecial === bSpecial ? 0 : (aSpecial ? -1 : 1);
	});

	const sentences = [];
    let verseCount = 0;
	for (const phrase of phrases) {
		let sentenceText = '';
		let overdriveLine = false;
		let isSpecialLine = false;
		for (let i = 0; i < phrase.notes.length; i++) {
			const note = phrase.notes[i];
			if (!note.text) continue;

			let noteText = note.text.trim();

			if (noteText.startsWith('SPECIAL-')) {
                sentences.push(''); // Add an empty line before special sections

                let specialText = noteText.replace('SPECIAL-', '').replace('[', '').replace(']', '');
                specialText = EVENT_MAP[specialText];
				isSpecialLine = true;

                if (specialText === 'Verse') {
                    sentenceText += `'''[${specialText} ${++verseCount}]'''`;
                } else {
                    sentenceText += `'''[${specialText}]'''`;
                }
				continue;
			}
			if (noteText === '[[OD]]') {
				overdriveLine = true;
				continue;
			}

			const shouldNotSpace = noteText.includes('-') || noteText.includes('=') || noteText.includes('+');
			const isLastSyllable = i === phrase.notes.length - 1;

			noteText = noteText.replace(/-/g, '');
			noteText = noteText.replace(/\+/g, '');
			noteText = noteText.replace(/=/g, '-');
			noteText = noteText.replace(/#/g, '');
			noteText = noteText.replace(/\^/g, '');
			noteText = noteText.replace(/\*/g, '');
			noteText = noteText.replace(/%/g, '');
			noteText = noteText.replace(/§/g, ' ');
			noteText = noteText.replace(/\$/g, '');
			noteText = noteText.replace(/_/g, '');

			sentenceText += noteText;
			if (!shouldNotSpace && !isLastSyllable) {
				sentenceText += ' ';
			}
		}

        sentenceText = sentenceText.trim();
		if (overdriveLine && !isSpecialLine && sentenceText.length > 0) {
			sentenceText = `{{OverdriveLyric|${sentenceText}}}`;
		}

		if (sentenceText.length > 0) {
			sentences.push(sentenceText + '<br>');
		}
	}

	return sentences;
}

function decodeToUtf8(data) {
	if (!data) return '';

	if (typeof data === 'string') {
		const bytes = new Uint8Array(data.length);
		for (let i = 0; i < data.length; i++) {
			bytes[i] = data.charCodeAt(i);
		}
		return decoder.decode(bytes);
	}
	return decoder.decode(new Uint8Array(data));
}

function toAbsoluteTime(track) {
	let time = 0;
	return track.map(event => {
		time += event.deltaTime || 0;
		return { ...event, time };
	});
}

function getTrackName(track) {
	const nameEvent = track.find(e => e.type === 'trackName' && e.text);
	return nameEvent ? nameEvent.text : '';
}

function findTrackByName(tracks, name) {
	return tracks.find(track => getTrackName(track) === name);
}

function isNoteEvent(event) {
	return event.type === 'noteOn' || event.type === 'noteOff';
}

function hasSpecial(phrase) {
	return phrase.notes.some(note => note.text && note.text.startsWith('SPECIAL-'));
}

function normalizeMidiBuffer(input) {
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (bytes.length < 4) throw new Error('Bad MIDI file. Too small to contain header.');
	if (isMidiHeader(bytes, 0)) return bytes;

	const offset = findMidiHeaderOffset(bytes);
	if (offset >= 0) return bytes.subarray(offset);

	const headerHex = Array.from(bytes.subarray(0, 4))
		.map(b => b.toString(16).padStart(2, '0'))
		.join(' ');
	throw new Error(`Bad MIDI file. Expected 'MThd' header. First bytes: ${headerHex}`);
}

function isMidiHeader(bytes, offset) {
	return (
		bytes[offset] === 0x4d &&
		bytes[offset + 1] === 0x54 &&
		bytes[offset + 2] === 0x68 &&
		bytes[offset + 3] === 0x64
	);
}

function findMidiHeaderOffset(bytes) {
	for (let i = 0; i <= bytes.length - 4; i++) {
		if (isMidiHeader(bytes, i)) return i;
	}
	return -1;
}
