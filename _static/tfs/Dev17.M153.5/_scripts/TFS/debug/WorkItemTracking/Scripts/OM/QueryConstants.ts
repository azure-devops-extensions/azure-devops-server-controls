import { QueryType } from "TFS/WorkItemTracking/Contracts";

export module LinkQueryMode {
    export var Unknown = 0;
    export var WorkItems = 1;
    export var LinksMustContain = 2;
    export var LinksMayContain = 3;
    export var LinksDoesNotContain = 4;
    export var LinksRecursive = 5;
    export var LinksRecursiveReturnMatchingChildren = 6;

    export function isLinkQuery(mode: number): boolean {
        return (mode || LinkQueryMode.Unknown) > LinkQueryMode.WorkItems;
    }

    export function isTreeQuery(mode: number): boolean {
        return (mode || LinkQueryMode.Unknown) >= LinkQueryMode.LinksRecursive;
    }

    export function getQueryType(mode: number): QueryType {
        if(isTreeQuery(mode)) { return QueryType.Tree; }
        else if(isLinkQuery(mode)) { return QueryType.OneHop; }
        else { return QueryType.Flat; }
    }
}
