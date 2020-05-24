import * as VSSStore from "VSS/Flux/Store";
import { ManageDashboardDialogActions } from "Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialogActions";
import { ManageDashboardState } from "Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialogModels";
import * as Utils_String from "VSS/Utils/String";

export class ManageDashboardDialogStore extends VSSStore.Store {
    protected state: ManageDashboardState;
    protected actions: ManageDashboardDialogActions;
    protected receivedDataHandler: (data: ManageDashboardState) => void;

    constructor(actions: ManageDashboardDialogActions) {
        super();
        this.state = { 
        } as ManageDashboardState;
        this.actions = actions;
        this.receivedDataHandler = (data: ManageDashboardState) => this.receivedManageDialogData(data);
        this.actions.ReceiveData.addListener(this.receivedDataHandler);
    }

    private receivedManageDialogData(state: ManageDashboardState) {
        this.state = state;
        this.emitChanged();
    }

    public getState(): ManageDashboardState {
        return this.state;
    }
}