import { BacklogOptions } from "Agile/Scripts/Backlog/Backlog";
import { IForecastSettings } from "Agile/Scripts/Backlog/Forecasting/SprintLinesViewManager";
import { IAddPanelSettings } from "Agile/Scripts/Backlog/ProductBacklogAddPanel";
import { IProductBacklogGridOptionsModel } from "Agile/Scripts/Backlog/ProductBacklogGrid";
import { IMappingPanelOptions, IMappingPaneReparentArgs } from "Agile/Scripts/Backlog/ProductBacklogMappingPanel";
import { IBacklogContextData } from "Agile/Scripts/Common/Agile";
import { ICumulativeFlowSettings } from "Agile/Scripts/Common/Controls";
import { IMessage } from "Presentation/Scripts/TFS/Components/Messages";
import { IDismissableNotificationSettings } from "Presentation/Scripts/TFS/TFS.UI.Controls.Common";
import { IQueryResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";

export namespace ProductBacklogConstants {
    export const BACKLOG_ACTION = "backlog";
}

/**  Backlog page context parsed from the URL. */
export interface IBacklogPageContext {
    /** The action on the page. */
    action: string;

    /** The plural name of the backlog level to show. */
    level: string;

    /** Whether to show parent of the level's backlog items. */
    showParents: boolean;
}

export interface IProductBacklogMappingPaneHandler {
    /**
     * Handle reparenting event
     * @param actionArgs Event arguments
     * @param next Function to execute after current handler is finished
     */
    handle(actionArgs: IMappingPaneReparentArgs, next?: Function);
}

export interface ProductBacklogOptions extends BacklogOptions {
    addMessage?: (message: IMessage) => void;
    removeMessage?: (id: string) => void;
}

/**
 * Interface representing sprint view settings, to be kept in sync with SprintViewViewModel.cs
 */
export interface ISprintViewSettings {
    selectedIteration: string;
    actionName: string;
}

/**
 * Interface representing backlog work item type data, to be kept in sync with BacklogOrderViewModel.cs
 */
export interface IBacklogWorkItemTypeData {
    ids: number[];
    types: string[];
}

/**
 * Interface representing velocity chart settings, to be kept in sync with VelocityChartViewModel.cs
 */
export interface IVelocityChartSettings {
    title: string;
    iterationsNumber: number;
    errors: string[];
}

export interface IProductBacklogQueryResult extends IQueryResult {
    ownedIds?: number[];
    expandIds?: number[];
    querySizeLimitExceeded?: boolean;

    productBacklogGridOptions?: IProductBacklogGridOptionsModel;
}

/**
 * Interface representing the information needed for an entire backlog, mirroring the server-side backlog view model.
 */
export interface IBacklogPayload {

    // Keep in sync with CoreBacklogViewModel.cs
    backlogContext: IBacklogContextData;

    // Keep in sync with BacklogViewModel.cs
    queryResults: IQueryResult & { productBacklogGridOptions: any, querySizeLimitExceeded: boolean };
    backlogContextWorkItemTypeNames: string[];
    addPanelSettings: IAddPanelSettings;
    pluralName: string;
    sprintView: ISprintViewSettings;
    forecastSettings: IForecastSettings;
    mappingPanel: IMappingPanelOptions;
    inProgressFilterState: string;
    inProgressStates: string;
    isRootBacklog: boolean;
    isRequirementBacklog: boolean;
    pageTitle: string;
    velocityChartSettings: IVelocityChartSettings;
    cumulativeFlowDiagramSettings: ICumulativeFlowSettings;
    agilePortfolioManagementNotificationSettings: IDismissableNotificationSettings;
}