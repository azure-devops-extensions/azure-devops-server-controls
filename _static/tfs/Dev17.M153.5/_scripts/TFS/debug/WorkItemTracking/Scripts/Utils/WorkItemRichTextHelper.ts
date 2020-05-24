import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import Utils_String = require("VSS/Utils/String");

export namespace WorkItemRichTextHelper {
    /**
     * Get base HTML for rich text editors
     * @param tfsContext Unused
     * @param disableViewPortScaling If set, add meta tag to disable scaling
     * @param additionalStyles Additional CSS styles to inject
     */
    export function getPageHtml(tfsContext?: TfsContext, disableViewPortScaling?: boolean, additionalStyles?: string): string {
        const styles = `<style>
html, body
{
    height: 100%;
    box-sizing: border-box;
    -moz-box-sizing: border-box;
    -webkit-box-sizing: border-box;
}
html {
    overflow: hidden;
}
body
{
    font-family: Segoe UI, Helvetica Neue, Helvetica, Arial, Verdana;
    color: #222222;
    background-color: #ffffff;
    font-size: 14px;
    word-break: break-word;
    margin:0;
    padding: 5px;
    box-sizing: border-box;
    overflow: auto;
}

body.invalid
{
    background-color: #ffc;
}

P
{
    line-height: 1.5em;
    margin: 0;
}

body.watermark {
    color: #999999;
    font-style: italic;
}

img 
{ 
    max-width: 100%; 
}

a, a:visited {
    color: #007acc;
}

${additionalStyles || ""}
</style>`;

        let metaTags = "";

        if (disableViewPortScaling) {
            metaTags += `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">`;
        }

        return "<head>" +
            metaTags +
            styles +
            "</head>";
    }

    // Function to check if rich text editor html has only white space
    export function isHtmlVisuallyBlank(htmlInput: string): boolean {
        const html = $.parseHTML(htmlInput);
        let isEmpty = true;

        $.each(html, function (i, el) {
            isEmpty = ((el.textContent !== undefined && el.textContent.trim() === Utils_String.empty) &&
                (el.innerHTML === undefined || (el.innerHTML !== undefined && (el.tagName !== "IMG" && el.innerHTML.indexOf("img") === -1 && el.innerHTML.indexOf("li") === -1))));
            if (!isEmpty) {
                return isEmpty;
            }
        });
        return isEmpty;
    }
}