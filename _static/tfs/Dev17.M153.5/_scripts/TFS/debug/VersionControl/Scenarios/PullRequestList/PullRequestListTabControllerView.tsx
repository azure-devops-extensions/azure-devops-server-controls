import "VSS/LoaderPlugins/Css!VersionControl/PullRequestListTabControllerView";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { PullRequestListActionCreator } from "VersionControl/Scenarios/PullRequestList/Actions/PullRequestListActionCreator";
import * as SectionStateStore from "VersionControl/Scenarios/PullRequestList/Stores/SectionStateStore";
import { PullRequestListStatus, PullRequestListState, DefaultListState } from "VersionControl/Scenarios/PullRequestList/Stores/PullRequestListStore";
import { PullRequestFilterSearchCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListFilter";
import { PullRequestListCollapsibleTab } from "VersionControl/Scenarios/PullRequestList/PullRequestListCollapsibleTab";
import {
    PullRequestSummaryDetails,
    PullRequestUpdatesInfo, PullRequestListSectionInfo,
    PullRequestListSection,
} from "VersionControl/Scenarios/PullRequestList/PullRequestListDataModel";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";
import { StoresHub } from "VersionControl/Scenarios/PullRequestList/Stores/StoresHub";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { CustomizeSectionPanel, CUSTOM_MAX_PEOPLE } from "VersionControl/Scenarios/PullRequestList/CustomizeSectionPanel";
import { PullRequestListQueryCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListQueryCriteria";
import { PullRequestListPermissions } from "VersionControl/Scenarios/PullRequestList/Stores/PullRequestListPermissionsStore";
import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";
import { Link } from "OfficeFabric/Link";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

// utils
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";
import * as VSS_Common_Contracts from "VSS/WebApi/Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Performance from "VSS/Performance";

// react components
import { autobind, getRTLSafeKeyCode, KeyCodes } from "OfficeFabric/Utilities";
import { CommandButton, ActionButton } from "OfficeFabric/Button";
import * as List from "OfficeFabric/List";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { HubSpinner, Alignment } from "MyExperiences/Scenarios/Shared/Components/HubSpinner";
import { ListZeroDataContainer } from "VersionControl/Scenarios/PullRequestList/ListZeroData";
import { PullRequestRow } from "VersionControl/Scenarios/PullRequestList/PullRequestRow";

const SpinnerDelay = 300;

export interface PullRequestListTabControllerViewProps {
    tabId: string;
    storesHub: StoresHub;
    actionCreator: PullRequestListActionCreator;
    tfsContext: TfsContext;
    scenario?: Performance.IScenarioDescriptor;
    isMyAccountPage: boolean;
    collapsible?: boolean;
    showRepositoryDetails: boolean;
}

export interface PullRequestListTabState {
    isDefaultTab: boolean;
    isLoading: boolean;
    sections: PullRequestListSection[];
    showLabels: boolean;
    teamMembership: string[];
    permissions: PullRequestListPermissions;
}

export class PullRequestListTabControllerView extends React.Component<PullRequestListTabControllerViewProps, PullRequestListTabState> {
    constructor(props: PullRequestListTabProps) {
        super(props);
        this.state = this._getStateFromStores();
    }

    public componentDidMount() {
        this.props.storesHub.tabsInfoStore.addChangedListener(this._onChange);
        this.props.storesHub.pullRequestListStore.addChangedListener(this._onChange);
        this.props.storesHub.updatesStore.addChangedListener(this._onChange);
        this.props.storesHub.reviewersStore.addChangedListener(this._onChange);
        this.props.storesHub.permissionsStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this.props.storesHub.tabsInfoStore.removeChangedListener(this._onChange);
        this.props.storesHub.pullRequestListStore.removeChangedListener(this._onChange);
        this.props.storesHub.updatesStore.removeChangedListener(this._onChange);
        this.props.storesHub.reviewersStore.removeChangedListener(this._onChange);
        this.props.storesHub.permissionsStore.removeChangedListener(this._onChange);
    }

    public componentWillUpdate(nextProps: PullRequestListTabControllerViewProps, nextState: PullRequestListTabState) {
        // Check whether or not we saw a change in the list state (from loading => complete or vice versa)
        // and if there was, announce it
        if (this.state.isLoading !== nextState.isLoading) {
            Utils_Accessibility.announce(buildStatusAnnouncementText(nextState.isLoading, nextState.sections));
        }
    }

    private _onChange = (): void => {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): PullRequestListTabState {
        const tabSections = this.props.storesHub.tabsInfoStore.getSections(this.props.tabId);
        const isDefaultTab = this.props.storesHub.tabsInfoStore.isDefaultTab(this.props.tabId);
        const listState = this.props.storesHub.pullRequestListStore.getStoreState();
        const updatesState = this.props.storesHub.updatesStore.getStoreState();
        const reviewersState = this.props.storesHub.reviewersStore.getStoreState();
        const showLabelState = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsLabels);
        const teamMembership = this.props.storesHub.pullRequestListStore.getTeamMembership();
        const permissions = this.props.storesHub.permissionsStore.getPermissions();

        const customizeableSection = tabSections.filter(s => s.customizeable)[0];
        if (customizeableSection) {
            const customCriteria = this.props.storesHub.pullRequestListStore.customCriteria();
            if (customCriteria) {
                customizeableSection.criteria = customCriteria;
            }
        }

        return toPullRequestListTabState(tabSections, isDefaultTab, listState, updatesState, reviewersState, showLabelState, permissions, teamMembership);
    }

    public render(): JSX.Element {
        return <PullRequestListTab
            {...this.props}
            sections={this.state.sections}
            showLabels={this.state.showLabels}
            teamMembership={this.state.teamMembership}
            isDefaultTab={this.state.isDefaultTab} />;
    }
}

export function buildStatusAnnouncementText(isLoading: boolean, sections: PullRequestListSection[]): string {
    if (isLoading) {
        return VCResources.PullRequest_FilterAnnouncement_Fetching;
    }

    let statusText = null;
    let visibleSections = 0;
    let visibleResults = 0;
    let moreResultsText = "";

    for (const section of sections) {
        if (section.hasMore) {
            moreResultsText = VCResources.PullRequest_FilterAnnouncement_MorePrefix;
        }

        if (section.items.length > 0) {
            visibleSections++;
            visibleResults += section.items.length;
        }
    }

    const resultsText = visibleResults === 1
        ? VCResources.PullRequest_FilterAnnouncement_ResultsSingular
        : VCResources.PullRequest_FilterAnnouncement_ResultsPlural;
    const sectionsText = visibleSections > 1
        ? Utils_String.format(VCResources.PullRequest_FilterAnnouncement_MultipleSections, visibleSections)
        : "";
    statusText = Utils_String.format(resultsText, moreResultsText, visibleResults, sectionsText);

    return statusText;
}

export function toPullRequestListTabState(
    tabSections: PullRequestListSectionInfo[],
    isDefaultTab: boolean,
    listStates: IDictionaryStringTo<PullRequestListState>,
    updatesStates: IDictionaryNumberTo<PullRequestUpdatesInfo>,
    reviewersStates: IDictionaryNumberTo<ReviewerItem[]>,
    showLabels: boolean,
    permissions: PullRequestListPermissions,
    teamMembership?: string[]): PullRequestListTabState {

    let isLoading = false;
    const sections: PullRequestListSection[] = tabSections.map(section => {
        // if data loading in progress don't bother to render stale items
        const listState = listStates[section.criteria.key] || DefaultListState;
        isLoading = isLoading || (listState.status !== PullRequestListStatus.Loaded);
        if (listState.status === PullRequestListStatus.Updating) {
            return { items: [], hasMore: false, status: PullRequestListStatus.Updating, sectionInfo: section, initialLoad: listState.initialLoad };
        }
        // otherwise data can be already loaded so render what is in the store
        return toPullRequestListSection(section, listState, updatesStates, reviewersStates);
    });
    return { isLoading, sections, showLabels, teamMembership, permissions, isDefaultTab };
}

function toPullRequestListSection(section: PullRequestListSectionInfo,
    listState: PullRequestListState,
    updatesStates: IDictionaryNumberTo<PullRequestUpdatesInfo>,
    reviewersStates: IDictionaryNumberTo<ReviewerItem[]>): PullRequestListSection {

    let items: PullRequestSummaryDetails[] = [];
    if (listState.items !== null) {
        items = listState.items.map(primaryInfo => new PullRequestSummaryDetails(primaryInfo,
            updatesStates[primaryInfo.gitPullRequest.pullRequestId],
            reviewersStates[primaryInfo.gitPullRequest.pullRequestId] || null));
    }

    return {
        items: items,
        hasMore: listState.hasMore,
        status: listState.status,
        initialLoad: listState.initialLoad,
        sectionInfo: section,
    };
}

export interface PullRequestListTabProps extends PullRequestListTabControllerViewProps {
    sections: PullRequestListSection[];
    showRepositoryDetails: boolean;
    showLabels?: boolean;
    teamMembership?: string[];
    isDefaultTab: boolean;
}

export class PullRequestListTab extends React.Component<PullRequestListTabProps, {}> {
    private _loadedChildrenMap: IDictionaryStringTo<number> = {};

    public componentWillUpdate() {
        // tab will rerender, null counters
        delete this._loadedChildrenMap;
        this._loadedChildrenMap = {};
    }

    public onChildLoaded = (key: string, itemsCount: number, markAsLoaded: boolean = false): void => {
        this._loadedChildrenMap[key] = itemsCount;
        const childrenCount = Object.keys(this._loadedChildrenMap).length;
        const allSectionsLoaded = this.props.sections.length > 0 && childrenCount === this.props.sections.length;
        this._addTelemetry(childrenCount, allSectionsLoaded || markAsLoaded);
    }

    public componentDidUpdate() {
        /** measure performance in case of zero data */
        if (this._isZeroData()) {
            this._addTelemetry(1, true);
        }
    }

    private _addTelemetry(childrenCount: number, endScenario: boolean) {
        // measure performance if scenario provided and active
        if (this.props.scenario && this.props.scenario.isActive()) {
            this.props.scenario.addSplitTiming(`PullRequestList-${childrenCount}-loaded`);

            if (endScenario) {
                this.props.scenario.addSplitTiming('PullRequestListTab-loaded');
                this.props.scenario.end();
            }
        }
    }

    private _isZeroData(): boolean {
        return this.props.sections.length > 0
            && this.props.sections.every(section => section.status === PullRequestListStatus.Loaded && section.items.length === 0);
    }

    private _getCustomSection(): PullRequestListSection {
        return this.props.sections.filter(s => s.sectionInfo.customizeable)[0];
    }

    public render(): JSX.Element {
        return <div className="pullRequest-list-tab flex flex-column" >
            {this._isZeroData() ?
                <ListZeroDataContainer
                    tfsContext={this.props.tfsContext}
                    actionCreator={this.props.actionCreator}
                    storesHub={this.props.storesHub}
                    isMyAccountPage={this.props.isMyAccountPage}
                    customSection={this._getCustomSection()}
                />
                : this.props.collapsible ?
                    <PullRequestListCollapsibleTab
                        sections={this.props.sections}
                        actionCreator={this.props.actionCreator}
                        sectionStoreState={this.props.storesHub.sectionStateStore.state}
                        listStoreState={this.props.storesHub.pullRequestListStore.getStoreState()}
                        tfsContext={this.props.tfsContext}
                        dataLoaded={this.onChildLoaded}
                        showRepositoryDetails={this.props.showRepositoryDetails}
                        isDefaultTab={this.props.isDefaultTab}
                        showLabels={this.props.showLabels} />
                    :
                    <Sections
                        sections={this.props.sections}
                        actionCreator={this.props.actionCreator}
                        sectionStoreState={this.props.storesHub.sectionStateStore.state}
                        listStoreState={this.props.storesHub.pullRequestListStore.getStoreState()}
                        tfsContext={this.props.tfsContext}
                        dataLoaded={this.onChildLoaded}
                        showRepositoryDetails={this.props.showRepositoryDetails}
                        isDefaultTab={this.props.isDefaultTab}
                        showLabels={this.props.showLabels}
                        teamMembership={this.props.teamMembership} />
            }
        </div>;
    }
}

interface SectionsProps {
    sections: PullRequestListSection[];
    sectionStoreState: SectionStateStore.StoreState;
    listStoreState: IDictionaryStringTo<PullRequestListState>;
    actionCreator: PullRequestListActionCreator;
    tfsContext: TfsContext;
    dataLoaded(key: string, count: number): void;
    showRepositoryDetails: boolean;
    isDefaultTab: boolean;
    showLabels?: boolean;
    teamMembership?: string[];
}

class Sections extends React.Component<SectionsProps, {}> {
    public render(): JSX.Element {
        const loadMoreSection = this.props.sectionStoreState.latestLoadMoreRequestSection;
        return <div>
            {this.props.sections.map(section =>
                <PullRequestsListSection {...this.getSectionProps(section, loadMoreSection)}
                    key={section.sectionInfo.criteria.key} />)
            }
        </div>;
    }

    public getSectionProps(section: PullRequestListSection, loadMoreSection: string): PullRequestListSectionProps {
        const setFocus = loadMoreSection === section.sectionInfo.criteria.key
            && section.status === PullRequestListStatus.Loaded;
        const listState = this.props.listStoreState[section.sectionInfo.criteria.key] || DefaultListState;

        return {
            section: section,
            actionCreator: this.props.actionCreator,
            tfsContext: this.props.tfsContext,
            dataLoaded: this.props.dataLoaded,
            setFocus: setFocus,
            lastPageFocusIndex: setFocus ? listState.lastPageStartIndex : -1,
            showRepositoryDetails: this.props.showRepositoryDetails,
            isDefaultTab: this.props.isDefaultTab,
            showLabels: this.props.showLabels,
            teamMembership: this.props.teamMembership,
        };
    }
}

export interface PullRequestListSectionProps {
    actionCreator: PullRequestListActionCreator;
    section: PullRequestListSection;
    tfsContext: TfsContext;
    dataLoaded(key: string, count: number): void;
    setFocus: boolean;
    lastPageFocusIndex?: number;
    showRepositoryDetails: boolean;
    showLabels: boolean;
    isDefaultTab: boolean;
    teamMembership?: string[];
}

export interface PullRequestListSectionState {
    customizing?: boolean; // whether the customize panel is open or not
    customizeCriteria?: PullRequestListQueryCriteria; // the current customization criteria before editing
    withDefaults?: boolean; // whether we are populating the dialog from the getting started experience or not
    customizeTelemetryEntyPoint?: string
}

export class PullRequestsListSection extends React.Component<PullRequestListSectionProps, PullRequestListSectionState> {
    constructor(props: PullRequestListSectionProps) {
        super(props);

        this.state = {
            customizing: false,
            customizeCriteria: null,
        };
    }

    public componentDidUpdate() {
        if (this.props.section.status === PullRequestListStatus.Loaded) {
            this.props.dataLoaded(this.props.section.sectionInfo.criteria.key, this.props.section.items.length);
        }
    }

    public render(): JSX.Element {
        if (this.props.section.status === PullRequestListStatus.Loaded && this.props.section.items.length === 0 && !this.props.section.sectionInfo.customizeable) {
            return null;
        }

        const isCustomSection = this.props.section.sectionInfo.customizeable;
        const showEmptyCustomArea = isCustomSection && this.props.section.items.length === 0 && this.props.section.status === PullRequestListStatus.Loaded;
        const showTooManyPeopleError = isCustomSection && ((this.props.section.sectionInfo.criteria.customSectionAuthorIds || []).length > CUSTOM_MAX_PEOPLE || 
                                                           (this.props.section.sectionInfo.criteria.customSectionReviewerIds || []).length > CUSTOM_MAX_PEOPLE);

        const title = this.props.section.sectionInfo.criteria.criteriaTitle;

        return <div className={"vc-pullRequest-list-section " + this.props.section.sectionInfo.cssClass} role="region" aria-label={title}>
                    <h2 className="vc-pullrequests-list-head">
                        {title}
                        {
                            this.props.section.sectionInfo.customizeable &&
                            <ActionButton
                                className={"vc-pullRequest-list-customizeButton"}
                                iconProps={{className: "bowtie-icon bowtie-settings-wrench"}}
                                onClick={this._onCustomizeRecustomize}>
                                    {VCResources.PullRequestListCustomSectionConfigureTitle}
                            </ActionButton>
                        }
                    </h2>
                    {showTooManyPeopleError && this._tooManyPeopleError()}
                    {this._mainSectionContent()}
                    {showEmptyCustomArea && this._emptyCustomArea()}
                    {
                        this.state.customizing &&
                        <CustomizeSectionPanel
                            sectionId={this.props.section.sectionInfo.id}
                            sectionCriteria={this.state.customizeCriteria}
                            onUpdateSectionCriteria={this.props.actionCreator.updateSectionCriteria}
                            onDismiss={this._closeCustomize}
                            withDefaults={this.state.withDefaults}
                            telemetryEntryPoint={this.state.customizeTelemetryEntyPoint}
                        />
                    }
            </div>;
    }

    private _mainSectionContent(): JSX.Element {
        return (
            <div>
                {this.props.section.status === PullRequestListStatus.Updating &&
                    <div className="loading-spinner-container">
                        <HubSpinner alignment={Alignment.center} labelText={VCResources.FetchingResultsText} delay={SpinnerDelay} />
                    </div>}
                <FocusZone className="vc-pullRequest-list-section-list"
                    direction={FocusZoneDirection.vertical}
                    isInnerZoneKeystroke={this._isInnerZoneKeyStroke}>
                    <List.List items={this.props.section.items} onRenderCell={this._onRenderCell} />
                </FocusZone>
                {/* The rest api doesn't understand the custom section currently and so this can't show more yet */}
                {!this.props.section.sectionInfo.customizeable && <ShowMore hasMore={this.props.section.hasMore} loadMore={this.loadMore} status={this.props.section.status} />}
                {this.props.section.sectionInfo.customizeable && this.props.section.hasMore &&
                    <div className={"vc-pullrequest-cantshowmore"}>{VCResources.PullRequestListCustomSectionTooManyPrs}</div>}
            </div>);
    }

    private _tooManyPeopleError(): JSX.Element {
        return <FormattedComponent className={"vc-pullRequest-list-tooManyPeople"} format={VCResources.PullRequestListTooManyPeople}>
                    <Link onClick={this._onCustomizeTooManyPeople}>{VCResources.PullRequestListTooManyPeopleLink}</Link>
               </FormattedComponent>;
    }

    private _emptyCustomArea(): JSX.Element {
        return <div className="vc-pullRequest-list-emptyCustomArea">{VCResources.PullRequestListCustomSectionEmpty}</div>;
    }

    @autobind
    public loadMore() {
        this.props.actionCreator.queryPullRequests(this.props.section.sectionInfo.criteria, true);
    }

    @autobind
    private _isInnerZoneKeyStroke(ev: React.KeyboardEvent<HTMLElement>) {
        return ev.which === getRTLSafeKeyCode(KeyCodes.right);
    }

    @autobind
    protected _onRenderCell(item?: any, index?: number): JSX.Element {
        return <PullRequestRow
            item={item}
            onLinkNavigation={this._onLinkNavigation}
            cidata={{telemetryGroupName: this.props.section.sectionInfo.criteria.telemetryGroupName}}
            tfsContext={this.props.tfsContext}
            hasInitialFocus={this.props.setFocus && !!index && this.props.lastPageFocusIndex === index}
            showRepositoryDetails={this.props.showRepositoryDetails}
            showLabels={this.props.showLabels}
            highlightNewUpdates={this.props.isDefaultTab} />;
    }

    @autobind
    private _onLinkNavigation(cidata: IDictionaryStringTo<any>) {
        this.props.actionCreator.onLinkNavigation(cidata);
    }

    @autobind
    private _onCustomize(customizeTelemetryEntyPoint: string): void {
        this.setState({
            customizing: true,
            customizeCriteria: this.props.section.sectionInfo.criteria,
            withDefaults: false,
            customizeTelemetryEntyPoint
        });
    }

    @autobind
    private _onCustomizeRecustomize(): void {
        this._onCustomize("re-customize");
    }

    @autobind
    private _onCustomizeTooManyPeople(): void {
        this._onCustomize("too-many-people");
    }

    @autobind
    private _onCustomizeWithDefaults(defaults: PullRequestListQueryCriteria, telemetryEntryPoint: string): void {
        this.setState({
            customizing: true,
            customizeCriteria: defaults,
            withDefaults: true,
            customizeTelemetryEntyPoint: telemetryEntryPoint
        });
    }

    @autobind
    private _closeCustomize(): void {
        this.setState({
            customizing: false,
            customizeCriteria: null
        })
    }
}

export interface ShowMoreProps {
    status: PullRequestListStatus;
    hasMore: boolean;
    loadMore(): void;
}

export const ShowMore: React.StatelessComponent<ShowMoreProps> =
    (props: ShowMoreProps): JSX.Element => {
        if (props.status === PullRequestListStatus.LoadingMore) {
            return <HubSpinner alignment={Alignment.center} labelText={VCResources.LoadingText} delay={SpinnerDelay} />;
        }
        if (props.hasMore) {
            return <CommandButton className="vc-pullrequest-showmore-link" title={VCResources.PullRequests_ShowMoreTitle}
                onClick={props.loadMore}>{VCResources.ShowMore}</CommandButton>;
        }
        return null;
    }