import { PerformanceEvents } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { ActionsCreator } from "WorkItemTracking/Scripts/Queries/Actions/ActionsCreator";
import { NavigationActionsCreator } from "WorkItemTracking/Scripts/Queries/Actions/NavigationActionsCreator";
import { TriageViewActionsCreator, TriageViewActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/TriageViewActionsCreator";
import { QueriesViewState } from "WorkItemTracking/Scripts/Queries/QueriesViewState";
import { StoresHub } from "WorkItemTracking/Scripts/Queries/Stores/StoresHub";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import * as PropTypes from "prop-types";
import * as React from "react";
import { ActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/ActionsHub";
/**
 * Queries hub context
 */
export interface IQueriesHubContext {
    /**
     * Directory page actions hub
     */
    actions: ActionsHub;

    /**
     * Directory page stores hub
     */
    stores: StoresHub;

    /**
     * Directory page Action creator
     */
    actionsCreator: ActionsCreator;

    /**
     * TriageView action creator
     */
    triageViewActionCreator: TriageViewActionsCreator;

    /**
     * TriageView action hub
     */
    triageViewActions: TriageViewActionsHub;

    /**
     * Query Hubs view-state
     */
    queryHubViewState: QueriesViewState;

    /**
     * Navigation Action Creator
     */
    navigationActionsCreator: NavigationActionsCreator;
}

export class QueriesHubContext implements IQueriesHubContext {
    private static _instance: IQueriesHubContext;

    public actions: ActionsHub;
    public stores: StoresHub;
    public actionsCreator: ActionsCreator;
    public triageViewActions: TriageViewActionsHub;
    public triageViewActionCreator: TriageViewActionsCreator;
    public navigationActionsCreator: NavigationActionsCreator;
    public queryHubViewState: QueriesViewState;

    /**
     * Constructor. Private to enforce singleton
     */
    private constructor() { }

    /**
     * Singleton: gets the default queries hub context
     */
    public static getInstance(): IQueriesHubContext {
        if (!QueriesHubContext._instance) {
            PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_INITIALIZE_QUERIESHUBCONTEXT, true, undefined, false);
            const actionsHub = new ActionsHub();
            const triageViewActionsHub = new TriageViewActionsHub();
            const storesHub = new StoresHub(actionsHub, triageViewActionsHub);
            const queryHubViewState = new QueriesViewState();
            const actionsCreator = new ActionsCreator(
                actionsHub,
                storesHub.queryHierarchyItemStore,
                storesHub.queryHierarchyStore,
                storesHub.queryFavoriteGroupStore,
                storesHub.querySearchStore,
                storesHub.activeQueryViewStore,
                storesHub.queryResultsProviderStore,
                storesHub.favoritesStore);
            QueriesHubContext._instance = {
                actions: actionsHub,
                stores: storesHub,
                actionsCreator: actionsCreator,
                triageViewActions: triageViewActionsHub,
                triageViewActionCreator: new TriageViewActionsCreator(triageViewActionsHub, actionsCreator, storesHub.queryHierarchyItemStore, storesHub.tempQueryDataStore),
                navigationActionsCreator: new NavigationActionsCreator(actionsCreator, storesHub.queryHierarchyItemStore, storesHub.queryResultsProviderStore, queryHubViewState),
                queryHubViewState: queryHubViewState
            };
            PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_INITIALIZE_QUERIESHUBCONTEXT, false, undefined, false);
        }

        return QueriesHubContext._instance;
    }

    /**
     * Dispose the query hub context
     */
    public static dispose() {
        QueriesHubContext._instance = null;
    }
}

/**
 * Shared proptypes for the queries hub context
 */
export const QueriesHubContextPropTypes: React.ValidationMap<any> = {
    actions: PropTypes.object.isRequired,
    stores: PropTypes.object.isRequired,
    actionsCreator: PropTypes.object.isRequired,
    triageViewActions: PropTypes.object.isRequired,
    triageViewActionCreator: PropTypes.object.isRequired,
    queryHubViewState: PropTypes.object.isRequired,
    navigationActionsCreator: PropTypes.object.isRequired
};
