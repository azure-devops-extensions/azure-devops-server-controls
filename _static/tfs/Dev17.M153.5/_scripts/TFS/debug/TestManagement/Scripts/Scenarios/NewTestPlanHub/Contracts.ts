import {
    IPickListItem
} from "VSSUI/PickList";
import {
    IFilter,
    IFilterState
} from "VSSUI/Utilities/Filter";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import {
    TestPlanDirectoryStore
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Stores/TestPlanDirectoryStore";
import {
    TestPlanDirectoryActionsCreator
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/TestPlanDirectoryActionsCreator";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

/**
 *  State object interface for testplan list UI component
 */
export interface ITestPlanRow {
    /** Row title (such as ‘X Feature’) which has team name and backlog level name */
    title: string;

    /** test plan icon color */
    color: string;

    /** Row item favorite state */
    favoriteState: FavoriteState;

    /** Favorite id */
    favoriteId: string;

    /** Team id (guid) */
    teamId: string;

    /** Team name */
    teamName: string;

    /** test plan id*/
    testPlanId: number;

    /** sub fields */
    fields: ITestPlanFields;

    /** True if the artifact is deleted */
    isDeleted?: boolean;
}

/** Group row for favorites and team groupings */
export interface IGroupRow {
    /** Is the group collapsed */
    isCollapsed: boolean;

    /** Team represented */
    teamId: string;

    /** Icon to show */
    showTeamIcon: boolean;

    /** Title for row */
    title: string;
}

export interface IDirectoryRow {

    /** Row can either be group header or regular testplan row */
    directoryRow: IGroupRow | ITestPlanRow;

    /** Signal if row is group row */
    isGroupRow: boolean;

}

/**
 * Pivots on directory page
 */
export interface IDirectoryPivot {
    name: string;
    type: DirectoryPivotType;
}


/**
 *  State object interface for testplan pivot UI component base
 */
export interface ITestPlanDirectoryListComponentState {
    /** Flag indicating if the pivot is loading */
    isLoading: boolean;

    /** Flag indicating if the pivot's filter has been initialized */
    isPivotFilterInitialized: boolean;

    /** Row items */
    items: ITestPlanRow[] | IDirectoryRow[];

    /** Name of the column being sorted */
    sortedColumn?: string;

    /** Flag indicating sort order (default is false) */
    isSortedDescending?: boolean;

    /** Flag indicating if view is filtered for zero data experience */
    isFiltered?: boolean;
}

/**
 *  State object interface for team-testplan pivot UI component
 */
export interface IAllTestPlanComponentState extends ITestPlanDirectoryListComponentState {
}

export interface IMineTestPlanComponentState extends ITestPlanDirectoryListComponentState {

}

export interface INewTestPlanPageState{
    /** Flag indicating if the pivot is loading */
    isLoading: boolean;
    isCreatingTestPlan: boolean;
    nameField: IFormFieldState<string>;
    rootAreaPath: INodeField;
    selectedAreaPathField: IFormFieldState<INodeField>;
    rootIteration: INodeField;
    selectedIterationField: IFormFieldState<INodeField>;
    projectId: string;
    errorMessage: string;
}

export interface INodeField {
    path: string;
    node: INode;
}

/**
 * Represents the state of a form field
 */
export interface IFormFieldState<T> {
    /** Current value of the field */
    value: T;
    changed?: boolean;
    /** What is the current validation state of the field */
    validationResult: IValidationResult;
}

/**
 * Represents field validation information
 */
export interface IValidationResult {
    /** The error message, blank if valid */
    errorMessage?: string;
    /** Is the field valid? */
    isValid: boolean;
}

export interface INewTestPlanFields {
    areaPath: INode;
    iteration: INode;
    projectId: string;
}
/**
 * Represents the state of a form field
 */
export interface IFormFieldState<T> {
    /** Current value of the field */
    value: T;
    changed?: boolean;
    /** What is the current validation state of the field */
    validationResult: IValidationResult;
}

/**
 * Represents field validation information
 */
export interface IValidationResult {
    /** The error message, blank if valid */
    errorMessage?: string;
    /** Is the field valid? */
    isValid: boolean;
}

export interface INewTestPlanFields {
    areaPath: INode;
    iteration: INode;
    projectId: string;
}
/**
 * State object for hub error bar
 */
export interface IHubErrorMessageState {
    errorMessage?: string;
}

export interface ITestPlanDirectoryFilterBarComponentState {
    isLoading: boolean;
    fields: IDictionaryStringTo<IPickListItem[]>;
    activeFilter: IFilter;
}

export interface ITestPlanListBaseComponentProps {
    store: TestPlanDirectoryStore;
    actionsCreator: TestPlanDirectoryActionsCreator;
}

/**
 *  Data payload contract for team-testplan pivot on testplan directory page
 */
export interface ITeamTestPlanPayload {
    teams: ITeamTestPlanData[];
}

/**
 *  Data payload contract for mine pivot on testplan directory page
 */
export interface IMyTestPlanPayload extends ITeamTestPlanPayload {
    favorites: IFavoriteTestPlanData[];
}

export interface IMyTestPlanSkinnyPayload extends ITeamTestPlanPayload {

}

export interface IMyFavoriteTestPlanPayload {
    favorites: IFavoriteTestPlanData[];
}

/**
 *  Data payload contract for All pivot on testplan directory page
 */
export interface IAllTestPlanPayload extends ITeamTestPlanPayload {

}

export interface IAllTestPlanInitialPayload extends ITeamTestPlanPayload {
    testPlanMap: IDictionaryStringTo<ITestPlan>;
}

/**
 *  Team testplan data
 */
export interface ITeamTestPlanData {
    id: string;
    name: string;
    testPlans: ITestPlan[];
}

/**
 *  Backlog level data
 */
export interface IBacklogLevelData {
    name: string;
    color: string;
}

export interface IPivotFilterState {
    pivot: DirectoryPivotType;
    filterState: IFilterState;
}

/**
 *  Favorite data
 */
export interface IFavoriteTestPlanData {
    testPlan: ITestPlan;
    id: string;
}

export interface ITestPlan {
    id: number;
    loaded?: boolean;
    name?: string;
    fields?: ITestPlanFields;
}

export interface ITestPlanFields {
    assignedTo: IUser;
    state: string;
    areaPath: string;
    iterationPath: string;
}

export interface IUser {
    id: string;
    displayName: string;
    uniqueName: string;
    imageUrl: string;
}

/**
 * Defines a single field on the filter bar.
 */
export interface ITestPlanFilterField {
    displayType: TestPlanFilterFieldType;
    fieldName: string;
    placeHholder: string;
}

export class WorkItemField {
    public static workItemType: string = "System.WorkItemType";
    public static id: string = "System.Id";
    public static title: string = "System.Title";
    public static iterationPath: string = "System.IterationPath";
    public static assignedTo: string = "System.AssignedTo";
    public static workItemState: string = "System.State";
    public static areaPath: string = "System.AreaPath";
    public static systemInfo: string = "Microsoft.VSTS.TCM.SystemInfo";
    public static url: string = "url";
    public static priority: string = "Microsoft.VSTS.Common.Priority";
}


/**
 * Enum to represent the type of a filter on the filter bar.
 */
export enum TestPlanFilterFieldType {
    /** Text input */
    Text,

    /** Filter values will be rendered using a list with checkboxes */
    CheckboxList
}

/**
 *  Filter item names used in directory pages.
 */
export class Filters {

    public static readonly TeamFilterItemKey: string = "TestPlanDirectoryFilter-Team";
    public static readonly KeywordFilterItemKey: string = "TestPlanDirectoryFilter-Keyword";
    public static readonly StateFilterItemKey: string = "TestPlanDirectoryFilter-State";
    public static readonly IterationFilterItemKey: string = "TestPlanDirectoryFilter-Iteration";

    public static readonly Items: ITestPlanFilterField[] = [
        {
            displayType: TestPlanFilterFieldType.Text,
            fieldName: Filters.KeywordFilterItemKey,
            placeHholder: Resources.TestPlan_KeywordFilterText
        },
        {
            displayType: TestPlanFilterFieldType.CheckboxList,
            fieldName: Filters.TeamFilterItemKey,
            placeHholder: Resources.TestPlan_TeamFilterText
        },
        {
            displayType: TestPlanFilterFieldType.CheckboxList,
            fieldName: Filters.StateFilterItemKey,
            placeHholder: Resources.TestPlan_StateFilterText
        },
        {
            displayType: TestPlanFilterFieldType.CheckboxList,
            fieldName: Filters.IterationFilterItemKey,
            placeHholder: Resources.TestPlan_IterationFilterText
        }
    ];
}

export interface IUserOptions {
    myPlansFilterState: string;
    allPlansFilterState: string;
    selectedPivot: string;
}

/**
 *  Keys for testplan directory page columns
*/
export namespace TestPlanPivotColumnKeys {
    export const Title = "Title";
    export const State = "State";
    export const Area = "Area";
    export const Iteration = "Iteration";
    export const AssignedTo = "AssignedTo";
}

/**
 *  Keys for my testplan directory page groups
 */
export namespace MineTestPlanPivotGroupKeys {
    export const FavoritesGroupKey = "mineTestPlan.group.favorites";
    export const TeamsGroupKey = "mineTestPlan.group.teams";
}

/**
 * Pivot types for directory page
 */
export enum DirectoryPivotType {
    mine = "mine",
    all = "all",
    new = "new"
}

export enum FavoriteState {
    Favorited = 1,
    Unfavourited = 2,
    Favoriting = 3,
    Unfavoriting = 4
}

export module TestPlanRouteParameters {
    export const Name = "name";
    export const Pivot = "pivot";
    export const NewHubContributionId = "ms.vss-test-web.test-newtestplan-hub";
    export const liteHubContributionId = "ms.vss-test-web.test-newtestplan-hub";
}

export module FilterConstants {
    export const FilterRegistryKeyFormat = "{0}/{1}/Filter";
}

export enum ClassificationNodeTypeConstants {
    ProjectType = -42,
    AreaType = -43,
    IterationType = -44
}



