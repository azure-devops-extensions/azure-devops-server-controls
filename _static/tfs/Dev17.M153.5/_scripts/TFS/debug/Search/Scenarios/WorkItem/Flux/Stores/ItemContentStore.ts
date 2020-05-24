import * as BaseItemContentStore from "Search/Scenarios/Shared/Base/Stores/ItemContentStore";
import { WorkItemSearchResponse, WorkItemResult } from "Search/Scenarios/WebApi/Workitem.Contracts";

export class ItemContentStore extends BaseItemContentStore.ItemContentStore<WorkItemSearchResponse, WorkItemResult> { }