import { autobind } from "OfficeFabric/Utilities";

import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { ContributionKeys, ViewMode } from "Presentation/Scripts/TFS/TFS.MarkdownExtension.Common";

import { createContributedControl } from "VSS/Contributions/Controls";
import { ExtensionService } from "VSS/Contributions/Services";
import * as Locations from "VSS/Locations";
import { getService } from "VSS/Service";

import { MarkdownConstants } from "ContentRendering/MarkdownConstants";
import { ContainerOptions, MarkdownToken } from "ContentRendering/MarkdownItPlugins";

interface ContributionInstanceObject {
    data?: string;
    instance?: MarkdownExtenstionContributionInstance;
}

export interface ViewModeMetaData {
    getViewMode(): ViewMode;
}

export interface MarkdownExtenstionContributionInstance {
    sendContent(content: string, isEditMode: Boolean): void;
}

function extractKeyWord(params: string): string {
    const keyWords: string[] = params.split(/(\s+)/).filter((word) => word.trim().length > 0);
    return keyWords.length > 0 ? keyWords[0] : null;
}

// this class uses wiki-extension contributions to render extensions
export class MarkdownSyntaxExtensionProvider implements ContainerOptions {
    public name: string = "markdownExtension";
    private _currentElementId: string;
    private _currentTokenIndex: number;
    private _elementInstanceMap: Map<string, ContributionInstanceObject> = new Map<string, ContributionInstanceObject>();
    private _keywordContributionMap: Map<string, Contribution> = new Map<string, Contribution>();
    private _seenKeywordsSet: Set<string> = new Set<string>();
    private _curentKeyWord: string;

    constructor(
        private _viewModeObj: ViewModeMetaData,
        private _className: string,
    ) {}

    public createContributionsHosts(): void {
        this._seenKeywordsSet.forEach(this._createContributionHosts);
    }

    public fetchMarkdownSyntaxContributors(): IPromise<Contribution[]> {
        const contributionsPromise: IPromise<Contribution[]> = getService(ExtensionService)
                                        .getContributionsForTarget(ContributionKeys.markdownSyntaxContribution);
        contributionsPromise.then(this._onContributionsLoad);
        return contributionsPromise;
    }

    @autobind
    public render(tokens: MarkdownToken[], idx: number): string {
        if (tokens[idx].nesting === 1) {
            this._curentKeyWord = extractKeyWord(tokens[idx].info);
            this._seenKeywordsSet.add(this._curentKeyWord);
            this._currentElementId = GUIDUtils.newGuid();
            this._currentTokenIndex = idx;
            tokens = this._modifyContainerTokens(tokens, idx);
            return `<DIV class=${this._curentKeyWord} id=${this._currentElementId}>`;
        } else {
            const extensionData: string = this._extractContent(tokens, this._currentTokenIndex, idx);
            const currContribution: Contribution = this._keywordContributionMap.get(this._curentKeyWord);
            const currentInstance: ContributionInstanceObject = this._elementInstanceMap.get(this._currentElementId);
            if (currentInstance) {
                currentInstance.data = extensionData;
            } else {
                this._elementInstanceMap.set(this._currentElementId, { "data" : extensionData });
            }
            if (this._viewModeObj.getViewMode() === ViewMode.Edit) {
                return this._getPreview(currContribution.properties.previewSrc) + "</DIV>";
            }
            return "</DIV>";
        }
    }

    private _modifyContainerTokens(tokens: MarkdownToken[], idx: number): MarkdownToken[] {
        let iterator: number;
        for (iterator = idx + 1; (tokens[idx].level !== tokens[iterator].level || tokens[iterator].type !== "container_" + this.name + "_close"); iterator++) {
            tokens[iterator].type = MarkdownConstants.MaskedTokenType;
        }
        return tokens;
    }

    private _extractContent(tokens: MarkdownToken[], startIndex: number, endIndex: number): string {
        let extensionData: string = "";
        for (let i = startIndex + 1; i < endIndex; i++) {
            extensionData += tokens[i].content;
        }
        return extensionData;
    }

    private _getPreview(previewSrc: string): string {
        return `<img src="${Locations.urlHelper.getVersionedContentUrl(previewSrc)}"></img>`;
    }

    @autobind
    public validate(params: string): boolean {
        const keyWord: string = extractKeyWord(params);
        return keyWord ? this._keywordContributionMap.has(keyWord) : false;
    }

    private _buildContributionsMap(contributionList: Contribution[]): void {
        contributionList.forEach((contribution: Contribution) => {
            this._keywordContributionMap.set(contribution.properties.keyword, contribution);
        });
    }

    @autobind
    private _createContributionHosts(keyword: string): void {
        const contribution: Contribution = this._keywordContributionMap.get(keyword);
        const elements = $(`.${keyword}`, $(this._className));
        elements.each((index: number, element: Element) => {
            const instanceObject: ContributionInstanceObject = this._elementInstanceMap.get(element.id);
            this._elementInstanceMap.delete(element.id);
            if (!instanceObject || instanceObject.instance) {
                return;
            }
            createContributedControl<MarkdownExtenstionContributionInstance>(
                $(element),
                contribution,
            ).then((instance: MarkdownExtenstionContributionInstance) => {
                instanceObject.instance = instance;
                instance.sendContent(instanceObject.data, this._viewModeObj.getViewMode() === ViewMode.Edit);
            });
        });
    }

    @autobind
    private _onContributionsLoad(contributionList: Contribution[]): void {
        this._buildContributionsMap(contributionList);
    }
}
