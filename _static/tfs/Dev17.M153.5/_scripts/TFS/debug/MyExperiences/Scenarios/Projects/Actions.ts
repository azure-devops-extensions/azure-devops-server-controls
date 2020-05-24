import {Action} from"VSS/Flux/Action";
import {TeamProjectLineReference} from "MyExperiences/Scenarios/Projects/Contracts";

export class ProjectActions {
    private static instance: ProjectActions;

    /**
     * Singleton action that gets triggered when any row in the grid is expanded.
     */
    public static get GridRowExpanded() { return ProjectActions.getInstance().gridRowExpanded; }
    /**
     * Singleton action that gets triggered when any row in the grid is collapsed.
     */
    public static get GridRowCollapsed() { return ProjectActions.getInstance().gridRowCollapsed; }
    /**
     * Singleton action that gets triggered when the filter box gains focus.
     */
    public static get PrepSearch() { return ProjectActions.getInstance().prepSearch; }
    /**
     * Singleton action that gets triggered when an item was removed from the MRU list
     */
    public static get MruItemRemoved() { return ProjectActions.getInstance().mruItemRemoved; }

    /**
     * Singleton
     */
    public static getInstance(): ProjectActions {
        if (ProjectActions.instance == null) {
            ProjectActions.instance = new ProjectActions();
        }

        return ProjectActions.instance;
    }

    private gridRowExpanded = new Action<TeamProjectLineReference>();
    private gridRowCollapsed = new Action<TeamProjectLineReference>();
    private prepSearch = new Action<void>();
    private mruItemRemoved = new Action<TeamProjectLineReference>();

    // Public for unit tests only
    public constructor() { }
}