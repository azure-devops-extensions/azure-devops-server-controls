import * as React from "react";

import * as Controls from "VSS/Controls";
import * as SDK from "VSS/SDK/Shim";
import { YamlNavigationView } from "PipelineWorkflow/Scripts/Editor/Yaml/YamlNavigationView";

export class ReleaseYamlEditorExtension extends Controls.Control<{}> {

    public initialize(): void {
         this.getElement().addClass("release-yaml-editor-container");
         
         // This is required for the variables tab to appear
         this.getElement().attr("style", "height:100%");
        Controls.Control.create(
            YamlNavigationView,
            this.getElement(),
            {});
    }
}

/**
 * @brief Registering the Hub to contribution
 */
SDK.registerContent("cd-release-yaml-editor", (context) => {
    return Controls.Control.create<ReleaseYamlEditorExtension, {}>(ReleaseYamlEditorExtension, context.$container, {
    });
});
