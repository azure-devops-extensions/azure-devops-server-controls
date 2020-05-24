import { getService as getEventService } from "VSS/Events/Services";
import { HubEventNames } from "VSS/Navigation/HubsService";
import * as Utils_Array from "VSS/Utils/Array";
import {
    IScenarioManager,
    IScenarioDescriptor,
    getScenarioManager
} from "VSS/Performance";

import { Telemetry } from "DistributedTaskControls/Common/Telemetry";

namespace TelemeteryAreas {
    export const TaskGroupArea = "TaskGroup";
}

export namespace TelemetryScenarios {
    export const TaskGroupsLanding = "TaskGroups.LandingPage";
    export const TaskGroupEditorLanding = "TaskGroupEditor.LandingPage";
}

namespace Features {
    export const refreshTaskList: string = "TG_RefreshList";
    export const importTaskGroup: string = "TG_Import";
    export const exportTaskGroup: string = "TG_Export";
    export const deleteTaskGroup: string = "TG_Delete";
    export const saveAsDraft: string = "TG_SaveAsDraft";
    export const publishDraftAsPreview: string = "TG_PublishDraftAsPreview";
    export const publishDraft: string = "TG_PublishDraft";
    export const publishPreview: string = "TG_PublishPreview";
}

namespace Events {
    export const success: string = "TG_Success";
    export const failure: string = "TG_Failure";
    export const click: string = "Click";
}

namespace SourcePage {
    export const TaskGroups = "Task_groups";
    export const TaskGroupEditor = "Task_group_editor";
}

const sourcePage = "SourcePage";

export class PerfTelemetryManager {
    private constructor(scenarioManager: IScenarioManager) {
        this._scenarioManager = scenarioManager;

        // Whenever there is an xhr hub navigating away (and potentially return to this hub again), 
        // reset the variable for tracking whether the TTI scenario is loaded
        getEventService().attachEvent(HubEventNames.PreXHRNavigate, this._postXhrNavigationHandler);
    }

    public static initialize(scenarioManager?: IScenarioManager) {
        if (!!this._instance) {
            return;
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
        const currentScenarios: IScenarioDescriptor[] = this._scenarioManager.getScenarios(TelemeteryAreas.TaskGroupArea, scenarioName);

        if (currentScenarios && currentScenarios.length > 0) {
            this.abortScenario(scenarioName);
        }

        return this._scenarioManager.startScenario(TelemeteryAreas.TaskGroupArea, scenarioName, startTime);
    }

    public startTTIScenario(scenarioName: string, isXhr?: boolean): IScenarioDescriptor {
        if (!this._isPageInteractiveScenarioStarted) {
            this._isPageInteractiveScenarioStarted = true;

            this._isXhrHubSwitch = isXhr;

            return this._scenarioManager.startScenarioFromNavigation(TelemeteryAreas.TaskGroupArea, scenarioName, true);
        }
        else {
            return null;
        }
    }

    public endScenario(scenarioName: string): void {
        const scenariosToEnd: IScenarioDescriptor[] = this._scenarioManager.getScenarios(TelemeteryAreas.TaskGroupArea, scenarioName);

        const pageInteractiveScenario: IScenarioDescriptor = Utils_Array.first(scenariosToEnd, (scenario: IScenarioDescriptor) => {
            return scenario.isPageInteractive();
        });

        if (!!pageInteractiveScenario && typeof this._isXhrHubSwitch !== "undefined") {
            pageInteractiveScenario.addData({
                isXHR: this._isXhrHubSwitch
            });
        }

        this._scenarioManager.endScenario(TelemeteryAreas.TaskGroupArea, scenarioName);
    }

    public abortScenario(scenarioName: string): void {
        this._scenarioManager.abortScenario(TelemeteryAreas.TaskGroupArea, scenarioName);
    }

    public split(splitName: string): void {
        this._scenarioManager.split(splitName);
    }

    private _postXhrNavigationHandler = () => {
        this._isPageInteractiveScenarioStarted = false;
        getEventService().detachEvent(HubEventNames.PreXHRNavigate, this._postXhrNavigationHandler);
    }

    private static _instance: PerfTelemetryManager;
    private _scenarioManager: IScenarioManager;
    private _isXhrHubSwitch: boolean;
    private _isPageInteractiveScenarioStarted: boolean = false;
}

export class TaskGroupTelemetry {
    public static initialize() {
        Telemetry.instance().setArea(TelemeteryAreas.TaskGroupArea);
    }

    public static exportTaskGroupClickedFromList() {
        Telemetry.instance().publishEvent(
            Features.exportTaskGroup,
            {
                [Events.click]: 1,
            },
            SourcePage.TaskGroups
        );
    }

    public static exportTaskGroupClickedFromEditor() {
        Telemetry.instance().publishEvent(
            Features.exportTaskGroup,
            {
                [Events.click]: 1,
            },
            SourcePage.TaskGroupEditor
        );
    }

    public static exportTaskGroupSucceeded() {
        Telemetry.instance().publishEvent(
            Features.exportTaskGroup,
            {
                [Events.success]: 1,
            }
        );
    }

    public static exportTaskGroupFailed() {
        Telemetry.instance().publishEvent(
            Features.exportTaskGroup,
            {
                [Events.failure]: 1,
            }
        );
    }

    public static importTaskGroupClicked() {
        Telemetry.instance().publishEvent(
            Features.importTaskGroup,
            {
                [Events.click]: 1,
            }
        );
    }

    public static importTaskGroupSucceeded() {
        Telemetry.instance().publishEvent(
            Features.importTaskGroup,
            {
                [Events.success]: 1,
            }
        );
    }

    public static importTaskGroupFailed() {
        Telemetry.instance().publishEvent(
            Features.importTaskGroup,
            {
                [Events.failure]: 1,
            }
        );
    }

    public static deleteTaskGroupClicked() {
        Telemetry.instance().publishEvent(
            Features.deleteTaskGroup,
            {
                [Events.click]: 1,
            }
        );
    }

    public static saveTaskGroupAsDraftClicked() {
        Telemetry.instance().publishEvent(
            Features.saveAsDraft,
            {
                [Events.click]: 1,
            }
        );
    }

    public static saveTaskGroupAsDraftSucceeded() {
        Telemetry.instance().publishEvent(
            Features.saveAsDraft,
            {
                [Events.success]: 1,
            }
        );
    }

    public static saveTaskGroupAsDraftFailed() {
        Telemetry.instance().publishEvent(
            Features.saveAsDraft,
            {
                [Events.failure]: 1,
            }
        );
    }

    public static publishDraftClicked(isPreview: boolean) {
        const feature = isPreview ? Features.publishDraftAsPreview : Features.publishDraft;
        Telemetry.instance().publishEvent(
            feature,
            {
                [Events.click]: 1,
            }
        );
    }

    public static publishDraftSucceeded(isPreview: boolean) {
        const feature = isPreview ? Features.publishDraftAsPreview : Features.publishDraft;
        Telemetry.instance().publishEvent(
            feature,
            {
                [Events.success]: 1,
            }
        );
    }

    public static publishDraftFailed(isPreview: boolean) {
        const feature = isPreview ? Features.publishDraftAsPreview : Features.publishDraft;
        Telemetry.instance().publishEvent(
            feature,
            {
                [Events.failure]: 1,
            }
        );
    }

    public static publishTaskGroupPreviewClicked() {
        Telemetry.instance().publishEvent(
            Features.publishPreview,
            {
                [Events.click]: 1,
            }
        );
    }

    public static publishTaskGroupPreviewSucceeded() {
        Telemetry.instance().publishEvent(
            Features.publishPreview,
            {
                [Events.success]: 1,
            }
        );
    }

    public static publishTaskGroupPreviewFailed() {
        Telemetry.instance().publishEvent(
            Features.publishPreview,
            {
                [Events.failure]: 1,
            }
        );
    }
}
