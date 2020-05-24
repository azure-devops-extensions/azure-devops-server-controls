import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { autobind } from "OfficeFabric/Utilities";
import { Fabric } from "OfficeFabric/Fabric";
import { ITeam} from "TestManagement/Scripts/TestReporting/ExploratorySession/Utils";
import { PickListDropdown, IPickListItem, IPickListSelection } from "VSSUI/PickList";
import { SelectionMode } from "OfficeFabric/Selection";

export interface IProps {
    selectedTeam: ITeam;
    allTeams: ITeam[];
    onSelectionChange:(teamId: string) => void;
}

export interface ITeamFilterState {
    selectedTeam: ITeam;
}

export class TeamFilterComponent extends React.PureComponent<IProps, ITeamFilterState> {

    constructor(props: IProps) {
        super(props);

        this.state = {
            selectedTeam: props.selectedTeam
        };
    }

    public render(): JSX.Element {

        return <div>
            <span className="title">
                {Resources.TeamText}
            </span>
            <PickListDropdown
                className="session-team-picklist"
                selectedItems={[this.state.selectedTeam]}
                getListItem={this._getListItem}
                selectionMode={SelectionMode.single}
                getPickListItems={this._getPickListItems}
                isSearchable={true}
                onSelectionChanged={this._onSelectionChanged}
                searchTextPlaceholder={Resources.SearchTeamText}
                ariaLabelFormat={Resources.TeamFilterAriaLabel}
            />
        </div>;
    }

    @autobind
    private _getPickListItems(): ITeam[] {
        return this.props.allTeams;
    }

    private _getListItem(item: ITeam): IPickListItem {
        return {
            key: item.id,
            name: item.name
        };
    }

    @autobind
    private _onSelectionChanged(selection: IPickListSelection): void {
        const selectedTeam = selection.selectedItems[0];
        this.props.onSelectionChange(selectedTeam.id);
        this.setState({
            selectedTeam: selectedTeam
        });
    }
   
}

export function mountBreadcrumb(element: HTMLElement, props: IProps) {
    ReactDOM.render(
        <Fabric>
            <TeamFilterComponent {...props} />
        </Fabric>, element);
}
