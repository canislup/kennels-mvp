/** The file name shown for an uploaded document: the URL's last path segment. */
export function documentName(url: string): string {
    try {
        return decodeURIComponent(new URL(url).pathname.split("/").pop() || url);
    } catch {
        return url;
    }
}
