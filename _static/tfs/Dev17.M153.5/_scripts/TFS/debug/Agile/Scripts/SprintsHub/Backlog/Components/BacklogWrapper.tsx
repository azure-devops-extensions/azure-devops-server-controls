import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/Backlog/Components/BacklogWrapper";
import { IBacklogGridItem } from "Agile/Scripts/Backlog/Events";
import { TeamMemberCapacityModel } from "Agile/Scripts/Capacity/CapacityModels";
import { FieldAggregator, getActivityFieldValue } from "Agile/Scripts/Capacity/FieldAggregator";
import { BacklogContext, DragDropScopes, ReorderManager } from "Agile/Scripts/Common/Agile";
import { BacklogWrapperBase, IBacklogWrapperBaseProps } from "Agile/Scripts/Common/Components/BacklogPivot/BacklogWrapperBase";
import { WorkItemUtils } from "Agile/Scripts/Common/Utils";
import { IIterationBacklogOptions, IterationBacklog } from "Agile/Scripts/IterationBacklog/IterationBacklog";
import { IProductBacklogQueryResult } from "Agile/Scripts/ProductBacklog/ProductBacklogContracts";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import { IAggregatedCapacity, ISprintCapacityOptions } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { css } from "OfficeFabric/Utilities";
import { BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { DroppableWorkItemChangeOptions } from "Presentation/Scripts/TFS/FeatureRef/DroppableEnhancements";
import { timeMethod } from "VSS/Performance";
import { contains } from "VSS/Utils/Array";
import { equals, ignoreCaseComparer } from "VSS/Utils/String";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export * from "Agile/Scripts/Common/Components/BacklogPivot/BacklogWrapperBase";

/**
 * Context information required by the right panel when used in the Sprints hub Backlog pivot.
 */
export interface IBacklogRightPanelContext {
    /**
     * Field aggregator instance.
     */
    fieldAggregator: FieldAggregator;

    /**
     * Options to enable / use drag and drop between the backlog grid and work details pane.
     */
    droppableWorkItemChangeOptions: DroppableWorkItemChangeOptions;

    /**
     * Helper for subscribing to events of interest to the right panel generated by the backlog pivot's
     * content.
     */
    eventHelper: ScopedEventHelper;

    /**
     * Handler for retrieving currently selected work items in the iteration backlog grid.
     */
    getSelectedWorkItemsHandler: () => IBacklogGridItem[];
}

export interface IIterationBacklogWrapperProps extends IBacklogWrapperBaseProps {
    /** The backlog grid data */
    backlogGridData: IProductBacklogQueryResult;

    /** Is the backlog grid visible. If this is false, the backlog will still be initialized, but hidden */
    visible: boolean;

    /** Aggregated capacity for the field aggregator */
    aggregatedCapacity: IAggregatedCapacity;

    /** Capacity options for the field aggregator */
    sprintCapacityOptions: ISprintCapacityOptions;

    /** Handler called when the right panel context for the backlog pivot changes. */
    onRightPanelContextChanged: (context: IBacklogRightPanelContext) => void;

    /** Helper to get TeamMemberCapacityModel */
    getTeamMemberCapacity: (assignedToFieldValue: string) => TeamMemberCapacityModel;
}

export class IterationBacklogWrapper extends BacklogWrapperBase<IIterationBacklogWrapperProps> {
    private _container: HTMLDivElement;
    private _fieldAggregator: FieldAggregator;
    private _droppableWorkItemChangeOptions: DroppableWorkItemChangeOptions;
    private _scopedEventHelper: ScopedEventHelper;

    constructor(props: IIterationBacklogWrapperProps, context: any) {
        super(props, context);
    }

    public get backlogRightPanelContext(): IBacklogRightPanelContext {
        return {
            fieldAggregator: this._fieldAggregator,
            droppableWorkItemChangeOptions: this._droppableWorkItemChangeOptions,
            eventHelper: this._scopedEventHelper,
            getSelectedWorkItemsHandler: (this._backlog) ? (this._backlog as IterationBacklog).getSelectedBacklogGridItems : null
        };
    }

    public render(): JSX.Element {
        return (
            <div ref={this._resolveContainerRef} className={css("iteration-backlog-container", { "backlog-hidden": !this.props.visible })}>
                <div className="grid-status-message" />
            </div>
        );
    }

    public componentDidMount(): void {
        this._renderIterationBacklog();
    }

    public componentWillReceiveProps(nextProps: IIterationBacklogWrapperProps): void {
        if ((!nextProps.backlogContext || !nextProps.backlogGridData) && this._backlog) {
            this._disposeIterationBacklog();
        }
    }

    public componentDidUpdate(prevProps: IIterationBacklogWrapperProps): void {
        if (
            this.props.backlogContext !== prevProps.backlogContext ||
            this.props.backlogGridData !== prevProps.backlogGridData ||
            !this._backlog
        ) {
            this._disposeIterationBacklog();
            this._renderIterationBacklog();
        }
    }

    public componentWillUnmount(): void {
        this._disposeIterationBacklog();
    }

    public getIterationBacklog(): IterationBacklog {
        return this._backlog as IterationBacklog;
    }

    @timeMethod
    private _renderIterationBacklog(): void {
        const {
            backlogContext,
            backlogGridData,
            aggregatedCapacity,
            sprintCapacityOptions
        } = this.props;

        if (!backlogGridData || !backlogContext || !aggregatedCapacity || !sprintCapacityOptions) {
            return;
        }

        this._fieldAggregator = new FieldAggregator(
            aggregatedCapacity.remainingWorkField,
            aggregatedCapacity.aggregatedCapacity,
            aggregatedCapacity.previousValueData,
            aggregatedCapacity.aggregatedCapacityLimitExceeded,
            (workItem: WorkItem) => {
                const dataManager = this._backlog.getGridDataManager();
                const workItemId = workItem.id;
                const taskWorkItemTypes = BacklogConfigurationService.getBacklogConfiguration().taskBacklog.workItemTypes;

                return dataManager.getWorkItemOrder(workItemId) !== undefined
                    && dataManager.isLeafNode(workItemId)
                    && contains(taskWorkItemTypes, workItem.workItemType.name, ignoreCaseComparer);
            },
            this._lookupFieldValue
        );

        this._scopedEventHelper = new ScopedEventHelper(`SprintPlanning_${(new Date()).getTime().toString()}`);

        const options: IIterationBacklogOptions = {
            $backlogElement: $(this._container),
            fieldAggregator: this._fieldAggregator,
            maxItemsCount: BacklogConfigurationService.getBacklogConfiguration().taskBacklog.workItemCountLimit,
            unlimitedItemsCount: -1,
            eventHelper: this._scopedEventHelper,
            isNewHub: true,
            gridOptions: backlogGridData as any,
            reorderManager: new ReorderManager(this.props.backlogContext.team.id),
            activityFieldRefName: this.props.sprintCapacityOptions.activityFieldReferenceName,
            onColumnsChanged: this.props.onColumnOptionsChanged
        };

        BacklogContext.getInstance().setBacklogContextData(backlogContext);

        const iterationBacklog = new IterationBacklog(options);
        this._backlog = iterationBacklog;

        this._setupFilterContext();

        // do an initial resize of the grid to trigger the layout now the filter context is setup.
        this.resize();

        this._droppableWorkItemChangeOptions = {
            workItemUpdate: iterationBacklog.dropHandlerForWorkItemUpdate,
            getDraggedWorkItemIds: iterationBacklog.getDraggedWorkItemIds,
            isValidDropTarget: iterationBacklog.isValidDropTargetHandler,
            beginGetWorkItems: iterationBacklog.beginGetWorkItemsHandler,
            scope: DragDropScopes.IterationBacklog
        } as DroppableWorkItemChangeOptions;

        this.props.onRightPanelContextChanged({
            fieldAggregator: this._fieldAggregator,
            droppableWorkItemChangeOptions: this._droppableWorkItemChangeOptions,
            eventHelper: this._scopedEventHelper,
            getSelectedWorkItemsHandler: iterationBacklog.getSelectedBacklogGridItems
        });
    }

    private _disposeIterationBacklog(): void {
        const {
            backlogFilterContext
        } = this.props;

        this.dispose();

        if (backlogFilterContext.value && backlogFilterContext.value.filterManager) {
            backlogFilterContext.value.filterManager.dispose();
        }

        this._disposeRightPanelContext();
    }

    private _disposeRightPanelContext(): void {
        if (this._fieldAggregator) {
            this._fieldAggregator.dispose();
            this._fieldAggregator = null;
        }

        if (this._scopedEventHelper) {
            this._scopedEventHelper.dispose();
            this._scopedEventHelper = null;
        }

        this.props.onRightPanelContextChanged({
            fieldAggregator: null,
            droppableWorkItemChangeOptions: null,
            eventHelper: null,
            getSelectedWorkItemsHandler: null
        });
    }

    private _lookupFieldValue = (workItem: WorkItem, fieldName: string): any => {
        let value;

        // If the field being looked up is the parent ID field, then get the value.
        if (equals(fieldName, FieldAggregator.PARENT_ID_FIELD_NAME)) {
            value = this._lookupParentIdFieldValue(workItem);
        } else if (equals(fieldName, this.props.sprintCapacityOptions.activityFieldReferenceName, true)) {
            const { getTeamMemberCapacity, sprintCapacityOptions } = this.props;
            value = getActivityFieldValue(
                sprintCapacityOptions.activityFieldDisplayName,
                sprintCapacityOptions.allowedActivities,
                workItem,
                getTeamMemberCapacity
            );
        }

        return value;
    }

    /**
     * Lookup handler for looking up the value of the parent ID for the provided work item.
     *
     * @param workItem Work item to look up the field for.
     * @return
     */
    private _lookupParentIdFieldValue(workItem: WorkItem): any {
        let value;
        const dataManager = this._backlog.getGridDataManager();
        const workItemId = workItem.id;

        // If this is a leaf node, then look up the parent ID.
        // NOTE: We only calculate rollup based on the leaf nodes because the entire hierarchy
        //       of tasks under a user story is shown and we do not want to include remaining work
        //       values of organizational tasks into the rollup.
        if (dataManager.getWorkItemOrder(workItemId) !== undefined && dataManager.isLeafNode(workItemId)) {
            value = dataManager.getRootWorkItemId(workItemId);

            // If the value could not be looked up (happens in the case where a new work item is added and has
            // not been added to the grid yet), get the parent ID from the parent link and using that to get the
            // root node id if the work item type is a child work item type.
            if (value === undefined) {
                const link = WorkItemUtils.getWorkItemParentLink(workItem);
                if (link) {
                    value = dataManager.getRootWorkItemId(link.getTargetId());
                }
            }
        }

        return value;
    }

    private _resolveContainerRef = (element: HTMLDivElement): void => {
        this._container = element;
    }
}