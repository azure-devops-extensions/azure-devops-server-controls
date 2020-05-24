import * as VSSStore from  "VSS/Flux/Store";
import { CompareOptions } from  "VersionControl/Scenarios/Explorer/ActionsHub";

export interface CompareState {
    mpath: string;
    mversion: string;
    opath: string;
    oversion: string;
    isDiffInline: boolean;
    diffLines: number[];
    currentDiffIndex: number;
    canGoToPreviousDiff: boolean;
    canGoToNextDiff: boolean;
}

/**
 * A store containing the state of the prompt to confirm losing editing changes.
 */
export class CompareStore extends VSSStore.Store {
    public state = {
        isDiffInline: false,
        diffLines: [],
        currentDiffIndex: 0,
    } as CompareState;

    public update = (options: CompareOptions) => {
        if (options) {
            this.state.mpath = options.mpath || "";
            this.state.mversion = options.mversion || "";
            this.state.opath = options.opath || "";
            this.state.oversion = options.oversion || "";

            this.emitChanged();
        }
    }

    public toggleDiffInline = (): void => {
        this.state.isDiffInline = !this.state.isDiffInline;

        this.emitChanged();
    }

    public loadDiffLines = (diffLines: number[]): void => {
        this.state.diffLines = diffLines;
        this.state.currentDiffIndex = 0;
        this.refreshCanGo();

        this.emitChanged();
    }

    public goToPreviousDiff = (): void => {
        if (this.state.canGoToPreviousDiff) {
            this.state.currentDiffIndex--;
            this.refreshCanGo();

            this.emitChanged();
        }
    }

    public goToNextDiff = (): void => {
        if (this.state.canGoToNextDiff) {
            this.state.currentDiffIndex++;
            this.refreshCanGo();

            this.emitChanged();
        }
    }

    private refreshCanGo(): void {
        this.state.canGoToPreviousDiff = this.state.currentDiffIndex > 0;
        this.state.canGoToNextDiff = this.state.currentDiffIndex < this.state.diffLines.length - 1;
    }
}
