import "VSS/LoaderPlugins/Css!Agile/Admin/AdminHub";

import Controls = require("VSS/Controls");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import { AdminAreaIterations } from "Agile/Scripts/Admin/AreaIterations";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

interface IProjectWorkControlOptions {
    iterations: IClassificationPayload;
    areas: IClassificationPayload;
    processName: string;
}

interface IClassificationPayload {
    mode: string;
    treeValues: any;
}

class ProjectWorkControl extends Controls.Control<IProjectWorkControlOptions> {
    public static enhancementTypeName: string = "tfs.agile.ProjectWorkControl";

    private _iterationsControl: AdminAreaIterations;
    private _areasControl: AdminAreaIterations;

    public initialize() {
        super.initialize();

        var $element = this.getElement();

        var options = this._options;

        this._iterationsControl =
            <AdminAreaIterations>Controls.Enhancement.enhance(
                AdminAreaIterations,
                $(".iterations-control", $element),
                { payload: options.iterations });

        this._areasControl =
            <AdminAreaIterations>Controls.Enhancement.enhance(
                AdminAreaIterations,
                $(".areas-control", $element),
                { payload: options.areas });

        $('.project-admin-work-pivot').bind('changed', <any>((sender, view) => {
            switch (view.id) {
                case "areas":
                    this._showAreasControl();
                    break;
                case "iterations":
                default:
                    this._showIterationsControl();
                    break;
            }
        }));

        this._showAreasControl();

        this._attachNavigation();

        this._setupProcessNavUrl();
    }

    private _hideAllControls() {
        this._areasControl.hide();
        this._iterationsControl.hide();
    }

    private _setupProcessNavUrl(): void {
        let url =
            tfsContext.getActionUrl(null, null, {
                area: 'settings',
                project: ''
            }) + '/process';

        let fragment: string = Navigation_Services.getHistoryService().getFragmentActionLink("workitemtypes", {
            'process-name': this._options.processName
        });

        $('.customize-process-link').attr("href", url + fragment);
        $('.customize-process-message').removeAttr("hidden");
    }

    private _showAreasControl() {
        this._hideAllControls();
        this._areasControl.show();
    }

    private _showIterationsControl() {
        this._hideAllControls();
        this._iterationsControl.show();
    }

    private _attachNavigation() {
        var $pivotView = $(".project-admin-work-pivot");
        var historySvc = Navigation_Services.getHistoryService();
        var state = historySvc.getCurrentState();
        var pivotControl = <Navigation.PivotView>Controls.Enhancement.getInstance(Navigation.PivotView, $pivotView.eq(0));

        historySvc.attachNavigate("areas", (sender, state) => {
            pivotControl.setSelectedView(state.action);
        }, true);

        historySvc.attachNavigate("iterations", (sender, state) => {
            pivotControl.setSelectedView(state.action);
        }, true);


        // default selection
        if (!state.action) {
            this._showIterationsControl();
        }
    }
}

Controls.Enhancement.registerEnhancement(ProjectWorkControl, ".project-admin-work")
