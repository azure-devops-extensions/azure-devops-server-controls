import * as Array from "VSS/Utils/Array";
import * as Diag from "VSS/Diag";

import { WorkItemTypesFilter, WorkItemTypesFilterUtilities } from "Analytics/Scripts/Controls/ConfigUIContracts";

import { IWorkContext } from "Widgets/Scripts/Work/Framework/WorkContext";

import { WitPickerConfigProperty } from "Widgets/Scripts/Work/Components/WitPickerConfigProperty";

import * as AnalyticsResources from "Analytics/Resources/TFS.Resources.Analytics";

/**
 * The WitPicker component re-uses controls from the Analytics Control Library (Analytics/Scripts/Controls).
 *
 * Those controls use contracts that vary from the contracts in WitPickerConfigProperty
 *
 * This class translates between these contracts.
 */
export class WitPickerTranslator {

    constructor(
        private workContext: IWorkContext,
        private propertyName: string) {
    }

    fromClientWitTypeFilters(clientFilters: WorkItemTypesFilter[]): WitPickerConfigProperty {
        if (!clientFilters) {
            return []
        }
        return clientFilters;
    }

    getClientWitTypeFilters(properties: IDictionaryStringTo<any>): WorkItemTypesFilter[] {
        let selectedWitTypesFilter = this.getSelectedWitType(properties);

        let witTypesFilterWithValue = WorkItemTypesFilterUtilities.filterWorkItemTypes(selectedWitTypesFilter);
        let existingWorkItemTypes = this.getAllowedWitTypes(properties)
        this.setWitFilterErrors(witTypesFilterWithValue, existingWorkItemTypes);

        let backlogConfigurationFilterWithValue = WorkItemTypesFilterUtilities.filterBacklogTypes(selectedWitTypesFilter);
        let existingBacklogConfigurationTypes = this.getAllowedBacklogConfigurations(properties);
        this.setWitFilterErrors(backlogConfigurationFilterWithValue, existingBacklogConfigurationTypes);

        return selectedWitTypesFilter;
    }

    private getAllowedWitTypes(properties: IDictionaryStringTo<any>): string[] {
        let existingWitTypes = this.workContext.selector.getWitTypes(properties);
        return existingWitTypes.map(wit => wit.name);
    }

    private getAllowedBacklogConfigurations(properties: IDictionaryStringTo<any>): string[] {
        let existingBacklogConfigurationTypes = this.workContext.selector.getBacklogConfigurations(properties);
        return existingBacklogConfigurationTypes.map(wit => wit.name);
    }

    private setWitFilterErrors(filters: WorkItemTypesFilter[], allowedValues: string[]): void {
        for (const filter of filters) {
            filter.errorMessage = null;

            if (filter == null) {
                Diag.logError("An unset work item types filter was found");
            } else if (WorkItemTypesFilterUtilities.workItemTypesFilterIsBacklogFilter(filter) && !allowedValues.some(value => value === filter.backlogName)) {
                filter.errorMessage = AnalyticsResources.BacklogDoesNotExist;
            } else if (WorkItemTypesFilterUtilities.workItemTypesFilterIsTypeFilter(filter) && !allowedValues.some(value => value === filter.workItemTypeName)) {
                filter.errorMessage = AnalyticsResources.WorkItemTypeDoesNotExist;
            }
        }
    }

    private getSelectedWitType(properties: IDictionaryStringTo<any>): WitPickerConfigProperty {
        return properties[this.propertyName] as WitPickerConfigProperty;
    }
}
