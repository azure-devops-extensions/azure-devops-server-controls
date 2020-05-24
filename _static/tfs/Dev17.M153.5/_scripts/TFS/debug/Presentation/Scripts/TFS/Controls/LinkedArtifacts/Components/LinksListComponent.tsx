/// <reference types="react-dom" />

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { autobind } from "OfficeFabric/Utilities";
import { KeyCode } from "VSS/Utils/UI";
import * as TFS_OM_Identities from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Controls from "VSS/Controls";
import * as Grids from "VSS/Controls/Grids";

import { IArtifactData } from "VSS/Artifacts/Services";

import { ILinkedArtifactGroup, IDisplayOptions } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Interfaces";
import { ViewMode, IColumn, IInternalLinkedArtifactDisplayData } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { LinkedArtifactsStore } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/Store";
import { ActionsHub } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/Actions";
import { ActionsCreator } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/ActionsCreator";

import { ArtifactComponent, ArtifactErrorComponent, ArtifactGroup } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Components/ArtifactRenderer";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import * as Utils_String from "VSS/Utils/String";

export interface ILinksListState {
    numberOfVisibleArtifacts: number;
}

export interface IListComponentProps {
    hostArtifact?: IArtifactData;

    actionsCreator: ActionsCreator;
    displayOptions: IDisplayOptions;

    columns: IColumn[];
    linkedArtifactGroups: ILinkedArtifactGroup[];
}

/**
 * @internal Exported for testing
 * Options for rendering the group
 */
export interface IGroupRenderOptions {
    /** The group */
    group: ILinkedArtifactGroup;

    /** Total number of artifacts in the group.  */
    totalArtifacts: number;

    /** Number of artifacts to render */
    visibleCount: number;
}

export class LinksListComponent extends React.Component<IListComponentProps, ILinksListState> {

    public constructor(props: IListComponentProps, context?: any) {
        super(props, context);
        this.state = {
            numberOfVisibleArtifacts: this.props.displayOptions.artifactPageSize
        };
    }

    public render(): JSX.Element {

        const visibleArtifactsByGroup = LinksListComponent._getGroupRenderOptions(this.state.numberOfVisibleArtifacts, this.props.linkedArtifactGroups);
        const groups = this._renderGroups(visibleArtifactsByGroup);
        let showMoreComponent: JSX.Element = null;

        // Prepare details for summary section, by calculating number of artifacts to show/hide in each group
        const notShownMessages: string[] = [];
        let shownCount = 0;
        let totalCount = 0;
        for (const groupName of Object.keys(visibleArtifactsByGroup)) {
            const groupDetails = visibleArtifactsByGroup[groupName];
            shownCount += groupDetails.visibleCount;
            totalCount += groupDetails.totalArtifacts;
            if (totalCount > shownCount) {
                const notShown = groupDetails.totalArtifacts - groupDetails.visibleCount;
                notShownMessages.push(`${groupName} (${notShown})`);
            }
        }

        // Create ShowMoreComponent if we have artifacts to hide
        if (totalCount > shownCount) {
            const shownDescription = Utils_String.format(PresentationResources.RelatedArtifacts_RemainingCount, shownCount, totalCount);
            let notShownMessage = "";
            if (notShownMessages && notShownMessages.length > 0) {
                notShownMessage = notShownMessages[0];
                for (let k = 1; k < notShownMessages.length; k++) {
                    notShownMessage = Utils_String.format(PresentationResources.RelatedArtifacts_SummaryDelimiter, notShownMessage, notShownMessages[k]);
                }
                notShownMessage = Utils_String.format(PresentationResources.RelatedArtifacts_SummaryNotShown, notShownMessage);
            }
            showMoreComponent = <ShowMoreComponent itemsNotShownDescription={notShownMessage} itemsShownDescription={shownDescription} showMore={this._showMore.bind(this)} />;
        }

        return <div className="la-list">
            {groups}
            {showMoreComponent}
        </div>;
    }

    /**
     * Gets render options for the groups
     */
    public static _getGroupRenderOptions(maxArtifactsToDisplay: number, linkedArtifactGroups: ILinkedArtifactGroup[]): IDictionaryStringTo<IGroupRenderOptions> {
        const ret: IDictionaryStringTo<IGroupRenderOptions> = {};
        const showAll = !maxArtifactsToDisplay;

        linkedArtifactGroups.forEach(group => {
            let visibleCount = group.linkedArtifacts.length;
            if (!showAll) {
                if (visibleCount > maxArtifactsToDisplay) {
                    visibleCount = maxArtifactsToDisplay;
                }
                maxArtifactsToDisplay = maxArtifactsToDisplay - visibleCount;
            }
            ret[group.displayName] = {
                totalArtifacts: group.linkedArtifacts.length,
                visibleCount: visibleCount,
                group: group
            };
        });


        return ret;
    }

    private _renderGroups(artifactCountByGroupName: IDictionaryStringTo<IGroupRenderOptions>): JSX.Element[] {
        return this.props.linkedArtifactGroups.map(group => {
            const visibleCount = artifactCountByGroupName[group.displayName].visibleCount;

            // Do not render empty groups
            if (visibleCount === 0) {
                return null;
            }

            return (
                <GroupedLinkedArtifactsComponent
                    key={group.displayName}
                    hostArtifact={this.props.hostArtifact}
                    actionsCreator={this.props.actionsCreator}
                    displayOptions={this.props.displayOptions}
                    displayName={group.displayName}
                    linkedArtifacts={group.linkedArtifacts}
                    columns={this.props.columns}
                    visibleCount={visibleCount}
                />
            );
        }).filter(g => !!g);
    }

    private _showMore() {
        this.setState(previousState => {
            return {
                numberOfVisibleArtifacts: previousState.numberOfVisibleArtifacts + this.props.displayOptions.artifactPageSize
            };
        });
    }
}

interface IGroupedLinkedArtifactProps {
    hostArtifact?: IArtifactData;

    actionsCreator: ActionsCreator;

    /** Display options for group */
    displayOptions: IDisplayOptions;

    /** Name to display for group */
    displayName: string;

    /** Linked artifacts in group */
    linkedArtifacts: IInternalLinkedArtifactDisplayData[];

    /** Columns to show for each artifact */
    columns: IColumn[];

    /** Optional, only show the first X linked artifacts */
    visibleCount?: number;
}

class GroupedLinkedArtifactsComponent extends React.Component<IGroupedLinkedArtifactProps, {}> {
    public render(): JSX.Element {
        let header: JSX.Element;
        if (this.props.displayOptions.showGroupHeaders && this.props.visibleCount > 0) {
            header = <ArtifactGroup.Component groupName={this.props.displayName} count={this.props.linkedArtifacts.length} />;
        }

        const links = this._renderLinks();
        const className = this.props.displayOptions.showGroupHeaders ? "la-list-group-showheader" : "la-list-group-noheader";
        return (
            <div className={className}>
                {header}
                {links}
            </div>
        );
    }

    private _renderLinks(): JSX.Element[] {
        return this.props.linkedArtifacts.slice(0, this.props.visibleCount).map((l) => {
            if (l.error) {
                return (
                    <ArtifactErrorComponent
                        key={`${l.id}-${l.linkType}`}
                        hostArtifact={this.props.hostArtifact}
                        actionsCreator={this.props.actionsCreator}
                        displayOptions={this.props.displayOptions}
                        columns={this.props.columns}
                        linkedArtifact={l}
                    />
                );
            } else {
                return (
                    <ArtifactComponent
                        key={`${l.id}-${l.linkType}`}
                        hostArtifact={this.props.hostArtifact}
                        actionsCreator={this.props.actionsCreator}
                        displayOptions={this.props.displayOptions}
                        columns={this.props.columns}
                        linkedArtifact={l}
                    />
                );
            }
        });
    }
}

/** Props interface for ShowMore Component */
interface IShowMoreProps {
    /** Description for items shown e.g. Shown (6 of 10) */
    itemsShownDescription: string;

    /** Description for items not shown e.g. Not Shown Related(2), Child (2) */
    itemsNotShownDescription: string;

    /** Handler for showMore action */
    showMore: Function;
}

/**
 * Component to render ShowMore
 */
class ShowMoreComponent extends React.Component<IShowMoreProps, {}> {
    public render(): JSX.Element {
        return (
            <div>
                <div>
                    <div className="la-show-more-container">
                        <div
                            role="button"
                            tabIndex={0}
                            className="la-show-more"
                            onClick={(event: React.MouseEvent<HTMLElement>) => this._callShowMore()}
                            onKeyUp={this._onShowMoreKeyUp}
                        >
                            {PresentationResources.RelatedArtifacts_ShowMore}
                        </div>
                        <div className="la-shown-count">
                            {this.props.itemsShownDescription}
                        </div>
                    </div>
                </div>
                <div className="la-not-shown-count">
                    {this.props.itemsNotShownDescription}
                </div>
            </div>
        );
    }

    @autobind
    private _onShowMoreKeyUp(e: React.KeyboardEvent<HTMLElement>) {
        if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE) {
            this._callShowMore();
        }
    }

    private _callShowMore() {
        this.props.showMore();
    }
}
