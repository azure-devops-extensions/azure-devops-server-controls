import { Link } from "OfficeFabric/Link";
import { autobind } from "OfficeFabric/Utilities";
import * as React from "react";
import {
    BuildConfigSelector,
    IBuildConfigSelectorProps,
} from "TestManagement/Scripts/CodeCoverage/Components/BuildConfigSelector";
import {
    CodeCoverageDetailsList,
    ICodeCoverageModuleDetails,
} from "TestManagement/Scripts/CodeCoverage/Components/CodeCoverageDetailsList";
import { CodeCoverageHtmlSummary } from "TestManagement/Scripts/CodeCoverage/Components/CodeCoverageHtmlSummary";
import { CodeCoverageModuleFilterBar } from "TestManagement/Scripts/CodeCoverage/Components/CodeCoverageModuleFilterBar";
import {
    CodeCoverageSummaryView,
    ICodeCoverageSummaryViewProps,
} from "TestManagement/Scripts/CodeCoverage/Components/CodeCoverageSummaryView";
import CommonModel = require("TestManagement/Scripts/CodeCoverage/TFS.TestManagement.CodeCoverage.CommonCodeCoverageViewModel");
import * as ComponentBase from "VSS/Flux/Component";

export interface IBuildCodeCoverageProps extends ComponentBase.Props {
    viewModel: CommonModel.CommonCodeCoverageViewModel;
}

export interface ICodeCoverageDetails {
    summaryViewProps: ICodeCoverageSummaryViewProps;
    codeCoverageModuleList: ICodeCoverageModuleDetails[];
}

export interface IBuildCodeCoverageState extends ComponentBase.State {
    buildCodeCoverageModuleVisibility: boolean;
    buildCodeCoverageVisibility: boolean;
    buildCodeCoverageLink: string;
    buildCodeCoverageTitle: string;
    codeCoverageHtmlSummaryVisibility: boolean;
    codeCoverageSummaryLink: string;
    modernBrowserAvailable: boolean;
    moduleFilterText: string;
    selectedConfigurationIndex: number;
    codeCoverageDetails: ICodeCoverageDetails;
}

export class BuildCodeCoverageView extends ComponentBase.Component<IBuildCodeCoverageProps, IBuildCodeCoverageState> {
    private coverageVisibilitySubscription;
    private coverageModuleVisibilitySubscription;
    private codeCoverageSummaryVisibilitySubscription;
    
    constructor(props: IBuildCodeCoverageProps) {
        super(props);

        this.state = {
            buildCodeCoverageModuleVisibility: false,
            buildCodeCoverageVisibility: false,
            buildCodeCoverageLink: "",
            buildCodeCoverageTitle: "",
            codeCoverageHtmlSummaryVisibility: false,
            codeCoverageSummaryLink: "",
            modernBrowserAvailable: false,
            moduleFilterText: "",
            selectedConfigurationIndex: 0,
            codeCoverageDetails: null
        } as IBuildCodeCoverageState;
    }

    componentDidMount() {
        this.coverageVisibilitySubscription = this.props.viewModel.buildCodeCoverageModuleVisibility.subscribe( this._updateState );
        this.coverageModuleVisibilitySubscription = this.props.viewModel.buildCodeCoverageVisibility.subscribe( this._updateState );
        this.coverageModuleVisibilitySubscription = this.props.viewModel.codeCoverageSummaryVisibility.subscribe( this._updateState );
    }

    componentWillUnmount() {
        this.coverageVisibilitySubscription.dispose();
        this.coverageModuleVisibilitySubscription.dispose();
        this.codeCoverageSummaryVisibilitySubscription.dispose();
    }

    shouldComponentUpdate() {
        return true;
    }

    public render(): JSX.Element {
        if (!this.state) {
            return (<div></div>);
        }

        if (this.state.codeCoverageHtmlSummaryVisibility) {
            return <CodeCoverageHtmlSummary
                modernBrowserAvailable={this.state.modernBrowserAvailable}
                codeCoverageSummaryLink={this.state.codeCoverageSummaryLink} />;
        }

        if (this.state.buildCodeCoverageVisibility || this.state.buildCodeCoverageLink.trim() !== "") {
            return (
                <div className="code-coverage-build-download-area" >
                    <Link tabIndex={0} href={this.state.buildCodeCoverageLink}>{this.state.buildCodeCoverageTitle}</Link>
                </div>
            );
        } else if (this.state.buildCodeCoverageModuleVisibility) {
            const configurationList = this.props.viewModel.getBuildConfigurations();

            if (!this.state.codeCoverageDetails || !configurationList) {
                return (<div></div>);
            }

            const configSelectorProps = {
                configurations : configurationList,
                onSelectionChanged: (index: number) => this._onConfigSelectionChanged(index)
            } as IBuildConfigSelectorProps;
    
            return (
                <div className="code-coverage-module-details">
                    <BuildConfigSelector {...configSelectorProps} />
                    <CodeCoverageSummaryView {...this.state.codeCoverageDetails.summaryViewProps} />
                    <CodeCoverageModuleFilterBar onFilterChange={this._filterChangeHandler} />
                    <div className="toolbar-grid-separator" />
                    <CodeCoverageDetailsList codeCoverageModuleList={this.state.codeCoverageDetails.codeCoverageModuleList} listFilter={this.state.moduleFilterText} />
                </div>
            );
        }

        return (<div></div>);
    } 


    @autobind
    private _updateState(value) {
        const state = { ...this.state };
        state.buildCodeCoverageModuleVisibility = this.props.viewModel.buildCodeCoverageModuleVisibility() || false;
        state.buildCodeCoverageVisibility = this.props.viewModel.buildCodeCoverageVisibility() || false;
        state.codeCoverageDetails = this.props.viewModel.getCodeCoverageDetails(this.state.selectedConfigurationIndex);
        state.buildCodeCoverageTitle = this.props.viewModel.buildCodeCoverageTitle() || "";
        state.buildCodeCoverageLink = this.props.viewModel.buildCodeCoverageLink() || "";
        state.codeCoverageSummaryLink = this.props.viewModel.codeCoverageSummaryLink() || "";
        state.codeCoverageHtmlSummaryVisibility = this.props.viewModel.codeCoverageSummaryVisibility() || false;
        state.modernBrowserAvailable = this.props.viewModel.modernBrowserAvailable() || false;
        this.setState(state);
    }

    @autobind
    private _onConfigSelectionChanged(index: number) {
        const state = { ...this.state };
        state.selectedConfigurationIndex = index;
        this.setState(state);
    }

    @autobind
    private _filterChangeHandler(moduleFilterText: string)  {
        const state = { ...this.state };
        state.moduleFilterText = moduleFilterText;
        this.setState(state);
    }
}