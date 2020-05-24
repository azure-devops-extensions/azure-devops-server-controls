import Dialogs = require("VSS/Controls/Dialogs");
import Utils_UI = require("VSS/Utils/UI");
import AccountResources = require("UserManagement/Scripts/Resources/SPS.Resources.UserManagement");
import Events_Services = require("VSS/Events/Services");
import Utils_Core = require("VSS/Utils/Core");
import SPS_Host_TfsContext = require("Presentation/Scripts/TFS/SPS.Host.TfsContext");
import Notifications = require("VSS/Controls/Notifications");
import Diag = require("VSS/Diag");
import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Utils_String = require("VSS/Utils/String");
import ExtLicenseStatusDiv = require("UserManagement/Scripts/Models/ExtensionLicenseStatusLabelDiv");
import Helper = require("UserManagement/Scripts/Utils/Helpers");


var eventService = Events_Services.getService();
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export interface IExtensionLicenseStatusLabelDialogOptions extends Controls.EnhancementOptions {
    selectMoreUserThanLicenseLeftCallBack?: Function;
    selectUserDefaultCallBack?: Function;
    tfsContext: any;
}

export class ExtensionLicenseStatusLabelDialogControl extends Controls.Control<IExtensionLicenseStatusLabelDialogOptions> {
    public $labelDiv: ExtLicenseStatusDiv.ExtensionLicenseStatusLabelDiv;
    public static enhancementTypeName = "tfs.account.ExtensionLicenseStatusLabelDialogControl";

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();
        this.$labelDiv = new ExtLicenseStatusDiv.ExtensionLicenseStatusLabelDiv(this._element.find(".extension-license-status-label-nomargin"), this._options);
        eventService.attachEvent(
            "tfs-update-extensionLicenseStatusLabelDialog",
            delegate(this.$labelDiv, this.$labelDiv.updateWithExtensionAvailabilityViewModel)
        );
        eventService.attachEvent(
            "tfs-update-selected-count-extensionLicenseStatusDialogLabel",
            delegate(this, this.updateSelectedUsersCount)
        );
    }

    public updateSelectedUsersCount(passedSelectedUsersCount: number) {
        var aboutToAssignUserCount = this.$labelDiv.getInUse();
        if (Helper.ControlsHelper.isNumber(passedSelectedUsersCount)) {
            aboutToAssignUserCount = aboutToAssignUserCount + passedSelectedUsersCount;
        }
        this.$labelDiv.updateDivByInUseAndTotal(aboutToAssignUserCount, this.$labelDiv.getTotal(), this.$labelDiv.getIncludedCount());
        if (aboutToAssignUserCount > this.$labelDiv.getTotal()) {
            this._options.selectMoreUserThanLicenseLeftCallBack();
        } else {
            this._options.selectUserDefaultCallBack();
        }
    }
}