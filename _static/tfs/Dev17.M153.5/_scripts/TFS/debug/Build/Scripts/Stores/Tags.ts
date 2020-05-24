import {TagActionHub} from "Build/Scripts/Actions/Tags";

import * as BaseStore from "VSS/Flux/Store";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class SelectedTagsStore extends BaseStore.Store {
    private _hub: TagActionHub;
    private _comparer: (a: string, b: string) => number;
    private _selectedTags: string[] = [];

    constructor(hub: TagActionHub, initialSelectedTags?: string[], comparer?: (a: string, b: string) => number) {
        super();

        this._hub = hub;
        this._comparer = comparer || Utils_String.localeComparer;
        this._selectedTags = (initialSelectedTags || []).sort(this._comparer);

        this._hub.tagAdded.addListener((payload) => {
            if (!Utils_Array.contains(this._selectedTags, payload.tag, this._comparer)) {
                this._selectedTags.push(payload.tag);

                this._selectedTags = this._selectedTags.sort(this._comparer);

                this.emitChanged();
            }
        });

        this._hub.tagRemoved.addListener((payload) => {
            let index = Utils_Array.findIndex(this._selectedTags, (s) => this._comparer(s, payload.tag) === 0);
            if (index > -1) {
                this._selectedTags.splice(index, 1);

                this.emitChanged();
            }
        });
    }

    public getSelectedTags(): string[] {
        // return a copy to preclude external mutation
        return this._selectedTags.slice(0);
    }

    public getComparer(): (a: string, b: string) => number {
        return this._comparer;
    }
}

export class AllTagsStore extends BaseStore.Store {
    private _hub: TagActionHub;
    private _comparer: (a: string, b: string) => number;
    private _allTags: string[] = [];

    constructor(hub: TagActionHub, comparer?: (a: string, b: string) => number) {
        super();

        this._hub = hub;
        this._comparer = comparer || Utils_String.localeComparer;

        this._hub.suggestionsRetrieved.addListener((payload) => {
            this._allTags = payload.tags;
            this.emitChanged();
        });
    }

    public getAllTags(): string[] {
        // return a copy to preclude external mutation
        return this._allTags.slice(0);
    }

    public getComparer(): (a: string, b: string) => number {
        return this._comparer;
    }
}