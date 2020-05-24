import * as VSSStore from  "VSS/Flux/Store";
import { IPathControlElement, LoadingState } from "Search/Scripts/React/Models";

export class PathContent {
    constructor(public items: IPathControlElement[] = [], public loadingState: LoadingState = null) {
    }
}

export interface IPathStoreState {
    pathMap: { [pathType: string]: PathContent }
}

export class PathStore extends VSSStore.Store {
    private state: IPathStoreState;
    constructor() {
        super();

        this.state = {
            pathMap: {}
        } as IPathStoreState;
    }

    /**
     * Updates the state of the store with the provided path list and its type
     * @param pathType
     * @param paths
     */
    public updatePaths(pathType: string, paths: IPathControlElement[], loadingState: LoadingState): void {
        this.state.pathMap[pathType] = new PathContent(paths, loadingState);
        this.emitChanged();
    }

    /**
     * Fetches a path list for a specific type.
     * @param pathType
     */
    public getPathContent(pathType: string): PathContent {
        return this.state.pathMap[pathType] || new PathContent();
    }
}
