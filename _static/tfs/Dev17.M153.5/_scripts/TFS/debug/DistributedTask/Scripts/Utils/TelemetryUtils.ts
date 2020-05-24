import { getService as getEventService } from "VSS/Events/Services";
import { HubEventNames } from "VSS/Navigation/HubsService";
import * as Utils_Array from "VSS/Utils/Array";
import { IScenarioManager, IScenarioDescriptor, getScenarioManager } from "VSS/Performance";
import Performance = require("VSS/Performance");

import { Telemetry } from "DistributedTaskControls/Common/Telemetry";

namespace TelemeteryAreas {
    export const LibraryArea = "Library";
}

export namespace TelemetryScenarios {
    export const LibraryLanding = "Library.LandingPage";
    export const VariableGroupEditorLanding = "VariableGroupEditor.LandingPage";
    export const SecureFilesEditorLanding = "SecureFilesEditor.LandingPage";
    export const SecureFilesPropertiesEditorLanding = "SecureFilesPropertiesEditor.LandingPage";
    export const getVariableGroup: string = "GetVariableGroup";
    export const getVariableGroups: string = "GetVariableGroups";
    export const saveVariableGroup: string = "SaveVariableGroup";
    export const deleteVariableGroup: string = "DeleteVariableGroup";
    export const OAuthLanding: string = "OAuth.LandingPage";
}

export class PerfTelemetryManager {
    private constructor(scenarioManager: IScenarioManager) {
        PerfTelemetryManager._scenarioManager = scenarioManager;

        // Whenever there is an xhr hub navigating away (and potentially return to this hub again), 
        // reset the variable for tracking whether the TTI scenario is loaded
        getEventService().attachEvent(HubEventNames.PreXHRNavigate, this._postXhrNavigationHandler);
    }

    private static _getScenarioManager(): IScenarioManager {
        if (!PerfTelemetryManager._scenarioManager) {
            PerfTelemetryManager._scenarioManager = Performance.getScenarioManager();
        }
        return PerfTelemetryManager._scenarioManager;
    }

    public static setScenarioManager(scenarioManager: IScenarioManager) {
        PerfTelemetryManager._scenarioManager = scenarioManager;
    }

    public static initialize(scenarioManager?: IScenarioManager) {
        if (!!this._instance) {
            return;
        }

        if(PerfTelemetryManager._scenarioManager){
            scenarioManager = PerfTelemetryManager._scenarioManager;
        }

        if (!scenarioManager) {
            scenarioManager = getScenarioManager();
        }

        this._instance = new PerfTelemetryManager(scenarioManager);
    }

    public static dispose(): void {
        this._instance = null;
    }

    public static get instance(): PerfTelemetryManager {
        return this._instance;
    }

    public startScenario(scenarioName: string, startTime?: number): IScenarioDescriptor {
        const currentScenarios: IScenarioDescriptor[] = PerfTelemetryManager._scenarioManager.getScenarios(TelemeteryAreas.LibraryArea, scenarioName);

        if (currentScenarios && currentScenarios.length > 0) {
            this.abortScenario(scenarioName);
        }

        return PerfTelemetryManager._scenarioManager.startScenario(TelemeteryAreas.LibraryArea, scenarioName, startTime);
    }

    public startTTIScenarioOrNormalScenario(scenarioName: string, isXhr?: boolean): IScenarioDescriptor {
        if (!this._isPageInteractiveScenarioStarted) {
            this._isPageInteractiveScenarioStarted = true;

            this._isXhrHubSwitch = isXhr;

            return PerfTelemetryManager._scenarioManager.startScenarioFromNavigation(TelemeteryAreas.LibraryArea, scenarioName, true);
        }
        else {
            return PerfTelemetryManager._scenarioManager.startScenario(TelemeteryAreas.LibraryArea, scenarioName);
        }
    }

    public endScenario(scenarioName: string): void {
        const scenariosToEnd: IScenarioDescriptor[] = PerfTelemetryManager._scenarioManager.getScenarios(TelemeteryAreas.LibraryArea, scenarioName);

        const pageInteractiveScenario: IScenarioDescriptor = Utils_Array.first(scenariosToEnd, (scenario: IScenarioDescriptor) => {
            return scenario.isPageInteractive();
        });

        if (!!pageInteractiveScenario && typeof this._isXhrHubSwitch !== "undefined") {
            pageInteractiveScenario.addData({
                isXHR: this._isXhrHubSwitch
            });
        }

        PerfTelemetryManager._scenarioManager.endScenario(TelemeteryAreas.LibraryArea, scenarioName);
    }

    public abortScenario(scenarioName: string): void {
        PerfTelemetryManager._scenarioManager.abortScenario(TelemeteryAreas.LibraryArea, scenarioName);
    }

    public split(splitName: string): void {
        PerfTelemetryManager._scenarioManager.split(splitName);
    }

    private _postXhrNavigationHandler = () => {
        this._isPageInteractiveScenarioStarted = false;
        getEventService().detachEvent(HubEventNames.PreXHRNavigate, this._postXhrNavigationHandler);
    }

    private static _instance: PerfTelemetryManager;
    private static _scenarioManager: IScenarioManager;
    private _isXhrHubSwitch: boolean;
    private _isPageInteractiveScenarioStarted: boolean = false;
}
