import { ActionsHub } from  "MyExperiences/Scenarios/CreateProject/ActionsHub";
import { Store } from "MyExperiences/Scenarios/CreateProject/Stores/Store"

/**
 * A container to hold the multiple stores of project creation page
 */
export class StoresHub {
    constructor(actionsHub: ActionsHub) {
        // Project creation metadata load listeners
        actionsHub.projectCreationMetadataLoadStarted.addListener(payload => this.store.onProjectCreationMetadataLoadStatusChanged(payload));
        actionsHub.projectCreationMetadataLoadSucceeded.addListener(payload => this.store.onProjectCreationMetadataLoadStatusChanged(payload));
        actionsHub.projectCreationMetadataLoadFailed.addListener(payload => this.store.onProjectCreationMetadataLoadStatusChanged(payload));

        // Project creation related action listeners
        actionsHub.projectCreationSucceeded.addListener(payload => this.store.onProjectCreationStatusChanged(payload));
        actionsHub.projectCreationFailed.addListener(payload => this.store.onProjectCreationStatusChanged(payload));
        actionsHub.projectCreationStarted.addListener(payload => this.store.onProjectCreationStatusChanged(payload));

        // Project name validation related actions listeners
        actionsHub.projectNameValidationSucceeded.addListener(payload => this.store.onProjectNameValidationStatusChanged(payload));
        actionsHub.projectNameValidationFailed.addListener(payload => this.store.onProjectNameValidationStatusChanged(payload));
        actionsHub.projectNameValidationReset.addListener(payload => this.store.onProjectNameValidationStatusChanged(payload));

        // Project parameters related listeners
        actionsHub.projectDescriptionChanged.addListener(payload => this.store.onProjectDescriptionChanged(payload));
        actionsHub.versionControlChanged.addListener(payload => this.store.onVersionControlTypeChanged(payload));
        actionsHub.projectVisibilityChanged.addListener(payload => this.store.onProjectVisibilityOptionChanged(payload));
        actionsHub.processTemplateChanged.addListener(payload => this.store.onProcessTemplateChanged(payload));

        // Status dismissed action listener
        actionsHub.statusDismissed.addListener(payload => this.store.onStatusDismissed(payload));
    }

    public get store(): Store {
        if (!this._store) {
            this._store = new Store();
        }
        return this._store;
    }

    private _store: Store;
}
