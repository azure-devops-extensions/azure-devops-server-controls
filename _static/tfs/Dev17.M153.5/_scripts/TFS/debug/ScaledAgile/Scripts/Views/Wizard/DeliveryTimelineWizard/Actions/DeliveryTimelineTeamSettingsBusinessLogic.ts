import * as TFS_Core_Utils from "Presentation/Scripts/TFS/TFS.Core.Utils";
import * as WorkContracts from "TFS/Work/Contracts";

import { ITeamSettingData, IProjectData, ITeamConfiguration } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsInterfaces";
import { IFieldShallowReference, ValueState } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import {ITeamBacklogMappingsProperties} from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import {IModelWithValidation, ValidationState} from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";

/**
 * The file is handle:
 * * The cached project data we have pull from the server
 * * The settings to view properties transform
 * * The validation of the settings
 */
export class DeliveryTimelineTeamSettingsBusinessLogic {
    // This is a dummy field used for setting that a field is currently loading from server. The isLoading property is used for rendering.
    public static loadingDummyField = { id: "", name: ScaledAgileResources.WizardLoadingLabel, valueState: ValueState.IsLoading } as IFieldShallowReference;
    /**
     * It converts the wizard settings to view properties
     * @param {string} settings - the current wizard settings
     */
    public toViewProperties(settings: ITeamSettingData[]): ITeamBacklogMappingsProperties {
        if (!settings) {
            throw new Error("wizard settings cannot be null");
        }

        let teamBacklogMappings: WorkContracts.TeamBacklogMapping[] = [];
        for (let i = 0; i < settings.length; i++) {
            let setting = settings[i];
            let backlogReferenceName = setting.backlogLevel.id;
            teamBacklogMappings.push({
                teamId: setting.team.id,
                categoryReferenceName: backlogReferenceName
            });
        }
        return {
            teamBacklogMappings: teamBacklogMappings,
            validationState: this.validateSettings(settings)
        };
    }

    /**
     * Validate the settings are valid or not
     * @param {string} settings - the current wizard settings
     * @return {IModelWithValidation} Success if valid, warning if the team settings are not unique, error if the team settings are not valid
     */
    public validateSettings(settings: ITeamSettingData[]): IModelWithValidation {
        if (settings == null || settings.length === 0) {
            return {
                validationState: ValidationState.Error
            } as IModelWithValidation;
        }

        // Change this validation when we support a multi-select support dropdown
        // Right now we validate whether we have the same team with the same work item type within the array of settings.
        for (let i = 0, l = settings.length; i < l; i++) {
            let setting = settings[i];
            if (!setting.project || !setting.team || !setting.team.id || !setting.backlogLevel || !setting.backlogLevel.id) {
                return {
                    validationState: ValidationState.Error
                } as IModelWithValidation;
            }

            let isValid = setting.project.valueState === ValueState.ReadyAndValid
                && setting.team.valueState === ValueState.ReadyAndValid
                && setting.backlogLevel.valueState === ValueState.ReadyAndValid;
            if (!isValid) {
                return {
                    validationState: ValidationState.Error
                } as IModelWithValidation;
            }
        }

        // validate if the same backlog level of the same team has been selected.
        return this.validateUniqueTeamSettings(settings);
    }

    /**
     * Validate if the one team's backlog level in the settings are unique
     * @param {string} settings - the current wizard settings
     * @return {IModelWithValidation} Success if unique, warning if the team settings are not unique
     */
    public validateUniqueTeamSettings(settings: ITeamSettingData[]): IModelWithValidation {
        let uniqueTeamSettings: IDictionaryStringTo<string[]> = {};
        for (let i = 0, len = settings.length; i < len; i++) {
            let setting = settings[i];
            if (!uniqueTeamSettings[setting.team.id]) {
                uniqueTeamSettings[setting.team.id] = [];
            }
            else if (setting.backlogLevel.id.length > 0 && uniqueTeamSettings[setting.team.id].indexOf(setting.backlogLevel.id) >= 0) {
                return {
                    validationState: ValidationState.Warning
                } as IModelWithValidation;
            }
            uniqueTeamSettings[setting.team.id].push(setting.backlogLevel.id);
        }

        return {
            validationState: ValidationState.Success
        } as IModelWithValidation;
    }

    /**
     * Update the project name only and set it as invalid which shouldn't and need more refactoring since that method depend strongly to updateProject method.
     * @param {string} settings - the current wizard settings
     * @param {string} id - the id of wizard setting that has change
     * @param {string} value - the current value of the project in setting
     */
    public updateProjectName(settings: ITeamSettingData[], id: string, projectName: string) {
        let index = this._getTeamSettingIndex(settings, id);
        if (index > -1) {
            let teamSetting = settings[index];
            if (projectName != null) {
                teamSetting.project.name = projectName;
            }
            teamSetting.project.valueState = ValueState.ReadyButInvalid;
        }
    }

    /**
     * Update the project in settings
     * @param {string} settings - the current wizard settings
     * @param {string} id - the id of wizard setting that has change
     * @param {IProjectData} projectData - the new project Data
     * @param {ITeamConfiguration} defaultTeamData - the default team configuration for the project
     * @param {string} value - the current value of the project in setting
     */
    public updateProject(settings: ITeamSettingData[],
        id: string,
        projectData: IProjectData) {
        let index = this._getTeamSettingIndex(settings, id);
        if (index > -1) {
            let teamSetting = settings[index];
            let project = this._cloneFieldRef(projectData.project);
            let teams = this._cloneFieldRefArray(projectData.teams);
            project.valueState = ValueState.ReadyAndValid;
            teamSetting.project = project;
            teamSetting.teams = teams;
        }
    }

    /**
     * Update the team name only and set it as invalid which shouldn't and need more refactoring since that method depend strongly to updateTeam method.
     * @param {string} settings - the current wizard settings
     * @param {string} id - the id of wizard setting that has change
     * @param {string} value - the current value of the team in setting
     */
    public updateTeamName(settings: ITeamSettingData[], id: string, teamName: string) {
        let index = this._getTeamSettingIndex(settings, id);
        if (index > -1) {
            let teamSetting = settings[index];
            if (teamName != null) {
                teamSetting.team.name = teamName;
            }
            teamSetting.team.valueState = ValueState.ReadyButInvalid;
        }
    }

    /**
     * Update the team
     * @param {string} settings - the current wizard settings
     * @param {string} id - the id of wizard setting that has change
     * @param {ITeamConfiguration} teamData - the new team configuration
     * @param {string} value - the current value of the team in setting
     */
    public updateTeam(settings: ITeamSettingData[],
        id: string,
        teamData: ITeamConfiguration) {
        let index = this._getTeamSettingIndex(settings, id);
        if (index > -1) {
            const teamSetting = settings[index];
            this._setTeamAndBacklog(teamSetting, teamData);
        }
    }

    private _setTeamAndBacklog(teamSetting: ITeamSettingData, teamData: ITeamConfiguration) {
        let teamDeepCopy = this._cloneFieldRef(teamData.team);
        let backlogLevels = this._cloneFieldRefArray(teamData.visibleBacklogs);
        teamDeepCopy.valueState = ValueState.ReadyAndValid;
        teamSetting.team = teamDeepCopy;
        teamSetting.backlogLevel = { id: "", name: "", valueState: ValueState.ReadyAndValid } as IFieldShallowReference; //id will be initialValue.Id at component level
        teamSetting.backlogLevels = backlogLevels;
    }

    /**
     * Update the project in settings
     * @param {string} settings - the current wizard settings
     * @param {string} id - the id of wizard setting that has change
     * @param {IFieldShallowReference} backlogLevel - the new backlog level
     * @param {string[]} value - the current value of the backlog level in setting
     */
    public updateBacklogLevel(settings: ITeamSettingData[], id: string, backlogLevel: IFieldShallowReference, value?: string) {
        let index = this._getTeamSettingIndex(settings, id);
        if (index > -1) {
            let teamSetting = settings[index];
            let levelDeepCopy = this._cloneFieldRef(backlogLevel);
            teamSetting.backlogLevel = levelDeepCopy;
            teamSetting.backlogLevel.valueState = ValueState.ReadyAndValid;
        }
    }

    /**
     * Update the backlog name only and set it as invalid
     * @param {string} settings - the current wizard settings
     * @param {string} id - the id of wizard setting that has change
     * @param {string} value - the current value of the backlog in setting
     */
    public updateBacklogName(settings: ITeamSettingData[], id: string, backlogName: string) {
        let index = this._getTeamSettingIndex(settings, id);
        if (index > -1) {
            let teamSetting = settings[index];
            if (backlogName != null) {
                teamSetting.backlogLevel.name = backlogName;
            }
            teamSetting.backlogLevel.valueState = ValueState.ReadyButInvalid;
        }
    }

    /**
     * set the team to loading status
     * @param {string} settings - the current wizard settings
     * @param {string} id - the id of wizard setting that has change
     * @param {string} value - the current value of the team in setting
     */
    public setTeamToLoading(settings: ITeamSettingData[], id: string) {
        let index = this._getTeamSettingIndex(settings, id);
        if (index > -1) {
            let teamSetting = settings[index];
            teamSetting.team = DeliveryTimelineTeamSettingsBusinessLogic.loadingDummyField;
            teamSetting.teams = [DeliveryTimelineTeamSettingsBusinessLogic.loadingDummyField];
        }
    }

    /**
     * set the team to loading status
     * @param {string} settings - the current wizard settings
     * @param {string} id - the id of wizard setting that has change
     * @param {string} value - the current value of the team in setting
     */
    public setBacklogToLoading(settings: ITeamSettingData[], id: string) {
        let index = this._getTeamSettingIndex(settings, id);
        if (index > -1) {
            let teamSetting = settings[index];
            teamSetting.backlogLevel = DeliveryTimelineTeamSettingsBusinessLogic.loadingDummyField;
            teamSetting.backlogLevels = [DeliveryTimelineTeamSettingsBusinessLogic.loadingDummyField];
        }
    }

    /**
     * Add a deep copy of the default setting into the settings array
     * @param {ITeamSettingData[]} settings - previous wizard setttings
     * @param {ITeamSettingData} defaultSetting - default wizard setting populate for newly added setting
     */
    public addTeamSetting(settings: ITeamSettingData[], defaultSetting: ITeamSettingData) {
        let teamToAdd = this.cloneTeamSetting(defaultSetting);
        settings.push(teamToAdd);
    }

    /**
     * Delete team setting with a specify index.
     * @param {ITeamSettingData[]} settings - previous wizard settings
     * @param {string} id - id of the wizard setting
     */
    public deleteTeamSetting(settings: ITeamSettingData[], id: string) {
        let index = this._getTeamSettingIndex(settings, id);
        if (index > -1) {
            settings.splice(index, 1);
        }
    }

    /**
     * Move a specified team setting with a specified new index.
     * @param {ITeamSettingData[]} settings - previous wizard settings.
     * @param {string} id - id of the wizard setting that will move.
     * @param {number} newIndex - the new index of the setting.
     * @return {boolean} True if the item to be moved is found in the list of settings.
     */
    public moveTeamSetting(settings: ITeamSettingData[], id: string, newIndex: number): boolean {
        if (newIndex > -1) {
            for (var i = 0; i < settings.length; i++) {
                if (settings[i].id === id) {
                    settings.splice(newIndex, 0, settings.splice(i, 1)[0]);
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Validate if the value exist in the list of available projects in the settings.
     * @param {ITeamSettingData[]} settings - previous wizard settings
     * @param {string} id - id of the wizard setting
     * @param {string} value - the project value to verify
     */
    public validateProject(settings: ITeamSettingData[], id: string, value: string): IFieldShallowReference {
        let index = this._getTeamSettingIndex(settings, id);
        if (index > -1) {
            return this._validate(settings[index].projects, value);
        }

        throw new Error("setting not found");
    }

    /**
     * Validate if the value exist in the list of available teams in the settings.
     * @param {ITeamSettingData[]} settings - previous wizard settings
     * @param {string} id - id of the wizard setting
     * @param {string} value - the team value to verify
     */
    public validateTeam(settings: ITeamSettingData[], id: string, value: string): IFieldShallowReference {
        let index = this._getTeamSettingIndex(settings, id);
        if (index > -1) {
            return this._validate(settings[index].teams, value);
        }

        throw new Error("setting not found");
    }

    /**
     * Validate if the value exist in the list of available types in the settings.
     * @param {ITeamSettingData[]} settings - previous wizard settings
     * @param {string} id - id of the wizard setting
     * @param {string} value - the backlog value to verify
     */
    public validateBacklog(settings: ITeamSettingData[], id: string, value: string): IFieldShallowReference {
        let index = this._getTeamSettingIndex(settings, id);
        if (index > -1) {
            return this._validate(settings[index].backlogLevels, value);
        }

        throw new Error("setting not found");
    }

    private _validate(setting: IFieldShallowReference[], value: string): IFieldShallowReference {
        let item = setting.filter(x => x.name === value);
        if (item && item.length > 0) {
            return item[0];
        }
        return null;
    }

    /**
     * Return index of team setting. Return -1 if not found.
     * @param {ITeamSettingData[]} settings - wizard settings
     * @param {string} id - id of the wizard setting 
     */
    private _getTeamSettingIndex(settings: ITeamSettingData[], id: string): number {
        for (let i = 0, l = settings.length; i < l; i++) {
            if (settings[i].id === id) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Create and return a deep copy of a given setting with new id.
     * @param {ITeamSettingData} settings - wizard settings
     * @return Return a deep copy of a given setting with new id.
     */
    public cloneTeamSetting(setting: ITeamSettingData): ITeamSettingData {
        let id = TFS_Core_Utils.GUIDUtils.newGuid();
        let project = this._cloneFieldRef(setting.project);
        let team = this._cloneFieldRef(setting.team);
        let backlogLevel = this._cloneFieldRef(setting.backlogLevel);
        let projects = this._cloneFieldRefArray(setting.projects);
        let teams = this._cloneFieldRefArray(setting.teams);
        let backlogLevels = this._cloneFieldRefArray(setting.backlogLevels);
        let settingDeepCopy = {
            id: id,
            project: project,
            projects: projects,
            team: team,
            teams: teams,
            backlogLevel: backlogLevel,
            backlogLevels: backlogLevels,
        } as ITeamSettingData;

        return settingDeepCopy;
    }

    private _cloneFieldRef(fieldRef: IFieldShallowReference): IFieldShallowReference {
        return $.extend({}, fieldRef) as IFieldShallowReference;
    }

    private _cloneFieldRefArray(fieldRefs: IFieldShallowReference[]): IFieldShallowReference[] {
        let clone: IFieldShallowReference[] = [];
        fieldRefs.forEach(x => {
            clone.push(this._cloneFieldRef(x));
        });

        return clone;
    }
}
