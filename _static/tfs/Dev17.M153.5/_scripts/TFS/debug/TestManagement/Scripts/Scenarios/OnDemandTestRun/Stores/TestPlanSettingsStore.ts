/// <reference types="jquery" />

import { Store } from "VSS/Flux/Store";

import { TestPlanSettingsTabKeyConstants } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Constants";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { TestPlanSettingsActionsHub } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Actions/TestPlanSettingsActionsHub";

export interface ITestPlanSettingsState {
    showDialog: boolean;
    selectedTabItemKey: string;
    errorMessage: string;
    isSaving: boolean;
    initialOutcomeSettings: boolean;
    currentOutcomeSettings: boolean;
    availableBuildDefinitions: IKeyValuePair<number, string>[];
    buildDefinitionNames: IDictionaryNumberTo<string>;
    buildDefinitionsLoading: boolean;
    selectedBuildDefinitionId: number;
    availableBuilds: IKeyValuePair<number, string>[];
    selectedBuildId: number;
    buildsLoading: boolean;
    availableReleaseDefinitions: IKeyValuePair<number, string>[];
    selectedReleaseDefinitionId: number;
    releaseDefinitionsLoading: boolean;
    availableReleaseEnvDefinitions: IKeyValuePair<number, string>[];
    selectedReleaseEnvDefinitionId: number;
    releaseEnvDefinitionsLoading: boolean;
}

export class TestPlanSettingsStore extends Store {

    constructor(private _actionsHub: TestPlanSettingsActionsHub) {
        super();
        this._initialize();
    }

    private _initialize(): void {
        this._state = this._getDefaultState();
        this._actionsHub.closeDialog.addListener(this._closeDialogListener);
        this._actionsHub.tabChanged.addListener(this._tabChangedListener);
        this._actionsHub.testOutcomeSettingsChanged.addListener(this._testOutcomeSettingsChangedListener);
        this._actionsHub.onError.addListener(this._onErrorListener);
        this._actionsHub.onErrorMessageClose.addListener(this._onErrorMessageCloseListener);
        this._actionsHub.savingSettings.addListener(this._onSettingsSavingListener);
        this._actionsHub.fetchingBuildDefinitions.addListener(this._fetchingBuildDefinitionsListener);
        this._actionsHub.fetchedBuildDefinitions.addListener(this._fetchedBuildDefinitionsListener);
        this._actionsHub.fetchingBuilds.addListener(this._fetchingBuildsListener);
        this._actionsHub.fetchedBuilds.addListener(this._fetchedBuildsListener);
        this._actionsHub.fetchingReleaseDefinitions.addListener(this._fetchingReleaseDefinitionsListener);
        this._actionsHub.fetchedReleaseDefinitions.addListener(this._fetchedReleaseDefinitionsListener);
        this._actionsHub.fetchingReleaseEnvDefinitions.addListener(this._fetchingReleaseEnvDefinitionsListener);
        this._actionsHub.fetchedReleaseEnvDefinitions.addListener(this._fetchedReleaseEnvDefinitionsListener);
        this._actionsHub.fetchedTestOutcomeSettings.addListener(this._fetchedTestOutcomeSettingsListener);
        this._actionsHub.buildDefinitionChanged.addListener(this._buildDefChangedListener);
        this._actionsHub.buildChanged.addListener(this._buildChangedListener);
        this._actionsHub.releaseDefinitionChanged.addListener(this._releaseDefChangedListener);
        this._actionsHub.releaseEnvDefinitionChanged.addListener(this._releaseEnvDefChangedListener);
    }

    public getState(): ITestPlanSettingsState {
        return this._state;
    }

    private _fetchingBuildDefinitionsListener = (fetching: boolean): void => {
        this._state.buildDefinitionsLoading = fetching;
        this.emitChanged();
    }

    private _fetchingBuildsListener = (fetching: boolean): void => {
        this._state.buildsLoading = fetching;
        this.emitChanged();
    }

    private _fetchingReleaseDefinitionsListener = (fetching: boolean): void => {
        this._state.releaseDefinitionsLoading = fetching;
        this.emitChanged();
    }

    private _fetchingReleaseEnvDefinitionsListener = (fetching: boolean): void => {
        this._state.releaseEnvDefinitionsLoading = fetching;
        this.emitChanged();
    }

    private _fetchedBuildDefinitionsListener = (buildDefs: IKeyValuePair<number, string>[]): void => {
        this._state.availableBuildDefinitions = buildDefs;
        this._state.buildDefinitionNames = {};
        buildDefs.forEach((buildDef: IKeyValuePair<number, string>) => {
            this._state.buildDefinitionNames[buildDef.key] = buildDef.value;
        });
        this.emitChanged();
    }

    private _fetchedBuildsListener = (builds: IKeyValuePair<number, string>[]): void => {
        if (builds && (builds.length === 0 || builds[0].key !== 0)) {
            // If latest build is not added to the builds already add it at the start
            builds.splice(0, 0, { key: 0, value: Resources.LatestBuildText } as IKeyValuePair<number, string>);
        }
        this._state.availableBuilds = builds;
        this.emitChanged();
    }

    private _fetchedReleaseDefinitionsListener = (releaseDefs: IKeyValuePair<number, string>[]): void => {
        this._state.availableReleaseDefinitions = releaseDefs;
        this.emitChanged();
    }

    private _fetchedReleaseEnvDefinitionsListener = (releaseEnvDefs: IKeyValuePair<number, string>[]): void => {
        this._state.availableReleaseEnvDefinitions = releaseEnvDefs;
        this.emitChanged();
    }

    private _buildDefChangedListener = (buildDefId: number): void => {
        this._state.selectedBuildDefinitionId = buildDefId;
        this.emitChanged();
    }

    private _buildChangedListener = (buildId: number): void => {
        this._state.selectedBuildId = buildId;
        this.emitChanged();
    }

    private _releaseDefChangedListener = (releaseDefId: number): void => {
        this._state.selectedReleaseDefinitionId = releaseDefId;
        this.emitChanged();
    }

    private _releaseEnvDefChangedListener = (releaseEnvDefId: number): void => {
        this._state.selectedReleaseEnvDefinitionId = releaseEnvDefId;
        this.emitChanged();
    }

    private _closeDialogListener = (): void => {
        this._state = { showDialog: false } as ITestPlanSettingsState;
        this.emitChanged();
    }

    private _onErrorListener = (errorMessage: string): void => {
        this._state.errorMessage = errorMessage;
        this._state.isSaving = false;
        this.emitChanged();
    }

    private _onErrorMessageCloseListener = (): void => {
        this._state.errorMessage = null;
        this.emitChanged();
    }

    private _onSettingsSavingListener = (): void => {
        this._state.isSaving = true;
        this.emitChanged();
    }

    private _tabChangedListener = (tabItemKey: string): void => {
        this._state.selectedTabItemKey = tabItemKey;
        this.emitChanged();
    }

    private _testOutcomeSettingsChangedListener = (checked: boolean): void => {
        this._state.currentOutcomeSettings = checked;
        this.emitChanged();
    }

    private _fetchedTestOutcomeSettingsListener = (checked: boolean): void => {
        this._state.initialOutcomeSettings = checked;
        this._state.currentOutcomeSettings = checked;
        this.emitChanged();
    }

    private _getDefaultState(): ITestPlanSettingsState {
        return {
            showDialog: true,
            selectedTabItemKey: TestPlanSettingsTabKeyConstants.RunSettings
        } as ITestPlanSettingsState;
    }

    private _state: ITestPlanSettingsState;
}
