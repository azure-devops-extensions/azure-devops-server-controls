import { IErrorState, ITemplatesPayload } from "DistributedTaskControls/Common/Types";
import { Action } from "VSS/Flux/Action";
import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

export class TemplateActions extends ActionsHubBase {

    public initialize(): void {
        this._updateTemplateList = new Action<ITemplatesPayload>();
        this._filterTemplateList = new Action<string>();
        this._showTemplateErrorMessage = new Action<IErrorState>();
        this._dismissTemplateErrorMessage = new Action<IEmptyActionPayload>();
    }

    public static getKey(): string {
        return ActionsKeys.TemplateActions;
    }

    public get updateTemplateList(): Action<ITemplatesPayload> {
        return this._updateTemplateList;
    }

    public get filterTemplateList(): Action<string> {
        return this._filterTemplateList;
    }

    public get showTemplateErrorMessage(): Action<IErrorState> {
        return this._showTemplateErrorMessage;
    }

    public get dismissTemplateErrorMessage(): Action<IEmptyActionPayload> {
        return this._dismissTemplateErrorMessage;
    }

    private _updateTemplateList: Action<ITemplatesPayload>;
    private _filterTemplateList: Action<string>;
    private _showTemplateErrorMessage: Action<IErrorState>;
    private _dismissTemplateErrorMessage: Action<IEmptyActionPayload>;
}