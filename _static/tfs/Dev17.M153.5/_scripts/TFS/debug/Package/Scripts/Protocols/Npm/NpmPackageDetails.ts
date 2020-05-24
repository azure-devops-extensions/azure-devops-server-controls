/* tslint:disable:no-require-imports */
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

import * as Contracts from "Package/Scripts/Protocols/Npm/WebApi/VSS.Npm.Contracts";

import JsonPatchOperation = VSS_Common_Contracts.JsonPatchOperation;
export class PackageVersionDetails implements Contracts.PackageVersionDetails {
    public deprecateMessage: string;
    public views: JsonPatchOperation;
    constructor(deprecateMessage?: string, viewToAdd?: string) {
        this.deprecateMessage = deprecateMessage;
        const patchDocument: VSS_Common_Contracts.JsonPatchOperation = {
            from: null,
            op: VSS_Common_Contracts.Operation.Add,
            path: "/views/-",
            value: viewToAdd
        };
        this.views = patchDocument;
    }
}
