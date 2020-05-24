import * as NavigationService from "VSS/Navigation/Services";
import * as Utils_String from "VSS/Utils/String";

export class NavigationStateUtils {

    public static getRunId(): number {
        return this._getIntValueFromState(NavigationStateUtils.c_runId);
    }

    public static getResultId(): number {
        return this._getIntValueFromState(NavigationStateUtils.c_resultIdKey);
    }

    public static getPaneView(): string {
        return this._getStringValueFromState(NavigationStateUtils.c_paneViewKey);
    }

    public static getAction(): string {
        let state: any = NavigationService.getHistoryService().getCurrentState();
        if (state && state.action) {
            return state.action;
        }
        else {
            return Utils_String.empty;
        }
    }

    private static _getIntValueFromState(key: string): number {
        let state: any = NavigationService.getHistoryService().getCurrentState();
        let value: number = 0;
        if (state && state[key]) {
            value = parseInt(state[key], 10);
        }

        return value;
    }

    private static _getStringValueFromState(key: string): string {
        let state: any = NavigationService.getHistoryService().getCurrentState();
        if (state){
            return state[key];
        }
    }

    private static readonly c_resultIdKey = "resultId";
    private static readonly c_runId = "runId";
    private static readonly c_paneViewKey = "paneView";
}