import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import VCBuiltInExtensions = require("VersionControl/Scripts/BuiltInExtensions");

import Controls = require("VSS/Controls");

export class CodeEditorIntegration {
    private _integrations: any;
    private _host: VCBuiltInExtensions.BuiltInExtensionHost = null;

    constructor(type: string, container: JQuery) {
        this._host = this._createExtensionHost(container, {
            cssClass: "buildvnext-log-viewer-host",
            integration: {
                end_point: type
            },
            messageListener: (data) => {
                console.log(data);
            }
        });
    }

    public setConfiguration(configuration: any): void {
        this._host.setConfiguration(configuration);
    }

    public dispose(): void {
        if (!!this._host) {
            this._host.dispose();
            this._host = null;
        }
    }

    private _createExtensionHost(element: JQuery, options?: any): VCBuiltInExtensions.BuiltInExtensionHost {
        return <VCBuiltInExtensions.BuiltInExtensionHost>Controls.BaseControl.createIn(VCBuiltInExtensions.BuiltInExtensionHost, element, $.extend({
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            end_point: options.integration.end_point,
            postData: $.extend({}, options.postData),
            errorOptions: {
            }
        }, options));
    }
}