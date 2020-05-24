import * as React from "react";

import { DiscussionManager } from "Presentation/Scripts/TFS/TFS.Discussion.OM";

import { shouldReactToDisplayModeChange } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsUtils";
import { IDiffSummaryPropsBase } from "VersionControl/Scenarios/ChangeDetails/CommonInterfaces";
import { ChangeListSummaryControl } from "VersionControl/Scripts/Controls/ChangeListSummaryControl";

import { summaryFilterEquals } from "VersionControl/Scripts/Controls/ChangeListSummaryControlFilter";
import { TfsChangeList} from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as MenuItemUtils from "VersionControl/Scripts/Utils/MenuItemUtils";

import { BaseControl } from "VSS/Controls";

export interface IChangeListSummaryProps extends IDiffSummaryPropsBase {
    discussionManager: DiscussionManager;
    allowHideCommentsMenuItem?: boolean;
    changeList: TfsChangeList; // override to a more specific type
}

/**
 * Rendering container for the jquery ChangeListSummaryControl 
 */
export class ChangeListSummary extends React.Component<IChangeListSummaryProps, {}> {
    private _summaryControl: ChangeListSummaryControl;

    public render(): JSX.Element {
        return <div className="vc-summary-tab"></div>;
    }

    public componentDidMount(): void {

        // first render after loading is complete should create the control
        this._summaryControl =
            BaseControl.createIn(ChangeListSummaryControl, $(".vc-summary-tab"), {
                customerIntelligenceData: this.props.customerIntelligenceData,
                tfsContext: this.props.tfsContext,
                suppressHeader: true,
                suppressAssociatedWorkItemPanel: true,
                additionalMenuItems: () => { return this.props.additionalMenuItems; },
                maxChangesCount: this.props.maxDiffsToShow,
            }) as ChangeListSummaryControl;

        // do an initial refresh in case it is needed
        this.componentDidUpdate();
    }

    public componentWillUnmount(): void {

        if (this._summaryControl) {
            this._summaryControl.dispose();
            this._summaryControl = null;
        }
    }

    public componentDidUpdate(): void {

        if (!this._summaryControl) {
            return;
        }

        this._summaryControl.setActiveState(this.props.isVisible, true);

        if (this.props.resetSummaryView
            && this.props.isVisible
            && this.props.changeList
            && this.props.repositoryContext
            && this.props.originalChangeList
            && this.props.versionSpec
            && this.props.discussionManager
        ) {
            // reload data in the control
            this._summaryControl.setDiscussionManager(this.props.discussionManager);
            this._summaryControl.setModel(
                this.props.repositoryContext,
                this.props.changeList,
                this.props.originalChangeList,
                this.props.versionSpec,
                null,
                null,
                this.props.displayMode
            );
            // Hide the old show more link.
            this._summaryControl.hideMoreChangesSection();
            this._summaryControl.updateHideArtifactLevelDiscussionState(this.props.hideArtifactLevelDiscussion);
        }

        this._summaryControl.setFilter(this.props.summaryFilter);
        this._summaryControl.updateAdditionalMenuItems(this.props.additionalMenuItems);
        if (this.props.allowHideCommentsMenuItem != undefined && this.props.allowHideCommentsMenuItem != null) {
            this._summaryControl.setAllowHideComments(this.props.allowHideCommentsMenuItem);
        }
    }

    public shouldComponentUpdate(nextProps: IChangeListSummaryProps, nextState: {}): boolean {
        return (this.props.changeList !== nextProps.changeList
            || this.props.originalChangeList !== nextProps.originalChangeList
            || this.props.versionSpec !== nextProps.versionSpec
            || this.props.discussionManager !== nextProps.discussionManager
            || !summaryFilterEquals(this.props.summaryFilter, nextProps.summaryFilter)
            || shouldReactToDisplayModeChange(this.props.displayMode, nextProps.displayMode)
            || !MenuItemUtils.areMenuItemsArraysEqual(this.props.additionalMenuItems, nextProps.additionalMenuItems)
            || this.props.isVisible !== nextProps.isVisible
            || this.props.hideArtifactLevelDiscussion !== nextProps.hideArtifactLevelDiscussion);
    }
}
