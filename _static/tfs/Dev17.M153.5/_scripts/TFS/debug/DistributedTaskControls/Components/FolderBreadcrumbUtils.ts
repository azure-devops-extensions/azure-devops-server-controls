
import { STRING_BACKSLASH } from "DistributedTaskControls/Common/Common";

import * as Utils_String from "VSS/Utils/String";

export interface IBreadcrumb {
    path: string;
    crumb: string;
}

export class FolderBreadcrumbUtils {

    public static getBreadcrumbs(path: string): IBreadcrumb[] {
        if (!path || !path.trim()) {
            return [];
        }

        let breadcrumbs: IBreadcrumb[] = [];

        let crumbs = path.split(STRING_BACKSLASH);

        crumbs = crumbs.filter((crumb) => {
            return crumb.trim().length > 0;
        });

        let tempPath = STRING_BACKSLASH;

        crumbs.forEach((crumb) => {
            tempPath = tempPath + crumb + STRING_BACKSLASH;

            breadcrumbs.push({
                crumb: crumb,
                path: tempPath
            });
        });

        return breadcrumbs;
    }
}