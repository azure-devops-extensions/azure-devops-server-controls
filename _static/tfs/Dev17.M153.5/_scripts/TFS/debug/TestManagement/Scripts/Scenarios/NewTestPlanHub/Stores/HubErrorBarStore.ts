import { autobind } from "OfficeFabric/Utilities";
import { Store as VSSStore } from "VSS/Flux/Store";

import {
    TestPlanDirectoryActionsHub
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/TestPlanDirectoryActionsHub";
import { IHubErrorMessageState } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";

export class HubErrorBarStore extends VSSStore {

    public static getInstance() {
        if (!HubErrorBarStore._instance) {
            HubErrorBarStore._instance = new HubErrorBarStore(TestPlanDirectoryActionsHub.getInstance());
        }
        return HubErrorBarStore._instance;
    }

    private static _instance: HubErrorBarStore;
    private _errorMessage: string;

    constructor(actionsHub: TestPlanDirectoryActionsHub) {
        super();
        actionsHub.showErrorMessage.addListener(this._handleShowErrorMessage);
    }

    /**
     *  get requried state for hub error bar
     */
    public getState(): IHubErrorMessageState {
        return {
            errorMessage: this._errorMessage
        };
    }

    /**
     * Handle show error messgae on error hub bar
     * @param groupKey
     */
    @autobind
    private _handleShowErrorMessage(error: Error): void {
        this._errorMessage = error.message;
        this.emitChanged();
    }
}