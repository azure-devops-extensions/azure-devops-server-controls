/**
 * @brief Source for functionality related to History
 */

import { BuildDefinitionSource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildDefinitionSource";

import { Singleton } from "DistributedTaskControls/Common/Factory";
import { IHistorySource } from "DistributedTaskControls/Sources/HistorySource";
import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

export class BuildHistorySource extends SourceBase implements IHistorySource {

    public static getKey(): string {
        return "BuildHistorySource";
    }

    public getDefinitionRevision(definitionId: number, revision: number): IPromise<string> {
        return BuildDefinitionSource.instance().getRevisionDocument(definitionId, revision);
    }

    public static instance(): BuildHistorySource {
        return SourceManager.getSource(BuildHistorySource);
    }
}
