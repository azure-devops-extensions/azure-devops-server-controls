import { TestResultSource } from "TestManagement/Scripts/Scenarios/TestTabExtension/Sources/TestResultSource";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { IViewContextData } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import {
	FilterActionHub,
} from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Actions/FilterActionHub";
import {
	FilterActionsCreatorBase,
} from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Actions/FilterActionsCreatorBase";
import TCM_Types = require("TestManagement/Scripts/TFS.TestManagement.Types");


import * as VCBuiltInExtensions from "VersionControl/Scripts/BuiltInExtensions";
import * as Diag from "VSS/Diag";

export class FilterActionsCreator implements FilterActionsCreatorBase {
	private source: TestResultSource; 

	constructor(private _actionsHub: FilterActionHub, private _artifact: IViewContextData) {
		this.source = TestResultSource.getInstance();
	}

	// Used by the tests
	public getTestResultSource(){
		return this.source;
	}

	public fetchFilterValues(fieldName: string): void {
		let continuationToken;
		this.source.getTestResultsFieldValues(this._artifact).then((response: TCM_Types.ITestResultsFieldDetailsWithContinuationToken) => {
			continuationToken = response.continuationToken;
			this._actionsHub.initializeFilterValues.invoke(response.fieldDetails);
			if (continuationToken) {
				this._getTestResultsWithContinuationToken(continuationToken);
			}
		}, (error) => {
				this._actionsHub.onError.invoke(fieldName);
			}
		);
	}

	private _getTestResultsWithContinuationToken(continuationToken: string) {
		this.source.getTestResultsFieldValues(this._artifact, continuationToken).then((response: TCM_Types.ITestResultsFieldDetailsWithContinuationToken) => {
			continuationToken = response.continuationToken;
			this._actionsHub.updateFilterValues.invoke(response.fieldDetails);
			if (continuationToken) {
				this._getTestResultsWithContinuationToken(continuationToken);
			}
		}, (error) => {	});
	}
}
