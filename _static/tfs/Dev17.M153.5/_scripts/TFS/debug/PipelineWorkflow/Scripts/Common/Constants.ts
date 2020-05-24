/**
 * This file contains constants to be used across release management web access
 */

export namespace CommonConstants {
    export const FeatureArea = "CD";
    export const ReleaseManagementServiceInstanceId = "0000000d-0000-8888-8000-000000000000";
    export const SecurityNameSpaceIdForReleaseManagement = "C788C23E-1B46-4162-8F5E-D7585343B5DE";
    export const SecurityNameSpaceIdForDashboards = "8ADF73B7-389A-4276-B638-FE1653F7EFC7";
    export const SecurityNameSpaceIdForReleaseManagementUI = "7c7d32f7-0e86-4cd6-892e-b35dbba870bd";
    export const ReleaseManagementUIPermissionToken = "/ReleaseManagementUI";
    export const ReleaseDescriptionLengthLimit = 4000;
}

export namespace PerfScenarios {
    export const EditDefinition = "VSO.CD.EditDefinition";
    export const SaveDefinition = "VSO.CD.SaveDefinition";
    export const CreateDefinition = "VSO.CD.CreateDefinition";
    export const CloneDefinition = "VSO.CD.CloneDefinition";
    export const ImportDefinition = "VSO.CD.ImportDefinition";
    export const SaveRelease = "VSO.CD.SaveRelease";
    export const DeploymentGroupGrid = "VSO.CD.DeploymentGroupGrid";
    export const CreateReleaseDialog = "VSO.CD.OpenCreateReleaseDialog";
    export const StartRelease = "VSO.CD.StartRelease";
}

export namespace HelpConstants {
    export const DeployHelpLink = "https://go.microsoft.com/fwlink/?LinkId=619385";
}

export namespace CommonStoreKeys {
    export const StoreKey_CommonDialogStoreKey: string = "STORE_KEY_COMMON_DIALOG_STORE";
    export const StoreKey_ProgressIndicatorStoreKey: string = "STORE_KEY_PROGRESS_INDICATOR_STORE";
}

export namespace CommonActionsCreatorKeys {
    export const ActionsCreatorKey_CommonDialogActionsCreator: string = "ACTIONS_CREATOR_KEY_COMMON_DIALOG_ACTIONS_CREATOR";
    export const ActionsCreatorKey_ProgressIndicatorActionsCreator: string = "ACTIONS_CREATOR_KEY_PROGRESS_INDICATOR_ACTIONS_CREATOR";
}

export namespace CommonActionHubKeys {
    export const ActionHubKey_CommonDialogActionHub: string = "ACTION_HUB_KEY_COMMON_DIALOG_ACTION_HUB";
    export const ActionHubKey_ProgressIndicatorActionHub: string = "ACTION_HUB_KEY_PROGRESS_INDICATOR_ACTION_HUB";
}

export namespace NavigationConstants {
    export const ReleaseManagementEditorHubId = "ms.vss-releaseManagement-web.cd-workflow-hub";
    export const ReleaseManagementExplorerHubId = "ms.vss-releaseManagement-web.hub-explorer";
    export const ReleaseProgressHubId = "ms.vss-releaseManagement-web.cd-release-progress";
    export const ReleaseManagementExplorer2HubId = "ms.vss-releaseManagement-web.hub-explorer-2";
    export const AgentsHubId = "ms.vss-build.web.agent-queues-hub";
    export const YamlHub = "ms.vss-releaseManagement-web.cd-release-yaml-editor";
}

export namespace HubRoutes {
    export const HubExplorerReRouteId = "ms.vss-releaseManagement-web.hub-explorer-reroute";
}

export namespace ContributionIds {
    export const CreateReleasePanelContributionId = "ms.vss-releaseManagement-web.cd-create-release";
    export const ReleaseDetailsSummaryTabContributionId = "ms.vss-releaseManagement-web.release-details-summary-tab";
    export const ReleaseEnvironmentPivotContributionId = "ms.vss-releaseManagement-web.release-environment-editor-tab";
    export const ReleaseEnvironmentDeploymentGroupLogsPivotContributionId = "ms.vss-releaseManagement-web.release-environment-deployment-group-logs-tab";
    export const ReleasePivotContributionId = "ms.vss-releaseManagement-web.release-editor-tab";
    export const ReleaseEnvironmentEditorToolbarMenuContributionId = "ms.vss-releaseManagement-web.release-environment-editor-tool-bar-menu";
    export const ReleaseEditorToolbarMenuContributionId = "ms.vss-releaseManagement-web.release-editor-tool-bar-menu";
    export const ReleaseDetailsViewContributionId = "ms.vss-releaseManagement-web.release-details-view";
    export const ReleaseDeploymentPipelineNodeContributionId = "ms.vss-releaseManagement-web.release-deployment-pipeline-node-extension";
    export const AllDefinitionsToolbarMenuContributionId = "ms.vss-releaseManagement-web.release-definition-explorer-toolbar-menu";
    export const AllDefinitionsContextMenuContributionId = "ms.vss-releaseManagement-web.release-definition-explorer-context-menu";
}

export namespace SupportedContributionTypes {
    export const ReleaseSummaryTabContributionTypeId = "ms.vss-releaseManagement-web.release-summary-tab";
}

export namespace FlightNames {
    // Flight names should be all capitals as this is how the list is returned from RM service
    export const ShowAllReleasesTreatmentFlight = "RM-SHOWRELEASES-T";
}
