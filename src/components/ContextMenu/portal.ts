const PORTAL_ATTR = "data-plastic-portal";
const PORTAL_VAL = "context-menu";

let portalNode: HTMLDivElement | null = null;
let refCount = 0;

export function acquirePortalNode(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  if (portalNode && portalNode.isConnected) {
    refCount++;
    return portalNode;
  }
  const existing = document.querySelector<HTMLDivElement>(
    `[${PORTAL_ATTR}="${PORTAL_VAL}"]`,
  );
  if (existing) {
    portalNode = existing;
    refCount++;
    return portalNode;
  }
  const node = document.createElement("div");
  node.setAttribute(PORTAL_ATTR, PORTAL_VAL);
  node.style.position = "fixed";
  node.style.top = "0";
  node.style.left = "0";
  node.style.width = "0";
  node.style.height = "0";
  node.style.zIndex = "9999";
  document.body.appendChild(node);
  portalNode = node;
  refCount++;
  return portalNode;
}

export function releasePortalNode(): void {
  if (refCount > 0) refCount--;
  if (refCount === 0 && portalNode && portalNode.parentNode) {
    portalNode.parentNode.removeChild(portalNode);
    portalNode = null;
  }
}

export function getPortalNode(): HTMLElement | null {
  return portalNode;
}
