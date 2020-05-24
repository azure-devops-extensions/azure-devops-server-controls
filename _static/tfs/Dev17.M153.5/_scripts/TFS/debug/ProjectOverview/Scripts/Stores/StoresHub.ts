import { VersionControlChangeType } from "TFS/VersionControl/Contracts";
import { ActionsHub } from "ProjectOverview/Scripts/ActionsHub";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { CommitSavedPayload } from "VersionControl/Scenarios/Explorer/ActionsHub";
import { CommitPromptStore, CommitPromptState } from "VersionControl/Scenarios/Shared/Committing/CommitPromptStore";
import { CloneRepositoryState, CloneRepositoryStore } from "ProjectOverview/Scripts/Stores/CloneRepositoryStore";
import { ProjectInfoState, ProjectInfoStore } from "ProjectOverview/Scripts/Stores/ProjectInfoStore";
import { ProjectTagState, ProjectTagStore } from "ProjectOverview/Scripts/Stores/ProjectTagStore";
import { MetricState, MetricStore } from "ProjectOverview/Scripts/Stores/MetricsStore";
import { PermissionState, PermissionStore } from "ProjectOverview/Scripts/Stores/PermissionStore";
import { ProjectMembersState, ProjectMembersStore } from "ProjectOverview/Scripts/Stores/ProjectMembersStore";
import { ReadmeStore, ReadmeState } from "ProjectOverview/Scripts/Stores/ReadmeStore";
import { RepositoryData, ProjectOverviewData, SourceRepositoryTypes } from "ProjectOverview/Scripts/Generated/Contracts";
import { UpsellSectionStore, UpsellSectionState } from "ProjectOverview/Scripts/Stores/UpsellSectionStore";
import { ProjectLanguageStore, ProjectLanguageState } from "ProjectOverview/Scripts/Stores/ProjectLanguageStore";
import { ReadmeRepositoryChangedLocallyPayload } from "ProjectOverview/Scripts/Shared/ReadmeActionsHub";

export interface AggregatedState {
    projectInfoState: ProjectInfoState;
    projectTagState: ProjectTagState;
    metricsState: MetricState;
    projectMembersState: ProjectMembersState;
    readmeState: ReadmeState;
    commitPromptState: CommitPromptState;
    upsellSectionState: UpsellSectionState;
    permissionState: PermissionState;
    projectLanguageState: ProjectLanguageState;
    cloneRepositoryState: CloneRepositoryState;
}

/**
 * A container to hold the multiple stores of project overview page
 */
export class StoresHub {
    public projectInfoStore: ProjectInfoStore;
    public projectTagStore: ProjectTagStore;
    public metricsStore: MetricStore;
    public projectMembersStore: ProjectMembersStore;
    public readmeStore: ReadmeStore;
    public commitPromptStore: CommitPromptStore;
    public upsellSectionStore: UpsellSectionStore;
    public permissionStore: PermissionStore;
    public projectLanguageStore: ProjectLanguageStore;
    public cloneRepositoryStore: CloneRepositoryStore;

    constructor(actionsHub: ActionsHub, isPublicAccess: boolean) {

        this.cloneRepositoryStore = new CloneRepositoryStore();
        actionsHub.projectOverviewDataLoaded.addListener(this.cloneRepositoryStore.loadCloneRepositoryInfo);
        actionsHub.projectOverviewDataLoadFailed.addListener(this.cloneRepositoryStore.stopIsLoading);

        this.projectInfoStore = new ProjectInfoStore();
        actionsHub.projectOverviewDataLoaded.addListener(this.projectInfoStore.loadProjectInfo);
        actionsHub.projectOverviewDataLoadFailed.addListener(this.projectInfoStore.stopIsLoading);
        actionsHub.projectDescriptionUpdated.addListener(this.projectInfoStore.updateProjectDescription);
        actionsHub.projectDescriptionUpdateFailed.addListener(this.projectInfoStore.updateErrorMessage);
        actionsHub.descriptionEditingToggled.addListener(this.projectInfoStore.toggleEditing);
        actionsHub.descriptionEditingDisabled.addListener(this.projectInfoStore.disableEditing);
        actionsHub.errorMessageCleared.addListener(this.projectInfoStore.clearErrorMessage);
        actionsHub.projectImageInformationFetched.addListener(this.projectInfoStore.updateProjectImageSetInformation);

        this._createProjectTagStore(actionsHub);

        this.upsellSectionStore = new UpsellSectionStore();
        actionsHub.projectOverviewDataLoaded.addListener(this.upsellSectionStore.loadDismissedUpsells);
        actionsHub.projectOverviewDataLoadFailed.addListener(this.upsellSectionStore.stopIsLoading);
        actionsHub.upsellDismissed.addListener(this.upsellSectionStore.saveDismissedUpsell);
        actionsHub.candidateUpsellsUpdated.addListener(this.upsellSectionStore.setCandidateUpsells);

        this.permissionStore = new PermissionStore();
        actionsHub.permissionsUpdated.addListener(this.permissionStore.setPermissions);

        this.readmeStore = new ReadmeStore();
        actionsHub.projectOverviewDataLoaded.addListener(this.readmeStore.loadReadmeState);
        actionsHub.projectOverviewDataLoadFailed.addListener(this.readmeStore.stopIsLoading);
        actionsHub.readmeRendererInitialized.addListener(this.readmeStore.initializeRenderer);
        actionsHub.readmeItemModelInitialized.addListener(this.readmeStore.initializeItemModel);
        actionsHub.readmeEditingStarted.addListener(this.readmeStore.startEditing);
        actionsHub.readmeEditingCancelled.addListener(this.readmeStore.clearEditState);
        actionsHub.readmeEditModeTabSet.addListener(this.readmeStore.setReadmeEditModeTab);
        actionsHub.toggleEditingDiffInlineClicked.addListener(this.readmeStore.toggleEditingDiffInline);
        actionsHub.readmeDiscardChangesPrompted.addListener(this.readmeStore.showLoseChangesDialog);
        actionsHub.readmeDiscardChangesDialogDismissed.addListener(this.readmeStore.hideLoseChangesDialog);
        actionsHub.readmeContentEdited.addListener(this.readmeStore.setEditedContent);
        actionsHub.readmeDefaultItemSet.addListener(this.readmeStore.setDefaultItem);
        actionsHub.readmeSaved.addListener(this.readmeStore.saveReadme);
        actionsHub.readmeUpdatePullRequestStarted.addListener(this.readmeStore.clearEditState);
        actionsHub.readmeSavedToNewBranch.addListener(this.readmeStore.saveReadmeToNewBranch);
        actionsHub.readmeRepositoryChangedLocally.addListener(this.readmeStore.updateCurrentRepository);
        actionsHub.readmeRepositoryChangesSaved.addListener(this.readmeStore.saveRepositoryChanges);
        actionsHub.readmeRepositoryChangeDialogPrompted.addListener(this.readmeStore.promptChangeReadmeDialog);
        actionsHub.readmeRepositoryChangeDialogDismissed.addListener(this.readmeStore.dismissChangeReadmeDialog);
        actionsHub.readmeStartEditingFailed.addListener(this.readmeStore.startEditingFailed);
        actionsHub.readmeNotificationDismissed.addListener(this.readmeStore.clearNotification);
        actionsHub.wikiHomePageFound.addListener(this.readmeStore.updateWikiHomePagePath);
        actionsHub.wikiHomePageNotFound.addListener(this.readmeStore.updateCurrentRepository);
        actionsHub.wikiRepositoryFetched.addListener(this.readmeStore.updateWikiRepository);
        actionsHub.errorEncountered.addListener(this.readmeStore.updateErrorMessage);

        this.metricsStore = new MetricStore();
        actionsHub.projectOverviewDataLoaded.addListener(this.metricsStore.loadMetricState);
        actionsHub.projectOverviewDataLoadFailed.addListener(this.metricsStore.stopIsLoading);
        actionsHub.numberOfDaysChanged.addListener(this.metricsStore.updateNumberOfDays);
        actionsHub.gitMetricsChanged.addListener(this.metricsStore.updateGitMetric);
        actionsHub.tfvcMetricsChanged.addListener(this.metricsStore.updateTfvcMetric);
        actionsHub.codeMetricsChanged.addListener(this.metricsStore.updateCodeMetric);
        actionsHub.workMetricsChanged.addListener(this.metricsStore.updateWorkMetric);
        actionsHub.workMetricsAvailabilityChanged.addListener(this.metricsStore.updateWorkMetricAvailability);
        actionsHub.deploymentMetricsChanged.addListener(this.metricsStore.updateDeloymentMetric);
        actionsHub.deploymentMetricsAndAvailabilityChanged.addListener(this.metricsStore.tryUpdateDeploymentMetric);
        actionsHub.buildMetricsChanged.addListener(this.metricsStore.updateBuildMetric);

        this.commitPromptStore = new CommitPromptStore();
        actionsHub.projectOverviewDataLoaded.addListener(this._initializeCommitPromptStoreFromPageData);
        actionsHub.readmeRepositoryChangedLocally.addListener(this._initializeCommitPromptStore);
        actionsHub.readmeCommitDialogPrompted.addListener(path =>
            this.commitPromptStore.prompt({ path, changeType: VersionControlChangeType.Edit }));
        actionsHub.readmeCommitStarted.addListener(this.commitPromptStore.start);
        actionsHub.readmeCommitSaved.addListener(this._commitBranchStoreHideAndRememberBranch);
        actionsHub.readmeCommitFailed.addListener(this.commitPromptStore.notifyError);
        actionsHub.readmeCommitDialogDismissed.addListener(this.commitPromptStore.hide);
        actionsHub.existingBranchesLoaded.addListener(this.commitPromptStore.loadExistingBranches);

        // TODO: current api for fetching members are at team level, pass the team admin status for now
        this.projectMembersStore = new ProjectMembersStore(isPublicAccess);
        actionsHub.projectMembersFetched.addListener(this.projectMembersStore.updateMembersInfo);
        actionsHub.membersFetchFailed.addListener(this.projectMembersStore.updateErrorMessage);

        this._createProjectLanguageStore(actionsHub);
    }

    private _initializeCommitPromptStore = (payload: ReadmeRepositoryChangedLocallyPayload): void => {
        this.commitPromptStore.initialize(payload.repositoryContext.getRepositoryType() !== RepositoryType.Tfvc);
    }

    private _initializeCommitPromptStoreFromPageData = (projectOverviewData: ProjectOverviewData): void => {
        this.commitPromptStore.initialize(projectOverviewData.currentRepositoryData.sourceRepositoryType !== SourceRepositoryTypes.Tfvc);
    }

    private _commitBranchStoreHideAndRememberBranch = (branchVersionSpec: GitBranchVersionSpec) => {
        this.commitPromptStore.hideAndRememberBranch({ newBranchVersionSpec: branchVersionSpec } as CommitSavedPayload);
    }

    public getAggregatedState = (): AggregatedState => {
        return {
            projectInfoState: this.projectInfoStore.getState(),
            projectTagState: this.projectTagStore.getState(),
            metricsState: this.metricsStore.getState(),
            projectMembersState: this.projectMembersStore.getState(),
            readmeState: this.readmeStore.getState(),
            commitPromptState: this.commitPromptStore.state,
            upsellSectionState: this.upsellSectionStore.getState(),
            permissionState: this.permissionStore.getState(),
            projectLanguageState: this.projectLanguageStore.getState(),
            cloneRepositoryState: this.cloneRepositoryStore.getState(),
        };
    }

    public isPageDataLoading = (): boolean => {
        const aggregatedState = this.getAggregatedState();
        return aggregatedState.projectInfoState.isLoading
            || aggregatedState.upsellSectionState.isLoading
            || aggregatedState.readmeState.isLoading
            || aggregatedState.metricsState.isLoading
            || aggregatedState.cloneRepositoryState.isLoading;
    }

    private _createProjectTagStore(actionsHub: ActionsHub): void {
        this.projectTagStore = new ProjectTagStore();
        actionsHub.allProjectTagsFetched.addListener(this.projectTagStore.updateAllProjectTags);
        actionsHub.projectTagsFetched.addListener(this.projectTagStore.loadProjectTags);
        actionsHub.projectTagsSaved.addListener(this.projectTagStore.saveProjectTags);
        actionsHub.currentTagsUpdated.addListener(this.projectTagStore.updateCurrentTags);
        actionsHub.prjectTagsErrorMessageUpdated.addListener(this.projectTagStore.updateErrorMessage);
    }

    private _createProjectLanguageStore(actionsHub: ActionsHub): void {
        this.projectLanguageStore = new ProjectLanguageStore();
        actionsHub.projectLanguagesFetched.addListener(this.projectLanguageStore.loadProjectLanguages);
    }
}
