import "VSS/LoaderPlugins/Css!Agile/Admin/AdminHub";

import Controls = require("VSS/Controls");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TeamSettings = require("Agile/Scripts/Admin/TeamSettings");
import { TeamIterationsControl, TeamAreasControl, ITeamClassificationSettingsOptions } from "Agile/Scripts/Admin/TeamClassificationSettings"
import { TeamField } from "Agile/Scripts/Admin/TeamField";
import Utils_Core = require("VSS/Utils/Core");

import WorkItemTemplatesControl = require("Agile/Scripts/Admin/WorkItemTemplatesControl");

var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

class WorkControl extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.agile.AdminWorkControl";

    private _teamSettingsControl: TeamSettings.TeamSettingsControl;
    private _teamIterationsControl: TeamIterationsControl;
    private _teamAreasControl: TeamAreasControl;
    private _teamFieldControl: TeamField;

    private _templatesControl: WorkItemTemplatesControl.WorkItemTemplatesControl;

    public initialize() {
        super.initialize();

        var $element = this.getElement();

        var options = { teamSettings: this._options };

        this._teamSettingsControl =
            <TeamSettings.TeamSettingsControl>Controls.Enhancement.enhance(
                TeamSettings.TeamSettingsControl,
                $('.team-settings-control', $element),
                options);

        this._teamIterationsControl =
            <TeamIterationsControl>Controls.Enhancement.enhance(
                TeamIterationsControl,
                $(".team-iterations-control", $element),
                <ITeamClassificationSettingsOptions>options);

        var $teamAreasContainer = $(".team-areas-control", $element);
        if ($teamAreasContainer.length > 0) {
            this._teamAreasControl =
                <TeamAreasControl>Controls.Enhancement.enhance(TeamAreasControl,
                    $teamAreasContainer,
                    <ITeamClassificationSettingsOptions>options);
        }

        var $teamFieldContainer = $(".team-field-control", $element);
        if ($teamFieldContainer.length > 0) {
            this._teamFieldControl = TeamField.createIn($teamFieldContainer);
        }

        this._templatesControl =
            <WorkItemTemplatesControl.WorkItemTemplatesControl>Controls.Enhancement.enhance(
                WorkItemTemplatesControl.WorkItemTemplatesControl,
                $(".templates-control", $element),
                <WorkItemTemplatesControl.IWorkItemTemplatesControlOptions>{ tfsContext: tfsContext });

        $('.work-admin-pivot').bind('changed', <any>((sender, view) => {
            switch (view.id) {
                case "areas":
                    this._showTeamAreasControl();
                    break;
                case "iterations":
                    this._showTeamIterationsControl();
                    break;
                case "team-field":
                    this._showTeamFieldControl();
                    break;
                case "templates":
                    this._showTemplatesControl();
                    break;
                case "general":
                default:
                    this._showTeamSettingsControl();
                    break;
            }
        }));

        this._showTeamSettingsControl();

        this._attachNavigation();
        this._setupProcessNavUrl();
    }

    private _setupProcessNavUrl(): void {
        let url =
            tfsContext.getActionUrl(null, null, {
                area: 'settings',
                project: ''
            }) + '/process';

        let processName = Utils_Core.parseJsonIsland($(document), ".team-admin-work .project-work-model").processName;
        let fragment: string = Navigation_Services.getHistoryService().getFragmentActionLink("workitemtypes", {
            'process-name': processName
        });

        $('.customize-process-link').attr("href", url + fragment);
        $('.customize-process-message').removeAttr("hidden");
    }

    private _hideAllControls() {
        this._teamSettingsControl.hide();
        this._teamIterationsControl.hide();

        if (this._teamAreasControl) {
            this._teamAreasControl.hide();
        }

        if (this._teamFieldControl) {
            this._teamFieldControl.hide();
        }

        if (this._templatesControl) {
            this._templatesControl.hide();
        }
    }

    private _showTeamSettingsControl() {
        this._hideAllControls();
        this._teamSettingsControl.show();
    }

    private _showTeamAreasControl() {
        this._hideAllControls();
        this._teamAreasControl.show();
    }

    private _showTeamIterationsControl() {
        this._hideAllControls();
        this._teamIterationsControl.show();
    }

    private _showTeamFieldControl() {
        this._hideAllControls();
        this._teamFieldControl.show();
    }

    private _showTemplatesControl() {
        this._hideAllControls();
        this._templatesControl.show();
    }

    private _attachNavigation() {
        /// <summary>attach the pivot views</summary>

        var $pivotView = $(".work-admin-pivot");
        var historySvc = Navigation_Services.getHistoryService();
        var state = historySvc.getCurrentState();
        var pivotControl = <Navigation.PivotView>Controls.Enhancement.getInstance(Navigation.PivotView, $pivotView.eq(0));

        historySvc.attachNavigate("general", (sender, state) => {
            pivotControl.setSelectedView(state.action);
        }, true);

        historySvc.attachNavigate("areas", (sender, state) => {
            pivotControl.setSelectedView(state.action);
        }, true);

        historySvc.attachNavigate("iterations", (sender, state) => {
            pivotControl.setSelectedView(state.action);
        }, true);

        historySvc.attachNavigate("team-field", (sender, state) => {
            pivotControl.setSelectedView(state.action);
        }, true);

        historySvc.attachNavigate(WorkItemTemplatesControl.WorkItemTemplatesControl.ACTION_TEMPLATES, (sender, state) => {
            pivotControl.setSelectedView(state.action);
        }, true);

        // default selection
        if (!state.action) {
            this._showTeamSettingsControl();
        }
    }
}

Controls.Enhancement.registerEnhancement(WorkControl, ".team-admin-work")
