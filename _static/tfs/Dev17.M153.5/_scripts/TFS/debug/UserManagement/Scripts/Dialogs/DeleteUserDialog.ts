import Dialogs = require("VSS/Controls/Dialogs");
import AccountResources = require("UserManagement/Scripts/Resources/SPS.Resources.UserManagement");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Events_Services = require("VSS/Events/Services");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import SPS_Host_TfsContext = require("Presentation/Scripts/TFS/SPS.Host.TfsContext");
import VSS = require("VSS/VSS");

var eventService = Events_Services.getService();
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export interface DeleteUserDialogOptions extends Dialogs.IModalDialogOptions {
    userId?: string;
    name?: string;
    email?: string;
    index?: number;
    contentHeader?: string;
    contentDescription?: string;
    successCallback?: Function;
    tfsContext?: SPS_Host_TfsContext.TfsContext;
    isAadAccount?: boolean;
    tenantName?: string;
}

export class DeleteUserDialog extends Dialogs.ModalDialogO<DeleteUserDialogOptions> {

    private static _controlType: string = 'DeleteUserDialog';
    private _userName: any;
    private _userId: any;
    private _userEmail: any;
    private _userIndex: any;
    private _isAadAccount: boolean;
    private _tenantName: string;
    private _tfsContext: SPS_Host_TfsContext.TfsContext;
    private $dataDiv: JQuery;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            width: 450,
            minWidth: 450,
            height: 300,
            minHeight: 300,
            resizable: false,
            modal: true,
            allowMultiSelect: false,
            contentHeader: AccountResources.DialogDeleteTitle,
            contentDescription: Utils_String.format(AccountResources.UserHubDeleteDialogHeader, document.referrer.replace("_user", "_admin")),
            buttons: {
                saveButton: {
                    id: 'delete-warning-ok-button',
                    text: AccountResources.DialogDeleteUser,
                    click: delegate(this, this._onConfirmClick)
                },
                cancelButton: {
                    id: 'delete-warning-cancel-button',
                    text: AccountResources.DialogCancel,
                    click: delegate(this, this._onCancelClick)
                }
            },
            open: function () {
                Diag.logTracePoint('DeleteUserDialog.OpenDialog');
            }
        }, options));
    }

    public initialize() {
        this._userName = this._options.name;
        this._userId = this._options.userId;
        this._userEmail = this._options.email;
        this._userIndex = this._options.index;

        this._tenantName = this._options.tenantName;
        this._isAadAccount = this._options.isAadAccount;
        this._tfsContext = this._options.tfsContext;

        super.initialize();
        this._buildDialogElements();
    }

    private _buildDialogElements() {
        var $data: JQuery = $(domElem('div'));

        var wrapper: any = $(domElem('div'))
            .append($data)
            .addClass('delete-user-dialog');
        this._element.html(wrapper);

        this.setTitle(this._options.contentHeader);

        this.$dataDiv = $(domElem('div')).appendTo($data)
            .attr('id', 'main-context');

        this._populate();
    }

    private _populate() {

        var $warningTextDiv: JQuery = $(domElem('div')).appendTo(this.$dataDiv).addClass('message-warning');

        var $warningTable: JQuery = $(domElem('table')).appendTo($warningTextDiv).addClass('delete-warning-header');
        var $warningTableRow: JQuery = $(domElem('tr')).appendTo($warningTable);
        var $warningTableImage: JQuery = $(domElem('td')).appendTo($warningTableRow).addClass('delete-warning-tbl-img');
        var $warningTableText: JQuery = $(domElem('td')).appendTo($warningTableRow).addClass('delete-warning-tbl-txt');

        $(domElem('span')).appendTo($warningTableImage)
            .addClass('delete-warning-icon');

        $(domElem('div')).appendTo($warningTableText)
            .addClass('description-delete')
            .html(this._options.contentDescription);

        var userString = this._userName + ' (' + this._userEmail + ')';

        if (this._tfsContext.isHosted && this._isAadAccount) {
            $(domElem('div')).appendTo($warningTextDiv)
                .addClass('delete-warning-list')
                .html(Utils_String.format(AccountResources.UserHubDeleteAad, this._tenantName, userString));
        }
        else {
            $(domElem('div')).appendTo($warningTextDiv)
                .addClass('delete-warning-list')
                .html(Utils_String.format(AccountResources.UserHubDelete, userString));
        }
    }

    /// <summary>Creates the menu items used in the user management toolbar</summary>
    private _onConfirmClick() {
        var callback = this._options.successCallback;
        var user = { name: this._userName, Id: this._userId, index: this._userIndex };

        if (callback) {
            // Callback to save

            callback(user);
            // Close dialog and return
            this.close();
            Diag.logTracePoint("DeleteUserDialog.SaveChanges.Success");
            Diag.logTracePoint("DeleteUserDialog.CloseDialog");
        }
    }

    private _onCancelClick(e?) {
        this.close();
    }
}

VSS.initClassPrototype(DeleteUserDialog, {
    _cancelButton: null,
    _confirmButton: null
});

VSS.classExtend(DeleteUserDialog, SPS_Host_TfsContext.TfsContext.ControlExtensions);