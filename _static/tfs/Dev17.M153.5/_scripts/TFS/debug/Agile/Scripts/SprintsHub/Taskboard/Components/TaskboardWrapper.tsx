import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/Taskboard/Components/TaskboardWrapper";
import { FieldAggregator } from "Agile/Scripts/Capacity/FieldAggregator";
import { TabControlsRegistrationConstants } from "Agile/Scripts/Common/Agile";
import { IAgileFilterContext } from "Agile/Scripts/Common/Components/AgileFilterBar/AgileFilterBar";
import { AgileFilterManager } from "Agile/Scripts/Common/Components/AgileFilterBar/AgileFilterManager";
import * as AgileHubError from "Agile/Scripts/Common/Components/AgileHubError";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { SprintsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import * as SprintsHubResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub";
import * as Agile_Utils_CSC_NO_REQUIRE from "Agile/Scripts/Settings/CommonSettingsConfiguration";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { IAggregatedCapacity } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { EmptyTaskboardModel } from "Agile/Scripts/SprintsHub/Taskboard/EmptyTaskboardModel";
import { ISprintTaskboardData } from "Agile/Scripts/SprintsHub/Taskboard/TaskboardContracts";
import { TaskboardTelemetryConstants } from "Agile/Scripts/SprintsHub/Taskboard/TaskboardTelemetryConstants";
import { TaskboardGroupBy } from "Agile/Scripts/Taskboard/TaskboardConstants";
import { TaskBoard } from "Agile/Scripts/TFS.Agile.TaskBoard";
import { DroppableWorkItemChangeOptions } from "Presentation/Scripts/TFS/FeatureRef/DroppableEnhancements";
import { TeamAwarenessService } from "Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as Configurations_NO_REQUIRE from "Presentation/Scripts/TFS/TFS.Configurations";
import { Actions } from "Presentation/Scripts/TFS/TFS.Configurations.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WorkZeroDataIllustrationPaths } from "Presentation/Scripts/TFS/TFS.IllustrationUrlUtils";
import * as TeamServices from "TfsCommon/Scripts/Team/Services";
import * as VSSError from "VSS/Error";
import * as Events_Action from "VSS/Events/Action";
import { Component, Props } from "VSS/Flux/Component";
import * as Locations from "VSS/Locations";
import { getService, getApplicationService } from "VSS/Service";
import { contains } from "VSS/Utils/Array";
import { equals, ignoreCaseComparer } from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import { ZeroData } from "VSSUI/Components/ZeroData/ZeroData";
import { ZeroDataActionType } from "VSSUI/Components/ZeroData/ZeroData.Props";
import { IFilter } from "VSSUI/Utilities/Filter";
import { ObservableValue } from "VSS/Core/Observable";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as WorkItemDialogShim from "WorkItemTracking/SharedScripts/WorkItemDialogShim";
import { WebSettingsService, WebSettingsScope } from "Presentation/Scripts/TFS/TFS.WebSettingsService";
import { EventNames } from "Presentation/Scripts/TFS/TFS.NotificationEventNames";
import { Messages } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { getService as getEventService } from "VSS/Events/Services";

export interface ITaskboardDetailsPanelOptions {
    fieldAggregator: FieldAggregator;
    droppableWorkItemChangeOptions: DroppableWorkItemChangeOptions;
}

export interface ITaskboardWrapperProps extends Props {
    /** Iteration path */
    iterationPath: string;

    /** The current status of the taskboard */
    status: LoadingStatus;

    /** The taskboard data */
    taskboard: ISprintTaskboardData;

    /** The status of the group by toggle */
    groupBy: TaskboardGroupBy;

    /** A callback to refresh the taskboard data */
    refreshTaskboard: () => void;

    /** Handler for clicking "Plan sprint" on the zero data experience */
    onPlanSprintClicked: (event: React.MouseEvent<HTMLElement>) => void;

    /** Set the disabled state override for the new work item button */
    setNewWorkItemDisabledState: (disabled: boolean) => void;

    /** Callback when a new parent work item has been discarded */
    onNewParentDiscarded: () => void;

    /** Aggregated capacity for the field aggregator */
    aggregatedCapacityData: IAggregatedCapacity;

    /** Handler called when the wrapper changes the field aggregator or droppableOptions. */
    onDetailsPanelOptionsUpdated: (options: ITaskboardDetailsPanelOptions) => void;

    /** Helper to lookup workitem field value */
    lookupFieldValue: (workItem: WorkItem, fieldName: string) => string;

    /** Exception information found in the taskboard data providers. */
    exceptionsInfo: ExceptionInfo[];

    /** Team Id used in filter persistence */
    teamId: string;

    /** The filter context for the taskboard */
    taskboardFilterContext: ObservableValue<IAgileFilterContext>;

    /** The filter from the hub */
    filter?: IFilter;
}

export class TaskboardWrapper extends Component<ITaskboardWrapperProps> {
    private _taskboardContainer: HTMLElement;
    private _taskboard: TaskBoard;
    private _attachedCommonConfiguration: boolean;
    private _commonSettingsRegistered: boolean;
    private _permissions: TeamServices.ITeamPermissions;
    private _emptyTaskboardModel: EmptyTaskboardModel;
    
    // Note: The fieldAggregator is jQuery based currently
    // When we rewrite the panel in react, we could move this into the store
    private _fieldAggregator: FieldAggregator;

    constructor(props: ITaskboardWrapperProps) {
        super(props);

        this._emptyTaskboardModel = new EmptyTaskboardModel();
    }

    public componentWillReceiveProps(nextProps: ITaskboardWrapperProps) {
        if (nextProps.status === LoadingStatus.LoadedNoContent) {
            this._attachCommonConfigurationRegistration();
        } else if (nextProps.status === LoadingStatus.LoadedWithContent) {
            this._detachCommonConfigurationRegistration();
        }
    }

    public get taskboardDetailsPanelOptions(): ITaskboardDetailsPanelOptions {
        return {
            fieldAggregator: this._fieldAggregator,
            droppableWorkItemChangeOptions: this._taskboard ? this._taskboard.getWorkItemChangeOptionsForDetailsPanel() : null
        } as ITaskboardDetailsPanelOptions;
    }

    public shouldComponentUpdate(nextProps: ITaskboardWrapperProps) {
        if (this.props.iterationPath === nextProps.iterationPath &&
            this.props.status === nextProps.status &&
            this.props.taskboard === nextProps.taskboard &&
            this.props.refreshTaskboard === nextProps.refreshTaskboard &&
            this.props.onPlanSprintClicked === nextProps.onPlanSprintClicked &&
            this.props.filter === nextProps.filter &&
            this.props.aggregatedCapacityData === nextProps.aggregatedCapacityData) {

            // If only the groupBy changed, don't rerender - just update the taskboard
            if (this._taskboard && this.props.groupBy !== nextProps.groupBy) {
                this._taskboard.show(nextProps.groupBy);
            }

            return false;
        }
        return true;
    }

    public render() {
        switch (this.props.status) {
            case LoadingStatus.ErrorLoadingData:
                return <AgileHubError.HubError exceptionsInfo={this.props.exceptionsInfo} />;
            case LoadingStatus.Loading:
                return <LoadingComponent />;
            case LoadingStatus.LoadedNoContent:
                return (
                    <ZeroData
                        imagePath={Locations.urlHelper.getVersionedContentUrl(WorkZeroDataIllustrationPaths.NoWorkScheduled)}
                        imageAltText={SprintsHubResources.NoWorkScheduled}
                        primaryText={SprintsHubResources.NoWorkScheduled}
                        secondaryText={SprintsHubResources.ScheduleWork}
                        actionText={SprintsHubResources.PlanSprint}
                        actionType={ZeroDataActionType.ctaButton}
                        onActionClick={this.props.onPlanSprintClicked as any}
                    />
                );
            case LoadingStatus.LoadedWithContent:
                return (
                    <div className="sprints-hub-taskboard-spacer">
                        <div className="sprints-hub-taskboard">
                            <div ref={this._resolveTaskboardRef} className="taskboard" />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }

    public componentDidMount() {
        if (this.props.status === LoadingStatus.LoadedNoContent) {
            this._attachCommonConfigurationRegistration();
        }

        this._renderTaskboard();
        this._initializeFieldAggregator(this.props.aggregatedCapacityData);
        this._notifyDetailsPanelOptionsUpdated();
        // Required for handling of client dismiss notification e.g. when group by people on taskboard
        getEventService().attachEvent(EventNames.ClientNotificationDismissed, this._clientNotificationDismissed);
    }

    public componentDidUpdate() {
        this._renderTaskboard();
        this._initializeFieldAggregator(this.props.aggregatedCapacityData);
        this._notifyDetailsPanelOptionsUpdated();
    }

    public componentWillUpdate() {
        this._resetTaskboard();
        this._resetFieldAggregator();
        this._notifyDetailsPanelOptionsUpdated();
    }

    public componentWillUnmount() {
        this._detachCommonConfigurationRegistration();
        this._resetTaskboard();
        this._resetFieldAggregator();
        this._notifyDetailsPanelOptionsUpdated();
        getEventService().detachEvent(EventNames.ClientNotificationDismissed, this._clientNotificationDismissed);
    }

    public newItemRequested(workItemType: string): void {
        if (this.props.status === LoadingStatus.LoadedWithContent) {
            // Inline-add the new work item
            SprintsHubTelemetryHelper.publishTelemetry(TaskboardTelemetryConstants.ADD_NEW_PARENT_ITEM, { isInlineAdded: true });
            this._taskboard.addNewParentItem(workItemType);
        } else {
            // Show the new work item form
            SprintsHubTelemetryHelper.publishTelemetry(TaskboardTelemetryConstants.ADD_NEW_PARENT_ITEM, { isInlineAdded: false });
            this.props.setNewWorkItemDisabledState(true);

            const teamSettings = getService(TeamAwarenessService).getTeamSettings(this.props.teamId);
            const initialWorkItemValues = {
                [WITConstants.CoreFieldRefNames.IterationPath]: this.props.iterationPath,
                [teamSettings.teamFieldName]: teamSettings.teamFieldDefaultValue
            };
            WorkItemDialogShim.showNewWorkItemDialog(workItemType, initialWorkItemValues, null, {
                save: this.props.refreshTaskboard,
                close: () => this.props.setNewWorkItemDisabledState(false)
            });
        }
    }

    public moveWorkItemToIteration(workItemId: number, iterationPath: string, $tile: JQuery): void {
        if (this._taskboard) {
            this._taskboard.moveWorkItemToIteration(workItemId, iterationPath, $tile);
        } else {
            throw new Error("The taskboard is not yet available");
        }
    }

    public resize(): void {
        if (this._taskboard) {
            this._taskboard.getTaskBoardView().resize();
        }
    }

    private _resolveTaskboardRef = (element: HTMLElement) => {
        this._taskboardContainer = element;
    }

    private _clientNotificationDismissed = (id: string, scope: WebSettingsScope = WebSettingsScope.User) => {
        getApplicationService(WebSettingsService)
            .writeLocalSetting(Messages.DismissNotificationRegistryPath + id, "true", scope, false);
    }

    private _setFilterContext(): void {
        const { taskboardFilterContext, filter, teamId } = this.props;

        // If the taskboard is between sprints or at a sprint with no items, display filter bar with an empty/placeholder dataSource and filterManager
        const model = this._taskboard ? this._taskboard.getTaskBoardModel() : this._emptyTaskboardModel;
        const filterManager = new AgileFilterManager(model, model.getFilterManager(), filter, teamId);

        // Set the filter context for the parent
        taskboardFilterContext.value = {
            ...taskboardFilterContext.value,
            filterManager: filterManager
        };
    }

    private _renderTaskboard() {
        if (this.props && this.props.taskboard && !this.props.taskboard.exceptionInfo && this.props.groupBy && this.props.status === LoadingStatus.LoadedWithContent) {
            this._taskboard = new TaskBoard($(this._taskboardContainer), this.props.taskboard.taskboardModel, this.props.taskboard.boardCardSettings, this.props.iterationPath, /*allowParentItemsToBeDraggable*/true, this.props.onNewParentDiscarded, /*useNewTaskboardDisplay*/true);
            this._taskboard.show(this.props.groupBy);

            this._setFilterContext();
        }
    }

    private _initializeFieldAggregator(options: IAggregatedCapacity) {
        if (!options || options.exceptionInfo) {
            //  Return if options are not defined (fieldAggregator only exists on the new Sprints hub) or if the data
            //  provider threw an exception.
            return;
        }

        this._fieldAggregator = new FieldAggregator(
            options.remainingWorkField, // Aggregated Field this._workRollupField
            options.aggregatedCapacity, // Initial data
            options.previousValueData, // Previous value data
            options.aggregatedCapacityLimitExceeded, // AggregatedCapacity limit exceeded
            (item: WorkItem): boolean => {
                return this._taskboard && this._taskboard.isWorkItemOnTheBoard(item.id) &&
                    contains(this._taskboard.getTaskBoardModel().getChildWorkItemTypes(), item.workItemType.name, ignoreCaseComparer);
            },
            this._lookupFieldValue
        );
    }

    private _lookupFieldValue = (workItem: WorkItem, fieldName: string): any => {
        if (!workItem || !fieldName) {
            return null;
        }

        let value;
        if (equals(fieldName, FieldAggregator.PARENT_ID_FIELD_NAME)) {
            const taskboardModel = this._taskboard.getTaskBoardModel();
            if (taskboardModel && !taskboardModel.isParentId(workItem.id)) {
                value = taskboardModel.getParent(workItem.id);
            }
        } else {
            value = this.props.lookupFieldValue(workItem, fieldName);
        }

        return value;
    }

    private _resetTaskboard(): void {
        if (this._taskboard) {
            // Reset the taskboard. This is called when going forward or back a sprint.
            this._taskboard.dispose();
            $(this._taskboardContainer).empty();
            this._taskboard = null;
        }
    }

    private _resetFieldAggregator(): void {
        if (this._fieldAggregator) {
            this._fieldAggregator.dispose();
            this._fieldAggregator = null;
        }
    }

    private _attachCommonConfigurationRegistration(): void {
        if (this._attachedCommonConfiguration) {
            return;
        }

        const tfsContext = TfsContext.getDefault();
        getService(TeamServices.TeamPermissionService).beginGetTeamPermissions(tfsContext.navigation.projectId, this.props.teamId).then((permissions: TeamServices.ITeamPermissions) => {
            if (this._attachedCommonConfiguration) {
                return;
            }

            this._permissions = permissions;
            Events_Action.getService().registerActionWorker(Actions.LAUNCH_COMMON_CONFIGURATION, this._launchCommonConfiguration);
            this._attachedCommonConfiguration = true;
        }, (error: Error) => {
            VSSError.publishErrorToTelemetry(error);
        });
    }

    private _detachCommonConfigurationRegistration(): void {
        if (!this._attachedCommonConfiguration) {
            return;
        }

        Events_Action.getService().unregisterActionWorker(Actions.LAUNCH_COMMON_CONFIGURATION, this._launchCommonConfiguration);
        this._attachedCommonConfiguration = false;
    }

    protected _launchCommonConfiguration = (actionArgs, next: (args) => void): void => {
        VSS.using([
            "Presentation/Scripts/TFS/TFS.Configurations",
            "Agile/Scripts/Settings/CommonSettingsConfiguration"], (
                Configuration: typeof Configurations_NO_REQUIRE,
                Agile_Utils_CSC: typeof Agile_Utils_CSC_NO_REQUIRE
            ) => {
                if (!this._commonSettingsRegistered) {
                    Configuration.TabControlsRegistration.clearRegistrations(TabControlsRegistrationConstants.COMMON_CONFIG_SETTING_INSTANCE_ID);
                    Agile_Utils_CSC.CommonSettingsConfigurationUtils.registerGeneralSettingsForIterationLevel(this.props.teamId, this._permissions, !actionArgs.hideBacklogVisibilitiesTab);
                    this._commonSettingsRegistered = true;
                }
                next(actionArgs);
            });
    }

    private _notifyDetailsPanelOptionsUpdated(): void {
        if (this.props.status === LoadingStatus.LoadedWithContent || this.props.status === LoadingStatus.LoadedNoContent) {
            this.props.onDetailsPanelOptionsUpdated(this.taskboardDetailsPanelOptions);
        }
    }
}