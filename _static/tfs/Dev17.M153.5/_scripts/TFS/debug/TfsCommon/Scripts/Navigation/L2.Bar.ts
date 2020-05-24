/// <reference types="q" />

import "VSS/LoaderPlugins/Css!TfsCommon/Navigation/L2.Bar";

import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Header = require("VSS/Controls/Header");
import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");
import SDK_Shim = require("VSS/SDK/Shim");

var l2BarCssClass = "hub-bar";

var template = `<table class="header-table" cellspacing="0" cellpadding="0">
    <tr>
        <td class="left-section"></td>
        <td class="right-section"></td>
    </tr>
</table>`;

export interface L2BarOptions extends Navigation_Common.HeaderOptions, Header.ContributableHeaderOptions {
}

export class L2Bar extends Header.ContributableHeader<L2BarOptions> {
    initialize(): void {
        super.initialize();
        if (this.getElement().children().length === 0) {
            this.getElement().append(template);
        }
        this.renderContributions();
    }
}

SDK_Shim.registerContent("navbar.level2.bar", (context) => {
    let htmlElement = context.$container.find(`.${l2BarCssClass}`);
    if (htmlElement.length > 0) {
        // Server renders something, try to enhance
        Controls.Enhancement.enhance(L2Bar, htmlElement);
    }
    else {
        // Nothing rendered on the server, initialize a new control
        Controls.create<L2Bar, L2BarOptions>(L2Bar, context.$container, {
            cssClass: l2BarCssClass,
            contributionId: Navigation_Common.Constants.L2BarContributionId,
            elementContributionType: Navigation_Common.Constants.HeaderElementContributionType
        });
    }
});
