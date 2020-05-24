import { Action } from "VSS/Flux/Action";

import { WikiPage } from "TFS/Wiki/Contracts";

export interface AllPagesRetrievalSucceededPayload {
    allPages: WikiPage[];
}

export interface SubPagesAddedPayload {
    parentPath: string;
    subPages: WikiPage[];
}

export class ActionsHub {
    public allPagesRetrievalSucceeded = new Action<AllPagesRetrievalSucceededPayload>();
    public allPagesRetrievalFailed = new Action<Error>();
	public subPagesAdded = new Action<SubPagesAddedPayload>();
    public pageExpanding = new Action<string>();
	public pageExpanded = new Action<SubPagesAddedPayload>();
    public pageCollapsed = new Action<string>();
    public pageChanged = new Action<string>();
}