import * as WidgetResources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";
import * as StringUtils from "VSS/Utils/String";

export class PlaceholderBoardUnsupportedError extends Error
{
    __proto__: Error;

    public constructor(boardName: string)
    {
        const trueProto = new.target.prototype;

        super(StringUtils.format(
            WidgetResources.CumulativeFlowDiagram_PlaceholderBoardUnsupportedFormat,
            boardName
        ));

        /**
         * Used to support instanceof with custom errors.
         * TypeScript prototypes don't transpile correctly for certain built-in types like Error and Array.
         * However by explicitly setting the prototype the functionality is restored.
         * Subtypes of this custom error must also use this same workaround.
         * Can't use Object.setPrototypeOf because our headless browser used for unit tests doesn't support it.
         * https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
         */
        this.__proto__ = trueProto;
    }
}