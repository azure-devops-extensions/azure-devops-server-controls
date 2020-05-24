import * as TFS_Core_Utils from "Presentation/Scripts/TFS/TFS.Core.Utils";
import * as Q from "q";
import { MessageBarType } from "OfficeFabric/MessageBar";

import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { Message, StateChangeParams } from "ScaledAgile/Scripts/Shared/Models/PageImplementations";
import { PageLoadingState } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { DeliveryTimelineTeamSettingsActions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineTeamSettingsActions";
import { DeliveryTimelineTeamSettingsBusinessLogic } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineTeamSettingsBusinessLogic";
import { IDeliveryTimelineTeamSettingsDataProviders } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/DataProviders/IDeliveryTimelineTeamSettingsDataProviders";
import { ITeamSettingData, IProjectData, IInitialPayload, ITeamConfiguration, ITeamSelectedSettingData }
    from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsInterfaces";
import { IFieldShallowReference, ValueState } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import { ITeamBacklogMappingsProperties } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import { WizardSettingActions } from "ScaledAgile/Scripts/Views/Wizard/Actions/WizardActions";
import { IDeliveryTimelineTeamSettingsServerRequestCache } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineTeamSettingsServerRequestCache";
import { ITeamProjectDataCache, TeamProjectDataCache } from "ScaledAgile/Scripts/Shared/DataProviders/TeamProjectDataCache";
import { ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

export interface IDeliveryTimelineTeamSettingsActionCreator {
    /**
     * Initialize the delivery timeline wizard experience
     * @param {ITeamSettingData[]>} initialSettings - the initialSettings
     */
    initializeStore(initialSettings: ITeamSettingData[]): void;

    /**
     * Add a copy of the default setting into the settings array
     * @param {ITeamSettingData[]} settings - previous wizard setttings
     * @param {ITeamSettingData} defaultSettings - default wizard setting populate for newly added setting
     */
    addTeamSetting(settings: ITeamSettingData[], defaultSettings: ITeamSettingData): void;

    /**
     * Delete team setting with a specify index.
     * @param {ITeamSettingData[]} settings - previous wizard settings
     * @param {string} id - id of the wizard setting
     */
    deleteTeamSetting(settings: ITeamSettingData[], id: string): void;

    /**
     * Move team setting with a specify new index.
     * @param {ITeamSettingData[]} settings - previous wizard settings.
     * @param {string} id - id of the wizard setting that will move.
     * @param {number} newIndex - the new index of the setting.
     */
    moveTeamSetting(settings: ITeamSettingData[], id: string, newIndex: number): void;

    /**
     * Change the project selection
     * @param {ITeamSettingData[]} settings - previous wizard settings
     * @param {string} id - id of the wizard setting
     * @param {string} value - project value
     */
    changeProject(settings: ITeamSettingData[], id: string, value: string): void;

    /**
     * Change the team selection
     * @param {ITeamSettingData[]} settings - previous wizard settings
     * @param {string} id - id of the wizard setting
     * @param {string} value - team value
     */
    changeTeam(settings: ITeamSettingData[], id: string, value: string): void;

    /**
     * Change the work item type selection
     * @param {ITeamSettingData[]} settings - previous wizard settings
     * @param {string} id - id of the wizard setting
     * @param {string} value - the backlog level value
     */
    changeBacklogLevel(settings: ITeamSettingData[], id: string, value: string): void;
}

/**
 * Contains the creation of action for every views on ScaledAgile
 */
export class DeliveryTimelineTeamSettingsActionCreator implements IDeliveryTimelineTeamSettingsActionCreator {
    private _pageActions: PageActions;
    private _wizardDataProvider: IDeliveryTimelineTeamSettingsDataProviders;
    private _actions: DeliveryTimelineTeamSettingsActions;
    private _serverRequestCache: IDeliveryTimelineTeamSettingsServerRequestCache;
    protected _teamProjectDataCache: ITeamProjectDataCache;
    protected _logic: DeliveryTimelineTeamSettingsBusinessLogic;

    constructor(viewsDataProvider: IDeliveryTimelineTeamSettingsDataProviders, actions: DeliveryTimelineTeamSettingsActions, pageActions: PageActions, cache: IDeliveryTimelineTeamSettingsServerRequestCache) {
        // Note: pageActions can be null/undefined - when it is null/undefined error messages won't be displayed at the page level.
        this._wizardDataProvider = viewsDataProvider;
        this._actions = actions;
        this._pageActions = pageActions;
        this._teamProjectDataCache = new TeamProjectDataCache();
        this._logic = new DeliveryTimelineTeamSettingsBusinessLogic();
        this._serverRequestCache = cache;
    }

    /**
     * What: Set the values that will be available when the Wizard open. Handle the case of a new wizard and existing one
     * Why: Need to have one row to allow the user to add new team. Receive selected value from past configuration to allow to modify them
     * @param {ITeamSelectedSettingData[]} initialSettings : Can be null or empty object if new wizard. Otherwise, contains value selected by user
     */
    public initializeStore(initialSettings: ITeamSelectedSettingData[]): void {
        Q(this._wizardDataProvider.getInitialPayload()).done(
            (initialPayload: IInitialPayload) => {
                this._onGetInitialPayloadSuccessful(initialSettings, initialPayload);
            },
            (error: TfsError) => {
                this._onGetInitialPayloadFailed([]);
            });
    }

    /**
     * Add a copy of the default setting into the settings array
     * @param {ITeamSettingData[]} settings - previous wizard setttings
     * @param {ITeamSettingData} defaultSettings - default wizard setting populate for newly added setting
     */
    public addTeamSetting(settings: ITeamSettingData[], defaultSettings: ITeamSettingData) {
        // Fire WizardSettingChanging when setting is changing, this action is listened by the wizard store.
        // the wizard store will disable the create button.
        this._logic.addTeamSetting(settings, defaultSettings);
        this._fireSettingChanged(settings);
    }

    /**
     * Delete team setting with a specify index.
     * @param {ITeamSettingData[]} settings - previous wizard settings
     * @param {string} id - id of the wizard setting
     */
    public deleteTeamSetting(settings: ITeamSettingData[], id: string) {
        this._logic.deleteTeamSetting(settings, id);
        this._fireSettingChanged(settings);
    }

    /**
     * Move team setting with a specify new index.
     * @param {ITeamSettingData[]} settings - previous wizard settings.
     * @param {string} id - id of the wizard setting that will move.
     * @param {number} newIndex - the new index of the setting.
     */
    public moveTeamSetting(settings: ITeamSettingData[], id: string, newIndex: number) {
        var hasMoved = this._logic.moveTeamSetting(settings, id, newIndex);
        if (hasMoved) {
            this._fireSettingChanged(settings);
        }
    }

    /**
     * See IDeliveryTimelineWizardActionCreator.changeProject
     */
    public changeProject(settings: ITeamSettingData[], settingId: string, projectValue: string) {
        Q(this._changeProject(settings, settingId, projectValue, false)).done(
            () => { /* no-op, handled in _changeProject */ },
            () => this._onGetInitialPayloadFailed(settings)
        );
    }

    /**
     * Change the team selection
     * @param {ITeamSettingData[]} settings - previous wizard setttings
     * @param {string} settingId - id of the wizard setting
     * @param {string} teamValue - team value
     */
    public changeTeam(settings: ITeamSettingData[], settingId: string, teamValue: string): IPromise<ITeamSettingData> {
        let team = this._logic.validateTeam(settings, settingId, teamValue);
        if (!team) {
            // if value not exist in the list of available teams, set project for that setting to be invalid.
            this._logic.updateTeamName(settings, settingId, teamValue);
            this._fireSettingChanged(settings);
            const settingsForTheRow = settings.filter((value: ITeamSettingData) => value.id === settingId)[0];
            return Q.resolve(settingsForTheRow);
        }
        else {
            return this._updateTeam(settings, settingId, team);
        }
    }

    /**
    * Change the work item type selection
    * @param {ITeamSettingData[]} settings - previous wizard setttings
    * @param {string} settingId - id of the wizard setting
    * @param {string} value - the backlog level value
    */
    public changeBacklogLevel(settings: ITeamSettingData[], settingId: string, value: string) {
        let backlog = this._logic.validateBacklog(settings, settingId, value);
        if (!backlog) {
            this._logic.updateBacklogName(settings, settingId, value);
        }
        else {
            this._logic.updateBacklogLevel(settings, settingId, backlog);
        }
        this._fireSettingChanged(settings);
    }

    /**
     * Change the project selection
     * @param {ITeamSettingData[]} settings - previous wizard setttings rows
     * @param {string} settingId - the id of the setting row changing
     * @param {string} projectValue - project value
     * @param {boolean} isInitialLoad - is this first load?
     */
    public _changeProject(settings: ITeamSettingData[], settingId: string, projectValue: string, isInitialLoad: boolean): IPromise<ITeamSettingData> {
        let project = this._logic.validateProject(settings, settingId, projectValue);
        if (!project) {
            // if value not exist in the list of available projects, set project for that setting to be invalid.
            this._logic.updateProjectName(settings, settingId, projectValue);
            this._fireSettingChanged(settings);
            const settingsForTheRow = settings.filter((value: ITeamSettingData) => value.id === settingId)[0];
            return Q.resolve(settingsForTheRow);
        }
        else {
            return this._updateProject(settings, settingId, project, isInitialLoad);
        }
    }

    /**
     * public for testing
     */
    public _updateTeam(settings: ITeamSettingData[], settingId: string, team: IFieldShallowReference, isInitialLoad?: boolean): IPromise<ITeamSettingData> {
        if (this._teamProjectDataCache.isTeamConfigurationCached(team.id)) {
            // if team exist in cache
            let teamData = this._teamProjectDataCache.getTeamConfiguration(team.id);
            this._logic.updateTeam(settings, settingId, teamData);
            this._fireSettingChanged(settings);
            const settingsForTheRow = settings.filter((value: ITeamSettingData) => value.id === settingId)[0];
            return Q.resolve(settingsForTheRow);
        }
        else {
            // if team setting not exist in cache
            WizardSettingActions.WizardTeamSettingChanging.invoke(null);
            if (!isInitialLoad) {
                // on initial load, we don't show team settings rows until they have all been loaded, so no need to invoke this function
                this._setBacklogLoading(settings, settingId);
            }
            return this._loadTeam(settings, settingId, team);
        }
    }

    /**
     * What: Take the selected value and enhance them with available choices
     * Why: Users must choose from a list of available choices. At that point, initialize, we only have the selected value. Need to get all choices.
     * @param {ITeamSelectedSettingData} selectedData - The user selected data from the available data
     * @param {IInitialPayload} initialPayload - Contains all data from projects, teams and backlog
     * @return {ITeamSettingData} - Settings with selected value + available values (possible choices)
     */
    private _fillUpSelectionChoices(selectedData: ITeamSelectedSettingData, initialPayload: IInitialPayload): ITeamSettingData {
        const teamSettingsData = {
            id: TFS_Core_Utils.GUIDUtils.newGuid(), //Create a new setting
            project: selectedData.project,
            projects: initialPayload.initialSetting.projects,
            team: selectedData.team,
            teams: [],
            backlogLevel: selectedData.backlogLevel,
            backlogLevels: [],
        } as ITeamSettingData;
        teamSettingsData.project.name = this._getProjectNameFromId(selectedData.project.id, initialPayload); // We do not have the project name from the payload (just ID from team)
        return teamSettingsData;
    }

    private _getProjectNameFromId(projectId: string, initialPayload: IInitialPayload): string {
        let projectName: string = "";
        if (initialPayload) {
            initialPayload.initialSetting.projects.forEach((element: IFieldShallowReference) => {
                if (element.id === projectId) {
                    projectName = element.name;
                }
            });
        }
        return projectName;
    }

    private _getPreviousData(previousSettings: ITeamSettingData[], teamSettingId: string): ITeamSelectedSettingData {
        let returnValue: ITeamSelectedSettingData = null;
        previousSettings.some((element: ITeamSettingData, index: number, array: ITeamSettingData[]) => {
            if (teamSettingId === element.id) {
                returnValue = element;
                return true;
            }
        });
        return returnValue;
    }

    private _updateProject(settings: ITeamSettingData[], settingId: string, project: IFieldShallowReference, isInitialLoad: boolean = false): IPromise<ITeamSettingData> {
        if (this._teamProjectDataCache.isProjectCached(project.id)) {
            // If project data exists in the cache
            let projectData = this._teamProjectDataCache.getProjectData(project.id);
            this._logic.updateProject(settings, settingId, projectData);

            const deferred = Q.defer<ITeamSettingData>();
            const settingsForTheRow: ITeamSettingData = settings.filter((value: ITeamSettingData) => value.id === settingId)[0];
            const teamToUse = isInitialLoad ? settingsForTheRow.team : projectData.teams[0];
            Q(this._updateTeam(settings, settingId, teamToUse, isInitialLoad)).done((value: ITeamSettingData) => {
                deferred.resolve(settingsForTheRow);
            }, () => this._onGetInitialPayloadFailed(settings));


            return deferred.promise;
        }
        else {
            // if project data not exist in cache
            WizardSettingActions.WizardTeamSettingChanging.invoke(null);
            if (!isInitialLoad) {
                // on initial load, we don't show team settings rows until they have all been loaded, so no need to invoke this function
                this._setTeamAndBacklogLoading(settings, settingId);
            }
            return this._loadProject(settings, settingId, project);
        }
    }

    private _loadProject(settings: ITeamSettingData[], settingId: string, project: IFieldShallowReference): IPromise<ITeamSettingData> {
        const deferred = Q.defer<ITeamSettingData>();
        // set the lastest project id corresponding to the setting id that will send to get data from server.
        this._serverRequestCache.set(settingId, project.id);
        Q(this._wizardDataProvider.getProjectData(project)).done((projectData: IProjectData) => {
            // update cache
            this._teamProjectDataCache.setProjectData(project.id, projectData);
            this._logic.updateProject(settings, settingId, projectData);
            return this._wizardDataProvider.getTeamConfiguration(projectData.project, projectData.teams[0], projectData.allBacklogs)
                .then((teamConfig: ITeamConfiguration) => {
                    this._teamProjectDataCache.setTeamConfiguration(projectData.teams[0].id, teamConfig);
                    this._logic.updateTeam(settings, settingId, teamConfig);
                    if (this._serverRequestCache.get(settingId) === projectData.project.id) {
                        // only invoke setting changed if the project retrieved is the lastest project that was asked for given the setting id.
                        this._serverRequestCache.delete(settingId);
                        this._fireSettingChanged(settings);
                        const settingsForTheRow = settings.filter((value: ITeamSettingData) => value.id === settingId)[0];
                        deferred.resolve(settingsForTheRow);
                    }
                });
        }, () => this._onGetInitialPayloadFailed(settings));
        return deferred.promise;
    }

    public _loadTeam(settings: ITeamSettingData[], settingId: string, team: IFieldShallowReference): IPromise<ITeamSettingData> {
        const deferred = Q.defer<ITeamSettingData>();
        // set the lastest team id corresponding to the setting id that will send to get data from server.
        this._serverRequestCache.set(settingId, team.id);
        let project = settings.filter(x => x.id === settingId)[0].project;
        let projectData = this._teamProjectDataCache.getProjectData(project.id);

        const handleTeamConfig = (teamConfig: ITeamConfiguration) => {
            // update cache
            this._teamProjectDataCache.setTeamConfiguration(team.id, teamConfig);
            this._logic.updateTeam(settings, settingId, teamConfig);
            if (this._serverRequestCache.get(settingId) === teamConfig.team.id) {
                // only invoke setting changed if the team retrieved is the lastest team that was asked for given the setting id.
                this._serverRequestCache.delete(settingId);
                this._fireSettingChanged(settings);
                const settingsForTheRow = settings.filter((value: ITeamSettingData) => value.id === settingId)[0];
                deferred.resolve(settingsForTheRow);
            }
        };

        if (this._teamProjectDataCache.isTeamConfigurationBeingRequested(team.id)) {
            Q(this._teamProjectDataCache.getTeamConfigurationBeingRequest(team.id)).done((teamConfig: ITeamConfiguration) => {
                handleTeamConfig(teamConfig);
                this._teamProjectDataCache.clearTeamConfigurationRequest(team.id);
            }, (reason: any) => {
                this._onGetInitialPayloadFailed(settings);
            }, () => this._onGetInitialPayloadFailed(settings));
        }
        else {
            const promise = this._wizardDataProvider.getTeamConfiguration(project, team, projectData.allBacklogs);
            this._teamProjectDataCache.setTeamConfigurationRequest(team.id, promise);
            Q(promise).done((teamConfig: ITeamConfiguration) => {
                handleTeamConfig(teamConfig);
                this._teamProjectDataCache.clearTeamConfigurationRequest(team.id);
            }, (reason: any) => {
                this._onGetInitialPayloadFailed(settings);
            }, () => this._onGetInitialPayloadFailed(settings));
        }
        return deferred.promise;
    }

    /**
     * Invoke the WizardSettingChanged event that Wizard is listening to
     * @param {string} settings - the current settings
     */
    private _fireSettingChanged(settings: ITeamSettingData[]) {
        let settingProperties = this._logic.toViewProperties(settings);
        this._actions.settingChanged.invoke({ settings: settings, validationResult: settingProperties.validationState });
        this._invokeSettingChangedAction(settingProperties);
    }

    public _invokeSettingChangedAction(settingProperties: ITeamBacklogMappingsProperties) {
        WizardSettingActions.WizardTeamSettingChanged.invoke(settingProperties);
    }

    /**
     * Invoke when setting is changing while waiting for server.
     * @param {string} settings - the current settings
     * @param {string} id - the id of the wizard settings.
     */
    private _setTeamAndBacklogLoading(settings: ITeamSettingData[], id: string) {
        this._logic.setTeamToLoading(settings, id);
        this._setBacklogLoading(settings, id);
    }

    private _setBacklogLoading(settings: ITeamSettingData[], id: string) {
        this._logic.setBacklogToLoading(settings, id);
        this._fireSettingChanged(settings);
    }

    /**
     * Callback on success of getInitialPayload() call.
     * @param {ITeamSelectedSettingData[]} initialSettings - Initial settings.
     * @param {IInitialPayload} initialPayload - result of getInitialPayload call.
     */
    private _onGetInitialPayloadSuccessful(initialSettings: ITeamSelectedSettingData[], initialPayload: IInitialPayload): void {
        this._teamProjectDataCache.initialize(initialPayload.initialProjectData, initialPayload.initialTeamData);
        this._invokeSettingChangedAction(this._logic.toViewProperties([initialPayload.initialSetting]));

        // Merge with initial settings in update senarios in the future.
        const teamSettings: ITeamSettingData[] = [];
        if (initialSettings && initialSettings instanceof Array) {
            initialSettings.forEach((element: ITeamSelectedSettingData) => {
                let elementWithSelectionChoices = this._fillUpSelectionChoices(element, initialPayload);
                teamSettings.push(elementWithSelectionChoices);
            });

            //This is not great, we will loop all setting's lines and trigger the update to get available choices in the combo.
            const allExistingSettingsFrozen = $.extend(true, {}, teamSettings) as ITeamSettingData[]; // From the component, from its state, from the store
            const allExistingSettingsFrozenArray = Object.keys(allExistingSettingsFrozen).map<ITeamSettingData>((key: any) => allExistingSettingsFrozen[key]);
            const allPromises: Q.IPromise<void>[] = [];
            teamSettings.forEach((element: ITeamSettingData) => {
                //Loop all rows, change change project to be the same ID, just to kick off the code to get teams selection
                const promiseResult = this._changeProject(teamSettings, element.id, element.project.name, true).then((oneRow: ITeamSettingData) => {
                    const previousSettings = this._getPreviousData(allExistingSettingsFrozenArray, element.id);
                    oneRow.project = previousSettings.project; // Select back the initial value
                    oneRow.project.valueState = ValueState.ReadyAndValid; // Was valid, remain valid
                    oneRow.team = previousSettings.team; // Select back the initial value
                    oneRow.team.valueState = ValueState.ReadyAndValid; // Was valid, remain valid
                    oneRow.backlogLevel = previousSettings.backlogLevel; // Select back the initial value
                    oneRow.backlogLevel.valueState = ValueState.ReadyAndValid; // Was valid, remain valid
                });
                allPromises.push(promiseResult);
            });
            Q.allSettled(allPromises).done((value: Q.PromiseState<void>[]) => {
                var rejectedPromise = value.filter((promiseState: Q.PromiseState<void>) => promiseState.state === "rejected");
                if (rejectedPromise.length === 0) {
                    // We need to clone the setting, to remove the reference between them.
                    this._actions.initialize.invoke({
                        defaultSetting: this._logic.cloneTeamSetting(initialPayload.initialSetting),
                        settings: teamSettings,
                        validationState: ValidationState.Success,
                        message: ""
                    });
                }
                else {
                    this._onGetInitialPayloadFailed(teamSettings);
                }
            });
        }
        else {
            teamSettings.push(this._logic.cloneTeamSetting(initialPayload.initialSetting)); // This is the "new empty row"
            // We need to clone the setting, to remove the reference between them.
            this._actions.initialize.invoke({
                defaultSetting: this._logic.cloneTeamSetting(initialPayload.initialSetting),
                settings: teamSettings,
                validationState: ValidationState.Success,
                message: ""
            });
            if (this._pageActions) {
                this._pageActions.setPageLoadingState.invoke(PageLoadingState.FullyLoaded);
            }
        }
    }

    private _onGetInitialPayloadFailed(initialSettings: ITeamSettingData[]): void {
        // If we have page actions (to display messages) invoke that action.
        if (this._pageActions) {
            this._pageActions.setPageLoadingStateWithMessage.invoke(new StateChangeParams(PageLoadingState.Fail, new Message(MessageBarType.error, ScaledAgileResources.ErrorInitializingNewPlanTeamSettings, false)));
        }
        this._actions.initialize.invoke({
            defaultSetting: null,
            settings: initialSettings, // Pass the initial settings, so that those can be fixed in the UI
            validationState: ValidationState.Error,
            message: ScaledAgileResources.ErrorInitializingWizardTeamSettings
        });
    }
}