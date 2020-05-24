import * as OMWiqlOperators from "WorkItemTracking/Scripts/OM/WiqlOperators";
import * as Utils_Date from "VSS/Utils/Date";
import { FilterClause } from "TFS/Work/Contracts";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { ITeamSettingData, ITeamSelectedSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsInterfaces";
import { IFieldShallowReference, ValueState } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import { ITeam, ICalendarMarker } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { IDeliveryTimelineConfigurationRootData, IDeliveryTimelineConfigurationCards, IDeliveryTimelineConfigurationMarkers } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/DeliveryTimelineConfigurationInterfaces";
import { IUpdateViewPayload } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { TeamBacklogMapping, DeliveryViewPropertyCollection, CardFieldSettings, CardSettings, IdentityDisplayFormat, FieldInfo, Marker } from "TFS/Work/Contracts";
import { ICardSettings, IdentityPickerRenderingOption } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { ICriteriaSelectedSettingData, FilterClauseConstants } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/IDeliveryTimelineCriteriaInterfaces";
import { ICriteriaSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/IDeliveryTimelineCriteriaInterfaces";
import { IMarkersSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/IDeliveryTimelineMarkersInterfaces";
import { DeliveryTimelineMarkersBusinessLogic } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/DeliveryTimelineMarkersBusinessLogic";

/**
 * What: Mapping wizard creation and wizard configuration classes
 * Why: Need to move data among the view model classes, the store's classes and well as the DeliveryTimeLine's classes.
 */
export class WizardMappers {

    public static mapCollectionITeamToITeamSelectedSettingData(teams: ITeam[]): ITeamSelectedSettingData[] {
        if (teams) {
            let result: ITeamSelectedSettingData[] = [];
            teams.forEach(element => {
                result.push(this.mapITeamToITeamSelectedSettingData(element));
            });
            return result;
        }
        return null;
    }

    public static mapITeamToITeamSelectedSettingData(team: ITeam): ITeamSelectedSettingData {
        return {
            id: team.id,
            project: { id: team.projectId } as IFieldShallowReference, //We do not have the projectName at that level. It remains null. This should be improved... #[P-00001]
            team: { id: team.id, name: team.name } as IFieldShallowReference,
            backlogLevel: { id: team.backlog.categoryReferenceName, name: team.backlog.pluralName } as IFieldShallowReference,
        } as ITeamSelectedSettingData;
    }

    public static mapCollectionTeamSettingsToITeamSelectedSettingData(teamSettings: ITeamSettingData[]): ITeamSelectedSettingData[] {
        if (teamSettings) {
            let result: ITeamSelectedSettingData[] = [];
            teamSettings.forEach(element => {
                result.push(this.mapTeamSettingsToITeamSelectedSettingData(element));
            });
            return teamSettings;
        }
        return null;
    }

    public static mapTeamSettingsToITeamSelectedSettingData(teamSettings: ITeamSettingData): ITeamSelectedSettingData {
        return {
            id: teamSettings.id,
            project: teamSettings.project,
            team: teamSettings.team,
            backlogLevel: teamSettings.backlogLevel
        } as ITeamSelectedSettingData;
    }

    public static mapFilterClausesToICriteriaSelectedSettingData(fliterClauses: FilterClause[]): ICriteriaSelectedSettingData[] {
        if (fliterClauses) {
            const result: ICriteriaSelectedSettingData[] = [];
            fliterClauses.forEach(clause => {
                result.push(this.mapFilterClauseToICriteriaSelectedSettingData(clause));
            });
            return result;
        }
        return null;
    }

    public static mapFilterClauseToICriteriaSelectedSettingData(filterClause: FilterClause): ICriteriaSelectedSettingData {
        return {
            id: GUIDUtils.newGuid(),
            field: { id: filterClause.fieldName, valueState: ValueState.ReadyAndValid } as IFieldShallowReference, // FilterClause has only reference name
            operator: { id: filterClause.operator, name: OMWiqlOperators.getLocalizedOperator(filterClause.operator), valueState: ValueState.ReadyAndValid } as IFieldShallowReference,
            value: { id: filterClause.value, name: filterClause.value, valueState: ValueState.ReadyAndValid } as IFieldShallowReference
        } as ICriteriaSelectedSettingData;
    }

    public static mapCollectionCriteriaSettingsToICriteriaSelectedSettingData(criteriaSettings: ICriteriaSettingData[]): ICriteriaSelectedSettingData[] {
        if (criteriaSettings) {
            let result: ICriteriaSelectedSettingData[] = [];
            criteriaSettings.forEach(setting => {
                result.push(this.mapCriteriaSettingsToICriteriaSelectedSettingData(setting));
            });
            return result;
        }
        return null;
    }

    public static mapCriteriaSettingsToICriteriaSelectedSettingData(criteriaSetting: ICriteriaSettingData): ICriteriaSelectedSettingData {
        return {
            id: criteriaSetting.id,
            field: criteriaSetting.field,
            operator: criteriaSetting.operator,
            value: criteriaSetting.value
        } as ICriteriaSelectedSettingData;
    }

    public static toCriteriaSettingData(selectedSettings: ICriteriaSelectedSettingData[]): ICriteriaSettingData[] {
        if (selectedSettings instanceof Array) {
            let result: ICriteriaSettingData[] = [];
            selectedSettings.forEach(setting => {
                result.push({
                    availableOperators: [],
                    availableValues: [],
                    id: setting.id,
                    field: setting.field,
                    operator: setting.operator,
                    value: setting.value,
                    valueControlType: setting.valueControlType
                } as ICriteriaSettingData);
            });
            return result;
        }

        return null;
    }

    public static mapCollectionTeamSelectedSettingDataToITeamSelectedSettingData(settingsData: ITeamSelectedSettingData[]): ITeamSelectedSettingData[] {
        if (settingsData) {
            let result: ITeamSelectedSettingData[] = [];
            settingsData.forEach(element => {
                result.push(this.mapTeamSelectedSettingDataToITeamSelectedSettingData(element));
            });
            return result;
        }
        return null;
    }

    public static mapTeamSelectedSettingDataToITeamSelectedSettingData(settingsData: ITeamSelectedSettingData): ITeamSelectedSettingData {
        const selectedProject: IFieldShallowReference = settingsData.project;
        const selectedTeam: IFieldShallowReference = settingsData.team;
        const selectedBacklog: IFieldShallowReference = settingsData.backlogLevel;

        return {
            project: selectedProject,
            team: selectedTeam,
            backlogLevel: selectedBacklog,
        } as ITeamSettingData;
    }

    public static mapCongfigurationUpdateModelToViewUpdateModel(configurationModel: IDeliveryTimelineConfigurationRootData): IUpdateViewPayload {
        let updateModel: IUpdateViewPayload = {} as IUpdateViewPayload;
        updateModel.planId = configurationModel.id;
        updateModel.planRevision = configurationModel.revision;
        updateModel.planType = configurationModel.type;
        updateModel.name = configurationModel.general.title.value;
        updateModel.description = configurationModel.general.description.value;

        let teamBacklogMappings: TeamBacklogMapping[] = [];
        configurationModel.general.teams.teamsSettings.forEach(team => {
            teamBacklogMappings.push({ categoryReferenceName: team.backlogLevel.id, teamId: team.team.id } as TeamBacklogMapping);
        });

        let filterClauses: FilterClause[] = [];
        const criteriaSettings = configurationModel.general.criteria.criteriaSettings;
        if (criteriaSettings instanceof Array) {
            criteriaSettings.forEach((setting: ICriteriaSelectedSettingData, index: number) => {
                filterClauses.push({ fieldName: setting.field.id, index: index, logicalOperator: FilterClauseConstants.andOperator, operator: setting.operator.id, value: setting.value.id } as FilterClause);
            });
        }

        updateModel.properties = {
            teamBacklogMappings: teamBacklogMappings,
            criteria: filterClauses,
            cardSettings: this._mapCardSettings(configurationModel.cards),
            markers: this._mapMarkersSettingToAPIContractMarkers(configurationModel.general.markers)
        } as DeliveryViewPropertyCollection;

        return updateModel;
    }

    //public for unit testing
    public static _mapMarkersSettingToAPIContractMarkers(markersConfiguration: IDeliveryTimelineConfigurationMarkers): Marker[] {
        if (markersConfiguration) {
            const serializeMarkers = markersConfiguration.markers.map(m => {
                //The REST API client converts the date to UTC automatically
                //But we want the user entered date to be final date 
                //We are shfiting the date again to counter that.
                let date = Utils_Date.shiftToLocal(m.date.value);

                return {
                    color: m.color,
                    date: date,
                    label: m.label.value,
                } as Marker;
            });

            return serializeMarkers;
        }

        return [];
    }

    private static _mapCardSettings(cards: IDeliveryTimelineConfigurationCards): CardSettings {
        return {
            fields: this._mapCardFieldSettings(cards.fields.fieldSettings)
        } as CardSettings;
    }

    /**
     * Public for unit testing
     */
    public static _mapCardFieldSettings(cardFieldSettingsData: ICardSettings): CardFieldSettings {

        let additionalFields: FieldInfo[] = [];
        if (cardFieldSettingsData.additionalFields instanceof Array) {
            additionalFields = cardFieldSettingsData.additionalFields.map(f => { return { referenceName: f.referenceName } as FieldInfo; });
        }

        return {
            showId: cardFieldSettingsData.showId,
            showState: cardFieldSettingsData.showState,
            showTags: cardFieldSettingsData.showTags,
            showAssignedTo: cardFieldSettingsData.showAssignedTo,
            showEmptyFields: cardFieldSettingsData.showEmptyFields,
            assignedToDisplayFormat: this._mapAssignedToDisplayFormat(cardFieldSettingsData.assignedToRenderingOption),
            additionalFields: additionalFields
        } as CardFieldSettings;
    }

    /**
     * Public for unit testing
     */
    public static _mapAssignedToDisplayFormat(assignedToRenderingOption: IdentityPickerRenderingOption): IdentityDisplayFormat {
        let assignedToDisplayFormat: IdentityDisplayFormat;
        switch (assignedToRenderingOption) {
            case IdentityPickerRenderingOption.AvatarOnly:
                assignedToDisplayFormat = IdentityDisplayFormat.AvatarOnly;
                break;
            case IdentityPickerRenderingOption.FullName:
                assignedToDisplayFormat = IdentityDisplayFormat.FullName;
                break;
            default:
                assignedToDisplayFormat = IdentityDisplayFormat.AvatarAndFullName;
                break;
        }

        return assignedToDisplayFormat;
    }

    /**
     * Maps ICalendarMarker[] to IMarkersSettingData[]. Return in descending order.   
     * @param calendarMarkers - markers to map
     */
    public static mapCalendarMarkersToMarkersSetting(calendarMarkers: ICalendarMarker[]): IMarkersSettingData[] {
        if (calendarMarkers) {
            return calendarMarkers.map(cm => {
                return {
                    color: cm.backgroundColor,
                    label: { value: cm.label, validationState: DeliveryTimelineMarkersBusinessLogic.validateLabel(cm.label).validationState },
                    date: { value: cm.date, validationState: DeliveryTimelineMarkersBusinessLogic.validateDate(cm.date).validationState },
                    id: cm.id,
                } as IMarkersSettingData;
            }).sort((a: IMarkersSettingData, b: IMarkersSettingData) => { return Utils_Date.defaultComparer(b.date.value, a.date.value); });
        }
        return [];
    }
}