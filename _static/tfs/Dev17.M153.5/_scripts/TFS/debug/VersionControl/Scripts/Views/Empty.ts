import Controls = require("VSS/Controls");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import Navigation = require("VSS/Controls/Navigation");
import Performance = require("VSS/Performance");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import VSS = require("VSS/VSS");

let viewSelector = ".vc-empty-view";

let emptyPerfScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenarioFromNavigation(
    CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
    CustomerIntelligenceConstants.EMPTY_VIEW_FEATURE, true);

export class EmptyView extends Navigation.TabbedNavigationView {
    public initialize(options?) {
        emptyPerfScenario.addSplitTiming("EmptyView.initialize");
        super.initialize();
    }

    public initializeOptions(options?: any): void {

        super.initializeOptions($.extend({
            hubContentSelector: ".versioncontrol-empty-content",
            pivotTabsSelector: ".vc-empty-tabs",
        }, options));
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback): void {
        if (emptyPerfScenario) {
            emptyPerfScenario.end();
            emptyPerfScenario = null;
        }
    }
}

// register this view as an enhancement to the page so it will be rendered
emptyPerfScenario.addSplitTiming("EmptyView.load");
VSS.classExtend(EmptyView, TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(EmptyView, viewSelector);