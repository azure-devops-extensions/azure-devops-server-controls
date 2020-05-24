import * as React from "react";

import { TabControlsRegistrationConstants } from "Agile/Scripts/Common/Agile";
import { HubError } from "Agile/Scripts/Common/Components/AgileHubError";
import { component } from "Agile/Scripts/Common/Components/ComponentRegistration";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { HubMessages } from "Agile/Scripts/Common/Messages/HubMessages";
import { HubMessagesActions } from "Agile/Scripts/Common/Messages/HubMessagesActions";
import { HubMessagesActionsCreator, IHubMessagesActionsCreator } from "Agile/Scripts/Common/Messages/HubMessagesActionsCreator";
import { HubMessagesStore, IHubMessagesStore } from "Agile/Scripts/Common/Messages/HubMessagesStore";
import * as SprintsHubResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub";
import * as CapacityPivotResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.CapacityPivot";
import * as Agile_Utils_CSC_NO_REQUIRE from "Agile/Scripts/Settings/CommonSettingsConfiguration";
import * as AgileResources from "Agile/Scripts/Resources/TFS.Resources.Agile";
import { CapacityActions } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityActions";
import { CapacityActionsCreator } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityActionsCreator";
import { CapacityApi } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityApi";
import * as Contracts from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { CapacityAddUserControl } from "Agile/Scripts/SprintsHub/Capacity/Components/CapacityAddUserControl";
import { CapacityGrid } from "Agile/Scripts/SprintsHub/Capacity/Components/CapacityGrid";
import { getCapacityCommands } from "Agile/Scripts/SprintsHub/Capacity/Components/SprintViewCapacityCommands";
import { CapacityShortcut, SprintsHubCapacityShortcutActions } from "Agile/Scripts/SprintsHub/Capacity/SprintsHubCapacityShortcuts";
import { CapacityStore } from "Agile/Scripts/SprintsHub/Capacity/Store/CapacityStore";
import { SprintViewRightPanel } from "Agile/Scripts/SprintsHub/Common/SprintViewRightPanel";
import { SprintViewCommonViewActions } from "Agile/Scripts/SprintsHub/SprintView/Components/SprintViewCommonViewActions";
import { SprintViewPivotBase } from "Agile/Scripts/SprintsHub/SprintView/Components/SprintViewPivotBase";
import { ISprintViewPivotContext, ISprintViewRightPanelData, ViewActionKey, RightPanelKey } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { Callout } from "OfficeFabric/Callout";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { Overlay } from "OfficeFabric/Overlay";
import { IMessage } from "Presentation/Scripts/TFS/Components/Messages";
import * as Configurations_NO_REQUIRE from "Presentation/Scripts/TFS/TFS.Configurations";
import { Actions } from "Presentation/Scripts/TFS/TFS.Configurations.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ITeamPermissions, TeamPermissionService } from "TfsCommon/Scripts/Team/Services";
import * as Diag from "VSS/Diag";
import { publishErrorToTelemetry } from "VSS/Error";
import * as Events_Action from "VSS/Events/Action";
import * as EventsDocuments from "VSS/Events/Document";
import { getService } from "VSS/Service";
import { delay } from "VSS/Utils/Core";
import { using } from "VSS/VSS";
import { IPivotBarAction, IPivotBarViewAction } from "VSSUI/PivotBar";
import { SplitterElementPosition } from "VSSUI/Splitter";
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT } from "VSSUI/Utilities/ViewOptions";
import { LearningBubble } from "Presentation/Scripts/TFS/Components/LearningBubble/LearningBubble";
import { LearningBubbleSettingsKeys, HubViewOptionsTargetSelector } from "Presentation/Scripts/TFS/Components/LearningBubble/Constants";
import { SplitView } from "Agile/Scripts/Common/Components/SplitView/SplitView";

const CAPACITY_PIVOT_DOCUMENT_MONIKER = "CapacityPivot";

@component("sprint-capacity-pivot")
export class SprintViewCapacityPivot extends SprintViewPivotBase<Contracts.ICapacityState> {
    private _shortcuts: CapacityShortcut;

    private _messagesActionsCreator: IHubMessagesActionsCreator;
    private _messagesStore: IHubMessagesStore;
    private _commonSettingsRegistered: boolean;
    private _permissions: ITeamPermissions;
    private _capacityActions: CapacityActions;
    private _viewOptionsLearningBubble = React.createRef<LearningBubble>();

    constructor(props: ISprintViewPivotContext, context: any) {
        super(props, context);
        const splitterInitialState = this.getSplitterState();

        this.state = {
            capacityDataStatus: Contracts.LoadingStatus.None,
            isVeryFirstLoad: true,
            isDirty: false,
            isValid: true,
            capacity: null,
            capacityOptions: null,
            showAddUserCallout: false,
            teamIteration: null,
            showNoUserAddedMessage: false,
            fieldAggregator: null,
            teamCapacityModel: null,
            loadingWorkDetailsData: false,
            exceptionsInfo: null,
            rightPanelId: splitterInitialState.contributionId,
            workDetailsExceptionInfo: null
        };
    }

    public componentWillMount() {
        super.componentWillMount();

        // Initialize messages
        const messagesActions = new HubMessagesActions();
        this._messagesActionsCreator = new HubMessagesActionsCreator(messagesActions);
        this._messagesStore = new HubMessagesStore(messagesActions);

        this._capacityActions = new CapacityActions();
        const api = new CapacityApi();
        this._actionsCreator = new CapacityActionsCreator(
            this._capacityActions,
            api,
            this._messagesActionsCreator,
            this.props);
        this._store = new CapacityStore(this._capacityActions);

        this._store.addChangedListener(this._storeChanged);
        this.attachCommonConfigurationRegistration();
        this._actionsCreator.loadInitialData(this.props.selectedIteration, false/* load work details */);

        this._shortcuts = this._setupShortcuts();
        this._setupRunningDocumentTableEntry();

        this.props.viewOptions.subscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();
        this.props.viewOptions.unsubscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
        this._store.removeChangedListener(this._storeChanged);
        this.dettachCommonConfigurationRegistration();
        this._actionsCreator = null;
        this._store = null;
        this._messagesActionsCreator = null;
        this._messagesStore = null;

        this._shortcuts.unregisterAllShortcuts();
        this._removeRunningDocumentTableEntry();
    }

    public componentWillReceiveProps(nextProps: ISprintViewPivotContext, nextState: Contracts.ICapacityState) {
        if (this.props.selectedIteration !== nextProps.selectedIteration) {
            delay(this, 0, () => {
                const isWorkDetailsVisible = this._isWorkDetailsVisible(this.state.rightPanelId);
                // When the iteration is changed in the header, this component is being re-rendered as part of an action higher up in the stack
                this._actionsCreator.refreshData(nextProps.selectedIteration, isWorkDetailsVisible /* load work details */);
            });
        } else if (nextProps.selectedIteration.startDateUTC !== this.props.selectedIteration.startDateUTC ||
            nextProps.selectedIteration.finishDateUTC !== this.props.selectedIteration.finishDateUTC) {

            // User may have changed sprint dates via sprint dates control
            // Will move this after removal of old hubs - US 1141330
            this._actionsCreator.updateIterationDates(nextProps.selectedIteration);
        }
    }

    public componentDidMount() {
        super.componentDidMount();

        const {
            contributionId
        } = this.getSplitterState();

        this.props.viewOptions.setViewOption(ViewActionKey.RIGHT_PANEL, contributionId || RightPanelKey.OFF);

        this._actionsCreator.setRightPanelId(contributionId);

        if (this._isWorkDetailsVisible(contributionId)) {
            this._actionsCreator.initializeWorkDetailsData();
        }
    }

    public componentDidUpdate(props: ISprintViewPivotContext, state: Contracts.ICapacityState): void {
        super.componentDidUpdate(props, state);

        if (this.state.showNoUserAddedMessage) {
            const message: IMessage = { id: null, messageType: MessageBarType.info, message: CapacityPivotResources.Capacity_NoMoreTeamMembers, closeable: true };
            this._messagesActionsCreator.addMessage(message);
        }
    }

    public isDataReady(): boolean {
        return this.state.capacityDataStatus !== Contracts.LoadingStatus.Loading && !!this.state.capacityOptions && !!this.state.capacity;
    }

    public getCommands(props: ISprintViewPivotContext, state: Contracts.ICapacityState): IPivotBarAction[] {
        const actionContext: Contracts.ICapacityActionContext = {
            pivotContext: props,
            onAddNewItem: this._onNewItemClicked,
            onSaveCapacity: this._onSaveCapacityClicked,
            onUndoChanges: this._onUndoChanges,
            onAddMissingTeamMembers: this._onAddMissingTeamMembers,
            onCopyCapacity: this._onCopyCapacity
        };

        return getCapacityCommands(actionContext, state);
    }

    public getViewActions(props: ISprintViewPivotContext, state: Contracts.ICapacityState): IPivotBarViewAction[] {
        const allActionsDisabled = state.capacityDataStatus === Contracts.LoadingStatus.Loading || (state.asyncOperationStatus && state.asyncOperationStatus.inprogress);

        //  No pivot-specific actions for Capacity pivot, so returning only common view actions.
        return SprintViewCommonViewActions.getViewActions(props, allActionsDisabled, false /* include planning */, state.rightPanelId);
    }

    public render(): JSX.Element {
        const {
            exceptionsInfo,
            rightPanelId
        } = this.state;

        if (exceptionsInfo && exceptionsInfo.length) {
            return (
                <HubError exceptionsInfo={exceptionsInfo} />
            );
        }

        return (
            <SplitView
                className="sprint-view-splitter"
                onRenderNearElement={this._renderMainContent}
                onRenderFarElement={rightPanelId && rightPanelId !== RightPanelKey.OFF && this._renderRightPanel}
                registrySettingsPrefix="Agile/SprintsHub/Pivots/CapacitySplitView"
                fixedElement={SplitterElementPosition.Far}
            />
        );
    }

    private _renderRightPanel = (): JSX.Element => {
        const {
            capacityOptions,
            loadingWorkDetailsData,
            teamCapacityModel,
            fieldAggregator,
            rightPanelId,
            workDetailsExceptionInfo
        } = this.state;

        const panelData: ISprintViewRightPanelData = {
            loading: loadingWorkDetailsData,
            exceptionsInfo: workDetailsExceptionInfo,
            selectedContributionId: rightPanelId,
            eventHelper: null,
            getSelectedWorkItems: null,
            workDetailsData: {
                capacityOptions,
                teamCapacityModel,
                fieldAggregator,
                capacityActions: this._capacityActions
            }
        };

        return (
            <SprintViewRightPanel
                selectedIteration={this.props.selectedIteration}
                onDismiss={this._dismissRightPanel}
                panelData={panelData}
                team={this.props.team}
            />
        );
    }

    private _renderMainContent = (): JSX.Element => {
        const {
            capacity,
            capacityDataStatus,
            capacityOptions,
            isVeryFirstLoad,
            focusDetails,
            teamIteration
        } = this.state;

        if (capacityDataStatus === Contracts.LoadingStatus.Loading) {
            if (isVeryFirstLoad) {
                // Don't show a loading indicator on the pivot. The hub will have a larger loading indicator and we want to avoid having two.
                return null;
            }

            return <LoadingComponent />;
        }

        return (
            <div className="capacity-pivot-content" role="main" aria-label={SprintsHubResources.CapacityPivot}>
                <LearningBubble
                    ref={this._viewOptionsLearningBubble}
                    settingsKey={LearningBubbleSettingsKeys.RightPanelViewOptions}
                    target={HubViewOptionsTargetSelector}
                    text={AgileResources.PaneClosedLearningBubbleInfoText}
                    buttonLabel={AgileResources.PaneClosedLearningBubbleButtonText}
                />
                {this._renderAddUserCallout()}
                <HubMessages
                    actionsCreator={this._messagesActionsCreator}
                    store={this._messagesStore}
                />
                <CapacityGrid
                    capacity={capacity}
                    actionsCreator={this._actionsCreator}
                    capacityOptions={capacityOptions}
                    iteration={teamIteration}
                    focusDetails={focusDetails}
                />
                {this._renderOverlay()}
            </div>
        );
    }

    protected shouldUpdateCommandsOnUpdate(nextProps: ISprintViewPivotContext, nextState: Contracts.ICapacityState): boolean {
        const emptyAsyncStatus: Contracts.IAsyncOperationStatus = { inprogress: false };
        const previousAsyncStatus = this.state.asyncOperationStatus || emptyAsyncStatus;
        const nextAsyncStatus = nextState.asyncOperationStatus || emptyAsyncStatus;

        const emptyCapacityOptions = { isEditable: true };
        const previousCapacityOptions = this.state.capacityOptions || emptyCapacityOptions;
        const nextCapacityOptions = nextState.capacityOptions || emptyCapacityOptions;

        return this.state.capacityDataStatus !== nextState.capacityDataStatus ||
            this.state.capacityOptions !== nextState.capacityOptions ||
            previousCapacityOptions.isEditable !== nextCapacityOptions.isEditable ||
            this.state.isDirty !== nextState.isDirty ||
            this.state.isValid !== nextState.isValid ||
            this.state.asyncOperationStatus !== nextState.asyncOperationStatus ||
            previousAsyncStatus !== nextAsyncStatus ||
            previousAsyncStatus.inprogress !== nextAsyncStatus.inprogress ||
            this.props.previousIteration !== nextProps.previousIteration;
    }

    protected shouldUpdateViewActionsOnUpdate(nextProps: ISprintViewPivotContext, nextState: Contracts.ICapacityState): boolean {
        return this.state.capacityDataStatus !== nextState.capacityDataStatus ||
            this.props.selectedIteration !== nextProps.selectedIteration ||
            this.state.rightPanelId !== nextState.rightPanelId;
    }

    protected _onViewOptionsChanged = (value: IViewOptionsValues, action?: string): void => {
        if (value.hasOwnProperty(ViewActionKey.RIGHT_PANEL)) { // If panel option was toggled
            if (!this.state.fieldAggregator && this._isWorkDetailsVisible(value[ViewActionKey.RIGHT_PANEL])) {
                // If this was turned on for the first time, we need to load the work details data from the server
                this._actionsCreator.initializeWorkDetailsData();
            }

            this.updateSplitterState(value[ViewActionKey.RIGHT_PANEL]);
            this._actionsCreator.setRightPanelId(value[ViewActionKey.RIGHT_PANEL]);

        }
    }

    private _setupRunningDocumentTableEntry(): void {
        Diag.Debug.assert(!this._runningDocumentTableEntry, "Document should not be registered");
        this._runningDocumentTableEntry = EventsDocuments.getRunningDocumentsTable().add(CAPACITY_PIVOT_DOCUMENT_MONIKER, {
            isDirty: () => {
                return this.state.isDirty;
            }
        });
    }

    private _removeRunningDocumentTableEntry() {
        Diag.Debug.assert(!!this._runningDocumentTableEntry, "Document should be registered");

        if (this._runningDocumentTableEntry) {
            EventsDocuments.getRunningDocumentsTable().remove(this._runningDocumentTableEntry);
            this._runningDocumentTableEntry = null;
        }
    }

    private _renderOverlay(): JSX.Element {
        if (this.state.asyncOperationStatus && this.state.asyncOperationStatus.inprogress) {
            return <Overlay />;
        }

        return null;
    }

    private _onCopyCapacity = (): void => {
        this._actionsCreator.replaceCapacity(this.props.previousIteration, this.props.team.id);
    }

    private _onAddMissingTeamMembers = (): void => {
        this._actionsCreator.addMissingTeamMembers(this.props.team.id);
    }

    private _onUndoChanges = (): void => {
        if (this.state.isDirty) {
            this._actionsCreator.undo();
        }
    }

    private _onSaveCapacityClicked = (): void => {
        const {
            selectedIteration,
            team,
            onTeamDaysOffUpdated
        } = this.props;
        const {
            isDirty,
            isValid,
            capacity
        } = this.state;

        if (isDirty && isValid) {
            this._actionsCreator.save(selectedIteration, team.id, capacity);
            onTeamDaysOffUpdated(capacity.teamDaysOff);
        }
    }

    private _onNewItemClicked = (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>): void => {
        this._addUserCalloutTarget = event.currentTarget;
        this._actionsCreator.showAddUserCallout();
    }

    private _onAddUserCalloutClosed = () => {
        this._addUserCalloutTarget = null;
        this._actionsCreator.hideAddUserCallout();
    }

    private _onAddUserFromCallout = (user: Contracts.IUser) => {
        this._actionsCreator.addUser(user);
    }

    private _storeChanged = () => {
        this.setState(this._store.state);
    }

    private _renderAddUserCallout(): JSX.Element {
        if (this.state.showAddUserCallout) {
            return (
                <Callout
                    ariaLabel={CapacityPivotResources.AddUserTitle}
                    role="dialog"
                    isBeakVisible={false}
                    target={this._addUserCalloutTarget}
                    onDismiss={this._onAddUserCalloutClosed}
                >
                    <CapacityAddUserControl
                        existingUsers={this.state.capacity.userCapacities.map((cap) => cap.teamMember)}
                        onAddUser={this._onAddUserFromCallout}
                    />
                </Callout>
            );
        }

        return null;
    }

    private _setupShortcuts(): CapacityShortcut {

        const actions: SprintsHubCapacityShortcutActions = {
            saveAction: this._onSaveCapacityClicked,
            undoAction: this._onUndoChanges
        };

        return new CapacityShortcut(actions);
    }

    private attachCommonConfigurationRegistration(): void {
        const { team } = this.props;
        const tfsContext = TfsContext.getDefault();
        getService(TeamPermissionService).beginGetTeamPermissions(tfsContext.navigation.projectId, team.id).then((permissions: ITeamPermissions) => {
            this._permissions = permissions;
            Events_Action.getService().registerActionWorker(Actions.LAUNCH_COMMON_CONFIGURATION, this._launchCommonConfiguration);
        }, (error: Error) => {
            publishErrorToTelemetry(error);
        });
    }

    private dettachCommonConfigurationRegistration(): void {
        Events_Action.getService().unregisterActionWorker(Actions.LAUNCH_COMMON_CONFIGURATION, this._launchCommonConfiguration);
    }

    private _launchCommonConfiguration = (actionArgs, next: (args) => void): void => {
        using([
            "Presentation/Scripts/TFS/TFS.Configurations",
            "Agile/Scripts/Settings/CommonSettingsConfiguration"], (
                Configuration: typeof Configurations_NO_REQUIRE,
                Agile_Utils_CSC: typeof Agile_Utils_CSC_NO_REQUIRE
            ) => {
                if (!this._commonSettingsRegistered) {
                    if (!actionArgs) {
                        actionArgs = {};
                    }

                    Configuration.TabControlsRegistration.clearRegistrations(TabControlsRegistrationConstants.COMMON_CONFIG_SETTING_INSTANCE_ID);
                    Agile_Utils_CSC.CommonSettingsConfigurationUtils.registerGeneralSettingsForIterationLevel(this.props.team.id, this._permissions, !actionArgs.hideBacklogVisibilitiesTab);
                    this._commonSettingsRegistered = true;
                }
                next(actionArgs);
            });
    }

    private _isWorkDetailsVisible(contributionId: string): boolean {
        return contributionId === RightPanelKey.WORK_DETAILS || contributionId === RightPanelKey.__WORK_DETAILS_LEGACY;
    }

    private _dismissRightPanel = () => {
        this.props.viewOptions.setViewOption(ViewActionKey.RIGHT_PANEL, RightPanelKey.OFF);
        if (this._viewOptionsLearningBubble.current) {
            this._viewOptionsLearningBubble.current.showIfNeeded();
        }
    }

    private _actionsCreator: CapacityActionsCreator;
    private _store: CapacityStore;
    private _addUserCalloutTarget: HTMLElement;
    private _runningDocumentTableEntry: EventsDocuments.RunningDocumentsTableEntry;
}