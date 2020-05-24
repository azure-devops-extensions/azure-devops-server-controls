import { autobind } from "OfficeFabric/Utilities";

import { Store } from "VSS/Flux/Store";

import { ActionsHub, WikiPageTemplate } from "Wiki/Scenarios/Integration/TemplatePicker/ActionsHub";

export interface TemplatesStoreState {
    isLoading: boolean;
    templates: WikiPageTemplate[];
    error: Error;
}

export class TemplatesStore extends Store {
    private _state: TemplatesStoreState;

    constructor(private _actionsHub: ActionsHub) {
        super();

        this._state = {
            templates: [],
            isLoading: true,
            error: null,
        }

        this._actionsHub.wikiPageTemplatesLoaded.addListener(this._onTemplatesLoaded);
        this._actionsHub.wikiPageTemplatesLoadFailed.addListener(this._onTemplatesLoadFailed);
    }

    public dispose(): void {
        this._actionsHub.wikiPageTemplatesLoaded.removeListener(this._onTemplatesLoaded);
        this._actionsHub.wikiPageTemplatesLoadFailed.removeListener(this._onTemplatesLoadFailed);
    }
    
    public get state(): TemplatesStoreState {
        return this._state;
    }

	@autobind
    private _onTemplatesLoaded(templates: WikiPageTemplate[]): void {
        this.state.templates = templates;
        this.state.isLoading = false;

        this.emitChanged();
    }

    @autobind
    private _onTemplatesLoadFailed(error: Error): void {
        this.state.error = error;
        this.state.isLoading = false;

        this.emitChanged();
    }
}
