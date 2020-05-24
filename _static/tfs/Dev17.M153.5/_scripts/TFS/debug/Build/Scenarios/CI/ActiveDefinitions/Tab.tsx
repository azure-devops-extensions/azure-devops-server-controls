import * as React from "react";

import { ActiveDefinitionsStore, DefinitionCategory } from "./Stores/ActiveDefinitions";
import { BuildStatusDisplayDetails, getBuildStatusDisplayDetails} from "./BuildDisplayDetails";
import { IBuildListProps, IBuildListState } from "./BuildList.types";
import { BuildList } from "./BuildList";
import {
    IActiveDefinitionsTabProps,
    IActiveDefinitionsTabState
} from "./Tab.types";
import {
    IActiveDefinitionsProviderData,
    IActiveDefinitionData
} from "./Stores/ActiveDefinitions.types";
import { HubActionCreator, HubActionHub } from "Build/Scripts/CI/Actions/Hub";
import { BuildsActionCreator, BuildsActionHub } from "Build/Scripts/CI/Actions/Builds";
import * as Resources from "Build/Scripts/Resources/TFS.Resources.Build";
import * as CIQueueBuildDialog_NO_REQUIRE from "Build/Scripts/CIQueueBuildDialog";
import { Sources } from "Build/Scripts/Telemetry";
import * as DefinitionMenuItems from "Build/Scenarios/CI/DefinitionMenuItems";
import { FavoriteToggle } from "Build/Scripts/Components/FavoriteToggle";
import { BuildLinks } from "Build.Common/Scripts/Linking";

import {
    Build,
    BuildDefinition,
    BuildResult,
    BuildReason,
    BuildStatus,
    DefinitionQuality
} from "TFS/Build/Contracts";
import { FavoriteStoreNames, UserActions } from "Build/Scripts/Constants";

import { ago, friendly } from "VSS/Utils/Date";
import { using } from "VSS/VSS";
import { getService as getEventService, EventService } from "VSS/Events/Services";

import { IPivotBarAction } from 'VSSUI/PivotBar';
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { Splitter } from "VSSPreview/Flux/Components/Splitter";

import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { GroupedList, IGroup } from "OfficeFabric/GroupedList";
import { Selection, SelectionMode, SelectionZone } from "OfficeFabric/Selection";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { css, KeyCodes, getRTLSafeKeyCode } from "OfficeFabric/Utilities";

export class ActiveDefinitionsTab extends React.Component<IActiveDefinitionsTabProps, IActiveDefinitionsTabState>{
    private _store: ActiveDefinitionsStore;
    private _eventService: EventService;
    private _selectedDefinition: BuildDefinition = null;

    constructor(props: IActiveDefinitionsTabProps) {
        super(props);
        this._store = props.store || new ActiveDefinitionsStore({
            signalRActionCreator: props.signalRActionCreator,
            signalRActionHub: props.signalRActionHub,
            buildsActionCreator: props.buildsActionCreator,
            buildsActionHub: props.buildsActionHub
        });

        this.state = {
            definitions: [],
            favorites: []
        };

        this._eventService = getEventService();

        this._eventService.attachEvent(UserActions.AddToMyFavorites, (sender: any, eventArgs: any) => {
            this.props.buildsActionCreator.addDefinitionToFavorites(FavoriteStoreNames.MyFavorites, eventArgs.definition);
        });

        this._eventService.attachEvent(UserActions.RemoveFromMyFavorites, (sender: any, eventArgs: any) => {
            this.props.buildsActionCreator.removeDefinitionFromFavorites(FavoriteStoreNames.MyFavorites, eventArgs.definition);
        });
    }

    public render() {
        let left = (
            <FocusZone direction={FocusZoneDirection.vertical} isInnerZoneKeystroke={this._isInnerZoneKeystroke}>
                <GroupedList
                    items={this._getGroupedListItems()}
                    onRenderCell={this._renderGroupedListItem.bind(this)}
                    selectionMode={SelectionMode.single}
                    groups={this._getGroupedListGroups()}
                    groupProps={{
                        onRenderHeader: this._renderGroupedListGroupHeader,
                        onRenderFooter: this._renderGroupedListGroupFooter
                    }}
                />
            </FocusZone>
        );

        let right = <div/>;
        if (this._selectedDefinition) {
            right = (
                <BuildList definition={this._selectedDefinition} store={this._store} buildsActionCreator={this.props.buildsActionCreator} />
            );
        }

        return <div className="active-definitions">
            <Splitter
                left={left}
                right={right}
                leftClassName="active-definitions-left-pane"
                rightClassName="active-definitions-right-pane"
                cssClass="active-definitions-splitter"
                initialSize={250}
                maxWidth={500}
                minWidth={100}>
            </Splitter>
        </div>;
    }

    private _isInnerZoneKeystroke(ev: React.KeyboardEvent<HTMLElement>): boolean {
        return ev.which === getRTLSafeKeyCode(KeyCodes.right);
    }

    private _getGroupedListItems(): IActiveDefinitionData[] {
        return this.state.definitions;
    }

    private _getGroupedListGroups(): IGroup[] {
        let featuredCount = 0;
        let draftsCount = 0;
        let favoritesCount = 0;
        let recentCount = 0;

        this.state.definitions.forEach((item: IActiveDefinitionData) => {
            if (item.category === DefinitionCategory.Featured) {
                featuredCount++;
            }
            else if (item.category === DefinitionCategory.Draft) {
                draftsCount++;
            }
            else if (item.category === DefinitionCategory.Favorite) {
                favoritesCount++;
            }
            else {
                recentCount++;
            }
        });

        let groups: IGroup[] = [];

        if (featuredCount > 0) {
            groups.push({
                count: featuredCount,
                key: "featured-definitions",
                name: null,
                startIndex: 0
            } as IGroup);
        }

        if (draftsCount > 0) {
            groups.push({
                count: draftsCount,
                key: "draft-definitions",
                name: null,
                startIndex: featuredCount
            } as IGroup);
        }

        if (favoritesCount > 0) {
            groups.push({
                count: favoritesCount,
                key: "favorite-definitions",
                name: null,
                startIndex: featuredCount + draftsCount
            } as IGroup);
        }

        if (recentCount > 0) {
            groups.push({
                count: recentCount,
                key: "featured-definitions",
                name: Resources.RecentlyBuilt,
                startIndex: featuredCount + draftsCount + favoritesCount
            } as IGroup);
        }

        return groups;
    }

    private _renderGroupedListItem(nestingDepth: number, item: IActiveDefinitionData, itemIndex: number) {
        let isSelectedClassName = this._selectedDefinition && this._selectedDefinition.id === item.definition.id ? "is-selected" : "";

        if (item.category !== DefinitionCategory.Recent) {
            return (
                <div data-is-focusable={true}
                    id={itemIndex.toString()}
                    key={item.definition.id}
                    className={css("active-definition-item", isSelectedClassName)}
                    onClick={this._onGroupedListItemClick.bind(this, item.definition)}>
                        <FocusZone direction={FocusZoneDirection.horizontal}>
                        <div className="active-definition-item-content">
                            <div className="active-definition-flex-container">
                                <div className="active-definition-item-text">{item.definition.name}</div>
                                {
                                    item.definition.quality === DefinitionQuality.Draft && 
                                    <div className="active-definition-draft-label">{Resources.DraftIndicator}</div>
                                }
                                {
                                    item.isFavorite && 
                                    <div className="active-definition-favorite">
                                        <FavoriteToggle
                                            definition={item.definition}
                                            isMyFavorite={item.isFavorite} />
                                    </div>
                                }
                            </div>
                            <div className="active-definition-item-footer-text">
                                {this._renderDefinitionStatusLine(item.definition.latestCompletedBuild)}
                            </div>
                        </div>
                    </FocusZone>
                </div>
            );
        }
        else {
            return (
                <div data-is-focusable={true}
                    id={itemIndex.toString()}
                    key={item.definition.id}
                    className={css("active-definition-item", isSelectedClassName)}
                    onClick={this._onGroupedListItemClick.bind(this, item.definition)}>
                        <FocusZone direction={FocusZoneDirection.horizontal}>
                        <div className="active-definition-item-content">
                            <div className="active-definition-flex-container">
                                <div className="active-definition-item-text">{item.definition.name}</div>
                                {
                                    item.definition.quality === DefinitionQuality.Draft && 
                                    <div className="active-definition-draft-label">{Resources.DraftIndicator}</div>
                                }
                            </div>
                        </div>
                    </FocusZone>
                </div>
            );
        }
    }

    private _renderGroupedListGroupHeader(props): JSX.Element {
        if (props.group.name || props.group.startIndex !== 0) {
            let cssClass = "active-definition-group-header";
            if (props.group.startIndex !== 0) {
                cssClass += " active-definition-group-divider";
            }
            return <div className={cssClass}>{props.group.name}</div>;
        }
        else {
            return null;
        }
    }

    private _renderGroupedListGroupFooter(props): JSX.Element {
        return null;
    }

    public componentDidMount() {
        this._store.addChangedListener(this._updateState);
        this._store.fetchData(this.props.refreshDataOnMount, () => { this._updateMenu() });

        this._updateMenu();
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._updateState);
        this._store.dispose();
    }

    private _updateMenu() {
        let commands: IPivotBarAction[] = [];
        commands.push(DefinitionMenuItems.getNewDefinitionPivotBarAction());
        commands.push(DefinitionMenuItems.getEditDefinitionPivotBarAction(this._selectedDefinition));
        commands.push(DefinitionMenuItems.getSecurityPivotBarAction(this._selectedDefinition));
        commands.push(DefinitionMenuItems.getRenameMovePivotBarAction(this._selectedDefinition));
        commands.push({
            key: "divider1",
            important: false,
            separator: true
        });
        commands.push(DefinitionMenuItems.getQueueNewBuildPivotBarAction(this._selectedDefinition));
        commands.push(DefinitionMenuItems.getPauseBuildsPivotBarAction(this._selectedDefinition));
        commands.push({
            key: "divider2",
            important: false,
            separator: true
        });
        commands.push(DefinitionMenuItems.getAddToFavoritesPivotBarAction());
        commands.push(DefinitionMenuItems.getAddToDashboardPivotBarAction());
        commands.push({
            key: "divider3",
            important: false,
            separator: true
        });
        commands.push(DefinitionMenuItems.getCloneDefinitionPivotBarAction(this._selectedDefinition));
        commands.push(DefinitionMenuItems.getSaveAsTemplatePivotBarAction(this._selectedDefinition));
        commands.push(DefinitionMenuItems.getExportDefinitionPivotBarAction(this._selectedDefinition));
        commands.push({
            key: "divider4",
            important: false,
            separator: true
        });
        commands.push(DefinitionMenuItems.getDeleteDefinitionPivotBarAction(this._selectedDefinition, this.props.buildsActionCreator, () => { this._updateMenu() }));
        this.props.hubActionCreator.addCommands(commands);
    }

    private _getState() {
        let definitions: IActiveDefinitionData[] = this._store.getDefinitions();
        let favorites: IKeyValuePair<BuildDefinition, string[]>[] = this._store.getFavorites();

        this._selectedDefinition = this._store.getSelectedDefinition();

        return {
            definitions: definitions,
            favorites: favorites
        } as IActiveDefinitionsTabState;
    }

    private _updateState = () => {
        let state = this._getState();
        this.setState(state);
    }

    private _onGroupedListItemClick = (item: BuildDefinition) => {
        this.props.buildsActionCreator.selectDefinition(item);
        this._updateMenu();
    }

    private _renderDefinitionStatusLine(build: Build): JSX.Element {
        let agoText: string = null;
        let statusDisplay = null;

        if (build) {
            agoText = friendly(build.queueTime);
            statusDisplay = getBuildStatusDisplayDetails(build);
        }
        else {
            statusDisplay = {
                text: Resources.BuildStatusTextNoBuilds,
                iconType: VssIconType.fabric,
                iconName: null,
                colorClassName: "ci-no-color"
            };
        }

        if (statusDisplay.iconName && agoText) {
            return (
                <FormatComponent format={"{0} {1} {2}"}>
                    {statusDisplay.iconName && <VssIcon iconType={statusDisplay.iconType} iconName={statusDisplay.iconName} className={statusDisplay.colorClassName} />}
                    <span className={statusDisplay.colorClassName}>{statusDisplay.text}</span>
                    {agoText && <span className="ci-no-color">{agoText}</span>}
                </FormatComponent>
            );
        }
        else {
            return <span className={statusDisplay.colorClassName}>{statusDisplay.text}</span>;
        }
    }
}

