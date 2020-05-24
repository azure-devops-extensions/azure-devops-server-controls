
export const templateDescriptionRegExp: RegExp = /\[comment\]:\s#\s\(templateDescription:(.*)\)([\n\r]*)/;

export function sanitizeTemplateContent(content: string): string {
    return content.replace(templateDescriptionRegExp, "");
}

export function extractTemplateDescriptionFromContent(content: string): string {
    const regexGroups = { Description: 1 };
    const matches = templateDescriptionRegExp.exec(content);
    return matches ? matches[regexGroups.Description] : null;
}
