import { DefinitionsView } from "Build/Scenarios/Definitions/View";

import Controls = require("VSS/Controls");
import SDK_Shim = require("VSS/SDK/Shim");

import "VSS/LoaderPlugins/Css!BuildStyles";

class DefinitionsHub extends Controls.Control<any> {
    public initialize() {
        super.initialize();

        const content = `<div class="hub-view build-view build-definitions-view">
            <div class="hub-title">
                <div class="build-titleArea"></div>
                <div class="build-common-component-queuebuild"></div>
                <div class="build-common-component-renamedefinition"></div>
                <div class="build-common-component-savedefinition"></div>
                <div class="build-alldefinitions-move-component-foldermanage"></div>
            </div>

            <div class="hub-content">
                <div class="build-pivot-content-container build-definitions-view-content"></div>
            </div>
        </div>`;
        this._element.append($(content));
        Controls.Enhancement.enhance(DefinitionsView, this._element, {
            pageContext: this._options._pageContext
        });
    }
}

SDK_Shim.VSS.register("build.definitionsHub", (context) => {
    return Controls.create(DefinitionsHub, context.$container, context.options);
});