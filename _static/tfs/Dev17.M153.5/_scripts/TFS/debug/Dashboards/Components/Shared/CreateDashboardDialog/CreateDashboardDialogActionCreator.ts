import Q = require("q");
import * as Utils_Array from "VSS/Utils/Array";
import { getClient } from "VSS/Service";
import { Dashboard } from "TFS/Dashboards/Contracts";
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import { CoreHttpClient4 } from "TFS/Core/RestClient";
import * as TFS_Rest_Utils from "Presentation/Scripts/TFS/TFS.Rest.Utils";
import { Action } from "VSS/Flux/Action";
import { CreateDashboardState } from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialogModels";
import { CreateDashboardDialogStore } from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialogStore";
import { CreateDashboardDialogActions } from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialogActions";
import { CreateDashboardDialogDataManager } from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialogDataManager";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

export class CreateDashboardDialogActionCreator {
    private store: CreateDashboardDialogStore;
    private dataManager: CreateDashboardDialogDataManager;
    private actions: CreateDashboardDialogActions;

    constructor(store: CreateDashboardDialogStore, actions: CreateDashboardDialogActions) {
        this.store = store;
        this.dataManager = new CreateDashboardDialogDataManager();
        this.actions = actions;
    }

    public loadTeamsForPicker(): void {
        let state = this.store.getState();
        let projectId = TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.id;
        let getAllTeams = (top: number, skip: number) => getClient(CoreHttpClient4).getTeams(projectId, top, skip);
        const getMyTeams = this.dataManager.getTeams();
        Q.all([
            getMyTeams,
            TFS_Rest_Utils.batchGet(getAllTeams, 500)
        ]).then(results => {
            state.teamsMine = results[0];
            // If a team is already in the "mine" group,remove it from the "all" group
            state.teamsAll = results[1].filter(teamAll =>
                !Utils_Array.first(state.teamsMine, teamMine => teamAll.id == teamMine.id)
            );
            state.teamsLoaded = true;
            this.actions.ReceiveData.invoke(state);
        }, (error) => {
            state.error = error.message;
            this.actions.ReceiveData.invoke(state);
        });
    }

    public createDashboard(dashboard: Dashboard, teamContext: TFS_Core_Contracts.TeamContext): void {
        let state = this.store.getState();
        this.dataManager.createDashboard(dashboard, teamContext).then((dashboard: Dashboard) => {
            state.dashboard = $.extend(true, {}, dashboard, teamContext);
            state.error = null;
            this.actions.ReceiveData.invoke(state);
        }, (error) => {
            state.error = error.message;
            this.actions.ReceiveData.invoke(state);
       });
    }


}