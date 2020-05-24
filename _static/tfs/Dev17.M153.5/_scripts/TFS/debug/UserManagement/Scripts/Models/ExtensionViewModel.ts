import Utils_String = require("VSS/Utils/String");

export class ExtensionViewModel {
    private _extensionId: string;
    private _displayName: string;
    private _extensionState: string;
    private _allOrNothing: boolean;
    private _isPurchaseCanceled: boolean;
    private _isTrialExpiredWithNoPurchase: boolean;
    private _isEarlyAdopter: boolean;
    private _isFirstParty: boolean;
    private _billingStartDate: Date;
    private _gracePeriod: number;
    private _trialPeriod: number;
    private _includedCount: number;

    public getAllOrNothing(): boolean { return this._allOrNothing; }

    public getIsEarlyAdopter(): boolean { return this._isEarlyAdopter; }

    public getIsPurchaseCanceled(): boolean { return this._isPurchaseCanceled; }

    public getIsTrialExpiredWithNoPurchase(): boolean { return this._isTrialExpiredWithNoPurchase; }

    public getIsFirstParty(): boolean { return this._isFirstParty; }

    public getBillingStartDate(): Date { return this._billingStartDate; }

    public getGracePeriod(): number { return this._gracePeriod; }

    public getTrialPeriod(): number { return this._trialPeriod; }

    public getExtensionId(): string { return this._extensionId; }

    public getDisplayName(): string { return Utils_String.htmlEncode(this._displayName); }

    public getExtensionState(): string { return this._extensionState }

    public getIncludedCount(): number { return this._includedCount };

    constructor(extensionObject: Object) {
        if (extensionObject.hasOwnProperty("ExtensionId")) {
            this._extensionId = extensionObject["ExtensionId"];
        }
        if (extensionObject.hasOwnProperty("DisplayName")) {
            this._displayName = extensionObject["DisplayName"];
        }
        if (extensionObject.hasOwnProperty("ExtensionState")) {
            this._extensionState = extensionObject["ExtensionState"];
        }
        if (extensionObject.hasOwnProperty("AllOrNothing")) {
            this._allOrNothing = extensionObject["AllOrNothing"];
        }
        if (extensionObject.hasOwnProperty("IsEarlyAdopter")) {
            this._isEarlyAdopter = extensionObject["IsEarlyAdopter"];
        }
        if (extensionObject.hasOwnProperty("IsTrialExpiredWithNoPurchase")) {
            this._isTrialExpiredWithNoPurchase = extensionObject["IsTrialExpiredWithNoPurchase"];
        }
        if (extensionObject.hasOwnProperty("IsPurchaseCanceled")) {
            this._isPurchaseCanceled = extensionObject["IsPurchaseCanceled"];
        }
        if (extensionObject.hasOwnProperty("BillingStartDate")) {
            this._billingStartDate = extensionObject["BillingStartDate"];
        }
        if (extensionObject.hasOwnProperty("GracePeriod")) {
            this._gracePeriod = extensionObject["GracePeriod"];
        }
        if (extensionObject.hasOwnProperty("TrialPeriod")) {
            this._trialPeriod = extensionObject["TrialPeriod"];
        }
        if (extensionObject.hasOwnProperty("IsFirstParty")) {
            this._isFirstParty = extensionObject["IsFirstParty"];
        }
        if (extensionObject.hasOwnProperty("IncludedQuantity")) {
            this._includedCount = extensionObject["IncludedQuantity"];
        }
    }

    public isExtensionIdFilled() {
        return this._isFilled(this._extensionId);
    }

    public isDisplayNameFilled() {
        return this._isFilled(this._displayName);
    }

    private _isFilled(field: string) {
        if (!field || 0 === field.length) {
            return false;
        }
        return true;
    }

    public static newEmptyExtensionViewModel() {
        return new this({ "ExtensionId": "", "DisplayName": "" });
    }
}