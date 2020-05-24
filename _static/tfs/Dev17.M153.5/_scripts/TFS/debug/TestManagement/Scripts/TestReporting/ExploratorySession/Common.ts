/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
*/


import VSS = require("VSS/VSS");

export class FilterSelectors {
    public static owner = ".session-owner-filter";
    public static period = ".session-period-filter";
    public static query = ".query-selector-filter";
    public static team = ".session-team-filter";
}


// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("ExploratorySession/Common", exports);