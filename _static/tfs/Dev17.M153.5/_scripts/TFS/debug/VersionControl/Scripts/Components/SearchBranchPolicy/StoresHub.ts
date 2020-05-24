import { BranchListDataStore } from "VersionControl/Scripts/Components/SearchBranchPolicy/BranchListDataStore";
import { RepositoryContextStore } from "VersionControl/Scripts/Components/SearchBranchPolicy/RepositoryContextStore";
import { IncludeBranchDialogDataStore } from "VersionControl/Scripts/Components/SearchBranchPolicy/IncludeBranchDialogDataStore";
import { ExcludeBranchDialogDataStore } from "VersionControl/Scripts/Components/SearchBranchPolicy/ExcludeBranchDialogDataStore";
import {
    ActionsHub, ISearchableBranchesObtainedPayLoad,
    IRepositoryContextChanged, IBranchDialogPayLoad, IExcludeBranchDialogPayLoad
} from "VersionControl/Scripts/Components/SearchBranchPolicy/ActionsHub";

export class StoresHub {
    private static instance: StoresHub;
    public branchListDataStore: BranchListDataStore;
    public repositoryContextStore: RepositoryContextStore;
    public includeBranchDialogDataStore: IncludeBranchDialogDataStore;
    public excludeBranchDialogDataStore: ExcludeBranchDialogDataStore;

    constructor(actionsHub: ActionsHub) {
        this.branchListDataStore = new BranchListDataStore();
        this.repositoryContextStore = new RepositoryContextStore();
        this.includeBranchDialogDataStore = new IncludeBranchDialogDataStore();
        this.excludeBranchDialogDataStore = new ExcludeBranchDialogDataStore();

        actionsHub.searchableBranchesObtained.addListener((payload: ISearchableBranchesObtainedPayLoad) => {
            this.branchListDataStore.branchListUpdated(payload.branchesConfigured);
        });

        actionsHub.repositoryContextChanged.addListener((payload: IRepositoryContextChanged) => {
            this.repositoryContextStore.repositoryContextUpdated(payload.repositoryContext);
        });

        actionsHub.includeBranchDialogStateChanged.addListener((payload: IBranchDialogPayLoad) => {
            this.includeBranchDialogDataStore.updateIncludeBranchDialogState(payload.isOpen, payload.errorState);
        });

        actionsHub.excludeBranchDialogStateChanged.addListener((payload: IExcludeBranchDialogPayLoad) => {
            this.excludeBranchDialogDataStore.
                updateExcludeBranchDialogState(payload.isOpen,
                payload.errorState, payload.branchToExclude);
        });
    }

    public static getInstance(): StoresHub {
        if (!StoresHub.instance) {
            let actionsHub = ActionsHub.getInstance();
            StoresHub.instance = new StoresHub(actionsHub);
        }

        return StoresHub.instance;
    }
}