///<amd-dependency path="jQueryUI/button"/>
///<amd-dependency path="jQueryUI/dialog"/>

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");

import { WitIdentityImages } from "WorkItemTracking/Scripts/Utils/WitIdentityImages";
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");

import Identities_Picker = require("VSS/Identities/Picker/Controls");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Menus = require("VSS/Controls/Menus");
import Diag = require("VSS/Diag");
import Identities_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Services = require("VSS/Identities/Picker/Services");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

import WorkItemTrackingControlsAccessories = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.Accessories");
import { getDefaultWebContext } from "VSS/Context";

let domElem = Utils_UI.domElem;

export interface IDialogButtonSetup {
    id: string;
    text: string;
    click: (e?: any) => void;
}

export interface AssignTesterSearchOptions extends Dialogs.IModalDialogOptions {
    saveCallback?: any;
}

function setDialogButtons(element: JQuery, buttons: IDialogButtonSetup[]): void {
    Dialogs.preventClickingDisabledButtons(element, buttons);
    element.dialog("option", "buttons", buttons);
}


export class AssignTesterIdentityPickerDialog extends Dialogs.ModalDialogO<AssignTesterSearchOptions> {
    public static DIALOG_WIDTH: number = 700;
    public static DIALOG_HEIGHT: number = 350;

    private static CSS_OK_BUTTON = "dialog-main-ok-button";
    private static CSS_CANCEL_BUTTON = "dialog-main-cancel-button";
    private static CSS_CLOSE_BUTTON = "dialog-main-close-button";
    private static CSS_ASSIGN_TESTER_DIALOG = "assign-single-tester-dialog";
    private static CSS_IDENTITY_DIALOG = "assign-tester-identity-dialog";
    private static CSS_SEARCH_CONTAINER = "dialog-search-container";
    private static CSS_MAIN_TABLE = "main-table";
    private static CSS_ADD_ENTITY = "add-user";
    private static CSS_DESCRIPTION = "description";

    // Consumer Id is designated Id by Identity Picker control team to track all consumers
    // https://vsowiki.com/index.php?title=Common_Identity_Picker#Consumer_IDs
    //
    private static AssignTesterSearchControl: string = "B3D83617-FEEA-40E6-B225-BB06E9AE0B50";

    private _$data: JQuery;
    private _$wrapper: any;
    private _$contentDescriptionElement: JQuery;
    private _$dataDiv: any;

    protected _identityPickerSearchControl: Identities_Picker.IdentityPickerSearchControl;
    protected _requestContext: any;

    protected _cancelButton: IDialogButtonSetup;
    protected _closeButton: IDialogButtonSetup;
    protected _saveButton: IDialogButtonSetup;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
        }, options));
    }

    public initialize() {
        super.initialize();
        this._constructDialog();
        let e: JQueryEventObject = $.Event("");
        (<any>e).type = Identities_Picker.IdentityPickerSearchControl.INVALID_INPUT_EVENT;
        this._setSaveButtonState(e);
        this._addEvents();
        this._addDialogOptions();
    }

    private _constructDialog() {
        let dataTableCell,
            dataTable, dataTableRow,
            identityPickerClassName = ".identity-picker-input",
            identityPickerId = "Identities_Picker" + Controls.getId();

        this._saveButton = {
            id: AssignTesterIdentityPickerDialog.CSS_OK_BUTTON,
            text: Utils_String.htmlEncode(Resources.SaveText),
            click: () => { this._onSaveClick(); }
        };

        this._cancelButton = {
            id: AssignTesterIdentityPickerDialog.CSS_CANCEL_BUTTON,
            text: Utils_String.htmlEncode(Resources.CancelText),
            click: () => { this._onCancelClick(); }
        };

        this._closeButton = {
            id: AssignTesterIdentityPickerDialog.CSS_CLOSE_BUTTON,
            text: Utils_String.htmlEncode(Resources.CloseText),
            click: () => { this._onCloseClick(); }
        };

        setDialogButtons(this._element, [this._saveButton, this._cancelButton]);
        this._element.css("height", AssignTesterIdentityPickerDialog.DIALOG_HEIGHT - 100);
        this._$data = $(domElem("div")).css("height", "100%")
            .addClass(AssignTesterIdentityPickerDialog.CSS_IDENTITY_DIALOG);

        this._$wrapper = $(domElem("div"))
            .append(this._$data)
            .addClass(AssignTesterIdentityPickerDialog.CSS_ASSIGN_TESTER_DIALOG)
            .css("height", "100%");

        this._element.html(this._$wrapper);

        this.setTitle(Resources.AssignTesterDialogTitle);

        this._$dataDiv = $(domElem("div")).appendTo(this._$data)
            .attr("id", "main-context");

        // Add the description
        this._$contentDescriptionElement = $(domElem("div")).appendTo(this._$dataDiv)
            .addClass(AssignTesterIdentityPickerDialog.CSS_DESCRIPTION)
            .text(Resources.AssignTesterDialogDescription || "");

        // Add the table
        dataTable = $(domElem("table")).appendTo(this._$dataDiv).addClass(AssignTesterIdentityPickerDialog.CSS_MAIN_TABLE).innerWidth(AssignTesterIdentityPickerDialog.DIALOG_WIDTH - 100);

        // Add row to table
        dataTableRow = $(domElem("tr")).appendTo(dataTable);

        // Add label
        dataTableCell = $(domElem("td")).appendTo(dataTableRow).outerWidth(150);
        $(domElem("label")).appendTo(dataTableCell)
            .attr("for", identityPickerId)
            .addClass(AssignTesterIdentityPickerDialog.CSS_ADD_ENTITY)
            .text(Resources.UserLabel);

        // Add identity picker control
        dataTableCell = $(domElem("td")).addClass(AssignTesterIdentityPickerDialog.CSS_SEARCH_CONTAINER).appendTo(dataTableRow);

        let operationScope: Identities_Services.IOperationScope = {
            IMS: true,
        };
        let identityType: Identities_Services.IEntityType = {
            User: true,
        };

        this._identityPickerSearchControl = Controls.create(
            Identities_Picker.IdentityPickerSearchControl,
            dataTableCell,
            <Identities_Picker.IIdentityPickerSearchOptions>{
                operationScope: operationScope,
                identityType: identityType,
                multiIdentitySearch: false,
                showContactCard: true,
                consumerId: AssignTesterIdentityPickerDialog.AssignTesterSearchControl,
                pageSize: 5
            });

        this._identityPickerSearchControl.focusOnSearchInput();

        $(dataTableCell).find(identityPickerClassName).attr("role", "textbox").attr("aria-label", Resources.UserLabel);
    }

    public saveIdentities(): void {
        let result = this._identityPickerSearchControl.getIdentitySearchResult();

        if (result.resolvedEntities && result.resolvedEntities.length === 1) {
            let callback = this._options.saveCallback;
            if (callback) {
                callback(result.resolvedEntities, []);
                // Close dialog and return
                this.close();
                Diag.logTracePoint("AssignTesterIdentityPickerDialog.SaveChanges.Success");
                Diag.logTracePoint("AssignTesterIdentityPickerDialog.CloseDialog");
            }
        }
    }

    private _addDialogOptions() {
        this._element.dialog("option", "beforeClose", (event) => {
            return (!this._requestContext || this._requestContext.isComplete);
        });
    }

    private _addEvents(): void {
        let that = this;
        this._bind("focusout", function (event) { that._setSaveButtonState(event); });
        this._bind(Identities_Picker.IdentityPickerSearchControl.INVALID_INPUT_EVENT, (event) => { that._setSaveButtonState(event); });
        this._bind(Identities_Picker.IdentityPickerSearchControl.VALID_INPUT_EVENT, (event) => { that._setSaveButtonState(event); });
    }

    private _onCloseClick(e?: JQueryEventObject): void {
        this.close();
        Diag.logTracePoint("AssignTesterIdentityPickerDialog.CloseDialog");
    }

    private _onCancelClick(e?: JQueryEventObject): void {
        Diag.logTracePoint("AssignTesterIdentityPickerDialog.CancelDialog");
        this.close();
    }

    private _onSaveClick(e?: JQueryEventObject): void {
        Diag.logTracePoint("AssignTesterIdentityPickerDialog.SaveChanges.Click.Start");
        this.saveIdentities();
    }

    private _setSaveButtonState(e?: JQueryEventObject): void {
        let result = this._identityPickerSearchControl.getIdentitySearchResult();
        if (e && e.type === Identities_Picker.IdentityPickerSearchControl.VALID_INPUT_EVENT) {
            this._element.siblings(".ui-dialog-buttonpane").find("#" + this._saveButton.id).button("enable");
            this._element.siblings(".ui-dialog-buttonpane").find("#" + this._saveButton.id).focus();
            this._element.siblings(".ui-dialog-buttonpane").find("#" + this._saveButton.id).select();
        }
        else if (e && e.type === "focusout" && (!result || !result.resolvedEntities || result.resolvedEntities.length === 0)) {
            this._element.siblings(".ui-dialog-buttonpane").find("#" + this._saveButton.id).button("disable");
        }
        else if (e && e.type === Identities_Picker.IdentityPickerSearchControl.INVALID_INPUT_EVENT) {
            this._element.siblings(".ui-dialog-buttonpane").find("#" + this._saveButton.id).button("disable");
        }
    }
}

export module AssignTestersChildItems {
    export function getAssignTesterChildItems(tfsContext: TFS_Host_TfsContext.TfsContext, options?: any, errorHandler?: (...args: any[]) => any): Menus.IMenuItemSpec {

        const webContext = getDefaultWebContext();
        const teamId = webContext.team ? webContext.team.id : null;

        let getChildItems: (contextInfo, callback, errorCallback) => void;

        let assignTo = (commandArgs) => {

            if (options.executeAction) {
                options.executeAction(commandArgs);
            }
            else {
                VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit"], (BulkEdit) => {
                    BulkEdit.bulkUpdateWorkItems(
                        commandArgs.tfsContext,
                        commandArgs.selectedWorkItems,
                        //TODO: update to use new helper from WITIQ to construct unique name [AAD]
                        [{ fieldName: WITConstants.CoreFieldRefNames.AssignedTo, value: Identities_Picker.EntityFactory.isStringEntityId(commandArgs.identity.entityId) ? null : TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(commandArgs.identity) }],
                        options,
                        errorHandler);
                });
            }
        };

        let getMenuItem = (entity: Identities_RestClient.IEntity) => {
            let menuItem: Menus.IMenuItemSpec = {
                id: WorkItemTrackingControlsAccessories.CommonContextMenuItems.ASSIGN_TO_ACTION_NAME,
                action: assignTo,
                "arguments": { identity: entity },
            };

            // Render a custom menu item with the new identity display control.
            let $container = $("<span>");
            let options: Identities_Picker.IIdentityDisplayOptions = {
                identityType: { User: true },
                operationScope: { Source: true }, // i.e., Query for the user in whichever source is appropriate for the account (AD, AAD, MSA, IMS, etc.).
                item: entity,
                friendlyDisplayName: entity.displayName, // Display this name until the identity is asynchronously resolved.
                size: Identities_Picker.IdentityPickerControlSize.Large, // 32px
                turnOffHover: true,
                consumerId: "063390F7-A7AA-4B34-90DC-700B688D7857"
            };
            Controls.BaseControl.create(Identities_Picker.IdentityDisplayControl, $container, options);

            $.extend(menuItem, {
                html: $container,
                showText: false,
                noIcon: true
            });

            return menuItem;
        };

        let getSearchMenuItem = () => {
            let menuItem: Menus.IMenuItemSpec = {
                id: WorkItemTrackingControlsAccessories.CommonContextMenuItems.ASSIGN_TO_ACTION_NAME,
                action: assignTo,
                "arguments": { identity: null },
            };

            let $container = $("<span>");
            let div = $("<text>").attr("type", "text").text(Resources.SearchUserChildMenuLabel).appendTo($container);

            if (teamId) {
                div.addClass("old-context-menu-text");
            }
            else {
                div.addClass("new-context-menu-text");
            }

            $.extend(menuItem, {
                html: $container,
                showText: false,
                icon: "bowtie-icon bowtie-search"
            });

            return menuItem;
        };

        getChildItems = (contextInfo, callback, errorCallback) => {
            Diag.logTracePoint("CommonContextMenuItems._getChildItems.start");
            let startTime = Date.now();

            let menuItems: Menus.IMenuItemSpec[] = [];
            if (options.addSearchUserChildMenu) {
                menuItems.push(getSearchMenuItem());
                menuItems.push({ separator: true });
            }

            if (teamId) {
                const teamAwareness = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<TFS_TeamAwarenessService.TeamAwarenessService>(TFS_TeamAwarenessService.TeamAwarenessService);
                const maxTeamSize = options.maxTeamSize ? options.maxTeamSize : 20;

                teamAwareness.beginGetTeamMembers(teamId, false, maxTeamSize).then((members: TFS_OM_Identities.ITeamFoundationIdentityData[]) => {
                    let addSeparator = true;

                    function assignToLegacy(commandArgs) {
                        if (options.executeAction) {
                            options.executeAction(commandArgs);
                        }
                        else {
                            VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit"], (BulkEdit) => {
                                BulkEdit.bulkUpdateWorkItems(
                                    commandArgs.tfsContext,
                                    commandArgs.selectedWorkItems,
                                    [{ fieldName: "System.AssignedTo", value: TFS_OM_Identities.IdentityHelper.getUniquefiedIdentityName(commandArgs.identity) }],
                                    options,
                                    errorHandler);
                            });
                        }
                    }

                    function toMenuItem(identity: TFS_Host_TfsContext.IContextIdentity) {
                        let menuItem: Menus.IMenuItemSpec = {
                            id: WorkItemTrackingControlsAccessories.CommonContextMenuItems.ASSIGN_TO_ACTION_NAME,
                            action: assignToLegacy,
                            "arguments": { identity: identity },
                        };

                        // Just render a classic menu item with the identity image as the icon.
                        $.extend(menuItem, {
                            text: identity.displayName,
                            title: TFS_OM_Identities.IdentityHelper.getFriendlyDistinctDisplayName(identity),
                            icon: function () {
                                return IdentityImage.identityImageElement(tfsContext, identity.id, null, "small", null, "");
                            },
                            cssClass: "people"
                        });

                        return menuItem;
                    }

                    menuItems.push(toMenuItem({ displayName: Resources.UnassignedTester, id: "00000000-0000-0000-0000-000000000000" } as TFS_Host_TfsContext.IContextIdentity));
                    menuItems.push(toMenuItem(tfsContext.currentIdentity));

                    $.each(members, function (i, identity: TFS_OM_Identities.ITeamFoundationIdentityData) {
                        if (identity.id !== tfsContext.currentIdentity.id) {
                            if (addSeparator) {
                                menuItems.push({ separator: true });
                                addSeparator = false;
                            }

                            menuItems.push(toMenuItem(identity));
                        }
                    });

                    callback(menuItems);

                    Diag.logTracePoint("CommonContextMenuItems.getAssignedToContextMenuItem.Complete");
                }, $.isFunction(errorHandler) ? errorHandler : errorCallback);
            } else {
                var mruService = Service.getService(Identities_Services.MruService);

                mruService.getMruIdentities(
                    <Identities_Services.IOperationScope>{ IMS: true },
                    Identities_Services.MruService.DEFAULT_IDENTITY_ID,
                    Identities_Services.MruService.DEFAULT_FEATURE_ID)
                    .then((entities: Identities_RestClient.IEntity[]) => {
                        let unassignedEntity  = Identities_Picker.EntityFactory.createStringEntity(Resources.UnassignedTester, WitIdentityImages.UnassignedImageUrl);
                        unassignedEntity.localId =  "00000000-0000-0000-0000-000000000000";
                        menuItems.push(getMenuItem(unassignedEntity));

                        //Filter out group entities
                        entities = entities.filter(e => e.active !== false && Utils_String.ignoreCaseComparer(e.entityType, Identities_Services.ServiceHelpers.UserEntity) === 0);

                        for (var entity of entities) {
                            menuItems.push(getMenuItem(entity));
                        }

                        callback(menuItems);

                        Diag.logTracePoint('CommonContextMenuItems.getAssignedToContextMenuItem.Complete');
                    }, $.isFunction(errorHandler) ? errorHandler : errorCallback);
            }
        };
        return getChildItems as any;
    }


    //}
}
