import * as  _ColorsDataSource from "Search/Scenarios/WorkItem/Flux/Sources/ColorsDataSource";
import { WorkItemResult } from "Search/Scenarios/WebApi/WorkItem.Contracts";
import { ColorsDataPayload } from "Search/Scenarios/WorkItem/Flux/ActionsHub";

export interface ColorsDataRetrievalInvokers {
    colorsDataRetrieved: (colorsData: ColorsDataPayload) => void;
}

export class ColorsDataRetrievalBridge {
    constructor(
        private readonly invokers: ColorsDataRetrievalInvokers,
        private readonly colorsDataSource: _ColorsDataSource.ColorsDataSource
    ) {
    }

    public getColorsData = (items: WorkItemResult[]) => {
        if (items.length > 0) {
            this.colorsDataSource
                .getColorsData(items)
                .then((colorsData: ColorsDataPayload) => {
                    this.invokers.colorsDataRetrieved(colorsData);
                });
        }
    }
}