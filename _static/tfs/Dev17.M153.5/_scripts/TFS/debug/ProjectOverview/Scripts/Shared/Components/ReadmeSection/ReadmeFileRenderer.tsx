import * as React from "react";
import * as ReactDOM from "react-dom";

import { autobind, css } from "OfficeFabric/Utilities";
import { registerLWPComponent } from "VSS/LWP";
import { GitRepository } from "TFS/VersionControl/Contracts";
import { IContentRenderer, IContentRendererOptions, ContentRendererFactory } from "Presentation/Scripts/TFS/TFS.ContentRendering";

import { MentionSyntaxProcessor } from "Mention/Scripts/MentionSyntaxProcessor";
import "Mention/Scripts/TFS.Mention.WorkItems.Registration"; // to register work-item mention parser and provider
import { WikiRelativeLinkEnablement } from "VersionControl/Scripts/TFS.VersionControl.SourceRendering";
import { LatestVersionSpec, GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { CodeExplorerWikiLinkTransformer } from "VersionControl/Scripts/TFS.VersionControl.WikiLinkTransformer";
import { WikiImageTransformer } from "VersionControl/Scripts/TFS.VersionControl.WikiImageTransformer";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { getRepositoryContext } from "ProjectOverview/Scripts/Utils";

import "VSS/LoaderPlugins/Css!FileViewerMarkdownStyles";
import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeFileRenderer";

export class ReadmeFileRendererProps {
    repositoryContext?: RepositoryContext;
    itemModel?: ItemModel;
    content: string;
    renderer?: IContentRenderer;
    className?: string;
    branchName?: string;
    filePath?: string;
    repository?: GitRepository;
    onContentRendered?: () => void;
}

export class ReadmeFileRenderer extends React.Component<ReadmeFileRendererProps, {}> {
    private _container: HTMLElement;
    private _renderer: IContentRenderer;
    private _isMounted = false;

    public componentDidMount(): void {
        this._isMounted = true;
        this._viewItem();
    }

    public componentWillUnmount(): void {
        if (this._container) {
            ReactDOM.unmountComponentAtNode(this._container);
            this._container.innerHTML = "";
        }
        this._isMounted = false;
    }

    public componentDidUpdate(prevProps: ReadmeFileRendererProps): void {
        if (this.props.repositoryContext !== prevProps.repositoryContext ||
            this.props.itemModel !== prevProps.itemModel ||
            this.props.content !== prevProps.content ||
            this.props.renderer !== prevProps.renderer ||
            this.props.className !== prevProps.className ||
            this.props.repository !== prevProps.repository) {
            this._viewItem();
        }
    }

    public render(): JSX.Element {
        return <div
            className={css(this.props.className, "vc-preview-content-container")}
            ref={this._saveRefToContainer} />;
    }

    @autobind
    private _saveRefToContainer(container: HTMLDivElement): void {
        this._container = container;
    }

    private _viewItem() {
        let repositoryContext: RepositoryContext;
        let renderer: IContentRenderer;
        let itemModel: ItemModel;

        if (this.props.filePath) {
            if (!this.props.content) {
                // there is no content. so nothing to render
                if (this.props.onContentRendered) {
                    this.props.onContentRendered();
                }
                return;
            }

            // Calculate repositoryContext, renderer and itemModel when called from new web platform
            repositoryContext = this.props.repository ? getRepositoryContext(false, this.props.repository) : getRepositoryContext(true);

            if (!this._renderer) {
                ContentRendererFactory.getRendererForExtension("md").then((renderer: IContentRenderer) => {
                    if (this._isMounted) {
                        this._renderer = renderer;
                        this._viewItem();
                    }
                });
            } else {
                renderer = this._renderer;
            }

            itemModel = {
                serverItem: this.props.filePath,
                version: this.props.branchName
                    ? (new GitBranchVersionSpec(this.props.branchName || "master").toVersionString())
                    : (new LatestVersionSpec().toVersionString())
            } as ItemModel;

        } else {
            repositoryContext = this.props.repositoryContext;
            renderer = this.props.renderer;
            itemModel = this.props.itemModel;
        }

        if (repositoryContext && this.props.content && renderer) {
            const $container = $(this._container);
            $container.empty();
            renderer.renderContent(
                this.props.content,
                $container,
                this._getContentRendererOptionsOrDefaults(repositoryContext, itemModel));

            this.props.onContentRendered && this.props.onContentRendered();
        }
    }

    private _getContentRendererOptionsOrDefaults(repositoryContext: RepositoryContext, item: ItemModel): IContentRendererOptions {
        const rendererOptions: IContentRendererOptions = {
            async: true,
            customSyntaxProcessor: new MentionSyntaxProcessor(),
            html: true,
            imageTransformer: new WikiImageTransformer(repositoryContext, item),

        };

        if (WikiRelativeLinkEnablement.isWikiLinkTransformationEnabled()) {
            rendererOptions.linkTransformer = new CodeExplorerWikiLinkTransformer(repositoryContext, item);
        }

        return rendererOptions;
    }
}

registerLWPComponent("TFS.ProjectOverview.ReadmeFileRenderer", ReadmeFileRenderer);
