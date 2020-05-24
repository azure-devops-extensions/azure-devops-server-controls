import { getDefaultWebContext } from "VSS/Context";
import { showMessageDialog } from "VSS/Controls/Dialogs";
import * as PlatformResources from "VSS/Resources/VSS.Resources.Platform";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Service from "VSS/Service";
import { empty, equals, format } from "VSS/Utils/String";
import { requireModules } from "VSS/VSS";
import CaptureDialog_Async = require("WorkItemTracking/Scripts/Dialogs/WorkItemTemplates/WorkItemTemplateCaptureDialog");
import { getMenuItemProperties } from "WorkItemTracking/Scripts/MenuItems/CreateWorkItemTemplatesMenuItem";
import { GetContextMenuLocation, MenuItemLocation } from "WorkItemTracking/Scripts/MenuItems/MenuItemHelpers";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import {
    IWorkItemTemplateDefinition,
    WorkItemTemplateService,
} from "WorkItemTracking/Scripts/Services/WorkItemTemplateService";
import TemplateUtils_Async = require("WorkItemTracking/Scripts/Utils/WorkItemTemplateUtils");

(function () {
    SDK_Shim.VSS.register("ms.vss-work-web.team-agnostic-work-item-templates-menu", {
        getMenuItems: (context) => WorkItemTemplatesMenuItem.getMenuItems(context)
    });
}());

export class WorkItemTemplatesMenuItem {
    /**
     * Get WorkItemTemplate context menu items
     * @param context menuItems context
     */
    public static getMenuItems(context: any): PromiseLike<IContributedMenuItem[]> {
        const location = GetContextMenuLocation(context);
        if (location !== MenuItemLocation.Backlog && location !== MenuItemLocation.WorkItemForm && 
            location !== MenuItemLocation.Queries) {
            // Context menus that target work item form context menus are automatically included on the board
            // But we do not want to show template menu options on board
            return;
        }

        const templatesMenuContext = getMenuItemProperties(context);

        // Check if current context is valid and whether we need to show the context menu
        if (!this._shouldShowTemplateMenuItem(templatesMenuContext)) {
            return;
        }

        return this._getWorkItemTemplatesAsync(templatesMenuContext.workItemTypes[0]).then(
            (templates: IWorkItemTemplateDefinition[]) => {
                const childItems: IContributedMenuItem[] = [
                    this._getCaptureTemplateMenuItem(templatesMenuContext),
                    { separator: true },
                    ...this._getTemplateSubMenuItems(templatesMenuContext, templates)
                ];

                const { groupId, rank } = templatesMenuContext;
                return [{
                    id: "work-item-templates",
                    text: WITResources.WorkItemTemplates_ContextMenuItem_Text,
                    icon: "bowtie-icon bowtie-auto-fill-template",
                    groupId,
                    rank,
                    childItems
                } as IContributedMenuItem];
            }
        );
    };

    /**
     * Validates/checks if templates should be shown in current context
     */
    static _shouldShowTemplateMenuItem(menuProperties: CaptureDialog_Async.ITemplatesMenuContext): boolean {
        const { workItemIds, workItemTypes, workItem, projectNames } = menuProperties;
        const project = getDefaultWebContext().project;

        // Not valid if the selection has items from multiple projects
        const isValidProject = project && project.id && project.name &&
            Object.keys(projectNames).every(w => equals(projectNames[w], project.name, true));

        // Atleast one workItem must exist in selection
        const isValidWorkItemOrIds = (workItemIds && workItemIds.length > 0) || !!workItem;

        // Invalid if selection has multiple workItemTypes
        const isValidSelection = workItemTypes && workItemTypes.length === 1;

        return isValidProject && isValidWorkItemOrIds && isValidSelection;
    }

    /**
     * Asynchronously fetches all the workItemTemplates in current project, filtered by given workItemType
     */
    static _getWorkItemTemplatesAsync(workItemTypeName: string): PromiseLike<IWorkItemTemplateDefinition[]> {
        const service = Service.getService<WorkItemTemplateService>(WorkItemTemplateService);
        return service.getMyWorkItemTemplatesForWorkItemType(workItemTypeName);
    }

    /**
     * Get capture template menuItem
     */
    static _getCaptureTemplateMenuItem(menuProperties: CaptureDialog_Async.ITemplatesMenuContext): IContributedMenuItem {
        return {
            title: WITResources.WorkItemTemplates_CaptureTemplateMenuItem_TooManyItemsTooltip,
            text: WITResources.WorkItemTemplates_CaptureTemplateMenuItem_Text,
            action: (actionContext) => {
                requireModules(["WorkItemTracking/Scripts/Dialogs/WorkItemTemplates/WorkItemTemplateCaptureDialog"]).spread((CaptureDialog: typeof CaptureDialog_Async) => {
                    CaptureDialog.launchCaptureWorkItemTemplateDialog(menuProperties, /* ShowTeamPicker */ true);
                });
            },
            disabled: menuProperties.workItemIds && menuProperties.workItemIds.length > 1,
            icon: "bowtie-icon bowtie-camera"
        } as IContributedMenuItem;
    }

    /**
     * Get menuItems from workItemTemplates
     */
    static _getTemplateSubMenuItems(menuProperties: CaptureDialog_Async.ITemplatesMenuContext, templates: IWorkItemTemplateDefinition[]): IContributedMenuItem[] {
        if (!templates || templates.length === 0) {
            return [];
        }

        const menuItems: IContributedMenuItem[] = [];
        for (const template of templates) {
            menuItems.push({
                title: template.description || empty,
                text: template.name,
                action: () => {
                    requireModules(["WorkItemTracking/Scripts/Utils/WorkItemTemplateUtils"]).spread((TemplateUtils: typeof TemplateUtils_Async) => {
                        const { tfsContext, immediateSave, workItem, workItemIds } = menuProperties;
                        const options: TemplateUtils_Async.WorkItemTemplatesHelper.IWorkItemTemplateBulkUpdateItemsOptions = {
                            templateId: template.id,
                            ownerId: template.ownerId,
                            tfsContext,
                            workItem,
                            workItemIds,
                            immediateSave
                        };

                        if (immediateSave) {
                            showMessageDialog(
                                format(WITResources.BulkEdit_ApplyTemplateMessage, template.name),
                                {
                                    title: WITResources.BulkEdit_ApplyTemplateTitle,
                                    buttons: [
                                        <IMessageDialogButton>{ id: "ok", text: WITResources.BulkEdit_ApplyTemplateButton, reject: false },
                                        <IMessageDialogButton>{ id: "cancel", text: PlatformResources.ModalDialogCancelButton, reject: true }
                                    ]
                                }).then((result: IMessageDialogResult) => {
                                    if (result.button.id === "ok") {
                                        TemplateUtils.WorkItemTemplatesHelper.getWorkItemTemplateAndBulkUpdateWorkItems(options);
                                    }
                                });
                        }
                        else {
                            TemplateUtils.WorkItemTemplatesHelper.getWorkItemTemplateAndBulkUpdateWorkItems(options);
                        }
                    });
                }
            } as IContributedMenuItem);
        }

        return menuItems;
    }
}
