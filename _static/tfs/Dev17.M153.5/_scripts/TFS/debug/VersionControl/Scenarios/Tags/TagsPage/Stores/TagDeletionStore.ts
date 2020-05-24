import * as VSSStore from "VSS/Flux/Store";
import { TagDeletionStatus } from "VersionControl/Scenarios/Tags/TagsPage/Actions/ActionsHub";

export interface DeletionState {
    isDeleting: boolean;
    tagNameToDelete?: string;
}

export class DeletionStore extends VSSStore.Store {
    public state: DeletionState;

    constructor() {
        super();
        this.state = {
            isDeleting: false
        }
    }

    public deleteTag = (tagNameToDelete: string): void => {
        this.state.tagNameToDelete = tagNameToDelete;
        this.state.isDeleting = true;
        this.emitChanged();
    }

    public deleteTagCompleted = (state: TagDeletionStatus): void => {
        this.state.tagNameToDelete = "";
        this.state.isDeleting = false;
        this.emitChanged();
    }

    public getState = (): DeletionState => {
        return this.state;
    }

    public dispose(): void {
        this.state = null;
    }
}