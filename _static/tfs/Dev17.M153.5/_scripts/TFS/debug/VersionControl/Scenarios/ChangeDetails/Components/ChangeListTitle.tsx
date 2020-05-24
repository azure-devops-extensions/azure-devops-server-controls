import * as React from "react";
import * as Utils_String from "VSS/Utils/String";

import { CopyButton } from "VSSPreview/Flux/Components/CopyButton";
import { Parser } from "VersionControl/Scripts/CommentParser";
import { ChangeList, GitCommit, TfsChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { ChangeLinkControl, getChangeListComment } from "VersionControl/Scenarios/Shared/ChangeLinkControl";
import { CommitHash } from "VersionControl/Scenarios/Shared/CommitHash";
import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";

import "VSS/LoaderPlugins/Css!VersionControl/ChangeListTitle";

export type ChangeListType = 'commit' | 'changeset' | 'shelveset';

export interface ChangeListTitleProps extends IChangeDetailsPropsBase {
    changeList: ChangeList;
    pageUrl: string;
    changeListType: ChangeListType;
}

export const ChangeListTitle = (props: ChangeListTitleProps): JSX.Element =>
    <div className={"changelist-title"}>
        {
            (props.changeListType !== "shelveset") && <ChangeListId changeListType={props.changeListType} changeList={props.changeList} />
        }

        <ChangeLinkControl
            changeList={props.changeList}
            tabIndexForMoreMessageLink={0}
            tabIndexForFullMessageContainer={0}
            afterTitleContent={
                <CopyButton
                    cssClass={"copy-title-button"}
                    copyAsHtml={true}
                    copyText={getCopyTitleButtonHtml(props)}
                    copyTitle={VCResources.VersionControlCommitDetailsCopyTitleToolTip}
                    rightAlignCopyToolTip={true} />
            }
            customerIntelligenceData={props.customerIntelligenceData ? props.customerIntelligenceData.clone() : null}
            />
    </div>;

const ChangeListId = (props: { changeListType: ChangeListType, changeList: ChangeList }): JSX.Element =>
    <span className={"changelist-id-copier-container"}>
        {
            props.changeListType === "commit"
                ? <span>
                    <span className={"bowtie-icon bowtie-tfvc-commit"} />
                    <CommitHash
                        commitId={(props.changeList as GitCommit).commitId}
                        showCopyButton={true}
                        rightAlignCopyToolTip={true} />
                </span>
                : <span className='changeset-id'>
                    {
                        props.changeListType === 'changeset' &&
                        Utils_String.format(VCResources.ChangesetDetailsTitle, (props.changeList as TfsChangeList).changesetId)
                    }
                </span>
        }
    </span>;

function getCopyTitleButtonHtml({ changeList, changeListType, pageUrl }: ChangeListTitleProps): string {
    const changeListTitle = getChangeListComment(changeList);
    const shortTitle = Parser.getFirstLine(Utils_String.htmlEncode(changeListTitle));
    const htmlFormat = "<span><a href='{0}' target='_blank'>{1} {2}</a>" + ": {3}</span>";

    let changeTypeString: string;
    switch (changeListType) {
        case "commit":
            changeTypeString = VCResources.GitRefCommit;
            break;
        case "changeset":
            changeTypeString = VCResources.Changeset;
            break;
        case "shelveset":
            changeTypeString = VCResources.Shelveset;
            break;
        default:
            changeTypeString = "";
    }

    const changeListId = (changeListType === "commit") ?
        (changeList as GitCommit).commitId.short :
        (changeList as TfsChangeList).changesetId;

    return Utils_String.format(htmlFormat, pageUrl, changeTypeString, changeListId, shortTitle);
}
