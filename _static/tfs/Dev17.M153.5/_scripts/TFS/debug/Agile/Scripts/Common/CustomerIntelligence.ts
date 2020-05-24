export class AgileCustomerIntelligenceArea {
    /** CI Area for general telemetry */
    public static AGILE: string = "Agile";
}

export class AgileCustomerIntelligenceFeature {
    public static PAGELOAD = "PageLoad";
    public static PRODUCTBACKLOG = "ProductBacklog";
    public static PORTFOLIOBACKLOG = "PortfolioBacklog";
    public static CLIENTSIDEOPERATION_REPARENT = "Reparent";
    public static CLIENTSIDEOPERATION_MULTISELECT_REPARENT = "MultiSelectReparent";
    public static CLIENTSIDEOPERATION_MAPPINGPANEREPARENT = "MappingPaneReparent";
    public static CLIENTSIDEOPERATION_MULTISELECT_MAPPINGPANEREPARENT = "MultiSelectMappingPaneReparent";
    public static CLIENTSIDEOPERATION_ITERATIONASSIGNMENT = "IterationAssignmentDragDrop";
    public static CLIENTSIDEOPERATION_MULTISELECT_ITERATIONASSIGNMENT = "MultiSelectIterationAssignmentDragDrop";
    public static CLIENTSIDEOPERATION_ADDBACKLOGITEM = "AddBacklogItem";
    public static CLIENTSIDEOPERATION_BACKLOGS_EXPAND_COLLAPSE_ONE_LEVEL = "ExpandCollapseHierarchyOneLevel";
    public static CLIENTSIDEOPERATION_INDENT_CHANGE_PARENT = "Indent_ChangeParent";
    public static CLIENTSIDEOPERATION_ITERATIONEXPANDALL = "ExpandAllIterationView";
    public static CLIENTSIDEOPERATION_EXPANDWARNING = "ExpandItemWithWarning";
    public static CLIENTSIDEOPERATION_BACKLOG_REORDER = "BacklogReorder";
    public static CLIENTSIDEOPERATION_ITERATION_TASKBOARD_REORDER = "IterationTaskboardReorder";
    public static CLIENTSIDEOPERATION_ITERATION_TASKBOARD_REPARENT = "IterationTaskboardReparent";
    public static CLIENTSIDEOPERATION_ITERATION_TASKBOARD_CHANGE_STATE = "IterationTaskboardChngState";
    public static CLIENTSIDEOPERATION_ITERATION_TASKBOARD_ADDNEWITEM = "IterationTaskboardAddNewItem";
    public static CLIENTSIDEOPERATION_ITERATION_TASKBOARD_FILTER = "IterationTaskboardFilter";
    public static CLIENTSIDEOPERATION_ITERATION_COLLAPSE_FUTURE_LIST = "IterationCollapseFutureList";
    public static CLIENTSIDEOPERATION_ITERATION_CLICK_PREVIOUS_ITERATION = "IterationOpenPreviousIteration";
    public static CLIENTSIDEOPERATION_ITERATION_CLICK_NEXT_ITERATION = "IterationOpenNextIteration";
    public static CLIENTSIDEOPERATION_CARD_CUSTOMIZATION_DIALOG_OPENED = "CardCustomizationDialogOpened";
    public static CLIENTSIDEOPERATION_CARD_CUSTOMIZATION_DIALOG_CHANGED = "CardCustomizationDialogChanged";
    public static CLIENTSIDEOPERATION_COMMON_CONFIG_DIALOG_OPENED = "CommonConfigDialogOpened";
    public static CLIENTSIDEOPERATION_CFD_UPDATE_SETTINGS = "CfdUpdateSettings";
    public static CLIENTSIDEOPERATION_CRITERIA_FILTER_ICON = "KanbanBoardCriteriaFilterIcon";

    public static KANBANBOARD_AUTOREFRESH = "KanbanBoardAutoRefresh";

    public static MULTISELECT_CONTEXTMENU = "MultiSelectContextMenu";
    public static SINGLESELECT_CONTEXTMENU = "SingleSelectContextMenu";

    public static TELEMETRY_PRODUCTBACKLOG_GETPAYLOAD = "ProductBacklog.GetPayloadComplete";
    public static TELEMETRY_MAPPINGPANEL_INITIALIZED = "MappingPanel.Initialized";
    public static TELEMETRY_TASKBOARD_INIT = "IterationTaskboard.Init";
    public static TELEMETRY_TASKBOARD_TREECONTROLS_INIT = "IterationTaskboard.TreeCtrlsInit";
    public static TELEMETRY_TASKBOARD_CUSTOMLAYOUT = "IterationTaskboard.CustomLayout";
    public static TELEMETRY_TASKBOARD_ITEMCOUNT = "IterationTaskboard.ItemCount";
    public static TELEMETRY_TASKBOARD_DISPLAYEDROWSDATA = "IterationTaskboard.DisplayedRowsData";
    public static TELEMETRY_TASKBOARD_STYLERULES = "IterationTaskboard.StyleRules";
    public static TELEMETRY_CAPACITY_VIEW_ADDREMOVECAPACITYUSER = "CapacityView.AddRemoveCapacityUser";
    public static TELEMETRY_CAPACITY_VIEW_CAPACITYPLANNING = "CapacityView.CapacityPlanning";
    public static TELEMETRY_PRODUCTBACKLOG_COLUMNSCHANGE = "ProductBacklog.ColumnsChange";
    public static TELEMETRY_PRODUCTBACKLOG_RENDERFORECASTLINES = "ProductBacklog.RenderForecastLines";
    public static TELEMETRY_CARD_CONTEXT_MENU_CLICK = "CardContextMenuClick";
    public static TELEMETRY_CARD_CHECKLIST_CONTEXT_MENU_CLICK = "CardChecklistContextMenuClick";
    public static TELEMETRY_BACKLOGS_PANEL = "Agile.BacklogsPanel";
    public static TELEMETRY_BACKLOGS_CREATEQUERY = "CreateQuery";
    public static TELEMETRY_BACKLOGS_EMAILBACKLOG = "EmailBacklog";
    public static TELEMETRY_BACKLOGS_COLUMNOPTIONS = "BacklogsCommand.column-options";
    public static TELEMETRY_BACKLOGS_TOOLBAR_FORECASTING = "Forecasting";
    public static TELEMETRY_BACKLOGS_TOOLBAR_SHOWPARENTS = "ShowParents";
    public static TELEMETRY_BACKLOGS_TOOLBAR_INPROGRESS = "ShowInProgress";
}

export class CustomerIntelligencePropertyValue {
    public static VIEWTYPE_PRODUCTBACKLOG = "Product Backlog";
    public static VIEWTYPE_PORTFOLIOBACKLOG = "Portfolio Backlog";
    public static VIEWTYPE_ITERATIONBACKLOG = "Iteration Backlog";
    public static VIEWTYPE_TASKBOARD = "Taskboard";
    public static VIEWTYPE_KANBAN = "Kanban";

    public static ADDBACKLOGITEM_ADDEDFROM_ADDPANEL = "AddPanel";
    public static ADDBACKLOGITEM_ADDEDFROM_GRID = "Grid";
}

export const PROPERTYNAME_SWITCH = "Switch";
export const PROPERTYVALUE_WITHUNSAVEDWORK = "WithUnsavedWork";
export const PORTFOLIOBACKLOG_MAPPING_PANE_REPARENT_PROPERTY = "MappingPaneReparent";