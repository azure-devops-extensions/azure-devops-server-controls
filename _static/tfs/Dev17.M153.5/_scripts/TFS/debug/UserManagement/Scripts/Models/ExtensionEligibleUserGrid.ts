import Grids = require("VSS/Controls/Grids");
import SPS_Host_TfsContext = require("Presentation/Scripts/TFS/SPS.Host.TfsContext");
import CoreAjax = require("Presentation/Scripts/TFS/SPS.Legacy.Ajax");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import AccountResources = require("UserManagement/Scripts/Resources/SPS.Resources.UserManagement");
import Events_Services = require("VSS/Events/Services");
import VSS = require("VSS/VSS");
import ExtAvailVM = require("UserManagement/Scripts/Models/ExtensionAvailabilityViewModel");
import AddUserMgmtPanel = require("UserManagement/Scripts/Panels/AddUserManagementPanel");
var eventService = Events_Services.getService();
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export interface ExtensionEligibleUserGridOptions extends Grids.IGridOptions {
    noEligibleUserToAssignCallBack: Function;
    extensionId: string;
    tfsContext: any;
}

export class ExtensionEligibleUserGrid extends Grids.GridO<ExtensionEligibleUserGridOptions> {
    public static enhancementTypeName = "tfs.accounts.ExtensionEligibleUserGrid";
    public _originalData: any;
    private _previousWindowHeight: number;
    private _minHeight: number;
    private _maxHeight: number;
    private _openPanel: any;
    private _decreasedSize: any;
    private _panelHeight: number;
    private _refresh: any;
    private static timer: number;
    private static doubleClick = 0;
    private $extensionSection: any;
    private _extensionId: string;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        options = $.extend({
            header: true,
            allowMultiSelect: true,
            gutter: {
                icon: {
                    checkbox: true,
                    index: 9,
                    tooltipIndex: 11
                },
            },
            source: [],
            initialSelection: false,
            columns: [],
            asyncInit: false,
            height: "85%"
        }, options);

        options.columns = [
            {
                text: "",
                width: 32,
                index: "UserId",
                canSortBy: false,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var cell, UserId = this.getColumnValue(dataIndex, column.index);
                    cell = $("<div class='grid-cell' />").width(column.width || 32);

                    if (UserId != AddUserMgmtPanel.AddUserManagementPanel._placeHolderString) {
                        this.identityImageElement(this._options.tfsContext, UserId, null, "user-picture-small").appendTo(cell);
                    } else {
                        cell.append($("<div class='saving-icon'/>"));
                    }
                    return cell;
                }
            },
            {
                text: AccountResources.UserGridColName,
                width: 160,
                index: "Name",
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var cell, cellValue = this.getColumnValue(dataIndex, column.index);
                    cell = $("<div class='grid-cell grid-cell-with-padding'/>").width(column.width || 160).text(cellValue);

                    return cell;
                }
            },
            {
                text: AccountResources.UserGridColEmail,
                index: "SignInAddress",
                width: 200,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var cell, cellValue = this.getColumnValue(dataIndex, column.index);
                    cell = $("<div class='grid-cell grid-cell-with-padding'/>").width(column.width || 200).text(cellValue);

                    return cell;
                }
            },
            {
                text: AccountResources.UserGridColLicense,
                width: 200,
                index: "LicenseType",
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var cell: JQuery, statusValue, cellValue = this.getColumnValue(dataIndex, column.index);
                    cell = $("<div class='grid-cell grid-cell-with-padding'/>").width(column.width || 200);

                    statusValue = this.getColumnValue(dataIndex, "Status");
                    if ((statusValue.length > 0 && statusValue != AccountResources.UserStatusPending)
                        || (cellValue.length > 0 && cellValue == AccountResources.UserStatusNone)) {
                        cell.append($("<div class='icon icon-tfs-tcm-blocked-small'/>"));
                    }

                    $(domElem("div")).appendTo(cell).text(cellValue);
                    return cell;
                }
            }
        ],
            super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();
        this._previousWindowHeight = $(window).height();
        this._minHeight = 100;
        this._maxHeight = screen.availHeight - 100;
        this._openPanel = false;
        this._panelHeight = 70;
        this._refresh = true;
        this._extensionId = this._options.extensionId;

        this.$extensionSection = this._element.find("#extensionCol");
        this._getEligibleUsersList();
    }

    private identityImageElement(tfsContext, identityId, urlParams?: any, size?: string, title?: string, alt?: string) {
        /// <param name="urlParams" type="object" optional="true" />

        var $img;

        $img = $(domElem("img", "identity-picture"));

        if (title) {
            $img.attr('title', title);
        }

        if (size) {
            $img.addClass(size);
        }

        if (alt) {
            $img.attr('alt', alt);
        } else {
            $img.attr('alt', "");
        }
        
        if (this._options && !this._options.tfsContext.isHosted) {
            $img.attr("src", this._options.tfsContext.getActionUrl('IdentityImage', 'common', { area: 'api' }, { "identityId": identityId, "size": 0 }));
        } else {
            $img.attr("src", this._options.tfsContext.getActionUrl('Avatar', 'profile', { "identityId": identityId, "size": 0 }));
        }

        if (identityId) {
            $img.addClass("identity-" + identityId);
        }

        return $img;
    }

    /// <summary>Update the extensions area</summary>
    private _updateEligibleUsersColContent(data) {
        var userList = [], index = 0, user;
        // check of the Users entity is not null.
        if (data.Users != null) {
            for (index = 0; index < data.Users.length; index++) {
                user = data.Users[index];
                userList[index] = user;
            }
        }
        this._options.source = userList;
        this._originalData = userList;
        this.initializeDataSource();

        if (userList.length <= 0) {
            this._options.noEligibleUserToAssignCallBack();
        }
    }

    /// <summary>Get list of all available extensions</summary>
    private _getEligibleUsersList() {
        var dummy = new Date();

        //Make call to get data.
        CoreAjax.getMSJSON(this._options.tfsContext.getActionUrl("GetExtensionEligibleUsers", "apiusermanagement"),
            {
                mkt: "en-us",
                extensionId: this._extensionId,
                // no parameters. hack to ensure there is no cache.
                _t: dummy.getTime()
            },
            // handle success.
            delegate(this, this._getExtensionEleigibleUsersSuccess),
            //handle error.
            delegate(this, this._getExtensionEleigibleUsersFailed)
        );
    }

    /// <summary>Set up the display columns for the extension list</summary>
    private _getExtensionEleigibleUsersSuccess(data) {
        this._updateEligibleUsersColContent(data);
        eventService.fire(
            "tfs-update-extensionLicenseStatusLabelDialog",
            new ExtAvailVM.ExtensionAvailabilityViewModel(data["ExtensionAvailabilityViewModel"])
        );
        this.updateSelectionCountToStatusLabel(this.getSelectionCount());
    }

    private _getExtensionEleigibleUsersFailed(error) {
        // TODO tell user todo close it and do it again
    }

    public getSelectedUsers(): Array<{ UserName: string, ExtensionId: string, DisplayName: string, ObjecId: string }> {
        var selectedRows = this._selectedRows;
        var usersObject = [];
        for (var i in selectedRows) {
            var rowData = this.getRowData(Number(i));
            var userObject = { UserName: rowData.SignInAddress.trim(), ExtensionId: this._extensionId, DisplayName: rowData.Name.trim(), ObjectId: rowData.UserId.trim() };
            usersObject.push(userObject);
        }
        return usersObject;
    }

    public onRowClick(eventArgs): any {
        this.updateSelectionCountToStatusLabel(this._selectionCount);
    }

    public updateSelectionCountToStatusLabel(count: number): void {
        eventService.fire("tfs-update-selected-count-extensionLicenseStatusDialogLabel", count);
    }
}
VSS.classExtend(ExtensionEligibleUserGrid, SPS_Host_TfsContext.TfsContext.ControlExtensions);