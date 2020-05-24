import { TestResultsListToolbarActionsHub } from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsListToolbarActionsHub";

export class TestResultsListToolbarActionCreator {
	constructor(private _commandActionHub: TestResultsListToolbarActionsHub) {
	}

	public onToggleFilter(){
		this._commandActionHub.onToggleFilter.invoke(null);
	}
}
