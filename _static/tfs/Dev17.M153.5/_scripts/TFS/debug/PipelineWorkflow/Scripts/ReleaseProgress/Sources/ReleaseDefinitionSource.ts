/**
 * @brief Source for All Definitions
 */
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import { ReleaseManagementSourceBase } from "PipelineWorkflow/Scripts/Common/Sources/ReleaseManagementSourceBase";
import { PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";

export class ReleaseDefinitionSource extends ReleaseManagementSourceBase {

    public static getKey(): string {
        return "ReleaseDefinitionSource";
    }

    public static instance(): ReleaseDefinitionSource {
        return SourceManager.getSource(ReleaseDefinitionSource);
    }

    public getReleaseDefinition(definitionId: number, forceFetch: boolean = false): IPromise<PipelineDefinition> {
        if (forceFetch || !this._getReleaseDefinitionPromise[definitionId]) {
            this._getReleaseDefinitionPromise[definitionId] = this.getClient().getDefinition(definitionId);
        }

        return this._getReleaseDefinitionPromise[definitionId];
    }

    private _getReleaseDefinitionPromise: IDictionaryNumberTo<IPromise<PipelineDefinition>> = {};
}