import { Store } from "VSS/Flux/Store";

import { TemplateContentLoadedPayload } from "Wiki/Scenarios/Overview/ViewActionsHub";

export interface TemplateContentState {
    templateName: string;
    templateContent: string;
    isLoading: boolean;
}

export class TemplateContentStore extends Store {

    public state: TemplateContentState = {
        templateName: "",
        templateContent: "",
        isLoading: true,
    };

    public onTemplateContentLoaded = (payload: TemplateContentLoadedPayload): void => {
        this.state = {
            templateName: payload.templateName,
            templateContent: payload.templateContent,
            isLoading: false,
        };

        this.emitChanged();
    }

    public onTemplateContentReset = (): void => {
        this.state = {
            templateName: "",
            templateContent: "",
            isLoading: true,
        };

        this.emitChanged();
    }
}
