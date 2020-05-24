import { ReleaseGatesStatusIndicator, IIndicatorViewInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

export class ReleaseGateStatusHelper {

    public static getGateInfo(statusIndicator: ReleaseGatesStatusIndicator): IIndicatorViewInfo {
        const gateInfo = this._gatesMap[statusIndicator];
        return gateInfo ? gateInfo : { iconName: "ReleaseGate" };
    }

    private static _initializeGateMap(): IDictionaryStringTo<IIndicatorViewInfo> {
        let gatesMap: IDictionaryStringTo<IIndicatorViewInfo> = {};
        gatesMap[ReleaseGatesStatusIndicator.Pending] = { iconName: "ReleaseGate" };
        gatesMap[ReleaseGatesStatusIndicator.InProgress] = { iconName: "ReleaseGate" };
        gatesMap[ReleaseGatesStatusIndicator.Failed] = { iconName: "ReleaseGateError" };
        gatesMap[ReleaseGatesStatusIndicator.Succeeded] = { iconName: "ReleaseGateCheck" };
        gatesMap[ReleaseGatesStatusIndicator.Canceled] = { iconName: "ReleaseGateError" };
        return gatesMap;
    }

    private static _gatesMap: IDictionaryStringTo<IIndicatorViewInfo> = ReleaseGateStatusHelper._initializeGateMap();
}