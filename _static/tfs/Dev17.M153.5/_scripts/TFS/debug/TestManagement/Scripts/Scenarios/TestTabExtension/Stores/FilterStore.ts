/// <reference types="jquery" />
import { FilterActionHub } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Actions/FilterActionHub";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import { autobind } from "OfficeFabric/Utilities";
import { TestResultsOutcomeFilterPivots, FilterByFields } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import { FilterStoreBase } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Stores/FilterStoreBase";


export class FilterStore extends FilterStoreBase {

    constructor(private _actionsHub: FilterActionHub) {
        super();
        this._initialize();
    }

    private _initialize(): void {
        this._setDefaultState();

        this._actionsHub.initializeFilterValues.addListener(this._initializeFilterData);
		this._actionsHub.onError.addListener(this._onError);
		this._actionsHub.updateFilterValues.addListener(this._appendFilterData);
    }

    private _setDefaultState() {
		this._state = {};
        this._state[FilterByFields.Outcome] = this._getResultsFieldValuesForOutcomeFilter();
    }

    @autobind
    private _initializeFilterData(fields: TCMContracts.FieldDetailsForTestResults[]){
        let fieldValuesForSelectedField: string[] = null;
        fields.forEach((field: TCMContracts.FieldDetailsForTestResults) => {
            let fieldValues = field.groupsForField as string[];
            Utils_Array.sortIfNotSorted(fieldValues, Utils_String.localeIgnoreCaseComparer);
            this._state[field.fieldName] = fieldValues;
        });
        this._state[FilterByFields.Outcome] = this._getResultsFieldValuesForOutcomeFilter();

        this.emitChanged();
	}

    @autobind
	private _appendFilterData(fields: TCMContracts.FieldDetailsForTestResults[]) {
		fields.forEach((field: TCMContracts.FieldDetailsForTestResults) => {
			let fieldValues = field.groupsForField as string[];
			Utils_Array.sortIfNotSorted(fieldValues, Utils_String.localeIgnoreCaseComparer);
			let mergedList = Utils_Array.union(fieldValues, this._state[field.fieldName]);
			
			this._state[field.fieldName] = mergedList;
		});

		this.emitChanged();
	}

    // On error adding empty field , so that dropdown does not remain in loading state.
    @autobind
    private _onError(fieldName: string){
        this._state[fieldName] = [];
    }

    private _getResultsFieldValuesForOutcomeFilter(): string[] {
        let uniqueValues = [
            TestResultsOutcomeFilterPivots.Filter_By_Failed
        ];

        if (LicenseAndFeatureFlagUtils.isAbortedRunsFeatureEnabled()) {
            uniqueValues.push(TestResultsOutcomeFilterPivots.Filter_By_Aborted);
        }

        uniqueValues.push(TestResultsOutcomeFilterPivots.Filter_By_Passed);
        
        if (LicenseAndFeatureFlagUtils.isNewOutcomeFiltersForRerunEnabled()) {
            uniqueValues.push(TestResultsOutcomeFilterPivots.Filter_By_PassedOnRerun);
        }
        uniqueValues.push(TestResultsOutcomeFilterPivots.Filter_By_NotImpacted);
        uniqueValues.push(TestResultsOutcomeFilterPivots.Filter_By_Others);

        return uniqueValues;
    }
}
