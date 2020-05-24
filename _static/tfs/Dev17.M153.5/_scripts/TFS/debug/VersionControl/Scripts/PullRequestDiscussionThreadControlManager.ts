import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");
import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");

export class DiscussionThreadControlManager extends DiscussionOM.DiscussionThreadControlManager {
    public allowDelete(comment: DiscussionCommon.DiscussionComment, thread: DiscussionCommon.DiscussionThread) {
        return !thread.itemPath;
    }

    public showSelectDiscussionStatusDropdown(): boolean {
        return true;
    }
}
