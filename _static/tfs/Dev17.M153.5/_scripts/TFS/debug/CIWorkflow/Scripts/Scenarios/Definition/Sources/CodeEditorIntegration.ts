// --COPY OF-- Tfs\Service\WebAccess\Build\Scripts\CodeEditorIntegration.ts

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { BuiltInExtensionHost } from "VersionControl/Scripts/BuiltInExtensions";

import { BaseControl } from "VSS/Controls";

export class CodeEditorIntegration  {
    private _integrations: any;
    private _host: BuiltInExtensionHost = null;

    constructor(type: string, container: JQuery) {
        this._host = this._createExtensionHost(container, {
            cssClass: "revision-diff-viewer",
            integration: {
                end_point: type
            },
            messageListener: (data) => {
                // Do nothing
            }
        });
    }

    public setConfiguration(configuration: any): void {
        this._host.setConfiguration(configuration);
    }

    private _createExtensionHost(element: JQuery, options?: any): BuiltInExtensionHost {
        return BaseControl.createIn(BuiltInExtensionHost, element, JQueryWrapper.extend({
            tfsContext: TfsContext.getDefault(),
            end_point: options.integration.end_point,
            postData: JQueryWrapper.extend({}, options.postData),
            errorOptions: {
            }
        }, options)) as BuiltInExtensionHost;
    }
}
