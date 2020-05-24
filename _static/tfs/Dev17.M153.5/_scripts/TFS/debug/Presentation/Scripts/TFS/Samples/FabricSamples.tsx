import * as React from "react";
import * as ReactDOM from "react-dom";

import { registerContent } from "VSS/SDK/Shim";
import { Component } from "VSS/Flux/Component";

import {
    CommandButton,
    CompoundButton,
    DefaultButton,
    IButton,
    IconButton,
    PrimaryButton
} from "OfficeFabric/Button";
import { Checkbox } from "OfficeFabric/Checkbox";
import { ColorPicker } from "OfficeFabric/ColorPicker";
import { CommandBar } from "OfficeFabric/CommandBar";
import { ContextualMenu, IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { DatePicker } from 'OfficeFabric/DatePicker';
import { Dropdown, IDropdownOption } from 'OfficeFabric/Dropdown';
import { Fabric } from "OfficeFabric/Fabric";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { IIconProps } from "OfficeFabric/Icon";
import { Label } from "OfficeFabric/Label";
import { List } from "OfficeFabric/List";
import { Pivot, PivotItem, PivotLinkSize } from "OfficeFabric/Pivot";
import { Toggle } from "OfficeFabric/Toggle";

import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { getRTL, BaseComponent } from "OfficeFabric/Utilities";

import { HubHeader } from "VSSUI/HubHeader";
import { IHubBreadcrumbItem } from "VSSUI/Components/HubHeader/HubBreadcrumb.Props";
import { VssIconType } from "VSSUI/VssIcon";
import { IItemPickerProvider } from "VSSUI/PickList";
import { FavoriteItemPicker, IFavoriteItemPickerProps } from "Favorites/Controls/FavoriteItemPicker";

import { WorkItemTrackingHttpClient, getClient } from "TFS/WorkItemTracking/RestClient";
import { QueryHierarchyItem, QueryExpand } from "TFS/WorkItemTracking/Contracts";
import { caseInsensitiveContains } from "VSS/Utils/String";

import {
    datePickerProps,
    pivotIcon
} from "VSSPreview/OfficeFabric/Helpers";
import { getDefaultWebContext } from "VSS/Context";

import "VSS/LoaderPlugins/Css!fabric";

interface IFabricSamplesState {
    isContextMenuVisible?: boolean;
    buttonsDisabled?: boolean;
    target?: any;
    selectedItem?: IDropdownOption;
    headerPicker?: IItemPickerProvider<any>;
}

function getFavoriteItemPicker(): IItemPickerProvider<any> {
    let webContext = getDefaultWebContext();

    let props: IFavoriteItemPickerProps = {
        favoritesContext: {
            artifactTypes: ['Microsoft.TeamFoundation.WorkItemTracking.QueryItem'],
            artifactScope: {
                id: webContext.project.id,
                name: webContext.project.name,
                type: 'Project'
            }
        },
        searchTextPlaceholder: 'Search all queries',
        getSearchResults: (searchText: string) => {
            return getAllQueryItems(webContext.project.id).then((items) => {
                return items.filter(q => caseInsensitiveContains(q.name, searchText));
            });
        },
        selectedItem: {
            id: "38a5141f-8046-4eb8-84c8-26d88df30faa",
            name: "My Tasks"
        }
    };

    return new FavoriteItemPicker(props);
}

function getAllQueryItems(projectId: string): IPromise<any[]> {
    return getClient().getQueries(projectId, QueryExpand.None, 2, false).then((queries) => {
        let items: any[] = [];
        flattenQueries(queries, items);
        return items;
    });
}

function flattenQueries(queries: QueryHierarchyItem[], items: any[]): void {
    for (let q of queries) {
        if (!q.isFolder) {
            items.push({
                key: q.id,
                name: q.name
            });
        }
        else if (q.children) {
            flattenQueries(q.children, items);
        }
    }
}

let items = [
    { id: 1, text: "First" },
    { id: 2, text: "Second" },
    { id: 3, text: "Third" },
    { id: 4, text: "Forth" }
];

class FabricSamples extends BaseComponent<any, IFabricSamplesState> {
    private _iconButton: IButton;
    private _legacyButton: any;
    constructor(props: any) {
        super(props);
        this.state = {
            buttonsDisabled: false,
            isContextMenuVisible: false,
            headerPicker: getFavoriteItemPicker()
        };
    }

    private getItems(): IContextualMenuItem[] {
        return [
            {
                key: 'newItem',
                iconProps: {
                    iconName: "Add"
                },
                subMenuProps: {
                    items: [
                        {
                            key: 'folder',
                            name: 'My folder (bowtie)',
                            title: 'My folder (bowtie)',
                            iconProps: { className: "bowtie-icon bowtie-folder" }
                        },
                        {
                            key: 'rename',
                            name: 'Rename (bowtie)',
                            title: 'Rename (bowtie)',
                            iconProps: { className: "bowtie-icon bowtie-edit-rename" }
                        },

                        {
                            key: 'calendarEvent',
                            name: 'Calendar event',
                            title: 'Create a calendar event',
                        },
                        {
                            key: "addGroup",
                            name: "Add group (fabric)",
                            title: "Add group (fabric)",
                            iconProps: {
                                iconName: "Add"
                            }
                        }
                    ],
                },
                name: 'New'
            },
            {
                key: 'folder',
                name: 'My folder (bowtie)',
                title: 'My folder (bowtie)',
                iconProps: { className: "bowtie-icon bowtie-folder" }
            },
            {
                key: 'rename',
                name: 'Rename (bowtie)',
                title: 'Rename (bowtie)',
                iconProps: { className: "bowtie-icon bowtie-edit-rename" }
            },
            {
                key: 'calendarEvent',
                name: 'Calendar event',
                title: 'Create a calendar event',
            },
            {
                key: "addGroup",
                name: "Add group (fabric)",
                title: "Add group (fabric)",
                iconProps: {
                    iconName: "Add"
                }
            }
        ];
    }

    public render(): JSX.Element {
        let { buttonsDisabled, headerPicker } = this.state;
        return <Fabric style={{ padding: "0 10px" }} className="bowtie-fabric">
            <Pivot linkSize={PivotLinkSize.large}>

                <PivotItem linkText="List" itemIcon={pivotIcon("bowtie-favorite")}>
                    <input />
                    <FocusZone direction={FocusZoneDirection.vertical} className="my-class-name">
                        <List
                            items={items}
                            onRenderCell={(item, index) => (
                                <DefaultButton>{item.id}</DefaultButton>
                            )}>
                        </List>
                    </FocusZone>
                </PivotItem>

                <PivotItem linkText="Button" itemIcon={pivotIcon("bowtie-alert")}>
                    <Checkbox label="Disable buttons" onChange={this._onButtonsDisableChange}></Checkbox>
                    <div>
                        <Label>Plain DOM</Label>
                        <button disabled={buttonsDisabled}>Plain button</button>
                    </div>
                    <div>
                        <Label>Default</Label>
                        <DefaultButton disabled={buttonsDisabled} iconProps={{ iconName: 'Add' }} description='I am a description'>Create account</DefaultButton>
                    </div>
                    <div>
                        <Label>Primary</Label>
                        <PrimaryButton disabled={buttonsDisabled} onClick={() => alert('Clicked')}>Create account</PrimaryButton>
                    </div>
                    <div>
                        <Label>Compound</Label>
                        <CompoundButton description='You can create a new account here.' disabled={buttonsDisabled}>Create account</CompoundButton>
                    </div>
                    <div>
                        <Label>Command</Label>
                        <CommandButton iconProps={{ iconName: 'Edit' }} disabled={buttonsDisabled} onClick={this._onFocusIconButton}>Focus icon button</CommandButton>
                    </div>
                    <div>
                        <Label>Icon</Label>
                        <IconButton disabled={buttonsDisabled} iconProps={{ iconName: 'Refresh' }} title='Emoji' ariaLabel='Emoji' componentRef={this._resolveRef('_iconButton')} />
                    </div>
                    <div>
                        <Label>Contextual menu</Label>
                        <DefaultButton disabled={buttonsDisabled} iconProps={{ iconName: 'RemoveLink' }} menuProps={{
                            items: [
                                {
                                    key: 'emailMessage',
                                    name: 'Email message',
                                    icon: 'Mail'
                                },
                                {
                                    key: 'calendarEvent',
                                    name: 'Calendar event',
                                    icon: 'Calendar'
                                }
                            ]
                        }
                        }
                        >New</DefaultButton>
                    </div>
                    <div>
                        <Label>Link primary</Label>
                        <PrimaryButton disabled={buttonsDisabled} href='http://bing.com' target='_blank' title='Let us bing!'>Bing</PrimaryButton>
                    </div>
                    <div>
                        <Label>Link default</Label>
                        <DefaultButton disabled={buttonsDisabled} href='http://bing.com' target='_blank' title='Let us bing!'>Bing</DefaultButton>
                    </div>
                    <div>
                        <Label>Aria description for screen readers</Label>
                        <PrimaryButton disabled={buttonsDisabled} ariaDescription='This is aria description used for screen reader.'>Aria Description</PrimaryButton>
                    </div>
                    <div>
                        <Toggle defaultChecked={true} disabled={buttonsDisabled} label='Toggle checked' onText='On' offText='Off' />
                    </div>
                    <div>
                        <Toggle defaultChecked={false} disabled={buttonsDisabled} label='Toggle unchecked' onText='On' offText='Off' />
                    </div>
                </PivotItem>
                <PivotItem linkText="ContextualMenu" itemIcon={pivotIcon("bowtie-approve")}>
                    <DefaultButton ref={(btn) => { this._legacyButton = btn; }} onClick={this._onClick} id='ContextualMenuButton1'> Click for ContextualMenu </DefaultButton>
                    {this.state.isContextMenuVisible ? (
                        <ContextualMenu
                            target={this.state.target}
                            shouldFocusOnMount={true}
                            onDismiss={this._onDismiss}
                            directionalHint={getRTL() ? DirectionalHint.bottomRightEdge : DirectionalHint.bottomLeftEdge}
                            items={this.getItems()}
                        />) : (null)}
                </PivotItem>
                <PivotItem linkText="CommandBar" itemIcon={pivotIcon("bowtie-status-error")}>
                    <CommandBar
                        isSearchBoxVisible={true}
                        searchPlaceholderText={"Search..."}
                        items={this.getItems()}
                        farItems={this.getItems()}
                    />
                </PivotItem>
                <PivotItem linkText="DatePicker" itemIcon={pivotIcon("bowtie-calendar")}>
                    <div style={{ width: "300px" }}>
                        <Label>Pick a date (with month picker):</Label>
                        <DatePicker {...datePickerProps() } allowTextInput={true} />
                        <Label>Pick a date:</Label>
                        <DatePicker {...datePickerProps("G") } isMonthPickerVisible={false} />
                    </div>
                </PivotItem>
                <PivotItem linkText="Dropdown" itemIcon={pivotIcon("bowtie-folder")}>
                    <div style={{ width: "600px" }}>
                        <Dropdown
                            label='Basic example:'
                            options={this.getDropdownItems()}
                            onChanged={(item) => this.setState({ selectedItem: item })}
                        />
                    </div>
                </PivotItem>
            </Pivot>
        </Fabric>;
    }

    private _onClick = (e: React.MouseEvent<any>) => {
        this.setState({ target: e.target, isContextMenuVisible: true });
    }

    private _onDismiss = (e: any) => {
        this.setState({ isContextMenuVisible: false });
    }

    private _onButtonsDisableChange = (ev: React.FormEvent<HTMLElement>, isChecked: boolean) => {
        this.setState({ buttonsDisabled: isChecked });
    }

    private _onFocusIconButton = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (this._iconButton) {
            this._iconButton.focus();
        }
    }

    private getDropdownItems(): IDropdownOption[] {
        let options: IDropdownOption[] = [];
        for (let i = 0; i < 12; i++) {
            options.push({ key: `item${i}`, text: `Dropdown Item ${i + 1}` });
        }

        return options;
    }

    public componentWillUnmount(): void {
        let headerPicker = this.state.headerPicker as FavoriteItemPicker;
        if (headerPicker) {
            headerPicker.dispose();
        }
    }
}

registerContent("fabric.samples", context => {
    ReactDOM.render(<FabricSamples />, context.$container[0]);
});
