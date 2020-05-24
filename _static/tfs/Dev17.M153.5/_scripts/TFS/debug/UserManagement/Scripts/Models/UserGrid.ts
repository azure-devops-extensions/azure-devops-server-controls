import SPS_Host_TfsContext = require("Presentation/Scripts/TFS/SPS.Host.TfsContext");
import CoreAjax = require("Presentation/Scripts/TFS/SPS.Legacy.Ajax");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import AccountResources = require("UserManagement/Scripts/Resources/SPS.Resources.UserManagement");
import Events_Services = require("VSS/Events/Services");
import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import Notifications = require("VSS/Controls/Notifications");
import IdentityPicker = require("VSS/Identities/Picker/Controls");
import Identities_Services = require("VSS/Identities/Picker/Services");
import Identities_RestClient = require("VSS/Identities/Picker/RestClient");
import Utils_String = require("VSS/Utils/String");
import Grids = require("VSS/Controls/Grids");
import Utils_Date = require("VSS/Utils/Date");
import ExtVM = require("UserManagement/Scripts/Models/ExtensionViewModel");
import AddUserMgmtPanel = require("UserManagement/Scripts/Panels/AddUserManagementPanel");
import EditUserMgmtPanel = require("UserManagement/Scripts/Panels/EditUserManagementPanel");
import Helpers = require("UserManagement/Scripts/Utils/Helpers");
import ExtAvailVM = require("UserManagement/Scripts/Models/ExtensionAvailabilityViewModel");
var eventService = Events_Services.getService();
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;


/// This class represents the custom grid control inherited from Grid to be used for user management.
export class UserGrid extends Grids.GridO<any> {
    public static enhancementTypeName: string = "tfs.accounts.UserGrid";
    private static CONTACT_CARD_CONSUMER_ID: string = "1E1E85BA-B8EE-463D-B25B-7F871AD19CAB";

    public _originalData: any;
    private _previousWindowHeight: number;
    private _minHeight: number;
    private _maxHeight: number;
    private _openPanel: any;
    private _decreasedSize: any;
    private _panelHeight: number;
    private _refresh: any;
    private _isAadAccount: boolean;
    private static timer: number;
    private static doubleClick: number = 0;
    private _extensionId: string;
    private _extension: ExtVM.ExtensionViewModel;

    //Feature Flags
    private _ffIsUserCardEnabled: boolean;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {

        options = $.extend({
            header: true,
            allowMultiSelect: true,
            source: [],
            initialSelection: false,
            columns: [],
            asyncInit: false,
            height: '85%'
        }, options);

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

        if (this._options && !this._options.tfsContext.isHosted) {
            eventService.fire("tfs-clear-license");
        }

        this._getIdentityList();
        eventService.attachEvent("tfs-update-grid", delegate(this, this._updateUserGrid));
        eventService.attachEvent("tfs-resize-grid", delegate(this, this._resizeGrid));

        //check if the account is Aad backed and the featureflag is set to use related features
        this._isAadAccount = false;
        if (this._options.isAadAccount) {
            this._isAadAccount = true;
        }

        this._ffIsUserCardEnabled = false;
        if (this._options.ffIsUserCardEnabled) {
            this._ffIsUserCardEnabled = true;
        }

        $(this._element[0]).css('height', $(this._element[0]).height());
        this._onContainerResize();
    }

    /// <summary>This method is called whenever a the selected user in the grid is changed</summary>
    public selectedIndexChanged(selectedRowIndex, selectedDataIndex) {
        if (selectedRowIndex !== -1) {
            var user = this._dataSource[selectedDataIndex];
            super.selectedIndexChanged(selectedRowIndex, selectedDataIndex);
            user.rowId = selectedRowIndex;
            this._fire("selectedUserChanged", { currentUser: user });
        }
    }

    /// <summary>This method is called whenever the container is resized</summary>
    public _onContainerResize(e?: JQueryEventObject): any {
        /// <param name="e" type="JQueryEvent" />
        /// <returns type="any" />
        var windowHeight = $(window).height();
        var currentHeight = $(this._element[0]).height() + 2; // 2 for the border
        var diff: any, newHeight: any;

        // Recalculate the height of the grid based on the change from the previous window height
        if (windowHeight <= this._previousWindowHeight) {
            diff = this._previousWindowHeight - windowHeight;
            newHeight = (currentHeight - diff > this._minHeight) ? currentHeight - diff : this._minHeight;
            if (this.getGridHeight() > newHeight && this._openPanel && !this._decreasedSize) {
                newHeight = newHeight - this._panelHeight;
                this._decreasedSize = true;
            }
            $(this._element[0]).css('height', newHeight);
            this._previousWindowHeight = windowHeight;
        }

        else if (windowHeight > this._previousWindowHeight) {
            diff = windowHeight - this._previousWindowHeight;
            newHeight = (currentHeight + diff > this._minHeight) ? currentHeight + diff : this._minHeight;
            if (this.getGridHeight() > newHeight && this._openPanel && this._decreasedSize) {
                newHeight = newHeight + this._panelHeight;
                this._decreasedSize = false;
            }
            newHeight = (newHeight < this._maxHeight) ? newHeight : this._maxHeight;
            $(this._element[0]).css('height', newHeight);
            this._previousWindowHeight = windowHeight;
        }

        this._element.find('.grid-canvas').css('overflow-x', 'auto');
        super._onContainerResize(e);
    }

    /// <summary>Resize the grid based on the opening and closing of the panels</summary>
    private _resizeGrid(trigger) {
        var currentHeight = $(this._element[0]).height();

        // Need to account for the size of the add and edit panels
        if (trigger.open && !this._openPanel) {
            var height = (this.getGridHeight() > currentHeight) ? currentHeight - this._panelHeight : currentHeight;
            this._decreasedSize = (height !== currentHeight) ? true : false;
            $(this._element[0]).css('height', height);
            this._openPanel = true;
        }
        else if (!trigger.open && this._openPanel) {
            var height = (this.getGridHeight() > currentHeight) ? currentHeight + this._panelHeight : currentHeight;
            $(this._element[0]).css('height', height);
            this._openPanel = false;
        }

    }

    public static showProgressCursor() {
        $("body").css("cursor", "progress");
        $(".grid div").css("cursor", "progress");
    }

    public static stopProgressCursor() {
        $("body").css("cursor", "");
        $(".grid div").css("cursor", "");
    }

    /// <summary>On double click fire an event to open up the edit panel</summary>
    public onRowDoubleClick(eventArgs): any {
        UserGrid.stopProgressCursor();
        UserGrid.doubleClick = 0;
        //Display edit panel
        if (Helpers.ControlsHelper.isEmpty(this._extensionId)) {
            this._fire("showEditUser", null);
        }
    }

    /// <summary>On click fire an event to open up the ID card for the AAD user</summary>
    public onCellClick(eventArgs): any {
        //filter out double click events and let the double click handler pick them up instead
        UserGrid.showProgressCursor();
        if (UserGrid.doubleClick != 0) {
            UserGrid.doubleClick = 0;
            clearTimeout(UserGrid.timer);
            return;
        }
        var that = this; //'this' does not preserve scope inside setTimeout

        UserGrid.doubleClick = 1;
        UserGrid.timer = setTimeout(function () {
            clearTimeout(UserGrid.timer);
            UserGrid.doubleClick = 0;
            var rowData = that.getRowData(that._selectedIndex);
            var operationScope: Identities_Services.IOperationScope = {
                AAD: true
            };
            var identityType: Identities_Services.IEntityType = {
                User: true,
            };
            var idCardDialogOptions: IdentityPicker.IIdentityPickerIdCardDialogOptions = {
                anchor: that.getRowInfo(that._selectedIndex).row,
                uniqueIdentifier: rowData.SignInAddress,
                leftValue: eventArgs.pageX,
                identityType: identityType,
                operationScope: operationScope,
                consumerId: UserGrid.CONTACT_CARD_CONSUMER_ID
            };
            that._fire("showIdCard", idCardDialogOptions);
        }, 250);
    }

    /// <summary>Update and refresh the grid</summary>
    _updateUserGrid(refresh, extension?: ExtVM.ExtensionViewModel) {
        // Only override the extension if not null
        if (extension != null) {
            this._extension = extension;
        }
        if (refresh !== true) {
            refresh = false;
        }
        this._refresh = refresh;
        if (extension == null || extension.getExtensionId() == null) {
            this._getIdentityList(this._extensionId);
        } else {
            this._getIdentityList(extension.getExtensionId());
            this._extensionId = extension.getExtensionId();
        }
        this.redraw();
        this._onContainerResize(null);
    }

    /// <summary>Get grid for the users</summary>
    private _getIdentityList(extensionId?: string) {
        if (Helpers.ControlsHelper.isEmpty(extensionId)) {
            this._getIdentityListAll();
        } else {
            this._getIdentityListWithExtensionId(extensionId);
        }
    }

    private _getIdentityListAll() {
        var dummy = new Date();

        if (this._options.tfsContext && this._options.tfsContext.isHosted) {
            //Make call to get data.
            CoreAjax.getMSJSON(this._options.tfsContext.getActionUrl("GetAccountUsers", "apiusermanagement"),
                {
                    mkt: "en-us",
                    // no parameters. hack to ensure there is no cache.
                    _t: dummy.getTime()
                },
                // handle success.
                delegate(this, this._getAccountUserSuccess),
                //handle error.
                delegate(this, this._getAccountUserFailed)
            );
        }
    }

    private _getIdentityListWithExtensionId(extensionId) {
        var dummy = new Date();
        //Make call to get data.
        CoreAjax.getMSJSON(this._options.tfsContext.getActionUrl("GetAccountExtensionUsers", "apiusermanagement", { "extensionId": extensionId }),
            {
                mkt: "en-us",
                // no parameters. hack to ensure there is no cache.
                _t: dummy.getTime()
            },
            // handle success.
            delegate(this, this._getAccountExtensionUserSuccess),
            //handle error.
            delegate(this, this._getAccountUserFailed)
        );
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

    /// <summary>Set up the display columns for the user grid</summary>
    private _getAccountUserSuccess(data) {
        this._setUpGridData(data, this._getColumnsForAllUsers());

        //Notify parts of the page that data has been loaded
        eventService.fire("tfs-update-license", data.licenseDictionary, data.LicenseOverview);
        eventService.fire("tfs-update-edituserdropdown", data.Licenses);
        eventService.fire("tfs-clear-search", null);
        eventService.fire("tfs-update-adduserdropdown", data.Licenses, data.licenseDictionary);

        this._onContainerResize();
        //Set refresh for message area
        data.refresh = this._refresh;
        eventService.fire("tfs-update-messageArea", data, this.getGridHeight());
    }

    private _getAccountExtensionUserSuccess(data) {
        var allOrNothing = false;
        var showInvalidIcon = false;
        if (this._extension) {
            allOrNothing = this._extension.getAllOrNothing();
            showInvalidIcon = this._extension.getIsTrialExpiredWithNoPurchase();
        }
        this._setUpGridData(data, this._getColumnsForExtensions(allOrNothing, showInvalidIcon));

        //Notify parts of the page that data has been loaded
        eventService.fire("tfs-clear-license");
        eventService.fire("tfs-clear-search", null);
        eventService.fire("tfs-update-extensionLicenseStatusLabel",
            new ExtAvailVM.ExtensionAvailabilityViewModel(data["ExtensionAvailabilityViewModel"], allOrNothing));

        //Set refresh for message area
        data.refresh = this._refresh;
        eventService.fire("tfs-update-messageArea-check-permission", data, this.getGridHeight());
    }

    private _getColumnsForExtensions(allOrNothing, showInvalidIcon): Array<Object> {
        var that = this;
        var extensionColumns = [
            {
                text: "",
                width: 32,
                index: "UserId",
                canSortBy: false,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, width) {
                    var cell: JQuery, UserId = this.getColumnValue(dataIndex, column.index);
                    cell = $("<div class='grid-cell grid-cell-with-pointercursor' />").width(column.width || width);


                    if (UserId != AddUserMgmtPanel.AddUserManagementPanel._placeHolderString) {
                        this.identityImageElement(this._options.tfsContext, UserId, null, "user-picture-small").appendTo(cell);
                    } else {
                        cell.append($("<div class='saving-icon'/>"));
                    }

                    //Use Aad features
                    if (this._ffIsUserCardEnabled) {
                        this._bind(cell, "click", delegate(this, this.onCellClick));
                    }
                    return cell;
                }
            },
            {
                text: AccountResources.UserGridColName,
                width: 160,
                index: "Name",
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, width) {
                    var cell: JQuery, cellValue = this.getColumnValue(dataIndex, column.index);
                    cell = $("<div class='grid-cell grid-cell-with-padding'/>").width(column.width || width).text(cellValue);

                    return cell;
                }
            },
            {
                text: AccountResources.UserGridColEmail,
                index: "SignInAddress",
                width: 300,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, width) {
                    var cell: JQuery, cellValue = this.getColumnValue(dataIndex, column.index);
                    cell = $("<div class='grid-cell grid-cell-with-padding'/>").width(column.width || width).text(cellValue);

                    return cell;
                }
            },
            {
                text: AccountResources.UserGridColExtStatus,
                width: 250,
                index: "isMsdn",
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, width) {
                    var cell: JQuery, statusValue, cellValue = this.getColumnValue(dataIndex, column.index);
                    var cellText = "";
                    var extensionState = "";
                    var isRoaming = this.getColumnValue(dataIndex, "IsRoaming");
                    var sourceCollectionName = this.getColumnValue(dataIndex, "SourceCollectionName");
                    if (that._extension) {
                        extensionState = that._extension.getExtensionState();
                    }
                    
                    if (cellValue) {
                        cellText = AccountResources.IncludedWithSubscription;
                    } else if (isRoaming) {
                        cellText = Utils_String.format(AccountResources.ExtensionSourcedFrom, sourceCollectionName);
                    } else if (that._extension.getIncludedCount() == 0) {
                        if (extensionState === "Trial") {
                            cellText = Utils_String.format(AccountResources.ExtensionTrialEndsState, Utils_Date.format(that._extension.getBillingStartDate(), "M/d/yyyy"));
                        }
                        else if (this._options.tfsContext.isHosted) {
                            cellText = AccountResources.UserSectionPaidMonthly;
                        }
                    }
                    

                    if (showInvalidIcon) {
                        cell = $("<div/>");
                        var iconCell = $("<div class='icon icon-tfs-tcm-blocked-small' style='float:left; margin-top:4px;' />");
                        var extCell = $("<div class='grid-cell grid-cell-with-padding'/>").text(cellText);
                        iconCell.appendTo(cell);
                        extCell.appendTo(cell);
                    } else {
                        cell = $("<div class='grid-cell grid-cell-with-padding'/>").width(column.width || width).text(cellText);
                    }

                    return cell;
                }
            }];
        return extensionColumns;

    }

    private _getColumnsForAllUsers(): Array<Object> {
        return [
            {
                text: "",
                width: 32,
                index: "UserId",
                canSortBy: false,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, width) {
                    var cell: JQuery, UserId = this.getColumnValue(dataIndex, column.index);
                    cell = $("<div class='grid-cell grid-cell-with-pointercursor' />").width(column.width || width);


                    if (UserId != AddUserMgmtPanel.AddUserManagementPanel._placeHolderString) {
                        this.identityImageElement(this._options.tfsContext, UserId, null, "user-picture-small").appendTo(cell);
                    } else {
                        cell.append($("<div class='saving-icon'/>"));
                    }

                    //Use Aad features
                    if (this._ffIsUserCardEnabled) {
                        this._bind(cell, "click", delegate(this, this.onCellClick));
                    }
                    return cell;
                }
            },
            {
                text: AccountResources.UserGridColName,
                width: 160,
                index: "Name",
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, width) {
                    var cell: JQuery, cellValue = this.getColumnValue(dataIndex, column.index);
                    cell = $("<div class='grid-cell grid-cell-with-padding'/>").width(column.width || width).text(cellValue);

                    return cell;
                }
            },
            {
                text: AccountResources.UserGridColEmail,
                index: "SignInAddress",
                width: 200,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, width) {
                    var cell: JQuery, cellValue = this.getColumnValue(dataIndex, column.index);
                    cell = $("<div class='grid-cell grid-cell-with-padding'/>").width(column.width || width).text(cellValue);

                    return cell;
                }
            },
            {
                text: AccountResources.UserGridColLicense,
                width: 250,
                index: "LicenseType",
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, width) {
                    var cell: JQuery, statusValue, cellValue = this.getColumnValue(dataIndex, column.index);
                    cell = $("<div class='grid-cell grid-cell-with-padding'/>").width(column.width || width);

                    statusValue = this.getColumnValue(dataIndex, "Status");
                    if ((statusValue.length > 0 && statusValue != AccountResources.UserStatusPending)
                        || (cellValue.length > 0 && cellValue == AccountResources.UserStatusNone)) {
                        cell.append($("<div class='icon icon-tfs-tcm-blocked-small'/>"));
                    }

                    $(domElem("div")).appendTo(cell).text(cellValue);
                    return cell;
                }
            },
            {
                text: AccountResources.UserGridColStatus,
                width: 250,
                index: "Status",
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, width) {
                    var cell: JQuery, cellValue = this.getColumnValue(dataIndex, column.index);
                    if (cellValue === AccountResources.UserStatusDisabled) {
                        cellValue = "";
                    }
                    cell = $("<div class='grid-cell grid-cell-with-padding'/>").width(column.width || width).text(cellValue);
                    return cell;
                }
            },
            {
                text: AccountResources.UserGridColLastAccessed,
                index: "LastAccessed",
                width: 150,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder, width) {
                    var cell: JQuery, cellValue = this.getColumnValue(dataIndex, column.index);
                    cell = $("<div class='grid-cell grid-cell-with-padding'/>").width(column.width || 100).text(cellValue);
                    return cell;
                },
                comparer: function (column, order, rowA, rowB) {
                    var a = rowA["LastAccessed"], b = rowB["LastAccessed"];

                    //null and undefined check
                    if (!a && !b) return 0;
                    if (!a) return -1;
                    if (!b) return 1;

                    var x = new Date(a).getTime();
                    var y = new Date(b).getTime();

                    // not date check
                    if (isNaN(x) && isNaN(y)) return 0;
                    if (isNaN(x)) return -1;
                    if (isNaN(y)) return 1;

                    return x - y;
                }
            }
        ];
    }

    private _setUpGridData(data, column: Array<Object>): void {
        var userList = [], index = 0, user;
        // check of the Users entity is not null.
        if (data.Users != null) {
            for (index = 0; index < data.Users.length; index++) {
                user = data.Users[index];
                userList[index] = user;
            }
        }

        //Set up the displayed columsn in the grid
        this._options.columns = column;

        //Initialize grid data source
        this._options.source = userList;
        this._originalData = userList;
        this.initializeDataSource();
    }

    /// <summary>Determines the height of the grid from its children</summary>
    public getGridHeight() {
        var totalHeight = 100;
        this._canvas.children(".grid-row").each(function () {
            totalHeight += $(this).outerHeight(true);
        });

        return totalHeight;
    }

    /// <summary>Number of rows in the grid</summary>
    public length() {
        return this._originalData.length;
    }

    /// <summary>Client side search of the data in the grid</summary>
    public localSearch(searchQuery: string) {
        var i: number,
            user: any,
            results: any[] = [],
            searchFields: string[];

        for (i = 0; i < this._originalData.length; i++) {
            user = this._originalData[i];
            searchFields = [user.Name, user.LicenseType, user.SignInAddress, user.Status];
            // Perform case-insensitive search for searchQuery on searchFields (joined by \n)
            if (searchFields.join('\n').toLocaleLowerCase().indexOf(searchQuery.toLocaleLowerCase()) > -1) {
                results.push(user);
            }
        }

        this._options.source = results;
        this.initializeDataSource();

    }

    /// <summary>Add a fake item to the grid while ajax call is being made</summary>
    public addPlaceholder(data) {
        this._originalData.push(data);
        this._options.source = this._originalData;
        this.initializeDataSource();
    }

    /// <summary>Remove placeholder item from the grid </summary>
    public removePlaceholder() {
        //Placeholder is always the last item in the array
        this._originalData.pop();
        this._options.source = this._originalData;
        this.initializeDataSource();
    }

    /// <summary>Restore the grid to the its non searched state</summary>
    public cancelSearch() {
        this._options.source = this._originalData;
        this.initializeDataSource();

    }

    /// <summary>Notify the message error that getting grid data has failed</summary>
    private _getAccountUserFailed(error) {
        eventService.fire("tfs-update-messageArea", null, null);
    }

}

VSS.initClassPrototype(UserGrid, {
    _originalData: null,
    _previousWindowHeight: 0,
    _minHeight: 0,
    _maxHeight: 0,
    _openPanel: null,
    _decreasedSize: false,
    _panelHeight: 0
});


VSS.classExtend(UserGrid, SPS_Host_TfsContext.TfsContext.ControlExtensions);