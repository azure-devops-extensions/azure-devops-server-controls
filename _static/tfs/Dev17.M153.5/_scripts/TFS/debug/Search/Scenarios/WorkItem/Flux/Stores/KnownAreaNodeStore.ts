import * as VSSStore from "VSS/Flux/Store";
import * as _AgileCommon from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";

export interface KnownAreaNodeState {
    knownNodes: IDictionaryStringTo<_AgileCommon.INode>;
}

/**
 * A store containing the known area node for the current project.
 * This acts as a cache.
 */
export class KnownAreaNodeStore extends VSSStore.Store {
    public state: KnownAreaNodeState = {
        knownNodes: {}
    };

    public reset = (): void => {
        this.state.knownNodes = {};
    }

    public loadItems = (node: _AgileCommon.INode, project: string): void => {
        if (node) {
            this.state.knownNodes[project.toLowerCase()] = node;
        }

        this.emitChanged();
    }
}
