import * as ReactDOM from "react-dom";
import SDK_Shim = require("VSS/SDK/Shim");
import VSS = require("VSS/VSS");
import VSSControls = require("VSS/Controls");
import OAuthConfigurationsHub = require("DistributedTask/Scripts/OAuthConfiguration/Components/OAuthConfigurationsHub");

export interface IOAuthConfigurationsHub {
}

export class DT_OAuthConfigurationsHub extends VSSControls.Control<IOAuthConfigurationsHub> {

    public initialize(): void {
        super.initialize();
        this.getElement().addClass(".oauth-configurations-hub-view");
        OAuthConfigurationsHub.load(this.getElement()[0]);
    }

    public initializeOptions(options: IOAuthConfigurationsHub): void {
        super.initializeOptions($.extend({
            coreCssClass: "hub-view oauth-configurations-hub-view"
        }, options));
    }

    public dispose() {
        ReactDOM.unmountComponentAtNode(this.getElement()[0]);
    }
}

SDK_Shim.VSS.register("dt.oauthConfigurationsHub", (context) => {
    return VSSControls.create(DT_OAuthConfigurationsHub, context.$container, context.options);
});