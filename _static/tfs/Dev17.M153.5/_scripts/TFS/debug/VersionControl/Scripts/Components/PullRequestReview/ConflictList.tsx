import React = require("react");
import Diag = require("VSS/Diag");
import Utils_String = require("VSS/Utils/String");

import { GitConflict, GitConflictType } from "TFS/VersionControl/Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import { ConflictActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/ConflictActionCreator";

import * as VCPath from "VersionControl/Scripts/VersionControlPath";
import * as VCFileIconPicker from "VersionControl/Scripts/VersionControlFileIconPicker";

import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";

export interface IConflictListProps {
    conflictList: GitConflict[];
    conflictsOverflowed: boolean;
    has2ndOrderConlicts: boolean;
}

/*
 * List of merge conflicts in current PR
 */
export class ConflictList extends React.Component<IConflictListProps, {}> {
    constructor(props) {
        super(props);
    }

    public render(): JSX.Element {

        const conflictsCount: number = this.props.conflictList.length | 0;
        const conflictsOverflowed: boolean = !!this.props.conflictsOverflowed;
        const has2ndOrderConlicts: boolean = !!this.props.has2ndOrderConlicts;
        const top: number = ConflictActionCreator.TOP | 0;

        let countText: string;

        let showConflictList: boolean;

        let headerTextElement: JSX.Element;
        let conflictDetailsElement: JSX.Element;

        if (!conflictsOverflowed && conflictsCount < 1) {
            // "Conflicts prevent automatic merging"

            headerTextElement =
                <div className="conflict-header-text">{VCResources.PullRequsete_SystemMergeConflictsStatusDisplay}</div>;

            showConflictList = false;
        }
        else {
            let countText: string;
            let resource: string;

            if (conflictsCount === 1) {
                // "1 conflict prevents automatic merging"
                countText = "1";
                resource = VCResources.PullRequest_MergeConflictsHeaderWithCount_Singular;
                showConflictList = true;
            }
            else if (!conflictsOverflowed) {
                // "6 conflicts prevent automatic merging"
                countText = "" + conflictsCount;
                resource = VCResources.PullRequest_MergeConflictsHeaderWithCount_Plural;
                showConflictList = true;
            }
            else {
                // "50+ conflicts prevent automatic merging"
                countText = "" + top + "+";
                resource = VCResources.PullRequest_MergeConflictsHeaderWithCount_Plural;
                showConflictList = false;
            }

            headerTextElement =
                <FormattedComponent className="conflict-header-text" format={resource} elementType="div">
                    <div className="conflict-header-count">{countText}</div>
                </FormattedComponent>;
        }

        if (showConflictList) {
            const conflictList = this.props.conflictList
                .map((conflict) => ({
                    key: "conflict_" + conflict.conflictId,
                    path: conflict.conflictPath,
                    fileName: this.getFileName(conflict.conflictPath),
                    description: this.getConflictDescription(conflict.conflictType),
                    iconClassList: this.getFileIconClassList(conflict.conflictPath),
                }))
                .sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.fileName, b.fileName));

            conflictDetailsElement = (
                <div className="vc-pullrequest-activity-body conflict-list">{
                    conflictList.map(conflict => {
                        return (
                            <div key={conflict.key} className="conflict-row">
                                <div className="conflict-row-data conflict-row-icon"><i className={conflict.iconClassList} /></div>
                                <div className="conflict-row-data conflict-row-filename" title={conflict.path}>{conflict.fileName}</div>
                                <div className="conflict-row-data conflict-row-conflict-description">{conflict.description}</div>
                            </div>
                        );
                    })
                }</div>
            );
        }
        else if (has2ndOrderConlicts) {
            conflictDetailsElement =
                <div className="vc-pullrequest-activity-body conflict-list">{VCResources.PullRequest_MergeConflicts_2ndOrder}</div>;
        }
        else {
            conflictDetailsElement = null;
        }

        return (
            <div key="full" className="vc-pullrequest-activity-box conflict-container">

                <div className="vc-pullrequest-activity-header conflict-header">{headerTextElement}</div>

                {conflictDetailsElement}

                <div className="conflict-footer">
                    <span className="conflict-footer-nextsteps">{VCResources.PullRequest_MergeConflictsFooter_NextSteps}</span>&nbsp;
                    {VCResources.PullRequest_MergeConflictsFooter_Text}
                </div>

            </div>
        );
    }

    private getFileIconClassList(path: string): string {
        return "bowtie-icon " + VCFileIconPicker.getIconNameForFile(path);
    }

    private getFileName(path: string): string {
        return VCPath.getFileName(path);
    }

    private getConflictDescription(conflictType: GitConflictType) {
        const conflictTypeName = GitConflictType[conflictType]
            || "Unknown";

        return VCResources["PullRequset_ConflictDescription_" + conflictTypeName]
            || VCResources["PullRequset_ConflictDescription_Unknown"]
            || "Unknown";
    }
}
