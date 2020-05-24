import * as Q from "q";
import { TestPlanSettingsActionsHub } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Actions/TestPlanSettingsActionsHub";
import { TestPlanSettingsSource } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Sources/TestPlanSettingsSource";

import * as TCMContracts from "TFS/TestManagement/Contracts";

export class TestPlanSettingsActionsCreator {

    constructor(private _actionsHub: TestPlanSettingsActionsHub, private _source: TestPlanSettingsSource) {
    }

    public populateTestPlanSettingsOptions(testPlan: TCMContracts.TestPlan) {
        this.populateTestOutcomeSettings(testPlan.id);
        const showSavedTestPlanSettings = !!(testPlan && testPlan.buildDefinition && testPlan.buildDefinition.id);
        this.populateBuildDefinitions(showSavedTestPlanSettings, testPlan);
    }

    public buildDefChanged(buildDefId: number, showSavedTestPlanSettings: boolean, testPlan: TCMContracts.TestPlan) {
        this._actionsHub.buildDefinitionChanged.invoke(buildDefId);
        this.populateBuilds(buildDefId, showSavedTestPlanSettings, testPlan);
        this.populateReleaseDefinitions(buildDefId, showSavedTestPlanSettings, testPlan, false);
    }

    public buildChanged(buildId: number) {
        this._actionsHub.buildChanged.invoke(buildId);
    }

    public releaseDefinitionChanged(releaseDefId: number, showSavedTestPlanSettings: boolean, testPlan: TCMContracts.TestPlan) {
        this._actionsHub.releaseDefinitionChanged.invoke(releaseDefId);
        this.populateReleaseEnvDefinitions(releaseDefId, showSavedTestPlanSettings, testPlan);
    }

    public refreshReleaseDefinitionsForBuildDef(buildDefId: number, selectedReleaseDefId: number, testPlan: TCMContracts.TestPlan) {
        this.populateReleaseDefinitions(buildDefId, false, testPlan, true, selectedReleaseDefId);
    }

    public releaseEnvDefinitionChanged(releaseEnvDefId: number) {
        this._actionsHub.releaseEnvDefinitionChanged.invoke(releaseEnvDefId);
    }

    public saveTestPlanSettings(
        testPlanId: number, buildDefId: number, buildId: number, releaseDefId: number, releaseEnvDefId: number,
        onSaveCallback?: (testPlan: TCMContracts.TestPlan) => void
    ): void {
        this._actionsHub.savingSettings.invoke(null);
        this._source.associateReleaseDefinitionToTestPlan(testPlanId, buildDefId, buildId, releaseDefId, releaseEnvDefId)
            .then((testPlan: TCMContracts.TestPlan) => {
                if (testPlan) {
                    if (onSaveCallback) {
                        onSaveCallback(testPlan);
                    }
                    this._actionsHub.closeDialog.invoke(null);
                }
            })
            .then(null, (reason) => {
                this._handleError(reason);
            });
    }

    public populateTestOutcomeSettings(testPlanId: number): void {
        this._source.getTestOutcomeSettingsForTestPlan(testPlanId).then((enabled: boolean) => {
            this._actionsHub.fetchedTestOutcomeSettings.invoke(enabled);
        }, (error) => {
            this._handleError(error);
        });
    }

    public saveTestOutcomeSettings(testPlanId: number, outcomeSetting: boolean): void {
        this._actionsHub.savingSettings.invoke(null);
        this._source.saveTestOutcomeSettingsForTestPlan(testPlanId, outcomeSetting).then(() => {
            this._actionsHub.closeDialog.invoke(null);
        }, (error) => {
            this._handleError(error);
        });
    }

    public closeDialog(): void {
        this._actionsHub.closeDialog.invoke(null);
    }

    public changeTab(key: string): void {
        this._actionsHub.tabChanged.invoke(key);
    }

    public setTestOutcomeSetting(checked: boolean): void {
        this._actionsHub.testOutcomeSettingsChanged.invoke(checked);
    }

    private _handleError(error: Error) {
        this._actionsHub.onError.invoke(error.message || error.toString());
    }

    public closeErrorMessage(): void {
        this._actionsHub.onErrorMessageClose.invoke(null);
    }

    public populateBuildDefinitions(showSavedTestPlanSettings: boolean, testPlan: TCMContracts.TestPlan): IPromise<IKeyValuePair<number, string>[]> {
        const defer = Q.defer<IKeyValuePair<number, string>[]>();
        this._actionsHub.fetchingBuildDefinitions.invoke(true);
        this._source.fetchBuildDefinitions().then((builddefs: IKeyValuePair<number, string>[]) => {
            this._actionsHub.fetchedBuildDefinitions.invoke(builddefs);
            if (builddefs && builddefs.length > 0 && showSavedTestPlanSettings) {
                this.buildDefChanged(parseInt(testPlan.buildDefinition.id), true, testPlan);
            }
            this._actionsHub.fetchingBuildDefinitions.invoke(false);
            defer.resolve(builddefs);
        }).then(null, (reason) => {
            this._handleError(reason);
            defer.reject(reason);
            });
        return defer.promise;
    }

    public populateBuilds(buildId: number, showSavedTestPlanSettings: boolean, testPlan: TCMContracts.TestPlan) {
        const defer = Q.defer<IKeyValuePair<number, string>[]>();
        this._actionsHub.fetchingBuilds.invoke(true);
        this._source.fetchBuilds(buildId).then((builds: IKeyValuePair<number, string>[]) => {
            this._actionsHub.fetchedBuilds.invoke(builds);
            if (builds && builds.length > 0) {
                if (showSavedTestPlanSettings && testPlan && testPlan.build && testPlan.build.id) {
                    this.buildChanged(parseInt(testPlan.build.id));
                } else {
                    this.buildChanged(builds[0].key);
                }
            }
            this._actionsHub.fetchingBuilds.invoke(false);
            defer.resolve(builds);
        }).then(null, (reason) => {
            this._handleError(reason);
            defer.reject(reason);
            });
        return defer.promise;
    }

    public populateReleaseDefinitions(buildDefId: number, showSavedTestPlanSettings: boolean, testPlan: TCMContracts.TestPlan, forceRefresh: boolean, selectedReleaseDefinitionId?: number): IPromise<IKeyValuePair<number, string>[]> {
        const defer = Q.defer<IKeyValuePair<number, string>[]>();
        this._actionsHub.fetchingReleaseDefinitions.invoke(true);
        this._source.fetchAssociatedReleaseDefinitions(buildDefId, forceRefresh).then((releaseDefs: IKeyValuePair<number, string>[]) => {
            this._actionsHub.fetchedReleaseDefinitions.invoke(releaseDefs);
            if (forceRefresh && selectedReleaseDefinitionId) {
                this.releaseDefinitionChanged(selectedReleaseDefinitionId, false, testPlan);
            } else if (showSavedTestPlanSettings && testPlan && testPlan.releaseEnvironmentDefinition && testPlan.releaseEnvironmentDefinition.definitionId) {
                this.releaseDefinitionChanged(testPlan.releaseEnvironmentDefinition.definitionId, showSavedTestPlanSettings, testPlan);
            } else {
                if (releaseDefs && releaseDefs.length > 0) {
                    this.releaseDefinitionChanged(releaseDefs[0].key, false, testPlan);
                } else {
                    this._actionsHub.releaseDefinitionChanged.invoke(0);
                    this._actionsHub.releaseEnvDefinitionChanged.invoke(0);
                    this._actionsHub.fetchedReleaseEnvDefinitions.invoke([]);
                }
            }
            this._actionsHub.fetchingReleaseDefinitions.invoke(false);
            defer.resolve(releaseDefs);
        }).then(null, (reason) => {
            this._actionsHub.fetchingReleaseDefinitions.invoke(false);
            this._handleError(reason);
            defer.reject(reason);
            });
        return defer.promise;
    }

    public populateReleaseEnvDefinitions(releaseDefinitionId: number, showSavedTestPlanSettings: boolean, testPlan: TCMContracts.TestPlan
    ): IPromise<IKeyValuePair<number, string>[]> {
        const defer = Q.defer<IKeyValuePair<number, string>[]>();
        this._actionsHub.fetchingReleaseEnvDefinitions.invoke(true);
        this._source.fetchAssociatedReleaseEnvDefinitions(releaseDefinitionId).then((releaseEnvDefs: IKeyValuePair<number, string>[]) => {
            this._actionsHub.fetchedReleaseEnvDefinitions.invoke(releaseEnvDefs);
            if (showSavedTestPlanSettings && testPlan && testPlan.releaseEnvironmentDefinition && testPlan.releaseEnvironmentDefinition.environmentDefinitionId) {
                this.releaseEnvDefinitionChanged(testPlan.releaseEnvironmentDefinition.environmentDefinitionId);
            } else {
                this.releaseEnvDefinitionChanged(releaseEnvDefs[0].key);
            }
            this._actionsHub.fetchingReleaseEnvDefinitions.invoke(false);
            defer.resolve(releaseEnvDefs);
        }).then(null, (reason) => {
            this._actionsHub.fetchingReleaseEnvDefinitions.invoke(false);
            this._handleError(reason);
            defer.reject(reason);
            });
        return defer.promise;
    }
}
