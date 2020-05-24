import * as VSSStore from "VSS/Flux/Store";
import { CreateDashboardDialogActions } from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialogActions";
import { CreateDashboardState } from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialogModels";
import * as Utils_String from "VSS/Utils/String";

export class CreateDashboardDialogStore extends VSSStore.Store {
    protected state: CreateDashboardState;
    protected actions: CreateDashboardDialogActions;
    protected receivedDataHandler: (data: CreateDashboardState) => void;

    constructor(actions: CreateDashboardDialogActions) {
        super();
        this.state = { 
            teamsMine: [],
            teamsAll: [],
        } as CreateDashboardState;
        this.actions = actions;
        this.receivedDataHandler = (data: CreateDashboardState) => this.receivedCreateDialogData(data);
        this.actions.ReceiveData.addListener(this.receivedDataHandler);
    }

    private receivedCreateDialogData(state: CreateDashboardState) {
        this.state = state;
        this.emitChanged();
    }

    public getState(): CreateDashboardState {
        return this.state;
    }
}