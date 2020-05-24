import { WiqlOperators_MacroCurrentIteration, WiqlOperators_MacroTeamAreas } from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.Common";

export interface IParsedCurrentIteration {
    team?: string;
    offset: number;
}

// Example match: "@currentIteration('team') + 1"
// Capture Group:                                                                                  1                               2              3
const currentIterationRegex = new RegExp(`^@${WiqlOperators_MacroCurrentIteration}\\s*(?:\\(\\s*'(.*?)'\\s*\\))?\\s*(?:(\\+|-)\\s*((?:\\+|-)?\\d*)?)?$`, "i");

/**
 * Parse '@currentiteration(team) + offset'
 * @param text
 */
export function parseCurrentIteration(text: string): IParsedCurrentIteration | null {
    const match = text && text.trim().match(currentIterationRegex);
    if (!match) {
        return null;
    }
    const [, team, plusMinus, offsetText] = match;
    let offset = offsetText && (plusMinus === "+" ? +offsetText : -offsetText);
    if (isNaN(offset)) {
        offset = 0;
    }

    return {team, offset};
}
export interface IParsedAreas {
    team?: string;
}

// Example match: "@Areas('Team')"
// Capture Group:                                                             1
const areasRegex = new RegExp(`^@${WiqlOperators_MacroTeamAreas}\\s*(?:\\(\\s*'([^']*?)'\\s*\\))?$`, "i");

/**
 * Parse '@parseTeamAreas(team)'
 * @param text
 */
export function parseTeamAreas(text: string): IParsedAreas | null {
    const match = text && text.trim().match(areasRegex);
    if (!match) {
        return null;
    }
    const [, team] = match;

    return {team};
}
