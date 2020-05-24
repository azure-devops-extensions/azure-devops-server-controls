import { Action } from "VSS/Flux/Action";

import { WikiV2 } from "TFS/Wiki/Contracts";

export class WikiPickerActionsHub {
    public getAllWikisSucceeded = new Action<WikiV2[]>();
    public getAllWikisFailed = new Action<Error>();
}