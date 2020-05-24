import * as React from "react";

import { CommitDiffSummaryControl } from "VersionControl/Scripts/Controls/ChangeListSummaryCommitDiffSummaryControl";
import { summaryFilterEquals } from "VersionControl/Scripts/Controls/ChangeListSummaryControlFilter";

import { shouldReactToDisplayModeChange } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsUtils";
import { IDiffSummaryPropsBase } from "VersionControl/Scenarios/ChangeDetails/CommonInterfaces";
import { GitCommit } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as MenuItemUtils from "VersionControl/Scripts/Utils/MenuItemUtils";

import { BaseControl } from "VSS/Controls";


export interface ICommitDiffSummaryProps extends IDiffSummaryPropsBase {
    changeList: GitCommit;
    compareToVersionSpec: VersionSpec;
}

/**
 * Rendering container for the jquery CommitDiffSummaryControl 
 */
export class CommitDiffSummary extends React.Component<ICommitDiffSummaryProps, {}> {
    private _commitDiffSummaryControl: CommitDiffSummaryControl;

    public render(): JSX.Element {
        return <div className="vc-diff-summary-tab"></div>;
    }

    public componentDidMount(): void {

        // first render after loading is complete should create the control
        this._commitDiffSummaryControl =
            BaseControl.createIn(CommitDiffSummaryControl, $(".vc-diff-summary-tab"), {
                customerIntelligenceData: this.props.customerIntelligenceData,
                tfsContext: this.props.tfsContext,
                suppressHeader: true,
                suppressAssociatedWorkItemPanel: true,
                additionalMenuItems: () => { return this.props.additionalMenuItems; },
                maxChangesCount: this.props.maxDiffsToShow,
            }) as CommitDiffSummaryControl;

        // do an initial refresh in case it is needed
        this.componentDidUpdate();
    }

    public componentWillUnmount(): void {

        if (this._commitDiffSummaryControl) {
            this._commitDiffSummaryControl.dispose();
            this._commitDiffSummaryControl = null;
        }
    }

    public componentDidUpdate(): void {

        if (this.props.resetSummaryView
            && this.props.isVisible
            && this._commitDiffSummaryControl
            && this.props.repositoryContext
            && this.props.changeList
            && this.props.originalChangeList
            && this.props.versionSpec
            && this.props.compareToVersionSpec
        ) {
            // reload data in the control
            this._commitDiffSummaryControl.setModel(
                this.props.repositoryContext,
                this.props.changeList,
                this.props.originalChangeList,
                this.props.versionSpec,
                this.props.compareToVersionSpec,
                null,
                this.props.displayMode
            );
            // Hide the old show more link.
            this._commitDiffSummaryControl.hideMoreChangesSection();
            this._commitDiffSummaryControl.updateHideArtifactLevelDiscussionState(this.props.hideArtifactLevelDiscussion);
        }
        this._commitDiffSummaryControl.setFilter(this.props.summaryFilter);
        this._commitDiffSummaryControl.updateAdditionalMenuItems(this.props.additionalMenuItems);
    }

    public shouldComponentUpdate(nextProps: ICommitDiffSummaryProps, nextState: {}): boolean {
        return (this.props.changeList !== nextProps.changeList
            || this.props.originalChangeList !== nextProps.originalChangeList
            || this.props.versionSpec !== nextProps.versionSpec
            || this.props.compareToVersionSpec !== nextProps.compareToVersionSpec
            || !summaryFilterEquals(this.props.summaryFilter, nextProps.summaryFilter)
            || shouldReactToDisplayModeChange(this.props.displayMode, nextProps.displayMode)
            || !MenuItemUtils.areMenuItemsArraysEqual(this.props.additionalMenuItems, nextProps.additionalMenuItems)
            || this.props.isVisible !== nextProps.isVisible
            || this.props.hideArtifactLevelDiscussion !== nextProps.hideArtifactLevelDiscussion);
    }
}
