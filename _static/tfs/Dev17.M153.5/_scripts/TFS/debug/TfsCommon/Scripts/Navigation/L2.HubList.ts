/// <reference types="q" />

import "VSS/LoaderPlugins/Css!TfsCommon/Navigation/L2.HubList";

import CollapsibleMenu = require("TfsCommon/Scripts/Controls/CollapsibleMenu");
import Controls = require("VSS/Controls");
import Events_Action = require("VSS/Events/Action");
import Events_Services = require("VSS/Events/Services");
import { HubsService, HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import Header = require("VSS/Controls/Header");
import Menus = require("VSS/Controls/Menus");
import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");
import Navigation_Utils = require("TfsCommon/Scripts/Navigation/Utils");
import Resources = require("TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon");
import SDK_Shim = require("VSS/SDK/Shim");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");

export interface HubListOptions extends Navigation_Common.HeaderOptions, Header.ContributableHeaderOptions {
}

const selectedHubClass = "currently-selected";
const hubListCssClass = "hub-list";

export class HubList extends Controls.Control<HubListOptions> {
    private popups: { [id: string]: Menus.PopupMenu } = {};
    private menuBar: CollapsibleMenu.CollapsibleMenu;
    private nextCollapseOrder = 0;
    private currentHubGroupId: string;
    private hubsService: HubsService;

    public initialize(): void {
        super.initialize();

        this.hubsService = Service.getLocalService(HubsService);

        Events_Services.getService().attachEvent(HubEventNames.SelectedHubChanged, (sender: any, args: IHubEventArgs) => {
            const hub = this.hubsService.getHubById(args.hubId);
            if (hub) {
                const hubGroup = this.hubsService.getHubGroupById(hub.groupId);
                if (hubGroup && hubGroup.id !== this.currentHubGroupId) {
                    this.renderHubList();
                    return;
                }
            }
            this.updateSelectedHub(args.hubId);
        });

        this.renderHubList();
    }

    private renderHubList() {
        this.currentHubGroupId = this.hubsService.getSelectedHubGroupId();
        this.getBuiltInHubs().then(hubs => {
            const contributedHubs = this.getContributedHubs();
            this.renderHubs(hubs.concat(contributedHubs.pinnedHubs), contributedHubs.unpinnedHubs);
        });
        this.initializeHubCollapsing();
    }

    private getMenuItemFromHubId(hubId: string) {
        let menuItem = this.menuBar.getItem(hubId);
        if (!menuItem) {
            const moreItem = this.menuBar.getItem("more");
            menuItem = moreItem.getSubMenu().getItem(hubId);
        }
        return menuItem;
    }

    private updateSelectedHub(selectedHubId: string) {

        // We haven't drawn the menu bar yet - probably still waiting for hubs.
        if (!this.menuBar) {
            return;
        }

        let menuItem: Menus.MenuItem;
        if (selectedHubId && (menuItem = this.getMenuItemFromHubId(selectedHubId))) {
            this.menuBar.getItems().forEach(i => {
                i._item.cssClass = i._item.cssClass ? i._item.cssClass.replace(selectedHubClass, "") : "";
                i._item.neverCollapse = false;
            });
            menuItem._item.neverCollapse = true;
            menuItem._item.cssClass = selectedHubClass;
            this.menuBar.updateItems(this.menuBar.getMenuItemSpecs());

            // if the hub being selected is from the drop down it will not be available in the updated menu bar.
            menuItem = this.getMenuItemFromHubId(selectedHubId) || menuItem;
            menuItem.select();
            if (menuItem.getParentMenu() !== this.menuBar) {
                this.menuBar.refit();
            }
        }
    }

    private getBuiltInHubs(): IPromise<Hub[]> {
        // Get builtIn hubs first
        let builtinHubs = this.hubsService.getHubsByGroupId(this.hubsService.getSelectedHubGroupId(), true, false);

        return Navigation_Utils.getHubsFromProviders(this.hubsService.getSelectedHubGroupId(), this._options.contributionId).then(hubs => {
            // Flatten the hubs from the providers before concating.
            return builtinHubs.concat(hubs.reduce((a, b) => a.concat(b.children ? b.children : b), []));
        });
    }

    private getContributedHubs() {
        const hubs = this.hubsService.getPinnedHubsByGroupId(this.hubsService.getSelectedHubGroupId());
        const selectedUnpinnedHubs = hubs.unpinnedHubs.filter(h => h.isSelected);
        return {
            pinnedHubs: hubs.pinnedHubs.concat(selectedUnpinnedHubs),
            unpinnedHubs: hubs.unpinnedHubs.filter(h => !h.isSelected),
        };
    }

    private hubToMenuItem(hub: Hub) {
        let item = <CollapsibleMenu.CollapsibleMenuItemSpec>{
            id: hub.id,
            text: hub.name,
            setDefaultTitle: false,
            hideDrop: true,
            noIcon: true,
            cssClass: hub.isSelected ? selectedHubClass : "",
            href: hub.uri,
            neverCollapse: hub.isSelected,
            groupId: hub.builtIn ? "builtin" : "contributed",
            action: this.hubsService.getHubNavigateHandler(hub.id),
            ariaLabel: hub.ariaLabel,
        };
        if (hub.order) {
            item.rank = hub.order;
            item.collapseOrder = hub.order;
            this.nextCollapseOrder = hub.order + 1;
        }
        else {
            item.rank = this.nextCollapseOrder;
            item.collapseOrder = this.nextCollapseOrder;
            this.nextCollapseOrder++;
        }
        return item;
    }

    private renderHubs(pinnedHubs: Hub[], unpinnedHubs: Hub[]): void {
        const sortDelegate = (h1: Hub, h2: Hub) => h1.order - h2.order;
        pinnedHubs.sort(sortDelegate);
        const items = pinnedHubs.map(h => this.hubToMenuItem(h));

        const moreMenuItem = <CollapsibleMenu.CollapsibleMenuItemSpec>{
            id: "more",
            cssClass: "more-item",
            title: Resources.MoreMenuItemTitle,
            hidden: true,
            hideDrop: true,
            showHtml: false,
            showText: false,
            icon: "bowtie-icon bowtie-ellipsis",
            collapseOrder: null,
            neverCollapse: true,
            rank: 9999999980,
            clickOpensSubMenu: false,
            idIsAction: false,
            childOptions: {
                overflow: "fit-flip"
            },
        };
        if (unpinnedHubs.length > 0) {
            const unpinnedItems = [<CollapsibleMenu.CollapsibleMenuItemSpec>{
                separator: true,
                text: Resources.UnpinnedItemsSeparatorText,
                setDefaultTitle: false,
                cssClass: "with-text",
                groupId: "contributed",
            }];
            unpinnedItems.push(...unpinnedHubs.map(h => this.hubToMenuItem(h)));
            moreMenuItem.hidden = false;
            moreMenuItem.childItems = unpinnedItems;
        }
        items.push(moreMenuItem);

        const menuOptions: CollapsibleMenu.CollapsibleMenuOptions = {
            items: items,
            cssClass: "hubs-menubar l2-menubar",
            useBowtieStyle: true,
            moreItemId: "more",
            getAvailableWidth: this.getAvailableWidth.bind(this),
            collapseToMoreAnimationClass: "balloon",
            collapseTransform: this.collapseTransform,
            expandTransform: this.expandTransform,
            alwaysOpenSubMenuOnHover: true,
            doNotSeparateUngroupedItems: true
        };

        // For now, just remove the existing menubar and re-add it. This is not noticable by the user.
        this.getElement().find(".hubs-menubar").remove();
        this.menuBar = Controls.create(CollapsibleMenu.CollapsibleMenu, this.getElement(), menuOptions);
    }

    private getAvailableWidth() {
        const $leftSectionCell = this._element.closest("td.left-section");
        const $hubSectionCell = $leftSectionCell.next();
        const $rightSectionCell = $hubSectionCell.next();
        const otherHostsWidth = this._element.closest(".internal-content-host").siblings(".internal-content-host").toArray().map(elem => $(elem).width()).reduce((a, b) => a + b, 0);
        const fixedCellWidth = $hubSectionCell.width() + $rightSectionCell.width() + otherHostsWidth;
        return this._element.closest(".main-container")[0].scrollWidth - fixedCellWidth;
    }

    private collapseTransform(item: CollapsibleMenu.CollapsibleMenuItemSpec) {
        item.hideDrop = false;
        item.noIcon = false;
    }

    private expandTransform(item: CollapsibleMenu.CollapsibleMenuItemSpec) {
        item.noIcon = true;
        item.hideDrop = true;
    }

    private initializeHubCollapsing() {
        Utils_Core.delay(this, 0, () => {
            Utils_UI.attachResize(document.body, Utils_Core.throttledDelegate(this, 50, this.onWindowResized, undefined, Utils_Core.ThrottledDelegateOptions.NeverResetTimer));
        });
        this._bind(this.getElement().closest("tr.header-row"), "l2HeaderLayoutUpdated", () => {
            if (this.menuBar) {
                this.menuBar.refit();
            }
        });
    }

    /**
     * Add things to the More menu that do not fit horizontally on one line
     * @param e
     */
    private onWindowResized(e?: UIEvent) {
        if (this.menuBar) {
            this.menuBar.refit();
        }
    }
}

SDK_Shim.registerContent("navbar.level2.hubList", (context) => {
    let htmlElement = context.$container.find(`.${hubListCssClass}`);
    if (htmlElement.length > 0) {
        // Server renders something, try to enhance
        Controls.Enhancement.enhance(HubList, htmlElement, { contributionId: Navigation_Common.Constants.L2HubsContributionId });
    }
    else {
        // Nothing rendered on the server, initialize a new control
        Controls.create<HubList, HubListOptions>(HubList, context.$container, {
            cssClass: hubListCssClass,
            contributionId: Navigation_Common.Constants.L2HubsContributionId
        });
    }
});
