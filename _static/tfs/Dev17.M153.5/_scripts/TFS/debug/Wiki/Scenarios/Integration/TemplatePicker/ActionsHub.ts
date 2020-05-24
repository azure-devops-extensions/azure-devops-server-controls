import { Action } from "VSS/Flux/Action";

export enum TemplateType {
    blank,
    custom,
}

export interface WikiPageTemplate {
    name: string;
    description: IPromise<string>;
    type: TemplateType;
}

export class ActionsHub {
    public wikiPageTemplatesLoaded = new Action<WikiPageTemplate[]>();
    public wikiPageTemplatesLoadFailed = new Action<Error>();
}