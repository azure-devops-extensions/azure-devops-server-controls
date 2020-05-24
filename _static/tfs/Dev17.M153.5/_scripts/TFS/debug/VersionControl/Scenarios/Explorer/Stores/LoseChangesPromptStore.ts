import * as VSSStore from  "VSS/Flux/Store";
import { LoseChangesAskedPayload } from "VersionControl/Scenarios/Explorer/ActionsHub";

export interface LoseChangesPromptState {
    dirtyFileName: string | undefined;
    tentativeAction(): void | undefined;
}

/**
 * A store containing the state of the prompt to confirm losing editing changes.
 */
export class LoseChangesPromptStore extends VSSStore.Store {
    public state = {} as LoseChangesPromptState;

    public prompt = (payload: LoseChangesAskedPayload) => {
        this.state.dirtyFileName = payload.dirtyFileName;
        this.state.tentativeAction = payload.tentativeAction;

        this.emitChanged();
    };

    public dismiss = () => {
        this.state.dirtyFileName = undefined;
        this.state.tentativeAction = undefined;

        this.emitChanged();
    }
}
