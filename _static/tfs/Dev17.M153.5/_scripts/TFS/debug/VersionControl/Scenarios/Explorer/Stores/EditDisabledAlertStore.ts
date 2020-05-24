import * as VSSStore from  "VSS/Flux/Store";
import { EditDisabledAlertedPayload } from "VersionControl/Scenarios/Explorer/ActionsHub";

export interface EditDisabledAlertState {
    isAlertShowing: boolean;
    repositoryName: string | undefined;
}

/**
 * A store containing the state of the prompt to alert the user that editing is disabled for this repository.
 */
export class EditDisabledAlertStore extends VSSStore.Store {
    public state = {
        isAlertShowing: false,
    } as EditDisabledAlertState;

    public prompt = (payload: EditDisabledAlertState) => {
        this.state.isAlertShowing = true;
        this.state.repositoryName = payload.repositoryName;

        this.emitChanged();
    };

    public dismiss = () => {
        this.state.isAlertShowing = false;
        this.state.repositoryName = undefined;

        this.emitChanged();
    }
}
