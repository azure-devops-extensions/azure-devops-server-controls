import ExtVM = require("UserManagement/Scripts/Models/ExtensionViewModel");

export class ExtensionAvailabilityViewModel {
    private _inUse: number;
    private _total: number;
    private _includedCount: number;
    private _allOrNothing: boolean;
    private _extension: ExtVM.ExtensionViewModel;

    constructor(o: Object, allOrNothing?: boolean) {
        if (o.hasOwnProperty("InUse")) {
            this._inUse = o["InUse"];
        }
        if (o.hasOwnProperty("Total")) {
            this._total = o["Total"];
        }
        if (o.hasOwnProperty("IncludedQuantity")) {
            this._includedCount = o["IncludedQuantity"];
        }
        if (o.hasOwnProperty("ExtensionViewModel") && o["ExtensionViewModel"]) {
            this._extension = new ExtVM.ExtensionViewModel(o["ExtensionViewModel"]);
        }
        this._allOrNothing = allOrNothing;
    }

    public getInUse() {
        return this._inUse;
    }
    public getTotal() {
        return this._total;
    }
    public getAllOrNothing() {
        return this._allOrNothing;
    }
    public getExtension() {
        return this._extension;
    }
    public getIncludedCount() {
        return this._includedCount;
    }
}