import * as VSSStore from "VSS/Flux/Store";
import { RepositoryLanguageInfo } from "RepositoryOverview/Scripts/Generated/Contracts";

export interface LanguagesState {
    languagesInfo: RepositoryLanguageInfo[];
}

export class LanguagesStore extends VSSStore.Store {
    private _state: LanguagesState;

    constructor() {
        super();
        this._state = {
            languagesInfo: [],
        };
    }

    public getState(): LanguagesState {
        return this._state;
    }

    public loadLanguages = (languagesInfo: RepositoryLanguageInfo[]): void => {
        this._state.languagesInfo = languagesInfo;
        this.emitChanged();
    }
}
