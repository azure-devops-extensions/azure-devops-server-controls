import * as VSSStore from "VSS/Flux/Store";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

export interface TemplateInfo {
    template: string;
}

export class TemplateStore extends VSSStore.Store {
    public template: string;
    public templateList: string[];
    public defaultTemplatePath: string;

    constructor() {
        super();
        this.template = "";
        this.templateList = [];
        this.defaultTemplatePath = "";
    }

    public updateTemplate(template: string) {
        this.template = template;
        this.emitChanged();
    }

    public updateTemplateList(templates: string[]) {
        this.templateList = templates;
        this.emitChanged();   
    }

    public updateDefaultTemplatePath(templatePath: string) {
        this.defaultTemplatePath = templatePath;
        this.emitChanged();
    }
}

