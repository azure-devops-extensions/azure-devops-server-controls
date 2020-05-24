// Copyright (c) Microsoft Corporation.  All rights reserved.

import { PipelineEnvironmentTriggerCondition, PipelineReleaseSchedule, PipelineArtifactFilter } from "PipelineWorkflow/Scripts/Common/Types";
import { IArtifactTriggerContainer } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentArtifactTriggerStore";
import * as Types from "PipelineWorkflow/Scripts/Common/Types";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class EnvironmentTriggerComparer {
    public static areEnvironmentTriggerConditionsEqual(source: Types.IEnvironmentTriggerCondition, target: Types.IEnvironmentTriggerCondition): boolean {
        if (source && target) {
            return (source.conditionType === target.conditionType
                && source.environmentId === target.environmentId
                && Utils_String.ignoreCaseComparer(source.value, target.value) === 0);
        }

        if (!source && !target) {
            return true;
        }

        return false;
    }

    public static areConditionsEqual(source: PipelineEnvironmentTriggerCondition, target: PipelineEnvironmentTriggerCondition): boolean {
        if (source && target) {
            return (source.conditionType === target.conditionType
                && Utils_String.ignoreCaseComparer(source.name, target.name) === 0
                && Utils_String.ignoreCaseComparer(source.value, target.value) === 0);
        }

        if (!source && !target) {
            return true;
        }

        return false;
    }

    public static areArtifactTriggerContainerEqual(source: IArtifactTriggerContainer, target: IArtifactTriggerContainer): boolean {
        if (source && target) {
            return (Utils_String.ignoreCaseComparer(source.alias, target.alias) === 0 
                && (Utils_Array.arrayEquals(source.triggerConditions, target.triggerConditions, EnvironmentTriggerComparer.areArtifactFilterEqual)));
        }

        if (!source && !target) {
            return true;
        }

        return false;
    }

    public static areArtifactFilterEqual(source: PipelineArtifactFilter, target: PipelineArtifactFilter): boolean {
        if (source && target) {
            return (Utils_String.ignoreCaseComparer(source.sourceBranch, target.sourceBranch) === 0 
                && (Utils_Array.arrayEquals(source.tags, target.tags, (s: string, t: string) => Utils_String.ignoreCaseComparer(s, t) === 0)));
        }

        if (!source && !target) {
            return true;
        }

        return false;
    }
}