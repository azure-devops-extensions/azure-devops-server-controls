import SDK = require("VSS/SDK/Shim");

export class SelectColumnHandler {
    public execute(context: any): void {

    }
}
export class SelectQueryHandler {
    public execute(context: any): void {

    }
}

SDK.VSS.register("selectColumnAction", SelectColumnHandler);
SDK.VSS.register("selectQueryAction", SelectQueryHandler);