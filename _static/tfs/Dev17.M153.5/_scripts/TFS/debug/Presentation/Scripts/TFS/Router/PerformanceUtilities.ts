import { getScenarioManager } from "VSS/Performance";

export namespace PerformanceEvents {
    export const Mount = "ContributionHubViewStateRouter.Mount";
    export const InitializeRouter = "ContributionHubViewStateRouter.Initialize.TabGroups";
    export const InitializeContributedActions = "ContributionHubViewStateRouter.Initialize.ContributedActions";
    export const InitializeContributionComponent = "ContributionComponent.Initialize.{0}";
}

export function addSplitTiming(splitName: string, isStartTimeStamp: boolean): void {
    const name = isStartTimeStamp ? `${splitName}.Start` : `${splitName}.Complete`;
    getScenarioManager().split(name);
}
