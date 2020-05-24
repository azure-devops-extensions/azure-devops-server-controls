/**
 * @brief Source for functionality related to History
 */
import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { IHistorySource } from "DistributedTaskControls/Sources/HistorySource";

import { ReleaseSource } from "PipelineWorkflow/Scripts/Shared/Sources/ReleaseSource";

export class ReleaseHistorySource extends SourceBase implements IHistorySource {

    public static getKey(): string {
        return "ReleaseHistorySource";
    }

    public getDefinitionRevision(releaseId: number, revision: number): IPromise<string> {
        return ReleaseSource.instance().getReleaseRevision(releaseId, revision);
    }

    public static instance(): ReleaseHistorySource {
        return SourceManager.getSource(ReleaseHistorySource);
    }
}
