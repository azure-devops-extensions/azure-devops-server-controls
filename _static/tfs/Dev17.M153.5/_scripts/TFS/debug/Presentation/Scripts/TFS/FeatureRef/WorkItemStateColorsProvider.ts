import Q = require("q");
import * as Diag from "VSS/Diag";
import * as VSSError from "VSS/Error";
import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import * as Contributions_Services from "VSS/Contributions/Services";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_WorkItemTracking_RestClient from "TFS/WorkItemTracking/RestClient";
import { ProjectWorkItemStateColors, WorkItemTypeStateColors } from "TFS/WorkItemTracking/Contracts";

// IWorkItemStateColor JSON object model
export interface IStateColor {
    name: string;
    color: string;
    category: string;
}

export class WorkItemStateColorsProvider {

    public static DEFAULT_STATE_COLOR: string = "transparent";
    private static _workItemStatesColorProvider: WorkItemStateColorsProvider;

    private _settingsBeingFetched: IDictionaryStringTo<IPromise<void>>;
    private _projectNameToColorSettingsMap: IDictionaryStringTo<IDictionaryStringTo<IDictionaryStringTo<string>>>;
    private _restClient = Service.getClient<TFS_WorkItemTracking_RestClient.WorkItemTrackingHttpClient>(TFS_WorkItemTracking_RestClient.WorkItemTrackingHttpClient);

    // Private to enforce singleton
    private constructor() {
        this._projectNameToColorSettingsMap = {};
        this._settingsBeingFetched = {};
        let project = TFS_Host_TfsContext.TfsContext.getDefault().contextData.project;

        if (project && project.name) {
            let pageDataService = Service.getService(Contributions_Services.WebPageDataService);
            let stateColors: IDictionaryStringTo<IStateColor[]> = pageDataService.getPageData("ms.vss-work-web.work-item-states-color-data-provider");
            if (!!stateColors) {
                this._setData({
                    projectName: project.name,
                    workItemTypeStateColors: this._mapWorkItemStatesColors(stateColors)
                });
            }
        }
    }

    private _mapWorkItemStatesColors(witColors: IDictionaryStringTo<IStateColor[]>): WorkItemTypeStateColors[] {
        let translatedColors: WorkItemTypeStateColors[] = [];
        for (var key in witColors) {
            if (witColors.hasOwnProperty(key)) {
                let colors: IStateColor[] = witColors[key];
                translatedColors.push({
                    workItemTypeName: key,
                    stateColors: colors
                });
            }
        }
        return translatedColors;
    }

    /**
     * gets the default states color provider
     */
    public static getInstance(): WorkItemStateColorsProvider {
        if (!WorkItemStateColorsProvider._workItemStatesColorProvider) {
            WorkItemStateColorsProvider._workItemStatesColorProvider = new WorkItemStateColorsProvider();
        }
        return WorkItemStateColorsProvider._workItemStatesColorProvider;
    }

    /**
     * Check if workitem state colors are defined for the project
     * @param projectName project name 
     */
    public isPopulated(projectName: string): boolean {
        if(!projectName){
            return false;
        }

        projectName = this._getNormalizedString(projectName);
        if (this._projectNameToColorSettingsMap.hasOwnProperty(projectName)) {
            return true;
        }
        return false;
    }

    /**
     * Get workitem state color synchronously from page data. Returns default color if settings not found
     * @param projectName project name to get color settings
     * @param typeName Workitemtype name
     * @param state workitem state name
     */
    public getColor(projectName: string, typeName: string, state: string): string {
        if (state && projectName && typeName) {
            projectName = this._getNormalizedString(projectName);
            typeName = this._getNormalizedString(typeName);
            state = this._getNormalizedString(state);

            // get work item state color if it is defined.
            let typeToColors = this._projectNameToColorSettingsMap[projectName];
            if (!!typeToColors) {
                let stateToColors = typeToColors[typeName];
                if (!!stateToColors && !!stateToColors[state]) {
                    return stateToColors[state];
                }
            }
        }

        return WorkItemStateColorsProvider.DEFAULT_STATE_COLOR;
    }

    /**
     * Get colors settings for projects asynchronously
     * Note: Do not queue multiple promises for same list of projects, we are not caching promises so its possible to have duplicate requests
     * If code demands for multiple promises, use 'getColorAsync' instead which caches active requests/promises
     * @param projects list of project names
     */
    public ensureColorsArePopulated(projects: string[]): IPromise<void> {
        if (!projects) {
            Diag.Debug.fail("EnsureWorkItemTypeColors - Parameter 'projects' cannot be null or undefined");
        }

        let projectsMap: IDictionaryStringTo<void> = {};
        for (let project of projects) {
            project = this._getNormalizedString(project);
            if (!projectsMap.hasOwnProperty(project) && !this.isPopulated(project)) {
                projectsMap[project] = null;
            }
        }

        let projectsToFetch = Object.keys(projectsMap);
        if (projectsToFetch.length === 0) {
            return Q<void>(null);
        }
        else {
            if (projectsToFetch.some(p => !p)) {
                Diag.Debug.fail("Invalid Project Name(s) provided to ensureColorsArePopulated");

                // Log invalid project so that we know who is calling us with bad data
                try {
                    // Need to throw because stack trace will not be set in some browsers (IE/Edge) otherwise
                    throw new Error("Invalid Project Name(s) provided to ensureColorsArePopulated");
                }
                catch (e) {
                    e.name = "WorkItemStateColorsInvalidProjects";
                    VSSError.publishErrorToTelemetry(e);
                }
            }

            return (<any>this._restClient).getWorkItemStateColors(projectsToFetch).then(
                (data: ProjectWorkItemStateColors[]) => {
                    for (let colors of data) {
                        this._setData(colors);
                    }
                    return null;
                },
                (error: Error) => {
                    VSSError.publishErrorToTelemetry({
                        name: "GetWorkItemStateColorsForProjectsException",
                        message: Utils_String.format("Failed to fetch state color data for a project. : {0}", JSON.stringify(error))
                    });
                    for (let project of projectsToFetch) {
                        this._setData({
                            workItemTypeStateColors: [],
                            projectName: project
                        });
                    }
                }
            );
        }
    }

    /**
     * Populate colors asynchronously and return appropriate color
     * @param projectName project name to get color settings
     * @param workItemType workitem type name
     * @param state workitem state name
     */
    public getColorAsync(projectName: string, workItemType: string, state: string): IPromise<string | void> {
        projectName = this._getNormalizedString(projectName);

        if (this.isPopulated(projectName)) {
            return Q(this.getColor(projectName, workItemType, state));
        }

        if (this._settingsBeingFetched.hasOwnProperty(projectName)) {
            return this._settingsBeingFetched[projectName].then(
                () => this.getColor(projectName, workItemType, state),
                (error: Error) => {
                    // Do nothing. Handled in parent
                }
            );
        }
        else {
            let promise = this.ensureColorsArePopulated([projectName]).then(
                () => {
                    delete this._settingsBeingFetched[projectName];
                    return null;
                },
                (error: Error) => {
                    delete this._settingsBeingFetched[projectName];
                    VSSError.publishErrorToTelemetry(error);
                }
            );
            this._settingsBeingFetched[projectName] = promise;

            return promise.then(() => this.getColor(projectName, workItemType, state),
                (error: Error) => {
                    // Do nothing. Handled in parent
                });
        }
    }

    /**
     * Set workitem state color data
     * @param colors color data of type IWorkItemStateColorSettings
     */
    protected _setData(colors: ProjectWorkItemStateColors): void {

        Diag.Debug.assert(colors && colors.projectName && !!colors.workItemTypeStateColors, "Colors cannot be empty");

        if (!this.isPopulated(colors.projectName)) {
            let workItemTypeToColor: IDictionaryStringTo<IDictionaryStringTo<string>> = {};
            let normalizedWorkItemProjectName = this._getNormalizedString(colors.projectName);
            for (let item of colors.workItemTypeStateColors) {
                let stateToColor: IDictionaryStringTo<string> = {};
                let normalizedWorkItemTypeName = this._getNormalizedString(item.workItemTypeName);

                for (let color of item.stateColors) {
                    let normalizedState = this._getNormalizedString(color.name);
                    let normalizedColor = this._getNormalizedString(color.color);

                    // Colors fetched may have visibility chars, so get last 6 chars only
                    stateToColor[normalizedState] = `#${normalizedColor.substr(normalizedColor.length - 6)}`;
                }
                workItemTypeToColor[normalizedWorkItemTypeName] = stateToColor;
            }
            this._projectNameToColorSettingsMap[normalizedWorkItemProjectName] = workItemTypeToColor;
        }
    }

    private _getNormalizedString(value: string): string {
        value = value || "";
        return value.trim().toLowerCase();
    }
}