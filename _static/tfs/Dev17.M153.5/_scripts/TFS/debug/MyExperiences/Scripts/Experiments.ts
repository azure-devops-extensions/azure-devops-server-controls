import * as VSS_Service from "VSS/Service";
import * as VSS_Contributions from "VSS/Contributions/Services";

/**
 * Contribution Ids for experiments on the Account Homepage.
 * Use these when calling {IsEnabled}.
 */
export class ExperimentIds {
    static readonly MruProjectLinkAlwaysVisible = "ms.vss-tfs-web.new-account-landing-project-link-always-visible-feature";
}

/**
 * Determines if an experiment is enabled.
 * @param experimentId {string} one of the values from {EXPERIMENT_IDS}
 */
export function IsEnabled(experimentId: string): boolean {
    let webPageDataService = VSS_Service.getService(VSS_Contributions.WebPageDataService);
    if (!webPageDataService) {
        return false;
    }
    let enabledExperiments = webPageDataService.getPageData<String[]>("ms.vss-tfs-web.account-home-experiments-data-provider");
    if (!enabledExperiments) {
        return false;
    }
    const isEnabled = enabledExperiments.indexOf(experimentId) != -1;
    return isEnabled;
}

/**
 * Gets the enabled states of all experiments on the Account Homepage
 */
export function GetExperimentEnabledStates() : IDictionaryStringTo<boolean> {
    let states = {};
    for (let experimentIdKey in ExperimentIds) {
        if (ExperimentIds.hasOwnProperty(experimentIdKey)) {
            const experimentId = ExperimentIds[experimentIdKey];
            states[experimentIdKey] = IsEnabled(experimentId);
        }
    }
    return states;
}