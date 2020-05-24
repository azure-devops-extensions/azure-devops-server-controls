import * as React from 'react';
import ReactDOM = require('react-dom');

import * as SDK from 'VSS/SDK/Shim';

import { AnalyticsTrendsViewComponent } from 'Widgets/Scripts/AnalyticsTrends/AnalyticsTrendsViewComponent';
import { WidgetConfigChange } from 'Widgets/Scripts/ModernWidgetTypes/ModernWidgetContracts';
import { ReactWidgetBase } from 'Widgets/Scripts/ModernWidgetTypes/ReactWidgetBase';

/**
 * This class is a placeholder for the scripts to be registered.
 */
export class AnalyticsTrendsWidget extends ReactWidgetBase  {
    public renderComponent(change: WidgetConfigChange, container: HTMLElement, deferredRenderCompletion: Q.Deferred<{}>): React.Component<any, any> {
        return ReactDOM.render(<AnalyticsTrendsViewComponent change={change} suppressAnimations={this.isAnimationSuppressed()} deferredRenderCompletion={deferredRenderCompletion} />, container) as React.Component<any, any>
    }
}

SDK.VSS.register("dashboards.AnalyticsTrends", () => AnalyticsTrendsWidget);
SDK.registerContent("dashboards.analyticsTrends-init", (context) => {
    return new AnalyticsTrendsWidget(context.container, context.options);
});