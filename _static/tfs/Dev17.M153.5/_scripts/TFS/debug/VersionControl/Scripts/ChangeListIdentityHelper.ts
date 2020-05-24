import { ChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

export function getUserNameWithoutEmail(userDisplayName: string): string {
    if (!userDisplayName) {
        return null;
    }

    let lessThanIndex = userDisplayName.indexOf("<");
    if (lessThanIndex >= 0) {
        // Trim off email address from display name
        return $.trim(userDisplayName.substr(0, lessThanIndex));
    }
    else {
        return userDisplayName;
    }
}

export function getCommitterEmailIdFromChangeList(changeList: ChangeList): string {
    // git users have email id in changelist.ownerDisplayName while tfvc users have email id in changelist.owner
    const displayName: string = changeList.ownerDisplayName;
    const owner: string = changeList.owner;

    if (displayName && displayName.indexOf("<") != -1) {
        return displayName.substring(displayName.indexOf("<") + 1, displayName.lastIndexOf(">"));
    } else if (owner && owner.indexOf("@") != -1) {
        return owner;
    }

    return null;
}
