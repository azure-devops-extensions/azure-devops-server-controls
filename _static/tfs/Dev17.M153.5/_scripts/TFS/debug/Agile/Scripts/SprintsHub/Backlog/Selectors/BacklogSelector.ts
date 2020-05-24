import { IBacklogGridItem } from "Agile/Scripts/Backlog/Events";
import { TeamCapacityModel } from "Agile/Scripts/Capacity/CapacityModels";
import { FieldAggregator } from "Agile/Scripts/Capacity/FieldAggregator";
import { IBacklogContextData } from "Agile/Scripts/Common/Agile";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { IProductBacklogQueryResult } from "Agile/Scripts/ProductBacklog/ProductBacklogContracts";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import { BacklogStore } from "Agile/Scripts/SprintsHub/Backlog/Store/BacklogStore";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { IAggregatedCapacity, ISprintCapacityOptions } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { ISprintViewRightPanelData } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { DroppableWorkItemChangeOptions } from "Presentation/Scripts/TFS/FeatureRef/DroppableEnhancements";
import { Contribution } from "VSS/Contributions/Contracts";
import { first } from "VSS/Utils/Array";
import { equals } from "VSS/Utils/String";
import { IFilterState } from "VSSUI/Utilities/Filter";

export namespace BacklogSelector {
    export function GetBacklogViewState(store: BacklogStore): ISprintViewBacklogPivotState {
        return {
            activeWorkItemTypes: store.activeWorkItemTypes,
            backlogContext: store.backlogContext,
            backlogExceptions: store.backlogExceptions,
            backlogGridData: store.backlogGridData,
            initialFilterState: store.initialFilterState,
            isFiltered: store.isFiltered,
            isFilterBarOpen: store.isFilterBarOpen,
            status: store.status,
            showAddItemCallout: store.showAddItemCallout,
            rightPanelContributions: store.rightPanelContributions,
            aggregatedCapacityData: store.aggregatedCapacityData,
            sprintCapacityOptions: store.sprintCapacityOptions,
            teamCapacityModel: store.teamCapacityModel,
            rightPanelContributionId: store.rightPanelContributionId,
            fieldAggregator: store.fieldAggregator,
            eventHelper: store.eventHelper,
            droppableWorkItemChangeOptions: store.droppableWorkItemChangeOptions,
            getSelectedWorkItemsHandler: store.getSelectedWorkItemsHandler
        };
    }

    export function getRightPanelState(store: BacklogStore): ISprintViewRightPanelData {
        let contribution = null;

        if (store.rightPanelContributions && store.rightPanelContributionId) {
            contribution = first(
                store.rightPanelContributions,
                (item) => equals(item.id, store.rightPanelContributionId));
        }

        return {
            loading: store.status === LoadingStatus.Loading || store.status === LoadingStatus.None,
            selectedContributionId: store.rightPanelContributionId,
            eventHelper: store.eventHelper,
            getSelectedWorkItems: store.getSelectedWorkItemsHandler,
            exceptionsInfo: store.backlogExceptions,
            contributionData: contribution,
            workDetailsData: {
                capacityOptions: store.sprintCapacityOptions,
                teamCapacityModel: store.teamCapacityModel,
                fieldAggregator: store.fieldAggregator,
                droppableWorkItemChangeOptions: store.droppableWorkItemChangeOptions,
                capacityActions: null   //  Backlog doesn't trigger actions that update team members capacity.
            }
        };
    }
}

export interface ISprintViewBacklogPivotState {
    activeWorkItemTypes: string[];
    backlogContext: IBacklogContextData;
    backlogExceptions: ExceptionInfo[];
    backlogGridData: IProductBacklogQueryResult;
    initialFilterState: IFilterState;
    isFiltered: boolean;
    isFilterBarOpen: boolean;
    status: LoadingStatus;
    showAddItemCallout: boolean;
    rightPanelContributions: Contribution[];
    aggregatedCapacityData: IAggregatedCapacity;
    sprintCapacityOptions: ISprintCapacityOptions;
    teamCapacityModel: TeamCapacityModel;
    rightPanelContributionId: string;
    fieldAggregator: FieldAggregator;
    eventHelper: ScopedEventHelper;
    droppableWorkItemChangeOptions: DroppableWorkItemChangeOptions;
    getSelectedWorkItemsHandler: () => IBacklogGridItem[];
}