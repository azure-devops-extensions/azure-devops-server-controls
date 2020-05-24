import { TeamCapacityModel } from "Agile/Scripts/Capacity/CapacityModels";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { IAggregatedCapacity, ISprintCapacityOptions } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { TaskboardStore } from "Agile/Scripts/SprintsHub/Taskboard/Store/TaskboardStore";
import { ISprintTaskboardData } from "Agile/Scripts/SprintsHub/Taskboard/TaskboardContracts";
import { TaskboardGroupBy } from "Agile/Scripts/Taskboard/TaskboardConstants";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { FieldAggregator } from "Agile/Scripts/Capacity/FieldAggregator";
import { DroppableWorkItemChangeOptions } from "Presentation/Scripts/TFS/FeatureRef/DroppableEnhancements";

export interface ITaskboardViewState {
    /** The current state of the group by toggle */
    groupBy: TaskboardGroupBy;

    /** The current status of the taskboard */
    loadingStatus: LoadingStatus;

    /** The data needed to render the taskboard */
    taskboardData: ISprintTaskboardData;

    /** The work item types that can be new parents on the taskboard */
    newWorkItemTypes: string[];

    /** The plural of the parent name - used for the group by toggle */
    parentPluralName: string;

    /** The current state of the new work item button */
    isNewWorkItemButtonDisabled: boolean;

    /** AggregatedCapacity data for the field aggregator */
    aggregatedCapacityData: IAggregatedCapacity;

    /** SprintCapacityOptions data for right panel */
    sprintCapacityOptions: ISprintCapacityOptions;

    /** TeamCapacityModel for right panel */
    teamCapacityModel: TeamCapacityModel;

    exceptionsInfo: ExceptionInfo[];

    isFiltered: boolean;
    isFilterBarOpen: boolean;
    initialFilterState: IFilterState;
    rightPanelId: string;
    fieldAggregator: FieldAggregator;
    droppableOptions: DroppableWorkItemChangeOptions;
}

export namespace TaskboardSelector {
    export function getTaskboardViewState(store: TaskboardStore): ITaskboardViewState {
        const taskboard = store.taskboardData;
        const status = store.loadingState;

        if (!taskboard || status === LoadingStatus.Loading) {
            return {
                groupBy: store.groupByState,
                isNewWorkItemButtonDisabled: store.isNewWorkItemDisabled,
                newWorkItemTypes: store.newWorkItemTypes,
                parentPluralName: store.parentNamePlural,
                taskboardData: null,
                loadingStatus: status,
                aggregatedCapacityData: null,
                teamCapacityModel: null,
                sprintCapacityOptions: null,
                exceptionsInfo: null,
                isFilterBarOpen: store.isFilterBarOpen,
                isFiltered: store.isFiltered,
                initialFilterState: store.initialFilterState,
                rightPanelId: store.rightPanelId
            } as ITaskboardViewState;
        }

        // We want to set items back to null if data disappears
        return {
            groupBy: store.groupByState,
            isNewWorkItemButtonDisabled: store.isNewWorkItemDisabled,
            newWorkItemTypes: store.newWorkItemTypes,
            parentPluralName: store.parentNamePlural,
            taskboardData: taskboard,
            aggregatedCapacityData: store.aggregatedCapacityData,
            loadingStatus: status,
            teamCapacityModel: store.teamCapacityModel,
            sprintCapacityOptions: store.sprintCapacityOptions,
            exceptionsInfo: store.exceptionsInfo,
            isFilterBarOpen: store.isFilterBarOpen,
            isFiltered: store.isFiltered,
            initialFilterState: store.initialFilterState,
            rightPanelId: store.rightPanelId,
            fieldAggregator: store.fieldAggregator,
            droppableOptions: store.droppableOptions
        } as ITaskboardViewState;
    }
}