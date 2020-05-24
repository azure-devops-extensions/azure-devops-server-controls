import * as React from "react";
import * as ComponentBase from "VSS/Flux/Component";
import { DetailsList, IDetailsListProps, IColumn, SelectionMode, ColumnActionsMode } from "OfficeFabric/DetailsList";
import { Link } from "OfficeFabric/Link";
import { CoveredBarChart, ICoveredBarChartProps } from "TestManagement/Scripts/CodeCoverage/Components/CoveredBarChart";
import * as TestManagementResources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";
import { defaultComparer } from "VSS/Utils/Number";
import Performance = require("VSS/Performance");
import TMUtils = require("TestManagement/Scripts/CodeCoverage/TFS.TestManagement.CodeCoverage.Utils");

// Width of coverage visual column in pixels
const COVERAGE_VISUAL_WIDTH = 280;

enum ColumnKeys {
    Modules,
    CoveredLines,
    TotalLines,
    LineCoverage,
    CoverageVisual
}

export interface ICodeCoverageModuleDetails {
    moduleName: string;
    moduleUrl: string;
    coveredLines: number;
    totalLines: number;
    lineCoverage: string;
}

export interface ICodeCoverageDetailsListProps extends ComponentBase.Props {
    codeCoverageModuleList: Array<ICodeCoverageModuleDetails>;
    listFilter: string;
}

export interface ICodeCoverageDetailsListState extends ComponentBase.State {
    sortedColumnKey: string;
    isSortedDescending: boolean;
    listItems: ICodeCoverageModuleDetails[];
}

export class CodeCoverageDetailsList extends ComponentBase.Component<ICodeCoverageDetailsListProps, ICodeCoverageDetailsListState> {

    constructor(props: ICodeCoverageDetailsListProps) {
        super(props);

        Performance.getScenarioManager().split(TMUtils.CCPerfScenarios.NewCodeCoverageInCCTab_DetailsListConstructor);

        // Sort by module names by default
        const listItems = this._sortItems(this._generateItemList(), this._getComparer(ColumnKeys[ColumnKeys.Modules]), false);

        this.state = {
            sortedColumnKey: ColumnKeys[ColumnKeys.Modules],
            isSortedDescending: false,
            listItems: listItems
        };
    }

    public componentDidMount() {
        Performance.getScenarioManager().split(TMUtils.CCPerfScenarios.NewCodeCoverageInCCTab_DetailsListComponentDidMount);
    }

    private _renderColumn = (item: ICodeCoverageModuleDetails, index, column): JSX.Element => {
        switch (column.key) {
            case ColumnKeys[ColumnKeys.Modules]:
                return <Link className="coverage-module-link" href={item.moduleUrl}>{item.moduleName}</Link>;
            case ColumnKeys[ColumnKeys.CoveredLines]:
                return <span>{item.coveredLines}</span>;
            case ColumnKeys[ColumnKeys.TotalLines]:
                return <span>{item.totalLines}</span>;
            case ColumnKeys[ColumnKeys.LineCoverage]:
                return <span>{item.lineCoverage}</span>;
            case ColumnKeys[ColumnKeys.CoverageVisual]:
                return (
                    <CoveredBarChart
                        coveredPercentage={ item.totalLines ? (item.coveredLines * (100) / item.totalLines) : 0 }
                        width={ COVERAGE_VISUAL_WIDTH }
                    />
                );
        }
    }
        
    private _generateItemList(): Array<ICodeCoverageModuleDetails> {
        return this.props.codeCoverageModuleList.filter((data) => data instanceof Object);
    }
    
    private _getFilteredList(): ICodeCoverageModuleDetails[] {
        const coverageList = this.state.listItems;
        const filter = this.props.listFilter;

        if (filter.trim() === "" ) {
            return coverageList;
        }

        return coverageList.filter((item: ICodeCoverageModuleDetails) => (item.moduleName.toLocaleLowerCase().indexOf(filter.toLocaleLowerCase().trim()) >= 0));
    }

    private _getColumnList(): Array<IColumn> {
        return [
            this._createColumn(ColumnKeys[ColumnKeys.Modules], TestManagementResources.ModuleCoverageText, this._renderColumn),
            this._createColumn(ColumnKeys[ColumnKeys.CoveredLines], TestManagementResources.CoveredLinesText, this._renderColumn),
            this._createColumn(ColumnKeys[ColumnKeys.TotalLines], TestManagementResources.TotalCoverageLinesText, this._renderColumn),
            this._createColumn(ColumnKeys[ColumnKeys.LineCoverage], TestManagementResources.LineCoverageText, this._renderColumn),
            this._createColumn(ColumnKeys[ColumnKeys.CoverageVisual], TestManagementResources.CoverageVisualText, this._renderColumn, COVERAGE_VISUAL_WIDTH)
        ];
    }

    private _createColumn(key: string, name: string, onRender: (item, index, column) => JSX.Element, minWidth?: number): IColumn {
        return {
            fieldName: key,
            key,
            name,
            onRender,
            onColumnClick: this._onColumnClick,
            minWidth: minWidth || 100,
            isResizable: true,
            isSorted: this.state.sortedColumnKey === key,
            isSortedDescending: this.state.isSortedDescending,
            isPadded: true,
            columnActionsMode: ColumnActionsMode.clickable,
            isRowHeader: false,
        } as IColumn;
    }

    private _onColumnClick = (ev?: React.MouseEvent<HTMLElement>, column?: IColumn): void => {
        Performance.getScenarioManager().split(TMUtils.CCPerfScenarios.NewCodeCoverageInCCTab_DetailsListColumnClick);        
        
        const comparer = this._getComparer(column.key);
        if (!comparer) {
            return;
        }

        const isSortedDescending = this.state.sortedColumnKey === column.key && !column.isSortedDescending;

        this.setState({
            sortedColumnKey: column.key,
            isSortedDescending,
            listItems: this._sortItems(this.state.listItems, comparer, isSortedDescending),
        } as ICodeCoverageDetailsListState);
    }
    
    private _sortItems(items: ICodeCoverageModuleDetails[], ascendingComparer: IComparer<ICodeCoverageModuleDetails>, isSortedDescending: boolean): ICodeCoverageModuleDetails[] {
        const comparer = isSortedDescending
            ? (one, another) => ascendingComparer(another, one)
            : ascendingComparer;

        return items.slice().sort(comparer);
    }

    private _getComparer(key: string): IComparer<ICodeCoverageModuleDetails> {
        switch (key) {
            case ColumnKeys[ColumnKeys.Modules]:
                return (a, b) => localeIgnoreCaseComparer(a.moduleName, b.moduleName);
            case ColumnKeys[ColumnKeys.CoveredLines]:
                return (a, b) => defaultComparer(a.coveredLines, b.coveredLines);
            case ColumnKeys[ColumnKeys.TotalLines]:
                return (a, b) => defaultComparer(a.totalLines, b.totalLines);
            case ColumnKeys[ColumnKeys.LineCoverage]:
            case ColumnKeys[ColumnKeys.CoverageVisual]:
                return (a, b) => defaultComparer(parseFloat(a.lineCoverage), parseFloat(b.lineCoverage));
        }
    }

    public render(): JSX.Element {
        const props: IDetailsListProps = {
            items: this._getFilteredList(),
            columns: this._getColumnList(),
            selectionMode: SelectionMode.none,
            className: "code-coverage-details-list",
        };

        Performance.getScenarioManager().split(TMUtils.CCPerfScenarios.NewCodeCoverageInCCTab_DetailsListRenderComplete);

        return (
            <div className="coverage-details-list-container">
                <DetailsList {...props} />
            </div>
        );
    } 
}