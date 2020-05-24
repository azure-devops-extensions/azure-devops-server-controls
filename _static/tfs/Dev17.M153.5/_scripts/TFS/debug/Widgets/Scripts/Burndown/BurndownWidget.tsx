import * as Q from 'q';
import * as React from 'react';
import ReactDOM = require('react-dom');
import SDK = require('VSS/SDK/Shim');
import { BurnDirection } from 'Widgets/Scripts/Burndown/BurnDirection';
import BurndownViewComponent from 'Widgets/Scripts/Burndown/BurndownViewComponent';
import { WidgetConfigChange } from 'Widgets/Scripts/ModernWidgetTypes/ModernWidgetContracts';
import { ReactWidgetBase } from 'Widgets/Scripts/ModernWidgetTypes/ReactWidgetBase';

export class BurndownWidget extends ReactWidgetBase {
    public renderComponent(change: WidgetConfigChange, container: HTMLElement, deferredRenderCompletion: Q.Deferred<{}>): React.Component<any, any> {
        return ReactDOM.render(<BurndownViewComponent change={change} burnDirection={this.getBurnDirection()} suppressAnimations={this.isAnimationSuppressed()} deferredRenderCompletion={deferredRenderCompletion} />, container) as React.Component<any, any>
    }

    protected getBurnDirection(): BurnDirection {
        return BurnDirection.Down;
    }
}

export class BurnupWidget extends BurndownWidget {
    protected getBurnDirection(): BurnDirection {
        return BurnDirection.Up;
    }
}


// register control as an enhancement to allow the contribution model to associate it with the widget host.
SDK.VSS.register("dashboards.Burndown", () => BurndownWidget);
SDK.registerContent("dashboards.burndownWidget-init", (context) => {
    return new BurndownWidget(context.container, context.options);
});

SDK.VSS.register("dashboards.Burnup", () => BurnupWidget);
SDK.registerContent("dashboards.burnupWidget-init", (context) => {
    return new BurnupWidget(context.container, context.options);
});
