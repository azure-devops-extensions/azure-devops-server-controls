///<amd-dependency path="jQueryUI/core"/>
///<amd-dependency path="jQueryUI/button"/>
/// <reference types="knockout" />
/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");
import * as React from "react";
import * as ReactDOM from "react-dom";

import VSS = require("VSS/VSS");
import Admin = require("Admin/Scripts/TFS.Admin");
import Context = require("VSS/Context");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import { ProjectNameValidator } from "Admin/Scripts/ProjectNameValidator";
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import SecurityOM = require("Admin/Scripts/TFS.Admin.Security");
import Panels = require("VSS/Controls/Panels");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import PopupContent = require("VSS/Controls/PopupContent");
import { SidebarSearch } from "Presentation/Scripts/TFS/TFS.UI.Controls.SidebarSearch";
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_HubsService = require("VSS/Navigation/HubsService");
import Navigation_Location = require("VSS/Navigation/Location");
import Navigation_Services = require("VSS/Navigation/Services");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import TreeView = require("VSS/Controls/TreeView");
import Grids = require("VSS/Controls/Grids");
import Combos = require("VSS/Controls/Combos");
import Notifications = require("VSS/Controls/Notifications");
import TFS_Project_WebApi = require("Presentation/Scripts/TFS/TFS.Project.WebApi");
import TFS_Admin_ServiceEndpoints = require("Admin/Scripts/TFS.Admin.ServiceEndpoints");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Admin_Dialogs = require("Admin/Scripts/TFS.Admin.Dialogs");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Admin_FeatureEnablement = require("Admin/Scripts/TFS.Admin.FeatureEnablement");
import Service = require("VSS/Service");
import Events_Document = require("VSS/Events/Document");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_UI_Controls_Common = require("Presentation/Scripts/TFS/TFS.UI.Controls.Common");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Operations_RestClient = require("VSS/Operations/RestClient");
import Operations_Contracts = require("VSS/Operations/Contracts");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Identities_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Services = require("VSS/Identities/Picker/Services");
import IdentityPicker = require("VSS/Identities/Picker/Controls");
import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import DistributedTaskCommon = require("TFS/DistributedTask/Contracts");
import VSS_Events_Services = require("VSS/Events/Services");
import {
    IUrlParameters,
    MyExperiencesUrls
} from "Presentation/Scripts/TFS/TFS.MyExperiences.UrlHelper";
import FeatureManagement_Contracts = require("VSS/FeatureManagement/Contracts");
import FeatureManagement_RestClient = require("VSS/FeatureManagement/RestClient");
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import * as NavigationServices from "VSS/Navigation/Services";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import { WebApiTeam, TeamContext } from "TFS/Core/Contracts";
import { CoreHttpClient, getClient } from "TFS/Core/RestClient";
import OrchestrationContracts = require("VSS/ReparentCollection/Contracts");
import DomainUrlMigrationRestClient = require("VSS/NewDomainUrlMigration/RestClient");
import Platform = require("VSS/Common/Contracts/Platform");
import WebApi_Constants = require("VSS/WebApi/Constants");
import Locations = require("VSS/Locations");
import { Uri } from "VSS/Utils/Url";
import { LWPComponent } from "VSSPreview/Flux/Components/LWP";
import { AdminPageContext } from "Admin/Scripts/AdminPageContext";
import { Account } from "Admin/Scripts/Resources/TFS.Resources.Admin";

import * as Telemetry from "VSS/Telemetry/Services";

var TfsContext = TFS_Host_TfsContext.TfsContext;
var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var hostConfig = TFS_Host_TfsContext.TfsContext.getDefault().configuration;
var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

export interface IAccountAadInformation {
    AccountAadTenantName: string;
    IsAadAccount: boolean;
}

export module AdminActionIds {
    export var ServiceDetails = "details";
}

class AccountSettingsView extends Controls.BaseControl {

    private static TOOLBAR_CMD_SAVE: string = "AccountSettings.Save";
    private static TOOLBAR_CMD_UNDO: string = "AccountSettings.Undo";

    private static POLICY_OAUTH_NAME: string = "Policy.DisallowOAuthAuthentication";
    private static POLICY_BASICAUTH_NAME: string = "Policy.DisallowBasicAuthentication";
    private static POLICY_GUESTUSER_NAME: string = "Policy.DisallowAadGuestUserAccess";
    private static POLICY_SSH_NAME: string = "Policy.DisallowSecureShell";
    private static POLICY_PP_NAME: string = "Policy.PPEnabled";
    private static POLICY_OP_NAME: string = "Policy.OPEnabled";
    private static POLICY_AADCAP_NAME: string = "Policy.EnforceAADConditionalAccess";

    private _timeZoneCombo: any;
    private _toolbar: any;
    private _messageArea: any;
    private _initialTimeZoneId: any;
    private _currentTimeZoneId: any;
    private _allTimeZones: any;
    private _initialAccountOwnerId: any;
    private _currentAccountOwnerId: any;
    private _initialPrivacyUrl: string;
    private _currentPrivacyUrl: string;
    private _currentAccountOwner: Identities_RestClient.IEntity;
    private _ownerIdentity: any;
    private _initialOAuthDisabled: boolean;
    private _currentOAuthDisabled: boolean;
    private _initialBasicAuthDisabled: boolean;
    private _currentBasicAuthDisabled: boolean;
    private _initialGuestUserDisabled: boolean;
    private _currentGuestUserDisabled: boolean;
    private _initialPublicKeyDisabled: boolean;
    private _currentPublicKeyDisabled: boolean;
    private _initialPolicyPPEnabled: boolean;
    private _currentPolicyPPEnabled: boolean;
    private _initialPolicyOPEnabled: boolean;
    private _currentPolicyOPEnabled: boolean;
    private _initialPolicyAADCAPEnabled: boolean;
    private _currentPolicyAADCAPEnabled: boolean;
    private _advancedControlDiv: any;
    private _customDisplayInputDiv: any;

    private _subscriptionIdDiv: any;

    private _azuredevopsDomainUrls: boolean;
    private _targetAccountUrl: string;

    private _advancedAdminDiv: any;
    private _advancedDiv: any;
    private _advancedTitle: any;
    private _accountUrlTable: any;
    private _accountUrlRow: any;
    private _accountURLelement: any;

    private _accountName: string;
    private _accountUrl: any;
    private _subscriptionId: any;
    private _identityPickerSearchControl: IdentityPicker.IdentityPickerSearchControl;

    // Added new elements for UI creation for advance section.
    private $settingsAdvanceControl: any;
    private $settingsAdvanceHeader: any;
    private $settingsHeaderDivider: any;
    private $settingsAdvanceContainer: any;
    private $settingsAccountURLLabel: any;
    private $settingsAccountURLValue: any;
    private $settingsRegionValue: JQuery;
    private $settingsRegionLabel: JQuery;
    private $settingsPrivacyUrlValue: JQuery
    private $settingsPrivacyUrlLabel: JQuery;
    private $settingsAccountURLAction: any;
    private $settingsAccountURLHyperLink: any;
    private $settingsAccountDeleteURLAction: any;
    private $settingsDeleteAccountHyperLink: any;
    private $settingsOAuthDisabledContent: JQuery;
    private $settingsBasicAuthDisabledContent: JQuery;
    private $settingsGuestUserDisabledContent: JQuery;
    private $settingsPublicKeyDisabledContent: JQuery;
    private $settingsPolicyPPEnabledContent: JQuery;
    private $settingsPolicyOPEnabledContent: JQuery;
    private $settingsAzureSubscriptionContainer: any;
    private $settingsAzureSubscriptionHeader: any;
    private $settingsAzureSubscriptionText: any;
    private $settingsAzureSubscriptionContent: any;
    private $settingsAzureSubscriptionLinks: any;
    private $settingsAzureSubscriptionLink: JQuery;
    private $settingsCurrentOwnerContent: JQuery;
    private $settingsTimeZoneCombo: JQuery;
    private $settingsOwnerChangeLink: JQuery;
    private $settingsOwnerSearchContainer: JQuery;
    private $settingsNewOwnerLabel: JQuery;
    private $settingsAadCapEnabledContent: JQuery;

    private $settingsAccountAadControl: any;
    private _accountAadInformationData: IAccountAadInformation;

    private _data: any;

    private _showPPPolicyInformation: boolean = false;
    private _showOPPolicyInformation: boolean = false;
    private _showAADCAPPolicyInformation: boolean = false;

    constructor(options?) {
        /// <summary>Control for the Account settings page. Lets you view and set the Account Timezone, account name and the owner</summary>
        super(options);
    }

    public initialize() {
        this._showPPPolicyInformation = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(
            ServerConstants.FeatureAvailabilityFlags.AnonymousAccessFeatureName);

        var $accountAadInformation = $('.AccountAadInformationData');
        this._accountAadInformationData = Utils_Core.parseMSJSON($accountAadInformation.html(), false);

        super.initialize();

        this._createUIElements();
        this._registerEvents();

        Events_Document.getRunningDocumentsTable().add("AccountSettings", this);
        this._retrieveAndPopulateSettings();
    }

    public isDirty(): boolean {
        /// <summary>Get the dirty state</summary>

        return (this._currentTimeZoneId !== this._initialTimeZoneId ||
            this._currentAccountOwnerId !== this._initialAccountOwnerId ||
            this._currentPrivacyUrl !== this._initialPrivacyUrl ||
            this._currentOAuthDisabled !== this._initialOAuthDisabled ||
            this._currentBasicAuthDisabled !== this._initialBasicAuthDisabled ||
            this._currentGuestUserDisabled !== this._initialGuestUserDisabled ||
            this._currentPublicKeyDisabled !== this._initialPublicKeyDisabled ||
            this._currentPolicyPPEnabled != this._initialPolicyPPEnabled ||
            this._currentPolicyOPEnabled != this._initialPolicyOPEnabled ||
            this._currentPolicyAADCAPEnabled != this._initialPolicyAADCAPEnabled);
    }

    private _createUIElements() {
        /// <summary>Creates the UI elements for the settings view</summary>
        var $settingsControl,
            $table,
            $element;

        $element = this.getElement();

        $settingsControl = $(".settings-control");
        $table = $(domElem('table', 'account-settings-table')).appendTo($settingsControl);

        // Create time zone combo
        this.$settingsTimeZoneCombo = $(domElem('div', 'settings-combo'));
        this._addRow(AdminResources.TimeZone, this.$settingsTimeZoneCombo, $table);
        this._timeZoneCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this.$settingsTimeZoneCombo, { allowEdit: false, comparer: Utils_String.defaultComparer });

        //creates account owner combo
        this.$settingsOwnerChangeLink = $(domElem('a', 'settings-change-owner')).html(Utils_String.format("<a href='#'>{0}</a>", AdminResources.Change))
        this.$settingsOwnerChangeLink.bind('click', delegate(this, this._showIdentityPickerBox));
        this.$settingsCurrentOwnerContent = $(domElem('span', 'settings-current-owner'));
        this._addtableRow($(domElem('div')).text(AdminResources.CurrentOwner), $(domElem('div')).append(this.$settingsCurrentOwnerContent).append(this.$settingsOwnerChangeLink), $table);
        this.$settingsOwnerSearchContainer = $(domElem('div', 'settings-new-owner'));
        this.$settingsNewOwnerLabel = $(domElem('div')).text(AdminResources.NewOwner);
        this._addtableRow(this.$settingsNewOwnerLabel, this.$settingsOwnerSearchContainer, $table);
        var operationScope: Identities_Services.IOperationScope = {
            IMS: true
        };
        var identityType: Identities_Services.IEntityType = {
            User: true,
        };
        this._identityPickerSearchControl = Controls.create(IdentityPicker.IdentityPickerSearchControl, this.$settingsOwnerSearchContainer, <IdentityPicker.IIdentityPickerSearchOptions>{
            operationScope: operationScope,
            identityType: identityType,
            multiIdentitySearch: false,
            showMruTriangle: false,
            showMru: false,
            consumerId: TFS_Admin_Common.AdminUIHelper.CHANGE_ACCOUNT_OWNER_CONSUMER_ID,
        });
        this.$settingsNewOwnerLabel.hide();
        this.$settingsOwnerSearchContainer.hide();

        this.$settingsRegionLabel = $(domElem('div', 'settings-region-label'));
        this.$settingsRegionLabel.text(AdminResources.Region);
        this.$settingsRegionValue = $(domElem('div', 'settings-region'));
        this._addtableRow(this.$settingsRegionLabel, this.$settingsRegionValue, $table);

        this.$settingsPrivacyUrlLabel = $(domElem('div', 'settings-privacy-url-label'));
        this.$settingsPrivacyUrlLabel.text(AdminResources.PrivacyUrl);
        this.$settingsPrivacyUrlValue = $(domElem('input', 'settings-privacy-url')).prop({
            'type': 'text',
            'maxlength': "2000",
            'autocomplete': 'off',
            'spellcheck': 'false'
        });
        this._addtableRow(this.$settingsPrivacyUrlLabel, this.$settingsPrivacyUrlValue, $table);

        this._subscriptionIdDiv = $(domElem('div')).attr('id', 'subscriptionId');
        $settingsControl.append(this._subscriptionIdDiv);

        // Create Advanced Administration section.
        this._createAdvanceSection();

        this._createBillingInformationSection();

        this._createAccountAadSection();

        this._createToolbar();
        this._createMessageArea();
    }

    private _createAdvanceSection() {
        // This metthod will create UI for advance section.

        $('.hub-pivot-content').css('overflow', 'auto'); // allowing the page to scroll when resized
        this.$settingsAdvanceControl = $(domElem('div')).appendTo($(".account-settings-container")).addClass('settings-advance-control');
        this.$settingsAdvanceHeader = $(domElem('div')).appendTo(this.$settingsAdvanceControl).addClass('settings-advance-control-header');
        // Add the header text.
        this.$settingsAdvanceHeader.text(AdminResources.AdvancedAdminTasks);
        this.$settingsHeaderDivider = $(domElem('div')).appendTo(this.$settingsAdvanceControl).addClass('divider');
        // this is the row.
        this.$settingsAdvanceContainer = $(domElem('div')).appendTo(this.$settingsAdvanceControl).addClass('settings-advance-control-container');
        // add col 1
        this.$settingsAccountURLLabel = $(domElem('div')).appendTo(this.$settingsAdvanceContainer).addClass('display-Advance-label');
        $(this.$settingsAccountURLLabel).text(AdminResources.AccountUrl);
        // add col 2
        this.$settingsAccountURLValue = $(domElem('div')).appendTo(this.$settingsAdvanceContainer).addClass('display-Advance-Url');
        // add col 3
        this.$settingsAccountURLAction = $(domElem('div')).appendTo(this.$settingsAdvanceContainer).addClass('display-Advance-changename');
        this.$settingsAccountURLHyperLink = $(domElem('a')).appendTo(this.$settingsAccountURLAction).html("<a href='#'>Change</a>").addClass('a.hover');

        //Bind the click event.
        $(this.$settingsAccountURLHyperLink).bind('click', delegate(this, this._changeAccountUrl));

        this.$settingsAccountDeleteURLAction = $(domElem('div')).appendTo(this.$settingsAdvanceContainer).addClass('display-Advance');
        this.$settingsDeleteAccountHyperLink = $(domElem('a')).appendTo(this.$settingsAccountDeleteURLAction).html("<a href='#'>Delete Account</a>").addClass('a.hover');

        //Bind the click event.
        $(this.$settingsDeleteAccountHyperLink).bind('click', delegate(this, this._deleteAccount));
    }

    private _createApplicationCredentialsSection() {
        // This method will create UI for the application credentials section.

        // Create the container and header
        let settingsApplicationCredentialsControl = $(domElem('div')).addClass('settings-application-credentials-control');
        let settingsApplicationCredentialsHeader = $(domElem('div')).appendTo(settingsApplicationCredentialsControl)
            .addClass('settings-application-credentials-header')
            .text(AdminResources.ApplicationCredentials);

        $(domElem('div')).appendTo(settingsApplicationCredentialsControl).addClass('divider');

        // Create the basic auth setting
        let settingsBasicAuthDisabledContainer = $(domElem('div')).appendTo(settingsApplicationCredentialsControl).addClass('settings-auth-container');

        $(domElem('div'))
            .appendTo(settingsBasicAuthDisabledContainer)
            .addClass('settings-auth-label')
            .attr('id', 'allow-basic-auth-creds')
            .text(this._data.policies[AccountSettingsView.POLICY_BASICAUTH_NAME].description);

        this.$settingsBasicAuthDisabledContent = $(domElem('div')).appendTo(settingsBasicAuthDisabledContainer)
            .addClass('settings-basic-auth-disabled-content')
            .addClass('settings-auth-button')
            .attr('tabindex', '0')
            .attr('role', 'button');

        this.$settingsBasicAuthDisabledContent.click(delegate(this, this._basicAuthDisabledButtonClick));
        this.$settingsBasicAuthDisabledContent.bind('keyup', delegate(this, this._authButtonKeySupport));

        $(domElem('a')).appendTo(settingsBasicAuthDisabledContainer)
            .addClass('settings-auth-link')
            .attr('href', this._data.policies[AccountSettingsView.POLICY_BASICAUTH_NAME].learnMoreLink)
            .attr('target', '_blank')
            .text(AdminResources.LearnMore);

        // Create the oauth setting
        let settingsOAuthDisabledContainer = $(domElem('div')).appendTo(settingsApplicationCredentialsControl)
            .addClass('settings-auth-container');

        $(domElem('div')).appendTo(settingsOAuthDisabledContainer)
            .addClass('settings-auth-label')
            .attr('id', 'allow-oauth-creds')
            .text(this._data.policies[AccountSettingsView.POLICY_OAUTH_NAME].description);

        this.$settingsOAuthDisabledContent = $(domElem('div')).appendTo(settingsOAuthDisabledContainer)
            .addClass('settings-oauth-disabled-content')
            .addClass('settings-auth-button')
            .attr('tabindex', '0')
            .attr('role', 'button');

        this.$settingsOAuthDisabledContent.click(delegate(this, this._oAuthDisabledButtonClick));
        this.$settingsOAuthDisabledContent.bind('keyup', delegate(this, this._authButtonKeySupport));

        $(domElem('a')).appendTo(settingsOAuthDisabledContainer)
            .addClass('settings-auth-link')
            .attr('href', this._data.policies[AccountSettingsView.POLICY_OAUTH_NAME].learnMoreLink)
            .attr('target', '_blank')
            .text(AdminResources.LearnMore);

        // Create the public key auth setting
        let settingsPublicKeyDisabledContainer = $(domElem('div')).appendTo(settingsApplicationCredentialsControl)
            .addClass('settings-auth-container');

        $(domElem('div')).appendTo(settingsPublicKeyDisabledContainer)
            .addClass('settings-auth-label')
            .attr('id', 'disable-public-key')
            .text(this._data.policies[AccountSettingsView.POLICY_SSH_NAME].description);

        this.$settingsPublicKeyDisabledContent = $(domElem('div')).appendTo(settingsPublicKeyDisabledContainer)
            .addClass('settings-public-key-disabled-content')
            .addClass('settings-auth-button')
            .attr('tabindex', '0')
            .attr('role', 'button');

        this.$settingsPublicKeyDisabledContent.click(delegate(this, this._publicKeyDisabledButtonClick));
        this.$settingsPublicKeyDisabledContent.bind('keyup', delegate(this, this._authButtonKeySupport));

        $(domElem('a')).appendTo(settingsPublicKeyDisabledContainer)
            .addClass('settings-auth-link')
            .attr('href', this._data.policies[AccountSettingsView.POLICY_SSH_NAME].learnMoreLink)
            .attr('target', '_blank')
            .text(AdminResources.LearnMore);

        settingsApplicationCredentialsControl.insertBefore(this.$settingsAzureSubscriptionContainer)
    }

    private _createAccessPoliciesSection() {
        let settingsPPContainer: JQuery = null;

        if (this._showPPPolicyInformation) {
            // Create the container and header
            settingsPPContainer = $(domElem('div')).addClass('settings-pp-control');
            let settingsPPHeader = $(domElem('div')).appendTo(settingsPPContainer).addClass('settings-pp-header');
            settingsPPHeader.text(AdminResources.AccessPolicies);

            $(domElem('div')).appendTo(settingsPPContainer).addClass('divider');

            // Create the PP policy
            let settingsPPEnabledContainer = $(domElem('div')).appendTo(settingsPPContainer)
                .addClass('settings-auth-container');

            let settingsPolicyPPEnabledLabel = $(domElem('div')).appendTo(settingsPPEnabledContainer)
                .addClass('settings-auth-label')
                .attr('id', 'enable-pp-policy')
                .text(this._data.policies[AccountSettingsView.POLICY_PP_NAME].description);

            this.$settingsPolicyPPEnabledContent = $(domElem('div')).appendTo(settingsPPEnabledContainer)
                .addClass('settings-pp-enabled-content')
                .addClass('settings-auth-button')
                .attr('tabindex', '0')
                .attr('role', 'button');

            this.$settingsPolicyPPEnabledContent.click(delegate(this, this._policyPPEnabledButtonClick));
            this.$settingsPolicyPPEnabledContent.bind('keyup', delegate(this, this._authButtonKeySupport));

            let settingsPolicyPPEnabledInfoLink = $(domElem('a')).appendTo(settingsPPEnabledContainer)
                .addClass('settings-auth-link')
                .attr('href', this._data.policies[AccountSettingsView.POLICY_PP_NAME].learnMoreLink)
                .attr('target', '_blank')
                .text(AdminResources.LearnMore);
        }

        if (this._showOPPolicyInformation) {
            if (!settingsPPContainer) {
                // Create the container and header
                settingsPPContainer = $(domElem('div')).addClass('settings-pp-control');
                let settingsPPHeader = $(domElem('div')).appendTo(settingsPPContainer).addClass('settings-pp-header');
                settingsPPHeader.text(AdminResources.AccessPolicies);

                $(domElem('div')).appendTo(settingsPPContainer).addClass('divider');
            }

            // Create the OP policy
            let settingsOPEnabledContainer = $(domElem('div')).appendTo(settingsPPContainer)
                .addClass('settings-auth-container');

            let settingsPolicyOPEnabledLabel = $(domElem('div')).appendTo(settingsOPEnabledContainer)
                .addClass('settings-auth-label')
                .attr('id', 'enable-pp-policy')
                .text(this._data.policies[AccountSettingsView.POLICY_OP_NAME].description);

            this.$settingsPolicyOPEnabledContent = $(domElem('div')).appendTo(settingsOPEnabledContainer)
                .addClass('settings-pp-enabled-content')
                .addClass('settings-auth-button')
                .attr('tabindex', '0')
                .attr('role', 'button');

            this.$settingsPolicyOPEnabledContent.click(delegate(this, this._policyOPEnabledButtonClick));
            this.$settingsPolicyOPEnabledContent.bind('keyup', delegate(this, this._authButtonKeySupport));

            let settingsPolicyOPEnabledInfoLink = $(domElem('a'))
                .appendTo(settingsOPEnabledContainer)
                .addClass('settings-auth-link')
                .attr('href', this._data.policies[AccountSettingsView.POLICY_OP_NAME].learnMoreLink)
                .attr('target', '_blank')
                .text(AdminResources.LearnMore);
        }

        if (settingsPPContainer) {
            settingsPPContainer.insertBefore(this.$settingsAzureSubscriptionContainer);
        }
    }

    private _createBillingInformationSection() {
        //sets the stage for the azure subscription id / setup billing feature
        //the content will be populated after the ajax call returns - in selectInitialValues()
        this.$settingsAzureSubscriptionContainer = $(domElem('div')).addClass('settings-azuresub-container');
        this.$settingsAzureSubscriptionHeader = $(domElem('div')).appendTo(this.$settingsAzureSubscriptionContainer).addClass('settings-azuresub-header');
        this.$settingsHeaderDivider = $(domElem('div')).appendTo(this.$settingsAzureSubscriptionContainer).addClass('divider');
        this.$settingsAzureSubscriptionHeader.text(AdminResources.BillingInformationHeader);

        this.$settingsAzureSubscriptionText = $(domElem('div')).appendTo(this.$settingsAzureSubscriptionContainer).addClass('settings-azuresub-text');
        this.$settingsAzureSubscriptionContent = $(domElem('div')).appendTo(this.$settingsAzureSubscriptionContainer).addClass('settings-azuresub-content');
        this.$settingsAzureSubscriptionLinks = $(domElem('div')).appendTo(this.$settingsAzureSubscriptionContainer).addClass('settings-azuresub-link');
        this.$settingsAzureSubscriptionLink = $(domElem('a')).appendTo(this.$settingsAzureSubscriptionLinks);

        this.$settingsAzureSubscriptionContainer.appendTo(this._element);
    }

    private _createAccountAadSection() {
        this.$settingsAccountAadControl = $(domElem('div')).addClass('settings-AccountAad-control');
        var $settingsAccountAadHeader = $(domElem('div')).appendTo(this.$settingsAccountAadControl).addClass('settings-AccountAad-control-header');

        $settingsAccountAadHeader.text(AdminResources.MicrosoftAzureActiveDirectoryStatus);
        $(domElem('div')).appendTo(this.$settingsAccountAadControl).addClass('divider');

        if (this._accountAadInformationData.IsAadAccount) {
            this._createAadAccountUi();
        } else {
            this._createNonAadAccountUi();
        }

        this.$settingsAccountAadControl.appendTo($(".account-settings-container"));
    }

    private _createAadAccountUi() {
        // this is the row.
        var $settingsAccountAadContainer = $(domElem('div')).appendTo(this.$settingsAccountAadControl).addClass('settings-AccountAad-control-container');
        // add col 1
        var $settingsAccountAadTextLabel = $(domElem('div')).appendTo($settingsAccountAadContainer).addClass('display-AccountAad-label-AadAccount');
        if (this._accountAadInformationData.AccountAadTenantName) {
            $settingsAccountAadTextLabel.html(Utils_String.format(AdminResources.AccountBackedByAAD, this._accountAadInformationData.AccountAadTenantName));
        }
        else {
            $settingsAccountAadTextLabel.html(AdminResources.AccountBackedByAADNoTenant);
        }
    }

    private _createAadGuestUserPolicy() {
        // Create the guest user policy setting
        let settingsGuestUserDisabledContainer = $(domElem('div')).appendTo(this.$settingsAccountAadControl)
            .addClass('settings-auth-container');

        let settingsGuestUserDisabledLabel = $(domElem('div')).appendTo(settingsGuestUserDisabledContainer)
            .addClass('settings-auth-label')
            .attr('id', 'disable-guest-user-access')
            .text(this._data.policies[AccountSettingsView.POLICY_GUESTUSER_NAME].description);

        let guestUserPermissionValue = this._currentGuestUserDisabled ? AdminResources.Deny : AdminResources.Allow;
        let guestUserPermissionLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_GUESTUSER_NAME].description, guestUserPermissionValue);

        this.$settingsGuestUserDisabledContent = $(domElem('div')).appendTo(settingsGuestUserDisabledContainer)
            .addClass('settings-guest-user-disabled-content')
            .addClass('settings-auth-button')
            .attr('tabindex', '0')
            .attr('role', 'button')
            .text(guestUserPermissionValue)
            .attr('aria-label', guestUserPermissionLabel);

        this.$settingsGuestUserDisabledContent.click(delegate(this, this._guestUserDisabledButtonClick));
        this.$settingsGuestUserDisabledContent.bind('keyup', delegate(this, this._authButtonKeySupport));

        var $settingsGuestUserDisabledInfoLink = $(domElem('a')).appendTo(settingsGuestUserDisabledContainer)
            .addClass('settings-auth-link')
            .attr('href', this._data.policies[AccountSettingsView.POLICY_GUESTUSER_NAME].learnMoreLink)
            .attr('target', '_blank')
            .text(AdminResources.LearnMore);
    }

    private _createAadCapPolicy() {
        let aadCapEnabledContainer = $(domElem('div')).appendTo(this.$settingsAccountAadControl)
            .addClass('settings-auth-container');

        $(domElem('div')).appendTo(aadCapEnabledContainer)
            .addClass('settings-auth-label')
            .attr('id', 'aad-cap-validation')
            .text(this._data.policies[AccountSettingsView.POLICY_AADCAP_NAME].description);

        let aadCapEnabledValue = this._currentPolicyAADCAPEnabled ? AdminResources.On : AdminResources.Off;
        let aadCapEnabledLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_AADCAP_NAME].description, aadCapEnabledValue);

        this.$settingsAadCapEnabledContent = $(domElem('div')).appendTo(aadCapEnabledContainer)
            .addClass('settings-guest-user-disabled-content')
            .addClass('settings-auth-button')
            .attr('tabindex', '0')
            .attr('role', 'button')
            .text(aadCapEnabledValue)
            .attr('aria-label', aadCapEnabledLabel);

        this.$settingsAadCapEnabledContent.click(delegate(this, this._policyAadCapEnabledButtonClick));
        this.$settingsAadCapEnabledContent.bind('keyup', delegate(this, this._authButtonKeySupport));

        $(domElem('a')).appendTo(aadCapEnabledContainer)
            .addClass('settings-auth-link')
            .attr('href', this._data.policies[AccountSettingsView.POLICY_AADCAP_NAME].learnMoreLink)
            .attr('target', '_blank')
            .text(AdminResources.LearnMore);
    }

    private _createNonAadAccountUi() {
        // this is the row.
        var $settingsAccountAadContainer = $(domElem('div')).appendTo(this.$settingsAccountAadControl).addClass('settings-AccountAad-control-container');
        // add col 1
        var $settingsAccountAadTextLabel = $(domElem('div')).appendTo($settingsAccountAadContainer).addClass('display-AccountAad-label-AadAccount');
        $settingsAccountAadTextLabel.html(AdminResources.ThisAccountNotAAD + Utils_String.format("<a href='{0}' target='_blank'>{1}</a>", AdminResources.LearnMoreAADFLink, AdminResources.LearnMoreAAD));
    }

    private _changeAccountUrl() {
        Dialogs.show(TFS_Admin_Dialogs.RenameAccountDialog);
    }

    private _deleteAccount() {
        Dialogs.show(TFS_Admin_Dialogs.DeleteAccountDialog, { AccountName: this._accountName });
    }

    private _registerEvents() {
        /// <summary>Hook to UI events</summary>
        this.$settingsTimeZoneCombo.bind('change', delegate(this, this._onSettingsChanged));
        this.$settingsPrivacyUrlValue.bind('input', delegate(this, this._onSettingsChanged));
        this._bind(IdentityPicker.IdentityPickerSearchControl.VALID_INPUT_EVENT, delegate(this, this._onSettingsChanged));
        this._bind(IdentityPicker.IdentityPickerSearchControl.INVALID_INPUT_EVENT, delegate(this, this._onSettingsChanged));
        this._bind(IdentityPicker.IdentityPickerSearchControl.SEARCH_STARTED_EVENT, delegate(this, this._showProgressCursor));
        this._bind(IdentityPicker.IdentityPickerSearchControl.SEARCH_FINISHED_EVENT, delegate(this, this._stopProgressCursor));
    }

    private _showProgressCursor() {
        $("body").addClass("busy-cursor");
    }

    private _stopProgressCursor() {
        $("body").removeClass("busy-cursor");
    }

    private _showIdentityPickerBox() {
        this.$settingsOwnerChangeLink.hide();
        this.$settingsNewOwnerLabel.show();
        this.$settingsOwnerSearchContainer.show();
    }

    private _authButtonKeySupport(e?: any) {
        if (e !== null) {
            var target: JQuery = $(e.target);
            if (e.keyCode === $.ui.keyCode.ENTER) {
                target.click();
            }
        }
    }

    private _createAriaLabel(permissionDisplayName: string, permissionValue: string): string {
        return Utils_String.format(AdminResources.PermissionLabel, permissionDisplayName, permissionValue);
    }

    private _oAuthDisabledButtonClick(e?: Event) {
        var target: JQuery = $(e.target).closest('div');

        this._currentOAuthDisabled = !this._currentOAuthDisabled;

        let permissionValue = this._currentOAuthDisabled ? AdminResources.Deny : AdminResources.Allow;
        let permissionLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_OAUTH_NAME].description, permissionValue);

        this.$settingsOAuthDisabledContent
            .text(permissionValue)
            .attr('aria-label', permissionLabel)
            .attr('title', AdminResources.PermissionTitle);
        Utils_Accessibility.announce(permissionLabel);

        if (this._currentOAuthDisabled !== this._initialOAuthDisabled) {
            this.$settingsOAuthDisabledContent.addClass('settings-auth-button-dirty');
        } else {
            this.$settingsOAuthDisabledContent.removeClass('settings-auth-button-dirty');
        }

        this._invalidateToolbarState();
    }

    private _basicAuthDisabledButtonClick(e?: Event) {
        var target: JQuery = $(e.target).closest('div');

        this._currentBasicAuthDisabled = !this._currentBasicAuthDisabled;

        let permissionValue = this._currentBasicAuthDisabled ? AdminResources.Deny : AdminResources.Allow;
        let permissionLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_BASICAUTH_NAME].description, permissionValue);

        this.$settingsBasicAuthDisabledContent
            .text(permissionValue)
            .attr('aria-label', permissionLabel)
            .attr('title', AdminResources.PermissionTitle);
        Utils_Accessibility.announce(permissionLabel);

        if (this._currentBasicAuthDisabled !== this._initialBasicAuthDisabled) {
            this.$settingsBasicAuthDisabledContent.addClass('settings-auth-button-dirty');
        } else {
            this.$settingsBasicAuthDisabledContent.removeClass('settings-auth-button-dirty');
        }

        this._invalidateToolbarState();
    }

    private _guestUserDisabledButtonClick(e?: Event) {
        var target: JQuery = $(e.target).closest('div');

        this._currentGuestUserDisabled = !this._currentGuestUserDisabled;

        let permissionValue = this._currentGuestUserDisabled ? AdminResources.Deny : AdminResources.Allow;
        let permissionLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_GUESTUSER_NAME].description, permissionValue);

        this.$settingsGuestUserDisabledContent
            .text(permissionValue)
            .attr('aria-label', permissionLabel)
            .attr('title', AdminResources.PermissionTitle);
        Utils_Accessibility.announce(permissionLabel);

        if (this._currentGuestUserDisabled !== this._initialGuestUserDisabled) {
            this.$settingsGuestUserDisabledContent.addClass('settings-auth-button-dirty');
        } else {
            this.$settingsGuestUserDisabledContent.removeClass('settings-auth-button-dirty');
        }

        this._invalidateToolbarState();
    }

    private _publicKeyDisabledButtonClick(e?: Event) {
        var target: JQuery = $(e.target).closest('div');

        this._currentPublicKeyDisabled = !this._currentPublicKeyDisabled;

        let permissionValue = this._currentPublicKeyDisabled ? AdminResources.Deny : AdminResources.Allow;
        let permissionLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_SSH_NAME].description, permissionValue);

        this.$settingsPublicKeyDisabledContent
            .text(permissionValue)
            .attr('aria-label', permissionLabel)
            .attr('title', AdminResources.PermissionTitle);
        Utils_Accessibility.announce(permissionLabel);

        if (this._currentPublicKeyDisabled !== this._initialPublicKeyDisabled) {
            this.$settingsPublicKeyDisabledContent.addClass('settings-auth-button-dirty');
        } else {
            this.$settingsPublicKeyDisabledContent.removeClass('settings-auth-button-dirty');
        }

        this._invalidateToolbarState();
    }

    private _policyPPEnabledButtonClick(e?: Event) {
        var target: JQuery = $(e.target).closest('div');

        this._currentPolicyPPEnabled = !this._currentPolicyPPEnabled;

        let permissionValue = this._currentPolicyPPEnabled ? AdminResources.Allow : AdminResources.Deny;
        let permissionLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_PP_NAME].description, permissionValue);

        this.$settingsPolicyPPEnabledContent
            .text(permissionValue)
            .attr('aria-label', permissionLabel)
            .attr('title', AdminResources.PermissionTitle);
        Utils_Accessibility.announce(permissionLabel);

        if (this._currentPolicyPPEnabled !== this._initialPolicyPPEnabled) {
            this.$settingsPolicyPPEnabledContent.addClass('settings-auth-button-dirty');
        } else {
            this.$settingsPolicyPPEnabledContent.removeClass('settings-auth-button-dirty');
        }

        this._invalidateToolbarState();
    }

    private _policyOPEnabledButtonClick(e?: Event) {
        var target: JQuery = $(e.target).closest('div');

        this._currentPolicyOPEnabled = !this._currentPolicyOPEnabled;

        let permissionValue = this._currentPolicyOPEnabled ? AdminResources.Allow : AdminResources.Deny;
        let permissionLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_OP_NAME].description, permissionValue);

        this.$settingsPolicyOPEnabledContent
            .text(permissionValue)
            .attr('aria-label', permissionLabel)
            .attr('title', AdminResources.PermissionTitle);
        Utils_Accessibility.announce(permissionLabel);

        if (this._currentPolicyOPEnabled !== this._initialPolicyOPEnabled) {
            this.$settingsPolicyOPEnabledContent.addClass('settings-auth-button-dirty');
        } else {
            this.$settingsPolicyOPEnabledContent.removeClass('settings-auth-button-dirty');
        }

        this._invalidateToolbarState();
    }

    private _policyAadCapEnabledButtonClick(e?: Event) {
        var target: JQuery = $(e.target).closest('div');

        this._currentPolicyAADCAPEnabled = !this._currentPolicyAADCAPEnabled;

        let policyValue = this._currentPolicyAADCAPEnabled ? AdminResources.On : AdminResources.Off;
        let policyLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_AADCAP_NAME].description, policyValue);

        this.$settingsAadCapEnabledContent
            .text(policyValue)
            .attr('aria-label', policyLabel)
            .attr('title', AdminResources.PermissionTitle);
        Utils_Accessibility.announce(policyValue);

        if (this._currentPolicyAADCAPEnabled !== this._initialPolicyAADCAPEnabled) {
            this.$settingsAadCapEnabledContent.addClass('settings-auth-button-dirty');
        } else {
            this.$settingsAadCapEnabledContent.removeClass('settings-auth-button-dirty');
        }

        this._invalidateToolbarState();
    }

    private _resetPolicies() {
        let permissionValue = this._currentOAuthDisabled ? AdminResources.Deny : AdminResources.Allow;
        let permissionLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_OAUTH_NAME].description, permissionValue);

        this.$settingsOAuthDisabledContent
            .text(permissionValue)
            .attr('aria-label', permissionLabel)
            .attr('title', AdminResources.PermissionTitle)
            .removeClass('settings-auth-button-dirty');
        Utils_Accessibility.announce(permissionLabel);

        permissionValue = this._currentBasicAuthDisabled ? AdminResources.Deny : AdminResources.Allow;
        permissionLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_BASICAUTH_NAME].description, permissionValue);

        this.$settingsBasicAuthDisabledContent
            .text(permissionValue)
            .attr('aria-label', permissionLabel)
            .attr('title', AdminResources.PermissionTitle)
            .removeClass('settings-auth-button-dirty');
        Utils_Accessibility.announce(permissionLabel);

        permissionValue = this._currentPublicKeyDisabled ? AdminResources.Deny : AdminResources.Allow;
        permissionLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_SSH_NAME].description, permissionValue);

        this.$settingsPublicKeyDisabledContent
            .text(permissionValue)
            .attr('aria-label', permissionLabel)
            .attr('title', AdminResources.PermissionTitle)
            .removeClass('settings-auth-button-dirty');
        Utils_Accessibility.announce(permissionLabel);

        if (tfsContext.isAADAccount) {
            permissionValue = this._currentGuestUserDisabled ? AdminResources.Deny : AdminResources.Allow;
            permissionLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_GUESTUSER_NAME].description, permissionValue);

            this.$settingsGuestUserDisabledContent
                .text(permissionValue)
                .attr('aria-label', permissionLabel)
                .attr('title', AdminResources.PermissionTitle)
                .removeClass('settings-auth-button-dirty');
            Utils_Accessibility.announce(permissionLabel);
        }

        if (this._showPPPolicyInformation) {
            permissionValue = this._currentPolicyPPEnabled ? AdminResources.Allow : AdminResources.Deny;
            permissionLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_PP_NAME].description, permissionValue);

            this.$settingsPolicyPPEnabledContent
                .text(permissionValue)
                .attr('aria-label', permissionLabel)
                .attr('title', AdminResources.PermissionTitle)
                .removeClass('settings-auth-button-dirty');
            Utils_Accessibility.announce(permissionLabel);
        }

        if (this._showOPPolicyInformation) {
            permissionValue = this._currentPolicyOPEnabled ? AdminResources.Allow : AdminResources.Deny;
            permissionLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_OP_NAME].description, permissionValue);

            this.$settingsPolicyOPEnabledContent
                .text(permissionValue)
                .attr('aria-label', permissionLabel)
                .attr('title', AdminResources.PermissionTitle)
                .removeClass('settings-auth-button-dirty');
            Utils_Accessibility.announce(permissionLabel);
        }

        if (this._showAADCAPPolicyInformation) {
            let policyValue = this._currentPolicyAADCAPEnabled ? AdminResources.On : AdminResources.Off;
            let policyLabel = this._createAriaLabel(this._data.policies[AccountSettingsView.POLICY_AADCAP_NAME].description, policyValue)
            this.$settingsAadCapEnabledContent
                .text(policyValue)
                .attr('aria-label', policyLabel)
                .attr('title', AdminResources.PermissionTitle)
                .removeClass('settings-auth-button-dirty');
            Utils_Accessibility.announce(policyLabel);
        }

    }

    private _createMessageArea() {
        /// <summary>Creates the error message area</summary>

        this._messageArea = <Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $(".message-area", this.getElement()), {
            closeable: true
        });
    }

    private _setError(message: any) {
        /// <summary>Show information to the user in the message area</summary>
        /// <param name="message" type="Object">The message (String or Object) to display</param>
        /// <param name="type" type="Notifications.MessageAreaType" optional="true">OPTIONAL: The type of message (e.g. Warning, Error)</param>

        Diag.Debug.assertParamIsString(message, "message");
        this._messageArea.setMessage(message, Notifications.MessageAreaType.Error);
    }

    private _clearError() {
        /// <summary>Clears the information area</summary>
        this._messageArea.clear();
    }

    private _createToolbar() {
        /// <summary>Creates the toolbar</summary>

        this._toolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $(".toolbar", this.getElement()), {
            items: this._createToolbarItems(),
            executeAction: delegate(this, this._onToolbarItemClick)
        });

        this._invalidateToolbarState();
    }

    private _createToolbarItems() {
        /// <summary>Creates the menu items used in the capacity planning view toolbar</summary>
        return <any[]>[
            { id: AccountSettingsView.TOOLBAR_CMD_SAVE, title: AdminResources.Save, showText: false, icon: "icon-save" },
            { id: AccountSettingsView.TOOLBAR_CMD_UNDO, title: AdminResources.Undo, showText: false, icon: "icon-undo" }];
    }

    private _invalidateToolbarState() {
        /// <summary>Updates toolbar items based on locally cached states</summary>
        /// <param name="disableToolbar" type="Boolean" optional="true">OPTIONAL: If set to true disables all toolbar items</param>
        this._toolbar.updateCommandStates([
            { id: AccountSettingsView.TOOLBAR_CMD_SAVE, disabled: !this.isDirty() },
            { id: AccountSettingsView.TOOLBAR_CMD_UNDO, disabled: !this.isDirty() }
        ]);
    }

    private _onToolbarItemClick(e?: any) {
        /// <summary>Handler for toolbar menu item click</summary>
        /// <param name="e" type="Object">Event args</param>
        Diag.Debug.assertParamIsObject(e, "e");

        var command = e.get_commandName();

        switch (command) {
            case AccountSettingsView.TOOLBAR_CMD_SAVE:
                this._onSave();
                break;
            case AccountSettingsView.TOOLBAR_CMD_UNDO:
                this._onUndo();
                break;
            default:
                Diag.Debug.fail("Toolbar command was not an expected string");
                break;
        }
    }

    private _retrieveAndPopulateSettings() {
        /// <summary>Retrives the account settings from the server and populates the UI</summary>

        var that = this;

        TFS_Core_Ajax.getMSJSON(
            tfsContext.getActionUrl('GetAccountSettings', 'account', { area: 'api' }),
            null, // takes no input params
            async function (data) {
                await that._populate(data);
            });
    }

    private async _populate(data: any) {
        /// <summary>Populates the based on settings data</summary>
        /// <param name="data" type="any">Account settings data (see AccountSettingsModel.cs)</param>

        this._data = data;

        this._initialTimeZoneId = data.timeZoneId;
        this._currentTimeZoneId = data.timeZoneId;
        this._allTimeZones = data.allTimeZones;
        this._initialAccountOwnerId = data.accountOwnerId;
        this._currentAccountOwnerId = data.accountOwnerId;
        this._currentPrivacyUrl = this._initialPrivacyUrl = data.privacyUrl;
        this._ownerIdentity = data.ownerIdentity;
        this._accountUrl = data.accountUrl;
        this._accountName = data.accountName;
        this._subscriptionId = data.subscriptionId;
        this._azuredevopsDomainUrls = data.codexDomainUrls;
        this._targetAccountUrl = data.targetAccountUrl;
        this._initialOAuthDisabled = this._currentOAuthDisabled = data.policies[AccountSettingsView.POLICY_OAUTH_NAME].value;
        this._initialBasicAuthDisabled = this._currentBasicAuthDisabled = data.policies[AccountSettingsView.POLICY_BASICAUTH_NAME].value;
        this._initialGuestUserDisabled = this._currentGuestUserDisabled = data.policies[AccountSettingsView.POLICY_GUESTUSER_NAME].value;
        this._initialPublicKeyDisabled = this._currentPublicKeyDisabled = data.policies[AccountSettingsView.POLICY_SSH_NAME].value;
        this._initialPolicyAADCAPEnabled = this._currentPolicyAADCAPEnabled = data.policies[AccountSettingsView.POLICY_AADCAP_NAME].value;

        this._showOPPolicyInformation = tfsContext.isAADAccount && data.policies[AccountSettingsView.POLICY_OP_NAME];

        this._showAADCAPPolicyInformation = tfsContext.isAADAccount && data.policies[AccountSettingsView.POLICY_AADCAP_NAME];

        if (this._showPPPolicyInformation) {
            this._initialPolicyPPEnabled = this._currentPolicyPPEnabled = data.policies[AccountSettingsView.POLICY_PP_NAME].value;
        }

        if (this._showOPPolicyInformation) {
            this._initialPolicyOPEnabled = this._currentPolicyOPEnabled = data.policies[AccountSettingsView.POLICY_OP_NAME].value;
        }

        // Populate time zones combo
        this._timeZoneCombo.setSource($.map(this._allTimeZones, function (timeZone) {
            return timeZone.DisplayName;
        }));

        this.$settingsCurrentOwnerContent.text(this._ownerIdentity.FriendlyDisplayName + (this._ownerIdentity.MailAddress ? " (" + this._ownerIdentity.MailAddress + ")" : ""));

        this._createApplicationCredentialsSection();

        //populate the AAD guest user policy setting
        if (tfsContext.isAADAccount) {
            this._createAadGuestUserPolicy();
        }

        if (this._showAADCAPPolicyInformation) {
            this._createAadCapPolicy();
        }

        //populate access policies
        this._createAccessPoliciesSection();

        this._selectInitialValues();

        if (data.accountRegion == '') {
            this.$settingsRegionLabel.hide();
        } else {
            this.$settingsRegionValue.html(data.accountRegion);
        }

        this._subscriptionIdDiv.text(this._subscriptionId);
        this._subscriptionIdDiv.hide();

        // If 'null' then FF is disabled and migration should be hidden in UI
        if (this._azuredevopsDomainUrls != null && this._azuredevopsDomainUrls != undefined) {
            const codexDomainUrls = this._azuredevopsDomainUrls;
            const accountName = this._accountName;
            const currentAccountUrl = this._accountUrl;
            const targetAccountUrl = this._targetAccountUrl;

            let linkState = await this._getMigrationControlState(codexDomainUrls);
            if (linkState.showControl) {
                let settingsChangeDomainUrlAction = $(domElem('div')).appendTo(this.$settingsAdvanceContainer).addClass('display-Advance');

                if (linkState.enableControl) {
                    const text = Utils_String.format(AdminResources.ChangeDomainLink, this._getAccountDisplayName(targetAccountUrl));
                    $(domElem('a')).appendTo(settingsChangeDomainUrlAction).text(text).addClass('hover').click(function (e) {
                        Dialogs.show(TFS_Admin_Dialogs.ChangeAccountDomainUrlDialog, { CodexDomainUrls: codexDomainUrls, AccountName: accountName, CurrentAccountUrl: currentAccountUrl, TargetAccountUrl: targetAccountUrl });
                    });
                }
                else {
                    $(domElem('span')).appendTo(settingsChangeDomainUrlAction).text(AdminResources.ChangeDomainInProgress).addClass('newdomain-disabled-link');
                }
            }
        }
    }

    private _getAccountDisplayName(accountUrl: string): string {
        let uri = Uri.parse(accountUrl);

        let path = uri.path;
        while (path && path.endsWith('/')) {
            path = path.slice(0, -1);
        }

        if (path) {
            return uri.host + '/' + path;
        }
        else {
            return uri.host;
        }
    }

    private async _getMigrationControlState(codexDomainUrls: boolean): Promise<{ showControl: boolean, enableControl: boolean }> {
        try {
            let migrationClient = DomainUrlMigrationRestClient.getClient();
            let status = await migrationClient.getStatus();
            return { showControl: true, enableControl: this._migrationCompleted(status) };
        }
        catch (e) {
            let serverError = e.serverError;
            if (serverError && serverError.typeKey == 'ServicingOrchestrationEntryDoesNotExistException') {
                // For accounts under the new domain hide UI if migration never happened before
                // We do not want peope migrating to the old domain if account was created under the new domain at first place
                return { showControl: !codexDomainUrls, enableControl: true };
            } else {
                // For any unexpected errors just hide control
                console.error(e);
                return { showControl: false, enableControl: false };
            }
        }
    }

    private _migrationCompleted(status: OrchestrationContracts.ServicingOrchestrationRequestStatus) {
        switch (status.status) {
            case OrchestrationContracts.ServicingOrchestrationStatus.Created:
            case OrchestrationContracts.ServicingOrchestrationStatus.Completed:
            case OrchestrationContracts.ServicingOrchestrationStatus.Failed:
                return true;
            default:
                return false;
        }
    }

    private _selectInitialValues() {
        /// <summary>Ensures initial values are select in the Account Settings controls</summary>
        this._identityPickerSearchControl.clear();

        // this will show the privacy url
        this.$settingsPrivacyUrlValue.val(this._initialPrivacyUrl);

        let initialIndex: number = 0;
        for (let i = 0, l = this._allTimeZones.length; i < l; i++) {
            if (this._allTimeZones[i].Id === this._initialTimeZoneId) {
                initialIndex = i;
            }
        }

        this._timeZoneCombo.setSelectedIndex(initialIndex, true);

        // this will show the account URL.
        $(this.$settingsAccountURLValue).text(this._accountUrl);

        // revert the current values to initial values
        this._currentTimeZoneId = this._initialTimeZoneId;
        this._currentAccountOwnerId = this._initialAccountOwnerId;
        this._currentPrivacyUrl = this._initialPrivacyUrl;

        //populate the auth settings
        this._currentOAuthDisabled = this._initialOAuthDisabled;
        this._currentBasicAuthDisabled = this._initialBasicAuthDisabled;
        this._currentGuestUserDisabled = this._initialGuestUserDisabled;
        this._currentPublicKeyDisabled = this._initialPublicKeyDisabled;
        this._currentPolicyPPEnabled = this._initialPolicyPPEnabled;
        this._currentPolicyOPEnabled = this._initialPolicyOPEnabled;
        this._currentPolicyAADCAPEnabled = this._initialPolicyAADCAPEnabled;

        this._resetPolicies();

        //populate the azure subscription Id or show the setup billing message
        if (this._subscriptionId == null || this._subscriptionId == 'null') {
            this.$settingsAzureSubscriptionText.text(AdminResources.SetUpBillingText);
            this.$settingsAzureSubscriptionContent.hide();
            this.$settingsAzureSubscriptionLink.html(Utils_String.format("<a href='{0}' target='_blank'>{1}</a>", AdminResources.SetUpBillingFwdLink, AdminResources.SetUpBillingLinkText));
        } else {
            this.$settingsAzureSubscriptionText.text(AdminResources.AzureSubscriptionId);
            this.$settingsAzureSubscriptionContent.text(this._subscriptionId);
            this.$settingsAzureSubscriptionLink.html(Utils_String.format("<a href='{0}' target='_blank'>{1}</a>", AdminResources.ManageAzureSubscriptionLink, AdminResources.ManageAzureSubscriptionLinkText));
        }
    }

    private _onSettingsChanged() {
        /// <summary>handler for setting changes, re-evaluate the dirty state</summary>
        var index;

        index = this._timeZoneCombo.getSelectedIndex();

        this._currentTimeZoneId = index > -1 ? this._allTimeZones[index].Id : null;

        this._currentPrivacyUrl = this.$settingsPrivacyUrlValue.val();

        var returnedUserObject = this._identityPickerSearchControl.getIdentitySearchResult();
        this._currentAccountOwnerId = this._initialAccountOwnerId;
        this._currentAccountOwner = null;
        if ((!returnedUserObject.unresolvedQueryTokens || returnedUserObject.unresolvedQueryTokens.length == 0) && returnedUserObject.resolvedEntities && returnedUserObject.resolvedEntities.length > 0) {
            this._currentAccountOwnerId = returnedUserObject.resolvedEntities[0].localId;
            this._currentAccountOwner = returnedUserObject.resolvedEntities[0];
        }

        this._clearError();

        this._invalidateToolbarState();
    }

    private _onSave() {
        /// <summary>Saves the changes to account settings</summary>
        var that = this;

        this._clearError();

        TFS_Core_Ajax.postMSJSON(
            tfsContext.getActionUrl('UpdateAccountSettings', 'account', { area: 'api' }),
            {
                timeZoneId: that._currentTimeZoneId === that._initialTimeZoneId ? "" : that._currentTimeZoneId,
                accountOwnerId: that._currentAccountOwnerId === that._initialAccountOwnerId ? "" : that._currentAccountOwnerId,
                privacyUrl: that._currentPrivacyUrl === that._initialPrivacyUrl ? null : that._currentPrivacyUrl,
                basicAuthDisabled: that._currentBasicAuthDisabled === that._initialBasicAuthDisabled ? null : that._currentBasicAuthDisabled,
                oAuthDisabled: that._currentOAuthDisabled === that._initialOAuthDisabled ? null : that._currentOAuthDisabled,
                guestUserDisabled: that._currentGuestUserDisabled === that._initialGuestUserDisabled ? null : that._currentGuestUserDisabled,
                publicKeyDisabled: that._currentPublicKeyDisabled === that._initialPublicKeyDisabled ? null : that._currentPublicKeyDisabled,
                policyPPEnabled: that._currentPolicyPPEnabled === that._initialPolicyPPEnabled ? null : that._currentPolicyPPEnabled,
                policyOPEnabled: that._currentPolicyOPEnabled === that._initialPolicyOPEnabled ? null : that._currentPolicyOPEnabled,
                policyEnforceConditionalAccessPolicy: that._currentPolicyAADCAPEnabled === that._initialPolicyAADCAPEnabled
                    ? null : that._currentPolicyAADCAPEnabled
            },
            function (data) {
                that._initialTimeZoneId = that._currentTimeZoneId;
                that._initialAccountOwnerId = that._currentAccountOwnerId;
                that._initialPrivacyUrl = that._currentPrivacyUrl;
                if (that._currentAccountOwner) {
                    that.$settingsCurrentOwnerContent.text(that._currentAccountOwner.displayName.trim() + " (" + that._currentAccountOwner.signInAddress.trim() + ")");
                    that.$settingsOwnerChangeLink.show();
                    that.$settingsNewOwnerLabel.hide();
                    that.$settingsOwnerSearchContainer.hide();
                    that._identityPickerSearchControl.addIdentitiesToMru([that._currentAccountOwner]);
                }
                that._initialOAuthDisabled = that._currentOAuthDisabled;
                that._initialBasicAuthDisabled = that._currentBasicAuthDisabled;
                that._initialGuestUserDisabled = that._currentGuestUserDisabled;
                that._initialPublicKeyDisabled = that._currentPublicKeyDisabled;
                that._initialPolicyPPEnabled = that._currentPolicyPPEnabled;
                that._initialPolicyOPEnabled = that._currentPolicyOPEnabled;
                that._initialPolicyAADCAPEnabled = that._currentPolicyAADCAPEnabled;
                that._onUndo();
            },
            function (error) {
                that._invalidateToolbarState();
                that._setError(error.message);
            },
            {
                tracePoint: 'UpdateAccountSettings.btnSaveChanges.Success',
                wait: {
                    target: this.getElement()
                }
            }
        );
    }

    public _onUndo() {
        /// <summary>Revert changes to account settings</summary>
        this._clearError();
        this._selectInitialValues();
        this._invalidateToolbarState();
    }

    private _addRow(label, combo, $table) {
        /// <summary>Helper method to add rows to the layout table</summary>

        var $tr, $td;
        $tr = $(domElem('tr')).appendTo($table);
        $td = $(domElem('td')).appendTo($tr);
        $(domElem('span')).appendTo($td).text(label);
        $td = $(domElem('td')).appendTo($tr).addClass('settings-control-column-width');
        combo.appendTo($td);

        return $tr;
    }

    private _addtableRow(labeldiv, element, $table) {
        /// <summary>Helper method to add rows to the layout table</summary>

        var $tr, $td;
        $tr = $(domElem('tr')).appendTo($table);
        $td = $(domElem('td')).appendTo($tr);
        labeldiv.appendTo($td);
        $td = $(domElem('td')).appendTo($tr).addClass('settings-control-column-width');
        element.appendTo($td);

        return $tr;
    }
}

VSS.initClassPrototype(AccountSettingsView, {
    _timeZoneCombo: null,
    _accountOwnerCombo: null,
    _basicAuthDisabledBox: null,
    _oAuthDisabledBox: null,
    _toolbar: null,
    _messageArea: null,
    _initialTimeZoneId: null,
    _currentTimeZoneId: null,
    _allTimeZones: null,
    _initialAccountOwnerId: null,
    _currentAccountOwnerId: null,
    _ownerIdentity: null,
    _accountUrl: null,
    _initialOAuthDisabled: null,
    _currentOAuthDisabled: null,
    _initialBasicAuthDisabled: null,
    _currentBasicAuthDisabled: null,
    _initialGuestUserDisabled: null,
    _currentGuestUserDisabled: null,
    _initialPolicyPPEnabled: null,
    _currentPolicyPPEnabled: null,
    _initialPolicyOPEnabled: null,
    _currentPolicyOPEnabled: null
});

Controls.Enhancement.registerEnhancement(AccountSettingsView, ".account-settings-container")

class MemberInformationView extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.admin.memberinformationview";

    private _currentIdentity: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._currentIdentity = this._options.currentIdentity;
        this._bindEvents();
    }

    private _bindEvents() {
        this.getElement().find('.edit-profile-image-action').click(delegate(this, this._changeProfileImage));
    }

    private _changeProfileImage() {
        Dialogs.show(TFS_Admin_Dialogs.ChangeImageDialog, {
            tfid: this._currentIdentity.TeamFoundationId,
            isGroup: this._currentIdentity.IdentityType !== 'user'
        });
        return false;
    }

    private _onIdentityDeleted() {
        this._fire('identity-deleted');
    }

    private _onIdentityChanged() {
        this._fire('identity-changed');
    }
}

VSS.initClassPrototype(MemberInformationView, {
    _currentIdentity: null
});

export class ManageIdentitiesView extends SecurityOM.SecurityBaseView {
    public static enhancementTypeName: string = 'tfs.admin.ManageIdentitiesView';

    private _manageViewTabs: any;
    private _changeViewFilters: any;
    private _tabsDisabled: boolean;
    private _currentIdentity: any;
    private _popupMenu: any;
    private _createGroupButton: JQuery;

    public $contentTitleLabel: any;
    public $contentTitleImage: any;

    constructor(options?) {
        super($.extend({
            tfsContext: options && options.tfsContext ? options.tfsContext : tfsContext,
            defaultFilter: options && options.defaultFilter ? options.defaultFilter : 'groups'
        }, options));
    }

    public initialize() {
        var that = this;

        this._options.isTeam = tfsContext.navigation.team;
        super.initialize();

        if (TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
            $('.hub-pivot-content', '.left-hub-content').css('top', '0px');
        }

        this._attachNavigation();

        this._createGroupButton = $('#manage-identities-create-group', this._element);
        this._createGroupButton
            .text(AdminResources.CreateGroup)
            .bind('click', delegate(this, this._onCreateGroupButtonPressed));

        if ($(".show-single-pca-warning").length > 0
            && <boolean>Utils_Core.parseMSJSON($(".show-single-pca-warning").html(), false)) {
            const hubTitle = $('.hub-title', this._element);

            const banner = $(domElem("div"))
                .addClass("admin-security-banner message-area-control warning-message")
                .html(AdminResources.OnePCAWarning)
                .insertBefore(hubTitle);

            this._element.find(".right-hub-content").addClass("has-banner");
            this._element.find(".hub-progress").addClass("has-banner");
        } else {
            this._element.find(".right-hub-content").removeClass("has-banner");
            this._element.find(".hub-progress").removeClass("has-banner");
        }

        this.$contentTitleLabel = $('.hub-title .label', this.getElement());
        this.$contentTitleImage = $('.hub-title .image', this.getElement());

        this._manageViewTabs = $('.manage-view-tabs', this.getElement()).bind('changed', sender => {
            var currentIdentity = that._mainIdentityGrid.getCurrentIdentity();
            if (currentIdentity) {
                that._fire('identitySelected', currentIdentity);
            }
        });

        if (TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
            this.getElement().bind('member-added', delegate(this, this._onIdentityAdded));
        }
        this.getElement().bind('identity-deleted', delegate(this, this._onIdentityDeleted));
        this.getElement().bind('identity-changed', delegate(this, this._onIdentityChanged));
        if (tfsContext.isHosted) {
            this.getElement().bind('identity-aad-added', delegate(this, this._onAadIdentityAdded));
        }

        // Set default filter.  On team context, there is no changeViewFilter.
        this._changeFilter(this._options.defaultFilter);

        var filterElem = $('.change-groups-filter', this.getElement());
        if (filterElem.length) {
            this._changeViewFilters = <Navigation.PivotView>Controls.Enhancement.enhance(Navigation.PivotView, filterElem);
            this._bind(filterElem, "changed", function (sender, item) {
                that._changeFilter(item.id);
            });
        }

        this._bind(window, "resize", delegate(this, this._onContainerResize));

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.ADMIN_EX_AREA,
                Admin.CustomerIntelligenceConstants.Process.MANAGE_IDENTITIES_VIEW,
                {
                    "event": "initializeManageIdentitiesView",
                }));

        Diag.logTracePoint("Manage.Initialize");
    }

    public _onContainerResize() {
        var textDiv, menuDiv, newWidth;
        if (this.$contentTitleLabel) {
            menuDiv = this.$contentTitleLabel.find('.group-actions');
            if (menuDiv && menuDiv.length > 0) {
                textDiv = this.$contentTitleLabel.find('.title-text');
                newWidth = this.$contentTitleLabel.width() - menuDiv.outerWidth(true);
                textDiv.width('');
                textDiv.width(Math.min((textDiv.outerWidth(true) + 2), newWidth));
            }
        }
    }

    private _onIdentityDeleted() {
        this._RefreshFilter();
    }

    private _onIdentityAdded() {
        this._mainIdentityGrid.setRefreshMembers(false);
        this._changeFilter('groups', true);
    }

    private _onAadIdentityAdded() {
        this._options.identityToSelect = this._mainIdentityGrid.getCurrentIdentity().TeamFoundationId;
        this._changeFilter('groups');
    }

    private _RefreshFilter() {
        // Refresh filter
        var identityType = this._mainIdentityGrid.getCurrentIdentity().IdentityType;
        if (identityType === 'user' && !TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
            this._changeFilter('users');
        } else {
            this._changeFilter('groups');
        }
    }

    private _onIdentityChanged() {
        // Click on selected group
        this._mainIdentityGrid.setSelectedRowIndex(this._mainIdentityGrid._selectedIndex);
    }

    public _onIdentitySelected(identity) {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.ADMIN_EX_AREA,
                Admin.CustomerIntelligenceConstants.Process.MANAGE_IDENTITIES_VIEW,
                {
                    "event": "identitySelected",
                }));

        var i, tabs, selectedView, selectedViewId, gridContainer, options;

        tabs = <Navigation.PivotView>Controls.Enhancement.ensureEnhancement(Navigation.PivotView, this._manageViewTabs);
        this._identityInfoDiv.empty();
        this.$contentTitleLabel.empty();
        this.$contentTitleImage.empty();

        // Hide tabs if no identity selected
        if (!identity || !identity.TeamFoundationId) {
            for (i = 0; i < tabs._options.items.length; i++) {
                tabs._options.items[i].disabled = true;
            }
            tabs.updateItems();
            this._tabsDisabled = true;

            // Ignore previous requests
            this._requestId++;

            return;
        }
        else if (this._tabsDisabled) {
            // Show tabs if previously hidden
            for (i = 0; i < tabs._options.items.length; i++) {
                tabs._options.items[i].disabled = false;
            }
            tabs.updateItems();
            this._tabsDisabled = false;
        }

        if (identity) {
            this._drawTitle(identity);
        }

        // Hide members pivotView when filtering by user
        if (identity.IdentityType === 'user') {
            selectedView = tabs.getSelectedView();

            // Disable members PivotView
            if (!tabs.getView('members').disabled) {
                tabs.getView('members').disabled = true;
                tabs.updateItems();
            }

            // Navigate to memberOf PivotView
            if (!selectedView || selectedView.id === 'members') {
                Navigation_Services.getHistoryService().addHistoryPoint("memberOf");
                return;
            }
        }
        else {
            // Enable members PivotView
            if (tabs.getView('members').disabled) {
                tabs.getView('members').disabled = false;
                tabs.updateItems();
            }
        }

        selectedViewId = tabs.getSelectedView().id;
        if (selectedViewId === 'summary') {
            this._fetchIdentityInfo(identity.TeamFoundationId);
        }
        else if (selectedViewId === 'members') {
            this._requestId++;
            gridContainer = $(domElem('div')).addClass('membership-control').css('height', '100%').appendTo(this._identityInfoDiv);

            options = {
                joinToGroupTfid: identity.TeamFoundationId,
                editMembers: true,
                isTeam: identity.IsTeam,
                adminUIFeatureFlagEnabled: TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled() || null,
            };

            if (tfsContext.isHosted && tfsContext.isAADAccount && !identity.IsAadGroup) {
                options.showAddAadMembers = true;
            }

            if (tfsContext.isHosted && tfsContext.isAADAccount && identity.IsAadGroup) {
                options.showAddAadMembersWarning = true;
            }

            if (identity.IsWindowsGroup || identity.RestrictEditingMembership || identity.IsAadGroup) {
                options.preventAdd = true;
                options.showAddAadMembers = false;
                if (identity.RestrictEditingMembership) {
                    options.restrictionReason = AdminResources.CannotAddDirectlyToGroup;
                } else if (identity.IsAadGroup) {
                    options.restrictionReason = AdminResources.CannotEditAADgroup;
                } else {
                    options.restrictionReason = AdminResources.CannotEditWindowsGroups;
                }
            }

            <TFS_Admin_Common.MembershipControl>Controls.Enhancement.enhance(TFS_Admin_Common.MembershipControl, gridContainer, options);
        }
        else if (selectedViewId === 'memberOf') {
            this._requestId++;
            gridContainer = $(domElem('div')).addClass('membership-control').css('height', '100%').appendTo(this._identityInfoDiv);

            options = {
                joinToGroupTfid: identity.TeamFoundationId,
                editMembers: false
            };
            if (identity.IsWindowsGroup) {
                options.preventAdd = true;
                options.restrictionReason = AdminResources.CannotEditWindowsGroups;
            }
            if (identity.IsAadGroup) {
                options.preventAdd = true;
                options.restrictionReason = AdminResources.CannotEditAADGroupHere;
            }

            <TFS_Admin_Common.MembershipControl>Controls.Enhancement.enhance(TFS_Admin_Common.MembershipControl, gridContainer, options);
        }

        if (gridContainer) {
            TFS_Admin_Dialogs.ManageGroupMembersDialog.bindIdentityGridOpenGroup(gridContainer);
        }
    }

    private _drawTitle(identity) {
        var imageContainer, groupActions, imageTitle, titleDiv, titleText, imageElement;

        //emtpy the title
        this.$contentTitleLabel.empty();
        this.$contentTitleImage.empty();

        //create the title
        titleDiv = $(domElem('div')).addClass('title-text').appendTo(this.$contentTitleLabel);
        if (identity.Domain || identity.Scope) {
            titleText = Utils_String.format("{0} > {1}", identity.Domain || identity.Scope, identity.FriendlyDisplayName);
        } else {
            titleText = identity.FriendlyDisplayName;
        }
        $(domElem('span')).text(titleText).attr('title', titleText).appendTo(titleDiv);

        // Do not show for following conditions
        // 1) Current selected identity is a windows identity
        // 2) Current selected identity is a team and we are in team scope for that team
        // 3) Current selected identity is a user and we are that user
        // 4) Current selected identity is a user and we're not in collection scope - also don't show for Organization scope for v1
        // 5) Current selected identity is a AAD Group

        if (!identity.IsWindowsUser &&
            !identity.IsWindowsGroup &&
            (this._options.tfsContext.navigation.topMostLevel !== TFS_Host_TfsContext.NavigationContextLevels.Team
                || this._options.tfsContext.currentTeam.identity.id !== identity.TeamFoundationId) &&
            (identity.IdentityType !== 'user'
                || (this._options.tfsContext.currentIdentity.id !== identity.TeamFoundationId
                    && this._options.tfsContext.navigation.topMostLevel === TFS_Host_TfsContext.NavigationContextLevels.Collection
                    && !TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage()))) {
            groupActions = $(domElem('div')).addClass('group-actions').appendTo(this.$contentTitleLabel);
            this._createMenubar(groupActions);
            this._onContainerResize();
        }

        //see if this is read only and create image
        if (this._canImageBeModified(identity)) {
            imageTitle = AdminResources.ClickToChangeImage;
            imageContainer = $(domElem('a')).attr(
                {
                    'role': 'button',
                    'href': '#',
                    'aria-label': Utils_String.format(AdminResources.ClickToChangeProfileImageFor, identity.FriendlyDisplayName)
                })
                .appendTo(this.$contentTitleImage)
                .bind('click', delegate(this, this._changePicture));
        } else {
            imageContainer = this.$contentTitleImage;
        }

        if (!TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
            imageElement = IdentityImage.identityImageElement(this._options.tfsContext, identity.TeamFoundationId, null, null, null).addClass('large-identity-picture').appendTo(imageContainer);
        }
        else {
            imageElement = TFS_Admin_Common.AvatarHelper.getAvatar(this._options.tfsContext,
                ('EntityId' in identity) && identity.EntityId && identity.EntityId.trim() ? identity.EntityId : identity.TeamFoundationId,
                null)
                .addClass('large-identity-picture')
                .appendTo(imageContainer);
        }
        if (imageElement && imageTitle) {
            PopupContent.RichContentTooltip.add(imageTitle, imageContainer);
        }
    }

    private _createMenubar(menuContainer) {
        var menuBar,
            menuItems = [],
            mainMenu = [],
            currentIdentity = this._mainIdentityGrid.getCurrentIdentity();

        Diag.Debug.assert(currentIdentity !== null, 'currentIdentity is not set');
        if (currentIdentity) {
            if (currentIdentity.IdentityType !== 'user' && !currentIdentity.IsAadGroup) {
                menuItems.push({ id: "edit-profile", text: AdminResources.EditProfile, action: delegate(this, this._editGroupClicked) });
            }

            if (currentIdentity.IdentityType === 'user') {
                menuItems.push({ id: "delete", text: AdminResources.Delete, icon: "icon-delete", action: delegate(this, this._deleteUser) });
            } else if (currentIdentity.IsTeam) {
                menuItems.push({ id: "delete", text: AdminResources.Delete, icon: "icon-delete", action: delegate(this, this._deleteTeam) });
            } else {
                if (currentIdentity.IsAadGroup) {
                    menuItems.push({ id: "delete", text: AdminResources.DeleteFromVSO, icon: "icon-delete", action: delegate(this, this._deleteAadGroup) });
                }
                else {
                    menuItems.push({ id: "delete", text: AdminResources.Delete, icon: "icon-delete", action: delegate(this, this._deleteGroup) });
                }
            }
        }

        mainMenu.push({
            id: "group-actions",
            idIsAction: false,
            text: AdminResources.EditMenu,
            noIcon: true,
            childItems: menuItems
        });

        // Creating the menu bar
        menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, menuContainer,
            {
                items: mainMenu
            });
    }

    private _deleteTeam() {
        var teamToDelete = this._mainIdentityGrid.getCurrentIdentity();

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.ADMIN_EX_AREA,
                Admin.CustomerIntelligenceConstants.Process.MANAGE_IDENTITIES_VIEW,
                {
                    "event": "deleteTeamClicked",
                    "team": teamToDelete.TeamFoundationId
                }));

        Dialogs.show(TFS_Admin_Dialogs.DeleteIdentityDialog, {
            tfid: teamToDelete.TeamFoundationId,
            removeType: AdminResources.DeleteTeam,
            titleText: AdminResources.DeleteTeam,
            bodyText: Utils_String.format(AdminResources.DeleteTeamDescription, "<b>" + teamToDelete.FriendlyDisplayName + "</b>"),
            deleteButtonText: AdminResources.DeleteTeam,
            successCallback: delegate(this, this._onIdentityDeleted)
        });
    }

    private _deleteGroup() {
        var groupToDelete = this._mainIdentityGrid.getCurrentIdentity();
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.ADMIN_EX_AREA,
                Admin.CustomerIntelligenceConstants.Process.MANAGE_IDENTITIES_VIEW,
                {
                    "event": "deleteGroupClicked",
                    "group": groupToDelete.TeamFoundationId
                }));

        Dialogs.show(TFS_Admin_Dialogs.DeleteIdentityDialog, {
            tfid: groupToDelete.TeamFoundationId,
            titleText: AdminResources.DeleteGroup,
            bodyText: Utils_String.format(AdminResources.DeleteGroupDescription, groupToDelete.DisplayName),
            deleteButtonText: AdminResources.DeleteGroup,
            successCallback: delegate(this, this._onIdentityDeleted)
        });
    }

    private _deleteAadGroup() {
        var groupToDelete = this._mainIdentityGrid.getCurrentIdentity();

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.ADMIN_EX_AREA,
                Admin.CustomerIntelligenceConstants.Process.MANAGE_IDENTITIES_VIEW,
                {
                    "event": "deleteAadGroupClicked",
                    "aadGroup": groupToDelete.TeamFoundationId
                }));

        Dialogs.show(TFS_Admin_Dialogs.DeleteIdentityDialog, {
            tfid: groupToDelete.TeamFoundationId,
            titleText: "Delete AAD Group",
            bodyText: Utils_String.format(AdminResources.DeleteAadGroupWarning, groupToDelete.DisplayName),
            deleteButtonText: AdminResources.DeleteGroup,
            successCallback: delegate(this, this._onIdentityDeleted)
        });
    }

    private _deleteUser() {
        var userToDelete = this._mainIdentityGrid.getCurrentIdentity();

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.ADMIN_EX_AREA,
                Admin.CustomerIntelligenceConstants.Process.MANAGE_IDENTITIES_VIEW,
                {
                    "event": "deleteUserClicked",
                    "user": userToDelete.TeamFoundationId
                }));

        Dialogs.show(TFS_Admin_Dialogs.DeleteIdentityDialog, {
            tfid: userToDelete.TeamFoundationId,
            titleText: AdminResources.DeleteUser,
            bodyText: Utils_String.format(AdminResources.DeleteUserDescription, userToDelete.DisplayName),
            deleteButtonText: AdminResources.DeleteUser,
            successCallback: delegate(this, this._onIdentityDeleted)
        });
    }

    private _canImageBeModified(identity) {
        if (identity.IdentityType === 'user') {
            return this._options.tfsContext.currentIdentity.id === identity.TeamFoundationId;
        }

        return true;
    }

    private _deleteGroupClicked() {
        Dialogs.show(TFS_Admin_Dialogs.DeleteIdentityDialog, {
            tfid: this._currentIdentity.TeamFoundationId,
            titleText: AdminResources.DeleteGroup,
            bodyText: Utils_String.format(AdminResources.DeleteGroupDescription, this._currentIdentity.DisplayName),
            deleteButtonText: AdminResources.DeleteGroup,
            successCallback: delegate(this, this._onIdentityDeleted)
        });
        return false;
    }

    private _editGroupClicked(e?) {
        Dialogs.show(TFS_Admin_Dialogs.ManageGroupDialog, {
            identity: this._mainIdentityGrid.getCurrentIdentity(),
            dialogTitle: tfsContext.isHosted ? AdminResources.EditGroupInformationHosted : AdminResources.EditGroupInformationOnPremise,
            successCallback: delegate(this, this._onGroupModified)
        });
        return false;
    }

    private _onGroupModified(identity) {
        // Update the grid identity with potentially new name
        var currentIdentity = this._mainIdentityGrid.getCurrentIdentity();

        if (currentIdentity.FriendlyDisplayName !== identity.FriendlyDisplayName) {
            currentIdentity.FriendlyDisplayName = identity.FriendlyDisplayName;

            //refresh the current row
            this._mainIdentityGrid.updateRow(this._mainIdentityGrid._selectedIndex);

            // Now redraw the title
            this._drawTitle(identity);
        }

        // Call identity changed
        this._onIdentityChanged();

        // Set focus back the selected row in the identity grid.
        this._mainIdentityGrid.focus(0);
    }

    private _changePicture() {
        var identity = this._mainIdentityGrid.getCurrentIdentity();
        Dialogs.show(TFS_Admin_Dialogs.ChangeImageDialog, {
            tfid: identity.TeamFoundationId,
            isGroup: identity.IdentityType !== 'user'
        });
        return false;
    }

    private _fetchIdentityInfo(tfid) {
        var currentRequestId = ++this._requestId, that = this, identity, header;

        this._identityInfoDiv.empty();

        if (!tfid) {
            return;
        }
        identity = this._mainIdentityGrid.getCurrentIdentity();
        TFS_Core_Ajax.getMSJSON(tfsContext.getActionUrl('Display', 'identity', { area: 'api' }),
            $.extend({ tfid: tfid }, TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {}),
            function (data) {
                if (TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled() && !data) {
                    $('.manage-info').empty();
                    let warningPane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $('.manage-info'));
                    warningPane.setMessage(AdminResources.NonMaterializedPermissions, Notifications.MessageAreaType.Warning);
                    return;
                }

                if (currentRequestId !== that._requestId) {
                    return;
                }

                // Update potentially stale info
                if (identity && identity.TeamFoundationId === tfid) {
                    // Update display name on left-hand list
                    if (data.identity.IdentityType !== 'user') {
                        header = data.identity.Description;
                    }

                    if (data.identity.FriendlyDisplayName) {
                        identity.FriendlyDisplayName = data.identity.FriendlyDisplayName;
                    }

                    that._drawTitle(identity);

                    // Redraw
                    that._mainIdentityGrid.updateRow(that._mainIdentityGrid._selectedIndex);

                    that._completePermissionsUpdate(identity.TeamFoundationId, data.security, header);
                }
            },
            null,
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(AdminResources.ProgressPleaseWait),
                    target: this._identityInfoDiv
                }
            });
    }

    private _changeFilter(selectedFilter, keepSelection?: boolean) {
        var options;

            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.ADMIN_EX_AREA,
                Admin.CustomerIntelligenceConstants.Process.MANAGE_IDENTITIES_VIEW,
                {
                    "event": "filterChanged",
                    "selectedFilter": selectedFilter
                }));

        if (selectedFilter) {
            options = {
                searchParams: {},
                identityToSelect: this._options.identityToSelect || null
            };

            if (tfsContext.navigation.team) {
                options.identityListAction = tfsContext.getActionUrl('ReadScopedTeamJson', 'identity', { area: 'api' });
                this._createGroupButton.hide();
            }
            else {
                if (selectedFilter === 'users') {
                    options.identityListAction = tfsContext.getActionUrl('ReadScopedUsersJson', 'identity', { area: 'api' });
                    options.delayWindowsGroups = false;
                    options.delayUsers = true;
                    this._createGroupButton.hide();
                }
                else if (selectedFilter === 'groups') {
                    if (TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
                        options.identityListAction = tfsContext.getActionUrl('ReadScopedApplicationGroupsJson', 'identity', { area: 'api' });
                        if (keepSelection) {
                            options = {
                                identityToSelect: this._mainIdentityGrid.getCurrentIdentity().TeamFoundationId
                            };
                        }
                    } else {
                        options.identityListAction = tfsContext.getActionUrl('ReadScopedGroupsJson', 'identity', { area: 'api' });
                        options.delayWindowsGroups = !this._options.tfsContext.isHosted;
                        options.delayUsers = false;
                    }
                    this._createGroupButton.show();
                }
            }
        }
        else {
            // If no selectedFilter is specified, we are refreshing.  Maintain the current selection.
            options = {
                identityToSelect: this._options.identityToSelect || this._mainIdentityGrid.getCurrentIdentity().TeamFoundationId
            };
        }

        delete this._options.identityToSelect;

        this._setIdentityList(options);
    }

    private _onGroupCreated(identity) {
        this._options.identityToSelect = identity.TeamFoundationId;

        // Refresh filter
        if (this._changeViewFilters && !TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
            this._changeViewFilters.setSelectedView('groups');
        } else {
            this._mainIdentityGrid.setRefreshMembers(false);
            this._changeFilter('groups');
        }
    }

    private _onTeamCreated(params?) {
        this._onGroupCreated(params.identity);
    }

    private _onCreateGroupButtonPressed() {
        Dialogs.show(TFS_Admin_Dialogs.ManageGroupDialog, {
            identity: null,
            dialogTitle: tfsContext.isHosted ? AdminResources.CreateNewGroupHosted : AdminResources.CreateNewGroupOnPremise,
            displayScope: this._options.displayScope ? this._options.displayScope : "",
            successCallback: delegate(this, this._onGroupCreated)
        });
    }

    private _attachNavigation() {
        /// <summary>attach the pivot views</summary>

        var $pivotView = $(".manage-view-tabs"),
            pivotControl = <Navigation.PivotView>Controls.Enhancement.getInstance(Navigation.PivotView, $pivotView.eq(0));

        var historySvc = Navigation_Services.getHistoryService();
        historySvc.attachNavigate("summary", function (sender, state) {
            pivotControl.setSelectedView(state.action);
        }, true);

        historySvc.attachNavigate("members", function (sender, state) {
            pivotControl.setSelectedView(state.action);
        }, true);

        historySvc.attachNavigate("memberOf", function (sender, state) {
            pivotControl.setSelectedView(state.action);
        }, true);
    }
}

VSS.initClassPrototype(ManageIdentitiesView, {
    _manageViewTabs: null,
    _changeViewFilters: null,
    _tabsDisabled: false,
    $contentTitleLabel: null,
    $contentTitleImage: null,
    _currentIdentity: null,
    _popupMenu: null,
    _toolBar: null
});

VSS.classExtend(ManageIdentitiesView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(ManageIdentitiesView, '.manage-identities-view')

class JumpNode extends TreeView.TreeNode {
    public model: any;
    public isLeaf: boolean;
    public noContextMenu: boolean;
    public type: any;

    constructor(options?) {
        super(options);
    }

    public hasChildren() {
        if (this.model && this.model.hasMore) {
            return true;
        }
        else {
            if (this.isLeaf) {
                return false;
            }
            else {
                return this.children.length > 0;
            }
        }
    }
}

VSS.initClassPrototype(JumpNode, {
    model: null,
    isLeaf: false,
    noContextMenu: false,
    type: null
});

function createEmptyNode(text) {
    var node = TreeView.TreeNode.create(text);
    node.noFocus = true;
    node.noContextMenu = true;
    node.config = { css: 'empty-node', unselectable: true };
    return node;
}
function createFolderNode(text) {
    var node = TreeView.TreeNode.create(text);
    node.noFocus = true;
    node.noContextMenu = true;
    node.config = { css: 'folder', unselectable: true };
    return node;
}

interface JumplistTreeOptions extends TreeView.ITreeOptions {
    tfsContext: TFS_Host_TfsContext.TfsContext;
    useHashNavigation: any;
    hideDefaultTeam: any;
    showStoppedCollections: any;
}

class JumpListTreeControl extends TreeView.TreeViewO<JumplistTreeOptions> {
    private _searchRequestId: number;
    private _currentFilter: any;
    private _rootNode: any;
    private _searchRootNode: any;
    private _callbacks: any[];
    private _updatingCollectionsWithTeams: boolean;

    constructor(options?) {
        super(options);
        this._callbacks = [];
        this._searchRequestId = 0;
    }

    public initialize() {
        super.initialize();

        this._rootNode = this.rootNode;
        this._searchRootNode = new TreeView.TreeNode('root');
        this._searchRootNode.root = true;

        this.getElement().bind('selectionchanged', delegate(this, this._onDefinitionChanged));
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            setTitleOnlyOnOverflow: false,
        }, options));
    }

    public populate(allCollections) {
        var i, l, rootNode = this.rootNode, collection, collectionNode;

        rootNode.clear();

        // Getting all definitions
        if (allCollections.length) {
            // Populating definitions
            for (i = 0, l = allCollections.length; i < l; i++) {
                collection = allCollections[i];
                collectionNode = this._createJumpPointNode(collection, 'collection');
                this._populateCollectionNode(collectionNode, collection);
                rootNode.add(collectionNode);
            }
        }
        else {
            rootNode.add(createEmptyNode(AdminResources.NoCollections));
        }

        this._draw();
    }

    public getNavigationContextPackage() {
        var navigationContext = this._options.tfsContext.navigation;

        return Utils_Core.stringifyMSJSON({
            Action: navigationContext.currentAction,
            Area: navigationContext.area,
            Parameters: navigationContext.currentParameters,
            Level: navigationContext.topMostLevel,
            Controller: navigationContext.currentController
        });
    }

    public _drawChildren(node, nodeElement, level?: number) {
        /// <param name="level" type="number" optional="true" />

        var that = this;

        if (node.model && node.model.hasMore && (node.root || node.expanded)) {
            node.add(createEmptyNode(AdminResources.LoadingInProgress));
            node.model.hasMore = false;
            super._drawChildren(node, nodeElement, level);

            if (node.type === 'collection') {
                this.fetchCollectionNode(node, false);
            }
            else if (node.type === 'project') {
                this.fetchProjectNode(node, false);
            }
        }
        else {
            super._drawChildren(node, nodeElement, level);
        }
    }

    private fetchCollectionNodes(nodes: any[], populateAllTeams: boolean, callback?: Function) {
        if (!nodes || nodes.length === 0) {
            if ($.isFunction(callback)) {
                callback.call(this);
            }
        }
        else {
            this.fetchCollectionNode(nodes[0], populateAllTeams, () => {
                this.fetchCollectionNodes(nodes.slice(1), populateAllTeams, callback);
            });
        }
    }

    private fetchCollectionNode(node: any, populateAllTeams: boolean, callback?: Function) {
        TFS_Core_Ajax.getMSJSON(
            this._options.tfsContext.getActionUrl('GetCollectionJumpList', 'common', { serviceHost: null, project: null, team: null, area: 'api' }),
            {
                navigationContextPackage: this.getNavigationContextPackage(),
                selectedHostId: node.model.collectionId,
                populateAllTeams: populateAllTeams
            },
            (data) => {
                node.clear();
                if (data[0]) {
                    node.model = data[0];
                    this._populateCollectionNode(node, node.model);
                }
                this.updateNode(node);
                if (this._callbacks[node.model.name]) {
                    this._callbacks[node.model.name]();
                }
                if ($.isFunction(callback)) {
                    callback.call(this);
                }
            });
    }

    private fetchProjectNode(node, triggerDefinitionChanged: boolean, callback?: Function) {
        var project = node.model;

        var collectionHost = {
            name: project.collectionName,
            relVDir: project.collectionHostVDir,
            hostType: TFS_Host_TfsContext.TeamFoundationHostType.ProjectCollection,
            instanceId: project.collectionId
        };

        TFS_Core_Ajax.getMSJSON(
            this._options.tfsContext.getActionUrl('GetProjectJumpList', 'common', { area: 'api', serviceHost: collectionHost, project: null }),
            {
                navigationContextPackage: this.getNavigationContextPackage(),
                projectUri: project.projectUri,
                collectionId: project.collectionId
            },
            (data) => {
                delete node.folder;
                node.clear();
                if (data[0]) {
                    node.model = data[0];
                    node.expanded = true;
                    this._populateProjectNode(node, node.model);
                }
                this.updateNode(node);

                if (triggerDefinitionChanged) {
                    this._triggerDefinitionChanged(true);
                }

                if ($.isFunction(callback)) {
                    callback.call(this);
                }
            });
    }

    public setSelectedNode(node, suppressChangeEvent?: boolean) {
        /// <param name="suppressChangeEvent" type="boolean" optional="true" />

        if (node && node.config && node.config.unselectable) {
            return;
        }

        if (node && this.isUnpopulatedProjectNode(node) && this.getSelectedNode() !== node) {
            this.fetchProjectNode(node, true);
        }

        super.setSelectedNode(node);
    }

    public filter(filter) {
        var collectionsNeedingTeamPopulation = [];

        filter = filter.toLocaleLowerCase();

        if (this._currentFilter !== filter) {
            this._currentFilter = filter;

            // Check to see if we have all the data on the client
            var hasMore = false, i, j, collection, project;
            for (i = 0; i < this._rootNode.children.length; i++) {
                collection = this._rootNode.children[i];
                if (collection.model && collection.model.hasMore) {
                    hasMore = true;
                    break;
                }
                else {
                    var needsTeamPopulation = false;
                    for (j = 0; j < collection.children.length; j++) {
                        project = collection.children[j];
                        if (project.model && project.model.hasMore) {
                            hasMore = true;
                            break;
                        }
                        else if (project.model && !project.model.teamsPopulated) {
                            needsTeamPopulation = true;
                        }
                    }
                    if (needsTeamPopulation) {
                        collectionsNeedingTeamPopulation.push(collection);
                    }
                }
            }

            if (hasMore) {
                this._serverSearch(filter);
            }
            else {
                if (collectionsNeedingTeamPopulation.length > 0) {
                    if (!this._updatingCollectionsWithTeams) {
                        this._updatingCollectionsWithTeams = true;
                        this.fetchCollectionNodes(collectionsNeedingTeamPopulation, true, () => {
                            this._updatingCollectionsWithTeams = false;
                            this._localSearch(this._currentFilter);
                        });
                    }
                }
                else {
                    this._localSearch(filter);
                }
            }
        }
    }

    public clearFilter() {
        this._currentFilter = null;

        // Prevent incoming search results from being displayed
        this._searchRequestId++;

        // Reset rootNode
        this.rootNode = this._rootNode;
        this._draw();
    }

    public registerCallback(key, callback) {
        this._callbacks[key] = callback;
    }

    public unregisterCallback(key) {
        try {
            delete this._callbacks[key];
        } catch (e) { }
    }

    private _createJumpPointNode(jumpPoint, type) {
        var node = new JumpNode(jumpPoint.name);
        node.model = jumpPoint;
        node.noContextMenu = true;
        node.type = type;
        if (this._options.useHashNavigation) {
            node.link = Navigation_Services.getHistoryService().getFragmentActionLink('node', { path: jumpPoint.path });
        }
        node.config = { css: 'folder' };
        return node;
    }

    private _createProjectSearchNode(project) {
        var node = this._createJumpPointNode(project, 'project');
        node.text = Utils_String.format('{0}/{1}', project.collectionName, project.name);
        return node;
    }

    private _createTeamSearchNode(team) {
        var node = this._createJumpPointNode(team, 'team');
        node.text = Utils_String.format('{0}/{1}', team.projectName, team.name);
        node.title = Utils_String.format('{0}/{1}/{2}', team.collectionName, team.projectName, team.name);
        return node;
    }

    private _populateCollectionNode(node, collection) {
        var i, l, project, projectNode;

        for (i = 0, l = collection.projects.length; i < l; i++) {
            project = collection.projects[i];
            projectNode = this._createJumpPointNode(project, 'project');
            this._populateProjectNode(projectNode, project);
            node.add(projectNode);
        }
    }

    private _populateProjectNode(node, project) {
        var i, l, team, teamNode;

        if (project.teamsPopulated) {
            for (i = 0, l = project.teams.length; i < l; i++) {
                team = project.teams[i];
                if (this._options.hideDefaultTeam && (team.tfid === project.defaultTeamId)) {
                    node.model.browseUrl = team.browseUrl;
                    node.model.defaultTeam = team;
                }
                else {
                    teamNode = this._createJumpPointNode(team, 'team');
                    node.add(teamNode);
                }
            }
        }
        else {
            node.folder = true;
            node.emptyFolderNodeText = AdminResources.LoadingInProgress;
        }
    }

    private isUnpopulatedProjectNode(node): boolean {
        return node && node.type === 'project' && node.model && !node.model.teamsPopulated;
    }

    public ensureTeamsPopulated(node, callback?: Function) {
        if (this.isUnpopulatedProjectNode(node)) {
            this.fetchProjectNode(node, false, callback);
        }
        else if ($.isFunction(callback)) {
            callback.call(this);
        }
    }

    public _toggle(node, nodeElement): any {
        super._toggle(node, nodeElement);
        if (this.isUnpopulatedProjectNode(node)) {
            this.fetchProjectNode(node, true);
        }
    }

    private _getDefaultTeam(projectPath) {
        var projectNode = this._rootNode.findNode(projectPath);
        if (projectNode) {
            return projectNode.model.defaultTeam;
        }
        else {
            return null;
        }
    }

    private _serverSearch(filter) {
        var that = this, currentRequestId = ++this._searchRequestId;

        // Fetch search results
        TFS_Core_Ajax.getMSJSON(this._options.tfsContext.getActionUrl('QueryJumpList', 'common', { serviceHost: null, project: null, team: null, area: 'api' }),
            {
                navigationContextPackage: this.getNavigationContextPackage(),
                searchQuery: Utils_String.htmlEncode(filter),
                showStoppedCollections: this._options.showStoppedCollections
            },
            function (data) {
                if (currentRequestId === that._searchRequestId) {
                    that._redrawSearch(data.collections, data.projects, data.teams);
                }
            },
            null,
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(AdminResources.ProgressPleaseWait),
                    target: this.getElement()
                }
            });
    }

    private _localSearch(filter) {
        var i, j, k, collections = [], projects = [], teams = [], collection, project, team;
        for (i = 0; i < this._rootNode.children.length; i++) {
            collection = this._rootNode.children[i];
            if (collection.model.name.toLocaleLowerCase().indexOf(filter) > -1) {
                collections.push(collection.model);
            }
            for (j = 0; j < collection.children.length; j++) {
                project = collection.children[j];
                if (project.model.name.toLocaleLowerCase().indexOf(filter) > -1) {
                    projects.push(project.model);
                }
                for (k = 0; k < project.children.length; k++) {
                    team = project.children[k];
                    if (team.model.name.toLocaleLowerCase().indexOf(filter) > -1) {
                        teams.push(team.model);
                    }
                }
            }
        }
        this._redrawSearch(collections, projects, teams);
    }

    private _redrawSearch(collections, projects, teams) {
        var i, l, nodes = [], folderNode, collection, collectionNode,
            project, projectNode, team, teamNode;

        if (collections.length) {
            folderNode = createFolderNode(AdminResources.Collections);
            folderNode.expanded = true;
            for (i = 0, l = collections.length; i < l; i++) {
                collection = collections[i];
                collectionNode = this._createJumpPointNode(collection, 'collection');
                folderNode.add(collectionNode);
            }
            nodes.push(folderNode);
        }

        if (projects.length) {
            folderNode = createFolderNode(AdminResources.Projects);
            folderNode.expanded = true;
            for (i = 0, l = projects.length; i < l; i++) {
                project = projects[i];
                projectNode = this._createProjectSearchNode(project);
                folderNode.add(projectNode);
            }
            nodes.push(folderNode);
        }

        if (teams.length) {
            folderNode = createFolderNode(AdminResources.Teams);
            folderNode.expanded = true;
            for (i = 0, l = teams.length; i < l; i++) {
                team = teams[i];
                teamNode = this._createTeamSearchNode(team);
                folderNode.add(teamNode);
            }
            nodes.push(folderNode);
        }

        if (nodes.length === 0) {
            nodes.push(createEmptyNode(AdminResources.NoSearchResults));
        }

        this._searchRootNode.clear();

        for (i = 0, l = nodes.length; i < l; i++) {
            this._searchRootNode.add(nodes[i]);
        }

        // Change rootNode
        this.rootNode = this._searchRootNode;
        this._draw();
        this._fire('definitionchange', { selectedNode: null });
        Diag.logTracePoint("JumpListTreeControl.Search");
    }

    private _onDefinitionChanged(e?) {
        this._triggerDefinitionChanged(false);
    }

    private _triggerDefinitionChanged(refresh: boolean) {
        var selectedNode = this.getSelectedNode();

        if (selectedNode && this.isUnpopulatedProjectNode(selectedNode)) {
            // Avoid flicker of unpopulated project node switching to temporary UI while it fetches its teams.
            selectedNode = null;
        }

        this._fire('definitionchange', {
            selectedNode: selectedNode,
            refresh: refresh
        });
    }
}

VSS.classExtend(JumpListTreeControl, TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(JumpListTreeControl, '.jump-list-tree-control')

class BrowseCollectionControl extends Controls.BaseControl {
    public static enhancementTypeName: string = 'tfs.admin.BrowseCollectionControl';

    constructor(options?) {
        super(options);
    }

    public initialize() {
        $('.create-project', this.getElement()).click(delegate(this, this._onCreateTeamProject));
        this._options.tfsContext.navigation.serviceHost = this._options.serviceHost;
        this._options.tfsContext.navigation.collection = this._options.serviceHost;
    }

    private _onCreateTeamProject() {
        MyExperiencesUrls.getCreateNewProjectUrl(
            this._options.tfsContext.navigation.collection.name,
            {
                source: "Admin.BrowseCollection"
            } as IUrlParameters).then((url: string) => {
                window.location.href = url;
            }, (error: Error) => {
                Dialogs.show(TFS_Admin_Dialogs.CreateProjectDialog, {
                    successCallback: delegate(this, this._onProjectCreated),
                    tfsContext: this._options.tfsContext
                });
            });
        return false;
    }

    private _onProjectCreated(args?) {
        this._fire('refresh-browse');
    }
}

VSS.classExtend(BrowseCollectionControl, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(BrowseCollectionControl, '.browse-collection-control')

class BrowseProjectControl extends Controls.BaseControl {
    public static enhancementTypeName: string = 'tfs.admin.BrowseProjectControl';

    constructor(options?) {
        super(options);
    }

    public initialize() {
        $('.create-team', this.getElement()).click(delegate(this, this._onCreateTeam));
    }

    private _onCreateTeam() {
        Dialogs.show(TFS_Admin_Dialogs.CreateTeamDialog, {
            tfsContext: this._options.tfsContext,
            successCallback: delegate(this, this._onTeamCreated)
        });
        return false;
    }

    private _onTeamCreated() {
        this._fire('refresh-browse');
    }
}

VSS.classExtend(BrowseProjectControl, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(BrowseProjectControl, '.browse-project-control')

class ControlPanelView extends Controls.BaseControl {
    public static enhancementTypeName: string = 'tfs.admin.ControlPanelView';

    private _ajaxPanel: any;
    private _leftPane: any;
    private _lastSelectedNode: any;
    private _searchBar: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        var that = this, currentState, collectionId;

        super.initialize();

        this._leftPane = <JumpListTreeControl>Controls.Enhancement.ensureEnhancement(JumpListTreeControl, $('.jump-list-tree-control', this.getElement()));

        this._searchBar = <SidebarSearch>Controls.Enhancement.ensureEnhancement(SidebarSearch, $('.sidebar-search', this.getElement()));
        this._searchBar.focus();
        this._searchBar._element.bind('clearSearch', delegate(this, this._onClearSearch));
        this._searchBar._element.bind('executeSearch', delegate(this, this._onExecuteSearch));

        this._ajaxPanel = <Panels.AjaxPanel>Controls.Enhancement.enhance(Panels.AjaxPanel, $('.control-panel-view-right-pane', this.getElement()), {
            tfsContext: this._options.tfsContext,
            success: () => {
                this._searchBar.focus();
            },
            error: function (error: Error) {
                this.showError(Utils_String.format(AdminResources.CollectionUnavailableError, error.message));
                return true; // handled
            }
        });

        this._leftPane._element.bind('definitionchange', delegate(this, this._onSelectionChanged));
        this.getElement().bind('refresh-browse', delegate(this, this._onRefreshBrowse));

        if (this._options.useHashNavigation) {
            currentState = Navigation_Services.getHistoryService().getCurrentState();
            collectionId = this._getCollectionIdFromPath(currentState.path);
        }

        TFS_Core_Ajax.getMSJSON(this._options.tfsContext.getActionUrl('GetJumpList', 'common', { area: 'api', showTeamsOnly: this._options.showTeamsOnly }),
            {
                navigationContextPackage: this._leftPane.getNavigationContextPackage(),
                selectedHostId: collectionId,
                showStoppedCollections: this._options.showStoppedCollections,
                ignoreDefaultLoad: this._options.ignoreDefaultLoad
            },
            function (data) {
                var path, state;

                that._leftPane.populate(data);

                if (that._options.useHashNavigation) {
                    // For control panel, attach to hash navigation
                    that._attachNavigation();
                    state = Navigation_Services.getHistoryService().getCurrentState();

                    // If no collection is selected, select the first one
                    if (!state.path && data[0]) {
                        Navigation_Services.getHistoryService().addHistoryPoint('node', { path: data[0].path });
                    }
                }
                else {
                    // For standalone control, use current navigation context

                    path = that._convertNavigationToPath(that._options.tfsContext.navigation);

                    if (that._options.ignoreDefaultLoad && that._options.tfsContext.navigation && that._options.tfsContext.navigation.collection) {
                        // if option ignoreDefaultLoad is chosen then we dont get the teams back as part of original response.
                        // We then get the data for the given collection which includes its projects and teams and then select the team.
                        var collectionName = that._options.tfsContext.navigation.collection.name;
                        if (path !== collectionName) {
                            that._leftPane.registerCallback(collectionName, function () {
                                that._leftPane.unregisterCallback(collectionName);

                                var projectPath = that._convertNavigationToPath(that._options.tfsContext.navigation, true);
                                var projectNode = that._leftPane.rootNode.findNode(projectPath);
                                if (projectNode) {
                                    that._leftPane.ensureTeamsPopulated(projectNode, () => {
                                        var node = that._leftPane.rootNode.findNode(path);
                                        if (node) {
                                            var selectedNode = that._leftPane.getSelectedNode();
                                            if (selectedNode === null || (selectedNode && selectedNode.text === collectionName)) {
                                                // I get path again here because we are lazy loading the teams and because of that the original path doesnt contain the
                                                // team in it.
                                                var newPath = that._convertNavigationToPath(that._options.tfsContext.navigation);
                                                that._selectNodeByPath(newPath, true);
                                            }
                                        }
                                    });
                                }
                            });
                        }
                        that._selectNodeByPath(collectionName, true);
                    }
                    else {
                        that._selectNodeByPath(path, true);
                    }
                }
                that._searchBar.focus();
            },
            null,
            {
                tracePoint: 'ControlPanelView.initialize',
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(AdminResources.ProgressPleaseWait),
                    target: this.getElement()
                }
            });

        this._searchBar.focus();
    }

    private _getCollectionIdFromPath(path) {
        var tokens, collectionName, collection;

        if (path) {
            tokens = path.split('/');
            collectionName = tokens[0];
        }

        collection = this._options.collections[collectionName];
        if (collection) {
            return collection.instanceId;
        }
        else {
            return undefined;
        }
    }

    private _applyTeamToPath(team: string, path: string): string {
        var defaultTeam = this._leftPane._getDefaultTeam(path);
        if (!this._options.hideDefaultTeam || !defaultTeam || Utils_String.localeIgnoreCaseComparer(defaultTeam.name, team) !== 0) {
            // If hiding default team and this is the default team, convert to project path
            path += '/' + team;
        }

        return path;
    }

    private _convertNavigationToPath(navigation, skipTeam: boolean = false) {
        var path;

        if (navigation.collection) {
            path = navigation.collection.name;

            if (navigation.project) {
                path += '/' + navigation.project;

                if (!skipTeam) {
                    if (this._options.selectedTeam) {
                        path = this._applyTeamToPath(this._options.selectedTeam, path);
                    }
                    else if (navigation.team) {
                        path = this._applyTeamToPath(navigation.team, path);
                    }
                }
            }
        }

        return path;
    }

    private _attachNavigation() {
        var that = this;
        Navigation_Services.getHistoryService().attachNavigate("node", function (sender, state) {
            that._selectNodeByPath(state.path, true);
        },
            true);
    }

    private _selectNodeByState() {
        var state = Navigation_Services.getHistoryService().getCurrentState();
        if (state && state.path) {
            this._selectNodeByPath(state.path, false);
        }
    }

    private _selectNodeByPath(path, focus) {
        var node;

        if (path) {
            // If initial selection has been specified, select that node
            node = this._leftPane.rootNode.findNode(path);
        }
        else if (this._leftPane.rootNode.hasChildren()) {
            // Initial selection not specified, so select first node
            node = this._leftPane.rootNode.children[0];
        }

        if (node) {
            this._selectNode(node, focus);
            this._leftPane._getNodeElement(node).get(0).scrollIntoView(false);
        }
    }

    private _selectNode(node, focus) {
        this._leftPane.setSelectedNode(node);
        if (focus) {
            this._leftPane.focus();
        }
        node.expanded = true;
        this._leftPane.updateNode(node);
    }

    private _onClearSearch() {
        this._leftPane.clearFilter();
        this._selectNodeByState();
    }

    private _onExecuteSearch(args?, params?) {
        var searchText = params.searchText;
        this._leftPane.filter(searchText);
    }

    private _onRefreshBrowse(args?) {
        var currentNode = this._leftPane.getSelectedNode(), originalNode;

        this._displayNode(currentNode);
        if (!this._leftPane._currentFilter) {
            // Update current node
            currentNode.model.hasMore = true;
            this._leftPane.updateNode(currentNode);
        }
        else {
            // Update original node if searching
            originalNode = this._leftPane._rootNode.findNode(currentNode.model.path);
            originalNode.model.hasMore = true;
        }
    }

    private _onSelectionChanged(args?, params?) {
        var selectedNode = params.selectedNode;
        if (this._lastSelectedNode !== selectedNode || params.refresh) {
            this._lastSelectedNode = selectedNode;

            this._displayNode(selectedNode);
        }
    }

    private _displayNode(selectedNode) {
        if (selectedNode && selectedNode.model) {
            this._ajaxPanel._options.url = selectedNode.model.browseUrl;
            this._ajaxPanel._options.urlParams = { showTasks: this._options.showTasks };
            this._ajaxPanel.initialize();
        }
        else {
            this._ajaxPanel._element.empty();
        }
    }
}

VSS.initClassPrototype(ControlPanelView, {
    _ajaxPanel: null,
    _leftPane: null,
    _lastSelectedNode: null,
    _searchBar: null
});

VSS.classExtend(ControlPanelView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(ControlPanelView, '.control-panel-list-view')

class CollectionOverviewControl extends Controls.BaseControl {
    public static enhancementTypeName: string = 'tfs.admin.CollectionOverviewControl';

    private _adminCollectionOverviewPageName = "Admin.CollectionOverview";
    private _menuBar: any;
    private _projectsGrid: TFS_Admin_Common.AdminGrid;
    private _createPanelContainer: HTMLElement;
    private _isVerticalNavigationEnabled: boolean;

    // Data source is an array populated with properties from TeamProjectModel
    // _dataSourceIndex maps these properties to their indices in the data source array
    private _dataSourceIndex = {
        ProjectName: 0,
        ProcessName: 1,
        DisplayState: 2,
        Description: 3,
        DefaultTeamId: 4,
        HasDeletePermission: 5,
        ProjectId: 6,
        ProjectObject: 7,
        IsMalformed: 8,
        ProjectState: 9
    };

    constructor(options?) {
        super(options);
    }

    public initialize() {
        var that = this, gridOptions, items = [];

        super.initialize();

        const featureManagementService = Service.getService(FeatureManagementService);
        this._isVerticalNavigationEnabled = featureManagementService.isFeatureEnabled("ms.vss-tfs-web.vertical-navigation");

        items.push({ id: 'create-project', noIcon: true, text: AdminResources.NewTeamProjectMenuItem });
        items.push({ separator: true });

        items.push({ id: 'refresh', text: AdminResources.Refresh, showText: false, icon: "bowtie-icon bowtie-navigate-refresh" });

        this._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $('.actions-control', this.getElement()), {
            items: items,
            executeAction: delegate(this, this._onMenuItemClick),
            contributionIds: ["ms.vss-admin-web.collection-overview-toolbar-menu"],
            getContributionContext: () => {
                // Context here?
            }
        });

        // Set up vertical fill layout after header is created and before grid is created
        <TFS_Admin_Common.VerticalFillLayout>Controls.Enhancement.enhance(TFS_Admin_Common.VerticalFillLayout, $('.content', this.getElement()));

        gridOptions = {
            height: '100%',
            cssClass: 'identity-grid',
            allowMoveColumns: false,
            allowMultiSelect: false,
            initialSelection: false,
            asyncInit: false, // prevents images from loading twice
            ariaAttributes: {
                label: AdminResources.Projects
            },
            columns: <any[]>[
                {
                    text: AdminResources.ProjectName,
                    width: 200,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        // Fetch project name and state from row source
                        const displayName = this.getColumnValue(dataIndex, that._dataSourceIndex.ProjectName, columnOrder);
                        const projectprojectState = this.getColumnValue(dataIndex, that._dataSourceIndex.ProjectState, columnOrder);

                        column.maxLength = Math.max(column.maxLength || 0, displayName.length + 4);
                        if (projectprojectState === ServerConstants.ProjectState.WellFormed) {
                            // Project is well-formed => Display project image and overview link
                            const projectImgElt = IdentityImage.identityImageElement(that._options.tfsContext, this.getColumnValue(dataIndex, 4, columnOrder), null, null, null, "").addClass('identity-image');
                            const projectUrl = that._options.tfsContext.getActionUrl(null, null, { project: displayName, area: 'admin' });
                            const projectRefElt = $(domElem('a')).addClass('identity-name').attr('href', projectUrl).text(displayName);

                            return $(domElem('div'))
                                .addClass('grid-cell identity-cell').width(column.width || 20).attr('title', displayName)
                                .append(projectImgElt)
                                .append(projectRefElt);
                        } else {
                            // Project is malformed => Only display project name (link/image no longer valid)
                            return $(domElem('div')).addClass('grid-cell overview-desc').width(column.width || 20).attr('title', displayName).text(displayName);
                        }
                    }
                },
                {
                    text: AdminResources.Process,
                    rowCss: 'overview-desc',
                    width: 100,
                    hidden: !TFS_Host_TfsContext.TfsContext.getDefault().isHosted,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        var $cell = $(domElem('div'))
                            .addClass('grid-cell identity-cell').width(column.width || 20);

                        var processName = this.getColumnValue(dataIndex, that._dataSourceIndex.ProcessName, columnOrder);
                        if (processName) {
                            var link = $(domElem('a'));
                            var processUrl = null;

                            var url = that._options.tfsContext.getActionUrl(null, null, {
                                area: 'apps',
                                project: ''
                            }) + '/hub/ms.vss-work-web.work-customization-hub';

                            var fragment = Navigation_Services.getHistoryService().getFragmentActionLink("workitemtypes", {
                                'process-name': processName
                            });

                            processUrl = url + fragment;

                            link.attr('href', processUrl);
                            link.text(processName);
                            $cell.append(link);
                        }

                        return $cell;
                    }
                },
                {
                    text: AdminResources.Status,
                    width: 100,
                    getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                        let $cell = $(domElem('div')).addClass('grid-cell overview-desc').width(column.width || 20);
                        const displayState = this.getColumnValue(dataIndex, that._dataSourceIndex.DisplayState, columnOrder);
                        const isMalformed = this.getColumnValue(dataIndex, that._dataSourceIndex.IsMalformed, columnOrder);
                        const projectState = this.getColumnValue(dataIndex, that._dataSourceIndex.ProjectState, columnOrder);
                        const warningIconHtml = '<i class="bowtie-icon bowtie-status-warning"></i>';

                        if (isMalformed === true) {
                            // Add warning icon to display state
                            $cell.html(warningIconHtml + ' ' + displayState).attr('is-malformed', 'is-malformed');
                            // Add tooltip text (and attribute for L2 tests to check that tooltip was added)
                            if (projectState === ServerConstants.ProjectState.Deleting) {
                                $cell.attr('title', AdminResources.TooltipForMalformedDeletingProject);
                            } else {
                                $cell.attr('title', AdminResources.TooltipForMalformedCreatingProject);
                            }
                        } else {
                            $cell.html(displayState).attr('title', displayState);
                        }

                        return $cell;
                    }
                },
                {
                    text: AdminResources.Description,
                    rowCss: 'overview-desc',
                    width: 325
                }
            ],
            gutter: {
                contextMenu: this._options.tfsContext.isHosted || this._options.projectRenameIsEnabled
            },
            contextMenu: {
                items: delegate(this, this._getContextMenuItems),
                updateCommandStates: delegate(this, this._updateCommandStates),
                contributionIds: ["ms.vss-admin-web.projects-grid-menu"],
                getContributionContext: this._getContributionContextFunc()
            },
        };
        this._projectsGrid = <TFS_Admin_Common.AdminGrid>Controls.Enhancement.enhance(TFS_Admin_Common.AdminGrid, $('.projects-grid', this.getElement()), gridOptions);
        this._initializeGrid();
    }

    private _getContributionContextFunc() {
        return () => {
            return this._projectsGrid.getRowData(this._projectsGrid.getSelectedRowIndex());
        };
    }

    private _onMenuItemClick(e?) {
        var command = e.get_commandName();

        switch (command) {
            case 'create-project':
                this._onCreateProjectDialog();
                break;
            case 'refresh':
                this._onRefresh();
                break;
        }
    }

    private _getContextMenuItems(contextInfo) {
        var menuItems = [];

        menuItems.push({ id: "delete-project", text: AdminResources.Delete, title: AdminResources.DeleteProject, icon: "icon-delete", action: delegate(this, this._deleteProject), "arguments": contextInfo });

        if (this._options.projectRenameIsEnabled) {
            menuItems.push({ id: "rename-project", text: AdminResources.ProjectRename, title: AdminResources.ProjectRename, icon: "icon-rename", action: delegate(this, this._renameProject), "arguments": contextInfo });
        }

        // Bug 963706: Process migration from project overview and admin overview issues
        //if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebaccessProcessHierarchy)) {
        //    menuItems.push({ id: "change-process", text: AdminResources.ChangeProcess, title: AdminResources.ChangeProcess, icon: "icon-tfs-right", action: delegate(this, this._changeProjectProcess), "arguments": contextInfo });
        //}

        return menuItems;
    }

    // Disable menu options if the project is not well-formed.
    private _updateCommandStates(menu) {
        var item, selectedIndex;

        selectedIndex = this._projectsGrid.getSelectedRowIndex();
        item = this._options.projects[selectedIndex];
        menu.updateCommandStates([
            {
                id: "delete-project",
                // disable deletion for either of two reasons:
                // (1) user doesn't have permission
                // (2) project creating or deleting, and it hasn't been that way for too long
                //     i.e., project is neither malformed nor in the WellFormed state.
                disabled: !item.HasDeletePermission || (!item.IsMalformed && item.State !== ServerConstants.ProjectState.WellFormed)
            },
            {
                id: "change-process",
                // disable rename for one reason: project is not well-formed
                disabled: item.State !== ServerConstants.ProjectState.WellFormed
            },
            {
                id: "rename-project",
                // disable rename for either of two reasons:
                // (1) user doesn't have permission
                // (2) project is not well-formed
                disabled: !item.HasRenamePermission || item.State !== ServerConstants.ProjectState.WellFormed
            }]);
    }

    private _deleteProject(contextInfo) {
        this._internalDeleteProject(contextInfo.item[this._dataSourceIndex.ProjectName], contextInfo.item[this._dataSourceIndex.ProjectId]);
    }

    private _internalDeleteProject(projectName: string, projectId: string) {
        Dialogs.show(TFS_Admin_Dialogs.DeleteProjectDialog, {
            successCallback: delegate(this, this._onRefresh),
            projectName: projectName,
            projectId: projectId,
            tfsContext: this._options.tfsContext
        });
    }

    private _changeProjectProcess(contextInfo) {
        this._internalChangeProjectProcess(contextInfo.item[this._dataSourceIndex.ProjectName], contextInfo.item[this._dataSourceIndex.ProjectId], contextInfo.item[this._dataSourceIndex.ProcessName]);
    }

    private _internalChangeProjectProcess(projectName: string, projectId: string, processName: string) {
        var options: TFS_Admin_Dialogs.SelectMigrateTargetDialog.Options =
        {
            processName: processName,
            projectName: projectName,
            projectId: projectId,
            tfsContext: this._options.tfsContext,
            refresh: delegate(this, this._onRefresh)
        };

        Dialogs.show(TFS_Admin_Dialogs.SelectMigrateTargetDialog, options);
    }

    private _renameProject(contextInfo) {
        this._internalRenameProject(contextInfo.item[this._dataSourceIndex.ProjectName], contextInfo.item[this._dataSourceIndex.ProjectId]);
    }

    private _internalRenameProject(projectName: string, projectId: string) {
        Dialogs.show(TFS_Admin_Dialogs.RenameProjectDialog, {
            tfsContext: this._options.tfsContext,
            projectName: projectName,
            projectId: projectId,
            okCallback: delegate(this, this._onRefresh),
        });
    }

    private _onCreateProjectDialog(): void {
        if (this._isVerticalNavigationEnabled) {
            this._renderCreateProjectPanel(true);
        } else {
            MyExperiencesUrls.getCreateNewProjectUrl(
                this._options.tfsContext.navigation.collection.name,
                {
                    source: this._adminCollectionOverviewPageName
                } as IUrlParameters).then((url) => {
                    window.location.href = url;
                }, (error: Error) => {
                    Dialogs.show(TFS_Admin_Dialogs.CreateProjectDialog, {
                        successCallback: delegate(this, this._onRefresh)
                    });
                });
        }
    }

    private _onCreateProjectPanelDismiss = (): void => {
        this._renderCreateProjectPanel(false);
    }

    private _renderCreateProjectPanel(showPanel: boolean): void {
        ReactDOM.render(
            React.createElement(LWPComponent,
                {
                    pageContext: AdminPageContext.getPageContext(),
                    wrappedType: "createProjectPanel",
                    dependencies: ["ms.vss-tfs-web.create-project-panel"],
                    showPanel: showPanel,
                    onPanelDismiss: this._onCreateProjectPanelDismiss,
                    invokingSource: this._adminCollectionOverviewPageName
                })
            , this.createPanelContainer);
    }

    private get createPanelContainer(): HTMLElement {
        if (!this._createPanelContainer) {
            this._createPanelContainer = $("<div />").appendTo(this._element).get(0);
        }
        return this._createPanelContainer;
    }

    private _initializeGrid() {
        this._projectsGrid._options.source = this._options.projects.map(p => [p.DisplayName, p.ProcessTemplateName, p.DisplayState, p.Description, p.DefaultTeamId, p.HasDeletePermission, p.ProjectId, p, p.IsMalformed, p.State]);
        this._projectsGrid._options.keepSelection = true;
        this._projectsGrid._options.asyncInit = true;
        this._projectsGrid.initializeDataSource();
        this._projectsGrid.checkForNoData(AdminResources.NoProjects);
    }

    private _onRefresh() {
        var that = this;
        TFS_Core_Ajax.getMSJSON(this._options.tfsContext.getActionUrl('GetTeamProjects', 'browse', { area: 'api' }),
            null,
            function (data) {
                that._options.projects = data.TeamProjects;
                that._initializeGrid();
                $('.project-count', that._element).text(data.TeamProjects.length);
            },
            null,
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(AdminResources.ProgressPleaseWait),
                    target: this.getElement()
                }
            });
    }
}

VSS.initClassPrototype(CollectionOverviewControl, {
    _menuBar: null,
    _projectsGrid: null
});

VSS.classExtend(CollectionOverviewControl, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(CollectionOverviewControl, '.collection-overview-control')

class ProjectOverviewControl extends Controls.BaseControl {
    public static enhancementTypeName: string = 'tfs.admin.ProjectOverviewControl';

    private _menuBar: any;
    private _teamsGrid: any;
    private _errorPane: Notifications.MessageAreaControl;
    private _verticalFillLayout: any;

    public $profilePicture: any;
    public $imageContainer: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        var gridOptions, that = this;
        var menuItems = [];

        super.initialize();
        this.$imageContainer = this.getElement().find('div.profile-picture a');
        this.$profilePicture = this.getElement().find('div.profile-picture img.identity-picture');
        this.$profilePicture.addClass("identity-" + this._options.defaultTeamId);
        this._errorPane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this.getElement().find('.detail-errors'));

        menuItems.push({
            id: "new-team-menuitem",
            text: AdminResources.NewTeamMenuItem,
            noIcon: true,
            action: () => {
                Dialogs.show(TFS_Admin_Dialogs.CreateTeamDialog, {
                    successCallback: delegate(this, this._onRefresh)
                });
            }
        });

        menuItems.push({
            separator: true
        });

        menuItems.push({
            id: "refresh-menuitem",
            text: AdminResources.Refresh,
            showText: false,
            icon: "bowtie-icon bowtie-navigate-refresh",
            action: () => {
                this._onRefresh();
            }
        });

        this._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $('.actions-control', this.getElement()), {
            items: menuItems,
            contributionIds: ["ms.vss-admin-web.project-overview-toolbar-menu"],
            getContributionContext: () => {
                // Context here?
            }
        });

        if (this._options.hasMoreTeams && this._options.teams) {
            const $message = $("<div>").html(Utils_String.format(AdminResources.TeamListTruncated, this._options.teams.length));
            $message.find("a").attr("href", "#").bind('click', () => {
                this._errorPane.clear();
                this._onRefresh();
            });
            this._errorPane.setMessage($message, Notifications.MessageAreaType.Info);
        }

        $('.profile-picture a', this.getElement())
            .keydown((ev: any) => {
                Utils_UI.buttonKeydownHandler(ev);
            })
            .click(delegate(this, this._onChangeProfileImage));

        PopupContent.RichContentTooltip.add(this.$profilePicture.attr("title"), this.$imageContainer);
        this.$profilePicture.removeAttr("title");

        // Set up vertical fill layout after header is created and before grid is created
        this._verticalFillLayout = <TFS_Admin_Common.VerticalFillLayout>Controls.Enhancement.enhance(TFS_Admin_Common.VerticalFillLayout, $('.content', this.getElement()));

        this._errorPane._element.bind(Notifications.MessageAreaControl.EVENT_DISPLAY_COMPLETE, function () {
            that._verticalFillLayout.redraw();
        });

        let createTeamLink = (team): JQuery => {
            return $(domElem('a')).attr({ 'href': team.AdminHome });
        };

        const hubsService = Service.getLocalService(Navigation_HubsService.HubsService);
        if (hubsService.getSelectedHubId() === "ms.vss-admin-web.project-admin-hub") {
            const locationService = Service.getLocalService(Navigation_Location.LocationService);
            const projectName = Context.getDefaultWebContext().project.name;
            createTeamLink = (team): JQuery => {
                const href = locationService.routeUrl("ms.vss-admin-web.project-admin-hub-route", { project: projectName, adminPivot: "teams", teamId: team.TeamFoundationId });
                return $(domElem('a')).attr({ 'href': href }).click(hubsService.getHubNavigateHandler("ms.vss-admin-web.project-admin-hub", href));
            };
        }

        const $teamsGridContainer = $('.teams-grid', this.getElement());
        if ($teamsGridContainer.length) {
            gridOptions = {
                cssClass: 'identity-grid',
                height: '100%',
                allowMoveColumns: false,
                allowMultiSelect: false,
                initialSelection: false,
                keepSelection: true,
                ariaAttributes: {
                    label: AdminResources.Teams
                },
                columns: <any[]>[
                    {
                        text: AdminResources.TeamNameColumn,
                        width: 175,
                        index: "Title",
                        headerCss: 'overview-desc',
                        rowCss: 'overview-desc',
                        hrefIndex: "AdminHome",
                        getCellContents: function (rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
                            const identity = this._dataSource[dataIndex];
                            const isDefaultTeam = identity.TeamFoundationId === that._options.defaultTeamId;
                            column.maxLength = Math.max(column.maxLength || 0, identity.FriendlyDisplayName.length + 4);

                            return $(domElem('div')).addClass('grid-cell identity-cell').attr('title', identity.Title).width(column.width || 20).toggleClass('default-team', isDefaultTeam)
                                .append(IdentityImage.identityImageElement(tfsContext,
                                    identity.TeamFoundationId,
                                    isDefaultTeam ? { t: Date.now() } : null,
                                    null,
                                    null,
                                    "").addClass('identity-image')
                                ).append(createTeamLink(identity).attr({ 'tabindex': '-1' }).addClass('identity-name').text(identity.FriendlyDisplayName));
                        }
                    },
                    {
                        text: AdminResources.Members,
                        index: "MemberCount",
                        width: 100
                    },
                    {
                        text: AdminResources.Description,
                        index: "Description",
                        rowCss: 'overview-desc',
                        width: 350
                    }],
                sortOrder: [{ index: "Title", order: "asc" }],
                contextMenu: {
                    items: delegate(this, this._getContextMenuItems),
                    updateCommandStates: delegate(this, this._updateCommandStates),
                    contributionIds: ["ms.vss-admin-web.teams-grid-menu"]
                },
                openRowDetail: {
                    hrefIndex: "AdminHome"
                }
            };

            this._teamsGrid = <TFS_Admin_Common.AdminGrid>Controls.Enhancement.enhance(TFS_Admin_Common.AdminGrid, $teamsGridContainer, gridOptions);
            this._initializeGrid();
            this.getElement().bind('remove-identity-event', delegate(this, this._onRemoveIdentity));
            $('.teams-grid', this.getElement()).bind('deletekey', delegate(this, this._onTeamGridDeleteKey));
        }

        this._registerFeatureEnablement();

        if (this._options.launchNewTeamDialog) {
            this._launchCreateTeamDialog();
        }
    }

    private _launchCreateTeamDialog() {
        Dialogs.show(TFS_Admin_Dialogs.CreateTeamDialog, {
            successCallback: delegate(this, this._onRefresh)
        });
    }

    private _registerFeatureEnablement() {
        /// <summary>Conditionally hooks up the feature enablement launch text/link</summary>
        var that = this,
            $showFeatureEnablementLinkElement = $(".show-feature-enablement-link", this.getElement()),
            showFeatureEnablementLink = false;

        if ($showFeatureEnablementLinkElement.length) {
            showFeatureEnablementLink = Utils_Core.parseMSJSON($showFeatureEnablementLinkElement.html(), false);
        }

        function configureFeatures() {
            Dialogs.Dialog.beginExecuteDialogAction(function () {
                VSS.using(['Admin/Scripts/TFS.Admin.FeatureEnablement'], (_TFS_Admin_FeatureEnablement: typeof TFS_Admin_FeatureEnablement) => {
                    var wizardManager = new _TFS_Admin_FeatureEnablement.WizardManager();
                    wizardManager.showDialog({
                        close: function () {
                            if (wizardManager.getWizardResult()) { // true indicates success
                                $(".feature-enablement-info", that._element).remove();
                            }
                        }
                    });
                });
            });
        }

        if (showFeatureEnablementLink) {
            Navigation_Services.getHistoryService().attachNavigate("enableFeatures", configureFeatures, true);
            $("a.configure-features", this.getElement()).click(configureFeatures);
        }
    }

    private _initializeGrid() {
        const hubsService = Service.getLocalService(Navigation_HubsService.HubsService);
        const vertical = hubsService.getSelectedHubId() === "ms.vss-admin-web.project-admin-hub";
        const locationService = Service.getLocalService(Navigation_Location.LocationService);
        const projectName = Context.getDefaultWebContext().project.name;

        this._teamsGrid._options.source = $.map(this._options.teams, team => {
            var url, title;

            title = team.FriendlyDisplayName;

            if (this._options.defaultTeamId === team.TeamFoundationId) {
                title = Utils_String.format(AdminResources.DefaultTeamName, team.FriendlyDisplayName);
            }

            if (vertical) {
                url = locationService.routeUrl("ms.vss-admin-web.project-admin-hub-route", { project: projectName, adminPivot: "teams", teamId: team.TeamFoundationId });
            }
            else {
                url = this._options.tfsContext.getActionUrl(null, null, { team: team.FriendlyDisplayName, area: 'admin' }); // FIXME
            }

            return $.extend({ Title: title, AdminHome: url }, team);
        });

        this._teamsGrid.initializeDataSource();
        this._teamsGrid.checkForNoData(AdminResources.NoTeams);
    }

    private _getContextMenuItems(contextInfo) {
        var menuItems = [];

        menuItems.push({ id: "set-project-default", text: AdminResources.SetDefaultTeam, action: delegate(this, this._setDefaultTeam), "arguments": contextInfo });
        menuItems.push({ id: "delete-team", text: AdminResources.Delete, icon: "icon-delete", action: delegate(this, this._deleteTeam), "arguments": contextInfo });

        return menuItems;
    }

    private _updateCommandStates(menu) {
        var item, selectedIndex;

        selectedIndex = this._teamsGrid.getSelectedDataIndex();
        item = this._teamsGrid.getRowData(selectedIndex);

        menu.updateCommandStates(<any[]>[{
            id: "set-project-default",
            disabled: (item.TeamFoundationId === this._options.defaultTeamId)
        }, {
            id: "delete-team",
            disabled: (item.TeamFoundationId === this._options.defaultTeamId)
        }]);
    }

    private _onTeamGridDeleteKey(e?, args?) {
        this._internalDeleteTeam(this._teamsGrid.getSelectedItem());
    }

    private _deleteTeam(contextInfo) {
        this._internalDeleteTeam(contextInfo.item);
    }

    private _internalDeleteTeam(teamToDelete) {
        if (teamToDelete.TeamFoundationId === this._options.defaultTeamId) {
            window.alert(Utils_String.htmlEncode(AdminResources.CannotDeleteDefaultTeam));
        } else {
            Dialogs.show(TFS_Admin_Dialogs.DeleteIdentityDialog, {
                tfid: teamToDelete.TeamFoundationId,
                removeType: AdminResources.DeleteTeam,
                titleText: AdminResources.DeleteTeam,
                bodyText: Utils_String.format(AdminResources.DeleteTeamDescription, "<b>" + teamToDelete.FriendlyDisplayName + "</b>"),
                deleteButtonText: AdminResources.DeleteTeam,
                successCallback: delegate(this, this._onRefresh)
            });
        }
    }

    private _setDefaultTeam(contextInfo) {
        var that = this, team = contextInfo.item, actionUrl;

        actionUrl = this._options.tfsContext.getActionUrl("setDefaultTeam", "teams", { area: 'api' });

        TFS_Core_Ajax.postMSJSON(actionUrl, { teamId: team.TeamFoundationId }, function () {
            that._onRefresh();
        },
            function (error) {
                that._errorPane.setError(error.message);
            },
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(AdminResources.ProgressPleaseWait),
                    target: this.getElement()
                }
            });
    }

    private _onChangeProfileImage() {
        if (this._options.defaultTeamId === TFS_Admin_Common.EmptyGuidString) {
            window.alert(AdminResources.MustSelectDefaultTeam);
        } else {
            Dialogs.show(TFS_Admin_Dialogs.ChangeImageDialog, { tfid: this._options.defaultTeamId, isGroup: true });
        }

        // Prevent navigating to #
        return false;
    }

    private _onRemoveIdentity() {
        var selectedIndex, teamToDelete;

        selectedIndex = this._teamsGrid.getSelectedDataIndex();
        teamToDelete = this._teamsGrid.getRowData(selectedIndex);

        Dialogs.show(TFS_Admin_Dialogs.DeleteIdentityDialog, {
            tfid: teamToDelete.TeamFoundationId,
            removeType: AdminResources.DeleteTeam,
            titleText: AdminResources.DeleteTeam,
            bodyText: Utils_String.format(AdminResources.DeleteTeamDescription, "<b>" + teamToDelete.FriendlyDisplayName + "</b>"),
            deleteButtonText: AdminResources.DeleteTeam,
            successCallback: delegate(this, this._onRefresh)
        });
    }

    private _onRefresh() {
        var that = this;
        //set teamId to null to prevent it from adding it to the GetTeams URI
        this._options.tfsContext.navigation.teamId = null; 
        TFS_Core_Ajax.getMSJSON(this._options.tfsContext.getActionUrl('GetTeams', 'browse', { area: 'api' }),
            null,
            function (data) {
                that._options.teams = data.Teams;
                that._options.defaultTeamId = data.DefaultTeamId;
                that._initializeGrid();
                that._updateProfileImage();

                $('.team-count', that._element).text(data.Teams.length);
            },
            null,
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(AdminResources.ProgressPleaseWait),
                    target: this.getElement()
                }
            });
    }

    private _updateProfileImage() {
        if (this._options.defaultTeamId === TFS_Admin_Common.EmptyGuidString) {
            this.$profilePicture.attr('src', hostConfig.getResourcesFile('Team.svg'));
        } else {
            this.$imageContainer.empty();
            this.$profilePicture = IdentityImage.identityImageElement(this._options.tfsContext, this._options.defaultTeamId, { t: Date.now() }, null).addClass('large-identity-picture').appendTo(this.$imageContainer);
            PopupContent.RichContentTooltip.add(AdminResources.ClickToChangeImage, this.$imageContainer);
        }
    }
}

VSS.initClassPrototype(ProjectOverviewControl, {
    _menuBar: null,
    _teamsGrid: null,
    $profilePicture: null,
    $imageContainer: null,
    _errorPane: null,
    _verticalFillLayout: null
});

VSS.classExtend(ProjectOverviewControl, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(ProjectOverviewControl, '.project-overview-control')

export class GroupInfoControl extends Controls.BaseControl {
    public static enhancementTypeName: string = 'tfs.admin.GroupInfoControl';

    public _nameInput: any;
    public _descriptionInput: any;
    public _projectVisibilityOption: any;
    public _buttons: any;
    public _errorSection: any;
    public _errorMessage: any;
    public _saveButton: any;
    public _undoButton: any;
    public _currentName: any;
    public _currentDescription: any;
    public _currentProjectVisibility: any;
    public _nameIsValid: boolean;
    public _processArea: JQuery;
    public _processName: string;
    public _changeProcessLink: JQuery;

    private _runningDocumentsTableEntry: Events_Document.RunningDocumentsTableEntry;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        // Find elements
        this._nameInput = $('.group-name-input', this.getElement());
        this._descriptionInput = $('.group-description-input', this.getElement());
        this._buttons = $('.group-info-buttons', this.getElement()).hide();
        this._errorSection = $('.group-info-errors', this.getElement()).hide();
        this._errorMessage = $('.group-info-error-message', this.getElement());
        this._saveButton = $('.save-group-changes', this._buttons).click(delegate(this, this._onSave)).button();
        this._undoButton = $('.undo-group-changes', this._buttons).click(delegate(this, this._onUndo)).button();
        this._processArea = $('.process-template', this.getElement());
        this._processName = $('.process-template-name', this.getElement()).text();
        this._changeProcessLink = $('.change-process-link', this.getElement());
        this._nameIsValid = true;

        // Initialize elements
        Utils_Core.delay(this, 100, function () {
            this._setAutoTextArea();
        }); // delay until size is determined by layout

        Utils_UI.Watermark(this._nameInput, { watermarkText: AdminResources.EditGroupNameWatermark });
        this._nameInput.keypress(this._isLessThanMaxLength);
        this._nameInput.keyup(delegate(this, this._onNameInputKeyup));
        this._nameInput.bind('blur focus', delegate(this, this._onFocus, true));
        this._nameInput.bind('paste', delegate(this, this._onNamePaste));
        this._nameInput.val(this._options.name);
        this._nameInput.removeAttr('readonly');

        Utils_UI.Watermark(this._descriptionInput, { watermarkText: AdminResources.EditGroupDescriptionWatermark });
        this._descriptionInput.keypress(this._isLessThanMaxLength);
        this._descriptionInput.keyup(delegate(this, this._onDescriptionInputKeyup));
        this._descriptionInput.bind('blur focus', delegate(this, this._onFocus));
        this._descriptionInput.bind("paste", delegate(this, this._onPaste));
        this._descriptionInput.val(this._options.description);
        this._descriptionInput.removeAttr('readonly');

        // Only allow these actions if the feature is enabled

        // Bug 963706: Process migration from project overview and admin overview issues
        //if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebaccessProcessHierarchy)) {
        //    this._changeProcessLink.removeAttr('hidden');
        //    this._changeProcessLink.keydown(Utils_UI.buttonKeydownHandler);
        //    this._changeProcessLink.click((e) => this._changeProcessClick(e));
        //}

        this._updateProcessLink();
        this._updateProcessLinkVisibility();

        // Save original values
        this._currentName = this._options.name;
        this._currentDescription = this._options.description;
        this._currentProjectVisibility = this._options.projectVisibility;

        this._runningDocumentsTableEntry = Events_Document.getRunningDocumentsTable().add("GroupInfoControl", this);
    }

    public _setAutoTextArea() {
        this._nameInput.AutoTextArea();
        this._descriptionInput.AutoTextArea();
    }

    public _onFocus(event, validateName) {
        var wrapper = $(event.target).closest('.inline-input-wrapper');
        if (event.type === 'blur') {
            wrapper.removeClass('focused');
            if (validateName) {
                this._onNameInputKeyup();
            }
        }
        else if (event.type === 'focus') {
            wrapper.addClass('focused');
        }
    }

    public _onDescriptionInputKeyup() {
        this._checkMaxLength(this._descriptionInput);
        this._currentDescription = this._descriptionInput.val();
        this._evaluateButtonState();
    }

    public _setError(message) {
        this._errorMessage.text(message);
        this._errorSection.show();
    }

    public _clearError() {
        this._errorSection.hide();
    }

    public _isDirty() {
        return (this._currentName !== this._options.name) || (this._currentDescription !== this._options.description);
    }

    public isDirty() {
        return this._isDirty();
    }

    public _disableDirtyCheck() {
        Events_Document.getRunningDocumentsTable().remove(this._runningDocumentsTableEntry);
    }

    public _onSave() {
        var that = this;

        this._descriptionInput.focus();
        TFS_Core_Ajax.postMSJSON(
            this._options.tfsContext.getActionUrl('ManageGroup', 'identity', { area: 'api' }),
            $.extend({
                name: this._currentName,
                description: this._currentDescription,
                tfid: this._options.tfid
            }, TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {}),
            function (identity) {
                // If team name has changed, redirect to new action url
                if (that._options.name !== identity.FriendlyDisplayName) {
                    // TODO: make this work on other actions/controllers other than default
                    that._disableDirtyCheck();
                    window.location.href = that._options.tfsContext.getActionUrl(null, null, { team: identity.FriendlyDisplayName });
                }
                else {
                    that._options.name = identity.FriendlyDisplayName;
                    that._options.description = identity.Description;

                    that._onUndo();
                }

                that._clearError();
            },
            function (error) {
                that._buttons.show();

                that._setError(error.message);
            },
            {
                tracePoint: 'ManageGroup.btnSaveGroupChanges.Success',
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(AdminResources.ProgressPleaseWait),
                    target: this.getElement()
                }
            }
        );
    }

    public _onUndo() {
        this._clearError();
        this._nameIsValid = true;

        this._nameInput.val(this._options.name);
        this._descriptionInput.val(this._options.description);
        this._descriptionInput.AutoTextArea('resize');
        this._descriptionInput.blur();

        this._currentName = this._options.name;
        this._currentDescription = this._options.description;
        this._buttons.hide();
        this._descriptionInput.focus();
    }

    public _onNameInputKeyup() {
        this._checkMaxLength(this._nameInput);
        this._currentName = this._nameInput.val();
        if (!this._currentName) {
            this._nameInput.closest('.inline-input-wrapper').addClass('invalid');
            this._saveButton.button('option', 'disabled', true);
        }
        else {
            this._nameInput.closest('.inline-input-wrapper').removeClass('invalid');
            this._saveButton.button('option', 'disabled', false);
        }
        this._evaluateButtonState();
    }

    private _isLessThanMaxLength() {
        var maxLengthStr = $(this).attr('maxlength'),
            maxLength;

        if (maxLengthStr) {
            maxLength = parseInt(maxLengthStr, 10);
            return $(this).val().length < maxLength;
        }
    }

    public _checkMaxLength(textInput) {
        var maxLength = textInput.attr('maxlength');
        if (maxLength) {
            maxLength = parseInt(maxLength, 10);
            if (textInput.val().length > maxLength) {
                textInput.val(textInput.val().substr(0, maxLength));
            }
        }
    }

    private _onNamePaste() {
        Utils_Core.delay(this, 100, function () {
            this._onNameInputKeyup();
        });
    }

    private _onPaste() {
        Utils_Core.delay(this, 100, function () {
            this._onDescriptionInputKeyup();
        });
    }

    public _evaluateButtonState() {
        if (this._nameIsValid) {
            this._clearError();
        }

        if (this._isDirty()) {
            this._buttons.show();
        }
        else {
            this._buttons.hide();
        }
    }

    private _changeProcessClick(e) {
        var options: TFS_Admin_Dialogs.SelectMigrateTargetDialog.Options =
        {
            processName: this._processName,
            projectName: this._options.name,
            projectId: this._options.projectId,
            refresh: () => { },
            processNameCallback: this._setProcessName,
            tfsContext: this._options.tfsContext
        };

        Dialogs.show(TFS_Admin_Dialogs.SelectMigrateTargetDialog, options);
        e.preventDefault();
    }

    private _setProcessName(processName: string) {
        this._processName = $('.process-template-name', this.getElement()).text(processName).text();
        this._updateProcessLink();
    }

    private _updateProcessLinkVisibility() {
        let processNameLinkText: any = $('.process-template-name', this.getElement());
        processNameLinkText.removeAttr('hidden');
    }

    private _updateProcessLink() {
        if (this._processName) {
            let processNameLink: JQuery = $('.process-template-name-link', this.getElement());

            const locationService = Service.getLocalService(Navigation_Location.LocationService);
            const url = locationService.routeUrl("ms.vss-work-web.work-customization-route", { _a: "workitemtypes", "process-name": this._processName });
    
            processNameLink.attr('href', url);
        }
    }
}

VSS.initClassPrototype(GroupInfoControl, {
    _nameInput: null,
    _descriptionInput: null,
    _buttons: null,
    _errorSection: null,
    _errorMessage: null,
    _saveButton: null,
    _undoButton: null,
    _currentName: null,
    _currentDescription: null
});

VSS.classExtend(GroupInfoControl, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(GroupInfoControl, '.group-info-control')

export class ProjectInfoControl extends GroupInfoControl {
    public static enhancementTypeName: string = 'tfs.admin.ProjectInfoControl';
    private _httpClient: Operations_RestClient.OperationsHttpClient;
    private _jobId: any;
    private _statusIndicator: StatusIndicator.StatusIndicator;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this._httpClient = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getHttpClient<Operations_RestClient.OperationsHttpClient>(Operations_RestClient.OperationsHttpClient);

        // Find elements
        this._nameInput = $('.group-name-input', this.getElement());
        this._descriptionInput = $('.group-description-input', this.getElement());
        this._projectVisibilityOption = $('.group-visibility-option', this.getElement());
        this._buttons = $('.group-info-buttons', this.getElement()).hide();
        this._errorSection = $('.group-info-errors', this.getElement()).hide();
        this._errorMessage = $('.group-info-error-message', this.getElement());

        // Initialize elements
        Utils_Core.delay(this, 100, function () {
            this._setAutoTextArea();
        }); // delay until size is determined by layout

        Utils_UI.Watermark(this._descriptionInput, { watermarkText: AdminResources.EditGroupDescriptionWatermark });
        this._descriptionInput.keyup(delegate(this, this._onDescriptionInputKeyup));
        this._descriptionInput.bind('blur focus', delegate(this, this._onFocus));
        this._descriptionInput.val(this._options.description);

        this._projectVisibilityOption.click(delegate(this, this._showChangeVisibilityConfirmationDialog));

        // Save original values
        this._currentDescription = this._options.description;
        this._nameInput.val(this._options.name);
        this._currentName = this._options.name;
    }

    public _isDirty() {
        return this._descriptionIsDirty() || this._nameIsDirty();
    }

    public _descriptionIsDirty() {
        return (this._currentDescription || "") !== (this._options.description || "");
    }

    public _nameIsDirty() {
        return this._currentName !== this._options.name;
    }

    public _onSave() {
        if (this._descriptionIsDirty() && !this._nameIsDirty()) {
            this._descriptionInput.focus();
            var projHttpClient: TFS_Project_WebApi.ProjectHttpClient = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getHttpClient<TFS_Project_WebApi.ProjectHttpClient>(TFS_Project_WebApi.ProjectHttpClient);
            var project = <TFS_Core_Contracts.WebApiProject>{
                description: this._currentDescription
            };
            projHttpClient.beginUpdateProject(this._options.projectId, project).then(
                (data) => {
                    this._jobId = data.id;
                    this._startMonitoring();
                },
                (e: Error) => {
                    this._setError(e.message);
                    this._buttons.show();
                });
        }
        else if (this._nameIsDirty()) {
            //No need to validate permissions as the user won't be able to edit the textbox without perms
            if (this._validateProjectName()) {
                //Now need to check to see if project name exists
                var projHttpClient: TFS_Project_WebApi.ProjectHttpClient = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getHttpClient<TFS_Project_WebApi.ProjectHttpClient>(TFS_Project_WebApi.ProjectHttpClient);
                projHttpClient.beginGetProject(this._currentName).then(
                    (project: TFS_Core_Contracts.WebApiProject) => {
                        //Project names are case-insensitive in the project model but we want to allow updates like 'Project1' -> 'PROJECT1'
                        if (this._options.projectId !== project.id) {
                            this._setError(Utils_String.format(AdminResources.RenameProjectNameExists, this._currentName));
                        }
                        else {
                            this._showRenameConfirmationDialog();
                        }
                    },
                    () => {
                        this._showRenameConfirmationDialog();
                    });
            }
        }
    }

    private _startMonitoring(statusIndicatorContainer?: JQuery, reloadOnSuccess?: boolean, successCallback?: () => void, errorCallback?: (message: string) => void): void {
        const container = statusIndicatorContainer ? statusIndicatorContainer : this.getElement();
        this._statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, container, { center: true, imageClass: "big-status-progress", message: '' });
        this._statusIndicator.start();

        this._monitorProgress(reloadOnSuccess, successCallback, errorCallback);
    }

    private _monitorProgress(reloadOnSuccess?: boolean, successCallback?: () => void, errorCallback?: (message: string) => void): boolean {
        this._httpClient.getOperation(this._jobId)
            .then((data) => {
                this._handleOperationStatus(data, reloadOnSuccess, successCallback, errorCallback);
            }, (e: Error) => {
                this._handleOperationError(e.message, errorCallback);
            });
        return false;
    }

    private _stopMonitoring(): void {
        this.cancelDelayedFunction("monitorProgress");
    }

    private _handleOperationStatus(data: Operations_Contracts.Operation, reloadOnSuccess?: boolean, successCallback?: () => void, errorCallback?: (message: string) => void): void {
        switch (data.status) {
            case Operations_Contracts.OperationStatus.NotSet:
            case Operations_Contracts.OperationStatus.Queued:
            case Operations_Contracts.OperationStatus.InProgress:
                this._renderProgress(true, reloadOnSuccess, successCallback, errorCallback);
                break;

            case Operations_Contracts.OperationStatus.Succeeded:
                if (successCallback) {
                    successCallback();
                }
                this._renderProgress(false, reloadOnSuccess);
                break;

            case Operations_Contracts.OperationStatus.Failed:
            case Operations_Contracts.OperationStatus.Cancelled:
                this._handleOperationError("", errorCallback);
                break;

            default:
                break;
        }
    }

    private _handleOperationError(message: string, customCallback: (message: string) => void) {
        if (customCallback) {
            customCallback(message);
        } else {
            this._buttons.show();
            this._setError(message);
        }

        this._statusIndicator.complete();
        this._stopMonitoring();
    }

    private _renderProgress(showProgressIndicator: boolean, reloadPage?: boolean, successCallback?: () => void, errorCallback?: (message: string) => void): void {
        if (showProgressIndicator) {
            this.delayExecute("monitorProgress", 1000, true, () => this._monitorProgress(reloadPage, successCallback, errorCallback));
        }
        else {
            this._statusIndicator.complete();
            this._options.description = this._currentDescription;
            if (reloadPage) {
                window.location.reload();
            } else {
                this._onUndo();
            }
        }
    }

    public _onUndo() {
        this._clearError();
        this._nameIsValid = true;

        this._undoDescription();

        this._nameInput.val(this._options.name);
        this._nameInput.blur();
        this._currentName = this._options.name;

        this._buttons.hide();
        this._descriptionInput.focus();

        this._nameInput.closest('.inline-input-wrapper').removeClass('invalid');
        this._saveButton.button('option', 'disabled', false);
    }

    private _undoDescription() {
        this._descriptionInput.val(this._options.description);
        this._descriptionInput.AutoTextArea('resize');
        this._descriptionInput.blur();
        this._currentDescription = this._options.description;
    }

    private _projectVisibilityStringToEnum(projectVisibilityString: string): TFS_Core_Contracts.ProjectVisibility {
        if (projectVisibilityString === ServerConstants.ProjectVisibilityConstants.EveryoneInTenant) {
            return TFS_Core_Contracts.ProjectVisibility.Organization;
        }
        else if (projectVisibilityString === ServerConstants.ProjectVisibilityConstants.Everyone) {
            return TFS_Core_Contracts.ProjectVisibility.Public;
        }
        else if (projectVisibilityString === ServerConstants.ProjectVisibilityConstants.TeamMembers) {
            return TFS_Core_Contracts.ProjectVisibility.Private;
        } else {
            throw new Error(Utils_String.format(AdminResources.ChangeProjectVisibilityDialog_VisibilityValueInvalid, projectVisibilityString));
        }
    }

    private _onProjectVisibilityChange = (updatedVisibilityOption: string, successCallback: () => void, errorCallback: (message: string) => void): void => {
        this._currentProjectVisibility = updatedVisibilityOption;

        var projectVisibilityEnum = this._projectVisibilityStringToEnum(this._currentProjectVisibility);
        var projHttpClient: TFS_Project_WebApi.ProjectHttpClient = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getHttpClient<TFS_Project_WebApi.ProjectHttpClient>(TFS_Project_WebApi.ProjectHttpClient);
        var project = <TFS_Core_Contracts.WebApiProject>{
            visibility: projectVisibilityEnum
        };
        projHttpClient.beginUpdateProject(this._options.projectId, project).then(
            (data) => {
                this._jobId = data.id;
                this._startMonitoring($('.status-indicator-container'), true, successCallback, errorCallback);
            },
            (e: Error) => {
                errorCallback(e.message);
            });
    }

    private _showChangeVisibilityConfirmationDialog(): void {
        Dialogs.show(TFS_Admin_Dialogs.ChangeVisibilityConfirmationDialog, {
            currentVisibility: this._options.projectVisibility,
            onChangeClick: this._onProjectVisibilityChange,
            showOrgVisibilityOption: this._options.showOrgVisibilityOption,
            showPublicVisibilityOption: this._options.showPublicVisibilityOption,
            isPublicVisibilityOptionEnabled: this._options.isPublicVisibilityOptionEnabled,
            isOrgVisibilityOptionEnabled: this._options.isOrgVisibilityOptionEnabled,
        });
    }

    private _showRenameConfirmationDialog() {
        Dialogs.show(TFS_Admin_Dialogs.RenameProjectConfirmationDialog, {
            tfsContext: this._options.tfsContext,
            newProjectName: this._currentName,
            oldProjectName: this._options.name,
            description: this._currentDescription,
            updateDescription: true,
            projectId: this._options.projectId,
            successCallback: delegate(this, this._onProjectRenamed),
            cancelCallback: delegate(this, this._onProjectRenameCanceled)
        });
    }

    private _onProjectRenamed() {
        var url = this._options.tfsContext.navigation.collection.uri + encodeURIComponent(this._currentName) + '/_admin';
        this._disableDirtyCheck();
        window.location.href = url;
    }

    private _onProjectRenameCanceled() {
        this._onUndo();
    }

    public _setAutoTextArea() {
        this._descriptionInput.AutoTextArea();
        this._nameInput.blur();
    }

    public _onNameInputKeyup() {
        this._validateProjectName();
    }

    public _validateProjectName(): boolean {
        var projectName = this._nameInput.val();
        this._nameIsValid = ProjectNameValidator.validate(projectName);

        if (this._nameIsValid) {
            this._clearError();
        }
        else if (projectName.length > 0) {
            this._setError(Utils_String.format(AdminResources.CreateProjectProjectNameInvalid, projectName));
        }
        else {
            //Gets rid of the error message in the edge case where the input goes from "#" -> ""
            this._setError("");
        }

        this._checkMaxLength(this._nameInput);
        this._currentName = $.trim(this._nameInput.val());
        if (!this._currentName || !this._nameIsValid) {
            this._nameInput.closest('.inline-input-wrapper').addClass('invalid');
            this._saveButton.button('option', 'disabled', true);
        }
        else {
            this._nameInput.closest('.inline-input-wrapper').removeClass('invalid');
            this._saveButton.button('option', 'disabled', false);
        }

        this._evaluateButtonState();
        return this._nameIsValid;
    }
}

VSS.classExtend(ProjectInfoControl, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(ProjectInfoControl, '.project-info-control')

export class TeamInfoControl extends GroupInfoControl {
    public static enhancementTypeName: string = 'tfs.admin.TeamInfoControl';
    private _statusIndicator: StatusIndicator.StatusIndicator;

    public _onSave() {

        var that = this;
        var webContext = Context.getDefaultWebContext();

        var coreClient = getClient();
        that.showBusyOverlay();
        this._statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this, { center: true, imageClass: "big-status-progress", message: Utils_String.htmlEncode(AdminResources.ProgressPleaseWait) });
        this._statusIndicator.start();

        coreClient.updateTeam({
            name: this._currentName,
            description: this._currentDescription
        } as WebApiTeam,
            webContext.project.id,
            webContext.team.id
        ).then((team: WebApiTeam) => {
            // If team name has changed, redirect to new action url
            if (that._options.name !== team.name) {
                that._disableDirtyCheck();
                window.location.href = that._options.tfsContext.getActionUrl(null, null, { team: team.name });
            }
            else {
                that._options.name = team.name;
                that._options.description = team.description;

                that._onUndo();
            }
            that.hideBusyOverlay();
            this._statusIndicator.complete();
            that._clearError();
        }, (error: any) => {
            that._buttons.show();
            that._setError(error.message);
            that.hideBusyOverlay();
            this._statusIndicator.complete();
        });
    }

}

VSS.classExtend(TeamInfoControl, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(TeamInfoControl, '.team-info-control')

class LicensesListControl extends Grids.GridO<any> {
    public static enhancementTypeName: string = 'tfs.admin.LicensesListControl';

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            height: '100%',
            header: false,
            sharedMeasurements: false,
            allowMultiSelect: false,
            initialSelection: false,
            columns: <any[]>[{
                text: AdminResources.ProjectName,
                width: '100%'
            }]
        }, options));
    }

    public initialize() {
        this._setSource();

        super.initialize();
    }

    public setDefaultLicense(licenseTypeId) {
        var i, licenseType;
        for (i = 0; i < this._options.licenseTypes.length; i++) {
            licenseType = this._options.licenseTypes[i];
            licenseType.IsDefault = licenseTypeId === licenseType.Id;
        }

        this._setSource();
        this._options.keepSelection = true;
        this.initializeDataSource();
    }

    private _setSource() {
        this._options.source = $.map(this._options.licenseTypes, function (licenseType) {
            if (licenseType.IsDefault) {
                return [[Utils_String.format(AdminResources.DefaultLicenseName, licenseType.Name)]];
            }
            else {
                return [[licenseType.Name]];
            }
        });
    }
}

Controls.Enhancement.registerEnhancement(LicensesListControl, '.licenses-list-control')

class LicensesView extends Controls.BaseControl {
    public static enhancementTypeName: string = 'tfs.admin.LicensesView';

    private _listControl: any;
    private _infoPane: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._attachMenuHandlers();

        this._listControl = <LicensesListControl>Controls.Enhancement.ensureEnhancement(LicensesListControl, $('.licenses-list-control', this.getElement()));

        this._infoPane = <Panels.AjaxPanel>Controls.Enhancement.enhance(Panels.AjaxPanel, $('.licenses-info', this.getElement()), {
            earlyInitialize: false,
            url: this._options.tfsContext.getActionUrl('Display', 'licenses', { area: 'api', includeLanguage: true })
        });
        this._infoPane._element.bind('set-default-license', delegate(this, this._onSetDefaultLicense));

        this._listControl._element.bind(Grids.GridO.EVENT_SELECTED_INDEX_CHANGED, delegate(this, this._onLicenseChanged));
        this._listControl.setSelectedRowIndex(0);
    }

    private _onSetDefaultLicense(args?, params?) {
        var that = this, licenseTypeId = params.licenseTypeId;
        TFS_Core_Ajax.postHTML(
            this._options.tfsContext.getActionUrl('SetDefaultLicenseType', 'licenses', { area: 'api' }),
            { licenseTypeId: licenseTypeId },
            function (data) {
                that._listControl.setDefaultLicense(licenseTypeId);
            },
            null,
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(AdminResources.ProgressPleaseWait),
                    target: this.getElement()
                }
            }
        );
    }

    private _onLicenseChanged(args?, selectedRowIndex?, selectedDataIndex?) {
        var selectedLicense = this._listControl._options.licenseTypes[selectedRowIndex];
        if (selectedLicense) {
            this._infoPane._options.urlParams = { licenseTypeId: selectedLicense.Id };
            this._infoPane.initialize();
        }
    }

    private _attachMenuHandlers() {
        var that = this;
        Menus.menuManager.attachExecuteCommand(function (sender, args) {
            if (args.get_commandName() === "export-licenses-action") {
                window.location.href = that._options.tfsContext.getActionUrl('Export', 'licenses', { area: 'api' });
            }
        });
    }
}

VSS.initClassPrototype(LicensesView, {
    _listControl: null,
    _infoPane: null
});

VSS.classExtend(LicensesView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(LicensesView, '.licenses-view')

class LicenseMembersControl extends TFS_Admin_Common.MembershipControl {
    public static enhancementTypeName: string = 'tfs.admin.LicenseDisplay';

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        TFS_Admin_Dialogs.ManageGroupMembersDialog.bindIdentityGridOpenGroup(this.getElement());
    }

    public _prepareActionParams(): { actionUrl: string; params: any; } {
        return {
            actionUrl: this._options.tfsContext.getActionUrl('ReadLicenseUsers', 'identity', { area: 'api' }),
            params: {
                licenseTypeId: this._options.licenseTypeId
            }
        };
    }

    public _prepareSaveIdentities(pendingChanges): any {
        pendingChanges.existingUsers = $.map(pendingChanges.existingUsers, function (existingUser) {
            return existingUser.tfid;
        });

        return {
            actionUrl: this._options.tfsContext.getActionUrl('AddLicenseMembers', 'identity', { area: 'api' }),
            params: {
                newUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.newUsers),
                existingUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.existingUsers),
                licenseTypeId: this._options.licenseTypeId
            }
        };
    }

    public _prepareRemoveIdentity(): any {
        return {
            actionUrl: this._options.tfsContext.getActionUrl('EditLicenseMembership', 'identity', { area: 'api' }),
            params: {
                licenseTypeId: this._options.licenseTypeId
            }
        };
    }

    public _getActionItems() {
        var items = super._getActionItems();
        var disabled = false;
        if (this._options.disableAdd) {
            disabled = true;
        }
        items.unshift({ separator: true });
        items.unshift({ id: 'set-default', text: AdminResources.SetDefaultLicense, noIcon: true, disabled: this._options.isDefault || disabled });

        return items;
    }

    public _onMenuItemClick(e?: any): any {
        var command = e.get_commandName();

        if (command === 'set-default') {
            this._fire('set-default-license', { licenseTypeId: this._options.licenseTypeId });
        }
        else {
            super._onMenuItemClick(e);
        }
    }
}

VSS.classExtend(LicenseMembersControl, TfsContext.ControlExtensions);

class LicenseDisplay extends Controls.BaseControl {
    public static enhancementTypeName: string = 'tfs.admin.LicenseDisplay';

    private _licenseMembersGrid: any;
    private _disableAdd: boolean;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this._licenseMembersGrid = <LicenseMembersControl>Controls.Enhancement.enhance(LicenseMembersControl, $('.license-members-control', this.getElement()), {
            licenseTypeId: this._options.licenseType.Id,
            editMembers: true,
            isDefault: this._options.licenseType.IsDefault,
            disableAdd: false
        });
    }
}

VSS.initClassPrototype(LicenseDisplay, {
    _licenseMembersGrid: null
});

VSS.classExtend(LicenseDisplay, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(LicenseDisplay, '.display-license-control')

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Controls", exports);
