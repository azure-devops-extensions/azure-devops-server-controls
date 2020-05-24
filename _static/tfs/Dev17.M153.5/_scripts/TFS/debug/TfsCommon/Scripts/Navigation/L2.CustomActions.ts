/// <reference types="q" />

import "VSS/LoaderPlugins/Css!TfsCommon/Navigation/L2.CustomActions";

import Contributions_Controls = require("VSS/Contributions/Controls");
import Contributions_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Events_Services = require("VSS/Events/Services");
import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");
import { HubsService, HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import SDK_Shim = require("VSS/SDK/Shim");
import Service = require("VSS/Service");

var customActionsCssClass = "custom-actions";

export interface CustomActionsOptions {
    cssClass?: string;
    hubGroup: boolean;
    contributionType?: string;
}

export class CustomActions extends Controls.Control<CustomActionsOptions> {

    private _currentContributions: Contribution[];

    initialize(): void {
        super.initialize();

        Events_Services.getService().attachEvent(HubEventNames.PostXHRNavigate, (sender: any, args: IHubEventArgs) => {
            // After an XHR navigation, ensure that any changes in contributed items are picked up appropriately
            this.renderContent();
        });

        this.renderContent();
    }

    private renderContent() {

        let options = this._options;
        let element = this.getElement();

        const hubsService = Service.getLocalService(HubsService);
        let contributionId = options.hubGroup ? hubsService.getSelectedHubGroupId() : hubsService.getSelectedHubId();

        if (contributionId) {
            Service.getService(Contributions_Services.ExtensionService).getContributionsForTarget(contributionId, options.contributionType)
                .then((contributions) => {

                    contributions.sort((c1, c2) => {
                        let order1 = typeof c1.properties.order === "number" ? <number>c1.properties.order : Number.MAX_VALUE;
                        let order2 = typeof c2.properties.order === "number" ? <number>c2.properties.order : Number.MAX_VALUE;
                        return order1 - order2;
                    });

                    if (this._currentContributions) {

                        const currentContributionsKey = contributions.map(c => c.id).join(";");
                        const previousContributionsKey = this._currentContributions.map(c => c.id).join(";");

                        if (currentContributionsKey === previousContributionsKey) {
                            // No need to re-render anything. The contributions have not changed.
                            return;
                        }
                        else {
                            element.empty();
                        }
                    }

                    contributions.forEach((c) => {
                        let $contributionContainer = element.find(`#${c.id.replace(/\./g, "-")}`);
                        if ($contributionContainer.length > 0) {
                            // Html provided contribution
                            Contributions_Controls.createContributedControl($contributionContainer, c, { ownsContainer: true });
                        }
                        else {
                            // No html, initialize a new one
                            Contributions_Controls.createContributedControl(element, c);
                        }
                    });

                    this._currentContributions = contributions;
                });
        }
    }
}

SDK_Shim.registerContent("navbar.level2.customActions", (context) => {
    let contributionOptions: CustomActionsOptions = {
        hubGroup: true,
        contributionType: Navigation_Common.Constants.L2CustomHubGroupActionType
    };

    let htmlElement = context.$container.find(`.${customActionsCssClass}`);
    if (htmlElement.length > 0) {
        // Server renders something, try to enhance
        Controls.Enhancement.enhance(CustomActions, htmlElement, contributionOptions);
    }
    else {
        // Nothing rendered on the server, initialize a new control
        contributionOptions.cssClass = customActionsCssClass;
        Controls.create<CustomActions, CustomActionsOptions>(CustomActions, context.$container, contributionOptions);
    }
});

SDK_Shim.registerContent("navbar.level2.customHubActions", (context) => {
    Controls.create<CustomActions, CustomActionsOptions>(CustomActions, context.$container, {
        cssClass: "custom-hub-actions",
        hubGroup: false,
        contributionType: Navigation_Common.Constants.L2CustomHubActionType
    });
});
