///<amd-dependency path="jQueryUI/core"/>
///<amd-dependency path="jQueryUI/widget"/>

/// <reference types="jquery" />
/// <reference types="q" />

import * as Q from "q";

import VSS = require("VSS/VSS");
import Admin = require("Admin/Scripts/TFS.Admin");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import adminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import Grids = require("VSS/Controls/Grids");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Menus = require("VSS/Controls/Menus");
import Notifications = require("VSS/Controls/Notifications");
import Events_Handlers = require("VSS/Events/Handlers");
import Events_Services = require("VSS/Events/Services");
import Widgets = require("Presentation/Scripts/TFS/TFS.UI.Widgets");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Operations_RestClient = require("VSS/Operations/RestClient");
import Operations_Contracts = require("VSS/Operations/Contracts");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Contracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Picker_Services = require("VSS/Identities/Picker/Services");
import Identities_Picker_Controls = require("VSS/Identities/Picker/Controls");
import TFS_Grids = require("Presentation/Scripts/TFS/TFS.UI.Controls.CheckboxSelectionGrid");
import TFS_Grid_Adapters = require("Presentation/Scripts/TFS/TFS.UI.Controls.Grid.DataAdapters");
import Utils_Accessibility = require("VSS/Utils/Accessibility");

import { ContextHostType } from "VSS/Common/Contracts/Platform";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { VssService, getService, getCollectionClient } from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";
import { WebSessionToken } from "VSS/Authentication/Contracts";
import { BearerAuthTokenManager } from "VSS/Authentication/Services";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import { beginGetServiceLocation } from "VSS/Locations";
import { getDefaultWebContext } from "VSS/Context";

import * as Telemetry from "VSS/Telemetry/Services";

var KeyCode = Utils_UI.KeyCode;
var domElem = Utils_UI.domElem;
var hostConfig = TFS_Host_TfsContext.TfsContext.getDefault().configuration;
var TfsContext = TFS_Host_TfsContext.TfsContext;
var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var delegate = Utils_Core.delegate;
var controlId = 0;
export var EmptyGuidString = "00000000-0000-0000-0000-000000000000";

export interface IIdentity {
    Description: string;
    DescriptorIdentityType: string;
    DescriptorIdentifier: string;
    DisplayName: string;
    Domain: string;
    AccountName: string;
    IsWindowsUser: boolean;
    IsWindowsGroup: boolean;
    Errors: string[];
    FriendlyDisplayName: string;
    IdentityType: string;
    IsProjectLevel: boolean;
    IsTeam: boolean;
    MemberCountText: string;
    Scope: string;
    SubHeader: string;
    TeamFoundationId: string;
    Warnings: string[];
    IsAadGroup: boolean;
    RestrictEditingMembership: boolean;
};

/*
* Following section is a copied from Build/Scripts/Generated/TFS.Build.Common
* Copied down to avoid unncessary dependency to Admin project
* Keep it in sync with that file
*/
export interface DeploymentEnvironmentApiData {
    subscriptionId: string;
    subscriptionName: string;
    cert: string;
    projectName: string;
    deploymentName: string;
    username: string;
    password: string;
    disconnectSubscription: boolean;
}

export interface IServiceEndpointApiData {
    endpointId: string;
    endpointName: string;
    url: string;
    username: string;
    passwordKey: string;
    type: string;
    scheme: string;
    parameters?: {
        [key: string]: string;
    }
}

export interface GServiceEndpointApiData {
    endpointId: string;
    endpointName: string;
    url: string;
    issuer: string;
    scope: string;
    privatekey: string;
    certificate: string;
    audience: string;
    type: string;
    scheme: string;
    parameters?: {
        projectid: string;
    }
}

export class GcpServiceEndpointDetails {
    endPoint: ServiceEndpointContracts.ServiceEndpoint;
    credentialsXml: string;

    constructor(connectionInfo: GServiceEndpointApiData, authorizationInfo?: Contracts.EndpointAuthorization) {
        if (!authorizationInfo) {
             if (connectionInfo.scheme === EndpointAuthorizationSchemes.JwtBasedOAuth)
            {
                authorizationInfo = {
                    parameters: {
                        certificate: connectionInfo.certificate,
                        scope: connectionInfo.scope,
                        issuer: connectionInfo.issuer,
                        audience: connectionInfo.audience,
                        privatekey: connectionInfo.privatekey
                    },
                    scheme: connectionInfo.scheme
                };
            }
        }

        var metadata: ServiceEndpointContracts.ServiceEndpoint = {
            id: connectionInfo.endpointId,
            description: "",
            administratorsGroup: null,
            authorization: authorizationInfo,
            createdBy: null,
            data: connectionInfo.parameters,
            name: connectionInfo.endpointName,
            type: connectionInfo.type,
            url: connectionInfo.url,
            readersGroup: null,
            groupScopeId: null,
            isReady: false,
            isShared: undefined,
            operationStatus: null,
            owner: undefined
        };

        this.endPoint = metadata;
    }

    public toServiceEndpoint(): ServiceEndpointContracts.ServiceEndpoint {
        return this.endPoint;
    }

    public toServiceEndpointDetails(): Contracts.ServiceEndpointDetails {
        var serviceEndpointDetails: Contracts.ServiceEndpointDetails = {
            type: this.endPoint.type,
            url: this.endPoint.url,
            authorization: this.endPoint.authorization,
            data: this.endPoint.data
        }

        return serviceEndpointDetails;
    }
}

export class ServiceEndpointDetails {
    endPoint: ServiceEndpointContracts.ServiceEndpoint;
    credentialsXml: string;

    constructor(connectionInfo: IServiceEndpointApiData, authorizationInfo?: Contracts.EndpointAuthorization) {
        if (!authorizationInfo) {
            if (connectionInfo.scheme === EndpointAuthorizationSchemes.PersonalAccessToken ||
                connectionInfo.scheme === EndpointAuthorizationSchemes.OAuth) {
                authorizationInfo = {
                    parameters: {
                        accessToken: connectionInfo.passwordKey
                    },
                    scheme: connectionInfo.scheme
                };
            }
           else {
                authorizationInfo = {
                    parameters: {
                        username: connectionInfo.username,
                        password: connectionInfo.passwordKey
                    },
                    scheme: EndpointAuthorizationSchemes.UsernamePassword
                };
            }
        }

        var metadata: ServiceEndpointContracts.ServiceEndpoint = {
            id: connectionInfo.endpointId,
            description: "",
            administratorsGroup: null,
            authorization: authorizationInfo,
            createdBy: null,
            data: connectionInfo.parameters,
            name: connectionInfo.endpointName,
            type: connectionInfo.type,
            url: connectionInfo.url,
            readersGroup: null,
            groupScopeId: null,
            isReady: false,
            isShared: undefined,
            operationStatus: null,
            owner: undefined
        };

        this.endPoint = metadata;
    }

    public toServiceEndpoint(): ServiceEndpointContracts.ServiceEndpoint {
        return this.endPoint;
    }

    public toServiceEndpointDetails(): Contracts.ServiceEndpointDetails {
        var serviceEndpointDetails: Contracts.ServiceEndpointDetails = {
            type: this.endPoint.type,
            url: this.endPoint.url,
            authorization: this.endPoint.authorization,
            data: this.endPoint.data
        }

        return serviceEndpointDetails;
    }
}

export module EndpointAuthorizationSchemes {
    export var UsernamePassword = "UsernamePassword";
    export var Certificate = "Certificate";
    export var ServicePrincipal = "ServicePrincipal";
    export var PersonalAccessToken = "PersonalAccessToken";
    export var OAuth = "OAuth";
    export var OAuth2 = "OAuth2";
    export var JwtBasedOAuth = "JWT";
    export var Token = "Token";
    export var ManagedServiceIdentity = "ManagedServiceIdentity";
}

export module ServiceEndpointType {
    export var Azure = "azure";
    export var AzureRM = "azurerm";
    export var Chef = "chef";
    export var ExternalGit = "git";
    export var Generic = "generic";
    export var GitHub = "github";
    export var GitHubEnterprise = "githubenterprise";
    export var Bitbucket = "bitbucket";
    export var Jenkins = "jenkins";
    export var Subversion = "subversion";
    export var SSH = "ssh";
    export var Gcp = "google-cloud";
    export var Docker = "dockerregistry";
    export var Kubernetes = "kubernetes";
}

export module BuildResourceIds {
    export var AreaName = "Build";
    export var AzureDeploymentEnvironments = "32696366-f57b-4529-aec4-61673d4c23c6";
    export var AzureSubscriptions = "0524c91b-a145-413c-89eb-b3342b6826a4";
}

export enum DeploymentEnvironmentKind {
    Custom = 0,
    AzureWebsite = 1,
    AzureCloudApp = 2,
}

export interface DeploymentEnvironmentMetadata {
    connectedServiceName: string;
    description: string;
    friendlyName: string;
    kind: DeploymentEnvironmentKind;
    name: string;
    teamProject: string;
}

/*
* Copy from Build/Scripts/Generated/TFS.Build.Common section complete
*/
interface IPanel {
    id: string;
    panelElement: JQuery;
    size: string;
    maxsize: string;
    panelSize: IPanelSize;
}

interface IPanelSize {
    type: string;
    size: number;
    isMaxSize?: boolean;
}

export interface IdentityListValues {
    newUsers: string[];
    existingUsers: any[];
    unresolvedEntityIds: string[];
}

export interface IdentityPickerValues extends IdentityListValues {
    inputText: string;
}

$('body').addClass('resizeTarget');

$(window).bind('resize', function (event: JQueryEventObject) {

    // Notify all elements listening to the body resize event
    $('body').triggerHandler('resize');
});

$.widget('TFS.AutoTextArea', {
    _create: function () {
        this.element.bind('keyup scroll', delegate(this, this.resize));
        this.element.bind('blur', delegate(this, this.resize));
        this.resize();
    },
    resize: function () {
        var offset: number = this.element.outerHeight() - this.element.innerHeight();
        // Set size to zero so scrollHeight is correct (for Chrome and Firefox)
        this.element.height(0);
        this.element.height(this.element[0].scrollHeight + offset);
    },
});

$.widget('TFS.HorizontalPanel', {

    _create: function () {

        var panelString: string,
            panelIndex: number,
            panel: IPanel;

        // Assign the next control Id.
        this.controlId = ++controlId;

        // Attach to the nearest resizeTarget to get updates.
        this.element.closest('.resizeTarget').bind('resize.' + this.controlId, (event) => {
            this._updateLayout();
        });

        // Build the set of panel elements we need for this layout panel
        for (panelIndex = 0; panelIndex < this.options.panels.length; panelIndex++) {

            panel = this.options.panels[panelIndex];

            // If we are using the existing panels retrieve the panel element
            if (this.options.useExisting) {
                panel.panelElement = this.element.children('#' + panel.id);
            }
            else {
                // Build the panel HTML up locally before appending it to the container
                panelString = '<div class="layoutPanelHorizontal" />';

                // Add the panel to the container
                panel.panelElement = $(panelString).appendTo(this.element);

                // If the caller specified an Id for the panel we will add it
                if (panel.id) {
                    panel.panelElement.attr('id', panel.id);
                }
            }
        }

        // Now update the size of the elements take up the entire container.
        this._updateLayout();
    },

    destroy: function () {

        // Remove all the global event handlers we added.
        this.element.closest('.resizeTarget').unbind('resize.' + this.controlId);
        $.Widget.prototype.destroy.apply(this, arguments);
    },

    _getPanelSize: function (panel: IPanel): IPanelSize {

        if (panel.size) {
            return {
                type: (panel.size.indexOf('%') !== panel.size.length - 1) ? 'fixed' : 'variable',
                size: parseInt(panel.size, 10)
            };
        }
        else if (panel.maxsize) {
            return {
                type: 'variable',
                size: parseInt(panel.maxsize, 10),
                isMaxSize: true
            };
        }
        else {
            return {
                type: 'auto',
                size: panel.panelElement.outerHeight(true)
            };
        }
    },

    _updateLayout: function () {

        var remainingSize: number,
            panelIndex: number,
            panel: IPanel,
            panelHeight: number;

        // Get the full height of the container panel
        remainingSize = this.element.height();

        // Build the set of panel elements we need for this layout panel
        // First pass is to handle all fixed size panels
        for (panelIndex = 0; panelIndex < this.options.panels.length; panelIndex++) {

            panel = this.options.panels[panelIndex];

            // Determine the size of the panel.
            panel.panelSize = this._getPanelSize(panel);

            if (panel.panelSize.type === 'fixed') {
                panel.panelElement.height(panel.panelSize.size);
                remainingSize -= panel.panelSize.size;
            }
            else if (panel.panelSize.type === 'auto') {
                remainingSize -= panel.panelSize.size;
            }
        }

        // Now handle all the variable sized panels.
        for (panelIndex = 0; panelIndex < this.options.panels.length; panelIndex++) {

            panel = this.options.panels[panelIndex];

            if (panel.panelSize.type === 'variable') {
                panel.panelElement.css("height", "");

                // Calculate the updated panel size based on the space remaining
                panelHeight = Math.min(remainingSize, (panel.panelSize.size * remainingSize / 100));

                // If this is a max size panel, that means the actual size can be smaller.  So if
                // maximum allowable height of panel is 100px and actual content only needs 80px
                // then the height will be set to 80px.  But if actual height is 200px, then the
                // height will be set to 100px.
                if (panel.panelSize.isMaxSize) {
                    panelHeight = Math.min(panelHeight, panel.panelElement.outerHeight(true));
                }

                // Update the height of this variable height element
                panel.panelElement.height(panelHeight);
            }
        }
    }
});

$.widget('TFS.IdentityInput', {
    options: {

        filterList: true,

        // Ctrl-K hotkey to start a search
        searchHotkey: {
            altKey: false,
            ctrlKey: true,
            which: 75
        },

        searchParams: {},
        getItemFromIdentity: function (identity: IIdentity): { text: string; value: string; data: IIdentity; } {
            return { text: identity.DisplayName || identity.SubHeader, value: identity.TeamFoundationId, data: identity };
        },
        allowFreeType: true,

        _sequenceId: 0
    },
    addItem: function (displayName: string, value: any) {
        this.options._dropdownControl.add({ text: displayName, value: value });
    },
    removeItem: function (item: any) {
        this.options._dropdownControl._removeItem(null, { value: item });
        this._inputElement.val('');
    },
    destroy: function () {
        $.Widget.prototype.destroy.apply(this, arguments); // default destroy
        this.element.empty();
    },
    focus: function (showWatermark: boolean) {
        // IE needs delayed focus
        Utils_Core.delay(this, Utils_UI.BrowserCheckUtils.isMsie() ? 50 : 0, function () {
            if (this.element.data('TFS-Dropdown')) {
                var $input = this.element.data('TFS-Dropdown').options._elements._input;
                if (showWatermark) {
                    Utils_UI.Watermark($input, "focus");
                }
                else {
                    $input.focus();
                }
            }
        });
    },
    getCurrentValue: function (): string {
        return this.element.find('.dropdown-input-name').val();
    },
    select: function (value: any, focus: any): any {
        var dropDownObject = this.element.data('TFS-Dropdown');
        return dropDownObject.select(value, focus);
    },
    disable: function (event: any, ui: any) {
        $.Widget.prototype.disable.apply(this, arguments); // default disable
        this._inputElement.attr('disabled', 'disabled');
    },
    enable: function (event: any, ui: any) {
        $.Widget.prototype.enable.apply(this, arguments); // default enable
        this._inputElement.attr('disabled', null);
    },
    getInputElement: function (): JQuery {
        return this._inputElement;
    },
    _create: function () {
        // Filter out items that are already in the list
        this.element.bind('filterItem', this, function (event, pendingItem) {
            if (event.data.options.existingIdentities) {
                pendingItem.deny = Utils_Array.contains(event.data.options.existingIdentities, pendingItem.item.value);
            }
        });

        Widgets.Dropdown(this.element, this.options);
        this.options._dropdownControl = this.element.data('TFS-Dropdown');

        // Extend the search methods to use our loading method
        this.element.bind('querySearch', this, function (event, params) {
            event.data._querySearch(event, params);
        });

        this._inputElement = this.element.find('.dropdown-input-name');
        this._inputElement.bind('keydown', this, function (event) {
            if (event.keyCode === $.ui.keyCode.ENTER) {
                var value = $(this).val();
                if (value) {
                    event.data.options._dropdownControl.hideList(true);
                    event.data.element.trigger('newItemAdded', { text: value });

                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        });

        // If an id is specified for the input control, assign it
        if (this.options.inputControlId) {
            this._inputElement.attr("id", this.options.inputControlId);
        }

        // Cancel search on item selected
        this.element.bind('newItemAdded itemSelected', this, function (event) {
            event.data.options._dropdownControl.cancelSearch();
        });

        // Keep focus on input element when dropdown scrollbar is clicked
        $('.dropdown-input-list', this.element).mousedown(this, function (event) {
            event.data._inputElement.focus();
            return false;
        });

        // Cancel search when control has lost focus
        this.element.bind('focusout', this, function (event) {
            Utils_Core.delay(event.data, 100, function () {
                if ($(document.activeElement).closest(<JQuery>this.element).length === 0) {
                    this.options._dropdownControl.cancelSearch();
                }
            });
        });
    },
    _init: function () {
        var listItems: any[], i: number, identity: any;

        // Increment sequenceId to prevent any past requests from affecting list
        this.options._sequenceId++;
        this.options._dropdownControl.cancelSearch();
        this.options._dropdownControl.clear();

        if (this.options.items) {
            this.options._dropdownControl.options.dynamicSearch = false;

            listItems = [];
            for (i = 0; i < this.options.items.length; i++) {
                identity = this.options.items[i];
                listItems.push(this.options.getItemFromIdentity(identity));
            }

            this._disambiguate(listItems);

            this.options._dropdownControl.add(listItems);
        }
        else {
            this.options._dropdownControl.options.dynamicSearch = true;
        }

        this.options._dropdownControl._updateStateIcon();
    },
    // This function will manipulate a list of identities to disambiguate those with the same name.
    _disambiguate: function (identities: any[]) {
        var currentIdentity: any,
            nextIdentity: any,
            nextIsMatch: boolean,
            disambiguating = false,
            i: number,
            previousIdentity: any;

        for (i = 0; i < identities.length; i++) {
            currentIdentity = identities[i];
            nextIdentity = identities[i + 1];

            // Next item matches if next item exists and lowercase text matches
            nextIsMatch = nextIdentity && (currentIdentity.text.toLowerCase() === nextIdentity.text.toLowerCase());

            if (nextIsMatch || disambiguating) {
                // Current item needs to be disambiguated with subheader (email address)
                if (currentIdentity.data.IsProjectLevel &&
                    ((nextIsMatch && currentIdentity.data.SubHeader.toLowerCase() === nextIdentity.data.SubHeader.toLowerCase()) ||
                        (disambiguating && previousIdentity && currentIdentity.data.SubHeader.toLowerCase() === previousIdentity.data.SubHeader.toLowerCase()))) {
                    currentIdentity.text = Utils_String.format('{0} <{1}> <{2}>', currentIdentity.text, currentIdentity.data.SubHeader, adminResources.Project);
                } else {
                    currentIdentity.text = Utils_String.format('{0} <{1}>', currentIdentity.text, currentIdentity.data.SubHeader);
                }

                // If nextIsMatch, then the next item needs to be disambiguated
                disambiguating = nextIsMatch;
                previousIdentity = currentIdentity;
            }
        }
    },
    _querySearch: function (event: any, params: any) {
        var self: any = this,
            currentSequenceId: number = ++this.options._sequenceId;

        Diag.logTracePoint('TFS.IdentityInput.SearchPending');
        TFS_Core_Ajax.getMSJSON(
            self.options.identityListAction,
            $.extend({ searchQuery: params.value }, self.options.searchParams),
            function (data: any) {
                if (currentSequenceId === self.options._sequenceId && self.options._dropdownControl.options._searchActive) {
                    var i, identity, items = [];

                    for (i = 0; i < data.identities.length; i++) {
                        identity = data.identities[i];
                        items.push(self.options.getItemFromIdentity(identity));
                    }

                    self._disambiguate(items);

                    self.options._dropdownControl.add(items);

                    self.options._dropdownControl.completeSearch();
                }
            },
            null,
            {
                tracePoint: 'TFS.IdentityInput.SearchComplete'
            }
        );
    }
});

export function parseErrors(errorData: any, hideAadWarning: boolean = false): JQuery {
    var container: JQuery = $(domElem('div'));

    function appendErrors(errors: string[], container: JQuery, isHtml) {
        var ul: JQuery,
            i: number;

        ul = $(domElem('ul')).appendTo(container).addClass('dialog-errors');
        for (i = 0; i < errors.length; i++) {
            isHtml ? $(domElem('li')).appendTo(ul).html(errors[i]) : $(domElem('li')).appendTo(ul).text(errors[i]);
        }
    }

    function appendIdentityErrors(identityErrors: any[], container: JQuery) {
        var ul, i, identity;

        ul = $(domElem('ul')).appendTo(container).addClass('dialog-errors');
        for (i = 0; i < identityErrors.length; i++) {
            identity = identityErrors[i];
            $(domElem('li')).appendTo(ul).text(identity.Errors[0]);
        }
    }

    if (errorData.GeneralErrors.length > 0) {
        appendErrors(errorData.GeneralErrors, container, false);
    }

    if (errorData.LicenceErrors && errorData.LicenceErrors.length > 0) {
        appendErrors(errorData.LicenceErrors, container, true);
    }

    if (errorData.AADErrors && errorData.AADErrors.length > 0 && !hideAadWarning) {
        appendErrors(errorData.AADErrors, container, true);
    }

    if (errorData.StakeholderLicenceWarnings && errorData.StakeholderLicenceWarnings.length > 0) {
        appendErrors(errorData.StakeholderLicenceWarnings, container, true);
    }

    if (errorData.FailedAddedIdentities.length > 0) {
        appendIdentityErrors(errorData.FailedAddedIdentities, container);
    }

    if (errorData.FailedDeletedIdentities.length > 0) {
        appendIdentityErrors(errorData.FailedDeletedIdentities, container);
    }

    return container;
}

$.widget('TFS.IdentitySearchControl', {
    options: {
        identityList: {},
        searchParams: {},
        watermarkText: adminResources.Search
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
        this.searchInput = $('<input class="search-input" type="text" />').attr('name', 'identitySearchBox').attr('aria-label', adminResources.SearchIdentities);
        $(domElem('div')).addClass('search-input-wrapper').append(this.searchInput).appendTo(this.element);
        Utils_UI.Watermark(this.searchInput, { watermarkText: this.options.watermarkText });

        // Clear search when cancelButton is clicked.
        this.cancelButton = $(domElem('span')).addClass('cancel-button').attr("role", "button").attr("aria-label", adminResources.Cancel).appendTo(this.element).attr("tabindex", "0").hide()
            .click(delegate(this, this._onCancelButton))
            .keydown(keyHandler(delegate(this, this._onCancelButton)));

        // Focus on input when searchButton is clicked.
        this.searchButton = $(domElem('span')).addClass('search-button').attr("role", "button").attr("aria-label", adminResources.Search).appendTo(this.element).attr("tabindex", "0")
            .click(delegate(this, this._onSearchButton))
            .keydown(keyHandler(delegate(this, this._onSearchButton)));

        // Trigger enter key when goButton is clicked
        this.goButton = $(domElem('span')).addClass('go-button').attr("role", "button").attr("aria-label", adminResources.Go).appendTo(this.element).hide()
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
            if (args.keyCode === $.ui.keyCode.ESCAPE && self.options.identityList._options.isSearching) {
                self.cancelSearch();
                args.preventDefault();
                args.stopPropagation();
            }
            else if (args.keyCode === $.ui.keyCode.ENTER) {
                if (self.options.identityList.hasMore) {
                    searchQuery = $(this).val();
                    if (searchQuery.length > 0) {
                        self.fullSearch(searchQuery);
                    }
                    else {
                        self.cancelSearch();
                    }
                }
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
    fullSearch: function (searchQuery: string) {
        var self: any = this;

        this.disable();
        this.showCancelButton();
        this.element.trigger('searchQueryChanged', searchQuery);

        // Fetch search results
        TFS_Core_Ajax.getMSJSON(
            self.options.identityList._options.identityListAction,
            $.extend({ searchQuery: searchQuery }, self.options.identityList._options.searchParams),
            function (data) {
                self.options.identityList.fullSearch(data.identities);

                self.fullSearchCallback();
            },
            null,
            {
                wait: self.options.identityList._options.waitObject
            }
        );
    },
    fullSearchCallback: function () {
        this.enable();
        this.searchInput.focus();
    },
    filterSearchResults: function () {
        if (this.options.lastSearchQuery && this.options.lastSearchQuery.length > 0) {
            if (this.options.identityList.hasMore) { // if we don't have the full set
                // Do not filter, only show goButton
                this.showGoButton();
            }
            else {
                this.showCancelButton();
                this.options.identityList.localSearch(this.options.lastSearchQuery);
                this.element.trigger('searchQueryChanged', this.options.lastSearchQuery);
            }
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
        Utils_UI.Watermark(this.searchInput, "focus");
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


export class VerticalFillLayout extends Controls.BaseControl {

    public static enhancementTypeName: string = 'tfs.admin.VerticalFillLayout';

    private _header: JQuery;
    private _footer: JQuery;
    private _content: JQuery;

    constructor(options?: any) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            autoResize: true
        }, options));
    }

    public initialize() {
        super.initialize();
        this.redraw();

        // check to see if header contains controls that still need to be enhanced
        // they may resize when they're enhanced and we'll need to redraw
        if (this._hasUnenhancedChildren(this._header) || this._hasUnenhancedChildren(this._footer)) {
            Utils_Core.delay(this, 10, this.redraw);
        }

        if (this._options.autoResize) {
            this._element.closest('.resizeTarget').bind('resize.' + this.getId(), delegate(this, this.redraw));
        }
    }

    public redraw() {
        var topOffset: number = 0,
            bottomOffset: number = 0,
            cssPosition: string;

        this._header = this._element.children('.fixed-header');
        this._footer = this._element.children('.fixed-footer');
        this._content = this._element.children('.fill-content');

        cssPosition = this._element.css('position');
        if (cssPosition !== 'relative' && cssPosition !== 'absolute') {
            this._element.css('position', 'relative');
        }

        if (this._header.length) {
            topOffset = this._header.outerHeight(true);
        }
        if (this._footer.length) {
            bottomOffset = this._footer.outerHeight(true);
            this._footer.css({
                position: 'absolute',
                right: 0,
                bottom: 0,
                left: 0
            });
        }
        this._content.css({
            position: 'absolute',
            top: topOffset,
            right: 0,
            bottom: bottomOffset,
            left: 0,
            overflow: 'auto'
        });
    }

    /**
     * Return true if there are elements in the container that should be ehanced but haven't been yet.
     * @param container
     */
    private _hasUnenhancedChildren(container: JQuery): boolean {
        const children = this._header.children('.enhance');
        for (let i = 0; i < children.length; i++) {
            if (!Controls.Enhancement.getInstance(children.eq(i))) {
                return true;
            }
        }
        return false;
    }
}

VSS.initClassPrototype(VerticalFillLayout, {
    _header: null,
    _footer: null,
    _content: null
});


Controls.Enhancement.registerEnhancement(VerticalFillLayout, '.vertical-fill-layout')



export class AdminGrid extends Grids.GridO<any> {

    public static enhancementTypeName: string = "tfs.admin.AdminGrid";

    public _infoMessage: JQuery;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        // Set up the message div
        this._infoMessage = $(domElem('div')).addClass('identity-info-message').appendTo($('.grid-canvas', this._element));
    }

    public checkForNoData(message: string) {
        if (this._dataSource.length === 0) {
            this._infoMessage.show().empty();
            $(domElem('span')).appendTo(this._infoMessage).text(message);
        }
        else {
            this._infoMessage.hide();
        }
    }

    public getSelectedItem(): any {
        return this.getRowData(this.getSelectedDataIndex());
    }
}

VSS.initClassPrototype(AdminGrid, {
    _infoMessage: null
});

const _contributionId: string = "ms.vss-org-web.organization-token-data-provider";
const _serviceInstanceTypeAex = "00000041-0000-8888-8000-000000000000";

// to be removed when the organization security page moves to Portal Service
export class OrganizationTokenManagerService extends VssService {
    private _authTokenManger: OrgWebSessionTokenManager;

    public getOrganizationTokenManager(): OrgWebSessionTokenManager {
        if (this._authTokenManger) {
            return this._authTokenManger;
        }

        // for compat, making sure we don't throw when the data provider is not available
        try {
            let dataSvc = getService(WebPageDataService);
            let organizationSessionToken = dataSvc.getPageData<WebSessionToken>(_contributionId);

            if (organizationSessionToken) {
                this._authTokenManger = new OrgWebSessionTokenManager(organizationSessionToken);
            }
        } catch (e) {
            // do nothing, we'll return undefined and VSS/Service will get the default auth token manager instead
        }

        return this._authTokenManger;
    }
}

export class OrgWebSessionTokenManager extends BearerAuthTokenManager {
    private _orgSessionToken: WebSessionToken;

    constructor(sessionToken: WebSessionToken) {
        super(sessionToken.token);
        this._orgSessionToken = sessionToken;
    }

    public getAuthToken(refresh?: boolean, webContext?: WebContext): IPromise<string> {
        if (this._orgSessionToken
            && this._orgSessionToken.validTo
            && new Date().getTime() < (new Date(this._orgSessionToken.validTo).getTime() - 60 * 1000)) { // leaving 1 minute to account for potential network latency
            return Q.resolve(this._getTokenHeader());
        }

        const contributionsClient = getCollectionClient(ContributionsHttpClient, null, _serviceInstanceTypeAex);

        const query: DataProviderQuery = {
            context: {
                properties: {}
            },
            contributionIds: [_contributionId]
        };

        return contributionsClient.queryDataProviders(query).then((contributionDataResult: DataProviderResult) => {
            let organizationSessionToken = contributionDataResult.data[_contributionId] as WebSessionToken;

            if (organizationSessionToken) {
                this._token = organizationSessionToken.token;
                this._orgSessionToken = organizationSessionToken;
            }

            return this._getTokenHeader();
        }, (error) => {
            return this._getTokenHeader();
        });
    }
}

export class AdminUIHelper {
    //class for constants and feature flag related helper methods

    //statics for css classes
    public static CSS_IDENTITY_AVATAR = "identity-image";
    public static CSS_IDENTITY_NAME = "identity-name";

    public static USER_ENTITY_TYPE_KEY = "user";
    public static GROUP_ENTITY_TYPE_KEY = "group";
    public static TEAM_ENTITY_TYPE_KEY = "team";

    public static VISUAL_STUDIO_DIRECTORY_KEY = "vsd";
    public static AZURE_ACTIVE_DIRECTORY_KEY = "aad";
    public static ACTIVE_DIRECTORY_KEY = "ad";
    public static WINDOWS_MACHINE_DIRECTORY_KEY = "wmd";

    //group membership operations
    public static ADD_MEMBERS = "AddMembers";
    public static ADD_AS_MEMBER = "AddAsMember";

    //IdentityPicker extension constraints
    public static SEARCH_CONSTRAINT_NO_RESTRICTED_VISIBILITY_GROUPS = Identities_Picker_Services.ServiceHelpers.ExtensionData_NoServiceIdentities;

    public static TFS_ADMIN_IDENTITY_PICKER_SEARCH_EXTENSION_ID = "F12CA7AD-00EE-424F-B6D7-9123A60F424F";

    //IdentityPicker consummerIds
    public static FILTER_USERS_AND_GROUPS_CONSUMER_ID: string = "E83867CC-1E27-479C-A222-9ED970215799";
    public static FILTER_USERS_AND_GROUPS_CONSUMER_ID_ORG: string = "2F8DC37D-D031-401A-8393-1F3D67677727";
    public static ADD_TEAM_ADMIN_DIALOG_CONSUMER_ID: string = "90200E23-131F-4621-AE8C-71E2743F9177";
    public static ADD_MEMBER_DIALOG_CONSUMER_ID: string = "88BE091D-67C7-4FD7-BB3C-155C25E86E27";
    public static ADD_MEMBER_DIALOG_CONSUMER_ID_ORG: string = "C767E2F5-9AD2-468B-BC2B-0C71B39D662A";
    public static SENDMAIL_CONSUMER_ID: string = "1A6C036E-E3DF-49FA-BF41-CB4873E9CF75";
    public static CHANGE_ACCOUNT_OWNER_CONSUMER_ID: string = "E7887735-3BA6-42EC-9A78-697C77BFCD9D";
    public static GRID_CONTACT_CARD_CONSUMER_ID: string = "6A943022-7624-4740-A5CA-6D593A99BF4E";
    public static ADD_TO_PERMISSION_DIALOG_CONSUMER_ID: string = "C4FA24D6-BC6C-40B7-A3B4-BC6F8E380658";

    private static _organizationIdentityPickerClientPromise: IPromise<Identities_Picker_RestClient.CommonIdentityPickerHttpClient> = null;

    public static isAdminUiFeatureFlagEnabled(): boolean {
        if (!FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.AadGroupsAdminUi, false)
            || ($(".enable-new-admin-ui").length > 0
                && !<boolean>Utils_Core.parseMSJSON($(".enable-new-admin-ui").html(), false))) {
            return false;
        }
        return true;
    }

    public static isGroupRulesEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.GroupLicensingRule, false);
    }

    public static shouldUseNewAddDialog(): boolean {
        if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.AadGroupsAdminUi, false)
            && FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.MinControlNewAddDialog, false)
            && $(".enable-new-add-dialog-min-template").length > 0
            && <boolean>Utils_Core.parseMSJSON($(".enable-new-add-dialog-min-template").html(), false)) {
            return true;
        }
        return false;
    }

    public static isOrganizationLevelPage(): boolean {
        if (tfsContext.isHosted
            && tfsContext.isAADAccount
            && $(".organization-page-level").length
            && FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.OrgAdminWebUi, false)) {
            return true;
        }
        return false;
    }

    // for the organization-level pages, we need to send the search request to a non-virtual org host
    public static getSpsOrganizationIdentityPickerSearchClient(): IPromise<Identities_Picker_RestClient.CommonIdentityPickerHttpClient> {
        let context = $.extend(true, {}, getDefaultWebContext());

        context.account.id = tfsContext.navigation.applicationServiceHost.instanceId;
        context.host.id = tfsContext.navigation.applicationServiceHost.instanceId;

        if (this._organizationIdentityPickerClientPromise != null) {
            return this._organizationIdentityPickerClientPromise;
        }

        let authTokenManager = getService(OrganizationTokenManagerService).getOrganizationTokenManager();

        this._organizationIdentityPickerClientPromise = beginGetServiceLocation(ServiceInstanceTypes.SPS, ContextHostType.Organization, context, true, authTokenManager)
            .then((url: string) => {
                let client = new Identities_Picker_RestClient.CommonIdentityPickerHttpClient(url);

                client.authTokenManager = authTokenManager;

                return client;
            });

        return this._organizationIdentityPickerClientPromise;
    }

    // Illegal characters for process name, field name etc.
    // Update this regex in FormValidationUtils.cs
    private static _illegalEntityNameCharacterRegex: RegExp = /[.,;'`~:\/\\\*|?"&%$!+=()\[\]{}<>-]/;

    public static _illegalItemNameCharacterRegex: RegExp = /[.,;'`~:\/\\\*|?"&%$!+=()\[\]{}-]/;

    // Illegal characters for group name etc.
    // Update this regex in FormValidationUtils.cs
    private static _illegalGroupNameCharacterRegex: RegExp = /[&]/;

    // Illegal characters for page name.
    // Update this regex in FormValidationUtils.cs
    private static _illegalPageNameCharacterRegex: RegExp = /[&]/;

    // Illegal characters for group name etc.
    // Update this regex in FormValidationUtils.cs
    private static _illegalControlLabelCharacterRegex: RegExp = /[&]/;

    /**
     * Tests the name for illegal characters
     */
    public static isNameValid(name: string) {
        return (name) && !this._illegalEntityNameCharacterRegex.test(name);
    }

    /**
     * Tests the name for illegal characters
     */
    public static isControlLabelValid(name: string) {
        return (name) && !this._illegalControlLabelCharacterRegex.test(name);
    }

    /**
     * Tests the group name for illegal characters
     */
    public static isGroupNameValid(name: string) {
        return (name) && !this._illegalGroupNameCharacterRegex.test(name);
    }

    /**
     * Tests the page name for illegal characters
     */
    public static isPageNameValid(name: string) {
        return (name) && !this._illegalPageNameCharacterRegex.test(name);
    }

    /**
     * Returns Error messsage or null
     *
     */
    public static validateProcessName(name: string, existingProcesses?: any): string {

        if (name === adminResources.ProvideDescription || !name) {
            return adminResources.NameIsRequired;
        }

        if (existingProcesses) {
            for (var i in existingProcesses) {
                if (Utils_String.localeIgnoreCaseComparer(existingProcesses[i].Name, name) === 0) {
                    return adminResources.NameMustBeUnique;
                }
            }
        }

        if (!this.isNameValid(name)) {
            return adminResources.IllegalCharacters;
        }
        return null;
    }

    /**
     * check identity's origin field against directory keys
     */
    public static isOriginFrom(identity: Identities_Picker_RestClient.IEntity, directoryKey: string) {
        return identity.originDirectory.trim().toLowerCase() == directoryKey;
    }

    /**
     * check identity's type field against type keys
     */
    public static isIdentityTypeOf(identity: Identities_Picker_RestClient.IEntity, typeKey: string) {
        return identity.entityType.trim().toLowerCase() == typeKey;
    }
}

export class IdentityGrid extends AdminGrid {

    public static enhancementTypeName: string = "tfs.admin.identitygrid";

    public hasMore: boolean;
    public _originalData: any;
    public totalIdentityCount: number;

    protected treeStructure: any[];
    protected showBuckets: boolean = true;

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            allowMultiSelect: false,
            gutter: false,
            cssClass: 'identity-grid',
            sharedMeasurements: false,
            source: []
        }, options));
    }

    public initialize() {
        super.initialize();

        this._options.waitObject = {
            image: hostConfig.getResourcesFile('big-progress.gif'),
            message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
            target: this._options.host
        };

        this.populate();
    }

    public populate() {
        Diag.logTracePoint('IdentityGrid.IdentityListAction.Pending');
        TFS_Core_Ajax.getMSJSON(
            this._options.identityListAction,
            this._options.searchParams
                ? $.extend(this._options.searchParams, AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {})
                : AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {},
            delegate(this, this._completeInitialize),
            null,
            {
                tracePoint: 'IdentityGrid.IdentityListAction.Complete',
                wait: this._options.waitObject
            }
        );
    }

    public _completeInitialize(data: any) {
        if (!data) {
            this._infoMessage.show().empty();
            this._infoMessage.text(Utils_String.format(adminResources.IdentityNotPartOfScope, AdminUIHelper.isOrganizationLevelPage() ? adminResources.OrganizationScope : adminResources.AccountScope));
        }

        let source: IIdentity[][] = [];
        if (data && data.identities) {
            for (let i = 0; i < data.identities.length; i++) {
                source.push([data.identities[i]]);
            }
        }

        this._options.source = source;
        this._originalData = source;
        this.hasMore = data ? data.hasMore : false;
        this.totalIdentityCount = data ? data.totalIdentityCount : 0;
        this.treeStructure = null;
        this.showBuckets = true;
        this.initializeDataSource();
        this.getSelectedRowIntoView();

        if (data) {
            this.checkForNoData(adminResources.NoIdentitiesFound); // this checks for 0 results, as opposed to null data, which was already handled above
        }
        this._element.trigger('initialized');
    }

    public setSelectedRowIndex(selectedRowIndex: number) {
        super.setSelectedRowIndex(selectedRowIndex);
        this.getSelectedRowIntoView();
    }

    public fullSearch(identities: IIdentity[], showBuckets: boolean = true) {
        var i: number,
            results: any[] = [];

        for (i = 0; i < identities.length; i++) {
            results.push([identities[i]]);
        }

        this._options.source = results;
        this.treeStructure = null;
        this.showBuckets = showBuckets;
        this.initializeDataSource();

        this.checkForNoData(adminResources.NoIdentitiesMatchSearch);
    }

    public localSearch(searchQuery: string) {
        var i: number,
            identity: IIdentity,
            results: any[] = [],
            searchFields: string[];

        for (i = 0; i < this._originalData.length; i++) {
            identity = this._originalData[i][0];
            searchFields = [identity.FriendlyDisplayName, identity.SubHeader];
            // Perform case-insensitive search for searchQuery on searchFields (joined by \n)
            if (searchFields.join('\n').toLocaleLowerCase().indexOf(searchQuery.toLocaleLowerCase()) > -1) {
                results.push([identity]);
            }
        }

        this._options.source = results;
        this.treeStructure = null;
        this.initializeDataSource();

        Utils_Accessibility.announce(results.length > 0 ? Utils_String.localeFormat(adminResources.IdentitySearchResult, results.length) : adminResources.NoIdentitiesMatchSearch);

        this.checkForNoData(adminResources.NoIdentitiesMatchSearch);
    }

    public cancelSearch() {
        this._options.source = this._originalData;
        this.treeStructure = null;
        this.initializeDataSource();

        this.checkForNoData(adminResources.NoIdentitiesFound);
    }

    public cacheRows(aboveRange: any, visibleRange: any, belowRange: any) {
        if (this.hasMore && this._dataSource.length > 0 && belowRange.length === 0 && !this._options.isSearching) {
            var self: any = this, lastItem: any;
            lastItem = this._dataSource[this._dataSource.length - 1][0];
            this.hasMore = false; // set this to prevent duplicate gets
            this._options.searchControl.disable();
            TFS_Core_Ajax.getMSJSON(
                this._options.identityListAction,
                $.extend({ lastSearchResult: lastItem.DisplayName },
                    AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {},
                    this._options.searchParams),
                function (data) {
                    var i, source = [];
                    for (i = 0; i < data.identities.length; i++) {
                        source[i] = [data.identities[i]];
                    }

                    self._originalData = self._originalData.concat(source);
                    self._options.source = self._originalData;

                    // Do not reset scroll when re-initializing
                    self._resetScroll = false;
                    self.treeStructure = null;
                    self.initializeDataSource();

                    // Need to reset resetScroll for the next time grid is initialized
                    self._resetScroll = true;

                    self.hasMore = data.hasMore;
                    self._options.searchControl.enable();
                },
                null,
                {
                    wait: self._options.waitObject
                }
            );
        }
    }

    public _createIdentityCell(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number): JQuery {
        var cell: JQuery,
            identity: any;

        identity = this.getColumnValue(dataIndex, 0, columnOrder);

        cell = $(domElem('div')).addClass('grid-cell identity-cell cursor-hover-card');
        cell.width(column.width || 20);

        if (!AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
            IdentityImage.identityImageElement(tfsContext, identity.TeamFoundationId).addClass('identity-image').appendTo(cell).attr("alt", "");

            $(domElem('span')).appendTo(cell).addClass('identity-name').text(identity.FriendlyDisplayName);

            column.maxLength = Math.max(column.maxLength || 0, identity.FriendlyDisplayName.length + 4);

            if (identity.IdentityType && identity.IdentityType.toLowerCase() === 'user' && identity.SubHeader) {
                cell.attr('title', identity.SubHeader);
            } else {
                cell.attr('title', identity.DisplayName);
            }
        } else {
            // reusing magic numbers from WebPlatform Grids.ts in this block
            if (columnOrder === indentIndex && level > 0) {
                var indent = ((level * 16) - 13);
                column.indentOffset = indent;
                //expandedState = number of transitive children of this node
                if (expandedState) {
                    var treeSign = $(domElem("div", "icon bowtie-icon grid-tree-icon")).appendTo(cell).css("left", indent);
                    if (expandedState > 0) {
                        treeSign.addClass("bowtie-chevron-down");
                    }
                    else {
                        treeSign.addClass("bowtie-chevron-right");
                    }
                }
                cell.css("text-indent", (level * 16) + "px");
            }

            AvatarHelper.getAvatar(tfsContext, ('EntityId' in identity) && identity.EntityId && identity.EntityId.trim() ? identity.EntityId : identity.TeamFoundationId)
                .addClass(AdminUIHelper.CSS_IDENTITY_AVATAR)
                .appendTo(cell)
                .attr("alt", "");
            $(domElem('span'))
                .appendTo(cell)
                .addClass(AdminUIHelper.CSS_IDENTITY_NAME)
                .text(identity.FriendlyDisplayName);
            column.maxLength = Math.max(column.maxLength || 0, identity.FriendlyDisplayName.length + 4);
            if (identity.IdentityType === AdminUIHelper.USER_ENTITY_TYPE_KEY && identity.SubHeader) {
                cell.attr('title', identity.SubHeader);
            } else {
                cell.attr('title', identity.DisplayName);
            }
        }

        if (column.rowCss) {
            cell.addClass(column.rowCss);
        }

        return cell;
    }

    public _updateRow(rowInfo: any, rowIndex: number, dataIndex: number, expandedState: number, level: number) {
        super._updateRow(rowInfo, rowIndex, dataIndex, expandedState, level);
        if (this._dataSource[rowIndex][0].isRemoved) {
            rowInfo.row.addClass('removed-identity');
        }
        else {
            rowInfo.row.removeClass('removed-identity');
        }
    }
}

VSS.initClassPrototype(IdentityGrid, {
    hasMore: false,
    _originalData: null,
    totalIdentityCount: 0
});


export class AvatarHelper {
    public static getAvatar(tfsContext: TFS_Host_TfsContext.TfsContext, id: string,
        size?: string, title?: string, alt?: string): JQuery {
        if (!tfsContext) {
            tfsContext = TfsContext.getDefault();
        }

        var $img = AvatarHelper._createAvatarElement(size, title, alt);

        $img.attr("src", this._getAvatarUrl(tfsContext, id));

        if (id) {
            $img.addClass("identity-" + id);
        }

        return $img;
    }

    private static _createAvatarElement(size?: string, title?: string, alt?: string): JQuery {
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
        }

        return $img;
    }

    private static _getAvatarUrl(tfsContext: TFS_Host_TfsContext.TfsContext, id: string): string {
        return tfsContext.getActionUrl("GetDdsAvatar", "common", $.extend({
            id: id,
            area: "api",
        }, AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {}) as TFS_Host_TfsContext.IRouteData);
    }
}

export class MembershipIdentityGrid extends IdentityGrid {

    public static enhancementTypeName: string = "tfs.admin.membershipidentitygrid";

    private static _timer: number;
    private static _clickCounter: number = 0;
    private static _clickInterval: number = 250;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            allowMoveColumns: false
        }, options));

        if (AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
            Events_Services.getService().attachEvent(Identities_Picker_Controls.IdCardDialog.IDCARD_LOADED_EVENT, delegate(this, this._stopProgressCursor))
        }
    }

    public onDeleteKey(eventArgs: any): boolean {
        if (eventArgs && eventArgs.rowInfo && eventArgs.rowInfo.row &&
            eventArgs.event && eventArgs.event.altKey === false && eventArgs.event.ctrlKey === false && eventArgs.event.shiftKey === false) {
            var removeAction = eventArgs.rowInfo.row.find('.remove-identity-link');

            if (removeAction.length > 0) { // Delete key press triggers remove action

                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.ADMIN_EX_AREA,
                Admin.CustomerIntelligenceConstants.Process.MANAGE_IDENTITIES_VIEW,
                {
                    "event": "removeActionClicked"
                }));

                removeAction.click();
                return false;
            }
        }
    }

    /**
     * @override
     */
    public _onEscapeKey(e?: JQueryKeyEventObject): boolean {
        if (this._options.onEscapePress) {
            this._options.onEscapePress();
        }
        return false;
    }

    public onEnterKey(eventArgs: any): boolean {
        if (eventArgs && eventArgs.rowInfo && eventArgs.rowInfo.row) {
            var undoAction = eventArgs.rowInfo.row.find('.add-identity-link'),
                removeAction = eventArgs.rowInfo.row.find('.remove-identity-link');

            if (undoAction.length > 0) {

                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.ADMIN_EX_AREA,
                Admin.CustomerIntelligenceConstants.Process.MANAGE_IDENTITIES_VIEW,
                {
                    "event": "undoActionClicked"
                }));
                
                undoAction.click();
                return false;
            }
            else if (removeAction.length > 0) {

                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.ADMIN_EX_AREA,
                Admin.CustomerIntelligenceConstants.Process.MANAGE_IDENTITIES_VIEW,
                {
                    "event": "removeActionClicked"
                }));

                removeAction.click();
                return false;
            }
        }
    }

    public _onKeyDown(e?: JQueryKeyEventObject): any {
        var eventArgs = { rowInfo: { dataIndex: this._selectedIndex }, pageX: e.pageX };

        if (e.keyCode == Utils_UI.KeyCode.C) {
            // Press 'c' to get the contact card of the selected identity.
            this.onGridCellClick(eventArgs);
            return false;
        }
        else if (e.keyCode == Utils_UI.KeyCode.M) {
            // Press 'm' to get the dialog for managing the membership for the selected identity.
            this.onRowDoubleClick(eventArgs);
            return false;
        }

        super._onKeyDown(e);
    }

    public onRowDoubleClick(eventArgs: any): any {
        if (AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
            this._stopProgressCursor();
            MembershipIdentityGrid._clickCounter = 0;
        }

        if (eventArgs && eventArgs.rowInfo) {
            var identity = this._dataSource[eventArgs.rowInfo.dataIndex][0];
            if (identity && (identity.IdentityType === 'group' || identity.IdentityType === 'team') && !identity.IsAadGroup && !identity.IsWindowsGroup) {
                this._element.trigger('open-group-details', identity);
            }
        }
    }

    public _completeInitialize(data) {
        var columns: any[];

        columns = [{
            text: adminResources.DisplayName,
            index: adminResources.DisplayName,
            width: 200,
            headerCss: 'identity-grid-display-name',
            getCellContents: this._createIdentityCell,
            canSortBy: !data || !data.hasMore,
            comparer: function (column, order, rowA, rowB) {
                var identityA = rowA[0], identityB = rowB[0];
                return Utils_String.localeIgnoreCaseComparer(identityA.FriendlyDisplayName, identityB.FriendlyDisplayName);
            }
        },
        {
            text: adminResources.UsernameOrScope,
            index: adminResources.UsernameOrScope,
            width: 200,
            getColumnValue: function (dataIndex, columnIndex, columnOrder) {
                /// <param name="dataIndex" type="int">The index for the row data in the data source</param>
                /// <param name="columnIndex" type="int">The index of the column's data in the row's data array</param>
                /// <param name="columnOrder" type="int" optional="true">The index of the column in the grid's column array. This is the current visible order of the column</param>
                /// <returns type="any" />

                var identity = this.getColumnValue(dataIndex, 0, columnOrder);
                return identity.SubHeader;
            },
            canSortBy: !data || !data.hasMore,
            comparer: function (column, order, rowA, rowB) {
                var identityA = rowA[0], identityB = rowB[0];
                return Utils_String.localeIgnoreCaseComparer(identityA.SubHeader, identityB.SubHeader);
            }
        },
        {
            text: '',
            width: 100,
            canSortBy: false,
            getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                var cell, identity, markup, span;

                cell = $(domElem('div')).addClass('grid-cell');
                cell.width(column.width || 20);

                identity = this.getColumnValue(dataIndex, 0, columnOrder);

                markup = $(domElem('div'));
                span = $(domElem('span')).appendTo(markup);

                // add remove cell
                if (!this._options.preventEdit) {
                    if (identity.isRemoved) {
                        if (identity.inProgress) {
                            span.text(adminResources.UndoInProgress);
                        }
                        else {
                            $(domElem('button')).appendTo(span).addClass('add-identity-link').text(adminResources.Undo).click((event) => {
                                $(event.target).trigger('add-identity-event');
                                this._canvas.focus();
                            });
                        }
                    }
                    else {
                        if (identity.inProgress) {
                            span.text(adminResources.RemoveInProgress);
                        }
                        else {
                            $(domElem('button')).appendTo(span).addClass('remove-identity-link').text(adminResources.RemoveAction)
                                .attr({
                                    'id': Utils_String.format('{0}_{1} ', rowInfo.row[0].id, dataIndex),
                                    'aria-label': Utils_String.format('{0} {1}\{2}', adminResources.RemoveAction, identity.scopeName, identity.DisplayName)
                                })
                                .click((event) => {
                                    $(event.target).trigger('remove-identity-event');
                                    this._canvas.focus();
                                });
                        }
                    }
                }


                column.maxLength = Math.max(column.maxLength || 0, span.text().length + 4);
                cell.html(markup);
                cell.addClass('manage-membership-action-cell');

                return cell;
            }
        }];

        this._options.columns = columns;

        super._completeInitialize(data);
    }

    private static _sortIIdentitiesByName(identities: IIdentity[]): IIdentity[] {
        return identities.sort((identity1, identity2) => {
            if (!identity1) {
                return -1;
            }
            if (!identity2) {
                return 1;
            }

            // Use friendly name when it`s available, use display name instead if not
            var name1 = identity1.FriendlyDisplayName ? identity1.FriendlyDisplayName : identity1.DisplayName ? identity1.DisplayName : "";
            var name2 = identity2.FriendlyDisplayName ? identity2.FriendlyDisplayName : identity2.DisplayName ? identity2.DisplayName : "";

            return name1.toLocaleLowerCase().trim().localeCompare(name2.toLocaleLowerCase().trim());
        });
    }

    public _createIdentityCell(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number): JQuery {
        var cell = super._createIdentityCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
        if (AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
            let descriptionElement = $('#shortcuts-aria-description', this._element);

            if (!descriptionElement || !descriptionElement.length) {
                descriptionElement = $('<div>')
                    .attr('id', 'shortcuts-aria-description')
                    .addClass('visually-hidden')
                    .text(adminResources.SecurityMemberKeyboardShortcutsDescription)
                    .appendTo(this._element);
            }

            var currentRow = rowInfo.row;
            currentRow.attr("aria-describedby", 'shortcuts-aria-description');
            this._bind(cell, "click", delegate(this, this.onGridCellClick));
        }

        return cell;
    }

    private _showProgressCursor() {
        $("body").addClass("busy-cursor");
        $(".grid div").addClass("busy-cursor");
    }

    private _stopProgressCursor() {
        $("body").removeClass("busy-cursor");
        $(".grid div").removeClass("busy-cursor");
    }

    /**
    *   On click fire an event to open up the ID card
    **/
    private onGridCellClick(eventArgs) {
        //filter out double click events and let the double click handler pick them up instead

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            Admin.CustomerIntelligenceConstants.Process.ADMIN_EX_AREA,
            Admin.CustomerIntelligenceConstants.Process.MANAGE_IDENTITIES_VIEW,
            {
                "event": "identityCellClicked"
            }));

        this._showProgressCursor();
        if (MembershipIdentityGrid._clickCounter != 0) {
            MembershipIdentityGrid._clickCounter = 0;
            clearTimeout(MembershipIdentityGrid._timer);
            return;
        }

        MembershipIdentityGrid._clickCounter = 1;
        MembershipIdentityGrid._timer = setTimeout(delegate(this, () => {
            clearTimeout(MembershipIdentityGrid._timer);
            if (!MembershipIdentityGrid._clickCounter) {
                return;
            }
            MembershipIdentityGrid._clickCounter = 0;
            var rowData = this.getRowData(this._selectedIndex);
            var operationScope: Identities_Picker_Services.IOperationScope = {
                Source: true,
                IMS: true,
            };
            var identityType: Identities_Picker_Services.IEntityType = {
                User: true,
                Group: true,
            };
            var idCardDialogOptions: Identities_Picker_Controls.IIdentityPickerIdCardDialogOptions = {
                anchor: this.getRowInfo(this._selectedIndex).row,
                uniqueIdentifier: (!tfsContext.isHosted || rowData[0].IdentityType.toLowerCase().trim() == "group" || !EmailValidator.validate(rowData[0].AccountName))
                    ? rowData[0].EntityId : rowData[0].AccountName,
                leftValue: eventArgs.pageX,
                identityType: identityType,
                operationScope: operationScope,
                consumerId: AdminUIHelper.GRID_CONTACT_CARD_CONSUMER_ID
            };
            this._showIdCardDialog(idCardDialogOptions);
        }, MembershipIdentityGrid._clickInterval));
    }

    private _showIdCardDialog(options: Identities_Picker_Controls.IIdentityPickerIdCardDialogOptions) {
        if (!AdminUIHelper.isAdminUiFeatureFlagEnabled())
            return;

        var idcardDialogOptions: Identities_Picker_Controls.IIdentityPickerIdCardDialogOptions = {
            identity: options.identity,
            uniqueIdentifier: options.uniqueIdentifier,
            anchor: options.anchor,
            leftValue: options.leftValue || 0,
            operationScope: options.operationScope,
            identityType: options.identityType,
            consumerId: options.consumerId
        };
        Controls.Enhancement.enhance(Identities_Picker_Controls.IdCardDialog, "<div/>", idcardDialogOptions);
    }
}

export class MembershipControl extends Controls.BaseControl {

    public static enhancementTypeName: string = 'tfs.admin.membershipcontrol';

    private _verticalFillLayout: VerticalFillLayout;
    private _searchControl: JQuery;
    private _delayedRefresh: Utils_Core.DelayedFunction = null;
    private _progressId: number;
    private static MEMBERSHIP_REFRESH_DELAY: number = 5000; // refreshing the membership view 5s after a new member is added to account for the cache

    public _menuBar: Menus.MenuBar;
    public _identitySearchControl: any; //TODO: Jquery widget.  need to figure out correct type.;
    public _errorPane: Notifications.MessageAreaControl;
    public _gridContainer: JQuery;
    public _notificationPane: JQuery;
    public _membersModified: boolean;
    public _requestContext: any; //TODO - this comes from ajax module.  Need that to return something other than any.
    public _notificationContent: JQuery;

    constructor(options?) {
        super(options);
    }

    public _onMenuItemClick(e?: any): any {
        var command = this._getCommandName(e);

        var getItem = (e?: any) => {
            if (!e) {
                return null;
            }
            return e._commandSource._item
        }
        switch (command) {
            case 'add-members':
                this._checkAddPermission(delegate(this, function () {
                    Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs('add-members-dialog', {
                        saveCallback: delegate(this, this._saveIdentitiesCallback),
                        isTeam: this._options.isTeam,
                        tfsContext: this._options.tfsContext
                    }, null));
                }));
                return false;
            case 'add-groups':
                this._checkAddPermission(delegate(this, function () {
                    Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs('add-groups-dialog', {
                        saveCallback: delegate(this, this._saveIdentitiesCallback),
                        joinGroupTfid: this._options.joinToGroupTfid,
                        joinGroupExpandParentScopes: this._options.joinToGroupExpandParentScopes,
                        showAllGroupsIfCollection: this._options.showAllGroupsIfCollection,
                        tfsContext: this._options.tfsContext
                    }, null));
                }));
                return false;
            case 'add-Aad-groups':
                this._checkAddPermission(delegate(this, function () {
                    Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs('add-Aad-groups-dialog', {
                        saveCallback: delegate(this, this._saveAadIdentitiesCallback),
                        joinGroupTfid: this._options.joinToGroupTfid,
                        showAllGroupsIfCollection: this._options.showAllGroupsIfCollection,
                        tfsContext: this._options.tfsContext
                    }, null));
                }));
                return false;
            case 'add-identity-picker-identities':
                var executeMembershipCommand = (e?: any) => {
                    Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs('identity-picker-dialog', {
                        saveCallback: delegate(this, this._saveIdentityPickerIdentitiesCallback),
                        tfsContext: this._options.tfsContext,
                        groupMembershipOpType: getItem(e).groupMembershipOpType,
                        close: () => this._onClose(),
                    }, null));
                }
                if (getItem(e).groupMembershipOpType == AdminUIHelper.ADD_MEMBERS) {
                    this._checkAddPermission(delegate(this, () => {
                        executeMembershipCommand(e);
                    }));
                }
                else {
                    executeMembershipCommand(e);
                }
                return false;
            case 'join-group':
                Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs('join-group-dialog', {
                    saveCallback: delegate(this, this._saveIdentitiesCallback)
                }, null));
                return false;
            case 'refresh':
                this.refreshIdentityGrid();
                return false;
            case 'search':
                this._showSearchBox();
                return false;
        }
    }

    public _getCommandName(e?: any): string {
        return e.get_commandName();
    }

    public _getActionItems(): any[] {
        var items: any[] = [],
            addItems: any[] = [],
            addMembersAction: any,
            addGroupsAction: any,
            joinGroupAction: any,
            addAadGroupsAction: any,
            addIdentitiesAction: any;

        if (AdminUIHelper.isAdminUiFeatureFlagEnabled()) {

            var groupMembershipOpType: string;
            if (this._options.editMembers) {
                //add members to the current group
                groupMembershipOpType = AdminUIHelper.ADD_MEMBERS;
            }
            else {
                //add this group to others
                groupMembershipOpType = AdminUIHelper.ADD_AS_MEMBER;
            }
            addIdentitiesAction = {
                id: 'add-identity-picker-identities',
                showIcon: true,
                icon: "bowtie-icon bowtie-math-plus-heavy",
                showText: true,
                text: adminResources.IdentityPickerDialog_AddUsersAndGroupsButtonText,
                groupMembershipOpType: groupMembershipOpType,
            };
            if (this._options.preventAdd || this._options.disableAdd) {
                addIdentitiesAction.disabled = true;
                addIdentitiesAction.title = this._options.restrictionReason;
            }
            items.push(addIdentitiesAction);
            items.push({ separator: true });
            items.push({ id: "refresh", text: adminResources.Refresh, showText: false, icon: "bowtie-icon bowtie-navigate-refresh" });

            // Default is to include search.  So if it is undefined or set to true, we want to include search
            if (this._options.includeSearch !== false) {
                items.push({ separator: true });
                items.push({ id: "search", noIcon: true, text: adminResources.Search });
            }
            //return early
            return items;
        }
        else if (this._options.editMembers) {

            if (this._options.tfsContext.isHosted) {
                addMembersAction = { id: 'add-members', noIcon: true, text: adminResources.AddMembers };
            } else {
                addMembersAction = { id: 'add-members', noIcon: true, text: adminResources.AddWindowsMembers };
            }
            addGroupsAction = { id: 'add-groups', noIcon: true, text: tfsContext.isHosted ? adminResources.AddTfsGroupHosted : adminResources.AddTfsGroup };

            if (this._options.preventAdd) {
                addMembersAction.disabled = true;
                addGroupsAction.disabled = true;
                addMembersAction.title = this._options.restrictionReason;
                addGroupsAction.title = this._options.restrictionReason;
            }
            addItems.push(addMembersAction);
            addItems.push(addGroupsAction);

            var featureService = TFS_OM_Common.Application.getConnection(this._options.tfsContext).getService<FeatureAvailability_Services.FeatureAvailabilityService>(FeatureAvailability_Services.FeatureAvailabilityService);
            if (tfsContext.isHosted && this._options.showAddAadMembers) {
                addAadGroupsAction = { id: 'add-Aad-groups', noIcon: true, text: adminResources.AddAadGroup };
                addItems.push(addAadGroupsAction);
            }

            if (tfsContext.isHosted && this._options.showAddAadMembersWarning) {
                this._errorPane.setMessage(adminResources.AADGroupMembersAzurePortal, Notifications.MessageAreaType.Warning);
            }

            items.push({
                id: "manage-actions",
                idIsAction: false,
                text: adminResources.AddMenuItem,
                noIcon: true,
                childItems: addItems,
                disabled: this._options.preventAdd
            });
        }
        else {
            joinGroupAction = { id: 'join-group', noIcon: true, text: adminResources.JoinGroup };

            if (this._options.preventJoin) {
                joinGroupAction.disabled = true;
                joinGroupAction.title = this._options.restrictionReason;
            }
            items.push(joinGroupAction);
        }
        items.push({ separator: true });
        items.push({ id: "refresh", text: adminResources.Refresh, showText: false, icon: "bowtie-icon bowtie-navigate-refresh" });

        // Default is to include search.  So if it is undefined or set to true, we want to include search
        if (this._options.includeSearch !== false) {
            items.push({ separator: true });
            items.push({ id: "search", noIcon: true, text: adminResources.Search });
        }

        return items;
    }

    public initialize() {
        super.initialize();

        this._setupActionUrls();

        var $header: JQuery;
        this._element.addClass('vertical-fill-layout');
        this._verticalFillLayout = <VerticalFillLayout>Controls.Enhancement.ensureEnhancement(VerticalFillLayout, this._element);

        $header = $(domElem('div')).addClass('membership-control-header fixed-header').appendTo(this._element);

        // Create error pane
        this._errorPane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $header);
        this._errorPane._element.bind(Notifications.MessageAreaControl.EVENT_DISPLAY_COMPLETE, () => {
            this._verticalFillLayout.redraw();
        });

        // Create actions
        this._setupActions($header);

        this._gridContainer = $(domElem('div'))
            .addClass('manage-membership-grid fill-content')
            .appendTo(this._element)
            .bind('initialized', delegate(this, this._fireMemberCountChangedEvent))
            .bind('initialized', delegate(this, this._gridInitialized));

        this._prepareInitialize();

        // Create notification pane
        this._notificationPane = $(domElem('div')).appendTo(this._element).addClass('fixed-footer manage-membership-notifications');
        $(domElem('div')).appendTo(this._notificationPane)
            .addClass('icon bowtie-icon bowtie-edit-delete')
            .css('float', 'right')
            .css('cursor', 'pointer')
            .click(() => {
                this._closeNotification();
            })
            .hide();
        this._notificationContent = $(domElem('span')).html('&nbsp;').appendTo(this._notificationPane);
        this._verticalFillLayout.redraw();
        this._notificationPane.hide();

        // utilizes notification pane
        this._checkIsGroupRuleBacked();

        // Handler for remove or undo action
        this._element.bind('add-identity-event remove-identity-event', (event) => {
            var selectedIndex, selectedIdentity;

            selectedIndex = this._options.identityGrid.getSelectedRowIndex();
            Diag.Debug.assert(selectedIndex !== -1, 'selected index is -1');

            selectedIdentity = this._options.identityGrid._dataSource[selectedIndex][0];

            this._removeIdentity(selectedIdentity.TeamFoundationId, selectedIndex, event.type === 'add-identity-event');
        });

        this.refreshIdentityGrid();
    }

    public setFocus() {
        if (this._menuBar) {
            this._menuBar.activate();
        }
    }

    public refreshIdentityGrid() {
        if (this._options.identityGrid) {
            $.extend(this._options.identityGrid._options, this._options.gridOptions);
            this._options.identityGrid.populate();
        }
        else {
            this._options.identityGrid = Controls.Enhancement.enhance(MembershipIdentityGrid,
                this._gridContainer,
                {
                    ...this._options.gridOptions,
                    ariaAttributes: {
                        label: adminResources.MembersGridLabel,
                    },
                });

            this._identitySearchControl = ((<any>this._searchControl).IdentitySearchControl({
                identityList: this._options.identityGrid,
                watermarkText: adminResources.FindMembers
            }) as JQuery).data('TFS-IdentitySearchControl');
        }
    }

    private _setupActionUrls() {
        /// <summary>Intializes the actions urls for membership actions. </summary>

        // If the actions urls were not provided use the default ones
        if (!this._options.actionUrls) {
            this._options.actionUrls = {
                canAddMemberToGroup: this._options.tfsContext.getActionUrl('CanAddMemberToGroup', 'identity', { area: 'api' }),
                isGroupRuleBacked: this._options.tfsContext.getActionUrl('IsGroupRuleBacked', 'identity', { area: 'api' }),
                readGroupMembers: this._options.tfsContext.getActionUrl('ReadGroupMembers', 'identity', { area: 'api' }),
                editMembership: this._options.tfsContext.getActionUrl('EditMembership', 'identity', { area: 'api' }),
                addIdentities: this._options.tfsContext.getActionUrl('AddIdentities', 'identity', { area: 'api' }),
            }
        }
    }

    private _checkAddPermission(callback: IResultCallback) {
        if (this._options.joinToGroupTfid || this._options.customGroupId) {
            TFS_Core_Ajax.getMSJSON(
                this._options.actionUrls.canAddMemberToGroup,
                $.extend({ groupId: this._options.joinToGroupTfid || this._options.customGroupId }, AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {}),
                (data) => {
                    if (data.canEdit) {
                        callback();
                    } else {
                        this._errorPane.setMessage(adminResources.MissingAddPermission, Notifications.MessageAreaType.Warning);
                    }
                }
            );
        } else {
            callback();
        }
    }

    private _checkIsGroupRuleBacked() {
        if (tfsContext.isHosted && AdminUIHelper.isGroupRulesEnabled() && this._options.joinToGroupTfid || this._options.customGroupId) {
            TFS_Core_Ajax.getMSJSON(
                this._options.actionUrls.isGroupRuleBacked,
                $.extend({ groupId: this._options.joinToGroupTfid || this._options.customGroupId }, {}),
                (data) => {
                    if (data.isGroupRuleBacked) {
                        this._errorPane.setMessage($(Utils_String.format(adminResources.Identity_IsGroupRuleBacked, tfsContext.getHostUrl())), Notifications.MessageAreaType.Warning);
                    }
                }
            );
        }
    }

    public _setupActions($header: JQuery): JQuery {
        // Create actions
        var actionsControlElement: JQuery = $(domElem('div')).appendTo($header).addClass('membership-control-actions toolbar');

        this._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, actionsControlElement, {
            items: this._getActionItems(),
            executeAction: delegate(this, this._onMenuItemClick),
            showIcon: true
        });
        this._menuBar.selectFirstItem();

        this._searchControl = $(domElem('div')).appendTo(actionsControlElement)
            .addClass('identity-grid-search')
            .css('display', 'inline-block')
            .hide();

        return actionsControlElement;
    }

    public _prepareInitialize() {
        var actionParams: { actionUrl: string; params: any; } = this._prepareActionParams();

        this._options.gridOptions = {
            identityListAction: actionParams.actionUrl,
            searchParams: actionParams.params,
            preventEdit: (this._options.editMembers && this._options.preventAdd) || (!this._options.editMembers && this._options.preventJoin),
            host: this._element,
            adminUIFeatureFlagEnabled: AdminUIHelper.isAdminUiFeatureFlagEnabled() || null,
            onEscapePress: this._options.onEscapePress,
        };
    }

    public _prepareActionParams(): { actionUrl: string; params: any; } {
        return {
            actionUrl: this._options.actionUrls.readGroupMembers,
            params: {
                scope: this._options.joinToGroupTfid || this._options.customGroupId,
                readMembers: this._options.editMembers
            }
        };
    }

    private _showSearchBox() {
        this._menuBar.getItem('search').hideElement();
        this._searchControl.show();
        this._identitySearchControl.focus();
    }

    public _prepareRemoveIdentity(): any {
        return {
            actionUrl: this._options.actionUrls.editMembership,
            params: {
                groupId: this._options.joinToGroupTfid || this._options.customGroupId
            }
        };
    }

    private _removeIdentity(tfidToRemove: string, index: number, undo: boolean) {
        var actionParams: any = this._prepareRemoveIdentity(),
            postParams: any = actionParams.params,
            removedIdentity: any;

        postParams.editMembers = this._options.editMembers;
        if (undo) {
            postParams.addItemsJson = Utils_Core.stringifyMSJSON([tfidToRemove]);
        }
        else {
            postParams.removeItemsJson = Utils_Core.stringifyMSJSON([tfidToRemove]);
        }

        // Get identity object
        removedIdentity = this._options.identityGrid._dataSource[index][0];

        // Remove item from list
        removedIdentity.inProgress = true;
        this._options.identityGrid.updateRow(index);

        TFS_Core_Ajax.postMSJSON(
            actionParams.actionUrl,
            $.extend(postParams, AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {}),
            (identityData) => {
                var errorsHtml, removedIdentity, i;

                if (identityData.HasErrors) {
                    // Display errors
                    errorsHtml = parseErrors(identityData);
                    if (this._options.editMembers) {
                        this._errorPane.setError({
                            header: adminResources.ErrorRemoving,
                            content: errorsHtml
                        }, null);
                    }
                    else {
                        this._errorPane.setError({
                            header: adminResources.ErrorLeaving,
                            content: errorsHtml
                        }, null);
                    }
                }
                this._membersModified = true;
                // By this time, selected index could be different than removed item
                if (this._options.identityGrid._dataSource[index][0].TeamFoundationId !== tfidToRemove) {

                    // Find removed item index
                    index = null;
                    for (i = 0; i < this._options.identityGrid._dataSource.length; i++) {
                        if (this._options.identityGrid._dataSource[i][0].TeamFoundationId === tfidToRemove) {
                            index = i;
                            break;
                        }
                    }
                }

                // Remove item from list
                if (index !== null) {

                    // Get identity object
                    removedIdentity = this._options.identityGrid._dataSource[index][0];

                    if (!identityData.HasErrors) {
                        removedIdentity.isRemoved = !undo;
                        if (undo) {
                            this._options.identityGrid.totalIdentityCount++;
                        }
                        else {
                            this._options.identityGrid.totalIdentityCount--;
                        }
                    }
                    removedIdentity.inProgress = false;
                    this._options.identityGrid.updateRow(index);
                }
                this._fire("member-removed");
                this._fireMemberCountChangedEvent();
            },
            (error) => {
                this._errorPane.setMessage(VSS.getErrorMessage(error), Notifications.MessageAreaType.Error);
            },
            {
                tracePoint: 'EditMembership.RemoveIdentity.Done'
            }
        );
    }

    private _fireMemberCountChangedEvent() {
        this._fire('member-count-changed', {
            TeamFoundationId: this._options.joinToGroupTfid,
            MemberCount: this._options.identityGrid.totalIdentityCount
        });
    }

    private _gridInitialized() {
        if (this._options.setInitialFocus) {
            this.setFocus();
        }

        if (this._options.identityGrid.totalIdentityCount === 100) {
            if (this._options.editMembers) {
                this._setNonDisappearNotification(adminResources.OnlyShowFirst100Members);
            }
            else {
                this._setNonDisappearNotification(adminResources.OnlyShowFirst100Memberships);
            }
        }
    }

    private _setNotification(notificationText: string, timeout?: number) {
        /// <param name="timeout" type="number" optional="true" />

        this._notificationContent.text(notificationText);
        this._notificationPane.slideDown();

        if (timeout === undefined) {
            timeout = 6000;
        }
        if (timeout > 0) {
            this.delayExecute("setNotification", timeout, true, function () {
                this._notificationPane.slideUp();
            });
        }
    }

    private _setNonDisappearNotification(notificationText: string) {
        this._notificationContent.text(notificationText);
        this._notificationPane.slideDown();
    }

    private _closeNotification() {
        this.cancelDelayedFunction("setNotification");
        this._notificationPane.slideUp();
    }

    private _onClose(e?: any): boolean {
        if (this._menuBar) {
            Utils_Core.delay(this, 0, function () {
                this._menuBar.selectFirstItem();
            });
            return true;
        }
        return false;
    }

    public _prepareSaveIdentities(pendingChanges): any {
        var postParams: any;
        pendingChanges.existingUsers = $.map(pendingChanges.existingUsers, function (existingUser) {
            return existingUser.tfid;
        });

        if (this._options.editMembers) {
            if (AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
                postParams = {
                    newUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.newUsers),
                    existingUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.existingUsers),
                    groupsToJoinJson: Utils_Core.stringifyMSJSON([this._options.joinToGroupTfid || this._options.customGroupId]),
                    aadGroupsJson: Utils_Core.stringifyMSJSON(pendingChanges.aadGroups)
                };
            } else {
                postParams = {
                    newUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.newUsers),
                    existingUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.existingUsers),
                    groupsToJoinJson: Utils_Core.stringifyMSJSON([this._options.joinToGroupTfid || this._options.customGroupId])
                };
            }
        }
        else {
            postParams = {
                newUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.newUsers),
                existingUsersJson: Utils_Core.stringifyMSJSON([this._options.joinToGroupTfid || this._options.customGroupId]),
                groupsToJoinJson: Utils_Core.stringifyMSJSON(pendingChanges.existingUsers)
            };
        }

        return {
            actionUrl: this._options.actionUrls.addIdentities,
            params: postParams
        };
    }

    private _saveIdentityPickerIdentitiesCallback(identities: Identities_Picker_RestClient.IEntity[], tokens: string[]) {
        var aadUsers: Identities_Picker_RestClient.IEntity[] = [];
        var aadGroups: Identities_Picker_RestClient.IEntity[] = [];
        var imsUsers: Identities_Picker_RestClient.IEntity[] = [];
        var imsGroups: Identities_Picker_RestClient.IEntity[] = [];
        var windowsUsersAndGroups = new WindowsUsersAndGroups();

        identities.forEach((identity: Identities_Picker_RestClient.IEntity, index: number, array: Identities_Picker_RestClient.IEntity[]) => {
            if (AdminUIHelper.isIdentityTypeOf(identity, AdminUIHelper.USER_ENTITY_TYPE_KEY)) {
                if (AdminUIHelper.isOriginFrom(identity, AdminUIHelper.VISUAL_STUDIO_DIRECTORY_KEY)) {
                    imsUsers.push(identity);
                } else if (AdminUIHelper.isOriginFrom(identity, AdminUIHelper.AZURE_ACTIVE_DIRECTORY_KEY)) {
                    aadUsers.push(identity);
                }
                windowsUsersAndGroups.tryAddUserOrGroupIfValid(identity);
            } else if (AdminUIHelper.isIdentityTypeOf(identity, AdminUIHelper.GROUP_ENTITY_TYPE_KEY)) {
                if (AdminUIHelper.isOriginFrom(identity, AdminUIHelper.VISUAL_STUDIO_DIRECTORY_KEY)) {
                    imsGroups.push(identity);
                } else if (AdminUIHelper.isOriginFrom(identity, AdminUIHelper.AZURE_ACTIVE_DIRECTORY_KEY)) {
                    aadGroups.push(identity);
                }
                windowsUsersAndGroups.tryAddUserOrGroupIfValid(identity);
            }
        });

        //newUsers are sign-in addresses, existingUsers are vsids
        var pendingChanges = <{ newUsers: string[]; existingUsers: { tfid: string }[]; aadGroups: string[] }>{};
        pendingChanges.newUsers = [];
        pendingChanges.existingUsers = [];
        pendingChanges.aadGroups = [];

        if (aadGroups.length) {
            aadGroups.forEach((identity: Identities_Picker_RestClient.IEntity, index: number, array: Identities_Picker_RestClient.IEntity[]) => {
                pendingChanges.aadGroups.push(identity.originId);
            });
        }
        //the identity picker always resolves identities to their originId or localId
        if (imsUsers.length + aadUsers.length) {
            var users = imsUsers.concat(aadUsers);
            users.forEach((identity: Identities_Picker_RestClient.IEntity, index: number, array: Identities_Picker_RestClient.IEntity[]) => {
                if (identity.localId) {
                    pendingChanges.existingUsers.push({ tfid: identity.localId });
                }
                else {
                    pendingChanges.newUsers.push(identity.signInAddress);
                }
            });
        }

        // Add corresponding Active Directory users to pendingchanges
        windowsUsersAndGroups.getAllExistingUsersLocalIds().forEach(s => { pendingChanges.existingUsers.push({ tfid: s }); });
        windowsUsersAndGroups.getAllNewUsersSamAccountNames().forEach(s => { pendingChanges.newUsers.push(s); });

        if (imsGroups.length) {
            imsGroups.forEach((identity: Identities_Picker_RestClient.IEntity, index: number, array: Identities_Picker_RestClient.IEntity[]) => {
                //IMS groups will have a tfid
                if (identity.localId) {
                    pendingChanges.existingUsers.push({ tfid: identity.localId });
                }
            });
        }

        if (tokens.length) {
            pendingChanges.newUsers = pendingChanges.newUsers.concat(tokens);
        }
        this._saveIdentitiesCallback(pendingChanges);
    }

    private _saveAadIdentitiesCallback(pendingChanges) {
        var actionParams: any = this._prepareSaveIdentities(pendingChanges),
            that: any = this;

        this._errorPane.clear();
        actionParams.actionUrl = this._options.tfsContext.getActionUrl('AddAadGroups', 'identity', { area: 'api' });
        this._requestContext = TFS_Core_Ajax.postMSJSON(
            actionParams.actionUrl,
            actionParams.params,
            (identityData) => {
                var errorsHtml, errorHeaderText, successText;

                if (identityData.HasErrors) {

                    // Display errors
                    errorsHtml = parseErrors(identityData);
                    //Temporarily display a message for adding user to AAD account
                    if (identityData.AADErrors.length > 0) {
                        if (!AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
                            errorHeaderText = adminResources.ConfirmUserAAD;
                            this._errorPane.setMessage(errorsHtml, Notifications.MessageAreaType.Warning);
                        }
                    }
                    else {
                        if (this._options.editMembers) {
                            errorHeaderText = identityData.FailedAddedIdentities.length === 0 ?
                                adminResources.ErrorAddingZero : identityData.FailedAddedIdentities.length === 1 ?
                                    adminResources.ErrorAddingOne : Utils_String.format(adminResources.ErrorAdding, identityData.FailedAddedIdentities.length);
                        }
                        else {
                            errorHeaderText = identityData.FailedAddedIdentities.length === 1 ?
                                adminResources.ErrorJoiningOne : Utils_String.format(adminResources.ErrorJoining, identityData.FailedAddedIdentities.length);
                        }

                        this._errorPane.setError({
                            header: errorHeaderText,
                            content: errorsHtml
                        }, null);
                    }
                }
                if (identityData.AddedIdentities.length > 0) {
                    this._fire("identity-aad-added");
                }
                this._menuBar.activate();
                this.refreshIdentityGrid();
            },
            (error) => {
                this._errorPane.setMessage(VSS.getErrorMessage(error), Notifications.MessageAreaType.Error);
            },
            {
                tracePoint: 'AddIdentityDialog.SaveChanges.Success',
            }
        );
    }

    private _saveIdentitiesCallback(pendingChanges) {
        var actionParams: any = this._prepareSaveIdentities(pendingChanges),
            that: any = this;

        this._requestContext = TFS_Core_Ajax.postMSJSON(
            actionParams.actionUrl,
            actionParams.params
                ? $.extend(actionParams.params, AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {})
                : AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {},
            (identityData) => {
                var errorsHtml, errorHeaderText, successText;

                if (identityData.HasErrors) {

                    // Display errors
                    errorsHtml = parseErrors(identityData);
                    //Temporarily display a message for adding user to AAD account
                    if (identityData.AADErrors.length > 0) {
                        if (!AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
                            errorHeaderText = adminResources.ConfirmUserAAD;
                            this._errorPane.setMessage(errorsHtml, Notifications.MessageAreaType.Warning);
                        }
                    }
                    else {
                        if (this._options.editMembers) {
                            errorHeaderText = identityData.FailedAddedIdentities.length === 0 ?
                                adminResources.ErrorAddingZero : identityData.FailedAddedIdentities.length === 1 ?
                                    adminResources.ErrorAddingOne : Utils_String.format(adminResources.ErrorAdding, identityData.FailedAddedIdentities.length);
                        }
                        else {
                            errorHeaderText = identityData.FailedAddedIdentities.length === 1 ?
                                adminResources.ErrorJoiningOne : Utils_String.format(adminResources.ErrorJoining, identityData.FailedAddedIdentities.length);
                        }

                        this._errorPane.setError({
                            header: errorHeaderText,
                            content: errorsHtml
                        }, null);
                    }
                }

                if (identityData.HasWarnings) {

                    // Display warnings
                    errorsHtml = parseErrors(identityData, AdminUIHelper.isAdminUiFeatureFlagEnabled());
                    if (identityData.StakeholderLicenceWarnings.length > 0) {
                        this._errorPane.setMessage(errorsHtml, Notifications.MessageAreaType.Warning);
                    }
                }

                if (identityData.AddedIdentities.length > 0) {
                    if (identityData.AddedIdentities.length === 1) {
                        Utils_Accessibility.announce(Utils_String.format(adminResources.IdentitySuccessfullyAdded, identityData.AddedIdentities[0].FriendlyDisplayName));
                    } else {
                        Utils_Accessibility.announce(adminResources.IdentitiesSuccessfullyAdded);
                    }

                    this._fire("member-added");
                }

                this._menuBar.activate();
                if (AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
                    this._progressId = VSS.globalProgressIndicator.actionStarted("refreshMembershipViewDelay", true);
                    if (!this._delayedRefresh) {
                        this._delayedRefresh = new Utils_Core.DelayedFunction(this, MembershipControl.MEMBERSHIP_REFRESH_DELAY, "refreshMembershipView", () => {
                            if (this._element) {
                                this.refreshIdentityGrid();
                            }
                            VSS.globalProgressIndicator.actionCompleted(this._progressId);
                        });
                        this._delayedRefresh.start();
                    } else {
                        this._delayedRefresh.reset();
                    }
                } else {
                    this.refreshIdentityGrid();
                }
            },
            (error) => {
                this._errorPane.setMessage(VSS.getErrorMessage(error), Notifications.MessageAreaType.Error);
            },
            {
                tracePoint: 'AddIdentityDialog.SaveChanges.Success',
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: this._element
                }
            }
        );
    }
}

export class WindowsUsersAndGroups {
    private windowsUsersAndGroups: Identities_Picker_RestClient.IEntity[];

    constructor() {
        this.windowsUsersAndGroups = [];
    }

    /**
     * Add user as Active Directory Users when the origin directory is Active Directory
     * @returns
     * true, when origin directory is active directory and added the user,
     * false, when it is not
     */
    public tryAddUserOrGroupIfValid(identity: Identities_Picker_RestClient.IEntity): boolean {
        if (AdminUIHelper.isOriginFrom(identity, AdminUIHelper.ACTIVE_DIRECTORY_KEY) || AdminUIHelper.isOriginFrom(identity, AdminUIHelper.WINDOWS_MACHINE_DIRECTORY_KEY)) {
            this.windowsUsersAndGroups.push(identity);
            return true;
        }
        return false;
    }

    public getAllExistingUsersLocalIds(): string[] {
        var localIds: string[] = [];
        this.windowsUsersAndGroups.forEach((identity: Identities_Picker_RestClient.IEntity, index: number, array: Identities_Picker_RestClient.IEntity[]) => {
            if (identity.localId) {
                localIds.push(identity.localId);
            }
        });
        return localIds;
    }

    public getAllNewUsersSamAccountNames(): string[] {
        var samAccountNames: string[] = [];
        this.windowsUsersAndGroups.forEach((identity: Identities_Picker_RestClient.IEntity, index: number, array: Identities_Picker_RestClient.IEntity[]) => {
            if (!identity.localId) {
                samAccountNames.push(identity.scopeName ? identity.scopeName + "\\" + identity.samAccountName : identity.samAccountName);
            }
        });
        return samAccountNames;
    }
}

VSS.initClassPrototype(MembershipControl, {
    _menuBar: null,
    _verticalFillLayout: null,
    _identitySearchControl: null,
    _errorPane: null,
    _searchControl: null,
    _gridContainer: null,
    _notificationPane: null,
    _membersModified: false,
    _requestContext: null,
    _notificationContent: null
});

VSS.classExtend(MembershipControl, TfsContext.ControlExtensions);


export class MainIdentityGrid extends IdentityGrid {

    public static enhancementTypeName: string = "tfs.admin.mainidentitygrid";
    private _treeIndex: number;
    private _newTreeNodes: IIdentity[][];
    private _refreshMembers: boolean = true;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            header: false,
            delayWindowsGroups: false
        }, options));
    }

    public initialize() {
        this._options.columns = [{
            text: '',
            width: "100%",
            canSortBy: false,
            getCellContents: this._createIdentityCell,
            getColumnValue: function (dataIndex, columnIndex, columnOrder) {
                /// <param name="dataIndex" type="int">The index for the row data in the data source</param>
                /// <param name="columnIndex" type="int">The index of the column's data in the row's data array</param>
                /// <param name="columnOrder" type="int" optional="true">The index of the column in the grid's column array. This is the current visible order of the column</param>
                /// <returns type="any" />

                var identity = this.getColumnValue(dataIndex, 0, columnOrder);
                if (identity.TeamFoundationId) {
                    return identity.FriendlyDisplayName;
                }
                else {
                    // This is a text node (e.g. "Loading" or "No Members")
                    return identity;
                }
            }
        }];

        super.initialize();
    }

    public populate() {
        if (AdminUIHelper.isAdminUiFeatureFlagEnabled()
            && FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.DoNotPopulateIdentityGrid, false)) {
            this._completeInitialize({
                identities: [],
                hasMore: false,
                totalIdentityCount: 0
            });
        } else {
            super.populate();
        }
    }

    public initializeDataSource(keepSelection?: boolean) {
        ///<param name="keepSelection" type="boolean" optional="true" />
        var i: number,
            identity: IIdentity,
            selectedIdentity: string = this._options.identityToSelect;

        if (this._options.isTeam && !this._options.isSearching) {
            this._populateSourceForTeams();
        }
        else {
            this._populateSourceWithBuckets();
        }

        // Find identity to select
        if (selectedIdentity) {
            for (i = 0; i < this._options.source.length; i++) {
                identity = this._options.source[i][0];
                if (identity.TeamFoundationId === selectedIdentity) {
                    if (AdminUIHelper.isAdminUiFeatureFlagEnabled() && !this._refreshMembers) { // we added a new member to group and we have to find the correct row to highlight
                        this._selectedIndex = this._getRowIndex(i);
                    } else {
                        this._selectedIndex = i;
                    }
                    break;
                }
            }
        }
        else if (!keepSelection) {
            // If no identity selected, select first identity
            for (i = 0; i < this._options.source.length; i++) {
                identity = this._options.source[i][0];
                if (identity.TeamFoundationId) {
                    this._selectedIndex = i;
                    break;
                }
            }
        } else if (AdminUIHelper.isAdminUiFeatureFlagEnabled() && this._options.selectedIndex) {
            this._selectedIndex = this._getRowIndex(this._options.selectedIndex);
        }

        this._options.keepSelection = true;
        super.initializeDataSource();
    }

    public expandNode(dataIndex: number) {
        // Bring in additional identities

        var currentNode: any = this._dataSource[dataIndex],
            hasMore: boolean = currentNode.hasMore,
            actionUrl: string = currentNode.actionUrl,
            actionParams: any = currentNode.actionParams;

        if (hasMore) {
            currentNode.hasMore = false;
            TFS_Core_Ajax.getMSJSON(actionUrl,
                actionParams
                    ? $.extend(actionParams, AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {})
                    : AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {},
                (data) => {
                    if (!data) {
                        this._infoMessage.show().empty();
                        this._infoMessage.text(Utils_String.format(adminResources.IdentityNotPartOfScope, AdminUIHelper.isOrganizationLevelPage() ? adminResources.OrganizationScope : adminResources.AccountScope));
                    }

                    this.hasMore = data ? data.hasMore : false;

                    let source: IIdentity[][] = [];
                    if (data && data.identities) {
                        for (let i = 0; i < data.identities.length; i++) {
                            source.push([data.identities[i]]);
                        }
                    }
                    this._originalData = this._originalData.concat(source);
                    this._options.source = this._originalData;
                    if (AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
                        this._treeIndex = dataIndex;
                        this._newTreeNodes = source;
                        this._options.selectedIndex = dataIndex;
                        this._options.identityToSelect = null;
                    }
                    this._resetScroll = false;
                    this.initializeDataSource(true);
                }
            );
        }
        super.expandNode(dataIndex);
    }

    public nonAncestorFolderToggled(rowInfo, currSelectedDataIndex) {
        if (AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
            // if we call expandNode (state < 0) then we already refresh the right-side view, so we don't call the nonAncestorFolderToggled method which does the same
            var state = this._expandStates[rowInfo.dataIndex];
            // expandNode and collapsNode will set state to -state, therefore if expandNode executed then it means state > 0, else collapseNode got executed
            if (state < 0) {
                super.nonAncestorFolderToggled(rowInfo, currSelectedDataIndex);
            }
        } else {
            super.nonAncestorFolderToggled(rowInfo, currSelectedDataIndex);
        }
    }

    public ancestorFolderToggled(rowInfo) {
        if (AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
            // if we call expandNode (state < 0) then we already refresh the right-side view, so we don't call the ancestorFolderToggled method which does the same
            var state = this._expandStates[rowInfo.dataIndex];
            // expandNode and collapsNode will set state to -state, therefore if expandNode executed then it means state > 0, else collapseNode got executed
            if (state < 0) {
                super.ancestorFolderToggled(rowInfo);
            }
        } else {
            super.ancestorFolderToggled(rowInfo);
        }
    }

    public cacheRows(aboveRange: any, visibleRange: any, belowRange: any) {
        // If nodes have more, do not allow paging
        if (this._options.canPage) {
            super.cacheRows(aboveRange, visibleRange, belowRange);
        }
    }

    public getCurrentIdentity(): IIdentity {
        var selectedRowIndex: number = this.getSelectedDataIndex();

        // see if something is selected and if so, then return it
        if (selectedRowIndex > -1 && selectedRowIndex < this._dataSource.length) {
            return this._dataSource[selectedRowIndex][0];
        } else {
            return null;
        }
    }

    public setRefreshMembers(value: boolean) {
        this._refreshMembers = value;
    }

    public selectedIndexChanged(selectedRowIndex: number, selectedDataIndex: number) {
        if (selectedRowIndex > -1 && this._dataSource.length > selectedDataIndex) {
            if (!AdminUIHelper.isAdminUiFeatureFlagEnabled() || this._refreshMembers) { // the callbacks after adding new members will refresh the members grid, so we avoid an extra call
                this._fire('identitySelected', this._dataSource[selectedDataIndex][0]);
                Diag.logTracePoint('IdentityGrid.SelectedIndexChanged');
            } else {
                this._refreshMembers = true;
            }
        }
        else {
            // Call fetch with empty tfid to increment requestId.  This is useful
            // when handlers of fetchIdentity look at requestId to draw identity info.
            this._fire('identitySelected', null);
        }
    }

    public _createIdentityCell(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number): JQuery {
        var cell: any, identity: any;

        identity = this._dataSource[dataIndex][0];

        if (identity.TeamFoundationId) {
            if (this._dataSource[dataIndex].isNode) {
                // For team context, draw current team as normal node (no picture).
                return this._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
            }
            else {
                return super._createIdentityCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
            }
        }
        else {
            cell = this._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
            if (this._dataSource[dataIndex].isEmpty) {
                cell.addClass('empty-cell');
            }
            return cell;
        }
    }

    private _populateSourceForTeams() {
        var i: number,
            counter: number,
            identity: IIdentity,
            expandStates: number[] = [],
            source: any[] = [],
            loadingCell: any,
            identityCell: any,
            noMembersCell: any,
            node: any;

        if (!AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
            if (this._options.source.length > 0) {
                // First identity is team node
                identity = this._options.source[0][0];
                node = [identity];
                node.isNode = true;

                if (this.hasMore && this._options.source.length === 1) {
                    // Team node may have more items (i.e. expanded membership contains many identities)
                    expandStates[source.length] = -1;
                    node.hasMore = true;
                    node.actionUrl = this._options.tfsContext.getActionUrl('ReadScopedTeamJson', 'identity', { area: 'api' });
                    node.actionParams = { force: true };
                    source.push(node);

                    // Append loading row
                    expandStates[source.length] = 0;
                    loadingCell = [adminResources.LoadingInProgress];
                    loadingCell.isEmpty = true;
                    source.push(loadingCell);

                    // Disable paging
                    this._options.canPage = false;
                }
                else {
                    // Team node has all of its identities
                    source.push(node);

                    if (this._options.source.length > 1) {
                        expandStates[0] = this._options.source.length - 1;
                        for (i = 1; i < this._options.source.length; i++) {
                            identity = this._options.source[i][0];
                            source.push([identity]);
                        }
                    }
                    else {
                        // Team has no identities
                        expandStates[0] = 1;
                        expandStates[1] = 0;
                        noMembersCell = [adminResources.NoMembers];
                        noMembersCell.isEmpty = true;
                        source.push(noMembersCell);
                    }

                    // Enable paging
                    this._options.canPage = true;
                }
            }

            this._options.source = source;
            this._options.expandStates = expandStates;
        } else {
            if (!this.treeStructure) {
                this._populateTreeFromSourceForTeams();
            } else {
                this._insertNewNodesInTheTree()
            }
        }
    }

    private _populateSourceWithBuckets() {
        var i: number,
            counter: number,
            identity: IIdentity,
            expandStates: number[] = [],
            source: any[] = [],
            filledBucketCount: number = 0,
            bucketName: string,
            bucket: any,
            buckets: any,
            bucketCell: any,
            identityCell: any,
            loadingCell: any;

        if (!AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
            buckets = {
                tfsTeams: {
                    name: adminResources.Teams,
                    items: []
                },
                tfsGroups: {
                    name: tfsContext.isHosted ? adminResources.TfsGroupsHosted : adminResources.TfsGroups,
                    items: []
                },
                AadGroups: {
                    name: adminResources.AzureActiveDirectoryGroups,
                    items: []
                },
                windowsGroups: {
                    name: adminResources.WindowsGroups,
                    items: [],
                    hasMore: this._options.delayWindowsGroups && !this._options.isSearching && this.hasMore,
                    actionUrl: this._options.tfsContext.getActionUrl('ReadIdentitiesPageJson', 'identity', { area: 'api' }),
                    actionParams: { membershipType: 'windowsGroups' }
                },
                users: {
                    name: adminResources.Users,
                    items: [],
                    hasMore: this._options.delayUsers && !this._options.isSearching && this.hasMore,
                    actionUrl: this._options.tfsContext.getActionUrl('ReadIdentitiesPageJson', 'identity', { area: 'api' }),
                    actionParams: { membershipType: 'users' }
                }
            };

            for (i = 0; i < this._options.source.length; i++) {
                identity = this._options.source[i][0];
                if (identity.IdentityType === 'user') {
                    buckets.users.items.push([identity]);
                    buckets.users.hasMore = false;
                }
                else if (identity.IsWindowsGroup) {
                    buckets.windowsGroups.items.push([identity]);
                    buckets.windowsGroups.hasMore = false;
                }
                else if (identity.IdentityType === 'team') {
                    buckets.tfsTeams.items.push([identity]);
                }
                else {
                    if (identity.IsAadGroup) {
                        buckets.AadGroups.items.push([identity]);
                    }
                    else {
                        buckets.tfsGroups.items.push([identity]);
                    }
                }
            }

            this._options.canPage = this._options.delayWindowsGroups || this._options.delayUsers;

            for (bucketName in buckets) {
                if (buckets.hasOwnProperty(bucketName)) {
                    bucket = buckets[bucketName];
                    if (bucket.hasMore) {
                        // Increment past 1 to always show bucket
                        filledBucketCount += 2;

                        expandStates[source.length] = -1;
                        bucketCell = [bucket.name];
                        bucketCell.hasMore = true;
                        bucketCell.actionUrl = bucket.actionUrl;
                        bucketCell.actionParams = bucket.actionParams;
                        source.push(bucketCell);

                        expandStates[source.length] = 0;
                        loadingCell = [adminResources.LoadingInProgress];
                        loadingCell.isEmpty = true;
                        source.push(loadingCell);

                        this._options.canPage = false;
                    }
                    else {
                        if (bucket.items.length) {
                            filledBucketCount++;
                            expandStates[source.length] = bucket.items.length;
                            bucket.items.unshift([bucket.name]);
                            source = source.concat(bucket.items);
                        }
                    }
                }
            }

            // Hide buckets if only one is filled
            if (filledBucketCount === 1) {
                source.shift();
                expandStates = null;
            }

            this._options.source = source;
            this._options.expandStates = expandStates;
        } else {
            if (!this.treeStructure) {
                this._populateTreeFromSource();
            } else {
                this._insertNewNodesInTheTree();
            }
        }
    }

    private _populateTreeFromSourceForTeams() {
        var identity: IIdentity,
            expandStates: number[] = [],
            source: any[] = [],
            loadingCell: any,
            node: any;
        // we are in the first level
        if (this._options.source.length > 0) {
            identity = this._options.source[0][0];
            node = [identity];
            if (!identity.IsAadGroup && !identity.IsWindowsGroup && identity.IdentityType.toLowerCase() != 'user') {
                node.hasMore = true;
                node.actionUrl = this._options.tfsContext.getActionUrl('ReadGroupMembers', 'identity', { area: 'api' });
                node.actionParams = $.extend({ scope: identity.TeamFoundationId, membershipType: 'groups', readMembers: true }, AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {});
                expandStates[0] = -1;
                source.push(node);

                loadingCell = [adminResources.LoadingInProgress];
                loadingCell.isEmpty = true;
                source.push(loadingCell);
                expandStates[1] = 0;
            } else {
                source.push(node);
            }

            this._options.canPage = false;
        }

        this._options.source = source;
        this.treeStructure = source;
        this._options.expandStates = expandStates;
    }

    private _populateTreeFromSource() {
        var i: number,
            counter: number,
            identity: IIdentity,
            expandStates: number[] = [],
            source: any[] = [],
            bucketName: string,
            bucket: any,
            buckets: any,
            identityCell: any,
            loadingCell: any;
        // we are in the first level, showing only teams and VSO/TFS groups
        buckets = {
            tfsTeams: {
                name: adminResources.Teams,
                items: []
            },
            tfsGroups: {
                name: tfsContext.isHosted ? adminResources.TfsGroupsHosted : adminResources.TfsGroups,
                items: []
            }
        };

        var identityBucket: any[] = [];

        for (i = 0; i < this._options.source.length; i++) {
            identity = this._options.source[i][0];
            //if VSTS group
            if (!identity.IsAadGroup && !identity.IsWindowsGroup && identity.IdentityType.toLowerCase() != AdminUIHelper.USER_ENTITY_TYPE_KEY) {
                identityCell = [identity];
                identityCell.hasMore = true;
                identityCell.actionUrl = this._options.tfsContext.getActionUrl('ReadGroupMembers', 'identity', { area: 'api' });
                identityCell.actionParams = $.extend({ scope: identity.TeamFoundationId, membershipType: 'groups', readMembers: true }, AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {});
                loadingCell = [adminResources.LoadingInProgress];
                loadingCell.isEmpty = true;
                if (identity.IdentityType.toLowerCase() == AdminUIHelper.TEAM_ENTITY_TYPE_KEY) {
                    buckets.tfsTeams.items.push(identityCell);
                    buckets.tfsTeams.items.push(loadingCell);
                } else {
                    buckets.tfsGroups.items.push(identityCell);
                    buckets.tfsGroups.items.push(loadingCell);
                }
            } else {
                //no-op on click (leaf)
                identityBucket.push([identity]);
            }
        }

        for (bucketName in buckets) {
            if (buckets.hasOwnProperty(bucketName)) {
                bucket = buckets[bucketName];
                if (bucket.items.length) {
                    if (this.showBuckets) {
                        expandStates[source.length] = bucket.items.length;
                        bucket.items.unshift([bucket.name]);
                        counter = source.length + 1;
                    } else {
                        counter = source.length;
                    }
                    source = source.concat(bucket.items);
                    // set expanded states for groups
                    while (counter < source.length) {
                        expandStates[counter++] = -1;
                        expandStates[counter++] = 0;
                    }
                }
            }
        }

        // if no groups and only identities, we just did a search and have to update the view
        if (!source.length && identityBucket.length) {
            source = identityBucket;
        }

        this._options.source = source;
        this.treeStructure = source;
        this._options.expandStates = expandStates;
    }

    private _insertNewNodesInTheTree() {
        var i: number,
            counter: number,
            identity: IIdentity,
            expandStates: number[] = [],
            identityCell: any,
            loadingCell: any;
        // we just expanded one node and have to add the items to the tree
        this.treeStructure.splice(this._treeIndex + 1, 1); // removing the empty Loading cell
        counter = this._treeIndex + 1;
        // insert the elements in the tree
        for (i = 0; i < this._newTreeNodes.length; i++) {
            identity = this._newTreeNodes[i][0];
            identityCell = [identity];
            if (!identity.IsAadGroup && !identity.IsWindowsGroup && identity.IdentityType.toLowerCase() != 'user') {
                identityCell.hasMore = true;
                identityCell.actionUrl = this._options.tfsContext.getActionUrl('ReadGroupMembers', 'identity', { area: 'api' });
                identityCell.actionParams = $.extend({ scope: identity.TeamFoundationId, membershipType: 'groups', readMembers: true }, AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {});
                expandStates[counter] = -1;
                this.treeStructure.splice(counter++, 0, identityCell);
                loadingCell = [adminResources.LoadingInProgress];
                loadingCell.isEmpty = true;
                expandStates[counter] = 0;
                this.treeStructure.splice(counter++, 0, loadingCell);
            } else {
                this.treeStructure.splice(counter++, 0, identityCell);
            }
        }

        expandStates[this._treeIndex] = counter - this._treeIndex - 1;
        // shift expanded states
        for (var key in this._options.expandStates) {
            i = Number(key);
            if (i > this._treeIndex + 1) {
                expandStates[i + counter - this._treeIndex - 2] = this._options.expandStates[i];
            } else if (i < this._treeIndex) {
                if (this._options.expandStates[i] + i >= this._treeIndex) {
                    expandStates[i] = this._options.expandStates[i] + counter - this._treeIndex - 2;
                } else {
                    expandStates[i] = this._options.expandStates[i];
                }
            }
        }

        this._options.source = this.treeStructure;
        this._options.expandStates = expandStates;
    }

    public _onKeyDown(e?: JQueryKeyEventObject): any {
        let selectedDataIndex = this.getSelectedDataIndex();
        if (AdminUIHelper.isAdminUiFeatureFlagEnabled()
            && e.keyCode == Utils_UI.KeyCode.RIGHT
            && !this._dataSource[selectedDataIndex].hasMore
            && this._expandStates[selectedDataIndex] > 0) {

            this.setSelectedRowIndex(++this._selectedIndex);
            return false;
        }

        super._onKeyDown(e);
    }
}

VSS.classExtend(MainIdentityGrid, TfsContext.ControlExtensions);



export class IdentityListControl extends Controls.BaseControl {

    public static _controlType: string = "tfs.admin.identityListControl";

    private _membersList: JQuery;

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            allowRemove: true
        }, options));
    }

    public initialize() {
        super.initialize();
        this._membersList = $(domElem('div')).attr('id', 'members-list').appendTo(this._element);
    }

    public addIdentity(displayName: string, resolvedName: string, tfid: string, title: string, hide: boolean) {
        var newUserDiv: JQuery,
            newUserSpan: JQuery;

        if (tfid) {
            newUserDiv = $(domElem('div'))
                .addClass('resolved-member existing-user');

            newUserSpan = $(domElem('span'))
                .appendTo(newUserDiv)
                .addClass('resolved-member-name')
                .text(displayName);

            this._drawRemoveElement(newUserDiv, tfid);

            $('<input type="hidden" />')
                .appendTo(newUserDiv)
                .addClass('tfid')
                .val(tfid);
        }
        else {
            newUserDiv = $(domElem('div'))
                .addClass('resolved-member new-user');

            newUserSpan = $(domElem('span'))
                .appendTo(newUserDiv)
                .addClass('resolved-member-name')
                .text(displayName);

            this._drawRemoveElement(newUserDiv, resolvedName);

            $('<input type="hidden" />')
                .appendTo(newUserDiv)
                .addClass('username')
                .val(resolvedName);
        }

        if (hide) {
            newUserDiv.hide();
        }

        // Append resolved identity
        this._membersList.append(newUserDiv);

        this._fire('identityListChanged');
    }

    public hideRemoveElement() {

    }

    public clear() {
        var i: number,
            tfidsToRemove: string[] = this.getTfids();

        for (i = 0; i < tfidsToRemove.length; i++) {
            this.removeIdentity(tfidsToRemove[i]);
        }
        this.quickClear();
    }

    public quickClear() {
        this._membersList.empty();
    }

    public getTfids(): string[] {
        var tfids: string[] = [];
        $('input.tfid', this._membersList).each(function () {
            tfids.push($(this).val());
        });
        return tfids;
    }

    public _onItemRemoved(event: Event): boolean {
        var parent: JQuery,
            tfid: string,
            name: string,
            callbackResult: boolean;

        parent = $(event.target).closest('.resolved-member');
        tfid = parent.find('input.tfid').val();
        name = parent.find('.resolved-member-name').text();
        if ($.isFunction(this._options.beforeRemove)) {
            callbackResult = this._options.beforeRemove.call(this, {
                tfid: tfid,
                name: name
            });
            if (callbackResult === false) {
                return;
            }
        }
        this._removeIdentity(parent);
        return false;
    }

    public removeIdentity(tfid: string) {
        var parent: JQuery = this._membersList.find('input[value="' + tfid + '"]').closest('.resolved-member');
        if (parent.length) {
            this._removeIdentity(parent);
        }
    }

    public getDisplayNames(): string[] {
        var displayNames: string[] = [];
        this._membersList.find('.resolved-member-name').each(function () {
            displayNames.push($(this).text());
        });
        return displayNames;
    }

    public getPendingChanges(includeExistingUserNames?: boolean): IdentityListValues {
        /// <param name="includeExistingUserNames" type="boolean" optional="true" />

        var newUsersToAdd: string[] = [],
            existingUsersToAdd: any[] = [];

        $('input.username', this._membersList).each(function () {
            newUsersToAdd.push(this.value);
        });

        $('input.tfid', this._membersList).each(function (index, domElem) {
            if ($(this).closest('.existing-user').length > 0) {
                if (includeExistingUserNames) {
                    var user = { tfid: this.value, name: $(domElem).closest('.existing-user').find('.resolved-member-name').text() };
                    existingUsersToAdd.push(user);
                } else {
                    existingUsersToAdd.push(this.value);
                }
            }
        });

        return {
            newUsers: newUsersToAdd,
            existingUsers: existingUsersToAdd,
            unresolvedEntityIds: []
        };
    }

    public _drawRemoveElement(elem: JQuery, id: string) {
        var $deleteIcon = $('<div>')
            .appendTo(elem)
            .addClass('icon icon-delete remove-action')
            .attr({ 'id': id, 'role': 'button', 'aria-label': adminResources.AdminDialogRemoveMember })
            .click(delegate(this, this._onItemRemoved));

        Utils_UI.accessible($deleteIcon);
    }

    private _removeIdentity(parent: JQuery) {
        var displayName, value = parent.find('input.tfid').val();
        if (value) {
            displayName = parent.find('.resolved-member-name').text();
        }
        else {
            displayName = parent.find('input.username').val();
        }
        parent.remove();
        this._element.trigger('identityListChanged', { name: displayName, tfid: value });
    }
}

VSS.initClassPrototype(IdentityListControl, {
    _membersList: null
});



export class CheckedIdentityGrid extends TFS_Grids.CheckboxSelectionGridO<any> {

    public static enhancementTypeName: string = "tfs.admin.checkedidentitygrid";

    private _pendingAdds: string[];
    private _pendingDeletes: string[];
    private _originalDataIntitialized: boolean;
    private _originalData: any; //Need to refactor how data stored to change from 'any'
    private _identityInfoMap: any; //Need to refactor how data stored to change from 'any'

    public currentCheckedItem: any; //Need to refactor how data stored to change from 'any'
    public multiSelect: boolean;
    public hasMore: boolean;
    public existingGroups: any; //Need to refactor how data stored to change from 'any'
    public host: JQuery;

    constructor(options?) {
        super(options);

        this.existingGroups = options.existingGroups || [];
        this.host = options.host;
        this.currentCheckedItem = undefined;

        if (options.multiSelect === undefined || options.multiSelect) {
            this.multiSelect = true;
        } else {
            this.multiSelect = false;
        }
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            // super.allowMultiSelect: false - pertains to grid rows.  this.multiSelect: true - pertains to the checkboxes.
            allowMultiSelect: false,
            gutter: false,
            sharedMeasurements: false,
            columns: [
                {
                    text: adminResources.DisplayName,
                    width: 250
                },
                {
                    text: adminResources.UserName,
                    width: 150
                }
            ]
        }, options));
    }

    public initialize() {
        var self = this;
        super.initialize();

        //initialize member variables
        this._pendingAdds = [];
        this._pendingDeletes = [];
        this._originalDataIntitialized = false;
        this._originalData = [];
        this._identityInfoMap = [];
        this.host = this._options.host;
        this.existingGroups = this._options.existingGroups || [];
        this.hasMore = false;

        this._options.waitObject = {
            image: hostConfig.getResourcesFile('big-progress.gif'),
            message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
            target: this._options.host
        };

        if (this._options.gridItems) {
            self.setInitialGridItems(self._options.gridItems);
            self._element.trigger('initialized');
            Diag.logTracePoint('CheckedIdentityGrid.initialize.complete');
        }
        else {
            TFS_Core_Ajax.getMSJSON(
                this._options.identityListAction,
                this._options.searchParams,
                function (data) {
                    self.hasMore = data.hasMore;
                    self.setInitialGridItems(data.identities);
                    self._element.trigger('initialized');
                },
                null,
                {
                    tracePoint: 'CheckedIdentityGrid.initialize.complete',
                    wait: this._options.waitObject
                }
            );
        }
    }

    public setInitialGridItems(gridItems?) {
        var i: number,
            identity: any,
            existingChecked: boolean,
            checkedItems: any[] = [],
            result: any[] = [],
            id: number = 0;

        if (!gridItems) {
            gridItems = $.map(this._dataSource, function (item) {
                return {
                    FriendlyDisplayName: item[1],
                    TeamFoundationId: item[3],
                    SubHeader: item[2]
                };
            });
        }
        for (i = 0; i < gridItems.length; i++) {
            identity = gridItems[i];

            if (this._options.omitWindowsGroups && identity.IsWindowsGroup) {
                continue;
            }

            existingChecked = Utils_Array.contains(this.existingGroups, identity.TeamFoundationId);
            if (existingChecked) {
                checkedItems.push(id);
            }
            result.push({
                id: id++,
                values: [identity.FriendlyDisplayName, identity.SubHeader, identity.TeamFoundationId, existingChecked]
            });
        }
        this.setGridItems(result, checkedItems);

        if (!this._originalDataIntitialized) {
            this._originalData = this._dataSource;
            this._originalDataIntitialized = true;
        }
    }

    public setGridItems(gridItems: any[], checkedItemIds: any[]) {
        super.setGridItems(gridItems, checkedItemIds);

        // Maintain selected index when setting items
        this.setSelectedRowIndex(this.getSelectedRowIndex());
    }

    public addToGridItems(gridItems: any[]) {
        var i: number,
            identity: any,
            existingChecked: any,
            checkedItems: any[] = [],
            result: any[] = [],
            offset: number = this._dataSource.length,
            values: any;

        for (i = 0; i < this._dataSource.length; i++) {
            values = this._dataSource[i];
            if (values[0]) {
                checkedItems.push(i);
            }
            values.splice(0, 1);
            result.push({
                id: i,
                values: values
            });
        }

        for (i = 0; i < gridItems.length; i++) {
            identity = gridItems[i];

            if (this._options.omitWindowsGroups && identity.IsWindowsGroup) {
                continue;
            }

            existingChecked = Utils_Array.contains(this.existingGroups, identity.TeamFoundationId);
            if (existingChecked) {
                checkedItems.push(offset + i);
            }
            result.push({
                id: offset + i,
                values: [identity.FriendlyDisplayName, identity.SubHeader, identity.TeamFoundationId, existingChecked]
            });
        }
        this.setGridItems(result, checkedItems);
        this._originalData = this._dataSource;
    }

    public fullSearch(identities: any[]) {
        var i: number,
            identity: any,
            existingChecked: any,
            result: any[] = [],
            checkedItems: any[] = [];

        for (i = 0; i < identities.length; i++) {
            identity = identities[i];
            // Bring in new search results.  Need to determine (1) existingChecked and (2) currentChecked
            existingChecked = Utils_Array.contains(this.existingGroups, identity.TeamFoundationId);
            if (existingChecked && !Utils_Array.contains(this._pendingDeletes, identity.TeamFoundationId)) {
                // Check item if it was originally checked and does not have a pending delete
                checkedItems.push(i);
            }
            else if (Utils_Array.contains(this._pendingAdds, identity.TeamFoundationId)) {
                // Check item if it was not originally checked but has a pending add
                checkedItems.push(i);
            }
            result.push({
                id: i,
                values: [identity.FriendlyDisplayName, identity.SubHeader, identity.TeamFoundationId, existingChecked]
            });
        }
        this.setGridItems(result, checkedItems);
    }

    public localSearch(searchQuery: string) {
        var i: number,
            identityRow: any,
            results: any[] = [],
            checkedItems: any[] = [],
            data: any;

        // Filter list.  We already know existingChecked and currentChecked
        data = $(this._originalData);
        for (i = 0; i < data.length; i++) {
            identityRow = data[i];
            // Perform case-insensitive search for searchQuery on column 1 and 2 (joined by \n)
            if (identityRow.slice(1, 3).join('\n').toLocaleLowerCase().indexOf(searchQuery.toLocaleLowerCase()) > -1) {
                results.push({
                    id: identityRow[-1],
                    values: identityRow.slice(1)
                });
                if (identityRow[0]) {
                    checkedItems.push(identityRow[-1]);
                }
            }
        }
        this.setGridItems(results, checkedItems);
    }

    public cancelSearch() {
        var i: number,
            identityRow: any,
            existingChecked: any,
            results: any[] = [],
            checkedItems: any[] = [],
            data: JQuery;

        data = $(this._originalData);
        for (i = 0; i < data.length; i++) {
            identityRow = data[i];
            results.push({
                id: identityRow[-1],
                values: identityRow.slice(1)
            });
            if (this.hasMore) {
                existingChecked = identityRow[4];
                if (existingChecked && !Utils_Array.contains(this._pendingDeletes, identityRow[3])) {
                    // Check item if it was originally checked and does not have a pending delete
                    checkedItems.push(i);
                }
                else if (Utils_Array.contains(this._pendingAdds, identityRow[3])) {
                    // Check item if it was not originally checked but has a pending add
                    checkedItems.push(i);
                }
            }
            else {
                if (identityRow[0]) {
                    checkedItems.push(identityRow[-1]);
                }
            }
        }
        this.setGridItems(results, checkedItems);
    }

    public cacheRows(aboveRange: any, visibleRange: any, belowRange: any) {
        if (this.hasMore && belowRange.length === 0 && !this._options.isSearching) {
            var self = this,
                lastName: string;

            lastName = this._dataSource[this._dataSource.length - 1][1];
            this.hasMore = false; // set this to prevent duplicate gets
            this._options.searchControl.disable();
            TFS_Core_Ajax.getMSJSON(
                this._options.identityListAction,
                $.extend({ lastSearchResult: lastName }, this._options.searchParams),
                function (data) {
                    self.addToGridItems(data.identities);
                    self.hasMore = data.hasMore;
                    self._options.searchControl.enable();
                },
                null,
                {
                    wait: this._options.waitObject
                }
            );
        }
    }

    public setCheckboxState(dataIndex: number, checked: boolean) {

        var foundCheckedItem = false, i: number;

        // If multiselect is false then only one item should be selected at a time.
        if (!this.multiSelect) {
            // TODO: this doesn't work if the grid is prepopulated with checked item(s)
            if (this.currentCheckedItem && this._dataSource[dataIndex] !== this.currentCheckedItem) {
                // Uncheck all other checkboxes
                // Do not enter here if no items are checked, or if unchecking checked item
                this._pendingAdds = [];

                //if there is currently an item checked, then uncheck that item
                for (i = 0; i < this._dataSource.length; i++) {
                    if (this.currentCheckedItem[-1] === this._dataSource[i][-1] && i !== dataIndex) {
                        super.setCheckboxState(i, false);
                        foundCheckedItem = true;
                        break;
                    }
                }

                // If we have not found a match in current data set and all
                // identites are read in, then uncheck the currently checked item
                // in the original data set.  This happens when an item is checked, then
                // someone performs a search that does not contain the checked item and then
                // you check an item in the search list
                if (!foundCheckedItem && !this.hasMore) {
                    this._originalData[this.currentCheckedItem[-1]][0] = false;

                }
            }

            if (checked) {
                this.currentCheckedItem = this._dataSource[dataIndex];
            } else {
                this.currentCheckedItem = undefined;
            }
        }

        // Remember the new state of this cell
        super.setCheckboxState(dataIndex, checked);


        // Don't return anything to allow the default action for the event execute
    }

    public _drawHeaderCellValue(column: any): JQuery {

        if (column.index !== TFS_Grid_Adapters.ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX) {
            return super._drawHeaderCellValue(column);
        }
        else {
            return $("<div/>").addClass("title");
        }
    }

    public _setCheckboxStateData(dataIndex: number, state) {
        var identityRow: any,
            tfid: string,
            existingChecked: any,
            currentChecked: any,
            index: number;

        super._setCheckboxStateData(dataIndex, state);

        identityRow = this._dataSource[dataIndex];

        if (!this.hasMore) {
            // Set state of originalData
            this._originalData[identityRow[-1]][0] = state;
        }

        existingChecked = identityRow[4];
        currentChecked = identityRow[0];
        tfid = identityRow[3];

        if (!this._identityInfoMap[tfid]) {
            this._identityInfoMap[tfid] = identityRow[1];
        }

        if (currentChecked && !existingChecked) {
            // Started unchecked, now checked: add to pendingAdds
            this._pendingAdds.push(tfid);
        }
        else if (!currentChecked && existingChecked) {
            // Started checked, now unchecked: add to pendingDeletes
            this._pendingDeletes.push(tfid);
        }
        else if (currentChecked && existingChecked) {
            // Started checked, was unchecked, now checked: remove from pendingDeletes
            index = $.inArray(tfid, this._pendingDeletes);
            if (index > -1) {
                this._pendingDeletes.splice(index, 1);
            }
        }
        else if (!currentChecked && !existingChecked) {
            // Started unchecked, was checked, now unchecked: remove from pendingAdds
            index = $.inArray(tfid, this._pendingAdds);
            if (index > -1) {
                this._pendingAdds.splice(index, 1);
            }
        }

        // Redraw row to update pending column
        this.updateRow(dataIndex);

        this._fire('checkedStateChanged', {
            tfid: tfid,
            name: identityRow[1],
            state: currentChecked
        });

        this._fire('pendingChanged', {
            pendingAdds: this._pendingAdds,
            pendingDeletes: this._pendingDeletes,
            totalCheckedCount: this.existingGroups.length - this._pendingDeletes.length + this._pendingAdds.length
        });
    }
}

VSS.initClassPrototype(CheckedIdentityGrid, {
    currentCheckedItem: null,
    multiSelect: false,
    hasMore: null,
    existingGroups: null,
    host: null,
    _pendingAdds: null,
    _pendingDeletes: null,
    _originalData: null,
    _identityInfoMap: null
});

export class CheckedAadGroupsIdentityGrid extends TFS_Grids.CheckboxSelectionGridO<any> {

    public static enhancementTypeName: string = "tfs.admin.CheckedAadGroupsIdentityGrid";

    private _pendingAdds: string[];
    private _pendingDeletes: string[];
    private _originalDataIntitialized: boolean;
    private _originalData: any; //Need to refactor how data stored to change from 'any'
    private _identityInfoMap: any; //Need to refactor how data stored to change from 'any'

    public currentCheckedItem: any; //Need to refactor how data stored to change from 'any'
    public multiSelect: boolean;
    public hasMore: boolean;
    public lastCacheResultToken: string;
    public existingGroups: any; //Need to refactor how data stored to change from 'any'
    public host: JQuery;

    constructor(options?) {
        super(options);

        this.existingGroups = options.existingGroups || [];
        this.host = options.host;
        this.currentCheckedItem = undefined;

        if (options.multiSelect === undefined || options.multiSelect) {
            this.multiSelect = true;
        } else {
            this.multiSelect = false;
        }
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            // super.allowMultiSelect: false - pertains to grid rows.  this.multiSelect: true - pertains to the checkboxes.
            allowMultiSelect: false,
            gutter: false,
            sharedMeasurements: false,
            columns: [
                {
                    text: adminResources.DisplayName,
                    width: 250
                },
                {
                    text: adminResources.AADName,
                    width: 150
                }
            ]
        }, options));
    }

    public initialize() {
        var self = this;
        super.initialize();

        //initialize member variables
        this._pendingAdds = [];
        this._pendingDeletes = [];
        this._originalDataIntitialized = false;
        this._originalData = [];
        this._identityInfoMap = [];
        this.host = this._options.host;
        this.existingGroups = this._options.existingGroups || [];
        this.hasMore = false;

        this._options.waitObject = {
            image: hostConfig.getResourcesFile('big-progress.gif'),
            message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
            target: this._options.host
        };

        TFS_Core_Ajax.getMSJSON(
            this._options.identityListAction,
            this._options.searchParams,
            function (data) {
                self.hasMore = data.hasMore;
                self.lastCacheResultToken = null;
                if (self.hasMore) {
                    self.lastCacheResultToken = data.searchResultToken;
                }

                self.setInitialGridItems(data.identities);
                self._element.trigger('initialized');
            },
            null,
            {
                tracePoint: 'CheckedAadGroupsIdentityGrid.initialize.complete',
                wait: this._options.waitObject
            }
        );
    }

    public setInitialGridItems(gridItems?) {
        var i: number,
            identity: any,
            existingChecked: boolean,
            checkedItems: any[] = [],
            result: any[] = [],
            id: number = 0;

        if (!gridItems) {
            gridItems = $.map(this._dataSource, function (item) {
                return {
                    FriendlyDisplayName: item[1],
                    TeamFoundationId: item[3],
                    SubHeader: item[2]
                };
            });
        }
        for (i = 0; i < gridItems.length; i++) {
            identity = gridItems[i];

            if (this._options.omitWindowsGroups && identity.IsWindowsGroup) {
                continue;
            }

            existingChecked = Utils_Array.contains(this.existingGroups, identity.TeamFoundationId);
            if (existingChecked) {
                checkedItems.push(id);
            }
            result.push({
                id: id++,
                values: [identity.FriendlyDisplayName, identity.SubHeader, identity.TeamFoundationId, existingChecked]
            });
        }
        this.setGridItems(result, checkedItems);

        if (!this._originalDataIntitialized) {
            this._originalData = this._dataSource;
            this._originalDataIntitialized = true;
        }
    }

    public setGridItems(gridItems: any[], checkedItemIds: any[]) {
        super.setGridItems(gridItems, checkedItemIds);

        // Maintain selected index when setting items
        this.setSelectedRowIndex(this.getSelectedRowIndex());
    }

    public addToGridItems(gridItems: any[]) {
        var i: number,
            identity: any,
            existingChecked: any,
            checkedItems: any[] = [],
            result: any[] = [],
            offset: number = this._dataSource.length,
            values: any;

        for (i = 0; i < this._dataSource.length; i++) {
            values = this._dataSource[i];
            if (values[0]) {
                checkedItems.push(i);
            }
            values.splice(0, 1);
            result.push({
                id: i,
                values: values
            });
        }

        for (i = 0; i < gridItems.length; i++) {
            identity = gridItems[i];

            if (this._options.omitWindowsGroups && identity.IsWindowsGroup) {
                continue;
            }

            existingChecked = Utils_Array.contains(this.existingGroups, identity.TeamFoundationId);
            if (existingChecked) {
                checkedItems.push(offset + i);
            }
            result.push({
                id: offset + i,
                values: [identity.FriendlyDisplayName, identity.SubHeader, identity.TeamFoundationId, existingChecked]
            });
        }
        this.setGridItems(result, checkedItems);
        this._originalData = this._dataSource;
    }

    public fullSearch(identities: any[]) {
        var i: number,
            identity: any,
            existingChecked: any,
            result: any[] = [],
            checkedItems: any[] = [];

        for (i = 0; i < identities.length; i++) {
            identity = identities[i];
            // Bring in new search results.  Need to determine (1) existingChecked and (2) currentChecked
            existingChecked = Utils_Array.contains(this.existingGroups, identity.TeamFoundationId);
            if (existingChecked && !Utils_Array.contains(this._pendingDeletes, identity.TeamFoundationId)) {
                // Check item if it was originally checked and does not have a pending delete
                checkedItems.push(i);
            }
            else if (Utils_Array.contains(this._pendingAdds, identity.TeamFoundationId)) {
                // Check item if it was not originally checked but has a pending add
                checkedItems.push(i);
            }
            result.push({
                id: i,
                values: [identity.FriendlyDisplayName, identity.SubHeader, identity.TeamFoundationId, existingChecked]
            });
        }
        this.setGridItems(result, checkedItems);
    }

    public localSearch(searchQuery: string) {
        var i: number,
            identityRow: any,
            results: any[] = [],
            checkedItems: any[] = [],
            data: any;

        // Filter list.  We already know existingChecked and currentChecked
        data = $(this._originalData);
        for (i = 0; i < data.length; i++) {
            identityRow = data[i];
            // Perform case-insensitive search for searchQuery on column 1 and 2 (joined by \n)
            if (identityRow.slice(1, 3).join('\n').toLocaleLowerCase().indexOf(searchQuery.toLocaleLowerCase()) > -1) {
                results.push({
                    id: identityRow[-1],
                    values: identityRow.slice(1)
                });
                if (identityRow[0]) {
                    checkedItems.push(identityRow[-1]);
                }
            }
        }
        this.setGridItems(results, checkedItems);
    }

    public cancelSearch() {
        var i: number,
            identityRow: any,
            existingChecked: any,
            results: any[] = [],
            checkedItems: any[] = [],
            data: JQuery;

        data = $(this._originalData);
        for (i = 0; i < data.length; i++) {
            identityRow = data[i];
            results.push({
                id: identityRow[-1],
                values: identityRow.slice(1)
            });
            if (this.hasMore) {
                existingChecked = identityRow[4];
                if (existingChecked && !Utils_Array.contains(this._pendingDeletes, identityRow[3])) {
                    // Check item if it was originally checked and does not have a pending delete
                    checkedItems.push(i);
                }
                else if (Utils_Array.contains(this._pendingAdds, identityRow[3])) {
                    // Check item if it was not originally checked but has a pending add
                    checkedItems.push(i);
                }
            }
            else {
                if (identityRow[0]) {
                    checkedItems.push(identityRow[-1]);
                }
            }
        }
        this.setGridItems(results, checkedItems);
    }

    public cacheRows(aboveRange: any, visibleRange: any, belowRange: any) {
        if (this.hasMore && belowRange.length === 0 && !this._options.isSearching) {
            var self = this;
            this.hasMore = false; // set this to prevent duplicate gets
            this._options.searchControl.disable();
            TFS_Core_Ajax.getMSJSON(
                this._options.identityListAction,
                $.extend({ searchResultToken: this.lastCacheResultToken }, this._options.searchParams),
                function (data) {
                    self.lastCacheResultToken = null;
                    self.addToGridItems(data.identities);
                    self.hasMore = data.hasMore;
                    if (self.hasMore) {
                        self.lastCacheResultToken = data.searchResultToken;
                    }

                    self._options.searchControl.enable();
                },
                null,
                {
                    wait: this._options.waitObject
                }
            );
        }
    }

    public setCheckboxState(dataIndex: number, checked: boolean) {

        var foundCheckedItem = false, i: number;

        // If multiselect is false then only one item should be selected at a time.
        if (!this.multiSelect) {
            // TODO: this doesn't work if the grid is prepopulated with checked item(s)
            if (this.currentCheckedItem && this._dataSource[dataIndex] !== this.currentCheckedItem) {
                // Uncheck all other checkboxes
                // Do not enter here if no items are checked, or if unchecking checked item
                this._pendingAdds = [];

                //if there is currently an item checked, then uncheck that item
                for (i = 0; i < this._dataSource.length; i++) {
                    if (this.currentCheckedItem[-1] === this._dataSource[i][-1] && i !== dataIndex) {
                        super.setCheckboxState(i, false);
                        foundCheckedItem = true;
                        break;
                    }
                }

                // If we have not found a match in current data set and all
                // identites are read in, then uncheck the currently checked item
                // in the original data set.  This happens when an item is checked, then
                // someone performs a search that does not contain the checked item and then
                // you check an item in the search list
                if (!foundCheckedItem && !this.hasMore) {
                    this._originalData[this.currentCheckedItem[-1]][0] = false;

                }
            }

            if (checked) {
                this.currentCheckedItem = this._dataSource[dataIndex];
            } else {
                this.currentCheckedItem = undefined;
            }
        }

        // Remember the new state of this cell
        super.setCheckboxState(dataIndex, checked);


        // Don't return anything to allow the default action for the event execute
    }

    public _drawHeaderCellValue(column: any): JQuery {

        if (column.index !== TFS_Grid_Adapters.ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX) {
            return super._drawHeaderCellValue(column);
        }
        else {
            return $("<div/>").addClass("title");
        }
    }

    public _setCheckboxStateData(dataIndex: number, state) {
        var identityRow: any,
            tfid: string,
            existingChecked: any,
            currentChecked: any,
            index: number;

        super._setCheckboxStateData(dataIndex, state);

        identityRow = this._dataSource[dataIndex];

        if (!this.hasMore) {
            // Set state of originalData
            this._originalData[identityRow[-1]][0] = state;
        }

        existingChecked = identityRow[4];
        currentChecked = identityRow[0];
        tfid = identityRow[3];

        if (!this._identityInfoMap[tfid]) {
            this._identityInfoMap[tfid] = identityRow[1];
        }

        if (currentChecked && !existingChecked) {
            // Started unchecked, now checked: add to pendingAdds
            this._pendingAdds.push(tfid);
        }
        else if (!currentChecked && existingChecked) {
            // Started checked, now unchecked: add to pendingDeletes
            this._pendingDeletes.push(tfid);
        }
        else if (currentChecked && existingChecked) {
            // Started checked, was unchecked, now checked: remove from pendingDeletes
            index = $.inArray(tfid, this._pendingDeletes);
            if (index > -1) {
                this._pendingDeletes.splice(index, 1);
            }
        }
        else if (!currentChecked && !existingChecked) {
            // Started unchecked, was checked, now unchecked: remove from pendingAdds
            index = $.inArray(tfid, this._pendingAdds);
            if (index > -1) {
                this._pendingAdds.splice(index, 1);
            }
        }

        // Redraw row to update pending column
        this.updateRow(dataIndex);

        this._fire('checkedStateChanged', {
            tfid: tfid,
            name: identityRow[1],
            state: currentChecked
        });

        this._fire('pendingChanged', {
            pendingAdds: this._pendingAdds,
            pendingDeletes: this._pendingDeletes,
            totalCheckedCount: this.existingGroups.length - this._pendingDeletes.length + this._pendingAdds.length
        });
    }
}

VSS.initClassPrototype(CheckedAadGroupsIdentityGrid, {
    currentCheckedItem: null,
    multiSelect: false,
    hasMore: null,
    existingGroups: null,
    host: null,
    _pendingAdds: null,
    _pendingDeletes: null,
    _originalData: null,
    _identityInfoMap: null
});


export class BrowseIdentitiesControl extends Controls.BaseControl {

    public static _controlType: string = 'tfs.admin.BrowseIdentitiesControl';

    private _identityGrid: CheckedIdentityGrid;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        var header: JQuery,
            searchBox: JQuery,
            simpleIdentityGrid: JQuery,
            gridOptions: any;

        header = $(domElem('div')).appendTo(this._element)
            .addClass('identity-browse-search-wrapper fixed-header');
        searchBox = $(domElem('div')).appendTo(header)
            .addClass('identity-browse-search');
        simpleIdentityGrid = $(domElem('div')).appendTo(this._element)
            .addClass('fill-content');

        gridOptions = $.extend({
            height: '100%',
            host: simpleIdentityGrid
        }, this._options);

        this._identityGrid = <CheckedIdentityGrid>Controls.BaseControl.createIn(CheckedIdentityGrid, simpleIdentityGrid, gridOptions);

        (<any>searchBox).IdentitySearchControl({
            identityList: this._identityGrid
        });
        this.setFocusOnSearchBox();


        <VerticalFillLayout>Controls.Enhancement.enhance(VerticalFillLayout, this._element, {
            autoResize: this._options.autoResize
        });

        this._identityGrid.layout();
    }

    public getIdentityGrid(): CheckedIdentityGrid {
        return this._identityGrid;
    }

    public setCheckedIdentities(tfids?: string[]) {
        this._identityGrid.existingGroups = tfids || [];
        this._identityGrid.setInitialGridItems();
        this._identityGrid.getSelectedRowIntoView(true);
    }

    public setFocusOnSearchBox() {
        var searchBox = $(".identity-browse-search", this._element);
        (<any>searchBox).IdentitySearchControl('focus');
    }

}

VSS.initClassPrototype(BrowseIdentitiesControl, {
    _identityGrid: null
});

export class BrowseAadGroupsControl extends Controls.BaseControl {

    public static _controlType: string = 'tfs.admin.BrowseAadGroupsControl';

    private _identityGrid: CheckedAadGroupsIdentityGrid;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        var header: JQuery,
            searchBox: JQuery,
            simpleIdentityGrid: JQuery,
            gridOptions: any;

        header = $(domElem('div')).appendTo(this._element)
            .addClass('identity-browse-search-wrapper fixed-header');
        searchBox = $(domElem('div')).appendTo(header)
            .addClass('identity-browse-search');
        simpleIdentityGrid = $(domElem('div')).appendTo(this._element)
            .addClass('fill-content');

        gridOptions = $.extend({
            height: '100%',
            host: simpleIdentityGrid,
            IsBrowseAadGroupsControl: true,
        }, this._options);

        this._identityGrid = <CheckedAadGroupsIdentityGrid>Controls.BaseControl.createIn(CheckedAadGroupsIdentityGrid, simpleIdentityGrid, gridOptions);

        (<any>searchBox).IdentitySearchControl({
            identityList: this._identityGrid
        });
        this.setFocusOnSearchBox();

        <VerticalFillLayout>Controls.Enhancement.enhance(VerticalFillLayout, this._element, {
            autoResize: this._options.autoResize
        });

        this._identityGrid.layout();
    }

    public getIdentityGrid(): CheckedAadGroupsIdentityGrid {
        return this._identityGrid;
    }

    public setCheckedIdentities(tfids?: string[]) {
        this._identityGrid.existingGroups = tfids || [];
        this._identityGrid.setInitialGridItems();
        this._identityGrid.getSelectedRowIntoView(true);
    }

    public setFocusOnSearchBox() {
        var searchBox = $(".identity-browse-search", this._element);
        (<any>searchBox).IdentitySearchControl('focus');
    }

}

VSS.initClassPrototype(BrowseAadGroupsControl, {
    _identityGrid: null
});

export class IdentityPickerControl extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.admin.identityPickerControl";

    private _checkNameAction: JQuery;
    private _identityBrowser: BrowseIdentitiesControl;
    private _identityListData: IIdentity[];
    private _identityInputWrapper: JQuery;
    private _identityInputControl: any; //TODO: Fix type.  jquery widget
    private _actionDiv: JQuery;
    private _identityInputError: JQuery;
    private _browsePopup: JQuery;
    private _browseContent: JQuery;

    public _mainControl: JQuery;
    public _identityListControl: IdentityListControl;
    public _actionUl: JQuery;

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            identityListAction: tfsContext.getActionUrl('ReadIdentitiesPageJson', 'identity', { area: 'api' }),
            searchParams: { membershipType: 'addableUsers' },
            allowMultiSelect: true,
            showCheckName: true,
            allowCheckName: true,
            allowFreeType: true,
            allowArbitraryEmailAddresses: true,
            constrainToTfsUsersOnly: false,
            comboOnly: false,
            onListRetrieved: null,
            onReady: null,
            filterList: true,
            isHosted: TFS_Host_TfsContext.TfsContext.getDefault().isHosted,
            watermarkTo: null
        }, options));
    }

    public initialize() {
        var browseLink: JQuery,
            that: any = this;

        super.initialize();

        this._element.addClass('identity-picker-control');

        this._mainControl = this.createMainContainer().appendTo(this._element)

        // add identity list control
        this._createIdentityListControl();

        // add identity input
        this._identityInputWrapper = this.createIdentityInputWrapper()
            .appendTo(this._mainControl)
            .keyup((event) => {
                if (!this._identityInputControl.option('disabled') && event.keyCode !== $.ui.keyCode.ENTER && event.keyCode !== $.ui.keyCode.TAB) {
                    if (this._validate(this._identityInputControl._inputElement.val())) {
                        // Imitate a newly added item
                        this._identityListControl._fire('identityListChanged');
                    }
                }
            });
        $('<div class="identity-input" />').appendTo(this._identityInputWrapper);

        // add actions
        browseLink = this.createBrowseLinkElement()
            .attr('id', 'browse-identities-action')
            .attr('href', '#')
            .click(delegate(this, this._onBrowseOpen));
        this._checkNameAction = this.createCheckNameLinkElement()
            .attr('id', 'check-name-action')
            .attr('href', '#')
            .click(delegate(this, this.onCheckName));
        this._actionDiv = this.createActionLinks(browseLink, this._checkNameAction).appendTo(this._mainControl)

        if (this._options.items) {
            $.each(this._options.items, (index, item) => {
                var actionLi = $(domElem('li')).appendTo(this._actionUl);
                $(domElem('a')).appendTo(actionLi)
                    .attr('id', item.id)
                    .attr('href', '#')
                    .addClass('linkAction')
                    .text(item.text)
                    .click(() => {
                        if (this._options.executeAction) {
                            this._options.executeAction(item.id);
                        }

                        return false;
                    });
            });
        }

        // add identity input error
        this._identityInputError = this.createInputErrorContainer()
            .addClass('identity-input-error')
            .hide();

        if (this._options.showBrowse !== false) {
            // add browse content
            this._browsePopup = $(domElem('div')).appendTo(this._element)
                .attr("tabindex", "0")
                .addClass('browse-identities-popup')
                .hide()
                .click(function (e) {
                    // prevent click events from bubbling; used to close popup
                    e.preventDefault();
                    e.stopPropagation();
                })
                .keydown(function (e) {
                    if (e.keyCode === $.ui.keyCode.ESCAPE) {
                        that._onBrowseClose();
                        return false;
                    }
                    return true;
                });

            this._browseContent = $(domElem('div')).appendTo(this._browsePopup)
                .addClass('browse-identities-content');
            $(domElem('a')).appendTo(this._browsePopup)
                .addClass('linkAction browse-identities-popup-close')
                .attr('href', '#')
                .text(adminResources.Close)
                .click(delegate(this, this._onBrowseClose));
        }

        // add event handlers
        $(this._element).bind('itemSelected', delegate(this, this._onItemSelected));
        $(this._element).bind('newItemAdded', delegate(this, this._onNewItemAdded));
        $(this._element).bind('checkedStateChanged', delegate(this, this._onCheckedStateChanged));
        $(this._element).bind('identityListChanged', delegate(this, this._onIdentityListChanged));

        if (!this._options.delayInit) {
            this.initializeIdentityList();
        }
    }

    public createMainContainer(): JQuery {
        return $(domElem('div'))
            .addClass('identity-picker-main');
    }

    public createIdentityInputWrapper(): JQuery {
        return $(domElem('div'))
            .addClass('identity-input-wrapper');
    }

    public createActionLinks(browse: JQuery, checkName: JQuery): JQuery {
        var actionDiv: JQuery,
            actionLi: JQuery,

            actionDiv = $(domElem('div'))
                .addClass('add-identities-actions-section actions-section');

        this._actionUl = $(domElem('ul')).appendTo(actionDiv);

        actionLi = $(domElem('li')).appendTo(this._actionUl);
        browse.appendTo(actionLi);

        actionLi = $(domElem('li')).appendTo(this._actionUl);
        checkName.appendTo(actionLi);

        return actionDiv;
    }

    public createBrowseLinkElement(): JQuery {
        return $(domElem('a'))
            .addClass('linkAction')
            .text(adminResources.Browse);
    }

    public createCheckNameLinkElement(): JQuery {
        return $(domElem('a'))
            .addClass('linkAction')
            .text(adminResources.CheckName);
    }

    public createInputErrorContainer(): JQuery {
        return $(domElem('div')).appendTo(this._mainControl);
    }

    public getDefaultInput(): JQuery {
        return this._identityInputControl.getInputElement();
    }

    public clearInputSelection() {
        if (this._identityInputControl) {
            this._identityInputControl.getInputElement().val('');
        }
    }

    public initializeIdentityList() {
        var setFocus: boolean;

        if (typeof (this._options.setFocusOnInitializeList) === "undefined") {
            setFocus = true;
        } else {
            setFocus = this._options.setFocusOnInitializeList;
        }

        this._clearIdentityInputError();
        this._identityListControl.quickClear();
        this._identityListData = null;

        // Clear the current value
        this.clearInputSelection();

        this._refreshIdentityInput(setFocus);

        if (this._options.showCheckName && this._options.allowCheckName) {
            $('#check-name-action', this._element).closest('li').removeClass("invisible");
        }
        else {
            $('#check-name-action', this._element).closest('li').addClass("invisible");
        }

        if (this._options.showBrowse === false) {
            $('#browse-identities-action', this._element).closest('li').addClass("invisible");
        }
        else {
            $('#browse-identities-action', this._element).closest('li').removeClass("invisible");
        }

        Diag.logTracePoint('IdentityPickerControl.InitializeIdentities.Pending');
        // Try to pre-populate list
        TFS_Core_Ajax.getMSJSON(
            this._options.identityListAction,
            this._options.searchParams,
            (identityData) => {
                var i, identity;
                if (identityData.hasMore) {
                    this._identityListData = null;
                }
                else {
                    this._identityListData = [];
                    for (i = 0; i < identityData.identities.length; i++) {
                        identity = identityData.identities[i];
                        this._identityListData.push(identity);
                    }
                }
                if (this._options.onListRetrieved) {
                    this._options.onListRetrieved(this._identityListData);
                }
                // Recreate input control, but do not change focus
                this._refreshIdentityInput(false);

                if (this._options.onReady) {
                    this._options.onReady(this);
                }
                Diag.logTracePoint('IdentityPickerControl.InitializeIdentities.Complete');
            },
            null,
            this._options.wait
        );
    }

    public _onIdentityListChanged(event: Event, params?: any) {
        if (this._options.comboOnly) {
            return;
        }
        // If params is set, then an item was removed

        if (params && params.tfid) {
            // Removed item was an existing identity.  Add removed item to IdentityInputControl
            this._identityInputControl.options.existingIdentities = this.getPendingChanges().existingUsers;
            this._identityInputControl.addItem(params.name, params.tfid);
        }

        // If single-select, hide/show necessary elements
        if (!this._options.allowMultiSelect && !this._options.comboOnly) {
            var pendingChanges = this._getPendingChanges();
            if (pendingChanges.existingUsers.length + pendingChanges.newUsers.length > 0) {
                this._identityInputWrapper.hide();
                this._actionDiv.hide();
                this._identityInputError.hide();
            }
            else {
                this._identityInputWrapper.show();
                this._actionDiv.show();
                this._identityInputControl.focus();
            }
        }
    }

    public removeIdentity(tfid: string) {
        this._identityListControl.removeIdentity(tfid);
    }

    public removeAllIdentities() {
        this._identityListControl.clear();
    }

    public addResolvedIdentity(displayName: string, resolvedName: string, tfid?: string) {
        /// <param name="displayName" type="string" />
        /// <param name="resolvedName" type="string" />
        /// <param name="tfid" type="string" optional="true" />

        // Try to remove an existing identity with same tfid or resolvedName
        this.removeIdentity(tfid || resolvedName);

        if (!this._options.allowMultiSelect) {
            // If single-select, remove existing items
            this._identityListControl.clear();
        }

        // Remove resolved identity from IdentityInputControl
        if (!this._options.comboOnly) {
            this._identityInputControl.removeItem(displayName);
        }

        // Add resolved identity to IdentityListControl
        this._identityListControl.addIdentity(displayName, resolvedName, tfid, "", this._options.comboOnly);

        if (!this._options.comboOnly) {
            this._identityInputControl.options.existingIdentities = this.getPendingChanges().existingUsers;
        }

        this._clearIdentityInputError();

        Diag.logTracePoint('AddIdentityDialog.ResolvedIdentity.Added');
    }

    public getDisplayNames(): string[] {
        return this._identityListControl.getDisplayNames();
    }

    public _getPendingChanges(includeExistingUserNames?: boolean): IdentityPickerValues {
        /// <param name="includeExistingUserNames" type="boolean" optional="true" />

        var inputElementText: string,
            pendingChanges = this._identityListControl.getPendingChanges(includeExistingUserNames),
            resultInputText: string;
        if (this._identityInputControl && !this._options.comboOnly) {
            // Add input element text as new item
            inputElementText = this._identityInputControl._inputElement.val();
            if (inputElementText && this._validate(inputElementText)) {
                resultInputText = inputElementText;
            }
        }
        return {
            newUsers: pendingChanges.newUsers,
            existingUsers: pendingChanges.existingUsers,
            unresolvedEntityIds: [],
            inputText: resultInputText
        };
    }

    public getPendingChanges(includeExistingUserNames?: boolean): IdentityListValues {
        /// <param name="includeExistingUserNames" type="boolean" optional="true" />

        var pendingChanges = this._getPendingChanges(includeExistingUserNames);
        if (pendingChanges.inputText) {
            pendingChanges.newUsers.push(pendingChanges.inputText);
        }
        return pendingChanges;
    }

    public getTfids(): string[] {
        return this._identityListControl.getTfids();
    }

    public getPendingUserInput(): string {
        var inputElementText = "";
        if (this._identityInputControl) {
            inputElementText = this._identityInputControl._inputElement.val();
        }
        return inputElementText;
    }

    public select(value, focus): boolean {
        if (this._identityInputControl) {
            return this._identityInputControl.select(value, focus);
        }
        return false;
    }

    public _setIdentityInputError(errorMsg) {
        if (!this._options.errorHandler) {
            this._identityInputError.show().text(errorMsg);
            this._identityInputControl.element.addClass('invalid');
        }
        else {
            this._options.errorHandler(errorMsg, this._options.errorOptions);
        }
    }

    public _clearIdentityInputError() {
        this._identityInputError.hide();
        if (this._identityInputControl) {
            this._identityInputControl.element.removeClass('invalid');
        }
    }

    public _createIdentityListControl() {
        this._identityListControl = <IdentityListControl>Controls.BaseControl.createIn(IdentityListControl, this._mainControl);
    }

    private _onItemSelected(event: Event, params?: any) {
        var displayName: string = params.item.text,
            tfid: string = params.item.value;

        // Append resolved identity
        this.addResolvedIdentity(displayName, displayName, tfid);
    }

    private _onNewItemAdded(event: Event, params?: any) {
        var username = params.text.trim();

        this._checkName(username);
    }

    private _validate(username: string): boolean {
        if (!this._options.allowFreeType) {
            // Always invalid
            return false;
        }
        else if (username.length === 0 || !this._options.isHosted || this._isEmailAddress(username)) {
            // hosted accepts email addresses only. on-premises might accept email addresses as well as potentially-domain-qualified usernames
            this._clearIdentityInputError();
            return true;
        }
        else {
            this._setIdentityInputError(adminResources.InvalidEmail);
            return false;
        }
    }

    private _isEmailAddress(inputText: string): boolean {
        return (inputText && EmailValidator.validate(inputText.trim()) && inputText.indexOf(';') === -1);
    }

    private _refreshIdentityInput(focus: boolean) {
        var watermarkTo: string;

        if (!this._options.watermarkTo) {
            watermarkTo = this._options.isHosted ? Utils_String.htmlEncode(adminResources.IdentityInputWatermarkHosted) : Utils_String.htmlEncode(adminResources.IdentityInputWatermarkOnPremise);
        }
        else {
            watermarkTo = this._options.watermarkTo;
        }

        // Recreate new identity input control with updated existingUsers
        this._identityInputControl = ((<any>$('.identity-input', this._identityInputWrapper)).IdentityInput({
            inputControlId: this._options.inputControlId,
            watermarkText: watermarkTo,
            items: this._identityListData,
            identityListAction: this._options.identityListAction,
            searchParams: this._options.searchParams,
            allowFreeType: this._options.allowFreeType,
            id: this._options.inputTextElementId,
            comboOnly: this._options.comboOnly,
            filterList: this._options.filterList
        }) as JQuery).data('TFS-IdentityInput');

        // Default is to focus
        if (focus !== false) {
            this._identityInputControl.focus(focus);
        }
    }

    private _onCheckedStateChanged(event: Event, params?: any) {
        if (params.state) {
            // If checked, add to IdentityListControl
            this.addResolvedIdentity(params.name, params.name, params.tfid);
        }
        else {
            // If unchecked, remove from IdentityListControl
            this.removeIdentity(params.tfid);
        }
    }

    private _onBrowseClose(): boolean {
        var tabbables: JQuery = $(':tabbable', this._browsePopup),
            first: JQuery = tabbables.filter(':first'),
            last: JQuery = tabbables.filter(':last');

        // removing the bindings that were added to make tabbing occur in the browse box only
        last.unbind('keydown', this._navigateToFirst);
        first.unbind('keydown', this._navigateToLast);

        $(document).unbind('click.browse-identities-popup');

        // setting the focus on the first tabbable of identity picker (the identity text box) on browse close.
        $(':tabbable', this._element).filter(':first').focus();

        this._browsePopup.hide();
        Diag.logTracePoint('IdentityPickerControl.BrowseIdentitiesPopup.Close');
        return false;
    }

    private _onBrowseOpen(e?: KeyboardEvent): boolean {
        var tfids = this._identityListControl.getTfids();

        if (this._options.browseAction) {
            this._options.browseAction.call(this, e, tfids);
        }
        else {
            this._showBrowsePopup.call(this, e, tfids);
        }
        return false;
    }

    private _showBrowsePopup(e?: KeyboardEvent, tfids?: string[]) {
        var tabbables: JQuery,
            first: JQuery,
            last: JQuery;

        // Show popup window before creating grid so size is specified
        this._browsePopup.show();
        if (this._identityBrowser) {
            this._identityBrowser.setCheckedIdentities(tfids);
            this._identityBrowser.setFocusOnSearchBox();
        }
        else {
            this._identityBrowser = <BrowseIdentitiesControl>Controls.Enhancement.enhance(BrowseIdentitiesControl, this._browseContent, {
                identityListAction: this._options.identityListAction,
                searchParams: this._options.searchParams,
                existingGroups: tfids,
                gridItems: this._identityListData,
                multiSelect: this._options.allowMultiSelect,
                autoResize: false
            });
        }

        // If any clicks propagate to document, close browse popup
        $(document).bind('click.browse-identities-popup', delegate(this, this._onBrowseClose));

        // Dont lose focus from the browsebox on tabbing
        // We can't set the values of these 3 variables before we show the browsepopup
        // as the elements inside a hidden div are not tabbable
        tabbables = $(':tabbable', this._browsePopup);
        first = tabbables.filter(':first');
        last = tabbables.filter(':last');

        last.keydown({ target: first }, this._navigateToFirst);
        first.keydown({ target: last }, this._navigateToLast);

        // Stop this click event so dialog isn't immediately closed
        e.stopPropagation();
        e.preventDefault();
    }

    private _navigateToFirst(e) {
        if (e.keyCode === $.ui.keyCode.TAB && !e.shiftKey && !e.ctrlKey && !e.altKey) {
            e.data.target.focus();
            return false;
        }
        return true;
    }

    private _navigateToLast(e) {
        if (e.keyCode === $.ui.keyCode.TAB && e.shiftKey) {
            e.data.target.focus();
            return false;
        }
        return true;
    }

    public onCheckName(successCallback?: () => void): boolean {
        var username: string = this._identityInputControl.getCurrentValue().trim();
        if (!username.length) {
            if ($.isFunction(successCallback)) {
                //in this case there is no username to check, so just call the callback.
                successCallback();
            }
        }
        else {
            this._checkName(username, false, successCallback);
        }
        return false;
    }

    public addRecipientByName(username: string, suppressErrors?: boolean, callback?: () => void) {
        this._checkName(username.trim(), suppressErrors, callback);
    }

    private _checkName(username: string, suppressErrors?: boolean, callback?: (errorMsg?: string) => void) {
        /// <summary>Checks the given username to see if it is valid and if it is add it as a recipient </summary>
        /// <param name="username" type="string">The display name or email</param>
        /// <param name="supressErrors" type="boolean" optional="true"> if this is true, then we won't show errors </param>
        /// <param name="callback" optional="true"> a function that is called right after checking the name </param>

        // do not allow multiple check names
        // only check name if there is a valid input
        if (this._options.allowCheckName &&
            this._checkNameAction &&
            !this._checkNameAction.hasClass('admin-disabled-link') &&
            username.length) {

            if (this._options.allowArbitraryEmailAddresses && this._isEmailAddress(username)) {
                // it's an email, and arbitrary email addresses are allowed. no need to check any further
                this.addResolvedIdentity(username, username);
                if ($.isFunction(callback)) {
                    callback();
                }
                return;
            }
            let errorMsg: string;

            // disable control and button
            this._identityInputControl.disable();
            this.updateCheckNameAction(this._checkNameAction, adminResources.CheckNameInProgress, true).addClass('admin-disabled-link');

            Diag.logTracePoint('AddIdentityDialog.checkName.pending');

            TFS_Core_Ajax.getMSJSON(
                tfsContext.getActionUrl('CheckName', 'identity', { area: 'api' }),
                { name: username },
                (data) => {

                    // enable control and button
                    this.updateCheckNameAction(this._checkNameAction, adminResources.CheckName, false).removeClass('admin-disabled-link');
                    this._identityInputControl.enable();
                    this._identityInputControl.focus();

                    if (data.identity) {
                        // user is in tfs
                        this.addResolvedIdentity(data.identity.DisplayName, data.identity.DisplayName, data.identity.TeamFoundationId);
                    }
                    else if (data.resolvedName) {
                        // user can be resolved, but a TFS identity was not found
                        if (this._options.constrainToTfsUsersOnly) {
                            if (!suppressErrors) {
                                this._setIdentityInputError(adminResources.NoTfsUserError);
                                errorMsg = adminResources.NoTfsUserError;
                            }
                        }
                        else {
                            this.addResolvedIdentity(data.resolvedName, username);
                        }
                    }
                    else if (!suppressErrors) {
                        // unknown identity. also, (this._options.allowArbitraryEmailAddresses && this._isEmailAddress(username)) is false. reject
                        this._setIdentityInputError(adminResources.NoTfsUserError);
                        errorMsg = adminResources.NoTfsUserError;
                    }
                    if ($.isFunction(callback)) {
                        callback(errorMsg);
                    }
                },
                (error) => {

                    // enable control and button
                    this.updateCheckNameAction(this._checkNameAction, adminResources.CheckName, false).removeClass('admin-disabled-link');
                    this._identityInputControl.enable();
                    this._identityInputControl.focus();
                    if (!suppressErrors) {
                        this._setIdentityInputError(error.message);
                    }
                },
                {
                    tracePoint: 'AddIdentityDialog.checkName.complete'
                }
            );
        }
    }

    public updateCheckNameAction(checkNameAction: JQuery, text: string, busy: boolean): JQuery {
        return checkNameAction.text(text);
    }
}

VSS.classExtend(IdentityPickerControl, TfsContext.ControlExtensions);

export class MonitorControl extends Controls.BaseControl {
    private _createProgressElement: JQuery;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._createProgressElement = this._element;
    }

    public startMonitoring() {
        this._monitorProgress();
    }

    public stopMonitoring() {
        this.cancelDelayedFunction("monitorProgress");
    }

    public renderErrorRetrievingProgress(e?) {
        var container: any,
            createErrorBox: JQuery,
            exceptionMessage: string,
            refreshLinkContainer: JQuery;

        container = $(domElem('div'));
        createErrorBox = $(domElem('div')).addClass('create-warning-box').appendTo(container);
        if (this._options.renderImportProcessErrorText) {
            $(domElem('span')).html(this._options.renderImportProcessErrorText).appendTo(createErrorBox);
        }
        else {
            $(domElem('span')).html(adminResources.ErrorRetrievingProgressMessage).appendTo(createErrorBox);
        }

        if (e) {
            exceptionMessage = (e && e.message) || e;

            $(domElem('br')).appendTo(createErrorBox);
            $(domElem('br')).appendTo(createErrorBox);
            $(domElem('span')).text(adminResources.ErrorRetrievingProgressDetailsHeader).appendTo(createErrorBox);
            $(domElem('br')).appendTo(createErrorBox);
            $(domElem('span')).addClass('admin-exception-message').text(exceptionMessage).appendTo(createErrorBox);
        }

        //TODO: remove this this._createProjectProgress.html(container);
        this._createProgressElement.html(container);
    }

    public _renderProgress(percentComplete: number, progressCaption: string) {
        var progressContainer: JQuery,
            progressCaptionContainer: JQuery;

        this._createProgressElement.empty();

        progressContainer = $(domElem('div')).addClass('progress-container').appendTo(this._createProgressElement);
        if (percentComplete) {
            $(domElem('div')).addClass('completed').css('width', percentComplete + '%').appendTo(progressContainer);
        }
        $(domElem('div')).addClass('remaining').css('width', (100 - percentComplete) + '%').appendTo(progressContainer);

        progressCaptionContainer = $(domElem('div')).appendTo(this._createProgressElement);
        $(domElem('span')).addClass('getting-started-lighttext').text(progressCaption).appendTo(progressCaptionContainer);

        this._fire('render-progress');

        this.delayExecute("monitorProgress", 5000, true, this._monitorProgress);
    }

    public _renderComplete() {
        var container: JQuery;

        // Empty the progress element
        this._createProgressElement.empty();

        // If complete text was passed in then append to the progress element
        if (this._options.completeText) {
            // Create the container
            container = $(domElem('div')).addClass('create-done-box');

            if (this._options.completeText && this._options.completeTextDescription) {
                $(domElem('div')).addClass('import-process-success').text(this._options.completeText).appendTo(container);
                $(domElem('div')).addClass('import-process-success').text(this._options.completeTextDescription).appendTo(container);
            }
            else {
                // Set the text and append to the progress element
                $(domElem('span')).text(this._options.completeText).appendTo(container);
            }

            this._createProgressElement.append(container);
        }
        this._fire('render-complete');
    }

    public _renderFailure() {
        var container: any,
            createErrorBox: JQuery,
            retryLinkContainer: JQuery;

        container = $(domElem('div'));
        createErrorBox = $(domElem('div')).addClass('create-error-box').appendTo(container);
        $(domElem('span')).html(this._options.failureText).appendTo(createErrorBox);
        $(domElem('br')).appendTo(container);
        retryLinkContainer = $(domElem('div')).appendTo(container);
        $(domElem('a')).attr('href', '#').text(this._options.retryActionText).appendTo(retryLinkContainer).click(delegate(this, this._onRetryAfterFailure));

        this._createProgressElement.html(container);
        this._fire('render-failure');
    }

    private _onRetryAfterFailure() {
        this._fire('retry-after-failure');
        return false;
    }

    public _monitorProgress(): boolean {
        return false;
    }
}

VSS.classExtend(MonitorControl, TfsContext.ControlExtensions);

export class MonitorJobControl extends MonitorControl {

    public static _controlType: string = 'MonitorJobControl';

    public _monitorProgress(): boolean {
        TFS_Core_Ajax.getMSJSON(
            this._options.tfsContext.getActionUrl('MonitorJobProgress', 'job', { area: 'api' }),
            {
                jobId: this._options.jobId
            },
            delegate(this, this._renderProgressResponse),
            delegate(this, this.renderErrorRetrievingProgress),
            {
                showGlobalProgressIndicator: false
            }
        );
        return false;
    }

    private _renderProgressResponse(data: { State: number; PercentComplete?: number; }) {
        switch (data.State) {
            case 0:     // NotStarted
                this._renderProgress(0, this._options.notStartedText);
                break;

            case 1:     // InProgress
                this._renderProgress(data.PercentComplete, this._options.inProgressText);
                break;

            case 2:     // Complete
                this._renderComplete();
                break;

            case 3:     // Error
                this._renderFailure();
                break;

            default:
                break;
        }
    }
}

VSS.classExtend(MonitorJobControl, TfsContext.ControlExtensions);

export class ImportProcessJobMonitorControl extends MonitorControl {

    public static _controlType: string = 'ImportProcessJobMonitorControl';

    public _monitorProgress(): boolean {
        TFS_Core_Ajax.getMSJSON(
            this._options.tfsContext.getActionUrl('GetJobProgress', 'process', { area: 'api' }),
            {
                jobId: this._options.jobId
            },
            (data) => { this._renderProgressResponse(data); },
            (e) => { this.renderErrorRetrievingProgress(e); },
            {
                showGlobalProgressIndicator: false
            }
        );
        return false;
    }

    private _renderProgressResponse(data: { State: number; PercentComplete?: number; ProgressText: string }) {
        switch (data.State) {
            case 0:     // NotStarted
                this._renderProgress(0, this._options.notStartedText);
                break;

            case 1:     // InProgress
                this._renderProgress(data.PercentComplete, data.ProgressText);
                break;

            case 2:     // Complete
                this._renderComplete();
                break;

            case 3:     // Error
                this._renderFailure();
                break;

            default:
                break;
        }
    }
}

VSS.classExtend(ImportProcessJobMonitorControl, TfsContext.ControlExtensions);

export class MonitorOperationControl extends MonitorControl {
    private _httpClient: Operations_RestClient.OperationsHttpClient;

    public initialize() {
        super.initialize();

        this._httpClient = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getHttpClient<Operations_RestClient.OperationsHttpClient>(Operations_RestClient.OperationsHttpClient);
    }

    public _monitorProgress(): boolean {
        this._httpClient.getOperation(this._options.jobId)
            .then((data) => {
                this._renderProgressResponse(data);
            }, (e: Error) => {
                this.renderErrorRetrievingProgress(e);
            });
        return false;
    }

    private _renderProgressResponse(data: Operations_Contracts.Operation) {
        switch (data.status) {
            case Operations_Contracts.OperationStatus.NotSet:
            case Operations_Contracts.OperationStatus.Queued:
                this._renderProgress(0, this._options.notStartedText);
                break;

            case Operations_Contracts.OperationStatus.InProgress:
                this._renderProgress(30, this._options.inProgressText);
                break;

            case Operations_Contracts.OperationStatus.Succeeded:
                this._renderComplete();
                break;

            case Operations_Contracts.OperationStatus.Failed:
            case Operations_Contracts.OperationStatus.Cancelled:
                this._renderFailure();
                break;

            default:
                break;
        }
    }
}

VSS.classExtend(MonitorOperationControl, TfsContext.ControlExtensions);

export module CommonServicesActionIds {
    export var ConnectedServices = "connectedservices";
}

export module EmailValidator {
    var _emailRegex: RegExp = /^([^@\[\]\.\s]+(\.[^@\[\]\.\s]+)*)@(([^@\[\]\.\s]+(\.[^@\[\]\.\s]+)+)|(\[([0-9]{1,3}\.){3}[0-9]{1,3}\]))$/;

    export function validate(email: string): boolean {
        return _emailRegex.test(email);
    }
}

/** Whether the number is finite value within the boundries of a 32 bit number */
export function isInt32Range(num: number): boolean {
    return num <= 0x7FFFFFFF && num >= -0x80000000;
}

export function isGuid(value: string): boolean {
    // b7a1d774-113d-4364-82af-75ce6919ef88
    var validGuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return validGuid.test(value);
}

export function trim(text: string): string {
    if (text) {
        return text.trim();
    }
    else {
        return text;
    }
}

export function addAccessibilityFunctionsToGrid(rootControlElement: JQuery): JQuery {
    const rowSelector: string = '[role="row"]';
    const columnHeaderSelector: string = '[role="columnheader"]';
    const tabableSelector: string = '[tabindex]';
    let allRows: JQuery = rootControlElement.find(rowSelector).attr('aria-selected', 'false');
    let firstRow: JQuery = $(allRows[0]);
    let headerRow: JQuery = firstRow != null && firstRow.find(columnHeaderSelector).length > 0 ? firstRow : null;
    let tabables: JQuery = rootControlElement.find(tabableSelector);

    if (tabables.length === 0) {
        return null;
    }

    let focusOnElement = (element: JQuery, ariaSelected: boolean = false) => {
        tabables.attr('tabindex', -1);
        element.attr('tabindex', 0).focus();
        if (ariaSelected) {
            allRows.attr('aria-selected', 'false');
            element.attr('aria-selected', 'true');
        }
    };

    tabables.click((e: JQueryEventObject) => {
        tabables.attr('tabindex', -1);
        let currentRow: JQuery = $(e.currentTarget).attr('tabindex', 0).focus()
            .closest(rowSelector);

        if (!currentRow.is(headerRow)) {
            allRows.attr('aria-selected', 'false');
            currentRow.attr('aria-selected', 'true');
        }
    });
    $(tabables[0]).attr('tabindex', 0); // first tabindex should be 0, the rest should be -1

    rootControlElement.on('keydown', (e: JQueryEventObject) => {
        const currentRow: JQuery = $(e.target).closest(rowSelector);

        switch (e.which) {
            case KeyCode.RIGHT:
                {
                    let innerTabables: JQuery = currentRow.find(tabableSelector);
                    let focusedIndex: number = innerTabables.index(e.target);
                    if (focusedIndex < innerTabables.length + 1) {
                        // this will handle the -1 index case
                        focusOnElement($(innerTabables[focusedIndex + 1]));
                    }
                }
                break;
            case KeyCode.LEFT:
                {
                    let innerTabables: JQuery = currentRow.find(tabableSelector);
                    let focusedIndex: number = innerTabables.index(e.target);
                    if (focusedIndex <= 0) {
                        focusOnElement(currentRow);
                    } else {
                        focusOnElement($(innerTabables[focusedIndex - 1]));
                    }
                }
                break;
            case KeyCode.UP:
                let previousRow: JQuery = currentRow.prev(rowSelector);
                if (previousRow.length > 0) {
                    focusOnElement(previousRow, !previousRow.is(headerRow));
                }
                break;
            case KeyCode.DOWN:
                let nextRow: JQuery = currentRow.next(rowSelector);
                if (nextRow.length > 0) {
                    focusOnElement(nextRow, true);
                }
                break;
            case KeyCode.TAB:
                if (allRows.length === 0) {
                    break;
                }

                let isHeaderRow: boolean = headerRow != null && currentRow.is(headerRow);
                if (e.shiftKey && !isHeaderRow && headerRow != null) {
                    focusOnElement(headerRow);
                    e.preventDefault();
                } else if (!e.shiftKey && isHeaderRow) {
                    let nextRow: JQuery = currentRow.next(rowSelector);
                    if (nextRow.length > 0) {
                        focusOnElement(nextRow, true);
                        e.preventDefault();
                    }
                }
                break;
        }
    });

    return $(tabables[0]);
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Common", exports);
