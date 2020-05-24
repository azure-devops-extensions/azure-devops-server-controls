import Utils_String = require("VSS/Utils/String");
import Events_Services = require("VSS/Events/Services");
import AccountResources = require("UserManagement/Scripts/Resources/SPS.Resources.UserManagement");
import ExtAvailVM = require("UserManagement/Scripts/Models/ExtensionAvailabilityViewModel");
import ExtVM = require("UserManagement/Scripts/Models/ExtensionViewModel");
var eventService = Events_Services.getService();

export class ExtensionLicenseStatusLabelDiv {
    private $extensionLicenseStatusLabel: JQuery;
    private _inUse: number;
    private _total: number;
    private _includedCount: number;
    private _allOrNothing: boolean;
    private _extensionState: string;
    private _extension: ExtVM.ExtensionViewModel;
    private _options: any;

    constructor(extensionLicenseStatusLabel: JQuery, options: any) {
        this.$extensionLicenseStatusLabel = extensionLicenseStatusLabel;
        this._inUse = 0;
        this._total = 0;
        this._includedCount = 0;
        this._allOrNothing = false;
        this._extension = null;
        this._options = options;
    }

    public getInUse(): number {
        return this._inUse;
    }

    public getTotal(): number {
        return this._total;
    }

    public getIncludedCount(): number {
        return this._includedCount;
    }

    public getExtensionState(): string {
        return this._extensionState;
    }

    public updateDivByInUseAndTotal(inUse: number, total: number, included: number) {
        // clear the existing text
        $(this.$extensionLicenseStatusLabel).text("");

        var extensionState = this.getExtensionState();
        if (extensionState == "" || extensionState == "TrialWithBuy" || included > 0) {

            if (total > 0) {
                // if onprem and first party, extension licenses can be overassigned.
                var label = "";
                if (this._options && !this._options.tfsContext.isHosted && this._extension && this._extension.getIsFirstParty()) {
                    label = Utils_String.format(AccountResources.ExtensionLicenseStatusLabelWithOverAssignment, total, inUse);
                } else {
                    if ((total - included) > 0) {
                        label = Utils_String.format(AccountResources.NewExtensionMessage, included, total - included, inUse, total - inUse);
                    } else {
                        label = Utils_String.format(AccountResources.NewExtensionMessageWithoutPaid, included, inUse, total - inUse);
                    }
                }
                $(this.$extensionLicenseStatusLabel).text(label);
            } else if(inUse > 0){
                var assignedLabel = Utils_String.format(AccountResources.ExtensionLicenseStatusLabelNotPaidScenario, inUse);
                $(this.$extensionLicenseStatusLabel).text(assignedLabel);
            }
        }
        this.show();
    }

    public hide(): void {
        $(this.$extensionLicenseStatusLabel).hide();
    }

    public show(): void {
        $(this.$extensionLicenseStatusLabel).show();
    }

    public updateWithExtensionAvailabilityViewModel(extensionAvailabilityViewModel: ExtAvailVM.ExtensionAvailabilityViewModel): void {
        if (extensionAvailabilityViewModel) {
            // For trial we dont need to display any counts. so just exit out.
            if (extensionAvailabilityViewModel.getExtension() && extensionAvailabilityViewModel.getExtension().getExtensionState() == "Trial" && extensionAvailabilityViewModel.getIncludedCount() == 0)
            {
                this.hide();
                return;
            }
            this._extension = extensionAvailabilityViewModel.getExtension();
            this._upateInUseAndTotal(extensionAvailabilityViewModel);
            if (extensionAvailabilityViewModel.getTotal() == 0) {
                eventService.fire("tfs-update-buyMoreLinkToBuyNow", null);
            }
        }
        this.updateDivByInUseAndTotal(this._inUse, this._total, this._includedCount);
        this.show();
    }

    private _upateInUseAndTotal(extensionAvailabilityViewModel: ExtAvailVM.ExtensionAvailabilityViewModel): void {
        this._total = extensionAvailabilityViewModel.getTotal();
        this._inUse = extensionAvailabilityViewModel.getInUse();
        this._includedCount = extensionAvailabilityViewModel.getIncludedCount();
        this._allOrNothing = extensionAvailabilityViewModel.getAllOrNothing();
        if (extensionAvailabilityViewModel.getExtension()) {
            this._extensionState = extensionAvailabilityViewModel.getExtension().getExtensionState();
        }
    }

}