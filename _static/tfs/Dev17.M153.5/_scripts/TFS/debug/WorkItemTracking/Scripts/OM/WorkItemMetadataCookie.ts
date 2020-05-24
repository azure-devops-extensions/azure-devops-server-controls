export interface IWorkItemMetadataCookie {
    [typeName: string]: {
        /** Cache scope id (e.g., collection or project id) */
        scopeId: string;

        /** Cache stamp */
        stamp: string;

        /** Keys for meta data type (e.g., work item type names), "_" if there are no sub-types */
        keys: "_" | string[];
    };
}

const TypeSeparator = "|";
const TypeDataSeparator = ":";
const KeySeparator = ",";

export function serialize(data: IWorkItemMetadataCookie): string {
    const parts: string[] = [];

    for (const typeName of Object.keys(data)) {
        const d = data[typeName];

        parts.push([
            typeName,
            d.scopeId,
            d.stamp,
            Array.isArray(d.keys) && d.keys.join(KeySeparator) || d.keys
        ].join(TypeDataSeparator));
    }

    return encodeURIComponent(parts.join(TypeSeparator));
}

export function deserialize(input: string): IWorkItemMetadataCookie {
    const data: IWorkItemMetadataCookie = {};

    const parts = decodeURIComponent(input || "").split(TypeSeparator);
    parts.forEach(typeValue => {
        const typeParts = typeValue.split(TypeDataSeparator);

        if (typeParts.length > 2) {
            const typename = typeParts[0];
            const scopeId = typeParts[1];
            const stamp = typeParts[2];
            const keys = typeParts[3].split(KeySeparator);

            data[typename] = {
                scopeId,
                stamp,
                keys: keys.length > 0 && keys || "_"
            };
        }
    });

    return data;
}
