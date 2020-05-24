
import { IErrorState, ITemplateDefinition } from "DistributedTaskControls/Common/Types";
import { ITemplatesSource } from "DistributedTaskControls/Sources/TemplatesSource";
import * as Actions from "DistributedTaskControls/Actions/TemplateActions";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { ActionsHubManager} from "DistributedTaskControls/Common/Actions/ActionsHubManager";

export class TemplateActionsCreator extends ActionsBase.ActionCreatorBase {

    constructor() {
        super();
    }

    public static getKey(): string {
        return ActionCreatorKeys.TemplateActionsCreator;
    }

    public initialize() {
        this._actions = ActionsHubManager.GetActionsHub<Actions.TemplateActions>(Actions.TemplateActions);
    }

    public updateTemplateList(templatesSource: ITemplatesSource, preserveFilter: boolean, forceRefresh?: boolean): IPromise<any> {
        let templatesPromise = templatesSource.updateTemplateList(forceRefresh);
        templatesPromise.then((templateItems: ITemplateDefinition[]) => {
            this._actions.updateTemplateList.invoke({ templates: templateItems, preserveFilter: preserveFilter });
        });
        return templatesPromise;
    }

    public filterTemplateList(filter: string): void {
        this._actions.filterTemplateList.invoke(filter);
    }

    public deleteTemplate(templateSource: ITemplatesSource, preserveFilter: boolean, templateId: string): IPromise<any> {
        return templateSource.deleteTemplate(templateId).then(() => {
            templateSource.updateTemplateList(true).then((templateItems: ITemplateDefinition[]) => {
                this._actions.updateTemplateList.invoke({ templates: templateItems, preserveFilter: preserveFilter });
            }, (error) => {
                this._actions.showTemplateErrorMessage.invoke({
                    errorMessage: error.message || error,
                    errorStatusCode: error.status
                });
            });
        }, (error) => {
            this._actions.showTemplateErrorMessage.invoke({
                errorMessage: error.message || error,
                errorStatusCode: error.status
            });
        });
    }

    public dismissTemplateErrorMessage(): void {
        this._actions.dismissTemplateErrorMessage.invoke({});
    }

    public showTemplateErrorMessage(errorState: IErrorState): void {
        this._actions.showTemplateErrorMessage.invoke(errorState);
    }

    private _actions: Actions.TemplateActions;
}