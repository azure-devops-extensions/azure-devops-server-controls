import * as Utils_String from "VSS/Utils/String";
import * as VCCommentParser from "VersionControl/Scripts/CommentParser";
import { TfsChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export function getChangeLinkText(changeList: TfsChangeList, maxCommentLength?: number): string {
    let linkText = VCCommentParser.Parser.getFirstLine(changeList.comment);

    // In the case of shelveset we are assuming that full comment gets fetched from server  . 
    // If we change server implementation for shelveset comments then we have to update this function.
    if (changeList.isShelveset) {
        if (changeList.comment) {
            linkText = Utils_String.format("{0}: {1}", changeList.shelvesetName, linkText);
        }
        else {
            linkText = changeList.shelvesetName;
        }
    }
    else {
        if (!changeList.comment) {
            linkText = Utils_String.format(VCResources.ChangesetDetailsTitle, changeList.changesetId);
        }
        else if ((linkText.length === changeList.comment.length) && changeList.commentTruncated) {
            linkText = Utils_String.format("{0}...", linkText);
        }
    }

    return linkText;
}