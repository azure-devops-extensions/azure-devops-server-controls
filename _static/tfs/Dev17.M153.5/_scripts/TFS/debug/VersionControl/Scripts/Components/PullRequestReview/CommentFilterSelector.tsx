import * as React from "react";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { ChangeExplorerGridCommentsMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { ChangeExplorerGridModeChangedEventArgs } from "VersionControl/Scripts/Controls/ChangeListNavigatorChangeExplorerGrid";
import * as Telemetry from "VSS/Telemetry/Services";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!fabric";

export interface ICommentFilterSelectorProps extends React.Props<void> {
    commentsMode: ChangeExplorerGridCommentsMode; 
    onUpdateChangeExplorerOptions(options: any, shouldUpdatePrefs?: boolean): void;
}

const CommentFilterType = [
    ChangeExplorerGridCommentsMode.Default,
    ChangeExplorerGridCommentsMode.ActiveCommentsUnderFiles,
    ChangeExplorerGridCommentsMode.Off,
];

const CommentFilterText = [
    VCResources.PullRequest_ChangeExplorer_CommentFilter_AllFilesAllComments,
    VCResources.PullRequest_ChangeExplorer_CommentFilter_AllFilesActiveComments,
    VCResources.PullRequest_ChangeExplorer_CommentFilter_AllFilesHideComments,
];

const CommentFilterTextLong = [
    VCResources.PullRequest_ChangeExplorer_CommentFilter_AllFilesAllCommentsLong,
    VCResources.PullRequest_ChangeExplorer_CommentFilter_AllFilesActiveCommentsLong,
    VCResources.PullRequest_ChangeExplorer_CommentFilter_AllFilesHideCommentsLong,
];

const getTypeIndex = (mode: ChangeExplorerGridCommentsMode): number => {
    return CommentFilterType.indexOf(mode);
};

export class CommentFilterSelector extends React.Component<ICommentFilterSelectorProps, {}> {
    public render(): JSX.Element {
        return (
            <div className={"filter-selector vc-pullrequest-comment-filter-container"}>
                <Dropdown
                    className={"vc-pullrequest-comment-filter"}
                    label={""} // no text label next to the dropdown
                    ariaLabel={VCResources.PullRequest_ChangeExplorer_CommentFilter_Label}
                    options={this._getDropdownOptions()}
                    selectedKey={this.props.commentsMode}
                    onChanged={this._onFilterChanged}
                    onRenderTitle={this._onRenderTitle} />
            </div>);
    }

    private _getDropdownOptions(): IDropdownOption[] {
        return [
            {
                key: ChangeExplorerGridCommentsMode.Default,
                text: CommentFilterTextLong[getTypeIndex(ChangeExplorerGridCommentsMode.Default)],
            },
            {
                key: ChangeExplorerGridCommentsMode.ActiveCommentsUnderFiles,
                text: CommentFilterTextLong[getTypeIndex(ChangeExplorerGridCommentsMode.ActiveCommentsUnderFiles)],
            },
            {
                key: ChangeExplorerGridCommentsMode.Off,
                text: CommentFilterTextLong[getTypeIndex(ChangeExplorerGridCommentsMode.Off)],
            },
        ];
    }

    private _onRenderTitle = (item: IDropdownOption | IDropdownOption[]): JSX.Element => {
        if (Array.isArray(item)) {
            item = item[0];
        }

        const filterIcon: string = "bowtie-icon bowtie-comment-lines";
        return (
            <span>
                <i className={filterIcon} />
                {CommentFilterText[getTypeIndex(this.props.commentsMode)]}
            </span>);
    }

    private _onFilterChanged = (option: IDropdownOption): void => {
        const newCommentsMode: ChangeExplorerGridCommentsMode = option.key as ChangeExplorerGridCommentsMode;

        if (newCommentsMode !== this.props.commentsMode) {
            const options = {
                commentsMode: newCommentsMode,
                commentsModeChanged: true,
            } as ChangeExplorerGridModeChangedEventArgs;

            // update the user preferences locally but do not send those out - we don't want this selection to be sticky
            if (this.props.onUpdateChangeExplorerOptions) {
                this.props.onUpdateChangeExplorerOptions(options, false);
            }

            const commentFilterChangedEvent = new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                CustomerIntelligenceConstants.COMMENT_FILTER, {
                    "FilterSelected": newCommentsMode,
                    "FilterSelectedText": option.text,
                });
            Telemetry.publishEvent(commentFilterChangedEvent);
        }
    }
}
