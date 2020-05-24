import * as React from 'react';
import * as ReactDOM from 'react-dom';

import * as SDK from 'VSS/SDK/Shim';

import { WidgetConfigChange } from 'Widgets/Scripts/ModernWidgetTypes/ModernWidgetContracts';
import { ReactWidgetBase } from 'Widgets/Scripts/ModernWidgetTypes/ReactWidgetBase';

import { AnalyticsTestTrendViewComponent } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendViewComponent';

/**
 * This class is a placeholder for the scripts to be registered.
 */
export class AnalyticsTestTrendWidget extends ReactWidgetBase  {
    public renderComponent(change: WidgetConfigChange, container: HTMLElement, deferredRenderCompletion: Q.Deferred<{}>): React.Component<any, any> {
        // Return an empty component for now - TODO (User Story 1323724, @prpalant) Create a view component.
        return ReactDOM.render(<AnalyticsTestTrendViewComponent change={change} suppressAnimations={this.isAnimationSuppressed()} deferredRenderCompletion={deferredRenderCompletion} />, container) as React.Component<any, any>
    }
}

SDK.VSS.register("testmanagement.AnalyticsTestTrend", () => AnalyticsTestTrendWidget);
SDK.registerContent("testmanagement.analyticsTestTrend-init", (context) => {
    return new AnalyticsTestTrendWidget(context.container, context.options);
});