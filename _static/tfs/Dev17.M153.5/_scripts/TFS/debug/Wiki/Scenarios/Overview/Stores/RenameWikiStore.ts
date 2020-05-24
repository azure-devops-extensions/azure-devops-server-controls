import { Store } from "VSS/Flux/Store";

export interface RenameWikiState {
    isRenameWikiDialogOpen: boolean;
    isRenameInProgress: boolean;
    errorMessage?: string;
}

export class RenameWikiStore extends Store {

    public state: RenameWikiState = {
        isRenameWikiDialogOpen: false,
        isRenameInProgress: false,
    };

    public openRenameWikiDialog = (): void => {
        this.state.isRenameWikiDialogOpen = true;
        this.emitChanged();
    }

    public closeRenameWikiDialog = (): void => {
        this.state.isRenameWikiDialogOpen = false;
        this.state.errorMessage = null;
        this.state.isRenameInProgress = false;
        this.emitChanged();
    }

    public wikiRenameFailed = (error: Error): void => {
        this.wikiRenameProgressCompleted();
        this.state.errorMessage = error.message;
        this.emitChanged();
    }

    public wikiRenameProgress = (): void => {
        this.state.isRenameInProgress = true;
        this.emitChanged();
    }

    private wikiRenameProgressCompleted = (): void =>{
        this.state.isRenameInProgress = false;
    }
}