/// <reference types="q" />

import "VSS/LoaderPlugins/Css!TfsCommon/Navigation/L2.HubActions";

import Controls = require("VSS/Controls");
import Events_Services = require("VSS/Events/Services");
import { HubsService, HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import Menus = require("VSS/Controls/Menus");
import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");
import SDK_Shim = require("VSS/SDK/Shim");
import Service = require("VSS/Service");

export interface HubHubActionsOptions {
}

export class HubActions extends Controls.Control<HubHubActionsOptions> {
    initializeOptions(options?: HubHubActionsOptions) {
        super.initializeOptions($.extend({
            cssClass: "hub-actions"
        }, options));
    }

    initialize(): void {
        super.initialize();

        const hubsService = Service.getLocalService(HubsService);

        // Check to see if there is a selected hub group and hub
        let contributionIds = [];
        let selectedHubGroupId = hubsService.getSelectedHubGroupId();
        let selectedHubId = hubsService.getSelectedHubId();

        if (selectedHubGroupId) {
            contributionIds.push(selectedHubGroupId);
        }

        if (selectedHubId) {
            contributionIds.push(selectedHubId);
        }

        let toolbarOptions = {
            items: [],
            cssClass: "hub-actions-menubar l2-menubar",
            contributionIds: contributionIds,
            contributionType: Navigation_Common.Constants.L2HubActionType,
            useBowtieStyle: true
        };

        const hubActionsMenu = Controls.create<Menus.Toolbar, any>(Menus.Toolbar, this.getElement(), toolbarOptions);

        // Hide the menu initially. There might be a possibility that there is no contributed items for this toolbar.
        // If that's the case, we don't want toolbar to steal the focus. Making it invisible skips toolbar from focus list.
        hubActionsMenu.hideElement();

        hubActionsMenu._bind("menuContributedItemsUpdated", () => {
            this._fire("l2HeaderLayoutUpdated");

            // Show menu if any item exists so that it can take focus
            if (hubActionsMenu.getItems().length > 0) {
                hubActionsMenu.showElement();
            }
        });

        Events_Services.getService().attachEvent(HubEventNames.PostXHRNavigate, (sender: any, args: IHubEventArgs) => {
            // After an XHR navigation, ensure that any changes in contributed items are picked up appropriately
            hubActionsMenu.setContributedItemOptions([hubsService.getSelectedHubGroupId(), hubsService.getSelectedHubId()]);
        });
    }
}

SDK_Shim.registerContent("navbar.level2.hubActions", (context) => {
    Controls.create<HubActions, HubHubActionsOptions>(HubActions, context.$container, { });
});
