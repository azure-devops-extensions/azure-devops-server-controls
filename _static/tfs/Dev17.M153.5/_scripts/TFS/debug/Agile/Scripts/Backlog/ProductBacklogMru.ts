import Diag = require("VSS/Diag");

import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");

export module ShowParents {
    const FILTER_NAME = "AgileBacklog.ShowParentsFilter";

    /** Reads the most recently used (per-team) state for the 'Show Parents' filter.
        Defaults to false if MRU is not available. 
     * @param tfsContext TFS context to retrieve setting for
     */
    export function getMRUState(tfsContext?: TFS_Host_TfsContext.TfsContext): boolean {
        var tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();

        var key = _getShowParentsFilterStorageKey();
        var value = TFS_OM_Common.ProjectCollection.getConnection(tfsContext)
            .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService)
            .readLocalSetting(key, TFS_WebSettingsService.WebSettingsScope.UserAndTeam);
		
        // If MRU is unavailable/invalid, we return default but do not explicitly set the MRU, in order to allow
        // us to distinguish from explicit-off and change the default later.
        if (value === undefined || value === null) {
            Diag.logVerbose("Show Parents MRU state not defined. Defaulting to OFF.");
            return false;
        }

        return TFS_Core_Utils.BoolUtils.parse(value);
    }

    /** 
     * Sets the most recently used state (per-team) for the 'Show Parents' filter.
     * @param state Value to set for MRU
     * @param tfsContext TFS context to store setting for
     */
    export function setMRUState(state: boolean, tfsContext?: TFS_Host_TfsContext.TfsContext): void {
        Diag.Debug.assertIsNotNull(state, "Show Parents MRU state should not be null or undefined.");

        var tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();

        var key = _getShowParentsFilterStorageKey();
        var value = state.toString();

        TFS_OM_Common.ProjectCollection.getConnection(tfsContext)
            .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService)
            .writeLocalSetting(key, value, TFS_WebSettingsService.WebSettingsScope.UserAndTeam);
    }

    /** Determines the local storage key name for Show Parents MRU at a given backlog level. */
    function _getShowParentsFilterStorageKey(): string {
        return "/" + FILTER_NAME;
    }
}

export module BacklogsToolPanel {

    export const AREA_PRODUCTBACKLOG = "productbacklog";
    export const AREA_ITERATIONBACKLOG = "iterationbacklog";
    export const AREA_CAPACITYPLANNING = "capacityplanning";

    const FILTER_NAME = "AgileBacklog.Panel";

    /** Reads the most recently used state for BacklogsToolPanel filter.
     * @param area Area of backlogsToolPanel
     * @param tfsContext TFS context to retrieve setting for
     */
    export function getMRUPanel(area: string, tfsContext?: TFS_Host_TfsContext.TfsContext): string {
        Diag.Debug.assertIsNotNull(area, "BacklogsToolPanel - Area cannot be null or undefined.");

        tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();

        let key = _getFilterStorageKey(area);
        return TFS_OM_Common.ProjectCollection.getConnection(tfsContext)
            .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService)
            .readLocalSetting(key, TFS_WebSettingsService.WebSettingsScope.User);
    }

    /** 
     * Sets the most recently used state for BacklogsToolPanel filter.
     * @param area Area of backlogsToolPanel
     * @param state Value to set for MRU
     * @param tfsContext TFS context to store setting for
     */
    export function setMRUPanel(area: string, state: string, tfsContext?: TFS_Host_TfsContext.TfsContext): void {
        Diag.Debug.assertIsNotNull(area, "BacklogsToolPanel - Area cannot be null or undefined.");
        Diag.Debug.assertIsNotNull(state, "BacklogsToolPanel - MRU state should not be null or undefined.");

        tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();

        var key = _getFilterStorageKey(area);

        TFS_OM_Common.ProjectCollection.getConnection(tfsContext)
            .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService)
            .writeLocalSetting(key, state, TFS_WebSettingsService.WebSettingsScope.User);
    }

    /** Determines the local storage key name for BacklogsPane at a given backlog area.
     * @param area Area of backlogsToolPanel
     */
    function _getFilterStorageKey(area: string): string {
        return "/" + area + "/" + FILTER_NAME;
    }
}