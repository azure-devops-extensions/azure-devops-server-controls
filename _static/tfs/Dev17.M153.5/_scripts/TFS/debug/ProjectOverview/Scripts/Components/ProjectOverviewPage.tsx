import * as React from "react";
import * as ReactDOM from "react-dom";
import { Fabric } from "OfficeFabric/Fabric";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Overlay } from "OfficeFabric/Overlay";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { Async, autobind, css } from "OfficeFabric/Utilities";

import { globalProgressIndicator } from "VSS/VSS";
import { getScenarioManager } from "VSS/Performance";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import SDK_Shim = require("VSS/SDK/Shim");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import Context = require("VSS/Context");
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import * as TFS_Core_Contracts from "TFS/Core/Contracts";
import * as Core_RestClient from "TFS/Core/RestClient";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import { CommitPromptState } from "VersionControl/Scenarios/Shared/Committing/CommitPromptStore";

import { TeamProjectInfoPane } from "ProjectOverview/Scripts/Components/TeamProjectInfoPane";
import { ActionCreatorHub } from "ProjectOverview/Scripts/ActionCreatorsHub";
import { CloneRepositoryState } from "ProjectOverview/Scripts/Stores/CloneRepositoryStore";
import { StoresHub, AggregatedState } from "ProjectOverview/Scripts/Stores/StoresHub";
import { PermissionState } from "ProjectOverview/Scripts/Stores/PermissionStore";
import { ProjectInfoState } from "ProjectOverview/Scripts/Stores/ProjectInfoStore";
import { ProjectMembersState } from "ProjectOverview/Scripts/Stores/ProjectMembersStore";
import { UpsellSectionState } from "ProjectOverview/Scripts/Stores/UpsellSectionStore";
import { ReadmeState } from "ProjectOverview/Scripts/Stores/ReadmeStore";
import { ActivityPanel } from "ProjectOverview/Scripts/Components/ActivityPanel";
import { AddUserDialogComponent } from "ProjectOverview/Scripts/Components/AddUserDialogComponent";
import { ProjectTagsPane } from "ProjectOverview/Scripts/Components/ProjectTags";
import { ProjectLanguages } from "ProjectOverview/Scripts/Shared/Components/ProjectLanguages";
import { ProjectMembersSection } from "ProjectOverview/Scripts/Components/ProjectMembersSection";
import { ReadmeSectionContainer } from "ProjectOverview/Scripts/Components/ReadmeSection/ReadmeSection";
import * as GitGettingStartedSection_Async from "ProjectOverview/Scripts/Components/GitGettingStartedSection";
import * as ProjectOverviewContracts from "ProjectOverview/Scripts/Generated/Contracts";
import { Constants, PerformanceConstants } from "ProjectOverview/Scripts/Constants";
import { UpsellSection } from "ProjectOverview/Scripts/Components/UpsellSection";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import { MetricState } from "ProjectOverview/Scripts/Stores/MetricsStore";
import { WitAvailabilityStatus } from "ProjectOverview/Scripts/ActionsHub";
import { ProjectOverviewCIConstants } from "ProjectOverview/Scripts/Generated/Constants";
import * as TelemetryClient from "ProjectOverview/Scripts/TelemetryClient";

import { ProjectTagState } from "ProjectOverview/Scripts/Stores/ProjectTagStore";
import { ProjectLanguageStore, ProjectLanguageState } from "ProjectOverview/Scripts/Stores/ProjectLanguageStore";

import { UpsellHelper } from "ProjectOverview/Scripts/Utils";

import {
    IContributedComponent,
    IInviteUserToProjectDialogState,
    InviteUserToProjectDialogContainerIdType,
    IUserManagementService,
    userManagementServiceContributionId,
} from "Aex/MemberEntitlementManagement/Services";
import {
    TeamRef
} from "Aex/MemberEntitlementManagement/Contracts";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/ProjectOverviewPage";
import "VSS/LoaderPlugins/Css!Site";

const isProjectTagsFeatureEnabled: boolean = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessProjectTags, false);
const isProjectLanguagesFeatureEnabled: boolean = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessProjectLanguages, false);

export interface ProjectOverviewProps {
    actionCreator: ActionCreatorHub;
    storesHub: StoresHub;
}

export interface ProjectOverviewState extends AggregatedState {
    showAddUsersDialog?: boolean;
    userDialogLoading?: boolean;
    showStatusMessageBar?: boolean;
    statusMessageBarContent?: React.ReactNode;
    addStatusSuccess?: boolean;
}

export class ProjectOverviewPage extends React.Component<ProjectOverviewProps, ProjectOverviewState> {
    private _leftPane: HTMLElement;
    private _rightPane: HTMLElement;
    private _rightPaneHeight: number;
    private _isHosted: boolean;
    private _throttledAdjustRightPaneHeight: () => void;

    constructor(props: ProjectOverviewProps, context?: any) {
        super(props, context);
        this.state = props.storesHub.getAggregatedState();
        this._isHosted = Context.getPageContext().webAccessConfiguration.isHosted;
        this._throttledAdjustRightPaneHeight = (new Async()).debounce(this._adjustRightPaneHeight, 50, { trailing: true });

        if (!this.state.readmeState.isDefaultRepoPresent) {
            if (this.state.readmeState.wikiPageState.isDefaultSetToWikiHomePage) {
                this.props.actionCreator.readmeActionCreator.publishWikiRepoNotPresent();
            } else {
                this.props.actionCreator.readmeActionCreator.publishReadmeRepoNotPresent();
            }
        }
    }

    public render(): JSX.Element {
        const projectInfo = this.state.projectInfoState.projectInfo;
        const hasViewRightPanePermission = this.state.permissionState.hasViewRightPanePermission;

        // note project-overview-page-container contains flex, so adding extra divs will add them column wise
        return (
            <Fabric
                className="project-overview-page-container"
                ref={(page) => { this.props.actionCreator.readmeEditorActionCreator.focusManager.setPage(page); }}>
                {
                    this._isHosted &&
                    <AddUserDialogComponent
                        onAddUserDialogLoadStarted={this._onAddUserDialogLoadStarted}
                        onAddUserDialogLoadCompleted={this._onAddUserDialogLoadCompleted}
                        onAddUsersActionComplete={this._onAddUsersActionComplete}
                        onAddUserDialogDismiss={this._onAddUserDialogDismiss}
                        showAddUsersDialog={this.state.showAddUsersDialog}
                    />
                }
                <div className="project-overview-page">
                    <div className="hub-progress project-overview-progress" />
                    <div
                        ref={(ref) => { this._leftPane = ref; }}
                        className={css("left-pane", { "center-aligned-view": this.state.projectMembersState.isPublicAccess })}>
                        <LeftPane
                            projectTagState={this.state.projectTagState}
                            cloneRepositoryState={this.state.cloneRepositoryState}
                            actionCreator={this.props.actionCreator}
                            readmeState={this.state.readmeState}
                            commitPromptState={this.state.commitPromptState}
                            metricsState={this.state.metricsState}
                            projectInfoState={this.state.projectInfoState}
                            upsellSectionState={this.state.upsellSectionState}
                            permissionState={this.state.permissionState}
                            headingLevel={1}
                            projectMembersState={this.state.projectMembersState}
                            projectLanguageState={this.state.projectLanguageState} />
                    </div>
                    {
                        hasViewRightPanePermission &&
                        <div
                            ref={(ref) => { this._rightPane = ref; }}
                            className="right-pane"
                            role="region"
                            aria-label={ProjectOverviewResources.MembersAndActivityRegion_Label}>
                            <ProjectMembersSection
                                state={this.state.projectMembersState}
                                onAddMemberButtonClicked={this.onAddMemberButtonClicked}
                                headingLevel={3} />
                            <ActivityPanel
                                numberOfDaysSelected={this.state.metricsState.currentNumberOfDays}
                                numberOfDaysOptions={this.state.metricsState.numberOfDaysOptions}
                                codeMetricsAvailableDays={this.state.metricsState.codeMetrics.metricsAvailableDays}
                                onNumberOfDaysChanged={this.props.actionCreator.changeNumberOfDaysWindow}
                                metricsState={this.state.metricsState}
                                onAddCodeClicked={this.props.actionCreator.publishAddCodeTelemetry}
                                onAddWorkClicked={() => this.props.actionCreator.publishAddWorkTelemetry(Constants.ActivityPane)}
                                onSetupBuildClicked={() => this.props.actionCreator.publishSetupBuildTelemetry(Constants.ActivityPane)}
                                onSetupReleaseClicked={() => this.props.actionCreator.publishSetupReleaseTelemetry(Constants.ActivityPane)}
                                hasWriteAccess={!projectInfo.currentUser.isStakeHolder}
                                headingLevel={3} />
                        </div>
                    }
                    {
                        this.showOverlay && <Overlay
                            className="project-overview-overlay"
                            isDarkThemed={true}>
                            <Spinner size={SpinnerSize.large} label={ProjectOverviewResources.Loading_Label} ariaLive="assertive" />
                        </Overlay>
                    }
                </div>
            </Fabric >
        );
    }

    public componentDidMount() {
        globalProgressIndicator.registerProgressElement($(".project-overview-progress"));
        getScenarioManager().recordPageLoadScenario(
            ProjectOverviewCIConstants.Area,
            PerformanceConstants.ProjectOverviewPageLoad,
            {
                "ProjectId": this.props.storesHub.projectInfoStore.getState().projectInfo.info.id,
            });

        // Record page views telemetry
        TelemetryClient.publishViewedProjectOverviewPage({
            "isEditAllowed": this.state.projectInfoState.projectInfo.currentUser.hasProjectLevelEditPermission,
            "ProjectHasCode": this.props.storesHub.metricsStore.getState().codeMetrics.hasCode,
        });

        this.props.storesHub.projectInfoStore.addChangedListener(this.onStoreChanged);
        this.props.storesHub.metricsStore.addChangedListener(this.onStoreChanged);
        this.props.storesHub.projectMembersStore.addChangedListener(this.onStoreChanged);
        this.props.storesHub.readmeStore.addChangedListener(this.onStoreChanged);
        this.props.storesHub.commitPromptStore.addChangedListener(this.onStoreChanged);
        this.props.storesHub.permissionStore.addChangedListener(this.onStoreChanged);

        if (isProjectTagsFeatureEnabled) {
            this.props.storesHub.projectTagStore.addChangedListener(this.onStoreChanged);
        }

        if (isProjectLanguagesFeatureEnabled) {
            this.props.storesHub.projectLanguageStore.addChangedListener(this.onStoreChanged);
        }

        this._throttledAdjustRightPaneHeight();
        addEventListener("keyup", this._throttledAdjustRightPaneHeight);
        addEventListener("click", this._throttledAdjustRightPaneHeight);
        addEventListener("resize", this._throttledAdjustRightPaneHeight);
    }

    public componentDidUpdate(): void {
        this._throttledAdjustRightPaneHeight();
    }

    public componentWillUnmount() {
        this.props.storesHub.projectInfoStore.removeChangedListener(this.onStoreChanged);
        this.props.storesHub.metricsStore.removeChangedListener(this.onStoreChanged);
        this.props.storesHub.projectMembersStore.removeChangedListener(this.onStoreChanged);
        this.props.storesHub.readmeStore.removeChangedListener(this.onStoreChanged);
        this.props.storesHub.commitPromptStore.removeChangedListener(this.onStoreChanged);
        this.props.storesHub.permissionStore.removeChangedListener(this.onStoreChanged);
        if (isProjectTagsFeatureEnabled) {
            this.props.storesHub.projectTagStore.removeChangedListener(this.onStoreChanged);
        }
        if (isProjectLanguagesFeatureEnabled) {
            this.props.storesHub.projectLanguageStore.removeChangedListener(this.onStoreChanged);
        }

        removeEventListener("keyup", this._throttledAdjustRightPaneHeight);
        removeEventListener("click", this._throttledAdjustRightPaneHeight);
        removeEventListener("resize", this._throttledAdjustRightPaneHeight);
    }

    private onStoreChanged = (): void => {
        this.setState(this.props.storesHub.getAggregatedState());
    }

    private onAddMemberButtonClicked = (): void => {
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.UserManagementProjectDialog, false)
            && this._isHosted) {
            this.setState({
                showAddUsersDialog: true,
            });
        } else {
            this.props.actionCreator.manageTeamMembers();
        }
    }

    private _onAddUserDialogLoadStarted = () => {
        this.setState({ userDialogLoading: true });
    }

    private _onAddUserDialogLoadCompleted = () => {
        this.setState({ userDialogLoading: false });
    }

    private _onAddUserDialogDismiss = () => {
        this.setState({ showAddUsersDialog: false });
    }

    private _onAddUsersActionComplete = () => {
        this.setState({ showAddUsersDialog: false });
        this.props.actionCreator.refreshTeamMembers();
    }

    private get showOverlay() {
        return this.state.userDialogLoading && this.state.showAddUsersDialog;
    }

    private _adjustRightPaneHeight = (): void => {
        if (this._rightPane && this._leftPane) {
            if (!this._rightPaneHeight) {
                this._rightPaneHeight = this._rightPane.scrollHeight;
            }

            const adjustedHeight = Math.max(this._leftPane.scrollHeight, this._getRightPaneContentHeight());
            if (adjustedHeight !== this._rightPaneHeight) {
                this._rightPane.style.height = adjustedHeight + "px";
                this._rightPaneHeight = adjustedHeight;
            }
        }
    }

    private _getRightPaneContentHeight(): number {
        const length = this._rightPane.children.length;
        const lastChild: HTMLElement = this._rightPane.children[length - 1] as HTMLElement;
        const contentHeight = lastChild.offsetTop + lastChild.scrollHeight;

        return contentHeight;
    }
}

const LeftPane = (props: {
    projectTagState: ProjectTagState,
    projectInfoState: ProjectInfoState,
    projectMembersState: ProjectMembersState,
    readmeState: ReadmeState,
    commitPromptState: CommitPromptState,
    cloneRepositoryState: CloneRepositoryState,
    actionCreator: ActionCreatorHub,
    metricsState: MetricState,
    upsellSectionState: UpsellSectionState,
    permissionState: PermissionState,
    headingLevel: number,
    projectLanguageState: ProjectLanguageState,
}): JSX.Element => {
    let isStakeHolder = props.projectInfoState.projectInfo.currentUser.isStakeHolder;
    let hasProjectLevelEditPermission = props.projectInfoState.projectInfo.currentUser.hasProjectLevelEditPermission;
    const shouldShowUpsell: boolean = !isStakeHolder && !props.projectInfoState.projectInfo.isProjectEmpty;
    const upsellToShow: ProjectOverviewContracts.UpsellTypes = shouldShowUpsell
        ? UpsellHelper.getUpsellToShow(
            props.upsellSectionState.candidateUpsells,
            props.permissionState.permissibleUpsells,
            props.metricsState,
            props.projectInfoState.projectInfo.hasBuildConfigured,
            props.projectInfoState.projectInfo.hasCode)
        : null;

    /*
    We need to show projects tags component when:
    1. User has manage properties permission
    2. User has read access and there are tags to show
    */
    const shouldRenderProjectTags = (props.projectInfoState.projectInfo.currentUser.hasManageProjectPropertiesPermission ||
        (props.projectTagState.initialProjectTags.length !== 0)) &&
        props.projectTagState.isProjectTagsLoaded;

    // Styling Hack: On edit mode, file viewer is displayed. File viewer displays an internal scroll bar. Thus has a fixed height.
    // Left pane should take 100% height of the parent in this case.
    // Otherwise a full page scroll will be displayed and left pane will take as much as height is needed.
    return (
        <div className={props.readmeState.readmeFileState.isEditing ? "content-edit-mode" : ""}>
            <div className="section">
                <TeamProjectInfoPane
                    projectAboutData={props.projectInfoState.projectInfo.info}
                    errorMessage={props.projectInfoState.errorMessage}
                    hasProjectEditPermission={props.projectInfoState.projectInfo.currentUser.hasProjectLevelEditPermission}
                    onSaveDescriptionClicked={props.actionCreator.saveProjectDescription}
                    isEditingProjectDescription={props.projectInfoState.isEditing}
                    isEditingProjectDescriptionDisabled={props.projectInfoState.isEditingDisabled}
                    toggleEditingProjectDescription={props.actionCreator.toggleEditingProjectDescription}
                    publishProjectDescriptionDiscardClicked={props.actionCreator.publishProjectDescriptionDiscardClicked}
                    publishProjectDescriptionDiscardDialogOKClicked={props.actionCreator.publishProjectDescriptionDiscardDialogOKClicked}
                    publishProjectDescriptionDiscardDialogCancelClicked=
                    {props.actionCreator.publishProjectDescriptionDiscardDialogCancelClicked}
                    publishProjectDescriptionDiscardDialogDismissed={props.actionCreator.publishProjectDescriptionDiscardDialogDismissed}
                    clearErrorMessage={props.actionCreator.clearProjectDescriptionErrorMessage}
                    headingLevel={props.headingLevel} />
            </div>
            {(isProjectTagsFeatureEnabled || isProjectLanguagesFeatureEnabled) &&
                <div className="section">
                    <div className="project-overview-tags-container">
                        {
                            isProjectLanguagesFeatureEnabled &&
                            props.projectLanguageState.isProjectLanguageMetricsLoaded &&
                            <ProjectLanguages
                                dominantLanguagesMetrics={props.projectLanguageState.projectLanguagesMetrics}
                            />
                        }
                        {
                            isProjectTagsFeatureEnabled &&
                            shouldRenderProjectTags &&
                            ((isProjectLanguagesFeatureEnabled && props.projectLanguageState.isProjectLanguageMetricsLoaded) ||
                                !isProjectLanguagesFeatureEnabled) &&
                            <ProjectTagsPane
                                projectTagState={props.projectTagState}
                                readonly={!props.projectInfoState.projectInfo.currentUser.hasManageProjectPropertiesPermission}
                                onSaveClicked={props.actionCreator.saveProjectTag}
                                onEditClicked={props.actionCreator.fetchAllProjectTags}
                                onNewTagsAdded={props.actionCreator.updateCurrentTags}
                                onErrorUpdate={props.actionCreator.updateProjectTagsErrorMessage} />
                        }
                    </div>
                </div>
            }
            {
                upsellToShow != null &&
                <div className="section">
                    <UpsellSection
                        projectInfoState={props.projectInfoState}
                        onAddBuildClick={() => props.actionCreator.redirectToBuildTab(Constants.LeftPane)}
                        onAddWorkClick={() => props.actionCreator.redirectToWorkTab(Constants.LeftPane)}
                        onAddReleaseClick={() => props.actionCreator.redirectToReleaseTab(Constants.LeftPane)}
                        onAddCodeClick={props.actionCreator.openImportRepositoryDialog}
                        onDismissUpsell={props.actionCreator.dismissUpsell}
                        headingLevel={props.headingLevel + 1}
                        upsellToShow={upsellToShow}
                    />
                </div>
            }
            <div className="section">
                {props.projectInfoState.projectInfo.isProjectEmpty
                    ? <AsyncGitGettingStartedSection
                        repositoryContext={props.readmeState.currentRepositoryContext as GitRepositoryContext}
                        hasBuildPermission={props.permissionState.hasBuildPermission}
                        sshEnabled={props.cloneRepositoryState.sshEnabled}
                        sshUrl={props.cloneRepositoryState.sshUrl}
                        cloneUrl={props.cloneRepositoryState.cloneUrl}
                        headingLevel={props.headingLevel + 1}
                        isPublicAccess={props.projectMembersState.isPublicAccess} />
                    : <ReadmeSectionContainer
                        readmeActionCreator={props.actionCreator.readmeActionCreator}
                        readmeEditorActionCreator={props.actionCreator.readmeEditorActionCreator}
                        onContentEditingStart={props.actionCreator.startReadmeOrWikiEditing}
                        readmeState={props.readmeState}
                        commitPromptState={props.commitPromptState}
                        supportsTfvc={props.projectInfoState.projectInfo.supportsTFVC}
                        isUserAdmin={hasProjectLevelEditPermission}
                        isStakeHolder={isStakeHolder}
                        isEditEnabled={props.permissionState.hasEditReadmePermission}
                        headingLevel={props.headingLevel + 1} />
                }
            </div>
        </div>
    );
}

const AsyncGitGettingStartedSection = getAsyncLoadedComponent(
    ["ProjectOverview/Scripts/Components/GitGettingStartedSection"],
    (module: typeof GitGettingStartedSection_Async) => module.GitGettingStartedSection);
