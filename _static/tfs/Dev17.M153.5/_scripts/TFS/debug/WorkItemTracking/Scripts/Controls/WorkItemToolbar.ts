import Artifacts_Constants = require("VSS/Artifacts/Constants");
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import Events_Action = require("VSS/Events/Action");
import Events_Handlers = require("VSS/Events/Handlers");
import Events_Services = require("VSS/Events/Services");
import FollowsService = require("Notifications/Services");
import FollowsUtils = require("WorkItemTracking/Scripts/Utils/FollowsUtils");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import Notifications = require("VSS/Controls/Notifications");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import * as VSS_Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import KeyboardShortcuts = require("VSS/Controls/KeyboardShortcuts");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Telemetry = require("VSS/Telemetry/Services");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import Utils_Clipboard = require("VSS/Utils/Clipboard");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WitFormMode = require("WorkItemTracking/Scripts/Utils/WitControlMode");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { InitialValueHelper } from "WorkItemTracking/Scripts/Utils/InitialValueHelper";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { WorkItemActions } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";
import { copyWorkItemTitleToClipboard } from "WorkItemTracking/Scripts/Utils/WorkItemTitleUtils";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemMenuBar } from "WorkItemTracking/Scripts/Controls/WorkItemMenuBar";
import { WorkItemsNavigator } from "WorkItemTracking/Scripts/Controls/WorkItemsNavigator";
import { WorkItemTemplateService } from "WorkItemTracking/Scripts/Services/WorkItemTemplateService";
import { WorkItemThrottleControl } from "WorkItemTracking/Scripts/Controls/WorkItemThrottleControl";
import { WorkItemViewActions } from "WorkItemTracking/Scripts/Utils/WorkItemViewActions";
import { WorkItemPermissionDataHelper, WorkItemPermissionActions } from "WorkItemTracking/Scripts/Utils/WorkItemPermissionDataHelper";
import { ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import AdminSendMail_Async = require("Admin/Scripts/TFS.Admin.SendMail");
import EmailWorkItems_Async = require("WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems");
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

import WITControlsRecycleBin_Async = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin");
import { RecycleBinTelemetryConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import { useWITDialogs } from "WorkItemTracking/Scripts/Utils/UseWitDialog";

const actionSvc = Events_Action.getService();
const eventSvc = Events_Services.getService();
const delegate = Utils_Core.delegate;
const getErrorMessage = VSS.getErrorMessage;
const historySvc = Navigation_Services.getHistoryService();

class StartStoryboardHelper {
    /** Opens a custom TFS URI designed to be picked up by the TFS protocol handler to create
     * a new PowerPoint storyboard using the built-in template.
     */
    public static startStoryboarding(workItemId: number, errorCallback?: IErrorCallback) {
        TFS_OM_Common.AlmUriBuilder.beginBuildCreateStoryboardUri([workItemId], (uri) => {
            TFS_OM_Common.AlmUriManager.launchUri(uri);
        }, errorCallback || VSS.handleError);
    }
}

export class WorkItemToolbar extends WorkItemThrottleControl {
    public static SAVE_AND_CLOSE_WORK_ITEM: string = "save-and-close-work-item";
    public static SAVE_WORK_ITEM: string = "save-work-item";
    public static REFRESH_WORK_ITEM = "refresh-work-item";
    public static REVERT_WORK_ITEM = "revert-work-item";
    public static DISCARD_NEW_WORK_ITEM = "discard-new-work-item";
    public static LINK_TO_NEW_WORK_ITEM = "link-to-new-work-item";
    public static COPY_WORK_ITEM = "copy-work-item";
    public static MOVE_WORK_ITEM = "move-work-item";
    public static CHANGE_WORK_ITEM_TYPE = "change-work-item-type";
    public static EMAIL_WORK_ITEM = "email-work-item";
    public static CUSTOMIZE = "customize";
    public static TOGGLE_FULL_SCREEN = "toggle-full-screen";
    public static RESTORE_WORK_ITEM = "restore-work-item";
    public static DESTROY_WORK_ITEM = "destroy-work-item";
    public static START_STORYBOARDING = "start-storyboarding";
    public static FOLLOW_WORK_ITEM = "work-item-follow";
    public static UNFOLLOW_WORK_ITEM = "work-item-unfollow";
    public static FOLLOW_WORK_ITEM_ICON = "bowtie-icon bowtie-watch-eye";
    public static UNFOLLOW_WORK_ITEM_ICON = "bowtie-icon bowtie-watch-eye-fill";
    public static FOLLOW_MENU_ITEM_CSS = "follow-item-menu-item";
    public static KEYBOARD_SHORTCUTS = "keyboard-shortcuts";
    public static ACTIONS = "actions";
    public static SAVEACTIONS = "save-actions";
    public static CUSTOMIZE_GROUPID = "customization";
    public static LAYOUT_CUSTOMIZATION_VIEW = "layout";
    public static COPY_WORK_ITEM_TITLE = "copy-work-item-title";
    public static MAX_RANK: number = 10000; // Max rank specified in Menus to sort the menu item, if the max rank is increased there then it must be one above that.

    // The timeout to wait for menu items to load their iframes. 
    // Since wit form pre-loads them we we want to give more time for them to load in case they are 
    // competing with other form items during loading. In the future, we will re-visit pre-loading
    // and then we could remove this setting
    private static WIT_CONTRIBUTION_SOURCE_TIMEOUT = 10000;

    private _workItemsNavigator: WorkItemsNavigator;
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _isResponsive: boolean;
    private _isDialog: boolean;
    private _updateCommandStatesDelegate: Function;
    private _updateFullScreenButtonIconDelegate: Function;
    private _closeWorkItemFormDialogDelegate: (disableDefaultConfirmMessage?: boolean) => void;
    private _discardWorkItemDelegate: () => void;
    private _onKeyDownDelegate: (e: JQueryEventObject) => void;
    private _followsChangedDelegate: IEventHandler;
    private _followsChangingDelegate: IEventHandler;
    private _areContributionIdsInReadonlyMode: boolean = true; // here, the default state is no contribution ids, which is what the readonly mode would have
    private _areToolbarItemsReadonly: boolean = false; // here the default state is that the toolbar items are not readonly, we only want to recreate them if we are moving to a readonly work item

    public toolbar: Menus.MenuBar;

    constructor(options?) {
        super(options);
    }

    public bind(workItem: WorkItem) {
        super.bind(workItem);
        const isReadOnly = this.workItem.isReadOnly();

        if (this.toolbar) {
            if (this._areContributionIdsInReadonlyMode !== isReadOnly) {
                let contributionIds: string[] = null;
                if (workItem.isReadOnly()) {
                    contributionIds = [];
                }
                else {
                    // if override given from options, take override. otherwise use the default toolbar contribution points
                    contributionIds = this._options.contributionIds ? this._options.contributionIds : ["ms.vss-work-web.work-item-context-menu", "ms.vss-work-web.work-item-toolbar-menu"];
                }
                this.toolbar.setContributedItemOptions(contributionIds);

            }

            // this prevents recreation of the toolbar when not required
            if (this._areToolbarItemsReadonly !== isReadOnly) {
                if (this._isResponsive) {
                    this.toolbar.updateItems(this.getResponsiveToolbarItems());
                } else {
                    this.toolbar.updateItems(this.getToolbarItems());
                }
            }
        }

        this._areContributionIdsInReadonlyMode = isReadOnly;
        this._areToolbarItemsReadonly = isReadOnly;


        if (this.changedDelegate) {
            // template service changes can affect the toolbar
            eventSvc.attachEvent(WorkItemTemplateService.EVENT_TEMPLATES_UPDATED, this.changedDelegate);
        }
        this._initializeFollowsMenuState();
    }

    public unbind(noUpdate?: boolean) {
        if (this.changedDelegate) {
            eventSvc.detachEvent(WorkItemTemplateService.EVENT_TEMPLATES_UPDATED, this.changedDelegate);
        }

        super.unbind(noUpdate);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "toolbar",  // toolbar is the shared base style for all the toolbars across site
            isResponsive: false
        }, options));
    }

    public initialize() {
        const that = this;

        const toolbarOptions: Menus.MenuOptions = $.extend({
            contributionIds: [],
            "arguments": function () {
                return {
                    workItem: that.workItem,
                    telemetry: {
                        area: CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                        feature: CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_TOOLBAR_CLICK
                    }
                };
            },
            contextInfo: {
                item: { getContributionContext: this._getContributionContext.bind(this) }
            },
            suppressInitContributions: true,
            contributionSourceTimeoutMs: WorkItemToolbar.WIT_CONTRIBUTION_SOURCE_TIMEOUT,
            executeAction: delegate(this, this.onToolbarItemClick)
        }, this._options);

        this._isResponsive = this._options.isResponsive;
        this._isDialog = this._options.isDialog === true;
        this._discardWorkItemDelegate = this._options.discardWorkItemDelegate;

        if (this._isDialog && this._options.closeWorkItemFormDialogDelegate && $.isFunction(this._options.closeWorkItemFormDialogDelegate)) {
            this._closeWorkItemFormDialogDelegate = this._options.closeWorkItemFormDialogDelegate;
        }

        this._workItemsNavigator = this._options.workItemsNavigator;
        this._element.addClass("workitem-tool-bar");

        if (this._isResponsive) {
            this.toolbar = <WorkItemMenuBar>Controls.BaseControl.createIn(WorkItemMenuBar, this._element, $.extend({
                items: this.getResponsiveToolbarItems()
            }, toolbarOptions));
        }
        else {
            this.toolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this._element, $.extend({
                items: this.getToolbarItems()
            }, toolbarOptions));
        }

        this._attachEvents();

        this._attachKeyDownHandler();
    }

    public resize(): void {
        // Resize will adjust the modern tool bar UI. It does nothing if it is on legacy mode.
        if (this._isResponsive) {
            this._resize();

            if (this._options.onResized) {
                this._options.onResized();
            }
        }
    }

    public dispose() {
        this._detachEvents();
        this._detachKeyDownHandler();

        super.dispose();
    }

    public getToolbarItems() {
        const items = [];
        const processInheritanceEnabled  = FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebaccessProcessHierarchy);
        const isMoveWorkItemEnabled = processInheritanceEnabled || FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WorkItemTrackingMove);
        const isChangeWorkItemTypeEnabled = processInheritanceEnabled || FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WorkItemTrackingChangeWorkItemType);

        const usesCommandKey = Utils_UI.KeyUtils.shouldUseMetaKeyInsteadOfControl();

        if (this._options.showWorkItemMenus !== false) {
            if (this._options.inline) {
                items.push({ id: WorkItemToolbar.SAVE_WORK_ITEM, text: this._getSaveWorkItemTitleText(), showText: false, icon: "bowtie-icon bowtie-save", hidden: true, groupId: "core" });
                items.push({ id: WorkItemToolbar.DISCARD_NEW_WORK_ITEM, showText: false, text: WorkItemTrackingResources.DiscardWorkItem, icon: "bowtie-icon bowtie-edit-delete", hidden: true, groupId: "core" });
            }

            items.push({ id: WorkItemToolbar.REFRESH_WORK_ITEM, showText: false, text: WorkItemTrackingResources.Refresh, icon: "bowtie-icon bowtie-navigate-refresh", hidden: true, groupId: "core" });
            items.push({ id: WorkItemToolbar.REVERT_WORK_ITEM, showText: false, text: WorkItemTrackingResources.WorkItemRevert, icon: "bowtie-icon bowtie-edit-undo", hidden: true, groupId: "core" });

            items.push({ id: WorkItemToolbar.COPY_WORK_ITEM_TITLE, text: WorkItemTrackingResources.CopyToClipboard, showText: false, icon: "bowtie-icon bowtie-edit-copy", hidden: true, groupId: "core" });
            if (this._getTfsContext().standardAccessMode === true) {
                items.push({ id: WorkItemToolbar.LINK_TO_NEW_WORK_ITEM, showText: false, text: WorkItemTrackingResources.NewLinkedWorkItem, icon: "bowtie-icon bowtie-work-item", hidden: true, groupId: "core" });
            }

            if (isChangeWorkItemTypeEnabled) {
                items.push({ id: WorkItemToolbar.CHANGE_WORK_ITEM_TYPE, showText: false, text: WorkItemTrackingResources.ChangeType, icon: "bowtie-icon bowtie-switch", hidden: true, groupId: "core" });
            }

            if (isMoveWorkItemEnabled) {
                items.push({ id: WorkItemToolbar.MOVE_WORK_ITEM, showText: false, text: WorkItemTrackingResources.MoveWorkItem, icon: "bowtie-icon bowtie-work-item-move", hidden: true, groupId: "core" });
            }

            items.push({ id: WorkItemToolbar.COPY_WORK_ITEM, showText: false, text: WorkItemTrackingResources.CreateCopyOfWorkItem, icon: "bowtie-icon bowtie-edit-copy", hidden: true, groupId: "core" });

            items.push({ id: WorkItemToolbar.EMAIL_WORK_ITEM, showText: false, text: WorkItemTrackingResources.EmailWorkItem, icon: "bowtie-icon bowtie-mail-message", hidden: true, groupId: "core" });

            if (WitFormMode.isFollowWorkItemEnabled(this._getTfsContext())) {
                items.push({
                    id: WorkItemToolbar.FOLLOW_WORK_ITEM,
                    showText: true,
                    text: WorkItemTrackingResources.FollowWorkItem,
                    title: WorkItemTrackingResources.FollowWorkItem,
                    icon: WorkItemToolbar.FOLLOW_WORK_ITEM_ICON,
                    groupId: "core",
                    cssClass: WorkItemToolbar.FOLLOW_MENU_ITEM_CSS,
                    hidden: false,
                    disabled: true,
                    setTitleOnlyOnOverflow: true
                });
                items.push({
                    id: WorkItemToolbar.UNFOLLOW_WORK_ITEM,
                    showText: true,
                    text: WorkItemTrackingResources.FollowingWorkItem,
                    title: WorkItemTrackingResources.FollowingWorkItem,
                    icon: WorkItemToolbar.UNFOLLOW_WORK_ITEM_ICON,
                    groupId: "core",
                    cssClass: WorkItemToolbar.FOLLOW_MENU_ITEM_CSS,
                    hidden: true,
                    setTitleOnlyOnOverflow: true
                });
            }

            items.push({ id: WorkItemToolbar.START_STORYBOARDING, showText: false, text: WorkItemTrackingResources.StartStoryboarding, icon: "bowtie-storyboard bowtie-icon ", hidden: true, groupId: "externalTools" });
            items.push({ id: WorkItemToolbar.DESTROY_WORK_ITEM, text: WorkItemTrackingResources.DestroyWorkItemDeleteButtonText, showText: false, icon: "bowtie-icon bowtie-edit-delete", hidden: true, groupId: "core" });
            items.push({ id: WorkItemToolbar.RESTORE_WORK_ITEM, text: WorkItemTrackingResources.RestoreWorkItemDeleteButtonText, showText: false, icon: "bowtie-icon bowtie-recycle-bin-restore", hidden: true, groupId: "core" });

            items.push({
                id: WorkItemToolbar.CUSTOMIZE, showText: false,
                text: WorkItemTrackingResources.Customize,
                icon: "icon-customize-process",
                action: (args, event) => { // event is jqeuery event, args are nothing
                    const url =
                        this.workItem.store.getTfsContext().getActionUrl("_process", "admin", {
                            project: ""
                        });

                    const openInNewTab = event.ctrlKey;

                    let fragment: string;
                    if (this.workItem.project.process.isInherited) { // Just landing on the workitem type page
                        fragment = Navigation_Services.getHistoryService().getFragmentActionLink("layout", {
                            "process-id": this.workItem.project.process.id,
                            "type-id": this.workItem.workItemType.referenceName
                        });
                        this._navigateToNewNav(url + fragment, true, openInNewTab);
                    }
                    else { // create inherited process and migrate project
                        fragment = Navigation_Services.getHistoryService().getFragmentActionLink("all", {
                            "launch-wizard": true,
                            "wizard-project-id": this.workItem.project.guid,
                            "wizard-process-id": this.workItem.project.process.id,
                            "wizard-wit-ref-name": this.workItem.workItemType.referenceName,
                            "wizard-project-name": this.workItem.project.name
                        });
                        this._navigateToNewNav(url + fragment, false, openInNewTab);
                    }
                },
                hidden: true,
                groupId: WorkItemToolbar.CUSTOMIZE_GROUPID,
                rank: WorkItemToolbar.MAX_RANK  // Specifying MAX_RANK to make this menu item appear at the last
            });

            items.push({
                id: WorkItemToolbar.KEYBOARD_SHORTCUTS,
                rank: WorkItemToolbar.MAX_RANK,
                text: VSS_Resources_Platform.KeyboardShortcutDialogTitle,
                showText: false,
                icon: "bowtie-icon  bowtie-status-info-outline",
                hidden: true,
                groupId: "keyboardShortcuts"
            });
        }

        if (!this._isDialog && this._options.showFullScreenMenu !== false) {
            items.push({
                id: WorkItemToolbar.TOGGLE_FULL_SCREEN,
                showText: false,
                title: Navigation.FullScreenHelper.getFullScreen() ? PresentationResources.ExitFullScreenModeTooltip : PresentationResources.EnterFullScreenModeTooltip,
                icon: Navigation.FullScreenHelper.getFullScreen() ? "bowtie-icon bowtie-view-full-screen-exit" : "bowtie-icon bowtie-view-full-screen",
                cssClass: "right-align",
                groupId: "core",
                hidden: true
            });
        }

        return items;
    }

    private _navigateToNewNav(url: string, reusedExistingCustomProcess: boolean, openInNewTab: boolean): void {
        const ciData: IDictionaryStringTo<any> = {};
        ciData["reusedExistingCustomProcess"] = reusedExistingCustomProcess;
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING_NEWNAV,
            CIConstants.WITCustomerIntelligenceFeature.CUSTOMIZE_WORKITEM,
            ciData));
        Telemetry.flush()
            .then(() => {
                if (openInNewTab) {
                    window.open(url, '_blank');
                }
                else {
                    location.href = url;
                }
            });
    }

    public getResponsiveToolbarItems() {
        let childItems = this.getToolbarItems();
        const items = [];
        // show default menu item besides ellipsis menu
        if (this._options.showWorkItemMenus !== false) {
            this._addSaveToolbarButtons(items);

            if (WitFormMode.isFollowWorkItemEnabled(this._getTfsContext())) {
                items.push({
                    id: WorkItemToolbar.FOLLOW_WORK_ITEM,
                    showText: true,
                    text: WorkItemTrackingResources.FollowWorkItem,
                    title: WorkItemTrackingResources.FollowWorkItem,
                    icon: WorkItemToolbar.FOLLOW_WORK_ITEM_ICON,
                    cssClass: WorkItemToolbar.FOLLOW_MENU_ITEM_CSS,
                    hidden: false,
                    disabled: true,
                    setTitleOnlyOnOverflow: true
                });
                items.push({
                    id: WorkItemToolbar.UNFOLLOW_WORK_ITEM,
                    showText: true,
                    text: WorkItemTrackingResources.FollowingWorkItem,
                    title: WorkItemTrackingResources.FollowingWorkItem,
                    icon: WorkItemToolbar.UNFOLLOW_WORK_ITEM_ICON,
                    cssClass: WorkItemToolbar.FOLLOW_MENU_ITEM_CSS,
                    hidden: true,
                    setTitleOnlyOnOverflow: true
                });
            }

            items.push({ id: WorkItemToolbar.REFRESH_WORK_ITEM, showText: false, text: WorkItemTrackingResources.Refresh, title: WorkItemTrackingResources.Refresh, icon: "bowtie-icon bowtie-navigate-refresh", hidden: true });
            items.push({ id: WorkItemToolbar.REVERT_WORK_ITEM, showText: false, text: WorkItemTrackingResources.WorkItemRevert, title: WorkItemTrackingResources.WorkItemRevert, icon: "bowtie-icon bowtie-edit-undo", hidden: true });
            items.push({ id: WorkItemToolbar.DESTROY_WORK_ITEM, text: WorkItemTrackingResources.DestroyWorkItemDeleteButtonText, title: WorkItemTrackingResources.DestroyWorkItemDeleteButtonText, showText: false, icon: "bowtie-icon bowtie-edit-delete", hidden: true });
            items.push({ id: WorkItemToolbar.RESTORE_WORK_ITEM, text: WorkItemTrackingResources.RestoreWorkItemDeleteButtonText, title: WorkItemTrackingResources.RestoreWorkItemDeleteButtonText, showText: false, icon: "bowtie-icon bowtie-recycle-bin-restore ", hidden: true });

        }

        // remove default menu item from ellipsis's children
        childItems = $.map(childItems, (item: any) => {
            if (items.length > 0
                && (item.id === WorkItemToolbar.SAVE_WORK_ITEM || item.id === WorkItemToolbar.REFRESH_WORK_ITEM || item.id === WorkItemToolbar.REVERT_WORK_ITEM
                    || item.id === WorkItemToolbar.RESTORE_WORK_ITEM || item.id === WorkItemToolbar.DESTROY_WORK_ITEM
                    || item.id === WorkItemToolbar.FOLLOW_WORK_ITEM || item.id === WorkItemToolbar.UNFOLLOW_WORK_ITEM)) {
                return null;
            }
            item.noIcon = false;
            item.showText = true;
            return item;
        });

        items.push(
            {
                id: WorkItemToolbar.ACTIONS,
                title: VSS_Resources_Common.ActionsTitle,
                idIsAction: false,
                icon: "bowtie-icon bowtie-ellipsis",
                hideDrop: true,
                showText: false,
                childItems: Menus.sortMenuItems(childItems)
            });

        return items;
    }

    private _addSaveToolbarButtons(items: any[]) {
        const usesCommandKey = Utils_UI.KeyUtils.shouldUseMetaKeyInsteadOfControl();
        var titleText: string = this._getSaveWorkItemTitleText();

        if (this._options.inline) {
            if (this._isDialog) {
                items.push({
                    id: WorkItemToolbar.SAVE_AND_CLOSE_WORK_ITEM,
                    text: WorkItemTrackingResources.SaveAndCloseWorkItemText,
                    title: titleText,
                    showText: true,
                    icon: "bowtie-icon bowtie-save-close bowtie-white",
                    hidden: true,
                    cssClass: "drop-down-save",
                    childItems: [{
                        id: WorkItemToolbar.SAVE_WORK_ITEM,
                        text: WorkItemTrackingResources.Save,
                        title: titleText,
                        showText: true,
                        icon: "bowtie-icon bowtie-save",
                        hidden: true,
                        cssClass: "save-work-item-menu-item"
                    }],
                    splitDropOptions: {
                        id: WorkItemToolbar.SAVEACTIONS,
                        cssClass: "drop-down-chevron",
                        title: WorkItemTrackingResources.MoreSaveOptions,
                        hidden: true,
                        noIcon: true,
                        extraOptions: {
                            align: "left-bottom"
                        }
                    }
                });
            }
            else {
                items.push({ id: WorkItemToolbar.SAVE_WORK_ITEM, text: WorkItemTrackingResources.Save, title: titleText, showText: true, icon: "bowtie-icon bowtie-save bowtie-white", hidden: true, cssClass: "drop-down-save save-only" });
            }
        }
    }

    private _getContributionContext(): any {
        if (this.workItem) {
            const movedToNewProject = (this.workItem.getFieldValue(WITConstants.CoreField.TeamProject, true) !== this.workItem.project.name);
            return {
                workItemId: this.workItem.id,
                workItemTypeName: this.workItem.workItemType.name,
                workItemAvailable: this.workItem.id > 0,
                workItemDirty: this.workItem.isDirty(),
                hideDelete: this.workItem.id < 0 || this.workItem.isDeleted(),
                tfsContext: this.workItem.store.getTfsContext(),
                closeWorkItemFormDialogDelegate: this._closeWorkItemFormDialogDelegate,
                currentProjectName: this.workItem.project.name,
                currentProjectGuid: this.workItem.project.guid,
                movedToNewProject: movedToNewProject
            };
        } else {
            return { workItemId: 0, workItemAvailable: false };
        }
    }

    public updateInternal(args?: any) {
        let workItemId = 0;
        let isDirty = false;
        let isSaving = false;
        let isValid = true;
        let isInheritedProcess = false;
        let isSystemProcess = false;
        let isCustomProcess = false;
        let canEditProcess = false;
        let hasAttachmentsPending = false;
        const isProcessHierarchyEnabled: boolean = FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebaccessProcessHierarchy);

        if (!args || args["change"] !== WorkItemChangeType.FieldChange) {
            this.toolbar.refreshContributedItems();
        }

        let isDeleted = false;
        let isNew = true;
        let isReadonly = true;
        if (this.workItem) {
            workItemId = this.workItem.getUniqueId();
            isNew = workItemId <= 0;
            isDirty = this.workItem.isDirty();
            isSaving = this.workItem.isSaving();
            isValid = this.workItem.isValid();
            hasAttachmentsPending = this.workItem.hasAttachmentsPendingUpload();
            if (this.workItem.project.process) {
                isInheritedProcess = this.workItem.project.process.isInherited;
                isSystemProcess = this.workItem.project.process.isSystem;
                isCustomProcess = !isInheritedProcess && !isSystemProcess;
                canEditProcess = this.workItem.project.process.canEditProcess;
            }
            isDeleted = this.workItem.isDeleted();
            isReadonly = this.workItem.isReadOnly();
        }

        const dataPopulated = WorkItemPermissionDataHelper.isPopulated();
        const hideDelete = !(dataPopulated && WorkItemPermissionDataHelper.hasWorkItemDeletePermission());
        const hideDestroy = !(dataPopulated && WorkItemPermissionDataHelper.hasWorkItemDestroyPermission());

        const updatedState = <any[]>[
            {
                id: WorkItemToolbar.SAVE_WORK_ITEM,
                disabled: !isDirty || !isValid || hasAttachmentsPending,
                hidden: isReadonly // it is readonly if it is deleted, so this is 
            }, {
                id: WorkItemToolbar.SAVE_AND_CLOSE_WORK_ITEM,
                disabled: !isDirty || !isValid || hasAttachmentsPending,
                hidden: isReadonly
            }, {
                id: WorkItemToolbar.SAVEACTIONS,
                disabled: !isDirty || !isValid || hasAttachmentsPending || isReadonly,
                hidden: isDeleted
            }, {
                id: WorkItemToolbar.DISCARD_NEW_WORK_ITEM,
                hidden: !isNew || isReadonly
            }, {
                id: WorkItemToolbar.REFRESH_WORK_ITEM,
                disabled: isNew,
                hidden: isDeleted
            }, {
                id: WorkItemToolbar.REVERT_WORK_ITEM,
                disabled: isNew || !isDirty || isSaving,
                hidden: isDeleted || isReadonly
            }, {
                id: WorkItemToolbar.COPY_WORK_ITEM_TITLE,
                hidden: !isReadonly
            }, {
                id: WorkItemToolbar.LINK_TO_NEW_WORK_ITEM,
                disabled: isNew,
                hidden: isDeleted || isReadonly
            }, {
                id: WorkItemToolbar.COPY_WORK_ITEM,
                disabled: isNew,
                hidden: isDeleted || isReadonly
            }, {
                id: WorkItemToolbar.MOVE_WORK_ITEM,
                disabled: isNew,
                hidden: isDeleted || isReadonly
            }, {
                id: WorkItemToolbar.CHANGE_WORK_ITEM_TYPE,
                disabled: isNew,
                hidden: isDeleted || isReadonly
            }, {
                id: WorkItemToolbar.EMAIL_WORK_ITEM,
                disabled: isNew || isSaving,
                hidden: isDeleted || isReadonly
            }, {
                id: WorkItemToolbar.KEYBOARD_SHORTCUTS,
                hidden: isDeleted
            }, {
                id: WorkItemToolbar.START_STORYBOARDING,
                disabled: isNew,
                hidden: isDeleted || isReadonly
            }, {
                id: WorkItemToolbar.CUSTOMIZE,
                hidden: isDeleted || !this.workItem || !isProcessHierarchyEnabled || isCustomProcess || isReadonly,
            }, {
                id: WorkItemToolbar.TOGGLE_FULL_SCREEN,
                hidden: this._isFullScreenIconHidden()
            }, {
                id: WorkItemToolbar.RESTORE_WORK_ITEM,
                hidden: hideDelete || !isDeleted || isNew || isReadonly
            }, {
                id: WorkItemToolbar.DESTROY_WORK_ITEM,
                hidden: hideDestroy || !isDeleted || isNew || isReadonly
            }, {
                id: "ms.vss-code-web.create-branch-menu",
                hidden: isDeleted || isNew || isReadonly
            }, {
                id: WorkItemToolbar.ACTIONS,
                hidden: isDeleted
            }];

        // this would call follow state update only at first save and avoid flickering of follow button on successive edits
        if (args && args.firstSave && args.change === WorkItemChangeType.SaveCompleted) {
            this._initializeFollowsMenuState();
        }

        this.toolbar.updateCommandStates(updatedState);

        if (this._workItemsNavigator) {
            this._updateCommandStates();
        }

        if (this._isResponsive) {
            this._resize();
        }
    }

    public executeMenuItem(menuItemId: string) {
        const menuItem: Menus.MenuItem = this.toolbar.getItem(menuItemId);
        if (menuItem && menuItem.isEnabled() && menuItem.hasAction()) {
            menuItem.execute();
        }
    }

    public onToolbarItemClick(args?: any) {
        const workItem = this.workItem;
        const controlType = this.getTypeName();
        const beginSaveCallback = $.isFunction(this._options.beginSaveCallback) ? this._options.beginSaveCallback : $.noop;
        // Use an error callback if passed. Else have a no-op error handler and allow errors to surface in the work item info bar
        const errorCallback = $.isFunction(this._options.saveErrorCallback) ? this._options.saveErrorCallback : $.noop;

        const publishToolbarButtonClicksTelemetryEvent = (action: string, fireEventImmediately?: boolean) => {

            const currentController = this._getTfsContext().navigation.currentController;
            const currentAction = this._getTfsContext().navigation.currentAction;

            Telemetry.publishEvent(
                new Telemetry.TelemetryEventData(
                    CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                    CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_TOOLBAR_CLICK,
                    {
                        "action": action,
                        "originArea": currentController + "/" + currentAction,
                        "workItemSessionId": workItem.sessionId
                    }),
                fireEventImmediately);
        };

        if (workItem) {
            const command = args.get_commandName();
            switch (command) {
                case WorkItemToolbar.SAVE_WORK_ITEM:
                    if (workItem.isDirty() && !workItem.isSaving()) {
                        beginSaveCallback(false);
                        workItem.beginSave(
                            null,
                            errorCallback,
                            "ToolbarSave");
                        publishToolbarButtonClicksTelemetryEvent("Save work item");
                    }
                    return false;

                case WorkItemToolbar.SAVE_AND_CLOSE_WORK_ITEM:
                    if (workItem.isDirty() && !workItem.isSaving()) {
                        beginSaveCallback(true);
                        workItem.beginSave(
                            () => {
                                if (this._closeWorkItemFormDialogDelegate) {
                                    this._closeWorkItemFormDialogDelegate();
                                }
                                Diag.logTracePoint(controlType + ".saveCloseComplete");
                            },
                            errorCallback,
                            "ToolbarSaveAndClose");
                        publishToolbarButtonClicksTelemetryEvent("Save and close work item");
                    }
                    return false;

                case WorkItemToolbar.REFRESH_WORK_ITEM:
                    let refresh = () => {
                        workItem.beginRefresh(
                            () => {
                                Diag.logTracePoint(controlType + ".refreshComplete");
                            },
                            (error) => {
                                alert(getErrorMessage(error));
                            });
                        this._refreshFollowState();
                    };
                    if (!workItem.isDirty(true)) {
                        refresh();
                    } else {
                        Dialogs.MessageDialog.showMessageDialog(WorkItemTrackingResources.ConfirmWorkItemRefresh)
                            .then(refresh);
                    }
                    publishToolbarButtonClicksTelemetryEvent("Refresh work item");
                    return false;

                case WorkItemToolbar.REVERT_WORK_ITEM:
                    Dialogs.MessageDialog.showMessageDialog(WorkItemTrackingResources.ConfirmWorkItemRevert).then(
                        () => {
                            workItem.reset();
                            Diag.logTracePoint(controlType + ".refreshComplete");
                        }
                    );
                    publishToolbarButtonClicksTelemetryEvent("Revert work item changes");
                    return false;

                case WorkItemToolbar.DISCARD_NEW_WORK_ITEM:
                    // Immediately filing the event before discard action as the action performs page navigation which will not be able execute telemetry event
                    publishToolbarButtonClicksTelemetryEvent("Discard new work item", true);
                    actionSvc.performAction(WorkItemActions.ACTION_WORKITEM_DISCARD_IF_NEW, {
                        workItem: workItem,
                        action: () => {
                            let shouldNavigate = true;
                            if (this._closeWorkItemFormDialogDelegate) {
                                this._closeWorkItemFormDialogDelegate(true);
                                shouldNavigate = false;
                            }
                            if (this._discardWorkItemDelegate) {
                                this._discardWorkItemDelegate();
                                shouldNavigate = false;
                            }
                            if (shouldNavigate) {
                                this._navigatePreviousOrDefault();
                            }
                        }
                    });
                    return false;
                case WorkItemToolbar.COPY_WORK_ITEM_TITLE:
                    copyWorkItemTitleToClipboard(workItem);
                    publishToolbarButtonClicksTelemetryEvent("copy work item title to clipboard");
                    return false;

                case WorkItemToolbar.LINK_TO_NEW_WORK_ITEM:
                    useWITDialogs().then(WITDialogs => WITDialogs.newLinkedWorkItem(workItem, [workItem.id], { tfsContext: this._getTfsContext() }));
                    publishToolbarButtonClicksTelemetryEvent("New linked work item");
                    return false;

                case WorkItemToolbar.COPY_WORK_ITEM:
                    useWITDialogs().then(WITDialogs => WITDialogs.createCopyOfWorkItem(workItem, { tfsContext: this._getTfsContext() }));
                    publishToolbarButtonClicksTelemetryEvent("Create copy of work item");
                    return false;

                case WorkItemToolbar.MOVE_WORK_ITEM:
                    useWITDialogs().then(WITDialogs => WITDialogs.moveWorkItem({ workItemIds: [workItem.id], tfsContext: this._getTfsContext() }));
                    publishToolbarButtonClicksTelemetryEvent("Move work item");
                    return false;

                case WorkItemToolbar.CHANGE_WORK_ITEM_TYPE:
                    useWITDialogs().then(WITDialogs => WITDialogs.changeWorkItemType({ workItemIds: [workItem.id], tfsContext: this._getTfsContext() }));
                    publishToolbarButtonClicksTelemetryEvent("Change work item type");
                    return false;

                case WorkItemToolbar.EMAIL_WORK_ITEM:
                    const fields = [];
                    fields.push(workItem.getField(WITConstants.CoreFieldRefNames.Id).fieldDefinition.name);
                    fields.push(workItem.getField(WITConstants.CoreFieldRefNames.WorkItemType).fieldDefinition.name);
                    fields.push(workItem.getField(WITConstants.CoreFieldRefNames.Title).fieldDefinition.name);
                    fields.push(workItem.getField(WITConstants.CoreFieldRefNames.AssignedTo).fieldDefinition.name);
                    fields.push(workItem.getField(WITConstants.CoreFieldRefNames.State).fieldDefinition.name);
                    fields.push(workItem.getField(WITConstants.CoreFieldRefNames.Tags).fieldDefinition.name);
                    let defaultTo: string = workItem.getFieldValue(WITConstants.CoreFieldRefNames.AssignedTo, true, true);
                    if (defaultTo && defaultTo.length > 0) {
                        defaultTo = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(defaultTo).uniqueName;
                    }

                    VSS.requireModules(["Admin/Scripts/TFS.Admin.SendMail", "WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems"]).spread(
                        (AdminSendMail: typeof AdminSendMail_Async, EmailWorkItems: typeof EmailWorkItems_Async) => {
                            const workItemSelectionOption: EmailWorkItems_Async.IWorkItemSelectionOptions = {
                                workItems: [workItem.id],
                                fields,
                                store: workItem.project,
                                projectId: workItem.project.guid // Specify project context in order to send emails with project context
                            };

                            AdminSendMail.Dialogs.sendMail(new EmailWorkItems.EmailWorkItemsDialogModel({
                                defaultTo,
                                subject: workItem.id + " - " + workItem.getFieldValue(WITConstants.CoreFieldRefNames.Title, true, true),
                                workItemSelectionOption,
                                workItem
                            }));
                            publishToolbarButtonClicksTelemetryEvent("Email work item");
                        });
                    return false;
                case WorkItemToolbar.TOGGLE_FULL_SCREEN:
                    const newFullScreenMode: boolean = !Navigation.FullScreenHelper.getFullScreen();
                    Navigation.FullScreenHelper.setFullScreen(newFullScreenMode, true);
                    this._updateFullScreenButtonIcon();

                    if (newFullScreenMode) {
                        publishToolbarButtonClicksTelemetryEvent(WorkItemTrackingResources.FullscreenEnterIconText);
                    }
                    else {
                        publishToolbarButtonClicksTelemetryEvent(WorkItemTrackingResources.FullscreenExitIconText);
                    }
                    return false;
                case WorkItemToolbar.RESTORE_WORK_ITEM:
                    VSS.requireModules(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin"]).spread((WITControlsRecycleBin: typeof WITControlsRecycleBin_Async) => {
                        WITControlsRecycleBin.RestoreConfirmationDialog.showDialog(() => {
                            if (this._closeWorkItemFormDialogDelegate) {
                                this._closeWorkItemFormDialogDelegate();
                            }

                            const workItemId = workItem.id;
                            const tfsContext = workItem.store.getTfsContext();
                            WITControlsRecycleBin.RecycleBin.beginRestoreWorkItems(
                                RecycleBinTelemetryConstants.TOOLBAR,
                                RecycleBinTelemetryConstants.WORK_ITEMS_FORM_SOURCE,
                                tfsContext,
                                [workItemId],
                                $.noop,
                                (error: Error) => {
                                    eventSvc.fire(WorkItemViewActions.WORKITEM_VIEW_MESSAGE_CHANGE, this, { message: error.message, messageType: Notifications.MessageAreaType.Error });
                                });

                            publishToolbarButtonClicksTelemetryEvent("Restore work item");
                        });
                    });

                    return false;
                case WorkItemToolbar.DESTROY_WORK_ITEM:
                    VSS.requireModules(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin"]).spread((WITControlsRecycleBin: typeof WITControlsRecycleBin_Async) => {
                        WITControlsRecycleBin.DestroyConfirmationDialog.showDialog(() => {
                            if (this._closeWorkItemFormDialogDelegate) {
                                this._closeWorkItemFormDialogDelegate();
                            }

                            const workItemId = workItem.id;
                            const tfsContext = workItem.store.getTfsContext();
                            WITControlsRecycleBin.RecycleBin.beginDestroyWorkItems(
                                RecycleBinTelemetryConstants.TOOLBAR,
                                RecycleBinTelemetryConstants.WORK_ITEMS_FORM_SOURCE,
                                tfsContext,
                                [workItemId],
                                $.noop,
                                (error: Error) => {
                                    eventSvc.fire(WorkItemViewActions.WORKITEM_VIEW_MESSAGE_CHANGE, this, { message: error.message, messageType: Notifications.MessageAreaType.Error });
                                });

                            publishToolbarButtonClicksTelemetryEvent("Destroy work item");
                        });
                    });
                    return false;
                case WorkItemToolbar.START_STORYBOARDING:
                    if (workItem.id > 0) {
                        StartStoryboardHelper.startStoryboarding(workItem.id);
                    }
                    publishToolbarButtonClicksTelemetryEvent("Start storyboarding");
                    return false;
                case WorkItemToolbar.FOLLOW_WORK_ITEM:
                    this._setFollowState(true);
                    publishToolbarButtonClicksTelemetryEvent("Follow work item");
                    return false;
                case WorkItemToolbar.UNFOLLOW_WORK_ITEM:
                    this._setFollowState(false);
                    publishToolbarButtonClicksTelemetryEvent("Unfollow work item");
                    return false;
                case WorkItemToolbar.KEYBOARD_SHORTCUTS:
                    publishToolbarButtonClicksTelemetryEvent("Keyboard shortcuts");
                    KeyboardShortcuts.ShortcutManager.getInstance().showShortcutDialog();
                    return false;
            }
        }
    }

    private _getApiLocation(action?: string, params?: any): string {
        return this._getTfsContext().getActionUrl(action || "", "wit", $.extend({ area: "api" }, params));
    }

    public fire(eventName: string, sender: any, eventArgs: any) {
        // Notifying all the subscribers
        return this._fireEvent(eventName, sender, eventArgs);
    }

    public _fireEvent(eventName: string, sender?: any, args?: any) {
        if (this._events) {
            let eventBubbleCancelled = false;
            this._events.invokeHandlers(eventName, sender, args, (result) => {
                if (result === false) {
                    eventBubbleCancelled = true;
                    return true;
                }
            });
            if (eventBubbleCancelled) {
                return false;
            }
        }
    }

    public attachEvent(eventName: string, handler: IEventHandler) {
        if (!this._events) {
            this._events = new Events_Handlers.NamedEventCollection();
        }

        this._events.subscribe(eventName, <any>handler);
    }

    public detachEvent(eventName: string, handler: IEventHandler) {
        if (this._events) {
            this._events.unsubscribe(eventName, <any>handler);
        }
    }

    private _attachKeyDownHandler() {
        this._onKeyDownDelegate = (e?: JQueryEventObject) => {
            if (e.keyCode === Utils_UI.KeyCode.ESCAPE) {
                this._updateFullScreenButtonIcon();
                return false;
            }
        };
        $(window).bind("keydown", this._onKeyDownDelegate);
    }

    private _detachKeyDownHandler() {
        if (this._onKeyDownDelegate) {
            $(window).unbind("keydown", this._onKeyDownDelegate);
            this._onKeyDownDelegate = null;
        }
    }

    private _attachEvents() {
        Diag.Debug.assert(!this._updateCommandStatesDelegate && !this._updateFullScreenButtonIconDelegate, "Events have already been attached");

        this._updateCommandStatesDelegate = delegate(this, this._updateCommandStates);
        this._updateFullScreenButtonIconDelegate = delegate(this, this._updateFullScreenButtonIcon);

        if (this._workItemsNavigator) {
            this._workItemsNavigator.attachEvent("navigate-index-changed", this._updateCommandStatesDelegate);
            this._workItemsNavigator.attachEvent("navigate-query-results", this._updateCommandStatesDelegate);
            historySvc.attachNavigate(<any>this._updateCommandStatesDelegate);
        }
        Navigation.FullScreenHelper.attachFullScreenUrlUpdateEvent(this._updateFullScreenButtonIconDelegate);
        eventSvc.attachEvent(WorkItemPermissionActions.PERMISSION_DATA_AVAILABLE, this._updateCommandStatesDelegate);

        // Handle when a follow state has changed.
        if (WitFormMode.isFollowWorkItemEnabled(this._getTfsContext()) && this._options.showWorkItemMenus !== false) {
            this._followsChangedDelegate = (sender: FollowsService.FollowsService, args: FollowsService.IFollowsEventArgs) => {
                if (this.workItem
                    && args.artifact.artifactType === Artifacts_Constants.ArtifactTypeNames.WorkItem
                    && args.artifact.artifactId === this.workItem.id.toString()) {

                    this._updateFollowsMenuState(true);
                }
            };
            FollowsUtils.attachFollowsChanged(this._followsChangedDelegate);

            // Handle when a follow state is being changed.
            this._followsChangingDelegate = (sender: FollowsService.FollowsService, args: FollowsService.IFollowsEventArgs) => {
                if (this.workItem
                    && args.artifact.artifactType === Artifacts_Constants.ArtifactTypeNames.WorkItem
                    && args.artifact.artifactId === this.workItem.id.toString()) {

                    this._disableFollowsMenuItems();
                }
            };
            FollowsUtils.attachFollowsChanging(this._followsChangingDelegate);
        }
    }

    private _detachEvents() {
        if (this._updateCommandStatesDelegate) {
            if (this._workItemsNavigator) {
                this._workItemsNavigator.detachEvent("navigate-index-changed", this._updateCommandStatesDelegate);
                this._workItemsNavigator.detachEvent("navigate-query-results", this._updateCommandStatesDelegate);
            }
            historySvc.detachNavigate(<any>this._updateCommandStatesDelegate);
            eventSvc.detachEvent(WorkItemPermissionActions.PERMISSION_DATA_AVAILABLE, this._updateCommandStatesDelegate);
        }
        if (this._updateFullScreenButtonIconDelegate) {
            Navigation.FullScreenHelper.detachFullScreenUrlUpdateEvent(this._updateFullScreenButtonIconDelegate);
        }

        if (this._followsChangedDelegate) {
            FollowsUtils.detachFollowsChanged(this._followsChangedDelegate);
        }

        if (this._followsChangingDelegate) {
            FollowsUtils.detachFollowsChanging(this._followsChangingDelegate);
        }
    }

    private _updateCommandStates() {
        const provider = this._workItemsNavigator && this._workItemsNavigator.getProvider();

        let isDeleted = false;
        let isNew = true;
        let isDirty = false;
        let workItemId = 0;
        if (this.workItem) {
            workItemId = this.workItem.getUniqueId();
            isNew = workItemId <= 0;
            isDirty = this.workItem.isDirty();
            isDeleted = this.workItem.isDeleted();
        }

        const dataPopulated = WorkItemPermissionDataHelper.isPopulated();
        const hideDelete = !(dataPopulated && WorkItemPermissionDataHelper.hasWorkItemDeletePermission());
        const hideDestroy = !(dataPopulated && WorkItemPermissionDataHelper.hasWorkItemDestroyPermission());

        const updatedState = <any[]>[
            {
                id: WorkItemToolbar.RESTORE_WORK_ITEM,
                hidden: hideDelete || !isDeleted || isNew
            },
            {
                id: WorkItemToolbar.DESTROY_WORK_ITEM,
                hidden: hideDestroy || !isDeleted || isNew
            }
        ];

        if (this.toolbar) {
            this.toolbar.updateCommandStates(updatedState);
        }

        this.resize();
    }

    private _updateFullScreenButtonIcon() {
        if (this.toolbar) {
            const btn = this.toolbar.getItem(WorkItemToolbar.TOGGLE_FULL_SCREEN);
            if (btn) {
                const item = btn._item;
                item.hidden = this._isFullScreenIconHidden();
                item.icon = Navigation.FullScreenHelper.getFullScreen() ? "bowtie-icon bowtie-view-full-screen-exit" : "bowtie-icon bowtie-view-full-screen";
                item.title = Navigation.FullScreenHelper.getFullScreenTooltip();
                btn.update(item);
                btn.removeHighlight();
            }
        }
    }

    // Return the hidden state of the full screen icon for the work item form.
    // Return false if the current action is new or edit the work item form. Otherwise, return true.
    private _isFullScreenIconHidden(): boolean {
        const currentState = historySvc.getCurrentState();
        return currentState && ((Utils_String.localeIgnoreCaseComparer(currentState.action, ActionUrl.ACTION_EDIT) !== 0)
            && (Utils_String.localeIgnoreCaseComparer(currentState.action, ActionUrl.ACTION_NEW) !== 0)
            && (Utils_String.localeIgnoreCaseComparer(currentState.action, ActionUrl.ACTION_VSOPEN) !== 0));
    }

    private _navigatePreviousOrDefault() {
        if (document.referrer === "") {
            historySvc.addHistoryPoint("query", {
                path: WorkItemTrackingResources.AssignedToMeQuery,
                witd: null,
                id: null,
                project: null,
                triage: null
            });
        } else {
            window.history.go(-1);
        }
    }

    // Adjust the left header controls container width to maintain the space required for for toolbar
    private _resize() {
        const toolbar = this.toolbar.getElement();
        const contentContainer = toolbar.closest(".witform-layout-content-container");
        const headerWidth = contentContainer.width();

        if (headerWidth > 0) {
            const toolbarWidth = toolbar.width();
            const headerControlsContainer = contentContainer.find(".work-item-form-header-controls-container");
            headerControlsContainer.width(headerWidth - toolbarWidth - 30); // Subtract 30 to account for borders/margins
        }
    }

    private _initializeFollowsMenuState() {
        const initialState = <Menus.ICommand[]>[
            {
                id: WorkItemToolbar.FOLLOW_WORK_ITEM,
                disabled: true,
                hidden: false,
            },
            {
                id: WorkItemToolbar.UNFOLLOW_WORK_ITEM,
                disabled: true,
                hidden: true,
            }];

        this.toolbar.updateCommandStates(initialState);

        this._updateFollowsMenuState();
    }

    private _getSaveWorkItemTitleText(): string {

        if (this.workItem && this.workItem.isReadOnly()) {
            return WorkItemTrackingResources.ReadonlyWorkItemSaveButtonTooltip;
        }

        const usesCommandKey: boolean = Utils_UI.KeyUtils.shouldUseMetaKeyInsteadOfControl();
        return usesCommandKey ? WorkItemTrackingResources.SaveHotkeyWithCommand : WorkItemTrackingResources.SaveHotkeyWithControl;
    }

    private _updateFollowsMenuState(updateMenuItemFocus: boolean = false) {

        if (!WitFormMode.isFollowWorkItemEnabled(this._getTfsContext())) {
            return;
        }

        const artifact = FollowsUtils.getFollowableArtifact(this.workItem);

        if (!artifact) {
            this._disableFollowsMenuItems(true);
            return;
        }

        const workItemId = this.workItem.id;

        FollowsUtils.getFollowsState(this.workItem).then((subscription) => {
            if (this.workItem && this.workItem.id === workItemId) { // May have changed in the time it took to retrieve this info
                const updatedState = <Menus.ICommand[]>[
                    {
                        id: WorkItemToolbar.FOLLOW_WORK_ITEM,
                        disabled: subscription !== null,
                        hidden: subscription !== null,
                    },
                    {
                        id: WorkItemToolbar.UNFOLLOW_WORK_ITEM,
                        disabled: subscription === null,
                        hidden: subscription === null,
                    }];

                // This is because we are using two menu items, should be removed once we move to single one
                const menuItemId = subscription === null ? WorkItemToolbar.FOLLOW_WORK_ITEM : WorkItemToolbar.UNFOLLOW_WORK_ITEM;

                this.toolbar.updateCommandStates(updatedState);

                if (updateMenuItemFocus) {
                    const menuItem = this.toolbar.getItem(menuItemId);
                    if (menuItem) {
                        menuItem.select();
                        menuItem.removeFocus();
                    }
                }
            }
        }, () => {
            // On error, disable the menu item states.
            this._disableFollowsMenuItems();
        });
    }

    private _disableMenuItem(buttonId: string, forceHide?: boolean) {
        const itemState = this.toolbar.getCommandState(buttonId);
        const updatedState = <Menus.ICommand[]>[
            {
                id: buttonId,
                disabled: true,
                hidden: forceHide || (itemState & Menus.MenuItemState.Hidden) === Menus.MenuItemState.Hidden
            }];
        this.toolbar.updateCommandStates(updatedState);

    }

    private _disableFollowsMenuItems(forceHide?: boolean) {
        this._disableMenuItem(WorkItemToolbar.FOLLOW_WORK_ITEM, forceHide);
        this._disableMenuItem(WorkItemToolbar.UNFOLLOW_WORK_ITEM, forceHide);
    }

    private _setFollowState(follow: boolean) {

        const followScenario = PerfScenarioManager.startScenario(
            follow ? CIConstants.WITPerformanceScenario.WORKITEMFORM_FOLLOWS_ACTION_FOLLOW
                : CIConstants.WITPerformanceScenario.WORKITEMFORM_FOLLOWS_ACTION_UNFOLLOW,
            false);

        FollowsUtils.setFollowState(this.workItem, follow, "WorkItem.Form.Toolbar")
            .then((subscription) => {
                if (followScenario) {
                    followScenario.end();
                }
            }, (reason) => {
                if (followScenario) {
                    followScenario.end();
                }
            });
    }

    private _refreshFollowState() {
        FollowsUtils.clearFollowState(this.workItem);

        this._disableFollowsMenuItems();
        this._updateFollowsMenuState();
    }
}

VSS.initClassPrototype(WorkItemToolbar, {
    _workItemsNavigator: null,
    toolbar: null,
    _events: null
});


actionSvc.registerActionWorker(WorkItemActions.ACTION_WORKITEM_DISCARD_IF_NEW, function (actionArgs, next) {
    Diag.Debug.assertParamIsObject(actionArgs, "actionArgs");
    Diag.Debug.assertParamIsNotNull(actionArgs.workItem, "actionArgs.workItem");
    Diag.Debug.assertParamIsNotNull(actionArgs.action, "actionArgs.action");

    var workItem = <WorkItem>actionArgs.workItem;
    var action = <() => void>actionArgs.action;

    if (workItem && workItem.isNew()) {
        if (workItem.isDirty(true)) {
            Dialogs.MessageDialog.showMessageDialog(WorkItemTrackingResources.ConfirmWorkItemDiscardNew).then(
                () => {
                    workItem.discardIfNew();
                    action();
                }
            );
            return;
        }

        workItem.discardIfNew();
    }

    action();
    return;
});
