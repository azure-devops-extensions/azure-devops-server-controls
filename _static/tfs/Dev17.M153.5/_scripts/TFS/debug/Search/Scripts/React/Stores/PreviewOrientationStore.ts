import * as VSSStore from  "VSS/Flux/Store";

export interface IPreviewOrientationState {
    orientation: string;
}

export class PreviewOrientationStore extends VSSStore.Store {
    private state: IPreviewOrientationState;
    // To-Do: Make the values of the store to be enum instead of strings.
    constructor() {
        super()
        this.state = {
            orientation: "" // default mode
        } as IPreviewOrientationState;
    }

    public updatePreviewOrientationMode(mode: string) {
        mode = mode.toLowerCase();
        if (this.state.orientation !== mode) {
            this.state.orientation = mode;
            this.emitChanged();
        }
    }

    public get orientation(): string {
        return this
            .state
            .orientation;
    }
}