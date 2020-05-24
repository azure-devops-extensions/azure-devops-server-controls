import * as React from "react";
import * as ComponentBase from "VSS/Flux/Component";
import * as TestManagementResources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { ResultSummaryNumberChartComponent, DataType, ValueType, DifferenceType } from "TestManagement/Scripts/Scenarios/TestTabExtension/Components/ResultSummaryDetailsChart";

export interface ICodeCoverageSummaryViewProps extends ComponentBase.Props {
    moduleCount: number;
    totalLines: number;
    totalCoveredLines: number;
    coveragePercent: string;
}

export class CodeCoverageSummaryView extends ComponentBase.Component<ICodeCoverageSummaryViewProps, ComponentBase.State> {

    private defaultNumberChartProps = {
        dataType: DataType.String,
        difference: {
            value: "",
            valueType: ValueType.Unchanged,
            shouldShowIcon: false,
            diffType: DifferenceType.Unchanged,
        }
    };

    public render(): JSX.Element {

        return (
            <div className="code-coverage-summary-container">
                <ResultSummaryNumberChartComponent
                    title={TestManagementResources.LineCoverageText}
                    value={this.props.coveragePercent}
                    {...this.defaultNumberChartProps}
                />
                <ResultSummaryNumberChartComponent
                    title={TestManagementResources.ModuleCoverageText}
                    value={this.props.moduleCount}
                    {...this.defaultNumberChartProps}
                />
                <ResultSummaryNumberChartComponent
                    title={TestManagementResources.TotalCoverageLinesText}
                    value={this.props.totalLines}
                    {...this.defaultNumberChartProps}
                />
                <ResultSummaryNumberChartComponent
                    title={TestManagementResources.CoveredLinesText}
                    value={this.props.totalCoveredLines}
                    {...this.defaultNumberChartProps}
                />
            </div>
        );
    } 
}