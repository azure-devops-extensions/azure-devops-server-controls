/**
 * @brief Source for functionality related to History
 */

import { Singleton } from "DistributedTaskControls/Common/Factory";
import { ServiceClientManager } from "DistributedTaskControls/Common/Service/ServiceClientManager";
import { IHistorySource } from "DistributedTaskControls/Sources/HistorySource";

import { DeployPipelineDefinitionSource } from "PipelineWorkflow/Scripts/Editor/Sources/DeployPipelineDefinitionSource";
import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

export class PipelineHistorySource extends SourceBase implements IHistorySource {

    public static getKey(): string {
        return "PipelineHistorySource";
    }
    
    public getDefinitionRevision(definitionId: number, revision: number): IPromise<string> {
        return DeployPipelineDefinitionSource.instance().getDefinitionRevision(definitionId, revision);
    }

    public static instance(): PipelineHistorySource {
        return SourceManager.getSource(PipelineHistorySource);
    }
}
