import { GitTag } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { OnDemandStore, OnDemandActionAdapter } from "VersionControl/Scenarios/Branches/Stores/OnDemandTreeStore";

export class TagsPageTreeAdapter extends OnDemandActionAdapter {

    public addTags(tags: GitTag[]): void {
        this.itemsAdded.invoke(this._getTagsName(tags));
    }

    public onFilterTree(tags: GitTag[]): void {
        this.refreshItemsAndExpand.invoke(this._getTagsName(tags));
    }

    public onFolderExpanded = (folderName: string): void => {
        this.folderExpanding.invoke(folderName);
        this.folderExpanded.invoke(folderName);
    }

    public onFolderCollapsed = (folderName: string): void => {
        this.folderCollapsed.invoke(folderName);
    } 

    // Making it public for UT
    public _getTagsName(tags: GitTag[]): string[] {
        let tagsList: string[] = [];
        if (tags && tags.length > 0) {
            tagsList = tags.map(gitTag => {
                return gitTag.name
            });
        }

        return tagsList;
    }
}