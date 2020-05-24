import { Store } from "VSS/Flux/Store";
import { IClassificationFieldsMru, IAreaPathMruData, IIterationPathMruData } from "WorkItemTracking/Scripts/MruClassificationPicker/Models/ClassificationFieldsMru";
import { ActionsHub, ClassificationFieldsMruActionsCreator } from "WorkItemTracking/Scripts/MruClassificationPicker/Actions/ClassificationFieldsMruActionsCreator";

/**
 * Classification fields mru data provider
 */
export interface IClassificationFieldsMruDataProvider {
    /**
     * Gets the status of the store for given project.
     *
     * @returns True if items are loaded for the given project.
     */
    isLoaded(projectId: string): boolean;

    /**
     * Checks if the mru load is already in progress for given project
     *
     * @returns True if items are being loaded for the given project.
     */
    isLoading(projectId: string): boolean;

    /**
     * Sets the loading value for given project
     */
    setLoading(projectId: string, loading: boolean): void;

    /**
     * Gets the mru data by project for Area path.
     *
     * @param projectId the project id.
     * @returns MRU data for Area path for given project.
     */
    getAreaPathMru(projectId: string): number[];

    /**
     * Gets the mru data by project for Iteration path.
     *
     * @param projectId the project id.
     * @returns MRU data for Iteration path for given project.
     */
    getIterationPathMru(projectId: string): number[];
}

export interface IClassificationFieldsMruFluxContext {
    store: ClassificationFieldsMruStore;
    actionsCreator: ClassificationFieldsMruActionsCreator;
}

export class ClassificationFieldsMruStore extends Store implements IClassificationFieldsMruDataProvider {
    private static _defaultFluxContext: IClassificationFieldsMruFluxContext;    

    public static getDefaultFluxContext(): IClassificationFieldsMruFluxContext {
        if (!this._defaultFluxContext) {
            const mruActionsHub: ActionsHub = new ActionsHub();
            const defaultMruStore = new ClassificationFieldsMruStore(mruActionsHub);
            const defaultMruActionsCreator = new ClassificationFieldsMruActionsCreator(mruActionsHub, defaultMruStore);
            this._defaultFluxContext = {
                store: defaultMruStore,
                actionsCreator: defaultMruActionsCreator
            }
        }
        
        return this._defaultFluxContext;
    }

    private _items: IDictionaryStringTo<IClassificationFieldsMru>;
    private _isLoadingMap: IDictionaryStringTo<boolean>;  // to check if a xhr call is already in progress to load mru for a project
    
    constructor(actions: ActionsHub) {
        super();

        this._items = {};
        this._isLoadingMap = {};

        actions.InitializeClassificationFieldsMru.addListener((data: IClassificationFieldsMru) => {
            if (data) {
                this._items[data.projectId.toLowerCase()] = data;
                this.emitChanged();
            }
        });

        actions.SetAreaPathMru.addListener((data: IAreaPathMruData) => {
            if (this.isLoaded(data.projectId) && data.values) {
                this._items[data.projectId.toLowerCase()].areaPathMru = data.values;
            }

            this.emitChanged();
        });

        actions.SetIterationPathMru.addListener((data: IIterationPathMruData) => {
            if (this.isLoaded(data.projectId) && data.values) {
                this._items[data.projectId.toLowerCase()].iterationPathMru = data.values;
            }

            this.emitChanged();
        });
    }

    public setLoading(projectId: string, loading: boolean) {
        this._isLoadingMap[projectId.toLowerCase()] = loading;
    }

    public isLoading(projectId: string): boolean {
        return this._isLoadingMap[projectId.toLowerCase()];
    }

    public isLoaded(projectId: string) {
        return this._items[projectId.toLowerCase()] != null;
    }

    public getAreaPathMru(projectId: string): number[] {
        if (this.isLoaded(projectId)) {
            return this._items[projectId.toLowerCase()].areaPathMru;
        }

        return null;
    }

    public getIterationPathMru(projectId: string): number[] {
        if (this.isLoaded(projectId)) {
            return this._items[projectId.toLowerCase()].iterationPathMru;
        }

        return null;
    }
}