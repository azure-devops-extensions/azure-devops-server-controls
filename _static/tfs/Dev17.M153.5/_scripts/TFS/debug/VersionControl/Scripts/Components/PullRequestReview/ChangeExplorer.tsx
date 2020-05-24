import * as React from "react";
import * as Mixins from "VersionControl/Scripts/Components/PullRequestReview/Mixins";

import { ChangeListNavigator } from "VersionControl/Scripts/Controls/ChangeListNavigator";
import { ChangeExplorer as ChangeExplorerLegacy, ChangeExplorerItem } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorer";
import { DiscussionManager } from "Presentation/Scripts/TFS/TFS.Discussion.OM";
import Controls = require("VSS/Controls");
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ChangeExplorerGridCommentsMode, ChangeExplorerGridDisplayMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ChangeList } from "VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer";

export interface IChangeListProps extends React.Props<void> {
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
    changeList: ChangeList;
    pathExistsInChangeList: boolean;
    handleSourceControlActionInExplorerContext?: boolean;
    discussionManager: DiscussionManager;
    displayMode: ChangeExplorerGridDisplayMode;
    commentsMode: ChangeExplorerGridCommentsMode;
    selectedPath: string;
    selectedDiscussionId?: number;
    isVisible: boolean;
    itemDetail: ItemModel;
    onNavigateToChangeExplorerItem?(item: ChangeExplorerItem, replaceHistory?: boolean): void;
    onQueryItemDetail?(path: string, version: string): void;
    onUpdateChangeExplorerOptions?(options: any, shouldUpdatePrefs: boolean): void;
}

/**
 * hybrid renderer for jquery change list component
 */
export class ChangeExplorer extends Mixins.DiagnosticComponent<IChangeListProps, {}> {
    private _changeExplorerControl: ChangeExplorerLegacy;
    private static readonly CHANGE_EXPLORER_SELECTION_CHANGED_EVENT = "change-explorer-selection-changed";

    public render(): JSX.Element {
        return (
            <div className="vc-change-items-container" />
        );
    }

    public componentDidMount() {
        super.componentDidMount();

        this._changeExplorerControl =
            Controls.BaseControl.createIn(ChangeExplorerLegacy, $(".vc-change-items-container"), {
                tfsContext: this.props.tfsContext,
                expandFileDiscussionsByDefault: true,
                hideToolbar: true,
                hideOverallComments: true,
                handleSourceControlActionInExplorerContext: !!this.props.handleSourceControlActionInExplorerContext,
                supportCommentStatus: true
            }) as ChangeExplorerLegacy;

        // wire up user actions
        this._changeExplorerControl._bind(ChangeExplorer.CHANGE_EXPLORER_SELECTION_CHANGED_EVENT, this._onChangeExplorerSelectionChanged);
        this._changeExplorerControl.getChangeListNavigator().attachNavigateEvent(this._onChangeListNavigatorNavigateEvent);

        // do an initial refresh in case it is needed
        this.componentDidUpdate();
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        if (this._changeExplorerControl) {
            this._changeExplorerControl._unbind(ChangeExplorer.CHANGE_EXPLORER_SELECTION_CHANGED_EVENT, this._onChangeExplorerSelectionChanged);
            this._changeExplorerControl.getChangeListNavigator().detachNavigateEvent(this._onChangeListNavigatorNavigateEvent);
            this._changeExplorerControl.dispose();
            this._changeExplorerControl = null;
        }
    }

    public componentDidUpdate() {
        super.componentDidUpdate();

        // we don't need to change the control unless we
        // have a certain amount of data ready
        if (this._changeExplorerControl && this.props.changeList && this.props.displayMode !== null && this.props.commentsMode !== null) {

            // if the changelist was changed (i.e. a different iteration selected meaning different original and modified
            // version commits, or if change counts are different meaning new changes were paged in) then we need to reset it
            const changeList = this._changeExplorerControl.getChangeList() as any;
            const changeListWasModified: boolean = !!this.props.changeList &&  (!changeList ||
                    changeList.changes.length !== this.props.changeList.changes.length ||
                    changeList.mversionSpec !== this.props.changeList.mversionSpec ||
                    changeList.oversionSpec !== this.props.changeList.oversionSpec);

            if (changeListWasModified) {
                this._changeExplorerControl.setChangeList(
                    this.props.repositoryContext,
                    this.props.changeList.legacyChangeList(),
                    this.props.discussionManager,
                    !!changeList); // keep state intact if we already had a changelist
            }

            // if we selected an invalid item (includes no item) then select the first item in the grid
            if (!this.props.pathExistsInChangeList) {
                this._changeExplorerControl.getGrid().setSelectedDataIndex(0);
                return;
            }

            // make sure the currently selected item is up-to-date
            this._changeExplorerControl.setSelectedItem(this.props.selectedPath, this.props.selectedDiscussionId, false);

            // set up display options (tree structure and comment hiding)
            this._changeExplorerControl.getGrid().setDisplayOptions(this.props.displayMode, this.props.commentsMode, false, false);
        }
    }

    private _onChangeExplorerSelectionChanged = (sender: any, item: ChangeExplorerItem): void => {
        if (this.props.onNavigateToChangeExplorerItem) {
            this.props.onNavigateToChangeExplorerItem(item, !this.props.pathExistsInChangeList);
        }
    }

    private _onChangeListNavigatorNavigateEvent = (sender: ChangeListNavigator, item: ChangeExplorerItem): void => {
        if (this.props.onNavigateToChangeExplorerItem) {
            this.props.onNavigateToChangeExplorerItem(item, !this.props.pathExistsInChangeList);
        }
    }

    /**
     * This saves us perf on the client, since we only need to render when something important to the control changes.
     */
    public shouldComponentUpdate(nextProps: IChangeListProps, nextState: {}): boolean {
        if (this.props.isVisible !== nextProps.isVisible
            || nextProps.isVisible && (this.props.discussionManager !== nextProps.discussionManager
            || this.props.commentsMode !== nextProps.commentsMode
            || this.props.displayMode !== nextProps.displayMode
            || this.props.changeList !== nextProps.changeList
            || this.props.selectedPath !== nextProps.selectedPath
            || this.props.selectedDiscussionId !== nextProps.selectedDiscussionId)) {
            return true;
        }

        return false;
    }
}
