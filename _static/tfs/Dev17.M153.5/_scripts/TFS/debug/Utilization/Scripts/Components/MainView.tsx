/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />
import "VSS/LoaderPlugins/Css!Utilization/UtilizationStyles";

import React = require("react");
import ReactDOM = require("react-dom");

import { Callout } from 'OfficeFabric/Callout';
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Label } from "OfficeFabric/Label";
import { SelectionMode } from "OfficeFabric/Selection";
import { autobind, BaseComponent } from "OfficeFabric/Utilities";

import Contribution_Services = require("VSS/Contributions/Services");
import Events_Action = require("VSS/Events/Action");
import Navigation_Services = require("VSS/Navigation/Services");
import Performance = require("VSS/Performance");
import SDK_Shim = require("VSS/SDK/Shim");
import VSS_Service = require("VSS/Service");
import * as SettingsRestClient from "VSS/Settings/RestClient";
import Utils_Core = require("VSS/Utils/Core");
import Utils_Number = require("VSS/Utils/Number");
import VSS = require("VSS/VSS");
import { IdentityRef } from "VSS/WebApi/Contracts";

import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { Hub } from "VSSUI/Hub";
import { HubHeader } from "VSSUI/HubHeader";
import { PickListFilterBarItem, IPickListSelection } from "VSSUI/PickList";
import { PivotRenderingMode, IPivotRenderingModeOptions, PivotBarViewActionType, PivotBarViewActionArea } from 'VSSUI/PivotBar';
import { IFilterState, FILTER_APPLIED_EVENT } from "VSSUI/Utilities/Filter";
import { IHubViewState, HubViewState } from "VSSUI/Utilities/HubViewState";
import { IUserAction } from 'VSSUI/Utilities/IUserAction';
import { VssIconType } from "VSSUI/VssIcon";
import { VssPersona } from "VSSUI/VssPersona";

import { IdentityDetailsProvider } from "VSSPreview/Providers/IdentityDetailsProvider";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { IdentityActionCreator } from "Utilization/Scripts/Actions/IdentityActions";
import { UsageActionCreator } from "Utilization/Scripts/Actions/UsageActions";
import { ColumnFilter } from "Utilization/Scripts/Components/ColumnFilter";
import { IdentityPickerFilterBarItem } from "Utilization/Scripts/Components/IdentityPickerFilterBarItem";
import { TimeRangePickerFilterBarItem } from "Utilization/Scripts/Components/TimeRangePickerFilterBarItem";
import { TextFilterBarItem } from "Utilization/Scripts/Components/TextFilterBarItem";
import { IdentityData } from "Utilization/Scripts/Stores/IdentityStore";
import UrlState_Helper = require("Utilization/Scripts/UrlStateHelper");
import {
    PivotTabData, PivotTabDataGroupKeys, RenderUsagePivotBar, PivotRenderingModeOptions
} from "Utilization/Scripts/Components/UsagePivotBar"

import {
    IUrlState, shouldColumnOptionsBeEnabled, StatusKeys, StatusNames, TimeBinKeys, QueryDateKeys, shouldKeywordsBeEnabled,
    shouldIdentityFieldBePresent, shouldDefinitionFieldBePresent, isPipelineTab, PivotTabKey, PipelineQueryableService, isTopPipelinesTab
} from "Utilization/Scripts/UrlStateHelper";

import { UsageDataContainer } from "Utilization/Scripts/Components/UsageDataContainer";

import Resources = require("Utilization/Scripts/Resources/TFS.Resources.Utilization");

import {
    PivotBar,
    IPivotBarAction,
    IPivotBarViewAction,
    PivotBarItem
} from 'VSSUI/PivotBar';

var defaultUrlState: IUrlState;
var currentUrlState: IUrlState;
var lastUrlState: IUrlState;
var initialUrlStateValid: boolean;
var userIsPCA: boolean;
var columnPrefs: string[]; // e.g., "-user,-useragent" means hide the user and useragent columns. However, "user,useragent" means show the user and useragent columns and hide all the other columns, but be agnostic about the service column.
var queryableServices: string[];
var usingNormalizedColumns: boolean;
var userDisplayName: string;
var userQueryableServices: string[];
var isPipelinesEnabled: boolean;

export interface OptionalFilterEnabledState {
    IdentityEnabled: boolean;
    DefinitionEnabled: boolean;
    KeywordsEnabled: boolean;
}

export interface UsagePageState {
    vsidForPersonaIcon: string;
    displayNameForIdentityLabel: string;
    isColumnOptionsCalloutVisible: boolean;
    optionalFilterEnabledState: OptionalFilterEnabledState;
    disableServices: boolean;
}

// The main usage page.
export class MainView extends BaseComponent<any, UsagePageState> {

    private _urlStateChangeDelegate: IFunctionPPR<any, any, void>;

    private _hubViewState: IHubViewState;

    private _keywordsToRestoreApplied: string;
    private _keywordsToRestoreVisual: string;
    private _identitytoRestoreApplied: string;
    private _identityToRestoreVisual: string;
    private _definitionToRestoreApplied: string;
    private _definitionToRestoreVisual: string;
    private _columnOptionsButton: HTMLElement = null;
    private _pendingColumnSelection: string;

    constructor(props: any) {
        super(props);

        let defaultState: IFilterState = {
            "keywords": { value: "" },
            "services": { value: queryableServices },
            "timerange": { value: QueryDateKeys[0] + ";" + TimeBinKeys[0] },
            "status": { value: ["all"] },
            "tstus": { value: "" },
            "identity": { value: defaultUrlState.identity },
            "definition": { value: defaultUrlState.definition }
        };

        let initialState: IFilterState = {
            "keywords": { value: currentUrlState.keywords },
            "services": { value: currentUrlState.services },
            "timerange": { value: currentUrlState.queryDate + ";" + currentUrlState.timeBin },
            "status": { value: [currentUrlState.status] },
            "tstus": { value: currentUrlState.tstus === 0 ? "" : Utils_Number.toDecimalLocaleString(currentUrlState.tstus) },
            "identity": { value: currentUrlState.identity },
            "definition": { value: currentUrlState.definition }
        };

        this._hubViewState = new HubViewState({
            filterOptions: {
                useApplyMode: true,
                defaultState: defaultState,
                customValueComparers: {
                    "tstus": (item1: any, item2: any) => {
                        let num1 = item1 === "" ? 0 : Utils_Number.parseLocale(String(item1));
                        let num2 = item2 === "" ? 0 : Utils_Number.parseLocale(String(item2));
                        if (isNaN(num1) || isNaN(num2)) {
                            return true;
                        }
                        return num1 === num2;
                    }
                }
            },
            viewOptions: {
                initialState: {
                    showFilters: true
                }
            },
            defaultPivot: currentUrlState.tab
        });

        this._hubViewState.filter.setState(initialState);
        this._hubViewState.filter.applyChanges();

        this._hubViewState.filter.subscribe(this._onFilterChanged, FILTER_APPLIED_EVENT);

        this._hubViewState.selectedPivot.subscribe(() => {

            if (currentUrlState.tab !== this._hubViewState.selectedPivot.value) {
                this._updateQueryableServicesFromPivotTabChange(this._hubViewState.selectedPivot.value);
                UrlState_Helper.changeUrlStateFromPivotTab(currentUrlState, this._hubViewState.selectedPivot.value, userIsPCA, columnPrefs, queryableServices);
                this._adjustCurrentUrlStateForFilterEnabledness(false);

                this._hubViewState.filter.setState({
                    "keywords": { value: currentUrlState.keywords },
                    "services": { value: currentUrlState.services },
                    "timerange": { value: currentUrlState.queryDate + ";" + currentUrlState.timeBin },
                    "status": { value: [currentUrlState.status] },
                    "tstus": { value: currentUrlState.tstus === 0 ? "" : Utils_Number.toDecimalLocaleString(currentUrlState.tstus) },
                    "identity": { value: currentUrlState.identity },
                    "definition": { value: currentUrlState.definition }
                });

                this._hubViewState.filter.applyChanges();

                this._executeQuery();
            }
        });

        let displayNameForIdentityLabel: string;
        if (defaultUrlState.identity === currentUrlState.identity) {
            displayNameForIdentityLabel = userDisplayName;
        }
        else {
            displayNameForIdentityLabel = currentUrlState.identity; // temporary VSID
            IdentityActionCreator.getIdentityDisplayName(currentUrlState.identity);
        }

        this.state = {
            vsidForPersonaIcon: currentUrlState.identity,
            displayNameForIdentityLabel: displayNameForIdentityLabel,
            isColumnOptionsCalloutVisible: false,
            optionalFilterEnabledState: {
                KeywordsEnabled: shouldKeywordsBeEnabled(currentUrlState),
                IdentityEnabled: shouldIdentityFieldBePresent(currentUrlState),
                DefinitionEnabled: shouldDefinitionFieldBePresent(currentUrlState)
            },
            disableServices: isTopPipelinesTab(currentUrlState.tab)
        };

        this._keywordsToRestoreApplied = "";
        this._keywordsToRestoreVisual = "";
        this._identitytoRestoreApplied = "";
        this._identityToRestoreVisual = "";
        this._definitionToRestoreApplied = "";
        this._definitionToRestoreVisual = "";

        this._urlStateChangeDelegate = Utils_Core.delegate(this, this._onUrlStateChange);
    }

    private _updateQueryableServicesFromPivotTabChange(tab: string) {
        if (isPipelineTab(tab)) {
            queryableServices = UrlState_Helper.PipelineQueryableServices;

        } else {
            queryableServices = userQueryableServices;
        }
    }

    @autobind
    private _onColumnOptionsClick(ev?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, action?: IUserAction) {
        if (this.state.isColumnOptionsCalloutVisible) {
            this._onDismissColumnOptions();
        }
        else {
            this._columnOptionsButton = ev.currentTarget;
            this.setState({ isColumnOptionsCalloutVisible: true });
        }
    }

    @autobind
    private _onDismissColumnOptions() {
        this._columnOptionsButton = null;
        this.setState({ isColumnOptionsCalloutVisible: false });

        if (this._pendingColumnSelection !== currentUrlState.columns) {
            currentUrlState.columns = this._pendingColumnSelection;
            this._adjustCurrentUrlStateForFilterEnabledness(true);
            this.executeQuery(); // this may be redundant with applyChanges() above, but it shouldn't hurt
            if (shouldColumnOptionsBeEnabled(currentUrlState)) {
                let newColumnPrefs: string[] = UrlState_Helper.formColumnPrefs(currentUrlState.columns.split(","), userIsPCA, queryableServices);
                let newColumnPrefsConcatenated = newColumnPrefs.join(",");
                if (newColumnPrefsConcatenated !== columnPrefs.join(",")) {
                    const settingEntries: IDictionaryStringTo<any> = {};
                    settingEntries["UsagePage/Columns"] = newColumnPrefsConcatenated;
                    const settingsClient = VSS_Service.getClient(SettingsRestClient.SettingsHttpClient);
                    settingsClient.setEntries(settingEntries, "me"); // fire and forget
                    columnPrefs = newColumnPrefs;
                }
            }
        }
    }

    @autobind
    private _onCommandClick(ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem): void {
        switch (item.key) {
            case "refresh":
                UsageActionCreator.loadView(currentUrlState);
                break;

            case "export":
                UsageActionCreator.initiateExport(currentUrlState);
                break;

            case "help":
                Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                    url: 'http://go.microsoft.com/fwlink/?LinkId=823950',
                    target: "_blank"
                });
                break;
        }
    }

    @autobind
    private _onFilterChanged(changedState: IFilterState) {

        if (changedState["keywords"] != null) {
            currentUrlState.keywords = changedState["keywords"].value;
        }

        if (changedState["services"] != null) {
            currentUrlState.services = changedState["services"].value;
        }

        if (changedState["timerange"] != null) {
            var timeRangeSplits = changedState["timerange"].value.split(";", 2);
            currentUrlState.queryDate = timeRangeSplits[0];
            currentUrlState.timeBin = timeRangeSplits[1];
        }

        if (changedState["status"] != null) {
            currentUrlState.status = changedState["status"].value[0];
        }

        if (changedState["tstus"] != null) {
            let tstus = Utils_Number.parseLocale(String(changedState["tstus"].value));
            currentUrlState.tstus = isNaN(tstus) ? 0 : tstus; // the isNaN check is just in case. We should have already validated the legality before allowing the filter to change state.
        }

        if (changedState["identity"] != null) {
            let newIdentity: string = changedState["identity"].value;
            if (!userIsPCA) {
                if (currentUrlState.identity !== newIdentity) {
                    if (newIdentity === defaultUrlState.identity) {
                        // avoid a round-trip call, we already have the user's display name
                        this.setState({ vsidForPersonaIcon: newIdentity, displayNameForIdentityLabel: userDisplayName });
                    } else {
                        IdentityActionCreator.getIdentityDisplayName(newIdentity);
                    }
                }
            }

            currentUrlState.identity = newIdentity;
        }

        if (changedState["definition"] != null) {
            currentUrlState.definition = changedState["definition"].value;
        }

        this._executeQuery();
    }

    public render(): JSX.Element {
        return <Hub

            className="utilization-usagesummary-view absolute-fill"
            hideFullScreenToggle={true}
            hubViewState={this._hubViewState}
            pivotRenderingModeOptions={PivotRenderingModeOptions}
            commands={[
                { key: "refresh", name: Resources.UsageMainPage_Refresh, important: true, iconProps: { iconName: "Refresh", iconType: VssIconType.fabric }, onClick: this._onCommandClick },
                { key: "export", name: Resources.UsageMainPage_Export, important: true, iconProps: { iconName: "Save", iconType: VssIconType.fabric }, onClick: this._onCommandClick },
                { key: "help", name: Resources.UsageMainPage_Help, important: true, iconProps: { iconName: "Help", iconType: VssIconType.fabric }, onClick: this._onCommandClick },
            ]}
            viewActions={[
                { key: "columnOptions", name: Resources.ColumnFilter_Columns, actionType: PivotBarViewActionType.Command, iconProps: { iconName: "Repair", iconType: VssIconType.fabric }, important: true, onClick: this._onColumnOptionsClick, viewActionRenderArea: PivotBarViewActionArea.beforeViewOptions },
            ]}
        >
            <HubHeader title={Resources.UsageTitleBarText} />
            {RenderUsagePivotBar(userIsPCA, usingNormalizedColumns, isPipelinesEnabled)}
            {this.state.isColumnOptionsCalloutVisible ?
                <Callout
                    gapSpace={0}
                    onDismiss={this._onDismissColumnOptions}
                    target={this._columnOptionsButton}
                    role="menu"
                    setInitialFocus={true}>
                    <ColumnFilter
                        initialUrlState={currentUrlState}
                        userColumnEnabled={userIsPCA}
                        serviceColumnEnabled={queryableServices.length > 1}
                        onPendingColumnSelectionChanged={(concatenatedColumns: string) => {
                            this._pendingColumnSelection = concatenatedColumns;
                        }}
                    />
                </Callout>
                : null
            }
            {this._renderFilterBar()}
        </Hub>;
    }

    private _renderProjectDefinitionFilter(): JSX.Element {
        let filter: JSX.Element;
        if (this.state.optionalFilterEnabledState.DefinitionEnabled) {

            filter = <TextFilterBarItem filterItemKey="definition"
                placeholder={"Project/Definition"}
                throttleWait={0}
            />
        }
        return filter;
    }


    private _renderFilterBarIdentityField(): JSX.Element {
        let identityElement: JSX.Element;

        if (this.state.optionalFilterEnabledState.IdentityEnabled) {
            const consumerId = "F1832F33-A2F0-4804-AFF8-B9423417BE96";

            if (userIsPCA) {
                identityElement = <IdentityPickerFilterBarItem filterItemKey="identity"
                    consumerId={consumerId} />;
            } else {
                let identityRef: IdentityRef = {
                    id: this.state.vsidForPersonaIcon,
                    displayName: this.state.displayNameForIdentityLabel
                } as IdentityRef;
                identityElement = <div className="identity-field-readonly">
                    <div className="persona-wrapper">
                        <VssPersona
                            size="small"
                            identityDetailsProvider={new IdentityDetailsProvider(identityRef, consumerId)}
                        />
                    </div>
                    <Label>{this.state.displayNameForIdentityLabel}</Label>
                </div>;
            }
        }
        return identityElement;

    }

    private _renderFilterBar(): JSX.Element {
        return <FilterBar>
            {this.state.optionalFilterEnabledState.KeywordsEnabled ?
                <KeywordFilterBarItem filterItemKey="keywords"
                    throttleWait={0} /> :
                (null)}

            {queryableServices.length > 1 ?
                <PickListFilterBarItem filterItemKey="services"
                    placeholder={Resources.FilterContainer_Services}
                    selectionMode={SelectionMode.multiple}
                    getListItem={(item: string) => {
                        return {
                            name: item,
                            key: item,
                        }
                    }}
                    getPickListItems={() => { return queryableServices; }}
                    disabled={this.state.disableServices}
                /> :
                (null)}

            <TimeRangePickerFilterBarItem filterItemKey="timerange" />

            <PickListFilterBarItem filterItemKey="status"
                selectionMode={SelectionMode.single}
                hideClearButton={true}
                getListItem={(item: string) => {
                    return {
                        name: StatusNames[item],
                        key: item,
                    }
                }}
                getPickListItems={() => { return StatusKeys; }}
            />

            <TextFilterBarItem filterItemKey="tstus"
                placeholder={Resources.FilterContainer_UsageTSTUs}
                throttleWait={0}
                onGetErrorMessage={(value: string) => {
                    return (!!value && isNaN(Utils_Number.parseLocale(value))) ? Resources.TextFieldContainer_Invalid : "";
                }}
            />

            {this._renderFilterBarIdentityField()}
            {this._renderProjectDefinitionFilter()}


        </FilterBar>

    }

    public componentDidMount(): void {
        // Attach to URL changes (triggered by pivot view changes)
        Navigation_Services.getHistoryService().attachNavigate(this._urlStateChangeDelegate);
        IdentityData.addChangedListener(this._onIdentityDisplayNameChange);

        if (!initialUrlStateValid) {
            // This will trigger _onUrlStateChange
            Navigation_Services.getHistoryService().addHistoryPoint(undefined, currentUrlState, undefined, false);
        } else {
            // Url state not changed, trigger manually
            this._onUrlStateChange();
        }
    }

    public componentWillUnmount(): void {
        IdentityData.removeChangedListener(this._onIdentityDisplayNameChange);
        Navigation_Services.getHistoryService().detachNavigate(this._urlStateChangeDelegate);
    }

    private _adjustCurrentUrlStateForFilterEnabledness(applyFilterChangesNow: boolean) {
        let identityEnabled = shouldIdentityFieldBePresent(currentUrlState);
        let definitionEnabled = shouldDefinitionFieldBePresent(currentUrlState);
        let keywordsEnabled = shouldKeywordsBeEnabled(currentUrlState);

        if (this.state.optionalFilterEnabledState.KeywordsEnabled !== keywordsEnabled || this.state.optionalFilterEnabledState.IdentityEnabled !== identityEnabled ||
            this.state.optionalFilterEnabledState.DefinitionEnabled !== definitionEnabled || this.state.disableServices !== isTopPipelinesTab(currentUrlState.tab)) {
            if (this.state.optionalFilterEnabledState.KeywordsEnabled !== keywordsEnabled) {
                if (keywordsEnabled) {
                    currentUrlState.keywords = this._keywordsToRestoreApplied;
                }
                else {
                    this._keywordsToRestoreApplied = currentUrlState.keywords;
                    this._keywordsToRestoreVisual = String(this._hubViewState.filter.getFilterItemState("keywords").value);
                    currentUrlState.keywords = "";
                }
                if (applyFilterChangesNow) {
                    let visualKeywordsToRestore: string = (keywordsEnabled ? this._keywordsToRestoreVisual : "");
                    this._hubViewState.filter.setFilterItemState("keywords", { value: visualKeywordsToRestore });
                }
            }
            if (this.state.optionalFilterEnabledState.IdentityEnabled !== identityEnabled) {
                if (identityEnabled) {
                    currentUrlState.identity = this._identitytoRestoreApplied;
                }
                else {
                    this._identitytoRestoreApplied = currentUrlState.identity;
                    this._identityToRestoreVisual = String(this._hubViewState.filter.getFilterItemState("identity").value);
                    currentUrlState.identity = "";
                }
                if (applyFilterChangesNow) {
                    let visualIdentityToRestore: string = (identityEnabled ? this._identityToRestoreVisual : "");
                    this._hubViewState.filter.setFilterItemState("identity", { value: visualIdentityToRestore });
                }
            }

            if (this.state.optionalFilterEnabledState.DefinitionEnabled !== definitionEnabled) {
                if (definitionEnabled) {
                    currentUrlState.definition = this._definitionToRestoreApplied;
                }
                else {
                    this._definitionToRestoreApplied = currentUrlState.definition;
                    this._definitionToRestoreVisual = String(this._hubViewState.filter.getFilterItemState("definition").value);
                    currentUrlState.definition = "";
                }

                if (applyFilterChangesNow) {
                    let visualDefinitionToRestore: string = (definitionEnabled ? this._definitionToRestoreVisual : "");
                    this._hubViewState.filter.setFilterItemState("definition", { value: visualDefinitionToRestore });
                }
            }

            if (applyFilterChangesNow) {
                this._hubViewState.filter.applyChanges();
            }
            this.setState({
                optionalFilterEnabledState: {
                    KeywordsEnabled: keywordsEnabled,
                    IdentityEnabled: identityEnabled,
                    DefinitionEnabled: definitionEnabled
                },
                disableServices: isTopPipelinesTab(currentUrlState.tab)
            } as UsagePageState);
        }
    }

    private _executeQuery() {
        this.executeQuery();
    }

    public executeQuery() {
        if (!UrlState_Helper.memberwiseEquals(lastUrlState, currentUrlState)) {
            Navigation_Services.getHistoryService().addHistoryPoint(undefined, currentUrlState, undefined, false);
            lastUrlState = UrlState_Helper.clone(currentUrlState);
        }
    }

    protected _onUrlStateChange(): void {
        let urlState = UrlState_Helper.readCurrentState(userIsPCA, columnPrefs, userQueryableServices, UrlState_Helper.PipelineQueryableServices);
        UsageActionCreator.loadView(urlState);
    }

    @autobind
    private _onIdentityDisplayNameChange(): void {
        this.setState({ displayNameForIdentityLabel: IdentityData.getIdentity().displayName });
    }
}


SDK_Shim.registerContent("mainView.initialize", (context) => {
    Performance.getScenarioManager().startScenarioFromNavigation("Utilization", "utilization.mainView.start");

    let contributionService: Contribution_Services.WebPageDataService = VSS_Service.getService(Contribution_Services.WebPageDataService);
    let pageData = contributionService.getPageData<any>("ms.vss-tfs-web.utilization-usagesummary-hub-data-provider");
    if (pageData) {
        userIsPCA = pageData["HasPCAPermissions"];
        columnPrefs = pageData["UsagePageColumns"] ? pageData["UsagePageColumns"].split(",") : [];
        queryableServices = pageData["QueryableServices"].split(",");
        usingNormalizedColumns = pageData["UsingNormalizedColumns"];
        isPipelinesEnabled = pageData["IsPipelinesEnabled"];
    }

    if (usingNormalizedColumns) {
        UrlState_Helper.setUsingNormalizedColumns();
    }

    // If the pagedata does not contain the queryable services, then get the default services
    if (!queryableServices) {
        queryableServices = UrlState_Helper.getDefaultQueryableServicesForUser();
    }

    userQueryableServices = queryableServices;
    columnPrefs = UrlState_Helper.updateOldColumnPrefsToNewFormat(columnPrefs);

    let initialValidation: UrlState_Helper.IUrlStateValidation = { valid: false };
    defaultUrlState = UrlState_Helper.getDefaultState(userIsPCA, queryableServices);
    currentUrlState = UrlState_Helper.readCurrentState(userIsPCA, columnPrefs, queryableServices, UrlState_Helper.PipelineQueryableServices, initialValidation);
    lastUrlState = UrlState_Helper.clone(currentUrlState);

    if (isPipelineTab(currentUrlState.tab)) {
        queryableServices = UrlState_Helper.PipelineQueryableServices;
    }

    userDisplayName = TfsContext.tryGetDefaultContext().contextData.user.name;
    initialUrlStateValid = initialValidation.valid;

    ReactDOM.render(
        <MainView />,
        context.$container[0]);

    // Make sure global progress indicator is registered
    VSS.globalProgressIndicator.registerProgressElement($(".pageProgressIndicator"));

    Performance.getScenarioManager().endScenario("Utilization", "utilization.mainView.start");
});

