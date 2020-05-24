import * as Q from "q";

import { autobind } from "OfficeFabric/Utilities";

import { WikiPage } from "TFS/Wiki/Contracts";

import { ActionsHub, WikiPageTemplate, TemplateType } from "Wiki/Scenarios/Integration/TemplatePicker/ActionsHub";
import { WikiPagesSource } from "Wiki/Scenarios/Shared/Sources/WikiPagesSource";
import { RepoConstants } from "Wiki/Scripts/CommonConstants";
import { WikiErrorNames } from "Wiki/Scripts/ErrorHelper";
import { getPageNameFromPath } from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { extractTemplateDescriptionFromContent } from "Wiki/Scripts/TemplatesHelper";

export interface Sources {
    wikiPagesSource: WikiPagesSource;
}

export class ActionCreator {
    constructor(
        private _actionsHub: ActionsHub,
        private _sources: Sources,
    ) { }

    public get blankTemplate(): WikiPageTemplate {
        return {
            name: WikiResources.TemplatePickerBlankTemplateName,
            description: Q.resolve(WikiResources.TemplatePickerBlankTemplateDescription),
            type: TemplateType.blank,
        };
    }

    public get wikiPagesSource(): WikiPagesSource {
        return this._sources.wikiPagesSource;
    }

    public loadAllTemplates(): void {
        this.wikiPagesSource.getPageAndSubPages(RepoConstants.TemplatesFolder).then(
            (templatePages: WikiPage[]) => {
                const templates: WikiPageTemplate[] = [];

                if (templatePages && templatePages.length > 0) {
                    for (const templatePage of templatePages) {
                        const templateName = getPageNameFromPath(templatePage.path);

                        if (templateName !== RepoConstants.TemplatesFolder) {
                            templates.push({
                                name: templateName,
                                type: TemplateType.custom,
                                description: this._getTemplateDescription(templatePage.path),
                            });
                        }
                    }
                } else {
                    templates.push(this.blankTemplate);
                }                

                this._actionsHub.wikiPageTemplatesLoaded.invoke(templates);

            }, (error: Error) => {
                if (error.name === WikiErrorNames.wikiPageNotFoundException) {
                    this._actionsHub.wikiPageTemplatesLoaded.invoke([this.blankTemplate]);
                } else {
                    this._actionsHub.wikiPageTemplatesLoadFailed.invoke(error);
                }
            });
    }

    private _getTemplateDescription(templatePath: string): IPromise<string> {
        const deferred: Q.Deferred<string> = Q.defer<string>();

        this.wikiPagesSource.getVersionedPageContent(templatePath, true).then(
            (versionedText) => {
                const description: string = extractTemplateDescriptionFromContent(versionedText.content);
                deferred.resolve(description || WikiResources.TemplatePickerNoDescriptionMessage);
            },
            (error: Error) => {
                deferred.reject(new Error(WikiResources.TemplatePickerErrorDescriptionMessage));
            }
        );

        return deferred.promise;
    }
}
