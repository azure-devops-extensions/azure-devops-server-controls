import * as Q from "q";
import * as Service from "VSS/Service";

import {
    WikiV2,
    WikiUpdateParameters,
} from "TFS/Wiki/Contracts";
import { WikiHttpClient } from "TFS/Wiki/WikiRestClient";

export class RenameWikiSource {
    constructor(
        private _wikiHttpClient?: WikiHttpClient,
    ) {
        if (!this._wikiHttpClient) {
            this._wikiHttpClient = Service.getClient(WikiHttpClient);
        }
    }

    public updateWikiName(
        wikiIdentifier: string,
        project: string,
        name: string,
    ): IPromise<WikiV2> {
        return this._updateWiki(
            wikiIdentifier,
            project,
            name,
        );
    }

    private _updateWiki(
        wikiIdentifier: string,
        project: string,
        name: string
    ): IPromise<WikiV2> {
        return this._wikiHttpClient.updateWiki(
            {
                name: name
            } as WikiUpdateParameters,
            wikiIdentifier,
            project,
        );
    }
}