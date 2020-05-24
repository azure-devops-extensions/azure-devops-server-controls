import { Store } from "VSS/Flux/Store";

export class PagePrintStore extends Store {
    public onPrintInvoked = (): void => {
        this.emitChanged();
    }
}
