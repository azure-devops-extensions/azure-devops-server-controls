/// <amd-dependency path='VSS/LoaderPlugins/Css!TFS:ParametersGrid' />

import * as ParametersGridComponent from "./ParametersGridComponent";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSSControls from "VSS/Controls";
import * as  q from "q";

import { NameValuePair } from "../Common/NameValuePair"
import { KubernetesParameters } from "../Common/KubernetesParameters"
import { PowerShellParameters } from "../Common/PowerShellParameters"

interface IParametersGirdControlOptions {
    inputValues: IDictionaryStringTo<any>;
    target: string;
}

class ParametersGridControl extends VSSControls.Control<IParametersGirdControlOptions> {

    public initialize() {
        super.initialize();
        this.registerContribution();
        this.initializeComponent();
    }

    public initializeComponent() {
        if (this._options.inputValues) {
            if (this._options.inputValues[this._options.target] != undefined) {
                this._parameters = PowerShellParameters.parse(this._options.inputValues[this._options.target]);
                ParametersGridComponent.start($(".parameters-view")[0], {
                    inputs: this._parameters,
                    error: ""
                }, this._updateParameters.bind(this));
            } else {
                ParametersGridComponent.start($(".parameters-view")[0], {
                    inputs: [],
                    error: Resources.TargetNotFound
                });
            }
        }
    }

    public registerContribution() {
        var dialogContributionInstance = this;
        SDK_Shim.registerContent("ms.vss-services-azure.parameters-grid", (context) => {
            return dialogContributionInstance;
        });
    }

    public onOkClicked = () => {
        var result = PowerShellParameters.serialize(this._parameters);
        return q(result);
    }

    public initializeOptions(options: IParametersGirdControlOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "parameters-view"
        }, options));
    }

    protected _updateParameters(data: NameValuePair[]) {
        this._parameters = data;
    }

    protected _parameters: NameValuePair[];
    protected _error: string;

}

class JsonParametersGridControl extends ParametersGridControl {

    public initializeComponent() {
        if (this._options.inputValues) {
            if (this._options.inputValues[this._options.target] != undefined) {
                this._initializeParameters(this._options.inputValues[this._options.target]);
                ParametersGridComponent.start($(".parameters-view")[0], {
                    inputs: this._parameters,
                    error: this._error
                }, this._updateParameters.bind(this));

            } else {
                ParametersGridComponent.start($(".parameters-view")[0], {
                    inputs: this._parameters,
                    error: Resources.TargetNotFound
                });
            }
        }
    }

    public registerContribution() {
        var dialogContributionInstance = this;
        SDK_Shim.registerContent("ms.vss-services-azure.azure-servicebus-message-grid", (context) => {
            return dialogContributionInstance;
        });
    }

    public onOkClicked = () => {
        let gridParams = this._parameters;
        var result = {};
        if (gridParams) {
            for (var i = 0; i < gridParams.length; i++) {
                if (gridParams[i].name) {
                    result[gridParams[i].name] = gridParams[i].value
                }
            }
        }

        return q(JSON.stringify(result));
    }

    protected _initializeParameters(taskInput: string) {
        if (taskInput == "") {
            this._parameters = [];
        }
        else {
            try {
                var params = [];
                let existing = JSON.parse(taskInput);
                for (var key in existing) {
                    params.push({
                        name: key,
                        value: existing[key]
                    });
                }

                this._parameters = params;
            } catch (error) {
                this._error = Resources.ErrorParsingJson;
            }
        }
    }

}

class KubernetesGridControl extends ParametersGridControl {

    public initialize() {
        super.initialize();
        this.registerContribution();
        this.initializeComponent();
    }

    public initializeComponent() {
        if (this._options.inputValues) {
            if (this._options.inputValues[this._options.target] != undefined) {
                this._initializeParameters(this._options.inputValues[this._options.target]);
                ParametersGridComponent.start($(".parameters-view")[0], {
                    inputs: this._parameters,
                    error: ""
                }, this._updateParameters.bind(this));
            } else {
                ParametersGridComponent.start($(".parameters-view")[0], {
                    inputs: [],
                    error: Resources.TargetNotFound
                });
            }
        }
    }

    public registerContribution() {
        var dialogContributionInstance = this;
        SDK_Shim.registerContent("ms.vss-services-azure.kubernetes-parameters-grid", (context) => {
            return dialogContributionInstance;
        });
    }

    public onOkClicked = () => { 
        const kubernetesSecretsFromLiteralArgumentFormat: string = "--from-literal={0}={1}";
        var result = KubernetesParameters.serializeWithFormat(kubernetesSecretsFromLiteralArgumentFormat, this._parameters);
        return q(result);
    }

    protected _initializeParameters(taskInput: string) {
        if (taskInput == "") {
            this._parameters = [];
        }
        else {
            try {               
                this._parameters = KubernetesParameters.getParameters(taskInput);
            } catch (error) {
                this._error = Resources.ErrorParsingKubernetesSecretArguments;
            }
        }
    }

    public initializeOptions(options: IParametersGirdControlOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "parameters-view"
        }, options));
    }

    protected _parameters: NameValuePair[];
    protected _error: string;
}

SDK_Shim.VSS.register("ParametersGrid", (context) => {
    return VSSControls.create(ParametersGridControl, context.$container, context.options);
});

SDK_Shim.registerContent("JsonParametersGrid", (context) => {
    return VSSControls.create(JsonParametersGridControl, context.$container, context.options);
});

SDK_Shim.VSS.register("KubernetesGrid", (context) => {
    return VSSControls.create(KubernetesGridControl, context.$container, context.options);
});
