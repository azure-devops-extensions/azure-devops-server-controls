
import { Action } from "VSS/Flux/Action";
import { ITask } from "DistributedTasksCommon/TFS.Tasks.Types";
import {
    ITaskInputError, ITaskInputValue, ITaskInputOptions,
    ICreateProcessParameterPayload, IInitializeProcessParametersPayload, IUpdateReferencePayload,
    IRemoveTaskReferencePayload
} from "DistributedTaskControls/Common/Types";
import { ProcessParameters } from "TFS/DistributedTaskCommon/Contracts";
import { ActionsHubBase, IEmptyActionPayload, IActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

export class ProcessParameterActions extends ActionsHubBase {

    public initialize(): void {
        this._updateInput = new Action<ITaskInputValue>();
        this._updateInputError = new Action<ITaskInputError>();
        this._updateInputOptions = new Action<ITaskInputOptions>();
        this._createProcessParameter = new Action<ICreateProcessParameterPayload>();
        this._initializeProcessParameters = new Action<IInitializeProcessParametersPayload>();
        this._unlinkProcessParameter = new Action<IRemoveTaskReferencePayload>();
        this._updateReferenceCount = new Action<IUpdateReferencePayload>();
        this._removeAllProcessParameters = new Action<IEmptyActionPayload>();
    }

    public static getKey(): string {
        return ActionsKeys.ProcessParameterActions;
    }

    public get updateInput(): Action<ITaskInputValue> {
        return this._updateInput;
    }

    public get updateInputError(): Action<ITaskInputError> {
        return this._updateInputError;
    }

    public get updateInputOptions(): Action<ITaskInputOptions> {
        return this._updateInputOptions;
    }

    public get createProcessParameter(): Action<ICreateProcessParameterPayload> {
        return this._createProcessParameter;
    }

    public get initializeProcessParameters(): Action<IInitializeProcessParametersPayload> {
        return this._initializeProcessParameters;
    }

    public get updateReferenceCount(): Action<IUpdateReferencePayload> {
        return this._updateReferenceCount;
    }

    public get unlinkProcessParameter(): Action<IRemoveTaskReferencePayload> {
        return this._unlinkProcessParameter;
    }

    public get removeAllProcessParameters(): Action<IEmptyActionPayload> {
        return this._removeAllProcessParameters;
    }

    private _updateReferenceCount: Action<IUpdateReferencePayload>;
    private _updateInput: Action<ITaskInputValue>;
    private _updateInputError: Action<ITaskInputError>;
    private _updateInputOptions: Action<ITaskInputOptions>;
    private _createProcessParameter: Action<ICreateProcessParameterPayload>;
    private _initializeProcessParameters: Action<IInitializeProcessParametersPayload>;
    private _unlinkProcessParameter: Action<IRemoveTaskReferencePayload>;
    private _removeAllProcessParameters: Action<IEmptyActionPayload>;
}