import * as React from "react";
import * as ReactDOM from "react-dom";

// OfficeFabric
import { Image } from "OfficeFabric/Image";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { autobind, css } from "OfficeFabric/Utilities";
import { SpinnerSize } from "OfficeFabric/Spinner";
import { ConstrainMode, IColumn, IDetailsRowProps, DetailsRow, Selection } from "OfficeFabric/DetailsList";

// VSS
import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";
import { registerLWPComponent } from "VSS/LWP";
import { ZeroData, ZeroDataActionType } from "VSSUI/ZeroData";
import * as VSS from "VSS/VSS";
import { publishErrorToTelemetry } from "VSS/Error";
import { FormatComponent } from "VSS/Platform/Components/Format";

// DTC
import { AppContext } from "DistributedTaskControls/Common/AppContext";
import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

// ReleasePipeline
import { Release, ReleaseStatus, ReleaseEnvironment, ReleaseEnvironmentStatusUpdatedEvent, ApprovalStatus, Artifact } from "ReleaseManagement/Core/Contracts";
import * as RMUtils from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils";

// PipelineWorflow
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { MessageBarParentKeyConstants, ReleasesViewCanvasConstants, Links } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { DefinitionsActionsCreator } from "PipelineWorkflow/Scripts/Definitions/DefinitionsActionsCreator";
import { ActiveReleasesDetailsList } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesDetailsList";
import { ActiveReleasesActionCreator } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesActionCreator";
import { IActiveReleasesState, ActiveReleasesStore } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesStore";
import { ArtifactTypeListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeListStore";
import { IActiveReleasesFilterState, ActiveReleasesFilterStore } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesFilterStore";
import { ReleaseEnvironmentTileSize } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseEnvironmentNodeHelper";
import { CommonDefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/Stores/CommonDefinitionsStore";
import { ReleasesHubServiceDataHelper, ActiveDefinitionReferenceType } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import { ResourcePathUtils } from "PipelineWorkflow/Scripts/Shared/Utils/ResourcePathUtils";
import { formatJsx } from "PipelineWorkflow/Scripts/Shared/Utils/JsxFormatter";
import { DefinitionsHubTelemetry, Source } from "PipelineWorkflow/Scripts/Definitions/Utils/TelemetryUtils";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { PermissionHelper, IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { SecurityUtils } from "PipelineWorkflow/Scripts/Editor/Common/SecurityUtils";

import { ReleaseManagementSecurityPermissions } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import * as Manager from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Manager";

import * as CreateReleasePanelHelper_TypeOnly from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleasePanelHelper";
import * as CreateReleaseDialog_TypeOnly from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/ReleaseDialog";
import { ReleaseApproval } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Model";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionDetails";

export interface IActiveDefinitionDetailsProps extends IProps {
    definitionId: number;
    definitionName: string;
    folderPath: string;
    isSearchedItem: boolean;
    definitionEnvironmentCurrentReleaseMap: IDictionaryNumberTo<number>;
    definitionReferenceType: ActiveDefinitionReferenceType;
    filterState?: IActiveReleasesFilterState;
    pageContext?: any;

    /*Success and error callbacks to invoke in order to render message bar on releases actions (e.g abandon, delete, undelete)
      in Releases3 where ActiveDefinitionDetails is being used as a LegacyComponent */
    releasesActionSuccessCallback?: (message: React.ReactNode) => void;
    releasesActionErrorCallback?: (message: React.ReactNode) => void;
    endPerfScenarioCallback?: () => void;
}

export interface IActiveReleasesViewState extends IActiveReleasesState {
    expandedRows?: number[];
    deletingReleaseID?: number;
    isNoResultsImageLoaded?: boolean;
    caughtError: boolean;
}

export class ActiveDefinitionDetails extends Component<IActiveDefinitionDetailsProps, IActiveReleasesViewState> {
    constructor(props) {
        super(props);

        this._activeReleasesActionCreator = ActionCreatorManager.GetActionCreator<ActiveReleasesActionCreator>(ActiveReleasesActionCreator);
        this._activeReleasesStore = StoreManager.GetStore<ActiveReleasesStore>(ActiveReleasesStore);
        this._activeReleasesFilterStore = StoreManager.GetStore<ActiveReleasesFilterStore>(ActiveReleasesFilterStore);
        this._definitionsActionsCreator = ActionCreatorManager.GetActionCreator<DefinitionsActionsCreator>(DefinitionsActionsCreator);
        this._messageHandlerActionsCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
        this._commonDefinitionsStore = StoreManager.GetStore<CommonDefinitionsStore>(CommonDefinitionsStore);

        // Initialize the store so that it can listen to actions
        StoreManager.GetStore<ArtifactTypeListStore>(ArtifactTypeListStore);
        this._selection = new Selection({
            getKey: (release: any) => this._getListKey(release)
        });

        if (props.pageContext) {
            AppContext.instance().PageContext = props.pageContext;
        }
        this.state = {
            expandedRows: [],
            isNoResultsImageLoaded: false,
            caughtError: false
        } as IActiveReleasesViewState;

    }

    public componentWillMount() {
        let state = this._activeReleasesStore.getState();

        Diag.logVerbose(`ADDetails componentWillMount Def ID ${this.props.definitionId} Releases Count: ${state.releases.length} setState()`);
        this.setState(state);
    }

    public componentDidMount(): void {
        this._activeReleasesStore.addChangedListener(this._onActiveReleasesStoreUpdate);
        this._activeReleasesStore.addListener(ActiveReleasesStore.ActiveReleaseColumnResizeEvent, this._onColumnResize);
        this._activeReleasesFilterStore.addListener(ActiveReleasesFilterStore.FilterUpdatedEvent, this._onActiveReleasesFilterStoreUpdate);

        setTimeout(() => {
            this._activeReleasesActionCreator.resetFilterState();
            this._activeReleasesActionCreator.updateDefinitionIdInFilter(this.props.definitionId);

            this._isRDChanged = true;
            this._releasesFetched = false;

            const filterState = this.props.filterState || this._activeReleasesFilterStore.getState();
            if (filterState.currentlyDeployed) {
                this._activeReleasesActionCreator.fetchActiveReleases(this.props.definitionId, this.props.folderPath);
            } else {
                this._activeReleasesActionCreator.fetchReleases(this.props.definitionId, this.props.folderPath);
            }

            this._activeReleasesActionCreator.fetchArtifactSourceBranches(this.props.definitionId);

            if (this.props.isSearchedItem) {
                this._activeReleasesActionCreator.fetchLastDeploymentForSearchedRd(this.props.definitionId);
            }
        }, 10);


        this.setState({
            releases: [], // Flush out releases when a new RD is chosen
            isLoading: true,
            isNoResultsImageLoaded: false
        });

        Diag.logVerbose(`ADDetails componentDidMount Def ID ${this.props.definitionId} fetchReleases`);
    }

    public componentWillReceiveProps(nextProps: IActiveDefinitionDetailsProps): void {
        if (nextProps.definitionId !== this.props.definitionId) {
            this.setState({
                releases: [], // Flush out releases when a new RD is chosen
                isLoading: true,
                expandedRows: [],
                isNoResultsImageLoaded: false,
                caughtError: false
            });

            this._isRDChanged = true;
            this._releasesFetched = false;

            Diag.logVerbose(`ADDetails componentWillReceiveProps Def ID ${nextProps.definitionId} fetchReleases isLoading: true, setState()`);

            DefinitionsHubTelemetry.ActiveRdSelected(nextProps.definitionReferenceType, nextProps.definitionId);

            this._activeReleasesActionCreator.updateDefinitionIdInFilter(nextProps.definitionId);
            const filterState = nextProps.filterState || this._activeReleasesFilterStore.getState();
            if (filterState.currentlyDeployed) {
                this._activeReleasesActionCreator.fetchActiveReleases(nextProps.definitionId, nextProps.folderPath);
            } else {
                this._activeReleasesActionCreator.fetchReleases(nextProps.definitionId, nextProps.folderPath);
            }

            this._activeReleasesActionCreator.fetchArtifactSourceBranches(nextProps.definitionId);
            this._activeReleasesActionCreator.resetFilterState();

            if (nextProps.isSearchedItem) {
                this._activeReleasesActionCreator.fetchLastDeploymentForSearchedRd(nextProps.definitionId);
            }

            this._batchCountOfReleasesFetched = 0;
        }
        else if (nextProps.filterState) {
            this._activeReleasesActionCreator.searchReleases(nextProps.definitionId, nextProps.folderPath, nextProps.filterState);
        }
    }

    public componentDidUpdate(prevProps: IActiveDefinitionDetailsProps, prevState: IActiveReleasesState): void {
        // If the list of releases for the same definition is loaded, check if there is space to load more
        if (prevProps.definitionId === this.props.definitionId &&
            prevState.isLoading
            && !this.state.isLoading) {
            setTimeout(() => this._fetchMoreReleasesIfThereIsSpace(), 750); // Wait for 750 ms to sufficiently allow virtualized rendering to complete  
        }

        if (this.state.isLoading && !!this._loadMoreSpinner) {
            setTimeout(() => this._loadMoreSpinner.scrollIntoView({
                behavior: "smooth",
                block: "end",
                inline: "nearest"
            }), 300); // 300ms because the spinner animation takes time to render
        }

        if (this.state.isLoading === false && prevProps.endPerfScenarioCallback) {
            prevProps.endPerfScenarioCallback();
        }

        this._resetPageRenderedTimestampIfRequired();
    }

    public componentWillUnmount() {
        Diag.logVerbose(`ADDetails componentWillUnmount Def ID ${this.props.definitionId}`);
        this._activeReleasesStore.removeChangedListener(this._onActiveReleasesStoreUpdate);
        this._activeReleasesFilterStore.removeListener(ActiveReleasesFilterStore.FilterUpdatedEvent, this._onActiveReleasesFilterStoreUpdate);
    }

    public componentDidCatch(error: Error) {
        setTimeout(() => {
            this._messageHandlerActionsCreator.addMessage(error.message, MessageBarParentKeyConstants.DefinitionsHubErrorMessageBarKey, MessageBarType.error);
        }, 0);

        publishErrorToTelemetry({
            message: error.message,
            name: "ActiveDefinitionsDetailsCatch",
            stack: error.stack
        });

        this.setState({ caughtError: true });
    }

    public render(): JSX.Element {
        Diag.logVerbose(`ADDetails render Def ID ${this.props.definitionId} releases count: ${this.state.releases.length}`);

        if (this.state.caughtError) {
            return null;
        }

        const envColumnWidth: number = this._activeReleasesStore.getEnvColumnWidth(this.props.definitionId);
        const releaseColumnWidth: number = this._activeReleasesStore.getReleaseColumnWidth(this.props.definitionId);
        const maxEnvCanvasWidth: number = this._activeReleasesStore.getEnvCanvasWidth(this.props.definitionId);

        // First compute Release name column width, and then environment column width
        this._setReleaseNameColumnInitialWidth();
        this._setMaxAvailableEnvColWidth();
        this._setEnvironmentTileSize();

        if (this.state.clearReleases) {
            return null;
        }

        if (this.state.releases && this.state.releases.length > 0) {

            let approvalsMessage = this._getApprovalsBarMessage();
            const releaseApprovalBarStyle = {
                "width": "100%"
            };
            return (
                <div className={css("releases-with-approvals-bar", this.props.cssClass)} style={releaseApprovalBarStyle}>
                    {
                        approvalsMessage &&
                        <MessageBar
                            className={"approvals-bar"}
                            isMultiline={false}
                            messageBarType={MessageBarType.warning}>

                            {approvalsMessage}

                        </MessageBar>
                    }

                    < div
                        className={"active-releases-list-holder"}
                        ref={this._resolveRef("_releasesListHolder")}
                        onScroll={this._onActiveReleasesListScroll} >

                        <ActiveReleasesDetailsList
                            releases={this.state.releases}
                            selection={this._selection}
                            definitionId={this.props.definitionId}
                            envColumnWidth={envColumnWidth}
                            releaseColumnWidth={releaseColumnWidth}
                            envTileSize={this._envTileSize}
                            maxEnvCanvasWidth={maxEnvCanvasWidth}
                            initialEnvColumnWidth={this._initialEnvColumnWidth}
                            initialNameColumnWidth={this._initialNameColumnWidth}
                            initialArtifactNameWidth={this._initialArtifactNameMaxWidth}
                            initialBranchNameWidth={this._initialBranchNameMaxWidth}
                            definitionEnvironmentCurrentReleaseMap={this.props.definitionEnvironmentCurrentReleaseMap}
                            filterState={this.props.filterState || this._activeReleasesFilterStore.getState()}
                            onDesiredReleaseFound={this._createReleaseFoundEvent}
                            releasesActionSuccessCallback={this.props.releasesActionSuccessCallback}
                            releasesActionErrorCallback={this.props.releasesActionErrorCallback} />
                        {
                            this.state.isLoading && (
                                <div className={"active-releases-load-more"} ref={(spinner) => { this._loadMoreSpinner = spinner; }}>
                                    <LoadingComponent
                                        className="active-releases-spinner loading-more"
                                        size={SpinnerSize.large}
                                        label={Resources.LoadingReleases} />
                                </div>)
                        }

                    </div >
                </div >
            );
        }
        else if (this.state.isLoading) {
            return (
                <LoadingComponent
                    className="active-releases-spinner"
                    size={SpinnerSize.large}
                    label={Resources.LoadingReleases} />
            );
        }
        else {
            return this._getNoReleasesView();
        }
    }

    private _getApprovalsBarMessage(): JSX.Element {
        let environmentsWithPendingApprovals: ReleaseEnvironment[] = [];

        this.state.releases.forEach((rel: Release) => {
            rel.environments.forEach((relEnv: ReleaseEnvironment) => {
                if (this._hasPendingApprovals(relEnv) && environmentsWithPendingApprovals.map(env => env.definitionEnvironmentId).indexOf(relEnv.definitionEnvironmentId) === -1) {
                    environmentsWithPendingApprovals.push(relEnv);
                }
            });
        });

        if (environmentsWithPendingApprovals.length === 0) {
            return null;
        }

        return this._getApprovalsBarMessageFromEnvironments(environmentsWithPendingApprovals);
    }

    private _getApprovalsBarMessageFromEnvironments(environments: ReleaseEnvironment[]): JSX.Element {

        const onApprovalNameClick = (environmentId: number) => {
            this._selection.setIndexSelected(0, true, true);
            const environmentNode = this._releasesListHolder.getElementsByClassName("active-rel-env-node env-" + environmentId)[0] as HTMLDivElement;
            environmentNode.scrollIntoView({
                behavior: "smooth", inline: "start", block: "end"
            });

            setTimeout(() => {
                // We have to use apply hover on the environment node, instead of focus
                // TooltipHost is not working properly with focus at this moment. If we focus, and click on the approve button, nothing happens
                const hoverEvent = document.createEvent("MouseEvent");
                hoverEvent.initEvent("mouseover", true, false);
                environmentNode.dispatchEvent(hoverEvent);
            }, 600);
        };

        const onApprovalNameKeydown = (event: React.KeyboardEvent<HTMLElement>, environmentId: number) => {
            if (event.key === "Enter" || event.key === "" || event.key === "Spacebar") {
                onApprovalNameClick(environmentId);
                event.preventDefault();
                event.stopPropagation();
            }
        };

        switch (environments.length) {
            case 1:
                return formatJsx({},
                    Resources.PendingApprovalOneEnvironment,
                    (<a role={"button"} tabIndex={0} onClick={() => { onApprovalNameClick(environments[0].id); }} onKeyDown={(e) => { onApprovalNameKeydown(e, environments[0].id); }}>{environments[0].name}</a>)
                );
            case 2:
                return formatJsx({},
                    Resources.PendingApprovalTwoEnvironments,
                    (<a role={"button"} tabIndex={0} onClick={() => { onApprovalNameClick(environments[0].id); }} onKeyDown={(e) => { onApprovalNameKeydown(e, environments[0].id); }}>{environments[0].name}</a>),
                    (<a role={"button"} tabIndex={0} onClick={() => { onApprovalNameClick(environments[1].id); }} onKeyDown={(e) => { onApprovalNameKeydown(e, environments[1].id); }}>{environments[1].name}</a>)
                );
            default:
                return formatJsx({},
                    Resources.PendingApprovalMultipleEnvironments,
                    (<a role={"button"} tabIndex={0} onClick={() => { onApprovalNameClick(environments[0].id); }} onKeyDown={(e) => { onApprovalNameKeydown(e, environments[0].id); }}>{environments[0].name}</a>),
                    (<a role={"button"} tabIndex={0} onClick={() => { onApprovalNameClick(environments[1].id); }} onKeyDown={(e) => { onApprovalNameKeydown(e, environments[1].id); }}>{environments[1].name}</a>),
                    (environments.length - 2).toString()
                );
        }
    }

    private _hasPendingApprovals(relEnv: ReleaseEnvironment): boolean {
        return relEnv.preDeployApprovals.some((approval: ReleaseApproval) => approval.status === ApprovalStatus.Pending)
            || relEnv.postDeployApprovals.some((approval: ReleaseApproval) => approval.status === ApprovalStatus.Pending);
    }

    @autobind
    private _onActiveReleasesListScroll(event: React.UIEvent<HTMLDivElement>): void {
        if (!!this._releasesListHolder && this.state.continuationToken > 0) {
            let scrollPositionFromBottom = this._releasesListHolder.clientHeight + this._releasesListHolder.scrollTop - this._releasesListHolder.scrollHeight;
            if (scrollPositionFromBottom >= -20 && scrollPositionFromBottom <= 20) {
                this._fetchMoreReleases();
            }
        }
    }

    private _getNoReleasesView(): JSX.Element {
        const secondaryTextElement: JSX.Element = (
            <div className="active-rd-zero-releases-text">
                <FormatComponent format={Resources.NoReleasesFoundSecondaryText}>
                    <SafeLink href={Links.SetupTriggersLink} target={"_blank"} className={"setup-triggers-link"}>
                        {Resources.SetupTriggersLinkText}
                    </SafeLink>
                </FormatComponent>
            </div>
        );

        const resourcePath = ReleasesHubServiceDataHelper.getResourcePath();
        const areBasicLicenceRmFeaturesEnabled: boolean = Manager.FeaturesManager.areBasicLicenseReleaseManagementFeaturesEnabled();

        return (
            <div className={"active-rd-no-releases-view"}>
                <ZeroData
                    actionText={(areBasicLicenceRmFeaturesEnabled && this._canCreateRelease()) ? Resources.CreateReleaseMenuOptionText : null}
                    actionType={ZeroDataActionType.ctaButton}
                    primaryText={Resources.NoReleasesFoundPrimaryText}
                    secondaryText={secondaryTextElement}
                    imageAltText={Resources.NoReleasesFoundPrimaryText}
                    imagePath={ResourcePathUtils.getResourcePath("zerodata-release-management-new.png", resourcePath)}
                    onActionClick={this._createRelease}
                />
            </div>);
    }

    private _isFilterStateDefault(): boolean {
        if (!this.props.filterState) {
            return false;
        }

        const filterState = this.props.filterState;
        return !filterState.searchText
            && (filterState.status === 0 || filterState.status === 7)
            && !filterState.branch
            && !filterState.tags
            && !filterState.createdBy;
    }

    private _onNoResultsImageLoad = () => {
        this.setState({ isNoResultsImageLoaded: true });
    }

    private _getListKey(release: Release): string {
        return Utils_String.format("active-releases-releaseid-{0}", release.id);
    }

    @autobind
    private _onActiveReleasesFilterStoreUpdate(): void {
        let filterState: IActiveReleasesFilterState = this._activeReleasesFilterStore.getState();
        Diag.logVerbose(`ADDetails _onActiveReleasesFilterStoreUpdate Def ID ${this.props.definitionId} SearchText: ${filterState.searchText} ReleaseStatus: ${filterState.status}`);

        this._currentlyDeployedToggleChanged = this._isCurrentlyDeployedToggleOn !== filterState.currentlyDeployed;
        this._isCurrentlyDeployedToggleOn = filterState.currentlyDeployed;
        this._releasesFetched = false;

        this._activeReleasesActionCreator.searchReleases(this.props.definitionId, this.props.folderPath, filterState);
        this.setState(this._getLoadingState(false));
    }

    @autobind
    private _onActiveReleasesStoreUpdate(): void {
        this._releasesFetched = true;
        let storeState: IActiveReleasesState = this._activeReleasesStore.getState();
        Diag.logVerbose(`ADDetails _onActiveReleasesStoreUpdate Def ID ${this.props.definitionId} Releases Count: ${storeState.releases.length} setState()`);
        this.setState(storeState);
    }

    @autobind
    private _onColumnResize(): void {
        const currentState = this.state;
        this.setState(currentState);
    }

    @autobind
    private _onReleaseAdditionComplete(): void {
        if (this._activeReleasesStore.getAdditionInProgressReleaseId()) {
            this._activeReleasesActionCreator.completeReleaseAddition();
        }
    }

    @autobind
    private _createReleaseFoundEvent(): void {
        if (this._isReleaseFoundEventLogged
            || !this._activeReleasesFilterStore.isFlightSettingForCurrentlyDeployedFilterActive()) {
            return;
        }

        let timeTakenToFindRelease: number = (new Date()).getTime() - this._releasesRenderedTimestamp;
        let showingAllReleases: boolean = !(this._activeReleasesFilterStore.getState().currentlyDeployed);
        const flightAssignments: string = ReleasesHubServiceDataHelper.getFlightAssignments().join(",");

        DefinitionsHubTelemetry.DesiredReleaseFound(timeTakenToFindRelease, showingAllReleases, flightAssignments);
        this._isReleaseFoundEventLogged = true;
    }

    private _getLoadingState(keepReleases: boolean): IActiveReleasesViewState {
        return {
            definitionId: this.props.definitionId,
            releases: (keepReleases && this.state.releases) || [],
            isLoading: true,
            continuationToken: (keepReleases && this.state.continuationToken) || 0,
            isNoResultsImageLoaded: false
        } as IActiveReleasesViewState;
    }

    private _createRelease = (): void => {
        DefinitionsHubTelemetry.CreateReleaseClicked(Source.ReleasesListZeroDayButton);
        if (FeatureFlagUtils.isNewCreateReleaseWorkflowEnabled()) {
            DefinitionsUtils.createRelease(this.props.definitionName, this.props.definitionId, this._onCreateRelease);
        } else {
            this._showCreateReleaseDialog(this.props.definitionName, this.props.definitionId);
        }
    }

    private _showCreateReleaseDialog(definitionName: string, definitionId: number): void {
        VSS.using(["PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleasePanelHelper"],
            (CreateReleasePanelHelper: typeof CreateReleasePanelHelper_TypeOnly) => {
                let releaseDialogInstanceId = DtcUtils.getUniqueInstanceId();
                let createReleasePanelHelper = new CreateReleasePanelHelper.CreateReleasePanelHelper<PipelineTypes.PipelineDefinition, PipelineTypes.PipelineDefinitionEnvironment>({ definitionId: definitionId });
                createReleasePanelHelper.initializeCreateReleaseStore(releaseDialogInstanceId);
                let releaseDialogStore = createReleasePanelHelper.getCreateReleaseStore();
                let releaseDialogActionCreator = createReleasePanelHelper.getCreateReleaseActionCreator();

                const dialogContainer = document.createElement("div");
                VSS.using(["PipelineWorkflow/Scripts/SharedComponents/CreateRelease/ReleaseDialog"],
                    (CreateReleaseDialog: typeof CreateReleaseDialog_TypeOnly) => {
                        ReactDOM.render(
                            <CreateReleaseDialog.CreateReleaseDialog
                                instanceId={releaseDialogInstanceId}
                                releaseDialogStore={releaseDialogStore}
                                releaseDialogActionCreator={releaseDialogActionCreator}
                                showDialog={true}
                                definitionId={definitionId}
                                definitionName={definitionName || Utils_String.empty}
                                onQueueRelease={(release: PipelineTypes.PipelineRelease, projectName?: string) => {
                                    this._onCreateRelease(release, projectName);
                                    ReactDOM.unmountComponentAtNode(dialogContainer);
                                }}
                                onCloseDialog={() => { ReactDOM.unmountComponentAtNode(dialogContainer); }} />,
                            dialogContainer);
                    });
            });
    }

    private _onCreateRelease = (release: PipelineTypes.PipelineRelease, projectName?: string) => {
        this._definitionsActionsCreator.updateDefinitionLastReleaseReference(release.releaseDefinition.id);
        this._messageHandlerActionsCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubSuccessMessageBarKey, this._getReleaseCreatedMessageBarContent(release), MessageBarType.success);
    }

    private _getReleaseCreatedMessageBarContent = (pipelineRelease: PipelineTypes.PipelineRelease): JSX.Element => {
        return (<span>
            {Resources.ReleaseCreatedTextPrefix}
            <SafeLink
                href={DefinitionsUtils.getReleaseUrl(pipelineRelease)}
                onClick={(e) => this._onReleaseNameClick(e, pipelineRelease)}
                allowRelative={true}
                target="_blank">{pipelineRelease.name}
            </SafeLink>
            {Resources.ReleaseCreatedTextSuffix}
        </span>);
    }

    private _onReleaseNameClick(event: React.SyntheticEvent<HTMLElement>, release: PipelineTypes.PipelineRelease): void {
        DefinitionsUtils.onReleaseNameClick(event, release);
    }

    private _fetchMoreReleasesIfThereIsSpace(): void {
        if (this._releasesListHolder) {
            // If there is no scroll bar, ie clientHeight = scrollHeight
            if (this._releasesListHolder.clientHeight === this._releasesListHolder.scrollHeight) {
                this._fetchMoreReleases();
            }
        }
    }

    private _fetchMoreReleases(): void {
        if (!this.state.isLoading && this.state.continuationToken > 0) {
            let filterState: IActiveReleasesFilterState = this._activeReleasesFilterStore.getState();

            DefinitionsHubTelemetry.MoreReleasesFetchedOnScroll(++this._batchCountOfReleasesFetched, filterState.searchText, filterState.status, filterState.isDeleted, filterState.branch);
            this._activeReleasesActionCreator.fetchMoreReleases(this.props.definitionId, this.props.folderPath, filterState, this.state.continuationToken);
            this.setState(this._getLoadingState(true));
        }
    }

    private _canCreateRelease(): boolean {
        const definitionPermissions: IPermissionCollection = this._commonDefinitionsStore.getPermissions();
        if (!this.props.definitionId || !definitionPermissions) {
            return false;
        }

        const token: string = SecurityUtils.getCompleteSecurityToken(SecurityUtils.createDefinitionSecurityToken(this.props.folderPath, this.props.definitionId));

        return DefinitionsUtils.readPermissionFromCollection(definitionPermissions, token, ReleaseManagementSecurityPermissions.QueueReleases);
    }

    private _setReleaseNameColumnInitialWidth(): void {
        this._initialNameColumnWidth = 600;
        this._initialArtifactNameMaxWidth = 300;
        this._initialBranchNameMaxWidth = 300;

        if (this.state.releases && this.state.releases.length > 0) {
            let releasesToVerify = Math.min(this.state.releases.length, 25);
            let maxArtifactCharacters: number = 0;
            let maxBranchCharacters: number = 0;
            let maxReleaseNameCharacters: number = 0;
            for (let index = 0; index < releasesToVerify; index++) {
                let release = this.state.releases[index];

                let primaryArtifact: Artifact = RMUtils.ArtifactsHelper.getPrimaryArtifact(release.artifacts);
                let artifactName: string = RMUtils.ArtifactsHelper.getArtifactBuildInfo(primaryArtifact);
                let branchName: string = RMUtils.ArtifactsHelper.getPrimaryArtifactBranchName(release.artifacts);
                let branchDisplayName: string = RMUtils.BranchHelper.toDisplayValue(branchName);
                let releaseNameLength = release.name.length;

                if (maxArtifactCharacters < artifactName.length) {
                    maxArtifactCharacters = artifactName.length;
                }
                if (maxBranchCharacters < branchDisplayName.length) {
                    maxBranchCharacters = branchDisplayName.length;
                }
                if (maxReleaseNameCharacters < releaseNameLength) {
                    maxReleaseNameCharacters = releaseNameLength;
                }
            }
            // Set the initial release column width according to artifact build and branch length(if they exist)
            if (maxArtifactCharacters > 0 || maxBranchCharacters > 0) {
                // *6 for small font size
                this._initialNameColumnWidth = ((maxArtifactCharacters + maxBranchCharacters) * 6) + 50 + 50 + 36; //+50 for margins and icons, +50 for avatar image, +36 for actions button
                this._initialArtifactNameMaxWidth = (maxArtifactCharacters * 6) + 15;
                this._initialBranchNameMaxWidth = (maxBranchCharacters * 6) + 15;
            }
            // else use release name to set initial width for release column
            else {
                //*8 for large font size
                this._initialNameColumnWidth = (maxReleaseNameCharacters * 8) + 20 + 50 + 36; // + 20 for margins and chevron, +50 for avatar image, +36 for ellipsis button
                this._initialArtifactNameMaxWidth = ((maxReleaseNameCharacters * 8) + 15) / 2; // +15 for chevron
                this._initialBranchNameMaxWidth = ((maxReleaseNameCharacters * 8) + 15) / 2; // +15 for chevron
            }
        }

        // Limit the release column width by a max of 600, and artifact and branch name by max of 300 each
        this._initialNameColumnWidth = Math.min(this._initialNameColumnWidth, 600);
        this._initialArtifactNameMaxWidth = Math.min(this._initialArtifactNameMaxWidth, 300);
        this._initialBranchNameMaxWidth = Math.min(this._initialBranchNameMaxWidth, 300);
    }

    private _resetPageRenderedTimestampIfRequired(): void {
        if (this._releasesFetched && (this._isRDChanged || this._currentlyDeployedToggleChanged)) {
            this._releasesRenderedTimestamp = (new Date()).getTime();
            this._releasesFetched = false;
            this._isRDChanged = false;
            this._currentlyDeployedToggleChanged = false;
            this._isReleaseFoundEventLogged = false;
        }
    }

    private _setEnvironmentTileSize(): void {
        let envColumnWidth: number = this._activeReleasesStore.getEnvColumnWidth(this.props.definitionId);
        const availableWidth: number = envColumnWidth > 0 ? envColumnWidth : this._maxAvailableEnvColumnWidth;
        const envCountArray: number[] = this.state.releases.map((release) => release.environments.length);
        const maxEnvCount: number = Math.max(...envCountArray);
        const envCountPossibleWithLargeSize = Math.floor(availableWidth / (ReleasesViewCanvasConstants.EnvironmentNodeWidthLarge + 10)); // +10 to account for margin
        if (envCountPossibleWithLargeSize >= maxEnvCount) {
            this._envTileSize = ReleaseEnvironmentTileSize.Large;
            this._initialEnvColumnWidth = (ReleasesViewCanvasConstants.EnvironmentNodeWidthLarge + 10) * maxEnvCount;
        }
        else {
            this._envTileSize = ReleaseEnvironmentTileSize.Small;
            const envCountPossibleWithSmallSize = Math.floor(availableWidth / (ReleasesViewCanvasConstants.EnvironmentNodeWidthSmall + 10)); // +10 to account for margin
            if (envCountPossibleWithSmallSize >= maxEnvCount) {
                this._initialEnvColumnWidth = (ReleasesViewCanvasConstants.EnvironmentNodeWidthSmall + 10) * maxEnvCount;
            }
            else {
                const showMoreButtonWidth = 20;
                this._initialEnvColumnWidth = availableWidth - showMoreButtonWidth;
            }
        }
    }

    private _setMaxAvailableEnvColWidth(): void {
        const leftPane = document.getElementsByClassName("active-definitions-left-pane")[0];
        const leftPaneWidth = leftPane ? leftPane.clientWidth : this._leftPanelDefaultWidth;
        const detailsListContainerWidth = window.innerWidth - leftPaneWidth;
        const detailsListPadding: number = 40; // If we change padding on left and right we should change this value also
        const createdColumnHeaderWidth = 150 + 16; // createdColWidth + header margin
        if (this._initialNameColumnWidth > 0) {
            const releaseNameHeaderWidth = this._initialNameColumnWidth + 16;
            this._maxAvailableEnvColumnWidth = detailsListContainerWidth - releaseNameHeaderWidth - createdColumnHeaderWidth - detailsListPadding;
        }
    }

    private _instanceIdFormat = "Active-Release-{0}";
    private _activeReleasesActionCreator: ActiveReleasesActionCreator;
    private _activeReleasesStore: ActiveReleasesStore;
    private _activeReleasesFilterStore: ActiveReleasesFilterStore;
    private _messageHandlerActionsCreator: MessageHandlerActionsCreator;
    private _definitionsActionsCreator: DefinitionsActionsCreator;
    private _commonDefinitionsStore: CommonDefinitionsStore;
    private _selection: Selection;
    private _releasesListHolder: HTMLDivElement;
    private _loadMoreSpinner: HTMLDivElement;
    private _batchCountOfReleasesFetched: number = 0;
    private _initialEnvColumnWidth: number;
    private _initialNameColumnWidth: number;
    private _initialArtifactNameMaxWidth: number;
    private _initialBranchNameMaxWidth: number;
    private _maxAvailableEnvColumnWidth: number;
    private _leftPanelDefaultWidth: number = 360;

    // variables to handle "Release_Found" event for telemetry
    private _isRDChanged: boolean = false;
    private _isCurrentlyDeployedToggleOn: boolean = false;
    private _currentlyDeployedToggleChanged: boolean = false;
    private _releasesFetched: boolean = false;
    private _releasesRenderedTimestamp: number;
    private _isReleaseFoundEventLogged: boolean = false;
    private _envTileSize: ReleaseEnvironmentTileSize;

    private static _releaseDetailsKey: string = "details";
    private static _definitionReleasesSignalRFeatureFlag: string = "WebAccess.ReleaseManagement.DefinitionReleasesSignalR";
}

registerLWPComponent("activeDefinitionDetails", ActiveDefinitionDetails);