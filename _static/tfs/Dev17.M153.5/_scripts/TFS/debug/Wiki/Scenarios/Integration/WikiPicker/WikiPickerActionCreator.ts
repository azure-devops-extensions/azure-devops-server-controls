import * as Q from "q";

import { WikiV2 } from "TFS/Wiki/Contracts";

import { WikiPickerActionsHub } from "Wiki/Scenarios/Integration/WikiPicker/WikiPickerActionsHub";
import { WikiPickerSource } from "Wiki/Scenarios/Integration/WikiPicker/WikiPickerSource";

export interface Sources {
    wikiPickerSource: WikiPickerSource;
}

export class WikiPickerActionCreator {
    constructor(
        private _actionsHub: WikiPickerActionsHub,
        private _sources: Sources,
    ) { }

    public get wikiPickerSource(): WikiPickerSource {
        return this._sources.wikiPickerSource;
    }

    /**
     * Fetches all the wikis in the current project.
     */
    public fetchAllWikis(): void {
        this.wikiPickerSource.getAllWikis().then(
            (wikis: WikiV2[]) => {
                this._actionsHub.getAllWikisSucceeded.invoke(wikis);
            },
            (error: Error) => {
                this._actionsHub.getAllWikisFailed.invoke(error);
            });
    }
}
