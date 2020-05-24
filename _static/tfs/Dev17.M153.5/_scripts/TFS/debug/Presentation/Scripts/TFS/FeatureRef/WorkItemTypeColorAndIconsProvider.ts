import { Debug } from "VSS/Diag";
import * as Service from "VSS/Service";
import * as Contributions_Services from "VSS/Contributions/Services";
import * as VSSError from "VSS/Error";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_WorkItemTracking_RestClient from "TFS/WorkItemTracking/RestClient";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { WorkItemTypeColorAndIcon } from "TFS/WorkItemTracking/Contracts";
import { WorkItemTypeColor, WorkItemType } from "TFS/WorkItemTracking/Contracts";
import { WorkItemTypeIcons } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

export function getNormalizedValue(value: string): string {
    value = value || "";
    return value.trim().toLowerCase();
}

/**
 * Interface of work item type color and icon data
 */
export interface IColorAndIcon {
    /**
     * Work item type color in format of '#...'
     */
    color: string;

    /**
     * Work item type icon in bowtie class name
     */
    icon: string;
}

/**
 * Work item type colors
 */
export class WorkItemTypeColorAndIcons {
    public static readonly ICON_NAME_MAPPINGS: IDictionaryStringTo<string> = {
        // OOB
        "icon_crown": "bowtie-symbol-crown",
        "icon_trophy": "bowtie-symbol-trophy",
        "icon_list": "bowtie-symbol-list",
        "icon_book": "bowtie-symbol-book",
        "icon_sticky_note": "bowtie-symbol-stickynote",
        "icon_clipboard": "bowtie-symbol-task",
        "icon_insect": "bowtie-symbol-bug",
        "icon_traffic_cone": "bowtie-symbol-impediment",
        "icon_chat_bubble": "bowtie-symbol-review",
        "icon_flame": "bowtie-symbol-flame",
        "icon_megaphone": "bowtie-symbol-ask",
        "icon_test_plan": "bowtie-test-plan",
        "icon_test_suite": "bowtie-test-suite",
        "icon_test_case": "bowtie-test-case",
        "icon_test_step": "bowtie-test-step",
        "icon_test_parameter": "bowtie-test-parameter",
        "icon_code_review": "bowtie-symbol-review-request",
        "icon_code_response": "bowtie-symbol-review-response",
        "icon_review": "bowtie-symbol-feedback-request",
        "icon_response": "bowtie-symbol-feedback-response",
        // Custom
        "icon_ribbon": "bowtie-symbol-ribbon",
        "icon_chart": "bowtie-symbol-finance",
        "icon_headphone": "bowtie-symbol-headphone",
        "icon_key": "bowtie-symbol-key",
        "icon_airplane": "bowtie-symbol-airplane",
        "icon_car": "bowtie-symbol-car",
        "icon_diamond": "bowtie-symbol-diamond",
        "icon_asterisk": "bowtie-symbol-asterisk",
        "icon_database_storage": "bowtie-symbol-storage-database",
        "icon_government": "bowtie-symbol-government",
        "icon_gavel": "bowtie-symbol-decision",
        "icon_parachute": "bowtie-symbol-parachute",
        "icon_paint_brush": "bowtie-symbol-paint-brush",
        "icon_palette": "bowtie-symbol-color-palette",
        "icon_gear": "bowtie-settings-gear",
        "icon_check_box": "bowtie-status-success-box",
        "icon_gift": "bowtie-package-fill",
        "icon_test_beaker": "bowtie-test-fill",
        "icon_broken_lightbulb": "bowtie-symbol-defect",
        "icon_clipboard_issue": "bowtie-symbol-issue"
    };

    public static readonly DEFAULT_UNPARENTED_WORKITEM_COLOR: string = "#A6A6A6";
    public static readonly DEFAULT_UNPARENTED_WORKITEM_BOWTIE_ICON: string = "bowtie-square";
    public static readonly DEFAULT_WORKITEMTYPE_COLOR_HEX: string = "009CCC";
    public static readonly DEFAULT_WORKITEMTYPE_COLOR: string = `#${WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_COLOR_HEX}`;
    public static readonly DEFAULT_WORKITEMTYPE_ICON: string = WorkItemTypeIcons.DefaultWorkItemTypeIconName;
    public static readonly DEFAULT_WORKITEMTYPE_BOWTIE_ICON: string = WorkItemTypeColorAndIcons.ICON_NAME_MAPPINGS[WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_ICON];

    private _items: IDictionaryStringTo<IColorAndIcon> = {};

    public static getDefault(): IColorAndIcon {
        return {
            color: WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_COLOR,
            icon: WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_BOWTIE_ICON
        };
    }

    /**
     * Sets workItem type color
     * @param workItemTypeName
     * @param color
     * @param icon
     */
    public setColorAndIcon(workItemTypeName: string, color: string, icon: string): IColorAndIcon {
        const typeName = getNormalizedValue(workItemTypeName);
        this._items[typeName] = {
            color: WorkItemTypeColorAndIcons.transformColor(color),
            icon: WorkItemTypeColorAndIcons.transformIcon(icon)
        };
        return this._items[typeName];
    }

    /**
     * Gets workItem type color and icon
     * Default color and icon will be returned if data is not available
     * @param workItemTypeName
     */
    public getColorAndIcon(workItemTypeName: string): IColorAndIcon {
        const typeName = getNormalizedValue(workItemTypeName);
        return this._items[typeName] || WorkItemTypeColorAndIcons.getDefault();
    }

    public static transformColor(color: string): string {
        if (!color) {
            return WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_COLOR;
        }

        // To strip out visibility chars
        return `#${color.substr(color.length - 6)}`;
    }

    public static transformIcon(icon: string): string {
        icon = getNormalizedValue(icon);

        if (!icon || !WorkItemTypeColorAndIcons.ICON_NAME_MAPPINGS[icon]) {
            return WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_BOWTIE_ICON;
        }

        // To translate to bowtie class name
        return WorkItemTypeColorAndIcons.ICON_NAME_MAPPINGS[icon];
    }
}

/**
 * Work item type color and icons data provider
 */
export class WorkItemTypeColorAndIconsProvider {
    /**
     * Constructor. Private to enforce singleton
     */
    private constructor() { }

    /**
     * Singleton: gets the default color provider
     */
    private static _instance: WorkItemTypeColorAndIconsProvider;
    public static getInstance(): WorkItemTypeColorAndIconsProvider {
        if (!WorkItemTypeColorAndIconsProvider._instance) {
            WorkItemTypeColorAndIconsProvider._instance = this._getDataProvider();
        }

        return WorkItemTypeColorAndIconsProvider._instance;
    }

    private _cachedPromises: IDictionaryStringTo<PromiseLike<void>> = {};
    private _projectToColorAndIconsMap: IDictionaryStringTo<WorkItemTypeColorAndIcons> = {};
    private _restClient = TFS_WorkItemTracking_RestClient.getClient();

    /**
     * Check if type colors are defined for a project
     * @param projectName
     */
    public isPopulated(projectName: string): boolean {
        if (!projectName) {
            return false;
        }

        projectName = getNormalizedValue(projectName);
        return this._projectToColorAndIconsMap.hasOwnProperty(projectName);
    }

    /**
     * Get workItem type color and icon
     * If colors are not populated for supplied project-name, returns default color and icon
     * @param projectName
     * @param typeName
     */
    public getColorAndIcon(projectName: string, typeName: string): IColorAndIcon {
        if (projectName && typeName) {
            projectName = getNormalizedValue(projectName);
            if (this._projectToColorAndIconsMap[projectName]) {
                return this._projectToColorAndIconsMap[projectName].getColorAndIcon(typeName);
            }
        }

        return WorkItemTypeColorAndIcons.getDefault();
    }

    /**
     * Get workItem type color
     * If colors are not populated for supplied project-name, returns default color
     * @param projectName
     * @param typeName
     */
    public getColor(projectName: string, typeName: string): string {
        return this.getColorAndIcon(projectName, typeName).color;
    }

    /**
     * Ensures color and icons are populated for desired projects
     *
     * Note: Do not queue multiple promises for same list of projects, we are not caching promises so its possible to have duplicate requests
     * If code demands for multiple promises, use other async get functions instead which caches active requests/promises
     * @param projects array of project names
     */
    public ensureColorAndIconsArePopulated(projects: string[]): PromiseLike<void> {
        if (!projects) {
            Debug.fail("EnsureWorkItemTypeColors - parameter 'projects' cannot be null or undefined");
        }

        const projectsMap: IDictionaryStringTo<void> = {};
        for (let project of projects) {
            project = getNormalizedValue(project);
            if (!projectsMap.hasOwnProperty(project) && !this.isPopulated(project)) {
                projectsMap[project] = null;
            }
        }

        const projectsToFetch = Object.keys(projectsMap);
        if (projectsToFetch.length === 0) {
            // If no projects to fetch, return
            return Promise.resolve();
        }

        if (projectsToFetch.length === 1) {
            // Note: this is primarly for public project scenario where we need to resolve project scoped work item types; even
            // for non-public project scenarios where types for only one project needs to be resolved, this will be called.
            return this._fetchWorkItemTypeColorAndIcons(projectsToFetch[0]);
        }

        // Note: Casting the client to <any> as the api is internal
        return (<any>this._restClient).getWorkItemTypeColorAndIcons(projectsToFetch).then(
            (projectColorAndIcons: { key: string; value: WorkItemTypeColorAndIcon[] }[]) => {
                for (let colorAndIcons of projectColorAndIcons) {
                    this._setColors(colorAndIcons.key, colorAndIcons.value);
                }
            },
            (error: Error) => VSSError.publishErrorToTelemetry(error)
        );
    }

    /**
     * Returns workItem type color and icon for given project and workitemtype
     * Note: Caches active promises to avoid duplicate requests
     * @param projectName
     * @param workItemType
     */
    public getColorAndIconAsync(projectName: string, workItemType: string): PromiseLike<IColorAndIcon> {
        Debug.assertIsNotNull(projectName, "WorkItemTypeColorAndIconsProvider - 'getColorAndIconAsync' projectName cannot be null/undefined");

        if (this.isPopulated(projectName)) {
            return Promise.resolve(this.getColorAndIcon(projectName, workItemType));
        }

        return this.queueEnsureColorAndIconsArePopulated(projectName).then(() => {
            return this.getColorAndIcon(projectName, workItemType);
        });
    }

    /**
     * Returns workItem type color for given project and workitemtype
     * Note: Caches active promises to avoid duplicate requests
     * @param projectName
     * @param workItemType
     */
    public getColorAsync(projectName: string, workItemType: string): PromiseLike<string> {
        Debug.assertIsNotNull(projectName, "WorkItemTypeColorAndIconsProvider - 'getColorAsync' projectName cannot be null/undefined");

        return this.getColorAndIconAsync(projectName, workItemType).then((colorAndIcon: IColorAndIcon) => {
            return colorAndIcon.color;
        });
    }

    /**
     * Ensures color and icons are populated for desired projects
     *
     * Note: Caches active promises to avoid duplicate requests
     * @param projectName
     */
    public queueEnsureColorAndIconsArePopulated(projectName: string): PromiseLike<void> {
        Debug.assertIsNotNull(projectName, "WorkItemTypeColorAndIconsProvider - 'queueEnsureColorAndIconsArePopulated' projectName cannot be null/undefined");

        projectName = getNormalizedValue(projectName);
        if (this._cachedPromises[projectName]) {
            // If there is a cached promise, return it
            return this._cachedPromises[projectName];
        } else {
            this._cachedPromises[projectName] = this.ensureColorAndIconsArePopulated([projectName]);
            return this._cachedPromises[projectName].then(
                () => {
                    delete this._cachedPromises[projectName];
                },
                (error: Error) => {
                    delete this._cachedPromises[projectName];
                    VSSError.publishErrorToTelemetry(error);
                }
            );
        }
    }

    private _setColors(projectName: string, colorAndIcons: WorkItemTypeColorAndIcon[]) {
        const typeColorAndIcons = new WorkItemTypeColorAndIcons();
        for (const colorAndIcon of colorAndIcons) {
            typeColorAndIcons.setColorAndIcon(colorAndIcon.workItemTypeName, colorAndIcon.color, colorAndIcon.icon);
        }

        projectName = getNormalizedValue(projectName);
        this._projectToColorAndIconsMap[projectName] = typeColorAndIcons;
    }

    private static _getDataProvider(): WorkItemTypeColorAndIconsProvider {
        const project = TFS_Host_TfsContext.TfsContext.getDefault().contextData.project;
        const pageDataService = Service.getService(Contributions_Services.WebPageDataService);
        const provider = new WorkItemTypeColorAndIconsProvider();

        const colorIconDataProviderName = "ms.vss-work-web.work-item-type-color-icon-data-provider";
        const colorAndIcons = pageDataService.getPageData<WorkItemTypeColorAndIcon[]>(colorIconDataProviderName);

        if (project && colorAndIcons) {
            provider._setColors(project.name, colorAndIcons);
        }

        return provider;
    }

    private _fetchWorkItemTypeColorAndIcons(projectName: string): PromiseLike<void> {
        return this._restClient.getWorkItemTypes(projectName).then(
            (workItemTypes: WorkItemType[]) => {
                if (!workItemTypes) {
                    throw new Error(`WorkItemTypeColorAndIconsProvider - '_restClient.getWorkItemTypes' returned undefined workItemTypes for project '${projectName}'`);
                }

                this._setColors(projectName, workItemTypes.map((type: WorkItemType) => {
                    if (!type) {
                        throw new Error(`WorkItemTypeColorAndIconsProvider - '_restClient.getWorkItemTypes' returned a null type for project '${projectName}'`);
                    }
                    return WorkItemTypeColorAndIconsProvider._toWorkItemTypeColorAndIcon(type);
                }));
            },
            (error: Error) => VSSError.publishErrorToTelemetry(error)
        ).then(() => { }, (error) => VSSError.publishErrorToTelemetry(error));
    }

    private static _toWorkItemTypeColorAndIcon(workItemType: WorkItemType): WorkItemTypeColorAndIcon {
        const { color, icon, name: workItemTypeName } = workItemType;

        return ({ color, icon: icon && icon.id, workItemTypeName } as WorkItemTypeColorAndIcon);
    }
}