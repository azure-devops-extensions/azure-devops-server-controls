// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { IDuration } from "DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";

import { PipelineEnvironmentGatesStep } from "PipelineWorkflow/Scripts/Common/Types";

import { ApprovalExecutionOrder as PipelineApprovalExecutionOrder } from "ReleaseManagement/Core/Contracts";

export interface IPayloadUpdateGates {
    gatesStep: PipelineEnvironmentGatesStep;
    approvalExecutionOrder: PipelineApprovalExecutionOrder;
}

export interface IGateListOptions {
    timeout: IDuration;
    samplingInterval: IDuration;
    approvalExecutionOrder: PipelineApprovalExecutionOrder;
    minimumSuccessDuration: IDuration;
}

export interface IGateListOptionsErrorMessages {
    samplingIntervalErrorMessage?: string;
    timeoutErrorMessage?: string;
    minimumSuccessDurationErrorMessage?: string;
}