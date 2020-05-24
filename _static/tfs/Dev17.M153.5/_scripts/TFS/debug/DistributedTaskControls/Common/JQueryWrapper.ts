/**
 * Wrapper to consolidate all tje JQuery usage in a single file. This will help us get rid of
 * jQuery usage easily.
 */
export class JQueryWrapper {

    public static extend(target: any, source: any): any {
        return $.extend(target, source);
    }

    public static extendDeep(target: any, source: any): any {
        return $.extend(true, target, source);
    }

    public static isFunction(obj: any): boolean {
        return $.isFunction(obj);
    }

    public static closest(element: Element, selector: string): Element {
        if (element.closest) {
            return element.closest(selector);
        } else {
            let matches = document.querySelectorAll(selector);
            let i: number = 0;

            /* tslint:disable:curly no-conditional-assignment*/
            do {
                i = matches.length;
                while (--i >= 0 && matches.item(i) !== element);
            } while ((i < 0) && (element = element.parentElement));
             /* tslint:enable:curly no-conditional-assignment*/

            return element;
        }
    }
}