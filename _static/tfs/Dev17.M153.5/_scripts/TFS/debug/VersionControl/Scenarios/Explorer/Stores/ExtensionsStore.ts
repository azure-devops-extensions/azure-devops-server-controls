import * as VSSStore from "VSS/Flux/Store";

import { ExplorerCommandCreator } from "VersionControl/Scenarios/Explorer/Commands/ItemCommands";

export interface ExtensionsState {
    extraCommands: ExplorerCommandCreator[];
}

/**
 * A store containing the state of the available extensions.
 */
export class ExtensionsStore extends VSSStore.Store {
    public state: ExtensionsState = {
        extraCommands: [],
    };

    public load = (commandCreator: ExplorerCommandCreator) => {
        this.state.extraCommands.push(commandCreator);

        this.emitChanged();
    }
}
