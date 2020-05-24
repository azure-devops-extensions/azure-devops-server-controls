/// <amd-dependency path="jQueryUI/core"/>
/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import SPS_Host_TfsContext = require("Presentation/Scripts/TFS/SPS.Host.TfsContext");
import CoreAjax = require("Presentation/Scripts/TFS/SPS.Legacy.Ajax");
import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import Combos = require("VSS/Controls/Combos");
import Dialogs = require("VSS/Controls/Dialogs");
import Validation = require("VSS/Controls/Validation");
import Grids = require("VSS/Controls/Grids");
import Navigation = require("VSS/Controls/Navigation");
import Notifications = require("VSS/Controls/Notifications");
import Diag = require("VSS/Diag");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Culture = require("VSS/Utils/Culture");
import Utils_String = require("VSS/Utils/String");
import AccountResources = require("UserManagement/Scripts/Resources/SPS.Resources.UserManagement");
import Events_Document = require("VSS/Events/Document");
import Events_Services = require("VSS/Events/Services");
import Utils_Html = require("VSS/Utils/Html");
import WebApi_RestClient = require("VSS/WebApi/RestClient");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Splitter = require("VSS/Controls/Splitter");

import UserHubTitleCtrl = require("UserManagement/Scripts/Controls/UserHubTitleControl");
import LicenceControl = require("UserManagement/Scripts/Controls/LicenseControl");
import DynamicLinkControl = require("UserManagement/Scripts/Controls/DynamicLinkControl");
import ExtVM = require("UserManagement/Scripts/Models/ExtensionViewModel");
import ExtGrid = require("UserManagement/Scripts/Models/ExtensionGrid");
import ExtEligibleUserGrid = require("UserManagement/Scripts/Models/ExtensionEligibleUserGrid");
import DelUserDialog = require("UserManagement/Scripts/Dialogs/DeleteUserDialog");

import ExtCtrl = require("UserManagement/Scripts/Controls/ExtensionControl");
import UserHubCtrl = require("UserManagement/Scripts/Controls/UserHubControl");
import UserHubSigninRedirectCtrl = require("UserManagement/Scripts/Controls/UserHubSigninRedirectControl");

var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;
var eventService = Events_Services.getService();

$.widget('TFS.IdentitySearchControl', {
    options: {
        identityList: {},
        searchParams: {},
        watermarkText: AccountResources.Search
    }, // TODO: make cancel, search, go buttons private
    _init: function () {
        var self: any = this,
            keyHandler = function (func) {
                return function (event) {
                    if (event.keyCode === $.ui.keyCode.ENTER || event.keyCode === $.ui.keyCode.SPACE) {
                        func();
                        return false;
                    }
                };
            };

        this.options.identityList._options.searchControl = this;

        this.element.addClass('identity-search-control');
        this.searchInput = $('<input class="search-input" type="text" />').attr('name', 'identitySearchBox').attr('aria-label', AccountResources.SearchUsers);
        $(domElem('div')).addClass('search-input-wrapper').append(this.searchInput).appendTo(this.element);
        Utils_UI.Watermark(this.searchInput, { watermarkText: this.options.watermarkText });

        eventService.attachEvent("tfs-clear-search", delegate(this, this._onCancelButton));

        // Clear search when cancelButton is clicked.
        this.cancelButton = $(domElem('span')).addClass('bowtie-icon bowtie-navigate-close user-hub-bowtie-icon-cursor').appendTo(this.element).attr("tabindex", "0").hide()
            .click(delegate(this, this._onCancelButton))
            .keydown(keyHandler(delegate(this, this._onCancelButton)));

        // Focus on input when searchButton is clicked.
        this.searchButton = $(domElem('span')).addClass('bowtie-icon bowtie-search user-hub-bowtie-icon-cursor').appendTo(this.element).attr("tabindex", "0")
            .click(delegate(this, this._onSearchButton))
            .keydown(keyHandler(delegate(this, this._onSearchButton)));

        // Trigger enter key when goButton is clicked
        this.goButton = $(domElem('span')).addClass('go-button').appendTo(this.element).hide()
            .click(delegate(this, this._onGoButton))
            .keydown(keyHandler(delegate(this, this._onGoButton)));

        // disable search until grid is initialized
        if (!this.options.identityList._initialized) {
            this.disable();
            this.options.identityList._element.bind('initialized', function () {
                self.enable();
                Diag.logTracePoint("IdentitySearchControl._init.complete");
            });
        }
        else {
            Diag.logTracePoint("IdentitySearchControl._init.complete");
        }

        // Handle esc and enter on keydown to prevent dialog behavior
        this.searchInput.keydown(function (args) {
            var searchQuery;
            if (args.keyCode === $.ui.keyCode.ESCAPE) {
                self.cancelSearch();
                args.preventDefault();
                args.stopPropagation();
            }
        });

        // Handle other keys on keyup to get correct value for repeated keystrokes when holding down a key)
        // [CUT] Handle focus event in case search list gets out of sync with search query.
        // Out-of-sync scenario: search for a group, then edit the name of that group so that it is not a search result
        this.searchInput.bind('keyup', function (args) {
            var searchQuery;
            if (args.keyCode !== $.ui.keyCode.ESCAPE && args.keyCode !== $.ui.keyCode.ENTER) {
                searchQuery = $(this).val();
                if (self.options.lastSearchQuery !== searchQuery) {
                    self.options.lastSearchQuery = searchQuery;

                    self.filterSearchResults();
                }
            }
        });
    },
    filterSearchResults: function () {
        if (this.options.lastSearchQuery && this.options.lastSearchQuery.length > 0) {
            this.showCancelButton();
            this.options.identityList.localSearch(this.options.lastSearchQuery);
            this.element.trigger('searchQueryChanged', this.options.lastSearchQuery);
        }
        else {
            this.cancelSearch();
        }
    },
    disable: function (event: JQueryEventObject, ui: any) {
        $.Widget.prototype.disable.apply(this, arguments); // default disable
        this.searchInput.attr('disabled', 'disabled');
    },
    enable: function (event: JQueryEventObject, ui: any) {
        $.Widget.prototype.enable.apply(this, arguments); // default enable
        this.searchInput.attr('disabled', null);
    },
    destroy: function () {
        $.Widget.prototype.destroy.apply(this, arguments); // default destroy
        this.element.empty();
    },
    showSearchButton: function () {
        this.searchButton.show();
        this.cancelButton.hide();
        this.goButton.hide();
    },
    showCancelButton: function () {
        this.options.identityList._options.isSearching = true;
        this.searchButton.hide();
        this.cancelButton.show();
        this.goButton.hide();
    },
    showGoButton: function () {
        this.searchButton.hide();
        this.cancelButton.hide();
        this.goButton.show();
    },
    cancelSearch: function () {
        this.options.identityList._options.isSearching = false;

        this.searchInput.val('');
        this.options.lastSearchQuery = '';
        if (this.cancelButton.is(':visible')) {
            this.options.identityList.cancelSearch();
        }

        this.element.trigger('searchQueryCancelled');
        this.showSearchButton();
        this.focus();
    },
    focus: function () {
        Utils_UI.Watermark(this.searchInput, 'focus');
    },
    _onSearchButton: function () {
        if (!this.options.disabled) {
            this.searchInput.focus();
        }
    },
    _onCancelButton: function () {
        if (!this.options.disabled) {
            this.cancelSearch();
            this.searchInput.focus();
        }
    },
    _onGoButton: function () {
        var event = jQuery.Event('keydown');
        event.keyCode = $.ui.keyCode.ENTER;
        this.searchInput.trigger(event);
    }
});



// This class represents the control for the License #s.
Controls.Enhancement.registerEnhancement(LicenceControl.LicenseControl, ".license-view");

Controls.Enhancement.registerEnhancement(UserHubTitleCtrl.UserHubTitleControl, ".userHub-account-view");

Controls.Enhancement.registerEnhancement(DynamicLinkControl.DynamicLinkControl, ".userHub-account-view");

Controls.Enhancement.registerEnhancement(ExtCtrl.ExtensionControl, ".extension-view");



Controls.Enhancement.registerEnhancement(UserHubSigninRedirectCtrl.UserHubSigninRedirectControl, ".userHub-redirect-view");


// VSS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("SPS.Users.Controls", exports);
