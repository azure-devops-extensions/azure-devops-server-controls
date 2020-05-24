/// <reference types="jquery" />

import Navigation_Services = require("VSS/Navigation/Services");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

var navigationHistoryService = Navigation_Services.getHistoryService();

export function setNavigationStateParameter(key: string, value?: string, suppressNavigate: boolean = false): void {
    var state = navigationHistoryService.getCurrentState();
    if (value) {
        state[key] = value;
    }
    else {
        delete state[key];
    }
    navigationHistoryService.replaceHistoryPoint(state.action, state, null, suppressNavigate);
}

export function removeNavigationStateParameter(param: string, suppressNavigate: boolean = true): void {
    setNavigationStateParameter(param, null, suppressNavigate);
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("NavigationUtility", exports);
