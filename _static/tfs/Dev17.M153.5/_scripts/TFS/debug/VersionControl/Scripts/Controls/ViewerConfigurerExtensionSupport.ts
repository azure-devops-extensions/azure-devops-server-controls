import Controls = require("VSS/Controls");
import Extensions = require("Presentation/Scripts/TFS/TFS.Extensions");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

export class ViewerConfigurerExtensionSupport {
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _endPointId: any;
    private _integrations: any;

    constructor(tfsContext, endPointId) {
        this._tfsContext = tfsContext;
        this._endPointId = endPointId;
        this._integrations = [];
    }

    public getExtensionIntegrations(callback?: IResultCallback) {
        /// <param name="callback" type="IResultCallback" optional="true" />

        this._getAllEndPointIntegrations((integrations) => {
            // Return all of the integrations
            callback(integrations);
        });
    }

    public createExtensionHost(element, options?) {
        let host;

        host = <Extensions.ExtensionHost>Controls.BaseControl.createIn(Extensions.ExtensionHost, element, $.extend({
            tfsContext: this._tfsContext,
            postData: options.postData
        }, options));

        return host;
    }

    private _getAllEndPointIntegrations(callback: IResultCallback) {
        /// <param name="callback" type="IResultCallback">Callback to execute whenever API call succeeds</param>
        callback.call(this, this._integrations);
    }
}
