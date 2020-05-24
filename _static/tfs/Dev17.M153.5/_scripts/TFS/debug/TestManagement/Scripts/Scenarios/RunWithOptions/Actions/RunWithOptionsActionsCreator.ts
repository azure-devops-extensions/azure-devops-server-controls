import * as Q from "q";
import { RunWithOptionsActionsHub } from "TestManagement/Scripts/Scenarios/RunWithOptions/Actions/RunWithOptionsActionsHub";
import { RunWithOptionsSource } from "TestManagement/Scripts/Scenarios/RunWithOptions/Sources/RunWithOptionsSource";


export class RunWithOptionsActionsCreator {

    constructor(private _actionsHub: RunWithOptionsActionsHub, private _source: RunWithOptionsSource) {
    }

    public closeDialog(): void {
        this._actionsHub.closeDialog.invoke(null);
    }

    private _handleError(error: Error) {
        this._actionsHub.onError.invoke(error.message || error.toString());
    }

    public closeErrorMessage(): void {
        this._actionsHub.onErrorMessageClose.invoke(null);
    }
}
