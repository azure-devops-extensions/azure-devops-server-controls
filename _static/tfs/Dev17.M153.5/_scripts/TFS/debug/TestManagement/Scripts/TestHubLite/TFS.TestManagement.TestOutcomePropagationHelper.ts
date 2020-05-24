import TMControls = require("TestManagement/Scripts/TFS.TestManagement.Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Utils_String = require("VSS/Utils/String");

import Q = require("q");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");

let TfsContext = TFS_Host_TfsContext.TfsContext;

export class TestOutcomePropagationHelper {
    /**
     * Launches test outcome settings dialog
     */
    public static launchTestOutcomeSettingsDialog(node: any) {
        let launchDialog = (isEnabled: boolean) => {
            let options = { enabled: isEnabled, planId: node.plan.id, planName: node.plan.name };
            TMControls.TestDialogs.configureOutcomeSettings(options);
        };

        TestOutcomePropagationHelper.beginGetTestOutcomeSettings(node.plan.id).then(launchDialog);
    }

    public static beginGetTestOutcomeSettings(planId: number): IPromise<boolean> {
        let key = TestOutcomePropagationHelper._getTestOutcomeSettingsRegistryKey(planId);

        return this._beginReadProjectSettings(key)
            .then(response => {
                return response.value ? response.value === "true" : false;
            });
    }

    public static beginSetTestOutcomeSettings(planId: number, propagateOutcome: boolean): IPromise<any> {
        let key = this._getTestOutcomeSettingsRegistryKey(planId);

        return this._beginWriteProjectSettings(key, propagateOutcome ? "true" : "false");
    }

    private static _getTestOutcomeSettingsRegistryKey(planId: number) {
        return Utils_String.format("MS.VS.TestManagement/TestOutcomeSettings/TestPlan/{0}", planId);
    }

    private static _beginReadProjectSettings(key: string): IPromise<any> {
        let deferred = Q.defer();

        let webSettings = TFS_OM_Common.ProjectCollection.getConnection(TfsContext.getDefault())
            .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);

        webSettings.beginReadSetting(key, TFS_WebSettingsService.WebSettingsScope.Project,
            deferred.resolve, deferred.reject);

        return deferred.promise;
    }

    private static _beginWriteProjectSettings(key: string, value: string): IPromise<any> {
        let deferred = Q.defer();

        let webSettings = TFS_OM_Common.ProjectCollection.getConnection(TfsContext.getDefault())
            .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);

        webSettings.beginWriteSetting(key, value, TFS_WebSettingsService.WebSettingsScope.Project,
            deferred.resolve, deferred.reject);

        return deferred.promise;
    }
}
