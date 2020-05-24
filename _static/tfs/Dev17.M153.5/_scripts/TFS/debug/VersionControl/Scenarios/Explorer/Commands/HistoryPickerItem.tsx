import * as React from "react";

import { ExtendedGitIdentityReference } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { AvatarBadge } from "VersionControl/Scenarios/Shared/AvatarControls";
import { AvatarImageSize } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { getShortCommitId } from "VersionControl/Scripts/CommitIdHelper";
import { HistoryEntry, ChangeList, GitCommit } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

import "VSS/LoaderPlugins/Css!VersionControl/HistoryPickerItem";

export function renderHistoryEntry(entry: HistoryEntry) {
    return <HistoryEntryItem entry={entry} />;
}

interface HistoryEntryItemProps {
    entry: HistoryEntry;
}

class HistoryEntryItem extends React.Component<HistoryEntryItemProps, {}> {
    public render() {
        const { entry } = this.props;
        const author = isGitCommit(entry.changeList) && entry.changeList.author as ExtendedGitIdentityReference;
        const avatarProps = {
            email: author && author.id,
            displayName: author ? author.displayName : entry.changeList.ownerDisplayName,
            identityId: null,
            size: AvatarImageSize.SmallMinus,
            imageUrl: author && (author.imageUrl || author.url),
        };

        return (
            <span className="vc-history-picker-item">
                <span className="commitId flex-shrink">{getHistoryEntryName(entry.changeList.version)}</span>
                <span className="comment flex-grow">{entry.changeList.comment}</span>
                <span className="flex-shrink">
                    <AvatarBadge imageProperties={avatarProps} />
                </span>
            </span>);
    }
}

export function getHistoryEntryName(version: string): string {
    if (version && version.startsWith("GC")) {
        return getShortCommitId(version.substring(2));
    } else {
        return version;
    }
}

function isGitCommit(changeList: ChangeList): changeList is GitCommit {
    return "author" in changeList;
}
