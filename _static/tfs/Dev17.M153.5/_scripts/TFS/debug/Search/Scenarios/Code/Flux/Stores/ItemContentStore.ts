import { CodeQueryResponse, CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";
import * as BaseItemContentStore from "Search/Scenarios/Shared/Base/Stores/ItemContentStore";

export class ItemContentStore extends BaseItemContentStore.ItemContentStore<CodeQueryResponse, CodeResult> { }
