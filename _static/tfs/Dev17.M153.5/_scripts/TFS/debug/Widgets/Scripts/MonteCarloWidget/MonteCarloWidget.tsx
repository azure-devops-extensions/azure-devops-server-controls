import * as React from 'react';
import ReactDOM = require('react-dom');
import * as SDK from 'VSS/SDK/Shim';
import { MonteCarloViewComponent } from 'Widgets/Scripts/MonteCarloWidget/MonteCarloViewComponent';
import { WidgetConfigChange } from 'Widgets/Scripts/ModernWidgetTypes/ModernWidgetContracts';
import { ReactWidgetBase } from 'Widgets/Scripts/ModernWidgetTypes/ReactWidgetBase';


export class MonteCarloWidget extends ReactWidgetBase  {
    public renderComponent(change: WidgetConfigChange, container: HTMLElement, deferredRenderCompletion: Q.Deferred<{}>): React.Component<any, any> {
        return ReactDOM.render(<MonteCarloViewComponent change={change} suppressAnimations={this.isAnimationSuppressed()} deferredRenderCompletion={deferredRenderCompletion} />, container) as React.Component<any, any>
    }
}

SDK.VSS.register("dashboards.monteCarlo", () => MonteCarloWidget);
SDK.registerContent("dashboards.monteCarlo-init", (context) => {
    return new MonteCarloWidget(context.container, context.options);
});