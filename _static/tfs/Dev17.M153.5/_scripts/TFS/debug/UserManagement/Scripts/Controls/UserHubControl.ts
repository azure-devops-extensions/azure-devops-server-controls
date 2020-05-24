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
import Utils_Date = require("VSS/Utils/Date");
import Grids = require("VSS/Controls/Grids");
import Dialogs = require("VSS/Controls/Dialogs");
import Menus = require("VSS/Controls/Menus");
import Diag = require("VSS/Diag");
import UserGrid = require("UserManagement/Scripts/Models/UserGrid");
import RowSavingMgr = require("UserManagement/Scripts/Utils/RowSavingManager");
import Helpers = require("UserManagement/Scripts/Utils/Helpers");
import AssignAllDiag = require("UserManagement/Scripts/Dialogs/AssignAllUsersDialog");
import DelUsrDialog = require("UserManagement/Scripts/Dialogs/DeleteUserDialog");
import AddUserMgmtPanel = require("UserManagement/Scripts/Panels/AddUserManagementPanel");
import AddExtUserMgmtPanel = require("UserManagement/Scripts/Panels/AddExtensionUserManagementPanel");
import ExtVM = require("UserManagement/Scripts/Models/ExtensionViewModel");
import EditUserMgmtPanel = require("UserManagement/Scripts/Panels/EditUserManagementPanel");

var eventService = Events_Services.getService();
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

// This class represents the basic Hub control.
export class UserHubControl extends Controls.BaseControl {    
    public static enhancementTypeName: string = "tfs.account.UserHub";
    public _menuBar: Menus.MenuBar;


    private $userCol: any;
    private $userGrid: UserGrid.UserGrid;
    private $menuBarContainer: any;
    private $panelContainer: any;
    private $messageArea: Notifications.MessageAreaControl;
    private $headermessageArea: Notifications.MessageAreaControl;
    private _rowSavingManager: RowSavingMgr.RowSavingManager;
    private _searchControl: JQuery;
    private $messageAreaContainer: any;
    private $headermessageAreaContainer: any;
    private $permissions: any;
    private $licenses: any;
    private $allLicenses: any;
    private $displayPanel: any;
    private $userPanel: any;
    private $extensionUserPanel: AddExtUserMgmtPanel.AddExtensionUserManagementPanel;
    private $editPanel: any;
    private $highlighted: any;
    private $editMenuItem: any;
    private $addMenuItem: any;
    private $extensionAddMenuItem: any;
    private $identitySearchControl: any;
    private $savingRow: any;
    private $deletedRow: any;
    private $panels: any[];
    private _extension: ExtVM.ExtensionViewModel;

    //For Aad features
    private _ffIsUserCardEnabled: boolean;
    private _isAadAccount: boolean;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._extension = ExtVM.ExtensionViewModel.newEmptyExtensionViewModel();
        this.$permissions = this._getPermissionContext();
        this.$userCol = this._element.find('#userCol');
        this.$menuBarContainer = this._element.find('#menuBar');
        this.$panelContainer = this._element.find('#panel');
        this.$messageAreaContainer = this._element.find('#commonMessage');
        this.$headermessageAreaContainer = this._element.find('#headerInfoMessage');
        $(".hub-content").css("overflow", "hidden");
        this.$displayPanel = true;

        //Enable aad features
        this._isAadAccount = false;
        if (this.$permissions.isAadAccount && this.$permissions.featureFlags && "UserhubAad" in this.$permissions.featureFlags && this.$permissions.featureFlags["UserhubAad"]) {
            this._isAadAccount = true;
            this._bind(IdentityPicker.IdentityPickerSearchControl.SEARCH_STARTED_EVENT, UserGrid.UserGrid.showProgressCursor);
            this._bind(IdentityPicker.IdentityPickerSearchControl.SEARCH_FINISHED_EVENT, UserGrid.UserGrid.stopProgressCursor);
        }

        this._ffIsUserCardEnabled = false;
        if (this.$permissions.featureFlags && "UserhubAad.UserCard" in this.$permissions.featureFlags && this.$permissions.featureFlags["UserhubAad.UserCard"]) {
            this._ffIsUserCardEnabled = true;
            this.$userCol.bind("showIdCard", delegate(this, this._showUserIdCard));
            eventService.attachEvent(IdentityPicker.IdCardDialog.IDCARD_LOADED_EVENT, UserGrid.UserGrid.stopProgressCursor);
        }
        
        this._initializeSetup();
    }

    /// <summary> Get permission data</summary>
    private _getPermissionContext() {
        // Getting the JSON string serialized by the server according to the current host
        var contextElement, json;

        contextElement = $(".permissions-context", document);

        if (contextElement.length > 0) {
            json = contextElement.eq(0).html();
            if (json) {
                return Utils_Core.parseMSJSON(json, false);
            }
        }
        return null;
    }

    private _getNextResetDate() {
        var contextElement, date;

        contextElement = $(".userHub-resetDate", document);

        if (contextElement.length > 0) {
            date = contextElement.eq(0).html();
            if (date) {
                return Utils_Date.localeFormat(Utils_Date.parseDateString(date), "M/d/y");
            }
        }
        return null;
    }

    private _initializeSetup() {

        // set up for Message Area.
        this.$messageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this.$messageAreaContainer);
        $(this.$messageAreaContainer).addClass('message-bar');
        this.$headermessageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this.$headermessageAreaContainer);
        $(this.$headermessageAreaContainer).addClass('message-bar');
        this._setupMenuBars();  // This is for Menu.
        this._initializeGrid(); // This is for Grid.
        this._initializeRowSavingManager();

        this._initializePanel();
        eventService.attachEvent("tfs-update-messageArea", delegate(this, this._updateMessageArea));
        eventService.attachEvent("tfs-update-early-adopter-message", delegate(this, this._updateEarlyAdopterMessage));
        eventService.attachEvent("tfs-update-buy-now-link-for-all-or-nothing", delegate(this, this._updateAllOrNothingBuyNowLink));
        eventService.attachEvent("tfs-update-messageArea-check-permission", delegate(this, this._updateMessageAreaCheckPermission));

        this._showReadOnlyViewMessage();
    }

    private _showReadOnlyViewMessage() {
        //If user is not an account owner or admin show the read only view message
        if (!this.$permissions.isAdmin && !this.$permissions.isAccountOwner) {
            this.$messageArea.setMessage(AccountResources.ReadOnlyView, Notifications.MessageAreaType.Warning);
        }
    }

    /// <summary> Initialize panel elements</summary>
    private _initializePanel() {
        this.$panels = [];

        this.$userPanel = <AddUserMgmtPanel.AddUserManagementPanel>Controls.BaseControl.createIn(AddUserMgmtPanel.AddUserManagementPanel, this.$panelContainer, {
            displayPanel: true,
            tfsContext: this._options.tfsContext,
            messageArea: this.$messageArea,
            menuItem: this._menuBar._children[0]._element,
            savingManager: this._rowSavingManager,
            isAadAccount: this._isAadAccount,
            tenantName: this.$permissions.tenantName
        });
        this.$panels.push(this.$userPanel);

        this.$extensionUserPanel = <AddExtUserMgmtPanel.AddExtensionUserManagementPanel>Controls.BaseControl.createIn(AddExtUserMgmtPanel.AddExtensionUserManagementPanel, this.$panelContainer, {
            displayPanel: true,
            tfsContext: this._options.tfsContext,
            messageArea: this.$messageArea,
            menuItem: this._menuBar._children[3]._element,
            savingManager: this._rowSavingManager,
            isAadAccount: this._isAadAccount,
            tenantName: this.$permissions.tenantName,
        });
        this.$panels.push(this.$extensionUserPanel);

        $(this.$panelContainer).bind("saveInProgess", delegate(this, this._onSave));

        this.$editPanel = <EditUserMgmtPanel.EditUserManagementPanel>Controls.BaseControl.createIn(EditUserMgmtPanel.EditUserManagementPanel, this.$panelContainer, {
            displayPanel: true,
            tfsContext: this._options.tfsContext,
            messageArea: this.$messageArea,
            menuItem: this._menuBar._children[1]._element
        });
        this.$panels.push(this.$editPanel);

    }

    /// <summary> Initialize the grid</summary>
    public _initializeGrid() {
        // Creating container for User Grid control.
        var userControl,
            container = $("<div class='account-members-container' />")
                .appendTo(this.$userCol);

        this.$userGrid = <UserGrid.UserGrid>Controls.Enhancement.enhance(UserGrid.UserGrid, container, { gutter: false, isAadAccount: this._isAadAccount, ffIsUserCardEnabled: this._ffIsUserCardEnabled });
        $(container).bind("selectedUserChanged", delegate(this, this._onSelectedUserChanged));
        $(container).bind("showEditUser", delegate(this, this._displayEdit));
        this.$identitySearchControl = (<any>this._searchControl).IdentitySearchControl({
            identityList: this.$userGrid,
            watermarkText: AccountResources.FindUsers
        }).data('IdentitySearchControl');
    }

    /// <summary>Initializes the row saving manager</summary>
    private _initializeRowSavingManager() {

        var that = this;
        // Attach the saving manager to the grid
        this._rowSavingManager = new RowSavingMgr.RowSavingManager(
            this.$userGrid,
            function (Id) {
                /// <summary>Get the data index the provided ID is associated with.</summary>
                /// <param name="workItemId" type="Number">Work Item ID being looked up.</param>

                Diag.Debug.assertParamIsNumber(Id, "ID");

                return Id;
            },
            function (dataIndex) {
                /// <summary>Get the id of the node associated with the provided data index.</summary>
                /// <param name="dataIndex" type="Number">Data index of the node being looked up.</param>

                Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

                return dataIndex;
            });
    }

    /// <summary>Manage state of the menubar on user change event</summary>
    private _onSelectedUserChanged(event, user) {
        // flag for self delete.
        var selfDelete = false;
        var allowEdit = true;
        var rowSaving = false;

        if (this._options.tfsContext.currentIdentity.id === user.currentUser.UserId) {
            selfDelete = true;
        }

        if (AddUserMgmtPanel.AddUserManagementPanel._placeHolderString === user.currentUser.UserId) {
            selfDelete = true;
            allowEdit = false;
        }

        if (this.$savingRow && this._rowSavingManager.isRowSaving(this.$savingRow)) {
            rowSaving = true;
        }

        var isTrial = this._extension.getExtensionState() == "Trial";
        var hasIncludedQuantity = this._extension.getIncludedCount() > 0;
        this.$editPanel._setUser(user.currentUser, selfDelete);
        if (this._extension && this._extension.getAllOrNothing()) {
            this._menuBar.updateCommandStates(
                Helpers.MenuBarCommandHelper.showNoMenuBars(true, true, this.$permissions.isAdmin, this.$permissions.isAccountOwner)
            );
        }
        else {
            this._menuBar.updateCommandStates(
                Helpers.MenuBarCommandHelper.getMenusBarUpdateWhenSelectedUserIsChanged(
                    this._extension.isExtensionIdFilled(),
                    selfDelete,
                    rowSaving,
                    allowEdit,
                    this.$permissions.isAdmin,
                    this.$permissions.isAccountOwner,
                    isTrial,
                    hasIncludedQuantity
                )
            );
        }
    }

    /// <summary>Set up the mnubars</summary>
    public _setupMenuBars() {
        // Create actions container.
        var actionsControlElement = $(domElem('div')).appendTo(this.$menuBarContainer).addClass('membership-control-actions toolbar');

        this._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, actionsControlElement, {
            items: this.toolsItems(),
            executeAction: delegate(this, this._onMenuItemClick)
        });

        this._searchControl = $(domElem('div')).appendTo(actionsControlElement)
            .addClass('identity-grid-search');

        this.$addMenuItem = this._menuBar._menuItems[0]._element;
        this.$editMenuItem = this._menuBar._menuItems[1]._element;
        this.$extensionAddMenuItem = this._menuBar._menuItems[3]._element;
        var isTrial = this._extension.getExtensionState() == "Trial";
        var hasIncludedQuantities = this._extension.getIncludedCount() > 0;
        this._menuBar.updateCommandStates(
            Helpers.MenuBarCommandHelper.getMenusBarUpdateCommandsWhenNoUserIsSelected(
                this._extension.isExtensionIdFilled(),
                this.$permissions.isAdmin,
                this.$permissions.isAccountOwner,
                isTrial,
                hasIncludedQuantities
            )
        );

        eventService.attachEvent("tfs-update-menubar", delegate(this, this._updateMenuBar));
        eventService.attachEvent("tfs-update-menubarCommands", delegate(this, this._updateMenuBarCommands));
        eventService.attachEvent("tfs-clear-editUserPanels", delegate(this, this._hideEditUserPanel));
    }

    /// <summary>Creates the menu items used in the user management toolbar</summary>
    private toolsItems() {
        return Helpers.MenuBarCommandHelper.getMenusBarInitialCommands(
            false,
            this.$permissions.isAdmin,
            this.$permissions.isAccountOwner
        );
    }

    private _updateMenuBarWhenFirstEntryWithoutClickAnyUser(): void {
        if (this._extension && this._extension.getAllOrNothing()) {

            this._menuBar.updateCommandStates(
                Helpers.MenuBarCommandHelper.showNoMenuBars(true, true, this.$permissions.isAdmin, this.$permissions.isAccountOwner)
            );
            return;
        }
        var hasIncludedQuantities = this._extension.getIncludedCount() > 0;
        var isTrial = this._extension.getExtensionState() == "Trial";
        this._menuBar.updateCommandStates(
            Helpers.MenuBarCommandHelper.getMenusBarUpdateCommandsWhenNoUserIsSelected(
                this._extension.isExtensionIdFilled(),
                this.$permissions.isAdmin,
                this.$permissions.isAccountOwner,
                isTrial,
                hasIncludedQuantities
            )
        );
    }

    /// <summary>Handle menu item clicks</summary>
    public _onMenuItemClick(e?: any): any {
        //get item id
        var command = this._getCommandName(e);
        var menuItem = e._commandSource._element;

        switch (command) {
            case "addUser":
                this.$highlighted = menuItem;
                this._addUser();
                this._menuBar.getItem("editUser")._element.removeClass("highlight-button");
                return false;
            case "editUser":
                this.$highlighted = menuItem;
                this._menuBar.getItem("addUser")._element.removeClass("highlight-button");
                this._toggleEditUser();
                return false;
            case "removeUser":
                this._removeUser();
                return false;
            case "assignUsers":
                this.$highlighted = menuItem;
                this._addExtensionUser();
                this._menuBar.getItem("assignUsers");
                return false;
            case "assignAllUsers":
                this._assignAllUsersToExtension();
                return false;
            case "unassign":
                this._removeUserFromExtension();
                return false;
            case "exportCSV":
                this._exportCSVFromServer();
                return false;
            case "refresh":
                eventService.fire("tfs-update-grid", true);
                this._updateMenuBarWhenFirstEntryWithoutClickAnyUser();
                return false;
        }
    }

    private _exportCSVFromServer(): void {
        if (this._options && this._options.tfsContext.isHosted) {
            window.parent.location.href = this._options.tfsContext.getActionUrl("GetAccountAndUserExtensionToCSV", "apiusermanagement");
        } else {
            if((this._extension && this._extension.getExtensionId())) {
            // if there is an extension, get a list of users that has the extension subscription
                window.location.href = this._options.tfsContext.getActionUrl("GetAccountExtensionUsersToCSV", "apiusermanagement", { extensionId: this._extension.getExtensionId() });
            }
        }
    }

    /// <summary>Determine command name</summary>
    public _getCommandName(e?: any): string {
        return e.get_commandName();
    }

    /// <summary>Update the menu bar</summary>
    private _updateMenuBar(bools: boolean[]) {
        this._menuBar.updateCommandStates(
            Helpers.MenuBarCommandHelper.getMenusBarUpdateByBitFieldAndExtensionState(this._extension.isExtensionIdFilled(), bools, this.$permissions.isAdmin, this.$permissions.isAccountOwner)
        );
    }

    private _updateMenuBarCommands(extension: ExtVM.ExtensionViewModel) {
        if (extension instanceof ExtVM.ExtensionViewModel) {
            this._extension = extension;
        } else {
            this._extension = ExtVM.ExtensionViewModel.newEmptyExtensionViewModel();
        }
        this.$messageArea.clear();
        this.$headermessageArea.clear();
        this._updateMenuBarWhenFirstEntryWithoutClickAnyUser();
        this._showReadOnlyViewMessage();
        this.$extensionUserPanel.setExtensionId(this._extension.getExtensionId());
    }

    private _updateAllOrNothingBuyNowLink(extension: ExtVM.ExtensionViewModel) {
        if (!this._options.tfsContext) {
            return;
        }
        CoreAjax.getMSJSON(this._options.tfsContext.getActionUrl("GetExtensionUrls", "apiextension"),
            {
                mkt: "en-us",
                extensionId: extension.getExtensionId()
            },
            // handle success.
            delegate(this, (data) => {
                this._updateEarlyAdopterMessage(extension, data);
            }),
            //handle error.
            delegate(this, (data) => {
                this._updateEarlyAdopterMessage(extension);
            })
        );
    }

    private _updateEarlyAdopterMessage(extension: ExtVM.ExtensionViewModel, data?: any) {

        var currDate = new Date().getUTCDate;
        var state = extension.getExtensionState();
        var gracePeriod = extension.getGracePeriod();
        var trialPeriod = extension.getTrialPeriod();
        var billingStartDate = "";
        var isEarlyAdopter = extension.getIsEarlyAdopter();
        var message = null;
        var messageType = Notifications.MessageAreaType.Warning;
        var buyNow = AccountResources.BuyNow;

        if (extension.getBillingStartDate()) {
            billingStartDate = extension.getBillingStartDate().toDateString();
        }

        if (data) {
            buyNow = Utils_String.format(AccountResources.BuyNowButton, data["BuyMoreUrl"]);
        }

        this.$headermessageArea.clear();
        if (extension.getIsPurchaseCanceled()) {
            message = Utils_String.format(AccountResources.ExtensionAfterCancelBeforeNextMeterResetNotification, this._getNextResetDate() || billingStartDate, extension.getDisplayName(), buyNow, extension.getDisplayName());
        } else if (extension.getIsTrialExpiredWithNoPurchase()) {
            if (extension.getIncludedCount() && extension.getIncludedCount() > 0) {
                message = Utils_String.format(AccountResources.TrialExpiredWithIncludedQuantitiesButNoPurchaseNotification, extension.getDisplayName(), extension.getIncludedCount(), buyNow);
                messageType = Notifications.MessageAreaType.Info;
            } else {
                message = Utils_String.format(AccountResources.TrialExpiredButNoPurchaseNotification, extension.getDisplayName(), buyNow, extension.getDisplayName(), extension.getDisplayName());
                messageType = Notifications.MessageAreaType.Error;
            }
            
        } else {
            if (isEarlyAdopter) {
                if ("Preview" == state && billingStartDate) {
                    message = Utils_String.format(AccountResources.PreviewExtensionWithBillingStartDate, extension.getDisplayName(), buyNow, extension.getDisplayName(), billingStartDate);
                } else if ("Preview" == state) {
                    message = Utils_String.format(AccountResources.PreviewExtensionWithoutBillingStartDate, extension.getDisplayName());
                } else if (("Trial" == state || "TrialWithBuy" == state) && billingStartDate) {
                    if (extension.getIsFirstParty()) {
                        message = Utils_String.format(AccountResources.TrialExtensionWithBillingStartDateFirstParty, trialPeriod, buyNow, extension.getDisplayName(), billingStartDate);
                    }
                    else {
                        message = Utils_String.format(AccountResources.TrialExtensionWithBillingStartDate, trialPeriod, buyNow, extension.getDisplayName(), billingStartDate);
                    }
                }
            } 
            else if (billingStartDate) {
                if ("Trial" == state) {
                    message = Utils_String.format(AccountResources.TrialExtensionWithGracePeriod, extension.getDisplayName(), trialPeriod, buyNow, billingStartDate);
                }
                else if ("TrialWithBuy" == state)
                {
                    messageType = Notifications.MessageAreaType.Info;

                    if (extension.getIsFirstParty()) {
                        message = Utils_String.format(AccountResources.TrialExtensionWithPurchaseFirstParty, extension.getDisplayName(), trialPeriod, billingStartDate);
                    }
                    else {
                        message = Utils_String.format(AccountResources.TrialExtensionWithPurchase, extension.getDisplayName(), trialPeriod);
                    }
                }
            }
            if (extension.getAllOrNothing() && !state) {
                message = Utils_String.format(AccountResources.AllOrNothingHeaderNotificationMessage, extension.getDisplayName());
                messageType = Notifications.MessageAreaType.Info;
                if (data) {
                    eventService.fire("tfs-update-cancelPurchaseLink", data);
                }
            }
        }

        if (message) {
            this.$headermessageArea.setMessage($("<div>" + message + "<div>"), messageType);
        }
    }

    /// <summary>Update the message area</summary>
    private _updateMessageArea(licenses, gridHeight) {
        this._updateMessageAreaCheckPermission(licenses, gridHeight);

        if (licenses && licenses.Licenses) {
            this.$licenses = licenses.Licenses;
            var licenseErrors = licenses.LicenseErrors;

            if (!this._licensesAvailable() && (this.$permissions.isAdmin || this.$permissions.isAccountOwner)) {
                if (this.$permissions.displayLink) {
                    var text = $("<div>" + this.$permissions.noLicenseLink + "<div>");
                    this.$messageArea.setMessage({
                        type: Notifications.MessageAreaType.Warning,
                        header: AccountResources.NoLicensesMessage,
                        content: text
                    }, null);
                }
                else {
                    var text = $("<div>" + AccountResources.ExpandedNoLicenseMessage + "<div>");
                    this.$messageArea.setMessage({
                        type: Notifications.MessageAreaType.Warning,
                        header: AccountResources.NoLicensesMessage,
                        content: text
                    }, null);
                }
            }
            if (licenseErrors && (this.$permissions.isAdmin || this.$permissions.isAccountOwner)) {
                this.$messageArea.setMessage($("<div>" + licenseErrors[0] + "</div>"), Notifications.MessageAreaType.Warning);
            }
        }
        else {
            this.$messageArea.setMessage(AccountResources.UserGridDataLoadingError, Notifications.MessageAreaType.Error);
        }

    }

    private _updateMessageAreaCheckPermission(licenses, gridHeight) {
        gridHeight && this.$userCol.height(gridHeight);
        if ((this.$permissions.isAdmin || this.$permissions.isAccountOwner) && licenses && licenses.refresh) {
            this.$messageArea.clear();

            if (licenses.GracePeriodEndDate) {
                var gracePeriodFormattedEndDate = Utils_Date.localeFormat(Utils_Date.parseDateString(licenses.GracePeriodEndDate), "M/d/y");
                if (licenses.InGracePeriod) {
                    var messageObject = $("<span>" + Utils_String.format(AccountResources.LicensesInGracePeriodMessage, "?synchronizeCommerceData=true", gracePeriodFormattedEndDate) + "</span>");
                    this.$messageArea.setMessage(messageObject, Notifications.MessageAreaType.Warning);
                } else if (licenses.GracePeriodExpired) {
                    var messageObject = $("<span>" + Utils_String.format(AccountResources.LicensesOutOfGracePeriod, "?synchronizeCommerceData=true") + "</span>");
                    this.$messageArea.setMessage(messageObject, Notifications.MessageAreaType.Error);
                }
            }
        }
    }

    private _showOnlyPanel(panelToShow: any): void {
        for (var index in this.$panels) {
            if (this.$panels.hasOwnProperty(index)) {
                if (this.$panels[index] === panelToShow) {
                    ((this.$panels[index])._element).show();
                } else {
                    ((this.$panels[index])._element).hide();
                }
            }
        }
        (this.$panelContainer).show();
    }

    /// <summary>Toggle the edit user panel</summary>
    private _toggleEditUser() {
        if (this.$editPanel._element.is(":visible")) {
            this._hideEditUserPanel();
        } else {
            this._showEditUserPanel();
        }

    }

    private _hideEditUserPanel() {
        var obj = { "panel": "edit" };
        if (this.$highlighted) {
            this.$highlighted.removeClass("highlight-button");
        }
        (this.$editPanel._element).hide();
        (this.$panelContainer).hide();
        obj["open"] = false;
        eventService.fire("tfs-resize-grid", obj);
    }

    private _showEditUserPanel() {
        var obj = { "panel": "edit" };
        if (this.$highlighted) {
            this.$highlighted.addClass("highlight-button");
        }
        this._showOnlyPanel(this.$editPanel);
        (<HTMLElement>document.activeElement).blur(); // explicit call for firefox
        (this.$editPanel)._focusLicense();
        obj["open"] = true;
        eventService.fire("tfs-resize-grid", obj);
    }

    /// <summary>Display the edit panel</summary>
    private _displayEdit() {
        this.$messageArea.clear();

        if (this.$permissions.isAdmin || this.$permissions.isAccountOwner) {
            if (this.$userPanel._element.is(":visible")) {
                this.$addMenuItem.removeClass("highlight-button");
            }

            this.$editMenuItem.addClass("highlight-button");
            this._showOnlyPanel(this.$editPanel);
        }
    }

    /// <summary>Open/Close the add user panel</summary>
    private _addUser() {
        this.$messageArea.clear();

        $('#email-input, #add-extension-user-email-input').val("");

        var obj = { "panel": "add" };

        if (this.$userPanel._element.is(":visible")) {
            this.$highlighted.removeClass("highlight-button");
            (this.$userPanel._element).hide();
            (this.$panelContainer).hide();
            obj["open"] = false;
        }
        else {
            this.$highlighted.addClass("highlight-button");
            (<HTMLElement>document.activeElement).blur(); // explicit call for firefox            
            this._showOnlyPanel(this.$userPanel);
            this.$userPanel._focusSearchInput();
            obj["open"] = true;
        }

        eventService.fire("tfs-resize-grid", obj);

    }

    private _addExtensionUser() {
        this.$messageArea.clear();

        var obj = { "panel": "add" };

        if (this.$extensionUserPanel._element.is(":visible")) {
            this.$highlighted.removeClass("highlight-button");
            (this.$extensionUserPanel._element).hide();
            (this.$panelContainer).hide();
            obj["open"] = false;
        }
        else {
            this.$highlighted.addClass("highlight-button");
            this._showOnlyPanel(this.$extensionUserPanel);
            this.$extensionUserPanel._focusSearchInput();
            obj["open"] = true;
        }

        eventService.fire("tfs-resize-grid", obj);;

    }

    /// <summary>Show the remove user dialog</summary>
    private _removeUser() {
        this.$messageArea.clear();

        var rowData = this.$userGrid.getRowData(this.$userGrid._selectedIndex), userTobeDeleted;
        userTobeDeleted = rowData.UserId;

        Dialogs.show(DelUsrDialog.DeleteUserDialog, {
            tfsContext: this._options.tfsContext,
            userId: rowData.UserId,
            name: rowData.Name,
            email: rowData.SignInAddress,
            index: this.$userGrid._selectedIndex,
            isAadAccount: this._isAadAccount,
            tenantName: this.$permissions.tenantName,
            successCallback: delegate(this, this._confirmedRemoveUser)
        });
    }

    /// <summary>Remove User from extension</summary>
    private _removeUserFromExtension() {
        this.$messageArea.clear();
        (<any>this.$extensionUserPanel)._disableAdd();

        var ciData = {
            TotalLicenses: this.$extensionUserPanel.$extensionLicenseStatusLabelControl.$labelDiv.getTotal(),
            InUseLicenses: this.$extensionUserPanel.$extensionLicenseStatusLabelControl.$labelDiv.getInUse(),
            AssignSource: "RemoveUserFromExtension"
        };

        var rowData = this.$userGrid.getRowData(this.$userGrid._selectedIndex);
        var selectedIndex = this.$userGrid._selectedIndex;

        var selectedRows = this.$userGrid._selectedRows;
        var selectedUsers = [];
        for (var selectedRow in selectedRows) {
            var selectedRowData = this.$userGrid.getRowData(Number(selectedRow));
            selectedUsers.push(selectedRowData.UserId);
        }

        this._rowSavingManager.markRowAsSaving(selectedIndex);
        this.$savingRow = selectedIndex;
        this.$deletedRow = selectedIndex;

        if (selectedUsers && selectedUsers.length > 0) {
            //Make call to get data. SHould be post
            CoreAjax.postMSJSON(this._options.tfsContext.getActionUrl("RemoveUserFromExtension", "apiusermanagement"),
                {
                    userIds: selectedUsers,
                    extensionId: this._extension.getExtensionId(),
                    ciData: JSON.stringify(ciData)
                },
                // handle success.
                delegate(this, this._submitRemoveUserFromExtensionSuccess),
                //handle error.
                delegate(this, this._submitRemoveUserFromExtensionFailed)
            );
        }
    }

    /// <summary>Show assign all users dialog</summary>
    private _assignAllUsersToExtension() {
        this.$messageArea.clear();

        Dialogs.show(AssignAllDiag.AssignAllUsersDialog, {
            tfsContext: this._options.tfsContext,
            extension: this._extension,
            successCallback: delegate(this, this._confirmedAssignUsersToExtension)
        });
    }

    private _confirmedAssignUsersToExtension(usersObject, ciData) {
        //Make call to get data.
        CoreAjax.postMSJSON(this._options.tfsContext.getActionUrl("AddMultipleUsersToExtension", "apiusermanagement"),
            {
                serializedUsers: JSON.stringify(usersObject),
                extensionId: this._extension.getExtensionId(),
                ciData: JSON.stringify(ciData)
            },
            delegate(this, this._addUserToExtensionSuccess),
            delegate(this, this._addUserToExtensionFailed)
        );
    }

    // TODO duplicated logic with add extension panel
    private _addUserToExtensionSuccess(data) {
        var bools = [false, true, true];
        if (data.error) {
            this.$messageArea.setMessage(data.error, Notifications.MessageAreaType.Error);
        } else {
            var errors = false;
            var errorText = "";
            for (var i in data) {
                if (data[i].error) {
                    errors = true;
                    errorText += ("\n" + data[i].error);
                }
            }

            if (errors) {
                this.$messageArea.setMessage(errorText.trim(), Notifications.MessageAreaType.Error);
                eventService.fire("tfs-update-grid", null);
            } else {
                eventService.fire("tfs-update-grid", true);
            }
            this._updateMenuBarWhenFirstEntryWithoutClickAnyUser();
        }
    }

    /// <summary> Clean up after adding user has failed</summary>
    private _addUserToExtensionFailed(error) {
        this.$messageArea.setMessage(AccountResources.AddUserError, Notifications.MessageAreaType.Error);
    }


    //For Aad features
    /// <summary>Show the id card</summary>
    private _showUserIdCard(event, args: IdentityPicker.IIdentityPickerIdCardDialogOptions) {
        if (!this._ffIsUserCardEnabled)
            return;
        var idcardDialogOptions: IdentityPicker.IIdentityPickerIdCardDialogOptions = {
            identity: args.identity,
            uniqueIdentifier: args.uniqueIdentifier,
            anchor: args.anchor,
            leftValue: args.leftValue || 0,
            operationScope: args.operationScope,
            identityType: args.identityType,
            consumerId: args.consumerId
        };
        Controls.Enhancement.enhance(IdentityPicker.IdCardDialog, "<div/>", idcardDialogOptions);
    }

    /// <summary>Creates the menu items used in the user management toolbar</summary>
    private _confirmedRemoveUser(data) {
        this.$messageArea.clear();
        this._rowSavingManager.markRowAsSaving(data.index);
        this.$savingRow = data.index;
        this.$deletedRow = data.index;
        this.$userPanel._disableAdd();

        //Make call to get data. SHould be post
        CoreAjax.postMSJSON(this._options.tfsContext.getActionUrl('RemoveUser', 'apiusermanagement'),
            {
                userId: data.Id
            },
            // handle success.
            delegate(this, this._submitRemoveUserSuccess),
            //handle error.
            delegate(this, this._submitRemoveUserFailed)
        );
    }
    /// <summary>Row is currently saving</summary>
    private _onSave(event, row) {
        this.$savingRow = row.currentRow;
    }

    /// <summary>Handle remove user success</summary>
    private _submitRemoveUserSuccess(data) {
        //Clean up row saving
        this._rowSavingManager.clearRowSaving(this.$deletedRow);
        this.$userPanel._enableAdd();

        // Refresh the grid.
        if (data === "success") {

            this.$userGrid._updateUserGrid(true);
            if (this.$editPanel._element.is(":visible")) {
                this.$editMenuItem.removeClass("highlight-button");
                (this.$editPanel._element).hide();
                (this.$panelContainer).hide();
            }
            // update the state of the menu items.
            this._menuBar.updateCommandStates([
                { id: "addUser", disabled: false },
                { id: "removeUser", disabled: true },
                { id: "editUser", disabled: true }
            ]);
        }
        else {
            if (data && data["error"] && data["error"].trim()) {
                this.$messageArea.setMessage(data["error"], Notifications.MessageAreaType.Error);
            }
            else {
                this.$messageArea.setMessage(AccountResources.FailedRemoveUserMessage, Notifications.MessageAreaType.Error);
            }
        }
    }

    /// <summary>Handle remove user from extension success</summary>
    private _submitRemoveUserFromExtensionSuccess(data) {
        //Clean up row saving
        this._rowSavingManager.clearRowSaving(this.$deletedRow);
        (<any>this.$extensionUserPanel)._enableAdd();

        // Refresh the grid.
        if (data === "success") {
            this.$userGrid._updateUserGrid(true);
            if (this.$editPanel._element.is(":visible")) {
                this.$editMenuItem.removeClass("highlight-button");
                (this.$editPanel._element).hide();
                (this.$panelContainer).hide();
            }
            this._updateMenuBarWhenFirstEntryWithoutClickAnyUser();
        } else {
            if (data && data["error"] && data["error"].trim()) {
                this.$messageArea.setMessage(data["error"], Notifications.MessageAreaType.Error);
            } else {
                this.$messageArea.setMessage(AccountResources.FailedRemoveUserMessage, Notifications.MessageAreaType.Error);
            }
        }
    }

    /// <summary>Handle remove user failure</summary>
    private _submitRemoveUserFailed(error) {
        this._rowSavingManager.clearRowSaving(this.$userGrid._selectedIndex);
        (this.$userPanel)._enableAdd();
        if (error !== null) {
            this.$messageArea.setMessage(AccountResources.FailedRemoveUserMessage, Notifications.MessageAreaType.Error);
        }
    }

    /// <summary>Handle remove user from extension failure</summary>
    private _submitRemoveUserFromExtensionFailed(error) {
        this._rowSavingManager.clearRowSaving(this.$userGrid._selectedIndex);
        (<any>this.$extensionUserPanel)._enableAdd();
        if (error !== null) {
            this.$messageArea.setMessage(AccountResources.FailedRemoveUserMessage, Notifications.MessageAreaType.Error);
        }
    }

    /// <summary>Check to see if their are assignable licenses</summary>
    private _licensesAvailable() {
        var flag = false;
        $.each(this.$licenses, function () {
            if (this.Available > 0 && this.LicenseEnum != "Msdn-Eligible") {
                flag = true;
                return false;
            }
        });

        return flag;
    }
}
VSS.classExtend(UserHubControl, SPS_Host_TfsContext.TfsContext.ControlExtensions);