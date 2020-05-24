import Q = require("q");

import BladeConfiguration = require("Dashboards/Scripts/BladeConfiguration");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import { SettingsField, SettingsFieldOptionsForJQueryElement } from "Dashboards/Scripts/SettingsField";

import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import Restclinet = require("TFS/Core/RestClient");
import Contracts = require("TFS/Core/Contracts");
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");

import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import Combos = require("VSS/Controls/Combos");
import TypedCombo = require("Widgets/Scripts/Shared/TypedCombo");
import Checkboxes = require("VSS/Controls/CheckboxList");

import Base = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");
import SprintOverviewWidget = require("Widgets/Scripts/SprintOverview");
import Widgets_Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_String = require("VSS/Utils/String");
import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");

export class SprintOverViewConfiguration
    extends Base.BaseWidgetConfiguration<Dashboard_Shared_Contracts.WidgetConfigurationOptions>
    implements WidgetContracts.IWidgetConfiguration {

    public static DomCoreCssClass: string = "sprint-overview-configuration";
    public _widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext;
    private unitsCombo: Combos.Combo;
    private teamsCombo: TypedCombo.TypedCombo<Contracts.WebApiTeam>;
    public _unitsTypeField: SettingsField<Controls.Control<any>>;
    public _teamsTypeField: SettingsField<Controls.Control<any>>;
    private _sprintOverviewUnitsList: string[];
    private _teams: SprintOverviewWidget.Team[];
    private _settings: SprintOverviewWidget.SprintOverViewSettings = {
        includeDaysOff: false,
        units: Resources.SprintOverviewConfiguration_CountOfWorkItems,
        team: { id: "", name: "" }
    };

    constructor(options?: Dashboard_Shared_Contracts.WidgetConfigurationOptions) {
        super(options);
    }

    /**
     * Determines if user input is valid
     */

    public isConfigurationValid(): boolean {
        let areUnitsValid = this.areUnitsValid();
        this._unitsTypeField.toggleError(!areUnitsValid);

        let isTeamValid = this.isTeamValid();
        this._teamsTypeField.toggleError(!isTeamValid);

        return areUnitsValid && isTeamValid;
    }

    public areUnitsValid(): boolean {
        return (this._sprintOverviewUnitsList.indexOf(this.unitsCombo.getText()) > -1);
    }

    public isTeamValid(): boolean {
        var length: number = this._teams.length;
        for (var i: number = 0; i < length; i++) {
            if (this._teams[i].name === this.teamsCombo.getText()) {
                return true;
            }
        }
        return false;
    }
    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: SprintOverViewConfiguration.DomCoreCssClass
        }, options));
    }

    /**
    * The widget control being initialized.
    */
    public initialize() {
        super.initialize();
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public load(widgetSettings: WidgetContracts.WidgetSettings,
        widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext): IPromise<WidgetContracts.WidgetStatus> {

        this._widgetConfigurationContext = widgetConfigurationContext;

        if (widgetSettings.customSettings.data !== null) {
            this._settings = SprintOverviewWidget.SprintOverview.parseFromSettings(widgetSettings);
        }
        var $sprintOverViewTeamsComboContainer = $("<div>"); //creates combo boxes and checkboxes
        var $sprintOverViewUnitsComboContainer = $("<div>");
        var $includeWorkingDays = $("<fieldset>");
        var $workingDays = $("<label>")
            .text(Resources.SprintOverviewConfiguration_WorkingDays);
        var $inlcudeWorkingDaysLabel = $("<div>")
            .text(Resources.SprintOverviewConfiguration_ShowNonWorkingDays)
            .addClass("include-text");
        $includeWorkingDays.addClass("bowtie");
        var $includeWeekendsCheckbox = $("<input>")
            .attr("type", "checkbox")
            .prop('checked', this._settings.includeDaysOff)
            .click(() => {
                this._settings.includeDaysOff = !this._settings.includeDaysOff;
                if (this.isConfigurationValid()) {
                    this._widgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this._getCustomSettings()));
                }
            });

        
        this.teamsCombo = <TypedCombo.TypedCombo<Contracts.WebApiTeam>>Controls.BaseControl.createIn<Combos.IComboOptions>(TypedCombo.TypedCombo, $sprintOverViewTeamsComboContainer, {
            cssClass: "sprint-overview-teams-config",
            inputCss: "sprint-overview-teams-config-input",
            autoComplete: true,
            allowEdit: true,
            change: () => {
                this._settings.team.name = this.teamsCombo.getText();
                for (var i = 0; i < this._teams.length; i++) {
                    if (this._teams[i].name === this._settings.team.name) {
                        this._settings.team.id = this._teams[i].id;
                    }
                }
                if (this.isConfigurationValid()) {
                    this._widgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this._getCustomSettings()));
                }
            }
        });
        this.unitsCombo = <Combos.Combo>Controls.BaseControl.createIn<Combos.IComboOptions>(Combos.Combo, $sprintOverViewUnitsComboContainer, {
            cssClass: "sprint-overview-unit-config",
            inputCss: "sprint-overview-unit-config-input",
            autoComplete: true,
            allowEdit: true,
            change: () => {
                this._settings.units = this.unitsCombo.getText();
                if (this.isConfigurationValid()) {
                    this._widgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this._getCustomSettings()));
                }
            },
        });

        this._unitsTypeField = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Resources.SprintOverviewConfiguration_Values,
            initialErrorMessage: Resources.SprintOverviewConfiguration_InvalidUnit,
        }, $sprintOverViewUnitsComboContainer);
        this._teamsTypeField = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Resources.SprintOverviewConfiguration_Team,
            initialErrorMessage: Resources.SprintOverviewConfiguration_InvalidTeam,       
        }, $sprintOverViewTeamsComboContainer);
        this.getElement().append(this._teamsTypeField.getElement());
        //PR 
        this.getElement().append(this._teamsTypeField.getElement());
        this.getElement().append(this._unitsTypeField.getElement());
        $includeWorkingDays.append($workingDays);
        $includeWorkingDays.append($inlcudeWorkingDaysLabel);
        $includeWorkingDays.append($includeWeekendsCheckbox);
        this.getElement().append($includeWorkingDays);

        var teamsPromise: IPromise<void> = SprintOverviewWidget.SprintOverview.getSprintOverviewTeams(this.tfsContext.project.id)
            .then((list) => { 
                list.sort((a: Contracts.WebApiTeam, b: Contracts.WebApiTeam) => {
                    return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
                });

                this._teams = [];
                var index: number;
                if (this._settings.team.name === Utils_String.empty) {
                    this._settings.team.name = TFS_Dashboards_Common.getDashboardTeamContext().name
                }
                for (var i = 0; i < list.length; i++) {
                    this._teams.push({ id: list[i].id, name: list[i].name });
                    if (list[i].name === this._settings.team.name) {
                        index = i;
                        this._settings.team.id = list[i].id;
                    }
                }
                this.teamsCombo.setSource(list, (team) => team.name);
                this.teamsCombo.setSelectedIndex(index || 0, false);
            },
            ((e) => {
                return Q.reject(e);
            }));
        var projectProcessConfigurationPromise: Q.IPromise<TFS_AgileCommon.ProjectProcessConfiguration>;
        var unitsPromise: IPromise<void> = SprintOverviewWidget.SprintOverview.getSprintOverviewUnits(projectProcessConfigurationPromise)
            .then((list) => {// get the units to fill the combo box
                this.unitsCombo.setSource(list);
                this._sprintOverviewUnitsList = list;
                this.unitsCombo.setSelectedIndex(list.indexOf(this._settings.units));
                this._settings.units = this.unitsCombo.getText();
            },
            ((e) => {
                return Q.reject(e);
            }));
        return Q.all([unitsPromise, teamsPromise])
            .then(() => {
                return WidgetHelpers.WidgetStatusHelper.Success("success")
            }, function (e) {
                return WidgetHelpers.WidgetStatusHelper.Failure(e);
            });
    }

    public _getCustomSettings(): WidgetContracts.CustomSettings {
        return {
            data:
            JSON.stringify(<SprintOverviewWidget.SprintOverViewSettings>{
                units: this._settings.units,
                team: { id: this._settings.team.id, name: this._settings.team.name },
                includeDaysOff: this._settings.includeDaysOff
            })
        };
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSave(): IPromise<WidgetContracts.SaveStatus> {
        if (this.isConfigurationValid()) {
            return WidgetHelpers.WidgetConfigurationSave.Valid(this._getCustomSettings());
        }
        return WidgetHelpers.WidgetConfigurationSave.Invalid();
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSaveComplete(): void {

        // Create the property payload
        var properties: { [key: string]: any } = {
            "DefaultSprintOverviewType": this._settings
        }

        // Publish
        Widget_Telemetry.WidgetTelemetry.onConfigurationSave(this.getWidgetTypeId(), properties);
    }

}
SDK.VSS.register("dashboards.sprintOverviewConfiguration", () => SprintOverViewConfiguration);
SDK.registerContent("dashboards.sprintOverviewConfiguration-init", (context) => {
    return Controls.create(SprintOverViewConfiguration, context.$container, context.options);
});
