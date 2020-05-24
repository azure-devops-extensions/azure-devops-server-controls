import ExtensionLinks = require("UserManagement/Scripts/Models/ExtensionDynamicLinkDivs");
import Controls = require("VSS/Controls");
import Events_Services = require("VSS/Events/Services");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");
import SPS_Host_TfsContext = require("Presentation/Scripts/TFS/SPS.Host.TfsContext");

var eventService = Events_Services.getService();
var delegate = Utils_Core.delegate;

export class BuyMoreLinkDialogControl extends Controls.BaseControl {
    private _buyMoreLinkDiv: ExtensionLinks.ExtensionDynamicLinkDivs;
    private static enhancementTypeName = "tfs.account.BuyMoreLinkDialogControl";

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._buyMoreLinkDiv = new ExtensionLinks.ExtensionDynamicLinkDivs(this._element.find(".buy-more-link"), null, this._options.tfsContext);
        eventService.attachEvent("tfs-hide-buyMoreLinkDialog", delegate(this._buyMoreLinkDiv, this._buyMoreLinkDiv.hide));
        eventService.attachEvent("tfs-show-buyMoreLinkDialog", delegate(this._buyMoreLinkDiv, this._buyMoreLinkDiv.show));
    }

    public update(extensionId: string) {
        this._buyMoreLinkDiv.updateLinks(extensionId);
    }
}

VSS.classExtend(BuyMoreLinkDialogControl, SPS_Host_TfsContext.TfsContext.ControlExtensions);