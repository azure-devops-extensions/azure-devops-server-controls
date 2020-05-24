import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
import { registerLWPComponent } from "VSS/LWP";
import { GitRepository } from "TFS/VersionControl/Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { WikiMarkdownRenderer } from "Wiki/Scenarios/Shared/Components/WikiMarkdownRenderer";
import { getRepositoryContext } from "ProjectOverview/Scripts/Utils";

export interface WikiPageRendererProps {
    repositoryContext?: RepositoryContext;
    content: string;
    pagePath: string;
    repository?: GitRepository;
    onContentRendered?: () => void;
}

export interface WikiPageRendererState {
    anchor: string;
}

export class WikiPageRenderer extends React.Component<WikiPageRendererProps, WikiPageRendererState> {
    constructor(props: WikiPageRendererProps) {
        super(props);

        this.state = {
            anchor: null,
        };
    }

    public componentDidUpdate(): void {
        this._notifyContentRendered();
    }

    public componentDidMount(): void {
        this._notifyContentRendered();
    }

    private _notifyContentRendered(): void {
        if((this.props.repository || this.props.repositoryContext) && this.props.onContentRendered){
            this.props.onContentRendered();
        }
    }

    public render(): JSX.Element | null {
        let repositoryContext = this.props.repositoryContext;
        if (!repositoryContext && this.props.repository) {
            repositoryContext = getRepositoryContext(false, this.props.repository)
        } else if (!repositoryContext && !this.props.repository) {
            return null;
        }

        const urlParameters: UrlParameters = {
            pagePath: this.props.pagePath,
            anchor: this.state.anchor,
        };

        return (
            <WikiMarkdownRenderer
                content={this.props.content}
                repositoryContext={repositoryContext as GitRepositoryContext}
                urlParameters={urlParameters}
                onFragmentLinkClick={this._updateAnchor}
                skipInternalLinkTransformation={true}
                isHostedOutsideWikiHub={true}
                wikiIdentifier={repositoryContext.getRepository().name}
            />
        );
    }

    @autobind
    private _updateAnchor(urlParameters: UrlParameters): void {
        this.setState({ anchor: urlParameters.anchor });
    }
}

registerLWPComponent("TFS.ProjectOverview.WikiPageRenderer", WikiPageRenderer);
