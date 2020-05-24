import { Store } from "VSS/Flux/Store";

export interface CloneWikiState {
    isCloneWikiDialogOpen: boolean;
}

export class CloneWikiStore extends Store {
    public state: CloneWikiState = {
        isCloneWikiDialogOpen: false,
    };

    public openCloneWikiDialog = (): void => {
        this.state.isCloneWikiDialogOpen = true;
        this.emitChanged();
    }

    public closeCloneWikiDialog = (): void => {
        this.state.isCloneWikiDialogOpen = false;
        this.emitChanged();
    }
}