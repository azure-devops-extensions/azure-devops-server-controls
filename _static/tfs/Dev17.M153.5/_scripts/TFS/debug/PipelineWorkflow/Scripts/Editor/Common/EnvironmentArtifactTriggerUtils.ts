import {
    PipelineArtifactFilter,
    PipelineEnvironmentTriggerCondition,
    PipelineEnvironmentTriggerConditionType,
    PipelineTriggerBase,
    PipelineArtifactTypes,
    PipelineArtifactSourceTrigger,
    PipelineSourceRepoTrigger
} from "PipelineWorkflow/Scripts/Common/Types";
import { IArtifactTriggerContainer } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentArtifactTriggerStore";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class EnvironmentArtifactTriggerUtils {

    public static filterArtifactTriggerConditionsFromEnvironmentTriggerConditions(environmentTriggerConditions: PipelineEnvironmentTriggerCondition[]): PipelineEnvironmentTriggerCondition[] {
        let artifactTriggerConditions: PipelineEnvironmentTriggerCondition[] = [];
        environmentTriggerConditions.forEach(condition => {
            if (condition.conditionType === PipelineEnvironmentTriggerConditionType.Artifact) {
                artifactTriggerConditions.push(condition);
            }
        });
        return artifactTriggerConditions;
    }

    public static getArtifactTriggerContainers(artifactTriggerConditions: PipelineEnvironmentTriggerCondition[]): IArtifactTriggerContainer[] {
        let artifactTriggerContainers: IArtifactTriggerContainer[] = [];
        artifactTriggerConditions.forEach(artifactTriggerCondition => {
            if (artifactTriggerCondition && !this._isArtifactTriggerConditionEmpty(artifactTriggerCondition.value)) {
                if (!this._isTriggerConditionExistForArtifact(artifactTriggerCondition, artifactTriggerContainers)) {
                    Utils_Array.add(artifactTriggerContainers, this._addTriggerConditionToNewContainer(artifactTriggerCondition));
                } else {
                    this._addTriggerConditionToExistingContainer(artifactTriggerCondition, artifactTriggerContainers);
                }
            }
        });
        return artifactTriggerContainers;
    }

    // One condition is required for one unique set of alias-branch-tag 
    public static convertTriggerToConditions(trigger: PipelineTriggerBase, artifactType: string): PipelineEnvironmentTriggerCondition[] {
        let environmentTriggerConditions: PipelineEnvironmentTriggerCondition[] = [];
        switch (artifactType) {
            case PipelineArtifactTypes.Build:
                let pipelineArtifactSourceTrigger: PipelineArtifactSourceTrigger = trigger as PipelineArtifactSourceTrigger;
                if (pipelineArtifactSourceTrigger.triggerConditions) {
                    pipelineArtifactSourceTrigger.triggerConditions.forEach(triggercondition => {
                        let condition: PipelineEnvironmentTriggerCondition = this._getDefaultArtifactCondition(pipelineArtifactSourceTrigger.artifactAlias);
                        // TFVC builds have null source branch in all cases
                        if (!triggercondition.sourceBranch) {
                            triggercondition.sourceBranch = Utils_String.empty;
                        }
                        condition.value = JSON.stringify(triggercondition);
                        environmentTriggerConditions.push(condition);
                    });
                } else {
                    environmentTriggerConditions.push(this._getDefaultArtifactCondition(pipelineArtifactSourceTrigger.artifactAlias));
                }
                break;

            case PipelineArtifactTypes.GitHubId:
            case PipelineArtifactTypes.GitId:
                let pipelineSourceRepoTrigger: PipelineSourceRepoTrigger = trigger as PipelineSourceRepoTrigger;
                if (pipelineSourceRepoTrigger.branchFilters.length === 0) {
                    environmentTriggerConditions.push(this._getDefaultArtifactCondition(pipelineSourceRepoTrigger.alias));
                }

                pipelineSourceRepoTrigger.branchFilters.forEach(branchFilter => {
                    let condition: PipelineEnvironmentTriggerCondition = this._getDefaultArtifactCondition(pipelineSourceRepoTrigger.alias);
                    // Old RD editor expects empty tags array for git/github
                    condition.value = JSON.stringify({ "sourceBranch": branchFilter, "tags": [] });
                    environmentTriggerConditions.push(condition);
                });
                break;

            default:
                break;

        }

        return environmentTriggerConditions;
    }

    private static _isArtifactTriggerConditionEmpty(data: string): boolean {
        let isEmpty: boolean = true;
        let obj = JSON.parse(data);
        let sourceBranch: string = obj[this._sourceBranch];
        let tags: string = obj[this._tags];
        if ((sourceBranch && sourceBranch.length > 0) || (tags && tags.length > 0)) {
            isEmpty = false;
        }

        return isEmpty;
    }

    private static _getDefaultArtifactCondition(alias: string): PipelineEnvironmentTriggerCondition {
        let condition: PipelineEnvironmentTriggerCondition = {
            conditionType: PipelineEnvironmentTriggerConditionType.Artifact,
            name: alias,
            value: JSON.stringify({ "sourceBranch": "", "tags": [] })
        };
        return condition;
    }

    private static _addTriggerConditionToNewContainer(artifactTriggerCondition: PipelineEnvironmentTriggerCondition): IArtifactTriggerContainer {
        let container = this._getDefaultContainer();
        container.alias = artifactTriggerCondition.name;
        container.triggerConditions.push(this._getPipelineArifactFilterFromTriggerCondition(artifactTriggerCondition.value));
        return container;
    }

    private static _getDefaultContainer(): IArtifactTriggerContainer {
        return {
            alias: null,
            triggerConditions: []
        };
    }

    private static _getPipelineArifactFilterFromTriggerCondition(data: string): PipelineArtifactFilter {
        let obj = JSON.parse(data);
        let paf: PipelineArtifactFilter = {
            sourceBranch: null,
            tags: [],
            useBuildDefinitionBranch: false,
            createReleaseOnBuildTagging: false
        };
        paf.sourceBranch = obj[this._sourceBranch];
        if (obj[this._tags]) {
            paf.tags = obj[this._tags];
        }
        return paf;
    }

    private static _isTriggerConditionExistForArtifact(artifactTriggerCondition: PipelineEnvironmentTriggerCondition, artifactTriggerContainers: IArtifactTriggerContainer[]): boolean {
        return artifactTriggerContainers.some(container => Utils_String.localeIgnoreCaseComparer(container.alias, artifactTriggerCondition.name) === 0);
    }

    private static _addTriggerConditionToExistingContainer(artifactTriggerCondition: PipelineEnvironmentTriggerCondition, artifactTriggerContainers: IArtifactTriggerContainer[]): void {
        artifactTriggerContainers.forEach(container => {
            if (Utils_String.localeIgnoreCaseComparer(container.alias, artifactTriggerCondition.name) === 0) {
                container.triggerConditions.push(this._getPipelineArifactFilterFromTriggerCondition(artifactTriggerCondition.value));
            }
        });
    }
    private static _sourceBranch: string = "sourceBranch";
    private static _tags: string = "tags";
}