import * as Q from 'q';
import * as React from 'react';
import ReactDOM = require('react-dom');
import SDK = require('VSS/SDK/Shim');
import { WidgetConfigChange } from 'Widgets/Scripts/ModernWidgetTypes/ModernWidgetContracts';
import { ReactWidgetBase } from 'Widgets/Scripts/ModernWidgetTypes/ReactWidgetBase';
import VelocityViewComponent from 'Widgets/Scripts/Velocity/VelocityViewComponent';


export class VelocityWidget extends ReactWidgetBase {
    public  renderComponent(change: WidgetConfigChange, container: HTMLElement, deferredRenderCompletion: Q.Deferred<{}>): React.Component<any, any>{
        return ReactDOM.render(<VelocityViewComponent change={change} suppressAnimations={this.isAnimationSuppressed()} deferredRenderCompletion={deferredRenderCompletion} />, container) as React.Component<any, any>
    }   
}

// register control as an enhancement to allow the contribution model to associate it with the widget host.
SDK.VSS.register("dashboards.Velocity", () => VelocityWidget);
SDK.registerContent("dashboards.velocityWidget-init", (context) => {
    return new VelocityWidget(context.container, context.options);    
});
