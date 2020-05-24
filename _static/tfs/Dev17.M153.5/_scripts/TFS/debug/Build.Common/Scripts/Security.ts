export const RootPath: string = "\\";
export const Separator: string = "/";

export function getSecurityTokenPath(path: string): string {
    path = path.replace(/\\/g, Separator);
    if (path[0] === Separator) {
        // unroot the path
        path = path.slice(1, path.length);
    }
    return path;
}

export function getDefinitionSecurityToken(projectId: string, path: string, definitionId: number): string {
    let token = "";
    if (path !== RootPath) {
        token = getSecurityTokenPath(path); 
    }

    if (definitionId && definitionId !== -1)
    {
        if (token)
        {
            token = token + Separator;
        }
        
        token = token + definitionId.toString();
    }
    return projectId + Separator + token;
}