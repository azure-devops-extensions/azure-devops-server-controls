import { IBacklogPivotStore } from "Agile/Scripts/BacklogsHub/BacklogPivot/Store/BacklogPivotStore";
import { IBacklogContextData } from "Agile/Scripts/Common/Agile";
import { IBacklogPayload } from "Agile/Scripts/ProductBacklog/ProductBacklogContracts";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { Contribution } from "VSS/Contributions/Contracts";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";

export interface IBacklogPivotState {
    /** The current displayed pane */
    paneId: string;

    /** The backlog context */
    backlogContext: IBacklogContextData;

    /** Is the backlog empty */
    backlogEmpty: boolean;

    /** The backlog payload to render the grid */
    backlogPayload: IBacklogPayload;

    /** Exception info for the pivot */
    exceptionInfo: ExceptionInfo;

    /** The initial filter state */
    initialFilterState: IFilterState;

    /** The status of the data provider calls */
    status: LoadingStatus;

    /** Should the add item callout be shown? */
    showAddItemCallout: boolean;

    /** Is the backlog pivot filtered? */
    isFiltered: boolean;

    /** Are we on the requirements backlog? */
    isRequirementsBacklog: boolean;

    /** Are we on the root backlog? */
    isRootBacklog: boolean;

    /** Is the filter bar visible? */
    isFilterBarOpen: boolean;

    /** Active work item types for the add panel */
    activeWorkItemTypes: string[];

    /** Right panel contributions */
    rightPanelContributions: Contribution[];

    /** Event Helper */
    eventHelper: ScopedEventHelper;

    /** Is this the initial load? If so, don't show pivot loading indicator */
    isInitialLoad: boolean;
}

export function getState(store: IBacklogPivotStore): IBacklogPivotState {
    return {
        paneId: store.paneId,
        backlogContext: store.backlogContextData,
        backlogEmpty: store.backlogEmpty,
        backlogPayload: store.backlogPayload,
        exceptionInfo: store.exceptionInfo,
        initialFilterState: store.initialFilterState,
        status: store.status,
        showAddItemCallout: store.addItemCalloutVisible,
        isFilterBarOpen: store.filterBarVisible,
        isFiltered: store.isFiltered,
        isRequirementsBacklog: store.isRequirementsBacklog,
        isRootBacklog: store.isRootBacklog,
        activeWorkItemTypes: store.activeWorkItemTypes,
        rightPanelContributions: store.rightPanelContributions,
        eventHelper: store.eventHelper,
        isInitialLoad: store.isInitialLoad
    };
}