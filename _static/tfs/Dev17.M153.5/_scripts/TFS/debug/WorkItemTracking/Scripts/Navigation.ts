import Contribution_Services = require("VSS/Contributions/Services");
import Locations = require("VSS/Locations");
import Navigation_Settings_Service = require("TfsCommon/Scripts/Navigation/SettingsService");
import SDK_Shim = require("VSS/SDK/Shim");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import Context = require("VSS/Context");
import WIT_Navigation_Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.Navigation");
import * as DataProvider from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { INewWorkItemData } from "Presentation/Scripts/TFS/FeatureRef/INewWorkItemData";
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";

// We don't want these get loaded until "Work" hubgroup is clicked
import WITDialogShim_Async = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");

const controllerName = "workitems";

class WorkHubGroupActionSource implements IContributedMenuSource {
    public getMenuItems(context: any): IContributedMenuItem[] {
        // Look up the work item data
        const webPageDataSvc = Service.getService(Contribution_Services.WebPageDataService);
        const workItemData: INewWorkItemData = webPageDataSvc.getCachedPageData<INewWorkItemData>("ms.vss-work-web.new-workitem-data-provider", null, true);
        if (!workItemData || !workItemData.hasNewWorkItemPermission) {
            return [];
        }

        let pinnedItems: string[] = Service.getLocalService(Navigation_Settings_Service.SettingsService).getUserSetting<string[]>("PinnedWorkAction");
        if (!pinnedItems) {
            pinnedItems = workItemData.defaultMenuItem ? [`new-workitem-${workItemData.defaultMenuItem}`] : [];
        }

        // Update the text and colors for the work item
        workItemData.workItemTypeTexts = Utils_Array.toDictionary(
            workItemData.workItemTypes,
            t => t.toLowerCase(),
            t => Utils_String.localeFormat(WIT_Navigation_Resources.NewWorkItemActionTitle, t));

        let actions: IContributedMenuItem[] = [{ separator: true }];
        const allChildItems = this._createChildItems(workItemData, pinnedItems);
        const allWorkItemActions: IContributedMenuItem =
            {
                id: "all-work-items-hub-group-action",
                text: WIT_Navigation_Resources.AllWorkItemsTitle,
                childItems: allChildItems
            };

        (<any>allWorkItemActions).pinningMenuOptions = {
            isPinningSource: true,
            hidePinnedItems: true,
            closeOnPin: false,
            groupId: "new-workitem",
        };

        actions.push(allWorkItemActions);

        // Casting to <any> because pinningOptions are not in type IContributedMenuItem
        const pinnedMenuItems = allChildItems
            .filter((item: any) => !item.separator && item.pinningOptions && item.pinningOptions.isPinned === true);

        const pinnedItemIdMap = Utils_Array.toDictionary(pinnedMenuItems, t => t.id, t => t);

        // Order pinned items in the order of they are pinned. Also, remove unmapped pinned items (if any)
        const pinnedActions = pinnedItems.map(item => pinnedItemIdMap[item]).filter((item) => !!item);
        actions = actions.concat(pinnedActions);

        const unpinnedMenuItems = allChildItems
            .filter((item: any) => !item.separator && item.pinningOptions && item.pinningOptions.isPinned === false);

        actions = actions.concat(unpinnedMenuItems);
        return actions;
    }

    private _createChildItems(workItemData: INewWorkItemData, pinnedItems: string[]): IContributedMenuItem[] {
        let menuItems: IContributedMenuItem[] = [];

        if (workItemData) {
            menuItems = workItemData.workItemTypes.map((typeName: string) => this._createMenuItem(workItemData, typeName, pinnedItems));
        }

        menuItems.sort((m1: IContributedMenuItem, m2: IContributedMenuItem) => {
            return m1.text.localeCompare(m2.text);
        });

        menuItems.unshift({
            separator: true,
            text: WIT_Navigation_Resources.NewWorkItemSubmenuTitle
        })

        return menuItems;
    }

    private _createMenuItem(workItemData: INewWorkItemData, workItemTypeName: string, pinnedItems: string[]): IContributedMenuItem {
        const item = <IContributedMenuItem>{
            id: `new-workitem-${workItemTypeName.replace(" ", "-").toLowerCase()}`,
            text: workItemData.workItemTypeTexts[workItemTypeName.toLowerCase()],
            href: Locations.urlHelper.getMvcUrl({
                controller: controllerName,
                queryParams: { _a: "new", witd: workItemTypeName }
            }),
            action: (actionContext: any) => {
                VSS.requireModules(["WorkItemTracking/SharedScripts/WorkItemDialogShim"]).spread((WITDialogShim: typeof WITDialogShim_Async) => {
                    WITDialogShim.createNewWorkItem(workItemTypeName);
                });

                return false;
            }
        };

        (<any>item).pinningOptions = {
            isPinnable: true,
            isPinned: this._isPinned(pinnedItems, item.id),
            groupId: "new-workitem",
            onPinnedChanged: (menuItem, pinned, siblingMenuItem) => {
                let menuId = menuItem._item.id;
                if (menuId) {
                    if (pinned) {
                        pinnedItems.push(menuId);
                    } else {
                        Utils_Array.remove(pinnedItems, menuId);
                    }
                    this._savePinnedSettings(pinnedItems);
                }
            },
        };

        let projectName = null;
        const pageContext = Context.getPageContext();
        if (pageContext && pageContext.webContext && pageContext.webContext.project) {
            projectName = pageContext.webContext.project.name;
        }

        // See if we can find the color of this work item type
        const colorAndIcon = this.getWorkItemTypeColorAndIcon(workItemData, workItemTypeName);
        if (colorAndIcon || !projectName) {
            // Set work item type icon using available color and icon
            (<any>item).icon = ($icon: JQuery) => {
                WorkItemTypeIconControl.renderWorkItemTypeIcon(
                    $icon[0],
                    workItemTypeName,
                    colorAndIcon || DataProvider.WorkItemTypeColorAndIcons.getDefault(),
                    {
                        suppressTooltip: true
                    });
            };
        } else {
            // if getWorkItemTypeColorAndIcon return null, it means icon is properly fetched from cached data,
            // either because cached data model is out-of-date or because FF flag for icon turned on and cached data are without icons
            // in this case, we directly use colorAndIconsProvider to get color and icon to mitigate the impact to appearance by the lagged cached data.
            (<any>item).icon = ($icon: JQuery) => {
                WorkItemTypeIconControl.renderWorkItemTypeIcon(
                    $icon[0],
                    workItemTypeName,
                    projectName,
                    {
                        suppressTooltip: true
                    });
            };
        }

        return item;
    }

    private getWorkItemTypeColorAndIcon(workItemData: INewWorkItemData, typeName: string): DataProvider.IColorAndIcon {
        // get work item color and icon if it is defined.
        typeName = DataProvider.getNormalizedValue(typeName);

        if (typeName && workItemData.colorAndIcons) {
            const colorAndIcon = workItemData.colorAndIcons[typeName];
            if (colorAndIcon && colorAndIcon.icon) {
                return new DataProvider.WorkItemTypeColorAndIcons().setColorAndIcon(typeName, colorAndIcon.color, colorAndIcon.icon);
            }
        }

        return null;
    }

    private _isPinned(pinnedItems: string[], menuItem: string): boolean {
        return pinnedItems && pinnedItems.indexOf(menuItem) !== -1;
    }

    private _savePinnedSettings(pinnedItems: string[]) {
        Service.getLocalService(Navigation_Settings_Service.SettingsService).setUserSetting("PinnedWorkAction", pinnedItems);
    }
}

const hubGroupActions = new WorkHubGroupActionSource();
SDK_Shim.VSS.register("ms.vss-work-web.work-hub-group-actions", () => {
    return hubGroupActions;
});
