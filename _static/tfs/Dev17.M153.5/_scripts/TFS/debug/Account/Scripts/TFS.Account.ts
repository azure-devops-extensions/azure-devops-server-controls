///<amd-dependency path="jQueryUI/core"/>
///<amd-dependency path="jQueryUI/button"/>
///<amd-dependency path="jQueryUI/widget"/>

declare var RioTracking;

import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import accountResources = require("Account/Scripts/Resources/TFS.Resources.Account");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import Combos = require("VSS/Controls/Combos");
import Panels = require("VSS/Controls/Panels");
import Dialogs = require("VSS/Controls/Dialogs");
import Controls_Accessories = require("Presentation/Scripts/TFS/TFS.UI.Controls.Accessories");
import Diag = require("VSS/Diag");
import Notifications = require("VSS/Controls/Notifications");
import TFS_Host_UI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Admin_Dialogs = require("Admin/Scripts/TFS.Admin.Dialogs");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Events_Services = require("VSS/Events/Services");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import { 
    IUrlParameters,
    MyExperiencesUrls 
} from "Presentation/Scripts/TFS/TFS.MyExperiences.UrlHelper";

var TfsContext = TFS_Host_TfsContext.TfsContext;
var hostConfig = TFS_Host_TfsContext.TfsContext.getDefault().configuration;
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;
var defaultManager;
var eventService = Events_Services.getService();

declare var __externalMetricsService: (command: string, event: string, properties?: any) => void;

class MetricsService {

    private service: (command: string, event: string, properties?: any) => void;

    constructor() {
        // If there is an external metrics service, we use it.
        if (typeof (__externalMetricsService) === "function") {
            this.service = __externalMetricsService;
        }
        else {
            // No external metrics service exists. Defining empty service.
            this.service = (command: string, event: string, properties?: any) => {
                // no-op
            };
        }
    }

    /**
     *  Enables to push a metric for the specified 
     */
    public push(command: string, event: string, properties?: any) {
        this.service(command, event, properties);
    }
}

var metricsService = new MetricsService();

$.widget('TFS.IdentitySearchControl', {
    options: {
        identityList: {},
        searchParams: {},
        watermarkText: accountResources.Search
    }, // TODO: make cancel, search, go buttons private
    _init: function () {
        var self: any = this,
            keyHandler = function (func) {
                return function (event) {
                    if (event.keyCode === $.ui.keyCode.ENTER || event.keyCode === $.ui.keyCode.SPACE) {
                        func();
                        return false;
                    }
                }
            };

        this.options.identityList._options.searchControl = this;

        this.element.addClass('identity-search-control');
        this.searchLabel = $(domElem('label')).addClass('hidden').attr('for', 'identitySearchBox').text(accountResources.SearchUsers);
        this.searchInput = $('<input class="search-input" type="text" />').attr('name', 'identitySearchBox');
        $(domElem('div')).addClass('search-input-wrapper').append(this.searchLabel).append(this.searchInput).appendTo(this.element);
        Utils_UI.Watermark(this.searchInput, { watermarkText: this.options.watermarkText });

        eventService.attachEvent("tfs-clear-search", delegate(this, this._onCancelButton));

        // Clear search when cancelButton is clicked.
        this.cancelButton = $(domElem('span')).addClass('cancel-button').appendTo(this.element).attr("tabindex", "0").hide()
            .click(delegate(this, this._onCancelButton))
            .keydown(keyHandler(delegate(this, this._onCancelButton)));

        // Focus on input when searchButton is clicked.
        this.searchButton = $(domElem('span')).addClass('search-button').appendTo(this.element).attr("tabindex", "0")
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

class ManagementServer {

    public static get (tfsContext) {
        /// <summary>Returns an instance of the Server object</summary>
        if (!defaultManager) {
            defaultManager = new ManagementServer(tfsContext);
        }

        return defaultManager;
    }

    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    constructor(tfsContext) {
        /// <summary>This object model class can be used to interact with the server and update management settings</summary>
        this._tfsContext = tfsContext;
    }

    public getApiLocation(action, params?: any) {
        /// <summary>Generates URL for the specfied action and params</summary>
        /// <param name="params" type="Object" optional="true" />
        return this._tfsContext.getActionUrl(action || "", "AccountManagement", $.extend({ area: "api" }, params));
    }

    public beginWriteSetting(registryPath: string, setting, callback, errorCallback?, waitElement?) {
        /// <summary>Write Web Access setting to TFS registry</summary>
        /// <param name="registryPath" type="String">relative registry path</param>
        /// <param name="setting">value, can be boolean, int, or string</param>
        var apiLocation;

        if (typeof setting === "boolean") {
            apiLocation = this.getApiLocation("SetBoolean");
        }
        else if (typeof setting === "number") {
            apiLocation = this.getApiLocation("SetInteger");
        }
        else if (typeof setting === "string") {
            apiLocation = this.getApiLocation("SetString");
        }

        TFS_Core_Ajax.postMSJSON(apiLocation,
        {
            path: registryPath, value: setting
        },
            callback,
            errorCallback,
        {
            wait: {
                image: hostConfig.getResourcesFile('big-progress.gif'),
                message: Utils_String.htmlEncode(accountResources.ProgressPleaseWait),
                target: waitElement,
                showDelay: 1,
                minLifetime: 1000
            }
        });
    }

    public beginWriteForwardLink(linkName: string, setting, callback, errorCallback?, waitElement?) {
        /// <summary>Write link to link service</summary>
        /// <param name="linkName" type="String">link name</param>
        /// <param name="setting">value of the url</param>

        var apiLocation = this.getApiLocation("SetLink");
        TFS_Core_Ajax.postMSJSON(apiLocation,
        {
            name: linkName, value: setting
        },
            callback,
            errorCallback,
        {
            wait: {
                image: hostConfig.getResourcesFile('big-progress.gif'),
                message: Utils_String.htmlEncode(accountResources.ProgressPleaseWait),
                target: waitElement,
                showDelay: 1,
                minLifetime: 1000
            }
        });
    }
}

VSS.initClassPrototype(ManagementServer, {
    _tfsContext: null
});



class IdentityProviderControlBase extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.account.IdentityProviderControl";

    private _requestContext: any;
    private _providersLoaded: boolean;

    constructor(options?) {
        /// <summary>This control is responsible for loading and displaying identity providers supported by TFS</summary>

        super(options);
    }

    public initialize() {
        super.initialize();

        this._initializeLoadingTimeout();
        this._startProviderFetch();

        this._setStaySignedIn(this._options.providerOptions.staySignedIn);
    }

    public _setStaySignedIn(staySignedIn) {

        // Toggle the cookie on and off for this application.
        var cookie, cookie_date = new Date(); // current datetime
        if (staySignedIn) {
            cookie_date.setFullYear(cookie_date.getFullYear() + 1);
            document.cookie = "Tfs-StaySignedIn=true; path=" + this._options.providerOptions.staySignedInCookiePath + "; expires=" + cookie_date.toGMTString();
            cookie = { staySignedIn: true, path: this._options.providerOptions.staySignedInCookiePath, expires: cookie_date };
        }
        else {
            cookie_date.setTime(cookie_date.getTime() - 1);
            document.cookie = "Tfs-StaySignedIn=false; path=" + this._options.providerOptions.staySignedInCookiePath + "; expires=" + cookie_date.toGMTString();
            cookie = { staySignedIn: false, path: this._options.providerOptions.staySignedInCookiePath, expires: cookie_date };
        }

        if (window.external && ('notifyValueChanged' in window.external)) {
            (<any>window.external).notifyValueChanged(Utils_Core.stringifyMSJSON(cookie));
        }
    }

    public areProvidersLoaded() {
        return this._providersLoaded;
    }

    private _initializeLoadingTimeout() {
        var that = this;
        this.delayExecute("initializeLoadingTimeout", 30000, false, function () {

            // If the request failed to complete call endRequest to clean it up
            if (that._requestContext && that._requestContext.isComplete === false) {
                TFS_Core_Ajax.endRequest(null, null, null, null, that._requestContext);
            }

            if (that._options.providerFailureCallback && $.isFunction(that._options.providerFailureCallback)) {
                that._options.providerFailureCallback.call(that);
            } else {
                that._providerFailureCallback();
            }
        });
    }

    private _startProviderFetch() {
        this._requestContext = TFS_Core_Ajax.getJSONp({
            url: this._options.providerOptions.identityProviderURL,
            callback: delegate(this, this._finishProviderFetch)
        });
    }

    private _finishProviderFetch(identityProviders) {
        // Clear the loading timer now that we have finished the request
        if (!this.cancelDelayedFunction("initializeLoadingTimeout")) {
            return;
        }

        this._providersLoaded = true;

        if (this._options.providerCallback && $.isFunction(this._options.providerCallback)) {
            this._options.providerCallback.call(this, identityProviders);
        } else {
            this._providerCallback(identityProviders);
        }
    }

    public _providerCallback(providers) {
        Diag.Debug.fail('must be implemented');
    }

    public _providerFailureCallback() {
        Diag.Debug.fail('must be implemented');
    }
}

VSS.initClassPrototype(IdentityProviderControlBase, {
    _requestContext: null,
    _providersLoaded: false
});



class IdentityProviderControl extends IdentityProviderControlBase {

    private _providersList: any;

    public $providerArea: any;

    constructor(options?) {
        /// <summary>This implementation of the identity provider control is used on the signin page/summary>

        super(options);
    }

    public initialize() {
        super.initialize();
        this._decorate();
        this._bindHandlers();
    }

    private _decorate() {
        var staySignedIn, staySignedInLabel, staySignedInCheckbox;

        this.$providerArea = $(domElem('div')).addClass('providerArea hide').appendTo(this._element);

        $(domElem('div', 'signin-title')).text(accountResources.PageSignInTitle).appendTo(this.$providerArea);
        $(domElem('div', 'signin-description')).text(accountResources.PageSignInMessage).appendTo(this.$providerArea);

        this._providersList = $(domElem('div')).addClass('identity-providers').appendTo(this.$providerArea);

        staySignedIn = $(domElem('div')).attr('id', 'staySignedIn').appendTo(this.$providerArea);
        staySignedInCheckbox = $("<input type='checkbox' />").attr('id', 'cbStaySignedIn').appendTo(staySignedIn);
        staySignedInCheckbox.get(0).checked = this._options.providerOptions.staySignedIn;
        staySignedInLabel = $(domElem('label')).attr('for', 'cbStaySignedIn').appendTo(staySignedIn);
        staySignedInLabel.text(accountResources.ControlIdentityProviderStaySignedIn);
    }

    private _bindHandlers() {
        var that = this;

        this._element.find('#staySignedIn').click(function () {

            var staySignedIn = that._element.find('#cbStaySignedIn').prop('checked');
            that._setStaySignedIn(staySignedIn);
        });
    }

    public _providerCallback(identityProviders) {
        var that = this, index, identityProvider, identityProviderElement, providerNameLower;

        if (this._options.providerOptions.force) {
            for (index = 0; index < identityProviders.length; index++) {
                identityProvider = identityProviders[index];

                if (identityProvider.LoginUrl.search("login.live-int.com/login.srf") >= 0 || identityProvider.LoginUrl.search("login.live.com/login.srf") >= 0) {
                    identityProvider.LoginUrl = identityProvider.LoginUrl + "&ots=1";
                }
            }
        }

        if (identityProviders.length === 1) {
            if (this._options.providerOptions.autoSelect) {
                document.location.href = identityProviders[0].LoginUrl;
                return;
            }
        }

        this._fire('providers-loaded');

        for (index = 0; index < identityProviders.length; index++) {

            // Retrieve the current provider from the list of providers
            identityProvider = identityProviders[index];

            // Add the provider to the target list
            identityProviderElement = $(domElem('div', 'identity-provider-element')).appendTo(this._providersList);
            identityProviderElement.attr('tabindex', 0).data('login-url', identityProvider.LoginUrl);
            $(domElem('span')).appendTo(identityProviderElement).text(identityProvider.Name);
            $(domElem('div', 'signin-arrow')).appendTo(identityProviderElement);
            providerNameLower = identityProvider.Name.toLowerCase();
            if (providerNameLower.indexOf('windows live') > -1) {
                identityProviderElement.addClass('windows-live');
            }
            else if (providerNameLower.indexOf('google') > -1) {
                identityProviderElement.addClass('google');
            }
            else if (providerNameLower.indexOf('yahoo') > -1) {
                identityProviderElement.addClass('yahoo');
            }
            else if (providerNameLower.indexOf('facebook') > -1) {
                identityProviderElement.addClass('facebook');
            }
        }

        var $identityProviderElement = $('.identity-provider-element', this._element).bind({
            click: function () {
                $('.identity-provider-element', that._element).unbind();
                var loginUrl = $(this).data('login-url');
                document.location.href = loginUrl;
            },
            focus: function () {
                $('.identity-provider-element').removeClass('selected-identity-provider');
                $(this).closest('.identity-provider-element').addClass('selected-identity-provider');
            },
            blur: function () {
                $('.identity-provider-element').removeClass('selected-identity-provider');
            },
            mouseenter: function () {
                $(this).focus();
            },
            mouseleave: function () {
                $(this).blur();
            },
            keydown: function (event) {
                var next, prev;

                if (event.keyCode === $.ui.keyCode.DOWN) {
                    next = $(this).next('.identity-provider-element');
                    if (next.length) {
                        $(this).blur();
                        next.focus();
                        return false;
                    }
                }
                else if (event.keyCode === $.ui.keyCode.UP) {
                    prev = $(this).prev('.identity-provider-element');
                    if (prev.length) {
                        $(this).blur();
                        prev.focus();
                        return false;
                    }
                }
            }
        });

        Utils_UI.accessible($identityProviderElement);

        // Once complete show the providers and hide the loading animation
        this.$providerArea.removeClass('hide');

        // Make sure the first identity provider has initial focus
        this._element.find('.identity-provider-element:first').focus();
    }

    public _providerFailureCallback() {
        this._fire('providers-loaded');

        $(domElem('div', 'identity-provider-error')).appendTo(this._element)
            .text(Utils_String.format(accountResources.FailedToLoadProviderForAccountCreate, this._options.providerOptions.identityProviderDisplayURL));
        $(domElem('a')).appendTo(this._element).text(accountResources.Refresh).click(function () {
            window.location.reload();
        });
    }
}

VSS.initClassPrototype(IdentityProviderControl, {
    $providerArea: null,
    _providersList: null
});


Controls.Enhancement.registerEnhancement(IdentityProviderControl, '.provider-control')


class SettingsControl extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.account.SettingsControl";

    public _managementServer: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._managementServer = ManagementServer.get(this._options.tfsContext);
    }
}

VSS.initClassPrototype(SettingsControl, {
    _managementServer: null
});

VSS.classExtend(SettingsControl, TFS_Host_TfsContext.TfsContext.ControlExtensions);



class AccountSettingsControl extends SettingsControl {

    public static enhancementTypeName: string = "tfs.account.AccountSettingsControl";

    public $maxAccounts: any;
    public $maxAccountsError: any;
    public $maxErrorRow: any;
    public $updateButton: any;
    public $maxAccountsPerUser: any;
    public $maxAccountsErrorPerUser: any;
    public $maxErrorPerUserRow: any;
    public $updatePerUserButton: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        (<Panels.CollapsiblePanel>Controls.BaseControl.createIn(Panels.CollapsiblePanel, this._element, { headerCss: "header", collapsed: false }))
                    .appendHeader("Organization Settings")
                    .appendContent(delegate(this, this._createAccountCodeSettings));
    }

    private _createAccountCodeSettings() {
        var $result, table, tr, td, combo;
        $result = $(domElem('div')).addClass('account-setting-content');

        //create the table
        table = $(domElem('table')).appendTo($result);

        tr = $(domElem('tr')).appendTo(table);
        $(domElem('td')).appendTo(tr).text('Is system in project creation lock down mode?');
        td = $(domElem('td')).appendTo(tr).addClass('settings-values');
        combo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, td,
        {
            allowEdit: false,
            source: ['Yes', 'No'],
            cssClass: '',
            indexChanged: delegate(this, this._projectCreationLockdownModeChanged)
        });
        combo.setSelectedIndex(this._options.pcwLockdownMode.value ? 0 : 1, false);

        tr = $(domElem('tr')).appendTo(table);
        $(domElem('td')).appendTo(tr).text('Maximum number of accounts:');

        td = $(domElem('td')).appendTo(tr).addClass('settings-values');
        this.$maxAccounts = $(domElem('input')).attr('id', 'maxAccounts').attr('name', 'maxAccounts').attr('type', 'text').appendTo(td);
        this.$maxAccounts.val(this._options.maxAccounts.value);
        this.$maxAccounts.bind('keyup', delegate(this, this._validateMaxAccounts));

        td = $(domElem('td')).appendTo(tr).addClass('settings-update');
        this.$updateButton = $(domElem('button')).addClass('add').text('update').appendTo(td);
        this.$updateButton.click(delegate(this, this._updateMaxAccounts)).button();
        this.$updateButton.button('disable');

        this.$maxErrorRow = $(domElem('tr')).appendTo(table);
        $(domElem('td')).appendTo(this.$maxErrorRow);
        td = $(domElem('td')).appendTo(this.$maxErrorRow).addClass('settings-values');
        this.$maxAccountsError = $(domElem('div')).appendTo(td).addClass('field-validation-error');
        this.$maxErrorRow.hide();

        //max accounts per user
        tr = $(domElem('tr')).appendTo(table);
        $(domElem('td')).appendTo(tr).text('Maximum number of accounts per user:');

        td = $(domElem('td')).appendTo(tr).addClass('settings-values');
        this.$maxAccountsPerUser = $(domElem('input')).attr('id', 'maxAccountsPerUser').attr('name', 'maxAccountsPerUser').attr('type', 'text').appendTo(td);
        this.$maxAccountsPerUser.val(this._options.maxAccountsPerUser.value);
        this.$maxAccountsPerUser.bind('keyup', delegate(this, this._validateMaxAccountsPerUser));

        td = $(domElem('td')).appendTo(tr).addClass('settings-update');
        this.$updatePerUserButton = $(domElem('button')).addClass('add').text('update').appendTo(td);
        this.$updatePerUserButton.click(delegate(this, this._updateMaxAccountsPerUser)).button();
        this.$updatePerUserButton.button('disable');

        this.$maxErrorPerUserRow = $(domElem('tr')).appendTo(table);
        $(domElem('td')).appendTo(this.$maxErrorPerUserRow);
        td = $(domElem('td')).appendTo(this.$maxErrorPerUserRow).addClass('settings-values');
        this.$maxAccountsErrorPerUser = $(domElem('div')).appendTo(td).addClass('field-validation-error');
        this.$maxErrorPerUserRow.hide();

        return $result;
    }

    private _projectCreationLockdownModeChanged(selectedIndex) {
        this._managementServer.beginWriteSetting(this._options.pcwLockdownMode.path, selectedIndex === 0, null, null, this._element.parent());
    }

    private _updateMaxAccounts() {
        var updatedValue = this.$maxAccounts.val();
        this._managementServer.beginWriteSetting(this._options.maxAccounts.path, parseInt(updatedValue, 10), delegate(this, this._updateMaxAccountsCallback), null, this._element.parent());
    }

    private _updateMaxAccountsPerUser() {
        var updatedValue = this.$maxAccountsPerUser.val();
        this._managementServer.beginWriteSetting(this._options.maxAccountsPerUser.path, parseInt(updatedValue, 10), delegate(this, this._updateMaxAccountsPerUserCallback), null, this._element.parent());
    }

    private _updateMaxAccountsCallback() {
        this.$updateButton.button('disable');
    }

    private _updateMaxAccountsPerUserCallback() {
        this.$updatePerUserButton.button('disable');
    }

    private _validateMaxAccountsPerUser() {
        this._validateMaxValue(this.$maxAccountsPerUser, this.$maxErrorPerUserRow, this.$maxAccountsErrorPerUser, this.$updatePerUserButton);
    }

    private _validateMaxAccounts() {
        this._validateMaxValue(this.$maxAccounts, this.$maxErrorRow, this.$maxAccountsError, this.$updateButton);
    }

    private _validateMaxValue($accountInput, $errorRow, $errorSection, $updateButton) {
        var maxAccounts = $.trim($accountInput.val()),
            displayError = false;

        if (maxAccounts) {
            if (isNaN(Number(maxAccounts))) {
                $errorRow.show();
                $errorSection.text("Must be a number");
                displayError = true;
            } else if (parseInt(maxAccounts, 10) !== parseFloat(maxAccounts)) {
                $errorRow.show();
                $errorSection.text("Must be an int");
                displayError = true;
            }

            if (!displayError) {
                $errorRow.hide();
                $updateButton.button('enable');
            } else {
                $updateButton.button('disable');
            }
        } else {
            $updateButton.button('disable');
        }
    }
}

VSS.initClassPrototype(AccountSettingsControl, {
    $maxAccounts: null,
    $maxAccountsError: null,
    $maxErrorRow: null,
    $updateButton: null,
    $maxAccountsPerUser: null,
    $maxAccountsErrorPerUser: null,
    $maxErrorPerUserRow: null,
    $updatePerUserButton: null
});



class AlertSettingsControl extends SettingsControl {

    public static enhancementTypeName: string = "tfs.account.AlertSettingsControl";

    public $smtpServer: any;
    public $updateSmtpServerButton: any;
    public $smtpPort: any;
    public $updateSmtpPortButton: any;
    public $smtpPortErrorRow: any;
    public $smtpPortError: any;
    public $smtpFromAddress: any;
    public $updateSmtpFromAddressButton: any;
    public $smtpUser: any;
    public $updateSmtpUserButton: any;
    public $smtpPassword: any;
    public $updateSmtpPasswordButton: any;
    public $smtpCertThumbprint: any;
    public $updateSmtpCertThumbprintButton: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        (<Panels.CollapsiblePanel>Controls.BaseControl.createIn(Panels.CollapsiblePanel, this._element, { headerCss: "header", collapsed: false }))
                    .appendHeader("Alert Settings")
                    .appendContent(delegate(this, this._createAlertSettings));
    }

    private _createAlertSettings() {
        var $result, table, tr, td, combo;
        $result = $(domElem('div')).addClass('alert-setting-content');

        //create the table
        table = $(domElem('table')).appendTo($result);

        //smtpEmailEnabled
        tr = $(domElem('tr')).appendTo(table);
        $(domElem('td')).appendTo(tr).text('Email Notifications Enabled:');

        td = $(domElem('td')).appendTo(tr).addClass('settings-values');
        combo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, td,
        {
            allowEdit: false,
            source: ['Yes', 'No'],
            cssClass: '',
            indexChanged: delegate(this, this._smtpEmailEnabledChanged)
        });
        combo.setSelectedIndex(this._options.smtpEmailEnabled.value ? 0 : 1, false);

        //smtpServer
        tr = $(domElem('tr')).appendTo(table);
        $(domElem('td')).appendTo(tr).text('SMTP Server:');

        td = $(domElem('td')).appendTo(tr).addClass('settings-values');
        this.$smtpServer = $(domElem('input')).attr('id', 'smtpServer').attr('name', 'smtpServer').attr('type', 'text').appendTo(td);
        this.$smtpServer.val(this._options.smtpServer.value);
        this.$smtpServer.bind('keyup', delegate(this, this._enableSmtpServerUpdateButton));

        td = $(domElem('td')).appendTo(tr).addClass('settings-update');
        this.$updateSmtpServerButton = $(domElem('button')).addClass('add').text('update').appendTo(td);
        this.$updateSmtpServerButton.click(delegate(this, this._updateSmtpServer)).button();
        this.$updateSmtpServerButton.button('disable');

        //smtpPort
        tr = $(domElem('tr')).appendTo(table);
        $(domElem('td')).appendTo(tr).text('SMTP Port:');

        td = $(domElem('td')).appendTo(tr).addClass('settings-values');
        this.$smtpPort = $(domElem('input')).attr('id', 'smtpPort').attr('name', 'smtpPort').attr('type', 'text').appendTo(td);
        this.$smtpPort.val(this._options.smtpPort.value);
        this.$smtpPort.bind('keyup', delegate(this, this._enableSmtpPortUpdateButton));

        td = $(domElem('td')).appendTo(tr).addClass('settings-update');
        this.$updateSmtpPortButton = $(domElem('button')).addClass('add').text('update').appendTo(td);
        this.$updateSmtpPortButton.click(delegate(this, this._updateSmtpPort)).button();
        this.$updateSmtpPortButton.button('disable');

        this.$smtpPortErrorRow = $(domElem('tr')).appendTo(table);
        $(domElem('td')).appendTo(this.$smtpPortErrorRow);
        td = $(domElem('td')).appendTo(this.$smtpPortErrorRow).addClass('settings-values');
        this.$smtpPortError = $(domElem('div')).appendTo(td).addClass('field-validation-error');
        this.$smtpPortErrorRow.hide();

        //smtpFromAddress
        tr = $(domElem('tr')).appendTo(table);
        $(domElem('td')).appendTo(tr).text('SMTP From Address:');

        td = $(domElem('td')).appendTo(tr).addClass('settings-values');
        this.$smtpFromAddress = $(domElem('input')).attr('id', 'smtpFromAddress').attr('name', 'smtpFromAddress').attr('type', 'text').appendTo(td);
        this.$smtpFromAddress.val(this._options.smtpFromAddress.value);
        this.$smtpFromAddress.bind('keyup', delegate(this, this._enableSmtpFromAddressUpdateButton));

        td = $(domElem('td')).appendTo(tr).addClass('settings-update');
        this.$updateSmtpFromAddressButton = $(domElem('button')).addClass('add').text('update').appendTo(td);
        this.$updateSmtpFromAddressButton.click(delegate(this, this._updateSmtpFromAddress)).button();
        this.$updateSmtpFromAddressButton.button('disable');

        //smtpUser
        tr = $(domElem('tr')).appendTo(table);
        $(domElem('td')).appendTo(tr).text('SMTP User Credentials:');

        td = $(domElem('td')).appendTo(tr).addClass('settings-values');
        this.$smtpUser = $(domElem('input')).attr('id', 'smtpUser').attr('name', 'smtpUser').attr('type', 'text').appendTo(td);
        this.$smtpUser.val(this._options.smtpUser.value);
        this.$smtpUser.bind('keyup', delegate(this, this._enableSmtpUserUpdateButton));

        td = $(domElem('td')).appendTo(tr).addClass('settings-update');
        this.$updateSmtpUserButton = $(domElem('button')).addClass('add').text('update').appendTo(td);
        this.$updateSmtpUserButton.click(delegate(this, this._updateSmtpUser)).button();
        this.$updateSmtpUserButton.button('disable');

        //smtpPassword
        tr = $(domElem('tr')).appendTo(table);
        $(domElem('td')).appendTo(tr).text('SMTP Password:');

        td = $(domElem('td')).appendTo(tr).addClass('settings-values');
        this.$smtpPassword = $(domElem('input')).attr('id', 'smtpPassword').attr('name', 'smtpPassword').attr('type', 'text').appendTo(td);
        this.$smtpPassword.val(this._options.smtpPassword.value);
        this.$smtpPassword.bind('keyup', delegate(this, this._enableSmtpPasswordUpdateButton));

        td = $(domElem('td')).appendTo(tr).addClass('settings-update');
        this.$updateSmtpPasswordButton = $(domElem('button')).addClass('add').text('update').appendTo(td);
        this.$updateSmtpPasswordButton.click(delegate(this, this._updateSmtpPassword)).button();
        this.$updateSmtpPasswordButton.button('disable');

        //smtpEnableSsl
        tr = $(domElem('tr')).appendTo(table);
        $(domElem('td')).appendTo(tr).text('SMTP Enable Ssl:');

        td = $(domElem('td')).appendTo(tr).addClass('settings-values');
        combo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, td,
        {
            allowEdit: false,
            source: ['Yes', 'No'],
            cssClass: '',
            indexChanged: delegate(this, this._smtpEnableSslChanged)
        });
        combo.setSelectedIndex(this._options.smtpEnableSsl.value ? 0 : 1, false);

        //smtpCertThumbprint
        tr = $(domElem('tr')).appendTo(table);
        $(domElem('td')).appendTo(tr).text('SMTP Certificate Thumbprint:');

        td = $(domElem('td')).appendTo(tr).addClass('settings-values');
        this.$smtpCertThumbprint = $(domElem('input')).attr('id', 'smtpCertThumbprint').attr('name', 'smtpCertThumbprint').attr('type', 'text').appendTo(td);
        this.$smtpCertThumbprint.val(this._options.smtpCertThumbprint.value);
        this.$smtpCertThumbprint.bind('keyup', delegate(this, this._enableSmtpCertThumbprintUpdateButton));

        td = $(domElem('td')).appendTo(tr).addClass('settings-update');
        this.$updateSmtpCertThumbprintButton = $(domElem('button')).addClass('add').text('update').appendTo(td);
        this.$updateSmtpCertThumbprintButton.click(delegate(this, this._updateSmtpCertThumbprint)).button();
        this.$updateSmtpCertThumbprintButton.button('disable');

        return $result;
    }

    private _smtpEmailEnabledChanged(selectedIndex) {
        this._managementServer.beginWriteSetting(this._options.smtpEmailEnabled.path, selectedIndex === 0, null, null, this._element.parent());
    }

    private _updateSmtpServer() {
        var updatedValue = this.$smtpServer.val();
        this._managementServer.beginWriteSetting(this._options.smtpServer.path, updatedValue, delegate(this, this._updateSmtpServerCallback), null, this._element.parent());
    }

    private _enableSmtpServerUpdateButton() {
        this.$updateSmtpServerButton.button('enable');
    }

    private _updateSmtpServerCallback() {
        this.$updateSmtpServerButton.button('disable');
    }

    private _updateSmtpPort() {
        var updatedValue = this.$smtpPort.val();
        this._managementServer.beginWriteSetting(this._options.smtpPort.path, parseInt(updatedValue, 10), delegate(this, this._updateSmtpPortCallback), null, this._element.parent());
    }

    private _enableSmtpPortUpdateButton() {
        var value = this.$smtpPort.val(), valueInt = parseInt(value, 10);
        if (isNaN(this.$smtpPort.val()) || valueInt < 1 || valueInt > 65535) {
            this.$smtpPortError.text("Must be a number between 1 and 65535");
            this.$smtpPortErrorRow.show();
            this.$updateSmtpPortButton.button('disable');
            return;
        }
        this.$smtpPortErrorRow.hide();
        this.$updateSmtpPortButton.button('enable');
    }

    private _updateSmtpPortCallback() {
        this.$updateSmtpPortButton.button('disable');
    }

    private _updateSmtpFromAddress() {
        var updatedValue = this.$smtpFromAddress.val();
        this._managementServer.beginWriteSetting(this._options.smtpFromAddress.path, updatedValue, delegate(this, this._updateSmtpFromAddressCallback), null, this._element.parent());
    }

    private _enableSmtpFromAddressUpdateButton() {
        this.$updateSmtpFromAddressButton.button('enable');
    }

    private _updateSmtpFromAddressCallback() {
        this.$updateSmtpFromAddressButton.button('disable');
    }

    private _updateSmtpUser() {
        var updatedValue = this.$smtpUser.val();
        this._managementServer.beginWriteSetting(this._options.smtpUser.path, updatedValue, delegate(this, this._updateSmtpUserCallback), null, this._element.parent());
    }

    private _enableSmtpUserUpdateButton() {
        this.$updateSmtpUserButton.button('enable');
    }

    private _updateSmtpUserCallback() {
        this.$updateSmtpUserButton.button('disable');
    }

    private _updateSmtpPassword() {
        var updatedValue = this.$smtpPassword.val();
        this._managementServer.beginWriteSetting(this._options.smtpPassword.path, updatedValue, delegate(this, this._updateSmtpPasswordCallback), null, this._element.parent());
    }

    private _enableSmtpPasswordUpdateButton() {
        this.$updateSmtpPasswordButton.button('enable');
    }

    private _updateSmtpPasswordCallback() {
        this.$updateSmtpPasswordButton.button('disable');
    }

    private _smtpEnableSslChanged(selectedIndex) {
        this._managementServer.beginWriteSetting(this._options.smtpEnableSsl.path, selectedIndex === 0, null, null, this._element.parent());
    }

    private _updateSmtpCertThumbprint() {
        var updatedValue = this.$smtpCertThumbprint.val();
        this._managementServer.beginWriteSetting(this._options.smtpCertThumbprint.path, updatedValue, delegate(this, this._updateSmtpCertThumbprintCallback), null, this._element.parent());
    }

    private _enableSmtpCertThumbprintUpdateButton() {
        this.$updateSmtpCertThumbprintButton.button('enable');
    }

    private _updateSmtpCertThumbprintCallback() {
        this.$updateSmtpCertThumbprintButton.button('disable');
    }
}

VSS.initClassPrototype(AlertSettingsControl, {
    $smtpServer: null,
    $updateSmtpServerButton: null,
    $smtpPort: null,
    $updateSmtpPortButton: null,
    $smtpPortErrorRow: null,
    $smtpPortError: null,
    $smtpFromAddress: null,
    $updateSmtpFromAddressButton: null,
    $smtpUser: null,
    $updateSmtpUserButton: null,
    $smtpPassword: null,
    $updateSmtpPasswordButton: null,
    $smtpCertThumbprint: null,
    $updateSmtpCertThumbprintButton: null
});



class ManagementView extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.account.ManagementView";

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        //add the sections
        <AccountSettingsControl>Controls.BaseControl.createIn(AccountSettingsControl, this._element, $.extend({ cssClass: "account-settings", tfsContext: this._options.tfsContext }, this._options.accountSettings));
        <AlertSettingsControl>Controls.BaseControl.createIn(AlertSettingsControl, this._element, $.extend({ cssClass: "alert-settings", tfsContext: this._options.tfsContext }, this._options.alertSettings));
    }
}

VSS.classExtend(ManagementView, TfsContext.ControlExtensions);


Controls.Enhancement.registerEnhancement(ManagementView, ".management-content")



class GettingStartedView extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.account.GettingStartedView";

    private _monitorJobControl: any;
    private _collectionProgress: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._collectionProgress = $('#create-progress', this._element);
        if (!this._options.collectionExists) {
            VSS.using(['Admin/Scripts/TFS.Admin.Common'], (_TFS_Admin_Common: typeof TFS_Admin_Common) => {
                this._monitorJobControl = <TFS_Admin_Common.MonitorJobControl>Controls.Enhancement.enhance(_TFS_Admin_Common.MonitorJobControl, this._collectionProgress, {
                    jobId: this._options.jobId,
                    notStartedText: VSS_Resources_Common.GettingStartedProgressNotStarted,
                    inProgressText: VSS_Resources_Common.GettingStartedCreatingCollection,
                    failureText: VSS_Resources_Common.GettingStartedErrorCreatingCollection,
                    retryActionText: VSS_Resources_Common.GettingStartedRetryCollectionCreationLink
                });

                this._monitorJobControl._element.bind('retry-after-failure', delegate(this, this._requeueCollectionJob));
                this._monitorJobControl._element.bind('render-progress', delegate(this, this._onRenderProgress));
                this._monitorJobControl._element.bind('render-complete', delegate(this, this._onRenderComplete));
                this._monitorJobControl._element.bind('render-failure', delegate(this, this._onRenderFailure));

                // Start the AJAX progress monitoring
                this._monitorJobControl.startMonitoring();
            });
        } else {
            // If a collection exists, then just call complete
            this._onRenderComplete();
        }
    }

    private _onRenderProgress() {
        var createMessageContainer = $(domElem('div')).addClass('creating-collection-text').prependTo(this._monitorJobControl._element),
            itemElement = $('#create-progress', this._element).closest('.item');
        $(domElem('span')).addClass('getting-started-lighttext').appendTo(createMessageContainer)
            .text(VSS_Resources_Common.GettingStartedCreateCollectionProgressPart1);

        if (itemElement.find('br').length === 0) {
            // This is needed for spacing in IE
            $(domElem('br')).appendTo(itemElement);
        }
    }

    private _onRenderFailure() {
        //remove create-done-box
        this._element.find('.create-error-box').removeClass('create-error-box');
        this._element.find('.account-item').css('zoom', '1');
    }

    private _onRenderComplete() {
        var newTeamProjectButton: JQuery,
            newTeamProjectGitButton: JQuery,
            acctContainer = $(domElem('div'));

        var that = this;

        // Set the complete text for the account section
        $(domElem('span')).appendTo(acctContainer).text(VSS_Resources_Common.GettingStartedAccountActive);

        this._collectionProgress.empty();
        this._collectionProgress.append(acctContainer);

        //remove create-done-box
        this._element.find('.create-done-box').removeClass('create-done-box');

        newTeamProjectButton = $('.welcome-pcw-buttons .new-team-project');
        newTeamProjectGitButton = $('.welcome-pcw-buttons .new-team-project-git');
        if (this._options.isProjectCreationLockdownMode) {

            // Disable "New Team Project" button and display error message if
            // the project collection is in maintenance mode
            newTeamProjectButton.prop("disabled", true);
            newTeamProjectGitButton.prop("disabled", true);
            $(domElem('div'))
                .addClass('strong-error')
                .html(accountResources.UnderMaintenanceError_Pcw)
                .insertAfter(newTeamProjectGitButton);
        }
        else {
            // Enable "New Team Project" button, make it blue and attach to the click event
            newTeamProjectButton
                .addClass("colored")
                .removeAttr("disabled")
                .click(function () {
                    MyExperiencesUrls.getCreateNewProjectUrl(
                        that._options.tfsContext.navigation.collection.name,
                        {
                            source: "Account.NewTeamProjectButton"
                        } as IUrlParameters).then((url: string) => {
                            window.location.href = url;
                        }, (error: Error) => {
                            VSS.using(['Admin/Scripts/TFS.Admin.Dialogs'], (_TFS_Admin_Dialogs: typeof TFS_Admin_Dialogs) => {
                                Dialogs.show(_TFS_Admin_Dialogs.CreateProjectDialog, {
                                    successCallback: () => {
                                        $(".browse-all-teams").show();
                                    }
                                });
                            });
                        });
                    return false;
                });

            newTeamProjectGitButton
                .addClass("colored")
                .removeAttr("disabled")
                .click(function () {
                    MyExperiencesUrls.getCreateNewProjectUrl(
                        that._options.tfsContext.navigation.collection.name,
                        {
                            source: "Account.NewTeamProjectGitButton",
                            versionControl: "Git"
                        } as IUrlParameters).then((url: string) => {
                            window.location.href = url;
                        }, (error: Error) => {
                            VSS.using(['Admin/Scripts/TFS.Admin.Dialogs'], (_TFS_Admin_Dialogs: typeof TFS_Admin_Dialogs) => {
                                Dialogs.show(_TFS_Admin_Dialogs.CreateProjectDialog, {
                                    versionControlSystem: "Git"
                                });
                            });
                        });
                    return false;
                });

            // Remove maintenance errors if applicable
            newTeamProjectButton.parent().find(".strong-error").remove();

            // Display you're almost there message if applicable (by default it's hidden)
            $('.welcome-projects .almost-there-message').show();

            // Show the create project dialog
            if (this._options.createTeamProject) {
                MyExperiencesUrls.getCreateNewProjectUrl(
                    this._options.tfsContext.navigation.collection.name,
                    {
                        source: "Account.Default"
                    } as IUrlParameters).then((url: string) => {
                        window.location.href = url;
                    }, (error: Error) => {
                        VSS.using(['Admin/Scripts/TFS.Admin.Dialogs'], (_TFS_Admin_Dialogs: typeof TFS_Admin_Dialogs) => {
                            Dialogs.show(_TFS_Admin_Dialogs.CreateProjectDialog, { collectionId: this._options.collectionId });
                        });
                    });
            }
        }
    }

    private _requeueCollectionJob() {
        TFS_Core_Ajax.postMSJSON(
            this._options.tfsContext.getActionUrl('RequeueCollectionJob', 'start', { area: 'api' }),
            null,
            delegate(this._monitorJobControl, this._monitorJobControl._renderProgressResponse),
            delegate(this._monitorJobControl, this._monitorJobControl.renderErrorRetrievingProgress)
        );
        return false;
    }
}

VSS.initClassPrototype(GettingStartedView, {
    _monitorJobControl: null,
    _collectionProgress: null
});

VSS.classExtend(GettingStartedView, TfsContext.ControlExtensions);


Controls.Enhancement.registerEnhancement(GettingStartedView, ".getting-started-view")

export interface DeleteUserDialogOptions extends Dialogs.IModalDialogOptions {
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    name?: string;
    userId?: string;
    email?: string;
    index?: number;
    successCallback?: Function;
}

class UserhubMessageReceiver extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.account.UserhubMessageReceiver";
    private $spsAccountUrl: string;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
		// this.$spsAccountUrl = this._getSpsAccountUrl();
        this._initializeSetup();
    }

    private _getSpsAccountUrl() {
        var contextElement, url;

        contextElement = $(".sps-account-url", document);

        if (contextElement.length > 0) {
            url = contextElement.eq(0).html();
            if (url) {
                return url;
            }
        }
        return null;
    }

    private _initializeSetup() {
        function handleMessageReceived(event) {
            var data: string;
            if (event && event.originalEvent && event.originalEvent.data) {
                try {
                    data = event.originalEvent.data;
                    var jsonData = JSON.parse(data);
                    if (jsonData.actionId && jsonData.actionId === accountResources.SPS_ACCOUNT_LEVEL_COOKIE_MISSING) {
                        if (jsonData.url) {
                            var url = jsonData.url;
                            location.href = url;
                        }
                    }
                }
                catch (ex) {
                    if (window.console) {
                        window.console.log("Failed to parse JSON data: " + event.data);
                    }
                }
            }
        }

        $(window).on("message", function (event) {
			handleMessageReceived(event)
        });
    }
}

VSS.classExtend(UserhubMessageReceiver, TFS_Host_TfsContext.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(UserhubMessageReceiver, ".spsUserHub-receiver");

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Account", exports);