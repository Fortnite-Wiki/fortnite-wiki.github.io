import { characterBundlePattern, forceTitleCase, abbreviate, getFormattedReleaseDate, getItemShopHistoryDate, ensureVbucksTemplate } from './utils.js';
import { SEASON_RELEASE_DATES, OG_SEASON_RELEASE_DATES, FESTIVAL_SEASON_RELEASE_DATES, LEGO_SEASON_RELEASE_DATES } from '../../../data/datesAndVersions.js';

export function generateUnlockedParameter(settings, bundleEntries = []) {
    let unlocked = '';

    if (settings.isFortniteCrew && settings.crewMonth && settings.crewYear) {
        unlocked = `[[${settings.crewMonth} ${settings.crewYear} Fortnite Crew Pack]]`;
    
    } else if (settings.isBattlePass && settings.bpPage && settings.bpChapter && settings.bpSeasonNum) {
        const freeFlag = settings.passFreeBP ? "|Free" : "";
        const bonusFlag = settings.bpBonus ? "Bonus Rewards " : "";
        const miniSeasonFlag = settings.isMiniSeason ? "/MiniSeason" : "";
        if (settings.battlePassMode === 'non-linear' && settings.bpNonLinearSetName) {
            const rawName = settings.bpNonLinearSetName.trim();
            const possessive = (rawName.slice(-1).toLowerCase() === 's') ? `[[${rawName}]]'` : `[[${rawName}]]'s`;
            unlocked = `Page ${settings.bpPage} <br> ${possessive} ${bonusFlag}Set <br> {{BattlePass${miniSeasonFlag}|${settings.bpChapter}|${settings.bpSeasonNum}${freeFlag}}}`;
        } else {
            unlocked = `${bonusFlag}Page ${settings.bpPage} <br> {{BattlePass${miniSeasonFlag}|${settings.bpChapter}|${settings.bpSeasonNum}${freeFlag}}}`;
        }
    
    } else if (settings.isOGPass && settings.ogPage && settings.ogSeason) {
        const freeFlag = settings.passFreeOG ? "|Free" : "";
        unlocked = `Page ${settings.ogPage} <br> {{OGPass|${settings.ogSeason}${freeFlag}}}`;
    
    } else if (settings.isMusicPass && settings.musicPage && settings.musicSeason) {
        const freeFlag = settings.passFreeMusic ? "|Free" : "";
        unlocked = `Page ${settings.musicPage} <br> {{MusicPass|${settings.musicSeason}${freeFlag}}}`;
    
    } else if (settings.isLEGOPass && settings.legoPage && settings.legoSeason) {
        const freeFlag = settings.passFreeLEGO ? "|Free" : "|";
        unlocked = `Page ${settings.legoPage} <br> {{LEGOPass|${settings.legoSeason}${freeFlag}|${abbreviate(settings.legoSeason)}}}`;
    
    } else if (settings.isQuestReward) {
        unlocked = `[[${settings.questName}]]`;
    
    } else if (settings.isRocketPass) {
        unlocked = `Level ${settings.rocketPassLevel} <br> {{RocketPass|${settings.rocketPassSeason}}}`;
    
    } else if (settings.isItemShop && !settings.isUnreleased) {
        if (settings.shopCost || bundleEntries.length == 0) {
            unlocked = "[[Item Shop]]";
        }
        if (bundleEntries.length > 0) {
            const bundleNames = bundleEntries
                .map(be => {
                    if (!be.bundleName || !be.bundleName.value) return null;
                    const rawName = be.bundleName.value.trim();
                    const name = (be.forceTitleCase && be.forceTitleCase.checked) ? forceTitleCase(rawName) : rawName;
                    const addItemShopBundleTag = characterBundlePattern.test(be.bundleID.value);
                    return addItemShopBundleTag ? `[[${name} (Item Shop Bundle)|${name}]]` : `[[${name}]]`;
                })
                .filter(bn => bn !== null);
            if (bundleNames.length > 0) {
                unlocked = unlocked ? unlocked + " <br> " + bundleNames.join(" <br> ") : bundleNames.join(" <br> ");
            }
        }
    }

    return unlocked;
}

export function generateCostParameter(settings, bundleEntries = [], isFestivalCosmetic = false, name = '', rarity = '', cosmeticType = '', instrumentType = '') {
    let cost = ''

    if ((settings.isBattlePass && settings.passFreeBP) || (settings.isOGPass && settings.passFreeOG) || (settings.isMusicPass && settings.passFreeMusic) || (settings.isLEGOPass && settings.passFreeLEGO)) {
        cost = "Free";
    
    } else if (settings.isFortniteCrew || rarity === "Crew Series") {
        cost = "$11.99 <br /> ({{Fortnite Crew}})";
    
    } else if (settings.isBattlePass && settings.bpChapter && settings.bpSeasonNum) {
        const miniSeasonFlag = settings.isMiniSeason ? "/MiniSeason" : "";
        cost = `{{V-Bucks|1,000}} <br> ({{BattlePass${miniSeasonFlag}|${settings.bpChapter}|${settings.bpSeasonNum}}})`;
    
    } else if (settings.isOGPass && settings.ogSeason) {
        cost = `{{V-Bucks|1,000}} <br> ({{OGPass|${settings.ogSeason}}})`;
    
    } else if (settings.isMusicPass && settings.musicSeason) {
        cost = `{{V-Bucks|1,400}} <br> ({{MusicPass|${settings.musicSeason}}})`;
    
    } else if (settings.isLEGOPass && settings.legoSeason) {
        cost = `{{V-Bucks|1,400}} <br> ({{LEGOPass|${settings.legoSeason}||${abbreviate(settings.legoSeason)}}})`;
    
    } else if (settings.isItemShop && settings.shopCost) {
        if (isFestivalCosmetic && cosmeticType != "Aura" && instrumentType != cosmeticType
            && (cosmeticType == "Back Bling" || cosmeticType == "Pickaxe")
        ) {
            cost = ensureVbucksTemplate(settings.shopCost) + ` <small>([[${name} (${instrumentType})|${name}]])</small>`;
        } else {
            cost = ensureVbucksTemplate(settings.shopCost);
        }
    
    } else if (settings.isQuestReward && settings.questCost) {
        cost = settings.questCost;
    
    } else if (settings.isRocketPass) {
        cost = `{{RLCredits|1,000}} <br> ({{RocketPass|${settings.rocketPassSeason}}})`;
    }
    

    if (settings.isItemShop && bundleEntries.length > 0) {
        const bundleCosts = bundleEntries
            .map(be => {
                if (be.bundleName.value && be.bundleCost.value) {
                    const rawName = be.bundleName.value.trim();
                    const name = (be.forceTitleCase && be.forceTitleCase.checked) ? forceTitleCase(rawName) : rawName;
                    const addItemShopBundleTag = characterBundlePattern.test(be.bundleID.value);
                    return `${ensureVbucksTemplate(be.bundleCost.value.trim())} <small>([[${addItemShopBundleTag ? `${name} (Item Shop Bundle)|${name}` : name}]])</small>`;
                }
                return null;
            })
            .filter(bc => bc !== null);
        if (bundleCosts.length > 0) {
            cost = cost ? cost + " <br> " + bundleCosts.join(" <br> ") : bundleCosts.join(" <br> ");
        }
    }

    return cost;
}

export function generateReleaseParameter(settings) {
	if (settings.releaseDate) {
		if (settings.itemShopHistory) {
			return getItemShopHistoryDate(settings.releaseDate, settings);
		} else {
			return getFormattedReleaseDate(settings.releaseDate);
		}
	} else if (settings.isFortniteCrew && settings.crewMonth && settings.crewYear) {
		return `[[Item Shop History/${settings.crewMonth} 1st ${settings.crewYear}|${settings.crewMonth} 1st ${settings.crewYear}]]`;
	} else if (settings.isBattlePass && settings.bpChapter && settings.bpSeasonNum) {
		const seasonKey = `C${settings.bpChapter}${settings.isMiniSeason ? 'M' : ''}S${settings.bpSeasonNum}`;
		const seasonReleaseDate = SEASON_RELEASE_DATES[seasonKey];
		if (seasonReleaseDate) {
			return getFormattedReleaseDate(seasonReleaseDate);
		} else {
			return getFormattedReleaseDate();
		}
	} else if (settings.isOGPass && settings.ogSeason) {
		const ogReleaseDate = OG_SEASON_RELEASE_DATES[settings.ogSeason];
		if (ogReleaseDate) {
			return getFormattedReleaseDate(ogReleaseDate);
		} else {
			return getFormattedReleaseDate();
		}
	}
	else if (settings.isMusicPass && settings.musicSeason) {
		const musicReleaseDate = FESTIVAL_SEASON_RELEASE_DATES[settings.musicSeason];
		if (musicReleaseDate) {
			return getFormattedReleaseDate(musicReleaseDate);
		}
		else {
			return getFormattedReleaseDate();
		}
	}
	else if (settings.isLEGOPass && settings.legoSeason) {
		const legoReleaseDate = LEGO_SEASON_RELEASE_DATES[settings.legoSeason];
		if (legoReleaseDate) {
			return getFormattedReleaseDate(legoReleaseDate);
		}
		else {
			return getFormattedReleaseDate();
		}
	}

    return '';
}

export function generateArticleIntro(settings, bundleEntries = [], name = '', cosmeticType = '', isFestivalCosmetic = false, instrumentType = '', usePlural = false) {
    let article = '';

    const obtainedOnPageCompletion =
        (settings.isBattlePass && settings.bpPageCompletion) ||
        (settings.isOGPass && settings.ogPageCompletion) ||
        (settings.isMusicPass && settings.musicPageCompletion) ||
        (settings.isLEGOPass && settings.legoPageCompletion);
    
    const pageCompletionFlag = obtainedOnPageCompletion ? " by purchasing all cosmetics" : "";

    if (settings.isFortniteCrew && settings.crewMonth && settings.crewYear) {
        article += ` that can be obtained by becoming a member of the [[Fortnite Crew]] during ${settings.crewMonth} ${settings.crewYear}, as part of the [[${settings.crewMonth} ${settings.crewYear} Fortnite Crew Pack]].`;
    
    } else if (settings.isBattlePass && settings.bpPage && settings.bpChapter && settings.bpSeasonNum) {
        const bonusFlag = settings.bpBonus ? "Bonus Rewards " : "";
        const miniSeasonFlag = settings.isMiniSeason ? "Mini " : "";

        if (settings.battlePassMode === 'non-linear' && settings.bpNonLinearSetName) {
            const rawName = settings.bpNonLinearSetName.trim();
            const possessive = (rawName.slice(-1).toLowerCase() === 's') ? `[[${rawName}]]'` : `[[${rawName}]]'s`;
            article += ` that can be obtained${pageCompletionFlag} on Page ${settings.bpPage} of ${possessive} ${bonusFlag}Set in the [[Chapter ${settings.bpChapter}: ${miniSeasonFlag}Season ${settings.bpSeasonNum}]] [[Battle Pass]]`;
            if (settings.bpNonLinearLevel) {
                article += `, which can only be unlocked after reaching Level ${settings.bpNonLinearLevel}`;
            }
            article += ".";
        } else {
            article += ` that can be obtained${pageCompletionFlag} on ${bonusFlag}Page ${settings.bpPage} of the [[Chapter ${settings.bpChapter}: ${miniSeasonFlag}Season ${settings.bpSeasonNum}]] [[Battle Pass]].`;
        }
    
    } else if (settings.isOGPass && settings.ogPage && settings.ogSeason) {
        article += ` that can be obtained${pageCompletionFlag} on Page ${settings.ogPage} of the [[OG Pass#Season ${settings.ogSeason}|Season ${settings.ogSeason} OG Pass]].`;
    
    } else if (settings.isMusicPass && settings.musicPage && settings.musicSeason) {
        article += ` that can be obtained${pageCompletionFlag} on Page ${settings.musicPage} of the [[Music Pass#Season ${settings.musicSeason}|Season ${settings.musicSeason} Music Pass]].`;
    
    } else if (settings.isLEGOPass && settings.legoPage && settings.legoSeason) {
        article += ` that can be obtained${pageCompletionFlag} on Page ${settings.legoPage} of the [[LEGO Fortnite:LEGO® Pass#${settings.legoSeason}|${settings.legoSeason} LEGO® Pass]].`;
    
    } else if (settings.isRocketPass && settings.rocketPassLevel && settings.rocketPassSeason) {
        article += ` can be unlocked by reaching Level ${settings.rocketPassLevel} of the [[w:c:rocketleague:Season ${settings.rocketPassSeason}#Rocket_Pass|Season ${settings.rocketPassSeason} Rocket Pass]].`;
    
    } else if (settings.isUnreleased) {
        article += ` that ${usePlural ? 'are' : 'is'} currently unreleased.`;
    
    } else if (settings.isItemShop) {
        let bundles = "";
        if (bundleEntries.length > 0) {
            const bundlesToAdd = bundleEntries
                .map(be => {
                    if (be.bundleName.value && be.bundleCost.value) {
                        const rawName = be.bundleName.value.trim();
                        const name = (be.forceTitleCase && be.forceTitleCase.checked) ? forceTitleCase(rawName) : rawName;
                        const addItemShopBundleTag = characterBundlePattern.test(be.bundleID.value);
                        const theFlag = rawName.toLowerCase().startsWith("the ") || addItemShopBundleTag ? "" : "the ";
                        const i = bundleEntries.indexOf(be);
                        const previousHas = i > 0 && bundleEntries.slice(0, i).some(b => b.bundleName && b.bundleName.value && b.bundleCost && b.bundleCost.value);
                        const orFlag = (settings.shopCost || previousHas) ? " or " : "";
                        const itemShopFlag = (!settings.shopCost && !previousHas && orFlag == "") ? "in the [[Item Shop]] " : "";
                        return `${orFlag}${itemShopFlag}with ${theFlag}[[${addItemShopBundleTag ? `${name} (Item Shop Bundle)|${name}` : name}]] for ${ensureVbucksTemplate(be.bundleCost.value.trim())}`;
                    }
                    return null;
                })
                .filter(bc => bc !== null);
            if (bundlesToAdd.length > 0) {
                bundles = bundlesToAdd.join("");
            }
        }

        let bundledWithFlag = "";
        if (isFestivalCosmetic && cosmeticType != "Aura" && instrumentType != cosmeticType
            && (cosmeticType == "Back Bling" || cosmeticType == "Pickaxe")
        ) {
            bundledWithFlag = ` with [[${name} (${instrumentType})|${name}]]`;
        }

        const itemShopFlag = settings.shopCost ? `in the [[Item Shop]]${bundledWithFlag} for ${ensureVbucksTemplate(settings.shopCost)}` : "";
        if (itemShopFlag || bundles) {
            article += ` that can be purchased ${itemShopFlag}${bundles}.`;
        } else {
            article += ".";
        }
    
    } else if (settings.isQuestReward && settings.questName) {
        article += ` that can be obtained as a reward from [[${settings.questName}]].`;
    
    } else {
        article += ".";
    }

    return article;
}