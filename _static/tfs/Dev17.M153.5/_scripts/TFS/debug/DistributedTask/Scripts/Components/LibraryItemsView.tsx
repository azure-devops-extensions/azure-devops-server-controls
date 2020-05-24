/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Component_Base = require("VSS/Flux/Component");
import Preview_Button = require("VSSPreview/Flux/Components/Button");

import Locations = require("VSS/Locations");
import VSS = require("VSS/VSS");
import Navigation_Services = require("VSS/Navigation/Services");
import * as Utils_Core from "VSS/Utils/Core";
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import { announce } from "VSS/Utils/Accessibility";
import Events_Services = require("VSS/Events/Services");

import Constants = require("DistributedTask/Scripts/Constants");
import Dialogs = require("DistributedTask/Scripts/Components/Dialogs");
import { LibraryItemType } from "DistributedTask/Scripts/DT.Types";
import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import { KeyboardAccesibleComponent } from "DistributedTask/Scripts/Common/KeyboardAccessible";

import { DetailsList, IColumn, CheckboxVisibility, ConstrainMode } from "OfficeFabric/DetailsList";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Fabric } from "OfficeFabric/Fabric";
import * as Tooltip from "VSSUI/Tooltip";
import { LibraryActionCreator } from "DistributedTask/Scripts/Actions/LibraryActionCreator";
import { LibraryItem } from "DistributedTask/Scripts/DT.LibraryItem.Model";
import { LibraryItemMenu } from "DistributedTask/Scripts/Components/LibraryHubMenu";
import { LibraryItemsStore } from "DistributedTask/Scripts/Stores/LibraryItemsStore";
import { Pivot, PivotLinkFormat, PivotItem, PivotLinkSize } from "OfficeFabric/Pivot";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { ErrorMessageBar } from "DistributedTask/Scripts/Components/ErrorMessageBar";
import { TitleBar, Props as TitleBarProps } from "DistributedTask/Scripts/Components/TitleBar";

import { focusDetailsListRow } from "DistributedTaskControls/Common/ReactFocus";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { PerfTelemetryManager, TelemetryScenarios } from "DistributedTask/Scripts/Utils/TelemetryUtils";

import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { IFilterState, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";
import { IHubViewState, HubViewState } from "VSSUI/Utilities/HubViewState";
import { Hub, IHub } from "VSSUI/Hub";
import { IHubBreadcrumbItem, HubHeader } from "VSSUI/HubHeader";
import { PivotBarItem, IPivotBarAction } from "VSSUI/PivotBar";
import { VssDetailsList } from "VSSUI/VssDetailsList";
import { VssIconType, VssIcon } from "VSSUI/VssIcon";

export interface LibraryItemsTabState extends Component_Base.State {
    selectedTab: number;
    itemsViewState: LibraryItemsViewState[];
}

export interface LibraryItemsViewState extends Component_Base.State {
    data: LibraryItem[];
    searchValue?: string;
    isSortedDescending: boolean;
    errorMessage: string;
}

export class LibraryItemsView extends Component_Base.Component<Component_Base.Props, LibraryItemsTabState> {
    constructor(props: Component_Base.Props) {
        super(props);

        PerfTelemetryManager.initialize();
        PerfTelemetryManager.instance.startTTIScenarioOrNormalScenario(TelemetryScenarios.LibraryLanding);

        // setup state for each tab in the library
        this._store = StoreManager.GetStore<LibraryItemsStore>(LibraryItemsStore);
        let itemsViewState = [];
        itemsViewState.push({ data: null, isSortedDescending: false, errorMessage: "", searchValue: "" });
        itemsViewState.push({ data: null, isSortedDescending: false, errorMessage: "", searchValue: "" });

        // find selected tab and populate data for that tab only
        let selectedTab = LibraryItemType.VariableGroup;
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        if (urlState.itemType === Constants.LibraryConstants.LibraryItemsView_SecureFiles) {
            selectedTab = LibraryItemType.SecureFile;
        }

        itemsViewState[selectedTab].data = this._store.getData(selectedTab);
        this.state = { selectedTab: selectedTab, itemsViewState };
        this._eventManager = Events_Services.getService();

        let defaultPivot = selectedTab === LibraryItemType.VariableGroup ? this._variableGroupsKey : this._secureFilesKey;
        this._hubViewState = new HubViewState({ defaultPivot: defaultPivot });
    }

    public render(): JSX.Element {
        return (
            <Fabric>
                <ErrorMessageBar
                    errorMessage={this.state.itemsViewState[this.state.selectedTab].errorMessage}
                />
                <Hub
                    className={this.state.itemsViewState[this.state.selectedTab].errorMessage ? "hub-view lib-hub-items-view has-error" : "hub-view lib-hub-items-view"}
                    componentRef={(hub => { this._hub = hub; })}
                    hubViewState={this._hubViewState}
                    hideFullScreenToggle={true}
                    commands={this._getCommandBarItemsFor(this.state.selectedTab)}>
                    <HubHeader
                        hubBreadcrumbAriaLabel={Resources.LibraryHubTitle}
                        title={Resources.LibraryHubTitle}
                    />
                    <FilterBar>
                        {
                            <KeywordFilterBarItem
                                filterItemKey={this._nameFilterKey}
                                placeholder={this.getSearchBoxLabel()}
                            />
                        }
                    </FilterBar>
                    <PivotBarItem name={Resources.VariableGroupsTabTitle} itemKey={this._variableGroupsKey} ariaLabel={Resources.VariableGroupsTabTitle}>
                        {this.getHubContent(LibraryItemType.VariableGroup)}
                    </PivotBarItem>
                    <PivotBarItem name={Resources.SecureFilesTabTitle} itemKey={this._secureFilesKey} ariaLabel={Resources.SecureFilesTabTitle}>
                        {this.getHubContent(LibraryItemType.SecureFile)}
                    </PivotBarItem>
                </Hub>
            </Fabric>);
    }

    private _onPivotChange = (item: PivotItem) => {
        if (item) {
            let state = this.getState();

            // set current tab
            if (item.props.linkText === Resources.VariableGroupsTabTitle) {
                state.selectedTab = LibraryItemType.VariableGroup;
            } else if (item.props.linkText === Resources.SecureFilesTabTitle) {
                state.selectedTab = LibraryItemType.SecureFile;
            }

            this.updateData(state);
            this.setState(state);
            this._hubViewState.selectedPivot.value = state.selectedTab === LibraryItemType.VariableGroup ? this._variableGroupsKey : this._secureFilesKey;

            this.updateUrl();
        }
    }

    private _onHubPivotChange = (selectedPivot: any) => {
        let state = this.getState();

        // set current tab
        if (selectedPivot === this._variableGroupsKey) {
            state.selectedTab = LibraryItemType.VariableGroup;
        } else if (selectedPivot === this._secureFilesKey) {
            state.selectedTab = LibraryItemType.SecureFile;
        }

        this.updateData(state);
        this.setState(state);
        this.updateUrl();
    }

    private updateData(state: LibraryItemsTabState) {
        // set the data for current tab
        let itemsViewState = state.itemsViewState.slice();
        let storeData = this._store.getData(state.selectedTab);
        let filteredData = storeData ? storeData.filter(i => i.name.toLowerCase().indexOf(state.itemsViewState[state.selectedTab].searchValue.toLowerCase()) > -1) : storeData;
        let sortedData = filteredData ? LibraryItemsView.sortItems(filteredData, "name", state.itemsViewState[state.selectedTab].isSortedDescending) : filteredData;
        itemsViewState[state.selectedTab].data = sortedData;
    }

    private updateUrl() {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        let state = this.getState();
        if (state.selectedTab === LibraryItemType.VariableGroup && urlState.itemType !== Constants.LibraryConstants.LibraryItemsView_VariableGroups) {
            urlState.itemType = Constants.LibraryConstants.LibraryItemsView_VariableGroups;
            Navigation_Services.getHistoryService().replaceHistoryPoint(undefined, urlState);
        }
        if (state.selectedTab === LibraryItemType.SecureFile && urlState.itemType !== Constants.LibraryConstants.LibraryItemsView_SecureFiles) {
            urlState.itemType = Constants.LibraryConstants.LibraryItemsView_SecureFiles;
            Navigation_Services.getHistoryService().replaceHistoryPoint(undefined, urlState);
        }
    }

    public componentDidMount() {
        this._store.addChangedListener(this.onStoreChange);
        this._hubViewState.selectedPivot.subscribe(this._onHubPivotChange);
        this._hubViewState.filter.subscribe(this._onFilterChanged, FILTER_CHANGE_EVENT);
        LibraryActionCreator.getInstance().getVariableGroups();
        LibraryActionCreator.getInstance().getSecureFiles();
        this.updateUrl();
        Navigation_Services.getHistoryService().attachNavigate(this.onUrlChange);
        this._eventManager.attachEvent(Constants.LibraryActions.UpdateErrorMessage, this.updateErrorMessage);
        this._eventManager.attachEvent(Constants.LibraryActions.ClearErrorMessage, this.clearErrorMessage);
        PerfTelemetryManager.instance.endScenario(TelemetryScenarios.LibraryLanding);
    }

    public componentDidUpdate() {
        if (this._isRowDeleted) {
            let tabViewState: LibraryItemsViewState;
            if (this.state && this.state.itemsViewState) {
                tabViewState = this.state.itemsViewState[this.state.selectedTab];
            }

            let numberOfRows: number = (tabViewState && !!tabViewState.data) ? tabViewState.data.length : 0;
            if (numberOfRows > 0) {
                // Focus on next row if it exists
                if (this._lastDeletedRowIndex < numberOfRows) {
                    focusDetailsListRow(this._detailsList, this._lastDeletedRowIndex);
                }
                //Else focus on previous row
                else if (this._lastDeletedRowIndex === numberOfRows) {
                    focusDetailsListRow(this._detailsList, this._lastDeletedRowIndex - 1);
                }
            }
            else if (numberOfRows === 0 && !!this._addVGButton) {
                this._addVGButton.focus();
            }
        }

        this._isRowDeleted = false;
    }

    public componentWillUnmount() {
        this._hubViewState.selectedPivot.unsubscribe(this._onHubPivotChange);
        this._hubViewState.filter.unsubscribe(this._onFilterChanged, FILTER_CHANGE_EVENT);
        this._store.removeChangedListener(this.onStoreChange);
        this._eventManager.detachEvent(Constants.LibraryActions.UpdateErrorMessage, this.updateErrorMessage);
        this._eventManager.detachEvent(Constants.LibraryActions.ClearErrorMessage, this.clearErrorMessage);

        StoreManager.DeleteStore<LibraryItemsStore>(LibraryItemsStore);
        Navigation_Services.getHistoryService().detachNavigate(this.onUrlChange);
    }

    protected onUrlChange = () => {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        let state = this.getState();

        state.selectedTab = LibraryItemType.VariableGroup;
        if (urlState.itemType === Constants.LibraryConstants.LibraryItemsView_SecureFiles) {
            state.selectedTab = LibraryItemType.SecureFile;
        }

        this.setState(state);
    }

    protected getState(): LibraryItemsTabState {
        return this.state;
    }


    private _onRowWillUnmount(item: any, index: number) {
        this._isRowDeleted = true;
    }
    private static libraryItemOnClick = (data: LibraryItem) => {
        if (data.itemType === LibraryItemType.VariableGroup) {
            Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: Constants.LibraryConstants.VariableGroupView, variableGroupId: data.id });
        } else if (data.itemType === LibraryItemType.SecureFile) {
            Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: Constants.LibraryConstants.SecureFileView, secureFileId: data.id });
        }
    }

    private getSearchBoxLabel(): string {
        let labelText = "";
        if (this.state.selectedTab === LibraryItemType.VariableGroup) {
            labelText = Resources.SearchText;
        } else if (this.state.selectedTab === LibraryItemType.SecureFile) {
            labelText = Resources.SearchTextSecureFiles;
        }

        return labelText;
    }

    private getTitleBarProps(): TitleBarProps {
        let titleBarProps = {
            searchBox: {
                labelText: this.getSearchBoxLabel(),
                onChange: (searchValue) => {
                    this.searchLibraryItems(searchValue);
                },
                value: this.state.itemsViewState[this.state.selectedTab].searchValue
            },
            errorMessage: this.state.itemsViewState[this.state.selectedTab].errorMessage,
            itemText: null,
            isItemDirty: false,
            buttons: [
                {
                    template: () => {
                        return this.newLibraryItemButton();
                    }
                },
                {
                    template: () => {
                        let buttonProps = {
                            className: "lib-button",
                            onClick: () => {
                                Dialogs.Dialogs.showSecurityDialog(LibraryItemType.Library);
                            }
                        }

                        return (
                            <button  {...buttonProps}>
                                <i key={"btn-icon"} className={"bowtie-icon bowtie-shield"}></i>
                                <span key={"btn-text"} className="text">{Resources.Security}</span>
                            </button>);
                    }
                },
                {
                    template: () => {
                        let buttonProps = {
                            className: "lib-button",
                            onClick: () => {
                                this.openLibraryItemHelpWindow();
                            }
                        }

                        return (
                            <button  {...buttonProps}>
                                <i key={"btn-icon"} className={"bowtie-icon bowtie-status-help-outline"}></i>
                                <span key={"btn-text"} className="text">{Resources.HelpText}</span>
                            </button>);
                    }
                }
            ] as Preview_Button.Props[]
        };

        return titleBarProps;
    }

    private _getCommandBarItemsFor(selectedTab: LibraryItemType): IPivotBarAction[] {
        let items: IPivotBarAction[] = [];

        if (selectedTab === LibraryItemType.VariableGroup) {
            items.push({
                key: this._addVGKey,
                name: Resources.VariableGroupText,
                important: true,
                iconProps: { iconName: "Add", iconType: VssIconType.fabric },
                onClick: this._onCommandClick
            });
        }
        else if (selectedTab === LibraryItemType.SecureFile) {
            items.push({
                key: this._uploadSecureFileKey,
                name: Resources.SecureFileText,
                important: true,
                iconProps: { iconName: "Add", iconType: VssIconType.fabric },
                onClick: this._onCommandClick
            });
        }

        items.push({
            key: this._securityKey,
            name: Resources.Security,
            important: true,
            iconProps: { iconName: "bowtie-shield", iconType: VssIconType.fabric },
            onClick: this._onCommandClick
        });

        items.push({
            key: this._helpKey,
            name: Resources.HelpText,
            important: true,
            iconProps: { iconName: "Unknown", iconType: VssIconType.fabric },
            onClick: this._onCommandClick
        });

        return items;
    }

    private getHubContent(itemType: LibraryItemType): JSX.Element {
        if (itemType === LibraryItemType.VariableGroup) {
            return this.getVariableGroupHubContent();
            
        } else if (itemType === LibraryItemType.SecureFile) {
            return this.getSecureFileHubContent();
        }
    }

    private getVariableGroupHubContent(): JSX.Element {
        let libraryItems = this._store.getData(LibraryItemType.VariableGroup);
        let learnMoreAboutVariableGroupsHelpText = Utils_String.localeFormat(Resources.LearnMoreAboutVariableGroupsHelpText, Constants.Links.VariableGroupHelpLink);
        if (libraryItems == null) {
            // showing a spinner till the library items are fetched
            return (
                <div className={"lib-spinner"} role="region">
                    <Spinner type={SpinnerType.large} />
                </div>
            );
        } else if (libraryItems.length === 0) {
            return (
                <div className={"lib-intro-page"} role="region" aria-labelledby="lib-intro-page-text">
                    <div className={"lib-intro-page-icon bowtie-icon bowtie-variable-group"}></div>
                    <div className={"lib-intro-page-text"}>{Resources.NewVariableGroupText}</div>
                    <div className={"lib-intro-page-help-text"} dangerouslySetInnerHTML={{ __html: Resources.CreateVariableGroupHelpText }}></div>
                    <div className={"lib-intro-page-button bowtie"}>
                        <button ref={(button) => { this._addVGButton = button; }} onClick={this.createNewVariableGroup} className={"btn-cta"}>
                            <i key={"btn-plus-icon"} className={"bowtie-icon bowtie-math-plus"}></i>
                            <span key={"btn-text"} className="text">{Resources.VariableGroupText}</span>
                        </button>
                    </div>
                    <div>
                        <div className={"lib-intro-help-text"} dangerouslySetInnerHTML={{ __html: learnMoreAboutVariableGroupsHelpText }} />
                        <span className={"bowtie-icon bowtie-navigate-external"} />
                    </div>
                </div>
            );
        } else {
            return (
                <VssDetailsList
                    items={this.state.itemsViewState[LibraryItemType.VariableGroup].data}
                    setKey="set"
                    initialFocusedIndex={0}
                    constrainMode={ConstrainMode.unconstrained}
                    columns={this.getColumns(LibraryItemType.VariableGroup)}
                    actionsColumnKey={"name"}
                    getMenuItems={this._menuItems}
                    onRenderItemColumn={this._renderItemColumn}
                    onColumnHeaderClick={this._onColumnClick.bind(this)}
                    onRowWillUnmount={Utils_Core.delegate(this, this._onRowWillUnmount)}
                    onItemInvoked={(item, index) => LibraryItemsView.libraryItemOnClick(item)} />
            );
        }
    }

    private getSecureFileHubContent(): JSX.Element {
        let libraryItems = this._store.getData(LibraryItemType.SecureFile);
        let learnMoreAboutSecureFilesHelpText = Utils_String.localeFormat(Resources.LearnMoreAboutSecureFilesHelpText, Constants.Links.SecureFileHelpLink);
        if (libraryItems == null) {
            // showing a spinner till the library items are fetched
            return (
                <div className={"lib-spinner"} role="region">
                    <Spinner type={SpinnerType.large} />
                </div>
            );
        } else if (libraryItems.length === 0) {
            return (
                <div className={"lib-intro-page"} role="region" aria-labelledby="lib-intro-page-text">
                    <div className={"lib-intro-page-icon bowtie-icon bowtie-certificate"}></div>
                    <div className={"lib-intro-page-text"}>{Resources.UploadSecureFileText}</div>
                    <div className={"lib-intro-page-help-text"} dangerouslySetInnerHTML={{ __html: Resources.UploadSecureFileHelpText }}></div>
                    <div className={"lib-intro-page-button bowtie"}>
                        <button onClick={this.uploadNewSecureFile} className={"btn-cta"}>
                            <i key={"btn-plus-icon"} className={"bowtie-icon bowtie-math-plus"}></i>
                            <span key={"btn-text"} className="text">{Resources.SecureFileText}</span>
                        </button>
                    </div>
                    <div>
                        <div className={"lib-intro-help-text"} dangerouslySetInnerHTML={{ __html: learnMoreAboutSecureFilesHelpText }} />
                        <span className={"bowtie-icon bowtie-navigate-external"} />
                    </div>
                </div>
            );
        } else {
            return (
                <VssDetailsList
                    items={this.state.itemsViewState[LibraryItemType.SecureFile].data}
                    setKey="set"
                    initialFocusedIndex={0}
                    constrainMode={ConstrainMode.unconstrained}
                    columns={this.getColumns(LibraryItemType.SecureFile)}
                    actionsColumnKey={"name"}
                    getMenuItems={this._menuItems}
                    onRenderItemColumn={this._renderItemColumn}
                    onColumnHeaderClick={this._onColumnClick.bind(this)}
                    onRowWillUnmount={Utils_Core.delegate(this, this._onRowWillUnmount)}
                    onItemInvoked={(item, index) => LibraryItemsView.libraryItemOnClick(item)} />
            );            
        }
    }

    private createNewVariableGroup = () => {
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: Constants.LibraryConstants.VariableGroupView, variableGroupId: 0 });
    }

    private uploadNewSecureFile = () => {
        Dialogs.Dialogs.showUploadSecureFileDialog();
    }

    private onStoreChange = () => {
        let state = this.getState();
        this._lastDeletedRowIndex = this._store.getLastDeletedRowIndex();
        let itemsViewState = state.itemsViewState.slice();

        let storeData = this._store.getData(state.selectedTab);
        let filteredData = storeData ? storeData.filter(i => i.name.toLowerCase().indexOf(itemsViewState[state.selectedTab].searchValue.toLowerCase()) > -1) : storeData;
        let sortedData = filteredData ? LibraryItemsView.sortItems(filteredData, "name", itemsViewState[state.selectedTab].isSortedDescending) : filteredData;
        itemsViewState[state.selectedTab].data = sortedData;

        state.itemsViewState = itemsViewState;
        this.setState(state);
    }

    private getColumns(itemType?: LibraryItemType): IColumn[] {
        let columns: IColumn[] = [];

        columns.push({
            key: "name",
            name: Resources.NameText,
            fieldName: Resources.NameText,
            minWidth: 300,
            maxWidth: 400,
            isSorted: true,
            isSortedDescending: this.state.itemsViewState[this.state.selectedTab].isSortedDescending,
            isResizable: true
        });

        columns.push({
            key: "dateModified",
            name: Resources.DateModifiedText,
            fieldName: Resources.DateModifiedText,
            minWidth: 100,
            maxWidth: 200,
            isResizable: true
        });

        columns.push({
            key: "modifiedBy",
            name: Resources.ModifiedByText,
            fieldName: Resources.ModifiedByText,
            minWidth: 100,
            maxWidth: 200,
            isResizable: true
        });

        columns.push({
            key: "description",
            name: Resources.DescriptionText,
            fieldName: Resources.DescriptionText,
            minWidth: 300,
            maxWidth: 700,
            isResizable: true
        });

        return columns;
    }
    
    private _renderItemColumn(item, index, column) {
        let fieldContent = item[column.fieldName];

        switch (column.key) {
            case 'name':
                let iconClassName = "lib-item-list-icon bowtie-icon " + item.iconClassName;
                return (
                    <div className="vg-item-name-wrapper">
                        <KeyboardAccesibleComponent className="lib-items-name" onClick={() => LibraryItemsView.libraryItemOnClick(item)}>
                            <VssIcon iconName={item.iconClassName} iconType={VssIconType.bowtie} />
                            <Tooltip.TooltipHost content={item.name} overflowMode={Tooltip.TooltipOverflowMode.Parent} hostClassName="lib-items-tooltiphost">
                                {item.name}
                            </Tooltip.TooltipHost>
                        </KeyboardAccesibleComponent>
                    </div>
                );

            case 'dateModified':
                return (
                    <div className="lib-item-list-date">{Utils_Date.friendly(item.modifiedOn)}</div>
                );

            case 'modifiedBy':
                let imageUrl = Locations.urlHelper.getMvcUrl({
                    area: "api",
                    controller: "common",
                    action: "IdentityImage",
                    queryParams: { "id": item.modifiedBy.id },
                }) ;
                
                return (
                    <div className="lib-item-modifiedby-container">
                        <img className="lib-item-modifiedby-img" src={imageUrl} alt="" />
                        <span className="lib-item-modifiedby-name">{item.modifiedBy.displayName}</span>
                    </div>
                );

            case 'description':
                return (
                    <div className="lib-item-desc">
                        <Tooltip.TooltipHost content={item.description} overflowMode={Tooltip.TooltipOverflowMode.Parent} hostClassName="lib-items-tooltiphost">
                            {item.description}
                        </Tooltip.TooltipHost>
                    </div>
                );

            default:
                return <span>{fieldContent}</span>;
        }
    }

    private _onColumnClick(event, column) {
        this.sortItemsOnClick(column.key);
    }

    private _onCommandClick = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem): void => {
        switch (item.key) {
            case this._addVGKey:
                this.createNewVariableGroup();
                break;

            case this._uploadSecureFileKey:
                this.uploadNewSecureFile();
                break;

            case this._securityKey:
                Dialogs.Dialogs.showSecurityDialog(LibraryItemType.Library);
                break;

            case this._helpKey:
                this.openLibraryItemHelpWindow();
                break;

            default:
                break;
        }
    }

    private _menuItems = (item: LibraryItem): IContextualMenuItem[] => {
        let libraryItemMenuProps = { libraryItem: item };
        return new LibraryItemMenu(libraryItemMenuProps).getMenuItems();
    }

    private static sortItems(data: LibraryItem[], sortOnElement: string, isSortedDescending: boolean): LibraryItem[] {
        let sortedItems = data.sort((a, b) => {
            let firstValue, secondValue;
            if (sortOnElement === "name") {
                firstValue = a.name.toLowerCase();
                secondValue = b.name.toLowerCase();
            }

            if (isSortedDescending) {
                return firstValue > secondValue ? -1 : 1;
            } else {
                return firstValue > secondValue ? 1 : -1;
            }
        });

        return sortedItems;
    }

    private sortItemsOnClick(sortOnElement: string): void {
        if (sortOnElement === "name") {
            let state = this.getState();
            let newSortOrder = !state.itemsViewState[state.selectedTab].isSortedDescending;
            let data = state.itemsViewState[this.state.selectedTab].data;
            let sortedItems = data ? LibraryItemsView.sortItems(data, sortOnElement, newSortOrder) : data;

            let itemsViewState = state.itemsViewState.slice();
            itemsViewState[state.selectedTab].data = sortedItems;
            itemsViewState[state.selectedTab].isSortedDescending = newSortOrder;
            state.itemsViewState = itemsViewState;

            this.setState(state);
        }
    }

    @autobind
    private _onFilterChanged(changedState: IFilterState) {
        const filter = this._hubViewState.filter;
        let filterKeywords = filter.getFilterItemValue<string>(this._nameFilterKey);
        if (filterKeywords != null && filterKeywords !== undefined) {
            this.searchLibraryItems(filterKeywords);
        }
    }

    private searchLibraryItems = (searchValue: string): void => {
        let state = this.getState();
        let data = this._store.getData(state.selectedTab);
        let filteredData = data ? data.filter(i => i.name.toLowerCase().indexOf(searchValue.toLowerCase()) > -1) : data;
        let sortedData = filteredData ? LibraryItemsView.sortItems(filteredData, "name", state.itemsViewState[state.selectedTab].isSortedDescending) : filteredData;

        let itemsViewState = state.itemsViewState.slice();
        itemsViewState[state.selectedTab].searchValue = searchValue;
        itemsViewState[state.selectedTab].data = sortedData;
        state.itemsViewState = itemsViewState;
        announce(Utils_String.localeFormat(Resources.SearchResultsMessage, itemsViewState[state.selectedTab].data.length));

        this.setState(state);
    }

    private newLibraryItemButton = (): JSX.Element => {
        if (this.state.selectedTab === LibraryItemType.VariableGroup) {
            return (
                <div className={"lib-new-button bowtie"}>
                    <button className={"btn-cta"} onClick={this.createNewVariableGroup} aria-label={Resources.NewVariableGroupButtonName}>
                        <i key={"btn-plus-icon"} className={"bowtie-icon bowtie-math-plus"}></i>
                        <span key={"btn-text"} className="text">{Resources.VariableGroupText}</span>
                    </button>
                </div>);
        } else if (this.state.selectedTab === LibraryItemType.SecureFile) {
            return (
                <div className={"lib-new-button bowtie"}>
                    <button className={"btn-cta"} onClick={this.uploadNewSecureFile} >
                        <i key={"btn-plus-icon"} className={"bowtie-icon bowtie-math-plus"}></i>
                        <span key={"btn-text"} className="text">{Resources.SecureFileText}</span>
                    </button>
                </div>);
        }
    };

    private openLibraryItemHelpWindow = () => {
        if (this.state.selectedTab === LibraryItemType.VariableGroup) {
            window.open(Constants.Links.VariableGroupHelpLink, "_blank");
        } else if (this.state.selectedTab === LibraryItemType.SecureFile) {
            window.open(Constants.Links.SecureFileHelpLink, "_blank");
        }
    }

    private updateErrorMessage = (sender: any, error: any) => {
        let state = this.state;
        let itemsViewState = state.itemsViewState.slice();
        itemsViewState[state.selectedTab].errorMessage = VSS.getErrorMessage(error);
        this.setState({ itemsViewState });
    }

    private clearErrorMessage = () => {
        let state = this.state;
        let itemsViewState = state.itemsViewState.slice();
        itemsViewState[state.selectedTab].errorMessage = "";
        this.setState({ itemsViewState });
    }

    private _store: LibraryItemsStore;
    private _eventManager: Events_Services.EventService;
    private _detailsList: HTMLElement;
    private _addVGButton: HTMLElement;
    private _isRowDeleted: boolean = false;
    private _lastDeletedRowIndex: number = -1;

    private _hubViewState: IHubViewState;
    private _hub: IHub;

    private readonly _nameFilterKey = "nameFilterKey";
    private readonly _helpKey = "helpKey";
    private readonly _securityKey = "securityKey";
    private readonly _addVGKey = "addVGKey";
    private readonly _variableGroupsKey = "variableGroupsKey";
    private readonly _secureFilesKey = "secureFilesKey";
    private readonly _uploadSecureFileKey = "uploadSecureFile";
    private readonly _libraryKey = "libraryKey";
}
