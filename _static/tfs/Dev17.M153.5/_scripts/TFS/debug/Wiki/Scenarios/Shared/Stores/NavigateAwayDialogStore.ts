import { Store } from "VSS/Flux/Store";

export interface NavigateAwayDialogState {
    isNavigateAwayDialogVisible: boolean;
    onConfirmAction: () => void;
}

export class NavigateAwayDialogStore extends Store {
    public state: NavigateAwayDialogState = {
        isNavigateAwayDialogVisible: false,
        onConfirmAction: undefined,
    };

    public promptNavigateAwayDialog = (tentativeAction: () => void): void => {
        this.state.isNavigateAwayDialogVisible = true;
        this.state.onConfirmAction = tentativeAction;

        this.emitChanged();
    }

    public dismissNavigateAwayDialog = (): void => {
        this.state.isNavigateAwayDialogVisible = false;
        this.state.onConfirmAction = undefined;

        this.emitChanged();
    }
}
