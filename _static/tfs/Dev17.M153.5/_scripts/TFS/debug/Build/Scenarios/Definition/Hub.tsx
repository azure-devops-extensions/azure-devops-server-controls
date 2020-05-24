import { DefinitionView } from "Build/Scenarios/Definition/View";

import Controls = require("VSS/Controls");
import SDK_Shim = require("VSS/SDK/Shim");

import "VSS/LoaderPlugins/Css!BuildStyles";

class DefinitionHub extends Controls.Control<any> {
    public initialize() {
        super.initialize();

        const content = `<div class="hub-view build-view build-definition-view bowtie">
            <div class="hub-title">
                <div class="build-titleArea"></div>
                <div class="build-common-component-queuebuild"></div>
            </div>

            <div class="hub-content">
                <div class="build-pivot-content-container build-definition-view-content"></div>
            </div>
        </div>`;
        this._element.append($(content));
        Controls.Enhancement.enhance(DefinitionView, this._element, {
            pageContext: this._options._pageContext
        });
    }
}

SDK_Shim.VSS.register("build.definitionHub", (context) => {
    return Controls.create(DefinitionHub, context.$container, context.options);
});