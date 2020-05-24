import { ParametersStore } from "DistributedTask/Scripts/Extensions/WebConfigParametersGrid/WebConfigParametersStore";
import { NameValuePair } from "DistributedTask/Scripts/Extensions/Common/NameValuePair"
import { PowerShellParameters } from "DistributedTask/Scripts/Extensions/Common/PowerShellParameters"
import * as WebConfigParametersAction from "DistributedTask/Scripts/Extensions/WebConfigParametersGrid/WebConfigParametersAction";
import * as WebConfigParametersGrid from "DistributedTask/Scripts/Extensions/WebConfigParametersGrid/WebConfigParametersGrid";
import q = require('q');
import React = require("react");
import ReactDOM = require("react-dom");
import SDK_Shim = require("VSS/SDK/Shim");
import VSSControls = require("VSS/Controls");

interface IWebConfigParametersGirdControlOptions {
    inputValues: IDictionaryStringTo<any>;
    target: string;
}

class WebConfigParametersGridControl extends VSSControls.Control<IWebConfigParametersGirdControlOptions> {
    private _showError: boolean = false;

    public initialize() {
        super.initialize();
        this.initializeComponent();
        this.registerContribution();
    }

    public initializeComponent() {
        if (this._options.inputValues && this._options.inputValues[this._options.target] != undefined) {
            WebConfigParametersAction.initializeWebConfigParameters.invoke(this._options.inputValues[this._options.target]);
        }
        else {
            this._showError = true;
        }
        WebConfigParametersGrid.start($(".web-config-parameters-view")[0], this._showError);
    }

    public initializeOptions(options: IWebConfigParametersGirdControlOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "web-config-parameters-view"
        }, options));
    }

    public registerContribution() {
        var storeInstance = this;
        SDK_Shim.registerContent("ms.vss-services-azure.webconfig-parameters-grid", (context) => {
            return storeInstance;
        });
    }

    public onOkClicked(): IPromise<string> {
        if(this._showError) {
            return q("");
        }
        return q(ParametersStore.getSerializedData());
    }
}

SDK_Shim.VSS.register("WebConfigParametersGrid", (context) => {
    return VSSControls.create(WebConfigParametersGridControl, context.$container, context.options);
});