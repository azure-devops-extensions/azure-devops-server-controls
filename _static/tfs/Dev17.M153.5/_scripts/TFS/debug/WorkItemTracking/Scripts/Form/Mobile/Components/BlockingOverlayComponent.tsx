import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/Mobile/Components/BlockingOverlayComponent";

import React = require("react");

export class BlockingOverlayComponent extends React.Component<{}, {}> {
    public render() {
        return <div
            className="blocking-overlay"
            onClick={this._cancelHandler}
            onTouchStart={this._cancelHandler} />;
    }

    /** Event handler that cancels any event */
    private _cancelHandler = (e: React.SyntheticEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }
}