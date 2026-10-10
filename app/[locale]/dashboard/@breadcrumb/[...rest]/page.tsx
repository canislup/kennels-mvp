// Matches every dashboard route without its own breadcrumb. Without this, a
// client-side navigation would keep showing the previous page's breadcrumb,
// because a parallel slot keeps its last match when the new URL has none.
export default function NoBreadcrumb() {
    return null;
}
