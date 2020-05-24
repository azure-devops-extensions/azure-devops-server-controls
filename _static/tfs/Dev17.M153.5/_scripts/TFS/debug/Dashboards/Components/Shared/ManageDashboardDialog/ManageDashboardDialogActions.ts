import { Dashboard } from "TFS/Dashboards/Contracts";
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import { Action } from "VSS/Flux/Action";
import { ManageDashboardState } from "Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialogModels";

export class ManageDashboardDialogActions {
    /**
    * Invoked when state data is changed e.g. it needs to be received by the store. Payload is the store state. 
    */
    public ReceiveData: Action<ManageDashboardState>;

    constructor() {
        this.ReceiveData = new Action<ManageDashboardState>();
    };
}