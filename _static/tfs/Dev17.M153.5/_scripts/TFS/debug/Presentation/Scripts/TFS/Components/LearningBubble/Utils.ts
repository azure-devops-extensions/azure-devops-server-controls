import { getService, SettingsUserScope } from "VSS/Settings/Services";
import * as VSSError from "VSS/Error";

// Local store to override the value sent by the data provider if it has changed since page load
const clientSideFlagValues: { [settingsKey: string]: boolean } = {};

export function shouldShowLearningBubble(settingsKey: string): boolean {
    const settingsService = getService();
    const hasUserSeenBubble = settingsService.getEntry<boolean>(settingsKey, SettingsUserScope.Me) == true || clientSideFlagValues[settingsKey] === true;
    return !hasUserSeenBubble;
}

export function registerUserShownLearningBubble(settingsKey: string): void {
    const settingsService = getService();
    clientSideFlagValues[settingsKey] = true;
    settingsService.setEntries({
        [settingsKey]: clientSideFlagValues[settingsKey]
    }, SettingsUserScope.Me).then(null, error => {
        VSSError.publishErrorToTelemetry(error);
    });
}