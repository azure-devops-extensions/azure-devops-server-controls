import { Singleton } from "DistributedTaskControls/Common/Factory";

import * as ArrayUtils from "VSS/Utils/Array";

export enum AppCapability {
    LinkProcessParameters,
    GreaterThanConditionInDemand,
    MultiplePhases,
    VariablesForTasktimeout,
    Build, // Deprecated Do not take dependency on it. Added for task conditions.
    Deployment, // Deprecated Do not take dependency on it. Added for task conditions.
    ViewYAML,
    MarketplaceExtensions,
    PhaseJobCancelTimeout,
    ShowTaskGroupDemands
}

export class AppContext extends Singleton {

    public static instance(): AppContext {
        return super.getInstance<AppContext>(AppContext);
    }

    public isCapabilitySupported(capability: AppCapability): boolean {
        if (!this._capabilities || this._capabilities.length === 0) {
            return false;
        }

        return ArrayUtils.contains(this._capabilities, capability);
    }

    public set Capabilities(capabilities: AppCapability[]) {
        this._capabilities = capabilities;
    }

    public set IsSystemVariable(functionDelegate: (variableName: string) => boolean) {
        this._isSystemVariable = functionDelegate;
    }

    public get IsSystemVariable(): (variableName: string) => boolean {
        return this._isSystemVariable;
    }

    public set PageContext(pageContext: Object) {
        this._pageContext = pageContext;
    }

    public get PageContext(): Object {
        return this._pageContext;
    }

    private _capabilities: AppCapability[];
    private _isSystemVariable: (variableName: string) => boolean;
    private _pageContext: Object;
}