import TaskResources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");

// UI Honors this order
export var TaskDefinitionStepExistingCategories: IDictionaryStringTo<string> = {
    Build: TaskResources.Task_BuildCategoryText,
    Utility: TaskResources.Task_UtilityCategoryText,
    Test: TaskResources.Task_TestCategoryText,
    Package: TaskResources.Task_PackageCategoryText,
    Deploy: TaskResources.Task_DeployCategoryText,
    Tool: TaskResources.Task_ToolCategoryText
}

export function getTaskCategoryDisplayName(category: string): string {
    let displayText = TaskResources.Task_MiscCategoryText;
    if (!category) {
        return displayText;
    }
    // category can be case insensitive, but we map to what we need
    // if "build" => "Build"
    category = category.charAt(0).toUpperCase() + category.slice(1);

    return TaskDefinitionStepExistingCategories[category] || displayText;
}