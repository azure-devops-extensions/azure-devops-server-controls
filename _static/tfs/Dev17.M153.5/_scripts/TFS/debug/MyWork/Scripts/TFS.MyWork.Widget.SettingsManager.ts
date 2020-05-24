

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Service = require("VSS/Service");

export class SettingsManager extends Service.VssService {
    
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext) {
        super();

        if (!tfsContext) {
            throw new Error("tfsContext is required");
        }
                
        this._tfsContext = tfsContext;
    }

    public __test() {
        var that = this;
        return {
            tfsContext: that._tfsContext,
        }
    }

    public getApiLocation(action?: string) {
        /// <param name="action" type="string" optional="true" />
        return this._tfsContext.getActionUrl(action || "", "mywork");
    }

    public setWidgetSettings(settings: {}, overwrite: boolean = false, callback?: IResultCallback, errorCallback?: IErrorCallback) {

        if (overwrite) {
            return this._ajaxPost("SetWidgetSettings", { WidgetSettingsModel: Utils_Core.stringifyMSJSON(settings) }, callback, errorCallback);
        }
        this.getWidgetSettings(settings["WidgetName"], (currentSettings) => {
            var currentDictionary = currentSettings["Settings"];
            var newDictionary = settings["Settings"];

            for (var key in currentDictionary) {
                if (currentDictionary.hasOwnProperty(key)) {
                    if (!newDictionary[key]) {
                        newDictionary[key] = currentDictionary[key];
                    }
                }
            }
            var newSettings = { WidgetName: settings["WidgetName"], Settings: newDictionary };
            this._ajaxPost("SetWidgetSettings", { WidgetSettingsModel: Utils_Core.stringifyMSJSON(newSettings) }, callback, errorCallback);
        }, errorCallback);
    }

    public getWidgetSettings(widgetName, callback: IResultCallback, errorCallback?: IErrorCallback) {
        return this._ajaxJson("GetWidgetSettings", { widgetName: widgetName }, callback, errorCallback);
    }

    private _ajaxJson(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />

        Ajax.getMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback, ajaxOptions);
    }

    private _ajaxPost(method: string, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        /// <param name="method" type="string" />
        /// <param name="requestParams" type="any" optional="true" />
        /// <param name="callback" type="IResultCallback" optional="true" />
        /// <param name="errorCallback" type="IErrorCallback" optional="true" />
        /// <param name="ajaxOptions" type="any" optional="true" />
        /// <param name="multipart" type="boolean" optional="true" />

        Ajax.postMSJSON(this.getApiLocation(method), requestParams, callback, errorCallback, ajaxOptions);
    }

}