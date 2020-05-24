import * as Q from "q";

import VSSError = require("VSS/Error");
import { IClassificationFieldsMruDataProvider } from "WorkItemTracking/Scripts/MruClassificationPicker/Stores/ClassificationFieldsMruStore";
import * as Telemetry from "VSS/Telemetry/Services";
import { Action } from "VSS/Flux/Action";
import { ClassificationFieldsMruSettingsUtils, IClassificationFieldsMruSettingsUtils } from "WorkItemTracking/Scripts/MruClassificationPicker/Actions/ClassificationFieldsMruSettingsUtils";
import { IClassificationFieldsMru, IAreaPathMruData, IIterationPathMruData } from "WorkItemTracking/Scripts/MruClassificationPicker/Models/ClassificationFieldsMru";

export class ActionsHub {
    // Classification fields mru actions
    public InitializeClassificationFieldsMru = new Action<IClassificationFieldsMru>();
    public SetAreaPathMru = new Action<IAreaPathMruData>();
    public SetIterationPathMru = new Action<IIterationPathMruData>();
}

export class ClassificationFieldsMruActionsCreator {

    private _mruSettingsUtils: IClassificationFieldsMruSettingsUtils;

    constructor(
        private _actionsHub: ActionsHub,
        private _classificationFieldsMruDataProvider: IClassificationFieldsMruDataProvider) {

        this._mruSettingsUtils = new ClassificationFieldsMruSettingsUtils();
    }

    public initializeClassificationFieldsMru(projectId: string) {
        if (this._classificationFieldsMruDataProvider.isLoaded(projectId)) {
            this._actionsHub.InitializeClassificationFieldsMru.invoke(null);
        } else if (!this._classificationFieldsMruDataProvider.isLoading(projectId)) {
            this._classificationFieldsMruDataProvider.setLoading(projectId, true);

            this._mruSettingsUtils.readMru(projectId).then((data: IDictionaryStringTo<any>) => {
                this._classificationFieldsMruDataProvider.setLoading(projectId, false);

                const mruValues = this._mruSettingsUtils.parseMru(projectId, data);
                this._actionsHub.InitializeClassificationFieldsMru.invoke(mruValues);
            }, this._logError);
        }
    }

    public addToAreaPathMru(projectId: string, values: number[]) {
        this._mruSettingsUtils.updateAreaPathMru(projectId, values).then((newValues: number[]) => {
            this._actionsHub.SetAreaPathMru.invoke({
                projectId: projectId,
                values: newValues
            });
        }, this._logError);
    }

    public addToIterationPathMru(projectId: string, values: number[]) {
        this._mruSettingsUtils.updateIterationPathMru(projectId, values).then((newValues: number[]) => {
            this._actionsHub.SetIterationPathMru.invoke({
                projectId: projectId,
                values: newValues
            });
        }, this._logError);
    }

    private _logError(e: Error) {
        VSSError.publishErrorToTelemetry(e);
    }
}
