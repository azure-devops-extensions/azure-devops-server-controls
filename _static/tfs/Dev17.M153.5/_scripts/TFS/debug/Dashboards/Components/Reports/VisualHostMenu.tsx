import * as React from "react";

import { IconButton } from "OfficeFabric/Button";

import { Component, Props, State } from "VSS/Flux/Component";
import { ContextualMenuItemType, DirectionalHint } from "OfficeFabric/ContextualMenu";
import { DropdownButton } from "VSSUI/ContextualMenuButton";
import { VssContextualMenu, IVssContextualMenuItem } from "VSSUI/VssContextualMenu";

import { VisualInformationPanel, VisualInformationPanelActionCreator, VisualInformationPanelState, VisualInformationPanelProps, VisualInformationPanelStore } from "Dashboards/Components/Reports/VisualInformationPanel";
import { showAddToDashboard } from "TFSUI/Dashboards/AddToDashboard";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WidgetDataForPinning } from "Dashboards/Scripts/Pinning.WidgetDataForPinning";

import { ChartOptions } from "Charts/Contracts";
import { DataQualityReportComponentProps } from 'Dashboards/Components/Reports/DataQualityReportComponent';
import { QueryLinksComponentProps } from 'Dashboards/Components/Reports/QueryLinksComponent';
import Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import "VSS/LoaderPlugins/Css!Dashboards/Components/Reports/VisualHostMenu";

/**
 * Takes in context for assembling a visual host Menu.
 */
export interface VisualHostMenuProps extends Props {
    /**
     * Describes a widget for pinning, based on the description of the visual.
     */
    getWidgetOptions?: () => WidgetDataForPinning;

    /**
     * Handler for view to respond to widget being added.
     */
    onWidgetAdded?: (PinArgs) => void;

    /**
     * Describes data quality/latency of the Visual.
     */
    getDataQuality?: () => DataQualityReportComponentProps;

    /**
     * Describes underlying chart configuration, for tabular presentation.
     */
    getTabularData?: () => ChartOptions;

    /**
     * Describes underlying OData queries with explanations, for consumption by user.
     */
    getQueryLinks?: () => QueryLinksComponentProps;
}

export interface VisualHostMenuState extends State {
    isContextMenuVisible: boolean;
    target: any;

    visualInformationPanelStore: VisualInformationPanelStore;
    visualInformationPanelActionCreator: VisualInformationPanelActionCreator;
}

/**
 * Implements affordance and underlying menu for the visual host.
 */
export class VisualHostMenu extends React.Component<VisualHostMenuProps, VisualHostMenuState> {
    constructor(props) {
        super(props);
        this.state = {
            isContextMenuVisible: false,
            target: undefined,

            visualInformationPanelStore: new VisualInformationPanelStore(),
            visualInformationPanelActionCreator: new VisualInformationPanelActionCreator(),
        };
        this.onClick = this.onClick.bind(this);
        this.onDismiss = this.onDismiss.bind(this);
    }

    public render(): JSX.Element {
        return (
            <div className="visual-host-menu">

                <VisualInformationPanel
                    actionCreator={this.state.visualInformationPanelActionCreator}
                    store={this.state.visualInformationPanelStore}
                />
                <IconButton onClick={this.onClick} id="visual-host-menu-button" iconProps={{ iconName: 'More' }} width={26} height={26} />
                {this.state.isContextMenuVisible ? (
                    <VssContextualMenu
                        shouldFocusOnMount={true}
                        target={this.state.target}
                        onDismiss={this.onDismiss}
                        items={this.getMenuItems()}
                        directionalHint={DirectionalHint.bottomRightEdge}
                    />) : (null)}
            </div>
        );
    }

    /**
     * Indicates if any aspect of the menu props will drive menu creation.
     * @param menuProps 
     */
    public static menuHasContent(menuProps: VisualHostMenuProps): boolean {
        return menuProps && (menuProps.getDataQuality != null ||
            menuProps.getQueryLinks != null ||
            menuProps.getTabularData != null ||
            menuProps.getWidgetOptions != null);
    }

    private onClick(event: React.MouseEvent<any>): void {
        this.patchState({ target: event.currentTarget, isContextMenuVisible: true });
    }

    private onDismiss(event: any): void {
        this.patchState({ isContextMenuVisible: false });
    }

    private getMenuItems(): IVssContextualMenuItem[] {
        var items: IVssContextualMenuItem[] = [];
        if (this.props.getWidgetOptions) {
            items.push({
                key: "10",
                name: PresentationResources.PushToDashboardTitle,
                groupKey: "A",
                onClick: () => {
                    let props = {};
                    showAddToDashboard({
                        widgetData: this.props.getWidgetOptions(),
                        projectId: TfsContext.getDefault().contextData.project.id,
                        actionCallback: (pinArgs) => {
                            if (this.props.onWidgetAdded != null) {
                                this.props.onWidgetAdded(pinArgs);
                            }
                        }
                    });
                }
            });
        }

        if (this.props.getDataQuality) {
            items.push({
                key: "100",
                name: Resources.VisualHostMenu_CheckDataQuality,
                groupKey: "B",
                onClick: () => {
                    this.state.visualInformationPanelActionCreator.showDataQuality(this.props.getDataQuality());
                }
            });
        }

        if (this.props.getTabularData) {
            items.push({
                key: "200",
                name: Resources.VisualHostMenu_ViewAsTabularData,
                groupKey: "B",
                onClick: () => {
                    this.state.visualInformationPanelActionCreator.showChartTabularData(this.props.getTabularData());
                }
            });
        }

        if (this.props.getQueryLinks) {
            items.push({
                key: "300",
                name: Resources.VisualHostMenu_GetQueryLinks,
                groupKey: "B",
                onClick: () => {
                    this.state.visualInformationPanelActionCreator.showQueryLinks(this.props.getQueryLinks());
                }
            });
        }
        return items;
    }

    /**
     * Shallow-clone state to replace only the specifed properties. Applies no semantic assumptions about logically related props.
     * @param modifiedProperties 
     */
    private patchState(modifiedProperties: Partial<VisualHostMenuState>) {
        var newState = {}
        this.setState({ ...this.state, ...{ target: null }, ...modifiedProperties });
    }
}