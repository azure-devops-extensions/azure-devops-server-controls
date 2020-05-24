import { Dashboard } from "TFS/Dashboards/Contracts";
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import { Action } from "VSS/Flux/Action";
import { CreateDashboardState } from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialogModels";

export class CreateDashboardDialogActions {
    /**
    * Invoked when state data is changed e.g. it needs to be received by the store. Payload is the store state. 
    */
    public ReceiveData: Action<CreateDashboardState>;

    constructor() {
        this.ReceiveData = new Action<CreateDashboardState>();
    };
}