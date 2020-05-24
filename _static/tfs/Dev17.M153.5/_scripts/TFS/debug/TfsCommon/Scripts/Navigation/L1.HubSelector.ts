
import "VSS/LoaderPlugins/Css!TfsCommon/Navigation/L1.HubSelector";

import Ajax = require("VSS/Ajax");
import Bundling = require("VSS/Bundling");
import CollapsibleMenu = require("TfsCommon/Scripts/Controls/CollapsibleMenu");
import Context = require("VSS/Context");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Contributions_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Events_Action = require("VSS/Events/Action");
import Events_Page = require("VSS/Events/Page");
import Events_Services = require("VSS/Events/Services");
import Locations = require("VSS/Locations");
import Menus = require("VSS/Controls/Menus");
import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");
import { HubsService, HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import Navigation_Utils = require("TfsCommon/Scripts/Navigation/Utils");
import Navigation_Settings_Service = require("TfsCommon/Scripts/Navigation/SettingsService");
import Q = require("q");
import Resources = require("TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon");
import SDK_Shim = require("VSS/SDK/Shim");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

const maxVisibleDynamicHubs = 8;

const hubSortDelegate = (h1: Hub, h2: Hub) => h1.order - h2.order;

export const RefitEventName = "l1HeaderLayoutUpdated";

const hubToMenuItemDelegate = (h: IContributedHub): Menus.IMenuItemSpec => {
    let item: Menus.IMenuItemSpec = {
        id: h.id,
        text: h.name,
        setTitleOnlyOnOverflow: true,
        hidden: h.hidden,
        disabled: h.disabled
    };

    if (h.icon) {
        item.icon = h.icon;
        item.title = h.name;
    }

    if (h.isDefault) {
        item.cssClass = "hub-default";
    }

    // Set href if uri exists
    if (h.uri) {
        item.href = h.uri;
    }

    item.action = Service.getLocalService(HubsService).getHubNavigateHandler(h.id);

    return item;
};

const menuItemAlignmentDelegate = () => {
    return {
        cssClass: "second-level-menu",
        alignToMarkerVertical: true,
        scrollByMarker: true,
        getAlignmentMarkers: (element: JQuery, baseElement: JQuery) => {
            return {
                elementAlignmentMarker: element,
                baseAlignmentMarker: baseElement.closest(".sub-menu")
            };
        }
    };
};

function preLoadHubProviderScripts() {
    Service.getService(Contributions_Services.ExtensionService).getLoadedContributionsOfType(Navigation_Common.Constants.HubsProviderContributionType).then((hubProviderContributions) => {
        var modules: string[] = [];

        for (let hubProviderContribution of hubProviderContributions) {
            if (Contributions_Services.ExtensionHelper.hasInternalContent(hubProviderContribution)) {
                var requireModules: string[] = hubProviderContribution.properties["content"]["require"];
                if (requireModules) {
                    Utils_Array.addRange(modules, requireModules);
                }
            }
        }

        if (modules.length) {
            Bundling.loadModules(modules, { excludeOptions: VSS.DynamicModuleExcludeOptions.CommonModules });
        }
    });

    // Preload any hub group actions as well.  This will force any needed data providers to be loaded.
    Service.getService(Contributions_Services.ExtensionService).getLoadedContributionsOfType(Navigation_Common.Constants.HubGroupActionContributionType);
}

export interface HubSelectorOptions extends Navigation_Common.HeaderOptions {
    contributionId?: string;
}

export class HubSelector extends Controls.Control<HubSelectorOptions> {
    /** L1 MenuBar */
    private _menuBar: CollapsibleMenu.CollapsibleMenu;
    private _hubsService: HubsService;
    private _currentSelectedHubGroupId: string;
    private _l1RefitHandler: IEventHandler;

    initializeOptions(options?: HubSelectorOptions) {
        super.initializeOptions($.extend({
            contributionId: Navigation_Common.Constants.L1HubSelectorContributionId
        }, options));
    }

    initialize(): void {
        super.initialize();

        this._hubsService = Service.getLocalService(HubsService);

        this.attachEvents();
        preLoadHubProviderScripts();

        const hub = this._hubsService.getHubById(this._hubsService.getSelectedHubId());
        if (hub && !hub.hidden) {
            this._hubsService.saveDefaultHubForGroup(this._hubsService.getSelectedHubGroupId(), this._hubsService.getSelectedHubId());
        }

        this.initializeHubGroupCollapsing();
        this.renderHubGroups();
        Events_Page.getService().fire(Navigation_Common.PageEventConstants.HubSelectorReady);

        Events_Services.getService().attachEvent(HubEventNames.SelectedHubChanged, (sender: any, args: IHubEventArgs) => {
            const hub = this._hubsService.getHubById(args.hubId);
            if (hub) {
                const hubGroup = this._hubsService.getHubGroupById(hub.groupId);
                if (hubGroup) {
                    if (!hub.hidden) {
                        this._hubsService.saveDefaultHubForGroup(hubGroup.id, hub.id);
                    }
                    if (hubGroup.id !== this._currentSelectedHubGroupId) {
                        this.renderHubGroups();
                    }
                }
            }
        });
    }

    private attachEvents(): void {
        this._bind("menuUpdatingContributedItems", this.onContributedItemsUpdating.bind(this));
    }

    /**
     * Create menu item with child menu for the given hub group to be displayed in the L1 bar.
     * @param hg
     */
    protected hubGroupToMenuItem(hg: HubGroup): Menus.IMenuItemSpec {
        let self = this;

        const defaultHubGroupHub = this._hubsService.getDefaultHubForHubGroup(hg);
        const hgUrl = defaultHubGroupHub ? defaultHubGroupHub.uri : null;

        const isSelected = Utils_String.equals(hg.id, this._hubsService.getSelectedHubGroupId());
        // Show icon only for settings
        const showIcon = hg.icon && hg.nonCollapsible;
        let item = <CollapsibleMenu.CollapsibleMenuItemSpec>{
            id: hg.id,
            text: hg.name,
            setTitleOnlyOnOverflow: true,
            childItems: function (contextInfo: any, success: (items: Menus.IMenuItemSpec[]) => void, error: (e: any) => void) {
                // This is not a lambda function on purpose since we need to use "this" context which is the sub-menu itself
                self.getHubGroupItems(this.getParent(), (items: Menus.IMenuItemSpec[]) => {
                    let visibleItems = items.filter(i=> !i.separator);
                    // If there is only one visible item, don't display it
                    success(visibleItems.length > 1 ? items: null);
                }, error);
            },
            hideDrop: true,
            noIcon: !showIcon,
            selected: isSelected,
            extraOptions: {
                contributionType: Navigation_Common.Constants.L1HubGroupActionType,
                contributionQueryOptions: Contributions_Services.ContributionQueryOptions.IncludeAll | Contributions_Services.ContributionQueryOptions.LocalOnly
            },
            pinningMenuOptions: {
                // options for the submenu
                isPinningTarget: true,
                hideUnpinnedItems: true,
                pinItemsToEnd: true,
                hideEmptySourceMenu: true,
            },
            clickOpensSubMenu: false,
            href: hgUrl,
            neverCollapse: isSelected,
            action: defaultHubGroupHub ? this._hubsService.getHubNavigateHandler(defaultHubGroupHub.id) : null
        };

        if (showIcon) {
            item.noIcon = false;
            item.icon = hg.icon;
            item.showText = false;
        }

        if (hg.builtIn && hg.id) {
            item.cssClass = hg.id.replace(/\./g, "-");
        }

        if (!hg.builtIn && !hg.hidden) {
            item.pinningOptions = {
                isPinnable: true,
                isPinned: !this._hubsService.isHubGroupUnpinned(hg),
                neverHide: item.selected, // don't hide the active hubgroup even if it is unpinned
                hidePin: true,
                onPinnedChanged: (menuItem, pinned, siblingMenuItem) => {
                    this.onHubGroupPinnedChanged(hg, pinned, menuItem, siblingMenuItem);
                }
            };
        }

        return item;
    }

    private getHubGroupsForL1Bar(collapsible: boolean): HubGroup[] {
        const hubsService = Service.getLocalService(HubsService);
        const hubGroups = hubsService.getHubGroups();
        return hubGroups.filter(hg =>
            !hubsService.isHubGroupUnpinned(hg) &&
            !hg.hidden &&
            ((collapsible && !hg.nonCollapsible) || (!collapsible && hg.nonCollapsible)) &&
            !!hg.uri);
    }

    protected renderHubGroups(): void {
        // Populate builtIn hubgroups first
        let hubGroupItems: CollapsibleMenu.CollapsibleMenuItemSpec[] =
            this.getHubGroupsForL1Bar(true)
            .map(hg => this.hubGroupToMenuItem(hg));

        let nonCollapsibleHubGroupItems: CollapsibleMenu.CollapsibleMenuItemSpec[] =
            this.getHubGroupsForL1Bar(false)
            .map(hg => this.hubGroupToMenuItem(hg));

        // Add "More" menu item
        const moreItems = this.getMoreMenuItems();
        const moreMenuItem = <CollapsibleMenu.CollapsibleMenuItemSpec>{
            id: "more",
            title: Resources.MoreMenuItemTitle,
            cssClass: "more-item",
            childItems: moreItems,
            hidden: moreItems.length === 0,
            hideDrop: true,
            showHtml: false,
            showText: false,
            icon: "bowtie-icon bowtie-ellipsis",
            collapseOrder: null,
            clickOpensSubMenu: false,
            idIsAction: false,
            pinningMenuOptions: {
                isPinningSource: true,
                hidePinnedItems: true
            },
            rank: 9999999800
        }

        let gearMainUrl: string;
        let adminActions = Navigation_Common.getRightMenuItemAction<Navigation_Common.HeaderItemContext>(this._options.headerContext, "adminSettings");
        if (adminActions && adminActions.default) {
            gearMainUrl = adminActions.default.url;
        }

        // Add non-builtin hub groups
        // if the selected hub group is neither pinned nor built in, display it after the more menu
        this._currentSelectedHubGroupId = this._hubsService.getSelectedHubGroupId();
        let activeHubGroup = this._hubsService.getHubGroupById(this._currentSelectedHubGroupId);
        if (activeHubGroup && !activeHubGroup.builtIn && this._hubsService.isHubGroupUnpinned(activeHubGroup)) {
            let spec = this.hubGroupToMenuItem(activeHubGroup);
            if (spec.pinningOptions) {
                spec.pinningOptions.neverHide = true;
            }
            hubGroupItems.push(spec);
        }

        let nextCollapseOrder = 1;
        let nextRank = 1;
        // Set the collapse order to the same order the items are added. May want to tweak this later.
        hubGroupItems.forEach(hgi => {
            hgi.collapseOrder = hgi.collapseOrder === undefined ? nextCollapseOrder++ : hgi.collapseOrder;
            if (hgi.rank) {
                nextRank = hgi.rank + 1;
            }
            else {
                hgi.rank = nextRank++;
            }
        });

        nextRank = 9999999901;
        nonCollapsibleHubGroupItems.forEach(hgi => {
            if (hgi.rank) {
                nextRank = hgi.rank + 1;
            }
            else {
                hgi.rank = nextRank++;
            }
        });
        hubGroupItems.push(moreMenuItem);
        hubGroupItems.push({ separator: true, rank: 9999999900 });
        hubGroupItems = hubGroupItems.concat(nonCollapsibleHubGroupItems);

        let collapsibleMenuOptions: CollapsibleMenu.CollapsibleMenuOptions = {
            items: hubGroupItems,
            cssClass: "hubs-menubar l1-menubar",
            pinningMenuOptions: <Menus.IMenuItemPinningOptions>{
                isPinningTarget: true,
                hideUnpinnedItems: true,
                pinItemsToEnd: true
            },
            useBowtieStyle: true,
            alwaysOpenSubMenuOnHover: true,
            moreItemId: "more",
            getAvailableWidth: this.getAvailableWidth.bind(this),
            collapseToMoreAnimationClass: "balloon",
            collapseTransform: this.collapseTransform,
            expandTransform: this.expandTransform
        };

        // For now, just remove the existing menubar and re-add it. This is not noticable by the user.
        this.getElement().find(".hubs-menubar").remove();
        this._menuBar = Controls.create(CollapsibleMenu.CollapsibleMenu, this.getElement(), collapsibleMenuOptions);
    }

    /**
     * Transforms the given menu item to be suitable for the "more" menu.
     * @param item
     */
    private collapseTransform(item: CollapsibleMenu.CollapsibleMenuItemSpec) {
        item.hideDrop = false;
        item.extraOptions = menuItemAlignmentDelegate();
        item.noIcon = false;
        if (item.pinningOptions) {
            item.pinningOptions.neverHide = true;
        } else {
            item.pinningOptions = { neverHide: true };
        }
    }

    /**
     * Transforms the given menu item to be suitable for the hub group menu bar
     * @param item
     */
    private expandTransform(item: CollapsibleMenu.CollapsibleMenuItemSpec) {
        item.noIcon = true;
        delete item.extraOptions;
        item.hideDrop = true;
    }

    /**
     * Gets the available space for hub groups.
     */
    private getAvailableWidth() {
        const $centerSectionCell = this._element.closest("td.center-section");
        const $leftSectionCell = $centerSectionCell.prev();
        const $rightSectionCell = $centerSectionCell.next();
        const fixedCellWidth = $leftSectionCell.width() + $rightSectionCell.width();
        return this._element.closest(".main-container")[0].scrollWidth - fixedCellWidth;
    }

    /**
     * Get the items that should appear in the "More" menu.
     */
    private getMoreMenuItems(): CollapsibleMenu.CollapsibleMenuItemSpec[] {

        // Hub Groups that are NOT builtin and explicitly unpinned
        const moreMenuHubGroups = this._hubsService.getHubGroups()
            .filter(hg => !hg.builtIn && !hg.hidden && !!hg.uri && this._hubsService.isHubGroupUnpinned(hg) && this._hubsService.getSelectedHubGroupId() !== hg.id);

        let rank = 10000000;
        const items = moreMenuHubGroups.map(hg => {
            let item: CollapsibleMenu.CollapsibleMenuItemSpec = {
                id: hg.id,
                text: hg.name,
                setTitleOnlyOnOverflow: true,
                rank: rank++,
                pinningOptions: {
                    isPinnable: true,
                    isPinned: !this._hubsService.isHubGroupUnpinned(hg),
                    onPinnedChanged: (menuItem, pinned, siblingMenuItem) => {
                        this.onHubGroupPinnedChanged(hg, pinned, menuItem, siblingMenuItem);
                    }
                }
            };
            if (hg.uri) {
                item.arguments = { url: hg.uri };
                (<any>item).action = "navigate";
            }
            return item;
        });

        if (items.length > 0) {
            items.unshift({ separator: true, text: Resources.UnpinnedItemsSeparatorText, setTitleOnlyOnOverflow: true, rank: 9999999, cssClass: "with-text" });
        }

        this.fixIconSpacing(items);

        return items;
    }

    protected getHubGroupItems(menuItem: Menus.MenuItem, success: (items: Menus.IMenuItemSpec[]) => void, error: (e: any) => void) {
        if (menuItem) {

            let hubGroupId = menuItem.getCommandId();
            let contributedHubItems = this.getContributedHubItems(hubGroupId);

            var refreshMenuItems = () => {
                this.getHubGroupMenuItems(hubGroupId, contributedHubItems, refreshMenuItems).then((menuItems) => {
                    menuItem.getSubMenu().updateItems(menuItems);
                });
            };

            this.getHubGroupMenuItems(hubGroupId, contributedHubItems, refreshMenuItems).then(success, error);
        }
        else {
            error(new Error("Hubs cannot be loaded because container hub group cannot be found."));
        }
    }

    private getHubGroupMenuContributions(hubGroupId: string): IPromise<IContributedMenuItem[]> {
        return new Menus.MenuContributionProvider(null, Context.getDefaultWebContext(), [hubGroupId], "ms.vss-tfs-web.hub-group-action", Contributions_Services.ContributionQueryOptions.IncludeAll, () => undefined, {}).getContributedMenuItems(null);
    }

    private getHubGroupMenuItems(hubGroupId: string, contributedHubItems: Menus.IMenuItemSpec[], refreshDelegate: Function): IPromise<Menus.IMenuItemSpec[]> {

        return Q.all([
                this.getBuiltInHubItems(hubGroupId, refreshDelegate).then((hubItems: Menus.IMenuItemSpec[]) => {
                let itemsToUpdate = hubItems;
                if (hubItems.length === 0) {
                    itemsToUpdate = this.getBuiltInHubs(hubGroupId).map(hubToMenuItemDelegate);
                }

                if (itemsToUpdate.length > 0 && contributedHubItems.length > 0) {
                    itemsToUpdate.push({ separator: true });
                }
                itemsToUpdate = itemsToUpdate.concat(contributedHubItems);

                this.addPinMenuItem(hubGroupId, itemsToUpdate);

                return itemsToUpdate;
            }),
            this.getHubGroupMenuContributions(hubGroupId)
        ]).then((results: Menus.IMenuItemSpec[][]) => {
            let items: Menus.IMenuItemSpec[] = [];
            if (results[0]) {
                items = items.concat(results[0]);
            }
            if (results[1]) {
                items = items.concat(results[1]);
            }
            for (const i of items) {
                // We need to trick the Menu into not removing these items
                // since we're handling all contributed items.
                i.isContribution = false;
            }

            // Fix icon spacing after all menu items are resolved (builtin, contributed hubs, contributed menu items)
            this.fixIconSpacing(items);

            return items;
        });
    }

    private getPinMenuItemSpec(isPinned: boolean) {
        return <Menus.IMenuItemSpec>{
            id: "pin",
            text: isPinned ? Resources.UnpinMenuItemText : Resources.PinMenuItemText,
            icon: isPinned ? "bowtie-icon bowtie-unpin" : "bowtie-icon bowtie-pin-unpin",
            setTitleOnlyOnOverflow: true,
                action: function () {
                    // in this context, 'this' is the MenuItem
                    const self: Menus.MenuItem = this;
                    const grandParent = <Menus.MenuItem>self._parent._parent;
                    grandParent.toggleIsPinned(undefined, { unfocus: false });
                }
        };
    }

    private addPinMenuItem(hubGroupId: string, items: Menus.IMenuItemSpec[]) {
        const hg = this._hubsService.getHubGroupById(hubGroupId);
        if (!hg.builtIn) {
            const isPinned = !this._hubsService.isHubGroupUnpinned(hg);
            items.push(...[
                {
                    separator: true
                },
                this.getPinMenuItemSpec(isPinned)
            ]);
        }
    }

    private fixIconSpacing(items: Menus.IMenuItemSpec[]): void {
        if (items.length > 0) {
            // If no item has icon specified, remove extra spacing necessary for an icon
            let hasIcon = items.filter(h=> !!h.icon).length > 0;
            items.forEach(h=> {
                if (!h.separator) {
                    h.noIcon = !hasIcon;
                }
            });
        }
    }

    protected getBuiltInHubs(hubGroupId: string): IContributedHub[] {
        var hubs = <IContributedHub[]>this._hubsService.getHubsByGroupId(hubGroupId, true, false);
        hubs.sort(hubSortDelegate);
        return hubs;
    }

    protected getBuiltInHubItems(hubGroupId: string, refreshDelegate: Function): IPromise<Menus.IMenuItemSpec[]> {
        let deferred = Q.defer<IContributedHub[]>();

        // Get builtIn hubs first
        let builtinHubs = this.getBuiltInHubs(hubGroupId);

        // Get hubs from the providers
        Navigation_Utils.getHubsFromProviders(hubGroupId, this._options.contributionId, refreshDelegate)
            .then((hubs: IContributedHub[]) => {
                if (hubs.length > 0) {
                    builtinHubs = builtinHubs.concat(hubs);
                    // Resolve deferred
                    deferred.resolve(builtinHubs);
                }
                else {
                    // No contributed hubs
                    deferred.resolve([]);
                }
            }, deferred.reject);

        return deferred.promise.then((hubs: IContributedHub[]) => {
            // Sort hubs by order
            hubs.sort(hubSortDelegate);

            let targetingHubs: IContributedHub[] = [];
            let menuItems: Menus.IMenuItemSpec[] = [];

            for (let i = 0; i < hubs.length; i += 1) {
                let hub = hubs[i];
                if (hub.targetHubId) {
                    // Hubs targeting an existing hub
                    targetingHubs.push(hub);
                }
                else if ($.isArray(hub.children)) {
                    let childHubs = <IContributedHub[]>hub.children;
                    childHubs.sort(hubSortDelegate);

                    // Show before separator if requested
                    if (hub.beforeSeparator) {
                        menuItems.push({ separator: true, text: hub.name, setTitleOnlyOnOverflow: true, cssClass: hub.name ? "with-text" : "" });
                    }

                    let visibleItemCount = Math.min(maxVisibleDynamicHubs, childHubs.length);
                    for (let hubIndex = 0; hubIndex < visibleItemCount; hubIndex += 1) {
                        menuItems.push(hubToMenuItemDelegate(childHubs[hubIndex]));
                    }

                    if (childHubs.length > visibleItemCount) {
                        const overflowItems = childHubs.slice(visibleItemCount);
                        const overflowMenu = <any>{
                            text: Resources.MoreHubsMenuTitle,
                            setTitleOnlyOnOverflow: true,
                            childItems: overflowItems.map(hubToMenuItemDelegate),
                            extraOptions: menuItemAlignmentDelegate(),
                            cssClass: "with-text",
                        };

                        this.fixIconSpacing(overflowMenu.childItems);

                        overflowMenu.childItems.unshift(<Menus.IMenuItemSpec>{ separator: true, text: Resources.MoreItemsSeparatorText, setTitleOnlyOnOverflow: true, cssClass: "with-text" });
                        menuItems.push(overflowMenu);
                    }

                    // Show after separator if requested
                    if (hub.afterSeparator) {
                        menuItems.push({ separator: true });
                    }
                }
                else {
                    // Plain hub
                    menuItems.push(hubToMenuItemDelegate(hub));
                }
            }

            // Find targeted hubs and add childitem promise to get the children loaded
            // when drop is clicked or item is hovered
            for (var tHub of targetingHubs) {
                if (tHub.children) {
                    const targetMenuItem = Utils_Array.first(menuItems, mi=> mi.id === tHub.targetHubId);
                    if (targetMenuItem) {
                        this.addTargetHubsDelegate(tHub, targetMenuItem);

                        // If there is already an action for target menu item, cancel clickOpensSubmenu so that
                        // action is executed when clicked
                        if (targetMenuItem.action) {
                            targetMenuItem.clickOpensSubMenu = false;
                        }
                    }
                }
            }

            return menuItems;
        });
    }

    private addTargetHubsDelegate(targetingHub: IContributedHub, targetedMenuItem: Menus.IMenuItemSpec): void {
        targetedMenuItem.childItems = (contextInfo: any, successCallback: Function, errorCallback: Function) => {
            // Children can be array or function if async operation required
            let children = $.isFunction(targetingHub.children)
                ? (<() => IPromise<IContributedHub[]>>targetingHub.children)()
                : <IContributedHub[]>targetingHub.children;

            Q(children).then((hubs: IContributedHub[]) => {
                hubs.sort(hubSortDelegate);
                let itemsToUpdate = hubs.map(hubToMenuItemDelegate);
                this.fixIconSpacing(itemsToUpdate);
                successCallback(itemsToUpdate);
            }, (err: Error) => {
                errorCallback(err);
            });
        };
        
        targetedMenuItem.extraOptions = menuItemAlignmentDelegate();
    }

    protected hubToPinnableMenuItem(hub: Hub, isPinned: boolean, hidePin: boolean) {
        let item = hubToMenuItemDelegate(<IContributedHub>hub);
        item.pinningOptions = {
            isPinnable: true,
            isPinned: this._hubsService.isHubPinned(hub),
            hidePin: hidePin,
            onPinnedChanged: (menuItem, pinned) => {
                this.onHubPinnedChanged(menuItem, hub, pinned);
            }
        };
        return item;
    }

    protected getContributedHubItems(hubGroupId: string): Menus.IMenuItemSpec[] {
        const allHubs = this._hubsService.getHubsByGroupId(hubGroupId, false, true).sort((a, b) => a.order - b.order);
        const groupedHubs = this._hubsService.getPinnedHubsByGroupId(hubGroupId);

        const menuItems: Menus.IMenuItemSpec[] = [];
        const hubGroup = this._hubsService.getHubGroupById(hubGroupId);

        menuItems.push(...groupedHubs.pinnedHubs.map(h => this.hubToPinnableMenuItem(h, true, false)));
        menuItems.push(...groupedHubs.unpinnedHubs.map(h => this.hubToPinnableMenuItem(h, false, false)));

        if (hubGroup && hubGroup.builtIn && menuItems.length > 0) {
            menuItems.unshift({ separator: true });
        }

        if (allHubs.length > 0) {
            let viewAll = <Menus.IMenuItemSpec>{
                text: Resources.UnpinnedHubsMenuTitle,
                setTitleOnlyOnOverflow: true,
                pinningMenuOptions: {
                    isPinningSource: true,
                    hidePinnedItems: true,
                    closeOnPin: false,
                },
                hideIfAllChildrenHidden: true,
                extraOptions: menuItemAlignmentDelegate()
            };

            // display all hubs in default order
            viewAll.childItems = [<Menus.IMenuItemSpec>{ separator: true, text: Resources.UnpinnedItemsSeparatorText, setTitleOnlyOnOverflow: true, cssClass: "with-text" }];
            viewAll.childItems.push(...allHubs.map(h => this.hubToPinnableMenuItem(h, this._hubsService.isHubPinned(h), false)));
            this.fixIconSpacing(viewAll.childItems);

            menuItems.push(viewAll)
        }

        return menuItems;
    }

    private onHubPinnedChanged(menuItem: Menus.MenuItem, hub: Hub, pinned: boolean) {
        if (pinned) {
            this._hubsService.pinHub(hub);
        }
        else {
            this._hubsService.unpinHub(hub);
        }

        this.savePinnedSettings();
    }

    /**
     * Handles when a hubgroup is pinned or unpinned.
     * @param hubGroup
     * @param pinned
     */
    private onHubGroupPinnedChanged(hubGroup: HubGroup, pinned: boolean, menuItem: Menus.MenuItem, siblingMenuItem: Menus.MenuItem) {
        // update pin/unpin menu item in HG submenu
        for (let item of [menuItem, siblingMenuItem]) {
            if (item && item.hasSubMenu()) {
                const pinItem = item.getSubMenu().getItem("pin");
                if (pinItem) {
                    pinItem.update(this.getPinMenuItemSpec(pinned));
                }
            }
        }

        // save pinning preferences
        if (pinned) {
            this._hubsService.pinHubGroup(hubGroup);
        }
        else {
            this._hubsService.unpinHubGroup(hubGroup);
        }

        this.savePinnedSettings();

        // Do all the calculations to determine the "More" menu.
        this.renderHubGroups();

        const moreMenuItem = this._menuBar.getItem("more");
        if (moreMenuItem && !moreMenuItem.isHidden()) {
            moreMenuItem.select();
        }
        else {
            this._menuBar.selectFirstItem();
        }
        this._menuBar.refit(false);
    }

    private savePinnedSettings() {
        Service.getLocalService(Navigation_Settings_Service.SettingsService).setUserSetting("PinningPreferences", this._hubsService.getPinningPreferences());
    }

    private onContributedItemsUpdating(e: JQueryEventObject, args: any): void {
        if (args.contributedItems) {
            let contributedItems = <Menus.IMenuItemSpec[]>args.contributedItems;
            for (let spec of contributedItems) {
                spec.setTitleOnlyOnOverflow = true;
                // Trying to find contributed hub group action. 
                if (spec.childItems && spec.id && spec.id.indexOf("hub-group-action") >= 0) {
                    // This makes sure that 2nd level popup is aligned properly
                    if (!spec.extraOptions) {
                        spec.extraOptions = menuItemAlignmentDelegate();
                    }
                    
                    // This makes sure that action is executed even the item has children
                    if (spec.action) {
                        spec.clickOpensSubMenu = false;
                    }
                }

                // Determine whether this action is cta or not
                if (spec.id && spec.id.indexOf("cta") >= 0) {
                    spec.cssClass = "cta";
                }
            }
        }
    }

    private initializeHubGroupCollapsing() {
        Utils_Core.delay(this, 0, () => {
            Utils_UI.attachResize(document.body, Utils_Core.throttledDelegate(this, 50, this._refit, undefined, Utils_Core.ThrottledDelegateOptions.NeverResetTimer));
        });

        this._l1RefitHandler = () => {
            this._refit();
        };

        // Attach a global handler for l1 hub menubar to refit appropriately
        Events_Services.getService().attachEvent(RefitEventName, this._l1RefitHandler);
    }

    /**
     * Add things to the More menu that do not fit horizontally on one line
     * @param e
     */
    private _refit(): void {
        if (this._menuBar) {
            this._menuBar.refit();
        }
    }

    public dispose(): void {
        // Detach the global handler for l1 hub menubar to refit appropriately
        Events_Services.getService().detachEvent(RefitEventName, this._l1RefitHandler);
        this._l1RefitHandler = null;

        super.dispose();
    }
}

SDK_Shim.registerContent("navbar.level1.hubSelector", (context) => {
    Controls.Enhancement.enhance(HubSelector, context.$container.find(".hub-selector"), Navigation_Common.getHeaderOptions<HubSelectorOptions>(context));
});
