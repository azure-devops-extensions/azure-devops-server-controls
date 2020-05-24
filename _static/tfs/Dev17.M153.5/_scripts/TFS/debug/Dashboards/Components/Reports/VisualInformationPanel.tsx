import * as React from 'react';
import * as ReactDOM from "react-dom";

import { autobind } from 'OfficeFabric/Utilities';
import { Panel, PanelType } from 'OfficeFabric/Panel';
import { Store } from "VSS/Flux/Store";
import { Action } from "VSS/Flux/Action";
import { Component, Props, State } from "VSS/Flux/Component";
import { PrimaryButton, DefaultButton } from 'OfficeFabric/Button';
import { IPickList, IPickListGroup, PickListDropdown, IPickListSelection, IPickListItem } from "VSSUI/PickList";
import { IVssIconProps, VssIcon, VssIconType } from "VSSUI/VssIcon";

import { ChartComponent, ChartComponentProps } from 'WidgetComponents/ChartComponent';
import { CommonChartOptions, ChartTypesConstants, Datum, PieChartOptions, ChartOptions } from 'Charts/Contracts';

import { DataQualityReportComponent, DataQualityReportComponentProps } from 'Dashboards/Components/Reports/DataQualityReportComponent';
import { QueryLinksComponent, QueryLinksComponentProps } from 'Dashboards/Components/Reports/QueryLinksComponent';
import Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");

/**
 *    State description of a VisualInformationPanel
 */
export interface VisualInformationPanelState extends State {
    showPanel: boolean;

    title: string;
    chartOptions?: ChartOptions;
    dataQuality?: DataQualityReportComponentProps;
    queryLinks?: QueryLinksComponentProps;
}

/**
 * Drives behaviors for Visual Information panel to open with accepted input formats, or to close.
 */
export class VisualInformationPanelStore extends Store {
    private currentState: VisualInformationPanelState;

    constructor() {
        super();

        this.initializeState();
        this.addListeners();
    }

    public getState(): Readonly<VisualInformationPanelState> {
        return this.currentState;
    }

    public dispose() {
        this.removeListeners();
    }

    private initializeState(): void {
        this.currentState = {
            showPanel: false,
            chartOptions: null,
            queryLinks: null,
            dataQuality: null,
            title: null
        };
    }

    protected addListeners(): void {
        TabularResultsPanelActionsInstance.ClosePanel.addListener(this.onClosePanel);
        TabularResultsPanelActionsInstance.OpenWithTabularData.addListener(this.onOpenWithTabularData);
        TabularResultsPanelActionsInstance.OpenWithDataQuality.addListener(this.onOpenWithDataQuality);
        TabularResultsPanelActionsInstance.OpenWithQueryLinks.addListener(this.onOpenWithQueryLinks);
    }

    protected removeListeners(): void {
        TabularResultsPanelActionsInstance.ClosePanel.removeListener(this.onClosePanel);
        TabularResultsPanelActionsInstance.OpenWithTabularData.removeListener(this.onOpenWithTabularData);
        TabularResultsPanelActionsInstance.OpenWithDataQuality.removeListener(this.onOpenWithDataQuality);
        TabularResultsPanelActionsInstance.OpenWithQueryLinks.removeListener(this.onOpenWithQueryLinks);
    }

    @autobind
    private onClosePanel(): void {
        //Preserve general state when toggling panel. Reset to initial state for transient UI information.
        this.initializeState();
        this.emitChanged();
    }

    @autobind
    private onOpenWithTabularData(chart: ChartOptions): void {
        let chartOptions = { ...chart };
        chartOptions.showAccessibleForm = true;
        this.currentState = {
            chartOptions: chartOptions,
            showPanel: true,
            title: Resources.TabularData_Title
        };
        this.emitChanged();
    }

    @autobind
    private onOpenWithDataQuality(dataQuality: DataQualityReportComponentProps): void {
        this.currentState = {
            dataQuality: dataQuality,
            showPanel: true,
            title: Resources.DataQuality_Title
        };
        this.emitChanged();
    }

    @autobind
    private onOpenWithQueryLinks(queryLinks: QueryLinksComponentProps): void {
        this.currentState = {
            queryLinks: queryLinks,
            showPanel: true,
            title: Resources.QueryLinks_Title
        };
        this.emitChanged();
    }
}

export class VisualInformationPanelActionCreator {
    public closePanel() {
        TabularResultsPanelActionsInstance.ClosePanel.invoke(null);
    }

    public showChartTabularData(chart: ChartOptions) {
        TabularResultsPanelActionsInstance.OpenWithTabularData.invoke(chart);
    }

    public showDataQuality(dataQuality: DataQualityReportComponentProps) {
        TabularResultsPanelActionsInstance.OpenWithDataQuality.invoke(dataQuality);
    }

    public showQueryLinks(queryLinks: QueryLinksComponentProps) {
        TabularResultsPanelActionsInstance.OpenWithQueryLinks.invoke(queryLinks);
    }
}


export class TabularResultsPanelActions {
    public ClosePanel = new Action();
    public OpenWithTabularData = new Action<ChartOptions>();
    public OpenWithDataQuality = new Action<DataQualityReportComponentProps>();
    public OpenWithQueryLinks = new Action<QueryLinksComponentProps>();
}
export const TabularResultsPanelActionsInstance = new TabularResultsPanelActions();

export interface VisualInformationPanelProps extends Props {
    actionCreator: VisualInformationPanelActionCreator;
    store: VisualInformationPanelStore;
}

/**
 * Provides a view for extended information experiences about a visual/Widget.
 */
export class VisualInformationPanel extends React.Component<VisualInformationPanelProps, VisualInformationPanelState> {

    constructor(props: VisualInformationPanelProps) {
        super(props);
        this.state = this.props.store.getState();
    }

    public componentDidMount() {
        this.props.store.addChangedListener(this.storeListener);
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this.storeListener);
    }


    @autobind
    private storeListener(): void {
        this.setState(this.props.store.getState());
    }

    public render() {
        return (
            <Panel
                isOpen={this.state.showPanel}
                type={PanelType.medium}
                onDismiss={this.onClosePanel}
                headerText={this.state.title}
                closeButtonAriaLabel='Close'
                onRenderFooterContent={this.onRenderFooterContent}
            >
                {this.state.chartOptions && <ChartComponent chartOptions={this.state.chartOptions as CommonChartOptions} />}
                {this.state.dataQuality && <DataQualityReportComponent {...this.state.dataQuality} />}
                {this.state.queryLinks && <QueryLinksComponent {...this.state.queryLinks} />}
            </Panel>
        );
    }

    @autobind
    public onClosePanel(): void {
        this.props.actionCreator.closePanel();
    }

    @autobind
    private onRenderFooterContent(): JSX.Element {
        return (
            <div>
                <PrimaryButton
                    onClick={this.onClosePanel}
                    style={{ 'marginRight': '8px' }}
                >
                    Close
                </PrimaryButton>
            </div>
        );
    }
}
