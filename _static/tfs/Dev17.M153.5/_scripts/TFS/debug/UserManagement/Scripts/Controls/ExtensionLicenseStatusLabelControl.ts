import Events_Services = require("VSS/Events/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Controls = require("VSS/Controls");
import VSS = require("VSS/VSS");
import ExtLabelDiv = require("UserManagement/Scripts/Models/ExtensionLicenseStatusLabelDiv");
import SPS_Host_TfsContext = require("Presentation/Scripts/TFS/SPS.Host.TfsContext");
var eventService = Events_Services.getService();
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export class ExtensionLicenseStatusLabelControl extends Controls.BaseControl {
    public $labelDiv: ExtLabelDiv.ExtensionLicenseStatusLabelDiv;
    public static enhancementTypeName = "tfs.account.ExtensionLicenseStatusLabelControl";

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();
        this.$labelDiv = new ExtLabelDiv.ExtensionLicenseStatusLabelDiv(this._element.find(".extension-license-status-label"), this._options);
        this.$labelDiv.hide();
        eventService.attachEvent(
            "tfs-update-extensionLicenseStatusLabel",
            delegate(this.$labelDiv, this.$labelDiv.updateWithExtensionAvailabilityViewModel)
        );
        eventService.attachEvent(
            "tfs-hide-extensionLicenseStatusLabel",
            delegate(this.$labelDiv, this.$labelDiv.hide)
        );
    }

}
VSS.classExtend(ExtensionLicenseStatusLabelControl, SPS_Host_TfsContext.TfsContext.ControlExtensions);