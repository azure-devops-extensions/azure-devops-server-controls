import Controls = require("VSS/Controls");
import AccountResources = require("UserManagement/Scripts/Resources/SPS.Resources.UserManagement");
import Events_Services = require("VSS/Events/Services");
import Utils_Core = require("VSS/Utils/Core");
import ExtVM = require("UserManagement/Scripts/Models/ExtensionViewModel");
import SPS_Host_TfsContext = require("Presentation/Scripts/TFS/SPS.Host.TfsContext");
import VSS = require("VSS/VSS");

var eventService = Events_Services.getService();
var delegate = Utils_Core.delegate;

export class UserHubTitleControl extends Controls.BaseControl {
    private _title: any;
    private static enhancementTypeName = "tfs.account.UserHubTitleControl";

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._title = this._element.find("#userHubTitle");
        eventService.attachEvent("tfs-update-userhubTitle", delegate(this, this._updateUserHubTitle));
    }

    private _updateUserHubTitle(extension: ExtVM.ExtensionViewModel) {
        var title: string;
        if (!extension.isExtensionIdFilled()) {
            title = AccountResources.UsersHubHeaderForLicense;
        } else {
            title = extension.getDisplayName();
        }
        $(this._title).text(title);
    }
}
VSS.classExtend(UserHubTitleControl, SPS_Host_TfsContext.TfsContext.ControlExtensions);