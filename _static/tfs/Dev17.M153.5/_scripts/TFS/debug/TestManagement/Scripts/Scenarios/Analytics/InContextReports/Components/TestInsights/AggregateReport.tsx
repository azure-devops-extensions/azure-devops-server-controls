/// <reference types="react" />

import * as React from "react";

import { Accordion } from "DistributedTaskControls/SharedControls/Accordion/Accordion";

import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { TrendChart } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/TestInsights/TrendChart";

import * as ComponentBase from "VSS/Flux/Component";

import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/TestInsights/AggregateReport";

export class AggregateReport extends ComponentBase.Component<CommonTypes.IReportComponentProps, ComponentBase.State> {

    public render(): JSX.Element {
        return (
            <div className="testresults-analytics-report-view-testinsight-aggregatereports" >
                <Accordion
                    cssClass="testinsight-aggregatereports-accordion"
                    label = { Resources.ResultSummaryLabel }
                    initiallyExpanded = { true}
                    headingLevel = { 1}
                    addSeparator = { false} >

                    <div className="testinsight-aggregatereports-section" >

                        <TrendChart
                            instanceId={this.props.instanceId}
                        />

                    </div>

                </Accordion>
            </div>
        );
    }
}