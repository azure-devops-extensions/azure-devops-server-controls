///<amd-dependency path="jQueryUI/core"/>
///<amd-dependency path="jQueryUI/button"/>

/// <reference types="jquery" />

/// <amd-dependency path='VSS/LoaderPlugins/Css!Site' />
/// <amd-dependency path='VSS/LoaderPlugins/Css!Splitter' />

import VSS = require("VSS/VSS");
import VSS_Controls_Panels = require("VSS/Controls/Panels");
import VSS_SDK_Shim = require("VSS/SDK/Shim");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import adminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import Events_Document = require("VSS/Events/Document");
import Events_Services = require("VSS/Events/Services");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Menus = require("VSS/Controls/Menus");
import Diag = require("VSS/Diag");
import Notifications = require("VSS/Controls/Notifications");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Admin_Dialogs = require("Admin/Scripts/TFS.Admin.Dialogs");
import Utils_UI = require("VSS/Utils/UI");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Picker_Services = require("VSS/Identities/Picker/Services");
import Identities_Picker_Controls = require("VSS/Identities/Picker/Controls");

var hostConfig = TFS_Host_TfsContext.TfsContext.getDefault().configuration;
var HostTfsContext = TFS_Host_TfsContext.TfsContext;
var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;


export class PermissionsContext {

    public static parseContext(context: any): PermissionsContext {

        // Getting the JSON string serialized by the server according to the current host
        var contextElement, json;

        contextElement = $(".permissions-context", context || document);

        if (contextElement.length > 0) {
            json = contextElement.eq(0).html();

            if (json) {
                return new PermissionsContext(Utils_Core.parseMSJSON(json, false));
            }
        }

        return null;
    }

    public permissionSetId: string;
    public token: string;
    public tokenDisplayName: string;
    public customDoNotHavePermissionsText: string
    public canManageGroups: boolean;
    public canManagePermissions: boolean;
    public inheritPermissions: boolean;
    public canTokenInheritPermissions: boolean;
    public hideExplicitClearButton: boolean;
    public hideToolbar: boolean;

    /// <summary>
    /// Determines if the security dialog should allow non-collection groups to be added
    /// when running from a collection level url
    /// </summary>
    public showAllGroupsIfCollection: boolean;

    constructor(contextData: any) {
        this.permissionSetId = contextData.permissionSetId;
        this.token = contextData.token;
        this.tokenDisplayName = contextData.tokenDisplayName;
        this.customDoNotHavePermissionsText = contextData.customDoNotHavePermissionsText;
        this.canManageGroups = contextData.canManageGroups;
        this.canManagePermissions = contextData.canManagePermissions;
        this.inheritPermissions = contextData.inheritPermissions;
        this.canTokenInheritPermissions = contextData.canTokenInheritPermissions;
        this.showAllGroupsIfCollection = contextData.showAllGroupsIfCollection;
        this.hideExplicitClearButton = contextData.hideExplicitClearButton;
        this.hideToolbar = contextData.hideToolbar;
    }
}

VSS.initClassPrototype(PermissionsContext, {
    permissionSetId: null,
    token: null,
    tokenDisplayName: null,
    customDoNotHavePermissionsText: null,
    canManageGroups: null,
    canManagePermissions: null,
    inheritPermissions: null,
    canTokenInheritPermissions: null,
    hideExplicitClearButton: null
});

class PermissionUpdates {
    public TeamFoundationId: string;
    public DescriptorIdentityType: string;
    public DescriptorIdentifier: string;
    public PermissionSetId: string;
    public PermissionSetToken: string;
    public TokenDisplayName: string;
    public Updates: SettableAction[];
    public RefreshIdentities: boolean;
    public IsRemovingIdentity: boolean = false;

    constructor(teamFoundationId: string, descriptorIdentityType: string, descriptorIdentifier: string, permissionSetId: string, permissionSetToken: string) {
        this.TeamFoundationId = teamFoundationId;
        this.DescriptorIdentityType = descriptorIdentityType;
        this.DescriptorIdentifier = descriptorIdentifier;
        this.PermissionSetId = permissionSetId;
        this.PermissionSetToken = permissionSetToken;
        this.RefreshIdentities = false;
    }

    public setUpdates(updates: SettableAction[]) {
        this.Updates = updates;
    }
}

VSS.initClassPrototype(PermissionUpdates, {
    TeamFoundationId: null,
    DescriptorIdentityType: null,
    DescriptorIdentifier: null,
    PermissionSetId: null,
    PermissionSetToken: null,
    TokenDisplayName: null,
    Updates: null,
});

class SettableAction {
    public PermissionId: number;
    public PermissionBit: number;
    public NamespaceId: string;
    public Token: string;

    constructor(permissionId: number, permissionBit: number, namespaceId: string, token: string) {
        this.PermissionId = permissionId;
        this.PermissionBit = permissionBit;
        this.NamespaceId = namespaceId;
        this.Token = token;
    }
}

VSS.initClassPrototype(SettableAction, {
    PermissionId: null,
    PermissionBit: null,
    NamespaceId: null,
    Token: null
});

class Permission {
    public canEdit: boolean;
    public displayName: string;
    public explicitPermissionId: number;
    public inheritDenyOverride: boolean;
    public namespaceId: string;
    public originalPermissionId: number;
    public permissionBit: number;
    public permissionDisplayString: string;
    public permissionId: number;
    public permissionToken: string;

    constructor(context: any) {
        this.canEdit = context.canEdit;
        this.displayName = context.displayName;
        this.explicitPermissionId = context.explicitPermissionId;
        this.inheritDenyOverride = context.inheritDenyOverride;
        this.namespaceId = context.namespaceId;
        this.originalPermissionId = context.originalPermissionId;
        this.permissionBit = context.permissionBit;
        this.permissionDisplayString = context.permissionDisplayString;
        this.permissionId = context.permissionId;
        this.permissionToken = context.permissionToken;
    }
}

VSS.initClassPrototype(Permission, {
    canEdit: null,
    displayName: null,
    explicitPermissionId: null,
    inheritDenyOverride: null,
    namespaceId: null,
    originalPermissionId: null,
    permissionBit: null,
    permissionDisplayString: null,
    permissionId: null,
    permissionToken: null
});



export class SecurityServer extends TFS_Service.TfsService {

    constructor() {
        super();
    }

    public beginGetSecurityInfo(identity: TFS_Admin_Common.IIdentity, permissionsContext: PermissionsContext, waitTarget, callback: IResultCallback, errorCallback?: IErrorCallback) {
        var permissionSetId: string,
            permissionSetToken: string;

        // Start wait animation
        permissionSetId = permissionsContext.permissionSetId;
        permissionSetToken = permissionsContext.token;

        Ajax.getMSJSON(
            this.getTfsContext().getActionUrl('DisplayPermissions', 'security', { area: 'api' }),
            {
                tfid: identity.TeamFoundationId,
                descriptorIdentityType: identity.DescriptorIdentityType,
                descriptorIdentifier: identity.DescriptorIdentifier,
                permissionSetId: permissionSetId,
                permissionSetToken: permissionSetToken
            },
            (data) => {
                if ($.isFunction(callback)) {
                    callback.call(this, data);
                }
            },
            errorCallback,
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: waitTarget
                }
            });
    }
}



export class PermissionsView extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.security.permissionsview";

    public static PERMISSIONDATA: string = "permission-data";

    private _saveButton: JQuery;
    private _undoButton: JQuery;
    private _clearButton: JQuery;
    private _closeButton: JQuery;
    private _removeButton: JQuery;
    private _runningDocumentsEntry: Events_Document.RunningDocumentsTableEntry;
    private _permissionsContext: PermissionsContext;
    private _keepFocusSelector: Boolean;
    private _showAllowByPolicyWhyLink: boolean = false;

    public currentIdentity: TFS_Admin_Common.IIdentity;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />
        this._permissionsContext = options.permissionsContext;

        super.initializeOptions($.extend({
            cssClass: "permission-info vertical-fill-layout"
        }, options));

        if(this._permissionsContext.canManagePermissions) {
            this._options.canEditPermissions = true;
            this._options.isAbleToEditAtLeastOnePermission = true;
        }
    }

    public initialize() {
        var $permissionContent: JQuery;
        super.initialize();
        
        this._showAllowByPolicyWhyLink = !TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() 
            && FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.AnonymousAccessFeatureName);

        // Create wrapper elements
        this._createWrapper();

        $permissionContent = this._element.find('.permission-content');
        this._createPermissionsContent($permissionContent.find('.content'));
        this._createClearButton($permissionContent.find('.permission-link-buttons'));
        this._createActionButtons(this._element.find('.permission-actions'));
        this._keepFocusSelector = false;

        // cause a resize event
        this._element.closest('.resizeTarget').resize();

        this._setupButtons();


        this._bindEvents();

        this._runningDocumentsEntry = Events_Document.getRunningDocumentsTable().add("PermissionsView", this);
        Diag.logTracePoint("DisplayPermissions.Ready");
    }

    public _dispose() {
        Events_Document.getRunningDocumentsTable().remove(this._runningDocumentsEntry);
    }

    public isDirty(): boolean {
        return this._getPermissionsChanges().length > 0;
    }

    public getTeamFoundationId(): string {
        return this._options.TeamFoundationId;
    }

    public getHeader(): string {
        return this._options.header;
    }

    private _createWrapper() {
        var content: JQuery;

        if (this._options.header) {
            $(domElem('div'))
                .addClass('description fixed-header')
                .appendTo(this._element)
                .text(this._options.header);
        }

        content = $(domElem('div'))
            .addClass('permission-content')
            .addClass('fill-content')
            .appendTo(this._element);

        // Add content elements
        $(domElem('div'))
            .addClass('display-permissions-error-pane')
            .appendTo(content);

        $(domElem('div'))
            .addClass('content')
            .appendTo(content);

        $(domElem('div'))
            .addClass('permission-link-buttons')
            .appendTo(content);

        // Add footer
        $(domElem('div'))
            .addClass('permission-actions')
            .addClass('fixed-footer')
            .addClass('bowtie')
            .appendTo(this._element);

    }

    private _createActionButtons(container: JQuery) {
        var buttonContainer;

        if (this._options.removeEnabled === true) {
            buttonContainer = this._createButtonContainer().appendTo(container);
            this._removeButton = $(domElem('button'))
                .addClass('submit-button')
                .addClass('btn-remove')
                .attr('type', 'button')
                .text(adminResources.RemoveAction)
                .appendTo(buttonContainer);
        }

        // Create save button
        buttonContainer = this._createButtonContainer().appendTo(container);
        this._saveButton = $(domElem('button'))
            .addClass('submit-button')
            .addClass('btn-save-permissions')
            .attr('type', 'button')
            .text(adminResources.SaveChanges)
            .appendTo(buttonContainer);

        // Create undo button
        buttonContainer = this._createButtonContainer().appendTo(container);
        this._undoButton = $(domElem('button'))
            .addClass('submit-button')
            .addClass('btn-undo-changes')
            .attr('type', 'button')
            .text(adminResources.UndoChanges)
            .appendTo(buttonContainer);

        // Create close button
        buttonContainer = this._createButtonContainer().appendTo(container);
        this._closeButton = $(domElem('button'))
            .addClass('submit-button')
            .addClass('btn-close')
            .attr('type', 'button')
            .text(adminResources.Close)
            .appendTo(buttonContainer);
    }

    private _createButtonContainer(): JQuery {
        return $(domElem('div')).addClass('permission-button');
    }

    private _createClearButton(container: JQuery) {
        if (this._permissionsContext.hideExplicitClearButton) {
            return;
        }
        this._clearButton = $(domElem('a'))
            .addClass('link-clear-permissions')
            .text(adminResources.ClearExplicitPermissions)
            .attr('href', '')
            .attr('role', 'button')
            .appendTo(container);
    }

    private _createPermissionsContent(container: JQuery) {
        var table: JQuery,
            tr: JQuery,
            td: JQuery,
            a: JQuery,
            l: number,
            i: number,
            permission: any,
            aceContainer: JQuery,
            tableBody: JQuery;

        // Check for warnings
        if (this._options.autoGrantCurrentIdentity) {
            $(domElem('div'))
                .addClass('permission-warning')
                .text(adminResources.UnableToEditAdminGroup)
                .appendTo(container);
        } else if (!this._options.isAbleToEditAtLeastOnePermission) {
            $(domElem('div'))
                .addClass('permission-warning')
                .text(this._permissionsContext.customDoNotHavePermissionsText ? this._permissionsContext.customDoNotHavePermissionsText : adminResources.DoNotHavePermissions)
                .appendTo(container);
        }

        // Create Ace container
        aceContainer = $(domElem('div'))
            .addClass('ace-control')
            .addClass(this._options.canEditPermissions ? 'permissions-explicit' : 'permissions-effective')
            .appendTo(container);

        table = $(domElem('div')).addClass('permissions-table');
        tableBody = $(domElem('div')).addClass('tbody');
        tableBody.appendTo(table);
        

        if (this._options.permissions) {
            // Add permission rows
            for (i = 0, l = this._options.permissions.length; i < l; i++) {
                const permissionLabelId = `perm_label_id_${i}`;
                permission = this._options.permissions[i];
                const editable = this._options.canEditPermissions && permission.canEdit;

                // Create the row
                tr = $(domElem('div'))
                    .addClass('permission-row')
                    .addClass('tr')
                    .appendTo(tableBody);

                // Add permission as data to row
                tr.data(PermissionsView.PERMISSIONDATA, new Permission(permission));

                if (!editable) {
                    tr.addClass('permission-not-editable');
                }

                // Add displayName
                td = $(domElem('div'))
                    .addClass('permission-name-column')
                    .addClass('td')
                    .attr('id', permissionLabelId)
                    .text(permission.displayName)
                    .appendTo(tr);
                
                let permissionLabel = this._createAriaLabel(permission.displayName, permission.permissionDisplayString);
                //Add value
                td = $(domElem('div'))
                    .addClass('permission-value-column')
                    .addClass('td')
                    .addClass('accessible')
                    .text(permission.permissionDisplayString)
                    .attr({
                        "aria-label": permissionLabel,
                        "title": adminResources.PermissionTitle,
                        "role": "button",
                    })
                    .appendTo(tr);
                if (editable) {
                    td.attr("tabindex", "0");
                }
                else {
                    td.attr("aria-readonly", "true");
                }
				
                if ((permission.permissionId === 5 || permission.permissionId === 6) && this._showAllowByPolicyWhyLink) {
				    td = $(domElem('div'))
                        .addClass('system-permission-policy-column')
                        .addClass('td')
                        .appendTo(tr);

					a = $(domElem('a'))
                        .addClass('system-permission-policy-link')
                        .attr('href', adminResources.SystemPermissionPolicyFWLink)
						.attr('target', '_blank')
						.attr('tabindex', 0)
                        .text(adminResources.TracePermissionText)
                        .attr({
                            "aria-label": adminResources.WhyLabel,
                            "role": "button",
                        })
                        .appendTo(td);
                 } else if (permission.inheritDenyOverride) {
                    td.addClass('permissions-inherit-deny');

                    td = $(domElem('div'))
                        .addClass('trace-permission-column')
                        .addClass('td')
                        .attr('tabindex', 0)
                        .appendTo(tr);

                    a = $(domElem('a'))
                        .addClass('trace-permission-action')
                        .text(Utils_String.format("{0}", adminResources.TracePermissionTextForExplicitAllow))
                         .attr({
                            "aria-label": adminResources.WhyLabel,
                            "role": "button",
                        })
                        .appendTo(td);
                } else if (permission.displayTrace) {
                    td = $(domElem('div'))
                        .addClass('trace-permission-column')
                        .addClass('td')
                        .appendTo(tr);

                    a = $(domElem('a'))
                        .addClass('trace-permission-action')
                         .attr({
                            "aria-label": adminResources.WhyLabel,
                            "role": "button",
                            "tabindex": 0
                        })
                        .appendTo(td);

                    $(domElem('span'))
                        .text(adminResources.TracePermissionText)
                        .appendTo(a);
                }
            }
            table.appendTo(aceContainer);
        }
    }

    private _bindEvents() {
        // Connect the permission click event
        this._element.find('.ace-control.permissions-explicit .tr:not(.permission-not-editable) .permission-value-column').click(delegate(this, this._permissionClickEvent));

        // Hook up trace events
        this._element.find('.trace-permission-column').bind('keyup', delegate(this, this._traceKeySupport));
        this._element.find('.trace-permission-action').click(delegate(this, this._traceClicked));
        this._element.find('.permission-value-column').bind('focus', delegate(this, this._showTraceColumn));
        this._element.bind('focusout', delegate(this, this._onFocusOut));

        // Hook up the button border event
        this._element.find('.ace-control tr:not(.permission-not-editable)').bind('mouseover mouseout', delegate(this, this._showButtonBorder));

        // Hook up key input events for toggling permission value
        this._element.find('.permission-value-column').bind('keyup', delegate(this, this._permissionKeySupport));
    }

    private _clearPermissionsClicked(e?: JQueryEventObject) {
        var that: PermissionsView = this;
        this._element.find('.ace-control .tr:not(.permission-not-editable) .permission-value-column').each(function (i) {
            var permission = $(this).closest('.tr').data(PermissionsView.PERMISSIONDATA);

            // If current permission id or explicit permissionId is allow or deny, then set it to not set
            //0 -Not set, 1- Allow, 2 - Deny
            if (permission.permissionId === 1 || permission.permissionId === 2 || permission.explicitPermissionId === 1 || permission.explicitPermissionId === 2) {
                let permissionLabel = that._createAriaLabel(permission.displayName, adminResources.NotSet);
                $(this).text(adminResources.NotSet);
                $(this).attr("aria-label", permissionLabel);
                $(this).attr("title", adminResources.PermissionTitle);

                permission.permissionId = 0;

                if (permission.originalPermissionId === 0) {
                    $(this).removeClass('permission-changed-background');
                }
                else {
                    $(this).addClass('permission-changed-background');
                }



                that._saveButton.button('enable');
                that._undoButton.button('enable');
            }
        });
        
        return false;
    }

    private _removeButtonClick(e?) {

        if (!confirm(adminResources.PermissionsDialogRemoveUserConfirmation)) {
            return;
        }

        this._element.find('.ace-control .tr:not(.permission-not-editable) .permission-value-column').each(function (i) {
            var permission = $(this).closest('.tr').data(PermissionsView.PERMISSIONDATA);

            // If current permission id or explicit permissionId is allow or deny, then set it to not set
            //0 -Not set, 1- Allow, 2 - Deny
            if (permission.permissionId === 1 || permission.permissionId === 2 || permission.explicitPermissionId === 1 || permission.explicitPermissionId === 2) {
                permission.permissionId = 0;
            }
        });

        this._performSave(true, true);
    }

    private _closeButtonClicked() {
        if (window.external && ('Close' in window.external)) {
            (<any>window.external).Close();
        }
    }

    private _permissionClickEvent(e?: Event) {
        var target: JQuery = $(e.target),
            permission: Permission = target.closest('.tr').data(PermissionsView.PERMISSIONDATA),
            isDirty: boolean = false;
        
        let newPermissionDisplayString;
        switch (permission.permissionId) {
            case 1:   //allow -> deny
                newPermissionDisplayString = adminResources.Deny;
                target.html(newPermissionDisplayString);
                permission.permissionId = 2;
                break;
            case 2:   //deny -> not set or inherited allow or inherited deny
                if (permission.originalPermissionId === 3) {
                    newPermissionDisplayString = adminResources.InheritedAllow;
                    target.html(newPermissionDisplayString);
                    permission.permissionId = 3;
                } else if (permission.originalPermissionId === 4) {
                    newPermissionDisplayString = adminResources.InheritedDeny;
                    target.html(newPermissionDisplayString);
                    permission.permissionId = 4;
                } else {
                    newPermissionDisplayString = adminResources.NotSet;
                    target.html(newPermissionDisplayString);
                    permission.permissionId = 0;
                }
                break;
            case 0:   //not set -> allow
            case 3:   //inherited allow -> allow
            case 4:   //inherited deny -> allow
                newPermissionDisplayString = adminResources.Allow;
                target.html(newPermissionDisplayString);
                permission.permissionId = 1;
                break;
            default: break;
        }

        let permissionLabel = this._createAriaLabel(permission.displayName, newPermissionDisplayString);
        target.attr("aria-label", permissionLabel);
        target.attr("title", adminResources.PermissionTitle);
        Utils_Accessibility.announce(permissionLabel);

        //see if the current permission is dirty.  If so then change the class.
        if (permission.permissionId !== permission.originalPermissionId) {
            target.addClass('permission-changed-background');
        }
        else {
            target.removeClass('permission-changed-background');
        }

        // Determine if any permissions are still dirty.  If not then disable
        // the save and undo buttons.
        this._element.find('.ace-control .permission-row').each(function (i) {
            var p = $(this).data(PermissionsView.PERMISSIONDATA);

            // Only send the permission if value has changed
            if (p.originalPermissionId !== p.permissionId) {
                isDirty = true;
            }
        });

        if (isDirty) {
            this._saveButton.button('enable');
            this._undoButton.button('enable');
        } else {
            this._saveButton.button('disable');
            this._undoButton.button('disable');
        }
    }

    private _permissionKeySupport(e?: any) {
        var target: JQuery = $(e.target);
        if (e.keyCode === $.ui.keyCode.ENTER || e.keyCode === $.ui.keyCode.SPACE) {
            target.click();
        }
    }

    private _saveButtonClicked(e?: Event) {
        this._performSave();
    }

    private _performSave(refreshIdentities?: boolean, isRemovingIdentity?: boolean) {
        var permissionUpdates = new PermissionUpdates(this._options.currentTeamFoundationId, this._options.descriptorIdentityType, this._options.descriptorIdentifier, this._permissionsContext.permissionSetId, this._permissionsContext.token);
        permissionUpdates.setUpdates(this._getPermissionsChanges());
        permissionUpdates.RefreshIdentities = refreshIdentities || false;
        permissionUpdates.IsRemovingIdentity = isRemovingIdentity || false;
        this._fire('savePermissions', permissionUpdates);
    }

    private _getPermissionsChanges(): SettableAction[] {
        var permissions: SettableAction[] = [],
            count: number = 0;

        //iterate through each permission and add any that have changed
        //to collection of permission to pass to server
        this._element.find('.ace-control .permission-row').each(function (i) {
            var permission = $(this).closest('.tr').data(PermissionsView.PERMISSIONDATA),
                settableAction: SettableAction;

            // Only send the permission if value has changed
            if (permission.originalPermissionId !== permission.permissionId) {
                settableAction = new SettableAction(permission.permissionId, permission.permissionBit, permission.namespaceId, permission.permissionToken);
                permissions[count] = settableAction;
                count++;
            }
        });

        return permissions;
    }

    private _setupButtons() {
        var canEditPermissions: boolean,
            arePermissionsSet: boolean,
            isEligibleForRemove: boolean;

        // Connect the button click events
        if (this._undoButton) {
            this._undoButton.button();
            this._undoButton.button('disable');
            this._undoButton.click(delegate(this, this._undoButtonClicked));
        }

        if (this._saveButton) {
            this._saveButton.button();
            this._saveButton.button('disable');
            this._saveButton.click(delegate(this, this._saveButtonClicked));
        }

        if (this._clearButton) {
            //figure out if clear button should be enabled
            canEditPermissions = this._options.canEditPermissions;

            if (!canEditPermissions) {
                this._clearButton.hide();
            } else {
                this._clearButton.click(delegate(this, this._clearPermissionsClicked));
                this._clearButton.bind('keydown', delegate(this, this._clearButtonKeyDown));
            }
        }

        if (this._closeButton) {
            this._closeButton.click(delegate(this, this._closeButtonClicked));
            this._closeButton.button();
        }

        if (this._removeButton) {
            this._removeButton.button();
            canEditPermissions = this._options.canEditPermissions;
            isEligibleForRemove = this._options.isEligibleForRemove;

            if (!(canEditPermissions && isEligibleForRemove)) {
                this._removeButton.button('disable');
            } else {
                this._removeButton.button('enable');
                this._removeButton.click(delegate(this, this._removeButtonClick));
            }
        }
    }

    private _clearButtonKeyDown(e?: any) {
        if (e.keyCode === $.ui.keyCode.ENTER || e.keyCode === $.ui.keyCode.SPACE) {
            this._clearPermissionsClicked();
            return false;
        }
    }

    private _showButtonBorder(event: Event) {
        var closestRow: JQuery = $(event.target).closest('.tr');

        // Hide/show border around clickable button
        if (event.type === 'mouseover') {
            closestRow.find('.permission-value-column').addClass('hovered');
        }
        else {
            closestRow.find('.permission-value-column').removeClass('hovered');
        }
    }

    private _onFocusOut(event: JQueryEventObject) {
        if (!this._keepFocusSelector && this._element.has(event.relatedTarget).length === 0) {
            this._element.find('.permission-row-current').removeClass('permission-row-current');
        }
    }

    private _showTraceColumn(event: Event) {
        var target: JQuery = $(event.target),
            closestRow: JQuery = target.closest('.tr'),
            permission: Permission = closestRow.data(PermissionsView.PERMISSIONDATA);

        this._setCurrentRow(closestRow);
    }

    private _setCurrentRow(currentRow: JQuery) {
        // Remove permission-row-current
        this._element.find('.permission-row-current').removeClass('permission-row-current');

        // Mark row as current
        currentRow.addClass('permission-row-current');
    }

    private _traceClicked(e?: Event) {
        var target: JQuery = $(e.target),
            permissionUpdates: PermissionUpdates,
            permission: Permission,
            settableAction: SettableAction,
            row: JQuery;

        permissionUpdates = new PermissionUpdates(this._options.TeamFoundationId, this._options.descriptorIdentityType, this._options.descriptorIdentifier, this._permissionsContext.permissionSetId, this._permissionsContext.token);

        //set top level properties
        permissionUpdates.TokenDisplayName = this._permissionsContext.tokenDisplayName;

        // get properties of selected row
        row = target.closest('.permission-row');
        this._setCurrentRow(row);

        this._keepFocusSelector = true;
        permission = row.data(PermissionsView.PERMISSIONDATA);

        settableAction = new SettableAction(permission.permissionId, permission.permissionBit, permission.namespaceId, permission.permissionToken);
        permissionUpdates.Updates = [settableAction];
        Dialogs.show(TFS_Admin_Dialogs.TracePermissionDialog, {
            close: () => {
                this._keepFocusSelector = false;
            },
            urlParams: $.extend({
                data: Utils_Core.stringifyMSJSON(permissionUpdates)
            }, TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {})
        });
    }

    private _traceKeySupport(e?: any) {
        var target: JQuery = $(e.target),
            $traceAction: JQuery;
        if (e.keyCode === $.ui.keyCode.ENTER || e.keyCode === $.ui.keyCode.SPACE) {
            $traceAction = target.closest('a.trace-permission-action');
            $traceAction.click();

        }
    }

    private _undoButtonClicked(e?: Event) {
        this._fire('identitySelected', this.currentIdentity);
    }

    private _createAriaLabel(permissionDisplayName: string, permissionValue: string) : string{
        return Utils_String.format(adminResources.PermissionLabel, permissionDisplayName, permissionValue);
    }
}

VSS.initClassPrototype(PermissionsView, {
    _saveButton: null,
    _undoButton: null,
    _clearButton: null,
    _closeButton: null,
    _runningDocumentsEntry: null,
    _permissionsContext: null,
    currentIdentity: null
});

VSS.classExtend(PermissionsView, HostTfsContext.ControlExtensions);



export class SecurityBaseView extends Controls.BaseControl {

    public static enhancementTypeName: string = 'tfs.admin.SecurityBaseView';

    public _securityServer: SecurityServer;
    public _requestId: number;
    public _permissionsView: PermissionsView;
    public _permissionsContext: PermissionsContext;
    public _identityInfoDiv: JQuery;
    public _mainIdentityGrid: TFS_Admin_Common.MainIdentityGrid;
    public _mainIdentityGridDiv: JQuery;
    public _identitySearchControl: any; //TODO: This is jquery widget.  Need to figure out type.

    //New Admin groups UI
    public _identityPickerSearchControl: SecurityIdentitySearchControl;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();
        this._permissionsContext = PermissionsContext.parseContext(this._element);

        // Wire up a handler for identity click event.  This will fetch permissions for the selected identity.
        this._bind(this._element, 'identitySelected', (event, identity) => {
            this._onIdentitySelected(identity);
            Diag.logTracePoint('FetchIdentityData');
        });

        this._bind(this._element, 'savePermissions', (event, permissionUpdates) => {
            this._savePermissions(permissionUpdates);
        });

        this._identityInfoDiv = this._element.find('#identityInfo');
        this._mainIdentityGridDiv = this._element.find('.main-identity-grid');

        // Initializing security server
        this._securityServer = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<SecurityServer>(SecurityServer);
    }

    public _fetchSecurityInfo(_tfid: string) {
        var identity: TFS_Admin_Common.IIdentity,
            tfid: string = _tfid,
            currentRequestId: number = ++this._requestId,
            that: SecurityBaseView = this;

        function CompleteSecurityFetch(data: any) {
            if (currentRequestId !== that._requestId) {
                return;
            }
            that._completePermissionsUpdate(tfid, data);
        }

        this._identityInfoDiv.empty();
        if (tfid) {
            identity = this._mainIdentityGrid.getCurrentIdentity();
            Diag.Debug.assert(identity.TeamFoundationId === tfid, 'tfids do not match');

            this._securityServer.beginGetSecurityInfo(identity, this._permissionsContext, this._identityInfoDiv, CompleteSecurityFetch);
        } else {
            this._noIdentitySelected();
        }
    }

    public _completePermissionsUpdate(tfid: string, data: any, header?: string, setFocus?: boolean, refreshIdentities?: boolean) {
        /// <param name="tfid" type="string" />
        /// <param name="data" type="any" />
        /// <param name="header" type="any" optional="true" />
        /// <param name="setFocus" type="boolean" optional="true" />

        var identity: TFS_Admin_Common.IIdentity;

        this._identityInfoDiv.empty();

        this._permissionsView = <PermissionsView>Controls.BaseControl.createIn(PermissionsView, this._identityInfoDiv, $.extend({ header: header, removeEnabled: this._options.removeEnabled, permissionsContext: this._permissionsContext}, data));

        // Update potentially stale info
        identity = this._mainIdentityGrid.getCurrentIdentity();
        if (identity && identity.TeamFoundationId === tfid) {

            // Update display name on left-hand list
            tfid = this._permissionsView.getTeamFoundationId();
            if (tfid) {
                identity.TeamFoundationId = tfid;
            }

            this._permissionsView.currentIdentity = identity;

            // Redraw
            this._mainIdentityGrid.updateRow(this._mainIdentityGrid._selectedIndex);

            if (setFocus) {
                this._mainIdentityGrid.focus();
            }
        }
        if (this._element.closest('.no-chrome').length) {
            Controls.Enhancement.ensureEnhancement(TFS_Admin_Common.VerticalFillLayout, this._identityInfoDiv);
        }
    }

    public _setIdentityList(options?: any) {
        if (this._mainIdentityGrid) {
            $.extend(this._mainIdentityGrid._options, options);
            this._mainIdentityGrid.populate();
            if (TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
                this._identityPickerSearchControl.clear();
            }
            else {
                this._identitySearchControl.cancelSearch();
            }
        }
        else {
            var gridOptions = {
                host: $('.hub-splitter', this._element),
                isTeam: this._options.isTeam
            };

            $.extend(gridOptions, options);

            this._mainIdentityGrid = <TFS_Admin_Common.MainIdentityGrid>Controls.Enhancement.enhance(TFS_Admin_Common.MainIdentityGrid, this._mainIdentityGridDiv, gridOptions);

            if (TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled()) {
                var searchContainer = $('.identity-search-box .ip-groups-search-container', this._element);

                //Custom search for left pane (IMS groups - current and up to a collection; all directory users, materialized directory groups)
                var operationScope: Identities_Picker_Services.IOperationScope = {
                    IMS: true,
                    Source: true,
                };

                var identityType: Identities_Picker_Services.IEntityType = {
                    User: true,
                    Group: true,
                };

                var connectionType: Identities_Picker_Services.IConnectionType = {
                    successors: true,
                };

                var transformIEntityToUsableIIdentity = (entity: Identities_Picker_RestClient.IEntity): TFS_Admin_Common.IIdentity => {
                    var identity: TFS_Admin_Common.IIdentity = {
                        Description: entity.description,
                        DescriptorIdentityType: null,
                        DescriptorIdentifier: null,
                        DisplayName: entity.displayName,
                        Domain: entity.scopeName,
                        AccountName: entity.signInAddress,
                        IsWindowsUser: (entity.originDirectory.toLowerCase().trim() == TFS_Admin_Common.AdminUIHelper.ACTIVE_DIRECTORY_KEY
                            || entity.originDirectory.toLowerCase().trim() == TFS_Admin_Common.AdminUIHelper.WINDOWS_MACHINE_DIRECTORY_KEY)
                            && entity.entityType.toLowerCase() == TFS_Admin_Common.AdminUIHelper.USER_ENTITY_TYPE_KEY ? true : false,
                        IsWindowsGroup: (entity.originDirectory.toLowerCase().trim() == TFS_Admin_Common.AdminUIHelper.ACTIVE_DIRECTORY_KEY
                            || entity.originDirectory.toLowerCase().trim() == TFS_Admin_Common.AdminUIHelper.WINDOWS_MACHINE_DIRECTORY_KEY)
                            && entity.entityType.toLowerCase() != TFS_Admin_Common.AdminUIHelper.USER_ENTITY_TYPE_KEY ? true : false,
                        Errors: [],
                        FriendlyDisplayName: entity.displayName,
                        IdentityType: entity.entityType.toLowerCase(),
                        IsProjectLevel: null,
                        IsTeam: null,
                        MemberCountText: null,
                        Scope: entity.scopeName,
                        SubHeader: entity.signInAddress,
                        TeamFoundationId: entity.localDirectory && entity.localId ? entity.localId : entity.originId,
                        Warnings: [],
                        IsAadGroup: entity.originDirectory.toLowerCase().trim() == TFS_Admin_Common.AdminUIHelper.AZURE_ACTIVE_DIRECTORY_KEY && entity.entityType.toLowerCase() != TFS_Admin_Common.AdminUIHelper.USER_ENTITY_TYPE_KEY ? true : false,
                        RestrictEditingMembership: null,
                    };
                    return identity;
                };

                var cancelSearch = (): void => {
                    this._mainIdentityGrid.cancelSearch();
                };

                let controlOptions =
                    {
                        operationScope: operationScope,
                        identityType: identityType,
                        pageSize: 10,
                        callbacks: {
                            onItemSelect: (entity: Identities_Picker_RestClient.IEntity) => {
                                if (entity) {
                                    this._mainIdentityGrid.fullSearch([transformIEntityToUsableIIdentity(entity)], false);
                                } else {
                                    this._mainIdentityGrid.populate();
                                }
                            }
                        }
                    } as Identities_Picker_Controls.IIdentityPickerSearchOptions;

                if (!TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage()) {
                    controlOptions.extensionData =
                        {
                            extensionId: TFS_Admin_Common.AdminUIHelper.TFS_ADMIN_IDENTITY_PICKER_SEARCH_EXTENSION_ID,
                            projectScopeName: (tfsContext.contextData && tfsContext.contextData.project) ? tfsContext.contextData.project.name : null,
                            collectionScopeName: tfsContext.contextData && tfsContext.contextData.collection ? tfsContext.contextData.collection.name : null,
                            constraints: null,
                        };

                    this._identityPickerSearchControl = Controls.create(SecurityIdentitySearchControl, searchContainer, controlOptions);
                } else {
                    TFS_Admin_Common.AdminUIHelper.getSpsOrganizationIdentityPickerSearchClient()
                        .then((client: Identities_Picker_RestClient.CommonIdentityPickerHttpClient) => {
                            controlOptions.httpClient = client;
                            controlOptions.consumerId = TFS_Admin_Common.AdminUIHelper.FILTER_USERS_AND_GROUPS_CONSUMER_ID_ORG;

                            this._identityPickerSearchControl = Controls.create(SecurityIdentitySearchControl, searchContainer, controlOptions);
                        });
                }
            }
            else {
                this._identitySearchControl = (<any>$('.identity-search-box .identity-search-control', this._element)).IdentitySearchControl({
                    identityList: this._mainIdentityGrid
                }).data('TFS-IdentitySearchControl');
            }
        }
    }

    private _savePermissions(permissionUpdates: PermissionUpdates) {
        var currentRequestId: number = ++this._requestId;

        //make the call to save the permissions.  The return value will be
        //the current permissions for the identity.  It passes the data to server
        //as JSON but gets html in return.
        Ajax.postMSJSON(
            this._options.tfsContext.getActionUrl('ManagePermissions', 'security', { area: 'api' }),
            $.extend({
                updatePackage: Utils_Core.stringifyMSJSON(permissionUpdates)
            }, TFS_Admin_Common.AdminUIHelper.isOrganizationLevelPage() ? { isOrganizationLevel: true } : {}),
            (data) => {
                if (currentRequestId !== this._requestId) {
                    return;
                }

                if (data.licenseErrors[0]) {
                    (<Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $('.display-permissions-error-pane', this._element))).setMessage($("<div>" + data.licenseErrors[0] + "</div>"));
                    if (permissionUpdates.IsRemovingIdentity === true) {
                        // If in the process of removing a user, then don't let a license error stop the process.  Allow it to refresh the list and remove that user from it based on having no permissions.
                        this._completePermissionsUpdate(permissionUpdates.TeamFoundationId, data, this._permissionsView && this._permissionsView.getHeader(), true, permissionUpdates.RefreshIdentities);
                    }
                    return;
                }

                this._completePermissionsUpdate(permissionUpdates.TeamFoundationId, data, this._permissionsView && this._permissionsView.getHeader(), true, permissionUpdates.RefreshIdentities);

                if (data.aadErrors[0]) {
                    (<Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $('.display-permissions-error-pane', this._element))).setMessage($("<div>" + data.aadErrors[0] + "</div>"), Notifications.MessageAreaType.Warning);
                }
            },
            (error) => {
                if (currentRequestId !== this._requestId) {
                    return;
                }

                (<Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $('.display-permissions-error-pane', this._element))).setMessage(error.message);
            },
            {
                tracePoint: 'ExplicitPermissions.BtnSavePermissions.Success',
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: adminResources.ProgressPleaseWait,
                    target: this._element
                }
            }
        );
    }

    public _noIdentitySelected() {

    }

    public _onIdentitySelected(identity: TFS_Admin_Common.IIdentity) {
        this._fetchSecurityInfo(!identity ? null : identity.TeamFoundationId);
    }
}

VSS.initClassPrototype(SecurityBaseView, {
    _securityServer: null,
    _requestId: 0,
    _permissionsView: null,
    _permissionsContext: null,
    _identityInfoDiv: null,
    _mainIdentityGrid: null,
    _mainIdentityGridDiv: null,
    _identitySearchControl: null,
    _identityPickerSearchControl: null,
});

VSS.classExtend(SecurityBaseView, HostTfsContext.ControlExtensions);

let inheritanceOnCommand = "inheritance-on";
let inheritanceOffCommand = "inheritance-off";

export class SecurityView extends SecurityBaseView {

    public static enhancementTypeName: string = 'tfs.admin.SecurityView';

    private _closeButton: JQuery;
    private _onExecuteCommandDelegate: IResultCallback;
    private _toolBar: Menus.MenuBar;

    constructor(options?: any) {
        super($.extend({ removeEnabled: true }, options));

        // If we have a custom ServiceHost then use 
        // it otherwise fall back to the page context
        if (this._options.collectionServiceHost) {
            this._options.tfsContext = this._options.tfsContext.getCollectionTfsContext(this._options.collectionServiceHost);
        }
    }

    public initialize() {
        super.initialize();

        if(this._permissionsContext.hideToolbar) {
            $('.toolbar').hide();
        } else {
            // Add correct inheritance menu item
            this._toolBar = this._initializeActions();
            this._setInheritanceMenu();
        }

        // Load the identities to manage
        this._setSecurityIdentityList();

        //setup events for closing dialog
        this._bind(window.document, "keydown", delegate(this, this._onCloseCheck), true);

        //hook up menu handler
        this._onExecuteCommandDelegate = delegate(this, this._onExecuteCommand);
        Menus.menuManager.attachExecuteCommand(this._onExecuteCommandDelegate);
    }

    public _completePermissionsUpdate(tfid: string, data: any, header?: string, setFocus?: boolean, refreshIdentities?: boolean) {
        if (refreshIdentities === true) {
            this._setSecurityIdentityList();
        }
        else {
            super._completePermissionsUpdate(tfid, data, header, setFocus);
        }
    }


    public _dispose() {
        Menus.menuManager.detachExecuteCommand(this._onExecuteCommandDelegate);
        super._dispose();
    }

    private _onCloseCheck(args?: any) {
        if (args.keyCode && window.external) {
            if ((args.keyCode === $.ui.keyCode.ESCAPE) && ('Close' in window.external)) {
                (<any>window.external).Close();
            } else if ((args.keyCode === Utils_UI.KeyCode.F1) && ('Help' in window.external)) {
                (<any>window.external).Help();
            }
        }
    }

    private _onExecuteCommand(sender: any, args?: any) {
        switch (args.get_commandName()) {
            case "admin-explicit-member-permissions":
                Dialogs.show(TFS_Admin_Dialogs.AddMembersForPermissionsDialog, {
                    mainTitle: this._options.identityTitle,
                    permissionSetId: this._permissionsContext.permissionSetId,
                    permissionSetToken: this._permissionsContext.token,
                    identityPrefix: this._options.identityPrefix,
                    identityGrid: this._mainIdentityGrid,
                    identitySearchControl: TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled() ? this._identityPickerSearchControl : this._identitySearchControl,
                    tfsContext: this._options.tfsContext,
                    close: () => {
                        this._mainIdentityGrid.focus();
                    }
                });
                break;
            case "admin-explicit-tfsgroup-permissions":
                Dialogs.show(TFS_Admin_Dialogs.AddMembersForPermissionsDialog, {
                    mainTitle: this._options.identityTitle,
                    permissionSetId: this._permissionsContext.permissionSetId,
                    permissionSetToken: this._permissionsContext.token,
                    identityPrefix: this._options.identityPrefix,
                    browseGroups: true,
                    identityGrid: this._mainIdentityGrid,
                    identitySearchControl: TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled() ? this._identityPickerSearchControl : this._identitySearchControl,
                    showAllGroupsIfCollection: this._permissionsContext.showAllGroupsIfCollection,
                    tfsContext: this._options.tfsContext,
                    close: () => {
                        this._mainIdentityGrid.focus();
                    }
                });
                break;
            case "add-identity-picker-identities":
                Dialogs.show(TFS_Admin_Dialogs.AddMembersForPermissionsDialogWithPicker, {
                    identityGrid: this._mainIdentityGrid,
                    tfsContext: this._options.tfsContext,
                    onClose: () => {
                        this._mainIdentityGrid.focus();
                    }
                });
                break;
            case "inheritance-on":
                this._changeInheritance(true);
                break;
            case "inheritance-off":
                this._changeInheritance(false);
                break;
        }
    }

    private _identitySelected(event: Event, tfid: string) {
        this._closeButton = null;
        this._fetchSecurityInfo(tfid);
    }

    public _noIdentitySelected() {
        if (this._element.closest('.no-chrome').length) {
            var table: JQuery,
                tr: JQuery,
                td: JQuery,
                div: JQuery;

            table = $(domElem('table')).appendTo(this._identityInfoDiv).addClass('no-permission-info');
            tr = $(domElem('tr')).appendTo(table);
            td = $(domElem('td')).appendTo(tr);
            div = $(domElem('div')).appendTo(td).addClass('permission-button');
            this._closeButton = $(domElem('button')).appendTo(div).addClass('submit-button').attr('class', 'btn-close').text(adminResources.Close);
            this._closeButton.click(delegate(this, this._closeButtonClicked));
            this._closeButton.button();
        }
    }

    private _closeButtonClicked() {
        if (window.external && ('Close' in window.external)) {
            (<any>window.external).Close();
        }
    }

    private _initializeActions(): Menus.MenuBar {
        var mainMenu: any = [], // this should be defined in menu module
            menuItems: any = [],
            menuBar: Menus.MenuBar;

        let permissionCtx = this._permissionsContext;
        if (TFS_Admin_Common.AdminUIHelper.shouldUseNewAddDialog()) {
            mainMenu.push({
                id: "add-identity-picker-identities",
                text: adminResources.IdentityPickerDialog_AddUsersAndGroupsButtonText,
                icon: "bowtie-icon bowtie-math-plus-heavy",
                disabled: !permissionCtx.canManageGroups
            });
        } else {
            menuItems.push({
                id: "admin-explicit-member-permissions",
                text: this._options.tfsContext.isHosted ? adminResources.AddUser : adminResources.AddWindowsIdentity,
                noIcon: true,
                disabled: !permissionCtx.canManageGroups
            });
            menuItems.push({
                id: "admin-explicit-tfsgroup-permissions",
                text: tfsContext.isHosted ? adminResources.AddTfsGroupHosted : adminResources.AddTfsGroup,
                noIcon: true,
                disabled: !permissionCtx.canManageGroups
            });

            mainMenu.push({
                id: "permissions-actions",
                idIsAction: false,
                text: adminResources.AddMenuItem,
                noIcon: true,
                childItems: menuItems
            });
        }

        if (permissionCtx.canTokenInheritPermissions) {
            // If we can inherit permissions, then set menu item appropriately
            mainMenu.push({
                id: "inheritance-settings",
                idIsAction: false,
                noIcon: true,
                childItems: this._createInheritanceMenuItems(),
                text: adminResources.Inheritance
            });
        }


        // Creating the menu bar
        menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $('.toolbar', this._element),
            <Menus.MenuBarOptions>{
                selectionMode: (item: Menus.IMenuItemSpec) => {
                    return (item.id === inheritanceOnCommand || item.id === inheritanceOffCommand)
                        ? Menus.MenuSelectionMode.SingleSelect
                        : Menus.MenuSelectionMode.None;
                },
                items: mainMenu
            });

        return menuBar;
    }

    private _createInheritanceMenuItems(): Menus.IMenuItemSpec[] {
        let permissionCtx = this._permissionsContext;
        let checked = permissionCtx.inheritPermissions;

        return [{
            id: inheritanceOnCommand,
            text: adminResources.On,
            icon: checked ? 'icon-tick' : '',
            selected: checked,
            disabled: !permissionCtx.canManageGroups
        }, {
            id: inheritanceOffCommand,
            text: adminResources.Off,
            icon: checked ? '' : 'icon-tick',
            selected: !checked,
            disabled: !permissionCtx.canManageGroups
        }];
    }

    private _setInheritanceMenu() {
        var changeInheritanceAction: any = this._toolBar.getItem('inheritance-settings'),
            newText: string = this._permissionsContext.inheritPermissions ? adminResources.InheritanceEnabled : adminResources.InheritanceDisabled;

        if (changeInheritanceAction) {
            changeInheritanceAction.updateTitle(newText);

            // Update the childItems
            changeInheritanceAction.updateItems(this._createInheritanceMenuItems());
        }
    }

    private _setSecurityIdentityList() {
        Diag.logTracePoint('SecurityView._setSecurityIdentityList.started');
        this._setIdentityList({
            identityListAction: this._options.tfsContext.getActionUrl('ReadExplicitIdentitiesJson', 'security', { area: 'api' }),
            searchParams: {
                permissionSetId: this._permissionsContext.permissionSetId,
                permissionSetToken: this._permissionsContext.token
            }
        });

        if (this._options.controlManagesFocus) {
            // set focus to toolbar after grid/identity list is initially created
            let toolBarItems: Menus.MenuItem[] = this._toolBar == null ? null : this._toolBar.getItems();
            if (toolBarItems != null && toolBarItems.length > 0) {
                toolBarItems[0].focus();
            }
        }
        Diag.logTracePoint('SecurityView._setSecurityIdentityList.complete');
    }

    private _changeInheritance(enableInheritance: boolean) {
        var permissionSetId: string,
            permissionSetToken: string,
            inheritPermissions: boolean;

        //get the permission set id and token
        permissionSetId = this._permissionsContext.permissionSetId;
        permissionSetToken = this._permissionsContext.token;
        inheritPermissions = !this._permissionsContext.inheritPermissions;

        if (enableInheritance !== this._permissionsContext.inheritPermissions) {
            //make the call to save the permissions.  The return value will be
            //the current permissions for the identity.  It passes the data to server
            //as JSON but gets html in return.
            Ajax.postHTML(
                this._options.tfsContext.getActionUrl('ChangeInheritance', 'security', { area: 'api' }),
                {
                    permissionSet: permissionSetId,
                    token: permissionSetToken,
                    inheritPermissions: inheritPermissions
                },
                (data) => {
                    // It is possible that identities were added or removed so reload the list
                    this._setSecurityIdentityList();
                    this._permissionsContext.inheritPermissions = inheritPermissions;

                    //update the inheritance menu item
                    this._setInheritanceMenu();
                },
                null,
                {
                    wait: {
                        image: hostConfig.getResourcesFile('big-progress.gif'),
                        message: adminResources.ProgressPleaseWait,
                        target: this._element
                    }
                }
            );
        }
    }
}

VSS.initClassPrototype(SecurityView, {
    _closeButton: null,
    _onExecuteCommandDelegate: null,
    _toolBar: null
});

VSS.classExtend(SecurityView, HostTfsContext.ControlExtensions);

export interface SecurityDialogOptions extends Dialogs.IModalDialogOptions {
    token?: string;
    tokenDisplayVal?: string;
    permissionSet?: any;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    showAllGroupsIfCollection?: boolean;
}

export class SecurityDialog extends Dialogs.ModalDialogO<SecurityDialogOptions> {

    public static _controlType: string = 'SecurityDialog';

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />
        
        super.initializeOptions($.extend({
            cssClass: 'admin-dialog',
            width: options.width ? options.width : 800,
            height: 650,
            minWidth: 600,
            minHeight: 400,
            modal: true,
            open: function () {
                Diag.logTracePoint('SecurityDialog.OpenDialog');
            },
            cancelText: adminResources.Close
        }, options));
    }

    public initialize() {
        Diag.Debug.assertParamIsNotNull(this._options.token, 'token');
        Diag.Debug.assertParamIsNotNull(this._options.permissionSet, 'permissionSet');

        if (!this._options.tokenDisplayVal) {
            this._options.tokenDisplayVal = this._options.token;
        }

        if (!this._options.title) {
            this._options.title = Utils_String.format(adminResources.SecurityDialogTitle, this._options.tokenDisplayVal);
        }

        this._options.buttons = [this._options.buttons.cancel];
        this._element.closest('.ui-dialog').addClass('.resizeTarget');
        if (this._options.tfsContext) {
            this._options.url = this._options.tfsContext.getActionUrl('index', 'security', { area: 'admin', useApiUrl: true });
        }
        else {
            this._options.url = tfsContext.getActionUrl('index', 'security', { area: 'admin', useApiUrl: true });
        }

        this._options.urlParams = {
            permissionSet: this._options.permissionSet,
            token: this._options.token,
            tokenDisplayVal: this._options.tokenDisplayVal,
            style: 'min',
            showAllGroupsIfCollection: this._options.showAllGroupsIfCollection
        };

        this._options.error = (e) => { this.onError(e); return true; };
        super.initialize();

        $('.ui-dialog .ui-dialog-content').css('position', 'relative');
    }

    public onError(error) {
        this.getElement().empty();
        var responseText = Utils_Core.tryParseMSJSON(error.responseText, false);

        if (responseText && responseText.message) {
            $(domElem("div", "error")).appendTo(this.getElement()).text(responseText.message);
        }
    }
}

VSS_SDK_Shim.registerContent("tfs.admin.security-dialog-content", (contextData) => {
    Controls.create(VSS_Controls_Panels.AjaxPanel, contextData.$container, {
        url: tfsContext.getActionUrl('index', 'security', { area: 'admin', useApiUrl: true }),
        urlParams: {
            permissionSet: contextData.options.permissionSet,
            token: contextData.options.token,
            tokenDisplayVal: contextData.options.tokenDisplayVal,
            style: 'min',
            showAllGroupsIfCollection: contextData.options.showAllGroupsIfCollection
        }
    });
});

export class SecurityManager {

    public static create(permissionSet: string, options?: any) {
        /// <summary>Creates a security manager using the specified permissionset and options</summary>
        /// <param name="permissionSet" type="String">GUID of the security namespace</param>
        /// <param name="options" type="object">Options like scope and separator</param>
        return new SecurityManager(permissionSet, options);
    }

    private _permissionSet: any;
    public _options: any;

    constructor(permissionSet, options?) {
        this._permissionSet = permissionSet;
        this._options = options || {};
    }

    public showPermissions(token: string, tokenDisplayValue: string, title?: string, context?: TFS_Host_TfsContext.TfsContext, width?: string) {
        /// <summary>Displays the security settings in a dialog for the specified entry.</summary>
        /// <param name="token" type="String">Security token of the entry.</param>
        /// <param name="title" type="String"Title of the permissions dialog.</param>
        /// <param name="tokenDisplayValue" type="String">Dispaly Value for the security token.</param>
        var securityToken = "",
            permissionSet = this._permissionSet,
            options = this._options;

        if (options.scope) {
            securityToken += options.scope;
        }

        if (token) {

            if (securityToken) {
                // Adding separator if both scope and token exist
                securityToken += (options.separator || '/');
            }

            securityToken += token;
        }

        if (!context) {
            context = tfsContext;
        }

        Dialogs.show(SecurityDialog, {
            permissionSet: permissionSet,
            token: securityToken,
            tokenDisplayVal: tokenDisplayValue,
            title: title,
            tfsContext: context,
            width: width,

            // This flag tells the control to allow users to add all 
            // groups inside of a collection which they have access too
            showAllGroupsIfCollection: options.showAllGroupsIfCollection
        });
    }
}

export class SecurityIdentitySearchControl extends Controls.Control<Identities_Picker_Controls.IIdentityPickerSearchOptions>{
    private static DEFAULT_HEIGHT: number = 24;
    private static DEFAULT_WIDTH: number = 140;
    private _identityPickerDropdown: Identities_Picker_Controls.IdentityPickerDropdownControl;
    private _$input: JQuery;
    private _typingTimer: number;
    private _doneTypingInterval: number = 300;
    private _minimumPrefixSize: number = 3;
    private _identityPickerDropdownUniqueId: string = Math.random().toString(36).substring(5); //getting a random string

    constructor(options?: Identities_Picker_Controls.IIdentityPickerSearchOptions) {
        super(options);
    }

    public initialize() {
        super.initialize();

        var controlHeight = Math.max(this._element.innerHeight(), SecurityIdentitySearchControl.DEFAULT_HEIGHT);
        var controlWidth = Math.max(this._element.innerWidth(), SecurityIdentitySearchControl.DEFAULT_WIDTH);
        var _$wrapper: JQuery = $("<div>").addClass("identity-picker-search-box").height(controlHeight).appendTo(this._element);
        _$wrapper.bind("click", delegate(this, (event) => {
            if (!$(event.target).hasClass("identity-picker-input")) {
                this._$input.focus();
            }
        }));

        var identityTypeList: string[] = Identities_Picker_Services.ServiceHelpers.getIdentityTypeList(this._options.identityType);
        var placeholderText = this._generatePlaceHolder(identityTypeList);

        this._$input = $("<input>")
            .attr("type", "text")
            .attr("autocomplete", "off")
            .attr('placeholder', placeholderText)
            .addClass("identity-picker-input")
            .attr("role", "combobox")
            .attr("aria-autocomplete", "list")
            .attr("aria-label", placeholderText);
        this._$input.height(controlHeight).width(controlWidth).appendTo(_$wrapper);

        this._bind(this._$input, "keyup", delegate(this, this._onInputKeyUp));
        this._bind(this._$input, "blur", delegate(this, this._onInputBlur));
        this._bind(this._$input, "input", delegate(this, this._onInputChange));
        this._bind(this._$input, "click", delegate(this, this._onInputClick));

        this._identityPickerDropdown = Controls.create(Identities_Picker_Controls.IdentityPickerDropdownControl, this._element, <Identities_Picker_Controls.IIdentityPickerDropdownOptions>
            {
                pageSize: this._options.pageSize,
                onItemSelect: (item: Identities_Picker_RestClient.IEntity) => {
                    if (this._options.callbacks && this._options.callbacks.onItemSelect) {
                        this._options.callbacks.onItemSelect(item);
                    }
                    this._hideDropdown();
                },
                identityType: this._options.identityType,
                operationScope: this._options.operationScope,
                httpClient: this._options.httpClient ? this._options.httpClient : null,
                showContactCard: true,
                showMru: false,
                consumerId: this._options.consumerId ? this._options.consumerId : TFS_Admin_Common.AdminUIHelper.FILTER_USERS_AND_GROUPS_CONSUMER_ID,
                eventOptions: {
                    uniqueId: this._identityPickerDropdownUniqueId
                },
                extensionData: this._options.extensionData ? this._options.extensionData : null
            });

        this._$input.attr("aria-owns", this._identityPickerDropdown.getId());
        Events_Services.getService().attachEvent(Identities_Picker_Controls.IdentityPickerDropdownControl.UPDATE_ACTIVE_DESCENDANT_ID, delegate(this, this._updateActiveDescendantId));
    }

    public dispose() {
        Events_Services.getService().detachEvent(Identities_Picker_Controls.IdentityPickerDropdownControl.UPDATE_ACTIVE_DESCENDANT_ID, delegate(this, this._updateActiveDescendantId));

        this._identityPickerDropdown.dispose();

        super.dispose();
    }

    public clear() {
        this._$input.val("");
    }

    private _generatePlaceHolder(identityTypeList: string[]): string {
        if (this._isInArray(Identities_Picker_Services.ServiceHelpers.UserEntity, identityTypeList) && this._isInArray(Identities_Picker_Services.ServiceHelpers.GroupEntity, identityTypeList)) {
            return adminResources.SecurityIdentitySearchControl_FilterUsersGroups;
        } else if (this._isInArray(Identities_Picker_Services.ServiceHelpers.UserEntity, identityTypeList) && !this._isInArray(Identities_Picker_Services.ServiceHelpers.GroupEntity, identityTypeList)) {
            return adminResources.SecurityIdentitySearchControl_FilterUsers;
        } else if (!this._isInArray(Identities_Picker_Services.ServiceHelpers.UserEntity, identityTypeList) && this._isInArray(Identities_Picker_Services.ServiceHelpers.GroupEntity, identityTypeList)) {
            return adminResources.SecurityIdentitySearchControl_FilterGroups;
        } else {
            return adminResources.SecurityIdentitySearchControl_Filter;
        }
    }

    private _isInArray(s: string, a: string[]): boolean {
        return a.indexOf(s) >= 0;
    }

    private _showProgressCursor() {
        $(".identity-picker-input", this._element).addClass("busy-cursor");
    }

    private _stopProgressCursor() {
        $(".identity-picker-input", this._element).removeClass("busy-cursor");
    }

    private _onInputChange(e: JQueryEventObject) {
        var inputText = this._getInputText();
        if (!inputText || inputText.length < this._minimumPrefixSize) {
            this._hideDropdown();
            this._identityPickerDropdown.getIdentities(inputText ? inputText : "");
            if (!inputText && this._options.callbacks && this._options.callbacks.onItemSelect) {
                this._options.callbacks.onItemSelect(null);
            }
            return true;
        }
        var doneTyping = delegate(this, () => {
            var newInputText = this._getInputText();
            if (newInputText && newInputText.length >= this._minimumPrefixSize) {
                this._getIdentities(newInputText);
            } else {
                this._stopProgressCursor();
            }
        });
        clearTimeout(this._typingTimer);
        doneTyping.bind(this);
        this._typingTimer = setTimeout(doneTyping, this._doneTypingInterval);
        this._showProgressCursor();
        e.stopPropagation();
    }

    private _onInputClick(e: JQueryEventObject) {
        var inputText = this._getInputText();
        if (inputText && inputText.length >= this._minimumPrefixSize) {
            this._identityPickerDropdown.show();
        }
    }

    private _isDropdownHovered(): boolean {
        return (this._identityPickerDropdown.getElement()
            && $(this._identityPickerDropdown.getElement()).filter(':hover').length > 0);
    }

    private _isContactCardHovered(): boolean {
        return ($(".idcard-dialog").length > 0
            && $(".idcard-dialog").filter(':hover').length > 0);
    }

    private _onInputBlur(e: JQueryEventObject) {
        if (!this._isDropdownHovered()
            && !this._isContactCardHovered()
            && this._$input.is(':visible')
            && this._identityPickerDropdown.isVisible()) {
            this._hideDropdown();
        }
    }

    private _onInputKeyUp(e: JQueryEventObject): boolean {
        if (e.keyCode === $.ui.keyCode.ENTER) {
            var selectedItem = this._identityPickerDropdown.getSelectedItem();
            if (selectedItem && this._options.callbacks && this._options.callbacks.onItemSelect) {
                this._options.callbacks.onItemSelect(selectedItem);
                e.stopPropagation();
                this._hideDropdown();
                return false;
            }
        }
        this._identityPickerDropdown.handleKeyEvent(e);
        return true;
    }

    private _getInputText(): string {
        return this._$input.val().trim();
    }

    private _getIdentities(searchTerm: string) {
        this._identityPickerDropdown.getIdentities(searchTerm).then(() => this._stopProgressCursor(), () => this._stopProgressCursor());
    }

    private _hideDropdown() {
        this._identityPickerDropdown.hide();
        this._$input.removeAttr("aria-activedescendant");
    }

    private _updateActiveDescendantId(data: Identities_Picker_Controls.UpdateActiveDescendantEventData) {
        if (data && data.uniqueId && this._identityPickerDropdownUniqueId && this._identityPickerDropdownUniqueId === data.uniqueId) {
            this._$input.attr("aria-activedescendant", data.activeDescendantId);
        }
    }
}

Controls.Enhancement.registerEnhancement(SecurityView, '.security-view');

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Security", exports);
