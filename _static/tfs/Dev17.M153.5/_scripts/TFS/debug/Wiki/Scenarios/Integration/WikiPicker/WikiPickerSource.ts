import * as Q from "q";

import * as Service from "VSS/Service";

import { WikiV2 } from "TFS/Wiki/Contracts";
import { WikiHttpClient } from "TFS/Wiki/WikiRestClient";

export class WikiPickerSource {
    constructor(
        private _projectId: string,
        private _wikiHttpClient?: WikiHttpClient,
    ) {
        if (!this._wikiHttpClient) {
            this._wikiHttpClient = Service.getClient(WikiHttpClient);
        }
    }

    public get wikiHttpClient(): WikiHttpClient {
        if (!this._wikiHttpClient) {
            this._wikiHttpClient = Service.getClient(WikiHttpClient);
        }

        return this._wikiHttpClient;
    }

    public getAllWikis(): IPromise<WikiV2[]> {
        return this.wikiHttpClient.getAllWikis(this._projectId);
    }
}
