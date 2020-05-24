import {IBuildFilter} from "Build.Common/Scripts/ClientContracts";

import {Action} from "VSS/Flux/Action";

export interface HistoryUpdatedPayload {
    filter: IBuildFilter;
    append: boolean;
    buildIds: number[];
    continuationToken: string;
}
export var historyUpdated = new Action<HistoryUpdatedPayload>();