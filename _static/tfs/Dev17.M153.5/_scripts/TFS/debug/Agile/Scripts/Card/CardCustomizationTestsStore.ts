/// <reference types="jquery" />

import Q = require("q");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import Utils_String = require("VSS/Utils/String");

const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
const settingsStore: IDictionaryStringTo<ITestAnnotationSettingsStore> = {};

/// <summary>
/// Returns an instance of test settings store used to get test related settings for kanban board
/// </summary>
/// <returns type="ITestAnnotationSettingsStore">test annotation settings store</returns>
export function getStore(teamId: string): ITestAnnotationSettingsStore {
    if (!settingsStore[teamId]) {
        settingsStore[teamId] = new TestAnnotationSettingsStore(teamId);
    }

    return settingsStore[teamId];
}

export interface ITestAnnotationSettingsStore {
    beginGetTestPlanId: () => IPromise<number>;
    beginSetTestPlanId: (id: number) => IPromise<any>;
    beginGetTestOutcomeSettings: () => IPromise<boolean>;
    beginSetTestOutcomeSettings: (propagateOutcome: boolean) => IPromise<any>;
}

/// <summary>
/// Implementation of test annotation settings store
/// </summary>
class TestAnnotationSettingsStore implements ITestAnnotationSettingsStore {
    private static _testPlanRegistryFormat = "TFSTests.Agile.Cards.TestAnnotation/Settings/TestPlan/{0}";
    private static _testOutcomeRegistryFormat = "MS.VS.TestManagement/TestOutcomeSettings/Team/{0}";

    private _teamId: string;

    constructor(teamId: string) {
        this._teamId = teamId;
    }

    /// <summary>
    /// gets the test plan id from the registry for a particular team
    /// </summary>
    /// <returns type="">promise with return type number</returns>
    public beginGetTestPlanId(): IPromise<number> {
        let key = this._getTestPlanSettingsRegistryKey();

        return this._beginReadProjectSettings(key)
            .then(response => {
                return response.value ? parseInt(response.value) : 0;
            });
    }

    /// <summary>
    /// sets the test plan id in the registry for a particular team
    /// </summary>
    /// <param name="id" type="number">test plan id</param>
    /// <returns type="">Promise</returns>
    public beginSetTestPlanId(id: number): IPromise<any> {
        let key = this._getTestPlanSettingsRegistryKey();

        return this._beginWriteProjectSettings(key, id ? id.toString() : "");
    }

    /// <summary>
    /// gets the test outcome propagation settings for the team
    /// </summary>
    /// <returns type="">Promise</returns>
    public beginGetTestOutcomeSettings(): IPromise<boolean> {
        let key = this._getTestOutcomeSettingsRegistryKey();

        return this._beginReadProjectSettings(key)
            .then(response => {
                return response.value ? response.value === "true" : false;
            });
    }

    /// <summary>
    /// sets the test outcome propagation settings for the team
    /// </summary>
    /// <param name="propagateOutcome" type="boolean"></param>
    /// <returns type="">Promise</returns>
    public beginSetTestOutcomeSettings(propagateOutcome: boolean): IPromise<any> {
        let key = this._getTestOutcomeSettingsRegistryKey();

        return this._beginWriteProjectSettings(key, propagateOutcome ? "true" : "false");
    }

    private _beginReadProjectSettings(key: string): IPromise<any> {
        let deferred = Q.defer();

        let webSettings = TFS_OM_Common.ProjectCollection.getConnection(tfsContext)
            .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);

        webSettings.beginReadSetting(key, TFS_WebSettingsService.WebSettingsScope.Project,
            deferred.resolve, deferred.reject);

        return deferred.promise;
    }

    private _beginWriteProjectSettings(key: string, value: string): IPromise<any> {
        let deferred = Q.defer();

        let webSettings = TFS_OM_Common.ProjectCollection.getConnection(tfsContext)
            .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);

        webSettings.beginWriteSetting(key, value, TFS_WebSettingsService.WebSettingsScope.Project,
            deferred.resolve, deferred.reject);

        return deferred.promise;
    }

    private _getTestPlanSettingsRegistryKey() {
        return Utils_String.format(TestAnnotationSettingsStore._testPlanRegistryFormat, this._teamId);
    }

    private _getTestOutcomeSettingsRegistryKey() {
        return Utils_String.format(TestAnnotationSettingsStore._testOutcomeRegistryFormat, this._teamId);
    }
}
