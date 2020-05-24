/* tslint:disable:no-require-imports */
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");

import * as Contracts from "Package/Scripts/Protocols/NuGet/WebApi/VSS.NuGet.Contracts";

import JsonPatchOperation = VSS_Common_Contracts.JsonPatchOperation;
export class PackageVersionDetails implements Contracts.PackageVersionDetails {
    public readonly listed: boolean;
    public readonly views: JsonPatchOperation;
    constructor(listed?: boolean, viewToAdd?: string) {
        this.listed = listed;
        const patchDocument: VSS_Common_Contracts.JsonPatchOperation = {
            from: null,
            op: VSS_Common_Contracts.Operation.Add,
            path: "/views/-",
            value: viewToAdd
        };
        this.views = patchDocument;
    }
}
