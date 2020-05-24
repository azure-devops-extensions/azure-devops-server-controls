import * as React from "react";
import * as ReactDOM from "react-dom";

// Office Fabric
import { BaseComponent } from "OfficeFabric/Utilities";
import { autobind, IBaseProps } from "OfficeFabric/Utilities";
import { IContextualMenuItem } from 'OfficeFabric/ContextualMenu';
import { Fabric } from "OfficeFabric/Fabric";
import { SelectionMode } from "OfficeFabric/Selection";
import { DefaultButton } from "OfficeFabric/Button";

// VSSUI
import { IFilterBar, FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { IFilter } from "VSSUI/Utilities/Filter";
import { IVssHubViewState, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { Hub } from "VSSUI/Hub";
import { HubHeader, HubTileRegion, HubTextTile } from "VSSUI/HubHeader";
import { PickListFilterBarItem } from "VSSUI/PickList";
import { PivotBarItem } from 'VSSUI/PivotBar';
import { VssIconType } from "VSSUI/VssIcon";
import { HubViewOptionKeys } from "VSSUI/Utilities/HubViewState";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";
import { Link } from "VSSUI/Link";

// VSS
import { WebPageDataService } from "VSS/Contributions/Services";
import { registerContent } from "VSS/SDK/Shim";
import { getService, getClient } from "VSS/Service";
import { LocationsHttpClient } from "VSS/Locations/RestClient";
import { getScenarioManager, IScenarioDescriptor } from "VSS/Performance";

// TFS
import { TeamProject } from "TFS/Core/Contracts";
import { onClickFPS } from "VSS/Platform/FPS";

interface IHubSampleSinglePivotItemProps extends IBaseProps {
    vssContext: any;
}

class HubSampleSinglePivotItem extends BaseComponent<IHubSampleSinglePivotItemProps> {

    private _hubViewState: IVssHubViewState;
    private _teamProject: TeamProject;
    private _scenario: IScenarioDescriptor;

    constructor(props: IHubSampleSinglePivotItemProps) {
        super(props);

        this._hubViewState = new VssHubViewState({
            viewOptionNavigationParameters: [
                { key: HubViewOptionKeys.showFilterBar, behavior: HistoryBehavior.none }
            ]
        });

        this._teamProject = getService(WebPageDataService).getPageData("ms.vss-tfs-web.public-access-sample-data-provider");
        this._scenario = getScenarioManager().startScenarioFromNavigation("Presentation", "Hub.Sample.mount", true);        
    }

    public render(): JSX.Element {

        return (
            <Fabric className="bowtie-fabric">
                <Hub
                    hubViewState={this._hubViewState}
                    commands={[
                        { key: "add-file", name: "New file", important: true, iconProps: { iconName: "math-plus", iconType: VssIconType.bowtie }, onClick: this._onCommandClick }
                    ]}
                    onRenderFilterBar={() => <MyCustomFilterBar />}
                >
                    <HubHeader
                        title={this._teamProject ? `${this._teamProject.name} Details` : "Project info not found"}
                        iconProps={{
                            iconType: VssIconType.fabric,
                            iconName: "ProFootball"
                        }}
                    />
                    <HubTileRegion>
                        <HubTextTile
                            text="Primary text"
                        />
                        <div className='chart' style={{ backgroundColor: 'blue' }} />
                    </HubTileRegion>

                    <PivotBarItem name='Details' itemKey='contents' iconProps={{ iconName: "shield", iconType: VssIconType.bowtie }}>
                        {this._teamProject ? 
                            <ul>
                                <li>Project id: {this._teamProject.id}</li>
                                <li>Project url: {this._teamProject.url}</li>
                                <li>Project web url: <Link href={this._teamProject._links.web.href} onClick={this.onLinkClick} /></li>
                                <li>Default team: {this._teamProject.defaultTeam.name}</li>
                            </ul> : 
                            <p>Project details not found, check console for further warning/errors</p>
                        }

                        <DefaultButton onClick={this._onButtonClick}>Get Service Definitions</DefaultButton>
                    </PivotBarItem>
                </Hub>
            </Fabric >
        );
    }

    public componentDidMount(): void {
        this._scenario.end();
    }

    private onLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        onClickFPS(this.props.vssContext, href, true, event);
    }

    @autobind
    private _onCommandClick(ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem): void {
        console.log(`${item.key} clicked`);
    }

    @autobind
    private _onButtonClick(ev: React.MouseEvent<HTMLButtonElement>): void {
        var locationService = getClient(LocationsHttpClient);
        locationService.getServiceDefinitions().then((serviceDefinitions: any[])=> {
            alert(`Found ${serviceDefinitions.length} service definitions`);
        });
    }
}

interface MyCustomFilterBarProps extends IBaseProps {
    filter?: IFilter;
    className?: string;
}

class MyCustomFilterBar extends BaseComponent<MyCustomFilterBarProps, {}> implements IFilterBar {

    private _filterBar: IFilterBar;

    public render(): JSX.Element {
        return <FilterBar className={this.props.className} filter={this.props.filter} componentRef={(filterBar: IFilterBar) => this._filterBar = filterBar}>
            <KeywordFilterBarItem
                filterItemKey="keyword"
            />
            <PickListFilterBarItem
                filterItemKey="colorFilter"
                selectionMode={SelectionMode.multiple}
                getPickListItems={() => { return ['green', 'red', 'yellow', 'blue'] }}
                placeholder='Colors'
            />
        </FilterBar>
    }

    focus() {
        this._filterBar.focus();
    }

    forceUpdate() {
        this._filterBar.forceUpdate();
    }
}

registerContent("hub.sample2", context => {
    ReactDOM.render(<HubSampleSinglePivotItem vssContext={context.options._pageContext} />, context.$container[0]);
});


