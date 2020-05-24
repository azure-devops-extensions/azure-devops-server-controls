import * as React from "react";
import * as Service from "VSS/Service";

import { TestVisualWidgetSettings } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualWidgetSettings";
import { TestPieChartComponent } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestPieChartComponent";
import { TestVisualWidgetActionCreator } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualWidgetActionCreator";


/**
 * Top level Widget component - Responsible for initiating flux loop.
 */
export class TestVisualWidgetViewComponent extends React.Component<TestVisualWidgetSettings, {}> {
    private actionCreator = new TestVisualWidgetActionCreator();

    constructor(props: TestVisualWidgetSettings) {
        super(props);
    }

    public componentDidMount() {
        this.actionCreator.getResults(this.props);
    }

    public componentWillUnmount(): void {
    }

    public render(): JSX.Element {
        return <TestPieChartComponent instanceId={this.props.definitionId.toString()} />;
    }
}
