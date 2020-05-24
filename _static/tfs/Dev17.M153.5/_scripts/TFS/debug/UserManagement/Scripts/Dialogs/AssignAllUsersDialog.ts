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

import ExtVM = require("UserManagement/Scripts/Models/ExtensionViewModel");
import ExtLicenseStatusDialog = require("UserManagement/Scripts/Dialogs/ExtensionLicenseStatusLabelDialogControl");
import ExtEligibleUserGrid = require("UserManagement/Scripts/Models/ExtensionEligibleUserGrid");
import BuyMoreLinkCtrl = require("UserManagement/Scripts/Controls/BuyMoreLinkDialogControl");

var eventService = Events_Services.getService();
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export interface AssignAllUsersDialogOptions extends Dialogs.IModalDialogOptions {
    extension: ExtVM.ExtensionViewModel;
    index?: number;
    successCallback?: Function;
    tfsContext?: SPS_Host_TfsContext.TfsContext;
}

export class AssignAllUsersDialog extends Dialogs.ModalDialogO<AssignAllUsersDialogOptions> {

    private static _controlType: string = 'AssignAllUsersDialog';
    private static _okButtonId: string = 'assign-allusers-ok-button';
    private $dataDiv: JQuery;
    private _extension: ExtVM.ExtensionViewModel;
    private $dialogUserGrid: ExtEligibleUserGrid.ExtensionEligibleUserGrid;
    private $extensionLicenseUsageDialogLabel: ExtLicenseStatusDialog.ExtensionLicenseStatusLabelDialogControl;
    private $buyMoreLinkDialogControl: BuyMoreLinkCtrl.BuyMoreLinkDialogControl;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            width: 700,
            height: 600,
            minWidth: 450,
            minHeight: 300,
            resizable: false,
            modal: true,
            allowMultiSelect: true,
            contentDescription: Utils_String.format(AccountResources.UserHubDeleteDialogHeader, document.referrer.replace("_user", "_admin")),
            buttons: {
                saveButton: {
                    id: AssignAllUsersDialog._okButtonId,
                    text: AccountResources.DialogAssignAllUsersOk,
                    click: delegate(this, this._onConfirmClick)
                }
            },
            open: function () {
                Diag.logTracePoint("AssignAllUsersDialog.OpenDialog");
            }
        }, options));
    }

    public initialize() {
        this._extension = this._options.extension;

        super.initialize();
        this._buildDialogElements();
    }

    private _buildDialogElements() {
        var $data: JQuery = $(domElem('div'));

        var wrapper: any = $(domElem('div'))
            .append($data)
            .addClass('assgin-all-users-dialog');
        this._element.html(wrapper);

        this.setTitle(Utils_String.format(AccountResources.DialogAssignToAllUsersTitle, Utils_String.htmlDecode(this._extension.getDisplayName())));

        this.$dataDiv = $(domElem('div')).appendTo($data)
            .attr('id', 'main-context');

        this._populate();
    }

    private _populate() {
        var licenseStatusDiv = $("<div class='license-dialog-status' />").appendTo(this.$dataDiv);
        var noEligibleUsersToAssignDiv = $("<div class='no-eligible-users-to-assign' />")
            .appendTo(this.$dataDiv);
        // display name is html encoded by getDisplayName
        noEligibleUsersToAssignDiv.html(Utils_String.format(AccountResources.NoEligibleUsersToAssign, this._extension.getDisplayName()));
        noEligibleUsersToAssignDiv.hide();
        var licenseStatusDiv = $("<div class='license-dialog-status' />").appendTo(this.$dataDiv);
        var messageCtrl = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, licenseStatusDiv);

        var extensionLicenseUsageLabelContainer = $("<span class='account-members-dialog-container' />")
            .appendTo(licenseStatusDiv);
        var labelDiv = $("<span id='extensionLicenseStatusDialogLabel' class='extension-license-status-label-nomargin' />")
            .appendTo(extensionLicenseUsageLabelContainer);
        var buyMode = $("<span class='buy-more-link'>").appendTo(licenseStatusDiv);

        var extensionState = this._extension.getExtensionState();
        this.$extensionLicenseUsageDialogLabel = <ExtLicenseStatusDialog.ExtensionLicenseStatusLabelDialogControl>Controls.Enhancement.enhance(
            ExtLicenseStatusDialog.ExtensionLicenseStatusLabelDialogControl,
            extensionLicenseUsageLabelContainer,
            {
                selectMoreUserThanLicenseLeftCallBack: () => {
                    if (extensionState !== "Trial" && !this._extension.getIsFirstParty()) {
                        $("<div class='common-message' />").appendTo(licenseStatusDiv);
                        messageCtrl.setMessage(AccountResources.InsufficientLicenseQuantity, Notifications.MessageAreaType.Warning);
                        $("#" + AssignAllUsersDialog._okButtonId).prop("disabled", true).addClass("ui-state-disabled");
                    }
                },
                selectUserDefaultCallBack: () => {
                    messageCtrl.clear();
                    $("#" + AssignAllUsersDialog._okButtonId).prop("disabled", false).removeClass("ui-state-disabled");
                },
                tfsContext: this._options.tfsContext
            }
        );
        this.$buyMoreLinkDialogControl = <BuyMoreLinkCtrl.BuyMoreLinkDialogControl>Controls.Enhancement.enhance(
            BuyMoreLinkCtrl.BuyMoreLinkDialogControl,
            licenseStatusDiv
        );

        this.$buyMoreLinkDialogControl.update(this._extension.getExtensionId());
        var extensionUserGridContainer = $("<div class='account-members-dialog-container' />")
            .appendTo(this.$dataDiv);
        this.$dialogUserGrid = <ExtEligibleUserGrid.ExtensionEligibleUserGrid>Controls.Enhancement.enhance(ExtEligibleUserGrid.ExtensionEligibleUserGrid,
            extensionUserGridContainer,
            {
                gutter: true,
                height: 450,
                extensionId: this._extension.getExtensionId(),
                noEligibleUserToAssignCallBack: () => {
                    noEligibleUsersToAssignDiv.show();
                    extensionUserGridContainer.hide();
                }
            }
        );
    }

    /// <summary>Creates the menu items used in the user management toolbar</summary>
    private _onConfirmClick() {
        var callback = this._options.successCallback;
        var users = this.$dialogUserGrid.getSelectedUsers();
        var ciData = {
            TotalLicenses: this.$extensionLicenseUsageDialogLabel.$labelDiv.getTotal(),
            InUseLicenses: this.$extensionLicenseUsageDialogLabel.$labelDiv.getInUse(),
            AssignSource: AssignAllUsersDialog._controlType
        };

        if (users.length > 0 && callback) {
            // Callback to save
            callback(users, ciData);
            Diag.logTracePoint("AssignAllUsersDialog.SaveChanges.Success");
        }
        // Close dialog and return
        this.close();
        Diag.logTracePoint("AssignAllUsersDialog.CloseDialog");
    }
}

VSS.initClassPrototype(AssignAllUsersDialog, {
    _cancelButton: null,
    _confirmButton: null
});

VSS.classExtend(AssignAllUsersDialog, SPS_Host_TfsContext.TfsContext.ControlExtensions);