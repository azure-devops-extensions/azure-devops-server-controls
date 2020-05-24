import * as Q from "q";

import { Action } from "VSS/Flux/Action";
import * as Utils_Array from "VSS/Utils/Array";

import Core_Contracts = require("TFS/Core/Contracts");

import { DashboardsDataManager } from "Dashboards/Scripts/DashboardsDataManager";
import {
    DashboardLoadingState,
    MessageLevel,
    IExtendedFavorite,
    DashboardsDirectoryPivotState,
    IDirectoryRow,
    IGroupRow,
    IDashboardRow,
    ISortOptions,
    IMessageOptions,
    PivotGroupTogglePayload,
    FilteredPayload,
    ColumnSortChangePayload,
    DashboardDeletedPayload,
    DashboardUpdatedPayload,
    PivotDataReceivedPayload
} from "Dashboards/Components/Directory/Contracts";
import { DashboardItem, TeamScope } from "Dashboards/Components/Shared/Contracts";
import * as Resources from "Dashboards/Scripts/Resources/TFS.Resources.Dashboards";
import { DirectoryViewColumnKey, UrlConstants } from "Dashboards/Components/Constants";

export class DashboardsDirectoryActionCreator {
    private dataManager: DashboardsDataManager;
    private actions: DashboardsDirectoryActions;

    constructor(actions: DashboardsDirectoryActions) {
        this.dataManager = new DashboardsDataManager();
        this.actions = actions;
    }

    public loadDashboardsForMyPivot(projectId: string, initialFilter: FilteredPayload): void {
        let dashboardsPromise: IPromise<DashboardItem[]> = this.dataManager.getDashboardsFromMyTeamsInProject(projectId);
        let favoritesPromise: IPromise<IExtendedFavorite[]> = this.dataManager.getFavorites(projectId);

        Q.all([dashboardsPromise, favoritesPromise]).spread((items: DashboardItem[], favorites: IExtendedFavorite[]) => {
            const teamIds = Utils_Array.unique(items.map((item) => { return item.teamScope.teamId }));
            let cachedExpansionState: IDictionaryStringTo<boolean> = this.dataManager.getExpansionStateFromCache(teamIds);

            this.actions.ReceiveStateForPivot.invoke({
                showFavoriteGroup: true,
                isGroupedView: true,
                sortOptions: {
                    isSortable: false
                } as ISortOptions,
                initialFilter: initialFilter,
                initialExpansionStateForGroups: cachedExpansionState,
                dashboards: items,
                favorites: favorites,
                pivot: UrlConstants.MineView
            } as PivotDataReceivedPayload);
        }, (reason: any) => {
            this.actions.ReceiveStateForPivot.invoke({
                messageOptions: {
                    message: Resources.PivotDataLoadFailed,
                    messageLevel: MessageLevel.Critical
                },
                pivot: UrlConstants.MineView,
                favorites: [],
                dashboards:[]
            } as PivotDataReceivedPayload);
        });
    }

    public loadDashboardsForAllPivot(projectId: string, initialFilter: FilteredPayload): void {
        let dashboardsPromise: IPromise<DashboardItem[] > = this.dataManager.getDashboardsForAllTeamsInProject(projectId);
        let favoritesPromise: IPromise<IExtendedFavorite[]> = this.dataManager.getFavorites(projectId);

        Q.all([dashboardsPromise, favoritesPromise]).spread((items: DashboardItem[], favorites: IExtendedFavorite[]) => {
            this.actions.ReceiveStateForPivot.invoke({
                showFavoriteGroup: false,
                isGroupedView: false,
                sortOptions: {
                    isSortable: true,
                    isSortedDescending: false,
                    sortColumn: DirectoryViewColumnKey.Name
                } as ISortOptions,
                initialFilter: initialFilter,
                dashboards: items,
                favorites: favorites,
                pivot: UrlConstants.AllView
            } as PivotDataReceivedPayload);
        }, (reason: any) => {
            this.actions.ReceiveStateForPivot.invoke({
                messageOptions: {
                    message: Resources.PivotDataLoadFailed,
                    messageLevel: MessageLevel.Critical
                },
                pivot: UrlConstants.AllView,
                favorites: [],
                dashboards: []
            } as PivotDataReceivedPayload);
        });
    }

    public expandGroupInPivot(pivot: string, groupId: string): void {
        this.dataManager.saveChoiceExpanded(groupId);
        this.actions.ExpandGroupRowForPivot.invoke({
            pivot: pivot,
            teamId: groupId
        });
    }

    public collapseGroupInPivot(pivot: string,groupId: string): void {
        this.dataManager.saveChoiceCollapsed(groupId);
        this.actions.CollapseGroupRowForPivot.invoke({
            pivot: pivot,
            teamId: groupId
        });
    }

    public changeColumnSortForPivot(pivot: string, columnName: string): void {
        this.actions.ChangeColumnSortForPivot.invoke({
            pivot: pivot,
            columnName: columnName
        });
    }

    public clearMessageForPivot(pivot: string): void {
        this.actions.ClearMessageForPivot.invoke(pivot);
    }
    
    public deleteDashboard(pivot: string, dashboardId: string, teamContext: Core_Contracts.TeamContext): void {
        this.dataManager.deleteDashboard(dashboardId, teamContext).then(() => {
            this.actions.DeleteDashboard.invoke({
                dashboardId: dashboardId,
                isSuccessful: true,
                pivot: pivot
            } as DashboardDeletedPayload);
        }, (errorMessage: any) => {
            this.actions.DeleteDashboard.invoke({
                dashboardId: dashboardId,
                isSuccessful: false,
                errorMessage: (errorMessage.status == 403) ? Resources.DeleteDashboardAccessDeniedError : errorMessage.message,
                pivot: pivot            
            });
        });
    }

    public updateDashboard(pivot: string, dashboardItem: DashboardItem): void {
        this.actions.UpdateDashboard.invoke({
            dashboardItem: dashboardItem,
            isSuccessful: true,
            pivot: pivot
        } as DashboardUpdatedPayload);
    }

    public filterView(filter: FilteredPayload): void {
        this.actions.FilterView.invoke(filter);
    }

    public clearLocalDashboardCache(): void {
        this.dataManager.clearLocalDashboardCache();
    }
}

export class DashboardsDirectoryActions {
    public ReceiveStateForPivot: Action<PivotDataReceivedPayload>;
    public ChangeColumnSortForPivot: Action<ColumnSortChangePayload>;
    public FilterView: Action<FilteredPayload>;
    public ExpandGroupRowForPivot: Action<PivotGroupTogglePayload>;
    public CollapseGroupRowForPivot: Action<PivotGroupTogglePayload>;
    public DeleteDashboard: Action<DashboardDeletedPayload>;
    public UpdateDashboard: Action<DashboardUpdatedPayload>;
    public ClearMessageForPivot: Action<string>;

    constructor() {
        this.ReceiveStateForPivot = new Action<PivotDataReceivedPayload>();
        this.FilterView = new Action<FilteredPayload>();
        this.ChangeColumnSortForPivot = new Action<ColumnSortChangePayload>();
        this.ExpandGroupRowForPivot = new Action<PivotGroupTogglePayload>();
        this.CollapseGroupRowForPivot = new Action<PivotGroupTogglePayload>();
        this.DeleteDashboard = new Action<DashboardDeletedPayload>();
        this.UpdateDashboard = new Action<DashboardUpdatedPayload>();
        this.ClearMessageForPivot = new Action<string>();
    };
}