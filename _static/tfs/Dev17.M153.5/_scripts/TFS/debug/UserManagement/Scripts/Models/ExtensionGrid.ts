import Context = require("VSS/Context");
import Grids = require("VSS/Controls/Grids");
import Utils_Core = require("VSS/Utils/Core");
import AccountResources = require("UserManagement/Scripts/Resources/SPS.Resources.UserManagement");
import Events_Services = require("VSS/Events/Services");
import VSS = require("VSS/VSS");
import SPS_Host_TfsContext = require("Presentation/Scripts/TFS/SPS.Host.TfsContext");
import ExtVM = require("UserManagement/Scripts/Models/ExtensionViewModel");
import Helpers = require("UserManagement/Scripts/Utils/Helpers");
import CoreAjax = require("Presentation/Scripts/TFS/SPS.Legacy.Ajax");
import Controls = require("VSS/Controls");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import UserHubCtrl = require("UserManagement/Scripts/Controls/UserHubControl");
var eventService = Events_Services.getService();
var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

export class ExtensionGrid extends Grids.GridO<any> {
    public static enhancementTypeName = "tfs.accounts.ExtensionGrid";
    private static _localStorageLastAccessedKey = "LastAccessedExtensionId";
    public _originalData: any;
    private _previousWindowHeight: number;
    private _minHeight: number;
    private _maxHeight: number;
    private _openPanel: any;
    private _decreasedSize: any;
    private _panelHeight: number;
    private _refresh: any;
    private static timer: number;
    private _license = { "ExtensionId": "", "DisplayName": AccountResources.ExtensionGridLicense };
    private $extensionSection: any;

    constructor(options?) {
        super(options);
    }

    initializeOptions(options?: any) {

        options = $.extend({
            header: true,
            allowMultiSelect: true,
            source: [],
            initialSelection: false,
            columns: [],
            asyncInit: false,
            height: "85%"
        }, options);

        options.columns = [
            {
                text: "",
                width: "100%",
                index: "DisplayName",
                canSortBy: false,
                getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                    var cell: JQuery, cellValue = this._getDisplayName(dataIndex);
                    cell = $("<div class='grid-cell grid-cell-with-padding'/>").width(column.width || 160).text(cellValue);
                    if (!this.getColumnValue(dataIndex, "ExtensionState") && this.getColumnValue(dataIndex, "IsTrialExpiredWithNoPurchase")) {
                        cell = $("<div/>");
                        var iconCell: JQuery = $("<div class='icon icon-tfs-tcm-blocked-small' style= 'float:left; margin-top:4px;' />");
                        var extCell: JQuery = $("<div class='grid-cell grid-cell-with-padding'/>").width("80%").text(cellValue);
                        iconCell.appendTo(cell);
                        extCell.appendTo(cell);
                    }
                    return cell;
                }
            }
        ];
        super.initializeOptions(options);
    }

    private _getDisplayName(dataIndex) {
        var cellValue = this.getColumnValue(dataIndex, "DisplayName");
        var state = this.getColumnValue(dataIndex, "ExtensionState");
        if (state) {
            // For display purposes we will still call it trial rather than trial with buy
            if (state == AccountResources.ExtensionTrialWithBuyState) {
                state = AccountResources.ExtensionTrialState;
            }
            cellValue += " (" + state + ")";
        }
        return cellValue;
    }

    initialize() {
        super.initialize();
        this._previousWindowHeight = $(window).height();
        this._minHeight = 100;
        this._maxHeight = screen.availHeight - 100;
        this._openPanel = false;
        this._panelHeight = 70;
        this._refresh = true;

        this.$extensionSection = this._element.find("#extensionCol");
        eventService.attachEvent("tfs-update-extensions", delegate(this, this._updateExtensionsColContent));
        this._getAvailableExtensionsList();
    }

    /// <summary>Update the extensions area</summary>
    private _updateExtensionsColContent(extensions) {
        if (extensions) {
            if (this._options.tfsContext.isHosted) {
                extensions.unshift(this._license);
            }
            this._options.source = extensions;
            this._originalData = extensions;
            this.initializeDataSource();
            this._navigateTo(extensions);
            this._addBrowseExtensionsLinkToExtensionsPane(extensions);
            if (extensions.length) {
                eventService.fire("tfs-update-userhubTitle", this._getExtensionViewModelBySelectedRow());
            }
        }
    }

    private _addBrowseExtensionsLinkToExtensionsPane(extensions): void {
        var extensionColContainer = document.getElementById("extensionCol");
        if (extensions && extensionColContainer && extensionColContainer.children.length > 0) {
            var index = extensions.length - 1;
            var id = "row_" + extensionColContainer.children[0].getAttribute("id") + "_" + index;
            var browseExtensionsContainer = document.getElementById(id);
            if (browseExtensionsContainer && browseExtensionsContainer.parentNode) {
                var parentNode = browseExtensionsContainer.parentNode;
                var topValue = parseInt(browseExtensionsContainer.style.top) + 36;
                var style = window.getComputedStyle(browseExtensionsContainer, null);
                var browseExtensionsNode = document.createElement("div");

                browseExtensionsNode.setAttribute("id", "browseExtensions");
                browseExtensionsNode.setAttribute("class", "grid-row grid-row-normal");
                browseExtensionsNode.style.top = topValue + "px";
                browseExtensionsNode.style.left = style.left;
                browseExtensionsNode.style.height = style.height;
                browseExtensionsNode.style.paddingLeft = "4px";
                var browseExtUrl = "";
                if (!this._options.tfsContext.isHosted && index >= 0 && extensions[index] && extensions[index].ExtensionUrlsViewModel) {
                    var marketplaceUrl = extensions[index].ExtensionUrlsViewModel.MarketPlaceUrlWithServerKey;
                    browseExtUrl = Utils_String.format(AccountResources.BrowseExtensions, marketplaceUrl);
                }
                else {
                    var hostedMarketplaceUrl = AccountResources.BrowseExtensionsLink + "?targetId=" + Context.getDefaultWebContext().collection.id;
                    browseExtUrl = Utils_String.format(AccountResources.BrowseExtensions, hostedMarketplaceUrl);
                }
                browseExtensionsNode.innerHTML = browseExtUrl;
                parentNode.appendChild(browseExtensionsNode);
            }
        }
    }

    private _navigateTo(extensions): void {

        var navigateTo = this._getJsonIslandExtension();
        if (navigateTo === null) {
            var loadedLastAccessedLocation: string = localStorage.getItem(ExtensionGrid._localStorageLastAccessedKey);
            navigateTo = loadedLastAccessedLocation;
        }
        if (!Helpers.ControlsHelper.isEmpty(navigateTo)) {
            for (var i = 0; i < extensions.length; i++) {
                var currentExtension = new ExtVM.ExtensionViewModel(extensions[i]);
                if (currentExtension.getExtensionId() == navigateTo) {
                    this.setSelectedRowIndex(i);
                    this._navigateToExtension(currentExtension);
                    return;
                }
            }
        }
        this.setSelectedRowIndex(this._selectedIndex === -1 ? 0 : this._selectedIndex);
        if (extensions && extensions.length > 0 && this._selectedIndex >= 0) {
            this._updateExtensionRow();
        }
    }

    private _getJsonIslandExtension(): string {
        var contextElement, id;

        contextElement = $(".navigateto-extensionid", document);
        if (contextElement.length > 0) {
            id = contextElement.eq(0).html();
            if (id) {
                return id;
            }
        }
        return null;
    }

    /// <summary>Get list of all available extensions</summary>
    private _getAvailableExtensionsList() {
        var dummy = new Date();

        //Make call to get data.
        CoreAjax.getMSJSON(this._options.tfsContext.getActionUrl("GetAllAvailableExtensions", "apiextension"),
            {
                mkt: "en-us",
                // no parameters. hack to ensure there is no cache.
                _t: dummy.getTime()
            },
            // handle success.
            delegate(this, this._getAllAvailableExtensionSuccess),
            //handle error.
            delegate(this, this._getAllAvailableExtensionFailed)
        );
    }

    /// <summary>Set up the display columns for the extension list</summary>
    private _getAllAvailableExtensionSuccess(data) {
        //Notify parts of the page that data has been loaded
       
        if (this._options) {
            if (this._options.tfsContext.isHosted) {
                Controls.Enhancement.registerEnhancement(UserHubCtrl.UserHubControl, ".userHub-account-view");
            } else {
                if (data && data.length > 0) {
                    Controls.Enhancement.registerEnhancement(UserHubCtrl.UserHubControl, ".userHub-account-view");
                } else {
                    this._showMarketplaceLinkWithLonelyImage();
                }
            }
        } else {
            Controls.Enhancement.registerEnhancement(UserHubCtrl.UserHubControl, ".userHub-account-view");
        }
        var extData = [];
        for (var i = 0; i < data.length; i++) {
            if (!(data[i].ExtensionState == AccountResources.ExtensionPreviewState)) {
                extData.push(data[i]);
            }
        }
        eventService.fire("tfs-update-extensions", extData);
    }

    private _showMarketplaceLinkWithLonelyImage() {
        if (!this._options.tfsContext) {
            return;
        }
        CoreAjax.getMSJSON(this._options.tfsContext.getActionUrl("GetExtensionUrls", "apiextension"),
            {
                mkt: "en-us",
                extensionId: "vss-testmanager-web"
            },
            // handle success.
            delegate(this, (data) => {
                this._updateMarketplaceLinkWithServerKey(data);
            }),
            //handle error.
            delegate(this, (data) => {
                this._updateMarketplaceLinkWithServerKey();
            })
        );
    }

    private _updateMarketplaceLinkWithServerKey(data?: any) {
        var marketplaceUrl = "";
        if (data && data["MarketPlaceUrlWithServerKey"]) {
            marketplaceUrl = Utils_String.format(AccountResources.NoExtensionsInstalledMessage, data["MarketPlaceUrlWithServerKey"]);
        }
        else {
            marketplaceUrl = Utils_String.format(AccountResources.NoExtensionsInstalledMessage, AccountResources.BrowseExtensionsLink);
        }
        var hubArea = document.getElementById("userHubTitle");
        var browseExtensionsBowtieContainer = $(domElem('div')).appendTo(hubArea).addClass("no-ext-installed-msg").html(marketplaceUrl);
        $(domElem("div", "userHub-lonely-image")).appendTo(hubArea);
        $('.handleBar').css("display", "none");
        $('.toggle-button').css("display", "none");
        $('.license-view').css("display", "none");
    }

    private _getAllAvailableExtensionFailed(error) {
        eventService.fire("tfs-update-extensions", null);
    }

    public onRowClick(eventArgs): any {
        this._updateExtensionRow();
    }

    private _updateExtensionRow() {
        var extensionViewModel = this._getExtensionViewModelBySelectedRow();
        this._navigateToExtension(extensionViewModel);
        localStorage.setItem(ExtensionGrid._localStorageLastAccessedKey, extensionViewModel.getExtensionId());
    }

    private _getExtensionViewModelBySelectedRow(): ExtVM.ExtensionViewModel {
        var extension: Object = this.getRowData(this._selectedIndex);
        var extensionViewModel = new ExtVM.ExtensionViewModel(extension);
        return extensionViewModel;
    }

    private _navigateToExtension(extensionViewModel: ExtVM.ExtensionViewModel): void {
        eventService.fire("tfs-update-grid", true, extensionViewModel);
        eventService.fire("tfs-update-menubarCommands", extensionViewModel);
        eventService.fire("tfs-update-userhubTitle", extensionViewModel);
        eventService.fire("tfs-clear-editUserPanels");
        eventService.fire("tfs-hide-extensionLicenseStatusLabel");
        if (extensionViewModel.getAllOrNothing()) {
            eventService.fire("tfs-update-buy-now-link-for-all-or-nothing", extensionViewModel);
        }
        if (!extensionViewModel.getAllOrNothing() && extensionViewModel.isExtensionIdFilled()) {
            if (extensionViewModel.getExtensionState() == "Trial") {
                eventService.fire("tfs-update-buyMoreLink", extensionViewModel.getExtensionId(), true);
            }
            else
            {
                eventService.fire("tfs-update-buyMoreLink", extensionViewModel.getExtensionId());
            }
            eventService.fire("tfs-update-buy-now-link-for-all-or-nothing", extensionViewModel);
        } else {
            eventService.fire("tfs-hide-buyMoreLink");
        }
    }

}
VSS.classExtend(ExtensionGrid, SPS_Host_TfsContext.TfsContext.ControlExtensions);

