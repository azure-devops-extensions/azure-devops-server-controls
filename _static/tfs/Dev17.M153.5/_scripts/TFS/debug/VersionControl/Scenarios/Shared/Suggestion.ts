/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />
import * as Q from "q";
import * as  VCContracts from "TFS/VersionControl/Contracts";
import * as Serialization from "VSS/Serialization";
import * as VSS_Telemetry from "VSS/Telemetry/Services";
import * as Utils_String from "VSS/Utils/String";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

export interface ISuggestionObject {
    targetBranch: string;
    sourceRepositoryContext?: GitRepositoryContext;
    sourceBranch: string;
    explorerBranchUrl: string;
    explorerRepositoryUrl?: string;
    createPullRequestURL: string;
    pushDate: Date;
    repositoryContext: GitRepositoryContext;
}

export class Suggestion implements ISuggestionObject {
    private static readonly LOCAL_STORAGE_SUGGESTION_KEY = "TFS.VC.PullRequestSuggestion.Key";

    private _targetBranch: string;
    private _targetRepositoryId: string;
    private _sourceBranch: string;
    private _createPullRequestURL: string;
    private _pushDate: Date;
    private _repositoryContext: GitRepositoryContext;
    private _sourceRepositoryContext: GitRepositoryContext;

    constructor(suggested: VCContracts.GitSuggestion, repositoryContext: GitRepositoryContext) {
        this._repositoryContext = repositoryContext;
        const sourceBranch = GitRefUtility.getRefFriendlyName(suggested.properties["sourceBranch"]);
        const targetBranch = GitRefUtility.getRefFriendlyName(suggested.properties["targetBranch"]);
        let sourceRepository: VCContracts.GitRepository = suggested.properties["sourceRepository"];

        if (!sourceRepository){
            sourceRepository = repositoryContext.getRepository();
        }

        this._pushDate = this.deserializePushDate(suggested.properties["pushDate"]);
        this._targetRepositoryId = suggested.properties["targetRepositoryId"];
        this._targetBranch = targetBranch;
        this._sourceBranch = sourceBranch;
        this._sourceRepositoryContext = GitRepositoryContext.create(sourceRepository, repositoryContext.getTfsContext());
    }

    public get targetBranch() {
        return this._targetBranch;
    }

    public get sourceBranch() {
        return this._sourceBranch;
    }

    public get explorerBranchUrl() {
        return VersionControlUrls.getExplorerUrl(this.sourceRepositoryContext, null, null, { version: new VCSpecs.GitBranchVersionSpec(this.sourceBranch).toVersionString() });
    }

    public get explorerRepositoryUrl() {
        return VersionControlUrls.getExplorerUrl(this.sourceRepositoryContext);
    }

    public get createPullRequestURL() {
        const sourceRepository = this.sourceRepositoryContext.getRepository();

        return this._createPullRequestURL = VersionControlUrls.getCreatePullRequestUrl(
            this.repositoryContext,
            this.sourceBranch,
            this.targetBranch,
            false,
            null,
            null,
            sourceRepository.id,
            this._targetRepositoryId);
    }

    public get pushDate() {
        return this._pushDate;
    }

    public get repositoryContext() {
        return this._repositoryContext;
    }

    public get sourceRepositoryContext(): GitRepositoryContext {
        return this._sourceRepositoryContext;
    }

    public static beginGetSuggestion(repositoryContext: GitRepositoryContext): Q.Promise<ISuggestionObject> {
        return Q.Promise<ISuggestionObject>((resolve, reject) =>
            repositoryContext.getGitClient().beginGetSuggestions(
                repositoryContext,
                suggestions => {
                    if (suggestions && suggestions.length) {
                        const suggestion = new Suggestion(suggestions[0], repositoryContext);

                        if (!suggestion.isSuggestionAlreadyDismissed()) {
                            resolve(suggestion);
                        } else {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                },
                reject));
    }

    public invalidateSuggestion(): void {
        const suggestionKey = this.getSuggestionIdentifier();
        try {
            localStorage.setItem(Suggestion.LOCAL_STORAGE_SUGGESTION_KEY, suggestionKey);
        }
        catch (error) {
            // Ignore
        }

        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_DISMISS_SUGGESTION,
            {
                SourceView: this.repositoryContext.getTfsContext().navigation.currentAction
            })
        );
    }

    /**
     * This method checks whether a suggestion is already dismissed or not.
     * It compares the suggestion key stored in the localStorage against the suggestion passed as the parameter
     * @return boolean
     */
    private isSuggestionAlreadyDismissed(): boolean {

        const suggestionKey = this.getSuggestionIdentifier();
        let dismissedSuggestionKey = "";
        try {
            dismissedSuggestionKey = localStorage.getItem(Suggestion.LOCAL_STORAGE_SUGGESTION_KEY);
        }
        catch (error) {
            // Ignore
        }
        return dismissedSuggestionKey === suggestionKey;
    }

    /**
     * This method returns a string that uniquely identifies a PR suggestion
     * @return string
     */
    private getSuggestionIdentifier(): string {
        return Utils_String.format("{0},{1},{2}", this.targetBranch, this.sourceBranch, this.pushDate);
    }

    /**
     * Specifically convert string version of push date into a date. We need to do this using the contract serializer.
     * @param pushDateSuggestion
     */
    private deserializePushDate(pushDateSuggestion: string): Date {
        // deserialize using a temporary contract for the date mapping
        const temp = Serialization.ContractSerializer.deserialize({ date: pushDateSuggestion }, { fields: { date: { isDate: true } } });
        return <Date>temp.date;
    }
}
