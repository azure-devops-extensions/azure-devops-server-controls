import Events_Services = require("VSS/Events/Services");
import Utils_Core = require("VSS/Utils/Core");
import Controls = require("VSS/Controls");
import VSS = require("VSS/VSS");
import SPS_Host_TfsContext = require("Presentation/Scripts/TFS/SPS.Host.TfsContext");
import ExtensionDynamicLinkDivs = require("UserManagement/Scripts/Models/ExtensionDynamicLinkDivs");

var eventService = Events_Services.getService();
var delegate = Utils_Core.delegate;

export class DynamicLinkControl extends Controls.BaseControl {
    private _buyMoreLinkDiv: ExtensionDynamicLinkDivs.ExtensionDynamicLinkDivs;
    private static enhancementTypeName = "tfs.account.BuyMoreLinkControl";

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._buyMoreLinkDiv = new ExtensionDynamicLinkDivs.ExtensionDynamicLinkDivs(this._element.find(".buy-more-link"), this._element.find(".learn-more-link"), this._options.tfsContext);
        this._buyMoreLinkDiv.hide();
        eventService.attachEvent("tfs-update-buyMoreLink", delegate(this._buyMoreLinkDiv, this._buyMoreLinkDiv.updateLinks));
        eventService.attachEvent("tfs-update-cancelPurchaseLink", delegate(this._buyMoreLinkDiv, this._buyMoreLinkDiv.updateCancelPurchaseMessage));
        eventService.attachEvent("tfs-hide-buyMoreLink", delegate(this._buyMoreLinkDiv, this._buyMoreLinkDiv.hide));
        eventService.attachEvent("tfs-show-buyMoreLink", delegate(this._buyMoreLinkDiv, this._buyMoreLinkDiv.show));
    }
}

VSS.classExtend(DynamicLinkControl, SPS_Host_TfsContext.TfsContext.ControlExtensions);