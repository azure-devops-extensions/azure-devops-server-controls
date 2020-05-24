import * as Q from "q";

import { MessageBarType } from "OfficeFabric/MessageBar";

import { IPlansDataProvider } from "ScaledAgile/Scripts/Shared/DataProviders/IPlansDataProvider";
import { WizardActions } from "ScaledAgile/Scripts/Views/Wizard/Actions/WizardActions";
import { IViewData, ICreateViewPayload } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { Plan, CreatePlan } from "TFS/Work/Contracts";
import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { PageLoadingState } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { Message } from "ScaledAgile/Scripts/Shared/Models/PageImplementations";
import { onClickNavigationHandler, getPlanURL } from "ScaledAgile/Scripts/Shared/Utils/PlanXhrNavigationUtils";

export interface IWizardActionCreator {
    /**
     * Initialize the wizard store
     */
    initializeStore(initialSetting: IViewData): void;

    /**
     * Create the given plan and, when done, navigate the the new view.
     */
    createPlan(payload: ICreateViewPayload): void;

    /**
     * The name of the view changed
     */
    nameChanged(name: string): void;

    /**
     * The description of the view changed
     */
    descriptionChanged(name: string): void;
}

/**
 * Contains the creation of action for every views on ScaledAgile
 */
export class WizardActionCreator implements IWizardActionCreator {
    private _plansDataProvider: IPlansDataProvider;
    private _actions: WizardActions;
    private _pageActions: PageActions;

    constructor(plansDataProvider: IPlansDataProvider, actions: WizardActions, pageActions: PageActions) {
        this._actions = actions;
        this._pageActions = pageActions;
        this._plansDataProvider = plansDataProvider;
    }

    /**
     * initializeStore is used for update the view scenarios in the future, not used for create for now
     */
    public initializeStore(initialSetting: IViewData) {
        //The initialization doesn't have any asynchronous calls and React doesn't allow to have action that call action.
        setTimeout(() => {
            this._pageActions.setPageLoadingState.invoke(PageLoadingState.FullyLoaded);
        }, 0);
    }

    /**
     * See IWizardActionCreator.createPlan
     */
    public createPlan(plan: ICreateViewPayload): void {
        let planDetails = {
            name: plan.name,
            description: plan.description,
            type: plan.viewType,
            properties: plan.viewProperties
        } as CreatePlan;

        this._actions.onBeginSave.invoke(null);

        Q(this._plansDataProvider.createPlan(planDetails)).done(
            (createdPlan: Plan) => { this._onCreatePlanSucceeded(createdPlan); },
            (error: Error) => { this._errorHandler(error); }
        );
    }

    /**
     * The name of the view changed
     */
    public nameChanged(name: string) {
        this._actions.nameChanged.invoke(name);
    }

    /**
     * The description of the view changed
     */
    public descriptionChanged(description: string) {
        this._actions.descriptionChanged.invoke(description);
    }

    public _onCreatePlanSucceeded(plan: Plan) {
        // Don't bother invoking _actions.onEndSave and re-rendering since we are navigating anyway.
        const url = getPlanURL(plan.id);
        // If the onClickNavigationHandler handler doesn't handle this event, then we would trigger page navigation.
        // This would happen when "VisualStudio.Services.WebAccess.XHRHubSwitching" has not been turned on.
        if (onClickNavigationHandler(url)) {
            window.location.href = url;
        }
    }

    public _errorHandler(error: TfsError) {
        this._actions.onEndSave.invoke(null);
        this._pageActions.setPageMessage.invoke(new Message(MessageBarType.error, error.message, false));
    }
}
