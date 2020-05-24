import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

export namespace ReleaseReportingKeys {
    export const StoreKey_ReleaseReportingStoreKey: string = "STORE_KEY_RELEASE_REPORTING";
    export const StoreKey_ReleaseReportingPanelStoreKey: string = "STORE_KEY_RELEASE_REPORTING_PANEL";
    export const ActionsCreatorKey_ReleaseReportingActionsCreator: string = "ACTIONS_CREATOR_KEY_RELEASE_REPORTING_ACTIONS_CREATOR";
    export const ActionsCreatorKey_ReleaseReportingPanelActionsCreator: string = "ACTIONS_CREATOR_KEY_RELEASE_REPORTING_PANEL_ACTIONS_CREATOR";
    export const ActionHubKey_ReleaseReportingActionHub: string = "ACTION_HUB_KEY_RELEASE_REPORTING_ACTION_HUB";
    export const ActionHubKey_ReleaseReportingPanelActionHub: string = "ACTION_HUB_KEY_RELEASE_REPORTING_PANEL_ACTION_HUB";    
}

export namespace DeploymentQueryConstants {
    export const Top: number = 100;
    export const DaysToAnalyze: number = 7;
    export const StatusToQuery: number = PipelineTypes.ReleaseDeploymentStatus.Failed | PipelineTypes.ReleaseDeploymentStatus.PartiallySucceeded | PipelineTypes.ReleaseDeploymentStatus.Succeeded;
    export const QueryOder: ReleaseContracts.ReleaseQueryOrder = ReleaseContracts.ReleaseQueryOrder.Ascending;
}
export namespace ReleaseReportingProgressIndicatorAction {
    export const initializeDeploymentsAction: string = "initializeDeployments";
    export const initializeContributionsAction: string = "initializeContributions";
}

export namespace ReleaseReportingHeroMatrixNavigateStateActions {
    export const ReleaseReportingDeploymentDuration = "deployment-duration";
    export const ReleaseReportingDeploymentFrequency = "deployment-frequency";
}
