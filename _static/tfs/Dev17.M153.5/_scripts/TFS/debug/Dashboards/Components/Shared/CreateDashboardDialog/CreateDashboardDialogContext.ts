import * as React from "react";
import { ActionsSet } from "Dashboards/Components/ActionsSet";
import { StoresSet } from "Dashboards/Components/StoresSet";
import { ActionCreatorsSet } from "Dashboards/Components/ActionCreatorsSet";
import { CreateDashboardDialogStore } from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialogStore";
import { CreateDashboardDialogActions } from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialogActions";
import { CreateDashboardDialogActionCreator } from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialogActionCreator";
import { getHistoryService } from "VSS/Navigation/Services";

export interface ICreateDashboardDialogContext {
    /**
     * encapsulates a store to be used for the create dashboard dialog for a page.
     */
    store: CreateDashboardDialogStore;

    /**
     * encapsulates a action creator to be used for the create dashboard dialog for a page.
     */
    actionCreator: CreateDashboardDialogActionCreator;
}

/**
 * Represents the context for the create dashboard dialog context. It encapsulates a single instance of the context to be passed to the dialog from
 * hosting pages, allowing the same one to be used if multiple dialogs need to be managed. 
 */
export class CreateDashboardDialogContext implements ICreateDashboardDialogContext {
    public store: CreateDashboardDialogStore;
    public actionCreator: CreateDashboardDialogActionCreator;

    private constructor() { }
    private static _instance: ICreateDashboardDialogContext;

    public static getInstance(): ICreateDashboardDialogContext {
        if (!CreateDashboardDialogContext._instance) {
            const actions = new CreateDashboardDialogActions();
            const store = new CreateDashboardDialogStore(actions);
            const actionCreators = new CreateDashboardDialogActionCreator(store, actions);
            CreateDashboardDialogContext._instance = {
                store: store,
                actionCreator: actionCreators
            };
        }

        return CreateDashboardDialogContext._instance;
    }

    public static clearInstance(): void {
        CreateDashboardDialogContext._instance = null;
    }
}