import * as React from "react";
import { ActionsSet } from "Dashboards/Components/ActionsSet";
import { StoresSet } from "Dashboards/Components/StoresSet";
import { ActionCreatorsSet } from "Dashboards/Components/ActionCreatorsSet";
import { ManageDashboardDialogStore } from "Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialogStore";
import { ManageDashboardDialogActions } from "Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialogActions";
import { ManageDashboardDialogActionCreator } from "Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialogActionCreator";
import { getHistoryService } from "VSS/Navigation/Services";

export interface IManageDashboardDialogContext {
    /**
     * encapsulates a store to be used for the Manage dashboard dialog for a page.
     */
    store: ManageDashboardDialogStore;

    /**
     * encapsulates a action creator to be used for the Manage dashboard dialog for a page.
     */
    actionCreator: ManageDashboardDialogActionCreator;
}

/**
 * Represents the context for the Manage dashboard dialog context. It encapsulates a single instance of the context to be passed to the dialog from
 * hosting pages, allowing the same one to be used if multiple dialogs need to be managed. 
 */
export class ManageDashboardDialogContext implements IManageDashboardDialogContext {
    public store: ManageDashboardDialogStore;
    public actionCreator: ManageDashboardDialogActionCreator;

    private constructor() { }
    private static _instance: IManageDashboardDialogContext;

    public static getInstance(): IManageDashboardDialogContext {
        if (!ManageDashboardDialogContext._instance) {
            const actions = new ManageDashboardDialogActions();
            const store = new ManageDashboardDialogStore(actions);
            const actionCreators = new ManageDashboardDialogActionCreator(store, actions);
            ManageDashboardDialogContext._instance = {
                store: store,
                actionCreator: actionCreators
            };
        }

        return ManageDashboardDialogContext._instance;
    }

    public static clearInstance(): void {
        ManageDashboardDialogContext._instance = null;
    }
}