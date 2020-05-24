import { NameValuePair } from "DistributedTask/Scripts/Extensions/Common/NameValuePair"
import { PowerShellParameters } from "DistributedTask/Scripts/Extensions/Common/PowerShellParameters"
import * as Constants from "DistributedTask/Scripts/Extensions/WebConfigParametersGrid/Constants";
import * as WebConfigParametersAction from "DistributedTask/Scripts/Extensions/WebConfigParametersGrid/WebConfigParametersAction";
import q = require("q");
import SDK_Shim = require("VSS/SDK/Shim");
import Store_Base = require("VSS/Flux/Store");
import String_Utils = require("VSS/Utils/String");

export class WebConfigData {
    appType: string;
    variables: NameValuePair[];
}

export class WebConfigParametersStore extends Store_Base.Store  {
    private _data: WebConfigData = new WebConfigData();

    constructor() {
        super();

        WebConfigParametersAction.initializeWebConfigParameters.addListener(this._initializeInput, this);
        WebConfigParametersAction.updateVariableName.addListener(this._updateVariableName, this);
        WebConfigParametersAction.updateVariableValue.addListener(this._updateVariableValue, this);
        WebConfigParametersAction.updateWebAppType.addListener(this._updateWebAppType, this);

    }

    public getData(): WebConfigData {
        return this._data;
    }

    public getSerializedData(): string {
        var keyValuePairs: NameValuePair[] = [];

        keyValuePairs = this._data.variables;
        keyValuePairs.push({
            name: Constants.AppTypeColumnKey,
            value: this._data.appType
        });

        return PowerShellParameters.serialize(keyValuePairs);
    }

    private _initializeInput(input: string, serializationType?: string): void {

        var variables = PowerShellParameters.parse(input);
        var appTypeVariable = PowerShellParameters.delete(variables, "apptype");
        if (appTypeVariable && appTypeVariable.value) {
            this._data.appType = appTypeVariable.value;
        }
        else {
            this._data.appType = Constants.AppType.node;
        }

        this._data.variables = this._setWebConfigParameters(this._data.appType, variables);
        this.emitChanged();
    }

    private _updateWebAppType(appType: string) {
        this._data.appType = appType;
        this._data.variables = this._setWebConfigParameters(appType);
        this.emitChanged();
    }

    private _updateVariableValue(payload: WebConfigParametersAction.ICellItemPayload) {
        this._data.variables[payload.index].value = payload.value;
        this.emitChanged();
    }

    private _updateVariableName(payload: WebConfigParametersAction.ICellItemPayload) {
        this._data.variables[payload.index].name = payload.value;
        this.emitChanged();
    }
    
    private _getDefaultWebConfigParameters = (appType: string): NameValuePair[] => {

        switch (Constants.AppType[appType]) {
            case Constants.AppType.node:
                return Constants.NodeParameters;
            case Constants.AppType.python_Bottle:
                return Constants.PythonWithBottleParameters;
            case Constants.AppType.python_Django:
                return Constants.PythonWithDjangoParameters;
            case Constants.AppType.python_Flask:
                return Constants.PythonWithFlaskParameters;
            case Constants.AppType.Go:
                return Constants.GoParameters;
            case Constants.AppType.Java_SpringBoot:
                return Constants.JavaSpringBootParameters;
            default:
                this._data.appType = Constants.AppType.node;
                return Constants.NodeParameters;
        }
    }

    private _setWebConfigParameters(appType: string, variables?: NameValuePair[]) {

        var defaultWebConfigParameters = this._getDefaultWebConfigParameters(appType);
        var webConfigVariables: NameValuePair[] = [];

        if(variables == undefined || variables.length == 0) {
            defaultWebConfigParameters.forEach((parameter: NameValuePair, index: number) => {
                webConfigVariables.push({
                        name: parameter.name,
                        value: parameter.value,
                        info: parameter.info
                    });
            });
        }
        else {
            defaultWebConfigParameters.forEach((parameter: NameValuePair, index: number) => {
                var keyIndex = PowerShellParameters.findFirst(variables, parameter.name);
                if (keyIndex < 0) {
                    webConfigVariables.push({
                        name: parameter.name,
                        value: parameter.value,
                        info: parameter.info
                    });
                }
                else {
                    webConfigVariables.push({
                        name: parameter.name,
                        value: variables[keyIndex].value,
                        info: parameter.info
                    });
                }
            });
        }
        return webConfigVariables;
    }
}

export var ParametersStore = new WebConfigParametersStore();