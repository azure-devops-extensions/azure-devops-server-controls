// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { IPayloadUpdateGates } from "PipelineWorkflow/Scripts/Editor/Environment/Types";

import { ApprovalExecutionOrder as PipelineApprovalExecutionOrder } from "ReleaseManagement/Core/Contracts";

import { TaskDefinition as GateDefinition } from "TFS/DistributedTask/Contracts";
import { IDuration } from "DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";

export abstract class GatesActionsHub extends ActionBase.ActionsHubBase {
    public initialize(): void {
        this._updateGatesState = new ActionBase.Action<boolean>();
        this._updateStabilizationTime = new ActionBase.Action<IDuration>();
        this._updateTimeout = new ActionBase.Action<IDuration>();
        this._updateSamplingInterval = new ActionBase.Action<IDuration>();
        this._updateMinimumSuccessDuration = new ActionBase.Action<IDuration>();
        this._updateApprovalExecutionOrder = new ActionBase.Action<PipelineApprovalExecutionOrder>();
        this._updateGateDefinitions = new ActionBase.Action<GateDefinition[]>();
        this._updateGatesData = new ActionBase.Action<IPayloadUpdateGates>();
    }

    public get updateGatesState(): ActionBase.Action<boolean> {
        return this._updateGatesState;
    }

    public get updateStabilizationTime(): ActionBase.Action<IDuration> {
        return this._updateStabilizationTime;
    }

    public get updateTimeout(): ActionBase.Action<IDuration> {
        return this._updateTimeout;
    }

    public get updateSamplingInterval(): ActionBase.Action<IDuration> {
        return this._updateSamplingInterval;
    }

    public get updateMinimumSuccessDuration(): ActionBase.Action<IDuration> {
        return this._updateMinimumSuccessDuration;
    }

    public get updateApprovalExecutionOrder(): ActionBase.Action<PipelineApprovalExecutionOrder> {
        return this._updateApprovalExecutionOrder;
    }

    public get updateGateDefinitions(): ActionBase.Action<GateDefinition[]> {
        return this._updateGateDefinitions;
    }

    public get updateGatesData(): ActionBase.Action<IPayloadUpdateGates> {
        return this._updateGatesData;
    }

    private _updateGatesState: ActionBase.Action<boolean>;
    private _updateStabilizationTime: ActionBase.Action<IDuration>;
    private _updateTimeout: ActionBase.Action<IDuration>;
    private _updateSamplingInterval: ActionBase.Action<IDuration>;
    private _updateMinimumSuccessDuration: ActionBase.Action<IDuration>;
    private _updateApprovalExecutionOrder: ActionBase.Action<PipelineApprovalExecutionOrder>;
    private _updateGateDefinitions: ActionBase.Action<GateDefinition[]>;
    private _updateGatesData: ActionBase.Action<IPayloadUpdateGates>;
}