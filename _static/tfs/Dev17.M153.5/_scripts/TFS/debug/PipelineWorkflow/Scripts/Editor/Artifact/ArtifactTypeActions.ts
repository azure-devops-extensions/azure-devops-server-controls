import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { IKeyValuePairWithData } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactInputBase";
import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { ArtifactInputState } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";

import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";

export interface IUpdateArtifactTnputPayload {
    inputId: string;
    value?: string;
    displayValue: string;
    type: string;
    artifactId?: string;
    selectedValueKey?: string;
    options?: IKeyValuePairWithData[];
}

export interface IUpdateArtifactInputQueryPayload {
    inputChangeMetaData: IUpdateArtifactTnputPayload;
    inputQueryValues?: Contracts_FormInput.InputValuesQuery;
    data?: IDictionaryStringTo<any>;
    isRecursiveFetchingOn?: boolean;
    sourceDefinitionUrl?: string;
}

export interface IUpdateArtifactInputOptionsPayload {
    inputId: string;
    displayValue: string;
    type: string;
    artifactId?: string;
    selectedValueKey?: string;
    options?: IKeyValuePairWithData[];
}

export class ArtifactTypeActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_ArtifactTypeActionHub;
    }

    public initialize(): void {
        this._updateError = new ActionBase.Action<string>();
        this._updateArtifactInput = new ActionBase.Action<IUpdateArtifactInputQueryPayload>();
        this._updateArtifactInputValue = new ActionBase.Action<IUpdateArtifactInputQueryPayload[]>();
        this._updateArtifactInputState = new ActionBase.Action<ArtifactInputState>();
        this._updateArtifactInputOptions = new ActionBase.Action<IUpdateArtifactInputOptionsPayload>();
    }

    public get updateArtifactInput(): ActionBase.Action<IUpdateArtifactInputQueryPayload> {
        return this._updateArtifactInput;
    }

    public get updateArtifactInputValue(): ActionBase.Action<IUpdateArtifactInputQueryPayload[]> {
        return this._updateArtifactInputValue;
    }

    public get updateError(): ActionBase.Action<string> {
        return this._updateError;
    }

    public get updateArtifactInputState(): ActionBase.Action<ArtifactInputState> {
        return this._updateArtifactInputState;
    }

    public get updateArtifactInputOptions(): ActionBase.Action<IUpdateArtifactInputOptionsPayload> {
        return this._updateArtifactInputOptions;
    }

    private _updateError: ActionBase.Action<string>;
    private _updateArtifactInput: ActionBase.Action<IUpdateArtifactInputQueryPayload>;
    private _updateArtifactInputValue: ActionBase.Action<IUpdateArtifactInputQueryPayload[]>;
    private _updateArtifactInputState: ActionBase.Action<ArtifactInputState>;
    private _updateArtifactInputOptions: ActionBase.Action<IUpdateArtifactInputOptionsPayload>;
}