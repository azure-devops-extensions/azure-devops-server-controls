import * as Q from "q";
import * as React from "react";
import ReactDOM = require("react-dom");
import SDK = require("VSS/SDK/Shim");
import * as WidgetContracts from "TFS/Dashboards/WidgetContracts";
import { WidgetConfigChange } from "Widgets/Scripts/ModernWidgetTypes/ModernWidgetContracts";
import { ReactWidgetBase } from "Widgets/Scripts/ModernWidgetTypes/ReactWidgetBase";

import { TestVisualWidgetSettings, TestVisualWidgetSettingsSerializer } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualWidgetSettings";
import { MessageOptions, WidgetMessageCardFactory } from "Widgets/Scripts/ModernWidgetTypes/WidgetMessageCardFactory";

import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import { TestVisualWidgetViewComponent } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualWidgetViewComponent";

import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualWidget";
import { MessageType } from "WidgetComponents/LayoutState";
import {TfsContext}  from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

/**
 * This Class demonstrates integration of React-based rendering of a Test report visual while interoperating as a Widget.
 * What does this entail:
 * 1- Widget Content Registration 
 * 2- Delegation to a native React Component + No-configuration failure handling path
 * 3- Link handling
 * 
 * Note: There should not be any duplicate/copied presentational content. Widgets re-use content from the corresponding Visual.
 */
export class TestVisualWidget extends ReactWidgetBase {
    public renderComponent(change: WidgetConfigChange, container: HTMLElement, deferredRenderCompletion: Q.Deferred<{}>): React.Component<any, any> {
        //This step is required to signal when the widget's load activity is done, to allow for async actions beyond the render call to occur as part of a flux-react based experience.
        //TODO: #1301280 This should be firing *after* initial load by react layer is done.
        deferredRenderCompletion.resolve(null);

        const widgetCustomSettings = TestVisualWidgetSettingsSerializer.parse(change.config.customSettings.data);

        const component = (widgetCustomSettings != null) ?
            (<a className={"ms-Fabric linked visual"} href={this.getArtifactLink(widgetCustomSettings)} role="button">
                <TestVisualWidgetViewComponent {...widgetCustomSettings} />
            </a>) :
            <WidgetMessageCardFactory messageType={MessageType.Unconfigured} title={change.config.name} size={change.config.sizeInPixels} />;

        return ReactDOM.render(component, container) as React.Component<any, any>;
    }

    private getArtifactLink(settings: TestVisualWidgetSettings): string {
        return `${TfsContext.getDefault().getHostUrl()}/${TfsContext.getDefault().contextData.project.id}/_build/index?context=mine&path=%5C&definitionId=${settings.definitionId}&_a=testAnalytics`;    
    }
}

// register control as an enhancement to allow the contribution model to associate it with the widget host.
SDK.VSS.register("testManagement.testVisualWidget", () => TestVisualWidget);
SDK.registerContent("testManagement.testVisualWidget-init", (context) => {
    return new TestVisualWidget(context.container, context.options);
});
