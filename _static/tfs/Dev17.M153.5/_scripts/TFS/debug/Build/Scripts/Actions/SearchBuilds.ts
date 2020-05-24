import {Build} from "TFS/Build/Contracts";

import {Action} from "VSS/Flux/Action";

export interface SuccessPayload {
    builds: Build[];
}

export interface FailurePayload {
    errorMessage: string;
}

export class BuildSearchActionHub {
    public searchSucceeded = new Action<SuccessPayload>();
    public searchFailed = new Action<FailurePayload>();
}
