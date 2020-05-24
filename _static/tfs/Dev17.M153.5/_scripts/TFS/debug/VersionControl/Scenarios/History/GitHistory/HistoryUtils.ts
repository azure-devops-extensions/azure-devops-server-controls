import { GitHistoryQueryResults, ChangeList, GitCommit } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export function calculateMruAuthors(historyResults: GitHistoryQueryResults): string[] {
    const authors: string[] = [];
    if (historyResults && historyResults.results) {
        historyResults.results.forEach((result, index) => {
            if (!Utils_Array.contains(authors, result.changeList.ownerDisplayName, Utils_String.ignoreCaseComparer)) {
                authors.push(result.changeList.ownerDisplayName);
            }
        });
    }
    return authors;
}

export function getCommitId(changeList: ChangeList, isFull: boolean = true): string {
    const gitCommit = changeList as GitCommit;
    if (gitCommit && gitCommit.commitId) {
        if (isFull) {
            return gitCommit.commitId.full;
        }
        return gitCommit.commitId.short;
    }
    return "";
}
