import * as TeamPanelResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { TeamPanelActions } from "Presentation/Scripts/TFS/TeamPanel/Flux/TeamPanelActions";
import { TeamPanelActionsCreator } from "Presentation/Scripts/TFS/TeamPanel/Flux/TeamPanelActionsCreator";
import { getTeamPanelViewState, ITeamPanelItemView, ITeamPanelViewState } from "Presentation/Scripts/TFS/TeamPanel/Flux/TeamPanelSelector";
import { TeamPanelStore } from "Presentation/Scripts/TFS/TeamPanel/Flux/TeamPanelStore";
import { ITeamPanelContext } from "Presentation/Scripts/TFS/TeamPanel/TeamPanelContracts";
import { FavoriteStar } from "Favorites/Controls/FavoriteStar";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { Link } from "OfficeFabric/Link";
import { List } from "OfficeFabric/List";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Panel, PanelType } from "OfficeFabric/Panel";
import { Pivot, PivotItem } from "OfficeFabric/Pivot";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { IContributionHubViewStateRouterContext } from "Presentation/Scripts/TFS/Router/ContributionHubViewStateRouter";
import * as React from "react";
import "VSS/LoaderPlugins/Css!Presentation/Scripts/TFS/TeamPanel/TeamPanel";
import { TeamMember } from "VSS/WebApi/Contracts";
import { IdentityDetailsProvider } from "VSSPreview/Providers/IdentityDetailsProvider";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { VssPersona } from "VSSUI/VssPersona";
import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { registerLWPComponent } from "VSS/LWP";

const ALL_HUBS_KEY = "__all__";
const CONSUMER_ID = "EA194426-ED68-4A59-88B7-ACAE6DF82B17";

export interface ITeamPanelProps {
    teamPanelContext: ITeamPanelContext;
    onDismiss: () => void;
}

export class TeamPanel extends React.Component<ITeamPanelProps, ITeamPanelViewState> {

    private _actionsCreator: TeamPanelActionsCreator;
    private _store: TeamPanelStore;

    constructor(props: ITeamPanelProps, context?: IContributionHubViewStateRouterContext) {
        super(props, context);

        const actions = new TeamPanelActions();
        this._actionsCreator = new TeamPanelActionsCreator(actions);
        this._store = new TeamPanelStore(actions);
        this.state = getTeamPanelViewState(this._store.getState());
    }

    public componentDidMount() {
        this._store.addChangedListener(this._onStoreChanged);
        this._actionsCreator.initialize(this.props.teamPanelContext);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreChanged);
    }

    private _onStoreChanged = (): void => {
        this.setState(getTeamPanelViewState(this._store.getState()));
    }

    public render(): JSX.Element {
        return (
            <Panel
                isOpen={true}
                onDismiss={this.props.onDismiss}
                hasCloseButton={true}
                closeButtonAriaLabel={TeamPanelResources.TeamPanel_Close}
                isLightDismiss={true}
                className="team-panel"
                type={PanelType.custom}
                customWidth={"450px"}
                onRenderHeader={this._renderHeader}
            >
                {this._renderPivot()}
            </Panel>
        );
    }

    private _renderHeader = (): JSX.Element => {
        const {
            teamImageUrl
        } = this.state;

        const {
            teamPanelContext: {
                teamName,
                projectName
            }
        } = this.props;

        return (
            <div className="team-panel-header-area">
                <div className="team-panel-header">
                    <img className="identity-picture large-identity-picture team-header-icon" src={teamImageUrl}></img>
                    <div className="team-text">
                        <label className="team-name">
                            <TooltipHost overflowMode={TooltipOverflowMode.Parent} content={teamName}>
                                {teamName}
                            </TooltipHost>
                        </label>
                        <label className="project-name">
                            <TooltipHost overflowMode={TooltipOverflowMode.Parent} content={projectName}>
                                {projectName}
                            </TooltipHost>
                        </label>
                        <div className="team-settings">
                            <Link className="team-settings-link" href={this._getAdminRoute()}>{TeamPanelResources.TeamSettingLabel}</Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    private _renderPivot(): JSX.Element {
        const {
            membersCount,
            loading
        } = this.state;

        if (loading) {
            return <LoadingComponent />;
        }

        return (
            <div className="team-panel-pivot-container">
                {this._renderErrors()}
                <Pivot>
                    <PivotItem
                        headerText={TeamPanelResources.TeamPanel_ItemsPivot}>
                        {this._renderItems()}
                    </PivotItem>
                    <PivotItem
                        headerText={TeamPanelResources.TeamPanel_Member}
                        itemCount={membersCount}
                    >
                        {this._renderMembers()}
                    </PivotItem>
                </Pivot>
            </div>
        );

    }

    private _renderMembers(): JSX.Element {
        const {
            admins,
            members
        } = this.state;

        let adminsList;
        let membersList;

        if (admins && admins.length > 0) {
            adminsList = this._onRenderMemberList(TeamPanelResources.AdminGroupHeader, admins);
        }

        if (members && members.length > 0) {
            membersList = this._onRenderMemberList(TeamPanelResources.TeamPanel_Member, members);
        }

        return (
            <div>
                {adminsList}
                {membersList}
            </div>);
    }

    private _onRenderMemberList(groupName: string, people: TeamMember[]) {
        return (
            <FocusZone className="member-list" direction={FocusZoneDirection.vertical}>
                <label className="group-label">{groupName}</label>
                <List
                    items={people}
                    onRenderCell={this._onRenderMember}>
                </List >
            </FocusZone>);
    }

    private _onRenderMember(member: TeamMember, index: number): JSX.Element {
        return (
            <div className="person-panel-row"
                data-is-focusable={true}
                aria-label={member.identity.displayName}>
                <VssPersona
                    size={"medium"}
                    identityDetailsProvider={new IdentityDetailsProvider(member.identity, CONSUMER_ID)} 
                    dataIsFocusable= {true}/>
                <label className="person-title">{member.identity.displayName}</label>
            </div>
        );
    }

    private _renderItems = (): JSX.Element => {
        const {
            items,
            itemGroupsWithItems,
            filter
        } = this.state;
        const options: IDropdownOption[] = itemGroupsWithItems.map(ig => {
            return {
                key: ig.hub,
                text: ig.hub
            }
        });

        options.unshift({
            key: ALL_HUBS_KEY,
            text: TeamPanelResources.AllITemsFilterText
        });

        let selectedKey = ALL_HUBS_KEY;
        if (filter && filter.itemGroup) {
            selectedKey = filter.itemGroup.hub;
        }
        return (
            <div>
                <div className="team-panel-drop-down-container">
                    <Dropdown
                        className="team-panel-filter-dropdown"
                        selectedKey={selectedKey}
                        options={options}
                        onChanged={this._filterItems}
                    />
                </div>
                <FocusZone className="item-list" direction={FocusZoneDirection.vertical}>
                    <List
                        items={items}
                        onRenderCell={this._onRenderCell}>
                    </List>
                </FocusZone>
            </div>
        );
    }

    private _onRenderCell = (panelItemView: ITeamPanelItemView, index: number): JSX.Element => {
        const {
            favorite,
            name
        } = panelItemView.item;

        const isFavorite = !!favorite;
        const ariaLabel = `${name} ${panelItemView.itemType.hub}`;

        return (
            <div
                className="item-panel-row"
                data-is-focusable={true}
                aria-label={ariaLabel}>
                <VssIcon className="item-icon"
                    iconName={panelItemView.item.iconClassName}
                    iconType={VssIconType.fabric}
                />
                <div className="item-text">
                    <Link className="item-title" onClick={() => this._onItemNavigated(panelItemView)}>
                        <TooltipHost overflowMode={TooltipOverflowMode.Parent} content={panelItemView.item.name}>
                            {panelItemView.item.name}
                        </TooltipHost>
                    </Link>
                    <label className="item-group-type">{panelItemView.itemType.hub}</label>
                </div>
                <div className="favorite-star">
                    <FavoriteStar
                        className={"directory-row-favorite-icon"}
                        isFavorite={isFavorite}
                        isDeleted={isFavorite ? panelItemView.item.favorite.artifactIsDeleted : false}
                        onToggle={() => { this._onFavorite(panelItemView) }}
                    />
                </div>
            </div>
        );
    }

    private _onItemNavigated(item: ITeamPanelItemView) {
        this._actionsCreator.itemNavigated(item);
    }

    private _renderErrors() {
        const {
            errors
        } = this.state;

        if (errors && errors.length > 0) {
            return (
                <div className="errors-container">{
                    errors.map((error, index) => (
                        <MessageBar
                            messageBarType={MessageBarType.error}
                            isMultiline={true}
                            key={error + index}
                        >
                            {error}
                        </MessageBar>
                    )
                    )}
                </div>
            );
        }

        return null;
    }

    private _onFavorite = (item: ITeamPanelItemView): void => {
        const {
            teamPanelContext: {
                projectId
            }
        } = this.props;

        this._actionsCreator.toggleFavorite(item, projectId);
    }

    private _filterItems = (option?: IDropdownOption) => {
        if (option) {
            if (option.key === ALL_HUBS_KEY) {
                this._actionsCreator.clearFilter();
            } else {
                const itemGroup = this.state.itemGroups.filter(ig => ig.hub === option.key)[0];
                this._actionsCreator.filterItems(itemGroup);
            }
        }
    }

    private _getAdminRoute = () => {
        const {
            teamPanelContext: {
                teamName,
                projectName
            }
        } = this.props;

        // Using MVC routes because "ms.vss-admin-web.project-admin-hub-route" does not have back-compat and will not work in horizontal nav
        var tfsContext = TfsContext.getDefault();
        return tfsContext.getActionUrl("", "", { area: "admin", team: teamName, project: projectName } as IRouteData);
    }
}

registerLWPComponent("teamPanel", TeamPanel);
