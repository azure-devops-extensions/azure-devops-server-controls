import * as Q from "q";
import { using } from "VSS/VSS";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as VSS_Service from "VSS/Service";
import * as Events_Action from "VSS/Events/Action";
import { format } from "VSS/Utils/String";
import * as Array from "VSS/Utils/Array";
import { getDefaultWebContext } from "VSS/Context";
import { GitRepository } from "TFS/VersionControl/Contracts";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import * as VCImportDialog_Async from "VersionControl/Scenarios/Import/ImportDialog/ImportDialog";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as SettingsClient_LAZY_LOAD from "ProjectOverview/Scripts/SettingsClient";
import { ActionsHub, WitAvailabilityStatus } from "ProjectOverview/Scripts/ActionsHub";
import { GitCodeMetricsData, TfvcCodeMetricsData, WitMetricsData } from "ProjectOverview/Scripts/Generated/Contracts";
import { DescriptionEditingToggleType } from "ProjectOverview/Scripts/Constants";
import { AsyncMetricsSource } from "ProjectOverview/Scripts/Sources/AsyncMetricsSource";
import { ReadmeActionCreator } from "ProjectOverview/Scripts/ActionCreators/ReadmeActionCreator";
import { ReadmeEditorActionCreator } from "ProjectOverview/Scripts/Shared/ReadmeEditorActionCreator";
import { PageDataSource } from "ProjectOverview/Scripts/Sources/PageDataSource";
import { ProjectMembersSource } from "ProjectOverview/Scripts/Sources/ProjectMembersSource";
import { AsyncProjectInfoSource } from "ProjectOverview/Scripts/Sources/AsyncProjectInfoSource";
import { ProjectLanguagesSource } from "ProjectOverview/Scripts/Sources/ProjectLanguagesSource";
import { ProjectTagSource } from "ProjectOverview/Scripts/Sources/ProjectTagSource";
import { MetricStore } from "ProjectOverview/Scripts/Stores/MetricsStore";
import { StoresHub } from "ProjectOverview/Scripts/Stores/StoresHub";
import * as TelemetryClient from "ProjectOverview/Scripts/TelemetryClient";
import { CodeMetricsData } from "ProjectOverview/Scripts/Models";
import * as ProjectOverviewContracts from "ProjectOverview/Scripts/Generated/Contracts";
import { getTfvcRepositoryName, UrlHelper, UpsellHelper } from "ProjectOverview/Scripts/Utils";
import {
    BuildMetricsPayload,
    DeploymentMetricsData,
    ReleaseAvailabilityStatus,
    TryDeploymentMetricsData
} from "ProjectOverview/Scripts/ActionsHub";
import { ProjectOverviewConstants } from "ProjectOverview/Scripts/Generated/Constants";

import * as  ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

import { ProjectPermissions } from "ProjectOverview/Scripts/Models";
import { PermissionSource } from "ProjectOverview/Scripts/Sources/PermissionSource";
import { ProjectLanguageMetricsData } from "ProjectOverview/Scripts/ActionsHub";

export class ActionCreatorHub {
    constructor(
        private _actionsHub: ActionsHub,
        private _storeHub: StoresHub,
        private _metricSource: AsyncMetricsSource,
        private _projectMembersSource: ProjectMembersSource,
        private _asyncProjectInfoSource: AsyncProjectInfoSource,
        private _projectTagSource: ProjectTagSource,
        private _permissionSource: PermissionSource,
        private _projectLanguagesSource: ProjectLanguagesSource,
        private _pageDataSource: PageDataSource,
        public readmeActionCreator: ReadmeActionCreator,
        public readmeEditorActionCreator: ReadmeEditorActionCreator,
    ) { }

    public loadProjectOverviewData = (parsedPageData: ProjectOverviewContracts.ProjectOverviewData): void => {
        if (parsedPageData) {
            this._actionsHub.projectOverviewDataLoaded.invoke(parsedPageData);
            this._initialize();
        } else {
            // Publishing retry attempt telemetry
            TelemetryClient.publishPageLoadRetryAttempted();

            // Making ansync call to project overview data provider
            this._pageDataSource.fetchPageData().then((pageData: ProjectOverviewContracts.ProjectOverviewData) => {
                if (pageData) {
                    this._actionsHub.projectOverviewDataLoaded.invoke(pageData);
                    this._initialize();
                } else {
                    this._invokePageLoadRetryFailed();
                }
            }, (error) => {
                this._invokePageLoadRetryFailed();
            });
        }
    }

    public startReadmeOrWikiEditing = (isCreated?: boolean): void => {
        if (this._storeHub.getAggregatedState().readmeState.wikiPageState.isDefaultSetToWikiHomePage) {
            this.readmeActionCreator.startWikiEditing();
        }
        else {
            this.readmeEditorActionCreator.startReadmeEditing(isCreated);
        }
    }

    public changeNumberOfDaysWindow = (numberOfDays: number): void => {
        this._actionsHub.numberOfDaysChanged.invoke(numberOfDays);
        this._fetchMetrics();
        TelemetryClient.publishChangeInNumberOfDaysWindow({
            changedDays: numberOfDays
        });
    }

    public manageTeamMembers = (): void => {
        const projectId = this._storeHub.getAggregatedState().projectInfoState.projectInfo.info.id;
        this._asyncProjectInfoSource.getDefaultTeam(projectId).then((team) => {
            using(["Admin/Scripts/TFS.Admin.Registration.HostPlugins"], () => {
                Events_Action.getService().performAction("manage-team-members", {
                    teamName: team.name,
                    teamId: team.id,
                    callback: (membersModified: boolean) => {
                        if (membersModified) {
                            this._projectMembersSource.refreshProjectMemebers().then(
                                (members) => {
                                    this._actionsHub.projectMembersFetched.invoke(members);
                                });
                        }
                    }
                });
            });
        });
    }

    public refreshTeamMembers() {
        this._projectMembersSource.refreshProjectMemebers().then(
            (members) => {
                this._actionsHub.projectMembersFetched.invoke(members);
            });
    }

    public redirectToBuildTab = (source: string): void => {
        this.publishSetupBuildTelemetry(source);
        window.location.href = UrlHelper.getNewBuildDefinitionUrl();
    }

    public redirectToWorkTab = (source: string): void => {
        this.publishAddWorkTelemetry(source);
        window.location.href = UrlHelper.getWorkTabUrl();
    }

    public redirectToReleaseTab = (source: string): void => {
        this.publishSetupReleaseTelemetry(source);
        window.location.href = UrlHelper.getNewReleaseDefinitionUrl();
    }

    public saveProjectDescription = (description: string): void => {
        this._actionsHub.descriptionEditingDisabled.invoke(undefined);
        TelemetryClient.publishProjectDescriptionSaveClicked();
        let trimmedText = description ? description.trim() : "";

        // If the trimmed text is different than the current description,
        // then save it. Otherwise just reset text (to original).
        if (this._storeHub.getAggregatedState().projectInfoState.projectInfo.info.description !== trimmedText) {
            this._asyncProjectInfoSource.saveProjectDescription(
                trimmedText,
                this._storeHub.getAggregatedState().projectInfoState.projectInfo.info.id).then(
                (description) => {
                    // The project description update job succeeded, hence invoke project description updated action
                    this._actionsHub.projectDescriptionUpdated.invoke(description);
                },
                (error: Error) => {
                    TelemetryClient.publishProjectDescriptionUpdateFailed(error.message);
                    this._actionsHub.projectDescriptionUpdateFailed.invoke(error.message);
                });
        } else {
            //Removed case for save description telemetry in toggleEditingProjectDescription() as it is already recorded above
            this.toggleEditingProjectDescription(DescriptionEditingToggleType.OnSaveToggle);
        }
    }

    public saveProjectTag = (): void => {
        TelemetryClient.publishProjectTagsSaveButtonClicked();
        // If the initial tags are different than the current tags, then find the tags added and removed.
        let initialTags: string[] = this._storeHub.getAggregatedState().projectTagState.initialProjectTags;
        let currentTags: string[] = this._storeHub.getAggregatedState().projectTagState.currentProjectTags;

        let addedTags: string[] = currentTags.filter((item) => initialTags.indexOf(item) < 0);
        let removedTags: string[] = initialTags.filter((item) => currentTags.indexOf(item) < 0);
        let addedTagsLength: number = addedTags.length;
        let removedTagsLength: number = removedTags.length;
        // If there are any addedTags or removedTags.
        if (addedTagsLength > 0 || removedTagsLength > 0) {
            let projectId: string = this._storeHub.getAggregatedState().projectInfoState.projectInfo.info.id;
            this._projectTagSource.saveProjectTag(addedTags, removedTags, projectId).then(
                () => {
                    // The project tag update job succeeded, hence invoke project tag updated action
                    this._actionsHub.projectTagsSaved.invoke(currentTags);
                    if (addedTagsLength > 0) {
                        TelemetryClient.publishProjectTagsAdded({ ProjectId: projectId, number: addedTagsLength });
                    }

                    if (removedTagsLength > 0) {
                        TelemetryClient.publishProjectTagsDeleted({ ProjectId: projectId, number: removedTagsLength });
                    }
                },
                (error: Error) => {
                    let errorMessage: string = error.message;
                    if (errorMessage) {
                        errorMessage = errorMessage.replace(ProjectOverviewConstants.ProjectTagsPropertyPrefix, "");
                    } else {
                        errorMessage = ProjectOverviewResources.ProjectTags_ErrorSaving;
                    }
                    this._actionsHub.prjectTagsErrorMessageUpdated.invoke(errorMessage);
                    TelemetryClient.publishProjectTagsUpdateFailed();
                }
            );
        }
    };

    private _fetchProjectTags = (): void => {
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessProjectTags, false)) {
            const projectId = this._storeHub.getAggregatedState().projectInfoState.projectInfo.info.id;
            this._projectTagSource.fetchProjectTags(projectId).then(
                (tags: string[]) => {
                    this._actionsHub.projectTagsFetched.invoke(tags);
                },
                (error: Error) => {
                    TelemetryClient.publishProjectTagsFetchProjectTagsFailed();
                    this._actionsHub.prjectTagsErrorMessageUpdated.invoke(error.toString());
                }
            );
        }
    }

    public fetchAllProjectTags = (): void => {
        // Fetch all tags across projects to show in the autocomplete
        this._projectTagSource.fetchAllProjectTags().then(
            (tags: string[]) => {
                this._actionsHub.allProjectTagsFetched.invoke(tags);
            },
            (error: Error) => {
                this._actionsHub.prjectTagsErrorMessageUpdated.invoke(error.toString());
                TelemetryClient.publishProjectTagsFetchAllProjectTagsFailed();
            }
        );
    };

    public updateCurrentTags = (tags: string[]): void => {
        this._actionsHub.currentTagsUpdated.invoke(tags);
    }

    public updateProjectTagsErrorMessage = (errorMessage: string): void => {
        this._actionsHub.prjectTagsErrorMessageUpdated.invoke(errorMessage);
    }

    public clearProjectDescriptionErrorMessage = (): void => {
        this._actionsHub.errorMessageCleared.invoke(undefined);
    }

    public toggleEditingProjectDescription = (toggleType: DescriptionEditingToggleType): void => {
        if (this._storeHub.getAggregatedState().projectInfoState.projectInfo.currentUser.hasProjectLevelEditPermission) {
            if (!this._storeHub.getAggregatedState().projectInfoState.isEditingDisabled) {
                switch (toggleType) {
                    case DescriptionEditingToggleType.StartEditingToggle:
                        TelemetryClient.publishProjectDescriptionStartedEditing();
                        break;
                    case DescriptionEditingToggleType.OnClickOutToggle:
                        TelemetryClient.publishProjectDescriptionEditingToggledOnClickOut();
                        break;
                }
            }

            this._actionsHub.descriptionEditingToggled.invoke(undefined);
        }
    }

    public publishProjectDescriptionDiscardClicked(): void {
        TelemetryClient.publishProjectDescriptionDiscardClicked();
    }

    public publishProjectDescriptionDiscardDialogOKClicked(): void {
        TelemetryClient.publishProjectDescriptionDiscardDialogOKClicked();
    }

    public publishProjectDescriptionDiscardDialogCancelClicked(): void {
        TelemetryClient.publishProjectDescriptionDiscardDialogCancelClicked();
    }

    public publishProjectDescriptionDiscardDialogDismissed(): void {
        TelemetryClient.publishProjectDescriptionDiscardDialogDismissed();
    }

    public publishSetupBuildTelemetry = (source: string): void => {
        TelemetryClient.publishSetupBuildClicked({ source: source });
    }

    public publishAddCodeTelemetry = (): void => {
        TelemetryClient.publishAddCodeClicked();
    }

    public publishAddWorkTelemetry = (source: string): void => {
        TelemetryClient.publishAddWorkClicked({ source: source });
    }

    public publishSetupReleaseTelemetry = (source: string): void => {
        TelemetryClient.publishSetupReleaseClicked({ source: source });
    }

    public dismissUpsell = (upsellKey: ProjectOverviewContracts.UpsellTypes): void => {
        let projectId = this._storeHub.getAggregatedState().projectInfoState.projectInfo.info.id;
        let currentDismissedUpsells = this._storeHub.getAggregatedState().upsellSectionState.dismissedUpsells;
        currentDismissedUpsells[upsellKey] = true;
        using(
            ["ProjectOverview/Scripts/SettingsClient"],
            (currentSettingsClient: typeof SettingsClient_LAZY_LOAD) =>
                currentSettingsClient.SettingsClient.saveDismissedUpsells(projectId, currentDismissedUpsells)
        );
        TelemetryClient.publishUpsellDismissed({ upsellType: ProjectOverviewContracts.UpsellTypes[upsellKey] });
        this._actionsHub.upsellDismissed.invoke(upsellKey);
    }

    public openImportRepositoryDialog = (): void => {
        using(["VersionControl/Scenarios/Import/ImportDialog/ImportDialog"], (VCImportRepository: typeof VCImportDialog_Async) => {
            let repositoryContext = this._storeHub.getAggregatedState().readmeState.currentRepositoryContext;
            let options = <VCImportDialog_Async.ImportDialogOptions>{
                tfsContext: repositoryContext.getTfsContext(),
                projectInfo: repositoryContext.getRepository().project,
                repositoryName: repositoryContext.getRepository().name,
            };
            VCImportRepository.ImportDialog.show(options);
        });
    }

    // Currently permissions are used for showing upsell, right pane and edit readme option
    // this method gets called only once on page load
    // public for tests
    public setPermissions = (): void => {
        const projectInfo: ProjectOverviewContracts.ProjectOverviewData = this._storeHub.getAggregatedState().projectInfoState.projectInfo;
        const readmeState = this._storeHub.getAggregatedState().readmeState;
        let repoId = "";
        const upsellPermissionDictionary: { [key: number]: ProjectPermissions; } = {}; // { [key: UpsellTypes]: ProjectPermissions; }
        let candidateUpsells: ProjectOverviewContracts.UpsellTypes[] = [];
        const permissibleUpsells: ProjectOverviewContracts.UpsellTypes[] = [];
        let editReadmePermissionToQuery: ProjectPermissions = ProjectPermissions.None;
        let permissionToQuery: ProjectPermissions = ProjectPermissions.ViewActivityPane; // always need to query view activity pane permission

        // for stakeholders we dont care for permissions, assume them to be the least permissible - even for work upsell
        if (!projectInfo.currentUser.isStakeHolder && !projectInfo.isProjectEmpty) {
            upsellPermissionDictionary[ProjectOverviewContracts.UpsellTypes.Build] = ProjectPermissions.EditBuild;
            upsellPermissionDictionary[ProjectOverviewContracts.UpsellTypes.Release] = ProjectPermissions.EditRelease;
            if (readmeState.defaultRepositoryContext &&
                readmeState.defaultRepositoryContext.getRepositoryType() === RepositoryType.Git) {
                upsellPermissionDictionary[ProjectOverviewContracts.UpsellTypes.Code] = ProjectPermissions.EditGitCode;
            }
            // fetch all the candidate permissions
            candidateUpsells = UpsellHelper.getCandidateUpsells(
                this._storeHub.getAggregatedState().upsellSectionState.dismissedUpsells);
            this._actionsHub.candidateUpsellsUpdated.invoke({ candidateUpsells });

            candidateUpsells.map((candidate: ProjectOverviewContracts.UpsellTypes) => {
                if (upsellPermissionDictionary[candidate]) {
                    permissionToQuery |= upsellPermissionDictionary[candidate];
                }
            });
        }

        if (readmeState.defaultRepositoryContext) {
            const isTfvcRepo = readmeState.defaultRepositoryContext.getRepositoryType() === RepositoryType.Tfvc;
            editReadmePermissionToQuery = isTfvcRepo ? ProjectPermissions.EditTfvcCode : ProjectPermissions.EditGitCode;
            permissionToQuery |= editReadmePermissionToQuery;
            repoId = readmeState.defaultRepositoryContext.getRepositoryId();
        }

        // We need build permission for upsell and setup build accordion
        permissionToQuery |= ProjectPermissions.EditBuild;

        this._permissionSource.hasPermissions(
            permissionToQuery,
            projectInfo.info.id,
            repoId).then(
            (allowedPermissions: ProjectPermissions) => {
                candidateUpsells.map((candidate: ProjectOverviewContracts.UpsellTypes) => {
                    if (allowedPermissions & upsellPermissionDictionary[candidate]) {
                        permissibleUpsells.push(candidate);
                    }
                });

                // work upsell is always permissible
                permissibleUpsells.push(ProjectOverviewContracts.UpsellTypes.Work);

                const hasViewRightPanePermission = Boolean(allowedPermissions & ProjectPermissions.ViewActivityPane);
                const hasEditReadmePermission = Boolean(allowedPermissions & editReadmePermissionToQuery);
                const hasBuildPermission = Boolean(allowedPermissions & ProjectPermissions.EditBuild);
                this._actionsHub.permissionsUpdated.invoke({
                    hasViewRightPanePermission,
                    hasEditReadmePermission,
                    hasBuildPermission,
                    permissibleUpsells
                });
                this._fetchRightPaneData(hasViewRightPanePermission);
            },
            (error: Error) => {
                this._showError(error.message, false);
            });
    }

    // Public for UTs
    public _initialize = (): void => {
        this.readmeActionCreator.initializeReadmeContentRenderer();
        this.setPermissions();
        this._fetchProjectTags();
        this._fetchProjectDominantLanguages();
        this._fetchIsProjectImageSet();
    }

    private _invokePageLoadRetryFailed = (): void => {
        // Update isLoading states of all stores to false so that loading experience is removed.
        this._actionsHub.projectOverviewDataLoadFailed.invoke(undefined);

        //Publish retry attempt failed telemetry
        TelemetryClient.publishPageLoadRetryFailed();
    }

    private _fetchRightPaneData = (hasViewRightPanePermission: boolean): void => {
        if (hasViewRightPanePermission) {
            this._fetchMetrics();
            this._fetchProjectMembers();
        }
    }

    private _fetchIsProjectImageSet = (): void => {
        this._asyncProjectInfoSource.getIsProjectImageSet().then(
            (isProjectImageSet: boolean) => {
                this._actionsHub.projectImageInformationFetched.invoke(isProjectImageSet);
            },
            (error: Error) => {
                // In the case of error, we want to fallback to persona with initials of project name
                this._actionsHub.projectImageInformationFetched.invoke(false);
            }
        );
    }

    private _fetchProjectMembers = (): void => {
        this._projectMembersSource.getProjectMembers().then(
            (members) => {
                this._actionsHub.projectMembersFetched.invoke(members);
            },
            (error: Error) => {
                this._actionsHub.membersFetchFailed.invoke(error.toString() || ProjectOverviewResources.ProjectMembers_ErrorLoadingMembers);
            });
    }

    private _fetchMetrics = (): void => {
        const numOfDays = this._storeHub.getAggregatedState().metricsState.currentNumberOfDays;
        const projectId = this._storeHub.getAggregatedState().projectInfoState.projectInfo.info.id;
        this._fetchCodeMetric(numOfDays);

        if (FeatureAvailabilityService.isFeatureEnabled(
            FeatureAvailabilityFlags.NewProjectOVerviewPageBuildReleaseMetrics, false)) {
            this._fetchReleaseMetric(numOfDays);
            this._fetchBuildMetric(projectId, numOfDays);
        }

        this._fetchWorkMetric(projectId, numOfDays);
    }

    private _fetchWorkMetric(projectId: string, numOfDays: number): void {
        const witAvailabilityStatus: WitAvailabilityStatus = this._storeHub.getAggregatedState().metricsState.workMetrics.witAvailable;
        if (witAvailabilityStatus !== WitAvailabilityStatus.Created) {
            this._metricSource.checkWitExists(projectId).then((isWitAvaialable: boolean) => {
                if (witAvailabilityStatus === WitAvailabilityStatus.AvailabilityUnknown) {
                    TelemetryClient.publishProjectOverviewPageHasWork({ "ProjectHasWork": isWitAvaialable });
                }
                this._actionsHub.workMetricsAvailabilityChanged.invoke(isWitAvaialable);
                this._fetchWit(numOfDays, MetricStore.getWitAvailabilityStatus(isWitAvaialable));
            });
        }
        else {
            this._fetchWit(numOfDays, witAvailabilityStatus);
        }
    }

    private _fetchWit = (numOfDays: number, witAvailabilityStatus: WitAvailabilityStatus): void => {
        if (witAvailabilityStatus === WitAvailabilityStatus.Created) {
            this._metricSource.fetchWitMetric(numOfDays).then((metric: WitMetricsData) => {
                this._actionsHub.workMetricsChanged.invoke(metric);
            });
        }
    }

    private _fetchCodeMetric = (numOfDays: number): void => {

        if (!this._storeHub.getAggregatedState().metricsState.codeMetrics.hasCode) {
            this._actionsHub.gitMetricsChanged.invoke(null);
        }
        else {
            if (this._storeHub.getAggregatedState().metricsState.codeMetrics.showGitStats
                && this._storeHub.getAggregatedState().metricsState.codeMetrics.showTfvcStats) {
                this._metricSource.fetchCodeMetric(numOfDays).then((codeMetric: CodeMetricsData) => {
                    this._actionsHub.codeMetricsChanged.invoke(codeMetric);
                }, (error: Error) => { this._showError(error.message, false); });
            }
            else if (this._storeHub.getAggregatedState().metricsState.codeMetrics.showGitStats) {
                this._metricSource.fetchGitMetric(numOfDays).then((metric: GitCodeMetricsData) => {
                    this._actionsHub.gitMetricsChanged.invoke(metric);
                }, (error: Error) => { this._showError(error.message, false); });
            }
            else if (this._storeHub.getAggregatedState().metricsState.codeMetrics.showTfvcStats) {
                this._metricSource.fetchTfvcMetric(numOfDays).then((metric: TfvcCodeMetricsData) => {
                    this._actionsHub.tfvcMetricsChanged.invoke(metric);
                }, (error: Error) => { this._showError(error.message, false); });
            }
        }
    }

    private _fetchReleaseMetric = (numOfDays: number): void => {
        // If the account has not faulted in RM, do not call any RM API
        if (this._storeHub.getAggregatedState().metricsState.releaseMetrics.isRMFaultedIn) {
            if (this._storeHub.getAggregatedState().metricsState.releaseMetrics.releaseAvailability === ReleaseAvailabilityStatus.AvailabilityUnknown) {
                this._metricSource.tryFetchDeploymentMetrics(numOfDays).then((tryDeploymentMetricsData: TryDeploymentMetricsData) => {
                    this._actionsHub.deploymentMetricsAndAvailabilityChanged.invoke(tryDeploymentMetricsData);
                }, (error: Error) => { this._showError(error.message, false); });
            } else if (this._storeHub.getAggregatedState().metricsState.releaseMetrics.releaseAvailability === ReleaseAvailabilityStatus.DefinitionsPresent) {
                this._metricSource.fetchDeploymentMetrics(numOfDays).then((metric: DeploymentMetricsData) => {
                    this._actionsHub.deploymentMetricsChanged.invoke(metric);
                }, (error: Error) => { this._showError(error.message, false); });
            }
        }
    }

    private _fetchBuildMetric = (projectId: string, numOfDays: number): void => {
        if (this._storeHub.getAggregatedState().metricsState.buildMetrics.buildDefinitionsPresent) {
            this._metricSource.fetchBuildMetrics(projectId, numOfDays).then((metric: BuildMetricsPayload) => {
                this._actionsHub.buildMetricsChanged.invoke(metric);
            }, (error: Error) => { this._showError(error.message, false); });
        }
    }

    private _fetchProjectDominantLanguages = (): void => {
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessProjectLanguages, false)) {
            this._projectLanguagesSource.fetchProjectLanguages().then((projectLanguages: ProjectLanguageMetricsData[]) => {
                    this._actionsHub.projectLanguagesFetched.invoke(projectLanguages);
                },
                (error: Error) => {
                    TelemetryClient.publishProjectLanguagesFetchProjectLanguagesFailed();
                });
        }
    }

    private _showError = (message: string, isWikiPageNotFoundError: boolean): void => {
        this._actionsHub.errorEncountered.invoke({
            errorMessage: message,
            showWikiPageNotFoundError: isWikiPageNotFoundError,
        });
    }
}