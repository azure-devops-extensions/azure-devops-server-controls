import * as React from "react";
import * as ReactDOM from "react-dom";

import { getDefaultWebContext } from "VSS/Context";
import * as ComponentBase from "VSS/Flux/Component";
import { registerContent, VSS } from "VSS/SDK/Shim";

interface IContributedPivotProps extends ComponentBase.Props {
    context: any;
}

class ContributedPivot extends ComponentBase.Component<IContributedPivotProps, {}> {
    public render(): JSX.Element {
        return (
            <div>
                <p>This is a contributed pivot.</p>
                <h3>Context:</h3>
                <pre>{JSON.stringify(this.props.context, null, 4)}</pre>
            </div>);
    }
}

let container: HTMLElement;

function render(context) {
    ReactDOM.render(<ContributedPivot context={context} />, container) as ContributedPivot;
}

registerContent("contributed.pivot", contentContext => {
    container = contentContext.$container[0];
    render(contentContext.options);
});

// register listener for context updates
VSS.register("ms.vss-tfs-web.api-status-sample-hub.pivotbar.contributedpivot", {
    updateContext: function (context) {
        render(context);
    },
})
