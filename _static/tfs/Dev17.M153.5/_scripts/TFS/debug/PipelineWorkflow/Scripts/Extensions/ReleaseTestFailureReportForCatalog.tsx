import * as ReactDOM from "react-dom";
import * as React from "react";

import * as Controls from "VSS/Controls";
import * as SDK from "VSS/SDK/Shim";
import { Component } from "DistributedTaskControls/Common/Components/Base";

class TestReportSampleComponent extends  Component<{}, {}>{
    constructor(props: {}) {
        super(props);
    }

    public render(): JSX.Element {
        return (
            <div><h1>Test Failure Report</h1></div>
        );
    }
}

export class ReleaseTestFailureReportForCatalog extends Controls.Control<{}> {

    public initialize(): void {
        ReactDOM.render(<TestReportSampleComponent />, this.getElement()[0]);
    }
}

/**
 * @brief Registering the Hub to contribution
 */
SDK.registerContent("cd-release-test-failure-report-for-catalog", (context) => {
    return Controls.Control.create<ReleaseTestFailureReportForCatalog, {}>(ReleaseTestFailureReportForCatalog, context.$container, {
    });
});

