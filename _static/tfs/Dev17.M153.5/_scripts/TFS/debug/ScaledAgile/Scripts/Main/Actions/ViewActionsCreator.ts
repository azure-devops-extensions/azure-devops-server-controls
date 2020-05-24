import * as Q from "q";
import { ViewsActions } from "ScaledAgile/Scripts/Main/Actions/ViewsActions";
import { IViewsDataProvider } from "ScaledAgile/Scripts/Main/DataProviders/IViewsDataProvider";

import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

import { Message, StateChangeParams } from "ScaledAgile/Scripts/Shared/Models/PageImplementations";
import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { PageLoadingState, IMessageLink } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { IViewsStoreData } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { getPlansDirectoryUrl } from "ScaledAgile/Scripts/Shared/Utils/PlanXhrNavigationUtils"

/**
 * Views and plan actions
 */
export interface IViewActionsCreator {
    /**
     * Initialize the views : Get all possibles view created for the current user. This action will invoke
     * an action with a payload that contain different view.
     * @param {string} planId - The plan ID. Could be valid or not.
     */
    initializeViewsStore(planId: string): void;

    /**
     * Handles an error that occurred in the base page, e.g. favorites issues
     */
    displayError(message: string);
}

/**
 * Contains the creation of action for every views on ScaledAgile
 */
export class ViewActionsCreator implements IViewActionsCreator {
    private _viewsDataProvider: IViewsDataProvider;
    private _actions: ViewsActions;
    private _sharedPageActions: PageActions;

    constructor(viewsDataProvider: IViewsDataProvider, actions: ViewsActions, sharedPageActions: PageActions) {
        this._viewsDataProvider = viewsDataProvider;
        this._actions = actions;
        this._sharedPageActions = sharedPageActions;
    }

    /**
     * Get the plan to figure out the type of plan we will be loaded. PlanPage will init() on the plan's type.
     */
    public initializeViewsStore(planId: string): void {
        Q(this._viewsDataProvider.getPlan(planId))
            .done((data: IViewsStoreData) => { this._actions.initialize.invoke(data); },
            (reason: Error) => { this._fatalErrorHandler(reason); });
    }
    
    public displayError(message: string) {
        this._sharedPageActions.setPageMessage.invoke(new Message(MessageBarType.error, message, true));
    }

    /**
     * Handles an error that is considered "fatal", i.e. one which may prevent the page from loading.
     * 
     * @param error The error that occurred
     */
    private _fatalErrorHandler(error: Error): void {
        const link: IMessageLink = {
            href: getPlansDirectoryUrl(),
            text: ScaledAgileResources.PlanErrorBannerBackToDirectoryLinkText
        };
        const message = new Message(MessageBarType.error, error.message, false, link);
        this._sharedPageActions.setPageLoadingStateWithMessage.invoke(new StateChangeParams(PageLoadingState.Fail, message));
    }
}
