import * as VSS_Telemetry from "VSS/Telemetry/Services";
import { TelemetryConstants } from "ProjectOverview/Scripts/Constants";
import { ProjectOverviewCIConstants } from "ProjectOverview/Scripts/Generated/Constants";

export function publishViewedProjectOverviewPage(properties: { [key: string]: any }): void {
    publishTelemetryEvent(TelemetryConstants.ProjectPageViewed, false, properties);
}

export function publishProjectOverviewPageHasWork(properties: { [key: string]: any }): void {
    publishTelemetryEvent(TelemetryConstants.ProjectPageHasWork, false, properties);
}

export function publishChangeInNumberOfDaysWindow(properties: { [key: string]: any }): void {
    publishTelemetryEvent(TelemetryConstants.ChangeNumberOfDays, false, properties);
}

export function publishTeamMembersModified(): void {
    publishTelemetryEvent(TelemetryConstants.TeamMembersModified);
}

export function publishSetupBuildClicked(properties: { [key: string]: any }): void {
    publishTelemetryEvent(TelemetryConstants.SetupBuildClicked, true, properties);
}

export function publishSetupReleaseClicked(properties: { [key: string]: any }): void {
    publishTelemetryEvent(TelemetryConstants.SetupReleaseClicked, true, properties);
}

export function publishAddCodeClicked(): void {
    publishTelemetryEvent(TelemetryConstants.AddCodeClicked, true);
}

export function publishAddWorkClicked(properties: { [key: string]: any }): void {
    publishTelemetryEvent(TelemetryConstants.AddWorkClicked, true, properties);
}

export function publishCreateReadmeClicked(): void {
    publishTelemetryEvent(TelemetryConstants.CreateReadmeClicked);
}

export function publishUpsellDismissed(properties: { [key: string]: any }): void {
    publishTelemetryEvent(TelemetryConstants.UpsellDismissed, false, properties);
}

export function publishEditReadmeClicked(): void {
    publishTelemetryEvent(TelemetryConstants.EditReadmeClicked);
}

export function publishEditWikiHomePageClicked(): void {
    publishTelemetryEvent(TelemetryConstants.EditWikiHomePageClicked);
}

export function publishAddMemberButtonClicked(): void {
    publishTelemetryEvent(TelemetryConstants.AddMemberButtonClicked);
}

export function publishReadmeCommitedToNewBranch(): void {
    publishTelemetryEvent(TelemetryConstants.ReadmeCommitedToNewBranch, true);
}

export function publishProjectDescriptionStartedEditing(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectDescription_StartedEditing);
}

export function publishProjectDescriptionSaveClicked(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectDescription_SaveClicked);
}

export function publishProjectDescriptionDiscardClicked(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectDescription_DiscardClicked);
}

export function publishProjectDescriptionDiscardDialogOKClicked(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectDescription_DiscardDialogOKClicked);
}

export function publishProjectDescriptionDiscardDialogCancelClicked(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectDescription_DiscardDialogCancelClicked);
}
export function publishProjectDescriptionDiscardDialogDismissed(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectDescription_DiscardDialogDismissed);
}

export function publishProjectDescriptionEditingToggledOnClickOut(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectDescription_EditingToggledOnClickOut);
}

export function publishProjectDescriptionUpdateFailed(errorMessage: string): void {
    publishTelemetryEvent(TelemetryConstants.ProjectDescription_UpdateFailed);
}

export function publishWikiRepoNotPresent(): void {
    publishTelemetryEvent(TelemetryConstants.WikiRepoNotPresent);
}

export function publishReadmeRepoNotPresent(): void {
    publishTelemetryEvent(TelemetryConstants.ReadmeRepoNotPresent);
}

export function publishReadmeRepositoryChanged(properties: { [key: string]: string }): void {
    publishTelemetryEvent(TelemetryConstants.ReadmeRepositoryChanged, false, properties);
}

export function publishReadmeRepositoryChangeFailed(properties: { [key: string]: string }): void {
    publishTelemetryEvent(TelemetryConstants.ReadmeRepositoryChangeFailed, false, properties);
}

export function publishReadmeRepositoryChangeDiscarded(properties: { [key: string]: string }): void {
    publishTelemetryEvent(TelemetryConstants.ReadmeRepositoryChangeDiscarded, false, properties);
}

function publishTelemetryEvent(telemetryFeatureName: string, immediate?: boolean, properties?: { [key: string]: any }): void {
    VSS_Telemetry.publishEvent(
        new VSS_Telemetry.TelemetryEventData(ProjectOverviewCIConstants.Area, telemetryFeatureName, properties || {}),
        immediate);
}

export function publishProjectLanguagesFetchProjectLanguagesFailed(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectLanguagues_FetchProjectLanguagesFailed);
}

export function publishProjectTagsUpdateFailed(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectTags_UpdateFailed);
}

export function publishProjectTagsFetchProjectTagsFailed(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectTags_FetchProjectTagsFailed);
}

export function publishProjectTagsFetchAllProjectTagsFailed(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectTags_FetchAllProjectTagsFailed);
}

export function publishProjectTagsAddTagButtonClicked(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectTags_AddTagButtonClicked);
}

export function publishProjectTagsRemoveTagButtonClicked(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectTags_RemoveTagButtonClicked);
}

export function publishProjectTagsSaveButtonClicked(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectTags_SaveButtonClicked);
}
export function publishProjecTagsCharacterLimitValidationFailed(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectTags_CharacterLimitValidationFailed);
}

export function publishProjectTagsMaximumNumberofTagsValidationFailed(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectTags_MaximumNumberOfTagsValidationFailed);
}

export function publishProjectTagsAddButtonClickedAfterMaxCountReached(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectTags_AddButtonClickedAfterMaxCountReached);
}

export function publishProjectTagsAdded(properties: { [key: string]: any }): void {
    publishTelemetryEvent(TelemetryConstants.ProjectTags_TagsAdded, false, properties);
}

export function publishProjectTagsDeleted(properties: { [key: string]: any }): void {
    publishTelemetryEvent(TelemetryConstants.ProjectTags_TagsDeleted);
}

export function publishProjecTagsAllowedCharactersValidationFailed(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectTags_AllowedCharactersValidationFailed);
}

export function publishPageLoadRetryAttempted(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectOverview_PageLoadRetryAttempted);
}

export function publishPageLoadRetryFailed(): void {
    publishTelemetryEvent(TelemetryConstants.ProjectOverview_PageLoadRetryFailed);
}