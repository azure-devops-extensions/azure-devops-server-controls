/// <reference types="react" />

import * as React from "react";

import { Accordion } from "DistributedTaskControls/SharedControls/Accordion/Accordion";

import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { CardMetrics } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/CardMetrics";
import { TestResultsCharts } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/TestResultsCharts";

import * as ComponentBase from "VSS/Flux/Component";

import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/AggregateReports";

export interface IAggregateReportsProps extends CommonTypes.IReportComponentProps {
    onTrendChartMetricChanged?: (chartMetric: CommonTypes.Metric) => void;
}

export class AggregateReports extends ComponentBase.Component<IAggregateReportsProps, ComponentBase.State> {

    public render(): JSX.Element {
        return (
            <div className="testresults-analytics-report-view-aggregatereports">
                <Accordion
                    cssClass="aggregatereports-accordion"
                    label={Resources.ResultSummaryLabel}
                    initiallyExpanded={true}
                    headingLevel={1}
                    addSeparator={false} >

                    <div className="aggregatereports-section">
                        <CardMetrics   
                                enableVisualHostMenu={true}
                                instanceId={this.props.instanceId}
                            />
                                                    
                        <TestResultsCharts
                            instanceId={this.props.instanceId}
                            onTrendChartMetricChanged={this.props.onTrendChartMetricChanged}
                        />                        
                    </div>

                </Accordion>
            </div>
        );
    } 
}
