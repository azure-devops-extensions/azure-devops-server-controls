import * as Q from "q";

import { Feature, Properties, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { ContributionSource } from "DistributedTaskControls/Sources/ContributionSource";

export class ContributionTelemetryUtils {
    public static publishReleaseProgressContributionTelemetry(contributionId: string): IPromise<void> {
        if (contributionId && !ContributionTelemetryUtils._contributionTelemetryTracker[contributionId]) {
            return ContributionSource.instance().getContributions(contributionId).then((contributions: Contribution[]) => {
                ContributionTelemetryUtils.publishContributionsTelemetryFromContributions(contributionId, contributions);
                return Q.resolve(null);
            });
        }

        return Q.resolve(null);
    }

    public static publishContributionsTelemetryFromContributions(contributionId: string, contributions: Contribution[]): void {
        if (contributionId && !ContributionTelemetryUtils._contributionTelemetryTracker[contributionId]) {
            let eventProperties: IDictionaryStringTo<any> = {};
            let contributionArray: Contribution[] = contributions || [];
            let totalContributions: number = contributionArray.length;
            let extensionIds: string[] = [];

            contributionArray.forEach((contribution: Contribution) => {
                extensionIds.push(contribution.id);
            });

            eventProperties[Properties.contributionId] = contributionId;
            eventProperties[Properties.extensionCountOnContribution] = totalContributions;
            eventProperties[Properties.extensionIdsOnContribution] = extensionIds;

            ContributionTelemetryUtils._contributionTelemetryTracker[contributionId] = true;
            Telemetry.instance().publishEvent(Feature.Contributions, eventProperties);
        }
    }

    public static publishExtensionInvokedTelemetry(contributionId: string, extensionId: string): void {
        if (contributionId && extensionId) {
            let eventProperties: IDictionaryStringTo<any> = {};

            eventProperties[Properties.contributionId] = contributionId;
            eventProperties[Properties.extensionInvokedId] = extensionId;

            Telemetry.instance().publishEvent(Feature.ExtensionInvokedForContribution, eventProperties);
        }
    }

    private static _contributionTelemetryTracker: IDictionaryStringTo<boolean> = {};
}