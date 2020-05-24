import Q = require("q");
import * as Utils_Array from "VSS/Utils/Array";
import { Dashboard } from "TFS/Dashboards/Contracts";
import TFS_Core_RestClient = require("TFS/Core/RestClient");
import { TeamContext } from "TFS/Core/Contracts";

import { Action } from "VSS/Flux/Action";

import { ManageDashboardState } from "Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialogModels";
import { ManageDashboardDialogStore } from "Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialogStore";
import { ManageDashboardDialogActions } from "Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialogActions";
import { ManageDashboardDialogDataManager } from "Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialogDataManager";

export class ManageDashboardDialogActionCreator {
    private store: ManageDashboardDialogStore;
    private dataManager: ManageDashboardDialogDataManager;
    private actions: ManageDashboardDialogActions;

    constructor(store: ManageDashboardDialogStore, actions: ManageDashboardDialogActions) {
        this.store = store;
        this.dataManager = new ManageDashboardDialogDataManager();
        this.actions = actions;
    }

    public manageDashboard(activeDashboard: Dashboard, teamContext: TeamContext, onSaveCallback: (dashboard: Dashboard) => void): void {
        let state = this.store.getState(); 

        this.dataManager.manageDashboard(activeDashboard, teamContext).then((dashboard: Dashboard) => {
            onSaveCallback(activeDashboard);
            state.error = null;
            state.dashboardReceived = dashboard;
            this.actions.ReceiveData.invoke(state);
        }, (error) => {
            state.error = error.message;
            this.actions.ReceiveData.invoke(state);
       });
    }

    
}