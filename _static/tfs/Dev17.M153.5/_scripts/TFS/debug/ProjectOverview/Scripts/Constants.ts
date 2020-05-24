
export module Constants {
    export var ProjectOverviewDataProviderId = "ms.vss-tfs-web.project-overview-data-provider";
    export var ProjectActivityDataProviderId = "ms.vss-tfs-web.project-activity-data-provider";
    export var MaxWorkItemsMetric = 1000;
    export var MaxWorkItemsMetricString = "1K";
    export var MaxDeploymentsMetric = 10000;
    export var MaxDeploymentsMetricString = "10K";
    export var MaxBuildsMetric = 10000;
    export var MaxBuildsMetricString = "10K";
    export var ActivityPane = "ActivityPane";
    export var LeftPane = "LeftPane";
    export var BuildUpsell = "BuildUpsell";
    export var WorkUpsell = "WorkUpsell";
}

export module BuildConstants {
    export const NewBuildDefinitionUrl = "/_apps/hub/ms.vss-ciworkflow.build-ci-hub?_a=build-definition-getting-started&path=%5C&source=projecthome";
}

export module RMConstants {
    export var ServiceInstanceId = "0000000D-0000-8888-8000-000000000000";
    export var DataProviderId = "ms.vss-releaseManagement-web.metrics-data-provider";
    export var MinMetricsDateTime = "minmetricstime";
    export var HasDefinitions = "hasDefinitions";
    export var DeploymentMetrics = "deploymentMetrics";
    export var GetDeploymentMetrics = "getdeploymentmetrics";
    export var TryGetDeploymentMetrics = "trygetdeploymentmetrics";
    export var SuccessfulDeployments = "SuccessfulDeployments";
    export var FailedDeployments = "FailedDeployments";
    export var PartiallySuccessfulDeployments = "PartiallySuccessfulDeployments";
    export var Operation = "operation";
    export var ExplorerHub = "/_apps/hub/ms.vss-releaseManagement-web.hub-explorer"
    export var NewRDEditorFromHomePage = "/_apps/hub/ms.vss-releaseManagement-web.cd-workflow-hub?_a=action-create-definition&source=projectHome&definitionId=0"

}

export module PerformanceConstants {
    export var ProjectOverviewPageLoad = "Project.OverviewPage.Load";
    export var CodeMetricsFetchTime = "CodeMetricsFetchTime";
    export var GitMetricsFetchTime = "GitMetricsFetchTime";
    export var TfvcMetricsFetchTime = "TfvcMetricsFetchTime";
    export var RMGetDeploymentMetricsTime = "RMGetDeploymentMetricsTime";
    export var RMTryGetDeploymentMetricsTime = "RMTryGetDeploymentMetricsTime";
    export var WitExistsFetchTime = "WitExistsFetchTime";
    export var WitMetricsFetchTime = "WitMetricsFetchTime";
    export var AllProjectTagsFetchTime = "AllProjectTagsFetchTime";
    export var ProjectLanguagesFetchTime = "ProjectLanguagesFetchTime";
}

export module TelemetryConstants {
    export var TeamMembersModified = "TeamMembersModified";
    export var ChangeNumberOfDays = "ChangeNumberOfDays";
    export var SetupBuildClicked = "SetupBuildClicked";
    export var SetupReleaseClicked = "SetupReleaseClicked";
    export var AddCodeClicked = "AddCodeClicked";
    export var AddWorkClicked = "AddWorkClicked";
    export var FavoriteStateToggled = "FavoriteStateToggled";
    export var CreateReadmeClicked = "CreateReadmeClicked";
    export var UpsellDismissed = "UpsellDismissed";
    export var EditReadmeClicked = "EditReadmeClicked";
    export var EditWikiHomePageClicked = "EditWikiHomePageClicked";
    export var AddMemberButtonClicked = "AddMemberButtonClicked";
    export var ReadmeCommitedToNewBranch = "ReadmeCommitedToNewBranch";
    export var ProjectDescription_StartedEditing = "ProjectDescription_StartedEditing";
    export var ProjectDescription_SaveClicked = "ProjectDescription_SaveClicked";
    export var ProjectDescription_DiscardClicked = "ProjectDescription_DiscardClicked";
    export var ProjectDescription_DiscardDialogOKClicked = "ProjectDescription_DiscardDialogOKClicked";
    export var ProjectDescription_DiscardDialogCancelClicked = "ProjectDescription_DiscardDialogCancelClicked";
    export var ProjectDescription_DiscardDialogDismissed = "ProjectDescription_DiscardDialogDismissed";
    export var ProjectDescription_EditingToggledOnClickOut = "ProjectDescription_EditingToggledOnClickOut";
    export var ProjectDescription_UpdateFailed = "ProjectDescription_UpdateFailed";
    export var ProjectPageViewed = "ProjectPageViewed";
    export var ProjectPageHasWork = "ProjectPageHasWork";
    export var WikiRepoNotPresent = "WikiRepoNotPresent";
    export var ReadmeRepoNotPresent = "ReadmeRepoNotPresent";
    export var ReadmeRepositoryChanged = "ReadmeRepositoryChanged";
    export var ReadmeRepositoryChangeFailed = "ReadmeRepositoryChangeFailed";
    export var ReadmeRepositoryChangeDiscarded = "ReadmeRepositoryChangeDiscarded";
    export var ProjectTags_UpdateFailed = "ProjectTags_UpdateFailed";
    export var ProjectTags_FetchProjectTagsFailed = "ProjectTags_FetchProjectTagsFailed";
    export var ProjectTags_FetchAllProjectTagsFailed = "ProjectTags_FetchAllProjectTagsFailed";
    export var ProjectTags_RemoveTagButtonClicked = "ProjectTags_RemoveTagButtonClicked";
    export var ProjectTags_SaveButtonClicked = "ProjectTags_SaveButtonClicked";
    export var ProjectTags_AddTagButtonClicked = "ProjectTags_AddTagButtonClicked";
    export var ProjectTags_CharacterLimitValidationFailed = "ProjecTagsCharacterLimitValidationFailed";
    export var ProjectTags_MaximumNumberOfTagsValidationFailed = "ProjecTagsMaximumNumberValidationFailed";
    export var ProjectTags_TagsAdded = "ProjecTagsProjectTagsAdded";
    export var ProjectTags_TagsDeleted = "ProjecTagsProjectTagsDeleted";
    export var ProjectTags_AddButtonClickedAfterMaxCountReached = "ProjectTagsAddButtonClickedAfterMaxCountReached";
    export var ProjectTags_AllowedCharactersValidationFailed = "ProjectTagsAllowedCharactersValidationFailed";
    export var ProjectLanguagues_FetchProjectLanguagesFailed = "ProjectLanguagues_FetchProjectLanguagesFailed";
    export var ProjectOverview_PageLoadRetryAttempted = "ProjectOverview_PageLoadRetryAttempted";
    export var ProjectOverview_PageLoadRetryFailed = "ProjectOverview_PageLoadRetryFailed";
}

export enum DescriptionEditingToggleType {
    StartEditingToggle = 0,
    OnSaveToggle = 1,
    OnDiscardToggle = 2,
    OnClickOutToggle = 3,
}

export module PermissionConstants {
    // Build definition
    export var BuildSecurityNameSpace = "33344d9c-fc72-4d6f-aba5-fa317101a7e9";
    export var EditBuildDefinitionPermission = 2048;
}
