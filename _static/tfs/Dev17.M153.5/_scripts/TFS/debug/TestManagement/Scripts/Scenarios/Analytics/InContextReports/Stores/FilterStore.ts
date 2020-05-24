import { autobind } from "OfficeFabric/Utilities";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import { FilterActionHub } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Actions/FilterActionHub";
import { FilterStoreBase } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Stores/FilterStoreBase";
import { FilterValueItem } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";

export class FilterStore extends FilterStoreBase {

    constructor(private instanceId?: string, private _actionsHub?: FilterActionHub) {
        super();
        this._initialize();
    }

    public static getInstance(instanceId?: string, actionsHub?: FilterActionHub): FilterStore {
        return FluxFactory.instance().get(FilterStore, instanceId, actionsHub);
    }

    public static getKey(): string {
        return "FilterStore";
	}

    public dispose(): void {
        this._actionsHub.initializeFilterValues.removeListener(this._initializeFilterData);      
    }

    private _initialize(): void {
        this._state = {};

        this._actionsHub.initializeFilterValues.addListener(this._initializeFilterData);
    }

    @autobind
    private _initializeFilterData(fields: TCMContracts.FieldDetailsForTestResults[]): void {
        fields.forEach((field: TCMContracts.FieldDetailsForTestResults) => {
            const fieldValues: FilterValueItem[] = [];

            if (field.groupsForField) {
                field.groupsForField.forEach((g: FilterValueItem) => {
                    fieldValues.push(new FilterValueItem(g.value, g.displayValue));
                });
            }
            this._state[field.fieldName] = fieldValues;
        });

        this.emitChanged();
    }
}