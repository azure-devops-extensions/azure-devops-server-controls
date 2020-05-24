///<amd-dependency path="jQueryUI/core"/>
///<amd-dependency path="jQueryUI/button"/>
///<amd-dependency path="jQueryUI/dialog"/>
///<amd-dependency path="jQueryUI/tabs"/>

/// <reference types="jquery" />
/// <reference types="knockout" />

import { ChangeVisibilityDialogContentProps, createChangeVisibilityDialogContentIn } from "Admin/Scripts/ChangeVisibilityDialogContent";
import { AdminProjectHomeDataProviderContributionId, IAdminProjectHomeData } from "Admin/Scripts/IAdminProjectHomeData";
import { ProjectNameValidator } from "Admin/Scripts/ProjectNameValidator";
import { IUrlParameters, MyExperiencesUrls } from "Presentation/Scripts/TFS/TFS.MyExperiences.UrlHelper";
import * as ReactDOM from "react-dom";
import * as ProcessTemplateContracts from "TFS/WorkItemTracking/ProcessTemplateContracts";
import * as ProcessTemplateRestClient from "TFS/WorkItemTracking/ProcessTemplateRestClient";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as VSS_Controls_FileInput from "VSS/Controls/FileInput";
import "VSS/LoaderPlugins/Css!Areas";
import "VSS/LoaderPlugins/Css!Site";

import VSS = require("VSS/VSS");
import Admin = require("Admin/Scripts/TFS.Admin");
import AdminControlFactory = require("Admin/Scripts/Common/ControlFactory");
import adminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import presentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import Utils_Clipboard = require("VSS/Utils/Clipboard");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Menus = require("VSS/Controls/Menus");
import Notifications = require("VSS/Controls/Notifications");
import Combos = require("VSS/Controls/Combos");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Service = require("VSS/Service");
import Navigation_Services = require("VSS/Navigation/Services");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_UI_Controls_Accessories = require("Presentation/Scripts/TFS/TFS.UI.Controls.Accessories");
import TFS_Admin_ConnectedServices = require("Admin/Scripts/TFS.Admin.ConnectedServices");
import TFS_Admin_ServiceEndpoints = require("Admin/Scripts/TFS.Admin.ServiceEndpoints");
import TFS_Project_WebApi = require("Presentation/Scripts/TFS/TFS.Project.WebApi");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import TFS_Core_RestClient = require("TFS/Core/RestClient");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Utils_Html = require("VSS/Utils/Html");
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Picker_Services = require("VSS/Identities/Picker/Services");
import Identities_Picker_Controls = require("VSS/Identities/Picker/Controls");
import Telemetry = require("VSS/Telemetry/Services");
import Controls_TreeView = require("VSS/Controls/TreeView");
import Locations = require("VSS/Locations");
import Context = require("VSS/Context");
import Events_Action = require("VSS/Events/Action");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Platform = require("VSS/Common/Contracts/Platform");
import WebApi_Constants = require("VSS/WebApi/Constants");
import OrchestrationContracts = require("VSS/ReparentCollection/Contracts");
import DomainUrlMigrationRestClient = require("VSS/NewDomainUrlMigration/RestClient");

var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var hostConfig = TFS_Host_TfsContext.TfsContext.getDefault().configuration;
var TfsContext = TFS_Host_TfsContext.TfsContext;
var domElem = Utils_UI.domElem;

module AdminDialogConstants {
    export var SshKeysPath = "_details/security/Keys/";
}

module SshKeysUrlHelper {
    export function getActionUrl(context: TFS_Host_TfsContext.TfsContext, action: string): string {
        return context.configuration.getRootPath() + AdminDialogConstants.SshKeysPath + action + '?__v=' + context.configuration.getWebApiVersion();
    }
}

class IdentityHeaderControl extends Controls.BaseControl {

    public static _controlType: string = 'IdentityHeaderControl';

    constructor(options?) {
        super(options);
    }

    public initialize() {
        this._element.addClass('identity-header');
        this._element.append(IdentityImage.identityImageElement(null, this._options.teamFoundationId, { t: $.now() }));

        $(domElem('div')).appendTo(this._element)
            .addClass('identity-header-name')
            .text(this._options.header);

        $(domElem('div')).appendTo(this._element)
            .addClass('identity-header-subheader')
            .text(this._options.subHeader);
    }
}

export interface IDialogButtonSetup {
    id: string;
    text: string;
    click: (e?: any) => void;
    disabled?: string;
    class?: string;
}

function setDialogButtons(element: JQuery, buttons: IDialogButtonSetup[]): void {
    Dialogs.preventClickingDisabledButtons(element, buttons);
    element.dialog('option', 'buttons', buttons);

    // When we update the buttons, JQueryUI removes the button pane and adds a new one, which shows
    // up after the resize handles, which screws up the tab order. So we have to fix that.
    const buttonPane = element.siblings(".ui-dialog-buttonpane");
    const firstResizeHandle = element.siblings(".ui-resizable-handle").first();
    buttonPane.insertBefore(firstResizeHandle);
}

export interface AdminDialogOptions extends Dialogs.IModalDialogOptions {
    mainTitle?: string;
    contentHeader?: string;
    contentDescription?: string;
    tableLabel?: string;
    joinToGroupTfid?: string;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    tfid?: string;
    saveCallback?: any;
    successCallback?: any;
    onClose?: any;
}

export interface AdminIdentityDialogOptions extends AdminDialogOptions {
    contentHeader?: string;
    contentDescription?: string;
    operationScope?: Identities_Picker_Services.IOperationScope;
    identityType?: Identities_Picker_Services.IEntityType;
    consumerId?: string;
    singleSelect?: boolean;
}

export class IdentityPickerDialog<TOptions extends AdminIdentityDialogOptions> extends Dialogs.ModalDialogO<AdminIdentityDialogOptions> {
    private static DIALOG_WIDTH: number = 700;
    private static DIALOG_HEIGHT: number = 350;

    private static CSS_OK_BUTTON = 'add-identity-dialog-main-ok-button';
    private static CSS_CANCEL_BUTTON = 'add-identity-dialog-main-cancel-button';
    private static CSS_CLOSE_BUTTON = 'add-identity-dialog-main-close-button';
    private static CSS_ADMIN_DIALOG = 'admin-dialog';
    private static CSS_IDENTITY_DIALOG = 'add-identity-dialog';
    private static CSS_SEARCH_CONTAINER = 'ip-dialog-search-container';
    private static CSS_MSA_HELPER_TEXT = 'dialog-add-user-helper-text';
    private static CSS_DIALOG_HEADER = 'dialog-header';
    private static CSS_MAIN_TABLE = 'main-table';
    private static CSS_ADD_ENTITY = 'add-user';
    private static CSS_DESCRIPTION = 'description';

    private _$data: JQuery;
    private _$wrapper: any;
    private _$contentDescriptionElement: JQuery;
    private _$dataDiv: any;
    private _groupMembershipOpType: string;

    protected _identityPickerSearchControl: Identities_Picker_Controls.IdentityPickerSearchControl;
    protected _isHosted: boolean;
    protected _isHostedMsaAccount: boolean;
    protected _requestContext: any;

    protected _cancelButton: IDialogButtonSetup;
    protected _closeButton: IDialogButtonSetup;
    protected _saveButton: IDialogButtonSetup;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        this._groupMembershipOpType = options.groupMembershipOpType ? options.groupMembershipOpType : TFS_Admin_Common.AdminUIHelper.ADD_MEMBERS;

        var contentDescription = adminResources.IdentityPickerDialog_SearchInstructions;
        if (this._groupMembershipOpType == TFS_Admin_Common.AdminUIHelper.ADD_AS_MEMBER) {
            contentDescription = adminResources.IdentityPickerDialog_SearchInstructions_AsMember;
        }

        super.initializeOptions($.extend({
            width: IdentityPickerDialog.DIALOG_WIDTH,
            minWidth: IdentityPickerDialog.DIALOG_WIDTH - 200,
            height: IdentityPickerDialog.DIALOG_HEIGHT,
            minHeight: IdentityPickerDialog.DIALOG_HEIGHT - 200,
            tableLabel: adminResources.IdentityPickerDialog_UserOrGroupPrompt, //text-box prompt
            contentHeader: this._options.contentHeader ? this._options.contentHeader : adminResources.IdentityPickerDialog_AddUsersAndGroupsTitle, //titlebar
            contentDescription: this._options.contentDescription ? this._options.contentDescription : contentDescription, //description of dialog
        }, options));
    }

    public initialize() {
        super.initialize();
        this._isHosted = tfsContext.isHosted;
        this._isHostedMsaAccount = this._isHosted && !tfsContext.isAADAccount;
        this._constructDialog();
        var e: JQueryEventObject = $.Event(Identities_Picker_Controls.IdentityPickerSearchControl.INVALID_INPUT_EVENT);
        (<any>e).type = Identities_Picker_Controls.IdentityPickerSearchControl.INVALID_INPUT_EVENT;
        this._setSaveButtonState(e);
        this._addEvents();
        this._addDialogOptions();
    }

    private _constructDialog() {
        var dataTableCell,
            dataTable, dataTableRow,
            identityPickerId = "identityPicker" + Controls.getId();

        this._saveButton = {
            id: IdentityPickerDialog.CSS_OK_BUTTON,
            text: Utils_String.htmlEncode(adminResources.SaveChanges),
            click: () => { this._onSaveClick(); },
            class: "cta"
        };

        this._cancelButton = {
            id: IdentityPickerDialog.CSS_CANCEL_BUTTON,
            text: Utils_String.htmlEncode(adminResources.Cancel),
            click: () => { this._onCancelClick(); }
        };

        this._closeButton = {
            id: IdentityPickerDialog.CSS_CLOSE_BUTTON,
            text: Utils_String.htmlEncode(adminResources.Close),
            click: () => { this._onCloseClick(); }
        };

        setDialogButtons(this._element, [this._saveButton, this._cancelButton]);

        this._$data = $(domElem('div')).css('height', '100%')
            .addClass(IdentityPickerDialog.CSS_IDENTITY_DIALOG);

        this._$wrapper = $(domElem('div'))
            .append(this._$data)
            .addClass(IdentityPickerDialog.CSS_ADMIN_DIALOG)
            .css('height', '100%');

        this._element.html(this._$wrapper);
        // Stop the default mousedown handler of JQuery uiDialog, which will set focus to the input box in the add member dialog
        this._element.mousedown((e) => {
            e.stopPropagation();
        });

        this.setTitle(this._options.contentHeader);

        this._$dataDiv = $(domElem('div')).appendTo(this._$data)
            .attr('id', 'main-context');

        // Add the main header
        if (this._options.mainTitle) {
            $(domElem('div')).appendTo(this._$dataDiv)
                .addClass(IdentityPickerDialog.CSS_DIALOG_HEADER)
                .text(this._options.mainTitle);
        }

        // Add the description
        this._$contentDescriptionElement = $(domElem('div')).appendTo(this._$dataDiv)
            .addClass(IdentityPickerDialog.CSS_DESCRIPTION)
            .text(this._options.contentDescription || '');

        // Add the table
        dataTable = $(domElem('table')).appendTo(this._$dataDiv).addClass(IdentityPickerDialog.CSS_MAIN_TABLE).innerWidth(IdentityPickerDialog.DIALOG_WIDTH - 100);

        // Add row to table
        dataTableRow = $(domElem('tr')).attr('overflow', 'scroll').appendTo(dataTable);

        // Add label
        dataTableCell = $(domElem('td')).appendTo(dataTableRow).outerWidth(150);
        $(domElem('label')).appendTo(dataTableCell)
            .attr("for", identityPickerId)
            .addClass(IdentityPickerDialog.CSS_ADD_ENTITY)
            .text(this._options.tableLabel);

        // Add identity picker control
        dataTableCell = $(domElem('td')).addClass(IdentityPickerDialog.CSS_SEARCH_CONTAINER).appendTo(dataTableRow);

        if (this._isHostedMsaAccount) {
            // Add row for the message
            var dataTableMessageRow = $(domElem('tr')).attr('overflow', 'scroll').appendTo(dataTable);
            $(domElem('td')).appendTo(dataTableMessageRow).outerWidth(150);
            // Add message
            $(domElem('td')).appendTo(dataTableMessageRow).addClass(IdentityPickerDialog.CSS_MSA_HELPER_TEXT).text(adminResources.IdentityPickerDialog_SeparateBySemicolons);
        }

        //default search IMS and Source, unless AsMember op
        var operationScope: Identities_Picker_Services.IOperationScope = { IMS: true, };
        if (!this._groupMembershipOpType || this._groupMembershipOpType == TFS_Admin_Common.AdminUIHelper.ADD_MEMBERS) {
            if (!this._isHosted) {
                operationScope.AD = true;
                operationScope.WMD = true;
            } else {
                operationScope.Source = true;
            }
        }

        //default search users and groups, unless AsMember op
        var identityType: Identities_Picker_Services.IEntityType = {
            Group: true,
        };
        if (!this._groupMembershipOpType || this._groupMembershipOpType == TFS_Admin_Common.AdminUIHelper.ADD_MEMBERS) {
            identityType.User = true;
        }

        //default no constraints
        var constraints: string[] = [];
        if (this._groupMembershipOpType && this._groupMembershipOpType == TFS_Admin_Common.AdminUIHelper.ADD_AS_MEMBER) {
            constraints.push(TFS_Admin_Common.AdminUIHelper.SEARCH_CONSTRAINT_NO_RESTRICTED_VISIBILITY_GROUPS);
        }

        //current and parent scope, unless AsMember op
        var projectScopeName: string = (tfsContext.contextData && tfsContext.contextData.project) ? tfsContext.contextData.project.name : null;
        var collectionScopeName: string = tfsContext.contextData && tfsContext.contextData.collection ? tfsContext.contextData.collection.name : null;
        if (this._groupMembershipOpType && this._groupMembershipOpType == TFS_Admin_Common.AdminUIHelper.ADD_AS_MEMBER) {
            if (projectScopeName && collectionScopeName) {
                //both cant be current
                collectionScopeName = null;
            }
        }

        let controlOptions =
            {
                operationScope: this._options.operationScope ? this._options.operationScope : operationScope,
                identityType: this._options.identityType ? this._options.identityType : identityType,
                consumerId: this._options.consumerId ? this._options.consumerId : TFS_Admin_Common.AdminUIHelper.ADD_MEMBER_DIALOG_CONSUMER_ID,
                multiIdentitySearch: this._options.singleSelect ? false : true,
                showContactCard: true,
                pageSize: 5
            } as Identities_Picker_Controls.IIdentityPickerSearchOptions;

        if (!TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage()) {
            controlOptions.extensionData =
                {
                    extensionId: TFS_Admin_Common.AdminUIHelper.TFS_ADMIN_IDENTITY_PICKER_SEARCH_EXTENSION_ID,
                    projectScopeName: projectScopeName,
                    collectionScopeName: collectionScopeName,
                    constraints: constraints,
                };

            this._identityPickerSearchControl = Controls.create(Identities_Picker_Controls.IdentityPickerSearchControl, dataTableCell, controlOptions);

            this._identityPickerSearchControl.focusOnSearchInput();
        } else {
            TFS_Admin_Common.AdminUIHelper.getSpsOrganizationIdentityPickerSearchClient()
                .then((client: Identities_Picker_RestClient.CommonIdentityPickerHttpClient) => {
                    controlOptions.httpClient = client;
                    controlOptions.consumerId = TFS_Admin_Common.AdminUIHelper.ADD_MEMBER_DIALOG_CONSUMER_ID_ORG;

                    this._identityPickerSearchControl = Controls.create(Identities_Picker_Controls.IdentityPickerSearchControl, dataTableCell, controlOptions);

                    this._identityPickerSearchControl.focusOnSearchInput();
                });
        }
    }

    public saveIdentities(): void {
        var result = this._identityPickerSearchControl.getIdentitySearchResult();
        var callback = this._options.saveCallback;
        if (callback) {
            // Callback to save
            if (!this._isHostedMsaAccount) {
                callback(result.resolvedEntities, []);
            } else {
                var inputValue = $('input', this.getElement()).val().trim();
                callback(result.resolvedEntities, result.unresolvedQueryTokens.concat(inputValue ? [inputValue] : []));
            }
            // Close dialog and return
            this.close();
            Diag.logTracePoint("IdentityPickerDialog.SaveChanges.Success");
            Diag.logTracePoint("IdentityPickerDialog.CloseDialog");
        }
    }

    private _addDialogOptions() {
        this._element.dialog('option', 'beforeClose', (event) => {
            return (!this._requestContext || this._requestContext.isComplete);
        });
    }

    private _addEvents(): void {
        this._bind(Identities_Picker_Controls.IdentityPickerSearchControl.INVALID_INPUT_EVENT, (event) => { this._setSaveButtonState(event); });
        this._bind(Identities_Picker_Controls.IdentityPickerSearchControl.VALID_INPUT_EVENT, (event) => { this._setSaveButtonState(event); });
    }

    private _onCloseClick(e?: JQueryEventObject): void {
        this.close();
        Diag.logTracePoint('IdentityPickerDialog.CloseDialog');
    }

    private _onCancelClick(e?: JQueryEventObject): void {
        this.close();
    }

    private _onSaveClick(e?: JQueryEventObject): void {
        Diag.logTracePoint("IdentityPickerDialog.SaveChanges.Click.Start");
        this.saveIdentities();
    }

    private _setSaveButtonState(e?: JQueryEventObject): void {
        if (!this._isHostedMsaAccount) {
            if (e && e.type == Identities_Picker_Controls.IdentityPickerSearchControl.VALID_INPUT_EVENT) {
                this._element.siblings('.ui-dialog-buttonpane').find('#' + this._saveButton.id).button('enable');
            }
            else {
                this._element.siblings('.ui-dialog-buttonpane').find('#' + this._saveButton.id).button('disable');
            }
        } else {
            this._element.siblings('.ui-dialog-buttonpane').find('#' + this._saveButton.id).button('enable');
        }
    }
}

VSS.initClassPrototype(IdentityPickerDialog, {
    _$data: null,
    _$wrapper: null,
    _$contentDescriptionElement: null,
    _identityPickerSearchControl: null,
    _saveButton: null,
    _$dataDiv: null,
    _cancelButton: null,
    _closeButton: null,
    _requestContext: null,
});

VSS.classExtend(IdentityPickerDialog, TfsContext.ControlExtensions);

export interface IdentitiesDialogOptions extends AdminDialogOptions {
    browseGroups?: boolean;
    browseAadGroups?: boolean;
    joinGroups?: boolean;
    joinGroupTfid?: string;
    joinGroupExpandParentScopes?: any;
    isTeam?: boolean;
    delayInit?: boolean;
    allowMultiSelect?: boolean;
    allowArbitraryEmailAddresses?: boolean;
    constrainToTfsUsersOnly?: boolean;
    showAllGroupsIfCollection?: boolean;
}

export class IdentitiesDialogO<TOptions extends IdentitiesDialogOptions> extends Dialogs.ModalDialogO<TOptions> {

    private _addMembersButton: any;
    private _backButton: any;
    private _data: any;
    private _identityBrowser: any;
    private _saveButton: any;
    private _wrapper: any;
    private _contentDescriptionElement: any;
    private _identityPickerControl: any;
    private _isAadGroupDailog: any;

    public _cancelButton: any;
    public _closeButton: any;
    public _requestContext: any;
    public _dataDiv: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            width: 665,
            minWidth: 665,
            height: 300,
            minHeight: 300,
            allowMultiSelect: true,
            allowArbitraryEmailAddresses: true,
            constrainToTfsUsersOnly: false,
            tableLabel: adminResources.AddUserTableText,
            contentHeader: tfsContext.isHosted ? adminResources.AddMemberHeaderHosted : adminResources.AddMemberHeaderOnPremise,
            contentDescription: tfsContext.isHosted ? adminResources.AddMemberDescriptionHosted : adminResources.AddMemberDescriptionOnPremise,
            useLegacyStyle: true
        }, options));
    }

    public initialize() {
        super.initialize();
        this._decorate();
        this._addEvents();
        this._addDialogOptions();
    }

    public _dataElement() {
        return this._data;
    }

    public _decorate() {
        var dataTableCell,
            dataTable, dataTableRow, browseContext, that = this,
            identityListAction, identityBrowseListAction, searchParams,
            identityPickerId = "identityPicker" + Controls.getId();

        this._saveButton = {
            id: 'add-identity-dialog-main-ok-button',
            text: Utils_String.htmlEncode(adminResources.SaveChanges),
            click: () => { this._onSaveClick(); },
            class: "cta"
        };

        this._cancelButton = {
            id: 'add-identity-dialog-main-cancel-button',
            text: Utils_String.htmlEncode(adminResources.Cancel),
            click: () => { this._onCancelClick(); }
        };

        this._closeButton = {
            id: 'add-identity-dialog-main-close-button',
            text: Utils_String.htmlEncode(adminResources.Close),
            click: () => { this._onCloseClick(); }
        };

        this._backButton = {
            id: 'add-identity-dialog-back-button',
            text: Utils_String.htmlEncode(adminResources.Back),
            click: () => { this._backToMain(); }
        };

        this._addMembersButton = {
            id: 'add-identity-dialog-browse-users-ok-button',
            text: Utils_String.htmlEncode(adminResources.Add),
            click: () => { this._onAddMembersClick(); },
            class: "cta",
            disabled: true
        };

        setDialogButtons(this._element, [this._saveButton, this._cancelButton]);

        this._data = $(domElem('div')).css('height', '100%')
            .addClass('add-identity-dialog');

        this._wrapper = $(domElem('div'))
            .append(this._data)
            .addClass('admin-dialog')
            .css('height', '100%');

        this._element.html(this._wrapper);

        this.setTitle(this._options.contentHeader);

        this._dataDiv = $(domElem('div')).appendTo(this._data)
            .attr('id', 'main-context');

        // Add the main header
        if (this._options.mainTitle) {
            $(domElem('div')).appendTo(this._dataDiv)
                .addClass('dialog-header')
                .text(this._options.mainTitle);
        }

        // Add the description
        this._contentDescriptionElement = $(domElem('div')).appendTo(this._dataDiv)
            .addClass('description')
            .text(this._options.contentDescription || '');

        // Add the table
        dataTable = $(domElem('table')).appendTo(this._dataDiv).addClass('main-table');

        // Add row to table
        dataTableRow = $(domElem('tr')).appendTo(dataTable);

        // Add label
        dataTableCell = $(domElem('td')).appendTo(dataTableRow);
        $(domElem('label')).appendTo(dataTableCell)
            .attr("for", identityPickerId)
            .addClass('add-user')
            .text(this._options.tableLabel);

        // Add identity picker control
        dataTableCell = $(domElem('td')).appendTo(dataTableRow);

        searchParams = {};
        if (this._options.browseGroups) {
            identityListAction = this._options.tfsContext.getActionUrl('ReadAddableGroups', 'identity', { area: 'api', joinGroupTfid: this._options.joinGroupTfid, joinGroupExpandParentScopes: this._options.joinGroupExpandParentScopes, showAllGroupsIfCollection: this._options.showAllGroupsIfCollection } as TFS_Host_TfsContext.IRouteData);
            searchParams.joinGroups = this._options.joinGroups;
        }
        else if (tfsContext.isHosted && this._options.browseAadGroups) {
            identityListAction = this._options.tfsContext.getActionUrl('ReadAddableAadGroups', 'identity', { area: 'api', joinGroupTfid: this._options.joinGroupTfid } as TFS_Host_TfsContext.IRouteData);
            identityBrowseListAction = this._options.tfsContext.getActionUrl('ReadAddableAadGroups', 'identity', { area: 'api', joinGroupTfid: this._options.joinGroupTfid, localAadGroups: false } as TFS_Host_TfsContext.IRouteData);
            searchParams.joinGroups = this._options.joinGroups;
            this._isAadGroupDailog = true;
        }
        else {
            identityListAction = this._options.tfsContext.getActionUrl('ReadIdentitiesPageJson', 'identity', { area: 'api', filterServiceIdentities: this._options.isTeam } as TFS_Host_TfsContext.IRouteData);
            searchParams.membershipType = 'addableUsers';
        }
        this._identityPickerControl = <TFS_Admin_Common.IdentityPickerControl>Controls.BaseControl.createIn(TFS_Admin_Common.IdentityPickerControl, dataTableCell, {
            inputControlId: identityPickerId,
            delayInit: this._options.delayInit,
            allowMultiSelect: this._options.allowMultiSelect,
            identityListAction: identityListAction,
            searchParams: searchParams,
            allowFreeType: !this._options.browseGroups && !this._isAadGroupDailog,
            allowCheckName: !this._options.browseGroups && !this._isAadGroupDailog,
            allowArbitraryEmailAddresses: this._options.allowArbitraryEmailAddresses,
            constrainToTfsUsersOnly: this._options.constrainToTfsUsersOnly,
            AadidentityBrowseListAction: identityBrowseListAction,
            browseAction: function (event, tfids) {
                var browseContext = $('.browse-context', that._element);

                // Flip page to show selection of users and groups to add
                $('#main-context', that._element).hide();
                that._element.dialog('option', 'buttons', [that._addMembersButton, that._backButton]);

                browseContext.show();
                if (that._identityBrowser) {
                    that._identityBrowser.setCheckedIdentities(tfids);
                }
                else if (that._isAadGroupDailog) {
                    that._identityBrowser = <TFS_Admin_Common.BrowseAadGroupsControl>Controls.Enhancement.enhance(TFS_Admin_Common.BrowseAadGroupsControl, browseContext, {
                        identityListAction: this._options.AadidentityBrowseListAction,
                        searchParams: this._options.searchParams,
                        existingGroups: tfids,
                        gridItems: this._identityListData,
                        multiSelect: this._options.allowMultiSelect
                    });
                }
                else {
                    that._identityBrowser = <TFS_Admin_Common.BrowseIdentitiesControl>Controls.Enhancement.enhance(TFS_Admin_Common.BrowseIdentitiesControl, browseContext, {
                        identityListAction: this._options.identityListAction,
                        searchParams: this._options.searchParams,
                        existingGroups: tfids,
                        gridItems: this._identityListData,
                        multiSelect: this._options.allowMultiSelect
                    });
                }
            }
        });

        // Add the browse context div
        browseContext = $(domElem('div')).appendTo(this._data)
            .addClass('browse-context')
            .hide();

        this._backToMain();
    }
    public _evaluateSaveButtonState(): any {
        /// <returns type="any" />

        var pendingChanges = this._getPendingChanges();
        if (pendingChanges.newUsers.length + pendingChanges.existingUsers.length > 0) {
            this._element.siblings('.ui-dialog-buttonpane').find('#' + this._saveButton.id).button('enable');
            if (tfsContext.isHosted && this._options.browseAadGroups) {
                this._contentDescriptionElement.html(adminResources.AadGroupUsersAutoAssignLicense);
            }
        }
        else {
            this._element.siblings('.ui-dialog-buttonpane').find('#' + this._saveButton.id).button('disable');
        }
    }

    public _getPendingChanges(includeExistingUserNames?: boolean) {
        /// <param name="includeExistingUserNames" type="boolean" optional="true" />

        return this._identityPickerControl.getPendingChanges(includeExistingUserNames);
    }

    private _addDialogOptions() {
        var that = this;

        this._element.dialog('option', 'beforeClose', function (event) {
            return (!that._requestContext || that._requestContext.isComplete);
        });
    }

    private _addEvents() {
        var that = this;
        $('.browse-context', this._element).bind('pendingChanged', <any>function (event, args) {
            if ((args.pendingAdds.length + args.pendingDeletes.length === 0) || (args.totalCheckedCount === 0)) {
                that._element.siblings('.ui-dialog-buttonpane').find('#' + that._addMembersButton.id).button('disable');
            }
            else {
                that._element.siblings('.ui-dialog-buttonpane').find('#' + that._addMembersButton.id).button('enable');
            }
        });

        // When identity is added or removed, evaluate save button state
        this._identityPickerControl._element.bind('identityListChanged', function () {
            that._evaluateSaveButtonState();
        });
    }

    private _backToMain() {
        $('.browse-context', this._element).hide();
        $('#main-context', this._element).show();
        setDialogButtons(this._element, [this._saveButton, this._cancelButton]);
        this._evaluateSaveButtonState();
        $('#main-context', this._element).find('input').focus();
    }

    private _onAddMembersClick(e?) {
        var i, tfid, displayName, identityGrid = this._identityBrowser.getIdentityGrid();

        // Remove pendingDeletes from existing users/groups to add
        for (i = 0; i < identityGrid._pendingDeletes.length; i++) {
            tfid = identityGrid._pendingDeletes[i];

            this._identityPickerControl.removeIdentity(tfid);
        }

        // Add pending adds
        for (i = 0; i < identityGrid._pendingAdds.length; i++) {
            tfid = identityGrid._pendingAdds[i];
            displayName = identityGrid._identityInfoMap[tfid];

            this._identityPickerControl.addResolvedIdentity(displayName, displayName, tfid);
        }

        this._backToMain();
    }

    private _onCloseClick(e?) {
        this.close();
        Diag.logTracePoint('AddIdentityDialog.CloseDialog');
    }

    private _onCancelClick(e?) {
        this.close();
    }

    private _onSaveClick(e?) {
        Diag.logTracePoint("AddIdentityDialog.SaveChanges.Click.Start");
        this._saveIdentities();
    }

    public _saveIdentities() {
        var callback = this._options.saveCallback;

        // If we are provided a callback, then use that to save.
        // If none provided then, call up to serve to save
        if (callback) {
            // Callback to save
            callback(this._getPendingChanges(true));

            // Close dialog and return
            this.close();
            Diag.logTracePoint("AddIdentityDialog.SaveChanges.Success");
            Diag.logTracePoint("AddIdentityDialog.CloseDialog");
        }
    }
}

export class IdentitiesDialog extends IdentitiesDialogO<IdentitiesDialogOptions> { }

VSS.initClassPrototype(IdentitiesDialog, {
    _addMembersButton: null,
    _backButton: null,
    _cancelButton: null,
    _closeButton: null,
    _data: null,
    _identityBrowser: null,
    _requestContext: null,
    _saveButton: null,
    _wrapper: null,
    _dataDiv: null,
    _contentDescriptionElement: null,
    _identityPickerControl: null
});

VSS.classExtend(IdentitiesDialog, TfsContext.ControlExtensions);

export class RenameAccountDialog extends Dialogs.ModalDialogO<AdminDialogOptions> {
    private _data: any;
    private _requestContext: any;
    private _saveButton: any;
    private _cancelButton: any;
    private _closeButton: any;
    private _wrapper: any;
    private _dataDiv: any;
    private _warningTextDiv: any;
    private _accountUrlInputDiv: any;
    private _accountUrlInputTable: any;
    private _accountUrlInputTableRow: any;
    private _accountUrl: any;
    private _newNameInput: any;
    private _accountURLInputTable: any;
    private _existingAccountURL: any;
    private _headerSection: any;
    private _maxLength: any;
    private _accountName: any;
    private _errorMessage: any;
    private _checkboxDiv: any;
    private _confirmCheckbox: any;
    private _waitControl: any;
    private _renameWarningHeaderDiv: any;
    private _errorMessageImg: any;
    private _errorMessageText: any;
    private _errorMessageDiv: any;
    private _errorMessageImgDiv: any;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            width: 580,
            minWidth: 580,
            height: 390,
            minHeight: 390,
            allowMultiSelect: false,
            contentHeader: adminResources.RenameAccountUrlHeader,
            contentDescription: adminResources.RenameAccountDescription,
            buttons: {
                saveButton: {
                    id: 'ok',
                    text: adminResources.SaveChanges,
                    disabled: true,
                    click: () => { this._onSaveClick(); }
                },
                cancelButton: {
                    id: 'cancel',
                    text: adminResources.Cancel,
                    click: () => { this.onCancelClick(); }
                }
            }
        }, options));
    }

    public initialize() {
        super.initialize();
        this._existingAccountURL = $(".display-Advance-Url").text();

        // constant for name length.
        this._maxLength = 50;
        this.buildDialogElements();

        $(document).bind('click.confirmCheck', () => { this._onConfirmCheck(); });
    }

    private buildDialogElements() {
        /// This will create the UX layout and display all the elements and text.

        this._data = $(domElem('div'))
            .addClass('rename-account-dialog');

        this._wrapper = $(domElem('div'))
            .append(this._data)
            .addClass('admin-dialog')
            .css('height', '100%');

        this._element.html(this._wrapper);

        this._waitControl = Controls.create(StatusIndicator.WaitControl, this.getElement(), <StatusIndicator.IWaitControlOptions>{
            target: this._data,
            cancellable: false,
            message: adminResources.ProgressPleaseWait
        });

        this._headerSection = $(domElem('div')).appendTo(this._data)
            .addClass('rename-account-header-section');

        // add the main header
        if (this._options.mainTitle) {
            $(domElem('div')).appendTo(this._headerSection)
                .addClass('dialog-header')
                .text(this._options.mainTitle);
        }

        // add the header
        this.setTitle(this._options.contentHeader);

        this._dataDiv = $(domElem('div')).appendTo(this._data)
            .attr('id', 'main-context');

        // add the warning
        this._warningTextDiv = $(domElem('div')).appendTo(this._dataDiv).addClass('message-warning');

        // add the warning image + description
        this._createWarningHeader();

        // add the bullet points
        this._createWarningText();

        // checkbox to enable input
        this._createCheckboxText();

        // input area
        this._createUrlInputArea();

        // error messages
        this._createErrorFooter();
        this._hideError();
    }

    private _onConfirmCheck(e?) {
        var isChecked = $(this._confirmCheckbox).prop('checked');

        if (isChecked) {
            this._updateRenameButtons(true);
            $(this._accountUrlInputTable).removeAttr('disabled');
            $(this._accountName).removeAttr('disabled');
            $(this._accountName).focus();
        } else {
            $(this._accountUrlInputTable).attr('disabled', 'disabled');
            $(this._accountName).attr('disabled', 'disabled');
            this._updateRenameButtons(false);
        }
    }

    private _updateRenameButtons(enabled) {
        this.updateOkButton(enabled);
    }

    private _onCloseClick(e?) {
        this.close();
    }

    private _onCancelClick(e?) {
        this.close();
    }

    private _onSaveClick(e?) {
        this._hideError();
        if (this._validate()) {
            var accountName = $(this._accountName).val().trim();

            this._updateRenameButtons(false);
            this._accountName.attr('disabled', 'disabled');
            $(this._accountUrlInputTable).attr('disabled', 'disabled');

            this._waitControl.startWait()
            // make ajax call to submit the data.
            TFS_Core_Ajax.postMSJSON(tfsContext.getActionUrl('UpdateAccountAdvancedSettings', 'account', { area: 'api' }),
                {
                    newAccountName: accountName
                },
                // handle success.
                (success) => { this._postRenameSuccess(success); },
                //handle error
                (failure) => { this._postRenameFailure(failure); }
            );
        }
    }

    private _validate() {
        var accountName = $(this._accountName).val().trim();

        // required field validations.
        if (accountName.length === 0) {
            $(this._accountName).focus();
            this._showError(adminResources.RequiredField);
            return false;
        }
        return true;
    }

    private _postRenameSuccess(data) {
        // Need to update the URL so reload.
        if (data.Status == 'true') {
            Utils_Core.delay(this, 20000, function () { this._waitControl.endWait(); window.location.href = data.NewAccountUrl; });
        }
    }

    private _postRenameFailure(error) {
        $(this._accountUrlInputTable).removeAttr('disabled');
        this._updateRenameButtons(true);
        this._waitControl.endWait();

        switch (error.type) {
            case "Microsoft.VisualStudio.Services.Account.AccountPropertyException":
            case "Microsoft.VisualStudio.Services.Account.AccountNameTemporarilyReservedException":
            case "Microsoft.TeamFoundation.Framework.Server.TeamFoundationSecurityServiceException":
                this._showError(error.message);
                break;
            case "System.Web.HttpRequestValidationException":
                this._showError(adminResources.InvalidAccountName);
                break;
            default:
                this._showError(adminResources.SorryNoUpdate);
        }
    }

    private _showError(e) {
        this._errorMessageDiv.show();
        this._errorMessageImg.show();
        this._errorMessageText.show();
        this._errorMessageText.text(e);
    }

    private _hideError() {
        this._errorMessageDiv.hide();
        this._errorMessageImg.hide();
        this._errorMessageText.hide();
    }

    private _createErrorFooter() {
        this._errorMessageDiv = $(domElem('div')).appendTo($('#main-context'))
            .attr('id', 'account-error-rename')
            .addClass("error-message-div");

        this._errorMessageImgDiv = $(domElem('div')).appendTo(this._errorMessageDiv)
            .addClass('rename-err-footer-img');

        this._errorMessageImg = $('<span/>').appendTo(this._errorMessageImgDiv)
            .addClass('rename-error-message-icon icon')
            .attr('align', 'bottom');

        this._errorMessageText = $(domElem('div')).appendTo(this._errorMessageDiv)
            .addClass('error-message-accountRename');
    }

    private _createWarningHeader() {
        var _warnTable: any;
        var _warnTableRow: any;
        var _warnTableImg: any;
        var _warnTableTxt: any;

        this._renameWarningHeaderDiv = $(domElem('div')).appendTo(this._warningTextDiv)
            .addClass('rename-warning-header-div');

        _warnTable = $(domElem('table')).appendTo(this._warningTextDiv).addClass('rename-warning-header-div');
        _warnTableRow = $(domElem('tr')).appendTo(_warnTable);
        _warnTableImg = $(domElem('td')).appendTo(_warnTableRow).addClass('rename-warning-tbl-img');
        _warnTableTxt = $(domElem('td')).appendTo(_warnTableRow).addClass('rename-warning-tbl-txt');

        $('<span/>').appendTo(_warnTableImg)
            .addClass('rename-warning-icon');

        $(domElem('div')).appendTo(_warnTableTxt)
            .addClass('description-rename')
            .html(this._options.contentDescription);
    }

    private _createUrlInputArea() {
        var _domain: any;
        const useCodexDomainUrls = Context.getPageContext().webAccessConfiguration.useCodexDomainUrls;

        // TODO: Eventually remove this <div>/table HTML markup to use only <div>'s. Many legacy code has this <div>/table.
        this._accountUrlInputDiv = $(domElem('div')).appendTo(this._dataDiv)
        this._accountUrlInputTable = $(domElem('table')).appendTo(this._accountUrlInputDiv).addClass('inputAccountUrl');
        this._accountUrlInputTableRow = $(domElem('tr')).appendTo(this._accountUrlInputTable);
        this._accountUrl = $(domElem('td')).appendTo(this._accountUrlInputTableRow)
            .addClass('accountUrl-text')
            .text(adminResources.NewAccountUrl);
        
        _domain = tfsContext.navigation.publicAccessPoint.authority;
        if (useCodexDomainUrls) {
            if (_domain && _domain[_domain.length - 1] !== "/") {
                _domain = _domain +"/";
            }

            $(domElem('td')).appendTo(this._accountUrlInputTableRow)
                .addClass('tfs-domain')
                .text(_domain);

            this._newNameInput = $(domElem('td')).appendTo(this._accountUrlInputTableRow)
                .addClass('new-url-input');
        } else {
            this._newNameInput = $(domElem('td')).appendTo(this._accountUrlInputTableRow)
                .addClass('new-url-input');

            $(domElem('td')).appendTo(this._accountUrlInputTableRow)
            .addClass('tfs-domain')
            .text(_domain.substr(_domain.indexOf(".")));
        }

        

        this._accountName = $(domElem('input')).addClass('requiredInfoLight')
            .addClass('textbox')
            .attr('id', 'account-newname')
            .attr('type', 'text')
            .attr('maxlength', this._maxLength)
            .appendTo(this._newNameInput);                
    }

    private _createCheckboxText() {
        this._checkboxDiv = $(domElem('div'))
            .addClass('rename-warning-list')
            .appendTo(this._dataDiv);

        this._confirmCheckbox = $('<input type=checkbox>')
            .addClass('rename-checkbox')
            .attr('align', 'bottom')
            .attr('name', 'confirmCheck')
            .attr('id', 'confirm-check');
        this._confirmCheckbox.appendTo(this._checkboxDiv);

        $(domElem('label')).appendTo(this._checkboxDiv)
            .attr('for', 'confirm-check')
            .addClass('rename-checkbox-text')
            .text(adminResources.RenameWarning5);
    }

    private _createWarningText() {
        $(domElem('div')).appendTo(this._warningTextDiv)
            .addClass('rename-warning-list')
            .text(adminResources.RenameWarning1);

        $(domElem('div')).appendTo(this._warningTextDiv)
            .addClass('rename-warning-list')
            .html(adminResources.RenameWarning3 + this._existingAccountURL + adminResources.RenameWarning4 + this._existingAccountURL + adminResources.RenameWarning6);

        $(domElem('div')).appendTo(this._warningTextDiv)
            .addClass('rename-warning-list')
            .html(adminResources.RenameWarning2);
    }
}


VSS.initClassPrototype(RenameAccountDialog, {
    _data: null,
    _requestContext: null,
    _saveButton: null,
    _cancelButton: null,
    _closeButton: null,
    _wrapper: null,
    _dataDiv: null,
    _contentDescriptionElement: null
});

export class DeleteAccountDialog extends Dialogs.ModalDialogO<AdminDialogOptions> {
    private static ACCOUNT_DELETE_REASON_MAX_LENGTH: number = 200;

    private _data: any;
    private _wrapper: any;
    private _dataDiv: any;
    private _dataDivContent: any;
    private _warningTextDiv: any;
    private _accountName: any;
    private _errorMessage: any;
    private _errorPane: any;
    private _waitControl: any;
    private _deleteWarningHeaderDiv: any;
    private _errorMessageText: any;
    private _errorMessageDiv: any;
    private _whyDeleteAccountCombo: any;
    private _whyDeleteAccountTextbox: any;
    private _whyDeleteAccountReasonDiv: any;
    private _allAccountDeleteReasons: any;

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            width: 580,
            minWidth: 580,
            height: 450,
            minHeight: 450,
            allowMultiSelect: false,
            contentHeader: adminResources.DeleteAccountHeader,
            contentDescription: Utils_String.format(adminResources.DeletingYourAccountHeader, options.AccountName),
            buttons: {
                saveButton: {
                    id: 'ok',
                    text: adminResources.DeleteAccount,
                    class: "warning",
                    disabled: true,
                    click: () => { this._onSaveClick(); }
                },
                cancelButton: {
                    id: 'cancel',
                    text: adminResources.Cancel,
                    click: () => { this.onCancelClick(); }
                }
            }
        }, options));
    }

    public initialize() {
        super.initialize();

        TFS_Core_Ajax.getMSJSON(tfsContext.getActionUrl('GetSubscriptionId', 'account', { area: 'api' }),
            null,
            (data) => {

                if (this._element) { // making sure the dialog was not disposed in the meantime
                    let isLinkedToSubscription = data.subscriptionId != null;

                    if (!isLinkedToSubscription) {
                        this.updateOkButton(true);
                    }

                    this.buildDialogElements(isLinkedToSubscription);
                }
            });
    }

    private buildDialogElements(isLinkedToSubscription: boolean) {
        /// This will create the UX layout and display all the elements and text.

        this._data = $(domElem('div'))
            .addClass('delete-account-dialog');

        this._wrapper = $(domElem('div'))
            .append(this._data)
            .addClass('admin-dialog')
            .css('height', '100%');

        this._element.html(this._wrapper);

        this._waitControl = Controls.create(StatusIndicator.WaitControl, this.getElement(), <StatusIndicator.IWaitControlOptions>{
            target: this._data,
            cancellable: false,
            message: adminResources.DeletingAccount
        });

        let headerSection = $(domElem('div')).appendTo(this._data)
            .addClass('delete-account-header-section');

        // add the main header
        if (this._options.mainTitle) {
            $(domElem('div')).appendTo(headerSection)
                .addClass('dialog-header')
                .text(this._options.mainTitle);
        }

        // add the header
        this.setTitle(this._options.contentHeader);

        this._dataDiv = $(domElem('div')).appendTo(this._data)
            .attr('id', 'main-context');

        // Create error pane
        this._errorPane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._dataDiv, { message: { type: Notifications.MessageAreaType.Error } });

        // add the warning
        this._warningTextDiv = $(domElem('div')).appendTo(this._dataDiv).addClass('message-warning');

        this._dataDivContent = $(domElem('div')).appendTo(this._dataDiv)
            .addClass('delete-dailog-messagebox');

        // add the warning image + description
        this._createDailogContent(isLinkedToSubscription);

        // error messages
        this._createErrorFooter();
        this._hideError();

        $(domElem('div')).appendTo(this._wrapper)
            .addClass('delete-warning-tos')
            .html(adminResources.DeleteAccountTermsOfService);

        if (isLinkedToSubscription) {
            $(".delete-dailog-messagebox").css({ opacity: 0.5 });
            $(".delete-warning-tos").css({ opacity: 0.5 });
        }

        $(".message-area-control").hide();
    }

    private _onCloseClick(e?) {
        this.close();
    }

    private _onCancelClick(e?) {
        this.close();
    }

    private _onSaveClick(e?) {
        this._hideError();
        if (this._validate()) {
            var index, accountDeleteReason;
            index = this._whyDeleteAccountCombo.getSelectedIndex();
            accountDeleteReason = (index > 0 && index < this._allAccountDeleteReasons.length) ? this._allAccountDeleteReasons[index].DisplayText : "";
            if (accountDeleteReason === adminResources.AccountDeleteReason6) {
                accountDeleteReason = this._whyDeleteAccountTextbox.val();
            }

            var accountName = $(this._accountName).val().trim();

            this.updateOkButton(false);
            this._accountName.attr('disabled', 'disabled');

            this._waitControl.startWait()
            // make ajax call to submit the data.
            TFS_Core_Ajax.postMSJSON(tfsContext.getActionUrl('MarkAccountForDelete', 'account', { area: 'api' }),
                {
                    accountName: accountName,
                    accountDeleteReason: accountDeleteReason
                },
                // handle success.
                (success) => { this._postDeleteSuccess(success); },
                //handle error
                (error) => { this._postDeleteFailure(error); }
            );
        }
    }

    private _validate() {
        var accountName = $(this._accountName).val().trim();

        // required field validations.
        if (accountName.length === 0) {
            $(this._accountName).focus();
            this._showError(adminResources.RequiredField);
            return false;
        }
        return true;
    }

    private _postDeleteSuccess(data) {
        // Need to update the URL so reload.
        if (data.Status == 'true') {
            Utils_Core.delay(this, 20000, function () { this._waitControl.endWait(); window.location.href = data.redirectUrl; });
        }
        else {
            this._accountName.removeAttr('disabled');
            this.updateOkButton(true);
            this._waitControl.endWait();

            if (data.Html) {
                this._showHtmlError(data.ErrorMessage);
            }
            else if (data.ErrorMessage) {
                this._showError(data.ErrorMessage);
            }
            else {
                this._showError(adminResources.SorryNoDelete);
            }
        }
    }

    private _postDeleteFailure(error) {
        this._accountName.removeAttr('disabled');
        this.updateOkButton(true);
        this._waitControl.endWait();
        if (error.ErrorMessage) {
            this._showError(error.ErrorMessage);
        }
        else {
            this._showError(adminResources.SorryNoDelete);
        }
    }

    private _showError(e) {
        this._errorMessageDiv.show();
        this._errorMessageText.text(e);
    }

    private _showHtmlError(e) {
        this._errorPane.setMessage({ header: $("<div>" + e + "</div>"), type: Notifications.MessageAreaType.Error });
    }

    private _hideError() {
        this._errorMessageDiv.hide();
        this._errorPane.clear();
    }

    private _createErrorFooter() {
        this._errorMessageDiv = $(domElem('div')).appendTo(this._dataDivContent)
            .attr('id', 'account-error-delete')
            .addClass("delete-error-message-div");

        let errorMessageImgDiv = $(domElem('div')).appendTo(this._errorMessageDiv)
            .addClass('delete-err-footer-img');

        $('<span/>').appendTo(errorMessageImgDiv)
            .addClass('delete-error-message-icon icon')
            .attr('align', 'bottom');

        this._errorMessageText = $(domElem('div')).appendTo(this._errorMessageDiv)
            .addClass('error-message-accountDelete');
    }

    private _createDailogContent(isLinkedToSubscription: boolean) {
        let _warnTable = $(domElem('table')).appendTo(this._warningTextDiv).addClass('delete-warning-header-div');
        let _warnTableRow = $(domElem('tr')).appendTo(_warnTable);
        let _warnTableImg = $(domElem('td')).appendTo(_warnTableRow).addClass('delete-warning-tbl-img');
        let _warnTableTxt = $(domElem('td')).appendTo(_warnTableRow).addClass('delete-warning-tbl-txt');

        $('<span/>').appendTo(_warnTableImg)
            .addClass('delete-warning-icon');

        $(domElem('div')).appendTo(_warnTableTxt)
            .addClass('description-delete-p1')
            .html(isLinkedToSubscription ? adminResources.DeletingYourAccountErrorHeader : this._options.contentDescription);

        if (isLinkedToSubscription) {
            $(domElem('a')).appendTo(_warnTableTxt)
                .addClass('description-delete-p1')
                .text(adminResources.UnlinkSubscriptionPrompt)
                .attr({
                    'href': adminResources.UnlinkSubscriptionFwlink,
                    'target': '_blank'
                })
                .click(() => { this.close(); });
         }

        $(domElem('div')).appendTo(this._warningTextDiv).addClass('deleteHeaderdivider');

        $(domElem('div')).appendTo(this._dataDivContent)
            .addClass('description-delete-p2')
            .html(adminResources.DeletingYourAccountHeader1);

        $(domElem('div')).appendTo(this._dataDivContent)
            .text(adminResources.WhyDeleteAccount);

        var $comboElement = $(domElem('div')).appendTo(this._dataDivContent).addClass('delete-account-combo');
        this._whyDeleteAccountCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $comboElement,
            {
                allowEdit: false,
                comparer: Utils_String.defaultComparer,
                indexChanged: (selectedIndex) => { this._whyDeleteAccountComboChanged(selectedIndex); }
            });

        this._whyDeleteAccountReasonDiv = $(domElem('div')).appendTo(this._dataDivContent)
            .attr('id', 'account-delete-reason')
            .addClass("account-delete-reason-div");

        $(domElem('div')).appendTo(this._whyDeleteAccountReasonDiv)
            .addClass('description-delete-custom-reason')
            .text(adminResources.AccountDeleteCustomReason);

        this._whyDeleteAccountTextbox = $("<textarea />")
            .addClass('')
            .addClass('whyDeleteAccountTextboxinvisible')
            .attr('id', 'whyDeleteAccountTextbox')
            .appendTo(this._whyDeleteAccountReasonDiv)
            .attr('value', '')
            .attr('rows', '2')
            .attr('maxlength', DeleteAccountDialog.ACCOUNT_DELETE_REASON_MAX_LENGTH);

        this._whyDeleteAccountReasonDiv.hide();

        var that = this;

        TFS_Core_Ajax.getMSJSON(tfsContext.getActionUrl('GetAccountDeleteReason', 'account', { area: 'api' }),
            null,
            function (data) {
                that._allAccountDeleteReasons = [
                    {
                        key: "0", DisplayText: adminResources.PleaseSelect
                    }];

                if (data.data && data.data.length > 0) {
                    for (var index = 0; index < data.data.length; index++) {
                        that._allAccountDeleteReasons.push(data.data[index]);
                    }
                }

                that._whyDeleteAccountCombo.setSource($.map(that._allAccountDeleteReasons, function (reason) {
                    return reason.DisplayText;
                }));

                that._whyDeleteAccountCombo.setSelectedIndex(0, false);
            },
            null,
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: that._element.closest('.modal-dialog')
                }
            });

        $(domElem('div')).appendTo(this._dataDivContent)
            .addClass('delete-warning-warningtext')
            .html(adminResources.TypeInTheAccountName);

        // TODO: Eventually remove this <div>/table HTML markup to use only <div>'s. Many legacy code has this <div>/table.
        let accountUrlInputDiv = $(domElem('div')).appendTo(this._dataDivContent)

        let accountUrlInputTable = $(domElem('table')).appendTo(accountUrlInputDiv).addClass('inputAccountUrl');
        let accountUrlInputTableRow = $(domElem('tr')).appendTo(accountUrlInputTable);
        $(domElem('td')).appendTo(accountUrlInputTableRow)
            .addClass('deleteaccountUrl-text')
            .text(adminResources.Account);
        
        const useCodexDomainUrls = Context.getPageContext().webAccessConfiguration.useCodexDomainUrls;
        let domain = tfsContext.navigation.publicAccessPoint.authority;
        let accountNameContainer;
        if (useCodexDomainUrls) {
            if (domain && domain[domain.length - 1] !== "/") {
                domain = domain +"/";
            }
            $(domElem('td')).appendTo(accountUrlInputTableRow)
                .addClass('tfs-domain')
                .text(domain);
                accountNameContainer = $(domElem('td')).appendTo(accountUrlInputTableRow)
                .addClass('new-url-input');
        } else {
            accountNameContainer = $(domElem('td')).appendTo(accountUrlInputTableRow)
            .addClass('new-url-input');

            $(domElem('td')).appendTo(accountUrlInputTableRow)
                .addClass('tfs-domain')
                .text(domain.substr(domain.indexOf(".")));
        }

        this._accountName = $(domElem('input')).addClass('requiredInfoLight')
            .addClass('textbox')
            .attr('type', 'text')
            .appendTo(accountNameContainer);

        if (isLinkedToSubscription) {
            this._accountName.attr('disabled', 'disabled');
        }
    
    }

    private _whyDeleteAccountComboChanged(selectedIndex) {
        var index = this._whyDeleteAccountCombo.getSelectedIndex();
        var accountDeleteReasonKey = (index > 0 && index < this._allAccountDeleteReasons.length) ? this._allAccountDeleteReasons[index].DisplayText : "";
        if (accountDeleteReasonKey === adminResources.AccountDeleteReason6) {
            this._whyDeleteAccountReasonDiv.show();
        }
        else {
            this._whyDeleteAccountReasonDiv.hide();
        }
    }
}

VSS.initClassPrototype(DeleteAccountDialog, {
    _data: null,
    _wrapper: null,
    _dataDiv: null
});

export class ChangeAccountDomainUrlDialog extends Dialogs.ModalDialogO<AdminDialogOptions> {

    private _errorMessageImg: JQuery;
    private _errorMessageText: JQuery;
    private _errorMessageDiv: JQuery;
    private _errorMessageImgDiv: JQuery;
    private _confirmCheckbox: JQuery;
    private _waitControl: StatusIndicator.WaitControl;
    private _currentAccountUrl: string;
    private _targetAccountUrl: string;
    private _azuredevopsDomainUrls: boolean;
    private _migrationClient: DomainUrlMigrationRestClient.NewDomainUrlOrchestrationHttpClient;

    constructor(options?: any) {
        super(options);

        this._azuredevopsDomainUrls = options.CodexDomainUrls;
        this._currentAccountUrl = options.CurrentAccountUrl;
        this._targetAccountUrl = options.TargetAccountUrl;
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            width: 580,
            minWidth: 580,
            height: 450,
            minHeight: 450,
            allowMultiSelect: false,
            contentHeader: adminResources.ChangeDomainHeader,
            contentDescription: Utils_String.format(adminResources.ChangeDomainDescription, options.AccountName),
            buttons: {
                saveButton: {
                    id: 'ok',
                    disabled: true,
                    text: adminResources.ChangeDomainButton,
                    click: () => { this._onSaveClick(); }
                },
                cancelButton: {
                    id: 'cancel',
                    text: adminResources.Cancel,
                    click: () => { this.onCancelClick(); }
                }
            }
        }, options));
    }

    public initialize() {
        super.initialize();

        this._migrationClient = DomainUrlMigrationRestClient.getClient();

        this.buildDialogElements();

        $(document).bind('click.confirmCheck', () => { this._onConfirmCheck(); });
    }

    private buildDialogElements() {

        let data = $(domElem('div'));

        let wrapper = $(domElem('div'))
            .append(data)
            .addClass('admin-dialog')
            .css('height', '100%');

        this._element.html(<any>wrapper);

        this.setTitle(this._options.contentHeader);

        let dataDiv = $(domElem('div')).appendTo(data)

        this._waitControl = Controls.create(StatusIndicator.WaitControl, this.getElement(), <StatusIndicator.IWaitControlOptions>{
            target: data,
            cancellable: false,
            message: adminResources.ProgressPleaseWait
        });

        // add the warning image + description + content
        this._createWarnings(dataDiv);

        // consent checkbox to enable 'Migrate' button
        this._createConsentCheckbox(dataDiv);

        // error messages
        this._createErrorFooter(dataDiv);
        this._hideError();
    }

    private _createWarnings(dataDiv: JQuery) {
        let warningTextDiv = $(domElem('div')).appendTo(dataDiv).addClass('message-warning');
        let warningHeaderDiv = $(domElem('div')).appendTo(warningTextDiv).addClass('newdomain-warning-header-div');
        let warnTable = $(domElem('table')).appendTo(warningTextDiv).addClass('newdomain-warning-header-div');
        let warnTableRow = $(domElem('tr')).appendTo(warnTable);
        let warnTableImg = $(domElem('td')).appendTo(warnTableRow).addClass('newdomain-warning-tbl-img');
        let warnTableTxt = $(domElem('td')).appendTo(warnTableRow).addClass('newdomain-warning-tbl-txt');

        $(domElem('span'))
            .appendTo(warnTableImg)
            .addClass('newdomain-warning-icon');

        $(domElem('div'))
            .appendTo(warnTableTxt)
            .addClass('newdomain-warning-header')
            .html(this._options.contentDescription);

        $(domElem('div'))
            .appendTo(warningTextDiv)
            .addClass('newdomain-warning-list-header')
            .html(Utils_String.format(adminResources.ChangeDomainCurrentAccountUrl, Utils_String.format('<a href="{0}" target="_blank">{0}</a>', this._currentAccountUrl)));

        $(domElem('div'))
            .appendTo(warningTextDiv)
            .addClass('newdomain-warning-list-header')
            .html(Utils_String.format(adminResources.ChangeDomainTargetAccountUrl, Utils_String.format('<a href="{0}" target="_blank">{0}</a>', this._targetAccountUrl)));

        $(domElem('div'))
            .appendTo(warningTextDiv)
            .addClass('newdomain-warning-list-boldheader')
            .text(adminResources.ChangeDomainImpact);

        const warnings = [adminResources.ChangeDomainWarning1, adminResources.ChangeDomainWarning2, adminResources.ChangeDomainWarning3, adminResources.ChangeDomainWarning4];

        warnings.forEach(message => {
            $(domElem('div'))
                .appendTo(warningTextDiv)
                .addClass('newdomain-warning-list-item')
                .text(message);
        });
    }

    private _createConsentCheckbox(dataDiv: JQuery) {
        let checkboxDiv = $(domElem('div'))
            .addClass('newdomain-warning-list-item')
            .appendTo(dataDiv);

        this._confirmCheckbox = $('<input type=checkbox>')
            .addClass('newdomain-checkbox')
            .attr('name', 'confirmCheck')
            .attr('id', 'confirm-check');

        this._confirmCheckbox.appendTo(checkboxDiv);

        $(domElem('label'))
            .appendTo(checkboxDiv)
            .attr('for', 'confirm-check')
            .addClass('newdomain-checkbox-text')
            .text(adminResources.ChangeDomainConsent);
    }

    private _createErrorFooter(dataDiv: JQuery) {
        this._errorMessageDiv = $(domElem('div'))
            .appendTo(dataDiv)
            .addClass("newdomain-error-message-div");

        this._errorMessageImgDiv = $(domElem('div'))
            .appendTo(this._errorMessageDiv)
            .addClass('newdomain-err-footer-img');

        this._errorMessageImg = $('<span/>')
            .appendTo(this._errorMessageImgDiv)
            .addClass('newdomain-error-message-icon icon');

        this._errorMessageText = $(domElem('div'))
            .appendTo(this._errorMessageDiv)
            .addClass('newdomain-error-message-text');
    }

    private _showError(e) {
        this._errorMessageDiv.show();
        this._errorMessageImg.show();
        this._errorMessageText.show();
        this._errorMessageText.text(e);
    }

    private _hideError() {
        this._errorMessageDiv.hide();
        this._errorMessageImg.hide();
        this._errorMessageText.hide();
    }

    private _onConfirmCheck(e?) {
        let isChecked = $(this._confirmCheckbox).prop('checked');
        this.updateOkButton(isChecked);
    }

    private _onCloseClick(e?) {
        this.close();
    }

    private _onCancelClick(e?) {
        this.close();
    }

    private _onSaveClick(e?) {
        this._hideError();
        this.updateOkButton(false);
        this._waitControl.startWait();

        this._migrationClient.queueMigration(!this._azuredevopsDomainUrls).then(
            () => {
                this._waitForCompletion();
            },
            (e) => {
                console.error(e);
                this._waitControl.endWait();
                this._showError(e.message);
                this.updateOkButton(true);
            });
    }

    private async _waitForCompletion(e?) {
        while(true) {
            let status: OrchestrationContracts.ServicingOrchestrationRequestStatus;

            try {
                status = await this._migrationClient.getStatus();
            }
            catch (e) {
                // report to console and keep polling
                console.error(e);
            }

            if (status) {
                if (status.status == OrchestrationContracts.ServicingOrchestrationStatus.Completed || status.status == OrchestrationContracts.ServicingOrchestrationStatus.Created) {
                    // success (we treat Created as Completed in case job history was not found)
                    this._waitControl.endWait();

                    // navigate to the new account url
                    window.location.href = this._targetAccountUrl;
                    break;
                }
                else if (status.status == OrchestrationContracts.ServicingOrchestrationStatus.Failed) {
                    // failure
                    this._waitControl.endWait();
                    this._showError(adminResources.ChangeDomainFailedMessage);
                    this.updateOkButton(true);
                    break;
                }
            }

            // still running, sleep and retry
            await this._sleep(1000);
        }
    }

    private async _sleep(msec: number): Promise<void> {
        return new Promise<void>(resolve => setTimeout(resolve, msec));
    }
}

VSS.initClassPrototype(ChangeAccountDomainUrlDialog, {
    _data: null,
    _wrapper: null,
    _dataDiv: null
});

class CustomTextInputControl extends Controls.BaseControl {

    public static _controlType: string = 'CustomTextInputControl';

    private _actionsControlDiv: any;
    private _isDirty: any;
    private _isReset: any;

    public _customTextInput: any;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            oldCustomText: null, // current value
            defaultCustomText: null,  // default value to reset to
            showActions: true,
            inputType: 'text', // this is here to allow you to change the type to 'password' if needed
            editText: adminResources.Edit
        }, options));
    }

    public initialize() {
        super.initialize();

        this._isDirty = false;
        this._isReset = false;

        this._customTextInput = $(domElem('input'))
            .attr('type', this._options.inputType)
            .attr('maxlength', '256')
            .appendTo(this._element)
            .addClass('custom-text-input')
            .change(() => {
                this._isDirty = true
            })
            .keyup(() => {
                this._isDirty = true
            });

        this._setCustomText(this._options.oldCustomText);
    }

    public getCustomText() {
        return this._customTextInput.val();
    }

    public isDirty() {
        return this._isDirty;
    }

    public isReset() {
        return this._isReset;
    }

    public _changeCustomText(newCustomText?: string) {
        /// <param name="newCustomText" type="string" optional="true" />

        if (newCustomText && newCustomText !== this._options.defaultCustomText) {
            this._options.newCustomText = newCustomText;
        }
        else {
            this._options.newCustomText = '';
        }

        this._element.trigger('change');
    }

    public _setCustomText(newCustomText?: string) {
        /// <param name="newCustomText" type="string" optional="true" />

        this._changeCustomText(newCustomText);
        this._customTextInput.val(newCustomText || this._options.defaultCustomText);
    }
}

VSS.initClassPrototype(CustomTextInputControl, {
    _actionsControlDiv: null,
    _customTextInput: null,
    _isDirty: null,
    _isReset: null
});

class UserPaneBase extends Controls.BaseControl {

    public static _controlType: string = 'UserPaneBase';

    constructor(options?) {
        super(options);
    }

    public _addRow(label, labelId, combo, hint, table) {
        var tr, td;
        tr = $(domElem('tr')).appendTo(table).bind('mouseover mouseout', function (event) {
            if (event.type === 'mouseover') {
                if ($(this).closest('table').find('.active').length === 0) {
                    $(this).addClass('hover');
                }
            }
            else {
                $(this).removeClass('hover');
            }
        });
        td = $(domElem('td')).appendTo(tr).addClass('min-column-width');
        $(domElem('span')).appendTo(td).text(label).attr('id', labelId);
        td = $(domElem('td')).appendTo(tr);
        combo.appendTo(td);
        td = $(domElem('td')).appendTo(tr).addClass('min-column-width');

        if (hint) {
            $(domElem('div')).appendTo(td).addClass('user-profile-hint').text(hint);
        }

        return tr;
    }
}

class UserProfilePane extends UserPaneBase {

    public static _controlType: string = 'UserProfilePane';

    private _actionsControlDiv: any;
    private _currentIdentity: any;
    private _customDisplayInputDiv: any;
    private _customDisplayName: any;
    private _defaultEmail: any;
    private _originalTheme: any;
    private _originalTypeAheadDisabled: any;
    private _originalWorkitemFormChromeBorder: boolean;
    private _preferredEmail: any;
    private _preferredEmailInput: any;
    private _preferredEmailInputDiv: any;
    private _profileTable: any;
    private _providerDisplayName: any;
    private _themes: any;
    private _themesCombo: any;
    private _themesElem: any;
    private _typeAheadCheckbox: any;
    private _typeAheadElem: any;
    private _customDisplayNameInput: any;
    private _workitemFormChromeBorderElem: JQuery;
    private _workitemFormChromeBorderCombo: Combos.Combo;

    private _displayNameInputId: any;
    private _preferredEmailInputId: any;
    private _themeId: any;
    private _typeAheadId: any;
    private _workitemFormChromeBorderId: string;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        // Set options to local variables
        this._currentIdentity = this._options.currentIdentity;
        this._customDisplayName = this._options.customDisplayName;
        this._providerDisplayName = this._options.providerDisplayName;
        this._preferredEmail = this._options.preferredEmail;
        this._defaultEmail = this._options.defaultEmail;
        this._themes = this._options.themes;
        this._originalTheme = this._options.originalTheme;
        this._originalTypeAheadDisabled = this._options.typeAheadDisabled;
        this._originalWorkitemFormChromeBorder = this._options.originalWorkitemFormChromeBorder;

        this._displayNameInputId = this.getId() + '_displayNameInput';
        this._preferredEmailInputId = this.getId() + '_preferredEmailInput';
        this._themeId = this.getId() + '_theme';
        this._typeAheadId = this.getId() + '_typeAhead';
        this._workitemFormChromeBorderId = this.getId() + '_workitemFormChromeBorder';

        this._decorate();
        this._populate();
    }

    public getResults() {
        var customDisplayName, preferredEmail, themeIndex, theme, typeAheadDisabled, workitemFormChromeBorder, isDirty = false, diff, resetDisplayName = false, resetEmail = false;

        customDisplayName = this._customDisplayNameInput.getCustomText();
        var displayNameFieldWasChanged = this._customDisplayNameInput.isDirty() || this._customDisplayNameInput.isReset();
        if (displayNameFieldWasChanged && (customDisplayName !== this._customDisplayName)) {
            // When both are unset (not dirty), customDisplayName is '', this._customDisplayName is null
            if (customDisplayName === '' && this._customDisplayNameInput._customTextInput[0].value !== '') {
                resetDisplayName = true;
            }
            isDirty = true;
        }

        var emailFieldWasChanged = this._preferredEmailInput.isDirty() || this._preferredEmailInput.isReset();
        preferredEmail = this._preferredEmailInput.getCustomText();
        if (emailFieldWasChanged && (preferredEmail !== this._preferredEmail)) {
            // When both are unset (not dirty), preferredEmail is '', this._preferredEmail is null
            resetEmail = this._preferredEmailInput.isReset();
            if (preferredEmail === '' && this._preferredEmailInput._customTextInput[0].value !== '') {
                resetEmail = true;
            }
            isDirty = true;
        }
        typeAheadDisabled = this._typeAheadCheckbox.is(':checked');
        if (typeAheadDisabled !== this._originalTypeAheadDisabled) {
            isDirty = true;
        }

        workitemFormChromeBorder = this._workitemFormChromeBorderCombo.getSelectedIndex() === 0 ? false : true;
        if (workitemFormChromeBorder != this._originalWorkitemFormChromeBorder) {
            isDirty = true;
        }

        diff = {
            isValid: true,
            errorMessage: null,
            CustomDisplayName: customDisplayName || undefined,
            PreferredEmail: preferredEmail || undefined,
            TypeAheadDisabled: typeAheadDisabled,
            WorkItemFormChromeBorder: workitemFormChromeBorder,
            isDirty: isDirty,
            resetEmail: resetEmail,
            resetDisplayName: resetDisplayName
        };

        return diff;
    }

    private _decorate() {
        var tableDiv, table, tr, td,
            isEmailConfirmationPending = this._options.isEmailConfirmationPending === true;

        this._actionsControlDiv = $(domElem('div')).appendTo(this._element);
        $(domElem('div')).appendTo(this._element).addClass('user-profile-header').text(adminResources.UserInformation);
        tableDiv = $(domElem('div')).appendTo(this._element).addClass('properties-section user-profile-properties');
        table = $(domElem('table')).appendTo(tableDiv);

        tr = $(domElem('tr')).appendTo(table);
        td = $(domElem('td')).appendTo(tr);
        $(domElem('label')).appendTo(td).text(adminResources.DisplayName).attr('for', this._displayNameInputId);
        td = $(domElem('td')).appendTo(tr).addClass('custom-text-input-cell');
        this._customDisplayInputDiv = $(domElem('div')).appendTo(td).attr('id', this._displayNameInputId);

        tr = $(domElem('tr')).appendTo(table);
        td = $(domElem('td')).appendTo(tr);
        $(domElem('label')).appendTo(td).text(adminResources.PreferredEmail).attr('for', this._preferredEmailInputId);
        td = $(domElem('td')).appendTo(tr).addClass('custom-text-input-cell');
        this._preferredEmailInputDiv = $(domElem('div')).appendTo(td).attr('id', this._preferredEmailInputId);

        if (isEmailConfirmationPending) {
            // Adding one more column to the table in this case which will display 'pending confirmation' text aligned to right
            // Table needs to fit the dialog in this case
            tr.closest("table").addClass("fit");

            // All the siblings should be added the new column
            tr.siblings().append("<td></td>");

            tr.addClass('pending');
            td = $(domElem('td')).appendTo(tr).addClass('pending');

            $(domElem('span')).text(adminResources.ConfirmationPendingMessage).appendTo(td);
            $(domElem('span')).addClass("icon icon-warning").appendTo(td);
        }

        $(domElem('div')).appendTo(this._element).addClass('user-profile-header').text(adminResources.UISettings);
        this._profileTable = $(domElem('table')).appendTo(this._element).addClass('user-profile-table');

        if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(TFS_Server_WebAccess_Constants.FeatureAvailabilityFlags.WebAccessDisableTypeAhead)) {
            this._typeAheadElem = $(domElem('div'));
        }

        this._workitemFormChromeBorderElem = $(domElem('div')).addClass('settings-combo');
        this._addRow(adminResources.WorkItemFormChromeBorderLabel, this._workitemFormChromeBorderId, this._workitemFormChromeBorderElem, null, this._profileTable);
    }

    private _populate() {
        var that = this, initialThemeIndex = 0, i;

        <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this._actionsControlDiv, {
            items: [{ id: "change-picture", text: adminResources.ChangePicture }],
            executeAction: function () {
                Dialogs.show(ChangeImageDialog, { tfid: that._currentIdentity.TeamFoundationId, isGroup: that._currentIdentity.IdentityType !== 'user' });
            },
            showIcon: false,
            cssClass: "user-profile-change-picture-link"
        });

        this._customDisplayNameInput = <CustomTextInputControl>Controls.Enhancement.enhance(CustomTextInputControl, this._customDisplayInputDiv, {
            oldCustomText: this._customDisplayName,
            defaultCustomText: this._providerDisplayName,
        });
        this._customDisplayNameInput._customTextInput.attr('id', this._displayNameInputId);

        this._preferredEmailInput = <CustomTextInputControl>Controls.Enhancement.enhance(CustomTextInputControl, this._preferredEmailInputDiv, {
            oldCustomText: this._preferredEmail,
            defaultCustomText: this._defaultEmail,
        });
        this._preferredEmailInput._customTextInput.attr('id', this._preferredEmailInputId);

        // Initialize themes
        for (i = 0; i < this._themes.length; i++) {
            if (this._themes[i].ThemeName === this._originalTheme) {
                initialThemeIndex = i;
            }
        }



        this._typeAheadCheckbox = $('<input type=checkbox>');
        if (this._originalTypeAheadDisabled) {
            this._typeAheadCheckbox.attr('checked', 'checked');
        }

        if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(TFS_Server_WebAccess_Constants.FeatureAvailabilityFlags.WebAccessDisableTypeAhead)) {
            this._typeAheadCheckbox.appendTo(this._typeAheadElem);
        }

        this._workitemFormChromeBorderCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this._workitemFormChromeBorderElem, {
            source: [adminResources.WorkItemFormChromeBorderHide, adminResources.WorkItemFormChromeBorderShow],
            value: this._originalWorkitemFormChromeBorder ? adminResources.WorkItemFormChromeBorderShow : adminResources.WorkItemFormChromeBorderHide,
            allowEdit: false
        });
    }
}

VSS.initClassPrototype(UserProfilePane, {
    _actionsControlDiv: null,
    _currentIdentity: null,
    _customDisplayInputDiv: null,
    _customDisplayName: null,
    _defaultEmail: null,
    _originalTheme: null,
    _preferredEmail: null,
    _preferredEmailInput: null,
    _preferredEmailInputDiv: null,
    _profileTable: null,
    _providerDisplayName: null,
    _themes: null,
    _themesCombo: null,
    _themesElem: null,
    _customDisplayNameInput: null
});



class UserLocalePane extends UserPaneBase {

    public static _controlType: string = 'UserLocalePane';

    private _calendars: any;
    private _calendarsCombo: any;
    private _calendarsElem: any;
    private _calendarsRow: any;
    private _cultures: any;
    private _culturesCombo: any;
    private _culturesElem: any;
    private _datePatterns: any;
    private _datePatternsCombo: any;
    private _datePatternsElem: any;
    private _localeTable: any;
    private _originalCalendar: any;
    private _originalCulture: any;
    private _originalDatePattern: any;
    private _originalTimePattern: any;
    private _originalTimeZone: any;
    private _timePatterns: any;
    private _timePatternsCombo: any;
    private _timePatternsElem: any;
    private _timeZones: any;
    private _timeZonesCombo: any;
    private _timeZonesElem: any;

    private _languageId: any;
    private _datePatternId: any;
    private _timePatternId: any;
    private _timeZoneId: any;
    private _calendarId: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this._timeZones = this._options.timeZones;
        this._originalTimeZone = this._options.originalTimeZone;

        this._cultures = this._options.cultures;
        this._originalCulture = this._options.originalCulture;

        this._originalDatePattern = this._options.originalDatePattern;
        this._originalTimePattern = this._options.originalTimePattern;
        this._originalCalendar = this._options.originalCalendar;

        this._languageId = this.getId() + '_language';
        this._datePatternId = this.getId() + 'datePattern';
        this._timeZoneId = this.getId() + '_timeZone';
        this._timePatternId = this.getId() + '_timePattern';
        this._calendarId = this.getId() + '_calendar';

        this._decorate();
        this._populate();
    }

    public getResults() {
        var timeZoneId, lcid, calendar, datePattern, timePattern, isDirty = false, diff,
            timeZoneIndex, cultureIndex, calendarIndex, datePatternIndex, timePatternIndex;

        timeZoneIndex = this._timeZonesCombo.getSelectedIndex();
        if (timeZoneIndex === 0) {
            timeZoneId = null;
        }
        else {
            timeZoneId = this._timeZones[timeZoneIndex].Id;
        }
        if (timeZoneId !== this._originalTimeZone) {
            isDirty = true;
        }

        cultureIndex = this._culturesCombo.getSelectedIndex();
        if (cultureIndex === 0) {
            lcid = null;
        }
        else {
            lcid = this._cultures[cultureIndex].LCID;
        }
        if (lcid !== this._originalCulture) {
            isDirty = true;
        }

        calendarIndex = this._calendarsCombo.getSelectedIndex();
        if (calendarIndex === 0) {
            calendar = null;
        }
        else {
            calendar = this._calendars[calendarIndex].DisplayName;
        }
        if (calendar !== this._originalCalendar) {
            isDirty = true;
        }

        datePatternIndex = this._datePatternsCombo.getSelectedIndex();
        if (datePatternIndex === 0) {
            datePattern = null;
        }
        else {
            datePattern = this._datePatterns[datePatternIndex].Format;
        }
        if (datePattern !== this._originalDatePattern) {
            isDirty = true;
        }

        timePatternIndex = this._timePatternsCombo.getSelectedIndex();
        if (timePatternIndex === 0) {
            timePattern = null;
        }
        else {
            timePattern = this._timePatterns[timePatternIndex].Format;
        }
        if (timePattern !== this._originalTimePattern) {
            isDirty = true;
        }

        diff = {
            isValid: true,
            errorMessage: null,
            TimeZoneId: timeZoneId || undefined,
            LCID: lcid || undefined,
            Calendar: calendar || undefined,
            DatePattern: datePattern || undefined,
            TimePattern: timePattern || undefined,
            isDirty: isDirty
        };

        return diff;
    }

    private _decorate() {
        $(domElem('div')).appendTo(this._element).addClass('user-profile-header').text(adminResources.Settings);
        this._localeTable = $(domElem('table')).appendTo(this._element).addClass('user-profile-table');
        this._culturesElem = $(domElem('div')).addClass('settings-combo');
        this._addRow(adminResources.Language, this._languageId, this._culturesElem, adminResources.LanguageHint, this._localeTable);
        this._calendarsElem = $(domElem('div')).addClass('settings-combo');
        this._calendarsRow = this._addRow(adminResources.CalendarType, this._calendarId, this._calendarsElem, adminResources.CalendarTypeHint, this._localeTable);
        this._datePatternsElem = $(domElem('div')).addClass('settings-combo');
        this._addRow(adminResources.DateFormat, this._datePatternId, this._datePatternsElem, adminResources.DateFormatHint, this._localeTable);
        this._timePatternsElem = $(domElem('div')).addClass('settings-combo');
        this._addRow(adminResources.TimeFormat, this._timePatternId, this._timePatternsElem, adminResources.TimeFormatHint, this._localeTable);
        this._timeZonesElem = $(domElem('div')).addClass('settings-combo');
        this._addRow(adminResources.TimeZone, this._timeZoneId, this._timeZonesElem, adminResources.TimeZoneHint, this._localeTable);
    }

    private _populate() {
        var that = this, i,
            initialTimeZoneIndex = 0,
            initialCultureIndex = 0,
            initialCalendarIndex = 0,
            initialDatePatternIndex = 0,
            initialTimePatternIndex = 0;

        // Create time zone combo
        this._timeZonesCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this._timeZonesElem, {
            ariaAttributes: {
                labelledby: this._timeZoneId
            },
            allowEdit: false
        });

        // Create cultures combo
        this._culturesCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this._culturesElem, {
            ariaAttributes: {
                labelledby: this._languageId
            },
            allowEdit: false,
            change: function (control) {
                var index = control.getSelectedIndex();
                that._changeCulture(index);
            }
        });

        // Create calendars combo
        this._calendarsCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this._calendarsElem, {
            ariaAttributes: {
                labelledby: this._calendarId
            },
            allowEdit: false,
            change: function (control) {
                var index = control.getSelectedIndex();
                that._changeCalendar(index);
            }
        });

        // Create date patterns combo
        this._datePatternsCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this._datePatternsElem, {
            ariaAttributes: {
                labelledby: this._datePatternId
            },
            allowEdit: false
        });

        // Create time patterns combo
        this._timePatternsCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this._timePatternsElem, {
            ariaAttributes: {
                labelledby: this._timePatternId
            },
            allowEdit: false
        });

        // Populate time zones combo
        this._timeZonesCombo.setSource($.map(this._timeZones, function (timeZone) {
            return timeZone.DisplayName;
        }));

        // Populate cultures combo
        this._culturesCombo.setSource($.map(this._cultures, function (culture) {
            return culture.DisplayName;
        }));

        // Initialize time zones combo
        for (i = 0; i < this._timeZones.length; i++) {
            if (this._timeZones[i].Id === this._originalTimeZone) {
                initialTimeZoneIndex = i;
            }
        }
        this._timeZonesCombo.setSelectedIndex(initialTimeZoneIndex, true);

        // Initialize cultures combo
        for (i = 0; i < this._cultures.length; i++) {
            if (this._cultures[i].LCID === this._originalCulture) {
                initialCultureIndex = i;
            }
        }
        this._culturesCombo.setSelectedIndex(initialCultureIndex, true);

        // Initialize calendar combo
        for (i = 0; i < this._calendars.length; i++) {
            if (this._calendars[i].DisplayName === this._originalCalendar) {
                initialCalendarIndex = i;
                break;
            }
        }
        this._calendarsCombo.setSelectedIndex(initialCalendarIndex, true);

        // Get date pattern initial values
        for (i = 0; i < this._datePatterns.length; i++) {
            if (this._datePatterns[i].Format === this._originalDatePattern) {
                initialDatePatternIndex = i;
                break;
            }
        }
        this._datePatternsCombo.setSelectedIndex(initialDatePatternIndex, true);

        // Get time pattern initial values
        for (i = 0; i < this._timePatterns.length; i++) {
            if (this._timePatterns[i].Format === this._originalTimePattern) {
                initialTimePatternIndex = i;
                break;
            }
        }
        this._timePatternsCombo.setSelectedIndex(initialTimePatternIndex, true);
    }

    private _changeCulture(index) {

        // Disable combos if default culture
        if (index === 0) {
            this._calendarsCombo.setEnabled(false);
            this._datePatternsCombo.setEnabled(false);
            this._timePatternsCombo.setEnabled(false);
        }
        else {
            this._calendarsCombo.setEnabled(true);
            this._datePatternsCombo.setEnabled(true);
            this._timePatternsCombo.setEnabled(true);
        }

        // Set calendars
        this._calendars = this._cultures[index].OptionalCalendars;
        this._calendarsCombo.setSource($.map(this._calendars, function (calendar) {
            return calendar.DisplayName;
        }));
        // Manually change index, in case of same calendar across cultures
        this._calendarsCombo.setSelectedIndex(0, false);
        this._changeCalendar(0);

        // Hide calendars if only one
        if (this._calendars.length === 1) {
            this._calendarsRow.hide();
        }
        else {
            this._calendarsRow.show();
        }
    }

    private _changeCalendar(index) {
        var currentCalendar = this._calendars[index];

        // Set date patterns
        this._datePatterns = currentCalendar.DateFormats;
        this._datePatternsCombo.setSource($.map(this._datePatterns, function (dateFormat) {
            return dateFormat.DisplayFormat;
        }));
        this._datePatternsCombo.setSelectedIndex(0, true);

        // Set time patterns
        this._timePatterns = currentCalendar.TimeFormats;
        this._timePatternsCombo.setSource($.map(this._timePatterns, function (timeFormat) {
            return timeFormat.DisplayFormat;
        }));
        this._timePatternsCombo.setSelectedIndex(0, true);
    }
}

VSS.initClassPrototype(UserLocalePane, {
    _calendars: null,
    _calendarsCombo: null,
    _calendarsElem: null,
    _calendarsRow: null,
    _cultures: null,
    _culturesCombo: null,
    _culturesElem: null,
    _datePatterns: null,
    _datePatternsCombo: null,
    _datePatternsElem: null,
    _localeTable: null,
    _originalCalendar: null,
    _originalCulture: null,
    _originalDatePattern: null,
    _originalTimePattern: null,
    _originalTimeZone: null,
    _timePatterns: null,
    _timePatternsCombo: null,
    _timePatternsElem: null,
    _timeZones: null,
    _timeZonesCombo: null,
    _timeZonesElem: null
});

export class PublicKeyModel {
    public AuthorizationId: string; // Guid
    public Description: string;
    public Data: string; // Base64 encoded public key if available, not always sent
    public Fingerprint: string;
    public FormattedCreatedTime: string; // CreatedTime also exists, but is a DateTime (in C#)
    public IsValid: boolean;
}

class SshKeysPane extends UserPaneBase {

    public static _controlType: string = 'SshKeysPane';

    private _keysBody: any;
    private _keysDescription: any; // the description text for Your Public Keys section
    private _primaryKeyPane: any; // the pane we show when not showing the form
    private _addKeyTable: any;
    private _keyDescription: any; // the add form description element
    private _keyData: any;

    private _fingerprintPane: any;
    private _sshFingerprintHeader: any;
    private _sshFingerprintMsg: any;

    private _keyDataId: any;
    private _keyDescriptionId: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this._keyDataId = this.getId() + '_keyDataId';
        this._keyDescriptionId = this.getId() + '_keyDescriptionId';

        this._decorate();
        this._populate();
    }

    public getResults() {
        // gets the current state of the pane and returns the difference object, unchanged fields should be undefined
        var key;

        if (this._keyDescription.val() !== "") {
            key = {};
            key.Description = this._keyDescription.val();
            key.Data = this._keyData.val();
        }

        return key;
    }

    private _hideForm() {
        this._addKeyTable.hide();
        this._primaryKeyPane.show();
    }

    private _showForm() {
        this._primaryKeyPane.hide();
        this._addKeyTable.show();
    }

    private _removeKey(id: string) {
        var that = this,
            url = SshKeysUrlHelper.getActionUrl(this._options.tfsContext, 'Revoke') + '&authorizationId=' + id,
            request = TFS_Core_Ajax.beginRequest(url, null, {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: that._element
                }
            });

        $.ajax(url, {
            type: 'DELETE',
            success: function (data) {
                TFS_Core_Ajax.endRequest(data, null, null, null, request);
                // should force refresh the keys pane
                that._populateKeyTable();
            },
            error: function (error) {
                TFS_Core_Ajax.endRequest(null, null, null, null, request);
                that._options.errorPane.setError(error);
            }
        });
    }

    private _constructPublicKeyRow(publicKeyItem: PublicKeyModel): JQuery {
        return $(domElem('tr'))
            .append($(domElem('td')).addClass('key-name').text(publicKeyItem.Description))
            .append($(domElem('td')).addClass('key-fingerprint').text(publicKeyItem.Fingerprint))
            .append($(domElem('td')).addClass('key-remove').text(adminResources.Remove)
                .click(() => {
                    this._removeKey(publicKeyItem.AuthorizationId);
                }));
    }

    private _populateKeyTable() {
        var that = this, dummy = new Date();
        TFS_Core_Ajax.getMSJSON(
            SshKeysUrlHelper.getActionUrl(that._options.tfsContext, "List"),
            {
                _t: dummy.getTime()
            },
            function (data) {
                var keysBody = (<JQuery>that._keysBody).html("");
                if (data && data != null) {
                    for (var i = 0; i < data.length; i++) {
                        keysBody.append(that._constructPublicKeyRow(data[i]));
                    }
                }
            },
            function (error) {
                that._options.errorPane.setError(error);
            },
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: that._element
                }
            }
        );
    }

    private _decorate() {
        this._primaryKeyPane = $(domElem('div')).appendTo(this._element);

        this._sshFingerprintHeader = $(domElem('div')).appendTo(this._primaryKeyPane).addClass('user-profile-header');
        this._sshFingerprintMsg = $(domElem('div')).appendTo(this._primaryKeyPane).addClass('ssh-fingerprint-msg');
        this._fingerprintPane = $(domElem('div')).appendTo(this._primaryKeyPane);

        $(domElem('div')).appendTo(this._primaryKeyPane).addClass('user-profile-header').text(adminResources.YourPublicKeys);
        this._keysDescription = $(domElem('div')).appendTo(this._primaryKeyPane).addClass('keys-description').text(adminResources.PublicKeysDescription);
        $(domElem('a')).appendTo(this._keysDescription).addClass('learn-more').attr('href', adminResources.PublicKeysLearnMoreLink).attr('target', '_blank').text(adminResources.PublicKeysLearnMoreText);

        // public keys listing
        this._keysBody = $(domElem('div')).appendTo(this._primaryKeyPane).addClass('keys-body').text('Placeholder');

        // add a public key link
        $(domElem('div')).appendTo(this._primaryKeyPane).addClass('action').text(adminResources.AddSshKey).click(() => { this._showForm() });

        // the public key form element
        this._addKeyTable = $(domElem('table')).appendTo(this._element).addClass('add-key-table').hide();
        this._keyDescription = $(domElem('input')).attr('type', 'text').addClass('keys-description-text custom-text-input').attr('aria-labelledby', this._keyDescriptionId);
        this._addRow(adminResources.Description, this._keyDescriptionId, this._keyDescription, null, this._addKeyTable);
        this._keyData = $(domElem('textarea')).addClass('keys-value-text custom-text-input').attr('aria-labelledby', this._keyDataId);
        this._addRow(adminResources.KeyData, this._keyDataId, this._keyData, null, this._addKeyTable);

        this._addKeyTable.append($(domElem('div')).addClass('action hide-form').text(adminResources.Back).click(() => {
            this._hideForm();
            this._keyDescription.val('');
            this._keyData.text('');
        }));
    }

    private _populate() {
        this._keyDescription.val('');
        this._keyData.text('');
        this._populateKeyTable();
        this._getServerFingerprint();
    }

    private _getServerFingerprint() {
        var that = this, dummy = new Date();
        TFS_Core_Ajax.getMSJSON(
            SshKeysUrlHelper.getActionUrl(that._options.tfsContext, 'GetServerFingerprint'),
            {
                _t: dummy.getTime()
            },
            function (data) {
                var fingerprintBody = (<JQuery>that._fingerprintPane).html("");
                if (data && data[0] && data[0].Fingerprint) {

                    var md5KeyBodyMsg = Utils_String.format(adminResources.SshServerFingerprint, data[0].HashAlgorithm, data[0].Fingerprint, data[0].Encryption);
                    fingerprintBody.append(md5KeyBodyMsg);
                }
                if (data && data[1] && data[1].Fingerprint) {
                    var sha256KeyBodyMsg = Utils_String.format(adminResources.SshServerFingerprint, data[1].HashAlgorithm, data[1].Fingerprint, data[1].Encryption);
                    fingerprintBody.append(sha256KeyBodyMsg);
                }
                if (fingerprintBody.html()) {
                    (<JQuery>that._sshFingerprintHeader).text(adminResources.ServerFingerprint);
                    (<JQuery>that._sshFingerprintMsg).text(adminResources.SshFingerprintMessage);
                }
            },
            null, {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: that._fingerprintPane
                }
            }
        );
    }
}

VSS.initClassPrototype(SshKeysPane, {});

class UserProfileControl extends Controls.BaseControl {

    public static _controlType: string = 'UserProfileControl';

    private _currentIdentity: any;
    private _errorPane: any;
    private _identityHeader: any;
    private _localeContent: any;
    private _localePane: any;
    private _credentialsContent: any;
    private _credentialsPane: any;
    private _profileContent: any;
    private _profilePane: any;
    private _basicAuthEnabled: any;
    private _sshInstalled: any;
    private _sshKeysContent: any;
    private _sshKeysPane: any;

    public _tabsControlDiv: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        var that = this;

        TFS_Core_Ajax.getMSJSON(
            that._options.tfsContext.getActionUrl('GetUserProfile', 'common', { area: 'api' }),
            {},
            function (data) {
                that._currentIdentity = data.identity;
                that._basicAuthEnabled = data.basicAuthenticationEnabled;
                that._sshInstalled = data.sshEnabled;
                that._decorate();
                that._populate(data);

                // Set initial button state
                that._element.trigger('change');
            },
            null,
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: that._element.closest('.modal-dialog')
                }
            }
        );
    }

    private _decorate() {
        // Set relative position for error pane
        this._element.css('position', 'relative');

        this._identityHeader = $(domElem('div')).appendTo(this._element);
        <IdentityHeaderControl>Controls.BaseControl.createIn(IdentityHeaderControl, this._identityHeader, {
            header: this._currentIdentity.FriendlyDisplayName,
            subHeader: this._currentIdentity.Domain + '\\' + this._currentIdentity.AccountName,
            teamFoundationId: this._currentIdentity.TeamFoundationId
        });
        var id, profileId, localeId, sshKeysId, credentialsId, ul, that = this;

        id = this.getId();
        profileId = 'profile_' + id;
        localeId = 'locale_' + id;
        sshKeysId = 'ssh_' + id;
        credentialsId = 'credentials_' + id;
        this._tabsControlDiv = $(domElem('div')).appendTo(this._element);
        ul = $(domElem('ul')).appendTo(this._tabsControlDiv);

        this._errorPane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._tabsControlDiv);

        this._profileContent = $(domElem('div')).attr('id', profileId).appendTo(this._tabsControlDiv);
        this._localeContent = $(domElem('div')).attr('id', localeId).appendTo(this._tabsControlDiv);

        this._tabsControlDiv.tabs({
            select: function (event, ui) {
                that._errorPane.clear();
            }
        });
        const setSize = this._basicAuthEnabled ? 3 : 2;
        ul.append($('<li aria-posinset="1" aria-setsize="' + setSize + '"><a href="#' + profileId + '">' + adminResources.General + '</a></li>'));
        ul.append($('<li aria-posinset="2" aria-setsize="' + setSize + '"><a href="#' + localeId + '">' + adminResources.Locale + '</a></li>'));

        if (this._basicAuthEnabled) {
            this._credentialsContent = $(domElem('div')).attr('id', credentialsId).appendTo(this._tabsControlDiv);
            ul.append($('<li aria-posinset="3" aria-setsize="' + setSize + '"><a href="#' + credentialsId + '">' + adminResources.Credentials + '</a></li>'));

            if (this._options.startOnCredentialsTab) {
                this._tabsControlDiv.tabs('refresh');
                this._tabsControlDiv.tabs('option', 'active', this._tabIdToindex(this._tabsControlDiv, '#' + credentialsId));
            }
        }

        if (this._options.tfsContext.isHosted) {
            ul.append($('<li><a href="' + this._options.tfsContext.getActionUrl('ManageTokens', 'oauth', { area: 'api' }) + '">' + adminResources.Connections + '</a></li>'));
            this._tabsControlDiv.tabs('option', {
                load: function (event, ui) {
                    VSS.using(['OAuth/Scripts/TFS.OAuth.Controls'], (_TFS_OAuth_Controls: any) => {
                        Controls.Enhancement.ensureEnhancements(ui.panel);
                    });
                },
                cache: true // do not reload every time tab is selected
            });
        }

        if (!this._tabsControlDiv.tabs('option', 'active')) {
            this._tabsControlDiv.tabs('refresh');
            this._tabsControlDiv.tabs('option', 'active', 0);
        }
    }

    private _populate(data) {
        this._profilePane = <UserProfilePane>Controls.BaseControl.createIn(UserProfilePane, this._profileContent, {
            currentIdentity: this._currentIdentity,
            customDisplayName: data.userPreferences.CustomDisplayName || data.providerDisplayName,
            providerDisplayName: data.providerDisplayName,
            preferredEmail: data.userPreferences.PreferredEmail || data.defaultMailAddress,
            isEmailConfirmationPending: data.userPreferences.IsEmailConfirmationPending,
            defaultEmail: data.defaultMailAddress,
            themes: data.allThemes,
            originalTheme: data.userPreferences.Theme,
            typeAheadDisabled: data.userPreferences.TypeAheadDisabled,
            originalWorkitemFormChromeBorder: data.userPreferences.WorkItemFormChromeBorder,
            tfsContext: this._options.tfsContext
        });

        this._localePane = <UserLocalePane>Controls.BaseControl.createIn(UserLocalePane, this._localeContent, {
            timeZones: data.allTimeZones,
            cultures: data.allCultures,
            originalTimeZone: data.userPreferences.TimeZoneId,
            originalCulture: data.userPreferences.LCID,
            originalCalendar: data.userPreferences.Calendar,
            originalDatePattern: data.userPreferences.DatePattern,
            originalTimePattern: data.userPreferences.TimePattern
        });

        if (this._sshInstalled) {
            this._sshKeysPane = <SshKeysPane>Controls.BaseControl.createIn(SshKeysPane, this._sshKeysContent, {
                tfsContext: this._options.tfsContext,
                errorPane: this._errorPane
            });
        }

        this._element.find('.combo').bind('focusin focusout', function (event) {
            if (event.type === 'focusin') {
                $(event.target).closest('tr').addClass('active');
            }
            else {
                $(event.target).closest('tr').removeClass('active');
            }
        });
    }

    private _getPendingKeyAdd() {
        if (this._sshKeysPane) {
            var sshKeysResults = this._sshKeysPane.getResults();
            if (sshKeysResults) {
                return sshKeysResults;
            }
        }

        return null;
    }

    private _getDiff() {
        if (this._profilePane && this._localePane) {
            var profileResults, localeResults, credentialsResults;

            profileResults = this._profilePane.getResults();
            localeResults = this._localePane.getResults();

            if (this._basicAuthEnabled && this._credentialsPane) {
                credentialsResults = this._credentialsPane.getResults();
            }

            if (profileResults.isDirty || localeResults.isDirty || (credentialsResults && credentialsResults.isDirty)) {
                // Merge the results - extend does a blank merge, the code below it combines shared fields.
                var mergedResult: any = $.extend(profileResults, localeResults, credentialsResults);
                mergedResult.isDirty = true;
                if (!profileResults.isValid) {
                    mergedResult.isValid = profileResults.isValid;
                    mergedResult.errorMessage = profileResults.errorMessage;
                }
                else if (!localeResults.isValid) {
                    mergedResult.isValid = localeResults.isValid;
                    mergedResult.errorMessage = localeResults.errorMessage;
                }
                // No need to do the same for credentialsResults because it's the last in the list,
                //   so it's values are in result by default.
                return mergedResult;
            }
            else {
                return null;
            }
        }
        else {
            return null;
        }
    }

    //This is needed so we can use JQuery-UI's Tabs widget and activate a specific tab since we can only use the index of the tab 
    //to activate and not the id in the latest version of JQuery-Ui.
    private _tabIdToindex(tabsElement: JQuery, tabId: string) {
        var index = -1;
        var tabLinks = tabsElement.find("li a");
        for (var i = 0; i < tabLinks.length; i++) {
            if ($(tabLinks[i]).attr("href").search(tabId) > 0) {
                index = i;
            }
        }
        return index;
    }
}

VSS.initClassPrototype(UserProfileControl, {
    _currentIdentity: null,
    _errorPane: null,
    _identityHeader: null,
    _localeContent: null,
    _localePane: null,
    _credentialsContent: null,
    _credentialsPane: null,
    _profileContent: null,
    _profilePane: null,
    _tabsControlDiv: null,
    _basicAuthEnabled: null
});

VSS.classExtend(UserProfileControl, TfsContext.ControlExtensions);

export interface UserProfileDialogOptions extends AdminDialogOptions {
    profileOptions?: any;
}

export class UserProfileDialog extends Dialogs.ModalDialogO<UserProfileDialogOptions> {

    public static _controlType: string = 'UserProfileDialog';

    private _userProfileControl: any;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            cssClass: 'admin-dialog',
            resizable: true,
            width: 600,
            height: 500,
            minWidth: 600,
            minHeight: 300,
            title: adminResources.UserProfile,
            buttons: {
                saveButton: {
                    id: 'ok',
                    text: adminResources.SaveChanges,
                    disabled: true,
                    click: () => { this._onSaveAction(); }
                },
                cancelButton: {
                    id: 'cancel',
                    text: adminResources.Cancel,
                    click: () => { this.onCancelClick(); }
                }
            }
        }, options));
    }

    public initialize() {
        super.initialize();
        this._element.focus();

        this._element.bind('change input keyup', () => { this._updateSaveButton(); });

        this._userProfileControl = <UserProfileControl>Controls.Enhancement.enhance(UserProfileControl, this._element, $.extend({}, this._options.profileOptions));
    }

    public setError(message: string) {
        this._userProfileControl._errorPane.setError(message);
    }

    private _onSaveAction() {
        this.updateOkButton(false);
        var params = this._userProfileControl._getDiff(),
            keyToAdd = this._userProfileControl._getPendingKeyAdd(),
            that = this;

        if (keyToAdd) {
            TFS_Core_Ajax.postMSJSON(
                SshKeysUrlHelper.getActionUrl(this._options.tfsContext, "Edit"),
                keyToAdd,
                function (data) {
                    // should force refresh the keys pane
                    that._userProfileControl._sshKeysPane._hideForm();
                    that._userProfileControl._sshKeysPane._populateKeyTable();
                },
                function (error) {
                    // Display error
                    that.setError(error.message);
                },
                {
                    wait: {
                        image: hostConfig.getResourcesFile('big-progress.gif'),
                        message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                        target: this._element
                    }
                }
            )
        }

        if (!params) {
            // It's not dirty - this shouldn't be reachable as the save button shouldn't be lit.
        }
        else if (params.isValid) {
            TFS_Core_Ajax.postHTML(
                this._options.tfsContext.getActionUrl('UpdateUserProfile', 'common', { area: 'api' }),
                {
                    updatePackage: Utils_Core.stringifyMSJSON(params)
                },
                function (data) {
                    window.location.reload();
                },
                function (error) {
                    // Display error
                    that.setError(error.message);
                },
                {
                    wait: {
                        image: hostConfig.getResourcesFile('big-progress.gif'),
                        message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                        target: this._element
                    }
                }
            );
        }
        else {
            this.setError(params.errorMessage);
        }
    }

    private _updateSaveButton() {
        if (this._userProfileControl._getDiff() || this._userProfileControl._getPendingKeyAdd()) {
            this.updateOkButton(true);
        }
        else {
            this.updateOkButton(false);
        }
    }
}

VSS.initClassPrototype(UserProfileDialog, {
    _userProfileControl: null
});

VSS.classExtend(UserProfileDialog, TfsContext.ControlExtensions);



export class AddUserDialog extends IdentitiesDialog {

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?) {

        var baseOptions;

        if (tfsContext.isHosted) {
            baseOptions = {
                contentHeader: adminResources.AddMemberHeaderHosted,
                contentDescription: adminResources.AddMemberDescriptionHosted
            };
        }
        else {
            baseOptions = {
                contentHeader: adminResources.AddMemberHeaderOnPremise,
                contentDescription: adminResources.AddMemberDescriptionOnPremise
            };
        }

        super.initializeOptions($.extend(baseOptions, options));
    }

    public initialize() {
        var that = this;

        super.initialize();
    }
}



export class AddGroupDialog extends IdentitiesDialog {

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            contentHeader: tfsContext.isHosted ? adminResources.AddGroupHeaderHosted : adminResources.AddGroupHeaderOnPremise,
            contentDescription: tfsContext.isHosted ? adminResources.AddGroupDescriptionHosted : adminResources.AddGroupDescriptionOnPremise,
            browseGroups: true
        }, options));
    }
}

export class AddAadGroupDialog extends IdentitiesDialog {

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            contentHeader: adminResources.ADDANAADGROUP,
            contentDescription: adminResources.TypeAADGroupName,
            browseAadGroups: true
        }, options));
    }
}

export class JoinGroupDialog extends IdentitiesDialog {

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            contentHeader: tfsContext.isHosted ? adminResources.JoinGroupHeaderHosted : adminResources.JoinGroupHeaderOnPremise,
            contentDescription: tfsContext.isHosted ? adminResources.JoinGroupDescriptionHosted : adminResources.JoinGroupDescriptionOnPremise,
            browseGroups: true,
            joinGroups: true
        }, options));
    }
}

export interface AddMembersForPermissionsDialogOptions extends IdentitiesDialogOptions {
    identitySearchControl?: any;
    identityGrid?: any;
}

export class AddMembersForPermissionsDialog extends IdentitiesDialogO<AddMembersForPermissionsDialogOptions> {

    private _errorPane: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?) {

        var baseOptions;

        baseOptions = {};

        if (options && options.browseGroups) {
            if (tfsContext.isHosted) {
                baseOptions.contentHeader = adminResources.AddGroupHeaderHosted;
                baseOptions.contentDescription = adminResources.AddGroupPermissionsDescriptionHosted;
            }
            else {
                baseOptions.contentHeader = adminResources.AddGroupHeaderOnPremise;
                baseOptions.contentDescription = adminResources.AddGroupPermissionsDescriptionOnPremise;
            }
        }
        else {
            if (tfsContext.isHosted) {
                baseOptions.contentDescription = adminResources.AddMemberPermissionsDescriptionHosted;
            }
            else {
                baseOptions.contentDescription = adminResources.AddMemberPermissionsDescriptionOnPremise;
            }
        }

        baseOptions.cssClass = "add-permissions-host";
        baseOptions.allowMultiSelect = false;
        baseOptions.tableLabel = adminResources.AddPermissionsUserTableText;
        baseOptions.useLegacyStyle = false;

        if (!options.tfsContext) {
            options.tfsContext = tfsContext;
        }

        super.initializeOptions($.extend(baseOptions, options));
    }

    public initialize() {
        super.initialize();
        Diag.logTracePoint('AddMembersForPermissionsDialog.OpenDialog');
    }

    public _decorate() {
        super._decorate();

        this._errorPane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._dataDiv);
    }

    public _saveIdentities() {
        var postParams, that = this, pendingChanges = this._getPendingChanges();

        postParams =
            {
                newUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.newUsers),
                existingUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.existingUsers)
            };

        this._requestContext = TFS_Core_Ajax.postMSJSON(
            this._options.tfsContext.getActionUrl('AddIdentityForPermissions', 'security', { area: 'api' }),
            postParams,
            function (data) {
                var i,
                    identityGrid,
                    foundItem = false,
                    isPendingNewUser: boolean;

                // Cancel potential search query
                if (TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
                    that._options.identitySearchControl.clear();
                }
                else {
                    that._options.identitySearchControl.cancelSearch();
                }

                // Add to identity list, redraw, and click first item
                identityGrid = that._options.identityGrid;

                // See if item is already in list.  For internet identity compare display name.  For other use tfid.
                // With Hosted Dev Fabric, a newly added user (email address) has an empty tfid and is not assigned a real tfid until
                // a permission change is made and saved.  Therefore, we compare the display name if an empty guid.
                isPendingNewUser = (data.AddedIdentity.TeamFoundationId === TFS_Admin_Common.EmptyGuidString)
                for (i = 0; i < identityGrid._dataSource.length; i++) {
                    if (data.AddedIdentity.IdentityType === 'InternetIdentity' || isPendingNewUser) {
                        if (identityGrid._dataSource[i][0].DisplayName === data.AddedIdentity.DisplayName && identityGrid._dataSource[i][0].TeamFoundationId === data.AddedIdentity.TeamFoundationId) {
                            foundItem = true;
                            break;
                        }
                    }
                    else {
                        if (identityGrid._dataSource[i][0].TeamFoundationId === data.AddedIdentity.TeamFoundationId) {
                            foundItem = true;
                            break;
                        }
                    }
                }

                // If we didn't find item, then add it, otherwise just select it
                if (!foundItem) {
                    identityGrid._originalData.unshift([data.AddedIdentity]);
                    identityGrid._options.source = identityGrid._originalData;
                    identityGrid._options.identityToSelect = data.AddedIdentity.TeamFoundationId;
                    identityGrid.treeStructure = null;
                    identityGrid.initializeDataSource();
                } else {
                    identityGrid.setSelectedRowIndex(i);
                }

                that._element.dialog('close');
            },
            function (error) {
                that._errorPane.setError(error.message);
            },
            {
                tracePoint: 'AddIdentityDialog.SaveChanges.Success',
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: this._element.closest('.ui-dialog')
                }
            }
        );
    }
}

VSS.initClassPrototype(AddMembersForPermissionsDialog, {
    _errorPane: null
});

export class AddMembersForPermissionsDialogWithPicker extends IdentityPickerDialog<AdminIdentityDialogOptions> {
    private _identityGrid: any;

    constructor(options?) {
        super(options);
        this._identityGrid = options.identityGrid;
    }

    public initializeOptions(options?) {
        if (!options.tfsContext) {
            options.tfsContext = tfsContext;
        }

        let baseOptions: AdminIdentityDialogOptions = {
            contentHeader: adminResources.AddMemberForPermissionsWithPickerHeader,
            contentDescription: adminResources.AddMemberForPermissionsWithPickerDescription,
            operationScope: (options.tfsContext.isHosted
                ? { IMS: true }
                : { IMS: true, AD: true, WMD: true }) as Identities_Picker_Services.IOperationScope,
            identityType: {
                User: true,
                Group: true,
            } as Identities_Picker_Services.IEntityType,
            consumerId: TFS_Admin_Common.AdminUIHelper.ADD_TO_PERMISSION_DIALOG_CONSUMER_ID,
            singleSelect: true
        };

        super.initializeOptions($.extend(baseOptions, options));
    }

    public initialize() {
        super.initialize();
        Diag.logTracePoint('AddMembersForPermissionsDialogWithPicker.OpenDialog');
    }

    public saveIdentities() {
        let pendingChanges = this._getPendingChanges();

        let postParams = {
            newUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.newUsers),
            existingUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.existingUsers)
        };

        this._requestContext = TFS_Core_Ajax.postMSJSON(
            this._options.tfsContext.getActionUrl('AddIdentityForPermissions', 'security', { area: 'api' }),
            postParams,
            (data) => { // Add to the left-hand identity list, redraw, and click the first item     
                if (!data || !data.AddedIdentity) {
                    this._showError();
                    Diag.logTracePoint("IdentityPickerTeamAdminDialog.SaveChanges.Error");
                    return;
                }

                let foundItem = false;
                let isPendingNewUser = (data.AddedIdentity.TeamFoundationId === TFS_Admin_Common.EmptyGuidString);
                // See if the item is already in the list. For non-materialized identities compare the display name. For others use tfid.
                for (var i = 0; i < this._identityGrid._dataSource.length; i++) {
                    if (data.AddedIdentity.IdentityType === 'InternetIdentity' || isPendingNewUser) {
                        if (this._identityGrid._dataSource[i][0].DisplayName === data.AddedIdentity.DisplayName
                            && this._identityGrid._dataSource[i][0].TeamFoundationId === data.AddedIdentity.TeamFoundationId) {
                            foundItem = true;
                            break;
                        }
                    } else {
                        if (this._identityGrid._dataSource[i][0].TeamFoundationId === data.AddedIdentity.TeamFoundationId) {
                            foundItem = true;
                            break;
                        }
                    }
                }

                // If we didn't find the item, then add it, otherwise just select it
                if (!foundItem) {
                    this._identityGrid._originalData.unshift([data.AddedIdentity]);
                    this._identityGrid._options.source = this._identityGrid._originalData;
                    this._identityGrid._options.identityToSelect = data.AddedIdentity.TeamFoundationId;
                    this._identityGrid.treeStructure = null;
                    this._identityGrid.initializeDataSource();
                } else {
                    this._identityGrid.setSelectedRowIndex(i);
                }

                //Close dialog
                Diag.logTracePoint('AddMembersForPermissionsDialogWithPicker.SaveChanges.Success');
                Diag.logTracePoint("AddMembersForPermissionsDialogWithPicker.CloseDialog");
                this.close();
            },
            (error) => {
                this._showError(error);
                Diag.logTracePoint("IdentityPickerTeamAdminDialog.SaveChanges.Error");
            },
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: this._element.closest('.ui-dialog')
                }
            }
        );
    }

    private _getPendingChanges(): any {
        let newUsersToAdd: string[] = [];
        let existingUsersToAdd: any[] = [];
        let windowsUsersAndGroups = new TFS_Admin_Common.WindowsUsersAndGroups();

        let result = this._identityPickerSearchControl.getIdentitySearchResult();

        result.resolvedEntities.forEach((identity: Identities_Picker_RestClient.IEntity, index: number, array: Identities_Picker_RestClient.IEntity[]) => {
            if (identity.localId) {
                existingUsersToAdd.push(identity.localId);
            } else if (this._options.tfsContext.isHosted) {
                newUsersToAdd.push(identity.signInAddress);
            }

            windowsUsersAndGroups.tryAddUserOrGroupIfValid(identity);
        });

        // allow plain text as a potential sign-in address in case of MSA accounts
        if (this._isHostedMsaAccount) {
            let input = $('input', this.getElement());
            if (input.length == 1) {
                let inputValue = input.val().trim();
                newUsersToAdd = newUsersToAdd.concat(result.unresolvedQueryTokens).concat(inputValue ? [inputValue] : []);
            }
        }

        // add corresponding Active Directory users to pendingchanges
        windowsUsersAndGroups.getAllExistingUsersLocalIds().forEach(s => { existingUsersToAdd.push(s); });
        windowsUsersAndGroups.getAllNewUsersSamAccountNames().forEach(s => { newUsersToAdd.push(s); });

        return {
            newUsers: newUsersToAdd,
            existingUsers: existingUsersToAdd
        };
    }

    private _showError(error?: any) {
        // Remove old errors and display new ones
        $('.message-area-control', this._element).remove();
        <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $('.admin-dialog', this._element), {
            closeable: false,
            expanded: true,
            message: {
                header: adminResources.ErrorAddingForPermissions,
                content: Utils_String.htmlEncode(error ? error.message : adminResources.UnknownErrorAddingForPermissions)
            },
            prepend: true
        });
    }
}

VSS.initClassPrototype(AddMembersForPermissionsDialogWithPicker, {
});

export interface AddTeamAdminDialogOptions extends IdentitiesDialogOptions {
    joinToGroupTfid?: string;
}

export class AddTeamAdminDialog extends IdentitiesDialogO<AddTeamAdminDialogOptions> {

    constructor(options?) {
        /// <summary>A dialog to manage adding an admin to a team</summary>

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            cssClass: "add-team-admin-host"
        }, options));
    }

    public initialize() {
        super.initialize();
        Diag.logTracePoint("AddTeamAdminDialog.OpenDialog");
    }

    public _saveIdentities() {
        var that = this, pendingChanges = this._getPendingChanges();

        this._requestContext = TFS_Core_Ajax.postMSJSON(
            this._options.tfsContext.getActionUrl('AddTeamAdmins', 'identity', { area: 'api' }),
            {
                teamId: this._options.joinToGroupTfid,
                newUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.newUsers),
                existingUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.existingUsers)
            },
            function (data) {
                if (data) {
                    // Even if errors were hit, some admins may have been added, so pass back the list
                    if (data.admins && that._options && that._options.successCallback && $.isFunction(that._options.successCallback)) {
                        // May be trying to add someone that is already an admin.  Return all admins.
                        that._options.successCallback.call(that, data.admins);
                    }

                    if (data.membershipModel && data.membershipModel.HasErrors) {
                        // Display errors
                        $('.admin-dialog', that._element).empty();

                        var showError = false;

                        if (tfsContext.isHosted && data.membershipModel.AADErrors.length > 0 && data.membershipModel.GeneralErrors.length == 0) {
                            <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $('.admin-dialog', that._element), {
                                closeable: false,
                                expanded: true,
                                showDetailsLink: false,
                                showHeader: false,
                                message: {
                                    header: '',
                                    content: TFS_Admin_Common.parseErrors(data.membershipModel),
                                    type: Notifications.MessageAreaType.Warning,
                                }
                            });
                        }
                        else {
                            showError = true;
                        }

                        if (showError) {
                            <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $('.admin-dialog', that._element), {
                                closeable: false,
                                expanded: true,
                                message: {
                                    header: adminResources.ErrorAddingTeamAdmin,
                                    content: TFS_Admin_Common.parseErrors(data.membershipModel)
                                }
                            });
                        }
                        that._element.dialog('option', 'buttons', [that._closeButton]);
                        Diag.logTracePoint("AddIdentityDialog.SaveChanges.Error");
                        Diag.logTracePoint('Dialog.initialize.complete');
                    }
                    else {

                        // Close dialog
                        Diag.logTracePoint("AddIdentityDialog.SaveChanges.Success");
                        Diag.logTracePoint("AddIdentityDialog.CloseDialog");
                        that.close();
                    }
                }
            },
            null,
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: this._element.closest('.ui-dialog')
                }
            }
        );
    }
}

VSS.classExtend(AddTeamAdminDialog, TfsContext.ControlExtensions);

export class IdentityPickerTeamAdminDialog extends IdentityPickerDialog<AdminIdentityDialogOptions> {

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            identityType: { User: true, Group: true },
            operationScope: tfsContext.isHosted ? { IMS: true } : { IMS: true, AD: true, WMD: true },
            consumerId: TFS_Admin_Common.AdminUIHelper.ADD_TEAM_ADMIN_DIALOG_CONSUMER_ID,
            tableLabel: adminResources.AddUserTableText, //text-box prompt
            contentDescription: adminResources.TeamAdminIdentityPickerDialog_SearchInstructions,//description of dialog
        }, options));
    }

    public initialize() {
        super.initialize();
    }

    public saveIdentities() {
        var pendingChanges = this._getPendingChanges();

        this._requestContext = TFS_Core_Ajax.postMSJSON(
            this._options.tfsContext.getActionUrl('AddTeamAdmins', 'identity', { area: 'api' }),
            {
                teamId: this._options.joinToGroupTfid,
                newUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.newUsersOrGroups),
                existingUsersJson: Utils_Core.stringifyMSJSON(pendingChanges.existingUsersOrGroups)
            },
            (data) => {
                if (data) {
                    // Even if errors were hit, some admins may have been added, so pass back the list
                    if (data.admins && data.admins.length && this._options && this._options.successCallback && $.isFunction(this._options.successCallback)) {
                        // May be trying to add someone that is already an admin.  Return all admins.
                        this._options.successCallback.call(this, data.admins);
                    }

                    if (data.membershipModel && data.membershipModel.HasErrors) {
                        // Remove old errors and display new ones
                        $('.message-area-control', this._element).remove();
                        <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $('.admin-dialog', this._element), {
                            closeable: false,
                            expanded: true,
                            message: {
                                header: adminResources.ErrorAddingTeamAdmin,
                                content: TFS_Admin_Common.parseErrors(data.membershipModel)
                            },
                            prepend: true
                        });
                        setDialogButtons(this._element, [this._saveButton, this._closeButton]);
                        Diag.logTracePoint("IdentityPickerTeamAdminDialog.SaveChanges.Error");
                        Diag.logTracePoint('Dialog.initialize.complete');
                    }
                    else {
                        // Close dialog
                        Diag.logTracePoint("IdentityPickerTeamAdminDialog.SaveChanges.Success");
                        Diag.logTracePoint("IdentityPickerTeamAdminDialog.CloseDialog");
                        this.close();
                    }
                }
            },
            null,
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: this._element.closest('.ui-dialog')
                }
            }
        );
    }

    private _getPendingChanges(): any {
        var newUsersOrGroupsToAdd: string[] = [];
        var existingUsersOrGroupsToAdd: any[] = [];
        var windowsUsersAndGroups = new TFS_Admin_Common.WindowsUsersAndGroups();
        var result = this._identityPickerSearchControl.getIdentitySearchResult();

        result.resolvedEntities.forEach((identity: Identities_Picker_RestClient.IEntity, index: number, array: Identities_Picker_RestClient.IEntity[]) => {
            if (identity.localId) {
                existingUsersOrGroupsToAdd.push(identity.localId);
            } else if (this._options.tfsContext.isHosted) {
                newUsersOrGroupsToAdd.push(identity.signInAddress);
            }

            windowsUsersAndGroups.tryAddUserOrGroupIfValid(identity);
        });

        if (this._isHostedMsaAccount) {
            var inputValue = $('input', this.getElement()).val().trim();
            newUsersOrGroupsToAdd = newUsersOrGroupsToAdd.concat(result.unresolvedQueryTokens).concat(inputValue ? [inputValue] : []);
        }

        // Add corresponding Active Directory users to pendingchanges
        windowsUsersAndGroups.getAllExistingUsersLocalIds().forEach(s => { existingUsersOrGroupsToAdd.push(s); });
        windowsUsersAndGroups.getAllNewUsersSamAccountNames().forEach(s => { newUsersOrGroupsToAdd.push(s); });

        return {
            newUsersOrGroups: newUsersOrGroupsToAdd,
            existingUsersOrGroups: existingUsersOrGroupsToAdd
        };
    }
}

VSS.initClassPrototype(IdentityPickerTeamAdminDialog, {
    _$data: null,
    _$wrapper: null,
    _$contentDescriptionElement: null,
    _identityPickerSearchControl: null,
    _saveButton: null,
    _$dataDiv: null,
    _cancelButton: null,
    _closeButton: null,
    _requestContext: null,
});

VSS.classExtend(IdentityPickerTeamAdminDialog, TfsContext.ControlExtensions);

export class TracePermissionDialog extends Dialogs.ModalDialog {

    public static _controlType: string = 'TracePermissionDialog';

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            cssClass: 'admin-dialog',
            url: tfsContext.getActionUrl('TracePermission', 'security', { area: 'api', includeLanguage: true }),
            urlParams: TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {},
            width: 650,
            minWidth: 550,
            height: 550,
            minHeight: 450,
            open: function () {
                Diag.logTracePoint('TracePermissionDialog.OpenDialog');
            },
            buttons: [{
                id: 'closeButton',
                text: adminResources.Close,
                click: () => { this.onCancelClick(); }
            }],
            close: function () {
                Diag.logTracePoint('TracePermissionDialog.CloseDialog');
            },
            title: Utils_String.htmlEncode(adminResources.TracePermissionDialogTitle)
        }, options));
    }
}

export class TraceLicenseDialog extends Dialogs.ModalDialogO<AdminDialogOptions> {

    public static _controlType: string = 'TraceLicenseDialog';

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            cssClass: 'admin-dialog',
            width: 650,
            minWidth: 550,
            height: 550,
            minHeight: 450,
            open: function () {
                Diag.logTracePoint('TraceLicenseDialog.OpenDialog');
            },
            buttons: [{
                id: 'closeButton',
                text: adminResources.Close,
                click: () => { this.onCancelClick(); }
            }],
            close: function () {
                Diag.logTracePoint('TraceLicenseDialog.CloseDialog');
            },
            title: adminResources.TraceLicenseDialogTitle
        }, options));
    }

    public initialize() {
        this._options.url = this._options.tfsContext.getActionUrl('Trace', 'licenses', { area: 'api', serviceHost: null, project: null, team: null });
        this._options.urlParams = { teamFoundationId: this._options.tfid };
        super.initialize();
    }
}

VSS.classExtend(TraceLicenseDialog, TfsContext.ControlExtensions);

export interface ChangeImageDialogOptions extends AdminDialogOptions {
    imageSize?: number;
    isGroup?: boolean;
}

export class ChangeImageDialog extends Dialogs.ModalDialogO<ChangeImageDialogOptions> {

    public static _controlType: string = 'ChangeImageDialog';

    private _errorPane: any;
    private _requestContext: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            width: 450,
            height: 350,
            minWidth: 450,
            minHeight: 350,
            imageSize: 2,
            open: function () {
                Diag.logTracePoint('ChangeImageDialog.OpenDialog');
            },
            beforeClose: function () {
                return (!this._requestContext || this._requestContext.isComplete);
            },
            close: function () {
                Diag.logTracePoint('ChangeImageDialog.CloseDialog');
            },
            buttons: {
                saveButton: {
                    id: 'btnChangeImage',
                    text: Utils_String.htmlEncode(adminResources.SaveChanges),
                    disabled: true,
                    click: () => { this._onSaveAction(); }
                },
                cancelButton: {
                    id: 'btnCancel',
                    text: Utils_String.htmlEncode(adminResources.Cancel),
                    click: () => { this._onCancelAction(); }
                }
            },
            title: Utils_String.htmlEncode(adminResources.ProfileImage)
        }, options));
    }

    public initialize() {
        var that = this;
        this._options.url = this._options.tfsContext.getActionUrl('ChangeImage', 'image', { area: 'api' });
        this._options.urlParams = $.extend({ id: this._options.tfid }, TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {});
        this._options.success = function (data) {
            that._populateDialog(data);
        };

        super.initialize();
    }

    private _onSaveAction() {
        var actionId = $('#actionIdHidden').val(),
            tfid = this._options.tfid,
            actionUrl,
            that = this;

        if (actionId === 'reset') {
            actionUrl = this._options.tfsContext.getActionUrl('RemoveImage', 'image', { area: 'api' });
        }
        else {
            actionUrl = this._options.tfsContext.getActionUrl('CommitCandidateImage', 'image', { area: 'api' });
        }

        this._requestContext = TFS_Core_Ajax.postHTML(
            actionUrl,
            $.extend({ tfid: tfid }, TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {}),
            function (data) {
                TFS_Host_TfsContext.setImageTimestamp();
                // Update images on rest of page
                var imageUrl = that._options.tfsContext.getIdentityImageUrl(that._options.tfid, $.extend({ size: that._options.imageSize }, TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {}));
                $('img.identity-' + that._options.tfid).attr('src', imageUrl);

                that._element.dialog('close');
            },
            function (error) {
                that._errorPane.setError(error.message);
            },
            {
                tracePoint: 'ChangeImageDialog.SaveChanges.Success',
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: that._element
                }
            }
        );
    }

    private _onCancelAction() {
        var tfid = this._options.tfid, that = this;

        // If there is an imageId set that means that the user
        // previewed an image.  So we need to delete that from server
        if ($('#imageUploadedHidden').val()) {
            this._requestContext = TFS_Core_Ajax.postHTML(
                this._options.tfsContext.getActionUrl('CancelImageUpload', 'image', { area: 'api' }),
                $.extend({ tfid: tfid }, TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {}),
                function (data) {
                    that._element.dialog('close');
                },
                function (error) {
                    that._errorPane.setError(error.message);
                },
                {
                    tracePoint: 'ChangeImageDialog.CancelChanges.Success',
                    wait: {
                        image: hostConfig.getResourcesFile('big-progress.gif'),
                        message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                        target: that._element
                    }
                }
            );
        }
        else {
            this._element.dialog('close');
        }
    }

    private _populateDialog(data) {
        var that = this;

        this._errorPane = <Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $('.change-image-error-pane', this._element));

        // In IE the change event does not fire and you need to use
        // IE's propertyChange event.  Other browsers can bind to change event
        $('#idImage', this._element).bind('propertychange change', function () {
            var $form;
            if ($('#idImage').val()) {
                $('.image-upload-div').addClass('loading');
                $('#btnChangeImage').button('disable');
                that._errorPane.clear();

                $form = $('#frmImageUpload');
                TFS_Core_Ajax.setAntiForgeryToken($form);
                $form.submit();
            }
        });

        $('.profile-image-reset', this._element).click(function () {
            // Clear out the image associated with file control
            that._element.find('#idImage').val('');

            // Clear out the hidden image id which contains id of possible new image to upload
            that._element.find('#actionIdHidden').val('reset');

            // Set the image preview to default image
            that._element.find('.preview-image').attr('src', that._options.isGroup ? hostConfig.getResourcesFile('Team.svg') : hostConfig.getResourcesFile('User.svg'));

            // Enable save button so you can save the reset
            that._element.siblings(".ui-dialog-buttonpane").find('#' + that._options.buttons.saveButton.id).button('enable');

            return false;
        });

        $('#btnImageSelect', this._element).click(function () {
            that._element.find('#idImage').click();
        });
    }
}

VSS.initClassPrototype(ChangeImageDialog, {
    _errorPane: null,
    _requestContext: null
});

VSS.classExtend(ChangeImageDialog, TfsContext.ControlExtensions);



export class ImageUploadComplete {

    constructor(tfid: string, errorMessage) {
        var errorPane, imageUrl;
        $('.image-upload-div').removeClass('loading');
        if (errorMessage) {
            // Disable the submit button and set error
            $('#btnChangeImage').button('disable');
            errorPane = <Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $('.change-image-error-pane'));
            errorPane.setError(Utils_String.htmlDecode(errorMessage));
        } else {
            // This is for case of preview image.  So image was uploaded but not yet associated with the identity
            imageUrl = tfsContext.getIdentityImageUrl(tfid, $.extend({ previewCandidateImage: true, t: $.now() }, TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {}));

            $('#btnChangeImage').button('enable');
            $('.preview-image').attr('src', imageUrl);
            $('#imageUploadedHidden').val('true');
            $('#actionIdHidden').val('1');
        }
    }
}

export interface DeleteIdentityDialogOptions extends AdminDialogOptions {
    bodyText?: string;
    deleteButtonText?: string;
    removeType?: string;
}

export class DeleteIdentityDialog extends Dialogs.ModalDialogO<DeleteIdentityDialogOptions> {

    public static _controlType: string = 'DeleteIdentityDialog';

    private _requestContext: any;
    private _removeButton: any;

    public _closeButton: any;
    public _cancelButton: any;
    public $removeButton: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: false,
            width: 450,
            height: 250,
            minWidth: 400,
            minHeight: 200,
            modal: true,
            open: function () {
                Diag.logTracePoint('DeleteIdentityDialog.OpenDialog');
            },
            beforeClose: () => { this._beforeClose(); },
            close: function () {
                Diag.logTracePoint('DeleteIdentityDialog.CloseDialog');
            },
            title: options.titleText
        }, options));
    }

    public initialize() {
        super.initialize();

        var $infoContainer = $(domElem('div'))
            .appendTo(this._element)
            .addClass('admin-dialog')
            .attr('id', 'delete-identity-dialog');

        // Warning header
        var $dialogWarning = $(domElem('div')).appendTo($infoContainer).addClass('ui-dialog-warning-header-identity').appendTo($infoContainer);
        $dialogWarning.text(adminResources.CannotBeUndone);
        $(domElem('span', 'ui-dialog-warning-icon')).attr({ role: "img", "aria-label": adminResources.WarningIconLabel }).prependTo($dialogWarning);

        // Body Test
        var $dialogText = $("<p>").html(this._options.bodyText).addClass('ui-dialog-warning-body');
        $infoContainer.append($dialogText);

        this._initializeButtons();
        this.$removeButton.focus();
    }

    private _initializeButtons() {
        this._closeButton = {
            id: 'exitDialog',
            text: Utils_String.htmlEncode(adminResources.Close),
            click: function () {
                $(this).dialog('close');
            }
        };

        this._cancelButton = {
            id: 'cancel',
            text: Utils_String.htmlEncode(adminResources.Cancel),
            click: function () {
                $(this).dialog('close');
            }
        };

        this._removeButton = {
            id: 'removeGroup',
            text: this._options.deleteButtonText,
            class: "warning",
            click: () => {
                if (this._options.removeType && this._options.removeType === adminResources.DeleteTeam) {
                    this._removeTeamIdentity();
                }
                else {
                    this._removeIdentity();
                }
            }
        };

        setDialogButtons(this._element, [this._removeButton, this._cancelButton]);
        this.$removeButton = this._element.siblings(".ui-dialog-buttonpane").find('#removeGroup');
    }

    private _beforeClose() {
        return (!this._requestContext || this._requestContext.isComplete);
    }

    private async _removeTeamIdentity() {

        var webContext = Context.getDefaultWebContext();
        var coreClient = TFS_Core_RestClient.getClient();

        let _statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl
            .createIn(StatusIndicator.StatusIndicator, this,
            {
                center: true,
                imageClass: "big-status-progress", message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait)
            });
        _statusIndicator.start();

        return coreClient.deleteTeam(webContext.project.id, this._options.tfid)
            .then(() => {
                if ($.isFunction(this._options.successCallback)) {
                    this._options.successCallback.call(this);
                }
                _statusIndicator.complete();
                this._element.dialog('close');
            },
            (error: any) => {
                $('.admin-dialog', this._element).empty();
                <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $('.admin-dialog', this._element), {
                    closeable: false,
                    message: error.message
                });
                _statusIndicator.complete();
                this._element.dialog('option', 'buttons', [this._closeButton]);
            }
        );
    }

    private _removeIdentity() {
        var that = this;

        this._requestContext = TFS_Core_Ajax.postHTML(
            this._options.tfsContext.getActionUrl('DeleteIdentity', 'identity', { area: 'api' }),
            $.extend({
                tfid: this._options.tfid
            }, TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {}),
            function (data) {
                // If nothing returned then the deletion was successful
                if ($.isFunction(that._options.successCallback)) {
                    that._options.successCallback.call(that);
                }

                that._element.dialog('close');
            },
            function (error) {
                $('.admin-dialog', that._element).empty();
                <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $('.admin-dialog', that._element), {
                    closeable: false,
                    message: error.message
                });

                that._element.dialog('option', 'buttons', [that._closeButton]);
            },
            {
                tracePoint: 'DeleteIdentityDialog.DeleteIdentity.Success',
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: this._element.closest('.ui-dialog')
                }
            }
        );
    }
}

VSS.initClassPrototype(DeleteIdentityDialog, {
    _requestContext: null,
    _closeButton: null,
    _cancelButton: null,
    _removeButton: null,
    $removeButton: null
});

VSS.classExtend(DeleteIdentityDialog, TfsContext.ControlExtensions);

export interface RemoveTeamAdminDialogOptions extends AdminDialogOptions {
    text?: string;
    teamTfId?: string;
}

export class RemoveTeamAdminDialog extends Dialogs.ModalDialogO<RemoveTeamAdminDialogOptions> {

    public static _controlType: string = 'RemoveTeamAdminDialog';

    private _requestContext: any;
    private _removeButton: any;

    public _closeButton: any;
    public _cancelButton: any;
    public $removeButton: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: false,
            width: 450,
            height: 250,
            minWidth: 400,
            minHeight: 200,
            modal: true,
            open: function () {
                Diag.logTracePoint('RemoveTeamAdminDialog.OpenDialog');
            },
            beforeClose: () => { this._beforeClose(); },
            close: function () {
                Diag.logTracePoint('RemoveTeamAdminDialog.CloseDialog');
            },
            title: Utils_String.htmlEncode(adminResources.RemoveTeamAdminTitle)
        }, options));
    }

    public initialize() {
        super.initialize();

        $(domElem('div')).appendTo(this._element)
            .addClass('admin-dialog')
            .attr('id', 'remove-team-admin-dialog')
            .text(this._options.text);

        this._initializeButtons();
        this.$removeButton.focus();
    }

    private _initializeButtons() {
        this._cancelButton = {
            id: 'remove-team-admin-dialog-cancel-button',
            text: Utils_String.htmlEncode(adminResources.Cancel),
            click: function () {
                $(this).dialog('close');
            }
        };

        this._closeButton = {
            id: 'remove-team-admin-dialog-close-button',
            text: Utils_String.htmlEncode(adminResources.Close),
            click: function () {
                $(this).dialog('close');
            }
        };

        this._removeButton = {
            id: 'remove-team-admin-dialog-remove-button',
            text: Utils_String.htmlEncode(adminResources.Remove),
            class: "warning",
            click: () => { this._removeIdentity(); }
        };

        setDialogButtons(this._element, [this._removeButton, this._cancelButton]);

        this.$removeButton = this._element.siblings(".ui-dialog-buttonpane").find('#remove-team-admin-dialog-remove-button');
    }

    private _beforeClose() {
        return (!this._requestContext || this._requestContext.isComplete);
    }

    private _removeIdentity() {
        var that = this;
        this._requestContext = TFS_Core_Ajax.postHTML(
            this._options.tfsContext.getActionUrl('RemoveTeamAdmin', 'identity', { area: 'api' }),
            {
                teamId: this._options.teamTfId,
                tfidToRemove: this._options.tfid
            },
            function (data) {
                if ($.isFunction(that._options.successCallback)) {
                    that._options.successCallback.call(that, { tfid: that._options.tfid });
                }
                that._element.dialog('close');
            },
            function (error) {
                $('.admin-dialog', that._element).empty();
                <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $('.admin-dialog', that._element), {
                    closeable: false,
                    message: error.message
                });

                that._element.dialog('option', 'buttons', [that._closeButton]);
            },
            {
                tracePoint: 'RemoveTeamAdminDialog.RemoveAdmin.Success',
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: this._element.closest('.ui-dialog')
                }
            }
        );
    }
}

VSS.initClassPrototype(RemoveTeamAdminDialog, {
    _requestContext: null,
    _closeButton: null,
    _cancelButton: null,
    _removeButton: null,
    $removeButton: null
});

VSS.classExtend(RemoveTeamAdminDialog, TfsContext.ControlExtensions);

export interface ManageGroupDialogOptions extends AdminDialogOptions {
    identity?: any;
    imageAltText?: string;
    navigateToTeamOnSuccess: boolean;
}


export class ManageGroupDialog extends Dialogs.ModalDialogO<ManageGroupDialogOptions> {

    public static _controlType: string = 'ManageGroupDialog';

    private _groupTfid: any;
    private _isForEdit: any;
    private _cancelButton: any;
    private _saveButton: any;
    private _identityHeader: any;
    private _profileTabId: any;
    private _profileTab: any;
    public _focusClass: string;

    public _requestContext: any;
    public $groupData: any;
    public $profileContainer: any;
    public $mainDiv: any;
    public $description: any;
    public $name: any;
    public $nameError: any;
    public $descError: any;
    public _tabsControlDiv: any;
    public _errorPane: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            width: 600,
            minWidth: 600,
            height: 500,
            minHeight: 400,
            modal: true,
            okText: this._getSaveButtonText(options),
            open: function () {
                Diag.logTracePoint('ManageGroupDialog.OpenDialog');
            },
            beforeClose: () => { this._beforeClose(); },
            title: options.dialogTitle
        }, options));
    }

    public initialize() {
        var id, ul, focusClass;
        super.initialize();


        this._groupTfid = this._options.identity ? this._options.identity.TeamFoundationId : undefined;
        this._isForEdit = this._groupTfid !== undefined;

        this.$mainDiv = $(domElem('div')).appendTo(this._element).addClass('admin-dialog').attr('id', 'manage-group-dialog');

        // Setup the tabs
        id = this.getId();
        this._profileTabId = 'profile_' + id;
        this._tabsControlDiv = $(domElem('div')).appendTo(this.$mainDiv);
        ul = $(domElem('ul')).addClass('manage-group-tabs').appendTo(this._tabsControlDiv);

        // Setup the error pane
        this._errorPane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._tabsControlDiv);

        this._tabsControlDiv.tabs();
        ul.append($('<li><a href="#' + this._profileTabId + '">' + adminResources.Profile + '</a></li>'));

        this._profileTab = $('a[href="#' + this._profileTabId + '"]');
        this._focusClass = "enter" + this._profileTabId;

        this._profileTab.bind("blur", (event) => {
            if (this._profileTab.hasClass(this._focusClass)) {
                this._profileTab.focus();
                this._profileTab.removeClass(this._focusClass);
            }
        });
        this._profileTab.bind("keydown", (event) => {
            if (event.keyCode === Utils_UI.KeyCode.ENTER) {
                this._profileTab.addClass(this._focusClass);
            }
        });
        this._profileTab.bind("keyup", (event) => {
            if (event.keyCode === Utils_UI.KeyCode.ENTER) {
                if (this._profileTab.hasClass(this._focusClass)) {
                    this._profileTab.removeClass(this._focusClass);
                }
            }
        });

        // Load the form
        this._loadForm();
    }

    public _decorate(data?: any) {
        /// <param name="data" type="any" optional="true" />

        var imageSection, groupData;
        if (this._element) {
            this.$profileContainer = $(domElem('div')).attr('id', this._profileTabId).addClass('profile-container').appendTo(this._tabsControlDiv);
            this._tabsControlDiv.tabs('refresh');
            this._tabsControlDiv.tabs('option', 'active', 0);

            // Add the image
            imageSection = $(domElem('div')).addClass('manage-group-image').appendTo(this.$profileContainer);
            if (data) {
                IdentityImage.identityImageElement(this._options.tfsContext, this._groupTfid, TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {}).addClass('large-identity-picture').appendTo(imageSection);
                $(domElem('a')).appendTo(imageSection).text(adminResources.ChangePicture).attr('href', '#').bind('click', () => { this._changePicture(); });
            } else {
                $(domElem('img')).addClass('large-identity-picture').attr('src', hostConfig.getResourcesFile('ip-content-vso-group-default.png')).attr('alt', this._options.imageAltText || adminResources.NewGroupAltText).appendTo(imageSection);
            }

            //Add the data
            groupData = $(domElem('div')).addClass('manage-group-data request-user-info-control').appendTo(this.$profileContainer);

            this.$groupData = groupData;

            // Add the name
            this._addNameElement(data, groupData);

            //Add the description
            this._addDescriptionElement(data, groupData);

            this.$name.focus();
            this.updateOkButton(true);

            $('.manage-group-tabs').find('li').removeAttr('aria-expanded'); // jQuery UI sets this attribute when it should not.
        }

        Diag.logTracePoint('Dialog.initialize.complete');
        Diag.logTracePoint('ManageGroup.Ready');
    }

    public _addNameElement(data, groupData) {
        var nameDiv;

        $(domElem('label')).addClass('manage-group-label').attr('for', 'groupName').appendTo(groupData).text(this._getNameLabel(data));
        nameDiv = $(domElem('div')).appendTo(groupData);
        this.$name = $(domElem('input')).attr('type', 'text').attr('id', 'groupName').addClass('requiredInfoLight').val(data ? data.FriendlyDisplayName : '').appendTo(nameDiv);
        this.$name.bind('keyup', (event) => { this._validateName(event); });

        this.$nameError = $(domElem('div')).appendTo(nameDiv);
        this.$nameError.hide();
    }

    public _validateCharCount(elem, charLimit, charThreshold, errorField) {
        Diag.Debug.assert(charLimit > charThreshold, "Char threshold must be greater than the threshold");
        Diag.Debug.assert(charLimit >= 0, "Char limit must be greater than or equal to 0");
        Diag.Debug.assert(charThreshold >= 0, "Char threshold must be greater than or equal to 0");

        // Clear the error classes
        $(elem).removeClass('invalid');

        if (!($(elem).val()) || $(elem).val().length < charThreshold) {
            // Hide character count if it's under threshold
            errorField.hide();
        }
        else {
            // Show character count if it's over threshold
            errorField.show();

            // Truncate if text length is too long
            if ($(elem).val().length > charLimit) {
                $(elem).val($(elem).val().substr(0, charLimit));
            }

            // Display characters remaining
            errorField.text(Utils_String.format(adminResources.CharactersRemaining, charLimit - $(elem).val().length));
        }
    }

    public _evaluateSaveButtonState(): any {
        /// <returns type="any" />
        var enableSaveButton = false;

        // There needs to be a group name for save button to be enabled
        if (this.$name.val() && $.trim(this.$name.val()).length) {
            enableSaveButton = true;
        }

        this.updateOkButton(enableSaveButton);

        return enableSaveButton;
    }

    public _beforeClose() {
        return (!this._requestContext || this._requestContext.isComplete);
    }

    public onOkClick() {
        var that = this;

        this._requestContext = TFS_Core_Ajax.postMSJSON(
            this._options.tfsContext.getActionUrl('ManageGroup', 'identity', { area: 'api' }),
            $.extend({
                name: this.$name.val(),
                description: this.$description.val(),
                tfid: this._groupTfid
            }, TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {}),
            function (identity) {
                if ($.isFunction(that._options.successCallback)) {
                    that._options.successCallback(identity);
                }
                that.close();
                Diag.logTracePoint('ManageGroup.dialog-closed');
            },
            function (error) {
                that._errorPane.setError(error.message);
                that.updateOkButton(false);
            },
            {
                tracePoint: 'ManageGroup.btnSaveGroupChanges.Success',
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: this._element.closest('.ui-dialog')
                }
            }
        );
    }

    public _getSaveButtonText(options?) {
        return (options.identity ? Utils_String.htmlEncode(adminResources.SaveChanges) : Utils_String.htmlEncode(adminResources.CreateGroup));
    }

    private _loadForm() {
        if (this._groupTfid) {
            TFS_Core_Ajax.getMSJSON(
                this._options.tfsContext.getActionUrl('ManageGroup', 'identity', { area: 'api' }),
                $.extend({
                    tfid: this._groupTfid
                }, TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {}),
                (data) => { this._decorate(data); },
                null,
                {
                    wait: {
                        image: hostConfig.getResourcesFile('big-progress.gif'),
                        message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                        target: this._element
                    }
                }
            );
        } else {
            this._decorate();
        }
    }

    public _getNameLabel(data) {
        return (data && data.IsTeam) ? adminResources.TeamName : adminResources.GroupName;
    }

    private _addDescriptionElement(data, groupData) {
        var descDiv,
            that = this;

        $(domElem('label')).addClass('manage-group-label').attr('for', 'groupDesc').appendTo(groupData).text(adminResources.Description);
        descDiv = $(domElem('div')).appendTo(groupData);
        this.$description = $("<textarea />")
            .addClass('requiredInfoLight')
            .attr('id', 'groupDesc')
            .appendTo(descDiv)
            .val(data ? data.Description : '')
            .attr('rows', '6');

        this.$description.bind('keyup paste', () => { this._validateDesc(); });
        this.$description.bind('paste', function () {
            Utils_Core.delay(that, 100,
                function () {
                    that._validateDesc();
                });
        });

        this.$descError = $(domElem('div')).appendTo(descDiv).addClass('team-desc-error');
        this.$descError.hide();

        // Trigger keyup to populate initial charLimitText
        this.$description.trigger('keyup');
    }

    public _validateName(event) {
        if (event.keyCode !== $.ui.keyCode.ENTER) {
            this._validateCharCount(this.$name, 256, 200, this.$nameError);
            this._evaluateSaveButtonState();
        }
    }

    private _validateDesc() {
        this._validateCharCount(this.$description, 256, 200, this.$descError);
        this._evaluateSaveButtonState();
    }

    private _changePicture() {
        Dialogs.show(ChangeImageDialog, { tfid: this._groupTfid, isGroup: true });
    }
}

VSS.initClassPrototype(ManageGroupDialog, {
    _requestContext: null,
    _groupTfid: null,
    _isForEdit: null,
    _cancelButton: null,
    _saveButton: null,
    $groupData: null,
    $profileContainer: null,
    $mainDiv: null,
    $description: null,
    $name: null,
    $nameError: null,
    $descError: null,
    _identityHeader: null,
    _tabsControlDiv: null,
    _errorPane: null,
    _profileTabId: null
});

VSS.classExtend(ManageGroupDialog, TfsContext.ControlExtensions);

interface DropDownOption {
    id: string;
    name: string;
    description: string;
    isDefault: boolean;
}

export interface ProjectDialogBaseOptions extends AdminDialogOptions {
    projectId?: string;
    projectName?: string;
}

export abstract class ConfirmDestroyDialogBase<TOptions extends AdminDialogOptions> extends Dialogs.ModalDialogO<TOptions> {
    protected _container: JQuery;

    protected _okButton: any;
    protected _cancelButton: any;
    protected _closeButton: any;

    public _updatedValidationError: Notifications.MessageAreaControl;

    protected abstract _createInfoArea($infoContainer: JQuery);
    protected abstract _createConfirmationArea($infoContainer: JQuery);
    protected abstract _onDialogClose();

    public initializeOptions(options?: any, tracepoint?: string, dialogTitle?: string, height?: number, width?: number) {
        super.initializeOptions($.extend({
            width: width,
            minWidth: width,
            height: height,
            minHeight: height,
            modal: true,
            open: function () {
                Diag.logTracePoint(tracepoint);
            },
            close: () => { this._onDialogClose(); },
            title: Utils_String.htmlEncode(dialogTitle)
        }, options));
    }

    public initialize(okButtonText?: string) {
        this._okButton = {
            id: "ok",
            text: okButtonText,
            click: () => { this.onOkClick(); },
        };
        this._cancelButton = {
            id: "cancel",
            text: adminResources.Cancel,
            click: () => { this.onCancelClick(); }
        };
        this._closeButton = {
            id: "close",
            text: adminResources.Close,
            click: () => { this.onCancelClick(); }
        };


        this._options.buttons = [this._okButton, this._cancelButton];
        this._container = $("<div>").addClass('confirm-dialog-container').appendTo(this._element);

        super.initialize();

        // Render the main page
        this.renderMainPage();
    }

    protected _createCheckboxConfirmationArea($infoContainer: JQuery, confirmationText: string) {
        var $dialogConfirmation = $("<div>").addClass("update-confirm");

        var $checkBox = $('<input type=checkbox>')
            .addClass('update-confirmation-checkbox')
            .attr('align', 'bottom')
            .attr('name', 'confirmCheck')
            .attr('id', 'confirm-check')
            .appendTo($dialogConfirmation)
            .bind("change", e => this.updateOkButton($(e.target).prop('checked')));

        $(domElem('label')).appendTo($dialogConfirmation)
            .attr('for', 'confirm-check')
            .addClass('confirmation-checkbox-text')
            .text(confirmationText);

        $infoContainer.append($dialogConfirmation);

        $checkBox.focus();
    }

    protected _createTextConfirmationArea($infoContainer: JQuery, confirmationText: string, expectedValue: string) {
        var $dialogConfirmation = $("<div>").addClass("delete-confirm");

        var deleteLabelId = 'destroyTextboxLabel';
        $(domElem('span')).appendTo($dialogConfirmation)
            .addClass('destroy-textbox-text')
            .attr('id', deleteLabelId)
            .text(confirmationText);
        var that = this;
        var $textBox = $(domElem('input'))
            .attr('type', 'text')
            .attr('aria-labelledby', deleteLabelId)
            .addClass('textbox')
            .addClass('destroy-textbox-text')
            .appendTo($dialogConfirmation)
            .bind("input keyup", e => {
                if (e.keyCode !== Utils_UI.KeyCode.ENTER) {
                    var match: boolean = Utils_String.equals($textBox.val(), expectedValue, true);
                    this.updateOkButton(match);
                    $textBox.toggleClass('destroy-confirmation-match', match);
                }
            });

        $infoContainer.append($dialogConfirmation);
        $textBox.focus();
    }

    public renderMainPage() {
        var $infoContainer;
        this._container.empty();

        this._updatedValidationError = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._container, { closeable: false });
        $infoContainer = $("<div>").addClass('destroy-info').appendTo(this._container);

        let $warningHeader = $("<div>").addClass("ui-dialog-warning-header confirm-warning").appendTo($infoContainer);
        $(domElem('span')).appendTo($warningHeader).addClass('ui-dialog-warning-icon');
        $(domElem('span')).appendTo($warningHeader).addClass('destroy-description').text(adminResources.CannotBeUndone);

        setDialogButtons(this._element, [this._okButton, this._cancelButton]);
        this.updateOkButton(false);

        this._createInfoArea($infoContainer);
        this._createConfirmationArea($infoContainer);
    }
}

export abstract class ProjectDialogBase<TOptions extends ProjectDialogBaseOptions> extends ConfirmDestroyDialogBase<TOptions> {

    public _monitorJobControl: TFS_Admin_Common.MonitorControl;
    public _updateProjectProgress: any;
    public _projectUpdated: boolean;
    public _informationLink: string;
    public _urlText: string;
    public _infoText: string;
    public _infoText2: string;
    public _confirmationText: string;
    public _gettingStartedHeaderText: string;
    public _notStartedText: string;
    public _inProgressText: string;
    public _completeText: string;
    public _failureText: string;
    public _retryActionText: string;

    protected _createInfoArea($infoContainer: JQuery) {
        var dialogLink = Utils_String.format("<a href='{0}' target='_blank'>{1}</a>", this._informationLink, this._urlText);
        var $dialogText = $("<div>").addClass("update-project-text").text(this._infoText);
        var $dialogText2 = $("<div>").addClass("update-project-text").html(Utils_String.format(this._infoText2, dialogLink));

        $infoContainer.append($dialogText).append($dialogText2);
    }

    public renderProgressPage(jobId) {
        this._container.empty();
        this._container.attr('role', 'status');

        $(domElem('h2')).addClass('getting-started-header').text(this._gettingStartedHeaderText).appendTo(this._container);

        this._updateProjectProgress = $(domElem('div')).addClass('update-project-progress').appendTo(this._container);

        this.createMonitorControl(jobId);
        this._monitorJobControl._element.bind('render-complete', () => { this._onRenderComplete(); });
        this._monitorJobControl._element.bind('retry-after-failure', () => { this._onRetryAfterFailure(); });

        this._monitorJobControl.startMonitoring();
    }

    private _onRenderComplete() {
        this._projectUpdated = true;
    }

    private _onRetryAfterFailure() {
        this.renderMainPage();
    }

    public handleSuccess(jobId: any) {
        // Everything was successful, let's replace the buttons with the close button
        setDialogButtons(this._element, [this._closeButton]);

        // Set up the blank progress page
        this.renderProgressPage(jobId);
    }

    public handleError(error: any) {
        this._updatedValidationError.setError($("<span />").html(error.message));
    }

    public handleWait = {
        wait: {
            image: hostConfig.getResourcesFile('big-progress.gif'),
            message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
            target: this._element
        }
    }

    public createMonitorControl(jobId: any) {
        this._monitorJobControl = <TFS_Admin_Common.MonitorOperationControl>Controls.Enhancement.enhance(TFS_Admin_Common.MonitorOperationControl, this._updateProjectProgress, {
            jobId: jobId,
            notStartedText: this._notStartedText,
            inProgressText: this._inProgressText,
            completeText: this._completeText,
            failureText: this._failureText,
            retryActionText: this._retryActionText
        });
    }
}

export class DeleteProjectDialog extends ProjectDialogBase<ProjectDialogBaseOptions> {

    private _projectName: string;
    private _projectId: string;
    private _httpClient: TFS_Core_RestClient.CoreHttpClient;

    public initializeOptions(options?: any) {
        super.initializeOptions(options, 'DeleteProjectDialog.OpenDialog', adminResources.DeleteProjectDialogTitle, 300, 500);
    }

    public _onDialogClose() {
        if (this._projectUpdated && $.isFunction(this._options.successCallback)) {
            this._options.successCallback.call(this);
        }
    }

    public initialize() {
        this._projectName = this._options.projectName;
        this._projectId = this._options.projectId;
        this._urlText = adminResources.DeleteProjectUrlText;
        this._infoText = Utils_String.format(adminResources.DeleteProjectInfo, this._projectName);
        this._confirmationText = adminResources.DeleteProjectConfirmationText, this._projectName
        this._gettingStartedHeaderText = Utils_String.format(adminResources.DeleteProjectInformationHeader, this._projectName);
        this._completeText = Utils_String.format(adminResources.ProjectDeleteSuccess, this._projectName);
        this._notStartedText = adminResources.DeleteProjectNotStarted;
        this._inProgressText = adminResources.ProjectDeleting;
        this._failureText = adminResources.GettingStartedErrorDeletingProject;
        this._retryActionText = adminResources.GettingStartedRetryTeamProjectDeletionLink;

        this._httpClient = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getHttpClient<TFS_Core_RestClient.CoreHttpClient>(TFS_Core_RestClient.CoreHttpClient);

        super.initialize(adminResources.DeleteProject);
    }

    protected _createConfirmationArea($infoContainer: JQuery) {
        this._createTextConfirmationArea($infoContainer, this._confirmationText, this._options.projectName);
    }

    protected _createInfoArea($infoContainer: JQuery) {
        var $dialogText = $("<div>").addClass("update-project-text").html(this._infoText);

        $infoContainer.append($dialogText);
    }

    public onOkClick() {
        this.updateOkButton(false);

        this._httpClient.queueDeleteProject(this._projectId).then(
            (data) => {
                this.handleSuccess(data.id);
            },
            (e: Error) => {
                this.handleError(e);
            });
    }

}

VSS.classExtend(DeleteProjectDialog, TfsContext.ControlExtensions);

export interface DestroyWorkItemTypeOptions extends AdminDialogOptions {
    workItemTypeName: string;
    onOkCallback: () => void;
}

export class DestroyWorkItemConfirmationDialog extends ConfirmDestroyDialogBase<DestroyWorkItemTypeOptions> {
    public onOkClick() {
        this.updateOkButton(false);
        if (this._options.onOkCallback) {
            this._options.onOkCallback();
        }
        this.close();
    }

    public initialize() {
        super.initialize(adminResources.DestroyWitConfirmDialogOkText);
    }

    protected _createConfirmationArea($infoContainer: JQuery) {
        this._createTextConfirmationArea($infoContainer, adminResources.DestroyWitConfirmDialogConfirmation, this._options.workItemTypeName);
    }

    protected _createInfoArea($infoContainer: JQuery) {
        var info: string = Utils_String.format(adminResources.DestroyWitConfirmDialogInfo, this._options.workItemTypeName);
        var $dialogText = $("<div>").addClass("destroy-wit-text").html(info);

        $infoContainer.append($dialogText);
    }

    public _onDialogClose() {
    }

    public initializeOptions(options?: any) {
        super.initializeOptions(options, 'DestroyWorkItemConfirmationDialog.OpenDialog', adminResources.DestroyWitConfirmDialogTitle, 300, 500);
    }
}
VSS.classExtend(DestroyWorkItemConfirmationDialog, TfsContext.ControlExtensions);

export interface ChangeVisibilityConfirmationDialogOptions extends AdminDialogOptions {
    showOrgVisibilityOption: boolean;
    showPublicVisibilityOption: boolean;
    isPublicVisibilityOptionEnabled: boolean;
    isOrgVisibilityOptionEnabled: boolean;
    currentVisibility?: string;
    onChangeClick?(updatedVisibilityOption: string, successCallback: () => void, onError: (message: string) => void): void;
}

export class ChangeVisibilityConfirmationDialog extends Dialogs.ModalDialogO<ChangeVisibilityConfirmationDialogOptions> {
    private _container: JQuery;
    private _okButton: IDialogButtonSetup;
    private _cancelButton: IDialogButtonSetup;
    private _updatedValidationError: Notifications.MessageAreaControl;
    private _updateVisibilityInProgress: boolean;
    private _okButtonId: string = "ok";
    private _cancelButtonId: string = "cancel";

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            modal: true,
            minWidth: 685,
            open: function () {
                Diag.logTracePoint('ChangeVisibilityConfirmationDialog.OpenDialog');
            },
            title: Utils_String.htmlEncode(adminResources.ChangeProjectVisibilityDialog_Title)
        }, options));
    }

    public initialize(): void {
        this._okButton = {
            id: this._okButtonId,
            text: adminResources.Change,
            click: this._onOkClick,
        };

        this._cancelButton = {
            id: this._cancelButtonId,
            text: adminResources.Cancel,
            click: this._closeDialog,
        };

        this._options.buttons = [this._okButton, this._cancelButton];
        this._updatedValidationError = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._element, {
            closeable: false,
            showIcon: true,
            type: Notifications.MessageAreaType.Error,
        });
        this._container = $("<div>").addClass('confirm-dialog-container').appendTo(this._element);

        super.initialize();

        this._renderContent();
    }

    private _onOkClick = (e?: JQueryEventObject): void => {
        this.updateOkButton(false);
        this._updateCancelButton(false);
        this._clearError();
        this._updateVisibilityInProgress = true;
        this._options.onChangeClick(this._options.currentVisibility, this._closeDialog, this._handleError);
    }

    private _closeDialog = (e?: JQueryEventObject): void => {
        if (this._updatedValidationError) {
            this._updatedValidationError.dispose();
            this._updatedValidationError = null;
        }

        this._updateVisibilityInProgress = false;
        ReactDOM.unmountComponentAtNode(this._container.get(0));
        this.close();
    }

    private _renderContent(): void {
        this._container.empty();
        const props: ChangeVisibilityDialogContentProps = {
            initialVisibility: this._options.currentVisibility,
            onOptionChange: this._updateVisibility,
            showOrgVisibilityOption: this._options.showOrgVisibilityOption,
            showPublicVisibilityOption: this._options.showPublicVisibilityOption,
            setChangeButtonEnabled: this._updateOkButton,
            isPublicVisibilityOptionEnabled: this._options.isPublicVisibilityOptionEnabled,
            isOrgVisibilityOptionEnabled: this._options.isOrgVisibilityOptionEnabled,
        };

        // set dialog buttons
        setDialogButtons(this._element, [this._okButton, this._cancelButton]);
        this.updateOkButton(false);

        // loading dialog content react component
        createChangeVisibilityDialogContentIn(this._container.get(0), props);

        // adding status indicator container
        this._container = $("<div>").addClass('status-indicator-container')
            .css({ position: "fixed", padding: "30px 0px 0px 400px" }).appendTo(this._element);

        // set initial focus to checked option
        this._options.initialFocusSelector = "input:checked";
        this.setInitialFocus();
    }

    private _handleError = (message: string): void => {
        if (this._updatedValidationError) {
            this._updatedValidationError.setError(message);
        }

        this._updateVisibilityInProgress = false;
        this._updateCancelButton(true);
    }

    private _clearError = (): void => {
        if (this._updatedValidationError) {
            this._updatedValidationError.clear();
        }
    }

    private _updateVisibility = (updatedVisibility: string): void => {
        if (!this._updateVisibilityInProgress) {
            this._options.currentVisibility = updatedVisibility;
            this._clearError();
        }
    }

    private _updateCancelButton = (enabled: boolean): void => {
        if (!this._updateVisibilityInProgress) {
            this.getElement().trigger(
                Dialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE,
                { button: this._cancelButtonId, enabled: enabled === true }
            );
        }
    }

    private _updateOkButton = (enabled: boolean): void => {
        if (!this._updateVisibilityInProgress) {
            this.updateOkButton(enabled);
        }
    }
}

export interface RenameProjectConfirmationDialogOptions extends ProjectDialogBaseOptions {
    newProjectName?: string;
    oldProjectName?: string;
    updateDescription?: string;
    description?: string;
}

export class RenameProjectConfirmationDialog extends ProjectDialogBase<RenameProjectConfirmationDialogOptions> {
    private _newProjectName: string;
    private _oldProjectName: string;
    private _httpClient: TFS_Project_WebApi.ProjectHttpClient;

    public static INFORMATION_LINK = "https://go.microsoft.com/fwlink/p?LinkId=528893";
    public static LOCAL_WORKSPACKES_LINK = "https://msdn.microsoft.com/en-us/library/bb892960.aspx#local";

    public initializeOptions(options?: any) {
        super.initializeOptions(options, 'RenameProjectConfirmationDialog.OpenDialog', adminResources.RenameProject, 490, 600);
    }

    public _onDialogClose() {
        if (this._projectUpdated && $.isFunction(this._options.successCallback)) {
            this._options.successCallback.call(this);
        }
        else if (!this._projectUpdated && $.isFunction(this._options.cancelCallback)) {
            this._options.cancelCallback.call(this);
        }
    }

    protected _createConfirmationArea($infoContainer: JQuery) {
        this._createCheckboxConfirmationArea($infoContainer, this._confirmationText);
    }


    public initialize() {
        this._informationLink = RenameProjectConfirmationDialog.INFORMATION_LINK;
        this._newProjectName = $.trim(this._options.newProjectName);
        this._oldProjectName = this._options.oldProjectName;
        this._urlText = adminResources.RenameProjectUrlText;
        this._infoText = Utils_String.format(adminResources.RenameProjectInfo, this._oldProjectName, this._newProjectName);
        this._infoText2 = adminResources.RenameProjectInfo3;
        this._confirmationText = Utils_String.format(adminResources.RenameProjectConfirmationText, this._oldProjectName, this._newProjectName)
        this._gettingStartedHeaderText = Utils_String.format(adminResources.RenameProjectInformationHeader, this._oldProjectName, this._newProjectName);
        this._completeText = Utils_String.format(adminResources.ProjectRenameSuccess, this._oldProjectName, this._newProjectName);
        this._notStartedText = adminResources.RenameProjectNotStarted;
        this._inProgressText = adminResources.ProjectRenaming;
        this._failureText = adminResources.GettingStartedErrorRenamingProject;
        this._retryActionText = adminResources.GettingStartedRetryTeamProjectRenameLink;

        this._httpClient = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getHttpClient<TFS_Project_WebApi.ProjectHttpClient>(TFS_Project_WebApi.ProjectHttpClient);

        super.initialize(adminResources.RenameProject);
    }

    public onOkClick() {
        var project = <TFS_Core_Contracts.WebApiProject>{
            name: this._newProjectName
        };
        if (this._options.updateDescription) {
            project.description = this._options.description;
        }
        this._httpClient.beginUpdateProject(this._options.projectId, project).then(
            (data) => {
                this.handleSuccess(data.id);
            },
            (e: Error) => {
                this.handleError(e);
            });
    }

    /**
     * @param e
     * @return
     */
    public onCancelClick(e?: JQueryEventObject): any {

        if (!this._projectUpdated && $.isFunction(this._options.cancelCallback)) {
            this._options.cancelCallback();
        }
        this.close();
    }

    public createMonitorControl(jobId: any) {
        this._monitorJobControl = <TFS_Admin_Common.MonitorOperationControl>Controls.Enhancement.enhance(TFS_Admin_Common.MonitorOperationControl, this._updateProjectProgress, {
            jobId: jobId,
            notStartedText: this._notStartedText,
            inProgressText: this._inProgressText,
            completeText: this._completeText,
            failureText: this._failureText,
            retryActionText: this._retryActionText
        });
    }

    protected _createInfoArea($infoContainer: JQuery) {
        var moreDetailsLink = Utils_String.format("<a href='{0}' target='_blank'>{1}</a>", this._informationLink, this._urlText);
        var localWorkspacesLink = Utils_String.format("<a href='{0}' target='_blank'>{1}</a>", RenameProjectConfirmationDialog.LOCAL_WORKSPACKES_LINK, adminResources.RenameProjectLocalWorkspacesLinkText);
        var $dialogText = $("<div>").addClass("update-project-text").text(this._infoText);

        var ul = $("<ul>");
        ul.append($("<li />").text(adminResources.RenameProjectBullet1));
        ul.append($("<li />").text(adminResources.RenameProjectBullet2));
        ul.append($("<li />").text(adminResources.RenameProjectBullet3));
        ul.append($("<li />").text(adminResources.RenameProjectBullet4));

        var $dialogText2;

        $dialogText2 = $("<div>").addClass("update-project-text").html(Utils_String.format(adminResources.RenameProjectInfo2, localWorkspacesLink));

        var $dialogText3 = $("<div>").addClass("update-project-text").html(Utils_String.format(this._infoText2, moreDetailsLink));

        $infoContainer.append($dialogText).append(ul).append($dialogText2).append($dialogText3);
    }

}

VSS.classExtend(RenameProjectConfirmationDialog, TfsContext.ControlExtensions);

export class RenameProjectDialog extends Dialogs.ModalDialogO<ProjectDialogBaseOptions> {

    private _$projectNameInput: JQuery;
    private _renameProjectValidationError: any;


    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            width: 400,
            minWidth: 400,
            height: 225,
            minHeight: 225,
            modal: true,
            open: function () {
                Diag.logTracePoint('RenameProjectDialog.OpenDialog');
            },
            title: adminResources.RenameProject
        }, options));
    }

    public initialize() {
        super.initialize();
        var container = $(domElem('div')).addClass('admin-project-rename-dialog').appendTo(this._element);

        this._renameProjectValidationError = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, container, { closeable: false });
        var inputId = "projectName" + Controls.getId();

        $(domElem("label"))
            .attr("for", inputId)
            .text(adminResources.RenameProject)
            .appendTo(container);

        var nameDiv = $(domElem('div')).appendTo(container);

        this._$projectNameInput = $(domElem("input", "project-name"))
            .addClass('requiredInfoLight')
            .addClass('textbox')
            .attr("type", "text")
            .attr("id", inputId)
            .appendTo(nameDiv)
            .bind("input keyup", (e) => {
                if (e.keyCode !== Utils_UI.KeyCode.ENTER) {
                    var isValid = this._validateProjectName();
                    this.updateOkButton(isValid && $.trim(this._$projectNameInput.val()) !== this._options.projectName);
                    if (isValid) {
                        this._clearError();
                    }
                }
            });

        this._$projectNameInput.val(this._options.projectName);
        this._$projectNameInput.select();
    }

    public _validateProjectName(): boolean {
        var projectName = $.trim(this._$projectNameInput.val());
        var isValid = ProjectNameValidator.validate(projectName);

        if (isValid) {
            this._clearError();
        }
        else if (projectName.length > 0) {
            this._setError(Utils_String.format(adminResources.CreateProjectProjectNameInvalid, projectName));
        }
        return isValid;
    }

    public onOkClick(): any {
        //No need to validate permissions as the user won't be able to get to this dialog without perms
        //No need to validate project name as it is being done on key up
        //Just need to check to see if project name exists

        var projectName = $.trim(this._$projectNameInput.val());
        var projHttpClient: TFS_Project_WebApi.ProjectHttpClient = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getHttpClient<TFS_Project_WebApi.ProjectHttpClient>(TFS_Project_WebApi.ProjectHttpClient);
        projHttpClient.beginGetProject(projectName).then(
            (project: TFS_Core_Contracts.WebApiProject) => {
                //Project names are case-insensitive in the project model but we want to allow updates like 'Project1' -> 'PROJECT1'
                if (this._options.projectId !== project.id) {
                    this._setError(Utils_String.format(adminResources.RenameProjectNameExists, projectName));
                }
                else {
                    this._showConfirmationDialog();
                }
            },
            () => {
                this._showConfirmationDialog();
            });
    }

    private _setError(errorMessage: string) {
        this._renameProjectValidationError.setError($("<span />").html(errorMessage));
    }

    private _clearError() {
        this._renameProjectValidationError.clear();
    }

    private _showConfirmationDialog() {
        Dialogs.show(RenameProjectConfirmationDialog, {
            tfsContext: this._options.tfsContext,
            newProjectName: this._$projectNameInput.val(),
            oldProjectName: this._options.projectName,
            projectId: this._options.projectId,
            successCallback: () => { this._onRenameConfirmed(); },
            cancelCallback: () => { this._onRenameCanceled(); },
        });
    }

    private _onRenameConfirmed() {
        this.processResult(true);
    }

    private _onRenameCanceled() {
        //if the confirmation dialog was canceled, we should go ahead and close out this dialog
        this.close();
    }
}
VSS.classExtend(RenameProjectDialog, TfsContext.ControlExtensions);

export interface CreateProjectDialogOptions extends AdminDialogOptions {
    collectionId?: string;
    source?: string;
    projectVisibility?: string;
    versionControlSystem?: string;
}

export class CreateProjectDialog extends Dialogs.ModalDialogO<CreateProjectDialogOptions> {

    private _selectedProcessTemplate: any;
    private _okButton: any;
    private _navigateButton: any;
    private _projectCreated: boolean;
    private _collectionHost: any;
    private _monitorJobControl: any;
    private _projectNameInput: any;
    private _createProjectProgress: any;
    private _createProjectValidationError: any;
    private _createProjectInformationMessage: any;
    private _processTemplatesElem: any;
    private _processTemplateDescription: any;
    private _processTemplates: any;
    private _processTemplatesCombo: any;
    private _isReportingConfigured: boolean;

    private _$collectionNameLabel: JQuery;
    private _$collectionNameInput: JQuery;
    private _$versionControlSystemsElem: JQuery;
    private _$versionControlSystemsDescription: JQuery;
    private _versionControlSystems: DropDownOption[];
    private _versionControlSystemsCombo: Combos.Combo;
    private _selectedVersionControlSystem: DropDownOption;

    private _$projectVisibilityElem: JQuery;
    private _$projectVisibilityDescription: JQuery;
    private _projectVisibilityOptions: DropDownOption[];
    private _projectVisibilityCombo: Combos.Combo;
    private _selectedProjectVisibilityOption: DropDownOption;
    private _showProjectVisibilitySelector: boolean;
    private _processTypeId: string;

    public projectUrl: any;
    public _cancelButton: any;
    public _closeButton: any;


    constructor(options?) {
        super(options);

        this._versionControlSystems = [{
            id: "Git",
            name: presentationResources.SourceControlSystemNameGit,
            description: presentationResources.SourceControlSystemDescriptionGit,
            isDefault: true
        }, {
            id: "TfVc",
            name: presentationResources.SourceControlSystemNameTFVC,
            description: presentationResources.SourceControlSystemDescriptionTFVC,
            isDefault: false
        }];

        if (options.templateTypeId) {
            this._processTypeId = options.templateTypeId;
        }

        this._projectVisibilityOptions = new Array<DropDownOption>({
            id: TFS_Server_WebAccess_Constants.ProjectVisibilityConstants.EveryoneInTenant,
            name: presentationResources.ProjectVisibilityNameEveryoneInMicrosoftTenant,
            description: presentationResources.ProjectVisibilityDescriptionEveryoneInTenant,
            isDefault: true
        },
            {
                id: TFS_Server_WebAccess_Constants.ProjectVisibilityConstants.TeamMembers,
                name: presentationResources.ProjectVisibilityNameTeamMembers,
                description: presentationResources.ProjectVisibilityDescriptionTeamMembers,
                isDefault: false
            });
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            width: 550,
            resizable: false,
            modal: true,
            open: function () {
                Diag.logTracePoint('CreateProjectDialog.OpenDialog');
            },
            close: () => { this._onDialogClose(); },
            title: adminResources.CreateProjectDialogTitle,
            cssClass: "create-project-dialog"
        }, options));
    }

    public initialize() {
        this._okButton = {
            id: "ok",
            text: presentationResources.CreateProject,
            click: () => { this.onOkClick(); },
            class: "cta",
            disabled: "disabled"
        };
        this._navigateButton = {
            id: "navigate",
            text: adminResources.NavigateToProject,
            click: () => { this.onNavigateClick(); },
            class: "cta",
            disabled: "disabled"
        };
        this._cancelButton = {
            id: "cancel",
            text: adminResources.Cancel,
            click: () => { this.onCancelClick(); }
        };
        this._closeButton = {
            id: "close",
            text: adminResources.Close,
            click: () => { this.onCancelClick(); }
        };

        this._options.buttons = [this._okButton, this._cancelButton];

        super.initialize();

        var actionUrl = tfsContext.getActionUrl('ProjectCreateOptions', 'project', { area: 'api', project: null });
        TFS_Core_Ajax.getMSJSON(
            actionUrl,
            null,
            (data) => {
                this._isReportingConfigured = data.IsReportingConfigured;
                this._showProjectVisibilitySelector = data.ShowNewProjectVisibilityDropDown;
                this._renderPageAndFocus();
            },
            (error) => {
                // If the call to get project fails, render the dialog with out the project visibility selector.
                this._renderPageAndFocus();
            });
    }

    public validate() {
        var projectName = this._projectNameInput.val();
        var isValid = ProjectNameValidator.validate(projectName);

        if (isValid) {
            this._createProjectValidationError.clear();
        }
        else if (projectName.length > 0) {
            this._createProjectValidationError.setError({
                header: Utils_String.format(adminResources.CreateProjectProjectNameInvalid, projectName),
                content: $(domElem("div")).html(presentationResources.CreateProjectProjectNameInvalidDescription)
            });
        }

        isValid = isValid && this._selectedProcessTemplate !== null && this._selectedVersionControlSystem !== null;

        this.updateOkButton(isValid);
        return isValid;
    }

    public renderMainPage() {

        const teamProjectDialogTemplate = `
            <div class="bowtie">
                <div id="createProjectDialogMessageArea" class="newproject-message-area"></div>
                <fieldset class="first">
                    <label for="projectNameInput">${presentationResources.CreateProjectNameLabel}</label>
                    <input type="text" id="projectNameInput" />

                    <label for="projectDescriptionInput">${presentationResources.CreateProjectDescriptionLabel}</label>
                    <textarea id="projectDescriptionInput"></textarea>

                    <label for="processTemplateInput">${presentationResources.CreateProjectProcessTemplateLabel}</label>
                    <div id="processTemplateCombo"></div>
                    <p id="processTemplateDescription" class="muted"></p>

                    <div id="versionControlContainer">
                        <label for="versionControlInput">${presentationResources.SourceControlSystemLabel}</label>
                        <div id="versionControlCombo"></div>
                        <p id="versionControlDescription" class="muted"></p>
                    </div>

                    <div id="sharedWithContainer" class="hide">
                        <label for="sharedWithInput">${presentationResources.ProjectVisibilityLabel}</label>
                        <div id="sharedWithCombo"></div>
                        <p id="sharedWithDescription" class="muted"></p>
                    </div>
                </fieldset>
            </div>
        `;

        const $dialogContents = $(teamProjectDialogTemplate);
        const $messageArea = $dialogContents.find("#createProjectDialogMessageArea");
        this._projectNameInput = $dialogContents.find("#projectNameInput");
        this._processTemplatesElem = $dialogContents.find("#processTemplateCombo");
        this._$versionControlSystemsElem = $dialogContents.find("#versionControlCombo");
        this._processTemplateDescription = $dialogContents.find("#processTemplateDescription");
        this._$versionControlSystemsDescription = $dialogContents.find("#versionControlDescription");
        const $projectVisibilityContainer = $dialogContents.find("#sharedWithContainer");
        this._$projectVisibilityElem = $dialogContents.find("#sharedWithCombo");
        this._$projectVisibilityDescription = $dialogContents.find("#sharedWithDescription");

        // In on-prem, display name of collection that will contain the new project.
        if (!this._options.tfsContext.isHosted) {
            const $collectionNameInput =
                $('<input type="text" id="collectionNameInput" disabled="disabled"></input>')
                    .attr("value", this._options.tfsContext.navigation.collection.name);
            const $collectionNameLabel =
                $('<label id="collectionNameLabel" for="collectionNameInput"></label>')
                    .text(presentationResources.CreateProjectCollectionLabel);
            $dialogContents.find("fieldset.first").prepend($collectionNameInput).prepend($collectionNameLabel);

            // Display a warning message if reporting is configured on directions to manually provision reporting. 
            if (this._isReportingConfigured) {
                this._createProjectInformationMessage = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(
                    Notifications.MessageAreaControl,
                    $messageArea,
                    {
                        showIcon: true,
                        closeable: false
                    });
                const reportMessage = $("<span />")
                    .append($("<span />").text(adminResources.WarningReportsNotCreatedPart1))
                    .append($("<a />")
                        .attr(
                        {
                            href: adminResources.WarningReportingNotCreatedFindoutFWLinkUrl,
                            target: "_blank",
                            rel: "noopener noreferrer"
                        })
                        .text(adminResources.WarningReportingNotCreatedFindoutLinkLabel))
                    .append($("<span />").text(adminResources.WarningReportsNotCreatedPart2));
                this._createProjectInformationMessage.setMessage(reportMessage, Notifications.MessageAreaType.Info);
            }
        }

        this._createProjectValidationError = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $messageArea, { closeable: false });

        // Retrieve the available process templates
        this._populateProcessTemplates();

        // Draw the VC system combo
        this._populateVersionControlSystems();

        if (this._showProjectVisibilitySelector) {
            $projectVisibilityContainer.show();
            // Draw the project visibility combo
            this._populateProjectVisibility();
        }

        // Sign up for key changes on the project name field
        // This needs to be keyup instead of keydown so the input field has the new value at validation time.
        // Otherwise, you will be validating the previous input (off-by-one).
        this._projectNameInput.keyup((e) => {
            if (e.keyCode !== Utils_UI.KeyCode.ENTER) {
                this.validate();
            }
        });

        this._element.empty();
        $dialogContents.appendTo(this._element);

        this._options.buttons = {
            "ok": this._okButton,
            "cancel": this._cancelButton
        };
        setDialogButtons(this._element, this._options.buttons);

        return false;
    }

    public renderProgressPage(jobId) {
        var container, propertiesSection, table, tr, td, projectName = this._projectNameInput.val();

        container = $(domElem('div')).addClass('create-project-page');
        propertiesSection = $(domElem('div')).addClass('properties-section').appendTo(container);

        table = $(domElem('table')).addClass('properties-list').appendTo(propertiesSection);
        tr = $(domElem('tr')).appendTo(table);
        td = $(domElem('td')).appendTo(tr);
        $(domElem('span')).text(presentationResources.CreateProjectNameLabel).appendTo(td);
        td = $(domElem('td')).appendTo(tr);
        $(domElem('span')).text(projectName).appendTo(td);
        tr = $(domElem('tr')).appendTo(table);
        td = $(domElem('td')).appendTo(tr);
        $(domElem('span')).text(presentationResources.CreateProjectProcessTemplateLabel).appendTo(td);
        td = $(domElem('td')).appendTo(tr);
        $(domElem('span')).text(this._selectedProcessTemplate.Name).appendTo(td);

        this._createProjectProgress = $(domElem('div')).addClass('create-project-progress').appendTo(container);
        this._monitorJobControl = <TFS_Admin_Common.MonitorJobControl>Controls.Enhancement.enhance(TFS_Admin_Common.MonitorJobControl, this._createProjectProgress, {
            jobId: jobId,
            notStartedText: adminResources.CreateProjectNotStarted,
            inProgressText: adminResources.CreateProjectCreatingProject,
            completeText: adminResources.CreateProjectProjectCreated,
            failureText: VSS_Resources_Common.GettingStartedErrorCreatingProject,
            retryActionText: VSS_Resources_Common.GettingStartedRetryTeamProjectCreationLink
        });

        this._monitorJobControl._element.bind('render-complete', () => { this._onRenderComplete(); });
        this._monitorJobControl._element.bind('retry-after-failure', () => { this._onRetryAfterFailure(); });

        this._element.html(container);

        this._monitorJobControl.startMonitoring();
    }

    public onNavigateClick() {
        window.location.href = this.projectUrl;
    }

    public onOkClick() {
        var projectName = $.trim(this._projectNameInput.val()),
            processTemplateTypeId = this._selectedProcessTemplate.TypeId,
            that = this, projectDescription = $('#projectDescriptionInput', this._element).val(),
            projectData: any = {};

        if (this.validate()) {
            this.updateOkButton(false);

            projectData.VersionControlOption = this._selectedVersionControlSystem.id;
            projectData.ProjectVisibilityOption = this._selectedProjectVisibilityOption ? this._selectedProjectVisibilityOption.id : null;

            TFS_Core_Ajax.postMSJSON(
                this._options.tfsContext.getActionUrl('CreateProject', 'project', { area: 'api', project: null }),
                {
                    projectName: projectName,
                    projectDescription: projectDescription,
                    processTemplateTypeId: processTemplateTypeId,
                    collectionId: this._options.collectionId,
                    source: this._options.source || "AdminPage",
                    projectData: Utils_Core.stringifyMSJSON(projectData)
                },
                function (data) {
                    // Everything was successful, let's replace the buttons with the close button
                    that._element.dialog('option', 'buttons', [that._navigateButton, that._closeButton]);

                    // Generate project url
                    that._collectionHost = data.CollectionHost;
                    var routeData = { area: null, serviceHost: data.CollectionHost, project: projectName, team: null };
                    var controller = "home";
                    that.projectUrl = that._options.tfsContext.getActionUrl('index', controller, routeData);

                    // Set up the blank progress page
                    that.renderProgressPage(data.JobId);
                },
                function (error) {
                    // Construct prompt that directs user to Account/Collection Overview page
                    const adminPageUrl = that._options.tfsContext.getActionUrl(null, null, { area: 'admin' });
                    const adminPageTitle = (that._options.tfsContext.isHosted === true) ? adminResources.AccountOverviewPage : adminResources.CollectionOverviewPage;
                    const adminPageHtml = Utils_String.format('<a href="{0}">{1}</a>', adminPageUrl, adminPageTitle);
                    const adminPagePrompt = Utils_String.format(adminResources.MessageToAdminPage, adminPageHtml);

                    // Display error message and direct to admin (Account/Collection Overview) page
                    that._createProjectValidationError.setError($("<span />").html(error.message + ' ' + adminPagePrompt));
                    that.updateOkButton(false);
                },
                {
                    wait: {
                        image: hostConfig.getResourcesFile('big-progress.gif'),
                        message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                        target: this._element
                    }
                }
            );
        }
    }

    private _onDialogClose() {
        if (this._monitorJobControl) {
            this._monitorJobControl.stopMonitoring();
        }
        if (this._projectCreated && $.isFunction(this._options.successCallback)) {
            this._options.successCallback.call(this);
        }
    }

    private _onRenderComplete() {
        this._projectCreated = true;

        if (!this.isDisposed()) {
            this._navigateButton.disabled = null;
            setDialogButtons(this._element, [this._navigateButton, this._closeButton]);
        }
    }

    private _onRetryAfterFailure() {
        this.renderMainPage();
    }

    private _processTemplateChanged(index) {
        var inputText: string = this._processTemplatesCombo.getInputText();
        var inputTexts: string[] = inputText.split("\\");
        // Name is enforced to be unique by backend
        var processName: string = inputTexts[inputTexts.length - 1];
        // Scan for templates for name match to get selected template
        for (var i = 0; i < this._processTemplates.length; i++) {
            if (this._processTemplates[i].Name === processName) {
                this._selectedProcessTemplate = this._processTemplates[i];
                break;
            }
        }
        this._processTemplateDescription.text(this._selectedProcessTemplate.Description);
        this.validate();
    }

    public static _buildProcessTemplateTree(processTemplates: CreateProjectDialog.ProcessDescriptor[]): CreateProjectDialog.ParentProcessItem[] {
        var processTemplateValues: CreateProjectDialog.ParentProcessItem[] = [];
        /** For parent lookup */
        var itemMap: { [guid: string]: CreateProjectDialog.ParentProcessItem } = {};
        var i: number;
        //Build processTemplateValues (add parents)
        for (i = 0; i < processTemplates.length; i++) {
            var template = processTemplates[i];
            if (template.Inherits === Utils_String.EmptyGuidString || !template.Inherits) { // if root
                var item: CreateProjectDialog.ParentProcessItem = { text: template.Name };
                processTemplateValues.push(item)
                itemMap[template.TypeId] = item;
            }
        }
        var parentsCount: number = processTemplates.length;

        //Finish processTemplateValues (add children)
        for (i = 0; i < parentsCount; i++) {
            var template = processTemplates[i];
            if (template.Inherits !== Utils_String.EmptyGuidString && template.Inherits) { // if not a root
                item = itemMap[template.Inherits];

                // if it's not possible to find parent, that means that parrent process is not enabled to create projects
                // Parent template shold not be displayed in the tree at all, and current template shoud be displayed as root-level element
                if (!item) {
                    var parentItem: CreateProjectDialog.ParentProcessItem = { text: template.Name };
                    processTemplateValues.push(parentItem);
                }
                else {
                    var children: CreateProjectDialog.ChildProcessItem[] = item.children;
                    if (children == null) {
                        item.children = children = [];
                    }
                    children.push({ text: template.Name });
                }
            }
        }
        return processTemplateValues;
    }

    /**
     * Find index of processTypeId in processTemplateTree
     * @param processTypeId to find the index of
     * @param processTemplates flat array of process, contains isDefault and TypeId field on each
     * @param processTemplateTree datastructure the index corresponds to
     */
    public static _getIndexOfProcess(processTypeId: string, processTemplates: CreateProjectDialog.ProcessDescriptor[],
        processTemplateTree: CreateProjectDialog.ParentProcessItem[]): number {
        // Setup map name -> typeId for index search
        var nameMap: { [name: string]: /*guid*/ string } = {};
        var i: number;
        for (i = 0; i < processTemplates.length; i++) {
            nameMap[processTemplates[i].Name] = processTemplates[i].TypeId;
        }
        // Use default process if not specified
        if (!processTypeId) {
            for (i = 0; i < processTemplates.length; i++) {
                if (processTemplates[i].IsDefault) {
                    processTypeId = processTemplates[i].TypeId;
                    break;
                }
            }
        }
        // Find the index
        var defaultIndex: number = 0;
        if (processTypeId) {
            search: for (i = 0; i < processTemplateTree.length; i++) {
                if (nameMap[processTemplateTree[i].text] === processTypeId) {
                    break search;
                }
                defaultIndex++;
                if (processTemplateTree[i].children) {
                    for (var j = 0; j < processTemplateTree[i].children.length; j++) {
                        if (nameMap[processTemplateTree[i].children[j].text] === processTypeId) {
                            break search;
                        }
                        defaultIndex++;
                    }
                }
            }
        }
        return defaultIndex;
    }

    private _populateProcessTemplates() {
        var that = this, i;
        var processTemplateValues = [];
        var itemMap = [];

        if (this._processTemplates) {
            if (this._processTemplates.length < 1) {
                this._createProjectValidationError.setError(presentationResources.CreateProjectNoTemplates);
                this.updateOkButton(false);
            }
            else {
                var processTemplateTree: CreateProjectDialog.ParentProcessItem[];
                processTemplateTree = CreateProjectDialog._buildProcessTemplateTree(this._processTemplates);

                var defaultIndex = CreateProjectDialog._getIndexOfProcess(this._processTypeId, this._processTemplates, processTemplateTree);


                //Show as child-parent process relations in tree format
                this._processTemplatesCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this._processTemplatesElem, {
                    type: Controls_TreeView.ComboTreeBehaviorName,
                    source: processTemplateTree,
                    allowEdit: false,
                    sepChar: '\\',
                    indexChanged: function (index) {
                        that._processTemplateChanged(index);
                    },
                    id: 'combolist-box',
                    dropOptions: {
                        id: 'drop-menu'
                    },
                    //TODO use options not js to set width
                    dropShow: function (drop: Combos.ComboListBehavior) {
                        $('#drop-menu', this._processTemplatesElem).width($('#combolist-box', this._processTemplatesElem).width())
                            //Now that the dimensions change it needs to be moved right
                            .offset({
                                left: $('#combolist-box', this._processTemplatesElem).offset().left,
                                top: $('#drop-menu', this._processTemplatesElem).offset().top
                            });
                    }
                });

                this._processTemplatesCombo.setSelectedIndex(defaultIndex);
                this._processTemplateChanged(defaultIndex);
                this.centerDialog();
            }
        }
        else {
            this._getProcessTemplates();
        }
    }

    private _getProcessTemplates() {
        var that = this;

        TFS_Core_Ajax.getMSJSON(
            this._options.tfsContext.getActionUrl('ProcessTemplates', 'project', { area: 'api', project: null }),
            null,
            function (data) {
                // Make sure the dialog has not been disposed
                if (!that._disposed) {
                    that._processTemplates = data.Templates;
                    that._populateProcessTemplates();
                }
            },
            function (error) {
                that._createProjectValidationError.setError({
                    header: presentationResources.GetProcessTemplatesError,
                    content: error.message,
                    closeable: false
                });
            }
        );
    }

    private _populateProjectVisibility() {
        var projectVisibilityNames: string[] = [],
            defaultVisibilityIndex = -1,
            $cell: JQuery;

        $.each(this._projectVisibilityOptions, (i, projectVisibility) => {
            projectVisibilityNames.push(projectVisibility.name);
            if ((this._options.projectVisibility && this._options.projectVisibility === projectVisibility.id) ||
                (defaultVisibilityIndex === -1 && projectVisibility.isDefault)) {
                defaultVisibilityIndex = i;
            }
        });

        this._selectedProjectVisibilityOption = this._projectVisibilityOptions[defaultVisibilityIndex];

        this._projectVisibilityCombo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, this._$projectVisibilityElem, {
            source: projectVisibilityNames,
            allowEdit: false,
            indexChanged: (index) => {
                this._projectVisibilityChanged(index);
            }
        });

        if (defaultVisibilityIndex >= 0) {
            this._projectVisibilityCombo.setSelectedIndex(defaultVisibilityIndex, false);
            this._projectVisibilityChanged(defaultVisibilityIndex);
        }
    }

    private _projectVisibilityChanged(index: number) {
        this._selectedProjectVisibilityOption = this._projectVisibilityOptions[index];
        this._$projectVisibilityDescription.text(this._selectedProjectVisibilityOption.description);
        this.validate();
    }

    private _populateVersionControlSystems() {
        var vcSystemNames: string[] = [],
            defaultSystemIndex = -1;

        $.each(this._versionControlSystems, (i, vcSystem) => {
            vcSystemNames.push(vcSystem.name);
            if ((this._options.versionControlSystem && this._options.versionControlSystem === vcSystem.id) ||
                (defaultSystemIndex === -1 && vcSystem.isDefault)) {
                defaultSystemIndex = i;
            }
        });

        this._selectedVersionControlSystem = this._versionControlSystems[defaultSystemIndex];

            var defaultIndex: number = 0,
                $cell: JQuery;

            this._element.addClass("multiple-providers");

            this._versionControlSystemsCombo = Controls.create(Combos.Combo, this._$versionControlSystemsElem, {
                source: vcSystemNames,
                allowEdit: false,
                id: "processTemplateCombo",
                label: "processTemplateCombo",
                indexChanged: (index) => {
                    this._versionControlSystemChanged(index);
                }
            });

            if (defaultSystemIndex >= 0) {
                this._versionControlSystemsCombo.setSelectedIndex(defaultSystemIndex, false);
                this._versionControlSystemChanged(defaultSystemIndex);
            }
    }

    private _versionControlSystemChanged(index: number) {
        this._selectedVersionControlSystem = this._versionControlSystems[index];
        this._$versionControlSystemsDescription.text(this._selectedVersionControlSystem.description);
        this.validate();
    }

    private _renderPageAndFocus() {
        // Render the main page
        this.renderMainPage();

        // Focus on the text box
        this._projectNameInput.focus();
    }
}

export module CreateProjectDialog {
    export interface ParentProcessItem {
        /** Name */
        text: string;
        children?: ChildProcessItem[]
    }
    export interface ChildProcessItem {
        text: string;
    }
    export interface ProcessDescriptor {
        Name: string;
        Description: string;
        IsDefault: boolean;
        Id: number;
        /** Guid */
        TypeId: string;
        /** Guid */
        Inherits: string;
        IsSystemTemplate: string;
    }
}

VSS.initClassPrototype(CreateProjectDialog, {
    _selectedProcessTemplate: null,
    _okButton: null,
    projectUrl: null,
    _cancelButton: null,
    _closeButton: null,
    _navigateButton: null,
    _projectCreated: false,
    _collectionHost: null,
    _monitorJobControl: null,
    _projectNameInput: null,
    _createProjectProgress: null,
    _createProjectValidationError: null,
    _processTemplatesElem: null,
    _processTemplateDescription: null,
    _processTemplates: null,
    _processTemplatesCombo: null,
    _selectedVersionControlSystem: null
});

VSS.classExtend(CreateProjectDialog, TfsContext.ControlExtensions);

export interface ImportProcessTemplateDialogOptions extends AdminDialogOptions {
    hasPermission?: boolean;
}

export class ImportProcessTemplateDialog extends Dialogs.ModalDialogO<ImportProcessTemplateDialogOptions> {

    private _okButton: IDialogButtonSetup;
    private _okCtaButton: IDialogButtonSetup;
    private _importProcessTemplateValidationError: Notifications.MessageAreaControl;
    private _dialogCloseButton: JQuery;
    private _cancelButton: IDialogButtonSetup;
    private _closeButton: IDialogButtonSetup;
    private _closeCtaButton: IDialogButtonSetup;
    private _retryButton: IDialogButtonSetup;
    private _continueButton: IDialogButtonSetup;
    private $closeButton;
    private _currentElement: JQuery;
    private _fileInputControl: VSS_Controls_FileInput.FileInputControl;
    private _flexBoxContainer: JQuery;

    private _templateUploaded: boolean;
    private _currentTemplateName: string;
    private _currentTemplateTypeId: string;
    private _byPassWarnings: boolean;
    private _overrideExistingProcess: boolean;
    private _isXmlCustomizationEnabled: boolean;

    private _monitorJobControl: TFS_Admin_Common.ImportProcessJobMonitorControl;
    private _showJobProgress: boolean;
    private _progressJobId: string;

    private _templateFile: File;
    private _processTemplateClient: ProcessTemplateRestClient.WorkItemTrackingProcessTemplateHttpClient;

    private _textTemplateData: IDictionaryStringTo<any>;
    private _mainPage = '<div class= "import-process-page ms-font-m process-main-page">' +
    '<h1 class= "getting-started-header">${templateHeader}</h1>' +
    '<div class="main-page-info import-process-headersubtext" >${templateDescription}</div>' +
    '<div class="main-page-info import-process-learn">${learnImportLinkDescription}</div>' +
    '<div class="main-page-info import-process-learn-link bowtie">' +
    '<a class="ms-Link dialog-learn-more-link" href="${learnImportLink}" target="_blank" rel="external">' +
    adminResources.LearnMore + '</a></div>' +
    '<div class="file-input-control-container"/>' +
    '</div>';

    private _errorPage = '<div class= "import-process-page ms-font-m process-error-page" >' +
    '<h2 class= "getting-started-header" >${templateHeader}</h2>' +
    '<div class="import-process-warning">' +
    '<table>' +
    '<tr>' +
    '<td class="import-process-warning-img">' +
    '<span class="ui-dialog-warning-icon"></span>' +
    '</td>' +
    '<td> <div class="import-process-warning-info">${warningDescription}</div> </td>' +
    '</tr>' +
    '</table>' +
    '</div>' +
    '<div class="main-page-info error-page-main-description" >${templateDescription}</div>' +
    '<div class="error-page-info">' +
    '<div class= "error-description-info">' +
    '<table class="error-table-list" role="grid">' +
    '<tr class="error-description-row-header" role="row" tabindex="-1" aria-label="' + adminResources.ProcessValidationHeader + '">' +
    '<th class="error-description-header" aria-label="${errorIconHeaderLabel}"></th>' +
    '<th class="error-description-header" tabindex="-1"> ' + adminResources.Message + ' </th>' +
    '<th class="error-description-header" tabindex="-1"> ' + adminResources.FileName + ' </th>' +
    '<th class="error-description-header" tabindex="-1"> ' + adminResources.LineNumber + ' </th>' +
    '<th class="error-description-header" tabindex="-1"> ' + adminResources.HelpLink + ' </th>' +
    '</tr>' +
    '{{each errors}}' +
    '<tr class="error-description-row" role="row" tabindex="-1">' +
    '<td class="error-description"><span class="${$value.Class}" title="${$value.IconTitle}"></span></td>' +
    '<td class="error-description">${$value.Message}</td>' +
    '<td class="error-description">${$value.File}</td>' +
    '<td class="error-description-linenumber">${$value.LineNumber}</td>' +
    '<td class="error-description"> <a href="${$value.FixLink}" target="_blank" tabindex="-1">${$value.FixLink}</a> </td>' +
    '</tr>' +
    '{{/each}}' +
    '</table></div>' +
    '</div>' +
    '<div class="confirm-page-info" >' +
    '<input type="checkbox" class="update-process-checkbox" name= "confirmCheck" id="confirmCheck">' +
    '<label for="confirmCheck" class="confirmation-checkbox-text">{{html confirmMessage}}</label>' +
    '</div>' +
    '<div class="copy-to-clipboard bowtie">' +
    '<button type="button" id="copytoClipboard" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" aria-disabled="false">' +
    '<span class= "ui-button-text" > ' + adminResources.CopyToClipboard + ' </span>' +
    '</button>' +
    '</div>' +
    '</div>';

    private _successPageUpload = '<div class= "import-process-page ms-font-m">' +
    '<h2 class= "getting-started-header">${templateHeader}</h2>' +
    '<div class="import-success-congrats">${templateMessage1}</div>' +
    '<div class="render-page-info">{{html templateMessage2}}</div>';

    private _successPageImport = this._successPageUpload +
    '<div class="next-step-info">${moreinfo}</div>' +
    '<div class="next-step-info"> <a href="${moreinfoLink1}" target="_blank">${moreinfo1}</a>  </div>' +
    '<div class="next-step-info"> <a href="${moreinfoLink2}" target="_blank">${moreinfo2}</a>  </div>' +
    '</div>';

    private _progressPage = '<div>' +
    '<h2 class= "getting-started-header update-process-completed">${templateHeader}</h2>' +
    '<div class="upload-progress-list">' +
    '<div class="upload-progress-section update-progress-description" >${uploadDescription1}</div>' +
    '<div class="upload-progress-section">${uploadDescription2}</div>' +
    '</div>' +
    '<div class="upload-progress-info">  </div>' +
    '</div>';


    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />
        this._isXmlCustomizationEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(TFS_Server_WebAccess_Constants.FeatureAvailabilityFlags.WebAccessProcessUpload);

        super.initializeOptions($.extend({
            width: 560,
            minWidth: 560,
            height: 500,
            minHeight: 500,
            modal: true,
            open: function () {
                Diag.logTracePoint('ImportProcessTemplateDialog.OpenDialog');
            },
            resizable: false,
            close: (e) => { this._onDialogClose(); },
            title: this._isXmlCustomizationEnabled ? adminResources.ImportProcessTemplateTitle : adminResources.UploadProcessTemplateTitle
        }, options));

        // get the template value from options if called when promote is in progress
        if (options.ProgressJobId && options.TemplateName) {
            this._showJobProgress = true;
            this._progressJobId = options.ProgressJobId;
            this._currentTemplateName = options.TemplateName;
        }
    }

    public initialize() {
        this._okButton = {
            id: "ok",
            text: this._isXmlCustomizationEnabled ? adminResources.ImportProcess : adminResources.UploadProcess,
            click: (e) => { this.onOkClick(); },
            disabled: "disabled"
        };
        this._okCtaButton = {
            id: "ok",
            text: this._isXmlCustomizationEnabled ? adminResources.ImportProcess : adminResources.UploadProcess,
            class: "cta",
            click: (e) => { this.onOkClick(); },
            disabled: "disabled"
        };
        this._cancelButton = {
            id: "Cancel",
            text: adminResources.Cancel,
            click: (e) => { this._onRetryAfterFailure(); },
            class: this._isXmlCustomizationEnabled ? "cta" : undefined
        };
        this._retryButton = {
            id: "retry",
            text: adminResources.ExportRetryButtonText,
            class: "cta",
            click: (e) => { this._onRetryAfterFailure(); }
        };
        this._closeButton = {
            id: "closeProcess",
            text: adminResources.Close,
            click: (e) => { this.onCancelClick(); }
        };
        this._closeCtaButton = {
            id: "closeProcess",
            text: adminResources.Close,
            class: "cta",
            click: (e) => { this.onCancelClick(); }
        };

        this._continueButton = {
            id: "continue",
            text: adminResources.ExportContinueButtonText,
            click: (e) => { this.onOkClick(); },
            class: this._isXmlCustomizationEnabled ? undefined : "cta",
            disabled: this._isXmlCustomizationEnabled ? "disabled" : undefined
        };

        this._options.buttons = [this._okButton];
        this._element.addClass('process-modal-dialog');
        this._processTemplateClient = ProcessTemplateRestClient.getClient();

        super.initialize();

        // Show progress page when promote is in progress
        if (this._showJobProgress) {
            this._flexBoxContainer = $("<div/>").addClass("flex-box-container");
            this._element.append(this._flexBoxContainer);
            this.renderProgressPage(this._progressJobId);
            this.setPageOptions(ImportProcessPageType.Progress);
        }
        else {
            this.renderMainPage();
        }
    }

    public renderMainPage() {
        this._flexBoxContainer = $("<div/>").addClass("flex-box-container");
        this._element.empty().append(this._flexBoxContainer);
        this._importProcessTemplateValidationError = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl,
            this._flexBoxContainer,
            {
                closeable: false
            });

        this._textTemplateData = this._isXmlCustomizationEnabled
            ? {
                templateHeader: adminResources.SelectProcessImport,
                templateDescription: adminResources.SelectProcessTextHosted,
                uploadLabel: adminResources.ImportProcessAttachmentText,
                learnImportLinkDescription: adminResources.ImportProcessLearnLinkDescriptionHosted,
                learnImportLink: adminResources.ImportProcessLearnLink
            }
            : {
                templateHeader: adminResources.SelectProcessUpload,
                templateDescription: adminResources.SelectProcessTextOnPrem,
                uploadLabel: adminResources.ImportProcessAttachmentText,
                learnImportLinkDescription: adminResources.ImportProcessLearnLinkDescriptionOnPrem,
                learnImportLink: adminResources.UploadProcessLearnLink
            };
        this._currentElement = $(Utils_Html.TemplateEngine.tmpl(this._mainPage, this._textTemplateData));
        this._currentElement.appendTo(this._flexBoxContainer);

        this._fileInputControl = <VSS_Controls_FileInput.FileInputControl>Controls.BaseControl.createIn<VSS_Controls_FileInput.FileInputControlOptions>(
            VSS_Controls_FileInput.FileInputControl,
            this._currentElement.find(".file-input-control-container"),
            {
                browseButtonAriaDescribedBy: this._currentElement.find(".import-process-headersubtext").uniqueId().attr("id"),
                allowedFileExtensions: ["zip"],
                maximumNumberOfFiles: 1,
                resultContentType: VSS_Controls_FileInput.FileInputControlContentType.RawFile,
                updateHandler: (updateEvent: VSS_Controls_FileInput.FileInputControlUpdateEventData) => {
                    switch (updateEvent.files.length) {
                        case 0: this._templateFile = null;
                            this.updateOkButton(false);
                            this._importProcessTemplateValidationError.clear(); // Clear any error associated with previous template
                            this._byPassWarnings = false;
                            break;
                        case 1: this._templateFile = updateEvent.files[0].file;
                            this.updateOkButton(true);
                            break;
                        default: Diag.logError("Unexpected files length, should be either 0 or 1");
                            this.updateOkButton(false); // should not hit code here but fail-safe 

                    }
                }
            });
        this.updateOkButton(false);
        this.setPageOptions(ImportProcessPageType.Main);
        this._fileInputControl.focus();

        if (this._options.hasPermission === false) {
            this._fileInputControl.hideElement();
            const permissionRequired = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(TFS_Server_WebAccess_Constants.FeatureAvailabilityFlags.WebaccessProcessHierarchy)
                ? adminResources.CreateProcessPermission
                : adminResources.ManageProcessTemplatePermission;

            this._importProcessTemplateValidationError.setError(
                this._isXmlCustomizationEnabled ?
                    Utils_String.format(adminResources.ProcessImportNoPermission, permissionRequired) :
                    Utils_String.format(adminResources.ProcessUploadNoPermission, permissionRequired)
            );
        }
    }

    public renderErrorPage(validationIssues: ProcessTemplateContracts.ValidationIssue[]) {
        Diag.Debug.assertIsNotNull(validationIssues, "error page only rendered there's validation issues");
        let errorDetails = [];
        let warningOnly = true;
        for (let issue of validationIssues) {
            switch (ProcessTemplateContracts.TypeInfo.ValidationIssueType.enumValues[issue.issueType]) {
                case ProcessTemplateContracts.ValidationIssueType.Error:
                    errorDetails.push({
                        Message: (issue.description == null) ? '' : issue.description,
                        Class: 'icon icon-tfs-vc-status-failed',
                        IconTitle: adminResources.ErrorIconLabel,
                        LineNumber: (issue.line == null) ? '' : issue.line,
                        File: (issue.file == null) ? '' : issue.file,
                        FixLink: (issue.helpLink == null) ? '' : issue.helpLink
                    });
                    warningOnly = false;
                    break;
                case ProcessTemplateContracts.ValidationIssueType.Warning:
                    errorDetails.push({
                        Message: (issue.description == null) ? '' : issue.description,
                        Class: 'icon icon-warning',
                        IconTitle: adminResources.WarningIconLabel,
                        LineNumber: (issue.line == null) ? '' : issue.line,
                        File: (issue.file == null) ? '' : issue.file,
                        FixLink: (issue.helpLink == null) ? '' : issue.helpLink
                    });
                    break;
                default: Diag.logError("Unknown validation issue type");
            }

        }
        this._textTemplateData = this._isXmlCustomizationEnabled ?
            {
                templateHeader: adminResources.ProcessValidationFailed,
                errorIconHeaderLabel: adminResources.ErrorIconHeaderLabel,
                templateDescription: Utils_String.format(adminResources.ProcessValidationFailedErrorDescription, this._currentTemplateName),
                errors: errorDetails,
                confirmMessage: Utils_String.format(adminResources.ProcessValidationFailedWarning, tfsContext.getActionUrl(null, null, { team: null, area: "admin" }), this._currentTemplateName),
                warningDescription: Utils_String.format(adminResources.ProcessValidationWarningDescription, this._currentTemplateName)
            } :
            {
                templateHeader: adminResources.ProcessTemplateValidationFailed,
                errorIconHeaderLabel: adminResources.ErrorIconHeaderLabel,
                templateDescription: Utils_String.format(adminResources.ProcessTemplateValidationFailedErrorDescription, this._currentTemplateName),
                errors: errorDetails,
                confirmMessage: Utils_String.format(adminResources.ProcessTemplateValidationFailedWarning, tfsContext.getActionUrl(null, null, { team: null, area: "admin" }), this._currentTemplateName),
                warningDescription: Utils_String.format(adminResources.ProcessTemplateValidationWarningDescription, this._currentTemplateName)
            };
        this._currentElement = $(Utils_Html.TemplateEngine.tmpl(this._errorPage, this._textTemplateData));
        this._currentElement.appendTo(this._flexBoxContainer);
        $('.update-process-checkbox')
            .bind("change", e => {
                var checked = $('.update-process-checkbox').prop("checked") ? true : false;
                if (checked) {
                    this._updateContinueButtonStatus(true);
                    this._byPassWarnings = true;
                }
                else {
                    this._updateContinueButtonStatus(false);
                    this._byPassWarnings = false;
                }
            });
        if (warningOnly) {
            $('.confirm-page-info').show();
            $('.import-process-warning').show();
            $('.error-page-main-description').hide();
            if (!this._isXmlCustomizationEnabled) {
                // Bypass the confirmation on Phase 0 (XML template)
                $('.confirm-page-info').hide();
                this._byPassWarnings = true;
                this._updateContinueButtonStatus(true);
            }

            this.setPageOptions(ImportProcessPageType.Warning);
        }
        else {
            $('.confirm-page-info').hide();
            $('.import-process-warning').hide();
            $('.error-page-main-description').show();
            this.setPageOptions(ImportProcessPageType.Error);
        }

        TFS_Admin_Common.addAccessibilityFunctionsToGrid(this._currentElement.find('.error-table-list'));

        $('#copytoClipboard')
            .bind("click", e => { Utils_Clipboard.copyToClipboard(this._getFormattedTextToCopy()); });

        this._flexBoxContainer.attr("role", "alert");
    }

    public renderSuccessPage() {
        this._flexBoxContainer = $("<div/>").addClass("flex-box-container").attr("role", "alert");
        this._element.empty().append(this._flexBoxContainer);
        var messages = [adminResources.ImportProcessNextStep, adminResources.ImportProcessNextStepModify, adminResources.ImportProcessNextStepUnderstandCustomization];
        this._textTemplateData = this._isXmlCustomizationEnabled ?
            {
                templateHeader: adminResources.ImportProcessSuccessful,
                templateMessage1: adminResources.Congratulations,
                templateMessage2: Utils_String.format(adminResources.ImportProcessName, this._currentTemplateName),
                moreinfo: adminResources.ImportProcessNextStep,
                moreinfo1: adminResources.ImportProcessNextStepModify,
                moreinfo2: adminResources.ImportProcessNextStepUnderstandCustomization,
                moreinfoLink1: adminResources.UpdateSuccessMoreInformationLink1,
                moreinfoLink2: adminResources.UpdateSuccessMoreInformationLink2,
            } :
            {
                templateHeader: adminResources.UploadProcessSuccessful,
                templateMessage1: adminResources.Congratulations,
                templateMessage2: Utils_String.format(adminResources.UploadProcessTemplateName, this._currentTemplateName),
            };
        this._currentElement = $(Utils_Html.TemplateEngine.tmpl(this._isXmlCustomizationEnabled ? this._successPageImport : this._successPageUpload, this._textTemplateData));
        this._currentElement.appendTo(this._flexBoxContainer);
        $('.process-new-project').click((e) => {
            e.preventDefault();

            MyExperiencesUrls.getCreateNewProjectUrl(
                tfsContext.navigation.collection.name,
                {
                    source: "ImportProcess.SucceededScenario",
                    processTemplate: this._currentTemplateName
                } as IUrlParameters).then((createTeamProjectUrl: string) => {
                    Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
                        url: createTeamProjectUrl
                    });
                }, (error: Error) => {
                    Dialogs.show(CreateProjectDialog, {
                        successCallback: () => { this._onDialogClose(); },
                        templateTypeId: this._currentTemplateTypeId
                    });
                });

            this.close();
        });

    }

    public renderProgressPage(jobId: string) {

        this._textTemplateData = {
            templateHeader: adminResources.ProcessUploadDescription,
            processName: this._currentTemplateName,
            uploadDescription1: Utils_String.format(adminResources.ImportProcessUpdateDescription, this._currentTemplateName),
            uploadDescription2: adminResources.ImportProcessUpdateCloseDescription

        };
        this._currentElement = $(Utils_Html.TemplateEngine.tmpl(this._progressPage, this._textTemplateData));
        this._currentElement.appendTo(this._flexBoxContainer);
        var progressElement = $('.upload-progress-info');
        this._monitorJobControl = <TFS_Admin_Common.ImportProcessJobMonitorControl>Controls.Enhancement.enhance(TFS_Admin_Common.ImportProcessJobMonitorControl, progressElement, {
            jobId: jobId,
            renderImportProcessErrorText: Utils_String.format(adminResources.ErrorRetrievingImportProcessProgressMessage, this._currentTemplateName),
            notStartedText: adminResources.PromoteProcessNotStarted,
            inProgressText: adminResources.PromoteProcessStarted,
            completeTextDescription: adminResources.PromoteProcessSuccessDescription,
            completeText: Utils_String.format(adminResources.PromoteProcessSuccess, this._currentTemplateName),
            failureText: Utils_String.format(adminResources.PromoteProcessError, this._currentTemplateName),
            retryActionText: adminResources.PromoteProcessRetry
        });

        this._monitorJobControl._element.bind('render-complete', () => { this._onRenderComplete(); });
        this._monitorJobControl._element.bind('retry-after-failure', () => { this._onRetryAfterFailure(); });
        this._monitorJobControl._element.bind('render-failure', () => { this._onRenderFailure(); });

        this._monitorJobControl.startMonitoring();

    }

    public setPageOptions(pageType: ImportProcessPageType) {
        if (pageType == ImportProcessPageType.Main) {
            this._options.buttons = {
                "ok": this._okCtaButton
            };
            setDialogButtons(this._element, this._options.buttons);
            this._resetDialogOptions()
            this._dialogCloseButton = $('.ui-dialog-titlebar-close');
            if (this._dialogCloseButton) {
                this._dialogCloseButton.show();
            }
        }
        else if (pageType == ImportProcessPageType.Error) {
            $('.process-main-page').hide();

            // Changing width and height only when errors are shown
            var dialogOptions = { width: 1000, minWidth: 650 };
            this.getElement().dialog(dialogOptions);
            setDialogButtons(this._element, [this._retryButton, this._closeButton]);
        }
        else if (pageType == ImportProcessPageType.Warning) {
            $('.process-main-page').hide();

            // Changing width and height only when errors are shown
            var dialogOptions = { width: 1000, minWidth: 650 };
            this.getElement().dialog(dialogOptions);
            setDialogButtons(this._element, [this._continueButton, this._cancelButton]);
        }
        else if (pageType == ImportProcessPageType.Success) {
            setDialogButtons(this._element, [this._closeCtaButton]);
            $('.process-main-page').hide();
            this._resetDialogOptions();
        }
        else if (pageType == ImportProcessPageType.Progress) {
            setDialogButtons(this._element, [this._closeCtaButton]);
            $('.process-main-page').hide();
            $('.process-error-page').hide();
            this._resetDialogOptions();
            this.$closeButton = this._element.siblings(".ui-dialog-buttonpane").find('#closeProcess');
            this.$closeButton.focus();
        }
    }

    private _updateContinueButtonStatus(enabled: boolean) {
        this.getElement().trigger(Dialogs.ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { enabled: enabled, button: this._continueButton.id });
    }

    private _resetDialogOptions() {
        var dialogOptions = { width: 560, minWidth: 560 };
        this.getElement().dialog(dialogOptions);
    }

    private _uploadTemplate(existence: ProcessTemplateContracts.CheckTemplateExistenceResult) {
        Diag.Debug.assertIsNotNull(this._templateFile, "upload process template should not be called when no file is selected");
        this._processTemplateClient.importProcessTemplate(this._templateFile, this._byPassWarnings)
            .then((result: ProcessTemplateContracts.ProcessImportResult) => {
                if (!existence.doesTemplateExist || result.promoteJobId === Utils_String.EmptyGuidString) {
                    //New process template or does not require promote
                    this._templateUploaded = true;
                    this.renderSuccessPage();
                    this.setPageOptions(ImportProcessPageType.Success);
                }
                else {
                    this.renderProgressPage(result.promoteJobId);
                    this.setPageOptions(ImportProcessPageType.Progress);
                }
            },
            (reason: Error) => {
                const serverError = (<any>reason).serverError;
                if (this._dialogCloseButton) {
                    this._dialogCloseButton.show();
                }
                if (serverError && serverError.validationResults) {
                    this.renderErrorPage(<ProcessTemplateContracts.ValidationIssue[]>serverError.validationResults);
                    return;
                }
                else {
                    if (!this._isOnErrorPage()) {
                        // Must clear file input first, it will trigger event cause the error message get cleared.
                        // Do not clear if we are on error page to allow user try again.
                        this._fileInputControl.clear();
                    }

                    // If it's not validation error, show the message returned.
                    this._importProcessTemplateValidationError.setError($("<span />").html(reason.message));
                }
            });
    }

    private _checkTemplateExistenceAndUpload() {
        this.updateOkButton(false);
        this._processTemplateClient.checkTemplateExistence(this._templateFile)
            .then((result: ProcessTemplateContracts.CheckTemplateExistenceResult) => {
                this._currentTemplateName = result.requestedTemplateName;
                this._currentTemplateTypeId = result.existingTemplateTypeId;
                if (!result.doesTemplateExist || this._overrideExistingProcess) {
                    this._uploadTemplate(result);
                }
                else {
                    this.updateOkButton(true);
                    Dialogs.show(ImportProcessConfirmationDialog, {
                        TemplateName: result.requestedTemplateName,
                        ExistingTemplateName: result.existingTemplateName,
                        okCallback: () => {
                            this._overrideExistingProcess = true;
                            this.updateOkButton(false);
                            if (this._dialogCloseButton) {
                                // Workaround for bug #509693: Prevent the user from closing the dialog while the process is uploading and validating
                                this._dialogCloseButton.hide();
                            }
                            this._uploadTemplate(result);
                        },
                        isXmlCustomizationEnabled: this._isXmlCustomizationEnabled
                    });
                }
            },
            (reason: Error) => {
                if (!this._isOnErrorPage()) {
                    // Must clear file input first, it will trigger event cause the error message get cleared.
                    // Do not clear if we are on error page to allow user try again.
                    this._fileInputControl.clear();
                }

                this._importProcessTemplateValidationError.setError($("<span />").html(reason.message));
                if (this._dialogCloseButton) {
                    this._dialogCloseButton.show();
                }
            });
    }

    public onOkClick() {
        this._importProcessTemplateValidationError.clear();
        this._checkTemplateExistenceAndUpload();
    }

    /*
     * Check if we are on error (or warning) page
     */
    private _isOnErrorPage(): boolean {
        return $(".import-process-page.process-error-page", this._element).is(":visible");
    }

    private _getFormattedTextToCopy() {

        var sb = new Utils_String.StringBuilder();
        var i: number = 0;
        $(".error-table-list").each(function () {
            $(this).find('tr').each(function () {
                $(this).children().each(function () {
                    // Ignoring the icon column
                    if (i != 0) {
                        sb.append($(this).text());
                        sb.append(Utils_String.tab);
                    }
                    i++;
                });
                i = 0;
                sb.appendNewLine();
            });
        });

        return sb.toString();

    }

    private _onDialogClose() {

        if (this._monitorJobControl) {
            this._monitorJobControl.stopMonitoring();
        }

        if (this._templateUploaded && $.isFunction(this._options.successCallback)) {
            this._options.successCallback.call();
        }
        if ($.isFunction(this._options.onClose)) {
            this._options.onClose.call(this);
        }
    }

    private _onRenderComplete() {
        this._templateUploaded = true;
        $('.upload-progress-list', this._element).hide();
        $('.update-process-completed', this._element).html(adminResources.ProcessUploadCompletedDescription);

    }

    private _onRetryAfterFailure() {
        this._byPassWarnings = false;
        this.renderMainPage();
        this._templateUploaded = false;
    }

    private _onRenderFailure() {
        $('.upload-progress-list', this._element).hide();
        $('.update-process-completed', this._element).html(adminResources.ProcessUploadFailedDescription);
        this._templateUploaded = false;
    }
}

VSS.classExtend(ImportProcessTemplateDialog, TfsContext.ControlExtensions);

export interface ImportProcessConfirmationDialogOptions extends Dialogs.IConfirmationDialogOptions {
    ExistingTemplateName?: string;
    TemplateName?: string;
    isXmlCustomizationEnabled: boolean;
}

export class ImportProcessConfirmationDialog extends Dialogs.ConfirmationDialogO<ImportProcessConfirmationDialogOptions> {

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: ImportProcessConfirmationDialogOptions) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            title: (options && options.isXmlCustomizationEnabled) ? adminResources.ImportProcessConfirmation : adminResources.UploadProcessTemplateConfirmation,
            okText: adminResources.Replace,
            cancelText: adminResources.Cancel,
            height: "auto",
            width: 500
        }, options));
    }

    public initialize() {

        if (this._options.ExistingTemplateName !== this._options.TemplateName) {
            $(domElem('div'))
                .addClass("import-process-confirmation")
                .html(Utils_String.format(this._options.isXmlCustomizationEnabled ? adminResources.ProcessOverrideDetailedDescription : adminResources.ProcessTemplateOverrideDetailedDescription, this._options.ExistingTemplateName, this._options.TemplateName))
                .appendTo(this._element);
        }
        else {
            $(domElem('div'))
                .addClass("import-process-confirmation")
                .text(Utils_String.format(this._options.isXmlCustomizationEnabled ? adminResources.ProcessOverrideDescription : adminResources.ProcessTemplateOverrideDescription, this._options.TemplateName))
                .appendTo(this._element);
        }
        $(domElem('div')).addClass("import-process-confirmation").text(adminResources.ProcessOverrideDescriptionReplace).appendTo(this._element);
        super.initialize();
    }

    public getDialogResult() {

        return true;
    }

}

export class CreateTeamDialog extends ManageGroupDialog {

    public static _controlType: string = 'CreateTeamDialog';
    private static NoParentGroupGuid: string = "";

    private _identityListControl: any;
    private _existingAdmins: any;
    private _newAdmins: any;
    private _parentGroupIdentityListControl: TFS_Admin_Common.IdentityPickerControl;
    private _settingsTabId: any;
    private _settingsTab: any;

    public $settingsContainer: any;
    public $teamAdminError: any;
    public $createArea: any;
    public _closeButton: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            width: 560,
            minWidth: 560,
            height: 550,
            minHeight: 550,
            modal: true,
            open: function () {
                Diag.logTracePoint("Dialog.initialize.complete");
            },
            beforeClose: () => { this._beforeClose(); },
            title: Utils_String.htmlEncode(adminResources.CreateNewTeam),
            imageAltText: adminResources.NewTeamAltText
        }, options));
    }

    public initialize() {
        /// <param name="data" type="any" optional="true" />

        // Intitialize the admin arrays
        this._existingAdmins = [];
        this._newAdmins = [];

        super.initialize();

        this._closeButton = {
            id: 'exitDialog',
            text: adminResources.Close,
            click: function () {
                $(this).dialog('close');
            }
        };

        // Set focus to the team name text box
        this.$name.focus();
    }

    public _evaluateSaveButtonState(): any {
        /// <returns type="any" />

        var enableSaveButton = false;

        // There needs to be a team name and an admin for save button to be enabled
        if (super._evaluateSaveButtonState() && (this._existingAdmins.length + this._newAdmins.length) > 0) {
            enableSaveButton = true;
        }

        this.updateOkButton(enableSaveButton);
    }

    public _addNameElement(data, groupData) {
        super._addNameElement(data, groupData);
        this.$name.attr('maxlength', '64');
    }

    public onOkClick() {
        var parentGroupGuid = CreateTeamDialog.NoParentGroupGuid;
        // Make sure user did not clear combo value
        if ((this._parentGroupIdentityListControl.getPendingUserInput().length > 0) &&
            (this._parentGroupIdentityListControl.getPendingChanges(false).existingUsers.length > 0)) {
            parentGroupGuid = this._parentGroupIdentityListControl.getPendingChanges(false).existingUsers[0];
        }
        if (parentGroupGuid === CreateTeamDialog.NoParentGroupGuid) {
            Dialogs.show(NoParentGroupForTeamConfirmationDialog, {
                okCallback: () => {
                    this._createTeam(parentGroupGuid);
                }
            });
        }
        else {
            this._createTeam(parentGroupGuid);
        }
    }

    private _createTeam(parentGroupGuid: any) {
        var that = this;
        this._requestContext = TFS_Core_Ajax.postMSJSON(
            this._options.tfsContext.getActionUrl('CreateTeam', 'identity', { area: 'api', team: null }),
            {
                teamName: this.$name.val(),
                teamDesc: this.$description.val(),
                newUsersJson: Utils_Core.stringifyMSJSON(this._newAdmins),
                existingUsersJson: Utils_Core.stringifyMSJSON(this._existingAdmins),
                createArea: this.$createArea !== null && this.$createArea.prop("checked"),
                parentGroupGuid: parentGroupGuid
            },
            function (identity) {
                if ($.isFunction(that._options.successCallback)) {
                    that._options.successCallback.call(that, { identity: identity });
                }

                if (identity.Warnings && identity.Warnings.length > 0) {
                    var errorHtml = that._createWarningMessage(adminResources.TeamCreatedSuccessFullyWithWarnings, identity.Warnings);
                    $('.admin-dialog', that._element).empty();
                    $('.admin-dialog', that._element).html(errorHtml);

                    that._element.dialog('option', 'buttons', [that._closeButton]);
                } else {
                    that._element.dialog('close');
                    Diag.logTracePoint('CreateTeamAdminDialog.Create.Success');

                    if (that._options.navigateToTeamOnSuccess) {
                        const pageContext = Context.getPageContext();

                        let newTeamUrl = Locations.urlHelper.getMvcUrl({
                            action: "RedirectMru",
                            controller: "Mru",
                            area: "",
                            level: <any>pageContext.webContext.host.hostType,
                            webContext: pageContext.webContext,
                            project: pageContext.webContext.project.name,
                            team: identity.FriendlyDisplayName,
                            queryParams: {
                                toController: pageContext.navigation.currentController,
                                toRouteArea: pageContext.navigation.area,
                                toAction: pageContext.navigation.currentAction,
                                toParameters: pageContext.navigation.currentParameters
                            }
                        });
                        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
                            url: newTeamUrl
                        });
                    }
                }
            },
            function (error) {
                that._errorPane.setError(error.message);
                that.updateOkButton(false);
                Diag.logTracePoint('CreateTeamAdminDialog.Create.Error');
            },
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: this._element.closest('.ui-dialog')
                }
            }
        );
    }

    public _getSaveButtonText() {
        return Utils_String.htmlEncode(adminResources.CreateTeam);
    }

    public _decorate(data?: any) {
        var adminHeader,
            adminList,
            currentIdentity,
            permissionSection,
            that = this;

        super._decorate();

        var parentGroupControlCreated = false;
        var teamFieldCheckboxCreated = false;
        var decorateCompleted = false;

        var tryFireDialogComplete = () => {
            if (parentGroupControlCreated && teamFieldCheckboxCreated && decorateCompleted) {
                Diag.logTracePoint('CreateNewTeamDialog.Complete');
            }
        };

        // Add group picker control for group to add user into
        $(domElem('div')).addClass('manage-group-label').appendTo(this.$groupData).text(adminResources.Permissions);
        $(domElem('div')).addClass('manage-group-label').appendTo(this.$groupData).text(adminResources.Permissions_Description);

        permissionSection = $(domElem('div')).addClass('parent-group-identity').appendTo(this.$groupData);

        this._parentGroupIdentityListControl = <TFS_Admin_Common.IdentityPickerControl>Controls.BaseControl.createIn(TFS_Admin_Common.IdentityPickerControl, permissionSection, {
            delayInit: false,
            filterList: false,
            allowMultiSelect: false,
            allowFreeType: false,
            showBrowse: false,
            comboOnly: true,
            allowCheckName: false,
            identityListAction: this._options.tfsContext.getActionUrl('ReadAddableGroups', 'identity', { area: 'api' }),
            searchParams: {
                joinGroups: true,
                excludeTeams: true
            },
            wait: {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: this._element
                }
            },
            onListRetrieved: function (identities) {
                identities.push({ DisplayName: adminResources.DoNotAddToSecurityGroup, TeamFoundationId: CreateTeamDialog.NoParentGroupGuid });
            },
            onReady: function (identityPicker) {
                var contributorsGroupName = Utils_String.format("[{0}]\\{1}", that._options.tfsContext.navigation.project, adminResources.ContributorsGroupName);

                if (!identityPicker.select(contributorsGroupName, false)) {
                    // Could not find contributors group, set to nothing
                    identityPicker.select(adminResources.DoNotAddToSecurityGroup, false);
                }
                // Make sure focus is on name
                Utils_Core.delay(
                    that,
                    100,
                    function () {
                        that.$name.focus();
                        parentGroupControlCreated = true;
                        tryFireDialogComplete();
                    });
            }
        });

        VSS.using(['Presentation/Scripts/TFS/TFS.UI.Controls.Accessories'], (_TFS_UI_Controls_Accessories: typeof TFS_UI_Controls_Accessories) => {
            const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
            const projectAdminViewData = pageDataService.getPageData<IAdminProjectHomeData>(AdminProjectHomeDataProviderContributionId);
            const projectOverviewOptions = JSON.parse(projectAdminViewData.projectOverviewOptionsJson);
            const teamFieldName = projectOverviewOptions.teamFieldName;

            if (teamFieldName === "System.AreaPath") {
                // add the areas
                $(domElem('div')).addClass('manage-group-label').appendTo(that.$groupData).text(adminResources.TeamArea);

                that.$createArea = $("<input id='create-area' type='checkbox' />")
                    .prop("checked", true)
                    .appendTo(that.$groupData);

                $(domElem('label')).appendTo(that.$groupData).attr("for", "create-area").addClass("create-team-area-label").text(adminResources.CreateAreaPath);

                teamFieldCheckboxCreated = true;
                tryFireDialogComplete();
            }
        });

        this._settingsTabId = 'settings_' + this.getId();

        //now add team admin section and create area section
        this.$settingsContainer = $(domElem('div')).attr('id', this._settingsTabId).addClass('settings-container').appendTo(this._tabsControlDiv);
        this._tabsControlDiv.find('ul.manage-group-tabs').append($('<li><a href="#' + this._settingsTabId + '">' + adminResources.Settings + '</a></li>'));
        this._tabsControlDiv.tabs('refresh');
        this._tabsControlDiv.tabs('option', 'active', 0);

        this._settingsTab = $('a[href="#' + this._settingsTabId + '"]');

        this._focusClass = "enter" + this._settingsTabId;
        this._settingsTab.bind("blur", (event) => {
            if (this._settingsTab.hasClass(this._focusClass)) {
                this._settingsTab.focus();
                this._settingsTab.removeClass(this._focusClass);
            }
        });
        this._settingsTab.bind("keydown", (event) => {
            if (event.keyCode == Utils_UI.KeyCode.ENTER) {
                this._settingsTab.addClass(this._focusClass);
            }
        });
        this._settingsTab.bind("keyup", (event) => {
            if (event.keyCode == Utils_UI.KeyCode.ENTER) {
                if (this._settingsTab.hasClass(this._focusClass)) {
                    this._settingsTab.removeClass(this._focusClass);
                }
            }
        });

        //add the admins
        adminHeader = $(domElem('div')).addClass('admin-header').appendTo(this.$settingsContainer);
        $(domElem('span')).addClass('manage-group-label').appendTo(adminHeader).text(adminResources.Administrators);

        // add admin grid
        adminList = $(domElem('div')).appendTo(this.$settingsContainer);

        // Add identity list control
        this._identityListControl = <TFS_Admin_Common.IdentityListControl>Controls.BaseControl.createIn(TFS_Admin_Common.IdentityListControl, adminList);
        adminList.bind('identityListChanged', function (event, params) {
            if (params) {
                if (params.tfid) {
                    that._existingAdmins = Utils_Array.subtract(that._existingAdmins, [params.tfid]);
                }
                else {
                    that._newAdmins = Utils_Array.subtract(that._newAdmins, [params.name]);
                }
            }

            if (that._existingAdmins.length + that._newAdmins.length === 0) {
                that.$teamAdminError.show();
                that.$teamAdminError.text(adminResources.AdminRequired);
                that._evaluateSaveButtonState();
            }
        });

        // add admin button
        adminList = $(domElem('div')).appendTo(this.$settingsContainer).addClass('admin-actions');
        $(domElem('a')).appendTo(adminList).text(adminResources.PlusAdd).attr({ 'href': '#', 'role': 'button' }).bind('click', () => { this._addAdminClicked(); });

        this.$teamAdminError = $(domElem('div')).appendTo(this.$settingsContainer).addClass('team-admin-error').addClass('team-error').hide();

        //add current user to admin list
        currentIdentity = this._options.tfsContext.currentIdentity;
        this._addAdmin(currentIdentity.displayName, currentIdentity.id);

        decorateCompleted = true;
        tryFireDialogComplete();
    }

    private _addAdminClicked() {
        Dialogs.show(IdentitiesDialog, {
            mainTitle: this.$name.val() || adminResources.NewTeam,
            saveCallback: (pendingChanges) => { this._saveAdminCallback(pendingChanges); },
            contentHeader: adminResources.AddTeamAdministrator,
            tfsContext: this._options.tfsContext
        });
        return false;
    }

    public _validateName(event) {
        if (event.keyCode !== $.ui.keyCode.ENTER) {
            this._validateCharCount(this.$name, 64, 54, this.$nameError);
            this._evaluateSaveButtonState();
        }
    }

    private _addAdmin(identity?: any, tfid?: string) {
        /// <param name="identity" type="any" optional="true" />
        /// <param name="tfid" type="string" optional="true" />

        this._identityListControl.addIdentity(identity, identity, tfid);

        if (tfid) {
            this._existingAdmins.push(tfid);
        }
        else {
            this._newAdmins.push(identity);
        }
        this.$teamAdminError.hide();
        this._evaluateSaveButtonState();
    }

    public _getNameLabel(data) {
        return adminResources.TeamName;
    }

    private _saveAdminCallback(pendingChanges) {
        var i;

        // Append on changes for new users
        for (i = 0; i < pendingChanges.newUsers.length; i++) {
            if (jQuery.inArray(pendingChanges.newUsers[i], this._newAdmins) === -1) {
                this._addAdmin(pendingChanges.newUsers[i]);
            }
        }

        // Append on existing users
        for (i = 0; i < pendingChanges.existingUsers.length; i++) {
            if (jQuery.inArray(pendingChanges.existingUsers[i].tfid, this._existingAdmins) === -1) {
                this._addAdmin(pendingChanges.existingUsers[i].name, pendingChanges.existingUsers[i].tfid);
            }
        }
    }

    private _createWarningMessage(title, warnings) {
        var container, header, content, ul, i, l;

        container = $(domElem('div')).addClass('team-warning-section');
        header = $(domElem('div')).addClass('header').appendTo(container).text(title);
        content = $(domElem('div')).addClass('content').appendTo(container);
        ul = $(domElem('ul')).appendTo(content);
        if (warnings) {
            for (i = 0, l = warnings.length; i < l; i++) {
                $(domElem('li')).appendTo(ul).text(warnings[i]);
            }
        }
        return container;
    }
}

VSS.initClassPrototype(CreateTeamDialog, {
    _identityListControl: null,
    _parentGroupdIdentityListControl: null,
    $settingsContainer: null,
    $teamAdminError: null,
    $createArea: null,
    _existingAdmins: null,
    _newAdmins: null,
    _closeButton: null,
    _parentGroupIdentityListControl: null,
    _settingsTabId: null
});

VSS.classExtend(CreateTeamDialog, TfsContext.ControlExtensions);

export interface JumpListDialogOptions extends AdminDialogOptions {
    selectedTeam?: any;
}

export class JumpListDialog extends Dialogs.ModalDialogO<JumpListDialogOptions> {

    public static _controlType: string = 'JumpListDialog';

    private _jumpUrl: any;
    private _closeButton: any;
    private _connectButton: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: false,
            width: 650,
            height: 500,
            modal: true,
            open: function () {
                Diag.logTracePoint('JumpList.OpenDialog');
            },
            title: adminResources.BrowseServer
        }, options));
    }

    public initialize() {
        var navigationContext = this._options.tfsContext.navigation,
            hideDefaultTeam = !(navigationContext.area && navigationContext.area.toLowerCase() === 'admin');

        this._options.url = this._options.tfsContext.getActionUrl('BrowseControl', 'browse', { area: 'api', hideDefaultTeam: hideDefaultTeam, selectedTeam: this._options.selectedTeam, ignoreDefaultLoad: true } as TFS_Host_TfsContext.IRouteData);

        super.initialize();

        this._initializeButtons();
        this._element.bind('definitionchange', (e?, params?) => { this.setCurrentJumpPoint(e, params); });
    }

    public setCurrentJumpPoint(e?, params?) {
        if (params && params.selectedNode && params.selectedNode.type !== 'collection') {
            this._jumpUrl = params.selectedNode.model.url;
            this._element.siblings('.ui-dialog-buttonpane').find('#' + this._connectButton.id).button('enable');
        }
        else {
            this._jumpUrl = null;
            this._element.siblings('.ui-dialog-buttonpane').find('#' + this._connectButton.id).button('disable');
        }
    }

    private _jumpToDestination() {
        var enabled, disabled;
        // There is no 'option' of 'enabled' (only 'disabled'), and we want to be sure it's false (not null or undefined).
        // Typescript complains if we try to just compare this to false in the same line since it thinks it's a JQuery object returned being compared to a boolean.
        disabled = this._element.siblings('.ui-dialog-buttonpane').find('#' + this._connectButton.id).button('option', 'disabled');
        enabled = (disabled === false);
        if (this._jumpUrl && enabled) {
            window.location.href = this._jumpUrl;
        }
    }

    private _initializeButtons() {
        this._connectButton = {
            id: 'jump-list-dialog-connect-button',
            disabled: true,
            text: Utils_String.htmlEncode(adminResources.Navigate),
            class: "cta",
            click: () => { this._jumpToDestination(); }
        };

        this._closeButton = {
            id: 'jump-list-dialog-close-button',
            text: Utils_String.htmlEncode(adminResources.Close),
            click: function () {
                $(this).dialog('close');
            }
        };

        setDialogButtons(this._element, [this._connectButton, this._closeButton]);
    }

    onLoadCompleted(content: any): void {
        super.onLoadCompleted(content);
        this._fire("resize");
    }
}

VSS.initClassPrototype(JumpListDialog, {
    _jumpUrl: null,
    _closeButton: null,
    _connectButton: null
});

VSS.classExtend(JumpListDialog, TfsContext.ControlExtensions);

export interface TeamPickerDialogOptions extends AdminDialogOptions {
    selectedTeam?: any;
}

export class TeamPickerDialog extends Dialogs.ModalDialogO<TeamPickerDialogOptions> {

    public static _controlType: string = 'TeamPickerDialog';

    private _selectedTeam: any;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: true,
            width: 650,
            height: 500,
            modal: true,
            title: adminResources.BrowseTeam
        }, options));
    }

    public initialize() {
        var routeData = {
            area: 'api',
            hideDefaultTeam: true,
            showTeamsOnly: true,
            selectedTeam: this._options.selectedTeam
        };

        this._options.url = this._options.tfsContext.getActionUrl('BrowseControl', 'browse', routeData);

        super.initialize();

        this._element.bind('definitionchange', (e?, args?) => { this._onSelectionChange(e, args); });
        this.updateOkButton(false);
    }

    private _onSelectionChange(e?: JQueryEventObject, args?: any): any {
        if (args && args.selectedNode &&
            (args.selectedNode.type === "team" || args.selectedNode.type === "project")) {
            this._selectedTeam = (args.selectedNode.type === "team") ? args.selectedNode.model : args.selectedNode.model.defaultTeam;
            this.updateOkButton(true);
        }
        else {
            this._selectedTeam = null;
            this.updateOkButton(false);
        }
    }

    public getDialogResult() {
        return this._selectedTeam;
    }
}

VSS.classExtend(TeamPickerDialog, TfsContext.ControlExtensions);

export interface ManageGroupMembersDialogOptions extends AdminDialogOptions {
    editMembers?: boolean;
    joinToGroupTfid?: string;
    joinToGroupExpandParentScopes?: any;
    isTeam?: boolean;
    preventJoin?: boolean;
    dialogClosed?: Function;

}

export class ManageGroupMembersDialog extends Dialogs.ModalDialogO<ManageGroupMembersDialogOptions> {

    private _membersModified: boolean;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            width: 600,
            height: 450,
            modal: true,
            open: function () {
                Diag.logTracePoint('ManageTeamMembersDialog.OpenDialog');
            },
            title: Utils_String.format(adminResources.ManageTeamMembersDialogTitle, options.teamName || options.groupName || "")
        }, options));
    }

    public initialize() {
        var that = this, container, membershipControl;

        // Displaying only close button.
        // Ok and cancel buttons don't make any sense here.
        this._options.buttons = [{
            id: "manage-team-members-close-button",
            text: adminResources.Close,
            click: function () {
                $(this).dialog('close');
            }
        }];

        super.initialize();

        // Set the initial focus to the button
        this._element.siblings(".ui-dialog-buttonpane").find('#manage-team-members-close-button').focus();

        // Creating container for membership control
        container = $("<div class='team-members-container' />")
            .appendTo(this._element)
            .bind('member-added member-removed', function (e) {
                that._membersModified = true;
            });

        // Creating membership control
        membershipControl = <TFS_Admin_Common.MembershipControl>Controls.Enhancement.enhance(TFS_Admin_Common.MembershipControl, container, {
            editMembers: this._options.editMembers !== false,
            joinToGroupTfid: this._options.joinToGroupTfid,
            joinToGroupExpandParentScopes: this._options.joinToGroupExpandParentScopes,
            setInitialFocus: true,
            isTeam: this._options.isTeam,
            preventRemove: this._options.editMembers === false,
            preventJoin: this._options.preventJoin,
            showAddAadMembers: (tfsContext.isHosted && tfsContext.isAADAccount) ? true : false,
            adminUIFeatureFlagEnabled: TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled() || null,
            onEscapePress: () => this.close(),
        });

        ManageGroupMembersDialog.bindIdentityGridOpenGroup(container);
    }

    public onClose(e?) {
        if ($.isFunction(this._options.dialogClosed)) {
            // Notifying subscribers that the dialog is closed.
            this._options.dialogClosed(this._membersModified === true);
        }
        super.onClose(e);
    }

    public static bindIdentityGridOpenGroup($gridElement: JQuery) {
        $gridElement.bind('open-group-details', <any>((event: any, identity: TFS_Admin_Common.IIdentity) => {
            Dialogs.show(ManageGroupMembersDialog, {
                joinToGroupTfid: identity.TeamFoundationId,
                groupName: identity.FriendlyDisplayName,
                isTeam: identity.IsTeam,
                editMembers: !identity.RestrictEditingMembership,
                preventJoin: identity.RestrictEditingMembership
            });
        }));
    }
}

VSS.classExtend(ManageGroupMembersDialog, TfsContext.ControlExtensions);

export class ManageTeamMembersDialog extends ManageGroupMembersDialog {

    public static _controlType: string = 'ManageTeamMembersDialog';

    constructor(options?) {
        super($.extend(options, {
            isTeam: true
        }));
    }
}

VSS.classExtend(ManageTeamMembersDialog, TfsContext.ControlExtensions);

export interface ServiceEndpointDialogOptions extends Dialogs.IConfirmationDialogOptions {
    connectedService?: any;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

export class DeleteServiceEndpointConfirmationDialog extends Dialogs.ConfirmationDialogO<ServiceEndpointDialogOptions> {

    constructor(options?) {
        super(options);
        this._hasPressedOkButton = false;
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            title: adminResources.DeleteServiceEndpointDialogTitle,
            okText: adminResources.Disconnect,
            resizable: true,
            height: 150
        }, options));
    }

    public initialize() {
        var confirmationMessage = `<div id="confirmation-message"> <strong>` + adminResources.DisconnectServiceEndpointConfirm + `</strong> </div>`;
        this._element.html(Utils_String.format(confirmationMessage,
            Utils_String.htmlEncode(this._options.connectedService.name),
            this._options.tfsContext.navigation.publicAccessPoint.uri));
        super.initialize();
    }

    public getDialogResult() {
        var tfsConnection = new Service.VssConnection(this._options.tfsContext.contextData);
        var connectedServicesService = tfsConnection.getService<TFS_Admin_ServiceEndpoints.ServiceEndPointService>(TFS_Admin_ServiceEndpoints.ServiceEndPointService);

        connectedServicesService.beginDisconnect(
            this._options.connectedService.id            
        ).then((data) => { this._onSuccess(data); }, (error) => { this._onError(error); });

        return null;
    }

    public onOkClick(): void {
        super.onOkClick();
        this._hasPressedOkButton = true;
    }

    public dispose() {
        super.dispose();
        if (this._hasPressedOkButton && $(".node .node:not(.selected)").length === 0) {
            $(".new-service-endpoint-title").focus();
        }
    }

    private _hasPressedOkButton: boolean;
}

export interface ConnectedServiceDialogOptions extends Dialogs.IConfirmationDialogOptions {
    connectedService?: any;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

export class DeleteAzureConnectedServiceConfirmationDialog extends Dialogs.ConfirmationDialogO<ConnectedServiceDialogOptions> {

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            title: adminResources.DeleteConnectedServiceDialogTitle,
            okText: adminResources.Disconnect,
            height: 250
        }, options));
    }

    public initialize() {
        this._element.html(Utils_String.format(adminResources.DisconnectServiceConfirmation,
            Utils_String.htmlEncode(this._options.connectedService.friendlyName),
            this._options.tfsContext.navigation.publicAccessPoint.uri));
        super.initialize();
    }

    public getDialogResult() {
        var connectedServicesService = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<TFS_Admin_ConnectedServices.ConnectedServicesManager>(TFS_Admin_ConnectedServices.ConnectedServicesManager);

        connectedServicesService.beginDisconnect(
            this._options.connectedService.id,
            (data) => { this._onSuccess(data); },
            (err) => { this._onError(err); }
        );

        return null;
    }
}

//Shows a dialog box asking confirmation that there is No Parent Guid is selected for the Team
export class NoParentGroupForTeamConfirmationDialog extends Dialogs.ConfirmationDialog {

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            title: adminResources.NoParentGroupForTeamConfirmationTitle,
            okText: adminResources.Yes,
            cancelText: adminResources.No,
            width: 600,
            height: "auto"
        }, options));
    }

    public initialize() {
        this._element.html(adminResources.NoParentGroupForTeamConfirmation);
        super.initialize();
    }

    public getDialogResult() {
        return true;
    }
}

Menus.menuManager.attachExecuteCommand(function (sender, args) {
    var commandArgs = args.get_commandArgument();

    if (!commandArgs) {
        return;
    }

    switch (args.get_commandName()) {
        case 'add-members-dialog':
            Dialogs.show(AddUserDialog, commandArgs);
            return false;
        case 'add-groups-dialog':
            Dialogs.show(AddGroupDialog, commandArgs);
            return false;
        case 'add-Aad-groups-dialog':
            Dialogs.show(AddAadGroupDialog, commandArgs);
            return false;
        case 'join-group-dialog':
            Dialogs.show(JoinGroupDialog, commandArgs);
            return false;
        case 'identity-picker-dialog':
            Dialogs.show(IdentityPickerDialog, commandArgs);
            return false;
    }
});

export enum ImportProcessPageType {
    Main = 1,
    Error,
    Warning,
    Progress,
    Success
};

export module ProcessTemplateSource {
    export interface Process {
        /** Guid identifier for this process */
        TemplateTypeId: string;
        /** Guid */
        RowId: string;
        Name: string;
        ReferenceName: string;
        Version: string;
        Description: string;
        IsDefault: boolean;
        IsSystemTemplate: boolean;
        //Status
        SubscribedProjectCount: number;
        /** Parent Process Guid */
        Inherits: string;
        /** Number of processes using  */
        DerivedProcessCount: number;
        Properties?: ProcessProperties;
    }
    export interface ProcessProperties {
        IsDefault: boolean;
        IsEnabled: boolean;
        /** Guid */
        UpdatedBy: string;
        UpdateDate: string;
        /** Guid Identifier */
        TemplateTypeId: string;
    }
}

export class ChildProcessCreationDialog extends Dialogs.ModalDialog {
    //Set from options
    private _startTime: number;
    private _parentName: string;
    private _parentId: string;
    private _populate: (processName?: string) => void;
    private _getProcesses: () => ProcessTemplateSource.Process[];
    private _canCreate: boolean;
    private _accountName: string;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _successCallback: (processName?: string) => void;

    //Created internally
    private _nameField: JQuery;
    private _nameError: JQuery;
    private _descriptionField: JQuery;
    private _errorPanel: Notifications.MessageAreaControl;

    private _createButtonId: string;

    public initialize(): void {
        var that = this;
        this._options.url = this._tfsContext.getActionUrl('ChildProcessCreationDialog', 'process', { area: 'admin' });
        this._options.urlParams = {};
        this._options.success = function () {
            that._populateDialog();
        };
        super.initialize();
    }
    public initializeOptions(options?: ChildProcessCreationDialog.Options): void {
        this._parentName = options.parentName;
        this._parentId = options.parentId;
        this._populate = options.populate;
        this._getProcesses = options.getProcesses;
        this._canCreate = options.canCreate;
        this._accountName = options.accountName;
        this._tfsContext = options.tfsContext;
        this._successCallback = options.successCallback;

        this._createButtonId = 'create-process';
        this._startTime = new Date().getTime();
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            Admin.CustomerIntelligenceConstants.Process.AREA,
            'ChildProcessCreationDialog',
            { "event": "opened" },
            this._startTime));

        super.initializeOptions($.extend({
            dialogClass: "child-process-creation-dialog",
            title: Utils_String.format(adminResources.CreateInheritedProcess, this._parentName),
            buttons: {
                nextButton: {
                    id: this._createButtonId,
                    text: adminResources.CreateProcess,
                    click: () => { this._createProcess(); }
                },
                cancelButton: {
                    id: 'cancel',
                    text: adminResources.Cancel,
                    click: () => { this._cancel(); }
                }
            },
            height: 525,
            minHeight: 385,
            minWidth: 580,
            resizable: false
        }, options));
    }

    private _cancel(e?: JQueryEventObject): void {
        var endTime: number = new Date().getTime();
        var elapsed: number = endTime - this._startTime;
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            Admin.CustomerIntelligenceConstants.Process.AREA,
            'ChildProcessCreationDialog',
            { "event": "canceled" },
            endTime, elapsed));
        this.onCancelClick(e);
    }

    protected _populateDialog(): void {
        $('#parent-name-label').text(Utils_String.htmlEncode(this._parentName));

        this._errorPanel = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(
            Notifications.MessageAreaControl, $('#warning-wrapper'));
        this._nameError = $('#error-message', this._element);
        this._nameField = $('#inheritedProcessName', this._element);

        this._descriptionField = $('#inheritedProcessDescription', this._element);

        AdminControlFactory.createLearnMoreLinkBlock(
            $('.create-inherited-input-section', this._element), adminResources.ProcessInheritanceLink, adminResources.ProcessInheritanceLinkTitle);

        var validation = (e) => { this.validateNameAndUpdateUI(e); };
        var $createButton: JQuery = $('#' + this._createButtonId, this._element.parent());
        this._nameField.focus()
            .change(validation)
            .keyup(validation)
            .keyup(function (e?: JQueryEventObject) {
                // If enter pressed
                if (e.which === Utils_UI.KeyCode.ENTER && !$createButton.attr('disabled')) {
                    $createButton.click();
                }
            });
        this._descriptionField
            .change(validation)
            .keyup(validation);
        var that = this;
        $('.help-box', this._element).first().find('a').click(function () {
            var endTime: number = new Date().getTime();
            var elapsed: number = endTime - that._startTime;
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.AREA,
                'ChildProcessCreationDialog',
                { "event": "help" },
                endTime, elapsed));
        });
        $createButton.button('disable');
    }

    private validateNameAndUpdateUI(e?: JQueryEventObject): void {
        if (e.which === Utils_UI.KeyCode.ENTER) {
            return;
        }
        var errorMsg = TFS_Admin_Common.AdminUIHelper.validateProcessName(this._nameField.val(), this._getProcesses());
        var $createButton: JQuery = $('#' + this._createButtonId, this._element.parent());
        if (errorMsg) {
            this._setNameError(errorMsg);
            $createButton.button('disable');
            return;
        } else {
            this._setNameError('');
            $createButton.button('enable');
        }
        var processes: ProcessTemplateSource.Process[] = this._getProcesses();
        for (var i in processes) {
            if (processes[i].Name.toLowerCase() === this._nameField.val().toLowerCase()) {
                this._setNameError(adminResources.NameMustBeUnique);
                $createButton.button('disable');
                return;
            }
        }
        if (!TFS_Admin_Common.AdminUIHelper.isNameValid(this._nameField.val())) {
            this._setNameError(adminResources.IllegalCharacters);
            $createButton.button('disable');
            return;
        }
        this._setNameError('');
        $createButton.button('enable');
    }

    private _setNameError(errorMsg?: string) {
        if (errorMsg) {
            this._nameError.text(errorMsg);
            this._nameField.addClass('errored-field');
        } else {
            this._nameError.text('');
            this._nameField.removeClass('errored-field');
        }
    }

    public static isExistingReferenceName(processes: ProcessTemplateSource.Process[], refName: string): boolean {
        for (var i in processes) {
            if (refName === processes[i].ReferenceName) {
                return true;
            }
        }
        return false;
    }

    /**
     * remove spaces dashes and nonascii characters from params to create referenceName with disambiguation index suffix
     * Default value if account name is all spaces dashes and unicode
     * 
     * @param index can be passed if some numbers should be skipped, ie pass 2 if 1 should not be used
     */
    public static makeReferenceName(account: string, processName: string, getProcesses: () => ProcessTemplateSource.Process[], index?: number) {
        account = account.replace(/[ \-]|[^\x00-\x7F]/g, '') || 'Custom';
        processName = processName.replace(/[ \-]|[^\x00-\x7F]/g, '');
        index = index || 0; //Disambiguation factor (Process1 vs Process2)
        if (!processName) { // Default value if process is all spaces dashes and unicode
            processName = 'Process';
            index = index || 1;
        }
        var referenceName: string = account + '.' + processName;

        var processes: ProcessTemplateSource.Process[] = getProcesses();
        while (ChildProcessCreationDialog.isExistingReferenceName(processes, referenceName + (!index ? '' : '_' + index))) {
            index++;
        }
        return referenceName + (!index ? '' : '_' + index);
    }

    private _createProcess(e?: JQueryEventObject): void {
        $('#' + this._createButtonId, this._element.parent()).button('disable'); // prevent multiple calls

        var childName: string = this._nameField.val();
        var childDescription: string = this._descriptionField.val();

        var referenceName = ChildProcessCreationDialog.makeReferenceName(this._accountName, this._nameField.val(), this._getProcesses);

        var canMigrate: boolean = true;
        var processes: ProcessTemplateSource.Process[] = this._getProcesses();
        for (var i in processes) {
            if (processes[i].Name === this._parentName && processes[i].SubscribedProjectCount === 0) {
                canMigrate = false;
                break;
            }
        }

        TFS_Core_Ajax.postHTML(this._tfsContext.getActionUrl('AddInheritedProcess', 'process', { area: 'api' }),
            { name: childName, referenceName: referenceName, description: childDescription, parentTypeId: this._parentId },
            () => {
                this._populate(childName);
                this.onClose();

                var endTime: number = new Date().getTime();
                var elapsed: number = endTime - this._startTime;
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    Admin.CustomerIntelligenceConstants.Process.AREA,
                    'ChildProcessCreationDialog',
                    { "event": "completed" },
                    endTime, elapsed));
                var options: ProcessSuccessDialog.Options = {
                    title: adminResources.CreateProcess,
                    header: adminResources.InheritedProcessCreated,
                    description: Utils_String.format(adminResources.ProcessCreated, childName),
                    processName: childName,
                    getProcesses: this._getProcesses,
                    populate: this._populate,
                    buttons: null,
                    tfsContext: this._tfsContext
                }
                this._successCallback(childName);
                Dialogs.Dialog.show(ProcessSuccessDialog, options);
            },
            (data) => {
                this._errorPanel.setMessage(data.message, Notifications.MessageAreaType.Error);
                data['event'] = 'error';
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    Admin.CustomerIntelligenceConstants.Process.AREA,
                    'ChildProcessCreationDialog',
                    data, new Date().getTime()));
            },
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: this.getElement()
                }
            });
    }
}

export class ProcessPermissions {
    private static _permissionsCache: { [id: string]: any; } = {};

    static beginGetProcessPermissions(tfsContext: any, processTypeId: string, callback: IResultCallback, errorCallback: IErrorCallback, target?: JQuery): any {
        var that = this;

        if (this._permissionsCache[processTypeId]) {
            callback(this._permissionsCache[processTypeId]);
            return;
        }

        var ajaxOptions: TFS_Core_Ajax.IAjaxRequestContextOptions = null;
        if (target) {
            ajaxOptions = {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: target
                }
            };
        }

        return TFS_Core_Ajax.getMSJSON(
            tfsContext.getActionUrl("GetPermissions", "Process", { area: "api" }),
            { templateTypeId: processTypeId },
            (data) => {
                if (data.errorMessage) {
                    throw data.errorMessage;
                }
                that._permissionsCache[processTypeId] = data;
                callback(data);
            },
            errorCallback,
            ajaxOptions
        );
    }
}

export module ChildProcessCreationDialog {
    export interface Options extends Dialogs.IDialogOptions {
        /** Name field of parent process */
        parentName: string;
        /** Guid id of parent process */
        parentId: string;
        /** Method that refreshes the grid with the current processes from the server */
        populate: (processName?: string) => void;
        /** Method that returns the current processes */
        getProcesses: () => ProcessTemplateSource.Process[];
        /** User permission flag */
        canCreate: boolean;
        /** Used for creating reference field */
        accountName: string;
        /** Contains methods used by the dialog */
        tfsContext: TFS_Host_TfsContext.TfsContext;
        /** callback invoked after success */
        successCallback: (processName?: string) => void;
    }
}

/** export for testing */
export function getCollectionProcessActionUrl(tfsContext: TFS_Host_TfsContext.TfsContext, action: string, area: string): string {
    return tfsContext.getActionUrl(action, 'process', { area: area });
}

export class SelectMigrateTargetDialog extends Dialogs.ModalDialogO<AdminDialogOptions> {
    private _startTime: number;

    private _systemProcessName: string;
    private _processIdToNameMap;
    private _toSystem: boolean;
    private _processName: string;
    private _projectId: string;
    private _projectName: string;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _refresh: () => void;
    private _processNameCallback: (processName: string) => void;
    private _errorPanel;

    private _names: string[];
    private _selectProcess: Combos.Combo;

    public initialize(): void {
        var that = this;
        this._options.url = getCollectionProcessActionUrl(this._tfsContext, 'SelectMigrateTargetDialog', 'admin');
        this._options.urlParams = {
            projectId: that._projectId
        };
        this._options.success = function () {
            that._beginPopulateDialog();
        };

        super.initialize();
    }

    private _beginPopulateDialog() {
        var that = this;
        TFS_Core_Ajax.getMSJSON(getCollectionProcessActionUrl(this._tfsContext, 'GetMigrateTargetDialogInfo', 'admin'),
            { projectId: this._projectId },
            function (data) {
                that._systemProcessName = data.SystemProcessName;
                that._toSystem = data.ToSystem;
                that._processIdToNameMap = data.ProcessIdToNameMap;
                that._populateDialog();
            }, function (error) {
                this._errorPanel.setMessage(error.message, Notifications.MessageAreaType.Error);
            },
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: that._element.closest('.modal-dialog')
                }
            });
    }

    public initializeOptions(options?: SelectMigrateTargetDialog.Options): void {
        this._processName = options.processName;
        this._projectId = options.projectId;
        this._projectName = options.projectName;
        this._tfsContext = options.tfsContext;
        this._refresh = options.refresh;

        if (options.processNameCallback) {
            this._processNameCallback = options.processNameCallback;
        }

        this._startTime = new Date().getTime();
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            Admin.CustomerIntelligenceConstants.Process.AREA,
            'SelectMigrateTargetDialog',
            { "event": "open" },
            this._startTime));

        super.initializeOptions($.extend({
            dialogClass: "select-migrate-target-dialog",
            title: adminResources.ChangeProcess,
            buttons: {
                migrateSelected: {
                    id: 'change',
                    text: adminResources.DialogOkButton,
                    click: () => { this._change(); }
                },
                cancelButton: {
                    id: 'cancel',
                    text: adminResources.Cancel,
                    click: () => { this._cancel(); }
                }
            },
            height: 300,
            minHeight: 290,
            minWidth: 600
        }, options));
    }

    private _populateDialog(): void {
        this._errorPanel = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl,
            $('#warning-box-wrapper', this._element));
        $('#parent-name', this._element).text(Utils_String.htmlEncode(this._systemProcessName));

        AdminControlFactory.createLearnMoreLinkBlock(
            $('.admin-dialog-pad-sides', this._element), adminResources.ProjectMigrationLink, adminResources.ProjectMigrationLinkTitle);

        this._names = [];
        for (var i in this._processIdToNameMap) {
            this._names.push(this._processIdToNameMap[i].Value);
        }

        if (!this._toSystem) {
            this._selectProcess = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $('#project-selector', this._element), {
                source: this._names,
                id: 'combolist-box',
                dropOptions: {
                    id: 'drop-menu'
                },
                //TODO use options not js to set width
                dropShow: function (drop: Combos.ComboListBehavior) {
                    $('#drop-menu', this._element).width($('#combolist-box', this._element).width())
                        //Now that the dimensions change it needs to be moved right
                        .offset({
                            left: $('#combolist-box', this._element).offset().left,
                            top: $('#drop-menu', this._element).offset().top
                        });
                },
                dataSource: new Combos.ListDataSource(this._names)
            });

            this._selectProcess._bind('change', () => {
                if (this._selectProcess.getSelectedIndex() >= 0) {
                    $('#change', this._element.parent()).button('enable');
                } else {
                    $('#change', this._element.parent()).button('disable');
                }
            });

            this._selectProcess.setSelectedIndex(0);
        }

        if (this._names.length == 0) {
            $('#change', this._element.parent()).button('disable');
        }

        $('.help-box', this._element).first().find('a').click(() => {
            var endTime: number = new Date().getTime();
            var elapsed: number = endTime - this._startTime;
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.AREA,
                'SelectMigrateTargetDialog',
                { "event": "help" },
                endTime, elapsed));
        });

        $('#cancel', this._element.parent()).focus();
    }

    private _change(e?: JQueryEventObject): void {

        var targetName: string;
        var targetId: string;

        if (!this._toSystem) {
            var idx = this._selectProcess.getSelectedIndex();
            console.log('idx: ' + idx);
            targetName = this._names[idx];
        }
        else {
            targetName = this._systemProcessName;
        }

        // find the targetId
        for (var i in this._processIdToNameMap) {
            if (this._processIdToNameMap[i].Value == targetName) {
                targetId = this._processIdToNameMap[i].Key;
                break;
            }
        }

        // migrate the project process
        this._changeProcess(e, targetName, targetId);

        this.onCancelClick(e);

        var endTime: number = new Date().getTime();
        var elapsed: number = endTime - this._startTime;
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            Admin.CustomerIntelligenceConstants.Process.AREA,
            'SelectMigrateTargetDialog',
            { "event": "completed" },
            endTime, elapsed));
    }

    private _cancel(e?: JQueryEventObject): void {
        var endTime: number = new Date().getTime();
        var elapsed: number = endTime - this._startTime;
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            Admin.CustomerIntelligenceConstants.Process.AREA,
            'SelectMigrateTargetDialog',
            { "event": "canceled" },
            endTime, elapsed));
        this.onCancelClick();
    }

    private _changeProcess(e: JQueryEventObject, targetProcessName: string, targetProcessId: string): void {
        //Setup the post data for parent => child
        var migrationList = [];
        migrationList.push({
            newProcessTypeId: targetProcessId,
            projectId: this._projectId
        });

        TFS_Core_Ajax.postMSJSON(getCollectionProcessActionUrl(this._tfsContext, 'MigrateProjectsProcess', 'api'),
            { migratingProjects: Utils_Core.stringifyMSJSON(migrationList) }, (data) => {
                this._refresh();

                var endTime: number = new Date().getTime();
                var elapsed: number = endTime - this._startTime;
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    Admin.CustomerIntelligenceConstants.Process.AREA,
                    'MigrateProjectsDialog',
                    { "event": "completed" },
                    endTime, elapsed));

                if (data && data.length > 0) {
                    // Exceptions were returned
                    var message = Utils_String.format(adminResources.MigrationFailedMessage, data.length);
                    for (var entry in data) {
                        message += data[entry].projectName + ': ' + data[entry].exception.message + ' ';
                    }
                    this._errorPanel.setMessage(message, Notifications.MessageAreaType.Error);
                }
                else {
                    this.onCancelClick(e);

                    // Call the update processName callback, if present
                    if (this._processNameCallback) {
                        this._processNameCallback(targetProcessName);
                    }
                }
            }, function (error) {
                this._errorPanel.setMessage(error.message, Notifications.MessageAreaType.Error);
            },
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: this.getElement()
                }
            });
    }
}

export module SelectMigrateTargetDialog {
    export interface Options {
        projectName: string;
        projectId: string;
        processName: string;
        refresh: () => void;
        tfsContext: TFS_Host_TfsContext.TfsContext;
        processNameCallback?: (processName: string) => void;
    }
}

export class MigrateProjectsDialog extends Dialogs.ModalDialogO<AdminDialogOptions> {
    private _startTime: number;

    private _targetName: string;
    private _targetId: string;
    private _populate: () => void;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    private errorPanel: Notifications.MessageAreaControl;
    protected _aProjectList: JQuery;
    protected _sProjectList: JQuery;

    private _migrateButtonId: string;
    private _leftButton: JQuery;
    private _rightButton: JQuery;

    public initialize(): void {
        var that = this;
        this._options.url = this._options.tfsContext.getActionUrl('MigrateProjectsDialog', 'process', { area: 'admin' });
        this._options.urlParams = {
            targetProcessId: this._targetId
        };
        this._options.success = function () {
            that._populateDialog();
        };
        super.initialize();
    }
    public initializeOptions(options?: MigrateProjectsDialog.Options): void {
        this._targetName = options.targetName;
        this._targetId = options.targetId;
        this._populate = options.populate;
        this._tfsContext = options.tfsContext;

        this._migrateButtonId = 'migrate-project';
        this._startTime = new Date().getTime();
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            Admin.CustomerIntelligenceConstants.Process.AREA,
            'MigrateProjectsDialog',
            { "event": "open" },
            this._startTime));

        super.initializeOptions($.extend({
            dialogClass: "migrate-project-dialog",
            title: adminResources.ChangeProcess,
            buttons: {
                migrateProjectButton: {
                    id: this._migrateButtonId,
                    text: adminResources.DialogOkButton,
                    click: () => { this._migrate(); }
                },
                cancelButton: {
                    id: 'cancel',
                    text: adminResources.Cancel,
                    click: () => { this._cancel(); }
                }
            },
            minHeight: 525,
            minWidth: 600,
            resizable: false
        }, options));
    }
    protected _populateDialog(): void {
        this.errorPanel = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl,
            $('#warning-box-wrapper', this._element));

        AdminControlFactory.createLearnMoreLinkBlock(
            $('.admin-dialog-pad-sides', this._element), adminResources.ProjectMigrationLink, adminResources.ProjectMigrationLinkTitle).addClass("bowtie");

        var runCheckButtons = () => { this.checkButtons(); };
        this._aProjectList = $('#available-list', this._element).change(runCheckButtons);
        this._sProjectList = $('#selected-list', this._element).change(runCheckButtons);
        this._leftButton = $('#left-button', this._element).click(() => { this.moveRight(); }).keyup((e?: JQueryEventObject) => {
            if (e.which === Utils_UI.KeyCode.ENTER) {
                this.moveRight();
            }
        });
        this._rightButton = $('#right-button', this._element).click(() => { this.moveLeft(); }).keyup((e?: JQueryEventObject) => {
            if (e.which === Utils_UI.KeyCode.ENTER) {
                this.moveLeft();
            }
        });

        this._aProjectList.dblclick((e) => {
            this._sProjectList.append(this._aProjectList.children()[e.currentTarget['selectedIndex']]);
            runCheckButtons();
        });
        this._aProjectList.keyup(() => { this._keyPressed(); });
        this._sProjectList.dblclick((e) => {
            this._aProjectList.append(this._sProjectList.children()[e.currentTarget['selectedIndex']]);
            runCheckButtons();
        });
        this._sProjectList.keyup(() => { this._keyPressed(); });
        $('.help-box', this._element).first().find('a').click(() => {
            var endTime: number = new Date().getTime();
            var elapsed: number = endTime - this._startTime;
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.AREA,
                'MigrateProjectsDialog',
                { "event": "help" },
                endTime, elapsed));
        });
        this.checkButtons();
    }
    private _keyPressed(e?: JQueryEventObject) {
        var actionMethod: () => void = $(e.target).attr('id') === 'available-list' ? () => { this.moveRight(); } : () => { this.moveLeft(); };
        switch (e.which) {
            case 13: //enter
                actionMethod();
                return;
            case 32: //space
                actionMethod();
                return;
            case 39: //right arrow
                this._sProjectList.focus();
                return;
            case 37: //left arrow
                this._aProjectList.focus();
                return;
        }
        console.log(e);
    }
    public checkButtons(): void {
        var children = this._aProjectList.children().toArray();

        var available: boolean = false;
        for (var i in children) {
            if ((children[i] as HTMLOptionElement).selected) {
                available = true;
            }
        }
        if (available) {
            this._leftButton.removeAttr('disabled');
        } else {
            this._leftButton.attr('disabled', '');
        }

        var selected: boolean = false;
        children = this._sProjectList.children().toArray();
        for (var i in children) {
            if ((children[i] as HTMLOptionElement).selected) {
                selected = true;
            }
        }
        if (selected) {
            this._rightButton.removeAttr('disabled');
        } else {
            this._rightButton.attr('disabled', '');
        }

        $('#' + this._migrateButtonId, this._element.parent())
            .button(this._sProjectList.children().length > 0 ? 'enable' : 'disable');
    }
    public moveRight(e?: JQueryEventObject): void {
        var children = this._aProjectList.children().toArray();
        for (var i in children) {
            if ((children[i] as HTMLOptionElement).selected) {
                $(children[i]).appendTo(this._sProjectList);
            }
        }
        this._sProjectList.focus();
        this.checkButtons();
    }
    public moveLeft(e?: JQueryEventObject): void {
        var children = this._sProjectList.children().toArray();
        for (var i in children) {
            if ((children[i] as HTMLOptionElement).selected) {
                $(children[i]).appendTo(this._aProjectList);
            }
        }
        this._aProjectList.focus();
        this.checkButtons();
    }

    protected _postMSJSON(data?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: TFS_Core_Ajax.IAjaxRequestContextOptions, multipart?: boolean):
        TFS_Core_Ajax.IAjaxRequestContext {
        return TFS_Core_Ajax.postMSJSON(this._tfsContext.getActionUrl('MigrateProjectsProcess', 'process',
            { area: 'api' }), data, callback, errorCallback, ajaxOptions, multipart);
    }

    protected _showSuccessDialog(options: ProcessSuccessDialog.Options): ProcessSuccessDialog {
        return Dialogs.show(ProcessSuccessDialog, options);
    }

    public _migrate(e?: JQueryEventObject): void {
        $('#' + this._migrateButtonId, this._element.parent()).button('disable'); // prevent multiple calls

        //Setup the post data for parent => child
        var migrationList = [];
        var projs = this._sProjectList.children().toArray();
        for (var i in projs) {
            migrationList.push({
                newProcessTypeId: this._targetId,
                projectId: (projs[i] as HTMLInputElement).value
            });
        }

        //Migrate projects
        this._postMSJSON({ migratingProjects: Utils_Core.stringifyMSJSON(migrationList) }, (data) => {
            this._populate();
            var endTime: number = new Date().getTime();
            var elapsed: number = endTime - this._startTime;
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.AREA,
                'MigrateProjectsDialog',
                { "event": "completed" },
                endTime, elapsed));

            if (data && data.length > 0) {
                // Exceptions were returned
                var message = Utils_String.format(adminResources.MigrationFailedMessage, data.length);
                for (var entry in data) {
                    message += data[entry].projectName + ': ' + data[entry].exception.message + ' ';
                }
                this.errorPanel.setMessage(message, Notifications.MessageAreaType.Error);
            }
            else {
                this.onCancelClick(e);
                var options: ProcessSuccessDialog.Options = {
                    title: adminResources.ChangeProcess,
                    processName: this._targetName,
                    header: adminResources.ProjectMigrationSuccessful,
                    description: Utils_String.format(adminResources.MigrationSucessDescription, migrationList.length, this._targetName),
                    populate: this._populate,
                    buttons: <{ [name: string]: ProcessSuccessDialog.Button }>{},
                    processTypeId: this._targetId,
                    tfsContext: this._tfsContext
                }
                this._showSuccessDialog(options);
            }
        },
            (data: any) => {
                this.errorPanel.setMessage(data.message, Notifications.MessageAreaType.Error);
                var endTime: number = new Date().getTime();
                var elapsed: number = endTime - this._startTime;
                data["event"] = "error";
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    Admin.CustomerIntelligenceConstants.Process.AREA,
                    'MigrateProjectsDialog',
                    data, endTime, elapsed));
            },
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: this.getElement()
                }
            });
    }
    private _cancel(e?: JQueryEventObject): void {
        var endTime: number = new Date().getTime();
        var elapsed: number = endTime - this._startTime;
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            Admin.CustomerIntelligenceConstants.Process.AREA,
            'MigrateProjectsDialog',
            { "event": "canceled" },
            endTime, elapsed));
        this.onCancelClick();
    }
}

export module MigrateProjectsDialog {
    export interface Options {
        /** Name of process to migrate projects to */
        targetName: string;
        /** Guid of process to migrate projects to */
        targetId: string;
        /** Function to refresh processes on the process grid */
        populate: () => void;
        tfsContext: TFS_Host_TfsContext.TfsContext;
    }
}

export class ProcessSuccessDialog extends Dialogs.ModalDialog {
    private _startTime: number;
    private _processName: string;
    private _processTypeId: string;
    private _header: string;
    private _description: string;
    private _populate: () => void;
    private _getProcesses: () => ProcessTemplateSource.Process[];
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    public initialize(): void {
        var that = this;
        this._options.url = getCollectionProcessActionUrl(this._tfsContext, 'ProcessSuccessDialog', 'admin');
        this._options.urlParams = {
            processName: that._processName
        };
        this._options.success = function () {
            that._populateDialog();
        };
        super.initialize();
    }
    public initializeOptions(options?: ProcessSuccessDialog.Options): void {
        this._processName = options.processName;
        if (options.getProcesses) {
            this._getProcesses = options.getProcesses;
        }
        if (options.processTypeId) {
            this._processTypeId = options.processTypeId;
        }
        this._populate = options.populate;
        this._header = options.header;
        this._description = options.description;
        this._tfsContext = options.tfsContext;

        this._startTime = new Date().getTime();
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            Admin.CustomerIntelligenceConstants.Process.AREA,
            'ProcessSuccessDialog',
            { "event": "open" },
            this._startTime));

        var buttons = options.buttons || {};
        // Make extra buttons close this dialog when clicked & pass the start time to them
        for (var i in buttons) {
            var that = this;
            var baseFunc = buttons[i].click;
            buttons[i].click = function () {
                that.onClose();
                baseFunc(that._startTime);
            }
        } // Add the cancel button
        buttons['cancelButton'] = {
            id: 'close',
            text: adminResources.Close,
            click: () => { this._close() }
        };
        super.initializeOptions($.extend(options, {
            buttons: buttons,
            height: 525,
            minHeight: 300,
            minWidth: 450
        }));
    }

    private _getProcessTypeId(): string {
        if (!this._processTypeId) {
            if (this._populate) {
                this._populate();
            }
            if (this._getProcesses) {
                var processes = this._getProcesses();
                for (var i in processes) {
                    var ele = processes[i];
                    if (ele.Name === this._processName) {
                        this._processTypeId = ele.TemplateTypeId;
                        break;
                    }
                }
            }
        }
        return this._processTypeId;
    }

    private _populateDialog(): void {
        $('#dialog-header', this._element).text(Utils_String.htmlEncode(this._header));
        $('#dialog-description', this._element).text(Utils_String.htmlEncode(this._description));

        if ($('#create-project', this._element)) {
            $('#create-project', this._element).click(() => {
                var endTime: number = new Date().getTime();
                var elapsed: number = endTime - this._startTime;
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    Admin.CustomerIntelligenceConstants.Process.AREA,
                    'ProcessSuccessDialog',
                    { "event": "create-project" },
                    endTime, elapsed));

                if (!this._processTypeId) {
                    this._processTypeId = this._getProcessTypeId();
                }

                MyExperiencesUrls.getCreateNewProjectUrl(
                    this._tfsContext.navigation.collection.name,
                    {
                        source: "ProcessCreation.SucceededScenario",
                        processTemplate: this._processName
                    } as IUrlParameters).then((url: string) => {
                        window.location.href = url;
                    }, (error: Error) => {
                        Dialogs.show(CreateProjectDialog, {
                            successCallback: this._populate,
                            templateTypeId: this._processTypeId
                        });
                    });
            });
        }

        if ($('#change-projects', this._element)) {
            $('#change-projects', this._element).click(() => {

                // Bug #484050: There appears to be a race condition where _getProcessTypeId() does not return before the dialog options are used.
                // Hoping the below pre-assignment will fix it.
                if (!this._processTypeId) {
                    this._processTypeId = this._getProcessTypeId();
                }

                var options: MigrateProjectsDialog.Options = {
                    targetName: this._processName,
                    targetId: this._processTypeId,
                    populate: this._populate,
                    tfsContext: this._tfsContext
                }
                Dialogs.Dialog.show(MigrateProjectsDialog, options);
                this.onClose();
            });
        }

        $('#customize-process', this._element).attr('href',
            Navigation_Services.getHistoryService().getFragmentActionLink(
                'overview', { process: this._processName }
            )
        ).click(() => {
            var endTime: number = new Date().getTime();
            var elapsed: number = endTime - this._startTime;
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                Admin.CustomerIntelligenceConstants.Process.AREA,
                'ProcessSuccessDialog',
                { "event": "customize-project" },
                endTime, elapsed));
            this.onClose();
        });
    }
    private _close(e?: JQueryEventObject): void {
        var endTime: number = new Date().getTime();
        var elapsed: number = endTime - this._startTime;
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            Admin.CustomerIntelligenceConstants.Process.AREA,
            'ProcessSuccessDialog',
            { "event": "close" },
            endTime, elapsed));
        this.onClose();
    }
}

export module ProcessSuccessDialog {
    export interface Options {
        /** Title */
        title: string;
        /** Used to create "Create Project" link */
        processName: string;
        /** The type id of the process */
        processTypeId?: string;
        /** Used to retrieve id of process if a process type id is not supplied */
        getProcesses?: () => ProcessTemplateSource.Process[];
        /** Updates process grid after project created */
        populate: () => void;
        /** Dialog header */
        header: string;
        /** Discription used in the body of the dialog */
        description: string;
        /** Optional buttons. Close button will be provided automatically */
        buttons: { [name: string]: Button };
        tfsContext: TFS_Host_TfsContext.TfsContext;
    }
    export interface Button {
        /** HTML id */
        id: string;
        /** Display text for button */
        text: string;
        /** Behavior on click. Dialog closed when this is executed
         *  @param {number} startTime When the dialog was opened
         */
        click: (startTime: number) => void;
    }
}
// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Dialogs", exports);

export class ErrorMessageDialog extends Dialogs.Dialog {
    private static DIALOG_WIDTH: number = 400;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "errorMessage-dialog",
            dynamicSize: false,
            resizable: false,
            width: ErrorMessageDialog.DIALOG_WIDTH,
            defaultButton: "ok",
            buttons: {
                "ok": {
                    id: "ok",
                    text: (options && options.okText) || adminResources.DialogOkButton,
                    click: Utils_Core.delegate(this, this.onOkClick)
                }
            }
        }, options));
    }

    public onOkClick(): any {
        this.close();
    }
}

/**
* Options for ConfirmRemoveDialog
*/
export interface IConfirmRemoveDialogOptions extends Dialogs.IConfirmationDialogOptions {
    dialogTextStrings: string[];
}

/**
 * Shows confirmation dialog
 */
export class ConfirmRemoveDialog extends Dialogs.ConfirmationDialogO<IConfirmRemoveDialogOptions> {
    constructor(options?: IConfirmRemoveDialogOptions) {
        super(options);
    }

    public initializeOptions(options?: IConfirmRemoveDialogOptions): void {
        super.initializeOptions($.extend({
            height: "auto",
            minHeight: "auto",
            width: 500,
            minWidth: 500
        }, options));
    }

    public initialize() {
        super.initialize();

        var root = this.getElement();

        var $dialogWarning = $('<table>').appendTo(root);
        var $warnTableRow = $('<tr>').appendTo($dialogWarning);
        var $warnTableImg = $('<td>').appendTo($warnTableRow).addClass("remove-dialog-warning-td");
        $('<span/>').appendTo($warnTableImg).addClass('remove-dialog-warning-icon');
        var $warnTableTxt = $('<td>').appendTo($warnTableRow).addClass("remove-dialog-warning-td");

        if (this._options && this._options.dialogTextStrings) {
            for (var i in this._options.dialogTextStrings) {
                $('<div>').addClass('admin-confirm-dialog-text').text(this._options.dialogTextStrings[i]).appendTo($warnTableTxt);
            }
        }

        this.updateOkButton(true);
    }

    public onOkClick() {
        this.onClose();
        if (this._options && $.isFunction(this._options.okCallback)) {
            this._options.okCallback();
        }
    }

    /**
     * This exists to ensure the cancel event is only handled within the confirmation dialog context.
     * Without, this dialog will close and then the edit dialog will open on the process/workitems page.
     * The declaration is found in Dialogs.d.ts:ModalDialogO
     */
    public onCancelClick(e: JQueryEventObject) {
        this.onClose();
        if (this._options && $.isFunction(this._options.cancelCallback)) {
            this._options.cancelCallback(e);
        }
    }
}
