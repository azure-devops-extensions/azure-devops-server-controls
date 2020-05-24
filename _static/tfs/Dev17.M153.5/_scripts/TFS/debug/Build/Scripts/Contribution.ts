import { TimelineHelper } from "Build/Scripts/Timeline";

import { TimelineRecord } from "TFS/Build/Contracts";

import { Contribution } from "VSS/Contributions/Contracts";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { intersect } from "VSS/Utils/Array";
import { equals } from "VSS/Utils/String";

// Contributions and contribution types defined in Build2\ExtensionPackages\BuildWeb\vss-build-web.json
export namespace WellKnownContributionData {
    /*  --------- Build Extensions Overiew ------------
    *   Contributions::
    *    
    *    1. build-results-view                         ----> A placeholder where sections and tabs contribute.
    *                                                  ----> If sections are contributed to a new tab,
    *                                                          then, all sections come first inside that tab, followed by the actual tab content.
    *       (type: NONE )
    *
    *    2. build-results-summary-tab                  ----> A special contribution to allow section contributions for existing "Summary" tab
    *       (type: build-results-tab )
    *
    *
    *    Contribution Types::
    *
    *    1. build-results-tab                          ----> A tab in build results view/page.
    *       properties - "name"
    *    2. build-results-section                      ----> A section inside build results tab.
    *       properties - "name","order","height","width","targetId", "column"
    *
    */

    // Contributions
    export const ResultsView = "ms.vss-build-web.build-results-view";
    export const ResultsViewSummaryTab = "ms.vss-build-web.build-results-summary-tab";
    export const BuildDefinitionsHub = "ms.vss-build-web.build-definitions-hub";

    // Contribution types
    export const ResultsTabType = "ms.vss-build-web.build-results-tab";
    export const ResultsSectionType = "ms.vss-build-web.build-results-section";

    // Instances
    export const DefinitionsHubMineTabInstanceId = "build-definitions-hub-mine-tab";
    export const DefinitionsHubAllDefinitionsTabInstanceId = "build-definitions-hub-alldefinitions-tab";
}

export namespace TaskConstraintTypes {
    export const BuiltInTask = "BuiltInTask";
    export const ContributedTask = "ContributedTask";

    export const BuiltInTaskLowerCase = BuiltInTask.toLowerCase();
    export const ContributedTaskLowerCase = ContributedTask.toLowerCase();
}

namespace ContributionConstants {
    export const separator = ".";
}

namespace ContributionPropertyKeys {
    export const FeatureFlags = "featureFlags";
    export const SupportsTasks = "supportsTasks";
}

export class ContributionHelper {
    private _contributions: Contribution[] = [];
    private _contributionVisibility: IDictionaryStringTo<boolean> = {};
    private _contributionFeatureVisibility: IDictionaryStringTo<boolean> = {};
    private static _instance: ContributionHelper = null;

    constructor(contributions: Contribution[]) {
        this._contributions = contributions || [];
    }

    public getTaskContributionVisibilityMap(records: TimelineRecord[]): IDictionaryStringTo<boolean> {
        let map: IDictionaryStringTo<boolean> = {};
        const tasksUsed = TimelineHelper.getAllTaskIds(records);

        this._contributions.forEach((contribution) => {
            const taskIds = this._getTaskIdsProperty(contribution);
            if (taskIds.length > 0) {
                // tasks constraints exist, initialite the map with either true or false
                if (tasksUsed.length == 0) {
                    // no tasks are being used in current build
                    map[contribution.id] = true;
                }
                else if (intersect(taskIds, tasksUsed).length == 0) {
                    // no tasks are satisfied
                    map[contribution.id] = false;
                }
                else {
                    map[contribution.id] = true;
                }
            }
        });

        return map;
    }

    public isBuildDetailsSectionContribution(contribution: Contribution) {
        return this._isContributionFeatureEnabled(contribution)
            && equals(contribution.type, WellKnownContributionData.ResultsSectionType);
    }

    public isBuildDetailsTabContribution(contribution: Contribution) {
        return this._isContributionFeatureEnabled(contribution)
            && !equals(contribution.id, WellKnownContributionData.ResultsViewSummaryTab)
            && equals(contribution.type, WellKnownContributionData.ResultsTabType);
    }

    private _getTaskIdsProperty(contribution: Contribution): string[] {
        let value: string[] = [];
        if (contribution.properties) {
            value = contribution.properties[ContributionPropertyKeys.SupportsTasks];
        }

        return (value || []).map(x => x.toLowerCase());
    }

    private _getFeatureFlagProperty(contribution: Contribution): string[] {
        let value = [];
        if (contribution.properties) {
            value = contribution.properties[ContributionPropertyKeys.FeatureFlags];
        }

        return value || [];
    }

    private _isContributionFeatureEnabled(contribution: Contribution): boolean {
        if (this._contributionFeatureVisibility[contribution.id] == undefined) {
            let isFeatureEnabled = true;
            this._getFeatureFlagProperty(contribution).forEach((featureFlag: string) => {
                try {
                    if (!FeatureAvailabilityService.isFeatureEnabled(featureFlag)) {
                        isFeatureEnabled = false;
                        return;
                    }
                }
                catch (e) {
                    isFeatureEnabled = false;
                    return;
                }
            });

            this._contributionFeatureVisibility[contribution.id] = isFeatureEnabled;
        }

        return this._contributionFeatureVisibility[contribution.id];
    }
}