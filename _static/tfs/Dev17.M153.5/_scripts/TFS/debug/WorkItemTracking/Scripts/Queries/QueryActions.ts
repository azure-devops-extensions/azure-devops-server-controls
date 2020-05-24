import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import { QueryDefinition } from "WorkItemTracking/Scripts/OM/QueryItem";
import { QuerySaveDialogMode, QueryItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { QueryResultGrid } from "WorkItemTracking/Scripts/Controls/Query/QueryResultGrid";
import { QueryEditor } from "WorkItemTracking/Scripts/Controls/Query/QueryEditor";
import { QueryChartsView } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.Charts";
import { showColumnOptionsPanel } from "WorkItemTracking/Scripts/Queries/Components/ColumnOptions/ColumnOptionsPanel";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { WITPerformanceScenario } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { showDialog } from "WorkItemTracking/Scripts/Queries/Components/QuerySaveDialog.Renderer";

export interface IActionArgs {
    queryResultsGrid?: QueryResultGrid;
    editor?: QueryEditor;
    queryDefinition?: QueryDefinition;
    queriesHubContext?: IQueriesHubContext;
    chartsView?: QueryChartsView;
}

export namespace QueryActions {
    export const ColumnOptions = "column-options";
    export const RefreshWorkItems = "refresh-work-items";
    export const RunQuery = "run-query";
    export const SaveQuery = "save-query";
    export const SaveWorkItems = "save-work-items";
    export const ShareLink = "share-link";
    export const EmailQueryResult = "email-query-result";
    export const RevertQueryChanges = "revert-query-changes";
    export const SaveQueryAs = "save-query-as";
    export const RenameQuery = "rename-query";
    export const NewChart = "new-chart";
    export const RefreshCharts = "refresh-charts";
    export const RestoreWorkItem = "restore-work-item";
    export const DestroyWorkItem = "destroy-work-item";
    export const ExpandAllNodes = "expand-all-nodes";
    export const CollapseAllNodes = "collapse-all-nodes";
}

export function executeAction(actionName: string, actionArgs?: IActionArgs) {
    const queryDefinition = actionArgs.queryDefinition;
    const queriesHubContext = actionArgs.queriesHubContext;
    const queryResultsProvider = queriesHubContext && queriesHubContext.stores.queryResultsProviderStore.getValue();

    switch (actionName) {
        case QueryActions.ColumnOptions:
            if (actionArgs && actionArgs.queryResultsGrid) {
                const args = actionArgs.queryResultsGrid.getActionArguments(actionName);
                showColumnOptionsPanel(args);
            }
            break;
        case QueryActions.RefreshWorkItems:
            if (actionArgs && actionArgs.queryResultsGrid) {
                actionArgs.queryResultsGrid.refresh();
            }
            break;
        case QueryActions.RunQuery:
            if (actionArgs && actionArgs.editor) {
                actionArgs.editor.runQuery();
            }
            break;
        case QueryActions.SaveQuery:
            if (actionArgs && actionArgs.queryResultsGrid) {
                PerfScenarioManager.startScenario(
                    WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_SAVEEXISTINGQUERY, false);

                actionArgs.queryResultsGrid.saveQuery();
            }
            break;
        case QueryActions.SaveWorkItems:
            if (actionArgs && actionArgs.queryResultsGrid) {
                actionArgs.queryResultsGrid.saveWorkitems();
            }
            break;
        case QueryActions.ShareLink:
            if (actionArgs && actionArgs.queryResultsGrid) {
                actionArgs.queryResultsGrid.shareLink();
            }
            break;
        case QueryActions.EmailQueryResult:
            if (actionArgs && actionArgs.queryResultsGrid) {
                actionArgs.queryResultsGrid.emailResults();
            }
            break;
        case QueryActions.RevertQueryChanges:
            if (actionArgs && actionArgs.editor) {
                actionArgs.editor.revert();
            }
            break;
        case QueryActions.RenameQuery:
            // Rename a query from results/editor view only alters the name and its path.
            const currentQueryItem = queriesHubContext.stores.queryHierarchyItemStore.getItem(queryDefinition.id) as QueryItem;
            if (currentQueryItem) {
                showDialog(
                    queriesHubContext,
                    QuerySaveDialogMode.RenameQuery,
                    currentQueryItem,
                    queryDefinition.parentPath,
                    (savedQueryItem: QueryItem) => {
                        QueryUtilities.updatedQueryDefinitionFromQueryItem(queryResultsProvider.queryDefinition, savedQueryItem);
                        queriesHubContext.triageViewActionCreator.updateProvider(queryResultsProvider);
                    });
            }
            break;
        case QueryActions.SaveQueryAs:
            const isSpecialQuery = QueryUtilities.isSpecialQueryId(queryDefinition.id);
            queryResultsProvider.getQueryText().then((wiql: string) => {
                const queryItem = {
                    wiql: wiql,
                    path: queryDefinition.storedPath,
                    name: isSpecialQuery ? undefined : queryDefinition.name,
                    id: queryDefinition.id
                } as QueryItem;

                showDialog(
                    queriesHubContext,
                    QuerySaveDialogMode.SaveAs,
                    queryItem,
                    queryDefinition.parentPath,
                    (savedQueryItem: QueryItem) => {
                        queriesHubContext.stores.queryResultsProviderStore.clear();
                        queriesHubContext.navigationActionsCreator.navigateToQueryPreservingSupportedState(savedQueryItem.id, false);
                    });
            });
            break;
        case QueryActions.NewChart:
            if (actionArgs && actionArgs.chartsView) {
                actionArgs.chartsView.newChart();
            }
            break;
        case QueryActions.RefreshCharts:
            if (actionArgs && actionArgs.chartsView) {
                actionArgs.chartsView.refreshCharts();
            }
            break;
        case QueryActions.RestoreWorkItem:
            if (actionArgs && actionArgs.queryResultsGrid) {
                actionArgs.queryResultsGrid.restoreWorkItems();
            }
            break;
        case QueryActions.DestroyWorkItem:
            if (actionArgs && actionArgs.queryResultsGrid) {
                actionArgs.queryResultsGrid.destroyWorkItems();
            }
            break;
        case QueryActions.CollapseAllNodes:
            if (actionArgs && actionArgs.queryResultsGrid) {
                actionArgs.queryResultsGrid.collapseAll();
            }
            break;
        case QueryActions.ExpandAllNodes:
            if (actionArgs && actionArgs.queryResultsGrid) {
                actionArgs.queryResultsGrid.expandAll();
            }
            break;
    }
}
