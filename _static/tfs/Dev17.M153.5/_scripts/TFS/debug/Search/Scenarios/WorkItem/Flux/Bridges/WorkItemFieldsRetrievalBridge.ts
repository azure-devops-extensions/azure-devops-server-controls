import * as _WorkItemFieldsSource from "Search/Scenarios/WorkItem/Flux/Sources/WorkItemFieldsSource";
import { AggregatedState } from "Search/Scenarios/WorkItem/Flux/StoresHub";
import { IWITFieldWrapper } from "Search/Scenarios/WorkItem/Flux/ActionsHub"

export interface WorkItemFieldsRetrievalInvokers {
    workItemFieldsRetrieved: (text: string, fields: IWITFieldWrapper[]) => void;

    workItemFieldsRetrievalFailed: (error: any) => void;

    handleSuggestionText: (text: string) => void;
}

/**
 * Implementation of action creators that retrieve area paths.
 */
export class WorkItemFieldsRetrievalBridge {
    constructor(
        private readonly invokers: WorkItemFieldsRetrievalInvokers,
        private readonly workItemFieldsSource: _WorkItemFieldsSource.WorkItemFieldsSource,
        private readonly getAggregatedState: () => AggregatedState) {
    }

    public getFields = (project: string, searchText: string): void => {
        const { helpStoreState } = this.getAggregatedState();
        const knownFieds = helpStoreState.fields

        if (knownFieds.length) {
            this.invokers.handleSuggestionText(searchText);
        }
        else {
            //ToDo: Add retrieval failed scenarios.
            this.workItemFieldsSource
                .getFields(project)
                .then(fields =>
                    this.invokers.workItemFieldsRetrieved(searchText, fields), error => this.invokers.workItemFieldsRetrievalFailed(error));
        }
    }
}
