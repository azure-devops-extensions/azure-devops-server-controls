import { ActionsHub } from  "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { TagsSource } from  "VersionControl/Scenarios/ChangeDetails/Sources/TagsSource";
import { GitTag } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

export class TagsActionCreator {
    constructor(
        private _actionsHub: ActionsHub,
        private _repositoryContext: GitRepositoryContext,
        private _tagsSource?: TagsSource) {
    }

    public fetchTags(commitId: string): void {
        this.tagsSource.fetchTags(commitId).then(
            (fetchedTags: GitTag[]) => {
                this._actionsHub.tagsFetched.invoke(fetchedTags);
            },
            (error: Error) => {
                this._actionsHub.errorRaised.invoke(error);
            });
    }

    private get tagsSource(): TagsSource {
        if (!this._tagsSource) {
            this._tagsSource = new TagsSource(this._repositoryContext);
        }

        return this._tagsSource;
    }
}
